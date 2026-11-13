# Spec 001 — Fundaciones del proyecto y catálogo de mostrador

- Estado: cerrada por ratificación del dueño (2026-11-12)
- Spec activa: no
- Depende de: `docs/constitution.md` v1.0
- Fecha: 2026-11-11

## Contexto y objetivo

El repositorio está vacío: no hay andamiaje, ni comandos, ni tests. Sin una base
ejecutable no se puede escribir negocio ni verificar nada. Esta iteración crea el
esqueleto real (frontend PWA, backend FastAPI, PostgreSQL, toolchain de tests) y la primera
funcionalidad visible: un **catálogo de solo lectura**, navegable por categorías, con varios
niveles de precio (lista, promoción, mayoreo) y una unidad de venta por producto, que abre
sin red. Todavía no se cobra. El objetivo es que las specs siguientes (venta offline,
sincronización, cortes) se apoyen en contratos, comandos y convenciones ya validados en vez
de discutirlos a mitad de la venta.

## Usuarios / actores

- **Cajero/a de mostrador**: tablet o celular, manos ocupadas, horas pico.
- **Dueño/encargado**: laptop, revisa que el catálogo y los precios sean los correctos.
- **Desarrollador/agente**: arranca el proyecto, corre tests y extiende el sistema.

## Historias de usuario

- **H1**: Como desarrollador quiero un repo con frontend y backend arrancables y con tests
  verdes para construir la venta offline sin volver a discutir el toolchain.
- **H2**: Como cajero quiero ver el catálogo agrupado por categorías para encontrar un
  producto en segundos mientras atiendo.
- **H3**: Como cajero quiero ver si un producto se vende por pieza o por kilo y a qué
  precio para confirmar de viva voz lo que voy a cobrar.
- **H4**: Como dueño quiero cargar un catálogo semilla reproducible para probar la app sin
  capturar precios a mano.
- **H5**: Como cajero quiero abrir la app sin conexión y seguir viendo el catálogo para no
  quedarme mirando una pantalla de error.

## Requisitos funcionales (criterios de aceptación en EARS)

- **RF-1**: CUANDO se abre la app sin conexión y ya existe catálogo local, EL SISTEMA
  muestra el catálogo guardado y el indicador "sin conexión" en menos de 2 s.
- **RF-2**: CUANDO no existe catálogo local (primer arranque), EL SISTEMA carga el catálogo
  semilla incluido en el build, lo muestra y lo persiste en IndexedDB.
- **RF-3**: EL SISTEMA muestra por producto su nombre, categoría, unidad de venta
  (`pieza`/`kilo`) y precio por defecto formateado en MXN (`$185.00`), más el precio de
  promoción con distintivo cuando exista, en un área táctil de al menos 48 px.
- **RF-4**: CUANDO el cajero toca una categoría, EL SISTEMA muestra solo los productos de
  esa categoría; la opción "Todos" muestra el catálogo completo.
- **RF-5**: MIENTRAS no hay conexión con el backend, EL SISTEMA mantiene el catálogo local
  navegable y muestra el estado "sin conexión".
- **RF-6**: CUANDO la app arranca con red disponible, EL SISTEMA consulta `GET /catalog`
  sin bloquear la primera pintura; si responde, reemplaza el catálogo local de forma
  atómica.
- **RF-7**: SI la respuesta del backend no cumple el contrato (producto sin precios, sin
  precio por defecto o con dos precios del mismo nivel, nivel de precio desconocido, precio
  ≤ 0, dinero con más de 2 decimales, unidad desconocida, categoría inexistente, `id` o
  `sku` duplicados, JSON inválido), ENTONCES EL SISTEMA descarta la respuesta completa,
  conserva el catálogo local y registra el error.
- **RF-8**: SI el refresco termina cuando el cajero ya está navegando, ENTONCES EL SISTEMA
  aplica el nuevo catálogo sin recargar la página y conservando la categoría seleccionada.
- **RF-9**: EL SISTEMA representa y transporta dinero sin punto flotante: el contrato usa
  string decimal de 2 posiciones, el cliente opera con centavos enteros y el backend con
  `Decimal`; un precio numérico en el JSON se rechaza como payload inválido.
- **RF-10**: CUANDO se consulta `GET /health`, EL SISTEMA responde 200 con `status`,
  `version` y `database` (`ok` o `unreachable`), sin exponer cadenas de conexión.
- **RF-11**: CUANDO se consulta `GET /catalog`, EL SISTEMA devuelve categorías y productos
  activos con su lista de precios por nivel (`tier`, `price`, `is_default`), el
  `updated_at` del catálogo, dinero como string decimal de 2 posiciones, unidad
  `piece`/`kg`, ordenados por categoría y nombre.
- **RF-12**: CUANDO el operador ejecuta el comando de semilla, EL SISTEMA inserta o
  actualiza el catálogo semilla sin duplicar productos ni precios (idempotente por `sku` y
  por `product_id` + `tier`).
- **RF-13**: SI `GET /catalog` falla por 5xx, timeout mayor a 5 s o red caída, ENTONCES EL
  SISTEMA sigue mostrando el catálogo local y no presenta un error bloqueante.

## Requisitos no funcionales

- **Rendimiento**: primera pintura con catálogo local ≤ 2 s en tablet de gama media;
  300 productos navegables sin scroll entrecortado; el refresco nunca bloquea la
  interacción.
- **Uso táctil**: objetivos ≥ 48 px, contraste AA, texto legible a un metro, nada que
  dependa de `hover`, sin dobles toques accidentales.
- **Plataformas**: Chromium ≥ 120 en Android y Safari iOS ≥ 17; instalable como PWA;
  layout usable desde 360 px de ancho.
- **Seguridad**: secretos solo por variables de entorno; TLS hacia PostgreSQL; CORS
  limitado al origen configurado; `/health` no filtra detalles internos.
- **Accesibilidad**: foco visible, roles y etiquetas en controles, `aria-live` para el
  estado de conexión.
- **Idioma**: interfaz y mensajes en español; identificadores en inglés.
- **Mantenibilidad**: TypeScript `strict` sin `any` implícito; type hints en todo Python
  nuevo; funciones de dominio puras y testeables.

## Casos límite

- Catálogo vacío: estado vacío con mensaje, nunca pantalla en blanco.
- Categoría sin productos activos: se oculta de la barra de categorías.
- Producto sin precios, sin precio por defecto, con dos precios del mismo nivel, con nivel
  desconocido, con precio ≤ 0, con unidad desconocida o con categoría inexistente: invalida
  el payload completo (RF-7), no se descarta solo ese producto.
- `id` o `sku` duplicados: invalida el payload completo.
- Nombre de más de 60 caracteres: se trunca con elipsis sin romper la rejilla.
- IndexedDB bloqueada, cuota llena o no disponible: se usa la semilla en memoria y se
  registra el aviso; la pantalla sigue funcionando.
- Base local en una versión de esquema más nueva que el build (Dexie lanza `VersionError`):
  se conserva la copia y se pinta la semilla en memoria, sin degradar datos.
- Respuesta HTTP 200 con JSON truncado o campos faltantes: invalida el payload (RF-7).
- Backend lento o colgado: se aborta a los 5 s y no se muestra error bloqueante (RF-13).
- Reloj del dispositivo desfasado: no afecta a 001 porque no hay agrupación por día; aun
  así se prohíbe `toISOString()` para claves de día.

## Fuera de alcance

Carrito, cobro, tickets, outbox, sincronización, impresión, cortes de caja, reportes,
edición de precios desde la UI, autenticación, multi-sucursal, imágenes de producto,
búsqueda de texto, asignación de precios por cliente y desglose de impuestos.

## Criterios de finalización

1. Todos los RF tienen test automatizado o guion manual explícito. RF-2, RF-4, RF-5, RF-6,
   RF-7, RF-9, RF-10, RF-11, RF-12 y RF-13 se prueban con Vitest/Pytest; RF-1, RF-3 y RF-8
   añaden demo manual medida (apertura cronometrada, 48 px verificados en DevTools, refresco
   sin recarga).
2. `npm run lint`, `npm run typecheck` y `npm run test` verdes en `frontend/`;
   `python -m pytest` y `python -m ruff check .` verdes en `backend/`, desde un clon limpio.
3. Demo manual: instalar la PWA, apagar la red, reabrir y ver catálogo + badge "sin
   conexión"; encender la red y ver el refresco sin recargar ni perder la categoría.
4. Comandos reales documentados en `AGENTS.md`; `MEMORY.md` actualizado.

## Decisiones de clarificación (ratificadas 2026-11-11)

Sustituyen a los supuestos abiertos; si alguna cambia, se enmienda esta spec antes de
implementar.

- **D-1**: el catálogo guarda varios precios por producto con un nivel (`lista`,
  `promocion`, `mayoreo`) y **exactamente uno por defecto**. 001 muestra el precio por
  defecto y, si existe, el de promoción con distintivo; elegir nivel al cobrar y capturar
  un precio negociado pertenecen a 002; los precios ligados a un cliente, a 005.
- **D-2**: los precios son finales al público, con IVA incluido y sin desglose en el
  ticket.
- **D-3**: cada producto tiene una sola unidad de venta (`kg` para la mayoría, `piece` para
  promociones y combos); no se vende el mismo producto por pieza y por kilo.
- **D-4**: el catálogo de 001 vive en PostgreSQL real (Neon/Supabase dev); sin Docker
  local, los tests de integración se omiten cuando falta `TEST_DATABASE_URL`.
- **D-5**: el catálogo semilla es de ejemplo, marcado como tal y reemplazable por el dueño.
- **D-6**: `backend/app/seeds/catalog.json` es la única fuente de la semilla e incluye
  `updated_at` en UTC para la primera escritura local; el JSON que consume el frontend se
  genera con `npm run seed:sync` y CI falla si está desincronizado.
- **D-7**: dependencias aprobadas: el set completo de `plan.md` §6.

## Dudas abiertas

Ninguna bloquea 001. Las siguientes se resuelven en la spec que las usa:

- [NECESITA ACLARACIÓN] ¿Las promociones tienen vigencia por fecha/hora? (002; si aplica,
  se agregan `valid_from`/`valid_to` con migración aditiva).
- [NECESITA ACLARACIÓN] ¿Los precios negociados por cliente se ligan a un cliente
  registrado o se capturan al vuelo en cada venta? (002/005).
- [NECESITA ACLARACIÓN] ¿Quién puede autorizar un precio distinto al de lista: cualquier
  cajero o solo el encargado con PIN? (002/007).
- [NECESITA ACLARACIÓN] Credenciales de Neon/Supabase: acción humana, no se versionan.
