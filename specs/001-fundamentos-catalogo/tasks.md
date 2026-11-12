# Tareas 001 — Fundaciones y catálogo

Spec: `specs/001-fundamentos-catalogo/spec.md` · Plan: `plan.md`
Regla: una tarea se marca `[x]` solo al cumplir la puerta de calidad de la constitución.
Cada tarea está pensada para 20–30 minutos.

## Fase 0 — Gobierno y repo

- [x] **T-01 · Inicializar git y exclusiones**
  `git init`, `.gitignore`, `.editorconfig`.
  Hecho cuando: `git status` no muestra `node_modules`, `.venv`, `.env` ni `dist`, y el
  primer commit (`f85485c`) incluye el código y la documentación existentes, sin secretos
  ni artefactos generados.
  RF: —

- [x] **T-02 · Publicar constitución y hoja de ruta**
  Verificar `docs/constitution.md`, `specs/README.md` y esta carpeta.
  Hecho cuando: la constitución tiene versión y fecha, y cada spec futura de la hoja de
  ruta declara objetivo, dependencia y dudas.
  RF: —

## Fase 1 — Andamiaje y comandos

- [x] **T-03 · Crear frontend Vite + React + TS**
  `npm create vite@latest frontend -- --template react-ts`, limpiar demo, alias `@/`.
  Hecho cuando: `npm run dev` abre una página vacía sin errores y `npm run build` genera
  `dist/`.
  RF: —

- [x] **T-04 · Integrar Tailwind v4 y tokens**
  `@tailwindcss/vite`, `src/styles.css` con colores, radios, espaciado y safe-area.
  Hecho cuando: una clase utilitaria cambia el render y el layout se ve correcto a 360 px.
  RF: RF-3

- [x] **T-05 · Instalar Vitest, ESLint y typecheck**
  Scripts `test`, `test:watch`, `lint`, `typecheck`; `jsdom` y `fake-indexeddb` en setup.
  Hecho cuando: `npm run test` ejecuta un test trivial en verde, y `lint`/`typecheck`
  fallan a propósito ante un error inducido y vuelven a verde al corregirlo.
  RF: P7

- [x] **T-06 · Crear backend FastAPI mínimo**
  `python -m venv .venv`, `pyproject.toml`, app factory y `GET /health` sin BD.
  Hecho cuando: `uvicorn app.main:app` responde `{"status":"ok"}` en `/health`.
  RF: RF-10

- [x] **T-07 · Configurar Pytest y Ruff**
  `tests/` con un test de `/health`, config de `pytest` y `ruff` en `pyproject.toml`.
  Hecho cuando: `python -m pytest` y `python -m ruff check .` corren en verde en el venv.
  RF: P7

- [x] **T-08 · Documentar los comandos reales**
  Actualizar la sección de estado de `AGENTS.md` y el arranque de `README.md`.
  Hecho cuando: los comandos escritos existen y se ejecutaron al menos una vez sin error;
  desaparece la frase "no existen comandos".
  RF: —

## Fase 2 — Dominio puro del frontend

- [x] **T-09 · Definir tipos del catálogo**
  `Unit`, `PriceTier`, `Cents` marcado, `Category`, `ProductPrice`, `Product`, `Catalog`,
  `CatalogWire`.
  Hecho cuando: `npm run typecheck` pasa y un `number` sin marca no se acepta como `Cents`.
  RF: RF-3, RF-9

- [x] **T-10 · Implementar dinero en centavos**
  `parseMoneyToCents`, `formatCents`, `assertCents` + tests.
  Hecho cuando: `"185.10"` → `18510` → `"$185.10"`; `"185"`, `"185.1"` y `"1.234"` lanzan
  error; no hay aritmética de punto flotante sobre pesos (sin `cents / 100`).
  RF: RF-3, RF-9

- [x] **T-11 · Sembrar el catálogo desde una sola fuente**
  `backend/app/seeds/catalog.json` con 5 categorías y ~25 productos de ejemplo;
  `scripts/sync-seed.mjs` genera `src/data/seedCatalog.json`; scripts `seed:sync` y
  `seed:check`.
  Hecho cuando: `npm run seed:sync` regenera la copia, `npm run seed:check` pasa, el JSON
  incluye `updated_at` en UTC y cada producto tiene exactamente un precio con `is_default`
  con dos decimales.
  RF: RF-2, D-6

- [x] **T-12 · Crear esquema Dexie v1**
  `db.ts` con `categories`, `products` (unique `sku`), `meta` y apertura diferida.
  Hecho cuando: un test con `fake-indexeddb` abre la base, inserta y relee sin duplicar
  `sku`.
  RF: RF-2, P8

- [x] **T-13 · Repositorio local con siembra**
  `seedIfEmpty`, `readCatalog`, `writeCatalog` en una sola transacción.
  Hecho cuando: primer arranque guarda la semilla; cerrar y reabrir no la duplica; una
  escritura fallida a mitad conserva la versión anterior.
  RF: RF-2, P8

- [x] **T-13b · Degradación de IndexedDB**
  Capturar `VersionError`, base bloqueada y cuota llena en `catalogRepository`.
  Hecho cuando: con `fake-indexeddb` simulado como bloqueado o con un esquema local más
  nuevo que el build, la lectura devuelve la semilla en memoria y la UI pinta catálogo, no
  un error.
  RF: RF-2, P8

- [x] **T-14 · Validar payload del backend**
  `validateCatalogPayload` con códigos de error + tests por cada caso límite.
  Hecho cuando: payload válido se normaliza a `Cents` y resuelve precio por defecto/promo;
  duplicados de `id`, `sku` o `tier`, unidad desconocida, precio inválido, cero o dos
  precios por defecto, categoría huérfana y JSON truncado devuelven error sin lanzar
  excepción.
  RF: RF-7

- [x] **T-15 · Cliente HTTP con timeout**
  `fetchCatalog` con `AbortController` de 5 s y errores tipados.
  Hecho cuando: un fetch simulado que nunca responde aborta a los 5 s y devuelve
  `TIMEOUT`, no una excepción sin manejar.
  RF: RF-6, RF-13

## Fase 3 — Backend y base de datos

- [x] **T-16 · Configurar settings, engine y sesión**
  `config.py` con `DATABASE_URL`, `FRONTEND_ORIGIN`, `APP_TIME_ZONE`, versión; `db.py`
  async + `get_session`; `.env.example`.
  Hecho cuando: la app arranca sin `DATABASE_URL` y `/health` reporta
  `database: "unreachable"` en vez de caerse.
  RF: RF-10

- [x] **T-17 · Modelos y migración inicial**
  `Category`, `Product`, `ProductPrice` y `CatalogMeta`; `Numeric(10,2)`, checks, unique
  `sku`, unique `(product_id, tier)` y unique parcial del precio por defecto; Alembic 0001.
  Hecho cuando: `alembic upgrade head` crea las cuatro tablas (más `alembic_version`), y
  `price = 0`, `unit = 'litro'` o dos precios por defecto del mismo producto son rechazados
  por la base.
  RF: RF-9, RF-11

- [x] **T-18 · Esquemas Pydantic del catálogo**
  Precios anidados como string de 2 decimales con `field_serializer`; validador
  `mode="before"` que rechaza `float`; validación de unidad, niveles y un solo `is_default`.
  Hecho cuando: `Decimal("185.1")` serializa a `"185.10"`, un `float` en la entrada es
  rechazado y un producto con dos `is_default` no valida.
  RF: RF-7, RF-9, RF-11

- [x] **T-19 · Endpoint `GET /catalog`**
  Repositorio inyectable, solo activos, precios cargados con `selectinload`, orden por
  categoría y nombre, `updated_at` de `catalog_meta`.
  Hecho cuando: el test de contrato valida el JSON completo con sus `prices`, y un producto
  inactivo no aparece.
  RF: RF-11

- [x] **T-20 · CLI de semilla idempotente**
  `python -m app.seed` con upsert por `sku`.
  Hecho cuando: correrlo dos veces deja el mismo conteo y los mismos precios, sin duplicar,
  y avanza `catalog_meta.updated_at`; el producto retirado de la semilla permanece en la
  base.
  RF: RF-12

- [x] **T-21 · `/health` con comprobación de BD**
  `SELECT 1` con timeout corto; nunca expone la cadena de conexión.
  Hecho cuando: con BD arriba devuelve `ok`; con URL inválida devuelve `unreachable` y 200.
  RF: RF-10

## Fase 4 — Interfaz local-first

- [x] **T-22 · Shell de la pantalla de venta**
  `App.tsx`, header, layout mobile-first y espacio reservado para el carrito.
  Hecho cuando: se ve bien a 360, 768 y 1280 px, y no hay scroll horizontal.
  RF: RF-3

- [x] **T-23 · Barra de categorías**
  `CategoryBar` con "Todos", `aria-pressed`, 48 px, scroll horizontal.
  Hecho cuando: tocar una categoría filtra y oculta las categorías sin productos.
  RF: RF-3, RF-4

- [x] **T-24 · Rejilla y tarjetas de producto**
  `ProductGrid`, `ProductCard`, `EmptyState` de catálogo vacío.
  Hecho cuando: cada tarjeta muestra nombre, categoría, "por kilo"/"por pieza", el precio
  por defecto `$185.00` y, si existe, "promo $165.00"; un nombre largo trunca sin romper la
  rejilla.
  RF: RF-3

- [ ] **T-25 · Indicador de conexión**
  `ConnectionBadge` con eventos `online`/`offline` y `aria-live="polite"`.
  Hecho cuando: alternar el modo avión cambia el texto sin recargar y sin mover el layout.
  RF: RF-5

- [x] **T-26 · Hook de arranque local-first**
  `useCatalog`: semilla → pintar → refresco en segundo plano → reemplazo atómico.
  Hecho cuando: sin red pinta la semilla; con payload inválido no pisa lo local; con
  payload válido actualiza sin perder la categoría seleccionada; al reconectar reintenta
  el refresco.
  RF: RF-1, RF-2, RF-5, RF-6, RF-7, RF-8, RF-13

- [ ] **T-27a · Manifest e iconos**
  Nombre, colores, `display: standalone`, iconos 192/512 y `theme-color`.
  Hecho cuando: DevTools → Application muestra un manifest válido y la app se ofrece como
  instalable.
  RF: RF-1

- [ ] **T-27b · Service worker y precache**
  `vite-plugin-pwa` con `generateSW`, registro y aviso de actualización
  (`registerType: "prompt"` + `UpdateBanner`).
  Hecho cuando: `npm run build && npm run preview`, instalada y con red apagada, reabre
  mostrando el catálogo; `/catalog` no se cachea en el SW (lo gobierna el hook); al publicar
  una versión nueva aparece el aviso y "Actualizar" recarga con la versión nueva.
  RF: RF-1

## Fase 5 — Cierre

- [x] **T-28 · Actualizar memoria y comandos**
  `MEMORY.md` (estado, decisiones, próximos pasos) y `AGENTS.md` (comandos reales,
  estructura, zona horaria).
  Hecho cuando: ambos archivos reflejan el repo real, `MEMORY.md` ≤ 50 líneas y ningún
  comando documentado es inventado.
  RF: —

## Checklist de cierre (paso 7 — validación)

No es una tarea más: es la puerta que se corre al final de la iteración.
`[x]` = verificado con un comando en este entorno. `[ ]` = requiere navegador,
PostgreSQL real o un clon limpio; queda listado abajo.

- [x] `npm run seed:check` sin diferencias entre frontend y backend.
- [x] `npm run lint` y `npm run typecheck` en verde desde un clon limpio.
- [x] `npm run test` en verde, incluidos hook, dinero y Dexie.
- [ ] `python -m pytest` en verde (con `TEST_DATABASE_URL` para la integración).
- [x] `python -m ruff check .` sin hallazgos.
- [ ] Build de producción servido con `npm run preview`, sin errores de consola.
- [ ] Demo en tablet: instalar, modo avión, reabrir y ver catálogo + badge; reconectar y ver
      refresco sin recarga; medir un target de 48 px en DevTools.
- [ ] RF-1…RF-13 con cobertura comprobada en `plan.md` §8.
- [x] `AGENTS.md` y `MEMORY.md` actualizados.

### Pendiente de validación manual (no ejecutable aquí)

- Validado en Edge headless + CDP: layout a 360/768/1280 px sin scroll horizontal (T-04,
  T-22), reapertura offline con catálogo + badge, banner de actualización y targets de 48 px.
  Falta tableta/celular físico, alternar modo avión en vivo (T-25), instalación real (T-27a)
  y publicar dos versiones para comprobar el flujo completo del aviso (T-27b).
- Integración con PostgreSQL: exportar `TEST_DATABASE_URL` y correr
  `.venv/Scripts/python.exe -m pytest -q`; también `alembic upgrade head` y `python -m app.seed`
  contra una base real.
- Commit inicial `f85485c` y `lint`/`typecheck` desde un clon limpio: verificados.
