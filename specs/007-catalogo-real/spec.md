# Spec 007 — Catálogo real y diseño de la marca

- Estado: activa (borrador con dudas por resolver)
- Spec activa: sí
- Depende de: `specs/002-venta-offline`, `specs/005-venta-tactil`, `specs/006-corte-reportes`
- Fecha: 2026-11-22

## Contexto y objetivo

El catálogo actual es provisional: 26 SKU con pollo asado, combos y precios inventados para
probar la venta. El local real es una **pollería de pollo crudo** con cortes, congelados, moles,
preparados y complementos. Las fotos del letrero y la vitrina muestran la operación real.

Esta iteración sustituye el catálogo por los productos del local y alinea la identidad visual
con el letrero: rojo, amarillo y blanco, nombre «El Wero». Los tickets ya cobrados conservan su
snapshot; cambiar el catálogo no los altera.

## Lo que se alcanza a leer en las fotos

### Categorías visibles

- **Pollo crudo / cortes**: pollo entero, pierna y muslo, alitas, milanesa, carne para
  hamburguesa, albóndigas.
- **Congelados**: nuggets, papas a la francesa, papas gajo, pollo KFC, dedos de queso.
- **Moles**: almendrado, pipián, mole dulce, poblano, ranchero.
- **Preparados / antojitos**: empanadas (pollo, jamón y queso, champiñón y queso), teppanyaki,
  a la jardinera, poblano, adobado.
- **Complementos**: huevo, tortillas, salsas, ensalada, papas, arroz.
- **Bebidas**: refresco, agua 600 ml, agua 1.5 L, jugo.

### Precios visibles en los carteles

| Producto / promoción | Precio visible | Nota |
|---|---|---|
| Pierna y muslo 2 kg | $99 | oferta por paquete |
| Pierna y muslo 3 kg | $135 | oferta por paquete |
| Carne para hamburguesa / albóndigas | $139 | unidad o kilo por confirmar |
| Empanadas (pollo, jamón y queso, champiñón) | $169 | unidad o kilo por confirmar |
| Teppanyaki / jardinera / poblano / adobado | $139 | unidad o kilo por confirmar |
| Huevo Guadalajara | $32 | presentación por confirmar |

Los carteles son ofertas, no la lista completa de precios. Todo lo demás queda como
`[POR CONFIRMAR]`.

## Requisitos funcionales (borrador)

- **RF-007-01**: EL CATÁLOGO local y el backend usan las categorías y productos reales del
  local, con SKU estables y sin combos ni pollo asado provisionales.
- **RF-007-02**: CADA producto declara su unidad (`kg` o `piece`) y sus precios de lista,
  promoción o mayoreo según la lista aprobada por el dueño.
- **RF-007-03**: LA SEMILLA reemplaza el catálogo provisional; los productos retirados quedan
  inactivos y dejan de aparecer en `GET /catalog`, sin borrar tickets ni precios históricos.
- **RF-007-04**: EL DISEÑO usa la identidad del letrero: rojo principal, amarillo de acento,
  fondo crema y textos en español; el encabezado muestra «Pollería El Wero».
- **RF-007-05**: LAS TARJETAS, categorías, hoja de producto, carrito y corte conservan las
  áreas táctiles de 48 px y el menú desplazable en celular.
- **RF-007-06**: LOS REPORTES y cortes siguen funcionando con los nombres y categorías nuevos.
- **RF-007-07**: `seed:sync` y `seed:check` mantienen el catálogo del frontend y del backend
  sincronizados.

## Fuera de alcance

- Imágenes por producto (spec 003); esta spec puede dejar las tarjetas con texto.
- Inventario, costos, proveedores y facturación.
- Cambios al ticket, `/sync`, outbox o al contrato de venta.
- Autenticación y RLS (008).

## Decisiones pendientes

1. **Lista definitiva**: ¿se usa la lista propuesta de las fotos o el dueño entrega otra?
2. **Unidades y precios**: ¿qué se vende por kilo y qué por pieza? ¿precios de lista,
   promoción y mayoreo? Sin precios reales no se puede cobrar.
3. **Productos provisionales**: se propone desactivarlos y dejar solo el catálogo real.
4. **Diseño**: se propone rojo/amarillo/blanco como el letrero; ¿se usa el pollo caricatura
   del letrero como mascota o se mantiene solo texto?
5. **Imágenes**: se propone dejarlas para 003 y usar tarjetas de texto en esta spec.

## Criterios de aceptación (borrador)

1. El catálogo muestra solo productos reales, agrupados por las categorías del local.
2. Cada producto tiene unidad y precio aprobados; la venta y el corte funcionan con ellos.
3. El diseño se reconoce como «El Wero» en celular y laptop, sin romper los flujos de 005/006.
4. `seed:check`, tests, `lint`, `typecheck` y `build` en verde.
