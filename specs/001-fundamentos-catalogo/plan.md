# Plan 001 — Fundaciones y catálogo

- Spec: `specs/001-fundamentos-catalogo/spec.md`
- Constitución: `docs/constitution.md` v1.0
- Estado: implementado (2026-11-12) — validación manual y primer commit pendientes
- Toolchain verificado: Node 24.13, npm 11.10, Python 3.14.3, git 2.53. **Sin `uv` ni Docker
  locales** → se usa `venv` + `pip`, y la integración con Postgres se omite sin
  `TEST_DATABASE_URL`.

## 1. Estructura de archivos

### Gobierno y raíz

| Archivo | Responsabilidad | RF |
|---|---|---|
| `docs/constitution.md` | Principios y puerta de calidad | — |
| `specs/001-fundamentos-catalogo/{spec,plan,tasks}.md` | Iteración activa | — |
| `specs/README.md` | Hoja de ruta de specs futuras | — |
| `.gitignore` | Excluye `.env`, `node_modules`, `.venv`, `dist`, `__pycache__`, `.pytest_cache` | P9 |
| `README.md` | Arranque en 10 líneas + comandos reales | — |
| `.editorconfig` | LF, UTF-8, indentación 2/4 | — |
| `.github/workflows/ci.yml` | Lint + typecheck + tests de ambos lados, Postgres de servicio | P7 |

### Frontend (`frontend/`)

| Archivo | Responsabilidad | RF |
|---|---|---|
| `package.json` | Scripts `dev`, `build`, `preview`, `test`, `test:watch`, `lint`, `typecheck`, `seed:sync`, `seed:check` | P7 |
| `vite.config.ts` | React + Tailwind v4 (`@tailwindcss/vite`) + PWA (`registerType: "prompt"`, precache del app shell) | RF-1 |
| `tsconfig.json`, `tsconfig.node.json` | `strict`, `noUncheckedIndexedAccess`, `resolveJsonModule`, alias `@/` | P6 |
| `eslint.config.js` | Flat config: TypeScript + hooks | P7 |
| `index.html` | Shell mínimo, `lang="es"`, viewport, theme-color | RF-3 |
| `src/main.tsx` | Monta React; registra el service worker en modo prompt | RF-1 |
| `src/styles.css` | `@import "tailwindcss"` + tokens (colores, radios, safe-area) | RF-3 |
| `src/App.tsx` | Composición de la pantalla; sin lógica de negocio | P6 |
| `src/lib/pwa.ts` | Registra el SW, avisa versiones nuevas y aplica la actualización | RF-1 |
| `src/lib/pwaEvents.ts` | Constantes de eventos entre el SW y React | RF-1 |
| `src/hooks/usePwaUpdate.ts` | Expone `needRefresh`, `update` y `dismiss` a la UI | RF-1 |
| `src/components/ui/UpdateBanner.tsx` | Aviso no bloqueante con "Actualizar" y "Más tarde" | RF-1 |
| `src/types/catalog.ts` | `Unit`, `PriceTier`, `Cents`, `Category`, `ProductPrice`, `Product`, `Catalog`, `CatalogWire` | RF-3, RF-9 |
| `src/lib/money.ts` | `parseMoneyToCents`, `formatCents`, `assertCents` | RF-3, RF-9 |
| `src/lib/catalog.ts` | `validateCatalogPayload`, `defaultPrice`, `promoPrice`, `visibleCategories`, `selectProducts`, `formatUpdatedAt` | RF-3, RF-4, RF-7, RF-8 |
| `src/lib/db.ts` | Dexie v1: `categories`, `products`, `meta`; migraciones futuras | RF-2, P8 |
| `src/lib/catalogRepository.ts` | Normaliza la semilla (wire → `Cents`), lee/guarda el catálogo atómicamente y siembra solo en el primer arranque (sin meta) | RF-2, RF-6, RF-7 |
| `src/lib/api.ts` | `fetchCatalog` contra `VITE_API_URL` con `AbortController` (5 s) y errores tipados | RF-6, RF-13 |
| `src/data/seedCatalog.json` | Copia generada de la semilla canónica del backend (no se edita a mano) | RF-2 |
| `scripts/sync-seed.mjs` | Copia `backend/app/seeds/catalog.json` → `src/data/`; `--check` falla si difieren | RF-2, D-6 |
| `src/hooks/useCatalog.ts` | Arranque local-first + refresco en segundo plano + estado de conexión | RF-1, RF-5, RF-6, RF-8, RF-13 |
| `src/components/pos/CategoryBar.tsx` | Botones de categoría de 48 px con `aria-pressed` | RF-4 |
| `src/components/pos/ProductCard.tsx` | Nombre, categoría, unidad, precio por defecto y distintivo de promoción; presentación pura | RF-3 |
| `src/components/pos/ProductGrid.tsx` | Rejilla responsive y estados vacío/cargando | RF-3 |
| `src/components/pos/ConnectionBadge.tsx` | Estado de red con `aria-live="polite"` | RF-5 |
| `src/components/ui/EmptyState.tsx` | Mensaje reutilizable sin datos | Casos límite |
| `src/test/setup.ts` | `fake-indexeddb`, matchers, limpieza entre tests | P7 |

### Backend (`backend/`)

| Archivo | Responsabilidad | RF |
|---|---|---|
| `pyproject.toml` | Metadatos, `requires-python = ">=3.12"`, deps y config de Ruff/Pytest | P7 |
| `.env.example` | Nombres de variables, sin valores reales | Seguridad |
| `app/main.py` | App factory, CORS desde entorno, routers | RF-10, RF-11 |
| `app/config.py` | `Settings` (Pydantic Settings): `DATABASE_URL`, `FRONTEND_ORIGIN`, `APP_VERSION`, `APP_TIME_ZONE="America/Mexico_City"` | P3, RF-10 |
| `app/db.py` | Engine async, `sessionmaker`, dependencia `get_session` | RF-11 |
| `app/models/catalog.py` | `Category`, `Product`, `ProductPrice` y `CatalogMeta`; `Numeric(10,2)`, checks, unique `sku` y unique parcial de precio por defecto | RF-9, RF-11 |
| `app/schemas/catalog.py` | Pydantic v2; precios anidados como string de 2 decimales; validación estricta | RF-7, RF-11 |
| `app/routers/health.py` | `GET /health` con `SELECT 1` acotado | RF-10 |
| `app/routers/catalog.py` | `GET /catalog` activo, ordenado por categoría y nombre | RF-11 |
| `app/repositories/catalog.py` | Consulta y upsert por `sku` (independiente del router para tests) | RF-12 |
| `app/seed.py` | CLI `python -m app.seed`: upsert idempotente desde JSON | RF-12 |
| `app/seeds/catalog.json` | Semilla única, compartida conceptualmente con el frontend | RF-2, RF-12 |
| `alembic.ini`, `alembic/env.py` | Migraciones async | RF-11 |
| `alembic/versions/0001_catalog.py` | Crea `categories`, `products`, `product_prices` y `catalog_meta` con constraints e índices | RF-11 |
| `tests/conftest.py` | App de prueba, override del repositorio, marca `integration` | P7 |
| `tests/test_money_contract.py` | Serialización Decimal→string y rechazo de floats | RF-9, RF-11 |
| `tests/test_health.py` | `/health` con BD ok y caída | RF-10 |
| `tests/test_catalog.py` | Orden, filtro de activos, contrato JSON | RF-11 |
| `tests/test_seed.py` | Semilla dos veces = mismos registros | RF-12 |
| `tests/test_catalog_integration.py` | Contra Postgres real; se omite sin `TEST_DATABASE_URL` | RF-11, RF-12 |

## 2. Contratos de datos

```ts
// frontend/src/types/catalog.ts
export type Unit = "piece" | "kg";
export type PriceTier = "lista" | "promocion" | "mayoreo";
export type Cents = number & { readonly __brand: "Cents" };

export interface Category { id: string; name: string; sortOrder: number }
export interface ProductPrice {
  tier: PriceTier;
  priceCents: Cents;
  isDefault: boolean;
}
export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  unit: Unit;
  prices: ProductPrice[];
  active: boolean;
}
export interface Catalog {
  updatedAt: string;          // ISO 8601 UTC, solo para mostrar "actualizado hace…"
  categories: Category[];
  products: Product[];
}
```

```jsonc
// GET /catalog → 200
{
  "updated_at": "2026-11-11T18:04:00Z",
  "categories": [{ "id": "cat-pollo", "name": "Pollo", "sort_order": 1 }],
  "products": [{
    "id": "prd-pierna-muslo", "sku": "PIERNA-MUSLO", "name": "Pierna y muslo",
    "category_id": "cat-pollo", "unit": "kg", "active": true,
    "prices": [
      { "tier": "lista",     "price": "150.00", "is_default": true  },
      { "tier": "promocion", "price": "130.00", "is_default": false },
      { "tier": "mayoreo",   "price": "110.00", "is_default": false }
    ]
  }]
}
```

Reglas del contrato: dinero siempre string con exactamente 2 decimales; `unit` en
`{piece, kg}`; cada producto con **al menos un precio y exactamente uno** con
`is_default: true`; niveles sin repetir dentro del producto; `updated_at` en UTC con `Z`.
El cliente **nunca** convierte el string a `Number` antes de `parseMoneyToCents`.

SQL (migración 0001):

```sql
CREATE TABLE categories (
  id           text PRIMARY KEY,
  name         text NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  sort_order   integer NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id             text PRIMARY KEY,
  sku            text NOT NULL UNIQUE,
  name           text NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  category_id    text NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  unit           text NOT NULL CHECK (unit IN ('piece','kg')),
  active         boolean NOT NULL DEFAULT true
);

CREATE TABLE product_prices (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id  text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tier        text NOT NULL CHECK (tier IN ('lista','promocion','mayoreo')),
  price       numeric(10,2) NOT NULL CHECK (price > 0),
  is_default  boolean NOT NULL DEFAULT false,
  UNIQUE (product_id, tier)
);

-- Exactamente un precio por defecto por producto (regla de negocio, no de aplicación).
CREATE UNIQUE INDEX product_prices_one_default_idx
  ON product_prices (product_id) WHERE is_default;

-- Una sola fila: versión del catálogo que consume el cliente.
CREATE TABLE catalog_meta (
  id         smallint PRIMARY KEY CHECK (id = 1),
  updated_at timestamptz NOT NULL
);
INSERT INTO catalog_meta (id, updated_at) VALUES (1, now());

CREATE INDEX products_category_name_idx ON products (category_id, name);
```

`catalog_meta` existe para que renombrar o reordenar una categoría —que no toca
`products`— también cambie la versión y el cliente refresque (RF-6). Sin productos, el
valor sigue existiendo (nunca `NULL`).

El precio no vive en `products`: vive en `product_prices`. Así se agregan niveles
(promoción, mayoreo, precios negociados) sin migrar la tabla de productos, y una línea de
ticket de 002 podrá congelar el precio elegido sin depender del catálogo actual.

Sin RLS: el backend accede con un rol de servicio y no hay usuarios finales con acceso
directo a la base. Si en el futuro el frontend hablara directo a Supabase, esta decisión se
revisa con la skill `supabase-postgres-best-practices`.

## 3. Funciones puras (sin DOM, IndexedDB ni `fetch`)

| Función | Firma | Notas |
|---|---|---|
| `parseMoneyToCents` | `(raw: string) => Cents` | Exige `/^\d{1,8}\.\d{2}$/`; lanza `MoneyError`. Nunca pasa por `Number("185.10")` directo. |
| `formatCents` | `(cents: Cents) => string` | Separa pesos y centavos por dígitos (sin división flotante); formatea el grupo de miles con `Intl` sobre un entero. No usa `cents / 100`. |
| `assertCents` | `(value: number) => Cents` | Entero, ≥ 0, `Number.isSafeInteger`. |
| `defaultPrice` | `(product: Product) => ProductPrice \| undefined` | El único con `isDefault`; la UI pinta su precio. |
| `promoPrice` | `(product: Product) => ProductPrice \| undefined` | `tier === "promocion"`; alimenta el distintivo de promo. |
| `validateCatalogPayload` | `(raw: unknown) => Result<Catalog, CatalogError>` | Valida el payload completo; no lanza; devuelve `code` (`INVALID_MONEY`, `DUPLICATE_SKU`, `UNKNOWN_UNIT`, …). |
| `visibleCategories` | `(categories, products) => Category[]` | Oculta categorías sin productos activos; ordena por `sortOrder`. |
| `selectProducts` | `(products, categoryId \| "all") => Product[]` | Filtro puro y ordenado por nombre. |
| `formatUpdatedAt` | `(iso: string, now: Date) => string` | "actualizado hace 3 min"; recibe `now` (P6). |
| `sumCents` | `(values: Cents[]) => Cents` | Reservada para 002; se incluye con test porque evita reimplementarla mal. |

Cualquier función futura que dependa del día recibe `today`/`now`; no lee `Date.now()` por
dentro.

## 4. Algoritmos

### 4.1 Arranque local-first (`useCatalog`)

```
al montar:
  estado ← { catálogo: null, origen: "cargando", online: navigator.onLine }

  intentar:
      local ← leerCatálogo()                 // una transacción de lectura; null solo sin meta
      si local no existe (primer arranque):
          escribirCatálogo(SEED)             // transacción atómica
          local ← SEED
  si falla (bloqueada, cuota llena, VersionError):
      local ← SEED                           // solo en memoria
      log("LOCAL_DB_UNAVAILABLE", error)
  mostrar(local)                             // RF-2, primera pintura

  en paralelo, sin await en el render (RF-1, RF-6):
      respuesta ← fetchCatalog(timeout 5 s)
      si respuesta falla:                    // RF-13
          estado.online ← false
          log("CATALOG_REFRESH_FAILED", code)
          terminar
      resultado ← validateCatalogPayload(respuesta)
      si resultado no es ok:                 // RF-7
          log("CATALOG_PAYLOAD_INVALID", resultado.error)
          terminar                           // no se toca IndexedDB
      si resultado.catalog.updatedAt ≠ local.updatedAt:
          escribirCatálogo(resultado.catalog) // transacción única: borra+inserta
          estado.catálogo ← resultado.catalog // RF-8: re-render sin recargar
      estado.online ← true

al cambiar de categoría:
  estado.categoría ← id                 // el refresco no la resetea (RF-8)

al volver la conexión ("online"):
  relanzar el refresco en segundo plano   // el cierre de 001 exige ver el refresco al reconectar
```

### 4.2 Escritura atómica (Dexie)

```
escribirCatálogo(cat):
  db.transaction("rw", categories, products, meta, () => {
     categories.clear(); products.clear()
     categories.bulkAdd(cat.categories)
     products.bulkAdd(cat.products)
     meta.put({ key: "catalog", value: { updatedAt: cat.updatedAt } })
  })
```

Si la transacción falla, IndexedDB conserva la versión anterior: nunca queda un catálogo a
medias (P8). Si la lectura falla (base bloqueada, cuota agotada o `VersionError`),
`catalogRepository` devuelve la semilla en memoria y la UI sigue operando.

### 4.3 Validación del payload

```
validateCatalogPayload(raw):
  si raw no es objeto o faltan categories/products → INVALID_SHAPE
  ids ← set(); skus ← set()
  para cada producto:
     si id o sku repetido → DUPLICATE_ID / DUPLICATE_SKU
     si unit ∉ {piece, kg} → UNKNOWN_UNIT
     si prices está vacío → MISSING_PRICE
     tiers ← set(); defaults ← 0
     para cada p en prices:
        si tier ∉ {lista, promocion, mayoreo} o ya está en tiers → INVALID_TIER
        precio ← parseMoneyToCents(p.price)   // captura MoneyError
        si precio ≤ 0 → INVALID_PRICE
        si p.is_default: defaults ← defaults + 1
     si defaults ≠ 1 → INVALID_DEFAULT_PRICE
     si categoryId no existe → ORPHAN_CATEGORY
  si algo falló → devolver el primer error (payload completo se descarta)
  devolver catálogo normalizado (Cents enteros, orden estable)
```

### 4.4 Semilla idempotente (backend)

```
en una sola transacción:
  para cada item de seeds/catalog.json:
      INSERT INTO categories ... ON CONFLICT (id) DO UPDATE SET name, sort_order
      INSERT INTO products ... ON CONFLICT (sku) DO UPDATE SET name, category_id, unit, active
      para cada precio del item:
          INSERT INTO product_prices (product_id, tier, price, is_default)
          ON CONFLICT (product_id, tier) DO UPDATE SET price, is_default
  UPDATE catalog_meta SET updated_at = now() WHERE id = 1
```

Ejecutarla dos veces no duplica filas ni altera precios; solo avanza la versión del
catálogo, que es exactamente lo que hace que las cajas refresquen (RF-6). Los productos
retirados de la semilla no se borran: evita destruir datos reales por accidente.

## 5. Interfaz

```
App
├─ AppHeader
│   ├─ título "Pollería el wero"
│   └─ ConnectionBadge        // "En línea" / "Sin conexión" (aria-live)
├─ CategoryBar                // "Todos" + categorías visibles, 48 px, scroll horizontal
└─ ProductGrid
    ├─ ProductCard × N        // nombre, categoría, "por kilo"/"por pieza", "$185.00" y "promo $165.00" si existe
    └─ EmptyState             // sin catálogo / categoría vacía
```

Mobile-first: una columna en 360 px, dos a partir de `sm`, tres a partir de `lg`. La zona
inferior queda libre para el carrito de 002 (no se construye ahora). Sin router: una sola
pantalla.

## 6. Decisiones técnicas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Dexie para IndexedDB | `idb`, `localStorage` | Migraciones versionadas (P8), índices por `categoryId`, transacciones atómicas y tipos. `localStorage` es síncrono y sin transacciones. |
| Dinero como string en el wire | `number` JSON | JSON no distingue decimales de binario; `185.10` puede llegar como `185.09999…`. El string es el contrato verificable. |
| Centavos enteros en el cliente | `Decimal.js` en el frontend | Evita una dependencia y el riesgo de mezclar objetos `Decimal` con `number`; el catálogo no requiere aritmética fraccionaria. |
| `Intl` solo para el grupo de miles | `Intl.NumberFormat` con `style: "currency"` | El formateador de moneda recibe un `Number` en pesos (`cents/100`), introduciendo coma flotante en la ruta de dinero (P2). |
| Precios en tabla hija `product_prices` | Columnas fijas `price_lista`/`price_promo`/`price_mayoreo` en `products` | Los acuerdos por cliente y los niveles nuevos no caben en columnas fijas sin migrar la tabla; el unique parcial garantiza un solo precio por defecto por producto. |
| Un solo spec activo | Specs en paralelo | El repo es greenfield y comparte contratos; paralelizar produce conflictos de esquema y de outbox. |
| Tailwind v4 con `@tailwindcss/vite` | Tailwind v3 con `postcss.config.js` | Menos configuración y tokens en CSS; el plugin oficial ya integra Vite. |
| `vite-plugin-pwa` (generateSW) | Service worker escrito a mano | Precache del app shell sin mantener Workbox a mano; menos superficie de bugs en algo crítico para RF-1. |
| Hook `useCatalog` + `useState` | Zustand / Redux | Una pantalla y un store de hecho; añadir estado global viola P9. |
| Repositorio inyectable en FastAPI | Router con SQL inline | Permite tests de contrato sin base y deja la puerta abierta a 003 (`/sync`) sin reescribir. |
| Integración con Postgres real, omitida sin `TEST_DATABASE_URL` | SQLite en tests | SQLite no reproduce `numeric(10,2)`, `timestamptz` ni `ON CONFLICT` igual que Postgres; validar ahí daría falsa confianza. |
| Pydantic `field_serializer` para dinero | `json_encoders` global | `json_encoders` está deprecado en Pydantic v2 y afecta a todos los `Decimal`. |
| CORS desde variable de entorno | `allow_origins=["*"]` | El backend quedará expuesto en internet; el comodín invita a abuso. |

### Dependencias aprobadas (D-7, P9)

- **Frontend runtime**: `react`, `react-dom`, `dexie`. (`dexie-react-hooks` no se usa: el
  catálogo se lee con `useCatalog`, un hook propio que controla el refresco y la degradación.)
- **Frontend dev**: `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`,
  `@tailwindcss/vite`, `vite-plugin-pwa`, `vitest`, `jsdom`, `@testing-library/react`,
  `@testing-library/dom` (peer de `@testing-library/react`), `@testing-library/user-event`,
  `@testing-library/jest-dom`, `fake-indexeddb`, `eslint`,
  `typescript-eslint`, `eslint-plugin-react-hooks`, `@types/react`, `@types/react-dom`,
  `@types/node`.
- **Backend**: `fastapi`, `uvicorn[standard]`, `sqlalchemy[asyncio]`, `asyncpg`, `alembic`,
  `pydantic-settings`; dev: `pytest`, `pytest-asyncio`, `httpx`, `ruff`.
- Sin `uv`: `python -m venv .venv` + `pip install -e ".[dev]"`.

## 7. Estrategia de tests

| Nivel | Herramienta | Qué prueba | RF |
|---|---|---|---|
| Unidad dinero | Vitest | `parseMoneyToCents` (string con 2 decimales, rechazo de `185`, `185.1`, `1.234`, negativos), `formatCents` (miles, cero, centavos), `assertCents` | RF-3, RF-9 |
| Unidad catálogo | Vitest | Validación de payload inválido por cada código de error; precio por defecto y promoción resueltos; filtro por categoría; categorías vacías ocultas; `formatUpdatedAt` con `now` fijo | RF-4, RF-7, RF-8 |
| Persistencia | Vitest + `fake-indexeddb` | Semilla en primer arranque; escritura atómica que no deja estado parcial; segunda lectura devuelve lo mismo | RF-2, P8 |
| Hook | Vitest + Testing Library | Arranque sin red muestra semilla; refresco válido actualiza sin perder categoría; reintento al reconectar; payload inválido no pisa lo local; timeout 5 s | RF-1, RF-5, RF-6, RF-8, RF-13 |
| Actualización PWA | Vitest + Testing Library | El aviso aparece al recibir `pwa:need-refresh`; "Actualizar" emite `pwa:update`; "Más tarde" lo oculta | RF-1 |
| Contrato API | Pytest + `httpx` | `/catalog` ordena y filtra activos; precios anidados con un solo `is_default`; dinero sale como `"185.00"`; `/health` con BD ok/caída; semilla idempotente | RF-9, RF-10, RF-11, RF-12 |
| Integración | Pytest + Postgres (`TEST_DATABASE_URL`) | Migración aplicada, constraints, `ON CONFLICT`, orden real; se omite si falta la URL | RF-11, RF-12 |
| Semilla | Pytest (contrato) + Vitest (`seed:check`) | Dos corridas dejan el mismo conteo y precios, la versión avanza; el JSON del frontend coincide con el del backend | RF-12, D-6 |
| Manual | Navegador del celular | Instalar PWA, modo avión, reabrir, ver catálogo + badge; reconectar y ver refresco; publicar una versión nueva y ver el aviso de actualización; tocar con dedo (48 px) | RF-1, RF-3, RF-8 |

En CI se levanta Postgres como servicio, así que la integración sí corre ahí.

## 8. Cobertura RF → artefacto

| RF | Implementación | Test |
|---|---|---|
| RF-1 | `main.tsx` (SW), `useCatalog`, `catalogRepository` | Hook + manual |
| RF-2 | `seedCatalog.json`, `catalogRepository.seedIfEmpty` | Dexie |
| RF-3 | `ProductCard`, `ProductGrid`, `defaultPrice`/`promoPrice`, `money.ts`, `styles.css` | Unidad + manual |
| RF-4 | `CategoryBar`, `selectProducts` | Unidad + hook |
| RF-5 | `ConnectionBadge`, `useCatalog` | Hook |
| RF-6 | `api.ts`, `useCatalog`, `catalogRepository` | Hook |
| RF-7 | `validateCatalogPayload`, `catalogRepository` | Unidad + hook |
| RF-8 | `useCatalog` (no resetea `categoría`) | Hook + manual |
| RF-9 | `money.ts`, `schemas/catalog.py`, `models/catalog.py` | Vitest + Pytest |
| RF-10 | `routers/health.py` | Pytest |
| RF-11 | `routers/catalog.py`, `repositories/catalog.py`, `product_prices`, migración | Pytest + integración |
| RF-12 | `seed.py`, `seeds/catalog.json` | Pytest + integración |
| RF-13 | `api.ts` (timeout), `useCatalog` | Hook |

## 9. Riesgos y mitigaciones

- **Arranque en frío de Neon** (~1 s): el catálogo local pinta primero; el timeout de 5 s
  cubre el peor caso y el fallo no bloquea (RF-13).
- **Python 3.14 sin ruedas para `asyncpg`**: si `pip install` falla, se crea el venv con
  Python 3.12/3.13 (`py -3.12 -m venv`). CI fija 3.12.
- **Safari desaloja IndexedDB** en PWA no instalada: la semilla se reinyecta sola; se
  documenta instalar la PWA en el tablet del local.
- **Service worker en desarrollo** genera ruido: RF-1 se verifica con `npm run build &&
  npm run preview`, no con `npm run dev`.
- **Semilla desincronizada** entre frontend y backend: D-6 fija
  `backend/app/seeds/catalog.json` como única fuente; `npm run seed:sync` genera la copia y
  `npm run seed:check` hace fallar CI si difieren.

## 10. Orden de ejecución

1. Gobierno y repo (T-01…T-02).
2. Andamiaje y comandos reales (T-03…T-08).
3. Dominio puro del frontend (T-09…T-15).
4. Backend y base de datos (T-16…T-21).
5. UI y arranque local-first (T-22…T-27b).
6. Cierre: documentación (T-28) y checklist de validación.
