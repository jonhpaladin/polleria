# Spec 007 — Catálogo real y diseño de la marca

- Estado: cerrada (2026-11-23); actualizada el 2026-11-25 con 25 productos activos (sin bebidas).
  Los precios temporales de $100 se ajustan en «Precios del día» hasta que exista la administración
  de 008.
- Spec activa: no
- Depende de: `specs/002-venta-offline`, `specs/005-venta-tactil`, `specs/006-corte-reportes`
- Fecha: 2026-11-22

## Contexto y objetivo

El catálogo anterior era provisional: 26 SKU con pollo asado, combos y precios inventados para
probar la venta. El local real es una **pollería de pollo crudo** con cortes, congelados, moles,
preparados y complementos. Las fotos del letrero y la vitrina muestran la operación real.

Esta iteración sustituyó el catálogo por los productos del local y alineó la identidad visual con
el letrero: rojo, amarillo y blanco, nombre «El Wero». Los tickets ya cobrados conservan su
snapshot; cambiar el catálogo no los altera.

## Requisitos funcionales

- **RF-007-01**: EL CATÁLOGO local y el backend usan las categorías y productos reales del local,
  con SKU estables y sin combos ni pollo asado provisionales.
- **RF-007-02**: CADA producto declara su unidad (`kg` o `piece`) y su precio de lista; los
  productos sin precio confirmado usan un precio temporal explícito de $100.00.
- **RF-007-03**: LA SEMILLA reemplaza el catálogo provisional; los productos retirados quedan
  inactivos y dejan de aparecer en `GET /catalog`, sin borrar tickets ni precios históricos.
- **RF-007-04**: EL DISEÑO usa la identidad del letrero: rojo principal, amarillo de acento, fondo
  crema y textos en español; el encabezado muestra «Pollería El Wero» con la mascota.
- **RF-007-05**: LAS TARJETAS, categorías, hoja de producto, carrito y corte conservan las áreas
  táctiles de 48 px y el menú desplazable en celular.
- **RF-007-06**: LOS REPORTES y cortes siguen funcionando con los nombres y categorías nuevos.
- **RF-007-07**: `seed:sync` y `seed:check` mantienen el catálogo del frontend y del backend
  sincronizados.

## Catálogo aprobado

### Pollo crudo (kg)

Pollo entero, pierna y muslo, alitas, pechuga, milanesa, patitas y menudencias.

### Congelados (pieza)

Nuggets y pollo KFC.

### Preparados (kg)

Carne para hamburguesa, albóndigas, empanadas de pollo, empanadas de jamón y queso, empanadas de
champiñón y queso, teppanyaki, a la jardinera, poblano y adobado.

### Complementos

Huevo (kg), papas a la francesa, papas gajo, mole dulce, mole poblano, mole ranchero y dedos de
queso (pieza).

Las bebidas se retiraron del catálogo el 2026-11-25 porque no se venden. Los tickets históricos
conservan su snapshot.

## Precios

| Producto | Precio |
|---|---|
| Pierna y muslo | $49.50/kg lista; $45.00/kg promoción |
| Carne para hamburguesa, albóndigas, teppanyaki, jardinera, poblano y adobado | $139.00/kg |
| Empanadas (pollo, jamón y queso, champiñón y queso) | $169.00/kg |
| Huevo | $32.00/kg |
| Resto del catálogo (14 SKU) | $100.00 temporal, por definir |

Los $100 son un valor de captura para operar; el dueño los ajusta en «Precios del día». Cambiar el
precio base de la semilla queda para 008 (administración de precios).

## Casos límite

- Producto sin precio confirmado: se cobra a $100 temporal y se avisa al dueño que debe ajustarlo.
- Producto retirado: se desactiva; `GET /catalog` deja de devolverlo y los tickets viejos conservan
  su snapshot.
- Categoría vacía: no se muestra en la PWA.
- Cambio de nombre o SKU: los tickets históricos no se alteran porque guardan el snapshot.
- Semilla y base divergentes: `seed:sync` regenera la copia del frontend; `seed:check` falla en CI.

## Fuera de alcance

- Imágenes por producto (spec 003); las tarjetas usan texto.
- Inventario, costos, proveedores y facturación.
- Cambios al ticket, `/sync`, outbox o al contrato de venta.
- Administración de precios y RLS (008).
- Impresión (009) y multidispositivo (010).

## Decisiones

- **D-007-01**: catálogo real de 25 SKU agrupado en las categorías del local (las bebidas se
  retiraron el 2026-11-25). Aprobado el 2026-11-23.
- **D-007-02**: pollo, moles, preparados y huevo se venden por kilo; congelados, papas y dedos de
  queso por pieza. Aprobado el 2026-11-23.
- **D-007-03**: los productos sin precio confirmado llevan $100.00 temporal. Aprobado el
  2026-11-23.
- **D-007-04**: los 17 productos provisionales se desactivan, no se borran. Aprobado el
  2026-11-23.
- **D-007-05**: identidad rojo/amarillo/crema con mascota SVG; las imágenes por producto quedan
  para 003. Aprobado el 2026-11-23.
- **D-007-06**: «Mole poblano» y «Mole ranchero» llevan el prefijo para no confundirlos con el
  preparado «Poblano».

## Implementación

| Archivo | Cambio |
|---|---|
| `backend/app/seeds/catalog.json` | Semilla canónica con 25 productos y 5 categorías |
| `frontend/src/data/seedCatalog.json` | Copia generada por `npm run seed:sync` |
| `backend/app/repositories/catalog.py` | El seed desactiva los productos ausentes antes del upsert |
| `frontend/src/App.tsx` | Encabezado con mascota, pestañas y menú desplazable |
| `frontend/src/styles.css` | Tokens de marca rojo `#d32f2f` y amarillo del letrero |
| `frontend/src/components/ui/BrandMark.tsx` | Mascota SVG |
| `frontend/index.html`, `frontend/vite.config.ts` | Título, tema y manifiesto de la PWA |

Estado remoto: 25 productos activos, 17 inactivos y `catalog_meta.updated_at` actualizado con el
SQL aplicado vía Supabase. `GET /catalog` devuelve los 25 productos con su unidad y precio.

## Criterios de aceptación

1. El catálogo muestra solo productos reales, agrupados por las categorías del local. ✅
2. Cada producto tiene unidad y precio; la venta y el corte funcionan con ellos. ✅
3. El diseño se reconoce como «El Wero» en celular y laptop, sin romper 005/006. ✅
4. `seed:check`, tests, `lint`, `typecheck`, `build` y `ruff` en verde. ✅
5. Los tickets históricos y los productos inactivos conservan su información. ✅

## Pendientes conocidos

- Los 14 precios de $100 son temporales; el dueño los ajusta en «Precios del día» y, de forma
  permanente, en 008.
- La validación visual final en el celular/tablet del local queda en la verificación de campo.
