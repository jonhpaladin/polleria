import { useState } from "react";

import { dailyPriceToDraft, parseOptionalPrice } from "@/lib/dailyPrices";
import { centsToDecimal } from "@/lib/money";
import type { Catalog } from "@/types/catalog";
import type { DailyPrice, DailyPriceDraft } from "@/types/dailyPrice";

interface DailyPricesTabProps {
  catalog: Catalog | null;
  rows: DailyPrice[];
  businessDate: string | null;
  loading: boolean;
  saving: boolean;
  canSave: boolean;
  error: string | null;
  onSave: (drafts: readonly DailyPriceDraft[]) => Promise<boolean>;
}

type DraftField = keyof Omit<DailyPriceDraft, "productId">;

const FIELD_LABEL: Record<DraftField, string> = {
  normal: "Precio normal",
  promotion: "Precio de promoción",
  wholesale: "Precio de mayoreo",
};

function rowsToDrafts(rows: readonly DailyPrice[]): DailyPriceDraft[] {
  return rows.map(dailyPriceToDraft);
}

function fieldKey(productId: string, field: DraftField): string {
  return `${field}:${productId}`;
}

/** Tabla rápida y local para preparar los precios del día. */
export function DailyPricesTab({
  catalog,
  rows,
  businessDate,
  loading,
  saving,
  canSave,
  error,
  onSave,
}: DailyPricesTabProps) {
  const [drafts, setDrafts] = useState<DailyPriceDraft[]>(() => rowsToDrafts(rows));
  const [knownRows, setKnownRows] = useState(rows);
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(() => new Set());
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Ajuste de estado durante el render: si la hoja cambió (guardado o refresco),
  // se conservan los campos que el cajero está editando y se refresca el resto.
  if (rows !== knownRows) {
    const dirty = dirtyFields;
    const current = new Map(drafts.map((draft) => [draft.productId, draft]));
    setKnownRows(rows);
    setDrafts(
      rows.map((row) => {
        const next = dailyPriceToDraft(row);
        const editing = current.get(row.productId);
        if (!editing) return next;
        return {
          productId: row.productId,
          normal: dirty.has(fieldKey(row.productId, "normal")) ? editing.normal : next.normal,
          promotion: dirty.has(fieldKey(row.productId, "promotion"))
            ? editing.promotion
            : next.promotion,
          wholesale: dirty.has(fieldKey(row.productId, "wholesale"))
            ? editing.wholesale
            : next.wholesale,
        };
      }),
    );
    setFieldErrors({});
  }

  if (loading || !catalog) {
    return <p className="px-4 py-10 text-center text-stone-600">Cargando precios del día…</p>;
  }

  const productById = new Map(catalog.products.map((product) => [product.id, product]));

  const updateDraft = (productId: string, field: DraftField, value: string) => {
    setDrafts((current) =>
      current.map((draft) => (draft.productId === productId ? { ...draft, [field]: value } : draft)),
    );
    setDirtyFields((current) => new Set(current).add(fieldKey(productId, field)));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[fieldKey(productId, field)];
      return next;
    });
    setSavedMessage(null);
  };

  function validateDrafts(): boolean {
    const errors: Record<string, string> = {};
    for (const draft of drafts) {
      for (const field of ["normal", "promotion", "wholesale"] as const) {
        try {
          const cents = parseOptionalPrice(draft[field]);
          if (field === "normal" && cents === null) {
            errors[fieldKey(draft.productId, field)] = "El precio normal es obligatorio.";
          }
        } catch {
          errors[fieldKey(draft.productId, field)] = "Usa un precio como 150.00, mayor que cero.";
        }
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateDrafts()) return;
    const ok = await onSave(drafts);
    if (ok) {
      const normalize = (value: string) => {
        const cents = parseOptionalPrice(value);
        return cents === null ? "" : centsToDecimal(cents);
      };
      setDrafts((current) =>
        current.map((draft) => ({
          productId: draft.productId,
          normal: normalize(draft.normal),
          promotion: normalize(draft.promotion),
          wholesale: normalize(draft.wholesale),
        })),
      );
      setDirtyFields(new Set());
    }
    setSavedMessage(ok ? "Precios del día guardados." : null);
  }

  return (
    <section aria-labelledby="precios-title" className="px-4 pb-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            Precios del día
          </p>
          <h2 id="precios-title" className="text-2xl font-black text-stone-900">
            {businessDate ?? "Hoy"}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Se copian del último día disponible; edita solo lo que cambió.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !canSave}
          className="min-h-12 rounded-full bg-brand-600 px-5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
        >
          {saving ? "Guardando…" : "Guardar precios"}
        </button>
      </div>

      {!canSave ? (
        <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
          La base local no está disponible. Estos precios son temporales y no se pueden guardar.
        </p>
      ) : null}
      {error ? <p className="mb-4 text-sm text-red-700" role="alert">{error}</p> : null}
      {savedMessage ? <p className="mb-4 text-sm text-emerald-700" role="status" aria-live="polite">{savedMessage}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-[760px] w-full text-left text-sm">
          <caption className="sr-only">Precios del catálogo para el día {businessDate}</caption>
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-600">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Normal</th>
              <th className="px-4 py-3">Promoción</th>
              <th className="px-4 py-3">Mayoreo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {drafts.map((draft) => {
              const product = productById.get(draft.productId);
              const row = rows.find((item) => item.productId === draft.productId);
              if (!product || !row) return null;
              return (
                <tr key={draft.productId}>
                  <th scope="row" className="min-w-56 px-4 py-3 font-semibold text-stone-900">
                    <span className="block">{product.name}</span>
                    <span className="text-xs font-normal text-stone-500">
                      {row.unit === "kg" ? "por kilo" : "por pieza"}
                    </span>
                  </th>
                  {(["normal", "promotion", "wholesale"] as const).map((field) => {
                    const key = fieldKey(product.id, field);
                    const fieldError = fieldErrors[key];
                    return (
                      <td key={field} className="px-4 py-3 align-top">
                        <label className="sr-only" htmlFor={key}>
                          {FIELD_LABEL[field]} de {product.name}
                        </label>
                        <input
                          id={key}
                          name={`${field}-${product.sku}`}
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={draft[field]}
                          aria-invalid={fieldError ? true : undefined}
                          aria-describedby={fieldError ? `${key}-error` : undefined}
                          onChange={(event) => updateDraft(product.id, field, event.target.value)}
                          placeholder={field === "normal" ? centsToDecimal(row.normalPriceCents) : "—"}
                          className="min-h-12 w-32 rounded-xl border border-stone-300 bg-white px-3 text-right tabular-nums text-stone-900 outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-200 aria-invalid:border-red-500"
                        />
                        {fieldError ? (
                          <p id={`${key}-error`} className="mt-1 w-32 text-xs font-semibold text-red-700">
                            {fieldError}
                          </p>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
