/**
 * make.fun entry — competition "news-image-20261120".
 *
 * The day this entry sums up is Friday 20 November 2026. The front page that
 * carries it is the entry.png sitting next to this file: the judge is shown
 * exactly those bytes and nothing else.
 *
 * This program therefore has one job: hand the grader a verified copy of that
 * image at <MAKEFUN_OUTPUT_DIR ?? /output>/entry.png. Nothing is fetched, no
 * dependency is installed, and the same bytes leave the program on every run.
 *
 * Outside the grader's container MAKEFUN_OUTPUT_DIR stands in for /output:
 *   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_DIR = dirname(fileURLToPath(import.meta.url));
const SOURCE_PNG = join(REPO_DIR, 'entry.png');
const OUTPUT_PNG = join(process.env.MAKEFUN_OUTPUT_DIR ?? '/output', 'entry.png');

/** The gate's ceilings: 1 MiB of bytes, 1024 by 1024 pixels. */
const MAX_BYTES = 1_048_576;
const MAX_EDGE = 1024;

/** The eight bytes every PNG begins with. */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Stop the run with a message that names the check that failed. */
function fail(check: string, detail: string): never {
  console.error(`entry.png check failed [${check}]: ${detail}`);
  process.exit(1);
}

let source: Buffer;
try {
  source = readFileSync(SOURCE_PNG);
} catch (err) {
  fail('source-readable', `cannot read ${SOURCE_PNG}: ${(err as Error).message}`);
}

// 1. The file must really be a PNG.
if (source.length < PNG_SIGNATURE.length || !source.subarray(0, 8).equals(PNG_SIGNATURE)) {
  fail(
    'png-magic',
    `expected the PNG signature 89 50 4E 47 0D 0A 1A 0A, got ${source.subarray(0, 8).toString('hex')}`,
  );
}

// 2. The gate refuses anything over 1 MiB.
if (source.length > MAX_BYTES) {
  fail('size-limit', `${source.length} bytes is over the ${MAX_BYTES} byte limit`);
}

// 3. The first chunk of a PNG is IHDR: a 13-byte header chunk whose width and
//    height are big-endian 32-bit integers at bytes 16..23.
if (source.length < 24 || source.subarray(12, 16).toString('latin1') !== 'IHDR') {
  fail('ihdr-present', 'no IHDR chunk where a PNG header must start at byte 12');
}
if (source.readUInt32BE(8) !== 13) {
  fail('ihdr-length', `IHDR chunk declares ${source.readUInt32BE(8)} bytes, expected 13`);
}
const width = source.readUInt32BE(16);
const height = source.readUInt32BE(20);

// 4. Walk the chunk list to find the IEND chunk that closes a whole PNG.
let iendFound = false;
for (let offset = 8; offset + 8 <= source.length; ) {
  const length = source.readUInt32BE(offset);
  const type = source.subarray(offset + 4, offset + 8).toString('latin1');
  if (type === 'IEND') {
    iendFound = true;
    break;
  }
  offset += 12 + length; // length + type + data + CRC
}
if (!iendFound) {
  fail('iend-present', 'the chunk list holds no IEND chunk, so the image is truncated');
}

// 5. Neither edge may exceed 1024 pixels, and neither may be zero.
if (width === 0 || height === 0) {
  fail('ihdr-dimensions', `IHDR declares ${width}x${height}, both edges must be positive`);
}
if (width > MAX_EDGE || height > MAX_EDGE) {
  fail('dimension-limit', `${width}x${height} is over the ${MAX_EDGE}x${MAX_EDGE} pixel limit`);
}

// Write the very bytes that were validated, creating the output directory when
// the container gives us none.
mkdirSync(dirname(OUTPUT_PNG), { recursive: true });
writeFileSync(OUTPUT_PNG, source);

// Only claim success once the file on disk is byte-identical to the source.
const written = readFileSync(OUTPUT_PNG);
if (written.length !== source.length || !written.equals(source)) {
  fail('byte-identical', `${OUTPUT_PNG} differs from ${SOURCE_PNG} after writing`);
}

console.log(
  `wrote ${OUTPUT_PNG} — ${written.length} bytes, ${width}x${height} PNG, byte-identical to ${SOURCE_PNG}`,
);
