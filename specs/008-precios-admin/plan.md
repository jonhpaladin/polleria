# Plan — Spec 008 · Administración de precios y seguridad

## Flujo

```text
PWA (dueño) ── X-Admin-Key ──► PUT /admin/products/{id} ──► products / product_prices
                                                              │
                                                              └─ catalog_meta.updated_at
                                                                       │
PWA (cajas) ◄── GET /catalog cada 5 min / al enfocar ◄────────────────┘
     │
     └─ nueva versión: reemplaza la hoja de precios del día en IndexedDB

PWA (caja) ── X-Device-Key ──► POST /sync / GET /reports/daily
```

- La clave de administración vive solo en memoria mientras el diálogo está abierto.
- La clave del local se guarda en `localStorage` de cada dispositivo.
- `401` en el outbox es reintentable con backoff; no pasa a `failed`.

## Backend

| Archivo | Contenido |
|---|---|
| `app/auth.py` | `require_admin`, `require_device`, comparación constante y límite de intentos |
| `app/config.py` | `ADMIN_KEY` y `DEVICE_KEY` desde el entorno |
| `app/schemas/admin.py` | Actualización con `active` y/o `prices`, un solo default |
| `app/repositories/catalog.py` | Catálogo con inactivos y actualización transaccional |
| `app/routers/admin.py` | `GET /admin/catalog`, `PUT /admin/products/{id}` |
| `app/routers/sync.py` | Exige `X-Device-Key` cuando está configurada |
| `app/routers/reports.py` | Exige `X-Device-Key` cuando está configurada |
| `alembic/versions/0003_seguridad.py` | RLS, revocación pública, rol `polleria_api` y políticas |

## Frontend

| Archivo | Contenido |
|---|---|
| `src/lib/adminApi.ts` | Cliente con `X-Admin-Key` y validación del catálogo |
| `src/lib/deviceKey.ts` | Lectura/escritura de la clave del local en `localStorage` |
| `src/components/pos/AdminDialog.tsx` | Clave, tabla de precios, activar/desactivar y publicar |
| `src/components/ui/DeviceKeyDialog.tsx` | Captura única de la clave del local |
| `src/App.tsx` | Engrane, aviso de clave y diálogos |
| `src/hooks/useCatalog.ts` | Refresco cada 5 min, al enfocar y al volver a la pestaña |
| `src/lib/dailyPriceRepository.ts` | Versión del catálogo por día y reemplazo de la hoja |
| `src/lib/syncPolicy.ts` | `401/403` reintentable y `isAuthError` |
| `src/lib/syncEngine.ts` | Resumen con `auth` y corte del lote al fallar la clave |
| `src/hooks/useSync.ts` | Expone `authRequired` y el aviso correspondiente |

## Seguridad aplicada en Supabase

1. `revoke all` a `anon` y `authenticated` en tablas, secuencias y funciones.
2. RLS en `categories`, `products`, `product_prices`, `catalog_meta`, `sales`, `sale_lines` y
   `alembic_version`.
3. Rol `polleria_api` sin login con permisos mínimos y políticas `polleria_api_all`.
4. Verificado: `anon` no puede leer ventas y `polleria_api` puede insertar ventas.

## Contrato

### `PUT /admin/products/{product_id}`

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
- Los precios reemplazan todos los niveles del producto y exigen exactamente un default.
- La respuesta es el producto actualizado; la versión del catálogo avanza.

## Despliegue

1. `alembic upgrade head` desde local (0003) o revisar que RLS y el rol ya estén aplicados.
2. En Render: `ADMIN_KEY`, `DEVICE_KEY` y (opcional) `DATABASE_URL` del rol `polleria_api`.
3. Redeploy de la API y de la PWA.
4. En cada tablet: abrir el engrane → «Clave del local» y capturarla una vez.
5. Probar: cambiar un precio, verlo en otra caja, desactivar un producto y cobrar offline.
