# Plan — Spec 004 · Sincronización e idempotencia

## Arquitectura

```text
Cobro (002)                     Sincronizador (004)                 Backend
──────────────                  ───────────────────                 ───────
persistTicket()  ──► outbox ──► drainOutbox() ──► POST /sync ──► sales
(ticket + outbox)   pending      backoff / 4xx      venta        sale_lines
                                     │
                                     └── useSync() ──► SyncBadge
```

- El cobro no cambia: `persistTicket` sigue escribiendo ticket + outbox en una transacción.
- El sincronizador lee el outbox, envía un ticket por solicitud y actualiza el registro.
- El backend inserta la venta y sus líneas; el UUID único resuelve la idempotencia.

## Contrato `POST /sync`

Solicitud (el `payload` que ya guarda el outbox, sin cambios):

```json
{
  "schema_version": 1,
  "client_order_uuid": "9f1c…",
  "sold_at_utc": "2026-11-14T18:30:00Z",
  "business_date": "2026-11-14",
  "payment_method": "cash",
  "lines": [
    {
      "line_id": "…",
      "product_id": "prd-pollo-asado",
      "sku": "POLLO-ASADO",
      "name": "Pollo asado",
      "category_name": "Pollo fresco",
      "unit": "piece",
      "quantity": 2,
      "grams": null,
      "price_source": "lista",
      "catalog_unit_price": "220.00",
      "unit_price": "220.00",
      "line_total": "440.00"
    }
  ],
  "total": "440.00",
  "catalog_updated_at": "2026-11-11T18:04:00Z"
}
```

Respuesta:

```json
{
  "client_order_uuid": "9f1c…",
  "status": "created",
  "received_at": "2026-11-14T18:30:04Z"
}
```

- `201 created` la primera vez; `200 duplicate` si el UUID ya existe.
- `422` si el payload no cumple el contrato. El cliente lo trata como terminal.

## Backend

| Archivo | Contenido |
|---|---|
| `app/models/sale.py` | `Sale` (UUID PK) y `SaleLine` (FK interna, snapshot de producto) |
| `app/schemas/sync.py` | `SyncTicketIn`, `SyncLineIn`, `SyncOut` y validación de dinero |
| `app/repositories/sales.py` | `SqlSaleRepository.record()` con `ON CONFLICT DO NOTHING` |
| `app/routers/sync.py` | `POST /sync` con `201`/`200` |
| `alembic/versions/0002_sales.py` | Tablas `sales` y `sale_lines` |
| `app/main.py` | Registra el router y habilita `POST` en CORS |

Reglas de validación (todas con test):

1. `schema_version == 1`; `client_order_uuid` UUID; fechas con zona.
2. `business_date` igual al día de `sold_at_utc` en `America/Mexico_City`.
3. `payment_method` en `cash | card | transfer`; `unit` en `piece | kg`.
4. Dinero como string `^\d{1,8}\.\d{2}$`; se rechaza `float`/número JSON.
5. `quantity` entero ≥ 1; `grams` entero ≥ 1 solo en líneas por kilo y con `quantity == 1`.
6. `line_total` recalculado: pieza `unit_price × quantity`; kilo
   `(unit_price × grams / 1000)` con `ROUND_HALF_UP` a 2 decimales.
7. `total` igual a la suma de `line_total`.

En Windows sin la base IANA, `business_timezone()` cae al offset fijo UTC-6 (México
abolió el horario de verano en 2022); en Linux usa `ZoneInfo` con la constante única.

`record()` inserta la venta con `on_conflict_do_nothing` + `returning(received_at)`. Si no
devuelve fila, la venta existe: se responde `duplicate` sin insertar líneas. Ventas y líneas
se confirman en una sola transacción.

## Frontend

| Archivo | Contenido |
|---|---|
| `src/lib/syncApi.ts` | `postTicket()` con timeout de 10 s y `SyncApiError` tipado |
| `src/lib/syncPolicy.ts` | `isPermanentSyncError()`, `backoffDelayMs()` |
| `src/lib/outboxRepository.ts` | Contadores, pendientes vencidos, marcar/borrar/reintentar |
| `src/lib/syncEngine.ts` | `drainOutbox()` y `retryFailedOutbox()` |
| `src/hooks/useSync.ts` | Orquestación, disparadores y estado para la UI |
| `src/components/pos/SyncBadge.tsx` | Pendientes, fallidos y botón «Reintentar» |
| `src/lib/db.ts` | Dexie v3 con índice `nextAttemptAt` (sin borrar datos) |
| `src/types/sale.ts` | `OutboxStatus` y campos de control |
| `src/hooks/useSale.ts` | Aviso `onTicketSaved` al confirmar el cobro |

Funciones puras (P6):

```ts
export function isPermanentSyncError(error: unknown): boolean;
export function backoffDelayMs(attempt: number, random?: () => number): number;
export function readOutboxCounts(db: PolleriaDb): Promise<{ pending: number; failed: number }>;
export function listDuePending(db: PolleriaDb, nowIso: string, limit: number): Promise<OutboxRecord[]>;
export function drainOutbox(options: DrainOptions): Promise<DrainSummary>;
export function retryFailedOutbox(db: PolleriaDb): Promise<number>;
```

`drainOutbox` recibe `db`, `post`, `now` y `random` por parámetro: los tests no usan relojes
ni temporizadores reales.

### Estados del outbox

| Estado | Significado | Reintento |
|---|---|---|
| `pending` | En cola o esperando `nextAttemptAt` | automático |
| `failed` | Rechazo definitivo o reincidente manual | manual |

- Al confirmar el envío se **borra** el registro; el ticket local permanece.
- No se persiste un estado «en vuelo»: si la app muere a mitad, el registro sigue `pending`.
- `attempts`, `nextAttemptAt` y `lastError` son campos locales; el `payload` no cambia.

### Disparadores

1. Montaje de la app.
2. Evento `online`.
3. Cada 30 s mientras haya conexión (cubre `visibilitychange` sin listeners extra).
4. Después de cada cobro (`onTicketSaved` → `nudge`).
5. Botón «Reintentar» de `SyncBadge` para los `failed`.

## Migración Dexie v3

```ts
this.version(3).stores({
  categories: "id, sortOrder",
  products: "id, &sku, categoryId",
  meta: "key",
  dailyPrices: "&id, businessDate, productId",
  tickets: "&clientOrderUuid, businessDate, soldAtUtc",
  outbox: "&clientOrderUuid, status, enqueuedAt, nextAttemptAt",
});
```

Solo agrega un índice: Dexie conserva las filas existentes. Los registros viejos sin
`attempts` se leen con `attempts ?? 0`, así que un ticket pendiente de 002 sigue drenándose.

## Tests

| Requisito | Test |
|---|---|
| RF-004-01/02 | `syncEngine.test.ts`: drena en orden y respeta el lote |
| RF-004-03 | `syncEngine.test.ts` + `syncPolicy.test.ts`: backoff, reintento, sin pérdida |
| RF-004-04 | `syncEngine.test.ts`: 422 → `failed` y la cola continúa |
| RF-004-05 | `SyncBadge.test.tsx` + `useSync.test.tsx` + `outboxRepository.test.ts` |
| RF-004-06 | `test_sync.py`: 201/200 y una sola venta; integración con UUID real |
| RF-004-07 | `test_sync.py`: día de negocio, kilo, dinero, total, extra |
| RF-004-08 | `test_sync.py` (repositorio fake) + integración (filas y líneas) |
| RF-004-09 | `db.test.ts` y `ticketRepository.test.ts`: campos nuevos y registro legado |
| RF-004-10 | Sin cambios en `useCatalog`; `/sync` no recibe catálogo |

## Orden de implementación

1. Backend: modelos, esquemas, repositorio, router, migración y CORS.
2. Tests de contrato e idempotencia del backend.
3. Frontend: tipos, Dexie v3, `syncApi`, `syncPolicy`, `outboxRepository`, `syncEngine`.
4. `useSync`, `SyncBadge`, cableado en `App` y aviso desde `useSale`.
5. Tests de frontend y puerta de calidad.
6. `MEMORY.md`, `AGENTS.md` si cambian comandos y `specs/README.md`.
