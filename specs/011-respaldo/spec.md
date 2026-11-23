# Spec 011 — Respaldo y restauración de datos locales

- Estado: activa (2026-11-23); alcance aprobado por el dueño.
- Spec activa: sí
- Depende de: `specs/002-venta-offline`, `specs/004-sincronizacion`, `specs/006-corte-reportes`
- Fecha: 2026-11-23

## Contexto y objetivo

El POS guarda en IndexedDB los tickets, la cola de sincronización, la hoja de precios del día y
los cortes de caja. Los tickets ya sincronizados también viven en Supabase, pero los cortes y los
tickets pendientes o fallidos **solo existen en el dispositivo**. Si se borra el navegador, se
cambia de tablet o se daña el equipo, esa información se pierde.

Esta iteración permite descargar un respaldo completo de los datos transaccionales y restaurarlo
en el mismo u otro dispositivo, sin depender de la red. La restauración **fusiona** y nunca borra
lo que ya existe en el dispositivo.

## Requisitos funcionales

- **RF-011-01**: EL SISTEMA genera un archivo JSON con versión de formato, fecha de exportación,
  conteos, tickets, outbox, cortes de caja y hojas de precios diarias.
- **RF-011-02**: EL RESPALDO se descarga como `polleria-respaldo-AAAA-MM-DD.json`; no incluye
  catálogo, claves, tokens ni configuración del dispositivo.
- **RF-011-03**: LA PANTALLA de respaldo muestra cuántos tickets, pendientes de sincronizar y
  cortes contiene el dispositivo, y la fecha del último respaldo.
- **RF-011-04**: EL SISTEMA valida formato, versión y forma de cada registro antes de restaurar;
  si el archivo está dañado o es de otra versión, lo rechaza sin tocar los datos actuales.
- **RF-011-05**: LA RESTAURACIÓN fusiona por llave primaria (`clientOrderUuid`, `businessDate` o
  `id`): agrega lo que falta, conserva lo existente y reporta cuántos registros agregó y omitió.
- **RF-011-06**: LA RESTAURACIÓN corre en una sola transacción; si falla, IndexedDB queda como
  estaba.
- **RF-011-07**: EL SISTEMA registra la fecha del último respaldo y avisa cuando no hay ninguno o
  cuando pasaron más de 7 días con datos en el dispositivo.
- **RF-011-08**: EL RESPALDO y la restauración funcionan sin conexión; no llaman a la API.
- **RF-011-09**: LA PANTALLA advierte que el archivo contiene ventas y debe guardarse en un lugar
  privado; usa áreas táctiles de 48 px y se puede usar a 360 px.

## Contenido del respaldo

| Sección | Llave | Qué recupera |
|---|---|---|
| `tickets` | `clientOrderUuid` | Historial local de ventas y sus líneas |
| `outbox` | `clientOrderUuid` | Ventas pendientes o fallidas de sincronizar |
| `cashCuts` | `businessDate` | Cortes de caja cerrados |
| `dailyPrices` | `id` (`fecha:producto`) | Hojas de precios de los días guardados |

El catálogo, la versión del catálogo, la clave del local y la configuración de la PWA no se
respaldan: se reconstruyen desde la API o la semilla.

## Casos límite

- Archivo con un ticket repetido: se omite y se cuenta como existente.
- Ticket `failed` en el dispositivo y `pending` en el respaldo: se conserva el estado actual.
- Corte del mismo día ya existente: se conserva el actual; el respaldo no lo pisa.
- Hoja de precios de hoy ya editada: se conserva la actual.
- Archivo con registros inválidos: se rechaza completo y se muestra el motivo.
- Dispositivo sin datos: el respaldo se genera vacío y se permite; la restauración agrega todo.
- Sin `localStorage` (modo privado): el respaldo funciona; solo el aviso de último respaldo se
  pierde al cerrar la pestaña.
- Restaurar en un dispositivo con ventas más nuevas: se conservan las nuevas y se agregan las
  faltantes.

## Fuera de alcance

- Respaldo automático a la nube, a Supabase o a un servidor.
- Cifrado con contraseña del archivo (se recomienda guardarlo en un lugar privado).
- Sincronizar cortes de caja con el backend.
- Fusionar catálogo, precios base o configuración entre dispositivos.
- Resolver conflictos de folios entre dispositivos (010).
- Exportación a CSV para el contador (013).

## Decisiones

- **D-011-01**: respaldo local en JSON, descargado por el usuario; sin nube ni backend. Aprobado
  el 2026-11-23.
- **D-011-02**: la restauración fusiona y nunca reemplaza; los datos actuales tienen prioridad.
  Aprobado el 2026-11-23.
- **D-011-03**: recordatorio a los 7 días sin respaldo; sin cifrado en esta iteración. Aprobado el
  2026-11-23.
- **D-011-04**: el respaldo vive en una pestaña propia, «Respaldo», visible para el dueño y el
  cajero; no requiere la clave de administración.
- **D-011-05**: no se cambia el esquema de Dexie; el último respaldo se guarda en `localStorage`.

## Criterios de aceptación

1. Descargar el respaldo genera un JSON con los tickets, pendientes, cortes y hojas del
   dispositivo, sin claves ni catálogo.
2. Restaurar ese archivo en una base vacía recupera los mismos conteos.
3. Restaurarlo dos veces no duplica nada y reporta los registros omitidos.
4. Un archivo corrupto o de otra versión se rechaza y los datos actuales quedan intactos.
5. La pestaña avisa cuando no hay respaldo o pasaron más de 7 días.
6. `lint`, `typecheck`, `test`, `build`, `seed:check`, `pytest` y `ruff` en verde.
