# Spec 004 — Sincronización e idempotencia

- Estado: cerrada por ratificación del dueño (2026-11-22)
- Spec activa: no
- Depende de: `specs/002-venta-offline` y `docs/constitution.md` v1.0
- Fecha: 2026-11-22

## Contexto y objetivo

La venta ya se confirma sin red y deja un ticket y su outbox en IndexedDB. Hoy ese outbox se
queda `pending` para siempre. Esta iteración lo drena en segundo plano contra `POST /sync`,
sin bloquear el cobro (P1), sin perder tickets (P8) y sin duplicar cobros (P4).

El catálogo sigue refrescándose por su propio canal (`GET /catalog`); `/sync` solo transporta
ventas. No hay autenticación multi-rol en esta spec.

La spec 003 (catálogo visual) queda pospuesta por consumo de contexto y por falta de las
imágenes aprobadas; no bloquea 004.

## Usuarios / actores

- **Cajero/a de mostrador**: cobra con o sin red y ve si quedan ventas por enviar.
- **Dueño/a**: consulta en el backend las ventas que el mostrador ya cobró.

## Requisitos funcionales (EARS)

- **RF-004-01**: CUANDO la app arranca, recupera conexión, confirma una venta o pasan 30 s con
  conexión, EL SISTEMA drena el outbox en segundo plano sin bloquear la interfaz.
- **RF-004-02**: EL SISTEMA envía un ticket por solicitud a `POST /sync`, en orden de
  `enqueuedAt`, y procesa como máximo 20 por pasada.
- **RF-004-03**: SI el envío falla por red, timeout, respuesta 5xx, 408 o 429, ENTONCES el
  ticket permanece `pending`, incrementa `attempts` y agenda `nextAttemptAt` con backoff
  exponencial (base 2 s, tope 5 min, jitter); no se pierde ni bloquea a los demás.
- **RF-004-04**: SI el backend rechaza el ticket con 400, 404, 409 o 422, ENTONCES el ticket
  pasa a `failed`, deja de reintentarse automáticamente y el resto de la cola continúa.
- **RF-004-05**: EL SISTEMA muestra cuántas ventas están pendientes o con error y permite
  reintentar manualmente las fallidas, que vuelven a `pending` con `attempts = 0`.
- **RF-004-06**: CUANDO llega un `client_order_uuid` ya registrado, EL BACKEND devuelve la
  venta existente con estado `duplicate` y no inserta líneas nuevas (idempotencia P4).
- **RF-004-07**: EL BACKEND valida versión, UUID, fechas con zona, día de negocio en
  `America/Mexico_City`, unidad, peso, dinero como string de 2 decimales, importe de línea
  (`unit_price × quantity` o `unit_price × grams / 1000` con `ROUND_HALF_UP`) y
  `total = suma de líneas`.
- **RF-004-08**: EL BACKEND persiste la venta tal como llega, con snapshot de nombres,
  categoría y precios, sin FK a `products`.
- **RF-004-09**: EL SISTEMA conserva el payload del outbox y solo agrega campos locales de
  control (`attempts`, `nextAttemptAt`, `lastError`); `status` admite `pending` y `failed`.
  Dexie sube a v3 sin borrar lo pendiente.
- **RF-004-10**: EL SISTEMA mantiene el catálogo en `GET /catalog`; `/sync` no transporta
  catálogo.

## Casos límite

- Outbox vacío: no se hace ninguna solicitud.
- Primer ticket con 400 y segundo válido: el segundo se sincroniza igual.
- Timeout después de que el servidor guardó: el reintento recibe `duplicate` y el cliente
  borra el outbox sin duplicar.
- App cerrada a mitad de envío: el registro nunca queda en un estado "en vuelo" persistido;
  sigue `pending` y se reintenta al abrir.
- Arranque sin red: no se intenta enviar hasta recuperar conexión.
- Reloj local desfasado: el backoff usa instantes UTC, no el día de negocio.
- Ticket con producto retirado del catálogo: se acepta porque la venta guarda snapshot.

## Fuera de alcance

- Resolución de conflictos de catálogo, multi-sucursal y sincronización bidireccional.
- Autenticación, roles o PIN (spec 008).
- Edición, anulación o reimpresión de tickets sincronizados.
- Publicación de precios del día a otros dispositivos (006).

## Decisiones

- **D-004-01**: un 4xx de validación es terminal (`failed`) con reintento manual; no se
  reintenta para siempre. Aprobado por el dueño el 2026-11-22.
- **D-004-02**: el backend guarda el ticket como snapshot, sin revalidar contra el catálogo y
  sin FK a `products`. Aprobado el 2026-11-22.
- **D-004-03**: `/sync` solo ventas; el catálogo sigue por `GET /catalog`. Aprobado el
  2026-11-22.
- **D-004-04**: una solicitud por ticket; el lote se resuelve del lado del cliente. Simple,
  idempotente y fácil de reintentar.
- **D-004-05**: al confirmar el backend, el registro se borra del outbox; el ticket local se
  conserva en `tickets`.
- **D-004-06**: `/sync` queda sin autenticación en esta spec; la auth multi-rol se decide en
  la 008.

## Criterios de aceptación

1. Un ticket cobrado sin red se sincroniza solo al volver la conexión y desaparece del outbox.
2. Reenviar el mismo `client_order_uuid` devuelve `duplicate` y no duplica filas.
3. Un 422 deja el ticket en `failed`, visible en la UI, y no frena a los demás.
4. Reintentar un fallido lo devuelve a la cola y, si el dato ya es válido, se sincroniza.
5. `npm run lint`, `typecheck`, `test`, `build`, `seed:check`, `pytest` y `ruff` en verde.
