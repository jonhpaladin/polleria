# MEMORY.md — Memoria de Arquitectura y Estado del POS
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no te aporte

## Estado actual (2026-11-26)
- Specs 001, 002, 003, 004, 005, 006, 007, 008, 009, 011, 012 y 013 cerradas; solo 010 condicional.
- 009 cerrada por ratificación: impresión 58 mm por BLE/WebUSB y fallback `window.print()`.
- 003: 25 WebP 512×512 (1.09 MB) precacheadas, mapa SKU→archivo y tarjeta visual; sin bebidas.
- 013 validada por el dueño: historial local por rango, búsqueda por folio y CSV con anuladas.
- 012 validada por el dueño: anulación de ticket completo con PIN, sincronización y reportes filtrados.
- 008: administración de precios, claves de API y RLS desplegadas; `ADMIN_KEY` y `DEVICE_KEY` ya configuradas en Render.
- Catálogo real con 25 productos activos: 11 con precio confirmado y 14 temporales a $100; 17 inactivos.
- Desplegado: API `https://polleria-api-homu.onrender.com` y PWA `https://polleria-q84.pages.dev`; CORS exige orígenes exactos.
- Tests: backend 59 passed + 4 skipped; frontend 303 passed en 48 archivos; `ruff`, `lint`, `typecheck`, `build`, `seed:check` e `images:check` verdes.
- Supabase con `0001`…`0004`; RLS activo y `anon`/`authenticated` sin permisos.

## Decisiones
- **Outbox local-first:** el celular cobra sin red; el mismo UUID no duplica el ticket.
- **Decimal en backend y centavos enteros en el cliente:** los kilos fraccionados desfasan arqueos con IEEE 754.
- **Zona horaria fija `America/Mexico_City`:** un tablet mal configurado no descuadra el corte.
- **Semilla canónica en `backend/app/seeds/catalog.json`:** `seed:check` falla si frontend y backend divergen.
- **Venta como snapshot sin FK a productos:** un cambio de catálogo no altera tickets.
- **Corte local + conciliación remota:** el mostrador manda; el backend solo compara lo sincronizado.
- **Precios base publicados:** las cajas refrescan cada 5 min y reemplazan la hoja del día.
- **Anulación conserva el ticket:** estado `voided`, PIN local y `voidPending` hasta que el backend confirma.

## Specs cerradas
- **002/004:** hoja diaria, carrito, ticket + outbox atómicos, backoff 2 s→5 min y 4xx terminal.
- **005/006:** hoja de producto, carrito en pestaña, corte por día, efectivo contado y conciliación.
- **007:** 25 productos reales (sin bebidas), identidad rojo/amarillo con mascota; imágenes para 003.
- **008:** engrane con clave, edición de precios, clave del local, 401 reintentable y RLS.
- **011:** respaldo con tickets, outbox, cortes y precios; restauración que no borra.

## Spec 012 — Anulaciones (cerrada)
- Ticket completo del día, motivo y PIN de 4-6 dígitos (PBKDF2 con sal y bloqueo).
- El outbox de la venta se elimina; `POST /sales/{uuid}/void` idempotente con clave del local; 404 = no-op.
- Reportes local y remoto excluyen anuladas; el corte las muestra aparte y avisa si cambió.

## Spec 003 — Catálogo visual (cerrada)
- 25 imágenes WebP 512×512 integradas y precacheadas; el catálogo no incluye bebidas.
- Tarjeta con imagen de fondo, degradado, precio/chips y respaldo; rejilla 2/3/4 columnas.
- `images:check` cubre peso y cobertura; validada por el dueño en la tablet.

## Spec 009 — Impresión (cerrada)
- Ticket ESC/POS de 58 mm desde Chrome Android por BLE/WebUSB; sin backend ni agente.
- Cola Dexie v5 `printJobs` con `pending/printing/printed/failed/uncertain`; incierto no auto.
- `/printer-test` y `docs/impresoras-009.md`; T-009-16 (impresora física) es verificación de campo.

## Próximos pasos
1. Comprar/probar una impresora BLE o USB real en Chrome Android (T-009-16).
2. Verificación de campo: respaldo/restauración y anulación en la tablet.
3. Publicar precios reales cuando el dueño los defina.
4. 010 multidispositivo solo si se abre una segunda caja.
