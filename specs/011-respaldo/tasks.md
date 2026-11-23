# Tareas — Spec 011 · Respaldo y restauración

Cada tarea se marca `[x]` solo con la puerta de calidad en verde (constitución, sección 5).

- [x] **T-011-01 · Contrato del respaldo**
  `BackupPayload`, conteos, folio local y resultado de restauración.
  Hecho cuando el JSON incluye versión, fecha y las cuatro tablas transaccionales.
  RF: RF-011-01, RF-011-02

- [x] **T-011-02 · Construcción y descarga**
  Leer IndexedDB, calcular conteos y folio, serializar y descargar con nombre por fecha.
  Hecho cuando el archivo no incluye catálogo, claves ni configuración.
  RF: RF-011-01, RF-011-02

- [x] **T-011-03 · Validación**
  Formato, versión y forma de tickets, outbox, cortes y precios antes de escribir.
  Hecho cuando un archivo corrupto se rechaza sin tocar los datos.
  RF: RF-011-04

- [x] **T-011-04 · Fusión transaccional**
  Agregar solo lo que falta por llave y conservar el folio local más alto.
  Hecho cuando repetir la restauración agrega cero y no duplica.
  RF: RF-011-05, RF-011-06

- [x] **T-011-05 · Recordatorio**
  Guardar la fecha del último respaldo y marcar la pestaña a los 7 días.
  Hecho cuando la pestaña muestra `Respaldo ⚠` con datos y sin respaldo reciente.
  RF: RF-011-07

- [x] **T-011-06 · Pestaña Respaldo**
  Conteos, descarga, selección de archivo, vista previa y confirmación.
  Hecho cuando el dueño puede respaldar y restaurar a 360 px con targets de 48 px.
  RF: RF-011-03, RF-011-09

- [x] **T-011-07 · Tests y documentación**
  Tests de respaldo, validación, fusión y recordatorio; plan y spec actualizados.
  Hecho cuando la puerta de calidad está en verde.
  RF: RF-011-01…09

- [x] **T-011-08 · Verificación de campo**
  Descargar un respaldo, borrar los datos locales y restaurarlo en la tablet.
  La descarga y la fusión están cubiertas por tests; la prueba manual queda en la verificación
  de campo del proyecto.
  RF: RF-011-01…06
