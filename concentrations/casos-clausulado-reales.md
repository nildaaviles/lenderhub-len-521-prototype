# Casos de uso de clausulado — `criterias.concentration` (data prod)

> Fuente: `facilities-db-prod.overviews.numbers` · columna **P** (`criterias.concentration`)
> 77 facilities · **62 con texto de concentración** · análisis para LEN-664 (intake de criterios)

---

## 1. Hallazgo crítico para el segmentador

El prototipo actual (regex sobre marcadores `1.` / `a)` / `f)`) **solo segmenta bien 7 de 62** celdas reales. El resto devuelve 1 solo criterio. La causa NO es el estilo de marcador — es el **formato de almacenamiento**:

- **46/62** guardan los saltos de línea como **texto literal escapado** `\r\n` y `\t` (los dos caracteres `\` + `r`, no saltos reales). El regex pega el marcador a la palabra anterior (`...PCH.\r\n\r\ni.`) y no lo reconoce como inicio de lista.
- **27/62** usan **tabs reales** entre marcador y texto (`D.\tQue…`).
- **25/62** separan criterios con **`;`** (punto y coma) en vez de salto.

**Fix:** normalizar primero (`\r\n`/`\n`/`\t` literales y reales → salto), usar el **TAB como señal de marcador** (permite marcadores sin puntuación con seguridad), y descartar el preámbulo/título. Validado con la lógica exacta del prototipo `intake-compare.html`.

### Validación sobre las 62 celdas (segmentador final)
- **Recuperación: 7 → 55 de 62.** Los **7 que dan 1 son TODOS correctos** (ningún multi-criterio mal segmentado):
  - **4 placeholders**: `"Criterio 2"`, `"Criterio B"`, `"CONCENTRATION"` (F/1414, F/1216, F/1320, J/1111).
  - **3 cláusula única real**: F/6426 (`(f)` con opciones i/ii), F/1352 (`1.`), F/1159 (fragmento `(xv)` con sub-partes A/B/C).
- **Conclusión: el segmentador ya se come el 100% de los casos multi-criterio reales del corpus, sin falsos cortes.**

### Técnicas que lo lograron
1. **Normalización**: decodifica `\r\n`/`\t` escapados literales → reales (resolvió el 88% del corpus).
2. **Tab como señal**: `<marcador>⇥<texto>` → acepta marcadores sin puntuación (`iii⇥`, `v⇥`) que el regex puro rechazaba, sin abrir falsos positivos.
3. **Marcadores ampliados**: `1. a) A. i) (a) (i) 1-` + romano 1-4.
4. **Drop de preámbulo**: descarta el título de sección (texto antes del 1er marcador, sin cifra) tipo "Criterios de Concentración".
5. **Bullets `•`/`o` NO parten**: quedan como sub-condiciones dentro de su criterio padre (correcto).

Lo que NO se modela (justifica LLM en producción): la *estructuración* de límites escalonados / sub-incisos con límite por rango / excepciones por estado / montos en palabras. Eso es V1, fast-follow con modelo.

---

## 2. Formatos presentes en el corpus

| Formato | Facilities | Ejemplos |
|---|---|---|
| Escapado literal `\r\n` / `\t` | 46/62 | F/4870, F/0002, F/1359 |
| `(a) (b)` paréntesis-wrap | 28/62 | F/1435, CIB/4009, F/4018 |
| Tabs reales | 27/62 | F/4870, F/1359, F/5523 |
| `1. 2.` numerado | 22/62 | F/1364, F/0002, F/1435 |
| `(i) (ii)` romano-paréntesis (anidado) | 21/62 | F/1435, F/1159, CIB/4159 |
| `A. B.` mayúscula-punto | 7/62 | F/4870, F/1359, F/5463 |
| Párrafo corrido sin marcador | 5/62 | F/1414, F/1631, F/1216 |
| **Inglés** | 3/62 | F/12340, CIB/4087, F/1583 |
| Multinivel con bullets `•` / `o` | 1/62 | CIB/4009 |

### Unidades / rasgos de límite
`%` 58/62 · tiene **excepción** ("salvo/excepto/en el entendido") 24/62 · `$` monto 22/62 · **aforo/x** 15/62 · **meses** 11/62 · **días** 10/62 · puntos/score 4/62

---

## 3. Implicaciones para el alcance (V1 vs V2)

- **V2 (solo extracción de texto)** es lo viable hoy con regex, *pero solo si se normaliza primero*. Sin normalización falla en el 88% de los casos reales.
- **V1 (estructuración + límites)** se rompe con lo que domina el corpus real y que el prototipo no modela:
  - **Límites condicionados** ("lo que resulte mayor entre 6% o $5.25M", escalonado por tramo de cliente) — CIB/4009.
  - **Sub-incisos anidados** `(i)(ii)(iii)` con un límite distinto por rango de mora — F/1435.
  - **Excepciones por entidad federativa** con varios % distintos en una sola frase — F/4870.
  - **Montos escritos con palabras** ("thirty percent (30%)", "five percent (5.00%)") — inglés F/12340.
  - **Plazos en meses** y **TIR/sobretasa sobre TIIE** como criterio — CIB/4009.
- **Conclusión:** la extracción real conviene hacerla con **modelo (LLM)**, no regex. El prototipo sirve para mostrar el flujo y el alcance, no para producción.

---

## 4. Casos de prueba reales (pegar en el prototipo)

> Texto verbatim de prod, normalizado a saltos legibles. Úsalos como banco de pruebas del segmentador.

### A1 — Mayúscula+punto, tabs, excepción por estado
*(real: F/4870)*

```
D.	Que el saldo insoluto de los Créditos a Clientes Transferidos en su primer ciclo no representen más del 30% (treinta por ciento) del saldo insoluto total de los Créditos a Clientes Transferidos. En el entendido de que aquellos Créditos a Clientes que correspondan créditos en primer ciclo por haber sido desembolsados por primera ocasión en Exitus Credit y/o CrediConfía, para efectos de este criterio le serán aplicables los ciclos que previamente haya cubierto en Contigo, Exitus Credit y/o CrediConfía según corresponda;
E.	Que el saldo insoluto del principal de los Créditos a Clientes de la sucursal con el mayor saldo insoluto de principal de Créditos a Clientes aportados al Fideicomiso no excedan del 5% (cinco por ciento) del saldo insoluto de principal total de los Créditos a Clientes aportados al Fideicomiso; y
F.	Que el saldo insoluto de los Créditos a Clientes Transferidos de una misma entidad federativa que formen parte del Patrimonio del Fideicomiso no represente más del 15% (quince por ciento), salvo en el caso de Veracruz, Michoacán, la Ciudad de México y el Estado de México, en los cuales los Créditos a Clientes Transferidos no representen más del 20% (veinte por ciento) (Veracruz y Michoacán) y 30% (treinta por ciento) (Ciudad de México y Estado de México) respectivamente.
```

### A2 — Numerado 1./2. con sub-incisos (a)/(i) anidados y límite por rango de mora
*(real: F/1435)*

```
5. Que el promedio ponderado conforme al puntaje de Buró de Crédito (B-Score) de los Clientes cuyos Derechos de Cobro están aportados al Patrimonio del Fideicomiso sea mayor o igual a 587 puntos, bajo el entendido de que aquellos Clientes cuyo puntaje de Buró de Crédito (B-Score) sea 0 (cero), se considerará un puntaje de Buró de Crédito (B-Score) de 400 (cuatrocientos) puntos. El promedio ponderado se hará conforme al saldo insoluto del Crédito.
7. Que el promedio ponderado de tasa de interés anual de los Contratos de Crédito Vexi cuyos Derechos de Cobro están aportados al Fideicomiso sea por lo menos de 80% (ochenta por ciento). El promedio ponderado se hará conforme al saldo insoluto de los Créditos Vexi.
8. Que los Contratos de Crédito Vexi transmitidos al Patrimonio del Fideicomiso:
a) Cuyos Clientes tengan registrado su domicilio en la Ciudad de México o el Estado de México, a la fecha de transmisión al Patrimonio del Fideicomiso, cuenten con una Razón de Cartera Vencida promedio en los últimos 3 (tres) meses: (i) mayor a 10.0% (diez por ciento) sobre el total del saldo insoluto de los Créditos Vexi, no representen más del 5.0% (cinco por ciento) del saldo principal insoluto de los Derechos de Cobro Cedidos, (ii) mayor a 7.5% (siete punto cinco por ciento) y menor o igual a 10.0% (diez por ciento), no representen más del 15.0% (quince por ciento), y (iii) menor o igual a 7.5% (siete punto cinco por ciento), no representen más del 25% (veinticinco por ciento) del saldo principal insoluto de los Derechos de Cobro Cedidos, y
b) Cuyos Clientes tengan registrado su domicilio fiscal en una Entidad Federativa distinta a la Ciudad de México o al Estado de México (i) mayor a 10.0%, no representen más del 2.5%, (ii) mayor a 3.0% y menor o igual a 10%, no representen más del 10.0%, y (iii) menor o igual a 3.0%, no representen más del 20%.
c) Cuyos Derechos de Cobro pertenezcan a un producto con Razón de Cartera Vencida promedio mayor a 11.0% (once por ciento), únicamente computarán por hasta el 60.0% (sesenta por ciento) de la Base Crediticia.
9. Que el promedio ponderado de Clientes revolventes sea menor o igual a 67% (sesenta y siete por ciento).
```

### A3 — Numerado con párrafo "Asimismo" sin marcador (cola sin número)
*(real: F/1364)*

```
1. El total conjunto del valor presente neto del valor residual de los activos no podrá representar más del 27.5% (veintisiete punto cinco por ciento) de la Cartera Total.
2. El total conjunto de los flujos derivados de la totalidad de los Contratos de Arrendamiento celebrados con una misma persona no deberá ser mayor al 3% (tres por ciento) del total de los flujos de la Cartera Total.
Asimismo, de tiempo en tiempo, los Acreditantes definirán límites de concentración adicionales en función de las ciudades de donde sea originado el Contrato de Arrendamiento correspondiente. Lo anterior, en el entendido que, en tanto dichos límites adicionales no se establezcan, la cartera únicamente deberá de ser originada en las ciudades de Guadalajara, Jalisco o Monterrey, Nuevo León.
```

### A4 — Inglés `(a)(b)(c)` con `(i)(ii)` anidado y montos en palabras
*(real: F/12340)*

```
(a) not more than thirty percent (30%) of the aggregate Receivable Balance of Transferred Receivables shall have a credit limit greater than $1,500,000 U.S. Dollars;
(b) the aggregate Receivable Balance of Eligible Receivables that are obligations of any single Account Debtor and its Affiliates is equal to or less than (i) 7.50% of the aggregate Receivable Balance if it is less than $40,000,000 U.S. Dollars, or (ii) the greater of $3,000,000 U.S. Dollars or five percent (5.00%) otherwise;
(c) the obligations of the largest three Account Debtors and their affiliates is equal to or less than (i) fifteen percent (15%) if less than $40,000,000 U.S. Dollars, or (ii) the greater of $6,000,000 U.S. Dollars or ten percent (10.00%) otherwise;
(d) not more than five percent (5%) consists of Account Debtors with a Jeeves Unified Risk Score of D;
(e) obligations of Account Debtors that are Start-Ups is no more than twenty percent (20.00%);
(f) obligations of Account Debtors in a single industry is equal to or less than twenty-five percent (25.00%);
(g) obligations of Account Debtors in a high risk industry is equal to or less than ten percent (10.00%);
(h) obligations of Account Debtors in high risk provinces is equal to or less than ten percent (10.00%); and
(i) obligations of Account Debtors onboarded in the last six (6) months is equal to or less than thirty percent (30.00%).
```

### A5 — Multinivel: romano `i.` / bullet `•` / sub-nivel `o`, con límite escalonado
*(real: CIB/4009)*

```
Requisitos aplicables a los Arrendamientos PCH.
i.	Que la suma del valor presente neto descontando los flujos a una tasa anual equivalente a la TIIE más 8 (ocho) puntos porcentuales:
•	No rebase el límite máximo de concentración por Cliente equivalente a:
o	Lo que resulte mayor entre 6.0% (seis por ciento) de los Derechos de Cobro o $5,250,000.00 para los primeros 5 (cinco) Clientes.
o	Lo que resulte mayor entre 5.0% (cinco por ciento) de los Derechos de Cobro o $4,375,000.00 para los siguientes 5 (cinco) Clientes.
o	Lo que resulte mayor entre 3.5% (tres punto cinco por ciento) de los Derechos de Cobro o $3,062,500.00 para el resto de Clientes.
•	No rebase el límite máximo de concentración por sector equivalente al 35% (treinta y cinco por ciento).
ii.	Que la TIR (Tasa Interna de Retorno) del Arrendamiento PCH no sea menor al 20% (veinte por ciento).
iii.	Que los Derechos de Cobro consideren rentas mensuales o semanales.
iv.	Que el bien arrendado cuente con una póliza de seguro vigente.
v.	Que los bienes muebles arrendados se encuentren en México.
```

### A6 — Paréntesis `f) g) h) i)` en bloque
*(real: F/1631 — el caso base del prototipo)*

```
f) El valor de los Derechos de Crédito derivados de ningún Contrato de Arrendamiento y los demás Documentos del Arrendamiento relacionados con el mismo podrá representar más del 8.00% (ocho por ciento) del valor total del Patrimonio del Fideicomiso, en el entendido de que cualquier cantidad en exceso de dicho 8.00% (ocho por ciento) no computará para el cálculo del Aforo.
g) El valor de los Derechos de Crédito cuyo deudor sea un mismo Obligado, agregando el total de los Documentos de los Arrendamientos celebrados con o suscritos por dicho Obligado, no podrán representar más del 10.00% (diez por ciento) del valor total del Patrimonio del Fideicomiso.
h) Que la suma del valor de los Derechos de Crédito que individualmente representen los 5 Derechos de Crédito con los mayores flujos no represente más del 25.00% (veinticinco por ciento) del valor total del Patrimonio del Fideicomiso.
i) Que el Valor Residual no represente más del 15.00% (quince por ciento) del valor de facturación del equipo correspondiente.
```
