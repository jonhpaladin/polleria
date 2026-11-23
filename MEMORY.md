# MEMORY.md — Memoria de Arquitectura y Estado del POS
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no te aporte

## Estado actual (2026-11-22)
- Specs 001, 002, 004 y 005 cerradas por ratificación del dueño; 003 pospuesta por falta de imágenes.
- Spec 006 (corte y reportes) activa, desplegada y verificada contra la API; falta la validación visual del dueño.
- Desplegado: API `https://polleria-api-homu.onrender.com` y PWA `https://polleria-q84.pages.dev`; CORS exige orígenes exactos.
- Tests: backend 40 passed + 2 skipped; frontend 241 passed en 35 archivos; `ruff`, `lint`, `typecheck`, `build` y `seed:check` verdes.
- Supabase con `0001_catalog` y `0002_sales`; RLS deshabilitado hasta 007.
- Guía de despliegue en `docs/despliegue.md`.

## Decisiones (y por qué)
- **Neon/Supabase free tier en vez de laptop en casa:** evita exponer túneles/DNS y dejar un equipo encendido.
- **Outbox local-first:** el celular confirma la venta sin depender del Wi-Fi/4G del local.
- **Decimal en backend y centavos enteros en el cliente:** los kilos fraccionados desfasan arqueos con IEEE 754.
- **PWA sobre app nativa:** se abre en cualquier celular/tablet/laptop sin tiendas ni compilaciones.
- **Zona horaria fija `America/Mexico_City`:** un tablet mal configurado no descuadra el corte.
- **Semilla canónica en `backend/app/seeds/catalog.json`:** `seed:check` falla si frontend y backend divergen.
- **4xx terminal en `/sync`:** un dato inválido no se arregla reintentando; se reintenta a mano.
- **Venta como snapshot sin FK a productos:** un cambio de catálogo no deja ventas pendientes.
- **`/sync` solo ventas:** el catálogo sigue por `GET /catalog`.
- **Carrito en pestaña con icono flotante:** ningún panel tapa la rejilla en celular.
- **Corte local + conciliación remota:** el mostrador manda; el backend solo compara lo sincronizado.

## Spec 002 — Venta offline (cerrada)
- Hoja local `dailyPrices`, carrito por kilo/pieza, precio manual sin PIN y pago informativo.
- Dexie v2: ticket + outbox atómicos; el mismo UUID no duplica el cobro.

## Spec 004 — Sincronización (cerrada)
- `drainOutbox` envía uno por uno, borra al confirmar y aplica backoff 2 s→5 min con jitter; un 4xx pasa a `failed`.
- Dexie v3: `attempts`, `nextAttemptAt`, `lastError`; `useSync` drena al arrancar, al volver online, al cobrar y cada 30 s.

## Spec 005 — Venta táctil (cerrada)
- Tocar producto abre `<dialog>` con peso/cantidad y precio; solo «Agregar» crea la línea.
- Pestañas Venta, Carrito, Precios y Corte; icono flotante con contador; el carrito ya no es sticky.

## Spec 006 — Corte y reportes (activa)
- Reporte local por `businessDate`: total, tickets, promedio, métodos, producto y categoría.
- Corte manual con fondo/contado; foto recalculable en `cashCuts` (Dexie v4).
- `GET /reports/daily` suma solo ventas sincronizadas; verificado con ventas reales del 2026-11-22 (3 tickets, $839.00).

## Próximos pasos
1. Validar 006 en celular/tablet y cerrarla.
2. RLS y rol mínimo de base en 007 antes de exponer escrituras.
3. Retomar 003 con las imágenes por SKU.
4. Sustituir el catálogo provisional por la lista real.

## Decisiones de producto pendientes
- 007: promociones, precios por cliente y quién puede editar.
- 008: modelo y conexión de la impresora.
