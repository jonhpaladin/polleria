# Plan 003 — Catálogo visual con imágenes

- Spec: `specs/003-catalogo-visual/spec.md`
- Constitución: `docs/constitution.md` v1.0
- Estado: activo (2026-11-13)
- Dependencia: Spec 001 cerrada y Spec 002 cerrada

## 1. Estructura de archivos prevista

| Archivo | Responsabilidad | RF |
|---|---|---|
| `frontend/src/assets/products/<nombre>.webp` | Una imagen por producto activo, con nombre descriptivo | RF-003-01…03, 08 |
| `frontend/src/lib/productImages.ts` | Mapa SKU → archivo/URL, respaldo e inicial | RF-003-01, 04, 07 |
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
frontend/src/assets/products/<nombre-descriptivo>.webp
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
| Nombre | Descriptivo, corto, en minúsculas y sin acentos (`combo-familiar.webp`) |

Las imágenes se importan con `import.meta.glob` y Vite les asigna URL con hash. El service
worker las precachea con `webp` dentro de `globPatterns`.

## 3. Prompt y sujetos

Prompt base, idéntico para todo el set (solo cambia el sujeto):

> Representación híbrida de **{sujeto}**, con textura semirrealista y formas caricaturescas
> redondeadas, colores cálidos suaves, volumen limpio y contornos sutiles, vista cenital con
> inclinación suave de 45°, sobre fondo crema liso `#FFF7EA`, luz cálida difusa desde la
> izquierda, sombra natural sutil, encuadre cuadrado 1:1, sin texto, sin logotipos, sin marcas
> de agua, sin manos, sin utensilios decorativos, estilo de catálogo consistente. En cortes de
> pollo: carne, nunca un animal vivo, sin cabeza, ojos, cara ni plumas.

El dueño autorizó generar el primer lote con este estilo como punto de partida; la aprobación
final se hará con la hoja de contactos. Se descartaron las muestras de prueba anteriores.

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
1. Generar el primer lote con el prompt híbrido y la cuota gratuita disponible.
2. Revisar una hoja de contactos: sujeto, fondo, luz, ángulo y encuadre.
3. Regenerar solo las imágenes incorrectas o que rompan el estilo cuando haya cuota.
4. Completar los productos pendientes con el mismo prompt.
5. Redimensionar a 512×512 y convertir a WebP con Pillow (ya instalado).
6. Guardar con nombres descriptivos en frontend/src/assets/products/.
7. Ejecutar scripts/check-product-images.mjs (cobertura del mapa y peso).
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

export const PRODUCT_IMAGE_BY_SKU: Readonly<Record<string, string>> = {
  "POLLO-ENTERO": "pollo-entero",
  "COMBO-FAM": "combo-familiar",
  // ...el resto de SKU activos
};
export const INTENTIONAL_FALLBACKS: readonly string[] = [];

export function productImageUrl(sku: string): string | null;
export function fallbackInitial(name: string): string;
```

`productImageUrl` consulta el mapa SKU → nombre descriptivo y resuelve el módulo por nombre de
archivo, no por ruta completa. `fallbackInitial` toma la primera letra visible y la devuelve en
mayúsculas.

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
