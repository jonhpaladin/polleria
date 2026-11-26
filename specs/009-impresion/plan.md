# Plan 009 — Impresión térmica desde la PWA

- Spec: `specs/009-impresion/spec.md`
- Constitución: `docs/constitution.md` v1.0
- Estado: cerrado por ratificación del dueño (2026-11-26); verificación física de campo pendiente
- Dependencias: 002, 005, 012, 013 cerradas; `docs/impresoras-009.md` como investigación

## 1. Arquitectura

```text
Venta / Historial
      │
      ▼
PrintTicketButton ──► usePrinter ──► PrinterService (singleton)
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              BleAdapter      UsbAdapter     BrowserPrintAdapter
                    │              │              │
              Web Bluetooth     WebUSB       iframe + window.print
                    │              │
                    └──────► ESC/POS ◄── ReceiptPrinterEncoder
                                   │
                                   ▼
                             PrintQueue (Dexie v5)
```

La UI no conoce bytes ni librerías: pide `printTicket(ticket)` y observa el estado. Los
adaptadores se pueden sustituir mañana por red, RawBT o un agente sin tocar la venta.

## 2. Archivos

| Archivo | Responsabilidad | RF |
|---|---|---|
| `src/types/print.ts` | `PrintTicket`, `PrintJob`, estados y dispositivos | 05, 07, 09 |
| `src/printer/point-of-sale.d.ts` | Tipos de las librerías sin `.d.ts` | 01, 02 |
| `src/printer/ticket.ts` | `toPrintTicket`, formato de fecha, líneas de 32 columnas | 05, 06, 08 |
| `src/printer/encoder.ts` | `buildTicketBytes`, `buildDiagnosticTicket` | 05, 12 |
| `src/printer/adapters/ble.ts` | Web Bluetooth BLE | 01, 03, 04 |
| `src/printer/adapters/usb.ts` | WebUSB | 02, 03, 04 |
| `src/printer/browserPrint.ts` | iframe 58 mm + `window.print()` | 11 |
| `src/printer/queue.ts` | CRUD y estados de `printJobs` | 07, 09, 13 |
| `src/printer/PrinterService.ts` | conexión, reconexión, cola y drenaje | 01…10 |
| `src/hooks/usePrinter.ts` | estado reactivo y acciones | 10 |
| `src/components/printer/PrinterBadge.tsx` | indicador en cabecera | 10 |
| `src/components/printer/PrinterDialog.tsx` | conectar, probar, codepage y pendientes | 01…10 |
| `src/components/printer/PrintTicketButton.tsx` | botón reutilizable | 07, 08 |
| `src/pages/PrinterTestPage.tsx` | diagnóstico `/printer-test` | 12 |
| `src/lib/db.ts` | Dexie v5 y tabla `printJobs` | 07, 13 |
| `src/hooks/useSale.ts` | expone `lastTicket` | 07 |
| `src/components/pos/Cart.tsx` | botón “Imprimir ticket” | 07 |
| `src/components/pos/HistoryTab.tsx` | botón “Reimprimir” | 08 |
| `src/App.tsx` | cablea impresora, venta, historial y cabecera | 07, 08, 10 |

## 3. Cola

```ts
interface PrintJob {
  id?: number;
  clientOrderUuid: string;
  createdAt: string;
  status: "pending" | "printing" | "printed" | "failed" | "uncertain";
  attempts: number;
  lastError: string | null;
  ticket: PrintTicket;
  printedAtUtc: string | null;
  reason: "sale" | "reprint" | "test";
}
```

- Índices: `++id, status, createdAt, clientOrderUuid`.
- `enqueue` deduplica solo la impresión automática de venta; “Reimprimir” crea otro trabajo.
- `claimNext` toma el `pending` más viejo y lo pasa a `printing`.
- `printed` es terminal; `uncertain` requiere confirmación del cajero.
- El conteo se lee al abrir y después de cada cambio.

## 4. Codepage y formato

- Se usa `columns: 32`, `language: "esc-pos"` y `codepageMapping` del evento `connected`.
- Si el usuario elige `cp858`, se pasa como candidato explícito y se conserva la selección.
- La fecha se formatea con `Intl.DateTimeFormat("es-MX", { timeZone: APP_TIME_ZONE })`.
- Las líneas usan un helper de dos columnas; los nombres largos se recortan con `...`, nunca
  empujan el importe fuera de los 32 caracteres.
- El total va en negrita y doble altura; al final 3 saltos, sin `cut()`.

## 5. Conexión y reconexión

- `connect()` solo se llama desde un click; el servicio no conecta al cargar.
- El evento `connected` guarda `{type, id/serial, name, language, codepageMapping}` en
  `localStorage`.
- `initialize()` intenta `reconnect` al abrir; si el navegador no lo permite, deja el botón.
- `disconnected` limpia el adaptador; si había un trabajo en `printing`, lo marca `uncertain`.
- Los adaptadores BLE/USB envuelven las librerías y traducen sus eventos a una interfaz común.

## 6. UI

- **Cabecera**: `PrinterBadge` con estado y pendientes; abre el diálogo.
- **Diálogo**: conectar BLE/USB, reconectar, desconectar, probar, codepage y cola.
- **Carrito**: al confirmar, `useSale` expone `lastTicket`; aparece “Imprimir ticket”.
- **Historial**: “Reimprimir” en el detalle de cada ticket; usa el snapshot.
- **`/printer-test`**: página de desarrollo con feature detection, botones, log y ticket de
  prueba con QR/código de barras. No aparece en la navegación normal.

## 7. Pruebas

- Encoder: bytes no vacíos, 32 columnas, acentos/ñ, total, anulado, QR/código de barras.
- Cola: enqueue/dedupe, claim, printed, uncertain, pending count, supervivencia v4→v5.
- Servicio: conectar, imprimir, desconexión a media impresión, reintento manual.
- UI: botón de venta, reimpresión, estados y feature detection con jsdom.
- Manual: Chrome Android + BLE; USB OTG; `window.print()` en Android/iOS.

## 8. Riesgos

- Las impresoras baratas pueden ser SPP y no aparecer en Web Bluetooth.
- WebUSB solo ve modelos con vendor ID conocido o el filtro elegido; hay que probar el modelo.
- `reconnect()` puede estar detrás de una bandera del navegador; se trata como mejor esfuerzo.
- La impresión térmica no es idempotente; `uncertain` es obligatorio.
- No hay hardware en CI; la validación física queda documentada como manual.
