import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, "../public");

const BG = [179, 38, 30];
const FG = [255, 247, 237];
const SS = 4;

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function insideRoundedRect(x, y, size, radius) {
  const inner = Math.min(Math.max(x, radius), size - radius);
  const innerY = Math.min(Math.max(y, radius), size - radius);
  return (x - inner) ** 2 + (y - innerY) ** 2 <= radius ** 2;
}

function insideEllipse(x, y, cx, cy, rx, ry) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

function insideCapsule(x, y, x1, y1, x2, y2, radius) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  return (x - px) ** 2 + (y - py) ** 2 <= radius ** 2;
}

function insideDrumstick(x, y, size) {
  const meat = insideEllipse(x, y, size * 0.43, size * 0.42, size * 0.23, size * 0.21);
  const bone = insideCapsule(x, y, size * 0.5, size * 0.5, size * 0.72, size * 0.72, size * 0.045);
  const knobA = insideEllipse(x, y, size * 0.76, size * 0.69, size * 0.065, size * 0.065);
  const knobB = insideEllipse(x, y, size * 0.69, size * 0.76, size * 0.065, size * 0.065);
  return meat || bone || knobA || knobB;
}

function drawIcon(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = maskable ? 0 : size * 0.22;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let backgroundHits = 0;
      let foregroundHits = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          if (insideRoundedRect(px, py, size, radius)) {
            backgroundHits += 1;
            if (insideDrumstick(px, py, size)) {
              foregroundHits += 1;
            }
          }
        }
      }
      const samples = SS * SS;
      const alpha = backgroundHits / samples;
      const foreground = foregroundHits / samples;
      const offset = (y * size + x) * 4;
      rgba[offset] = Math.round(BG[0] * (1 - foreground) + FG[0] * foreground);
      rgba[offset + 1] = Math.round(BG[1] * (1 - foreground) + FG[1] * foreground);
      rgba[offset + 2] = Math.round(BG[2] * (1 - foreground) + FG[2] * foreground);
      rgba[offset + 3] = Math.round(alpha * 255);
    }
  }

  return encodePng(size, size, rgba);
}

mkdirSync(publicDir, { recursive: true });

for (const size of [192, 512]) {
  writeFileSync(resolve(publicDir, `icon-${size}.png`), drawIcon(size, false));
  writeFileSync(resolve(publicDir, `maskable-${size}.png`), drawIcon(size, true));
}

console.log("Iconos PWA generados en public/ (192 y 512, normal y maskable).");
