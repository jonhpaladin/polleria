# MEMORY.md — Memoria de Arquitectura y Estado del POS
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no te aporte

## Estado actual (2026-11-23)
- Specs 001, 002, 004, 005, 006 y 007 cerradas; 003 pospuesta por falta de imágenes.
- Spec 008 activa e implementada en local: administración de precios, claves de API y RLS; falta configurar claves en Render y desplegar.
- Catálogo real con 29 productos activos: 11 con precio confirmado y 18 temporales a $100; 17 provisionales inactivos.
- Desplegado: API `https://polleria-api-homu.onrender.com` y PWA `https://polleria-q84.pages.dev`; CORS exige orígenes exactos.
- Tests: backend 54 passed + 3 skipped; frontend 248 passed en 36 archivos; `ruff`, `lint`, `typecheck`, `build` y `seed:check` verdes.
- Supabase con `0001_catalog`, `0002_sales` y RLS aplicado; `0003_seguridad` prepara el rol mínimo.
- Guía de despliegue en `docs/despliegue.md`; pasos de seguridad en `docs/seguridad.md`.

## Decisiones (y por qué)
- **Neon/Supabase free tier en vez de laptop en casa:** evita exponer túneles/DNS y dejar un equipo encendido.
- **Outbox local-first:** el celular confirma la venta sin depender del Wi-Fi/4G del local.
- **Decimal en backend y centavos enteros en el cliente:** los kilos fraccionados desfasan arqueos con IEEE 754.
- **PWA sobre app nativa:** se abre en cualquier celular/tablet/laptop sin tiendas ni compilaciones.
- **Zona horaria fija `America/Mexico_City`:** un tablet mal configurado no descuadra el corte.
- **Semilla canónica en `backend/app/seeds/catalog.json`:** `seed:check` falla si frontend y backend divergen.
- **4xx terminal en `/sync`:** un dato inválido no se arregla reintentando; se reintenta a mano.
- **Venta como snapshot sin FK a productos:** un cambio de catálogo no deja ventas pendientes.
- **Carrito en pestaña con icono flotante:** ningún panel tapa la rejilla en celular.
- **Corte local + conciliación remota:** el mostrador manda; el backend solo compara lo sincronizado.

## Spec 002 — Venta offline (cerrada)
- Hoja local `dailyPrices`, carrito por kilo/pieza, precio manual sin PIN y pago informativo.
- Dexie v2: ticket + outbox atómicos; el mismo UUID no duplica el cobro.

## Spec 004 — Sincronización (cerrada)
- `drainOutbox` envía uno por uno, borra al confirmar y aplica backoff 2 s→5 min; un 4xx pasa a `failed`.
- Dexie v3: `attempts`, `nextAttemptAt`, `lastError`; `useSync` drena al arrancar, al volver online, al cobrar y cada 30 s.

## Spec 005 — Venta táctil (cerrada)
- Tocar producto abre `<dialog>` con peso/cantidad y precio; solo «Agregar» crea la línea.
- Pestañas Venta, Carrito, Precios y Corte; icono flotante con contador; el carrito ya no es sticky.

## Spec 006 — Corte y reportes (cerrada)
- Reporte local por `businessDate`: total, tickets, promedio, métodos, producto y categoría.
- Corte manual con fondo/contado, foto recalculable en `cashCuts` (Dexie v4) y conciliación con `/reports/daily`.

## Spec 007 — Catálogo real y diseño (cerrada)
- 29 productos en 6 categorías: pollo, moles, preparados y huevo por kg; congelados, papas, dedos y bebidas por pieza.
- 18 precios temporales de $100 se ajustan en Precios del día; la corrección base queda para 008.
- Diseño rojo/amarillo/crema con mascota SVG; las imágenes por producto quedan para 003.

## Spec 008 — Precios y seguridad (activa)
- Engrane de administración con clave en memoria; edita lista/promoción/mayoreo y activa productos.
- Clave del local por dispositivo para `/sync` y `/reports/daily`; un 401 es reintentable y avisa.
- Publicar avanza `catalog_meta`; las cajas refrescan cada 5 min y reemplazan la hoja del día.
- RLS activo y `anon`/`authenticated` sin permisos; `docs/seguridad.md` tiene los pasos pendientes.

## Próximos pasos
1. Configurar `ADMIN_KEY` y `DEVICE_KEY` en Render, aplicar 0003 y desplegar 008.
2. Retomar 003 con las imágenes por SKU.
3. Verificación de campo en celular/tablet.

## Decisiones de producto pendientes
- 008: promociones, precios por cliente y quién puede editar.
- 009: modelo y conexión de la impresora.
