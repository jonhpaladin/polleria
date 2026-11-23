# MEMORY.md — Memoria de Arquitectura y Estado del POS
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no te aporte

## Estado actual (2026-11-22)
- Spec 001 y 002 cerradas por ratificación del dueño (002: precios del día, venta offline y ticket local atómico).
- Spec 003 (catálogo visual) pospuesta el 2026-11-22: faltan imágenes aprobadas y consumía demasiado contexto; no hay código de 003.
- Spec 004 cerrada por ratificación del dueño (2026-11-22): `POST /sync` idempotente por UUID, tablas `sales`/`sale_lines`, outbox con backoff, 4xx terminal y reintento manual.
- Desplegado: API `https://polleria-api-homu.onrender.com` (Render free) y PWA `https://polleria-q84.pages.dev` (Cloudflare Pages); CORS exige orígenes exactos.
- Tests: backend 36 passed + 2 skipped (integración sin `TEST_DATABASE_URL`); frontend 197 passed en 29 archivos; `ruff`, `lint`, `typecheck`, `build` y `seed:check` verdes.
- En 002 se validó con Edge headless + CDP: sin scroll horizontal a 360/768/1280, targets de 48 px y cobro sin red en 9,8–11,3 ms.
- Supabase conectado con el esquema 0001 y la migración `0002_sales` aplicada el 2026-11-22 (tablas `sales` y `sale_lines`; RLS sigue deshabilitado).
- Guía de despliegue en `docs/despliegue.md`: PWA vs APK, Cloudflare Pages + Render + Supabase.

## Decisiones (y por qué)
- **Neon/Supabase free tier en vez de laptop en casa:** evita exponer túneles/DNS y dejar un equipo encendido.
- **Outbox local-first:** el celular confirma la venta sin depender del Wi-Fi/4G del local.
- **Decimal en backend y centavos enteros en el cliente:** los kilos fraccionados desfasan arqueos con IEEE 754.
- **PWA sobre app nativa:** se abre en cualquier celular/tablet/laptop sin tiendas ni compilaciones.
- **Zona horaria fija `America/Mexico_City`:** un tablet mal configurado no descuadra el corte del día.
- **Semilla canónica en `backend/app/seeds/catalog.json`:** `seed:sync` genera el JSON del frontend y `seed:check` falla si divergen.
- **4xx terminal en `/sync`:** un dato inválido no se arregla reintentando; se muestra el fallo y se reintenta a mano.
- **Venta como snapshot sin FK a productos:** un cambio de catálogo no deja ventas pendientes sin sincronizar.
- **`/sync` solo ventas:** el catálogo sigue por `GET /catalog` y cada contrato conserva una responsabilidad.
- **Zona de negocio con respaldo UTC-6:** Windows sin tzdata no rompe la validación; la constante sigue siendo `America/Mexico_City`.

## Spec 002 — Venta offline (cerrada)
- Hoja local `dailyPrices` con copia de la anterior, carrito por kilo/pieza, precio manual sin PIN y pago informativo.
- Dexie v2: `dailyPrices`, `tickets` y `outbox`; ticket y outbox se escriben en una transacción y el mismo UUID no duplica el cobro.
- El cobro revalida el día de la hoja al agregar y al confirmar; el outbox lo drena el sincronizador de 004.

## Spec 004 — Sincronización (cerrada)
- `drainOutbox` envía un ticket por solicitud, borra al confirmar y aplica backoff de 2 s a 5 min con jitter. Un 400/404/409/422 pasa a `failed` sin frenar la cola.
- Dexie v3 agrega `attempts`, `nextAttemptAt`, `lastError` e índice `nextAttemptAt`; los registros de 002 se leen con `attempts ?? 0`.
- `useSync` drena al arrancar, al volver `online`, al cobrar y cada 30 s; `SyncBadge` muestra pendientes/fallidos y «Reintentar».
- El backend valida día de negocio, dinero string, kilos y total; guarda snapshot y devuelve 201/200 (`created`/`duplicate`).
- Verificado contra la API real: `/health` con `database: ok`, smoke 201/200/422, venta persistida en `sales`/`sale_lines` y flujo offline→online aprobado por el dueño.

## Próximos pasos
1. Abrir 005 (corte de caja y reportes) y resolver turnos y ventas posteriores al corte.
2. RLS y rol mínimo de base en 006 antes de exponer escrituras.
3. Retomar 003 cuando el dueño entregue las imágenes por SKU.
4. Sustituir el catálogo provisional por la lista real de productos y precios.

## Decisiones de producto pendientes
- 005: ¿turnos fijos o botón de cierre? ¿qué pasa con ventas sincronizadas después del corte?
- 006: vigencia de promociones y precios ligados a cliente.
- 007: modelo y conexión de la impresora.
