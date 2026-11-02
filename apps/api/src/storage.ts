import {
  chmodSync, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync,
  openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { SessionSchema, validateRestoredSession, type Session } from '@reboundops/contracts';

const diskFormat = z.strictObject({
  formatVersion: z.literal(1),
  session: SessionSchema
});
const uuidFile = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/;
const MAX_FILE_BYTES = 256 * 1024;

/**
 * All operations are synchronous to serialize writes within one local API process.
 * This is not a shared/network filesystem or multi-process database.
 */
export class SessionStore {
  private readonly items = new Map<string, Session>();
  readonly directory: string | null;
  readonly warnings: string[] = [];

  constructor(dataDir?: string) {
    this.directory = dataDir?.trim() ? resolve(dataDir) : null;
    if (!this.directory) return;
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    if (!lstatSync(this.directory).isDirectory()) throw new Error('The persistence path must be a real directory.');
    if (process.platform !== 'win32') chmodSync(this.directory, 0o700);
    for (const file of readdirSync(this.directory)) {
      if (!uuidFile.test(file)) continue;
      const path = join(this.directory, file);
      try {
        if (!lstatSync(path).isFile()) throw new Error('Not a regular file.');
        const size = lstatSync(path).size;
        if (size > MAX_FILE_BYTES) throw new Error('Oversized session file.');
        const parsed = diskFormat.parse(JSON.parse(readFileSync(path, 'utf8')));
        const session = validateRestoredSession(parsed.session);
        if (session.id + '.json' !== file || session.persistence !== 'disk') {
          throw new Error('Session file name or consent flag does not match.');
        }
        if (this.items.size >= 100) throw new Error('At most 100 saved sessions are loaded.');
        this.items.set(session.id, session);
      } catch {
        // Do not delete, move, modify or overwrite damaged/unsupported files.
        this.warnings.push('Skipped invalid or incompatible saved file: ' + file);
      }
    }
  }

  get available(): boolean { return Boolean(this.directory); }
  get size(): number { return this.items.size; }
  get(id: string): Session | undefined { return this.items.get(id); }

  listSaved(): Array<{ id: string; role: string; updatedAt: string; revision: number }> {
    return [...this.items.values()].filter(s => s.persistence === 'disk')
      .map(s => ({ id: s.id, role: s.intake.role, updatedAt: s.updatedAt, revision: s.revision }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  put(input: Session): Session {
    const session = validateRestoredSession(input);
    if (session.persistence === 'disk') {
      if (!this.directory) throw new Error('Disk persistence is not configured.');
      this.writeAtomic(session);
    } else if (this.items.get(session.id)?.persistence === 'disk') {
      // Disabling consent removes the old disk record before the in-memory transition.
      this.deleteDiskFile(session.id);
    }
    this.items.set(session.id, session);
    return session;
  }

  delete(id: string): boolean {
    const current = this.items.get(id);
    if (!current) return false;
    if (current.persistence === 'disk') this.deleteDiskFile(id);
    this.items.delete(id);
    return true;
  }

  private pathFor(id: string): string {
    if (!this.directory || !uuidFile.test(id + '.json')) throw new Error('Invalid session file location.');
    return join(this.directory, id + '.json');
  }

  private deleteDiskFile(id: string): void {
    const path = this.pathFor(id);
    if (existsSync(path)) unlinkSync(path);
    this.flushDirectory();
  }

  private writeAtomic(session: Session): void {
    const final = this.pathFor(session.id);
    const temp = join(this.directory!, '.' + session.id + '-' + randomUUID() + '.tmp');
    const data = JSON.stringify({ formatVersion: 1, session }, null, 2) + '\n';
    if (Buffer.byteLength(data, 'utf8') > MAX_FILE_BYTES) throw new Error('Session exceeds local storage limit.');
    try {
      // Exclusive create, private file mode and durable flush before atomic replacement.
      writeFileSync(temp, data, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      const fd = openSync(temp, 'r');
      try { fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(temp, final);
      if (process.platform !== 'win32') chmodSync(final, 0o600);
      this.flushDirectory();
    } catch (error) {
      if (existsSync(temp)) unlinkSync(temp);
      throw error;
    }
  }

  private flushDirectory(): void {
    if (!this.directory) return;
    // Some filesystems/platforms don't support directory fsync.
    try {
      const fd = openSync(this.directory, 'r');
      try { fsyncSync(fd); } finally { closeSync(fd); }
    } catch { /* best effort only */ }
  }
}
