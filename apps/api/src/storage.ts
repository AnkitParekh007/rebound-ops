import {
  chmodSync, closeSync, constants, fstatSync, fsyncSync, lstatSync, mkdirSync,
  openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import {
  CURRENT_SESSION_SCHEMA_VERSION, migrateSession, validateRestoredSession,
  type MigrationOptions, type Session
} from '@reboundops/contracts';

// The envelope is stable; the session inside may be an older schema version
// and is upgraded by migrateSession() on load.
const diskFormat = z.strictObject({
  formatVersion: z.literal(1),
  session: z.record(z.string(), z.unknown())
});
const uuidFile = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/;
const MAX_FILE_BYTES = 256 * 1024;

/** Do not send OS errors, private file paths or file contents in HTTP responses. */
export class SessionStorageError extends Error {
  constructor() {
    super('Local storage unavailable. Saved data was not updated.');
    this.name = 'SessionStorageError';
  }
}

/**
 * Files are private and written atomically by one localhost API process.
 * This does NOT provide cross-process locking or safe shared-filesystem access.
 * Existing files are validated before each write/delete to avoid silent loss
 * if another process or a person changed them after startup.
 */
export class SessionStore {
  private readonly items = new Map<string, Session>();
  readonly directory: string | null;
  readonly warnings: string[] = [];
  /** Schema version each saved file had when read; used to keep pre-migration backups. */
  private readonly diskVersions = new Map<string, number>();
  private readonly migration: MigrationOptions;
  private readonly targetVersion: number;
  migratedCount = 0;

  constructor(dataDir?: string, options: { migration?: MigrationOptions } = {}) {
    this.migration = options.migration ?? {};
    this.targetVersion = this.migration.targetVersion ?? CURRENT_SESSION_SCHEMA_VERSION;
    this.directory = dataDir?.trim() ? resolve(dataDir) : null;
    if (!this.directory) return;
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    if (!lstatSync(this.directory).isDirectory()) {
      throw new Error('The persistence path must be a real directory.');
    }
    if (process.platform !== 'win32') chmodSync(this.directory, 0o700);
    for (const file of readdirSync(this.directory)) {
      if (!uuidFile.test(file)) continue;
      try {
        const { session, fromVersion } = this.readDiskFile(file);
        if (this.items.size >= 100) throw new Error('At most 100 saved sessions are loaded.');
        this.items.set(session.id, session);
        this.diskVersions.set(session.id, fromVersion);
        if (fromVersion < this.targetVersion) this.migratedCount += 1;
      } catch {
        // Preserve all unknown, corrupted, unsupported and insecure files.
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
    const previous = this.items.get(session.id);
    if (session.persistence === 'disk') {
      if (!this.directory) throw new SessionStorageError();
      try {
        this.requireUnchangedFile(session.id, previous);
        this.preserveOlderSchemaFile(session.id);
        this.writeAtomic(session);
        this.diskVersions.set(session.id, this.targetVersion);
      } catch {
        throw new SessionStorageError();
      }
    } else if (previous?.persistence === 'disk') {
      try {
        this.requireUnchangedFile(session.id, previous);
        this.deleteDiskFile(session.id);
        this.diskVersions.delete(session.id);
      } catch {
        throw new SessionStorageError();
      }
    }
    // Memory only changes AFTER a successful disk write or deletion.
    this.items.set(session.id, session);
    return session;
  }

  delete(id: string): boolean {
    const current = this.items.get(id);
    if (!current) return false;
    if (current.persistence === 'disk') {
      try {
        this.requireUnchangedFile(id, current);
        this.deleteDiskFile(id);
        this.diskVersions.delete(id);
      } catch {
        throw new SessionStorageError();
      }
    }
    this.items.delete(id);
    return true;
  }

  private pathFor(id: string): string {
    if (!this.directory || !uuidFile.test(id + '.json')) {
      throw new Error('Invalid session file location.');
    }
    return join(this.directory, id + '.json');
  }

  private fileExists(path: string): boolean {
    try {
      lstatSync(path); // Includes dangling symlinks; never use existsSync here.
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  private backupPathFor(id: string, version: number): string {
    this.pathFor(id); // validates the ID
    return join(this.directory!, `${id}.schema-v${version}.backup`);
  }

  /**
   * Before the first write that upgrades an older-schema file, keep its exact
   * original bytes beside it (private mode, never overwritten). The loader
   * ignores these files; they exist so an upgrade can never lose work.
   */
  private preserveOlderSchemaFile(id: string): void {
    const version = this.diskVersions.get(id);
    if (version === undefined || version >= this.targetVersion) return;
    const backup = this.backupPathFor(id, version);
    if (this.fileExists(backup)) return;
    const fd = openSync(this.pathFor(id), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    let original: Buffer;
    try { original = readFileSync(fd); } finally { closeSync(fd); }
    writeFileSync(backup, original, { flag: 'wx', mode: 0o600 });
    const bfd = openSync(backup, 'r+');
    try { fsyncSync(bfd); } finally { closeSync(bfd); }
  }

  /** Explicit deletion also removes pre-migration backups of that session. */
  private deleteSchemaBackups(id: string): void {
    const prefix = id + '.schema-v';
    for (const file of readdirSync(this.directory!)) {
      if (file.startsWith(prefix) && /\.schema-v\d+\.backup$/.test(file)) unlinkSync(join(this.directory!, file));
    }
  }

  private readDiskFile(file: string): { session: Session; fromVersion: number } {
    if (!uuidFile.test(file)) throw new Error('Invalid session filename.');
    const fd = openSync(join(this.directory!, file),
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    try {
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.size > MAX_FILE_BYTES) {
        throw new Error('Not a supported session file.');
      }
      if (process.platform !== 'win32' && (stat.mode & 0o077) !== 0) {
        throw new Error('Stored file permissions are too broad.');
      }
      const parsed = diskFormat.parse(JSON.parse(readFileSync(fd, 'utf8')));
      const { session, fromVersion } = migrateSession(parsed.session, this.migration);
      if (session.id + '.json' !== file || session.persistence !== 'disk') {
        throw new Error('Session ID or disk consent does not match its filename.');
      }
      return { session, fromVersion };
    } finally {
      closeSync(fd);
    }
  }

  private requireUnchangedFile(id: string, previous?: Session): void {
    const occupied = this.fileExists(this.pathFor(id));
    if (previous?.persistence === 'disk') {
      if (!occupied || JSON.stringify(this.readDiskFile(id + '.json').session) !== JSON.stringify(previous)) {
        throw new Error('Saved file changed outside this local API; refusing destructive write.');
      }
    } else if (occupied) {
      // Unknown/invalid files may contain recoverable information. Don't replace them.
      throw new Error('An existing file would be overwritten.');
    }
  }

  private deleteDiskFile(id: string): void {
    unlinkSync(this.pathFor(id));
    this.deleteSchemaBackups(id);
    this.flushDirectory();
  }

  private writeAtomic(session: Session): void {
    const final = this.pathFor(session.id);
    const temp = join(this.directory!, '.' + session.id + '-' + randomUUID() + '.tmp');
    const data = JSON.stringify({ formatVersion: 1, session }, null, 2) + '\n';
    if (Buffer.byteLength(data, 'utf8') > MAX_FILE_BYTES) {
      throw new Error('Session exceeds local storage limit.');
    }
    try {
      // Exclusive create, private file mode, flush then atomic replacement.
      writeFileSync(temp, data, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      // Windows FlushFileBuffers requires a write-capable handle even when only flushing.
      const fd = openSync(temp, 'r+');
      try { fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(temp, final);
      this.flushDirectory();
    } catch (error) {
      if (this.fileExists(temp)) unlinkSync(temp);
      throw error;
    }
  }

  private flushDirectory(): void {
    if (!this.directory) return;
    // Directory fsync isn't supported by every platform or filesystem.
    try {
      const fd = openSync(this.directory, 'r');
      try { fsyncSync(fd); } finally { closeSync(fd); }
    } catch { /* best effort only */ }
  }
}
