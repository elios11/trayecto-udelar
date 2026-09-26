# D03h — Reconciliación oficial de Ciencia Política y Desarrollo

## Estado

Implementado y validado en un worktree aislado. Nodo incremental de D03 basado en `main` después de TGU 2018, pendiente únicamente de integración autorizada.

## Objetivo

Cerrar la correspondencia exacta de las trayectorias oficiales vigentes de las licenciaturas en Ciencia Política y en Desarrollo, Plan 2009, respetando el Ciclo Inicial compartido, la flexibilidad del Ciclo Avanzado y las profundizaciones actuales sin inventar rigidez semestral.

## Alcance

- `bedelias-fcs-licenciatura-en-ciencia-politica-2009`.
- `bedelias-fcs-licenciatura-en-desarrollo-2009`.
- Servicio: Facultad de Ciencias Sociales, sede Montevideo.
- Fuentes principales: Ciclo Inicial FCS 2026; malla avanzada de Ciencia Política 2025; malla avanzada y trayectorias sugeridas de Desarrollo; normas y páginas institucionales vigentes.

## Reglas de autoridad

- Las mallas y trayectorias sugeridas publicadas por FCS determinan períodos, módulos y perfiles visibles.
- Bedelías no publica composición en estos planes y no puede completar ni ordenar la trayectoria.
- Catálogos u ofertas optativas fechadas se modelan como flexibilidad interna, no como obligación ni vigencia indefinida.
- El Ciclo Avanzado puede superponerse con la finalización del Inicial; no bloquearlo artificialmente hasta completar 120 créditos.
- No convertir recomendaciones ni condiciones académicas que la UI no representa fielmente en previaturas más estrictas.
- Desarrollo mantiene sólo las tres profundizaciones vigentes; perfiles históricos o autoconstruidos no se ofrecen sin fuente actual.

## Trabajo requerido

1. Resolver Ciencia Política: 57 ubicaciones oficiales frente a 47 coincidentes y 13 períodos auditados frente a 12 proyectados.
2. Resolver Desarrollo: 55 ubicaciones frente a 43 y 13 períodos auditados frente a 11 en cada profundización.
3. Separar períodos reales, módulos flexibles y catálogo variable; no usar un falso período de catálogo para cerrar la cuenta.
4. Verificar mínimos, alternativas, Trabajo Final, Análisis Económico y el componente metodológico de Desarrollo sin doble conteo.
5. Actualizar auditoría, proyecciones, inventario, hashes, pruebas y esta continuidad de forma determinista.

## Criterios de cierre

- Ambos planes quedan `official-trajectory-reproduced` con correspondencia exacta o una limitación oficial explícita y verificable.
- Toda materia nominal de la trayectoria conserva una copia visible y `verified`; la oferta variable queda en catálogo flexible.
- Una sola carrera/plan/sede por licenciatura; ninguna trayectoria o equivalencia inventada.
- Regeneración determinista, pruebas específicas, `npm test`, `npm run lint` y `git diff --check` en verde.
- Commit enfocado sin integración, push ni despliegue desde el worktree.

## Continuidad

### Fuentes oficiales verificadas

- Ciclo Inicial FCS 2026: `https://cienciassociales.edu.uy/wp-content/uploads/2026/07/CI-Malla-04062026.pdf` (`sha256:719f4d62b5aa20036dab142d9bf7a270ad837f59e679ea8012fb331c9932aa73`).
- Ciencia Política, malla 2025: `https://cienciassociales.edu.uy/wp-content/uploads/2025/12/CP-Malla-2511.pdf` (`sha256:8eca41a377719c845d06da0d6650c89e484e5a1ef4f02b6330cefd2ecf8c0898`).
- Ciencia Política, documento orientador de Análisis Económico: `https://cienciassociales.edu.uy/wp-content/uploads/2025/10/LCP-AnalisisEconomico_DocumentoOrientador_set2025.pdf`.
- Desarrollo, malla 2023: `https://cienciassociales.edu.uy/wp-content/uploads/2023/07/Malla-curricular_LED-2306.pdf` (`sha256:474e297b370a6f3ec6577d7910be8e35057976ce73f401d286a9405d9f0e1c0d`).
- Desarrollo, trayectorias sugeridas 2021: `https://cienciassociales.edu.uy/wp-content/uploads/2021/04/2-TRAYECTORIAS-SUGERIDAS-EN-LA-LICENCIATURA-EN-DESARROLLO_Febrero-20211-1.pdf` (`sha256:92be0e25bd5f9164104764a0810dfcf5f81e197bd0a4d2b840f432a78a1549cb`).
- Páginas institucionales vigentes de FCS: malla de Ciencia Política, Licenciatura en Desarrollo, malla de Desarrollo y módulos de profundización. Esta última confirma las tres profundizaciones actuales: Desarrollo Económico, Desarrollo Territorial y Gestión y Políticas Públicas.

### Resultado y métricas

- Ciencia Política pasó de 47/57 ubicaciones coincidentes y 12/13 períodos proyectados a 57/57 ubicaciones y ocho semestres reales reproducidos. Los módulos académicos permanecen como requisitos; nueve elementos variables o alternativos quedan en catálogo flexible y ya no forman un falso período.
- Desarrollo pasó de 43/55 ubicaciones coincidentes y 11/13 períodos por profundización a 55/55 ubicaciones en la unión oficial. Cada una de las tres profundizaciones reproduce ocho semestres; los 44 elementos comunes se ubican temporalmente y cada MOI conserva únicamente su catálogo flexible propio.
- El inventario global queda en 75 trayectorias reproducidas, 15 con fuente pendiente, una sin trayectoria documentada y 56 por investigar.
- El registro de auditorías queda en `sha256:031c8f00197e273e12d816ff40fa64ded64177d95e3e0bcd9b640765cec3df92`.

### Decisiones de modelado

- Los ocho semestres publicados se representan como períodos orientativos. El Ciclo Avanzado comienza en el tercer semestre y se superpone con el cierre del Ciclo Inicial durante tercero y cuarto.
- Los módulos y catálogos se separan de los períodos. Los catálogos optativos fechados no se congelan como oferta histórica permanente ni se convierten en obligaciones.
- Análisis Económico de Ciencia Política conserva las alternativas reconocidas por el documento orientador vigente, sin asumir que la lista es exhaustiva ni permanente.
- Desarrollo ofrece sólo las tres profundizaciones vigentes. El componente metodológico alternativo de Desarrollo Económico se mantiene separado de Métodos Cuantitativos o Cualitativos aplicados a la Práctica para evitar doble conteo.
- No se automatizan previas: Ciencia Política admite condiciones reglamentadas que la UI no puede expresar fielmente y Desarrollo publica secuencias recomendadas, no previas reglamentadas.

### Regeneración y verificaciones

Comandos de regeneración, en este orden:

```text
node scripts/bedelias-audit-queue.mjs
node scripts/build-extracted-academic-plans.mjs
node scripts/bedelias-ui-curriculum-queue.mjs
npm run trajectory:inventory
```

La segunda ejecución produjo archivos idénticos byte a byte para ambas proyecciones, el reporte de planes extraídos y el inventario. Se ejecutaron y aprobaron las pruebas específicas de Ciencia Política, Desarrollo, inventario oficial y ambas colas derivadas. También se ejecutan al cierre `npm test`, `npm run lint` y `git diff --check`.

### Límites y mantenimiento futuro

- La oferta concreta de optativas y seminarios cambia por edición; debe actualizarse sólo ante una nueva publicación oficial, sin convertir una lista fechada en requisito permanente.
- La UI no expresa la condición cruzada “si Métodos Cuantitativos se usa en la Práctica, elegir otro curso metodológico en el MOI”. El modelo evita reutilizar la misma entidad curricular y el aviso de auditoría conserva la regla para la selección real.
- Bedelías sigue sin publicar composición para ambos planes; no debe usarse para completar períodos, perfiles ni previas.
