# Prompts 003 — Catálogo visual de Pollería El Wero

Guía para generar las 29 imágenes del catálogo actual. Cada prompt ya incluye el estilo, así que
puedes copiarlo completo. El texto va en inglés porque los generadores de imagen suelen respetar
mejor las indicaciones en ese idioma; los nombres de los productos quedan en español.

## Cómo usar

1. Usa el mismo modelo, versión y estilo en todas las imágenes. Si el modelo permite semilla
   (`seed`), conserva la misma para todo el set.
2. Genera en cuadrado 1:1; luego recorta a 512×512.
3. Revisa una hoja de contactos antes de aceptar el lote: fondo crema, madera clara, luz desde
   la izquierda, ángulo cenital suave y la mascota arriba a la derecha.
4. Si el modelo no mantiene bien la mascota, genera la imagen sin ella y en la app superponemos
   el SVG real de `BrandMark`; así el sello queda idéntico en las 29 tarjetas.
5. No incluyas nombres, precios, logotipos ni marcas de agua: la tarjeta ya muestra el texto.
6. Devuelve las imágenes en PNG o JPG; aquí las convierto a WebP 512×512 y las optimizo a ≤60 KB.

## Estilo base

```text
Square 1:1 professional food photography for a Mexican neighborhood chicken shop,
warm cream background, light oak wood surface, deep red (#D32F2F) and warm yellow
(#FBC02D) accents, soft diffused daylight from the upper left, gentle natural shadows,
45-degree overhead angle, shallow depth of field, crisp focus on the food, appetizing
and clean, no text, no letters, no logos, no watermark, no hands, no people; a small
flat white cartoon chicken mascot sticker with a red comb, yellow beak, red outline
and a friendly smile in the top-right corner, about 12% of the frame, never covering
the food.
```

Para cortes crudos agrega siempre: `Fresh, clean, food-safe, no blood, no head, no feathers.`

## Prompt negativo

```text
text, letters, words, price tags, labels with text, brand logos, KFC logo,
Coca-Cola logo, watermark, signature, hands, people, clutter, plastic wrap,
styrofoam, blood pools, raw slime, animal head, feathers, eyes, deformed food,
duplicate items, extra fingers, low resolution, blurry, overexposed, busy background
```

## Pollo crudo

### 1. Pollo entero — `POLLO-ENTERO` → `pollo-entero.webp`

One whole fresh raw chicken, cleaned and trussed, centered on a light oak cutting board, a few
parsley sprigs and a lemon half beside it, a folded red-and-yellow cloth in the background.
Fresh, clean, food-safe, no blood, no head, no feathers. Square 1:1 professional food
photography for a Mexican neighborhood chicken shop, warm cream background, light oak wood
surface, deep red and warm yellow accents, soft diffused daylight from the upper left, gentle
natural shadows, 45-degree overhead angle, shallow depth of field, crisp focus on the food,
appetizing and clean, no text, no letters, no logos, no watermark, no hands, no people; a
small flat white cartoon chicken mascot sticker with a red comb, yellow beak, red outline and a
friendly smile in the top-right corner, about 12% of the frame.

### 2. Pierna y muslo — `PIERNA-MUSLO` → `pierna-muslo.webp`

Four fresh raw chicken leg quarters arranged in a neat row on a light oak board, rosemary
sprigs and lemon wedges. Fresh, clean, food-safe, no blood, no head, no feathers. Square 1:1
professional food photography for a Mexican neighborhood chicken shop, warm cream background,
light oak wood surface, deep red and warm yellow accents, soft diffused daylight from the upper
left, gentle natural shadows, 45-degree overhead angle, shallow depth of field, crisp focus on
the food, appetizing and clean, no text, no letters, no logos, no watermark, no hands, no
people; a small flat white cartoon chicken mascot sticker with a red comb, yellow beak, red
outline and a friendly smile in the top-right corner, about 12% of the frame.

### 3. Alitas — `ALITAS` → `alitas.webp`

A neat pile of fresh raw chicken wings, flats and drumettes, on a light oak tray with parsley
and a lemon half. Fresh, clean, food-safe, no blood, no head, no feathers. Square 1:1
professional food photography for a Mexican neighborhood chicken shop, warm cream background,
light oak wood surface, deep red and warm yellow accents, soft diffused daylight from the upper
left, gentle natural shadows, 45-degree overhead angle, shallow depth of field, crisp focus on
the food, appetizing and clean, no text, no letters, no logos, no watermark, no hands, no
people; a small flat white cartoon chicken mascot sticker with a red comb, yellow beak, red
outline and a friendly smile in the top-right corner, about 12% of the frame.

### 4. Pechuga — `PECHUGA` → `pechuga.webp`

Two fresh skinless chicken breasts on a light oak board, thyme sprigs and lemon wedges. Fresh,
clean, food-safe, no blood, no head, no feathers. Square 1:1 professional food photography for
a Mexican neighborhood chicken shop, warm cream background, light oak wood surface, deep red
and warm yellow accents, soft diffused daylight from the upper left, gentle natural shadows,
45-degree overhead angle, shallow depth of field, crisp focus on the food, appetizing and
clean, no text, no letters, no logos, no watermark, no hands, no people; a small flat white
cartoon chicken mascot sticker with a red comb, yellow beak, red outline and a friendly smile
in the top-right corner, about 12% of the frame.

### 5. Milanesa — `MILANESA` → `milanesa.webp`

Three golden crispy breaded chicken milanesas stacked on a cream ceramic plate, the top one cut
open to show juicy white meat, parsley and lemon wedges. Square 1:1 professional food
photography for a Mexican neighborhood chicken shop, warm cream background, light oak wood
surface, deep red and warm yellow accents, soft diffused daylight from the upper left, gentle
natural shadows, 45-degree overhead angle, shallow depth of field, crisp focus on the food,
appetizing and clean, no text, no letters, no logos, no watermark, no hands, no people; a
small flat white cartoon chicken mascot sticker with a red comb, yellow beak, red outline and a
friendly smile in the top-right corner, about 12% of the frame.

### 6. Patitas — `PATITAS` → `patitas.webp`

Fresh cleaned chicken feet neatly arranged on a light oak tray with parsley and lemon, food-safe
styling, no blood. Fresh, clean, no head, no feathers. Square 1:1 professional food photography
for a Mexican neighborhood chicken shop, warm cream background, light oak wood surface, deep red
and warm yellow accents, soft diffused daylight from the upper left, gentle natural shadows,
45-degree overhead angle, shallow depth of field, crisp focus on the food, appetizing and
clean, no text, no letters, no logos, no watermark, no hands, no people; a small flat white
cartoon chicken mascot sticker with a red comb, yellow beak, red outline and a friendly smile
in the top-right corner, about 12% of the frame.

### 7. Menudencias — `MENUDENCIAS` → `menudencias.webp`

Fresh chicken giblets, liver, hearts and gizzards, in a cream ceramic bowl on a light oak board,
parsley. Fresh, clean, food-safe, no blood, no head, no feathers. Square 1:1 professional food
photography for a Mexican neighborhood chicken shop, warm cream background, light oak wood
surface, deep red and warm yellow accents, soft diffused daylight from the upper left, gentle
natural shadows, 45-degree overhead angle, shallow depth of field, crisp focus on the food,
appetizing and clean, no text, no letters, no logos, no watermark, no hands, no people; a
small flat white cartoon chicken mascot sticker with a red comb, yellow beak, red outline and a
friendly smile in the top-right corner, about 12% of the frame.

## Congelados

### 8. Nuggets — `NUGGETS` → `nuggets.webp`

A pile of golden crispy chicken nuggets in a small red paper basket lined with cream paper, a
tiny bowl of ketchup, parsley. Square 1:1 professional food photography for a Mexican
neighborhood chicken shop, warm cream background, light oak wood surface, deep red and warm
yellow accents, soft diffused daylight from the upper left, gentle natural shadows, 45-degree
overhead angle, shallow depth of field, crisp focus on the food, appetizing and clean, no text,
no letters, no logos, no watermark, no hands, no people; a small flat white cartoon chicken
mascot sticker with a red comb, yellow beak, red outline and a friendly smile in the top-right
corner, about 12% of the frame.

### 9. Pollo KFC — `POLLO-KFC` → `pollo-kfc.webp`

Golden crunchy fried chicken pieces with craggy breading, piled in a red paper bucket with no
logo, on a light oak board, parsley. Square 1:1 professional food photography for a Mexican
neighborhood chicken shop, warm cream background, light oak wood surface, deep red and warm
yellow accents, soft diffused daylight from the upper left, gentle natural shadows, 45-degree
overhead angle, shallow depth of field, crisp focus on the food, appetizing and clean, no text,
no letters, no logos, no KFC logo, no watermark, no hands, no people; a small flat white cartoon
chicken mascot sticker with a red comb, yellow beak, red outline and a friendly smile in the
top-right corner, about 12% of the frame.

## Preparados

### 10. Carne para hamburguesa — `CARNE-HAMBURGUESA` → `carne-hamburguesa.webp`

Four fresh raw ground chicken burger patties on parchment paper over a light oak board, red
onion rings and parsley. Fresh, clean, food-safe, no blood. Square 1:1 professional food
photography for a Mexican neighborhood chicken shop, warm cream background, light oak wood
surface, deep red and warm yellow accents, soft diffused daylight from the upper left, gentle
natural shadows, 45-degree overhead angle, shallow depth of field, crisp focus on the food,
appetizing and clean, no text, no letters, no logos, no watermark, no hands, no people; a
small flat white cartoon chicken mascot sticker with a red comb, yellow beak, red outline and a
friendly smile in the top-right corner, about 12% of the frame.

### 11. Albóndigas — `ALBONDIGAS` → `albondigas.webp`

Cooked chicken meatballs in a rich tomato sauce in a rustic clay bowl, parsley and a wooden
spoon. Square 1:1 professional food photography for a Mexican neighborhood chicken shop, warm
cream background, light oak wood surface, deep red and warm yellow accents, soft diffused
daylight from the upper left, gentle natural shadows, 45-degree overhead angle, shallow depth
of field, crisp focus on the food, appetizing and clean, no text, no letters, no logos, no
watermark, no hands, no people; a small flat white cartoon chicken mascot sticker with a red
comb, yellow beak, red outline and a friendly smile in the top-right corner, about 12% of the
frame.

### 12. Empanadas de pollo — `EMPANADA-POLLO` → `empanada-pollo.webp`

Three golden baked empanadas on a cream plate, one cut open showing shredded chicken filling, a
small bowl of salsa verde. Square 1:1 professional food photography for a Mexican neighborhood
chicken shop, warm cream background, light oak wood surface, deep red and warm yellow accents,
soft diffused daylight from the upper left, gentle natural shadows, 45-degree overhead angle,
shallow depth of field, crisp focus on the food, appetizing and clean, no text, no letters, no
logos, no watermark, no hands, no people; a small flat white cartoon chicken mascot sticker with
a red comb, yellow beak, red outline and a friendly smile in the top-right corner, about 12% of
the frame.

### 13. Empanadas de jamón y queso — `EMPANADA-JAMON` → `empanada-jamon-queso.webp`

Three golden baked empanadas on a cream plate, one cut open with melted cheese and ham, a small
bowl of salsa roja. Square 1:1 professional food photography for a Mexican neighborhood chicken
shop, warm cream background, light oak wood surface, deep red and warm yellow accents, soft
diffused daylight from the upper left, gentle natural shadows, 45-degree overhead angle, shallow
depth of field, crisp focus on the food, appetizing and clean, no text, no letters, no logos, no
watermark, no hands, no people; a small flat white cartoon chicken mascot sticker with a red
comb, yellow beak, red outline and a friendly smile in the top-right corner, about 12% of the
frame.

### 14. Empanadas de champiñón y queso — `EMPANADA-CHAMPINON` → `empanada-champinon-queso.webp`

Three golden baked empanadas on a cream plate, one cut open with mushrooms and melted cheese,
parsley. Square 1:1 professional food photography for a Mexican neighborhood chicken shop, warm
cream background, light oak wood surface, deep red and warm yellow accents, soft diffused
daylight from the upper left, gentle natural shadows, 45-degree overhead angle, shallow depth
of field, crisp focus on the food, appetizing and clean, no text, no letters, no logos, no
watermark, no hands, no people; a small flat white cartoon chicken mascot sticker with a red
comb, yellow beak, red outline and a friendly smile in the top-right corner, about 12% of the
frame.

### 15. Teppanyaki — `TEPPANYAKI` → `teppanyaki.webp`

Grilled chicken strips with bell peppers, onion and sesame on a cast-iron plate, glossy glaze,
parsley. Square 1:1 professional food photography for a Mexican neighborhood chicken shop, warm
cream background, light oak wood surface, deep red and warm yellow accents, soft diffused
daylight from the upper left, gentle natural shadows, 45-degree overhead angle, shallow depth
of field, crisp focus on the food, appetizing and clean, no text, no letters, no logos, no
watermark, no hands, no people; a small flat white cartoon chicken mascot sticker with a red
comb, yellow beak, red outline and a friendly smile in the top-right corner, about 12% of the
frame.

### 16. A la jardinera — `JARDINERA` → `jardinera.webp`

Chicken pieces with carrots, peas, corn and green beans in a rustic clay bowl, parsley. Square
1:1 professional food photography for a Mexican neighborhood chicken shop, warm cream
background, light oak wood surface, deep red and warm yellow accents, soft diffused daylight
from the upper left, gentle natural shadows, 45-degree overhead angle, shallow depth of field,
crisp focus on the food, appetizing and clean, no text, no letters, no logos, no watermark, no
hands, no people; a small flat white cartoon chicken mascot sticker with a red comb, yellow
beak, red outline and a friendly smile in the top-right corner, about 12% of the frame.

### 17. Poblano — `POBLANO` → `poblano.webp`

Chicken strips in creamy poblano sauce with roasted poblano strips and cilantro in a clay bowl.
Square 1:1 professional food photography for a Mexican neighborhood chicken shop, warm cream
background, light oak wood surface, deep red and warm yellow accents, soft diffused daylight
from the upper left, gentle natural shadows, 45-degree overhead angle, shallow depth of field,
crisp focus on the food, appetizing and clean, no text, no letters, no logos, no watermark, no
hands, no people; a small flat white cartoon chicken mascot sticker with a red comb, yellow
beak, red outline and a friendly smile in the top-right corner, about 12% of the frame.

### 18. Adobado — `ADOBADO` → `adobado.webp`

Chicken pieces coated in red adobo marinade on a light oak board, guajillo chiles, garlic and a
lime half. Fresh, clean, food-safe. Square 1:1 professional food photography for a Mexican
neighborhood chicken shop, warm cream background, light oak wood surface, deep red and warm
yellow accents, soft diffused daylight from the upper left, gentle natural shadows, 45-degree
overhead angle, shallow depth of field, crisp focus on the food, appetizing and clean, no text,
no letters, no logos, no watermark, no hands, no people; a small flat white cartoon chicken
mascot sticker with a red comb, yellow beak, red outline and a friendly smile in the top-right
corner, about 12% of the frame.

## Complementos

### 19. Huevo — `HUEVO` → `huevo.webp`

A wooden bowl filled with fresh brown and white eggs, a few eggs resting on the light oak
surface, a little wheat straw. Square 1:1 professional food photography for a Mexican
neighborhood chicken shop, warm cream background, light oak wood surface, deep red and warm
yellow accents, soft diffused daylight from the upper left, gentle natural shadows, 45-degree
overhead angle, shallow depth of field, crisp focus on the food, appetizing and clean, no text,
no letters, no logos, no watermark, no hands, no people; a small flat white cartoon chicken
mascot sticker with a red comb, yellow beak, red outline and a friendly smile in the top-right
corner, about 12% of the frame.

### 20. Papas a la francesa — `PAPAS-FRANCESA` → `papas-francesa.webp`

Golden crispy french fries in a red paper cone lined with cream paper, sea salt and a small
ketchup dip. Square 1:1 professional food photography for a Mexican neighborhood chicken shop,
warm cream background, light oak wood surface, deep red and warm yellow accents, soft diffused
daylight from the upper left, gentle natural shadows, 45-degree overhead angle, shallow depth of
field, crisp focus on the food, appetizing and clean, no text, no letters, no logos, no
watermark, no hands, no people; a small flat white cartoon chicken mascot sticker with a red
comb, yellow beak, red outline and a friendly smile in the top-right corner, about 12% of the
frame.

### 21. Papas gajo — `PAPAS-GAJO` → `papas-gajo.webp`

Crispy seasoned potato wedges with skin in a small basket, paprika and a dipping sauce. Square
1:1 professional food photography for a Mexican neighborhood chicken shop, warm cream
background, light oak wood surface, deep red and warm yellow accents, soft diffused daylight
from the upper left, gentle natural shadows, 45-degree overhead angle, shallow depth of field,
crisp focus on the food, appetizing and clean, no text, no letters, no logos, no watermark, no
hands, no people; a small flat white cartoon chicken mascot sticker with a red comb, yellow
beak, red outline and a friendly smile in the top-right corner, about 12% of the frame.

### 22. Mole dulce — `MOLE-DULCE` → `mole-dulce.webp`

A clay bowl of glossy dark sweet mole sauce, sesame seeds, a cinnamon stick and a wooden spoon.
Square 1:1 professional food photography for a Mexican neighborhood chicken shop, warm cream
background, light oak wood surface, deep red and warm yellow accents, soft diffused daylight
from the upper left, gentle natural shadows, 45-degree overhead angle, shallow depth of field,
crisp focus on the food, appetizing and clean, no text, no letters, no logos, no watermark, no
hands, no people; a small flat white cartoon chicken mascot sticker with a red comb, yellow
beak, red outline and a friendly smile in the top-right corner, about 12% of the frame.

### 23. Mole poblano — `MOLE-POBLANO` → `mole-poblano.webp`

A clay bowl of rich dark mole poblano with sesame seeds, dried chiles and a piece of chocolate,
wooden spoon. Square 1:1 professional food photography for a Mexican neighborhood chicken shop,
warm cream background, light oak wood surface, deep red and warm yellow accents, soft diffused
daylight from the upper left, gentle natural shadows, 45-degree overhead angle, shallow depth of
field, crisp focus on the food, appetizing and clean, no text, no letters, no logos, no
watermark, no hands, no people; a small flat white cartoon chicken mascot sticker with a red
comb, yellow beak, red outline and a friendly smile in the top-right corner, about 12% of the
frame.

### 24. Mole ranchero — `MOLE-RANCHERO` → `mole-ranchero.webp`

A clay bowl of red-orange ranchero sauce with tomato, onion and chile, wooden spoon. Square 1:1
professional food photography for a Mexican neighborhood chicken shop, warm cream background,
light oak wood surface, deep red and warm yellow accents, soft diffused daylight from the upper
left, gentle natural shadows, 45-degree overhead angle, shallow depth of field, crisp focus on
the food, appetizing and clean, no text, no letters, no logos, no watermark, no hands, no
people; a small flat white cartoon chicken mascot sticker with a red comb, yellow beak, red
outline and a friendly smile in the top-right corner, about 12% of the frame.

### 25. Dedos de queso — `DEDOS-QUESO` → `dedos-queso.webp`

Golden fried cheese sticks stacked on a cream plate, one pulled apart with melted cheese,
marinara dip. Square 1:1 professional food photography for a Mexican neighborhood chicken shop,
warm cream background, light oak wood surface, deep red and warm yellow accents, soft diffused
daylight from the upper left, gentle natural shadows, 45-degree overhead angle, shallow depth of
field, crisp focus on the food, appetizing and clean, no text, no letters, no logos, no
watermark, no hands, no people; a small flat white cartoon chicken mascot sticker with a red
comb, yellow beak, red outline and a friendly smile in the top-right corner, about 12% of the
frame.

## Bebidas

### 26. Refresco — `REFRESCO` → `refresco.webp`

A chilled generic glass cola bottle with condensation and no label text, a glass with ice, a
red-and-yellow napkin. Square 1:1 professional food photography for a Mexican neighborhood
chicken shop, warm cream background, light oak wood surface, deep red and warm yellow accents,
soft diffused daylight from the upper left, gentle natural shadows, 45-degree overhead angle,
shallow depth of field, crisp focus on the food, appetizing and clean, no text, no letters, no
logos, no watermark, no hands, no people; a small flat white cartoon chicken mascot sticker with
a red comb, yellow beak, red outline and a friendly smile in the top-right corner, about 12% of
the frame.

### 27. Agua 600 ml — `AGUA` → `agua-600-ml.webp`

A clear 600 ml plastic water bottle with a blue cap and condensation, no label text, on a light
oak surface. Square 1:1 professional food photography for a Mexican neighborhood chicken shop,
warm cream background, light oak wood surface, deep red and warm yellow accents, soft diffused
daylight from the upper left, gentle natural shadows, 45-degree overhead angle, shallow depth of
field, crisp focus on the food, appetizing and clean, no text, no letters, no logos, no
watermark, no hands, no people; a small flat white cartoon chicken mascot sticker with a red
comb, yellow beak, red outline and a friendly smile in the top-right corner, about 12% of the
frame.

### 28. Agua 1.5 L — `AGUA-LITRO` → `agua-1-5-l.webp`

A large 1.5 L clear plastic water bottle with a blue cap and condensation, no label text. Square
1:1 professional food photography for a Mexican neighborhood chicken shop, warm cream
background, light oak wood surface, deep red and warm yellow accents, soft diffused daylight
from the upper left, gentle natural shadows, 45-degree overhead angle, shallow depth of field,
crisp focus on the food, appetizing and clean, no text, no letters, no logos, no watermark, no
hands, no people; a small flat white cartoon chicken mascot sticker with a red comb, yellow
beak, red outline and a friendly smile in the top-right corner, about 12% of the frame.

### 29. Jugo natural — `JUGO` → `jugo-natural.webp`

A tall glass of fresh orange juice with ice and an orange slice, a small glass pitcher of juice,
light oak board. Square 1:1 professional food photography for a Mexican neighborhood chicken
shop, warm cream background, light oak wood surface, deep red and warm yellow accents, soft
diffused daylight from the upper left, gentle natural shadows, 45-degree overhead angle, shallow
depth of field, crisp focus on the food, appetizing and clean, no text, no letters, no logos, no
watermark, no hands, no people; a small flat white cartoon chicken mascot sticker with a red
comb, yellow beak, red outline and a friendly smile in the top-right corner, about 12% of the
frame.

## Archivos esperados

| # | SKU | Producto | Archivo |
|---|---|---|---|
| 1 | `POLLO-ENTERO` | Pollo entero | `pollo-entero.webp` |
| 2 | `PIERNA-MUSLO` | Pierna y muslo | `pierna-muslo.webp` |
| 3 | `ALITAS` | Alitas | `alitas.webp` |
| 4 | `PECHUGA` | Pechuga | `pechuga.webp` |
| 5 | `MILANESA` | Milanesa | `milanesa.webp` |
| 6 | `PATITAS` | Patitas | `patitas.webp` |
| 7 | `MENUDENCIAS` | Menudencias | `menudencias.webp` |
| 8 | `NUGGETS` | Nuggets | `nuggets.webp` |
| 9 | `POLLO-KFC` | Pollo KFC | `pollo-kfc.webp` |
| 10 | `CARNE-HAMBURGUESA` | Carne para hamburguesa | `carne-hamburguesa.webp` |
| 11 | `ALBONDIGAS` | Albóndigas | `albondigas.webp` |
| 12 | `EMPANADA-POLLO` | Empanadas de pollo | `empanada-pollo.webp` |
| 13 | `EMPANADA-JAMON` | Empanadas de jamón y queso | `empanada-jamon-queso.webp` |
| 14 | `EMPANADA-CHAMPINON` | Empanadas de champiñón y queso | `empanada-champinon-queso.webp` |
| 15 | `TEPPANYAKI` | Teppanyaki | `teppanyaki.webp` |
| 16 | `JARDINERA` | A la jardinera | `jardinera.webp` |
| 17 | `POBLANO` | Poblano | `poblano.webp` |
| 18 | `ADOBADO` | Adobado | `adobado.webp` |
| 19 | `HUEVO` | Huevo | `huevo.webp` |
| 20 | `PAPAS-FRANCESA` | Papas a la francesa | `papas-francesa.webp` |
| 21 | `PAPAS-GAJO` | Papas gajo | `papas-gajo.webp` |
| 22 | `MOLE-DULCE` | Mole dulce | `mole-dulce.webp` |
| 23 | `MOLE-POBLANO` | Mole poblano | `mole-poblano.webp` |
| 24 | `MOLE-RANCHERO` | Mole ranchero | `mole-ranchero.webp` |
| 25 | `DEDOS-QUESO` | Dedos de queso | `dedos-queso.webp` |
| 26 | `REFRESCO` | Refresco | `refresco.webp` |
| 27 | `AGUA` | Agua 600 ml | `agua-600-ml.webp` |
| 28 | `AGUA-LITRO` | Agua 1.5 L | `agua-1-5-l.webp` |
| 29 | `JUGO` | Jugo natural | `jugo-natural.webp` |

## Después de generarlas

- Revisa que ninguna tenga texto, precio, marca ni manos.
- Si una imagen no coincide con el estilo, regenera solo esa.
- Entrega las 29 con el nombre de archivo de la tabla; aquí las recorto a 512×512, las convierto
  a WebP y las dejo por debajo de 60 KB.
- Si la mascota sale distinta en cada imagen, no es un problema: puedo ocultarla del asset y
  superponer el SVG real en la tarjeta para que sea idéntica en todo el catálogo.
