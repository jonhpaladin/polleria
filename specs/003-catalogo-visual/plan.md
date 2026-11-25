# Plan 003 — Catálogo visual con imágenes

- Spec: `specs/003-catalogo-visual/spec.md`
- Prompts: `specs/003-catalogo-visual/prompts.md`
- Constitución: `docs/constitution.md` v1.0
- Estado: implementado (2026-11-25); validación visual/offline pendiente
- Dependencia: Specs 001, 002, 007 y 012 cerradas

## 1. Estructura prevista

| Archivo | Responsabilidad | RF |
|---|---|---|
| `frontend/src/assets/products/<nombre>.webp` | Una imagen por producto activo | RF-003-01…03, 08 |
| `frontend/src/lib/productImages.ts` | Mapa SKU → archivo, respaldo e inicial | RF-003-01, 04, 07 |
| `frontend/src/components/pos/ProductCard.tsx` | Tarjeta con imagen, texto y chips | RF-003-01, 04…06, 09, 11 |
| `frontend/src/components/pos/ProductGrid.tsx` | Rejilla 2/3/4 columnas | RF-003-10 |
| `frontend/vite.config.ts` | Precache de WebP en el service worker | RF-003-03 |
| `frontend/src/lib/productImages.test.ts` | Cobertura SKU ↔ imagen | RF-003-07 |
| `frontend/src/components/pos/ProductCard.test.tsx` | Imagen, respaldo, chips y accesibilidad | RF-003-01, 04…06, 09, 11 |
| `frontend/scripts/check-product-images.mjs` | Presencia, peso por imagen y peso total | RF-003-08 |

No se toca backend, Alembic, Dexie ni el contrato del ticket. No se agregan dependencias.

## 2. Contrato de assets

```text
frontend/src/assets/products/<nombre-descriptivo>.webp
```

| Regla | Valor |
|---|---|
| Formato | WebP |
| Tamaño | 512×512 px, recorte cuadrado |
| Peso | ≤60 KB por imagen; ≤2 MB el set de 25 |
| Fondo | Crema cálido, madera clara |
| Paleta | Rojo `#D32F2F`, amarillo `#FBC02D`, crema `#FFFBF5` |
| Luz | Difusa desde la izquierda |
| Ángulo | Cenital con inclinación suave (~45°) |
| Mascota | Sello pequeño arriba a la derecha; si la IA no la mantiene, se superpone el SVG |
| Prohibido | Texto, precios, logotipos, marcas de agua, manos y personas |
| Nombre | Descriptivo, minúsculas y sin acentos (`pollo-entero.webp`) |

Las imágenes se importan con `import.meta.glob` y Vite les asigna URL con hash. El service
worker las precachea con `webp` dentro de `globPatterns`.

## 3. Estilo y prompts

El estilo y los 25 prompts están en `prompts.md`. Resumen del estilo:

- Fotografía de estudio cálida, no caricatura.
- Fondo crema, madera clara y acentos rojo/amarillo del letrero.
- Vista cenital suave, luz difusa, sombra natural.
- Sin texto: el nombre, la unidad y el precio los pinta la tarjeta.
- La mascota es un sello pequeño; si el modelo la dibuja distinta, se oculta y se superpone el
  `BrandMark` real en la tarjeta.

| SKU | Producto | Archivo |
|---|---|---|
| `POLLO-ENTERO` | Pollo entero | `pollo-entero.webp` |
| `PIERNA-MUSLO` | Pierna y muslo | `pierna-muslo.webp` |
| `ALITAS` | Alitas | `alitas.webp` |
| `PECHUGA` | Pechuga | `pechuga.webp` |
| `MILANESA` | Milanesa | `milanesa.webp` |
| `PATITAS` | Patitas | `patitas.webp` |
| `MENUDENCIAS` | Menudencias | `menudencias.webp` |
| `NUGGETS` | Nuggets | `nuggets.webp` |
| `POLLO-KFC` | Pollo KFC | `pollo-kfc.webp` |
| `CARNE-HAMBURGUESA` | Carne para hamburguesa | `carne-hamburguesa.webp` |
| `ALBONDIGAS` | Albóndigas | `albondigas.webp` |
| `EMPANADA-POLLO` | Empanadas de pollo | `empanada-pollo.webp` |
| `EMPANADA-JAMON` | Empanadas de jamón y queso | `empanada-jamon-queso.webp` |
| `EMPANADA-CHAMPINON` | Empanadas de champiñón y queso | `empanada-champinon-queso.webp` |
| `TEPPANYAKI` | Teppanyaki | `teppanyaki.webp` |
| `JARDINERA` | A la jardinera | `jardinera.webp` |
| `POBLANO` | Poblano | `poblano.webp` |
| `ADOBADO` | Adobado | `adobado.webp` |
| `HUEVO` | Huevo | `huevo.webp` |
| `PAPAS-FRANCESA` | Papas a la francesa | `papas-francesa.webp` |
| `PAPAS-GAJO` | Papas gajo | `papas-gajo.webp` |
| `MOLE-DULCE` | Mole dulce | `mole-dulce.webp` |
| `MOLE-POBLANO` | Mole poblano | `mole-poblano.webp` |
| `MOLE-RANCHERO` | Mole ranchero | `mole-ranchero.webp` |
| `DEDOS-QUESO` | Dedos de queso | `dedos-queso.webp` |

## 4. Flujo de generación

```text
1. Generar el set con los prompts de prompts.md y una semilla fija.
2. Revisar la hoja de contactos: sujeto, fondo, luz, ángulo y mascota.
3. Regenerar solo las imágenes que rompan el estilo.
4. Entregar PNG/JPG con el nombre de la tabla.
5. Recortar a 512×512, convertir a WebP con Pillow y bajar de 60 KB.
6. Guardar en frontend/src/assets/products/.
7. Ejecutar scripts/check-product-images.mjs (cobertura y peso).
```

No se versionan las fuentes en alta resolución: solo el WebP optimizado.

## 5. Implementación

### Mapa de imágenes

```ts
// frontend/src/lib/productImages.ts
const modules = import.meta.glob("../assets/products/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const PRODUCT_IMAGE_BY_SKU: Readonly<Record<string, string>> = {
  "POLLO-ENTERO": "pollo-entero",
  "PIERNA-MUSLO": "pierna-muslo",
  // ...los 25 SKU con imagen
};
export const INTENTIONAL_FALLBACKS: readonly string[] = [];

export function productImageUrl(sku: string): string | null;
export function fallbackInitial(name: string): string;
```

### Tarjeta

- Imagen de fondo con degradado crema→transparente para que el texto tenga contraste.
- Nombre, unidad y precio de la hoja del día; chips de promoción/mayoreo.
- Respaldo con la inicial y el color de la categoría si falta la imagen.
- Un solo control interactivo; `alt=""`; foco visible; target de 48 px.

### Rejilla y precache

- 2 columnas a 360 px, 3 en tablet, 4 en laptop.
- `webp` en `workbox.globPatterns`; `width`/`height` declarados para evitar saltos.

## 6. Pruebas

- Cobertura de los 25 SKU activos contra el mapa.
- Peso por archivo y total.
- Imagen presente, respaldo, chips, `alt=""` y precio de la hoja.
- Layout a 360/768/1280 y smoke sin red.
- `lint`, `typecheck`, `test`, `build`, `seed:check` e `images:check` en verde.
