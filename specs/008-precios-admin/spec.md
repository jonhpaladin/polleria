# Spec 008 — Administración de precios y seguridad de la API

- Estado: activa (2026-11-23); implementada en local; falta configurar las claves en Render,
  aplicar la migración 0003 y desplegar.
- Spec activa: sí
- Depende de: `specs/001-fundamentos-catalogo`, `specs/004-sincronizacion`, `specs/007-catalogo-real`
- Fecha: 2026-11-23

## Contexto y objetivo

Hoy el catálogo se cambia editando la semilla y aplicando SQL a mano, y los precios del día se
capturan en cada dispositivo. Además, la API está abierta: cualquiera con la URL puede enviar
ventas a `POST /sync` o leer ingresos en `GET /reports/daily`, y Supabase conserva RLS
deshabilitado.

Esta iteración permite al dueño editar precios base y activar/desactivar productos desde la PWA,
publicar el catálogo a las cajas y cerrar el acceso público a la base y a los endpoints
sensibles. La venta offline y el corte siguen funcionando igual.

## Alcance

1. **Administración de precios**: editar lista, promoción y mayoreo; activar o desactivar
   productos existentes; publicar y refrescar las cajas.
2. **Seguridad de datos**: RLS en las tablas públicas, rol de base con privilegios mínimos y
   revocación de `anon`/`authenticated`.
3. **Seguridad de la API**: clave de administración para escribir el catálogo y clave del local
   por dispositivo para sincronizar y consultar reportes.

## Fuera de alcance

- Crear productos, cambiar nombre, SKU, unidad o categoría (sigue por semilla).
- Precios por cliente, clientes registrados y promociones con vigencia.
- Historial o auditoría de cambios de precio; se conserva solo el precio vigente.
- Inventario, costos, proveedores y facturación.
- Roles múltiples, PIN por cajero y concurrencia entre cajas (010).
- Imágenes (003) e impresión (009).

## Requisitos funcionales

- **RF-008-01**: CUANDO el dueño abre «Administración» e ingresa la clave correcta, EL SISTEMA
  muestra todos los productos, incluidos los inactivos, con sus precios y su estado.
- **RF-008-02**: EL DUEÑO puede editar los precios de lista, promoción y mayoreo de un producto;
  cada producto conserva exactamente un precio por defecto y el dinero viaja como string decimal.
- **RF-008-03**: EL DUEÑO puede activar o desactivar un producto; un producto inactivo deja de
  aparecer en `GET /catalog` y en la rejilla, sin borrar tickets ni precios históricos.
- **RF-008-04**: CUANDO se guarda un cambio, EL BACKEND actualiza el producto y avanza
  `catalog_meta.updated_at`; las cajas descargan la versión nueva sin recargar la PWA.
- **RF-008-05**: CUANDO se publica un cambio de precios, LAS CAJAS reemplazan la hoja de precios
  del día en curso con los precios base nuevos; los ajustes manuales de ese día se pierden y se
  avisa en la pantalla de administración.
- **RF-008-06**: LA PWA refresca el catálogo al arrancar, al recuperar conexión, al volver a la
  pestaña y cada 5 minutos mientras esté en línea.
- **RF-008-07**: LOS ENDPOINTS de administración exigen la clave de administración; sin ella
  responden `401` y los intentos fallidos se limitan por IP.
- **RF-008-08**: `POST /sync` y `GET /reports/daily` exigen la clave del local; sin ella
  responden `401`. Un `401` en el outbox es reintentable y no marca el ticket como `failed`.
- **RF-008-09**: LA PWA guarda la clave del local una sola vez por dispositivo y la envía en cada
  petición protegida; la clave de administración vive solo en memoria mientras el diálogo está
  abierto.
- **RF-008-10**: NINGUNA clave ni cadena de conexión se incluye en el repo ni en el bundle de la
  PWA; la semilla del frontend no contiene secretos.
- **RF-008-11**: LA BASE habilita RLS en las tablas públicas, revoca todo a `anon` y
  `authenticated` y deja preparado un rol `polleria_api` sin privilegios de propietario ni de
  superusuario para cuando se cambie la cadena de la API.
- **RF-008-12**: LA PANTALLA de administración conserva áreas táctiles de 48 px y se puede usar a
  360 px sin scroll horizontal.

## Diseño de seguridad

### Base de datos

Se aplicó el 2026-11-23: RLS en las 7 tablas de `public`, `revoke all` a `anon` y
`authenticated`, y verificación de que la API sigue respondiendo. La migración `0003_seguridad`
reproduce el cambio y prepara el rol `polleria_api`.

- Rol `polleria_api` con `LOGIN` (contraseña solo en el entorno), sin `SUPERUSER`, sin
  `BYPASSRLS` y sin privilegios de propietario. La contraseña y el cambio de `DATABASE_URL` se
  hacen en Supabase/Render, fuera del repo.
- Permisos mínimos: `USAGE` en el esquema `public`, `SELECT/INSERT/UPDATE/DELETE` en
  `categories`, `products`, `product_prices`, `catalog_meta`, `sales` y `sale_lines`, y `USAGE`
  en las secuencias necesarias.
- Políticas permisivas solo para `polleria_api`; `anon` y `authenticated` no tienen acceso.
- La PWA no usa la llave pública de Supabase.
- Las migraciones siguen corriendo con la conexión de administrador desde local; Render puede
  usar la cadena del rol `polleria_api` cuando se configure.

### API

- `ADMIN_KEY` y `DEVICE_KEY` en variables de entorno de Render; comparación en tiempo constante.
- `GET /catalog` y `GET /health` siguen públicos: no exponen ventas ni permiten escritura.
- Administración: `GET /admin/catalog` y `PUT /admin/products/{id}` con `X-Admin-Key`; sin
  `ADMIN_KEY` configurada responden `503`.
- Sincronización y reportes: `X-Device-Key` en `POST /sync` y `GET /reports/daily`. Si
  `DEVICE_KEY` no está configurada, siguen abiertos para no romper el despliegue; en producción
  debe configurarse.
- Límite simple en memoria para intentos fallidos de administración (5 por minuto por IP); el
  proceso de Render es único.

### PWA

- Engrane «Administración» en el encabezado; diálogo con captura de clave y tabla editable.
- Aviso «Configura la clave del local» cuando una petición devuelve `401`; se captura una vez y
  se guarda en `localStorage`.
- El outbox trata `401/403` como error de autenticación reintentable con backoff, nunca como 4xx
  terminal.
- La clave de administración no se persiste; se pide al abrir el diálogo.

## Contrato propuesto

### `GET /admin/catalog` (requiere `X-Admin-Key`)

Igual que `GET /catalog`, pero incluye productos inactivos.

### `PUT /admin/products/{product_id}` (requiere `X-Admin-Key`)

```json
{
  "active": true,
  "prices": [
    { "tier": "lista", "price": "49.50", "is_default": true },
    { "tier": "promocion", "price": "45.00", "is_default": false }
  ]
}
```

- `active` y `prices` son opcionales, pero debe venir al menos uno.
- Si vienen precios, se reemplazan todos los del producto y debe haber exactamente un default.
- Devuelve el producto actualizado y avanza la versión del catálogo.
- `404` si el producto no existe; `422` si los precios no son válidos.

## Casos límite

- Clave incorrecta: `401` sin filtrar si el producto existe; el límite por IP responde `429`.
- Clave no configurada en el servidor: `503`, nunca acceso abierto.
- Producto desactivado con tickets históricos: los tickets conservan su snapshot.
- Cambio de precio a mitad del día: la hoja del día no se toca; se ajusta a mano si el dueño
  quiere cobrar el precio nuevo hoy.
- Caja sin clave del local: las ventas se siguen cobrando offline; el outbox queda pendiente con
  aviso y se drena al configurarla.
- Sin red: la administración no está disponible; el catálogo local y la venta siguen.
- Dos pestañas editando: gana la última escritura; no hay fusión de cambios.

## Decisiones

- **D-008-01**: la administración edita precios base (lista, promoción y mayoreo) y activa o
  desactiva los productos existentes; no crea productos ni cambia nombre, SKU, unidad o
  categoría. Aprobado el 2026-11-23.
- **D-008-02**: clave de administración para el dueño y clave del local por dispositivo; ninguna
  clave se guarda en el bundle. Aprobado el 2026-11-23.
- **D-008-03**: publicar reemplaza la hoja de precios del día en curso en las cajas conectadas;
  los ajustes manuales de ese día se pierden y la UI lo advierte. Aprobado el 2026-11-23.
- **D-008-04**: la clave del local se exige cuando `DEVICE_KEY` está configurada; el `401` del
  outbox es reintentable y no marca tickets como `failed`. Aprobado el 2026-11-23.
- **D-008-05**: no se guarda historial de precios en esta iteración; se conserva el precio
  vigente y los tickets conservan su snapshot. Aprobado el 2026-11-23.
- **D-008-06**: los precios por cliente y las promociones con vigencia quedan fuera; se retoman
  cuando el dueño los pida.

## Implementación

| Archivo | Cambio |
|---|---|
| `backend/app/auth.py` | Claves de administración y del local, límite de intentos |
| `backend/app/routers/admin.py` | `GET /admin/catalog` y `PUT /admin/products/{id}` |
| `backend/app/repositories/catalog.py` | Catálogo con inactivos y actualización transaccional |
| `backend/app/schemas/admin.py` | Contrato de actualización con un solo precio por defecto |
| `backend/alembic/versions/0003_seguridad.py` | RLS, revocación pública y rol `polleria_api` |
| `frontend/src/lib/adminApi.ts` | Cliente de administración |
| `frontend/src/components/pos/AdminDialog.tsx` | Tabla editable de precios y estado |
| `frontend/src/components/ui/DeviceKeyDialog.tsx` | Captura única de la clave del local |
| `frontend/src/lib/dailyPriceRepository.ts` | Reemplazo de la hoja del día al cambiar la versión |
| `frontend/src/hooks/useCatalog.ts` | Refresco cada 5 min y al volver a la pestaña |
| `frontend/src/lib/syncPolicy.ts`, `syncEngine.ts` | `401/403` reintentable y aviso de clave |
| `docs/seguridad.md` | Pasos de Supabase, Render, respaldos y respuesta a incidentes |

## Criterios de aceptación

1. El dueño entra con la clave, cambia un precio y lo ve publicado en otra caja sin recargar.
2. Un producto desactivado desaparece de la venta y sigue en los tickets históricos.
3. `POST /sync` y `GET /reports/daily` responden `401` sin la clave del local y funcionan con
   ella; un `401` no deja tickets en `failed`.
4. La llave pública de Supabase ya no puede leer ni escribir las tablas.
5. La PWA no contiene claves en el bundle y la captura de la clave del local se hace una vez.
6. `lint`, `typecheck`, `test`, `build`, `seed:check`, `pytest` y `ruff` en verde.

## Pendientes de despliegue

- Configurar `ADMIN_KEY` y `DEVICE_KEY` en Render.
- Aplicar `alembic upgrade head` (0003) y decidir si la API usa `polleria_api`.
- Verificar en el celular/tablet del local la captura de la clave y la publicación de precios.
- Programar el primer respaldo fuera de Supabase (ver `docs/seguridad.md`).
