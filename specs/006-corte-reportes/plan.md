# Plan — Spec 006 · Corte de caja y reportes

## Flujo

```text
tickets (IndexedDB) ──► buildDailyReport ──► pestaña Corte ──► cashCuts (Dexie v4)
                                                │
outbox pending/failed ──► sin sincronizar       └──► GET /reports/daily ──► sales
                                                              (conciliación)
```

- El reporte local es la fuente de verdad del mostrador.
- El backend solo suma ventas ya sincronizadas; la diferencia esperada se explica por los
  tickets pendientes o fallidos.

## Contrato `GET /reports/daily?business_date=AAAA-MM-DD`

```json
{
  "business_date": "2026-11-22",
  "ticket_count": 3,
  "total": "1234.50",
  "by_payment_method": { "cash": "1000.00", "card": "200.00", "transfer": "34.50" },
  "products": [
    {
      "product_id": "prd-pierna-muslo",
      "sku": "PIERNA-MUSLO",
      "name": "Pierna y muslo",
      "unit": "kg",
      "pieces": 0,
      "grams": 1345,
      "total": "201.75"
    }
  ],
  "categories": [{ "name": "Pollo fresco", "total": "1234.50" }]
}
```

- Dinero como string de 2 decimales; piezas y gramos como enteros.
- `404` no: un día sin ventas devuelve ceros.
- `422` si `business_date` no es una fecha.

## Backend

| Archivo | Contenido |
|---|---|
| `app/schemas/reports.py` | `DailyReportOut`, `ProductReportOut`, `CategoryReportOut` y serializadores de dinero |
| `app/repositories/reports.py` | `build_daily_report()` puro y `SqlReportRepository.daily_report()` |
| `app/routers/reports.py` | `GET /reports/daily` con `business_date` |
| `app/main.py` | Registra el router de reportes |
| `tests/conftest.py` | `FakeReportRepository` y override de dependencia |
| `tests/test_reports.py` | Contrato, fecha inválida y agregación pura |

Agregación:

- Se cargan las ventas del día con sus líneas (`selectinload`).
- `by_payment_method` siempre trae `cash`, `card` y `transfer` (cero si no hubo).
- Productos por `product_id`: suma `pieces` o `grams` según `unit` y `total`.
- Categorías por `category_name`.
- Listas ordenadas por total descendente.

## Frontend

| Archivo | Contenido |
|---|---|
| `src/types/report.ts` | `DailyReport`, `CashCut`, totales por pago/producto/categoría |
| `src/lib/reports.ts` | `buildDailyReport`, `buildCashCut`, `reconcileReports`, `formatSignedCents` |
| `src/lib/reportRepository.ts` | Tickets por día, corte por día, historial y conteo sin sincronizar |
| `src/lib/reportsApi.ts` | `fetchDailyReport` con timeout; devuelve `null` si no hay red |
| `src/hooks/useReports.ts` | Carga al abrir la pestaña, guarda/recalcula y consulta la conciliación |
| `src/components/pos/ReportsTab.tsx` | Resumen, efectivo, desgloses, conciliación e historial |
| `src/lib/db.ts` | Dexie v4 con `cashCuts` |
| `src/App.tsx` | Cuarta pestaña «Corte» |

### Reporte local

```ts
buildDailyReport(tickets, businessDate): DailyReport
```

- Filtra por `businessDate`.
- `totalCents = sumCents(tickets.map(t => t.totalCents))`.
- Promedio con aritmética entera (sin `float`): `floor((total + floor(count / 2)) / count)`.
- Productos: agrupa por `productId`, suma piezas o gramos y el importe de línea.
- Categorías: agrupa por `categoryName`.
- Ordena productos y categorías por total descendente.

### Corte

```ts
interface CashCut {
  businessDate: string;
  openingCashCents: Cents;
  countedCashCents: Cents;
  expectedCashCents: Cents;
  differenceCents: number; // puede ser negativo
  ticketCount: number;
  totalCents: Cents;
  byPayment: Record<PaymentMethod, Cents>;
  closedAtUtc: string;
  recalculatedAtUtc: string | null;
}
```

- `expectedCashCents = openingCashCents + byPayment.cash`.
- `differenceCents = countedCashCents - expectedCashCents`.
- Primera vez: `closedAtUtc = now`, `recalculatedAtUtc = null`.
- Recálculo: conserva `closedAtUtc`, actualiza totales y `recalculatedAtUtc`.
- La tabla `cashCuts` usa `businessDate` como llave; Dexie v4 conserva lo anterior.

### Conciliación

```ts
reconcileReports(local, remote): {
  localTotalCents, remoteTotalCents, differenceCents,
  byPayment: Record<PaymentMethod, { localCents, remoteCents, differenceCents }>
}
```

- `remote` es `null` si la API no respondió; la UI muestra «sin conciliación».
- Diferencia positiva = el backend tiene menos ventas (pendientes de sincronizar).

### Pestaña Corte

1. Encabezado con la fecha de negocio.
2. Tarjetas: total, tickets, promedio.
3. Desglose por método de pago.
4. Formulario de efectivo: fondo inicial, efectivo contado, esperado y diferencia.
5. Botón «Cerrar caja» o «Recalcular» si ya existe corte.
6. Aviso de «hay ventas nuevas» y de tickets sin sincronizar.
7. `<details>` con productos y categorías para no alargar la pantalla.
8. Conciliación con el backend.
9. Historial de cortes guardados (solo lectura).

## Tests

| Requisito | Test |
|---|---|
| RF-006-01/02 | `reports.test.ts`: totales, piezas, gramos, promedio y orden |
| RF-006-03/04 | `reports.test.ts` + `reportRepository.test.ts`: esperado, diferencia y persistencia |
| RF-006-05 | `ReportsTab.test.tsx`: aviso y botón Recalcular |
| RF-006-06 | `reportRepository.test.ts`: cuenta pending y failed del día |
| RF-006-07 | `reports.test.ts`: conciliación y caso sin remoto |
| RF-006-08 | `test_reports.py`: contrato y agregación pura |
| RF-006-09 | `db.test.ts`: v4 conserva tickets/outbox y agrega `cashCuts` |
| RF-006-10 | Revisión a 360 px y targets de 48 px |

## Orden de implementación

1. Tipos, Dexie v4 y repositorio local.
2. `reports.ts` con las funciones puras y sus tests.
3. Backend: esquemas, agregación, repositorio, router y tests.
4. `reportsApi.ts` y `useReports`.
5. `ReportsTab` y pestaña en `App`.
6. Revisión visual, puerta de calidad y cierre documental.
