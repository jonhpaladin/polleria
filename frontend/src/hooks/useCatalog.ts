import { useCallback, useEffect, useRef, useState } from "react";

import { fetchCatalog } from "@/lib/api";
import { validateCatalogPayload } from "@/lib/catalog";
import {
  loadCatalog,
  seedCatalog,
  writeCatalog,
  type CatalogOrigin,
  type LoadedCatalog,
} from "@/lib/catalogRepository";
import type { Catalog } from "@/types/catalog";

export interface UseCatalogOptions {
  seed?: Catalog;
  load?: (seed: Catalog) => Promise<LoadedCatalog>;
  fetchRemote?: () => Promise<unknown>;
  save?: (catalog: Catalog) => Promise<void>;
}

export interface UseCatalogResult {
  catalog: Catalog | null;
  origin: CatalogOrigin | "loading";
  online: boolean;
  selectedCategory: string;
  selectCategory: (id: string) => void;
}

/**
 * Arranque local-first: pinta lo local (o la semilla) antes de tocar la red y
 * refresca en segundo plano sin recargar ni perder la categoría seleccionada.
 */
export function useCatalog(options: UseCatalogOptions = {}): UseCatalogResult {
  const [deps] = useState(() => ({
    seed: options.seed ?? seedCatalog,
    load: options.load ?? ((seed: Catalog) => loadCatalog(seed)),
    fetchRemote: options.fetchRemote ?? (() => fetchCatalog()),
    save: options.save ?? ((catalog: Catalog) => writeCatalog(catalog)),
  }));

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [origin, setOrigin] = useState<CatalogOrigin | "loading">("loading");
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [selectedCategory, setSelectedCategory] = useState("all");
  const catalogRef = useRef<Catalog | null>(null);
  const refreshInFlight = useRef(false);

  const applyCatalog = useCallback((next: Catalog) => {
    catalogRef.current = next;
    setCatalog(next);
  }, []);

  /** Refresco remoto; también se usa al recuperar la conexión (cierre de 001). */
  const refreshRemote = useCallback(async () => {
    if (refreshInFlight.current) {
      return;
    }
    refreshInFlight.current = true;
    try {
      let raw: unknown;
      try {
        raw = await deps.fetchRemote();
      } catch (error) {
        setOnline(false);
        console.warn("CATALOG_REFRESH_FAILED", error);
        return;
      }

      setOnline(true);
      const result = validateCatalogPayload(raw);
      if (!result.ok) {
        console.warn("CATALOG_PAYLOAD_INVALID", result.error);
        return;
      }

      const current = catalogRef.current;
      if (current !== null && result.catalog.updatedAt === current.updatedAt) {
        return;
      }

      try {
        await deps.save(result.catalog);
      } catch (error) {
        console.warn("CATALOG_SAVE_FAILED", error);
        return;
      }
      applyCatalog(result.catalog);
    } finally {
      refreshInFlight.current = false;
    }
  }, [deps, applyCatalog]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const loaded = await deps.load(deps.seed);
        if (cancelled) {
          return;
        }
        applyCatalog(loaded.catalog);
        setOrigin(loaded.origin);
      } catch (error) {
        if (cancelled) {
          return;
        }
        applyCatalog(deps.seed);
        setOrigin("fallback");
        console.warn("LOCAL_DB_UNAVAILABLE", error);
      }

      void refreshRemote();
    }

    void start();
    return () => {
      cancelled = true;
    };
  }, [deps, applyCatalog, refreshRemote]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void refreshRemote();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refreshRemote]);

  const selectCategory = useCallback((id: string) => {
    setSelectedCategory(id);
  }, []);

  return { catalog, origin, online, selectedCategory, selectCategory };
}
