# Spec 003 — Catálogo visual con imágenes

- Estado: borrador aprobado (2026-11-13); se activa al cerrar la validación pendiente de 002 (T-002-22)
- Spec activa: no
- Depende de: `specs/001-fundamentos-catalogo`, `specs/002-venta-offline` y `docs/constitution.md` v1.0
- Fecha: 2026-11-13

## Contexto y objetivo

El catálogo ya se pinta y se vende sin red, pero en el celular cada producto es una tarjeta de
texto. En horas pico el cajero necesita reconocer de un vistazo qué es cada cosa, no leer 26
nombres. Esta iteración convierte la rejilla en un catálogo visual: cada producto activo lleva
una imagen representativa como fondo de su tarjeta, con un estilo uniforme en todo el set.

Las imágenes viven en el propio frontend y se precachean con el service worker, así que el
catálogo visual funciona igual sin conexión. No hay cambios de backend, de Alembic ni del
esquema Dexie: la imagen se resuelve por SKU.

El catálogo actual es provisional. Las imágenes se generan para los 26 SKU existentes y se
reemplazan una por una cuando llegue la lista real de productos y precios.

## Usuarios / actores

- **Cajero/a de mostrador**: usa celular o tablet con manos ocupadas y necesita identificar el
  producto en menos de un segundo.
- **Dueño/encargado**: quiere un catálogo que se vea profesional y consistente, sin mezclar
  estilos de foto.
- **Sistema local**: sirve las imágenes desde el precache sin hacer peticiones de red al vender.

## Historias de usuario

- **H1**: Como cajero quiero ver la imagen de cada producto para agregarlo al carrito sin dudar
  entre nombres parecidos.
- **H2**: Como cajero quiero que las imágenes se vean aunque el local se quede sin internet.
- **H3**: Como dueño quiero que todas las imágenes compartan el mismo estilo para que el
  catálogo se vea ordenado y profesional.

## Requisitos funcionales (criterios de aceptación en EARS)

- **RF-003-01**: CUANDO se muestra un producto activo, EL SISTEMA pinta su imagen como fondo de
  la tarjeta, recortada para llenar el marco sin deformarse.
- **RF-003-02**: EL SISTEMA usa un solo estilo visual en todo el set: fondo crema liso, luz
  cálida difusa, vista cenital en ángulo suave, sombra natural sutil, sin texto, sin marcas y
  sin manos.
- **RF-003-03**: MIENTRAS la app está sin conexión, EL SISTEMA sirve las imágenes desde el
  precache del service worker y no realiza peticiones de red al abrir la pestaña de venta.
- **RF-003-04**: SI un producto no tiene imagen o el archivo falla al cargar, ENTONCES EL
  SISTEMA muestra un respaldo con la inicial del producto y el color de su categoría, sin
  íconos rotos ni huecos.
- **RF-003-05**: EL SISTEMA mantiene el nombre, la categoría, la unidad y el precio legibles
  sobre la imagen con contraste AA, y conserva áreas táctiles de al menos 48 px desde 360 px.
- **RF-003-06**: CUANDO el cajero toca una tarjeta, EL SISTEMA agrega el producto al carrito
  igual que antes; la imagen es decorativa y no introduce botones anidados.
- **RF-003-07**: EL SISTEMA verifica automáticamente que cada SKU activo del catálogo semilla
  tiene imagen o está declarado en la lista de respaldos.
- **RF-003-08**: EL SISTEMA respeta el presupuesto de assets: 512×512 px, WebP, máximo 60 KB
  por imagen y 2 MB el set completo; la tarjeta declara ancho y alto para no saltar el layout.
- **RF-003-09**: EL SISTEMA conserva los chips de promoción y mayoreo y el origen de precio
  (`lista`, `promocion`, `mayoreo`) que ya mostraba la tarjeta de texto.
- **RF-003-10**: EL SISTEMA usa 2 columnas a 360 px, 3 en tablet y 4 en laptop, sin scroll
  horizontal en 360, 768 ni 1280 px.
- **RF-003-11**: LA IMAGEN se marca como decorativa (`alt=""`) porque el nombre accesible ya
  está en el texto de la tarjeta; el lector de pantalla no duplica el nombre.

## Contrato de assets

```text
frontend/src/assets/products/<SKU>.webp
```

- El nombre es el SKU tal como viene del catálogo (`POLLO-ENTERO.webp`, `AGUA-LITRO.webp`).
- Formato WebP, 512×512 px, fondo crema, sin texto, sin logotipos y sin marcas de agua.
- Peso máximo: 60 KB por imagen; 2 MB el set completo.
- No se agrega un campo nuevo al catálogo ni una migración Dexie: la ruta se deriva del SKU.
- Un SKU sin archivo usa respaldo; no se inventa una imagen en tiempo de ejecución.

## Reglas de negocio y cálculos

- La imagen no participa en precios, pesos, totales ni en el ticket.
- El precio y la promoción se siguen tomando de la hoja del día, igual que en 002.
- La imagen se resuelve por SKU, no por nombre visible: renombrar un producto no rompe su
  imagen.
- Reemplazar una imagen es sobrescribir el archivo con el mismo SKU; no requiere migración.
- Un producto inactivo no se pinta y su imagen puede quedarse sin usar.
- La tarjeta no lee red, IndexedDB ni estado global; solo recibe producto y precio.

## Casos límite

- SKU sin imagen: respaldo con inicial.
- Archivo corrupto o 404: respaldo; nunca un ícono roto.
- Producto nuevo en el catálogo: respaldo hasta que exista su imagen.
- Catálogo actualizado con la app abierta: la tarjeta usa el SKU actual; si no hay imagen,
  respaldo.
- Primera visita sin conexión: la app no arranca sin precache previo; no se promete offline en
  frío.
- Nombres largos: se recortan a dos líneas sin empujar el precio fuera de la tarjeta.
- Imagen con otra proporción: `object-cover` la recorta, nunca la deforma.
- Promoción y mayoreo vacíos: no se muestra chip, igual que en 002.

## Requisitos no funcionales

- **Local-first**: las imágenes se sirven del precache; abrir Venta no depende de la red.
- **Rendimiento**: carga diferida y decodificación asíncrona; sin saltos de layout.
- **Accesibilidad**: contraste AA sobre el degradado, foco visible, imagen decorativa,
  nombre accesible desde el texto y targets de 48 px.
- **Consistencia**: un solo estilo y una sola paleta en las 26 imágenes.
- **Mantenibilidad**: TypeScript estricto, identificadores en inglés, mapa de imágenes aislado
  y reemplazo por SKU.
- **Idioma**: textos de interfaz, errores y documentación en español.

## Fuera de alcance

Sincronización y outbox (004), subida o edición de imágenes desde la app, fotos reales del
local, iconos de categoría, búsqueda, favoritos, impresión (007), cambios de backend, Alembic o
esquema Dexie, y variantes de arte por temporada.

## Criterios de finalización

1. Las 26 imágenes existen, comparten estilo y fueron aprobadas por el dueño.
2. Toda tarjeta activa muestra imagen o respaldo; no hay huecos ni íconos rotos.
3. La cobertura SKU ↔ imagen pasa en un test automático.
4. La pestaña de venta funciona sin red con las imágenes precacheadas.
5. 360, 768 y 1280 px sin scroll horizontal y con targets de 48 px.
6. `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` y `npm run seed:check`
   pasan.
7. `specs/README.md` y `MEMORY.md` quedan actualizados.

## Decisiones ratificadas

- **D-003-01**: las imágenes son fotografías de estudio generadas con IA, con un prompt fijo y
  una muestra aprobada como referencia de estilo.
- **D-003-02**: se generan para los 26 SKU del catálogo provisional; el reemplazo es por SKU.
- **D-003-03**: los assets viven en `frontend/src/assets/products/` y se resuelven por SKU, sin
  cambios de backend ni de Dexie.
- **D-003-04**: WebP 512×512, máximo 60 KB por imagen y 2 MB el set.
- **D-003-05**: la rejilla usa 2 columnas a 360 px, 3 en tablet y 4 en laptop.
- **D-003-06**: la imagen es decorativa (`alt=""`); el nombre accesible vive en el texto de la
  tarjeta.
- **D-003-07**: si falta una imagen, el respaldo muestra la inicial con el color de la categoría.
