# F-2241 Covalto · Storytelling completo
**Cut-off: March 31, 2026 · Originator: LeaseMD · Currency: MXN**

---

## 🎬 TL;DR — La historia en una línea

> Una facility revolvente que opera **técnicamente compliant en headroom** pero ya cruzó **3 covenants simultáneamente** y está pagando **default interest** desde Marzo. Lo que parecía deterioro gradual es ahora una espiral confirmada con causa raíz en la calidad del pool subyacente.

---

## 📈 Los hechos puros (lo que muestra el corte)

| Indicador | Valor | Estado |
|---|---|---|
| Portfolio Balance | $299.37M | ▲ +6.2% vs. prior |
| Outstanding Debt | $226.40M | ▲ +8.1% vs. prior (exposure ↑) |
| Maximum Credit | $300.00M | Contractual ceiling |
| Undrawn Commitment | $73.60M | Compliant headroom |
| **OC Reported / Required** | **1.28 / 1.35** | ✗ **Non compliant** (−0.07 deficit) |
| **90+ delinquency** | **9.18%** | ✗ **ALERT** (covenant cap 8%) |
| **Rising trend 90+** | **5 cuts consecutivos** | ✗ Trayectoria confirmada |
| BB Utilization | 94.9% | ⚠ Watch zone |
| Ineligible ratio | 13.8% (+18.6% MoM) | ⚠ Calidad cayendo |
| **Trust accounts en breach** | **2 de 4** | ✗ Reserva + Liquidez −$7.43M |
| **Effective interest rate** | **16.75%** | ⚠ Stated 13.75% + Default 3.00% |
| Annual interest cost | ~$37.92M | Sobre $226.40M outstanding |

---

## 🎭 La historia en 3 actos

### Acto 1 — Setup · Noviembre 2025
**Facility saludable con un detalle.**

- 90+ delinquency: **5.50%** (sano, lejos del cap 8%)
- BB cushion: **$35.0M** (cómodo)
- OC: 1.34 vs. 1.35 requerido (1 bp debajo del mínimo — non-compliant técnico pero menor)
- Trust accounts: intactos
- Originador girando dentro de plan

> Lectura: facility operando dentro de parámetros normales con un single point of friction en OC. Nada que dispare alarmas.

---

### Acto 2 — Slow burn · Diciembre 2025 → Febrero 2026
**Cuatro indicadores degradan en paralelo.**

| Métrica | Nov | Dec | Jan | Feb |
|---|---|---|---|---|
| 90+ aging | 5.50% | 6.80% | 7.70% | 7.96% |
| BB Availability | $35.0M | $27.5M | $21.5M | $16.5M |
| OC reported | 1.34 | 1.40 | 1.40 | 1.34 |
| Ineligible ratio | 11.8% | 12.2% | 12.2% | 12.7% |

**Qué está pasando bajo la superficie:**

1. El **90+ sube 4 cortes consecutivos** — los créditos del pool subyacente no se cobran a tiempo
2. **Ineligible crece más rápido que el pool total** — más loans están saliendo de la eligibility por mora, garantía o documentación
3. **BB cushion se evapora −53%** ($35M → $16.5M) — menos collateral elegible para soportar la deuda
4. **OC oscila** alrededor del threshold sin estabilizarse — no hay margen para absorber un mes malo

**Origen probable:** la subscription del originador (LeaseMD) se aflojó. Cosechas más nuevas tienen peor performance que las viejas. Cobranza interna no compensa el rate de origination de loans frágiles.

> Lectura del analista: "esto no es ruido, es tendencia. Pero técnicamente la facility sigue dentro de covenants en 3 de 4 dimensiones."

---

### Acto 3 — Inflexión · Marzo 2026
**Convergencia de 3 covenant events.**

```
   90+ aging      7.96% ──► 9.18%   ✗ CRUZÓ 8% COVENANT
   OC ratio       1.34  ──► 1.28    ✗ BREACH PROFUNDIZADO (5.2% below min)
   Trust accounts intactas ──► 2 of 4 in breach  ✗ RESERVA Y LIQUIDEZ AGOTADAS
```

**Consecuencia legal automática:** el credit agreement dispara **default interest +3.00%** sobre el stated rate.

- Stated: 13.75% → **Effective: 16.75%**
- Cost adicional anual: **$226.40M × 3% = +$6.79M de interés**
- El originador ahora paga más justo cuando menos puede

**El indicador que NO disparó (pero está a una vuelta):**
- BB Availability: $12.1M (94.9% utilization · Watch zone)
- One drawdown promedio del originador lo mete en Tight (95%+)
- La compliance del BB es **circunstancial, no estructural**

> Lectura del analista: "lo que parecía deterioro está confirmado como espiral. La cobranza no cubre el cash burn. El default interest acelera el burn."

---

## 🔗 La cadena causal (el insight)

Los 5 indicadores no son señales independientes — son la **misma tormenta vista desde 5 ventanas**:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ORIGEN: Underwriting del originador se aflojó                       │
│  (cosechas recientes con peor scoring que cosechas viejas)           │
└─────────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PRIMERA ONDA: Performance del pool                                  │
│  · 90+ delinquency rising 5 cuts (5.5% → 9.18%)                      │
│  · Ineligible receivables growing +18.6% MoM                         │
└─────────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│  SEGUNDA ONDA: Capacidad de soporte                                  │
│  · BB cushion compressed −65.4% (5 cuts)                             │
│  · OC ratio deteriorating (1.34 → 1.28)                              │
│  · Pool ya no respalda el outstanding con margen                     │
└─────────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│  TERCERA ONDA: Cash burn del originador                              │
│  · Trust accounts drenadas (Reserva −$5.86M, Liquidez −$1.57M)       │
│  · Cobranza no cubre interés + opex + reservas                       │
└─────────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│  CUARTA ONDA: Mecánica contractual                                   │
│  · Covenants breach → Default interest +3.00%                        │
│  · Annual cost +$6.79M sobre cash burn ya estresado                  │
│  · El propio breach amplifica el problema (feedback loop)            │
└─────────────────────────────────────────────────────────────────────┘
                          ↓
              ⚠ ESPIRAL DE DETERIORO CONFIRMADA
```

---

## 🎯 Lo que la data NO dice (pero está implícito)

### 1. La cobertura de intereses está en zona crítica
- Cost mensual de interés: **$3.16M**
- Cobranza neta mensual estimada (si yield underlying ~28% sobre $258M elegibles, neta de losses): **~$2–3M**
- **El originador está usando reservas para pagar interés** → eso explica los breaches de trust accounts

### 2. El BB sigue Compliant pero es ilusorio
- Avail $12.1M sobre $226.40M outstanding = 5.3% de buffer
- Un mes de cobranza débil (típico en Q4 o Semana Santa) lo destruye
- **Compliant ≠ Tranquilo** — esto es exactamente lo que LEN-918 quería exponer

### 3. El loop default-interest acelera la espiral
- +3% sobre $226.40M = +$6.79M/año = **+$566K/mes** de cost adicional
- Sin nuevos drawdowns, ese cost se compone sobre saldo decreciente
- Con drawdowns (que el originador necesita), se compone sobre saldo creciente
- Cualquier camino lleva a más stress

---

## 🚨 Recommended actions (para el comité de riesgo del lender)

### Inmediatas (esta semana)
1. **Cure period 5 días hábiles**: requerir plan de remediación del originador
   - Plan de cobranza acelerada
   - Inyección de capital para curar trust accounts
   - Pausa de drawdowns hasta remediación
2. **Convocar workout team interno** (legal + risk + comercial)
3. **Pull report extraordinario** de pool al cierre de Abril (NO esperar el corte mensual)

### Próximos 30 días
4. **Evaluar amendment** del credit agreement (waivers, repricing, advance rate adjustments)
5. **Solicitar collateral adicional** (perfeccionamiento de garantías secundarias si existen)
6. **Stress test interno**: ¿qué pasa si 90+ llega a 12%? ¿Si OC cae a 1.20?

### Estratégicas
7. **Decisión de continuidad**: ¿restructure / runoff / acceleration?
8. **Provisión contable**: el effective rate de 16.75% justifica IFRS 9 Stage 2
9. **Notificación a contrapartes**: si esta facility está sindicada, alertar a co-lenders

---

## 💬 Cómo presentar esto al comité de inversión (1 minuto)

> *"F-2241 Covalto cruzó 3 covenants en Marzo: 90+ delinquency al 9.18% sobre cap 8%, OC en 1.28 sobre mínimo 1.35, y 2 de 4 cuentas del fideicomiso en breach. El default interest +3% se activó automáticamente, llevando la tasa efectiva a 16.75% anual sobre $226.40M outstanding — eso son $6.79M adicionales de carga financiera al originador justo cuando su cobranza ya no cubre el servicio normal. Lo que parecía deterioro gradual en los 4 cortes anteriores ahora es una espiral confirmada con origen en degradación del pool subyacente. Recomiendo cure period 5 días + workout team + decisión de continuidad antes de Abril."*

---

## 🧭 Hooks para los próximos cortes (qué watch en Abril)

| Indicador | Si pasa esto... | Significa... |
|---|---|---|
| 90+ baja debajo de 8% | Cura natural por cobranza extraordinaria | Plan funcionando — relax temporal |
| BB Availability < $5M | Originador giró | Tight zone — escalación inmediata |
| OC sube a 1.30+ | Inyección de eligible collateral | Originador trayendo recursos externos |
| Trust accounts cura | Inyección directa de capital | Compromiso del originador con la facility |
| 90+ supera 10% | Deterioro acelerado | Trigger de acceleration en credit agreement |

---

## 📊 Stat para el headline

**"5 cortes consecutivos de deterioro, 3 covenants cruzados simultáneamente, $6.79M de default interest adicional anual, y BB cushion comprimido 65.4% — F-2241 Covalto ya no es un facility de monitoreo, es un caso de workout."**

---

*Documento generado a partir de los datos del prototipo LEN-521 · F-2241 Covalto · Cut-off Mar 31, 2026*
