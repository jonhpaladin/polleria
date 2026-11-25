import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(
  readFileSync(resolve(here, "../../backend/app/seeds/catalog.json"), "utf8"),
);
const imageMap = JSON.parse(
  readFileSync(resolve(here, "../src/data/productImageMap.json"), "utf8"),
);
const productsDir = resolve(here, "../src/assets/products");
const MAX_FILE_BYTES = 60 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

const active = seed.products.filter((product) => product.active);
const activeSkus = new Set(active.map((product) => product.sku));
const fallbacks = new Set(imageMap.fallbacks);
const errors = [];
let totalBytes = 0;
let imageCount = 0;

for (const product of active) {
  if (fallbacks.has(product.sku)) continue;

  const name = imageMap.images[product.sku];
  if (!name) {
    errors.push(`Sin imagen ni respaldo declarado: ${product.sku}`);
    continue;
  }

  const file = resolve(productsDir, `${name}.webp`);
  try {
    const { size } = statSync(file);
    totalBytes += size;
    imageCount += 1;
    if (size > MAX_FILE_BYTES) {
      errors.push(`${name}.webp pesa ${(size / 1024).toFixed(1)} KB (máximo 60 KB)`);
    }
  } catch {
    errors.push(`Falta el archivo ${name}.webp para ${product.sku}`);
  }
}

for (const sku of Object.keys(imageMap.images)) {
  if (!activeSkus.has(sku)) {
    errors.push(`El mapa incluye un SKU inactivo o desconocido: ${sku}`);
  }
}
for (const sku of fallbacks) {
  if (!activeSkus.has(sku)) {
    errors.push(`El respaldo incluye un SKU inactivo o desconocido: ${sku}`);
  }
}
if (totalBytes > MAX_TOTAL_BYTES) {
  errors.push(
    `El set pesa ${(totalBytes / 1024 / 1024).toFixed(2)} MB (máximo 2 MB)`,
  );
}

if (errors.length > 0) {
  console.error("Imágenes del catálogo con errores:");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(
  `Imágenes OK: ${imageCount} con imagen, ${fallbacks.size} con respaldo, ` +
    `${(totalBytes / 1024 / 1024).toFixed(2)} MB.`,
);
