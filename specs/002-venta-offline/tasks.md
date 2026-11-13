# Tareas 002 — Venta offline y ticket local

Spec: `specs/002-venta-offline/spec.md` · Plan: `plan.md`
Regla: una tarea se marca `[x]` solo al cumplir la puerta de calidad de la constitución.
Cada tarea debe poder completarse en aproximadamente 20–30 minutos.

## Fase 0 — Precios del día y contratos de dominio

- [x] **T-002-00 · Definir hoja local de precios**
  Crear `DailyPrice`, `dailyPrices` y las reglas de copia del último día disponible.
  Hecho cuando: normal, promoción y mayoreo son opcionales por producto y fecha; una hoja
  existente no se sobreescribe.
  RF: RF-002-20…25

- [x] **T-002-00b · Construir funciones puras de precios diarios**
  Implementar apertura automática, copia, alta de productos nuevos y selección de precio.
  Hecho cuando: no se usa reloj global, `toISOString()` ni IndexedDB dentro de las funciones;
  los casos de día nuevo y hoja existente tienen tests.
  RF: RF-002-20…24

- [x] **T-002-00c · Construir la tabla Precios del día**
  Crear `DailyPricesTab` con campos en español para precio normal, promoción y mayoreo.
  Hecho cuando: la tabla carga sin red, guarda localmente, muestra errores junto a los campos
  y conserva cambios al refrescar el catálogo.
  RF: RF-002-20…25

## Fase 1 — Contratos y dominio puro

- [x] **T-002-01 · Definir tipos de venta**
  Crear `sale.ts` con `Grams`, `PaymentMethod`, `PriceSource`, `TicketLine`, `LocalTicket`
  y `TicketWire`. Hecho cuando: TypeScript rechaza unidades o fuentes desconocidas y los
  nombres de código están en inglés.
  RF: RF-002-01…19

- [x] **T-002-02 · Validar gramos y formato de peso**
  Crear `weight.ts` con enteros de 250 a 20,000 gramos, atajos y presentación en español.
  Hecho cuando: 250, 500, 1000, 1500 y 2000 son válidos; cero, negativos y topes inválidos
  se rechazan; no se usa kilo decimal en cálculos.
  RF: RF-002-02…04

- [x] **T-002-03 · Calcular importes por pieza y kilo**
  Crear funciones puras para importe de línea y total, con redondeo half-up en el límite.
  Hecho cuando: los casos 150.00/kg × 500 g y 99.99/kg × 250 g pasan sin float.
  RF: RF-002-01…08

- [x] **T-002-04 · Calcular día de negocio**
  Crear `businessDate` con `America/Mexico_City` y fixture de medianoche.
  Hecho cuando: no usa `toISOString()` ni `new Date("YYYY-MM-DD")` para la clave del día.
  RF: RF-002-16

- [x] **T-002-05 · Validar precio manual**
  Crear `validateManualPrice` reutilizando el contrato de dinero de 001.
  Hecho cuando: cero, negativos, tres decimales, números JSON y texto inválido se rechazan;
  el precio válido queda en centavos enteros.
  RF: RF-002-06, RF-002-07

- [x] **T-002-06 · Crear reducer puro del carrito**
  Implementar alta, acumulación de piezas, líneas por kilo, quitar, peso y cambio de precio.
  Hecho cuando: el reducer no toca DOM, IndexedDB, fetch ni reloj global; el refresco del
  catálogo no repricia líneas abiertas.
  RF: RF-002-01…08

## Fase 2 — Persistencia local

- [x] **T-002-07 · Diseñar snapshot y wire del ticket**
  Implementar `buildTicket`, `validateTicket` y `toTicketWire`.
  Hecho cuando: el snapshot congela producto, unidad, precio, total y fecha; el wire usa
  dinero string, gramos enteros y claves snake_case.
  RF: RF-002-06, RF-002-12, RF-002-16

- [x] **T-002-08 · Migrar Dexie v1 a v2**
  Agregar `tickets` y `outbox` sin alterar `categories`, `products` ni `meta`.
  Hecho cuando: una base v1 con catálogo sobrevive la apertura v2 y las tablas nuevas están
  disponibles sin borrar datos.
  RF: RF-002-15

- [x] **T-002-09 · Persistir ticket y outbox atómicamente**
  Crear `ticketRepository.ts` con una transacción que escriba ambas filas.
  Hecho cuando: un fallo no deja ticket sin outbox ni outbox sin ticket y el carrito sigue
  intacto.
  RF: RF-002-12, RF-002-13

- [x] **T-002-10 · Prevenir doble confirmación local**
  Implementar candado de UI y reutilización segura del UUID durante un mismo intento.
  Hecho cuando dos acciones consecutivas no crean dos tickets ni dos outbox.
  RF: RF-002-14

- [x] **T-002-11 · Probar persistencia y migración**
  Añadir tests de IndexedDB, cuota/error simulado, esquema futuro y reapertura.
  Hecho cuando el catálogo se conserva y los tickets confirmados sobreviven una recarga.
  RF: RF-002-13, RF-002-15, RF-002-18

## Fase 3 — Interfaz de mostrador

- [x] **T-002-12 · Hacer interactiva la tarjeta de producto**
  Convertir el área de agregar en control semántico accesible sin botones anidados.
  Hecho cuando un toque agrega pieza o 1000 g y el teclado permite activarlo.
  RF: RF-002-01, RF-002-02

- [x] **T-002-13 · Construir carrito visible**
  Crear `Cart` y `CartLine` con edición, quitar, cantidades, peso y total.
  Hecho cuando el carrito sigue visible en 360 px, no hay scroll horizontal y cada control
  mide al menos 48 px.
  RF: RF-002-08, RF-002-18

- [x] **T-002-14 · Agregar controles de peso**
  Crear `WeightControls` con atajos y ±250 g, incluidos los estados de límite.
  Hecho cuando el peso mostrado coincide con los gramos persistidos y los topes se deshabilitan.
  RF: RF-002-02…04

- [x] **T-002-15 · Agregar selector de niveles de precio**
  Mostrar lista, promoción y mayoreo únicamente cuando existan en el producto.
  Hecho cuando cambiar de nivel solo afecta la línea seleccionada y el carrito conserva el
  precio congelado ante un refresco del catálogo.
  RF: RF-002-05

- [x] **T-002-16 · Agregar selector de método de pago**
  Crear `PaymentSelector` con efectivo por defecto y cambio rápido a tarjeta o transferencia.
  Hecho cuando el método se guarda en el ticket sin campos de dinero, banco o referencia.
  RF: RF-002-09, RF-002-10

- [x] **T-002-17 · Integrar botón de confirmar**
  Crear `CheckoutButton` con estados vacío, guardando, error y éxito.
  Hecho cuando no hace fetch, confirma solo después de `complete`, limpia el carrito y
  muestra un aviso en español con total, método y folio.
  RF: RF-002-11…18

## Fase 4 — Precio manual y decisión de autorización

- [x] **T-002-18 · Definir política de autorización del precio manual**
  El dueño decidió (2026-11-13) captura libre sin autorización; el riesgo queda aceptado y
  documentado en D-002-06. No se agrega PIN, roles ni autenticación.
  Hecho cuando la política queda escrita en la spec y se define quién puede exponer el control.
  RF: RF-002-06, RF-002-07

- [x] **T-002-19 · Implementar captura manual según la decisión aprobada**
  Captura en línea dentro de `CartLine` (sin diálogo ni PIN), validación con `validateManualPrice`
  y `priceSource: "manual"`; el precio de catálogo original se conserva.
  Hecho cuando el precio unitario se guarda junto al precio de catálogo original y todos los
  mensajes de UI están en español.
  RF: RF-002-06, RF-002-07

## Fase 5 — Calidad y cierre

- [x] **T-002-20 · Completar tests del dominio**
  Cubrir reducer, precios, gramos, total, pago, fechas, wire y casos límite.
  Hecho cuando `npm run test` pasa y no hay cálculo de dinero/peso con float.
  RF: RF-002-01…19

- [x] **T-002-21 · Revisión de accesibilidad y UI**
  Revisar controles, foco, labels, mensajes vivos y layout en 360/768/1280.
  Hecho cuando la revisión de interfaz no deja hallazgos bloqueantes y la interfaz queda en
  español.
  RF: RF-002-08, RF-002-18

- [ ] **T-002-22 · Guion manual offline**
  Probar en celular/tablet instalada: agregar, editar, confirmar sin red, recargar y verificar
  que el ticket sobreviva; medir la confirmación después de IndexedDB `complete`.
  Hecho cuando el resultado queda documentado sin afirmar una cifra no medida.
  RF: RF-002-12, RF-002-13, RF-002-18

- [x] **T-002-23 · Gate de calidad y memoria**
  Ejecutar lint, typecheck, tests y build; revisar diff; actualizar `MEMORY.md`.
  Hecho cuando todos pasan, no hay secretos y el contrato queda listo para 003.
  RF: —
