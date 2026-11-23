# Spec 005 — Venta táctil con modal de producto y carrito en pestaña

- Estado: activa (aprobada 2026-11-22)
- Spec activa: sí
- Depende de: `specs/002-venta-offline` y `docs/constitution.md` v1.0
- Fecha: 2026-11-22

## Contexto y objetivo

En celular, el carrito actual es un panel `sticky` al fondo que crece con cada línea. Al tocar
varios productos tapa casi toda la rejilla y el cajero ya no puede desplazarse para elegir
otros. Además, tocar una tarjeta agrega el producto con 1 kg o 1 pieza y precio normal sin
preguntar, así que corregir peso o precio obliga a editar la línea después.

Esta iteración separa las dos tareas:

1. **Elegir producto**: tocar una tarjeta abre una hoja de detalle con peso/cantidad y precio.
   Solo «Agregar» modifica el carrito. La rejilla queda libre y desplazable.
2. **Revisar y cobrar**: el carrito vive en su propia pestaña, accesible con un icono flotante
   pequeño que muestra cuántas líneas hay. Ahí se edita, se quita y se elige el pago.

No hay cambios de backend, `/sync` ni Dexie. El ticket y el outbox siguen igual.

## Usuarios / actores

- **Cajero/a de mostrador**: usa celular o tablet con manos ocupadas y prisa.

## Requisitos funcionales (EARS)

- **RF-005-01**: CUANDO el cajero toca una tarjeta de producto, EL SISTEMA abre la hoja de
  detalle y NO agrega nada al carrito.
- **RF-005-02**: LA HOJA muestra nombre, categoría, unidad, precios del día disponibles y los
  controles de cantidad: atajos de 0.500/1.000/1.500/2.000 kg y ±250 g para `kg`, o un
  contador de piezas para `piece`.
- **RF-005-03**: LA HOJA permite elegir entre precio normal, promoción y mayoreo cuando la
  hoja del día tenga ese nivel; el valor inicial es el precio normal.
- **RF-005-04**: CUANDO el cajero pulsa «Agregar», EL SISTEMA valida que la hoja sea de hoy,
  crea la línea con el peso/cantidad y el precio elegidos, cierra la hoja y actualiza el
  contador del icono flotante.
- **RF-005-05**: SI la hoja del día no está cargada, no es de hoy o falta el producto,
  ENTONCES la hoja muestra el motivo y deshabilita «Agregar» sin modificar el carrito.
- **RF-005-06**: LA HOJA se cierra con la X, tocando el fondo o con Escape; mantiene el foco
  dentro, devuelve el foco a la tarjeta de origen y permite scroll interno si el contenido no
  cabe en la pantalla.
- **RF-005-07**: EL SISTEMA muestra un icono flotante de carrito con el número de líneas en
  las pestañas Venta y Precios del día; al tocarlo abre la pestaña Carrito.
- **RF-005-08**: LA PESTAÑA Carrito lista las líneas y permite ajustar peso o cantidad, cambiar
  el nivel de precio, capturar precio manual, quitar líneas y elegir el método de pago de la
  venta.
- **RF-005-09**: CUANDO el cajero confirma la venta, EL SISTEMA conserva el cobro local
  atómico de 002, vacía el carrito y muestra total, método y folio; ofrece «Volver a vender».
- **RF-005-10**: NINGÚN panel del carrito se muestra fijo sobre la rejilla de productos; el
  carrito solo ocupa la pestaña Carrito.
- **RF-005-11**: LA REJILLA conserva una columna en celular, dos en tablet y tres en laptop,
  con áreas táctiles de al menos 48 px.
- **RF-005-12**: LOS CAMBIOS de pestaña o de hoja no pierden el carrito: el estado sigue en
  `useSale`; no se toca IndexedDB ni el esquema Dexie.
- **RF-005-13**: EL SISTEMA usa textos en español, `aria-pressed` en pestañas y precios,
  `aria-live` en el contador y `role="dialog"` con `aria-modal` en la hoja.

## Casos límite

- Producto sin precio hoy: la hoja explica que falta la hoja del día y no agrega.
- Cambio de día con la hoja abierta: «Agregar» revalida y rechaza con el mensaje de 002.
- Pieza repetida con el mismo precio: se suma a la línea existente, como hoy.
- Kilo repetido: se crea otra línea; el peso se ajusta en el carrito.
- Carrito vacío: la pestaña muestra un estado vacío y un botón para volver a vender.
- Quitar la última línea: el icono flotante desaparece.
- Error al confirmar: el carrito y sus líneas se conservan; el mensaje aparece en la pestaña.
- Doble toque en «Agregar» o «Confirmar»: el guardia de vuelo evita duplicados.
- Pantalla de 360 px de ancho: la hoja ocupa el ancho, con scroll interno y X visible.

## Fuera de alcance

- Imágenes de producto (spec 003, pospuesta) y cambios de catálogo.
- Reportes y corte (006), precios administrativos (007), impresión (008), multidispositivo.
- Pago por línea, propinas, descuentos o facturación.
- Cambios al ticket, al outbox, a `/sync` o a Dexie.

## Decisiones

- **D-005-01**: un solo método de pago por venta, elegido en la pestaña Carrito. Mantiene el
  contrato actual del ticket y de `/sync`.
- **D-005-02**: el carrito es una pestaña propia y se abre con un icono flotante con contador.
- **D-005-03**: hoja inferior en celular y diálogo centrado en pantallas grandes; se implementa
  con `<dialog>` nativo para foco, Escape y `aria-modal`.
- **D-005-04**: la hoja ajusta peso/cantidad y nivel de precio; el precio manual y el quitar
  línea quedan en el carrito.
- **D-005-05**: el carrito deja de ser `sticky`; ningún panel tapa la rejilla.
- **D-005-06**: el icono flotante muestra el número de líneas, no el total, para ocupar poco.
- **D-005-07**: tras cobrar, el mensaje de éxito se queda en la pestaña Carrito con el botón
  «Volver a vender».

## Criterios de aceptación

1. En 360 px, tocar un producto abre la hoja sin agregar ni tapar la rejilla; al cerrarla se
   puede seguir desplazando y tocando otros productos.
2. Elegir 0.500 kg y promoción agrega la línea con el importe correcto en centavos.
3. El icono flotante muestra 3 con tres líneas y abre la pestaña Carrito.
4. Editar, cambiar precio y quitar líneas actualiza el total; confirmar sigue cobrando sin red.
5. `lint`, `typecheck`, `test` y `build` en verde, sin cambios de backend ni de Dexie.
