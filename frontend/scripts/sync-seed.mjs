import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../../backend/app/seeds/catalog.json");
const target = resolve(here, "../src/data/seedCatalog.json");
const checkOnly = process.argv.includes("--check");

const expected = readFileSync(source, "utf8");

if (checkOnly) {
  let current = "";
  try {
    current = readFileSync(target, "utf8");
  } catch {
    current = "";
  }
  if (current !== expected) {
    console.error(
      "La semilla del frontend está desincronizada. Ejecuta `npm run seed:sync` y vuelve a intentar.",
    );
    process.exit(1);
  }
  console.log("Semilla sincronizada: frontend y backend coinciden.");
} else {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, expected, "utf8");
  console.log("Semilla copiada de backend/app/seeds/catalog.json a src/data/seedCatalog.json.");
}
