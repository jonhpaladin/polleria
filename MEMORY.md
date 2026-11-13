# MEMORY.md — Memoria de Arquitectura y Estado del POS

## Estado actual (2026-11-13)
- Spec 001 cerrada por ratificación del dueño: PWA de catálogo + API FastAPI/PostgreSQL (migración Alembic 0001, semilla idempotente, `/health`, `/catalog`).
- Spec 002 implementada: pestaña `Precios del día` (copia la última hoja disponible, edición local de normal/promoción/mayoreo), carrito por kilo/pieza con precio manual sin autorización, pago informativo y confirmación local atómica de ticket + outbox.
- Tests: backend 22 passed + 1 skipped (integración sin `TEST_DATABASE_URL`); frontend 153 passed; `ruff`, `lint`, `typecheck`, `seed:check` y `build` en verde.
- Validado con Edge headless + CDP: 360/768/1280 sin scroll horizontal, targets de 48 px, tabla de precios con scroll interno y cobro con red apagada en **9,8 ms** desde el clic hasta el aviso de éxito (26 precios, 1 ticket y 1 outbox en IndexedDB). Queda la prueba manual en dispositivo físico (T-002-22).
- Supabase conectado y validado: esquema 0001, 5 categorías, 26 productos, 33 precios y 26 precios por defecto; sin Postgres local, Docker ni `uv`.
- Guía de despliegue en `docs/despliegue.md`: PWA vs APK, Cloudflare Pages + Render + Supabase, costos free y pasos de publicación.
- Spec 002 commiteada y pusheada a `master` (`258d3d3` implementación, `2b5a812` skills, `75bff55` validación).

## Decisiones (y por qué)
- **Neon/Supabase free tier en vez de laptop en casa:** evita dejar una laptop encendida 24/7 y exponer túneles/DNS dinámicos.
- **Outbox local-first:** el celular confirma la venta sin depender del Wi-Fi/4G del local.
- **Decimal en backend y centavos enteros en el cliente, en vez de float:** los kilos fraccionados (ej. 1.345 kg) con precios variables desfasan arqueos con IEEE 754.
- **PWA sobre app nativa:** se abre en cualquier celular/tablet/laptop sin compilaciones por plataforma ni tiendas de apps.
- **Precios en `product_prices` (lista, promoción, mayoreo):** permite agregar niveles sin migrar; un índice único parcial garantiza un solo precio por defecto.
- **Zona horaria fija `America/Mexico_City`:** un tablet mal configurado no descuadra el corte del día.
- **Vitest + Pytest:** cada runner es el estándar de su stack.
- **Semilla canónica en `backend/app/seeds/catalog.json`:** el JSON del frontend se genera con `seed:sync` y `seed:check` hace fallar CI si divergen.
- **TypeScript 5.9.3:** `typescript-eslint@8` exige TS `<6.1.0`.
- **Sin `dexie-react-hooks`:** el catálogo se lee con un hook propio; la dependencia del plan no se instaló por no usarse.
- **Skills vendorizadas y pinneadas por hash** (`.agents/skills/` + `skills-lock.json`): reproducibles entre sesiones.

## Spec activa: 002 — Venta offline
- Implementado: hoja local `dailyPrices` (id `fecha:producto`, `unit` congelada, vacíos en `null`), copia desde la hoja anterior más reciente, alta de productos nuevos sin pisar ediciones y rotación al cambiar el día de negocio (foco, visibilidad e intervalo).
- La venta usa solo la hoja del día; la promoción y el mayoreo se eligen manualmente por línea. El precio manual se captura en la línea del carrito con `validateManualPrice`, sin PIN ni roles (D-002-06).
- Dexie v2 conserva `categories`/`products`/`meta` y agrega `dailyPrices`, `tickets` y `outbox`. El ticket y su outbox se escriben en una transacción; el mismo UUID no duplica el cobro.
- El outbox queda `pending`; 004 hará la sincronización. Los precios diarios no se publican a otros dispositivos.

## Próximos pasos
1. Sustituir el catálogo provisional por la lista real de productos y precios del dueño.
2. Probar el guion offline en celular/tablet físico (T-002-22) y documentar la cifra.
3. Que el dueño describa la idea nueva de 003; la sincronización pasa a 004.

## Decisiones de producto pendientes
- Vigencia de promociones y precios ligados a cliente se definen en 006.
- La idea de 003 está sin describir; hasta entonces no se crea su carpeta.
