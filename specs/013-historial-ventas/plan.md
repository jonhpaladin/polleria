# Plan — Spec 013 · Historial y CSV

## Flujo

```text
IndexedDB (tickets)
      │  businessDate entre desde y hasta
      ▼
listTicketsBetween ──► filtro por folio ──► lista / detalle
      │
      └── buildSalesCsv ──► Blob UTF-8 ──► descarga CSV
```

## Frontend

| Archivo | Contenido |
|---|---|
| `lib/historyRepository.ts` | Tickets por rango, ordenados por fecha y folio |
| `lib/salesCsv.ts` | Encabezados, escape, filas por línea y BOM |
| `hooks/useHistory.ts` | Rango, búsqueda, carga y descarga |
| `components/pos/HistoryTab.tsx` | Filtros, totales, lista y detalle |
| `App.tsx` | Sexta pestaña «Historial» |

## Reglas

- Fechas de negocio en `America/Mexico_City`; el rango se compara como texto `AAAA-MM-DD`.
- Se incluyen tickets `confirmed` y `voided`.
- Los totales del historial separan activas y anuladas.
- El CSV usa centavos convertidos a decimal con `centsToDecimal`; nunca `float`.
- La lista se corta a 500; el CSV se genera con todos los tickets del rango.
- El BOM `\uFEFF` va al inicio para que Excel respete los acentos.

## CSV

- Separador coma, fin de línea `\r\n`.
- Todos los campos entre comillas dobles; las comillas internas se duplican.
- Encabezado fijo y una fila por línea de ticket.
- Si un ticket no tiene líneas, no se inventa una fila.

## Pruebas

- `salesCsv.test.ts`: encabezado, escape, decimales, anuladas y BOM.
- `historyRepository.test.ts`: rango inclusivo, orden y búsqueda.
- `HistoryTab.test.tsx`: totales, filtro y estado vacío.
- Puerta de calidad completa.
