# Spec 002 — Venta offline y ticket local

- Estado: activa (aprobada 2026-11-12)
- Spec activa: sí
- Depende de: `specs/001-fundamentos-catalogo` y `docs/constitution.md` v1.0
- Fecha: 2026-11-12

## Contexto y objetivo

La Spec 001 dejó disponible el catálogo local-first. Esta iteración agrega la primera
operación de mostrador: armar una venta, elegir el precio, registrar el método de pago y
confirmar el ticket sin depender de la red.

La venta se confirma únicamente después de persistir el ticket local y su registro en el
outbox de IndexedDB. La sincronización HTTP, los reintentos y la idempotencia en el backend
pertenecen a la Spec 003.

## Usuarios / actores

- **Cajero/a de mostrador**: usa celular o tablet con manos ocupadas y necesita cobrar en
  pocos toques.
- **Dueño/encargado**: revisará después los métodos de pago y ventas en el dashboard.
- **Sistema local**: conserva tickets aun sin red y prepara el payload para sincronización.

## Historias de usuario

- **H1**: Como cajero quiero agregar productos a un carrito editable para preparar una venta.
- **H2**: Como cajero quiero vender por pieza o por kilo sin escribir kilos decimales.
- **H3**: Como cajero quiero seleccionar lista, promoción, mayoreo o un precio manual para
  reflejar el acuerdo de la venta.
- **H4**: Como cajero quiero registrar si el cliente pagó en efectivo, tarjeta o transferencia,
  con efectivo seleccionado por defecto, para que después aparezca en reportes.
- **H5**: Como cajero quiero confirmar la venta sin internet y recibir respuesta después de que
  el ticket quedó guardado localmente.
- **H6**: Como dueño quiero que una recarga o una falla de red no borre los tickets ya
  confirmados.

## Requisitos funcionales (criterios de aceptación en EARS)

- **RF-002-01**: CUANDO el cajero toca un producto por pieza, EL SISTEMA agrega una línea
  con cantidad 1 y el precio por defecto congelado.
- **RF-002-02**: CUANDO el cajero toca un producto por kilo, EL SISTEMA agrega una línea de
  1,000 gramos con el precio por defecto congelado.
- **RF-002-03**: MIENTRAS una línea por kilo está seleccionada, EL SISTEMA muestra atajos
  de 500, 1,000, 1,500 y 2,000 gramos y controles de ajuste de ±250 gramos.
- **RF-002-04**: SI un ajuste de peso queda fuera de 250 a 20,000 gramos, ENTONCES EL
  SISTEMA deshabilita ese control y conserva el peso anterior.
- **RF-002-05**: CUANDO el cajero elige un nivel de precio existente, EL SISTEMA congela ese
  precio en la línea y recalcula solo su importe.
- **RF-002-06**: CUANDO el cajero captura un precio manual válido, EL SISTEMA lo guarda como
  precio unitario de la línea y conserva también el precio de catálogo original.
- **RF-002-07**: SI el precio manual es cero, negativo, tiene más de dos decimales o no
  tiene formato monetario válido, ENTONCES EL SISTEMA no lo aplica y muestra un error en
  español junto al control.
- **RF-002-08**: EL SISTEMA muestra el carrito editable, el total en MXN y controles con
  área táctil mínima de 48 px desde 360 px de ancho.
- **RF-002-09**: EL SISTEMA ofrece exactamente los métodos informativos `cash`, `card` y
  `transfer`, con `cash` seleccionado al iniciar un carrito.
- **RF-002-10**: CUANDO el cajero cambia el método de pago, EL SISTEMA conserva las líneas
  y el total sin solicitar red ni mostrar campos bancarios.
- **RF-002-11**: MIENTRAS el carrito está vacío o se está guardando una venta, EL SISTEMA
  mantiene inactivo el control de confirmar.
- **RF-002-12**: CUANDO el cajero confirma una venta, EL SISTEMA genera un UUID v4, persiste
  el ticket y su payload de outbox en una transacción local y solo después muestra éxito.
- **RF-002-13**: SI IndexedDB falla, está bloqueada, llena o usa un esquema más nuevo,
  ENTONCES EL SISTEMA conserva el carrito, no muestra la venta como confirmada y muestra
  un error recuperable.
- **RF-002-14**: SI el cajero repite la acción de confirmar el mismo carrito mientras la
  escritura está en curso, EL SISTEMA no crea un segundo ticket ni un segundo outbox.
- **RF-002-15**: CUANDO se abre una base Dexie v1, EL SISTEMA conserva categorías, productos
  y metadatos, y crea las estructuras locales nuevas sin borrar datos.
- **RF-002-16**: CUANDO se confirma una venta, EL SISTEMA guarda el instante en UTC y el
  día de negocio calculado en `America/Mexico_City`.
- **RF-002-17**: EL SISTEMA no realiza `fetch`, espera HTTP, reintentos ni borrado de outbox
  durante la confirmación local.
- **RF-002-18**: CUANDO la confirmación termina, EL SISTEMA vacía el carrito, muestra un
  aviso no bloqueante con total, método y folio local, y permite iniciar otra venta.
- **RF-002-19**: EL SISTEMA no permite editar ni anular un ticket confirmado en esta spec.

La política de autorización para el precio manual queda como decisión tardía del dueño. Esta
spec define el modelo y la validación del precio, pero no introduce PIN, roles ni autenticación
multi-rol sin aprobación explícita.

## Contrato local del ticket

Los identificadores y nombres de código son ingleses; los textos de UI y errores son españoles.

```ts
type PaymentMethod = "cash" | "card" | "transfer";
type PriceSource = "lista" | "promocion" | "mayoreo" | "manual";

interface TicketLine {
  lineId: string;
  productId: string;
  sku: string;
  name: string;
  categoryName: string;
  unit: "piece" | "kg";
  quantity: number; // piezas enteras; 1 para kg
  grams: number | null; // entero; solo para kg
  priceSource: PriceSource;
  catalogUnitPriceCents: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

interface LocalTicket {
  schemaVersion: 1;
  clientOrderUuid: string;
  localFolio: number;
  soldAtUtc: string;
  businessDate: string;
  paymentMethod: PaymentMethod;
  lines: TicketLine[];
  totalCents: number;
  status: "confirmed";
  catalogUpdatedAt: string;
}
```

El outbox guarda el wire del ticket en la misma operación local:

- dinero como strings de dos decimales (`"185.00"`), nunca número JSON;
- peso como gramos enteros;
- claves `snake_case` para el payload futuro de 003;
- `client_order_uuid` inmutable;
- `schema_version` explícita;
- sin descuentos, propinas, redondeo ni cambio de efectivo.

## Reglas de negocio y cálculos

- Para `piece`, `quantity` es entero positivo.
- Para `kg`, cada línea inicia en 1,000 gramos y solo usa múltiplos de 250 gramos.
- El límite permitido es 250–20,000 gramos.
- El precio manual es unitario: por pieza o por kilogramo según la unidad del producto.
- El precio manual solo modifica un producto existente del catálogo; no crea productos libres.
- Las piezas del mismo producto con el mismo precio y origen pueden acumularse.
- Las líneas por kilo no se fusionan automáticamente.
- No hay pago mixto, monto recibido, cambio, folio bancario ni verificación externa.
- Un producto actualizado en el catálogo no repricia un carrito abierto.
- El día de negocio no se construye con `toISOString().slice(0, 10)` ni con
  `new Date("YYYY-MM-DD")`.

## Casos límite

- Carrito vacío.
- Cantidad o peso cero.
- Precio manual cero, negativo, con tres decimales o con formato inválido.
- Producto sin nivel de precio elegido.
- Catálogo actualizado mientras el carrito está abierto.
- Doble toque en confirmar.
- Recarga durante la persistencia.
- Error, bloqueo, cuota llena o versión futura de IndexedDB.
- Dos tickets creados rápidamente.
- Venta cerca de medianoche en `America/Mexico_City`.
- Error al guardar ticket y outbox: el carrito permanece intacto.

## Requisitos no funcionales

- **Local-first**: confirmar nunca espera la red.
- **Dinero y peso**: centavos enteros y gramos enteros en el frontend; sin `float` ni kilos
  decimales en cálculos.
- **Fechas**: instante UTC y día de negocio en `America/Mexico_City`.
- **Interfaz**: español, contraste alto, controles de 48 px, sin depender de hover.
- **Accesibilidad**: foco visible, nombres accesibles y `aria-live` para éxito/error.
- **Rendimiento**: medir manualmente desde confirmar hasta aviso después de `complete`; no
  afirmar 50 ms sin medirlo en un celular/tablet.
- **Mantenibilidad**: TypeScript estricto, identificadores en inglés, lógica pura separada.

## Fuera de alcance

Sincronización HTTP, `POST /sync`, backoff, dead letters, backend de ventas, impresión,
inventario, descuentos, propinas, redondeo, pago bancario, clientes, PIN, autenticación,
multi-caja, anulación con auditoría, folio global y reportes.

## Criterios de finalización

1. Todos los RF tienen test automatizado o guion manual explícito.
2. La migración Dexie v1 → v2 conserva catálogo y metadatos.
3. Ticket y outbox se escriben juntos y una doble confirmación no duplica.
4. `npm run lint`, `npm run typecheck` y `npm run test` pasan.
5. La UI se valida a 360 px y en un celular/tablet con red apagada.
6. Se mide el tiempo real de confirmación local en un dispositivo.
7. Se decide y documenta la política de autorización del precio manual antes de cerrar la
   tarea correspondiente.
8. `MEMORY.md` queda actualizado y la forma del ticket queda lista para 003.

## Decisiones ratificadas

- **D-002-01**: los métodos de pago son informativos; efectivo es el valor inicial.
- **D-002-02**: no hay descuentos, propinas ni redondeo en esta iteración.
- **D-002-03**: se mantienen los niveles de catálogo lista, promoción y mayoreo; se agrega
  precio manual por línea.
- **D-002-04**: el ticket confirmado es inmutable; anulación queda fuera de 002.
- **D-002-05**: el outbox se crea en 002 y se drena en 003.
- **D-002-06**: la política de autorización/PIN del precio manual queda pendiente y será una
  de las últimas tareas; no se inventan roles mientras el dueño no la defina.
