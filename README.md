# LEN-521 · Facility Health Signals · Prototype

Prototipo interactivo de la iniciativa **LEN-521 — Incorporar en Facilities señales de salud** para LenderHub.

Cubre 11 HUs distribuidas en 3 épicas:
- **LEN-567** · Cut-off context & basic pool signals
- **LEN-903** · Section enhancements (Aging · OC · Assets)
- **LEN-904** · Critical signals (Headroom + Compliance)
- Plus: **LEN-918** · Borrowing Base section

---

## 📂 Estructura

```
prototypes/
├── LEN-521-facility-health-signals.html   ← Prototipo principal (interactivo)
├── LEN-521-portfolio-comparison.html      ← Vista cross-facility (Heatmap + Trends + Peer)
├── LEN-521-storytelling.md                ← Narrativa completa del caso F-2241 Covalto
├── runtime/
│   └── len-521-runtime.js                 ← Web Components con la misma lógica que Angular
├── angular-impl/                          ← Implementación TypeScript real para el monorepo
│   └── financials-mfe/src/app/pages/facility-insights/
│       ├── components/                    ← 12 componentes Angular 18
│       ├── services/                      ← HTTP + frequency inference
│       ├── models/                        ← AdaptiveDelta + enums
│       └── pipes/                         ← AdaptivePeriodPipe (master rule)
├── facility-cards/                        ← Diseños iniciales por card
├── cutoff-dropdown/                       ← Iteraciones del selector
└── LEN-876/                               ← Reporting frequency badge
```

---

## 🚀 Cómo usarlo

### Demo interactivo
```bash
open LEN-521-facility-health-signals.html
```

### Funcionalidades activas
- **Cut-off picker** con search + year accordions + recent shortcuts
- **Currency selector** con bandera 🇲🇽 MXN
- **Sidebars colapsables** con transiciones suaves (250ms cubic-bezier)
- **Flag for review** modal completo con multi-recipient + toast confirmación
- **View raw data** colapsables en Aging · OC · BB · Assets
- **Web Components** en `runtime/` ejecutan la lógica master rule en vivo

---

## 🎯 Caso de uso

**Facility:** F-2241 Covalto · Originator LeaseMD · Cut-off Mar 31, 2026

**Storytelling:** Una facility revolvente que opera técnicamente compliant en headroom pero cruzó 3 covenants simultáneamente:
- 90+ aging al 9.18% (covenant 8%)
- OC en breach 1.28 vs. 1.35 requerido
- 2 de 5 trust accounts en breach

→ Ver [`LEN-521-storytelling.md`](LEN-521-storytelling.md) para el guión completo.

---

## 🧩 Mapeo a Angular

Cada custom element del HTML mapea 1:1 a un componente real:

| Custom element HTML | Componente Angular |
|---|---|
| `<facility-insights-page>` | `FacilityInsightsPage` |
| `<cut-off-dropdown>` | `CutOffDropdownComponent` (LEN-889) |
| `<reporting-frequency-badge>` | `ReportingFrequencyBadgeComponent` (LEN-876) |
| `<undrawn-commitment-card>` | `UndrawnCommitmentCardComponent` (LEN-568) |
| `<account-balance-status>` | `AccountBalanceStatusComponent` (LEN-570) |
| `<aging-section>` | `AgingSectionComponent` (LEN-578) |
| `<overcollateralization-section>` | `OvercollateralizationComponent` (LEN-886) |
| `<borrowing-base-section>` | `BorrowingBaseSectionComponent` (LEN-918) |
| `<assets-evolution>` | `AssetsEvolutionComponent` (LEN-662) |
| `<delta-chip>` | `DeltaChipComponent` (master rule LEN-567) |

---

## 🎨 Design System

Sigue las reglas del **CXC Design System**:
- Colores: tokens de la paleta oficial (Slate · Primary · Secondary · semantic states)
- Tipografía: Sofia Sans + Noto Sans + Space Mono
- Iconos: Phosphor Icons (`ph ph-*`)
- Spacing: múltiplos de 2px
- KPI cards: `border-radius 12px · padding 16px · no shadow`

---

## 📝 Status

| Wave | Épica | Status |
|---|---|---|
| 🌊 1 | LEN-567 — Cut-off context y señales básicas | Ready for Development |
| 🌊 2 | LEN-903 — Section enhancements | Waiting for Design |
| 🌊 3 | LEN-904 — Critical signals | Waiting for Design |
| +    | LEN-918 — Borrowing Base | Backlog |

---

**Owner:** Nilda Aviles · LenderHub PM
**Last update:** May 2026
