# MEMORY.md — Memoria de Arquitectura y Estado del POS
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no te aporte

## Estado actual (2026-11-22)
- Specs 001, 002, 004, 005 y 006 cerradas; 003 pospuesta por falta de imágenes.
- Spec 007 (catálogo real y diseño) activa; 22 productos: 11 de precio visible y 11 temporales a $100; diseño rojo/amarillo aplicado.
- Desplegado: API `https://polleria-api-homu.onrender.com` y PWA `https://polleria-q84.pages.dev`; CORS exige orígenes exactos.
- Tests: backend 40 passed + 2 skipped; frontend 241 passed en 35 archivos; `ruff`, `lint`, `typecheck`, `build` y `seed:check` verdes.
- Supabase con `0001_catalog` y `0002_sales`; RLS deshabilitado hasta 008.
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

## Spec 007 — Catálogo real y diseño (activa)
- Catálogo con 22 productos: 11 de precio visible y 11 temporales a $100 (alitas, pechuga, milanesa, patitas, menudencias, papas, moles y dedos de queso).
- Diseño del letrero: rojo/amarillo/crema, mascota SVG y encabezado «Pollería El Wero»; imágenes por producto quedan para 003.
- Faltan pollo entero, nuggets, pollo KFC y bebidas; los $100 se ajustan en Precios del día.

## Próximos pasos
1. Completar 007 con pollo entero, nuggets, pollo KFC y bebidas (precios y unidades).
2. RLS y rol mínimo de base en 008.
3. Retomar 003 con las imágenes por SKU.
4. Verificación de campo en celular/tablet.

## Decisiones de producto pendientes
- 007: lista y precios reales del local.
- 008: promociones, precios por cliente y quién puede editar.
- 009: modelo y conexión de la impresora.
