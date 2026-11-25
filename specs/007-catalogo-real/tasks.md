# Tareas — Spec 007 · Catálogo real y diseño de la marca

> Nota 2026-11-25: se retiraron las 4 bebidas porque no se venden; el catálogo activo es de 25
> productos. Las tareas de abajo conservan el registro de la implementación original.

Cada tarea se marca `[x]` solo con la puerta de calidad en verde (constitución, sección 5).

- [x] **T-007-01 · Semilla del catálogo real**
  Reemplazar los 26 SKU provisionales por los 29 productos del local con unidades y precios
  visibles; los sin precio confirmado llevan $100 temporal.
  Hecho cuando `load_seed` valida la semilla y `test_seed` cubre coherencia y timestamp.
  RF: RF-007-01, RF-007-02

- [x] **T-007-02 · Desactivación de productos retirados**
  El repositorio apaga los productos ausentes de la semilla antes del upsert, sin borrarlos.
  Hecho cuando el test de integración confirma que el retirado queda inactivo y fuera del catálogo.
  RF: RF-007-03

- [x] **T-007-03 · Sincronización de semilla**
  `seed:sync` copia la semilla al frontend y `seed:check` falla si divergen.
  Hecho cuando la puerta de calidad incluye `seed:check` en verde.
  RF: RF-007-07

- [x] **T-007-04 · Identidad visual**
  Tokens rojo/amarillo/crema, mascota SVG y encabezado «Pollería El Wero»; tema de la PWA.
  Hecho cuando la PWA instalada muestra el nombre y los colores del letrero.
  RF: RF-007-04

- [x] **T-007-05 · Catálogo táctil con los productos nuevos**
  Las tarjetas, categorías y hoja de producto funcionan con los nombres y unidades nuevos.
  Hecho cuando se cobra por kilo y por pieza sin romper 005.
  RF: RF-007-02, RF-007-05

- [x] **T-007-06 · Reportes con el catálogo nuevo**
  El corte del día agrupa por producto y categoría con los nombres nuevos.
  Hecho cuando el reporte local y la conciliación siguen cuadrando.
  RF: RF-007-06

- [x] **T-007-07 · Aplicación en Supabase y verificación**
  SQL idempotente por SKU/id, reemplazo de precios y avance de `catalog_meta`.
  Hecho cuando `GET /catalog` devuelve 29 productos activos.
  RF: RF-007-01, RF-007-03

- [x] **T-007-08 · Cierre documental**
  Actualizar `MEMORY.md`, `specs/README.md` y la hoja de ruta; dejar los $100 documentados.
  Hecho cuando 007 queda cerrada y 008 toma el siguiente turno.
  RF: —
