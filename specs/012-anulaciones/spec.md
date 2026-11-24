# Spec 012 — Anulación de tickets con auditoría

- Estado: cerrada por ratificación del dueño (2026-11-23); implementada, desplegada y validada.
- Spec activa: no
- Depende de: `specs/002-venta-offline`, `specs/004-sincronizacion`, `specs/006-corte-reportes`
- Fecha: 2026-11-23

## Contexto y objetivo

Hoy un ticket cobrado por error no se puede corregir: queda en el corte, en el reporte local y
en Supabase. Esta iteración permite **anular un ticket completo del día en curso**, con motivo,
autorización del dueño por PIN y registro de quién y cuándo. La venta anulada deja de contar en
el corte y se sincroniza como anulada al backend.

La venta original no se borra: conserva su snapshot y queda marcada como anulada para auditoría.
La anulación funciona sin red; si no hay conexión, queda pendiente y se reintenta sola.

## Requisitos funcionales

- **RF-012-01**: LA PESTAÑA Corte lista las ventas del día con folio, hora, total, método de pago
  y estado, y permite anular las que están confirmadas.
- **RF-012-02**: PARA ANULAR, el usuario elige un motivo (cobro incorrecto, cliente canceló,
  producto equivocado u otro con detalle), captura el PIN del dueño y confirma; la acción es
  irreversible.
- **RF-012-03**: EL PIN es de 4 a 6 dígitos, se configura desde el engrane de administración, se
  guarda como hash con sal en el dispositivo y nunca se envía a la API. Tras 5 intentos fallidos
  se bloquea un minuto.
- **RF-012-04**: SI NO hay PIN configurado, la app no permite anular y explica cómo configurarlo.
- **RF-012-05**: AL ANULAR, el ticket local cambia a `voided`, conserva su snapshot, guarda
  `voidedAtUtc`, `voidReason` y `voidPending`, y elimina su registro del outbox para que la venta
  no se envíe como cobro.
- **RF-012-06**: LA ANULACIÓN se sincroniza con `POST /sales/{uuid}/void` usando la clave del
  local; el backend marca la venta como anulada de forma idempotente. Un `404` significa que la
  venta nunca llegó y la anulación local se da por completa.
- **RF-012-07**: SI LA API falla o no hay red, la anulación queda pendiente y se reintenta en cada
  ciclo del sincronizador; el ticket muestra el error y no se pierde.
- **RF-012-08**: LOS REPORTES local y remoto excluyen los tickets anulados de totales, métodos,
  productos, categorías, ticket promedio y corte de caja.
- **RF-012-09**: EL CORTE muestra un apartado de ventas anuladas con folio, total, motivo, hora y
  estado de sincronización; no se mezclan con las ventas activas.
- **RF-012-10**: SI se anula una venta después de cerrar caja, el corte avisa que cambió y ofrece
  recalcul ar; no se borra el corte anterior.
- **RF-012-11**: LA ANULACIÓN solo aplica al día de negocio en curso; días anteriores quedan para
  el historial (013).
- **RF-012-12**: LA LISTA y el diálogo conservan áreas táctiles de 48 px y se usan a 360 px.

## Modelo local

`LocalTicket` agrega:

| Campo | Tipo | Uso |
|---|---|---|
| `status` | `"confirmed" \| "voided"` | Filtro de reportes y corte |
| `voidedAtUtc` | string opcional | Instante de la anulación |
| `voidReason` | string opcional | Motivo capturado |
| `voidPending` | boolean opcional | Falta confirmar en el backend |
| `voidLastError` | string opcional | Último error de sincronización |

No hay cambio de versión de Dexie: los campos nuevos son opcionales y los tickets viejos se leen
como confirmados.

## Contrato del backend

### `POST /sales/{client_order_uuid}/void` (requiere `X-Device-Key`)

```json
{ "reason": "Cobro incorrecto" }
```

- `200`: `{ "client_order_uuid": "...", "status": "voided", "voided_at_utc": "..." }`
- Si ya estaba anulada, devuelve `200` con la fecha original (idempotente).
- `404` si la venta no existe.
- `422` si el motivo no tiene entre 3 y 200 caracteres.

### Persistencia

- Migración `0004_sales_void`: `voided_at_utc` y `void_reason` en `sales`, ambos nulos o ambos
  presentes.
- `GET /reports/daily` excluye las ventas anuladas.

## Casos límite

- Venta nunca sincronizada: se borra del outbox, se anula local y el `404` del backend cierra la
  anulación pendiente.
- Venta sincronizada: el backend marca la venta; ambos reportes la excluyen.
- Venta anulada dos veces: la segunda no cambia nada y no duplica.
- PIN incorrecto: no se anula; se cuentan los intentos y se bloquea al quinto.
- PIN no configurado: la acción queda deshabilitada.
- Sin red: la anulación local es inmediata; la sincronización reintenta.
- Anulación después del corte: el corte avisa y se puede recalcular.
- Ticket de un día anterior: no aparece en la lista; se resolverá en 013.
- Dispositivo sin `crypto.subtle` (contexto no seguro): no se puede configurar el PIN; se avisa.

## Fuera de alcance

- Devoluciones parciales por línea o monto.
- Anular tickets de días anteriores o buscar en el historial (013).
- Reembolso procesado por el sistema; el efectivo se devuelve físicamente.
- Borrar tickets o líneas.
- Roles múltiples y auditoría con nombre de usuario (010).
- Facturación o notas de crédito.

## Decisiones

- **D-012-01**: anulación del ticket completo, no parcial. Aprobado el 2026-11-23.
- **D-012-02**: PIN local de 4-6 dígitos configurado por el dueño; hash con sal y bloqueo tras 5
  intentos. Aprobado el 2026-11-23.
- **D-012-03**: solo tickets del día de negocio en curso. Aprobado el 2026-11-23.
- **D-012-04**: la venta se conserva con estado anulado; no se borra. Aprobado el 2026-11-23.
- **D-012-05**: la anulación se sincroniza con la clave del local; sin clave configurada en el
  servidor, el endpoint sigue abierto como el resto de `/sync`.
- **D-012-06**: el PIN es una barrera de mostrador, no autenticación criptográfica: quien controle
  el dispositivo y su almacenamiento puede eludirlo. La protección real de la API es la clave del
  local.

## Criterios de aceptación

1. Se anula un ticket del día con motivo y PIN; desaparece de los totales y aparece en anulados.
2. El ticket conserva folio, líneas y total originales para auditoría.
3. La venta sincronizada queda anulada en el backend y la conciliación sigue cuadrando.
4. Una venta pendiente de sincronizar se anula sin llegar al backend.
5. Sin red, la anulación es local y se sincroniza al reconectar.
6. PIN incorrecto no anula; cinco intentos bloquean un minuto.
7. `lint`, `typecheck`, `test`, `build`, `seed:check`, `pytest` y `ruff` en verde.
