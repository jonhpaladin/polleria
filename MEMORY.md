# MEMORY.md — Memoria de Arquitectura y Estado del POS

## Estado actual (2026-11-12)
- Spec 001 implementada y verificada en local: PWA de catálogo de solo lectura + API FastAPI/PostgreSQL (migración Alembic 0001, semilla idempotente, `/health`, `/catalog`).
- Tests: backend 22 passed + 1 skipped (integración sin `TEST_DATABASE_URL`); frontend 87 passed; `ruff`, `lint`, `typecheck`, `seed:check` y `build` en verde.
- El catálogo muestra nombre, categoría, unidad y precio; al volver la red se reintenta el refresco sin recargar ni perder la categoría. Un catálogo vacío se conserva y muestra su estado vacío; el SW avisa cuando hay una versión nueva.
- Commit inicial `f85485c` (root, master) con todo el código de 001; sin Postgres local, Docker ni `uv`.
- Validado con Edge headless + CDP: 360/768/1280 sin scroll horizontal, offline con badge, banner de actualización y targets de 48 px. Falta tableta/celular físico e integración con Postgres.
- Guía de despliegue en `docs/despliegue.md`: PWA vs APK, Cloudflare Pages + Render + Supabase, costos free y pasos de publicación.

## Decisiones (y por qué)
- **Neon/Supabase free tier en vez de laptop en casa:** evita dejar una laptop encendida 24/7 y exponer túneles/DNS dinámicos.
- **Outbox local-first:** el celular confirma la venta sin depender del Wi-Fi/4G del local.
- **Decimal en backend y centavos enteros en el cliente, en vez de float:** los kilos fraccionados (ej. 1.345 kg) con precios variables desfasan arqueos con IEEE 754.
- **PWA sobre app nativa:** se abre en cualquier celular/tablet/laptop sin compilaciones por plataforma ni tiendas de apps.
- **Precios en `product_prices` (lista, promoción, mayoreo):** permite agregar niveles sin migrar; un índice único parcial garantiza un solo precio por defecto.
- **Zona horaria fija `America/Mexico_City`:** un tablet mal configurado no descuadra el corte del día.
- **Vitest + Pytest:** cada runner es el estándar de su stack.
- **Semilla canónica en `backend/app/seeds/catalog.json`:** el JSON del frontend se genera con `seed:sync` y `seed:check` hace fallar CI si divergen.
- **TypeScript 5.9.3:** `typescript-eslint@8` exige TS `<6.1.0`.
- **Sin `dexie-react-hooks`:** el catálogo se lee con un hook propio; la dependencia del plan no se instaló por no usarse.
- **Skills vendorizadas y pinneadas por hash** (`.agents/skills/` + `skills-lock.json`): reproducibles entre sesiones.

## Próximos pasos
1. Configurar Postgres (Neon/Supabase) y correr la integración con `TEST_DATABASE_URL`; el commit inicial ya existe.
2. Probar la PWA en una tableta/celular físico con la red apagada (acción humana).
3. Abrir 002 (venta offline) cuando 001 pase el checklist de cierre.

## Decisiones de producto pendientes
- Vigencia de promociones, precios ligados a cliente y autorización de precio manual se definen en 002/005.
