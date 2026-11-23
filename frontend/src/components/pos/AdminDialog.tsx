import { useEffect, useState, type FormEvent } from "react";

import {
  AdminApiError,
  fetchAdminCatalog,
  updateAdminProduct,
  type AdminPriceInput,
  type AdminProductUpdate,
} from "@/lib/adminApi";
import { parseOptionalPrice } from "@/lib/dailyPrices";
import { centsToDecimal } from "@/lib/money";
import type { Catalog, PriceTier, Unit } from "@/types/catalog";

interface AdminDialogProps {
  onClose: () => void;
  onPublished: () => void;
  onConfigureDeviceKey: () => void;
}

interface DraftRow {
  productId: string;
  name: string;
  categoryName: string;
  unit: Unit;
  active: boolean;
  normal: string;
  promotion: string;
  wholesale: string;
  defaultTier: PriceTier;
}

function priceText(catalogProduct: Catalog["products"][number], tier: PriceTier): string {
  const price = catalogProduct.prices.find((item) => item.tier === tier);
  return price ? centsToDecimal(price.priceCents) : "";
}

function toDraft(
  catalogProduct: Catalog["products"][number],
  categoryNames: Map<string, string>,
): DraftRow {
  return {
    productId: catalogProduct.id,
    name: catalogProduct.name,
    categoryName: categoryNames.get(catalogProduct.categoryId) ?? catalogProduct.categoryId,
    unit: catalogProduct.unit,
    active: catalogProduct.active,
    normal: priceText(catalogProduct, "lista"),
    promotion: priceText(catalogProduct, "promocion"),
    wholesale: priceText(catalogProduct, "mayoreo"),
    defaultTier:
      catalogProduct.prices.find((item) => item.isDefault)?.tier ?? ("lista" as PriceTier),
  };
}

function changed(row: DraftRow, original: DraftRow | undefined): boolean {
  if (!original) return false;
  return (
    row.active !== original.active ||
    row.normal !== original.normal ||
    row.promotion !== original.promotion ||
    row.wholesale !== original.wholesale
  );
}

function buildPrices(row: DraftRow): AdminPriceInput[] {
  const normal = parseOptionalPrice(row.normal);
  if (normal === null) {
    throw new Error(`El precio de lista de ${row.name} es obligatorio.`);
  }

  const prices: AdminPriceInput[] = [
    {
      tier: "lista",
      price: centsToDecimal(normal),
      is_default: row.defaultTier === "lista",
    },
  ];

  for (const { tier, field } of [
    { tier: "promocion", field: "promotion" },
    { tier: "mayoreo", field: "wholesale" },
  ] as const) {
    const cents = parseOptionalPrice(row[field]);
    if (cents !== null) {
      prices.push({
        tier,
        price: centsToDecimal(cents),
        is_default: row.defaultTier === tier,
      });
    }
  }

  if (!prices.some((price) => price.is_default)) {
    const first = prices[0];
    if (first !== undefined) first.is_default = true;
  }
  return prices;
}

function errorMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (error.status === 401) return "La clave no es correcta.";
    if (error.status === 429) return "Demasiados intentos. Espera un minuto.";
    if (error.status === 503) return "La administración no está configurada en la API.";
    return error.message;
  }
  return error instanceof Error ? error.message : "No se pudieron guardar los cambios.";
}

/** Edición de precios y estado del catálogo; la clave vive solo en memoria. */
export function AdminDialog({
  onClose,
  onPublished,
  onConfigureDeviceKey,
}: AdminDialogProps) {
  const [adminKey, setAdminKey] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [initial, setInitial] = useState<Map<string, DraftRow>>(new Map());
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function applyCatalog(catalog: Catalog) {
    const categoryNames = new Map(
      catalog.categories.map((category) => [category.id, category.name]),
    );
    const next = catalog.products.map((product) => toDraft(product, categoryNames));
    setRows(next);
    setInitial(new Map(next.map((row) => [row.productId, { ...row }])));
  }

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminKey.trim()) return;
    setBusy(true);
    setError(null);
    try {
      applyCatalog(await fetchAdminCatalog(adminKey.trim()));
      setUnlocked(true);
    } catch (cause: unknown) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function updateRow(productId: string, patch: Partial<DraftRow>) {
    setRows((current) =>
      current.map((row) => (row.productId === productId ? { ...row, ...patch } : row)),
    );
    setMessage(null);
  }

  const dirtyRows = rows.filter((row) => changed(row, initial.get(row.productId)));

  async function handleSave() {
    if (!adminKey.trim() || dirtyRows.length === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updates: { productId: string; update: AdminProductUpdate }[] = [];
      for (const row of dirtyRows) {
        const original = initial.get(row.productId);
        const update: AdminProductUpdate = {};
        if (row.active !== original?.active) update.active = row.active;
        if (
          row.normal !== original?.normal ||
          row.promotion !== original?.promotion ||
          row.wholesale !== original?.wholesale
        ) {
          update.prices = buildPrices(row);
        }
        updates.push({ productId: row.productId, update });
      }

      for (const item of updates) {
        await updateAdminProduct(item.productId, item.update, adminKey.trim());
      }
      applyCatalog(await fetchAdminCatalog(adminKey.trim()));
      setMessage(
        `Publicado: ${updates.length} producto(s). Las cajas lo recibirán en unos minutos.`,
      );
      onPublished();
    } catch (cause: unknown) {
      if (cause instanceof AdminApiError && cause.status === 401) {
        setUnlocked(false);
        setRows([]);
      }
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-title"
    >
      <div className="flex max-h-dvh w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-cream-50 shadow-xl sm:max-h-[90dvh] sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <h2 id="admin-title" className="text-lg font-black text-brand-700">
              Catálogo y precios
            </h2>
            <p className="text-xs text-stone-500">
              Solo el dueño. La clave no se guarda en este dispositivo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 shrink-0 rounded-full border border-stone-300 px-4 text-sm font-bold text-stone-700"
          >
            Cerrar
          </button>
        </header>

        {!unlocked ? (
          <form onSubmit={handleUnlock} className="space-y-3 p-4">
            <label className="block text-sm font-semibold text-stone-700" htmlFor="admin-key">
              Clave de administración
            </label>
            <input
              id="admin-key"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              className="h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base"
            />
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 w-full rounded-lg bg-brand-600 font-bold text-white disabled:opacity-60"
            >
              {busy ? "Entrando…" : "Entrar"}
            </button>
            {error ? (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}
          </form>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-3 rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-700">
                Guardar publica los cambios al instante y reemplaza la hoja de precios de hoy en
                las cajas conectadas.
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                {rows.map((row) => (
                  <div key={row.productId} className="rounded-xl border border-stone-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-stone-900">{row.name}</p>
                        <p className="text-xs text-stone-500">
                          {row.categoryName} · {row.unit === "kg" ? "por kilo" : "por pieza"}
                        </p>
                      </div>
                      <label className="flex min-h-12 shrink-0 items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={row.active}
                          onChange={(event) =>
                            updateRow(row.productId, { active: event.target.checked })
                          }
                          className="size-5 accent-brand-600"
                        />
                        Activo
                      </label>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <PriceField
                        productName={row.name}
                        label="Lista"
                        value={row.normal}
                        onChange={(value) => updateRow(row.productId, { normal: value })}
                      />
                      <PriceField
                        productName={row.name}
                        label="Promoción"
                        value={row.promotion}
                        onChange={(value) => updateRow(row.productId, { promotion: value })}
                      />
                      <PriceField
                        productName={row.name}
                        label="Mayoreo"
                        value={row.wholesale}
                        onChange={(value) => updateRow(row.productId, { wholesale: value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <footer className="space-y-2 border-t border-stone-200 bg-white p-4">
              {error ? (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                  {message}
                </p>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={busy || dirtyRows.length === 0}
                  className="min-h-12 flex-1 rounded-lg bg-brand-600 px-4 font-bold text-white disabled:opacity-60"
                >
                  {busy ? "Publicando…" : `Guardar y publicar (${dirtyRows.length})`}
                </button>
                <button
                  type="button"
                  onClick={onConfigureDeviceKey}
                  className="min-h-12 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-700"
                >
                  Clave del local
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

interface PriceFieldProps {
  productName: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function PriceField({ productName, label, value, onChange }: PriceFieldProps) {
  return (
    <label className="block text-xs font-semibold text-stone-600">
      {label}
      <input
        type="text"
        inputMode="decimal"
        aria-label={`${label} de ${productName}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0.00"
        className="mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-2 text-right text-base tabular-nums"
      />
    </label>
  );
}
