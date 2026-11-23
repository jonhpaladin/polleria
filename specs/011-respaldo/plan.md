# Plan — Spec 011 · Respaldo y restauración

## Flujo

```text
IndexedDB (tickets, outbox, cashCuts, dailyPrices)
        │
        └── buildBackup ──► JSON ──► descarga del navegador
                                      │
                                      └── el dueño lo guarda fuera de la tablet

archivo JSON ──► validateBackup ──► vista previa ──► restoreBackup
                                                    │
                                                    └─ merge en una transacción
```

- El respaldo no toca la red: funciona con la PWA offline.
- La restauración nunca borra ni reemplaza datos existentes.
- El folio local se restaura al máximo para no repetir números.

## Contenido

| Tabla | Llave | Se respalda |
|---|---|---|
| `tickets` | `clientOrderUuid` | Sí |
| `outbox` | `clientOrderUuid` | Sí |
| `cashCuts` | `businessDate` | Sí |
| `dailyPrices` | `id` | Sí |
| `categories`, `products`, `meta` | — | No: se reconstruyen del catálogo |
| `localStorage` (claves) | — | No |

El archivo incluye `format`, `version`, `exportedAt`, `counts` y `lastLocalFolio`.

## Validación

- `format === "polleria-backup"` y `version === 1`.
- Fechas y montos con la forma esperada; montos en centavos enteros.
- Líneas de ticket y payload del outbox con sus campos mínimos.
- Si un registro falla, se rechaza el archivo completo y no se escribe nada.

## Fusión

1. Leer las llaves existentes de cada tabla.
2. Agregar solo los registros cuyo `clientOrderUuid`, `businessDate` o `id` no exista.
3. Actualizar `meta["ticket-sequence"]` al máximo entre el folio actual y el del respaldo.
4. Devolver cuántos registros se agregaron y cuántos se omitieron.

Todo ocurre dentro de `db.transaction("rw", ...)`; un error revierte la transacción.

## Frontend

| Archivo | Contenido |
|---|---|
| `src/types/backup.ts` | `BackupPayload`, conteos y resultado de restauración |
| `src/lib/backup.ts` | Construcción, validación, descarga y fusión |
| `src/lib/backupStatus.ts` | Último respaldo, recordatorio de 7 días y evento |
| `src/hooks/useBackup.ts` | Conteos, descarga y restauración |
| `src/hooks/useBackupStatus.ts` | Marca la pestaña cuando toca respaldar |
| `src/components/pos/BackupTab.tsx` | Pestaña «Respaldo» con vista previa y confirmación |
| `src/App.tsx` | Quinta pestaña y aviso `Respaldo ⚠` |

## Pruebas

- `backup.test.ts`: construcción, validación, rechazo y fusión idempotente.
- `backupStatus.test.ts`: recordatorio y persistencia de la fecha.
- La puerta de calidad completa en verde.

## Riesgos

- El archivo contiene ventas: la UI avisa y recomienda un lugar privado.
- En modo privado del navegador `localStorage` puede no persistir el aviso; el respaldo sí
  funciona.
- Un respaldo viejo restaurado sobre ventas nuevas no las pisa; el reporte local manda.
- Si el archivo se corrompe, se rechaza completo; no hay restauración parcial.
