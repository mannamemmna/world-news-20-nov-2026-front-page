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
const IHDR_LENGTH = 13; // width, height, bit depth, colour type, compression, filter, interlace

/** What the gate needs to know about an image before it is allowed through. */
type PngFacts = { width: number; height: number; bytes: number };

/**
 * Validate a buffer as a whole PNG within the gate's limits and report its
 * geometry. Every rejection is thrown with a message naming the failed check,
 * so a caller can report it verbatim.
 */
function inspectPng(buf: Buffer): PngFacts {
  // 1. The file must really be a PNG.
  if (buf.length < PNG_SIGNATURE.length || !buf.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(
      `png-magic: expected the signature 89 50 4E 47 0D 0A 1A 0A, got ${buf.subarray(0, 8).toString('hex')}`,
    );
  }

  // 2. The gate refuses anything over 1 MiB.
  if (buf.length > MAX_BYTES) {
    throw new Error(`size-limit: ${buf.length} bytes is over the ${MAX_BYTES} byte limit`);
  }

  // 3. The first chunk of a PNG is IHDR: a 13-byte header chunk whose width and
  //    height are big-endian 32-bit integers at bytes 16..23.
  if (buf.length < 8 + 4 + 4 + IHDR_LENGTH || buf.subarray(12, 16).toString('latin1') !== 'IHDR') {
    throw new Error('ihdr-present: no IHDR chunk where a PNG header must start at byte 12');
  }
  if (buf.readUInt32BE(8) !== IHDR_LENGTH) {
    throw new Error(`ihdr-length: IHDR chunk declares ${buf.readUInt32BE(8)} bytes, expected ${IHDR_LENGTH}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);

  // 4. Walk the chunk list to find the IEND chunk that closes a whole PNG.
  let chunkStart = 8;
  let closed = false;
  while (chunkStart + 8 <= buf.length) {
    const dataLength = buf.readUInt32BE(chunkStart);
    const chunkType = buf.subarray(chunkStart + 4, chunkStart + 8).toString('latin1');
    if (chunkType === 'IEND') {
      closed = true;
      break;
    }
    chunkStart += 12 + dataLength; // length + type + data + CRC
  }
  if (!closed) {
    throw new Error('iend-present: the chunk list holds no IEND chunk, so the image is truncated');
  }

  // 5. Both edges must be present and within the pixel ceiling.
  if (width === 0 || height === 0) {
    throw new Error(`ihdr-dimensions: IHDR declares ${width}x${height}, both edges must be positive`);
  }
  if (width > MAX_EDGE || height > MAX_EDGE) {
    throw new Error(`dimension-limit: ${width}x${height} is over the ${MAX_EDGE}x${MAX_EDGE} pixel limit`);
  }

  return { width, height, bytes: buf.length };
}

/** Exit non-zero with the failed check's own message. */
function abort(check: string, detail: string): never {
  console.error(`entry.png check failed [${check}]: ${detail}`);
  process.exit(1);
}

let source: Buffer;
try {
  source = readFileSync(SOURCE_PNG);
} catch (err) {
  abort('source-readable', `cannot read ${SOURCE_PNG}: ${(err as Error).message}`);
}

let facts: PngFacts;
try {
  facts = inspectPng(source);
} catch (err) {
  const message = (err as Error).message;
  const split = message.indexOf(': ');
  abort(
    split > 0 ? message.slice(0, split) : 'inspect',
    split > 0 ? message.slice(split + 2) : message,
  );
}

// Write the very bytes that were validated, creating the output directory when
// the container gives us none.
mkdirSync(dirname(OUTPUT_PNG), { recursive: true });
writeFileSync(OUTPUT_PNG, source);

// Only claim success once the file on disk is byte-identical to the source.
const written = readFileSync(OUTPUT_PNG);
const identical =
  written.byteLength === source.byteLength &&
  written.compare(source) === 0 &&
  source.compare(written) === 0;
if (!identical) {
  abort(
    'byte-identical',
    `${OUTPUT_PNG} (${written.byteLength} bytes) does not match ${SOURCE_PNG} (${source.byteLength} bytes)`,
  );
}

console.log(
  `wrote ${OUTPUT_PNG} — ${facts.bytes} bytes, ${facts.width}x${facts.height} PNG, ` +
    `byte-identical to ${SOURCE_PNG}`,
);
