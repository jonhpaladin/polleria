# Specs — hoja de ruta

Una spec a la vez (constitución, P5). Ninguna carpeta se crea hasta que su turno llegue y
sus dudas estén resueltas; aquí solo se fija el orden y el porqué.

| Orden | Spec | Objetivo | Depende de | Estado |
|---|---|---|---|---|
| 001 | `001-fundamentos-catalogo` | Andamiaje + catálogo de solo lectura, offline | constitución | cerrada por ratificación del dueño |
| 002 | `002-venta-offline` | Carrito, venta offline y ticket local persistido en <50 ms | 001 | activa |
| 003 | `003-sincronizacion` | Outbox con backoff e idempotencia por `client_order_uuid` | 002 | borrador |
| 004 | `004-corte-reportes` | Corte de caja y reportes agrupados por día local | 002 (+003 para consolidar) | borrador |
| 005 | `005-precios-admin` | Edición de precios y publicación a los dispositivos | 001 (+003 para propagar) | borrador |
| 006 | `006-impresion` | Ticket ESC/POS y etiquetas TSPL | 002 | borrador |
| 007 | `007-multidispositivo` | Concurrencia entre cajas y roles con PIN | 003 | condicional |

## 002 — Venta offline

**Objetivo**: registrar una venta sin red. Carrito táctil, venta por pieza y por kilo con
atajos `0.500/1.000/1.500/2.000` kg y ajustes de ±250 g, **elección de precio al agregar**
(lista, promoción, mayoreo o manual), métodos de pago informativos (efectivo por defecto,
tarjeta o transferencia), totales en centavos y ticket persistido en IndexedDB con
`client_order_uuid`. La línea del ticket congela el precio elegido, aunque el catálogo cambie
después.

**Fuera de alcance**: sincronizar (003), imprimir (006), anular con auditoría, descuentos,
propinas, redondeo, procesamiento bancario, PIN/roles y precios ligados a un cliente
registrado (005).

**Duda abierta**: política de autorización del precio manual; se resolverá en la tarea
T-002-18, sin agregar PIN ni roles mientras el dueño no lo defina.

## 003 — Sincronización e idempotencia

**Objetivo**: drenar el outbox en segundo plano con backoff exponencial, reintentos
seguros y `POST /sync` idempotente. Un fallo de red no pierde ni duplica tickets.

**Fuera de alcance**: resolución de conflictos de catálogo, multi-sucursal.

**Dudas abiertas**: ¿qué se hace con un ticket que el backend rechaza por dato inválido
(dead letter)? ¿se sincroniza el catálogo en el mismo canal o en uno aparte?

## 004 — Corte de caja y reportes

**Objetivo**: corte por turno/día y reportes de ventas agrupados por fecha local
`America/Mexico_City`, calculados desde datos locales y conciliados con el backend.

**Fuera de alcance**: contabilidad, exportación fiscal, gráficas elaboradas.

**Dudas abiertas**: ¿turnos fijos o botón "cerrar caja"? ¿qué se hace con ventas
sincronizadas después del corte? ¿propinas se reportan aparte?

## 005 — Administración de precios

**Objetivo**: desde la laptop, editar precios por nivel (lista, promoción, mayoreo),
activar/desactivar productos, registrar clientes con precios negociados y publicar el
catálogo a las cajas sin tocar la base a mano.

**Fuera de alcance**: inventario, costos, proveedores, facturación.

**Dudas abiertas**: ¿un precio negociado vive en el cliente (producto + cliente) o se
captura al vuelo en cada venta? ¿quién puede editar (PIN)? ¿vigencia programada e historial
de cambios?

## 006 — Impresión

**Objetivo**: ticket en impresora térmica 58/80 mm por ESC/POS y etiquetas por TSPL, con
`--kiosk-printing` en Chromium.

**Fuera de alcance**: impresión desde iOS, servidor de impresión.

**Dudas abiertas**: ¿modelo de impresora? ¿USB, Bluetooth o red? ¿se imprime antes o
después de confirmar el cobro?

## 007 — Multidispositivo (condicional)

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
