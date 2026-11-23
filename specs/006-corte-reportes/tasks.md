# Tareas — Spec 006 · Corte de caja y reportes

Cada tarea se marca `[x]` solo con la puerta de calidad en verde (constitución, sección 5).

- [x] **T-006-01 · Tipos y Dexie v4**
  Crear `types/report.ts`, la tabla `cashCuts` y la versión 4 sin tocar las tablas existentes.
  Hecho cuando un ticket y un outbox de la v3 sobreviven a la apertura y `cashCuts` está vacía.
  RF: RF-006-04, RF-006-09

- [x] **T-006-02 · Reporte local puro**
  `buildDailyReport` con total, tickets, promedio entero, métodos, productos y categorías.
  Hecho cuando los tests cubren piezas, gramos y orden descendente.
  RF: RF-006-01, RF-006-02

- [x] **T-006-03 · Corte y conciliación puros**
  `buildCashCut`, `reconcileReports` y `formatSignedCents`, con diferencia positiva/negativa.
  Hecho cuando los tests cubren sobrante, faltante y ausencia de remoto.
  RF: RF-006-03, RF-006-07

- [x] **T-006-04 · Repositorio local**
  Tickets por día, lectura/guardado del corte, historial y conteo de outbox no sincronizado.
  Hecho cuando el corte sobrevive una reapertura y el conteo separa pending de failed.
  RF: RF-006-04, RF-006-06, RF-006-09

- [x] **T-006-05 · Backend: contrato y agregación**
  Esquemas, `build_daily_report`, repositorio y router `GET /reports/daily`.
  Hecho cuando el contrato devuelve dinero string y la agregación cuadra con las líneas.
  RF: RF-006-08

- [x] **T-006-06 · Tests del backend**
  Contrato con repositorio fake, fecha inválida y agregación pura con ventas y líneas.
  Hecho cuando `pytest` pasa con los casos nuevos.
  RF: RF-006-08

- [x] **T-006-07 · Cliente y hook**
  `fetchDailyReport` con timeout, `useReports` con carga al abrir, guardado y recálculo.
  Hecho cuando la pestaña carga, cierra y recalcula sin bloquear la UI.
  RF: RF-006-01…07

- [x] **T-006-08 · Pestaña Corte**
  Resumen, efectivo, desgloses, conciliación, historial y avisos; cuarta pestaña en `App`.
  Hecho cuando se usa a 360 px con targets de 48 px y textos de estado.
  RF: RF-006-01…07, RF-006-10

- [x] **T-006-09 · Tests de UI**
  `ReportsTab.test.tsx` con corte cerrado, ventas nuevas, sin red y conciliación con diferencia.
  Hecho cuando los tests de la pestaña y del repositorio pasan.
  RF: RF-006-03…07

- [x] **T-006-10 · Cierre documental**
  Actualizar `MEMORY.md`, `specs/README.md` y las decisiones de producto.
  Hecho cuando 006 queda cerrada y 007 toma el siguiente turno.
  RF: —
