# Constitución — Pollería el wero

Versión 1.0 · 2026-11-11 · Ratificada por el dueño del proyecto
Ámbito: todo el repositorio (`frontend/`, `backend/`, `docs/`, `specs/`).

Toda spec, plan y tarea debe cumplir estos principios. Si una tarea no puede cumplirlos,
se detiene y se pregunta; no se negocia en silencio.

## 1. Propósito y alcance del producto

POS táctil de mostrador para una pollería. Cobra en celular o tablet sin depender de la
red y sincroniza con el backend cuando hay conexión. El MVP cubre: catálogo con precios,
venta por pieza y por kilo, ticket, corte de caja y reportes por día.

Fuera del alcance hasta que se pida explícitamente: facturación fiscal, multi-sucursal,
e-commerce, autenticación multi-rol y cualquier integración con terceros.

## 2. Principios innegociables

Ordenados por prioridad. Si dos colisionan, gana el número menor.

**P1. Cobrar nunca espera la red.**
La venta se persiste en IndexedDB y se confirma al cajero en <50 ms. Ninguna spec puede
condicionar el cobro a una respuesta HTTP. El sincronizador corre en segundo plano y un
fallo de red no bloquea la UI ni pierde el ticket.

**P2. Dinero y peso exactos.**
Cliente: centavos enteros para dinero y gramos enteros para peso. Backend:
`decimal.Decimal` con `ROUND_HALF_UP` y `NUMERIC(10,2)` para dinero, `NUMERIC(8,3)` para
kilos. Prohibido `float`/`number` en cualquier ruta que calcule, compare o persista dinero
o peso. Se redondea en el límite (persistencia, total final, ticket), no en pasos
intermedios.

**P3. Fechas con zona horaria fija.**
Los instantes se guardan en UTC (ISO 8601), pero tickets, cortes y reportes se agrupan por
el día en `America/Mexico_City` (constante única, definida en código y documentada).
Prohibido `toISOString()` y `new Date("AAAA-MM-DD")` para construir claves de día: se
interpretan en UTC y desplazan la fecha. Una venta de las 23:50 pertenece a ese día.

**P4. Idempotencia por `client_order_uuid`.**
Es UNIQUE en el backend. Reenviar la misma orden devuelve la existente sin duplicar el
cobro ni sus efectos. La idempotencia se prueba con tests, no se asume.

**P5. La spec manda.**
Nada se implementa si no está en la spec activa. Si falta una decisión, se para y se
pregunta; no se rellena el hueco por conveniencia. Cambiar alcance exige enmendar la spec
o abrir una nueva, nunca colarlo en un commit.

**P6. Lógica pura separada de la interfaz.**
Totales, conversión peso→importe, redondeo, filtrado, validación de payloads y agrupación
por día son funciones puras: sin DOM, sin IndexedDB, sin `fetch`, sin reloj global. Toda
función que dependa del tiempo recibe `now` o `today` como parámetro. La UI solo orquesta
y pinta.

**P7. Tests como puerta.**
Frontend: Vitest. Backend: Pytest. Ninguna tarea se marca terminada con tests en rojo.
Un requisito sin test automatizado solo se acepta si el plan justifica por escrito por qué
es necesariamente manual, y entonces se documenta el guion de verificación.

**P8. Los datos guardados son sagrados.**
Cambiar la forma de un ticket, del payload del outbox o del esquema Dexie puede dejar
ventas sin sincronizar. Todo cambio de esquema lleva migración versionada que conserva lo
pendiente, y se pregunta antes. Nunca se borra IndexedDB para "arreglar" un bug en
producción.

**P9. Alcance mínimo y dependencias aprobadas.**
KISS/YAGNI: no se añaden funciones no pedidas, auth multi-rol, microservicios ni capas de
abstracción "por si acaso". Toda dependencia de producción nueva requiere aprobación
explícita antes de instalarse. Las de desarrollo se justifican en el plan.

**P10. Idioma.**
Identificadores de código en inglés (`sellTicket`, `priceCents`, `gramsToKg`). Interfaz,
comentarios, documentación, mensajes de error y commits en español.

## 3. Stack y arquitectura ratificados

- **Frontend**: React + TypeScript (`strict: true`) + Vite + Tailwind CSS v4. PWA
  instalable con service worker que precachea el app shell. Persistencia en IndexedDB vía
  Dexie. Tests con Vitest.
- **Backend**: Python 3.12+ (local: 3.14), FastAPI + Pydantic v2 + SQLAlchemy 2 async +
  Alembic sobre PostgreSQL serverless (Neon/Supabase). Tests con Pytest.
- **Contratos**: JSON. Dinero como string decimal de 2 posiciones (`"185.00"`), nunca
  número JSON. Peso como gramos enteros. Unidades de venta: `piece` | `kg`.
- **Comandos** (disponibles al crear el andamiaje en 001): los reales del proyecto
  (`npm run dev|build|test|lint|typecheck`, `python -m pytest`,
  `python -m ruff check .`). Prohibido documentar o ejecutar comandos que no existan.
- **Estructura**: `frontend/` y `backend/` separados; `docs/` para gobierno; `specs/NNN-*`
  con `spec.md`, `plan.md` y `tasks.md` por iteración.

## 4. Flujo de trabajo SDD

| Paso | Artefacto | Puerta de salida |
|---|---|---|
| 1. Constitución | `docs/constitution.md` | Ratificada (una vez por proyecto) |
| 2. Especificación | `specs/NNN-*/spec.md` | RF en EARS, casos límite y fuera de alcance |
| 3. Clarificación | Dudas resueltas en la spec | Cero `[NECESITA ACLARACIÓN]` bloqueantes |
| 4. Planificación | `specs/NNN-*/plan.md` | Archivos, funciones puras, decisiones y tests |
| 5. Tareas | `specs/NNN-*/tasks.md` | Tareas de 20–30 min con "Hecho cuando" |
| 6. Implementación | Código + tests | Gate de calidad (sección 5) |
| 7. Validación | Demo + revisión | Criterios de finalización cumplidos |
| Loop | Nueva spec o enmienda | Cambio de alcance documentado |

Reglas: una sola spec activa a la vez. Ningún paso se salta. Una spec no se da por
cerrada si quedan RF sin cubrir o dudas bloqueantes sin resolver.

## 5. Puerta de calidad (Definition of Done)

Una tarea solo se marca `[x]` cuando:

- [ ] Los RF que cubre tienen test en verde, o guion manual documentado y ejecutado.
- [ ] `npm run lint`, `npm run typecheck` y `npm run test` pasan en `frontend/`.
- [ ] `python -m pytest` y `python -m ruff check .` pasan en `backend/`.
- [ ] No hay `float` en rutas de dinero o peso.
- [ ] No hay secretos, cadenas de conexión ni datos personales en el diff.
- [ ] `MEMORY.md` refleja el estado y `AGENTS.md` los comandos reales.
- [ ] El flujo principal se probó a mano en el navegador del celular/tablet.

## 6. Gobierno

- **Jerarquía**: constitución > spec activa > plan > tareas. Un conflicto se resuelve
  hacia arriba, nunca improvisando.
- **Enmiendas**: se proponen por escrito indicando principio afectado, motivo e impacto en
  specs activas; requieren aprobación explícita del dueño. Se registra la versión.
- **Excepciones**: cualquier excepción temporal se anota en el plan de la spec con fecha y
  motivo; no se convierte en práctica permanente por repetición.
- **Secretos**: solo por variables de entorno (`.env` fuera de git). Nunca en
  `AGENTS.md`, `MEMORY.md`, specs, código ni logs.
