# Lógica de cálculo de criterios de concentración — spec completa

> Objetivo: garantizar que el motor (LEN-1044) pueda computar **todos** los cálculos que exige el clausulado real.
> Base: 62 facilities prod → **294 criterios individuales** segmentados (col P `criterias.concentration`).

---

## 1. Veredicto

- **255/294 (86%)** se calculan con el modelo **plano** actual `{operator, threshold, unit}` → `actual vs límite`.
- **39/294 (13%)** exigen un modelo **extendido**. Sin él, esos criterios NO se pueden calcular.
- El resto (~1%) son placeholders/informativos sin cálculo.

| Extensión requerida | # criterios | Sin ella no se puede… |
|---|---|---|
| `top_n` (suma de los N mayores) | 15 | calcular "los 5 mayores ≤ 25%" |
| `weighted_avg` (promedio ponderado) | 7 | calcular "B-Score ponderado ≥ 587" |
| `limit_max_of` (límite = max(%, $)) | 7 | resolver "lo que resulte mayor entre 6% o $5.25M" |
| `per_attribute_override` (excepción por valor) | 6 | "estado ≤15%, salvo CDMX ≤30%" |
| `haircut` (cap a base elegible, no breach) | 5 | "el exceso no computa para el Aforo" |
| `limit_por_rango` (límite por bucket de otra métrica) | 2 | "si mora >10% ⇒ cap 5%; si 7.5-10% ⇒ 15%" |
| `limit_tiered` (límite por tramo de rank) | 2 | "primeros 5 / siguientes 5 / resto" |

---

## 2. Anatomía de un cálculo de criterio

Todo criterio se reduce a comparar un **valor agregado (actual)** contra un **límite**, con un **efecto**. La variedad vive en 6 ejes:

```
            NUMERADOR              DENOMINADOR        COMPARADOR    LÍMITE         EFECTO
actual  =  agg(measure, group) /  base            op (max/min)   limit_resolved  breach|haircut|filter
```

### Esquema de datos propuesto (extiende el plano)
```jsonc
{
  "index": 8, "legal_text": "…", "language": "es",
  "kind": "concentration_max",        // …| aggregate_cap | composition_floor | count_limit | eligibility | informative

  "measure": {                        // NUMERADOR — qué se mide
    "field": "saldo_insoluto_principal", // | valor_presente_neto | flujos | valor_residual | <atributo> | count
    "aggregation": "sum"              // sum | count | weighted_avg | max_over_group | topn_sum | per_loan
  },
  "group_by": null,                   // null | {type:"subject", key:"cliente|deudor|obligado|grupo"} | {type:"attribute", key:"estado|sector|industria|sucursal|producto|ciclo"}
  "topn": null,                       // {n:5, rank_by:"flujos"}                  ← top_n
  "weight_field": null,               // "saldo_insoluto"  (para weighted_avg)    ← weighted_avg
  "base": "patrimonio_fideicomiso",   // | base_de_calculo | cartera_total | derechos_de_cobro | null (abs/count)

  "operator": "max",                  // max(tope) | min(piso) | between | gte | lte | eq
  "limit": {
    "type": "scalar",                 // scalar | max_of | tiered | conditional | per_attribute
    "value": 25, "unit": "%",         // unit ∈ % | $ | conteo | pts | dias | meses | x
    "max_of":      [ {"value":6,"unit":"%"}, {"value":5250000,"unit":"$"} ],   // ← limit_max_of
    "tiers":       [ {"bucket":"primeros_5","limit":{…}}, {"bucket":"resto","limit":{…}} ], // ← limit_tiered
    "conditions":  [ {"when":{"field":"mora_pct","range":[10,null]}, "limit":{"value":5,"unit":"%"}} ], // ← por_rango
    "default":     {"value":15,"unit":"%"},                                     // ← per_attribute_override
    "overrides":   { "CDMX":{"value":30,"unit":"%"}, "Veracruz":{"value":20,"unit":"%"} }
  },

  "effect": "breach",                 // breach (computa exceso) | haircut (recalcula base elegible) | eligibility_filter (saca el préstamo)
  "haircut_to": null,                 // {"value":60,"unit":"%","of":"base_de_calculo"}  ó  "excedente_no_computa_aforo"
  "exception_text": "…"
}
```

---

## 3. Fórmula por patrón (los 13 del corpus)

| Patrón | Fórmula de `actual` | Comparación |
|---|---|---|
| **PORCENTAJE simple** (259) | `sum(measure)/base` | `actual ≤ limit` |
| **POR_SUJETO** (106) | `max_e( sum(measure | entity=e) ) / base` | `max_e ≤ limit` |
| **POR_ATRIBUTO** (57) | por cada valor v: `sum(measure | attr=v)/base` | `≤ overrides[v] ?? default` |
| **MONTO_ABSOLUTO** (41) | `sum(measure | entity=e)` (sin base) | `≤ limit$` |
| **PISO_MIN / composición** (21) | `sum(measure_subset)/base` | `actual ≥ limit` ⇒ `excess = max(0, limit−actual)` |
| **TOP_N** (15) | `sum(top_n por rank_by) / base` | `≤ limit` |
| **ESCALONADO max_of** (14) | `actual` por sujeto/tramo | `≤ max(pct×base, abs$)` resuelto por tramo de rank |
| **CONTEO** (4) | `count(group)` | `≤ N` |
| **AVG_PONDERADO** (7) | `Σ(attr_i · w_i) / Σ w_i` | `≥` ó `≤` limit (pts/%) |
| **POR_RANGO** (4) | `sum(measure | bucket=b)/base` | `≤ conditions[b].limit` |
| **CAP_CONDICIONAL/HAIRCUT** (5) | `eligible = min(measure, haircut_limit)` | NO breach; **reduce base/aforo** |
| **ELEGIBILIDAD/UMBRAL** (108) | predicado por préstamo | préstamos que fallan **salen de la base** antes del resto |
| **INFORMATIVO** | — | sin cálculo, solo display |

---

## 4. Fórmula unificada de Exceso/Compliance (rama por `effect`)

```
resolve(limit, ctx):
  scalar       → value
  max_of       → max( pct×base, abs )                 // CIB/4009: max(6%·DC, $5.25M)
  tiered       → tier_limit(rank(entity))             // primeros5 / siguientes5 / resto
  conditional  → conditions[ bucket(secondary) ]      // bucket de mora
  per_attribute→ overrides[attr_value] ?? default     // CDMX 30%, default 15%

compliance(crit):
  if effect == eligibility_filter:
      base_elegible = base − Σ(loans que fallan el predicado)   // afecta TODOS los demás cálculos
      return {eligible_removed}
  if effect == haircut:
      contrib = min(measure, resolve(limit))
      return {eligible_contribution: contrib, exceso_no_computa: measure − contrib}
  // effect == breach:
  L = resolve(limit, ctx)
  if operator == max:     excess = max(0, actual − L);  status = actual ≤ L ? OK : BREACH
  if operator == min:     excess = max(0, L − actual);  status = actual ≥ L ? OK : BREACH
  if operator == between: status = lo ≤ actual ≤ hi ? OK : BREACH
```

> **Orden de evaluación importa:** primero `eligibility_filter` (recalcula base) → luego `haircut` (ajusta contribución) → luego `breach` (concentración sobre la base ya elegible). Si se computa breach sobre la base bruta, los números salen mal.

---

## 5. Gaps del modelo plano actual `{kind, subject, operator, threshold, unit}`

| Necesidad | ¿Plano la cubre? | Campo nuevo |
|---|---|---|
| Numerador explícito (qué se suma) | ❌ implícito | `measure.field` + `aggregation` |
| Denominador / base | ❌ implícito | `base` |
| Suma de los N mayores | ❌ | `topn` |
| Promedio ponderado | ❌ | `weight_field` + `aggregation:weighted_avg` |
| Límite = max(%, $) | ❌ (threshold escalar) | `limit.max_of` |
| Límite por tramo de rank | ❌ | `limit.tiers` |
| Límite por rango de otra métrica | ❌ | `limit.conditions` |
| Excepción por valor de atributo | ❌ (1 threshold) | `limit.default` + `overrides` |
| Haircut vs breach vs filtro | ❌ | `effect` (+ `haircut_to`) |

---

## 6. Implicaciones

1. **Para LEN-1044 (motor):** implementar la rama por `effect` y el `resolve(limit)`. Sin esto, el 13% de criterios reales no calculan (y son justo los de bancos grandes: CIB/4009, F/1435).
2. **Dependencia DWH (T1, Juan Carlos):** varios cálculos necesitan campos que hoy no existen — rank por flujos (`top_n`), bucket de mora (`por_rango`), peso por saldo (`weighted_avg`), atributo de estado/sector/ciclo (`group_by`). Mapear estos al ETL.
3. **Decisión locked "el límite viene en el reporte":** para los criterios donde Actual+Límite+Compliance llegan en el PDF del backup servicer, el motor **muestra**, no recalcula. Pero el esquema extendido sigue siendo necesario para **representar** límites escalonados / max_of / por-atributo en la UI (chips tipo "MAX = max(6%, $5.25M)").
4. **Para el intake (V1):** la extracción asistida debe poder capturar estos campos extendidos. Confirma que la estructuración la haga **LLM** — el regex no infiere `top_n`, `weighted_avg` ni `max_of`.
