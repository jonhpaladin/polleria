# MEMORY.md — Memoria de Arquitectura y Estado del POS
Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no te aporte

## Estado actual (2026-11-23)
- Specs 001, 002, 004, 005, 006, 007 y 008 cerradas; 003 pospuesta; 011 activa implementada.
- 008: administración de precios, claves de API y RLS desplegadas; falta configurar `ADMIN_KEY` y `DEVICE_KEY` en Render.
- 011: pestaña «Respaldo» con JSON, validación y fusión; falta validarla en la tablet.
- Catálogo real con 29 productos activos: 11 con precio confirmado y 18 temporales a $100; 17 inactivos.
- Desplegado: API `https://polleria-api-homu.onrender.com` y PWA `https://polleria-q84.pages.dev`; CORS exige orígenes exactos.
- Tests: backend 54 passed + 3 skipped; frontend 257 passed en 38 archivos; `ruff`, `lint`, `typecheck`, `build` y `seed:check` verdes.
- Supabase con `0001_catalog`, `0002_sales`, RLS y `0003_seguridad`; `anon`/`authenticated` sin permisos.
- Guías: `docs/despliegue.md` y `docs/seguridad.md`.

## Decisiones
- **Outbox local-first:** el celular cobra sin red; el mismo UUID no duplica el ticket.
- **Decimal en backend y centavos enteros en el cliente:** los kilos fraccionados desfasan arqueos con IEEE 754.
- **Zona horaria fija `America/Mexico_City`:** un tablet mal configurado no descuadra el corte.
- **Semilla canónica en `backend/app/seeds/catalog.json`:** `seed:check` falla si frontend y backend divergen.
- **Venta como snapshot sin FK a productos:** un cambio de catálogo no altera tickets.
- **Corte local + conciliación remota:** el mostrador manda; el backend solo compara lo sincronizado.
- **Precios base publicados:** las cajas refrescan cada 5 min y reemplazan la hoja del día.
- **Respaldo local en JSON:** fusión por llave, sin nube ni cifrado en esta iteración.

## Specs cerradas
- **002/004:** hoja diaria, carrito, ticket + outbox atómicos, backoff 2 s→5 min y 4xx terminal.
- **005/006:** hoja de producto, carrito en pestaña, corte por día, efectivo contado y conciliación.
- **007:** 29 productos reales, identidad rojo/amarillo con mascota; imágenes para 003.
- **008:** engrane con clave, edición de precios, clave del local, 401 reintentable y RLS.
- **011:** respaldo con tickets, outbox, cortes y precios; restauración que no borra.

## Próximos pasos
1. Validar 011 en la tablet: descargar, borrar IndexedDB y restaurar.
2. 003 bloqueada hasta tener imágenes aprobadas por SKU.
3. 012 anulaciones y devoluciones con auditoría; después 009 impresión y 013 historial.
4. Configurar las claves de Render y probar la publicación entre dos dispositivos.

## Decisiones pendientes
- 012: motivo, PIN y efecto de una anulación en el corte.
- 009: modelo y conexión de la impresora.
