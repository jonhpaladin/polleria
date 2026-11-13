# MEMORY.md — Memoria de Arquitectura y Estado del POS

## Estado actual (2026-11-13)
- Spec 001 cerrada por ratificación del dueño: PWA de catálogo + API FastAPI/PostgreSQL (migración Alembic 0001, semilla idempotente, `/health`, `/catalog`).
- Spec 002 cerrada por ratificación del dueño (2026-11-13): pestaña `Precios del día` (copia la última hoja disponible, edición local de normal/promoción/mayoreo), carrito por kilo/pieza con precio manual sin autorización, pago informativo y confirmación local atómica de ticket + outbox.
- Tests: backend 22 passed + 1 skipped (integración sin `TEST_DATABASE_URL`); frontend 165 passed en 24 archivos; `ruff`, `lint`, `typecheck`, `seed:check` y `build` en verde.
- Validado con Edge headless + CDP: 360/768/1280 sin scroll horizontal, targets de 48 px, tabla de precios con scroll interno y cobro con red apagada en **9,8–11,3 ms** desde el clic hasta el aviso de éxito (26 precios, 1 ticket y 1 outbox). Tras recargar sin red, el service worker sirvió la app y el ticket sobrevivió. La prueba en dispositivo físico queda como verificación de campo (D-002-11).
- Supabase conectado y validado: esquema 0001, 5 categorías, 26 productos, 33 precios y 26 precios por defecto; sin Postgres local, Docker ni `uv`.
- Guía de despliegue en `docs/despliegue.md`: PWA vs APK, Cloudflare Pages + Render + Supabase, costos free y pasos de publicación.
- Spec 002 commiteada y pusheada a `master` (`258d3d3` implementación, `2b5a812` skills, `75bff55` validación).
- Spec 003 (`003-catalogo-visual`) activa: foto de estudio por SKU, WebP local precacheado y rejilla 2/3/4 columnas.

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

## Spec 002 — Venta offline (cerrada)
- Implementado: hoja local `dailyPrices` (id `fecha:producto`, `unit` congelada, vacíos en `null`), copia desde la hoja anterior más reciente, alta de productos nuevos sin pisar ediciones y rotación al cambiar el día de negocio (foco, visibilidad e intervalo).
- La venta usa solo la hoja del día; la promoción y el mayoreo se eligen manualmente por línea. El precio manual se captura en la línea del carrito con `validateManualPrice`, sin PIN ni roles (D-002-06).
- Dexie v2 conserva `categories`/`products`/`meta` y agrega `dailyPrices`, `tickets` y `outbox`. El ticket y su outbox se escriben en una transacción; el mismo UUID no duplica el cobro.
- El outbox queda `pending`; 004 hará la sincronización. Los precios diarios no se publican a otros dispositivos.
- El cobro revalida el día de la hoja al agregar y al confirmar, no solo en el render, para cerrar la ventana de medianoche.

## Spec activa: 003 — Catálogo visual
- Foto de estudio generada con IA por SKU, WebP 512×512 en `src/assets/products/`, precache en el service worker y respaldo con inicial.
- Pendiente el primer paso: muestra de `PIERNA-MUSLO` para aprobar el estilo y luego las 26 imágenes.

## Próximos pasos
1. Sustituir el catálogo provisional por la lista real de productos y precios del dueño.
2. Verificación de campo de T-002-22 en celular/tablet físico (excepción ya aprobada; no bloquea).
3. Aprobar la muestra de imagen de 003 y generar las 26 fotografías; la sincronización sigue en 004.

## Decisiones de producto pendientes
- Vigencia de promociones y precios ligados a cliente se definen en 006.
- 003 no tiene dudas bloqueantes; el catálogo real reemplazará las imágenes por SKU.
