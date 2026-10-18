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

- Investigación completada el 2026-10-17 con estado `research-pending`. La búsqueda agrupada cubrió Facultad de Artes/Instituto de Música, portal central Udelar, CSE, Colibri e IMPO. Se confirmó el régimen de egreso y se localizó una secuencia secundaria de siete años, pero no una copia pública del Plan 1987 aprobado ni de sus expedientes fuente.
- La Tabla 8 de la tesis de Graciela Carreño (Maestría en Enseñanza Universitaria, 2017) contiene 38 ubicaciones para Composición Plan 1987 y el Anexo F identifica los expedientes 2642/87 y 7704/87. La tabla dice «elaboración propia a partir de los PE»; por eso se normaliza como reconstrucción secundaria y no se proyecta como trayectoria oficial.
- La página vigente de Licenciaturas del Instituto de Música remite a planes anteriores para las materias y previas del Plan 1987, pero la versión migrada no expone el documento ni un enlace recuperable. Los calendarios 2025 acreditan exámenes e inscripción por Bedelía, no una secuencia curricular.
- Se conservan las 129 identidades técnicas como `candidate`, con sus IDs y cero créditos, más el marcador manual de egreso como único registro `verified`. El Plan 2005 queda expresamente excluido de cualquier inferencia o migración.

### Artefactos y reproducción

- Evidencia normalizada: `data/fartes/composicion-1987.json`.
- Crudo consultado y páginas renderizadas: `tmp/d03as-composicion-1987/` (no versionado).
- Generador offline: `npm run trajectory:fartes-composicion-1987`.
- Prueba focal: `node --test tests/fartes-composicion-1987-research.test.mjs`.
- La regeneración valida la huella de la evidencia, los 38 renglones secundarios, los dos expedientes pendientes, la frontera de 129 candidatas, cero créditos, unicidad/huella de IDs y el estado del inventario. Debe ejecutarse dos veces; la segunda no debe introducir diferencias.

### Brecha y siguiente paso

- Para cerrar la trayectoria hace falta una copia institucional del Plan 1987 aprobado o de los expedientes 2642/87 y 7704/87, con la versión aplicable, o una confirmación expresa de Facultad de Artes/Udelar de que la columna 1987 de la Tabla 8 transcribe la secuencia oficial aplicable al régimen de egreso.
- El siguiente paso recuperable es solicitar esos expedientes al archivo de Facultad de Artes o a la Dirección General Jurídica y cotejarlos con las 38 ubicaciones, las variantes de Bedelías y eventuales modificaciones posteriores. Hasta entonces no se promueven períodos, obligaciones ni equivalencias.
