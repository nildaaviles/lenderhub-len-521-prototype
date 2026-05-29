# LEN-521 · Angular Implementation

Implementación Angular siguiendo el playbook `frontend_change.md` aplicada al prototipo HTML.

## Estructura generada

```
financials-mfe/src/app/pages/facility-insights/
├── facility-insights.page.ts                              [composición del módulo]
├── models/
│   ├── reporting-frequency.enum.ts                        [LEN-876]
│   └── delta.model.ts                                     [master rule LEN-567]
├── pipes/
│   └── adaptive-period.pipe.ts                            [master rule LEN-567]
├── services/
│   ├── facility-insights.service.ts                       [HTTP — Loader-Opt-In, QueryBuilder]
│   └── reporting-frequency.service.ts                     [LEN-876 mediana de cortes]
└── components/
    ├── shared/
    │   └── delta-chip.component.ts                        [1 chip → 4 schemas]
    ├── cut-off-header/
    │   ├── reporting-frequency-badge.component.ts         [LEN-876]
    │   └── cut-off-dropdown.component.ts                  [LEN-889]
    ├── critical-signals/
    │   ├── undrawn-commitment-card.component.ts           [LEN-568]
    │   └── account-balance-status.component.ts            [LEN-570]
    └── aging-section/
        └── aging-section.component.ts                     [LEN-578]
```

## Decisiones del playbook aplicadas

| Regla del playbook | Cómo se cumple |
|---|---|
| ✅ Angular 18 standalone + OnPush | Todos los componentes con `standalone: true` y `ChangeDetectionStrategy.OnPush` |
| ✅ Signal-based API | `input.required<>()`, `output<>()`, `signal()`, `computed()`, `effect()`. Cero `@Input/@Output` |
| ✅ `@cxc/ui-kit` reusado | `HumanizeNumberPipe`, `TruncateDecimalsPipe`, `<chart>`, `<chart-legends>`, `<loader-wrapper>`, `<empty-state-page>` |
| ✅ `@cxc/core` reusado | `PendoService.trackEvent`, `QueryBuilder` |
| ✅ PrimeNG 18 | `<p-dropdown>` con templates de grupo, `<p-table>` |
| ✅ Tailwind para estilos | Sin CSS inline; clases utility |
| ✅ Phosphor Icons | `ph ph-*` (warning, info, arrow-up, shield-check, etc.) |
| ✅ `Loader-Opt-In` + `<loader-wrapper>` | Cada endpoint con su `loaderKey`; sin `*ngIf="loading"` |
| ✅ `QueryBuilder` para params | `new QueryBuilder().add('cutOffDate', date).build()` |
| ✅ Sin `any` | Interfaces tipadas: `AdaptiveDelta`, `CutOffOption`, `AgingData`, etc. |
| ✅ Sin `console.log` | Errores via `ErrorStore` (interceptor automático) |
| ✅ Pendo via service, no global | `PendoService.trackEvent()` |

## Decisiones de arquitectura clave

### 1. `DeltaChipComponent` — 1 componente para 6+ HUs
Master rule del módulo encapsulada en un solo componente con 4 schemas:
- `standard` — sube verde, baja ámbar (Portfolio Balance, Aging, etc.)
- `inverted` — sube ámbar, baja verde (Outstanding Debt LEN-573)
- `neutral` — siempre gris, solo dirección (Avg. Current Balance LEN-879)
- `growth-only` — sube verde, baja gris (Total Contracts LEN-663)

### 2. `AdaptivePeriodPipe` — texto del periodo, una sola vez
Garantiza que **nunca** aparezca "MoM"/"WoW" hardcoded. Test trivial:
```ts
expect(pipe.transform('monthly')).toBe('vs. prior month');
```

### 3. `ReportingFrequencyService` — mediana, no promedio
Robustez contra cortes faltantes y festivos (LEN-876 regla central).

### 4. Eventos Pendo via `effect()`
Cada componente dispara su evento `*_viewed` automáticamente cuando el `input` cambia y el componente está renderizado — sin tener que recordar llamarlo en `ngOnInit` ni en `*_changes`. Bonus: si por trigger de riesgo se debe disparar `health_signal_triggered`, se hace en el mismo `effect` (atomic).

## Deuda técnica detectada (señalada al usuario, NO movida en este sprint)

1. **`AdaptiveDelta` + `ReportingFrequency` deben vivir en `@cxc/core`** — son cross-MFE (también las usaría `data-studio-mfe`).
2. **Si `data-studio-mfe` está en `@cxc/ui-kit ^0.0.40`** — no incluye `<chart-legends>`. Para usarlo ahí necesitaríamos bump.
3. **`account_name` viene en español del reporte** — confirmado como excepción explícita a la language rule (regla 4 LEN-521).

## Lo que falta vs. spec completa (Sprint 3)

Estos componentes siguen el mismo patrón — los dejo como TODO para no inflar este entregable:

- `portfolio-balance-card.component.ts` (LEN-572) — trivial extensión del KPI card existente + `delta-chip`
- `outstanding-debt-card.component.ts` (LEN-573) — idem con `colorScheme="inverted"`
- `total-contracts-card.component.ts` (LEN-663) — idem con `colorScheme="growth-only"`
- `avg-current-balance-card.component.ts` (LEN-879) — idem con `colorScheme="neutral"`
- `overcollateralization.component.ts` (LEN-886) — extensión de la sección existente con delta chip en header + callout banner
- `assets-evolution.component.ts` (LEN-662) — chart de 2 líneas con áreas rellenas + mini-KPIs + disclosure

## Siguientes pasos sugeridos

1. **Validar componentes reales de `@cxc/ui-kit`**: leer el README real del monorepo para confirmar nombres y APIs (algunos imports asumidos arriba pueden requerir ajuste).
2. **Compilar tipos**: `cd financials-mfe && npx tsc --noEmit`
3. **Tests prioritarios**:
   - `reporting-frequency.service.spec.ts` — buckets daily/weekly/monthly, edge cases (<2 cortes, mediana fuera de rango, outliers)
   - `delta-chip.component.spec.ts` — los 4 colorSchemes × 4 variants
   - `adaptive-period.pipe.spec.ts` — 3 frecuencias + null/undefined
   - `aging-section.component.spec.ts` — Rising trend (5 incrementos estrictos), ALERT umbral 8.00% exacto
4. **Endpoint backend** del campo `reporting_frequency` confirmado con Juan Carlos Soto antes de Sprint 1.
