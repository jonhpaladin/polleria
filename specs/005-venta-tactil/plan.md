# Plan — Spec 005 · Venta táctil

## Antes / después

```text
Antes                                  Después
─────                                  ───────
Rejilla + carrito sticky al fondo      Rejilla libre
Tocar producto = agregar 1 kg/1 pza    Tocar producto = hoja de detalle
Carrito siempre abierto                Pestaña Carrito + icono flotante
                                       Pago y confirmación en su pestaña
```

El estado del carrito no cambia de dueño: sigue en `useSale` y en `cartReducer`. Solo cambia
quién dispara la acción y dónde se edita.

## Archivos

| Archivo | Cambio |
|---|---|
| `src/lib/cart.ts` | `addProduct` acepta `LineSelection` (peso, cantidad, nivel de precio) y crea la línea con esos valores |
| `src/hooks/useSale.ts` | `addProduct` recibe opciones y devuelve `boolean` para que la hoja sepa si cerrar |
| `src/components/pos/ProductSheet.tsx` | Nuevo: hoja inferior/diálogo con peso, cantidad, precio y «Agregar» |
| `src/components/pos/CartFloatingButton.tsx` | Nuevo: icono flotante con contador de líneas |
| `src/components/pos/Cart.tsx` | Deja de ser sticky; se muestra como pestaña; estado vacío y «Volver a vender» |
| `src/components/pos/ProductCard.tsx` | La tarjeta abre detalle; `aria-label` «Ver …» |
| `src/components/pos/ProductGrid.tsx` | Sin cambios de contrato; sigue notificando el producto tocado |
| `src/App.tsx` | Tres pestañas (`sale`, `cart`, `prices`), hoja de producto e icono flotante |
| `AGENTS.md` | Nueva regla de UI: nada tapa la rejilla; el carrito está a un toque |

Sin cambios en backend, `/sync`, Dexie, tipos de ticket ni outbox.

## Contratos de los componentes

```ts
// lib/cart.ts
export interface LineSelection {
  priceSource?: DailyPriceSource;
  grams?: Grams;
  quantity?: number;
}

// hooks/useSale.ts
addProduct(
  productId: string,
  categoryName: string,
  selection?: LineSelection,
): boolean;

// ProductSheet
{
  product: Product;
  categoryName: string;
  dailyPrice?: DailyPrice;
  canSell: boolean;
  onAdd: (selection: LineSelection) => boolean;
  onClose: () => void;
}

// CartFloatingButton
{ count: number; onOpen: () => void }
```

### Reglas de la línea

- `kg`: `quantity = 1`, `grams` por defecto `1000`; el importe se recalcula con
  `lineTotalCents` (half-up al centavo). Los atajos y ±250 g reutilizan `WeightControls`.
- `piece`: `grams = null`, `quantity` por defecto `1`; se puede sumar a una línea existente
  con el mismo producto, precio y nivel.
- Precio: `selectDailyPrice`; si el nivel elegido no existe, no se ofrece en la hoja.
- `catalogUnitPriceCents` sigue siendo el precio por defecto del catálogo, aunque la hoja del
  día cambie.

### Hoja de producto

- `<dialog>` nativo con `showModal()`: foco atrapado, Escape y `aria-modal` gratis.
- En celular: `margin-top: auto`, ancho completo, esquinas superiores redondeadas.
- En `sm:`: centrado, ancho máximo y todas las esquinas redondeadas.
- Cierre por X, clic en el fondo (`event.target === dialog`) o Escape; al cerrar se devuelve el
  foco a la tarjeta que abrió.
- Scroll interno con `max-h-[85dvh] overflow-y-auto`; cabecera y botón «Agregar» siempre
  alcanzables.
- Si `dailyPrice` falta o `canSell` es falso: aviso visible y «Agregar» deshabilitado.

### Pestañas

| Pestaña | Contenido |
|---|---|
| Venta | Categorías, rejilla e icono flotante |
| Carrito | Líneas, pago, total, confirmar y «Volver a vender» |
| Precios del día | Igual que hoy |

- `activeTab` pasa de dos a tres valores; los botones usan `aria-pressed`.
- El icono flotante se oculta en Carrito y cuando no hay líneas.
- El carrito no se desmonta al cambiar de pestaña: el estado vive en `useSale`, no en el DOM.

## Accesibilidad

- Áreas táctiles ≥48 px en tarjetas, atajos, precios, X, icono y pestañas.
- `role="dialog"` + `aria-modal` + `aria-labelledby` en la hoja.
- Contador del icono con `aria-live="polite"` y etiqueta «Abrir carrito, N líneas».
- El foco vuelve a la tarjeta de origen al cerrar.
- Colores con texto, no solo color.

## Tests

| Requisito | Test |
|---|---|
| RF-005-01/02/03 | `ProductSheet.test.tsx`: abrir, atajos, piezas, precios |
| RF-005-04/05 | `ProductSheet.test.tsx` + `useSale.test.tsx`: agregar con selección, rechazo sin hoja |
| RF-005-06 | `ProductSheet.test.tsx`: X, fondo, Escape, foco |
| RF-005-07 | `CartFloatingButton.test.tsx` + `App` (contador y cambio de pestaña) |
| RF-005-08 | `Cart.test.tsx`: editar, precio, quitar, pago |
| RF-005-09 | `useSale.test.tsx`: cobro y carrito vacío |
| RF-005-10/11 | `ProductGrid.test.tsx` y revisión visual a 360/768/1280 |
| RF-005-12 | `useSale.test.tsx`: el carrito sobrevive el cambio de pestaña |
| RF-005-13 | `ProductSheet.test.tsx` y `CartFloatingButton.test.tsx` (roles y etiquetas) |

## Orden de implementación

1. `LineSelection` en `cart.ts` y `useSale.addProduct` con retorno booleano; tests.
2. `ProductSheet` con `<dialog>`, peso/cantidad, precios y cierre; tests.
3. `CartFloatingButton` y pestaña Carrito; ajustar `Cart` y `App`.
4. Actualizar `ProductCard` (aria-label) y textos del estado vacío.
5. Revisión visual 360/768/1280 y puerta de calidad.
6. `AGENTS.md`, `MEMORY.md` y hoja de ruta.
