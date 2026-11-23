# Tareas — Spec 008 · Administración de precios y seguridad

Cada tarea se marca `[x]` solo con la puerta de calidad en verde (constitución, sección 5).

- [x] **T-008-01 · Claves de la API**
  `require_admin`, `require_device`, comparación en tiempo constante y límite de intentos.
  Hecho cuando los tests cubren 401, 429 y 503.
  RF: RF-008-07, RF-008-08

- [x] **T-008-02 · Contrato de administración**
  `AdminProductUpdateIn`, actualización transaccional y avance de `catalog_meta`.
  Hecho cuando los tests cubren precios válidos, dos defaults, float y producto inexistente.
  RF: RF-008-01…04

- [x] **T-008-03 · Catálogo con inactivos**
  `GET /admin/catalog` incluye los inactivos; `GET /catalog` solo activos.
  Hecho cuando desactivar un producto lo saca de la venta sin borrar su historial.
  RF: RF-008-03

- [x] **T-008-04 · RLS y rol mínimo**
  Migración `0003_seguridad` y aplicación en Supabase; `anon`/`authenticated` sin permisos.
  Hecho cuando RLS está en las 7 tablas y la llave pública no puede leer ni borrar.
  RF: RF-008-11

- [x] **T-008-05 · Clave del local en la PWA**
  Almacenamiento local, cabecera `X-Device-Key`, aviso y `401` reintentable.
  Hecho cuando un ticket sin clave queda pendiente y se drena al configurarla.
  RF: RF-008-08, RF-008-09

- [x] **T-008-06 · Diálogo de administración**
  Clave en memoria, tabla de precios, activo/inactivo y guardar/publicar.
  Hecho cuando el dueño puede cambiar un precio y el catálogo avanza.
  RF: RF-008-01…04, RF-008-12

- [x] **T-008-07 · Publicación a las cajas**
  Refresco cada 5 min, al enfocar y al volver; reemplazo de la hoja del día por versión.
  Hecho cuando una caja recibe el precio nuevo y reconstruye su hoja del día.
  RF: RF-008-04, RF-008-05, RF-008-06

- [x] **T-008-08 · Tests y documentación**
  Tests de backend y frontend; `docs/seguridad.md` con pasos de Supabase y Render.
  Hecho cuando la puerta de calidad está en verde y el dueño tiene la guía.
  RF: RF-008-10

- [ ] **T-008-09 · Configuración y despliegue**
  `ADMIN_KEY` y `DEVICE_KEY` en Render, migración 0003 aplicada, redeploy y prueba en tablet.
  Hecho cuando el engrane entra con la clave y otra caja recibe el precio.
  RF: RF-008-01…09
