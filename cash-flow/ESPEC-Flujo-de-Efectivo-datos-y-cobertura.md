# Flujo de Efectivo — Especificación de datos, mapeo y cobertura

> **Para:** equipo de Datos/ETL (Juan Carlos Soto) · Producto (Nilda)
> **Contexto:** waterfall por periodo + histórico de caja + capa de mapeo (prototipos en `prototypes/cash-flow/`)
> **Estado:** especificación para épica de ingesta · datos reales abr 2026, muestra de 14 reportes de Assetview

---

## 0. Premisa

**No existe —ni existirá— una lista universal de conceptos.** Cada originador arma su reporte mensual a su manera. Cualquier diseño que asuma un catálogo fijo y completo de líneas se rompe en producción. Este documento define cómo el producto es **robusto a esa heterogeneidad** en lugar de pretender eliminarla.

---

## 1. La garantía (qué sí se puede prometer)

No se puede garantizar que el 100% de los reportes **contengan** el dato de flujo de efectivo. Lo que sí se garantiza por diseño es **degradación segura**:

> **El 100% de los reportes entra al sistema sin romperlo: o renderiza correctamente, o muestra un estado explícito con causa nombrada. Nunca un gráfico roto ni un número inventado.**

Cuatro invariantes que hacen cierta esa garantía:

| # | Invariante | Por qué |
|---|---|---|
| **I1** | Toda línea del reporte aterriza en *algún* concepto (los no mapeados → `Otros`) | El waterfall nunca pierde dinero ni se desbalancea |
| **I2** | Los totales se **recalculan** desde las líneas atómicas y deben **cuadrar** con el saldo final del reporte; si no, se rechaza/flaggea | Garantiza mapeo sin pérdida; bloquea datos corruptos |
| **I3** | `sin dato` (no reportado) ≠ `$0` (reportó cero) — se renderizan distinto y `sin dato` no avanza la conciliación | Detecta reportes incompletos en vez de mentir |
| **I4** | Reporte sin la hoja → estado vacío explícito con motivo; archivo no parseable → error nombrado, no silencioso | El 100% es observable, nada falla en silencio |

---

## 2. Auditoría de cobertura (muestra real de 14 reportes)

| Tier | Significado | Reportes | Cobertura |
|---|---|---|---|
| **A — Usable hoy** | Trae el estado *Movimientos de Cuentas y Fondos del Fideicomiso* | **F-1600**, **F-1551**, **F-1483** | **3 / 14 (21%)** |
| **B — Flujo de otro tipo** | Tiene hoja con "flujo" pero NO es el estado de caja | F-1202 (*Flujos Excedentes* = flujo por contrato) | 1 / 14 |
| **C — Sin hoja de flujo** | No trae estado de movimientos; el dato podría reconstruirse de otras hojas (Saldos/Fondos/Servicio Deuda) | F-1143, F-1159, F-1356, F1320 (JHLeasing), F1364 (Bestra), F1423 (Olinx), F1475 (Apex) | 7 / 14 |
| **D — No parseable** | Formato que el lector estándar no abre | F1401 (Vemo) y F1477 (Vandelier) → 0 hojas legibles; F-1359 → `.xlsb` (Excel binario) | 3 / 14 |

**Conclusión:** la hoja de flujo no está estandarizada. El waterfall/histórico es directamente alimentable solo en el Tier A. Tiers B–D requieren decisión explícita (ver §5 y §9).

Incluso dentro del Tier A hay divergencia:
- **Etiquetas distintas** para el mismo concepto (ej. *"Comisión por Disposición"* en F-1551 ≈ *"Gastos de Emisión y Colocación"* en F-1600).
- **Líneas extra** (F-1483: *"Intereses sobre inversiones permitidas"*).
- **Semántica de subtotales distinta:** F-1483 calcula *Total Ingresos* **sin** el saldo inicial; F-1600/F-1551 **lo incluyen**. → *Por eso nunca se confía en los subtotales del reporte; se recalculan.*

---

## 3. Modelo canónico — núcleo fijo + cola abierta

La clave para sobrevivir sin lista universal: el modelo es **cerrado en su núcleo, abierto en su cola**.

```
saldo_inicial                         (saldo)
── Ingresos ─────────────────
  disposicion                         núcleo
  cobranza                            núcleo
  cobranza_nc                         núcleo
  cesion_inv                          núcleo
  int_ganados                         núcleo
  otros_ing            ← CAJÓN ABIERTO: cualquier ingreso no mapeado cae aquí
── Egresos ──────────────────
  fondos_fid                          núcleo
  principal                           núcleo
  gastos_emi                          núcleo
  int_pagados                         núcleo
  honorarios                          núcleo
  impuestos                           núcleo
  comisiones                          núcleo
  otros_egr            ← CAJÓN ABIERTO: cualquier egreso no mapeado cae aquí
saldo_final                           (saldo)
```

- **Núcleo (13 conceptos):** estable, comparable entre facilities, alimenta los buckets del waterfall.
- **Cajón abierto (`otros_ing` / `otros_egr`):** absorbe lo que no se reconoce. **Garantiza I1**: ninguna línea queda fuera, el balance siempre cierra.
- Extender el núcleo (promover un concepto que hoy cae en "Otros") es una decisión deliberada, versionada — no automática.

Cada concepto tiene: `key`, `grupo` (in/out), `label`, `signo`.

---

## 4. Diccionario de mapeo (dialecto → canónico)

Activo curado, **no inferido**. Un renglón por (originador/plantilla, etiqueta de origen):

```
{
  facility_o_plantilla : "F-1551",
  etiqueta_origen      : "Comisión por Disposición del Crédito",
  concepto_canonico    : "gastos_emi",
  confianza            : "aproximado",   // exacto | aproximado | agregado
  revisado_por         : "<analista>",
  vigente_desde        : "2026-04",
  version              : 3
}
```

Niveles de confianza (auditables en la UI con chips):

| Confianza | Significado | Acción |
|---|---|---|
| **exacto** | etiqueta = concepto sin ambigüedad | automático |
| **aproximado** | mapeo por criterio humano | requiere revisión de analista; visible/reversible |
| **agregado** | N líneas → 1 concepto | suma; documentar las fuentes |
| *(sin mapeo)* | etiqueta desconocida | cae en `otros_*` **y** levanta tarea de curación |

---

## 5. Reglas de fallback por escenario (lo que la UI hace en cada caso)

| Escenario | Waterfall / Histórico | Acción de datos |
|---|---|---|
| Línea con valor mapeada | barra normal | — |
| Línea = `$0` reportado | barra plana `$0.00` (gris) | — |
| Línea `sin dato` (en blanco/ausente) | slot marcado "sin dato", no avanza saldo | flag conciliación |
| Etiqueta desconocida | suma a `Otros` (visible) | tarea de curación al owner |
| Mes completo sin reporte | estado "Sin reporte · {mes}", línea del histórico se **corta** (no $0) | alerta de gap |
| Reporte sin hoja de flujo (Tier C) | estado vacío "Esta facility no reporta flujo en formato consolidado" | candidato a reconstrucción (§9) |
| Archivo no parseable (Tier D) | estado de error "Formato no soportado: {motivo}" | conversión / soporte `.xlsb` (§9) |
| Totales no cuadran (I2) | **no se publica**; se muestra "En revisión" | rechazo + alerta a ops |

---

## 6. Contrato de ingesta (ETL → modelo canónico)

Requisitos para que el DWH alimente las vistas:

1. **Persistencia por snapshot.** Un renglón por `(facility, periodo)`. Las vistas leen serie de tiempo, no archivos sueltos.
2. **`null ≠ 0` end-to-end.** El esquema debe distinguir "no reportado" de "cero". Si el ETL aplana `null→0`, ningún front lo recupera. *(Criterio de aceptación bloqueante.)*
3. **Líneas atómicas, no subtotales.** Se ingieren las líneas individuales; `Total Ingresos`/`Total Egresos`/`Saldo Final` se **recalculan** y se usan solo para el gate de reconciliación (I2).
4. **Detección de dialecto.** Antes de parsear, identificar plantilla (por nombre de hoja + huella de etiquetas) y elegir el diccionario de mapeo correcto.
5. **Gate de reconciliación.** `saldo_inicial + Σingresos − Σegresos == saldo_final_reportado` (tolerancia < $0.50). Si falla → no publicar, alertar.
6. **Soporte de formatos.** `.xlsx` estándar hoy; `.xlsb` y exportaciones no estándar (Tier D) requieren conversión o lector dedicado.

---

## 7. Gobierno de datos

- **Owner del diccionario de mapeo:** rol de Datos/Ops (a definir). El mapeo *aproximado* es criterio humano — no puede quedar sin dueño.
- **Onboarding de nuevo dialecto:** al llegar un originador/plantilla nueva → (1) detectar etiquetas, (2) auto-mapear las exactas, (3) cola de curación para el resto, (4) versionar.
- **Auditoría de aproximados:** revisión periódica; un mapeo mal hecho corrompe waterfall e histórico en silencio.
- **SLA de cobertura:** definir meta (ej. "Tier A ≥ X% de facilities activas para Q_") y trackearla.

---

## 8. Criterios de aceptación (HU)

```gherkin
Escenario: Reporte del Tier A se normaliza sin pérdida
  Dado un reporte con hoja de movimientos del fideicomiso
  Cuando el ETL mapea sus líneas al modelo canónico
  Entonces saldo_inicial + Σingresos − Σegresos == saldo_final del reporte (tol < $0.50)
  Y el waterfall y el histórico se publican

Escenario: Etiqueta desconocida no rompe el balance
  Dado un reporte con una línea cuya etiqueta no está en el diccionario
  Cuando se normaliza
  Entonces la línea se suma a "Otros" del grupo correspondiente
  Y se crea una tarea de curación para el owner
  Y el balance sigue cuadrando

Escenario: Cero reportado vs sin dato
  Dado un concepto con valor 0 y otro concepto ausente en el reporte
  Cuando se renderiza
  Entonces el primero se muestra como "$0.00" y el segundo como "sin dato"
  Y "sin dato" no avanza el saldo acumulado

Escenario: Mes sin reporte
  Dado un periodo sin reporte recibido
  Cuando se abre el waterfall de ese periodo
  Entonces se muestra "Sin reporte · {mes}" sin KPIs ni cascada
  Y en el histórico la línea de saldo se interrumpe (no se traza en $0)

Escenario: Reporte sin hoja de flujo (Tier C)
  Dado un reporte sin estado de movimientos del fideicomiso
  Cuando se intenta cargar el flujo
  Entonces se muestra estado vacío con el motivo
  Y no se inventan valores

Escenario: Totales no cuadran
  Dado un reporte cuyas líneas no reconcilian con su saldo final
  Cuando se normaliza
  Entonces NO se publica la vista
  Y se marca "En revisión" con alerta a ops
```

---

## 9. Riesgos y decisiones pendientes

| # | Decisión abierta | Dueño |
|---|---|---|
| R1 | **¿Estandarizar la plantilla del reporte (contractual) o mapear por dialecto (técnico)?** Con 126 originadores, probablemente ambos: plantilla obligatoria a nuevos, mapeo a legacy. | Producto + Legal + Datos |
| R2 | Tier C (7/14): ¿reconstruir el flujo desde otras hojas (Saldos/Fondos/Servicio Deuda) o marcarlas como "no soportadas"? | Datos |
| R3 | Tier D (3/14): soporte `.xlsb` y exportaciones no estándar. | Datos/Ing |
| R4 | `blank` a nivel de línea: ¿es `0` o `sin dato`? En la muestra reconcilia como 0, pero la regla debe ser explícita por plantilla. | Datos |
| R5 | Owner y SLA del diccionario de mapeo. | HoP/Ops |

### Granularidad: solo mensual (sin intra-mes)

El reporte da **3 cifras por mes**: saldo inicial, movimientos netos y saldo final — es decir, **dos observaciones de saldo (inicio y cierre), nada entre medias**. Consecuencias que acotan lo que el módulo puede prometer:

- El **flujo neto** del histórico es un **agregado mensual** (no una secuencia intra-mes).
- La **línea de saldo** une puntos de **cierre de mes**; se dibuja con **segmentos rectos** (no curva) para no insinuar una trayectoria intra-mes que no existe.
- El **mínimo de caja / breach solo se puede evaluar a fin de mes**. Si la caja bajó del piso intra-mes y se recuperó antes del cierre, **no es observable**. → No prometer monitoreo de liquidez intra-mes.
- El **histórico de caja es vista de narrativa/trayectoria, no de riesgo**. El riesgo (saldo vs *Required*) vive en **Account Balance**, también a cierre de mes.

---

*Prototipos de referencia: `waterfall-chart.html` (snapshot por periodo + histórico/puente de caja integrado como navegador), `cash-flow-final.html` (waterfall por facility), `cash-flow-mapping.html` (capa de mapeo, 3 reportes reales).*
