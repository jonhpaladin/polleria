# Tareas — Spec 005 · Venta táctil

Cada tarea se marca `[x]` solo con la puerta de calidad en verde (constitución, sección 5).

- [x] **T-005-01 · Selección de línea en el carrito**
  Agregar `LineSelection` a `cart.ts` y hacer que `addProduct` aplique peso, cantidad y nivel
  de precio. `useSale.addProduct` devuelve `boolean`.
  Hecho cuando los tests cubren 0.500 kg con promoción y 3 piezas con mayoreo.
  RF: RF-005-02, RF-005-03, RF-005-04

- [x] **T-005-02 · Hoja de producto**
  Crear `ProductSheet` con `<dialog>`, cabecera, precios, `WeightControls`, contador de piezas,
  total de línea y «Agregar».
  Hecho cuando abre sin agregar y agrega con la selección elegida.
  RF: RF-005-01…05

- [x] **T-005-03 · Cierre y accesibilidad de la hoja**
  Cerrar con X, fondo y Escape; devolver el foco a la tarjeta; scroll interno.
  Hecho cuando los tests de teclado y foco pasan.
  RF: RF-005-06, RF-005-13

- [x] **T-005-04 · Icono flotante del carrito**
  `CartFloatingButton` con contador, `aria-live` y etiqueta accesible; oculto sin líneas.
  Hecho cuando muestra el número correcto y abre el carrito.
  RF: RF-005-07, RF-005-13

- [x] **T-005-05 · Pestaña Carrito**
  Mover `Cart` a una pestaña sin `sticky`, con estado vacío, «Volver a vender» y el pago.
  Hecho cuando editar y quitar líneas actualiza el total sin tapar la rejilla.
  RF: RF-005-08…10

- [x] **T-005-06 · Cableado en App**
  Tres pestañas, hoja de producto, icono flotante y preservación del carrito al navegar.
  Hecho cuando el flujo venta → carrito → cobro → volver funciona en la UI.
  RF: RF-005-04, RF-005-07…09, RF-005-12

- [x] **T-005-07 · Tarjetas y textos**
  Cambiar el `aria-label` a «Ver …» y el mensaje del carrito vacío.
  Hecho cuando las tarjetas ya no prometen agregar y los tests lo reflejan.
  RF: RF-005-01, RF-005-13

- [x] **T-005-08 · Tests de componentes y estado**
  Cubrir hoja, icono, carrito, `useSale` y `cartReducer`.
  Hecho cuando `npm run test` pasa con los casos nuevos.
  RF: todos

- [x] **T-005-09 · Revisión visual táctil**
  Revisar 360/768/1280: rejilla desplazable, hoja con scroll, X y «Agregar» alcanzables,
  targets de 48 px.
  Hecho cuando la revisión queda registrada en `MEMORY.md`.
  RF: RF-005-10, RF-005-11

- [x] **T-005-10 · Cierre documental**
  Actualizar `AGENTS.md` (regla de UI), `MEMORY.md` y `specs/README.md`.
  Hecho cuando 005 queda cerrada y 006 toma el siguiente turno.
  RF: —
