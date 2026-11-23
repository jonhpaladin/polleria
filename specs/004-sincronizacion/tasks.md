# Tareas — Spec 004 · Sincronización e idempotencia

Cada tarea se marca `[x]` solo con la puerta de calidad en verde (constitución, sección 5).

- [x] **T-004-01 · Modelo y migración de ventas**
  Crear `Sale` y `SaleLine` en `backend/app/models/sale.py` y la migración `0002_sales` con
  checks de unidad, método de pago, cantidades y precios.
  Hecho cuando `alembic upgrade head` crea ambas tablas y `ruff` pasa.
  RF: RF-004-08

- [x] **T-004-02 · Esquemas y validación del contrato**
  `SyncTicketIn`, `SyncLineIn` y `SyncOut` con dinero string, fechas con zona, día de negocio
  en `America/Mexico_City` e importes recalculados.
  Hecho cuando los tests rechazan dinero numérico, kilo sin gramos y total inconsistente.
  RF: RF-004-07

- [x] **T-004-03 · Repositorio idempotente**
  `SqlSaleRepository.record()` con `ON CONFLICT DO NOTHING`, líneas en la misma transacción
  y respuesta `created`/`duplicate`.
  Hecho cuando enviar dos veces el mismo UUID deja una venta y sus líneas.
  RF: RF-004-06, RF-004-08

- [x] **T-004-04 · Endpoint `POST /sync` y CORS**
  Router con `201` para creado y `200` para duplicado; `main.py` habilita `POST`.
  Hecho cuando `test_sync.py` cubre 201, 200, 422 y campos extra.
  RF: RF-004-06, RF-004-07

- [x] **T-004-05 · Prueba de integración con PostgreSQL**
  Marcar `integration`: dos envíos, conteo de filas y líneas, y ausencia de duplicados.
  Hecho cuando pasa con `TEST_DATABASE_URL` y se omite sin ella.
  RF: RF-004-06

- [x] **T-004-06 · Dexie v3 y tipos del outbox**
  Agregar `attempts`, `nextAttemptAt`, `lastError` y `status: pending | failed`; índice
  `nextAttemptAt`; conservar registros existentes.
  Hecho cuando un outbox de 002 sin campos nuevos sigue drenándose.
  RF: RF-004-09

- [x] **T-004-07 · Cliente HTTP y política de reintentos**
  `syncApi.ts` con timeout de 10 s y error tipado; `syncPolicy.ts` con 4xx terminal,
  5xx/408/429 reintentable y backoff exponencial con jitter y tope de 5 min.
  Hecho cuando los tests cubren clasificación y topes del backoff.
  RF: RF-004-03, RF-004-04

- [x] **T-004-08 · Motor de drenado**
  `outboxRepository.ts` y `syncEngine.ts`: pendientes vencidos en orden, borrado al
  confirmar, `failed` sin frenar la cola y reintento manual.
  Hecho cuando los tests simulan red caída, 422 y duplicado sin relojes reales.
  RF: RF-004-01…05

- [x] **T-004-09 · Hook y aviso de la UI**
  `useSync` con disparadores (montaje, `online`, 30 s, cobro) y `SyncBadge` con pendientes,
  fallidos y botón «Reintentar»; `useSale` avisa al confirmar.
  Hecho cuando la UI refleja el estado y el botón devuelve los fallidos a la cola.
  RF: RF-004-01, RF-004-05

- [x] **T-004-10 · Tests de frontend**
  Cubrir motor, repositorio, hook, badge y compatibilidad del registro legado.
  Hecho cuando `npm run test` pasa con los casos nuevos.
  RF: RF-004-01…05, RF-004-09

- [x] **T-004-11 · Verificación manual del flujo offline**
  Cobrar en modo avión, reconectar y ver el outbox vaciarse; forzar un 422 y comprobar el
  estado fallido y el reintento manual. Contra la API desplegada, ejecutar
  `backend/scripts/smoke_sync.py <url>` y borrar la venta de prueba por su UUID.
  Hecho cuando el guion queda registrado en el plan o en `MEMORY.md`.
  RF: todos

- [x] **T-004-12 · Cierre documental**
  Actualizar `MEMORY.md`, `specs/README.md` y las decisiones de producto.
  Hecho cuando la hoja de ruta marca 004 cerrada y 003 sigue pospuesta.
  RF: —
