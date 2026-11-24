# Tareas — Spec 013 · Historial y CSV

Cada tarea se marca `[x]` solo con la puerta de calidad en verde (constitución, sección 5).

- [x] **T-013-01 · Consulta por rango**
  `listTicketsBetween` con índice `businessDate`, orden por fecha y folio.
  Hecho cuando incluye extremos, anuladas y tickets de varios días.
  RF: RF-013-01, RF-013-02

- [x] **T-013-02 · Totales y filtro**
  Conteo, total activo, total anulado y filtro por folio.
  Hecho cuando un ticket anulado no suma en activas.
  RF: RF-013-03, RF-013-04

- [x] **T-013-03 · CSV**
  Encabezados, escape, BOM, decimales y una fila por línea.
  Hecho cuando Excel abre el archivo con acentos y montos correctos.
  RF: RF-013-06, RF-013-07

- [x] **T-013-04 · Pestaña Historial**
  Rango, búsqueda, totales, lista expandible y detalle de líneas.
  Hecho cuando se usa a 360 px con targets de 48 px.
  RF: RF-013-01…05, RF-013-10

- [x] **T-013-05 · Descarga**
  Blob `text/csv;charset=utf-8`, nombre por rango y descarga local.
  Hecho cuando el archivo se descarga sin llamar a la API.
  RF: RF-013-06, RF-013-08

- [x] **T-013-06 · Tests y documentación**
  Tests de repositorio, CSV y pestaña; spec, plan, README y MEMORY.
  Hecho cuando la puerta de calidad está en verde.
  RF: RF-013-01…10

- [ ] **T-013-07 · Verificación de campo**
  Consultar un rango real y abrir el CSV en Excel.
  Hecho cuando el dueño confirma que el archivo sirve para el contador.
  RF: RF-013-06, RF-013-07
