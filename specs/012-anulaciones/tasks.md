# Tareas — Spec 012 · Anulación de tickets

Cada tarea se marca `[x]` solo con la puerta de calidad en verde (constitución, sección 5).

- [x] **T-012-01 · PIN local**
  `voidPin.ts` con formato 4-6 dígitos, PBKDF2, sal y bloqueo de intentos.
  Hecho cuando configura, verifica y rechaza PIN incorrecto sin red.
  RF: RF-012-03, RF-012-04

- [x] **T-012-02 · Anulación local**
  `voidTicket` transaccional: estado, motivo, fecha, outbox eliminado y `voidPending`.
  Hecho cuando el ticket conserva su snapshot y deja de contar en el reporte.
  RF: RF-012-05, RF-012-08

- [x] **T-012-03 · Backend**
  Migración 0004, modelo, `POST /sales/{uuid}/void` idempotente y reporte filtrado.
  Hecho cuando la venta queda anulada y el reporte remoto la excluye.
  RF: RF-012-06, RF-012-08

- [x] **T-012-04 · Sincronización de anulaciones**
  `postVoid`, `drainVoids`, `404` como no-op y reintento con backoff/401.
  Hecho cuando una anulación hecha sin red se sincroniza al reconectar.
  RF: RF-012-06, RF-012-07

- [x] **T-012-05 · Lista y diálogo**
  Ventas del día, botón Anular, motivo, PIN, confirmación y estado pendiente.
  Hecho cuando se anula a 360 px con targets de 48 px.
  RF: RF-012-01, RF-012-02, RF-012-09, RF-012-12

- [x] **T-012-06 · Configuración del PIN**
  Sección en el engrane para crear o cambiar el PIN con la clave de administración.
  Hecho cuando sin PIN la anulación está deshabilitada y con PIN funciona.
  RF: RF-012-03, RF-012-04

- [x] **T-012-07 · Corte y recálculo**
  Excluir anuladas, mostrar el apartado y avisar si el corte cambió.
  Hecho cuando anular después de cerrar ofrece recalcular.
  RF: RF-012-08, RF-012-09, RF-012-10

- [x] **T-012-08 · Tests y documentación**
  Tests de backend y frontend; spec, plan, MEMORY y README actualizados.
  Hecho cuando la puerta de calidad está en verde.
  RF: RF-012-01…12

- [ ] **T-012-09 · Verificación de campo**
  Anular una venta real, verla fuera del corte y confirmar la conciliación.
  Hecho cuando el dueño valida el flujo en la tablet.
  RF: RF-012-01…10
