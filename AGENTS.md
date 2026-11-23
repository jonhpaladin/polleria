# AGENTS.md — Pollería el wero (POS táctil local-first)

Reglas permanentes del repo. Antes de escribir código lee `MEMORY.md` (estado vivo,
spec activa, próximos pasos) y la spec activa en `specs/NNN-*/spec.md`.
Gobierno SDD: `docs/constitution.md` (principios y puerta de calidad).
Nada se implementa fuera de la spec activa.

## Límites
- ✅ Siempre: dinero en centavos enteros (frontend) y `Decimal` con `ROUND_HALF_UP`
  (backend); peso en gramos enteros (frontend) y `NUMERIC(8,3)` (backend).
- ✅ Siempre: textos de UI, comentarios (el porqué, no el qué) y docs en español;
  type hints en todo Python nuevo.
- ✅ Siempre: usa variables y nombres relacionados a la funcion que tendran.
- ✅ Siempre: al terminar una tarea, correr la puerta de calidad (ver Comandos) y
  actualizar `MEMORY.md`.
- ✅ Siempre: Manten el codigo lo mas simple y funcional posible.
- ⚠️ Pregunta antes: añadir una dependencia de producción; tocar contratos de `/sync`;
  cambiar el esquema de Dexie o el payload del outbox; si falta una decisión de negocio
  (se enmienda la spec antes de codificar).
- 🚫 Nunca: `float`/`number` para dinero o kilos; `toISOString()` o
  `new Date("AAAA-MM-DD")` para claves de día; esperar la red para cobrar; editar a mano
  `.agents/skills/` o `skills-lock.json`; escribir credenciales, cadenas de conexión o
  datos personales en el repo (incluidos AGENTS y MEMORY).

## Forma de trabajar
- KISS/YAGNI: no añadas funciones no pedidas ni auth multi-rol/microservicios hasta que
  una spec lo pida.
- Cambios pequeños y enfocados; no reescribas lo que ya funciona.
- Al terminar, resume qué cambiaste y qué decisiones debe revisar el dueño.

## Stack y comandos
- Frontend PWA (`frontend/`: React + Vite + Tailwind + Dexie) y backend (`backend/`:
  FastAPI async + PostgreSQL + Alembic). CI en `.github/workflows/ci.yml`.
- Backend (`cd backend`; `.venv/Scripts/python.exe` en Windows, `.venv/bin/python` en
  macOS/Linux): `python -m pytest -q` y `python -m ruff check .`. La integración con
  PostgreSQL se omite sin `TEST_DATABASE_URL` (en CI sí corre).
- Frontend (`cd frontend`): `npm run test`, `lint`, `typecheck`, `build`, `seed:check`.
- Puerta de calidad = todo lo anterior en verde.
- `skills-lock.json` es el manifiesto del instalador de skills, no un lockfile npm: no
  ejecutes `npm install`/`npm ci` por su presencia.

## Skills locales (`.agents/skills/`)
- `supabase-postgres-best-practices`: cárgala antes de cualquier DDL, migración, índice,
  RLS o query en PostgreSQL.
- `ui-taste` y `web-design-guidelines`: cárgalas para construir o revisar UI del POS.
- `vercel-react-best-practices` y `vercel-react-native-skills` asumen Next.js / React
  Native; aquí es React + Vite + FastAPI, así que ignora RSC, `next/*`, Server Actions y
  patrones RN.
- `vercel-optimize`: no la cargues por defecto (no hay destino de despliegue definido).

## Reglas de dominio (no negociables)

### Dinero y peso
- Redondea solo en el límite (persistencia, totales finales, ticket), nunca en pasos
  intermedios. Nunca kilos en float en el frontend.
- Cada línea de un ticket guardado congela el precio vigente al cobrar; cambios
  posteriores en el catálogo no alteran tickets históricos ni pendientes de sync.

### Fechas y cortes
- Guarda instantes en UTC (ISO 8601); agrupa tickets, cortes y reportes por día en
  `America/Mexico_City` (constante única en código; la zona del dispositivo no se usa).
  Una venta a las 23:50 pertenece a ese día.

### Venta local-first e idempotencia
- Cobrar nunca espera la red: persiste el ticket en IndexedDB con `client_order_uuid`
  (UUID v4) y confirma al cajero en <50 ms.
- El sincronizador drena la cola outbox en segundo plano con backoff exponencial; un
  fallo de red no bloquea la UI ni pierde el ticket.
- Cambiar la forma de un ticket o del payload del outbox puede dejar ventas sin
  sincronizar: versiona el esquema de Dexie con migración que conserve lo pendiente.
- `client_order_uuid` es UNIQUE: si el cliente reenvía la misma orden, el backend
  devuelve la existente sin duplicar cobro ni efectos.
- El outbox se drena en segundo plano; un 4xx de validación pasa a `failed` y no se
  reintenta solo. El catálogo viaja por `GET /catalog`, nunca por `/sync`.

## UI de mostrador
- Uso primario: celular/tablet, manos ocupadas, horas pico. Área táctil ≥48 px, contraste
  alto, carrito siempre visible y editable. Uso secundario: laptop (precios y reportes).
- Atajos de peso `0.500`, `1.000`, `1.500`, `2.000` kg y ajuste de ±250 g en el carrito.
- Impresión térmica: en Chromium, `--kiosk-printing` evita el diálogo de confirmación.

## Verificación manual (PWA / offline)
1. `npm run build && npm run preview` en `frontend/`; instalar la PWA.
2. Modo avión, reabrir y ver el catálogo con el badge offline; reconectar y ver el
   refresco sin recargar.
3. Cobrar sin red, reconectar y verificar que el outbox se vacía y que reenviar el mismo
   `client_order_uuid` no duplica.
4. Medir un target táctil de 48 px en DevTools.
- Empezar de cero: DevTools → Application → IndexedDB → borrar la base local.

## Archivos de contexto
- AGENTS = reglas vigentes; MEMORY = estado, decisiones y próximos pasos (≤50 líneas);
  `specs/` = alcance aprobado.
- Si algo en MEMORY se vuelve regla permanente, propón subirlo a AGENTS.