# Semilla del catálogo

`catalog.json` es la **única fuente** de la semilla (D-6). Es un catálogo de
ejemplo, no datos reales del local: el dueño lo reemplaza por el suyo.

- No se edita a mano en el frontend: `frontend/src/data/seedCatalog.json` se
  genera con `npm run seed:sync`.
- Cada producto tiene al menos un precio y **exactamente uno** con
  `is_default: true`.
- El dinero es string con dos decimales (`"185.00"`), nunca número.
- `updated_at` va en UTC con `Z`; es la versión que el cliente compara para
  decidir si refresca.
- Aplicación: `python -m app.seed` (idempotente por `sku` y por
  `product_id` + `tier`).
