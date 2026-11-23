# Seguridad del POS — estado y pasos pendientes

Fecha: 2026-11-23. Esta guía cubre la base (Supabase) y la API (Render). No escribas claves en
el repo, en la PWA ni en este documento.

## Lo que ya quedó cerrado

Se aplicó directamente en Supabase:

- RLS habilitado en las 7 tablas de `public` (`categories`, `products`, `product_prices`,
  `catalog_meta`, `sales`, `sale_lines`, `alembic_version`).
- `anon` y `authenticated` ya no tienen ningún permiso: no pueden leer, insertar, borrar ni
  truncar.
- La API sigue funcionando porque usa otro rol de base; se verificó `GET /catalog` y
  `GET /reports/daily` con `200`.

Verificación rápida en el SQL Editor de Supabase:

```sql
select relname, relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
 order by relname;

select table_name, grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and grantee in ('anon', 'authenticated');
-- Debe devolver cero filas.
```

Esto es lo que reportaba el Security Advisor de Supabase y ya está resuelto. No dependas de
"no compartir la URL": la URL de la API viaja en el bundle de la PWA y los bots la encuentran.

## Pendiente 1 — Claves de la API en Render

En Render → el servicio de la API → Environment, agrega:

| Variable | Qué es | Cómo generarla |
|---|---|---|
| `ADMIN_KEY` | Clave larga del dueño para editar precios | `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `DEVICE_KEY` | Clave del local para sincronizar y ver reportes | Igual, otra clave distinta |

- Guarda ambas en un gestor de contraseñas.
- Con `DEVICE_KEY` configurada, `POST /sync` y `GET /reports/daily` exigen `X-Device-Key`.
  Sin ella siguen abiertos (solo para despliegue gradual); en producción debe estar puesta.
- Sin `ADMIN_KEY`, `/admin/*` responde `503` y no se puede editar el catálogo.
- En cada tablet, la primera sincronización pedirá la clave del local; se guarda solo en ese
  dispositivo. La clave de administración se pide cada vez que se abre el engrane.

## Pendiente 2 — Cuenta de Supabase

1. Activa MFA en la cuenta de Supabase y usa una contraseña única.
2. Nunca copies la `service_role` key en la PWA, el repo ni un chat. Esa llave salta RLS.
3. Si la `anon` o la `service_role` se filtraron alguna vez, rótalas en Project Settings → API.
4. En Authentication → Providers, desactiva los proveedores que no uses y los registros
   públicos; este POS no usa Supabase Auth.
5. En Database → Settings, activa **SSL enforcement** para las conexiones.
6. Revisa **Security Advisor** después de estos cambios. Las advertencias de RLS deben
   desaparecer. Si queda "Leaked password protection", ignórala solo si Auth está desactivado.

## Pendiente 3 — Rol mínimo para la API (recomendado)

La migración `0003_seguridad` crea el rol `polleria_api` sin login y sus políticas. Para usarlo:

```sql
-- En el SQL Editor de Supabase; elige una contraseña larga y guárdala.
alter role polleria_api with login password 'LA_CONTRASENA_QUE_ELIJAS';
```

En Render cambia `DATABASE_URL` por la cadena del rol nuevo. Si usas el pooler de Supabase, el
usuario lleva el prefijo del proyecto:

```text
postgresql+asyncpg://polleria_api.TU_PROJECT_REF:CONTRASENA@aws-0-REGION.pooler.supabase.com:6543/postgres
```

Si usas conexión directa:

```text
postgresql+asyncpg://polleria_api:CONTRASENA@db.TU_PROJECT_REF.supabase.co:5432/postgres
```

Después del cambio, prueba `/catalog`, `/sync` y `/reports/daily`. Las migraciones de Alembic
siguen corriendo con la conexión de administrador, no con `polleria_api`.

Si algo falla, vuelve temporalmente a la cadena anterior y revisa los permisos. La protección
principal (RLS y `anon` sin permisos) ya está activa aunque la API siga usando el rol anterior.

## Pendiente 4 — Desactivar la Data API si no se usa

La PWA habla solo con FastAPI, no con PostgREST. En Supabase → Project Settings → API puedes
quitar `public` de los esquemas expuestos o desactivar la Data API. Eso elimina una superficie
pública completa sin afectar la app. El Table Editor del dashboard sigue funcionando.

## Pendiente 5 — Respaldos

1. Verifica en Supabase → Database → Backups qué retención tiene tu plan. El plan gratuito no
   incluye point-in-time recovery.
2. Programa un respaldo semanal fuera de Supabase:

```bash
pg_dump "$DATABASE_URL_ADMIN" --no-owner --format=custom --file="polleria-$(date +%F).dump"
```

3. Guarda el archivo en un disco o nube privada, no en el repo.
4. Prueba una restauración al menos una vez:

```bash
pg_restore --clean --no-owner --dbname="$DATABASE_URL_ADMIN" polleria-2026-11-23.dump
```

5. Los cortes de caja y los tickets pendientes viven en el IndexedDB de la tablet; el respaldo de
   Supabase no los recupera. Ese es el alcance de la spec 011 (respaldo local).

## Pendiente 6 — Límites y monitoreo

- Los intentos fallidos de administración se limitan a 5 por minuto por IP (en memoria del
  proceso). Si Render reinicia, el contador se reinicia.
- Si expones la API con un dominio propio en Cloudflare, puedes agregar una regla de rate
  limiting para `/sync` y `/admin/*`.
- Revisa los logs de Render ante picos de `401`, `429` o `503`.
- `GET /health` sigue público y no revela datos de negocio.

## Si algo se borra o se compromete

1. No sigas usando las claves actuales: rota `ADMIN_KEY`, `DEVICE_KEY` y la contraseña de la
   base; si sospechas de la `service_role`, rótala.
2. Revisa los logs de Supabase (Database → Logs) y de Render.
3. Restaura el último respaldo verificado.
4. Revisa si quedaron tickets pendientes en la tablet antes de reemplazar datos.
5. Documenta qué pasó y ajusta los permisos.

## Regla de oro

La seguridad no depende de esconder la URL. Depende de que la llave pública no tenga permisos,
de que las escrituras pidan clave y de tener un respaldo que se pueda restaurar.
