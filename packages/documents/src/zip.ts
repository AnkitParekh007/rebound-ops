import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

/**
 * Minimal ZIP reader/writer (PKWARE APPNOTE): enough for DOCX packages.
 * Reading is defensive because imported files are untrusted.
 */

export interface ZipLimits {
  maxEntries: number;
  maxTotalUncompressed: number;
  maxEntryUncompressed: number;
}

export const DEFAULT_ZIP_LIMITS: ZipLimits = {
  maxEntries: 2000,
  maxTotalUncompressed: 40 * 1024 * 1024,
  maxEntryUncompressed: 20 * 1024 * 1024,
};

export class ZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipError';
  }
}

/** Reads the named entries (or all) from a ZIP buffer. */
export function readZip(buf: Buffer, wanted?: ReadonlySet<string>, limits: ZipLimits = DEFAULT_ZIP_LIMITS): Map<string, Buffer> {
  const EOCD = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipError('Not a ZIP archive.');
  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (count > limits.maxEntries) throw new ZipError('Archive has too many entries.');

  const out = new Map<string, Buffer>();
  let total = 0;
  let p = cdOffset;
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new ZipError('Corrupt central directory.');
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    p += 46 + nameLen + extraLen + commentLen;

    if (wanted && !wanted.has(name)) continue;
    if (flags & 0x1) throw new ZipError('Encrypted archives are not supported.');
    if (size > limits.maxEntryUncompressed || (total += size) > limits.maxTotalUncompressed) {
      throw new ZipError('Archive is too large when uncompressed.');
    }
    if (localOffset + 30 > buf.length || buf.readUInt32LE(localOffset) !== 0x04034b50) throw new ZipError('Corrupt local header.');
    const dataStart = localOffset + 30 + buf.readUInt16LE(localOffset + 26) + buf.readUInt16LE(localOffset + 28);
    const raw = buf.subarray(dataStart, dataStart + compSize);
    let data: Buffer;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) data = inflateRawSync(raw, { maxOutputLength: limits.maxEntryUncompressed });
    else throw new ZipError(`Unsupported compression method ${method}.`);
    if (data.length !== size) throw new ZipError('Entry size mismatch.');
    out.set(name, data);
  }
  return out;
}

/** Writes a ZIP with deflate compression and a fixed timestamp (reproducible output). */
export function writeZip(entries: readonly { name: string; data: Buffer | string }[]): Buffer {
  const DOS_TIME = 0;
  const DOS_DATE = (2020 - 1980) << 9 | (1 << 5) | 1; // 2020-01-01
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const data = typeof e.data === 'string' ? Buffer.from(e.data, 'utf8') : e.data;
    const comp = deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, comp);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}
