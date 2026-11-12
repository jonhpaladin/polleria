# AGENTS.md — Pollería el wero (POS táctil local-first)

## Estado del repo (2026-11-12)
- Spec 001 implementada: PWA de catálogo de solo lectura (React + Vite + Tailwind) y backend FastAPI/PostgreSQL con migración, semilla y CI. Sin carrito, cobro, sync, impresión ni reportes: eso va en 002+. El estado vivo está en `MEMORY.md`, que debes leer antes de trabajar.
- Gobierno SDD: `docs/constitution.md` (principios y puerta de calidad) y `specs/` (una spec activa con su plan y tareas). Nada se implementa fuera de la spec activa.
- Comandos reales (detalle en `README.md`): backend `cd backend && .venv/Scripts/python.exe -m pytest -q` y `... -m ruff check .`; frontend `cd frontend && npm run test|lint|typecheck|build` y `npm run seed:check`. En macOS/Linux usa `.venv/bin/python`.
- `skills-lock.json` es el manifiesto del instalador de skills, no un lockfile npm: no ejecutes `npm install`/`npm ci` por su presencia.

## Skills locales (`.agents/skills/`)
- Cargar la skill correspondiente antes de la tarea: `supabase-postgres-best-practices` antes de cualquier DDL, migración, índice, RLS o query en PostgreSQL; `ui-taste` / `web-design-guidelines` para construir o revisar la UI del POS.
- `vercel-react-best-practices` y `vercel-react-native-skills` asumen Next.js / React Native: el frontend aquí es React + Vite (PWA) y el backend FastAPI, así que no uses RSC, `next/*`, Server Actions ni patrones RN.
- `vercel-optimize` solo aplica al `frontend/` si se despliega en Vercel; hoy no hay destino de despliegue definido, así que no la cargues por defecto.
- Se actualizan con el instalador, que reescribe los `computedHash` de `skills-lock.json`; no edites `.agents/skills/` ni los hashes a mano.

## Reglas de dominio (no negociables)

### Dinero y peso
- Prohibido `float` / `number` de JS para dinero. Backend: `decimal.Decimal` con `ROUND_HALF_UP` (2 decimales para dinero; kilos `NUMERIC(8,3)`). Frontend: centavos enteros para dinero y gramos enteros para peso (nunca kilos en float).
- Redondear en el límite (persistencia, totales finales, ticket), no en cada paso intermedio.

### Fechas y cortes
- Guarda instantes en UTC (ISO 8601), pero agrupa tickets, cortes y reportes por el día en `America/Mexico_City` (constante única en código; la zona del dispositivo no se usa). Una venta de las 23:50 pertenece a ese día.
- Prohibido `toISOString()` y `new Date("AAAA-MM-DD")` para claves de día: se interpretan en UTC y desplazan la fecha.

### Venta local-first
- Cobrar **nunca** espera la red: persistir el ticket en IndexedDB con `client_order_uuid` (UUID v4) y confirmar al cajero en <50 ms.
- El sincronizador drena la cola outbox en segundo plano con backoff exponencial; un fallo de red no bloquea la UI ni pierde el ticket.
- Cambiar la forma de un ticket guardado o del payload en la cola outbox puede dejar ventas sin sincronizar: pregunta antes y versiona el esquema de Dexie con migración que conserve lo pendiente.

### Idempotencia
- `client_order_uuid` es UNIQUE: si el cliente reenvía la misma orden, el backend devuelve la existente sin duplicar el cobro ni sus efectos.

## UI de mostrador
- Uso primario: celular/tablet en mostrador, manos ocupadas, horas pico. Área táctil ≥48 px, contraste alto, carrito siempre visible y editable.
- Atajos de peso `0.500`, `1.000`, `1.500`, `2.000` kg y ajustes de ±250 g en el carrito.
- Uso secundario: laptop para precios y reportes.

## Verificación
- Tests: `pytest` en backend y `npm run test` en frontend; la integración con PostgreSQL se omite sin `TEST_DATABASE_URL` (en CI corre con el servicio de Postgres).
- Manual PWA: `npm run build && npm run preview`, instalar, modo avión, reabrir y ver el catálogo con el badge; reconectar y ver el refresco sin recarga. Medir un target de 48 px en DevTools.
- La venta offline (cobrar sin red, reenviar `client_order_uuid`) se verifica a partir de 002.
- Para empezar de cero: DevTools → Application → IndexedDB → borrar la base local.

## Arquitectura actual y objetivo
- Existe: `frontend/` (PWA React + Vite + Tailwind, Dexie v1 con `categories`/`products`/`meta`, catálogo de solo lectura); `backend/` (FastAPI async, routers `/health` y `/catalog`, Alembic, semilla); `.github/workflows/ci.yml`.
- Objetivo 002+: `src/lib/syncManager.ts` (outbox), `src/lib/printer.ts` (ESC/POS y TSPL), `src/components/admin/`, routers `/sync` y `/analytics`.

## Prácticas
- KISS/YAGNI: sin autenticación multi-rol ni microservicios hasta que se soliciten; no añadas funciones no pedidas.
- Nada se implementa fuera de la spec activa (`specs/NNN-*/spec.md`): si falta una decisión, para y pregunta; el cambio de alcance se enmienda en la spec antes de codificar.
- Pregunta antes de: añadir una dependencia de producción o tocar los contratos de `/sync`.
- TypeScript `strict: true` (incluye `noImplicitAny`); type hints en todo Python nuevo.
- Documentación, comentarios y textos de UI en español, igual que este archivo y `MEMORY.md`.
- División de archivos: AGENTS = reglas vigentes; MEMORY = estado, decisiones y próximos pasos; `specs/` = alcance aprobado. Actualiza MEMORY al terminar cada tarea; si algo se vuelve regla permanente, súbelo a AGENTS. Mantenlo ≤50 líneas.
- Nunca escribas credenciales, cadenas de conexión ni datos personales en AGENTS o MEMORY.
- Impresión térmica: en Chromium, `--kiosk-printing` evita el diálogo de confirmación.
