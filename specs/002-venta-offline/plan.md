# Plan 002 — Venta offline y ticket local

- Spec: `specs/002-venta-offline/spec.md`
- Constitución: `docs/constitution.md` v1.0
- Estado: aprobado para implementación; autorización del precio manual pendiente
- Dependencia: Spec 001 cerrada

## 1. Estructura de archivos prevista

| Archivo | Responsabilidad | RF |
|---|---|---|
| `frontend/src/types/sale.ts` | Tipos de gramos, líneas, ticket, outbox y pago | RF-002-01…19 |
| `frontend/src/lib/weight.ts` | Validar gramos, atajos y formato visible | RF-002-02…04 |
| `frontend/src/lib/cart.ts` | Reducer y operaciones puras del carrito | RF-002-01…08 |
| `frontend/src/lib/payment.ts` | Métodos informativos y estado inicial efectivo | RF-002-09…10 |
| `frontend/src/lib/ticket.ts` | Validar, construir y convertir tickets | RF-002-06, 12, 16 |
| `frontend/src/lib/db.ts` | Migración Dexie v1 → v2 | RF-002-15 |
| `frontend/src/lib/ticketRepository.ts` | Persistir ticket + outbox en una transacción | RF-002-12…14 |
| `frontend/src/components/pos/Cart.tsx` | Panel táctil editable del carrito | RF-002-08 |
| `frontend/src/components/pos/CartLine.tsx` | Línea, unidad, precio, cantidad y quitar | RF-002-01…08 |
| `frontend/src/components/pos/WeightControls.tsx` | Atajos y ajustes de 250 g | RF-002-02…04 |
| `frontend/src/components/pos/PaymentSelector.tsx` | Segmentado efectivo/tarjeta/transferencia | RF-002-09…10 |
| `frontend/src/components/pos/ManualPriceDialog.tsx` | Captura y validación de precio manual | RF-002-06, 07 |
| `frontend/src/components/pos/CheckoutButton.tsx` | Candado, persistencia y confirmación | RF-002-11…18 |

No se crea `syncManager.ts`, no se agrega `POST /sync` y no se toca Alembic en 002.

## 2. Contratos internos

### Dinero y peso

Se reutilizan `Cents`, `parseMoneyToCents`, `assertCents`, `formatCents` y `sumCents`.
Se agrega una marca `Grams` y todas las funciones reciben enteros ya validados.

Funciones puras previstas:

| Función | Firma conceptual | Regla |
|---|---|---|
| `lineTotalCents` | `(unitPriceCents, unit, quantity, grams) => Cents` | redondeo final half-up para kg |
| `formatGrams` | `(grams: Grams) => string` | 250 → `0.250 kg`, sin división de negocio |
| `validateManualPrice` | `(raw: string) => Cents` | positivo, dos decimales, sin float |
| `calculateCartTotal` | `(lines) => Cents` | suma de importes guardados |
| `businessDate` | `(now: Date, timeZone: string) => string` | `formatToParts`, nunca `toISOString` |
| `buildTicket` | `(draft, now, localFolio) => LocalTicket` | snapshot inmutable |
| `toTicketWire` | `(ticket) => TicketWire` | dinero string, gramos enteros, snake_case |
| `validateTicket` | `(ticket) => Result` | total = suma y contrato válido |

Para kilos, el cálculo exacto de centavos se define con enteros y redondeo half-up una vez en
el límite. Los casos de prueba mínimos serán:

```text
150.00/kg × 1000 g = 15000 centavos
150.00/kg × 500 g  = 7500 centavos
99.99/kg × 250 g   = 2500 centavos
99.99/kg × 1 g     = 10 centavos
```

### Pago

```ts
type PaymentMethod = "cash" | "card" | "transfer";
```

No habrá `receivedCents`, `changeCents`, referencia bancaria ni pago mixto.

### Ticket y outbox

El ticket local será el snapshot inmutable de la venta. El outbox conservará el payload que
003 publicará sin volver a generar UUID ni recalcular totales. La clave será
`clientOrderUuid` y el payload tendrá `schemaVersion`.

## 3. Migración Dexie v1 → v2

Se conserva el bloque `version(1)` actual y se agrega `version(2)` sin cambiar las claves del
catálogo:

```text
categories: "id"
products: "id, &sku"
meta: "key"
tickets: "&clientOrderUuid, businessDate, soldAtUtc"
outbox: "&clientOrderUuid, enqueuedAt"
```

La migración no guarda carrito temporal, no borra datos y crea las nuevas tablas vacías. El
test abrirá una base v1 con catálogo, actualizará a v2 y verificará que el catálogo siga
intacto.

Si IndexedDB es de una versión futura, se conserva el comportamiento de degradación de 001:
se muestra la semilla en memoria, pero no se confirma una venta.

## 4. Flujo de confirmación local

```text
si carrito vacío o guardando:
  no permitir confirmar

al confirmar:
  congelar snapshot del carrito
  generar/reutilizar clientOrderUuid para este intento
  validar ticket y totales
  construir wire del outbox
  en una transacción:
    tickets.put(ticket)
    outbox.put({ clientOrderUuid, schemaVersion, payload, enqueuedAt })
  solo después de complete:
    limpiar carrito
    mostrar total, método y folio local

si falla la transacción:
  conservar carrito
  no mostrar éxito
  permitir reintento seguro
```

El UUID nace al iniciar el intento de cobro, no al agregar el primer producto. Una doble
pulsación durante la escritura no debe crear otra fila.

## 5. Frontera con la Spec 003

| 002 | 003 |
|---|---|
| Construye ticket y wire | Publica `POST /sync` |
| Escribe ticket y outbox | Backoff y reintentos |
| Deja `status: pending` en outbox | Idempotencia backend por UUID |
| No ejecuta `fetch` al cobrar | Marca enviado o dead letter |
| No borra outbox | Política de errores de sincronización |

Cualquier cambio posterior al payload requiere `schemaVersion` nueva y migración conforme a
P8.

## 6. Interfaz

- `ProductCard` se convertirá en un control interactivo semántico sin botones anidados.
- El carrito permanecerá visible y editable en 360 px.
- Peso: botones de 500/1000/1500/2000 g y ±250 g.
- Pago: control segmentado con efectivo seleccionado por defecto.
- Precio manual: control en español, error junto al campo y conserva lo tecleado si falla.
- Éxito: aviso no bloqueante, no modal de confirmación previa.
- Textos, etiquetas, errores y mensajes serán españoles; nombres de variables y funciones,
  ingleses.
- No se agregará store global, router ni dependencia de producción.

La autorización del precio manual será una tarea final condicionada a decisión del dueño. No se
implementará PIN ni roles antes de esa decisión.

## 7. Pruebas

- Unitarias: gramos, redondeo, líneas, totales, precio manual, métodos y día de negocio.
- Contrato: dinero como string, gramos enteros, `schemaVersion`, UUID y campos congelados.
- Migración: v1 con catálogo → v2 con catálogo intacto y tablas nuevas.
- Persistencia: ticket + outbox en una transacción; fallo conserva carrito.
- Doble acción: no duplica ticket ni outbox.
- Hook/componentes: selección, edición, quitar, pago y confirmación.
- Manual: celular/tablet con red apagada, targets de 48 px y medición de confirmación después
  de IndexedDB `complete`.

## 8. Dependencias

No se agrega dependencia de producción. Se reutilizan React, TypeScript, Dexie y Vitest ya
aprobados en 001.
