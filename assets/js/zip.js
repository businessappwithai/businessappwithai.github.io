/**
 * A ZIP writer, in about a hundred lines and with no dependency.
 *
 * Chapter 09 hands the reader the deployable application as one file, and one
 * file means an archive. The obvious answer is a library; the obvious answer is
 * also 90KB of vendored JavaScript to write a format whose entire specification
 * for the case at hand is two fixed-layout headers and a CRC.
 *
 * Two decisions worth stating:
 *
 * - **Compression is the platform's.** `CompressionStream("deflate-raw")` is
 *   the browser's own zlib, which is precisely what a ZIP's method 8 wants, so
 *   there is no deflate implementation here. Where it is missing the entry is
 *   stored uncompressed (method 0) instead — a bigger file that every unzipper
 *   still opens, which is a far better failure than none.
 * - **No ZIP64, deliberately.** A generated application is four hundred small
 *   text files and nine fonts; the 4GB and 65535-entry ceilings are three
 *   orders of magnitude away. Writing ZIP64 for a case that cannot arise would
 *   be more code to be wrong in.
 *
 * Entries are stored with forward slashes and no directory records, which is
 * what every extractor in use expects and what `unzip`, Finder and Explorer all
 * create directories from.
 */

/** CRC-32, table built once. The one piece of the format nothing else provides. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index++) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();

/** Whatever the generator produced, as bytes. */
function toBytes(contents) {
  if (contents instanceof Uint8Array) return contents;
  if (contents instanceof ArrayBuffer) return new Uint8Array(contents);
  return encoder.encode(String(contents));
}

async function deflateRaw(bytes) {
  if (typeof CompressionStream !== "function" || bytes.length === 0) return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    const packed = new Uint8Array(await new Response(stream).arrayBuffer());
    // A file that grew is a file worth storing: the archive is smaller and the
    // extractor does less work.
    return packed.length < bytes.length ? packed : null;
  } catch {
    return null;
  }
}

/** MS-DOS date and time, which is what the format's fixed fields carry. */
function dosStamp(date) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

class Writer {
  constructor(length) {
    this.view = new DataView(new ArrayBuffer(length));
    this.bytes = new Uint8Array(this.view.buffer);
    this.at = 0;
  }
  u16(value) {
    this.view.setUint16(this.at, value, true);
    this.at += 2;
  }
  u32(value) {
    this.view.setUint32(this.at, value >>> 0, true);
    this.at += 4;
  }
  raw(bytes) {
    this.bytes.set(bytes, this.at);
    this.at += bytes.length;
  }
}

/**
 * Build a ZIP from `{ path: contents }`.
 *
 * `contents` may be a string, a `Uint8Array` or an `ArrayBuffer` — the file map
 * a generator returns is text, and the fonts restored beside it are not.
 * Returns a `Blob`, because every caller is about to hand it to a download.
 */
export async function createZip(files, options = {}) {
  const stamp = dosStamp(options.date instanceof Date ? options.date : new Date());
  const entries = [];

  for (const [path, contents] of Object.entries(files)) {
    const name = encoder.encode(String(path).replace(/^\/+/, "").replace(/\\/g, "/"));
    const raw = toBytes(contents);
    const packed = await deflateRaw(raw);
    entries.push({
      name,
      crc: crc32(raw),
      size: raw.length,
      body: packed ?? raw,
      method: packed ? 8 : 0,
    });
  }

  const LOCAL = 30;
  const CENTRAL = 46;
  const END = 22;
  let total = END;
  for (const entry of entries) {
    total += LOCAL + entry.name.length + entry.body.length;
    total += CENTRAL + entry.name.length;
  }

  const out = new Writer(total);
  for (const entry of entries) {
    entry.offset = out.at;
    out.u32(0x04034b50);
    out.u16(20); // version needed
    out.u16(0x0800); // UTF-8 names
    out.u16(entry.method);
    out.u16(stamp.time);
    out.u16(stamp.day);
    out.u32(entry.crc);
    out.u32(entry.body.length);
    out.u32(entry.size);
    out.u16(entry.name.length);
    out.u16(0); // no extra field
    out.raw(entry.name);
    out.raw(entry.body);
  }

  const directoryAt = out.at;
  for (const entry of entries) {
    out.u32(0x02014b50);
    out.u16(20); // version made by
    out.u16(20); // version needed
    out.u16(0x0800);
    out.u16(entry.method);
    out.u16(stamp.time);
    out.u16(stamp.day);
    out.u32(entry.crc);
    out.u32(entry.body.length);
    out.u32(entry.size);
    out.u16(entry.name.length);
    out.u16(0); // extra
    out.u16(0); // comment
    out.u16(0); // disk
    out.u16(0); // internal attributes
    // 0644, as a regular file, in the high half — what unzip reads to set the
    // mode. Without it some extractors create files nobody can read.
    out.u32((0o100644 << 16) >>> 0);
    out.u32(entry.offset);
    out.raw(entry.name);
  }

  // Measured before the end record is written, not after: `out.at` moves as
  // soon as the signature goes down, and a central directory whose recorded
  // size is eight bytes long is an archive every extractor refuses.
  const directoryBytes = out.at - directoryAt;

  out.u32(0x06054b50);
  out.u16(0); // this disk
  out.u16(0); // disk the directory starts on
  out.u16(entries.length);
  out.u16(entries.length);
  out.u32(directoryBytes);
  out.u32(directoryAt);
  out.u16(0); // no archive comment

  return new Blob([out.bytes], { type: "application/zip" });
}
