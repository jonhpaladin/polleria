# Specs — hoja de ruta

Una spec a la vez (constitución, P5). Ninguna carpeta se crea hasta que su turno llegue y
sus dudas estén resueltas; aquí solo se fija el orden y el porqué.

| Orden | Spec | Objetivo | Depende de | Estado |
|---|---|---|---|---|
| 001 | `001-fundamentos-catalogo` | Andamiaje + catálogo de solo lectura, offline | constitución | cerrada por ratificación del dueño |
| 002 | `002-venta-offline` | Carrito, venta offline y ticket local persistido en <50 ms | 001 | cerrada por ratificación del dueño (2026-11-13) |
| 003 | `003-catalogo-visual` | Catálogo táctil con imagen de producto y estilo uniforme | 002 | pospuesta (2026-11-22) |
| 004 | `004-sincronizacion` | Outbox con backoff e idempotencia por `client_order_uuid` | 002 | cerrada por ratificación del dueño (2026-11-22) |
| 005 | `005-venta-tactil` | Modal de producto y carrito en pestaña con icono flotante | 002 | cerrada por ratificación del dueño (2026-11-22) |
| 006 | `006-corte-reportes` | Corte de caja y reportes agrupados por día local | 002 (+004 para consolidar) | cerrada por ratificación del dueño (2026-11-22) |
| 007 | `007-catalogo-real` | Catálogo real del local y diseño de la marca | 002, 005, 006 | cerrada por ratificación del dueño (2026-11-23) |
| 008 | `008-precios-admin` | Edición de precios, publicación y seguridad de la API | 001 (+004 para propagar) | cerrada por ratificación del dueño (2026-11-23); claves de Render como paso operativo |
| 009 | `009-impresion` | Ticket ESC/POS y etiquetas TSPL | 002 | borrador |
| 010 | `010-multidispositivo` | Concurrencia entre cajas y roles con PIN | 004 | condicional |
| 011 | `011-respaldo` | Respaldo y restauración de los datos locales | 002, 004, 006 | cerrada por ratificación del dueño (2026-11-23); verificación de campo pendiente |
| 012 | `012-anulaciones` | Anulación y devolución de tickets con auditoría | 002, 004 | activa (implementada; pendiente validación) |
| 013 | `013-historial-ventas` | Historial de ventas y exportación CSV | 006 | borrador |

Orden de trabajo acordado (2026-11-23): **011 respaldo → 003 imágenes → 012 anulaciones → 009
impresión → 013 historial → 010 multidispositivo**.

## 002 — Venta offline

**Objetivo**: registrar una venta sin red. Carrito táctil, venta por pieza y por kilo con
atajos `0.500/1.000/1.500/2.000` kg y ajustes de ±250 g, **elección de precio al agregar**
(lista, promoción, mayoreo o manual), métodos de pago informativos (efectivo por defecto,
tarjeta o transferencia), totales en centavos y ticket persistido en IndexedDB con
`client_order_uuid`. La línea del ticket congela el precio elegido, aunque el catálogo cambie
después.

**Fuera de alcance**: sincronizar (004), imprimir (009), anular con auditoría, descuentos,
propinas, redondeo, procesamiento bancario, PIN/roles y precios ligados a un cliente
registrado (008).

**Decisión**: el precio manual se captura sin autorización (D-002-06); PIN, roles y
autenticación se revisan en una spec posterior.

## 003 — Catálogo visual

**Estado**: pospuesta el 2026-11-22 por consumo de contexto y por falta de imágenes aprobadas.
Se retoma cuando el dueño entregue el set por SKU; no hay código de 003 todavía.

**Objetivo**: que el cajero reconozca cada producto por su imagen. Cada tarjeta activa lleva una
foto de estudio como fondo, con estilo uniforme en todo el set, servida desde el precache y con
respaldo por inicial si falta el archivo. La imagen se resuelve por SKU, sin cambios de backend
ni de Dexie.

**Fuera de alcance**: subir o editar imágenes desde la app, fotos reales del local, iconos de
categoría, búsqueda, favoritos, sincronización (004) e impresión (009).

**Decisiones**: foto de estudio generada con IA y muestra aprobada como referencia; 26 SKU
provisionales reemplazables por SKU; WebP 512×512, ≤60 KB cada una; 2/3/4 columnas.

**Duda abierta**: ninguna bloqueante. La lista real de productos reemplazará las imágenes por
SKU.

## 004 — Sincronización e idempotencia

**Estado**: cerrada por ratificación del dueño (2026-11-22). Migración `0002_sales` aplicada a
Supabase y API desplegada en Render; el dueño validó el flujo offline→online en la PWA y el
smoke test de `/sync` pasó contra la API real.

**Objetivo**: drenar el outbox en segundo plano con backoff exponencial, reintentos
seguros y `POST /sync` idempotente. Un fallo de red no pierde ni duplica tickets.

**Fuera de alcance**: resolución de conflictos de catálogo, multi-sucursal.

**Dudas abiertas**: ninguna. Resueltas el 2026-11-22: un 4xx de validación deja el ticket en
`failed` con reintento manual; el backend guarda el ticket como snapshot; el catálogo sigue
por `GET /catalog` y `/sync` solo transporta ventas.

## 005 — Venta táctil

**Estado**: cerrada por ratificación del dueño (2026-11-22). El dueño validó la hoja de
producto, la pestaña Carrito y el icono flotante en celular/tablet.

**Objetivo**: que el cajero configure el producto en una hoja de detalle (peso o cantidad y
precio) y revise la venta en una pestaña de carrito, sin que ningún panel tape la rejilla.

**Fuera de alcance**: imágenes (003), pago por línea, reportes (006), impresión (009),
multidispositivo (010).

**Decisiones**: un método de pago por venta en el carrito (D-005-01); icono flotante con
contador y pestaña Carrito (D-005-02); hoja inferior en celular y diálogo centrado en laptop
(D-005-03); precio manual y quitar línea en el carrito (D-005-04).

**Dudas abiertas**: ninguna.

## 006 — Corte de caja y reportes

**Estado**: cerrada por ratificación del dueño (2026-11-22). El endpoint se verificó con ventas
reales y el dueño validó la pestaña Corte, el menú desplazable y el cierre del día.

**Objetivo**: corte por turno/día y reportes de ventas agrupados por fecha local
`America/Mexico_City`, calculados desde datos locales y conciliados con el backend.

**Fuera de alcance**: contabilidad, exportación fiscal, gráficas elaboradas.

**Dudas abiertas**: ninguna. Resueltas el 2026-11-22: cierre manual por día, corte completo con
conteo de efectivo, foto recalculable y conciliación remota.

## 007 — Catálogo real y diseño

**Estado**: cerrada (2026-11-23). 29 productos activos; 18 llevan $100.00 temporal hasta que el
dueño los ajuste.

**Objetivo**: sustituir el catálogo provisional por los productos reales de la pollería de pollo
crudo (cortes, congelados, moles, preparados, complementos y bebidas) y alinear la identidad
visual con el letrero del local: rojo, amarillo y blanco, nombre «El Wero».

**Fuera de alcance**: imágenes por producto (003), inventario, costos, proveedores y reportes.

**Decisiones**: pollo, moles, preparados y huevo por kilo; congelados, papas, dedos y bebidas por
pieza; los productos sin precio confirmado usan $100 temporal; los 17 provisionales quedaron
inactivos; mascota SVG y tarjetas de texto hasta 003.

## 008 — Administración de precios y seguridad

**Estado**: cerrada por ratificación del dueño (2026-11-23). Implementada y desplegada; la
configuración de `ADMIN_KEY` y `DEVICE_KEY` en Render queda como paso operativo.

**Objetivo**: desde la laptop, editar precios por nivel (lista, promoción, mayoreo), activar o
desactivar productos y publicar el catálogo a las cajas sin tocar la base a mano. En la misma
iteración se cierra el acceso público a la base y a los endpoints sensibles.

**Fuera de alcance**: alta de productos, precios por cliente, historial de cambios, inventario,
costos, proveedores y facturación.

**Seguridad aplicada (2026-11-23)**: RLS habilitado en las 7 tablas de `public`, cero permisos
para `anon`/`authenticated` y la migración `0003_seguridad` prepara el rol `polleria_api`. La API
exige clave de administración para escribir y clave del local para sincronizar y ver reportes.
Los pasos pendientes están en `docs/seguridad.md`.

**Decisiones**: precios base y activar/desactivar; clave de admin + clave del local; publicar
reemplaza la hoja del día en curso; sin historial de precios en esta iteración.

## 009 — Impresión

**Objetivo**: ticket en impresora térmica 58/80 mm por ESC/POS y etiquetas por TSPL, con
`--kiosk-printing` en Chromium.

**Fuera de alcance**: impresión desde iOS, servidor de impresión.

**Dudas abiertas**: ¿modelo de impresora? ¿USB, Bluetooth o red? ¿se imprime antes o
después de confirmar el cobro?

## 010 — Multidispositivo (condicional)

**Objetivo**: dos o más cajas operando a la vez sin pisarse precios ni folios. Solo se abre
si el local realmente lo necesita; hoy la concurrencia está sin definir.

**Dudas abiertas**: ¿folios por dispositivo o globales? ¿qué caja manda el catálogo?
¿se requiere un dispositivo "servidor" local?

## 011 — Respaldo y restauración

**Estado**: cerrada por ratificación del dueño (2026-11-23); implementada y desplegada. La prueba
de descarga/restauración en la tablet queda en la verificación de campo.

**Objetivo**: descargar un JSON con tickets, ventas pendientes, cortes y hojas de precios, y
restaurarlo en la misma u otra tablet sin red. La restauración fusiona y nunca borra lo existente.

**Fuera de alcance**: respaldo en la nube, cifrado con contraseña, sincronizar cortes con el
backend, fusionar catálogo y resolver folios entre dispositivos (010).

**Decisiones**: JSON local descargado por el usuario; fusión por llave con prioridad a lo actual;
recordatorio a los 7 días; pestaña «Respaldo» sin clave de administración; sin cambio de Dexie.

## 012 — Anulación de tickets

**Estado**: activa (2026-11-23); implementada y desplegada, pendiente la validación de campo.

**Objetivo**: anular un ticket completo del día con motivo, PIN del dueño y sincronización al
backend, sin borrar la venta original y excluyéndola de los reportes y del corte.

**Fuera de alcance**: devoluciones parciales, tickets de días anteriores (013), reembolso
procesado por el sistema, borrar tickets y roles con nombre de usuario (010).

**Decisiones**: ticket completo; PIN local de 4-6 dígitos con hash y bloqueo; solo el día en
curso; la venta se conserva como anulada; el backend filtra las anuladas del reporte diario.

## Reglas para abrir la siguiente spec

1. La anterior está validada (paso 7) y `MEMORY.md` actualizado.
2. Se escriben los RF en EARS y se resuelven las dudas; nada de `[NECESITA ACLARACIÓN]`
   bloqueante al empezar el plan.
3. El plan reutiliza los contratos de dinero, fecha e idempotencia ya fijados; si necesita
   cambiarlos, enmienda primero la constitución.
