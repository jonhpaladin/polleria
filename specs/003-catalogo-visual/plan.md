# Plan 003 — Catálogo visual con imágenes

- Spec: `specs/003-catalogo-visual/spec.md`
- Constitución: `docs/constitution.md` v1.0
- Estado: activo (2026-11-13)
- Dependencia: Spec 001 cerrada y Spec 002 cerrada

## 1. Estructura de archivos prevista

| Archivo | Responsabilidad | RF |
|---|---|---|
| `frontend/src/assets/products/<SKU>.webp` | Una imagen por producto activo | RF-003-01…03, 08 |
| `frontend/src/lib/productImages.ts` | Mapa SKU → URL, respaldo e inicial | RF-003-01, 04, 07 |
| `frontend/src/components/pos/ProductCard.tsx` | Tarjeta visual con imagen de fondo, texto y chips | RF-003-01, 04…06, 09, 11 |
| `frontend/src/components/pos/ProductGrid.tsx` | Rejilla 2/3/4 columnas | RF-003-10 |
| `frontend/vite.config.ts` | Precache de WebP en el service worker | RF-003-03 |
| `frontend/src/lib/productImages.test.ts` | Cobertura SKU ↔ imagen | RF-003-07 |
| `frontend/src/components/pos/ProductCard.test.tsx` | Imagen, respaldo, chips y accesibilidad | RF-003-01, 04…06, 09, 11 |
| `frontend/scripts/check-product-images.mjs` | Presencia, peso por imagen y peso total | RF-003-08 |

No se toca backend, Alembic, Dexie ni el contrato del ticket. No se agregan dependencias de
producción ni de desarrollo.

## 2. Contrato de assets

```text
frontend/src/assets/products/<SKU>.webp
```

| Regla | Valor |
|---|---|
| Formato | WebP |
| Tamaño | 512×512 px, recorte cuadrado |
| Peso | ≤60 KB por imagen; ≤2 MB el set de 26 |
| Fondo | Crema liso `#FFF7EA` |
| Luz | Cálida y difusa, desde la izquierda |
| Ángulo | Cenital con inclinación suave (~45°) |
| Prohibido | Texto, logotipos, marcas de agua, manos, utensilios decorativos |
| Nombre | El SKU exacto del catálogo, en mayúsculas |

Las imágenes se importan con `import.meta.glob` y Vite les asigna URL con hash. El service
worker las precachea con `webp` dentro de `globPatterns`.

## 3. Prompt y sujetos

Prompt base, idéntico para todo el set (solo cambia el sujeto):

> Fotografía de producto de estudio de **{sujeto}**, vista cenital con inclinación suave de
> 45°, sobre papel crema liso, luz cálida difusa desde la izquierda, sombra natural sutil,
> encuadre cuadrado 1:1, sin texto, sin logotipos, sin marcas de agua, sin manos, sin
> utensilios decorativos, alta nitidez, estilo de catálogo consistente.

Una muestra aprobada (pierna y muslo) se usa como referencia de estilo para las 25 restantes.

| SKU | Sujeto para la imagen |
|---|---|
| `POLLO-ENTERO` | Pollo entero crudo, limpio, sobre papel crema |
| `POLLO-ASADO` | Pollo entero asado, dorado y brillante |
| `PIERNA-MUSLO` | Piezas de pierna y muslo de pollo crudas |
| `PECHUGA` | Pechuga de pollo cruda entera |
| `ALITAS` | Alitas de pollo crudas acomodadas |
| `MUSLO` | Muslos de pollo crudos |
| `PECHUGA-FILETE` | Filetes de pechuga crudos, ligeramente extendidos |
| `PECHUGA-EMP` | Pechuga empanizada, apanado dorado |
| `POLLO-MILANESA` | Milanesa de pollo empanizada |
| `HIGADO` | Hígado de pollo crudo en trozos |
| `MOLLEJAS` | Mollejas de pollo crudas |
| `COMBO-FAM` | Charola con pollo asado, papas y tortillas |
| `COMBO-PER` | Plato con una pieza de pollo, papas y tortillas |
| `COMBO-PAREJA` | Charola para dos con pollo asado, papas y tortillas |
| `POLLO-ENTERO-PROMO` | Pollo entero asado con acabado glaseado |
| `ALITAS-PROMO` | Alitas glaseadas y brillantes |
| `TORTILLAS` | Tortillas de maíz apiladas |
| `SALSA-ROJA` | Salsa roja en bowl pequeño |
| `SALSA-VERDE` | Salsa verde en bowl pequeño |
| `ENSALADA` | Ensalada de col fresca |
| `PAPAS` | Papas a la francesa doradas |
| `ARROZ` | Arroz rojo cocido en bowl |
| `REFRESCO` | Refresco de cola en vaso, sin marca visible |
| `AGUA` | Botella de agua de 600 ml, sin etiqueta legible |
| `AGUA-LITRO` | Botella de agua de 1.5 L, sin etiqueta legible |
| `JUGO` | Vaso de jugo natural de naranja |

## 4. Flujo de generación

```text
1. Generar la muestra de PIERNA-MUSLO con el prompt base.
2. Revisar: fondo, luz, ángulo, encuadre y apetito visual.
3. Si el dueño aprueba, usarla como referencia de estilo.
4. Generar las 25 restantes con el mismo prompt y la referencia.
5. Revisar una hoja de contactos; regenerar solo las que rompan el estilo.
6. Redimensionar a 512×512 y convertir a WebP con Pillow (ya instalado).
7. Guardar como <SKU>.webp en frontend/src/assets/products/.
8. Ejecutar scripts/check-product-images.mjs (presencia y peso).
```

No se versionan las imágenes fuente en alta resolución: solo el WebP optimizado.

## 5. Implementación

### Mapa de imágenes

```ts
// frontend/src/lib/productImages.ts
const modules = import.meta.glob("../assets/products/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export const INTENTIONAL_FALLBACKS: readonly string[] = [];

export function productImageUrl(sku: string): string | null;
export function fallbackInitial(name: string): string;
```

`productImageUrl` resuelve por nombre de archivo, no por ruta completa. `fallbackInitial` toma
la primera letra visible y la devuelve en mayúsculas.

### Tarjeta

- `<button>` de bloque con `aspect-[4/5]`, `overflow-hidden` y `relative`.
- `<img>` absoluta, `object-cover`, `loading="lazy"`, `decoding="async"`, `width/height` 512 y
  `alt=""`.
- Degradado inferior `from-stone-950/90 via-stone-950/35 to-stone-950/5` para legibilidad.
- Nombre a dos líneas, categoría y unidad en blanco/80; precio en pastilla crema con texto
  oscuro; chips de promoción (ámbar) y mayoreo (marca) como en 002.
- Respaldo: fondo con degradado de la categoría e inicial centrada, también decorativo.
- Foco visible con anillo de marca y `focus-visible:ring-offset-2`.

### Rejilla

`grid-cols-2 gap-3 px-4 pb-24 sm:grid-cols-3 lg:grid-cols-4`. Se mantiene el `pb-24` para que el
carrito fijo no tape la última fila.

### Service worker

Agregar `webp` a `workbox.globPatterns`. El resto del precache no cambia.

### Comando de assets

Agregar `"images:check": "node scripts/check-product-images.mjs"` a `package.json`. Es un script
de Node sin dependencias nuevas y se ejecuta en la puerta de calidad.

## 6. Pruebas

- **Cobertura**: cada SKU activo del catálogo semilla tiene URL, salvo los declarados en
  `INTENTIONAL_FALLBACKS`.
- **Presupuesto**: `scripts/check-product-images.mjs` valida presencia, ≤60 KB por archivo y
  ≤2 MB total; se ejecuta en la puerta de calidad.
- **Componente**: pinta `src` cuando hay imagen; respaldo con inicial cuando no; `alt=""`; chips
  de promoción y mayoreo; precio de la hoja del día; un solo control interactivo.
- **Layout**: 360/768/1280 sin scroll horizontal y targets de 48 px.
- **Offline**: build + preview, red apagada, la rejilla pinta las imágenes desde el precache.
- **Manual**: revisión visual de la hoja de contactos y de la rejilla en celular/tablet.

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El catálogo provisional cambia | Mapeo por SKU; se reemplaza la imagen, no la UI |
| Deriva de estilo entre 26 imágenes | Prompt fijo, muestra de referencia y hoja de contactos |
| Peso excesivo del precache | WebP 512, ≤60 KB y verificación automática |
| Texto ilegible sobre fotos claras | Degradado inferior y pastilla sólida para el precio |
| Imagen faltante en un producto nuevo | Respaldo con inicial; nunca un ícono roto |

## 8. Dependencias

Ninguna nueva. Se reutilizan React, TypeScript, Vite, Vitest y `vite-plugin-pwa`. La conversión a
WebP usa Pillow instalado en la máquina, fuera del proyecto, y no se agrega a `package.json`.
