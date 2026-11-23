# Spec 006 — Corte de caja y reportes

- Estado: cerrada por ratificación del dueño (2026-11-22)
- Spec activa: no
- Depende de: `specs/002-venta-offline`, `specs/004-sincronizacion` y `docs/constitution.md` v1.0
- Fecha: 2026-11-22

## Contexto y objetivo

Las ventas ya se cobran y se sincronizan, pero no hay forma de cerrar el día ni de ver cuánto
se vendió. Esta iteración agrega un corte diario local y un reporte por método de pago,
producto y categoría, más una conciliación contra las ventas que ya llegaron al backend.

El corte es del **día de negocio** en `America/Mexico_City`; una venta de las 23:50 pertenece
a ese día. Se calcula con los tickets de IndexedDB, no depende de la red, y se guarda como una
foto que se puede recalcular si aparece una venta nueva del mismo día.

## Usuarios / actores

- **Cajero/a**: cierra la caja al terminar el día y captura fondo inicial y efectivo contado.
- **Dueño/a**: consulta el reporte y detecta diferencias contra el backend.

## Requisitos funcionales (EARS)

- **RF-006-01**: CUANDO se abre la pestaña Corte, EL SISTEMA calcula el reporte del día de
  negocio actual desde los tickets locales: total vendido, número de tickets, ticket promedio,
  desglose por método de pago, producto y categoría.
- **RF-006-02**: EL REPORTE suma piezas para productos por pieza y gramos para productos por
  kilo; el dinero se muestra en centavos formateados y nunca en `float`.
- **RF-006-03**: EL CAJERO captura fondo inicial y efectivo contado; EL SISTEMA calcula el
  efectivo esperado (fondo + ventas en efectivo) y la diferencia (contado − esperado).
- **RF-006-04**: CUANDO el cajero pulsa «Cerrar caja», EL SISTEMA guarda una foto del corte del
  día con totales, desglose y montos capturados; si ya existe, la actualiza.
- **RF-006-05**: SI aparecen tickets nuevos después del cierre, ENTONCES la pestaña avisa y
  ofrece «Recalcular», conservando el fondo y el efectivo contado y actualizando la diferencia.
- **RF-006-06**: EL CORTE muestra cuántos tickets del día siguen `pending` o `failed` en el
  outbox, es decir, cuánto falta por sincronizar.
- **RF-006-07**: SI hay red, EL SISTEMA consulta `GET /reports/daily?business_date=...` y
  muestra el total local, el total del backend y sus diferencias; si falla, muestra «sin
  conciliación» sin bloquear el corte.
- **RF-006-08**: EL BACKEND devuelve el reporte del día sumando solo las ventas de `sales` con
  ese `business_date`, con desglose por método de pago, producto y categoría.
- **RF-006-09**: EL CORTE no modifica tickets, outbox ni el cobro; solo lee y guarda su propia
  tabla local `cashCuts`.
- **RF-006-10**: LA PESTAÑA Corte conserva las áreas táctiles de 48 px y se puede usar a 360 px
  sin scroll horizontal.

## Casos límite

- Sin ventas: el reporte va en cero y se puede cerrar caja con fondo y efectivo contado.
- Corte cerrado y luego una venta nueva: aviso de ventas nuevas y «Recalcular».
- Ticket `failed`: cuenta en el reporte local y en «sin sincronizar»; la conciliación muestra
  una diferencia que se explica por ese ticket.
- Backend caído o sin red: el corte local funciona; la conciliación se omite.
- Cambio de día con la pestaña abierta: el reporte pasa al nuevo día y el corte anterior queda
  en el historial.
- Caja con sobrante o faltante: la diferencia se muestra con signo y texto, no solo color.
- Dos toques en «Cerrar caja»: el guardia de guardado evita duplicados.

## Fuera de alcance

- Turnos fijos; esta iteración usa un cierre manual por día.
- Propinas, arqueo por denominaciones, edición o anulación de tickets.
- Exportar a CSV/PDF, imprimir (009) y envío de reportes.
- Autenticación o PIN para cerrar caja (008/010).

## Decisiones

- **D-006-01**: cierre manual por día de negocio. Aprobado el 2026-11-22.
- **D-006-02**: corte completo con fondo inicial, efectivo contado y diferencia. Aprobado el
  2026-11-22.
- **D-006-03**: la foto del corte se puede recalcular; conserva los montos capturados y
  actualiza totales y diferencia. Aprobado el 2026-11-22.
- **D-006-04**: conciliación remota contra `sales`; el backend no revalida el corte. Aprobado
  el 2026-11-22.
- **D-006-05**: Dexie v4 agrega solo la tabla `cashCuts` (`businessDate` como llave); no toca
  las tablas existentes.
- **D-006-06**: el corte local es la fuente de verdad del mostrador; el backend solo sirve para
  comparar lo ya sincronizado.

## Criterios de aceptación

1. Con dos ventas (una en efectivo y una con tarjeta), el corte muestra el total correcto y el
   desglose por método.
2. Capturar fondo y efectivo contado muestra el esperado y la diferencia exacta en centavos.
3. Cerrar y recargar la app conserva el corte del día; una venta nueva permite recalcularlo.
4. La conciliación muestra la diferencia cuando hay tickets sin sincronizar y se oculta sin
   romper nada cuando la API no responde.
5. `lint`, `typecheck`, `test`, `build`, `seed:check`, `pytest` y `ruff` en verde.
