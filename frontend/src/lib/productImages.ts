import imageMap from "@/data/productImageMap.json";

const modules = import.meta.glob("../assets/products/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const URL_BY_NAME: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const name = path.split("/").at(-1)?.replace(/\.webp$/, "");
  if (name) URL_BY_NAME[name] = url;
}

/** SKU activo → nombre descriptivo del archivo, sin extensión. */
export const PRODUCT_IMAGE_BY_SKU: Readonly<Record<string, string>> = imageMap.images;

/** Productos que usan el respaldo con inicial a propósito; hoy ninguno. */
export const INTENTIONAL_FALLBACKS: readonly string[] = imageMap.fallbacks;

export function productImageUrl(sku: string): string | null {
  const name = PRODUCT_IMAGE_BY_SKU[sku];
  return name ? (URL_BY_NAME[name] ?? null) : null;
}

/** Inicial para la tarjeta cuando no hay imagen. */
export function fallbackInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "?";
}
