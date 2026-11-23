# Plan — Spec 007 · Catálogo real y diseño de la marca

## Flujo

```text
backend/app/seeds/catalog.json
        │  (seed:sync)
        ├──────────────► frontend/src/data/seedCatalog.json ──► PWA offline
        │
        └── seed / SQL ──► PostgreSQL (categories, products, product_prices)
                                  │
                                  └── GET /catalog ──► PWA (catálogo en línea)
```

- La semilla es la única fuente del catálogo; frontend y backend se mantienen idénticos.
- Los productos retirados se desactivan en el upsert y dejan de salir en `GET /catalog`.
- Los tickets no referencian productos: guardan el snapshot de nombre, unidad y precio.

## Catálogo y unidades

| Categoría | Productos | Unidad |
|---|---|---|
| Pollo crudo | Pollo entero, pierna y muslo, alitas, pechuga, milanesa, patitas, menudencias | kg |
| Congelados | Nuggets, pollo KFC | pieza |
| Preparados | Carne para hamburguesa, albóndigas, empanadas (3), teppanyaki, jardinera, poblano, adobado | kg |
| Complementos | Huevo, mole dulce, mole poblano, mole ranchero | kg |
| Complementos | Papas a la francesa, papas gajo, dedos de queso | pieza |
| Bebidas | Refresco, agua 600 ml, agua 1.5 L, jugo natural | pieza |

## Semilla

- `updated_at` en UTC y creciente; `backend/tests/test_seed.py` fija el valor.
- Un solo precio `lista` con `is_default: true` por producto, salvo pierna y muslo (lista y
  promoción).
- Los 18 productos sin precio confirmado usan $100.00 temporal.
- `seed:sync` copia el JSON al frontend; `seed:check` falla si divergen.

## Backend

| Archivo | Contenido |
|---|---|
| `app/seeds/catalog.json` | 6 categorías y 29 productos |
| `app/repositories/catalog.py` | Upsert por `id`/`sku` y desactivación de ausentes |
| `app/routers/catalog.py` | `GET /catalog` con productos activos |
| `tests/test_seed.py` | Coherencia, umbrales y timestamp de la semilla |
| `tests/test_catalog_integration.py` | Seed idempotente y desactivación de retirados |

## Frontend

| Archivo | Contenido |
|---|---|
| `src/data/seedCatalog.json` | Copia generada de la semilla |
| `src/styles.css` | Tokens de marca: rojo `#d32f2f`, amarillo y crema |
| `src/components/ui/BrandMark.tsx` | Mascota SVG del letrero |
| `src/App.tsx` | Encabezado «Pollería El Wero», pestañas y menú desplazable |
| `src/components/pos/ProductCard.tsx` | Precio con acento amarillo |
| `index.html`, `vite.config.ts` | Título, color de tema y manifiesto |

## Aplicación remota

1. Upsert de categorías y productos con SQL idempotente.
2. Resolución por `sku` y luego por `id` para reutilizar registros provisionales sin duplicar.
3. Reemplazo de precios del producto y avance de `catalog_meta.updated_at`.
4. Verificación con `GET /catalog`: 29 productos activos.

## Riesgos

- Precio temporal de $100 mal interpretado como definitivo: se documenta y se ajusta en la hoja
  diaria; la corrección permanente llega con 008.
- SKU reutilizados (`prd-milanesa`, `prd-refresco`, `prd-agua`, `prd-agua-litro`, `prd-jugo`,
  `prd-pollo-entero`): el SQL resuelve por SKU antes de insertar para no violar la llave primaria.
