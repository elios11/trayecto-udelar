# D03as — Licenciatura en Composición, Plan 1987

## Objetivo

Investigar si Facultad de Artes publicó una malla o secuencia oficial del Plan 1987 que permita sustituir la agrupación administrativa actual de Bedelías por períodos reales. Es un plan histórico en régimen de egreso, sin nuevos ingresos; no se debe confundir con Música/Composición del Plan 2005 ni migrar progreso entre ambos. Nodo académico para `gpt-5.6-sol`, esfuerzo `xhigh`, en un único worktree basado en el `main` combinado más reciente.

## Fuentes y límites

- Partir de `data/bedelias/fartes-licenciatura-en-composicion-1987.json` y su entrada en `data/bedelias/audits/official-source-audits.json`. La auditoría existente confirma continuidad de exámenes y derecho de egreso, pero no una trayectoria oficial; 129 unidades técnicas carecen de créditos publicados.
- Buscar primero en Facultad de Artes e Instituto de Música, luego portal Udelar, Colibrí e IMPO cuando corresponda. Antes de concluir por un enlace roto, buscar una copia de la misma autoridad. Contrastar Plan 1987, modificaciones, vigencia de la secuencia y estado histórico. EVA y oferta de exámenes no son fuente única de verdad curricular.
- No inferir semestres, créditos, obligatoriedad ni equivalencias desde el Plan 2005 o el orden de Bedelías. Si sólo existe un plan normativo flexible, distinguirlo de una trayectoria sugerida. Mantener recuperables IDs de progreso y registros técnicos no respaldados.
- Trabajar exclusivamente Composición 1987; las otras licenciaturas de 1987 serán nodos posteriores salvo que una fuente común permita registrar evidencia compartida sin proyectarlas todavía.

## Artefactos y verificación

- Conservar evidencia normalizada/versionada bajo `data/fartes/` con URL, autoridad, consulta, versión, alcance, filas o identidades cotejadas, conflictos y huella reproducible. Guardar crudos en `tmp/d03as-composicion-1987/`.
- Si hay trayectoria oficial reproducible: generador offline desde evidencia versionada, proyección, auditoría, revisión, colas e inventario; períodos y alternativas exactos, sin perder unidades publicadas en Currícula/planificador.
- Si no aparece una trayectoria tras búsqueda institucional suficiente: mantener `research-pending` y documentar brecha exacta, sin afirmar que no existe. Sólo usar `no-official-trajectory-documented` con declaración institucional expresa de ausencia.
- Probar frontera `verified`/`candidate`, continuidad histórica, cero créditos cuando no se publican y conservación de IDs. Ejecutar dos regeneraciones idénticas si se genera proyección, pruebas focales, `npm test`, `npm run lint` si cambia código y `git diff --check`. Crear commit enfocado. No integrar, hacer push ni publicar desde el worktree.

## Estado

- Pendiente de investigación. La auditoría existente de 2026-08-24 confirma el régimen de egreso histórico, pero no la trayectoria temporal.
