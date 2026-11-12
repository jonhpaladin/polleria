# Pollería el wero — POS táctil local-first

Catálogo de mostrador que abre sin red. Frontend React + Vite (PWA) y backend
FastAPI + PostgreSQL. La venta offline llega en la spec 002; hoy solo existe el
catálogo de solo lectura.

## Arranque

Requisitos: Node 24, npm 11 y Python 3.12+.

```bash
# Backend
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -e ".[dev]"   # POSIX: .venv/bin/python
cp .env.example .env                                  # completa DATABASE_URL
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m app.seed
.venv/Scripts/python.exe -m uvicorn app.main:app --reload

# Frontend (otra terminal)
cd frontend
npm ci
npm run dev        # http://localhost:5173
```

Sin `DATABASE_URL` la API arranca igual: `GET /health` responde
`database: "unreachable"` en vez de caerse.

## Demo en celular/tablet (misma red)

1. En `backend/.env`, apunta `FRONTEND_ORIGIN` al origen del dispositivo:
   `FRONTEND_ORIGIN=http://IP-DEL-PC:5173` (o `:4173` si usas `preview`).
2. En `frontend/.env.local`, escribe `VITE_API_URL=http://IP-DEL-PC:8000`.
3. Arranca el frontend con `npm run dev -- --host` (o `npm run build && npm run preview -- --host`).

Sin esos dos ajustes el catálogo local funciona sin red, pero el celular no alcanza la API
y no se puede validar el refresco al reconectar.

## Despliegue y costos

La guía completa está en [docs/despliegue.md](docs/despliegue.md): PWA vs APK, arquitectura,
opciones gratuitas (Cloudflare Pages + Render + Supabase), costos y pasos de despliegue.

## Comandos reales

| Dónde | Comando | Qué hace |
|---|---|---|
| `backend/` | `.venv/Scripts/python.exe -m pytest -q` | Tests (la integración se omite sin `TEST_DATABASE_URL`) |
| `backend/` | `.venv/Scripts/python.exe -m ruff check .` | Lint de Python |
| `backend/` | `.venv/Scripts/python.exe -m alembic upgrade head` | Migraciones |
| `backend/` | `.venv/Scripts/python.exe -m app.seed` | Siembra idempotente del catálogo |
| `frontend/` | `npm run dev` | Servidor de desarrollo |
| `frontend/` | `npm run test` | Vitest (una corrida) |
| `frontend/` | `npm run test:watch` | Vitest en modo watch |
| `frontend/` | `npm run lint` | ESLint |
| `frontend/` | `npm run typecheck` | `tsc --noEmit` |
| `frontend/` | `npm run build` | Typecheck + build de producción |
| `frontend/` | `npm run preview` | Sirve `dist/` (verifica la PWA) |
| `frontend/` | `npm run seed:sync` | Copia la semilla del backend al frontend |
| `frontend/` | `npm run seed:check` | Falla si la semilla del frontend está desincronizada |

En Windows el intérprete es `.venv/Scripts/python.exe`; en macOS/Linux,
`.venv/bin/python`. Los scripts de `npm` no cambian.

## Estructura

- `frontend/` — PWA React + Vite + Tailwind. IndexedDB (Dexie) guarda el
  catálogo; `src/lib/syncManager.ts` y la venta todavía no existen.
- `backend/` — FastAPI + SQLAlchemy async. Routers `/health` y `/catalog`.
- `backend/app/seeds/catalog.json` — única fuente de la semilla; la copia del
  frontend se genera con `npm run seed:sync`.
- `docs/constitution.md` y `specs/` — gobierno SDD. Solo hay una spec activa.
- `AGENTS.md` y `MEMORY.md` — reglas vigentes y estado del repo.

## Notas

- Dinero: centavos enteros en el frontend, `Decimal` en el backend; viaja como
  string con exactamente 2 decimales. Nunca `float`.
- Fechas: instantes en UTC, agrupación por día en `America/Mexico_City`.
- Prueba manual de la PWA: `npm run build && npm run preview`, instalar, apagar
  la red, reabrir y ver el catálogo con el badge "Sin conexión".
