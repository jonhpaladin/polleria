# Despliegue y operación — Pollería el wero

Documento de diseño e implementación para responder tres preguntas: cómo se ve la app en
el celular, qué infraestructura necesita y cuánto cuesta operarla.

> Precios y límites verificados en noviembre de 2026. Los planes gratuitos cambian; confirma
> las condiciones actuales antes de contratar.

## 1. Qué es la app

La aplicación es una **PWA** (Progressive Web App), no una APK:

- Se abre desde el navegador del celular o tablet.
- Se instala en la pantalla de inicio como una app.
- Funciona sin conexión después de la primera carga.
- No requiere Play Store ni App Store.
- Se actualiza con el aviso de “Hay una versión nueva”.

La app es **local-first**: el catálogo vive también en IndexedDB, en el dispositivo. En la
spec 002 las ventas se guardarán primero en el celular y se sincronizarán después. Un fallo
de internet o del servidor **no debe bloquear el cobro**.

## 2. Arquitectura

```text
Celular / tablet
  PWA React + Vite
  IndexedDB (catálogo y, en 002, outbox de ventas)
        │
        │ HTTPS + JSON
        ▼
API FastAPI
  Render / Fly.io / Vercel Functions
        │
        │ SQL
        ▼
PostgreSQL
  Supabase
```

Son tres piezas independientes:

| Pieza | Qué es | Dónde vive |
|---|---|---|
| Frontend | Archivos estáticos de la PWA (`dist/`) | Cloudflare Pages |
| Backend | API FastAPI con reglas de negocio | Render |
| Base de datos | PostgreSQL administrado | Supabase |

**Supabase no ejecuta FastAPI.** Supabase ofrece PostgreSQL, auth, storage y Edge Functions
(Deno/TypeScript), pero no hospeda este backend Python. La API va en un servicio aparte.

## 3. PWA o APK

| | PWA | APK con Capacitor |
|---|---|---|
| Instalación | Desde el navegador | Archivo APK o tienda |
| Actualización | Automática con aviso | Reinstalar o publicar |
| Offline | Sí, con service worker | Sí |
| Impresión Bluetooth | Limitada | Acceso nativo |
| Costo de distribución | $0 | $0 si se instala directo en Android |
| iPhone | Safari, con limitaciones | Requiere firma de Apple |

**Decisión actual:** PWA. Una APK solo se justifica si más adelante necesitamos impresión
Bluetooth, cámara u otra función nativa. En ese caso se envuelve el mismo React con
Capacitor; no se reescribe la app.

## 4. Cómo verla en el celular ahora

### Opción rápida: misma red Wi-Fi

En `backend/.env`:

```dotenv
FRONTEND_ORIGIN=http://IP-DEL-PC:5173
```

En `frontend/.env.local`:

```dotenv
VITE_API_URL=http://IP-DEL-PC:8000
```

Arranca el frontend escuchando en la red:

```powershell
cd frontend
npm run dev -- --host
```

Abre en el celular `http://IP-DEL-PC:5173`.

Esto sirve para revisar el diseño y el catálogo local, pero **no para instalar la PWA ni
probar el modo offline real**: los service workers requieren HTTPS (o `localhost`). Una IP
LAN por HTTP no es un contexto seguro.

### Opción real: desplegar con HTTPS

La PWA se instala y prueba offline solo con HTTPS. Para eso está el despliegue de la
sección 6. Para una prueba temporal sin desplegar se puede usar un túnel HTTPS gratuito
(por ejemplo Cloudflare Tunnel), pero la laptop debe quedar encendida y la URL es temporal.

## 5. Opciones gratuitas y costos

| Pieza | Opción gratis | Limitación principal | Costo para producción |
|---|---|---|---|
| PWA | Cloudflare Pages | 500 builds/mes; 20 000 archivos | $0 |
| API | Render Free | Se duerme a los 15 min; cold start de 30–60 s | ~$7/mes |
| PostgreSQL | Supabase Free | 500 MB, 2 proyectos; pausa tras 7 días sin uso | ~$25/mes (Pro) |
| Dominio | `*.pages.dev` / `*.onrender.com` | URL menos bonita | ~$10–15/año si es propio |

**Demo: $0/mes.**  
**Producción cómoda: ~$7/mes** (API siempre despierta + Supabase free usado a diario).  
**Sin pausas ni cold starts: ~$32/mes** (Render $7 + Supabase Pro $25).

### Advertencias

- **Supabase Free** pausa el proyecto tras una semana sin actividad. Los datos no se pierden,
  pero hay que reanudarlo desde el panel. Un POS que se usa a diario no se pausa.
- **Render Free** se duerme por inactividad. El cajero no espera para cobrar por el diseño
  local-first, pero la primera sincronización o la pantalla de reportes puede tardar.
- **No uses el PostgreSQL gratuito de Render**: se elimina alrededor de los 30 días. La base
  va en Supabase.
- Cloudflare Pages es para archivos estáticos. No ejecuta FastAPI ni PostgreSQL.
- Vercel Hobby también puede servir para el frontend, pero revisa su cláusula de uso
  comercial. Cloudflare Pages evita esa duda.
- Neon es otra alternativa gratuita para PostgreSQL; aquí se elige Supabase porque ya está
  en las decisiones del proyecto.

## 6. Despliegue recomendado

### 6.1 Supabase: base de datos

1. Crear un proyecto en Supabase.
2. Copiar la cadena de conexión de PostgreSQL. Para FastAPI conviene el **Session Pooler**;
   ajustar el prefijo a `postgresql+asyncpg://` y conservar el SSL que indique el panel.
3. Guardar la cadena solo en variables de entorno. Nunca en el repo ni en la PWA.
4. Aplicar migraciones y semilla desde una máquina con la cadena configurada:

```powershell
cd backend
$env:DATABASE_URL = "postgresql+asyncpg://..."
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m app.seed
```

### 6.2 Render: API FastAPI

1. Crear un **Web Service** conectado al repositorio.
2. Root Directory: `backend`.
3. Runtime: Python 3.12.
4. Build Command: `pip install -e .`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Variables de entorno:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Cadena de Supabase con prefijo `postgresql+asyncpg://` |
| `FRONTEND_ORIGIN` | URL exacta de Cloudflare Pages, por ejemplo `https://polleria.pages.dev` |
| `APP_VERSION` | `0.1.0` |
| `APP_TIME_ZONE` | `America/Mexico_City` |

El plan gratuito sirve para demo. Para la pollería en operación, el plan de ~$7/mes evita el
cold start.

### 6.3 Cloudflare Pages: PWA

1. Crear un proyecto conectado al repositorio.
2. Root Directory: `frontend`.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Variable de entorno de build:

```dotenv
VITE_API_URL=https://TU-API.onrender.com
```

`VITE_API_URL` se incrusta en el build. Si cambia la URL de la API, hay que volver a
desplegar el frontend.

6. Cuando Pages entregue su URL, actualizar `FRONTEND_ORIGIN` en Render y redesplegar la API
   si hace falta.

### 6.4 Orden de despliegue

1. Supabase y migraciones.
2. Render con la API y sus variables.
3. Cloudflare Pages con `VITE_API_URL`.
4. Abrir la URL de Pages en el celular e instalar la PWA.
5. Probar: catálogo, modo avión, reapertura, badge y aviso de actualización.

## 7. Qué pasa si el servidor falla

- **Catálogo:** la PWA ya tiene la semilla y el catálogo local; se sigue mostrando.
- **Cobro (002):** la venta se guarda en IndexedDB y se sincroniza cuando vuelve la red.
- **Sincronización:** el outbox reintenta con backoff; un cold start de Render solo retrasa
  la sincronización, no pierde la venta.
- **Administración:** reportes y cambios de precios sí dependen del backend; por eso el plan
  de producción conviene que esté siempre despierto.

## 8. Impresión térmica: la decisión que puede exigir APK

- **Impresora de red o USB con driver/servidor de impresión:** la PWA puede imprimir desde
  el navegador. En Chromium, `--kiosk-printing` evita el diálogo de confirmación.
- **Impresora Bluetooth:** Web Bluetooth tiene soporte irregular y no existe en iOS. Si la
  pollería usa una impresora Bluetooth, lo más probable es necesitar una APK con Capacitor
  y un plugin nativo.

No conviene decidir la APK antes de definir la impresora. La spec de impresión debe incluir
modelo, conexión (Bluetooth, USB o red), comando (ESC/POS o TSPL) y flujo de reimpresión.

## 9. Seguridad y respaldos

- La PWA solo conoce `VITE_API_URL`; nunca debe contener la service role key de Supabase ni
  credenciales de la base.
- Las credenciales viven en Render y en el `.env` local, nunca en Git.
- HTTPS es obligatorio para la PWA y para no enviar ventas en claro.
- La spec 001 no tiene autenticación. Antes de abrir la app a un negocio real hay que proteger
  administración, cambios de precios y endpoints de escritura.
- El free tier no debe ser la única copia: programar `pg_dump` o exportaciones periódicas.
  Los planes pagados de Supabase incluyen respaldos administrados.

## 10. Decisiones pendientes

1. **Impresora:** Bluetooth, USB o red. De esto depende si hace falta APK.
2. **Costo:** aceptar cold starts y pausas del free tier, o pagar ~$7–32/mes desde el inicio.
3. **Dominio:** usar subdominios gratis o comprar uno propio.
4. **Autenticación:** definirla antes de exponer la app fuera del mostrador.
5. **APK:** solo si la impresora u otra función nativa lo exige.

## 11. Referencias

- Supabase Pricing: https://supabase.com/pricing
- Render Pricing: https://render.com/pricing
- Render Free: https://render.com/docs/free
- Cloudflare Pages Limits: https://developers.cloudflare.com/pages/platform/limits
- Vite PWA: https://vite-pwa-org.netlify.app/
