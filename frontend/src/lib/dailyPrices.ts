import { assertCents, centsToDecimal } from "@/lib/money";
import type { Catalog, Cents, Product, ProductPrice } from "@/types/catalog";
import type {
  DailyPrice,
  DailyPriceDraft,
  DailyPriceSource,
} from "@/types/dailyPrice";

export const APP_TIME_ZONE = "America/Mexico_City";

function productPrice(product: Product, tier: ProductPrice["tier"]): Cents | null {
  return product.prices.find((price) => price.tier === tier)?.priceCents ?? null;
}

function baseNormalPrice(product: Product): Cents {
  const normal = productPrice(product, "lista") ?? product.prices.find((price) => price.isDefault)?.priceCents;
  if (normal === undefined) {
    throw new Error(`El producto ${product.sku} no tiene precio normal`);
  }
  return normal;
}

export function businessDate(now: Date, timeZone = APP_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function baseDailyPrice(product: Product, date: string, updatedAtUtc: string): DailyPrice {
  return {
    id: `${date}:${product.id}`,
    businessDate: date,
    productId: product.id,
    unit: product.unit,
    normalPriceCents: baseNormalPrice(product),
    promotionPriceCents: productPrice(product, "promocion"),
    wholesalePriceCents: productPrice(product, "mayoreo"),
    updatedAtUtc,
  };
}

export function buildBaseDailyPrices(
  catalog: Catalog,
  date: string,
  updatedAtUtc: string,
): DailyPrice[] {
  return catalog.products
    .filter((product) => product.active)
    .map((product) => baseDailyPrice(product, date, updatedAtUtc));
}

export function copyDailyPrices(
  catalog: Catalog,
  date: string,
  previous: readonly DailyPrice[],
  updatedAtUtc: string,
): DailyPrice[] {
  const previousByProduct = new Map(previous.map((row) => [row.productId, row]));
  return catalog.products
    .filter((product) => product.active)
    .map((product) => {
      const old = previousByProduct.get(product.id);
      if (old && old.unit === product.unit) {
        return { ...old, id: `${date}:${product.id}`, businessDate: date, updatedAtUtc };
      }
      return baseDailyPrice(product, date, updatedAtUtc);
    });
}

export function selectDailyPrice(
  row: DailyPrice,
  source: DailyPriceSource,
): Cents | null {
  if (source === "lista") return row.normalPriceCents;
  if (source === "promocion") return row.promotionPriceCents;
  return row.wholesalePriceCents;
}

export function parseOptionalPrice(raw: string): Cents | null {
  const text = raw.trim();
  if (text === "") return null;
  const match = /^(\d{1,8})(?:\.(\d{0,2}))?$/.exec(text);
  if (!match) {
    throw new Error("Usa un precio como 150.00, con máximo dos decimales");
  }
  const pesos = Number(match[1]);
  const centsPart = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = pesos * 100 + centsPart;
  if (cents <= 0) {
    throw new Error("El precio debe ser mayor que cero");
  }
  return assertCents(cents);
}

/** Precio manual unitario: positivo, máximo dos decimales y en centavos enteros. */
export function validateManualPrice(raw: string): Cents {
  const cents = parseOptionalPrice(raw);
  if (cents === null) throw new Error("El precio manual es obligatorio");
  return cents;
}

export function dailyPriceToDraft(row: DailyPrice): DailyPriceDraft {
  const money = (cents: Cents | null) => (cents === null ? "" : centsToDecimal(cents));
  return {
    productId: row.productId,
    normal: money(row.normalPriceCents),
    promotion: money(row.promotionPriceCents),
    wholesale: money(row.wholesalePriceCents),
  };
}
