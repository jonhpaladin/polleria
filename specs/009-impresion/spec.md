# Spec 009 — Impresión térmica desde la PWA

- Estado: cerrada en software (2026-11-25); validación física pendiente
- Spec activa: no
- Depende de: `specs/002-venta-offline`, `specs/005-venta-tactil`, `specs/012-anulaciones`,
  `specs/013-historial-ventas` y `docs/constitution.md` v1.0
- Fecha: 2026-11-25

## Contexto y objetivo

El POS ya cobra sin red y guarda el ticket local. Falta imprimir el comprobante en una térmica
de 58 mm desde el mismo celular/tablet Android, sin backend ni agente de impresión. La impresora
puede ser Bluetooth BLE o USB con OTG; el navegador habla con ella mediante Web Bluetooth o
WebUSB. En iOS no existen esas APIs, así que por ahora solo se ofrece la impresión del sistema
(AirPrint/PDF) como fallback.

La impresión no puede bloquear el cobro. Si la impresora no está conectada o falla, el ticket
queda en una cola local y se reintenta cuando el cajero la conecte. Un reintento nunca debe
duplicar un ticket que ya salió: la cola distingue entre pendiente, impreso, fallido y “no
sabemos si salió” (`uncertain`).

## Usuarios / actores

- **Cajero/a**: cobra, conecta la impresora y reimprime desde el historial.
- **Dueño/encargado**: configura la impresora y revisa tickets pendientes.
- **Sistema local**: mantiene la cola en Dexie y no depende de la red para imprimir.

## Requisitos funcionales (EARS)

- **RF-009-01**: CUANDO el cajero toca “Conectar Bluetooth”, EL SISTEMA solicita una impresora
  BLE desde un gesto del usuario y muestra el estado de conexión.
- **RF-009-02**: CUANDO el cajero toca “Conectar USB”, EL SISTEMA solicita una impresora WebUSB
  desde un gesto del usuario, con cable OTG.
- **RF-009-03**: EL SISTEMA detecta `navigator.bluetooth` y `navigator.usb`; si no existen,
  oculta esas opciones y deja solo la impresión del sistema.
- **RF-009-04**: AL ABRIR la app, EL SISTEMA intenta reconectar la última impresora guardada sin
  bloquear la venta; si falla, muestra “Conectar impresora”.
- **RF-009-05**: CUANDO se imprime un ticket, EL SISTEMA genera ESC/POS de 58 mm con 32
  columnas, encabezado, folio/fecha, líneas con cantidad/nombre/importe, total en negrita y
  doble altura, y pie; no envía corte automático.
- **RF-009-06**: EL SISTEMA conserva acentos y ñ usando el `codepageMapping` de la impresora
  conectada y permite forzar `cp858` si el texto sale raro.
- **RF-009-07**: CUANDO el cajero toca “Imprimir ticket” en una venta, EL SISTEMA encola el
  ticket y lo imprime si hay impresora; si no, lo deja pendiente y muestra el conteo.
- **RF-009-08**: CUANDO el cajero toca “Reimprimir” en el historial, EL SISTEMA crea un trabajo
  nuevo con el snapshot del ticket; si está anulado, imprime la leyenda “ANULADO”.
- **RF-009-09**: SI la impresora se desconecta durante la impresión, ENTONCES EL SISTEMA marca
  el trabajo como `uncertain`, no lo reintenta solo y pide confirmación al cajero.
- **RF-009-10**: EL SISTEMA muestra en la UI: sin impresora, conectando, conectada, imprimiendo,
  error y tickets pendientes/con error.
- **RF-009-11**: CUANDO no hay impresora o el usuario elige “Imprimir con el sistema”, EL SISTEMA
  abre una vista de ticket de 58 mm y llama `window.print()`; sirve para PDF/AirPrint, no
  sustituye a la térmica.
- **RF-009-12**: EL SISTEMA ofrece `/printer-test` con conexión BLE/USB, ticket de prueba con
  acentos, QR y código de barras, y un log de bytes/errores.
- **RF-009-13**: LA COLA de impresión vive en Dexie v5 y sobrevive recargas; no se mezcla con el
  outbox de sincronización ni altera tickets.

## Contrato del ticket de impresión

```ts
interface PrintTicket {
  localFolio: number;
  clientOrderUuid: string;
  soldAtUtc: string;
  businessDate: string;
  paymentMethod: "cash" | "card" | "transfer";
  lines: PrintLine[];
  totalCents: number;
  status: "confirmed" | "voided";
  voidReason?: string | null;
}
```

- Se construye desde el `LocalTicket` guardado; nunca desde el catálogo vivo.
- Dinero en centavos enteros; kilos en gramos enteros.
- Fecha/hora en `America/Mexico_City`.
- Ancho útil 48 mm = 384 puntos = 32 caracteres con fuente A.
- Sin corte automático; 3 saltos de línea al final.

## Cola de impresión

| Estado | Significado | Reintento |
|---|---|---|
| `pending` | Esperando impresora o turno | Automático al conectar |
| `printing` | Enviándose | No |
| `printed` | La impresora aceptó el trabajo | No |
| `failed` | Falló antes de escribir | Manual |
| `uncertain` | Pudo salir parcial o completa | Solo confirmación manual |

- Un trabajo `uncertain` no se reintenta solo.
- La venta no espera la impresión.
- Reimprimir crea un trabajo nuevo; no reutiliza el `printed`.
- La cola guarda el modelo del ticket, no los bytes ESC/POS, para reencodear si cambia el
  codepage.

## Casos límite

- Navegador sin Web Bluetooth/WebUSB: solo fallback.
- Impresora SPP: no aparece en Web Bluetooth; mensaje claro.
- Usuario cancela el selector: se vuelve a “sin impresora”, sin error rojo.
- Impresora se apaga a media impresión: `uncertain`.
- Ticket anulado: se imprime con leyenda y no se confunde con una venta activa.
- Reimpresión repetida: trabajos separados; no se borra el historial.
- Recarga con trabajos pendientes: se conservan y se muestra el conteo.
- Codepage incorrecto: selector `auto`/`cp858` y prueba con acentos.

## Fuera de alcance

- iOS con Bluetooth/USB (no hay APIs).
- Impresión 80 mm, 4×6, TSPL, etiquetas adhesivas y corte automático.
- Backend, agente local, Raspberry Pi, RawBT o impresión en red.
- Logo/raster en el ticket; QR/código de barras solo en la página de prueba.
- Varias impresoras simultáneas.
- Incluir `printJobs` en el respaldo 011: la cola es efímera; el ticket se reimprime desde el
  historial.

## Criterios de finalización

1. En Chrome Android, una impresora BLE conecta desde un gesto e imprime un ticket con acentos.
2. Una impresora USB con OTG hace lo mismo por WebUSB, si el modelo lo permite.
3. Sin impresora, el ticket queda en cola y el fallback abre una vista de 58 mm.
4. La cola sobrevive recarga, muestra pendientes y no duplica un `printed`.
5. `/printer-test` permite diagnosticar BLE, USB, QR, código de barras y bytes.
6. `lint`, `typecheck`, `test`, `build`, `seed:check` e `images:check` pasan.
7. `specs/README.md` y `MEMORY.md` quedan actualizados.

## Decisiones ratificadas

- **D-009-01**: Android-first; iOS queda fuera del hardware y solo usa `window.print()`.
- **D-009-02**: se usan `@point-of-sale/webbluetooth-receipt-printer`,
  `@point-of-sale/webusb-receipt-printer` y `@point-of-sale/receipt-printer-encoder` (MIT).
- **D-009-03**: la cola vive en Dexie v5 (`printJobs`), sin tocar el outbox.
- **D-009-04**: no hay backend, agente ni servidor de impresión.
- **D-009-05**: un trabajo `uncertain` no se reintenta automáticamente.
- **D-009-06**: el ticket se reimprime desde el snapshot guardado, no desde el catálogo.
