# Specs — hoja de ruta

Una spec a la vez (constitución, P5). Ninguna carpeta se crea hasta que su turno llegue y
sus dudas estén resueltas; aquí solo se fija el orden y el porqué.

| Orden | Spec | Objetivo | Depende de | Estado |
|---|---|---|---|---|
| 001 | `001-fundamentos-catalogo` | Andamiaje + catálogo de solo lectura, offline | constitución | cerrada por ratificación del dueño |
| 002 | `002-venta-offline` | Carrito, venta offline y ticket local persistido en <50 ms | 001 | cerrada por ratificación del dueño (2026-11-13) |
| 003 | `003-catalogo-visual` | Catálogo táctil con imagen de producto y estilo uniforme | 002 | activa |
| 004 | `004-sincronizacion` | Outbox con backoff e idempotencia por `client_order_uuid` | 002 | borrador |
| 005 | `005-corte-reportes` | Corte de caja y reportes agrupados por día local | 002 (+004 para consolidar) | borrador |
| 006 | `006-precios-admin` | Edición de precios y publicación a los dispositivos | 001 (+004 para propagar) | borrador |
| 007 | `007-impresion` | Ticket ESC/POS y etiquetas TSPL | 002 | borrador |
| 008 | `008-multidispositivo` | Concurrencia entre cajas y roles con PIN | 004 | condicional |

## 002 — Venta offline

**Objetivo**: registrar una venta sin red. Carrito táctil, venta por pieza y por kilo con
atajos `0.500/1.000/1.500/2.000` kg y ajustes de ±250 g, **elección de precio al agregar**
(lista, promoción, mayoreo o manual), métodos de pago informativos (efectivo por defecto,
tarjeta o transferencia), totales en centavos y ticket persistido en IndexedDB con
`client_order_uuid`. La línea del ticket congela el precio elegido, aunque el catálogo cambie
después.

**Fuera de alcance**: sincronizar (004), imprimir (007), anular con auditoría, descuentos,
propinas, redondeo, procesamiento bancario, PIN/roles y precios ligados a un cliente
registrado (006).

**Decisión**: el precio manual se captura sin autorización (D-002-06); PIN, roles y
autenticación se revisan en una spec posterior.

## 003 — Catálogo visual

**Objetivo**: que el cajero reconozca cada producto por su imagen. Cada tarjeta activa lleva una
foto de estudio como fondo, con estilo uniforme en todo el set, servida desde el precache y con
respaldo por inicial si falta el archivo. La imagen se resuelve por SKU, sin cambios de backend
ni de Dexie.

**Fuera de alcance**: subir o editar imágenes desde la app, fotos reales del local, iconos de
categoría, búsqueda, favoritos, sincronización (004) e impresión (007).

**Decisiones**: foto de estudio generada con IA y muestra aprobada como referencia; 26 SKU
provisionales reemplazables por SKU; WebP 512×512, ≤60 KB cada una; 2/3/4 columnas.

**Duda abierta**: ninguna bloqueante. La lista real de productos reemplazará las imágenes por
SKU.

## 004 — Sincronización e idempotencia

**Objetivo**: drenar el outbox en segundo plano con backoff exponencial, reintentos
seguros y `POST /sync` idempotente. Un fallo de red no pierde ni duplica tickets.

**Fuera de alcance**: resolución de conflictos de catálogo, multi-sucursal.

**Dudas abiertas**: ¿qué se hace con un ticket que el backend rechaza por dato inválido
(dead letter)? ¿se sincroniza el catálogo en el mismo canal o en uno aparte?

## 005 — Corte de caja y reportes

**Objetivo**: corte por turno/día y reportes de ventas agrupados por fecha local
`America/Mexico_City`, calculados desde datos locales y conciliados con el backend.

**Fuera de alcance**: contabilidad, exportación fiscal, gráficas elaboradas.

**Dudas abiertas**: ¿turnos fijos o botón "cerrar caja"? ¿qué se hace con ventas
sincronizadas después del corte? ¿propinas se reportan aparte?

## 006 — Administración de precios

**Objetivo**: desde la laptop, editar precios por nivel (lista, promoción, mayoreo),
activar/desactivar productos, registrar clientes con precios negociados y publicar el
catálogo a las cajas sin tocar la base a mano.

**Fuera de alcance**: inventario, costos, proveedores, facturación.

**Dudas abiertas**: ¿un precio negociado vive en el cliente (producto + cliente) o se
captura al vuelo en cada venta? ¿quién puede editar (PIN)? ¿vigencia programada e historial
de cambios?

## 007 — Impresión

**Objetivo**: ticket en impresora térmica 58/80 mm por ESC/POS y etiquetas por TSPL, con
`--kiosk-printing` en Chromium.

**Fuera de alcance**: impresión desde iOS, servidor de impresión.

**Dudas abiertas**: ¿modelo de impresora? ¿USB, Bluetooth o red? ¿se imprime antes o
después de confirmar el cobro?

## 008 — Multidispositivo (condicional)

**Objetivo**: dos o más cajas operando a la vez sin pisarse precios ni folios. Solo se abre
si el local realmente lo necesita; hoy la concurrencia está sin definir.

**Dudas abiertas**: ¿folios por dispositivo o globales? ¿qué caja manda el catálogo?
¿se requiere un dispositivo "servidor" local?

## Reglas para abrir la siguiente spec

1. La anterior está validada (paso 7) y `MEMORY.md` actualizado.
2. Se escriben los RF en EARS y se resuelven las dudas; nada de `[NECESITA ACLARACIÓN]`
   bloqueante al empezar el plan.
3. El plan reutiliza los contratos de dinero, fecha e idempotencia ya fijados; si necesita
   cambiarlos, enmienda primero la constitución.
