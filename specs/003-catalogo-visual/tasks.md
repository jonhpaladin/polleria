# Tareas 003 — Catálogo visual con imágenes

- Spec: `specs/003-catalogo-visual/spec.md`
- Plan: `specs/003-catalogo-visual/plan.md`
- Estado: activo (2026-11-13)

## Fase 0 — Gobierno

- [x] **T-003-01 · Redactar spec, plan y tareas**
  Documentar objetivo, RF en EARS, contrato de assets, presupuesto y decisiones.
  Hecho cuando la spec no tiene dudas bloqueantes y el plan cabe en tareas de 20–30 min.
  RF: —

## Fase 1 — Assets

- [ ] **T-003-02 · Generar y aprobar la muestra de estilo**
  Generar `PIERNA-MUSLO` con el prompt base y revisar fondo, luz, ángulo y encuadre.
  Hecho cuando el dueño aprueba la muestra y queda como referencia para el resto.
  RF: RF-003-02

- [ ] **T-003-03 · Generar las 25 imágenes restantes**
  Usar el prompt base y la muestra aprobada como referencia; revisar una hoja de contactos.
  Hecho cuando las 26 imágenes comparten estilo y ninguna rompe la paleta.
  RF: RF-003-01, RF-003-02

- [ ] **T-003-04 · Optimizar y nombrar por SKU**
  Redimensionar a 512×512, convertir a WebP con Pillow y guardar como `<SKU>.webp`.
  Hecho cuando cada archivo pesa ≤60 KB y el set completo ≤2 MB.
  RF: RF-003-08

- [ ] **T-003-05 · Verificar presencia y peso**
  Crear `frontend/scripts/check-product-images.mjs` y ejecutarlo.
  Hecho cuando el script falla si falta un SKU activo o se excede el presupuesto.
  RF: RF-003-07, RF-003-08

## Fase 2 — Código

- [ ] **T-003-06 · Crear el mapa de imágenes**
  Implementar `productImages.ts` con `import.meta.glob`, `productImageUrl` y `fallbackInitial`;
  agregar el test de cobertura contra el catálogo semilla.
  Hecho cuando el test pasa y un SKU desconocido devuelve `null`.
  RF: RF-003-01, RF-003-04, RF-003-07

- [ ] **T-003-07 · Rediseñar la tarjeta**
  Imagen de fondo con degradado, nombre, unidad, precio y chips; respaldo con inicial; un solo
  control interactivo y `alt=""`.
  Hecho cuando la tarjeta muestra imagen o respaldo, conserva los chips y el foco visible.
  RF: RF-003-01, RF-003-04…06, RF-003-09, RF-003-11

- [ ] **T-003-08 · Ajustar la rejilla**
  Pasar a 2 columnas a 360 px, 3 en tablet y 4 en laptop.
  Hecho cuando no hay scroll horizontal ni tarjetas cortadas a 360/768/1280.
  RF: RF-003-10

- [ ] **T-003-09 · Precachear las imágenes**
  Agregar `webp` a `workbox.globPatterns` y verificar el manifest del build.
  Hecho cuando `dist/sw.js` incluye las imágenes y la rejilla se pinta con red apagada.
  RF: RF-003-03

## Fase 3 — Calidad

- [ ] **T-003-10 · Probar la tarjeta**
  Cubrir imagen presente, respaldo, `alt=""`, chips y precio de la hoja del día.
  Hecho cuando los tests pasan y no hay botones anidados.
  RF: RF-003-04…06, RF-003-09, RF-003-11

- [ ] **T-003-11 · Validar layout y offline**
  Medir 360/768/1280, targets de 48 px y smoke con red apagada.
  Hecho cuando no hay scroll horizontal, las imágenes salen del precache y el resultado queda
  documentado.
  RF: RF-003-03, RF-003-05, RF-003-10

- [ ] **T-003-12 · Gate de calidad y memoria**
  Ejecutar lint, typecheck, tests, build, `seed:check` e `images:check`; actualizar
  `MEMORY.md` y `specs/README.md`.
  Hecho cuando todo pasa, no hay secretos y la spec queda lista para cerrar.
  RF: —
