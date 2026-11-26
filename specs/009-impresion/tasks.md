# Tareas 009 — Impresión térmica desde la PWA

- Spec: `specs/009-impresion/spec.md`
- Plan: `specs/009-impresion/plan.md`
- Estado: cerrada en software (2026-11-25); verificación física pendiente

## Fase 0 — Gobierno

- [x] **T-009-01 · Redactar spec, plan y tareas**
  Documentar alcance Android-first, RF en EARS, cola, contrato del ticket y decisiones.
  Hecho cuando no hay dudas bloqueantes y el plan cabe en tareas de 20–30 min.
  RF: —

- [x] **T-009-02 · Aprobar dependencias y Dexie v5**
  El dueño aprobó las 3 librerías MIT y la migración `printJobs`.
  Hecho cuando las dependencias están declaradas y el esquema está definido.
  RF: RF-009-01, 02, 07

## Fase 1 — Núcleo

- [x] **T-009-03 · Agregar Dexie v5**
  Declarar `printJobs` con índices y migración que conserva tablas existentes.
  Hecho cuando v4→v5 conserva tickets y la tabla nueva funciona.
  RF: RF-009-07, 13

- [x] **T-009-04 · Modelo y encoder del ticket**
  Crear `types/print.ts`, `printer/ticket.ts` y `printer/encoder.ts` con 32 columnas,
  acentos, total, anulado y ticket de prueba con QR/código de barras.
  Hecho cuando los tests del encoder pasan y no hay floats.
  RF: RF-009-05, 06, 08, 12

- [x] **T-009-05 · Cola de impresión**
  Implementar enqueue/dedupe, claim, printed, failed, uncertain y conteos.
  Hecho cuando la cola sobrevive recarga y no duplica un `printed`.
  RF: RF-009-07, 09, 13

## Fase 2 — Conectividad

- [x] **T-009-06 · Adaptador BLE**
  Envolver WebBluetoothReceiptPrinter, traducir eventos y guardar el dispositivo.
  Hecho cuando el servicio recibe `connected`, `disconnected` y bytes.
  RF: RF-009-01, 03, 04

- [x] **T-009-07 · Adaptador USB**
  Envolver WebUSBReceiptPrinter con reconexión por serial/vendor/product.
  Hecho cuando el servicio recibe el dispositivo y puede imprimir.
  RF: RF-009-02, 03, 04

- [x] **T-009-08 · Servicio y hook**
  Implementar `PrinterService`, `usePrinter`, reconexión, estados y drenaje.
  Hecho cuando conectar/imprimir/desconectar se refleja en la UI.
  RF: RF-009-01…10

- [x] **T-009-09 · Fallback de sistema**
  Crear iframe de 58 mm y `window.print()`; no usarlo como térmica.
  Hecho cuando el ticket se ve en 58 mm y el botón abre el diálogo.
  RF: RF-009-11

## Fase 3 — UI

- [x] **T-009-10 · Cabecera y diálogo**
  Badge de estado, pendientes, conectar BLE/USB, codepage, prueba y cola.
  Hecho cuando los estados son visibles y los targets miden 48 px.
  RF: RF-009-03…10

- [x] **T-009-11 · Venta e historial**
  Exponer `lastTicket`, botón “Imprimir ticket” y “Reimprimir” con snapshot.
  Hecho cuando ambos flujos encolan y muestran el resultado.
  RF: RF-009-07, 08

- [x] **T-009-12 · Página de prueba**
  Crear `/printer-test` con feature detection, BLE/USB, prueba, QR/código y log.
  Hecho cuando se puede diagnosticar sin abrir la venta.
  RF: RF-009-12

## Fase 4 — Calidad

- [x] **T-009-13 · Tests**
  Cubrir encoder, cola, servicio, migración v5 y botones.
  Hecho cuando pasan sin hardware real (adaptadores falsos).
  RF: RF-009-05…09

- [x] **T-009-14 · Gate, documentación y cierre**
  Correr lint, typecheck, tests, build, `seed:check` e `images:check`; actualizar README y MEMORY.
  Hecho cuando todo pasa y la validación física queda documentada como manual.
  RF: —

## Fase 5 — Verificación física

- [ ] **T-009-15 · Probar con impresora real**
  En Chrome Android, conectar una BLE (o USB con OTG), imprimir el ticket de prueba con
  acentos, QR y código de barras, y revisar la reconexión y la cola `uncertain`.
  Hecho cuando el dueño confirma el modelo y el ticket sale completo; si el modelo es SPP o no
  aparece en WebUSB, se documenta y se decide el reemplazo.
  RF: RF-009-01, 02, 05, 06, 09, 12
