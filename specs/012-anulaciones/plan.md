# Plan — Spec 012 · Anulación de tickets

## Flujo

```text
Corte del día ──► lista de tickets ──► «Anular» ──► motivo + PIN
                                                     │
                                                     ▼
                                        voidTicket (transacción)
                                         │                  │
                              ticket.voided         outbox.delete
                                         │
                                         ▼
                              voidPending = true
                                         │
                         drainVoids ──► POST /sales/{uuid}/void
                                         │
                        200/404 ──► voidPending = false
                        error/red ──► queda pendiente y reintenta
```

## Local

| Archivo | Contenido |
|---|---|
| `types/sale.ts` | `status: "confirmed" \| "voided"` y campos de anulación |
| `lib/voidPin.ts` | Hash PBKDF2 con sal, formato y bloqueo de intentos |
| `lib/ticketRepository.ts` | `voidTicket`: estado, motivo, outbox y `voidPending` |
| `lib/syncApi.ts` | `postVoid` con `X-Device-Key`; `404` como no-op |
| `lib/voidEngine.ts` | Drena anulaciones pendientes y guarda el último error |
| `lib/syncPolicy.ts` | Reutiliza `isAuthError` para el 401/403 |
| `lib/reports.ts` | Excluye tickets anulados de todos los totales |
| `hooks/useSync.ts` | Drena anulaciones antes del outbox y expone `authRequired` |
| `hooks/useReports.ts` | Expone los tickets del día y `voidSale` |
| `components/pos/ReportsTab.tsx` | Lista de ventas y apartado de anuladas |
| `components/pos/VoidTicketDialog.tsx` | Motivo, PIN y confirmación |
| `components/pos/AdminDialog.tsx` | Configuración del PIN de anulaciones |

## Backend

| Archivo | Contenido |
|---|---|
| `models/sale.py` | `voided_at_utc` y `void_reason` |
| `alembic/versions/0004_sales_void.py` | Columnas y restricción de motivo |
| `schemas/sales.py` | `VoidSaleIn` y `VoidSaleOut` |
| `repositories/sales.py` | `void()` idempotente |
| `routers/sales.py` | `POST /sales/{uuid}/void` con clave del local |
| `repositories/reports.py` | Excluye ventas anuladas de la consulta |
| `main.py` | Registra el router |

## Reglas de dinero y reportes

- La anulación no modifica `total`, líneas ni precios del ticket.
- `buildDailyReport` filtra `status !== "voided"` antes de sumar.
- `hasNewSales` detecta cualquier cambio de total o conteo; el texto del aviso pasa a «cambió el
  corte» para cubrir altas y anulaciones.
- El backend filtra `voided_at_utc IS NULL`; la conciliación compara solo ventas activas.

## Seguridad

- El PIN nunca se envía; se deriva con PBKDF2-SHA256 (100 000 iteraciones) y una sal aleatoria.
- La anulación local exige PIN aunque la API esté caída.
- El endpoint usa `X-Device-Key`; un `401` deja la anulación pendiente y avisa en la UI.
- El PIN se configura solo después de entrar al engrane con la clave de administración.

## Pruebas

- Backend: endpoint protegido, `404`, idempotencia y reporte sin anuladas.
- Frontend: `voidTicket`, filtro de reportes, `postVoid`, drenaje, PIN y diálogo.
- Integración: migración 0004, venta anulada y reporte en cero si es la única.
