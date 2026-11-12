import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { createDb, type PolleriaDb } from "@/lib/db";
import { loadCatalog, readCatalog, seedIfEmpty, writeCatalog } from "@/lib/catalogRepository";
import { makeCatalog } from "@/test/fixtures";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(name?: string): PolleriaDb {
  const db = createDb(name ?? `polleria-repo-test-${counter++}`);
  openDbs.push(db);
  return db;
}

afterEach(async () => {
  for (const db of openDbs.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

describe("catalogRepository", () => {
  it("siembra en el primer arranque y reporta origen semilla", async () => {
    const db = newDb();
    const seed = makeCatalog();

    const loaded = await loadCatalog(seed, db);

    expect(loaded.origin).toBe("seed");
    expect(loaded.catalog.products).toHaveLength(2);
    expect(await readCatalog(db)).toEqual(seed);
  });

  it("la segunda lectura devuelve lo local sin duplicar", async () => {
    const db = newDb();
    const seed = makeCatalog();

    await seedIfEmpty(seed, db);
    const second = await seedIfEmpty(seed, db);

    expect(second.origin).toBe("local");
    expect(await db.products.count()).toBe(2);
    expect(await db.categories.count()).toBe(3);
  });

  it("una escritura fallida conserva la versión anterior", async () => {
    const db = newDb();
    const original = makeCatalog();
    await writeCatalog(original, db);

    const broken = {
      ...original,
      products: [...original.products, { ...original.products[0]!, id: "prd-duplicado" }],
    };
    await expect(writeCatalog(broken, db)).rejects.toThrow();

    expect(await readCatalog(db)).toEqual(original);
  });

  it("conserva un catálogo vacío en vez de re-sembrarlo", async () => {
    const db = newDb();
    const empty = { ...makeCatalog(), categories: [], products: [] };
    await writeCatalog(empty, db);

    const loaded = await loadCatalog(makeCatalog(), db);

    expect(loaded.origin).toBe("local");
    expect(loaded.catalog).toEqual(empty);
  });

  it("actualiza la versión en la meta al escribir", async () => {
    const db = newDb();
    const original = makeCatalog();
    await writeCatalog(original, db);

    const updated = { ...original, updatedAt: "2026-11-12T10:00:00Z" };
    await writeCatalog(updated, db);

    expect((await readCatalog(db))?.updatedAt).toBe("2026-11-12T10:00:00Z");
  });

  it("devuelve la semilla en memoria si IndexedDB falla", async () => {
    const seed = makeCatalog();
    const broken = {
      transaction: () => {
        throw new DOMException("VersionError", "VersionError");
      },
    } as unknown as PolleriaDb;

    const loaded = await loadCatalog(seed, broken);

    expect(loaded.origin).toBe("fallback");
    expect(loaded.catalog).toEqual(seed);
  });
});
