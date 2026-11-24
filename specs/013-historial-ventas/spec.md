# Spec 013 — Historial de ventas y exportación CSV

- Estado: activa (2026-11-23); implementada y desplegada, pendiente la validación de campo.
- Spec activa: sí
- Depende de: `specs/002-venta-offline`, `specs/006-corte-reportes`, `specs/012-anulaciones`
- Fecha: 2026-11-23

## Contexto y objetivo

El corte muestra el día en curso y los cierres recientes, pero no hay forma de consultar ventas
de fechas anteriores, buscar un ticket por folio ni entregar un archivo al contador. Esta
iteración agrega una pestaña de historial local y una exportación CSV con el detalle de las
líneas, incluidas las ventas anuladas y su motivo.

El historial sale de IndexedDB, no de la red: funciona sin conexión y conserva los datos aunque
el backend no responda. Las ventas ya sincronizadas también están en Supabase, pero esta spec no
las consulta.

## Requisitos funcionales

- **RF-013-01**: LA PESTAÑA Historial permite elegir un rango de fechas de negocio (`desde`,
  `hasta`) y arranca con el día actual en ambos campos.
- **RF-013-02**: EL HISTORIAL lista los tickets del rango, incluidas las ventas anuladas, del más
  reciente al más antiguo, con fecha, folio, hora, total, método de pago y estado.
- **RF-013-03**: EL HISTORIAL muestra cuántos tickets hay, el total de ventas activas y el total
  anulado del rango.
- **RF-013-04**: EL USUARIO puede filtrar por folio local con un campo numérico; el filtro no
  altera el CSV si se exporta todo el rango.
- **RF-013-05**: AL ABRIR un ticket, se ven sus líneas con producto, categoría, cantidad o gramos,
  precio unitario, importe y origen del precio; si está anulado, muestra motivo y fecha.
- **RF-013-06**: EL BOTÓN Exportar CSV descarga el rango elegido con una fila por línea de ticket,
  dinero como decimal con dos dígitos, campos entre comillas y BOM UTF-8 para Excel.
- **RF-013-07**: EL CSV incluye folio, UUID, fecha de negocio, instante UTC, método de pago,
  estado, total del ticket, datos de la línea, motivo de anulación y fecha de anulación.
- **RF-013-08**: EL HISTORIAL y el CSV se generan solo con datos locales; no llaman a la API.
- **RF-013-09**: LA LISTA se limita a 500 tickets visibles y avisa que hay más; el CSV exporta
  todo el rango.
- **RF-013-10**: LA PESTAÑA conserva áreas táctiles de 48 px y se puede usar a 360 px.

## Columnas del CSV

| Columna | Origen |
|---|---|
| `folio` | `localFolio` |
| `client_order_uuid` | UUID local |
| `fecha_negocio` | `businessDate` |
| `vendido_utc` | `soldAtUtc` |
| `metodo_pago` | `paymentMethod` |
| `estado` | `confirmed` o `voided` |
| `total_ticket` | `totalCents` como decimal |
| `linea_id` | `lineId` |
| `producto_id`, `sku`, `producto`, `categoria` | Snapshot de la línea |
| `unidad`, `cantidad`, `gramos` | Medida de la línea |
| `origen_precio` | `priceSource` |
| `precio_catalogo`, `precio_unitario`, `importe_linea` | Centavos como decimal |
| `motivo_anulacion`, `anulado_utc` | Campos de 012, vacíos si está activa |

## Casos límite

- Rango sin ventas: lista vacía, totales en cero y CSV solo con encabezados.
- `desde` mayor que `hasta`: se muestra un error y no se consulta.
- Fecha inválida o vacía: no se consulta hasta completar ambas.
- Ticket anulado: aparece con estado `voided` y su motivo; no se suma a las ventas activas.
- Ticket sin líneas (dato viejo): se lista con el total del ticket y el CSV no inventa líneas.
- Más de 500 tickets: la lista avisa; el CSV sigue exportando todo.
- Caracteres especiales en nombres: el CSV los escapa entre comillas.
- Sin IndexedDB: la pestaña muestra un error legible, sin romper la app.

## Fuera de alcance

- Consultar ventas que solo existen en Supabase.
- Exportar PDF, reportes fiscales, contabilidad o gráficas.
- Anular tickets de días anteriores (012 solo permite el día en curso).
- Editar o borrar tickets.
- Enviar el CSV por correo o a la nube.

## Decisiones

- **D-013-01**: fuente local (IndexedDB); el historial funciona sin red. Aprobado el 2026-11-23.
- **D-013-02**: rango de fechas con el día actual por defecto. Aprobado el 2026-11-23.
- **D-013-03**: CSV con una fila por línea, comas, comillas y BOM UTF-8; incluye anuladas.
  Aprobado el 2026-11-23.
- **D-013-04**: la lista muestra hasta 500 tickets; el CSV exporta el rango completo.
- **D-013-05**: no hay cambio de backend ni de Dexie.

## Criterios de aceptación

1. El historial muestra las ventas de ayer y de hoy, con sus totales y estados.
2. Buscar un folio filtra la lista sin alterar el CSV.
3. Abrir un ticket muestra sus líneas y, si está anulado, el motivo.
4. El CSV se abre en Excel con acentos correctos y una fila por línea.
5. Las ventas anuladas aparecen en el CSV con estado `voided` y no suman en el total activo.
6. `lint`, `typecheck`, `test`, `build`, `seed:check`, `pytest` y `ruff` en verde.
