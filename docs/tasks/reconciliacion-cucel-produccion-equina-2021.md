# D03ae — Tecnólogo en Producción Equina, Plan 2021

## Estado y objetivo

Nodo preparado para implementación. Reconciliar la trayectoria publicada del Tecnólogo en Producción Equina con la proyección ya auditada de CUCEL, sin elevar el ejemplo del anexo a una secuencia obligatoria ni confundir el año técnico 2022 de Bedelías con el Plan 2021.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a integrados. Un solo subagente en worktree dedicado desde el `main` actual. El coordinador revisa el commit antes de cualquier integración.

## Fuente y cotejo académico

- Revisar el [Plan conjunto ANEP–Udelar publicado por IMPO](https://www.impo.com.uy/diariooficial/2022/01/21/avisos.pdf), en particular el cuadro de créditos y el anexo titulado «EJEMPLO de Distribución de Asignaturas por año y por semestres». Renderizar e inspeccionar visualmente todas las páginas pertinentes: la extracción lineal mezcla columnas, créditos y horas. Confirmar seis semestres y el lugar de cada unidad; conservar el carácter ilustrativo y flexible de las optativas.
- Contrastar la [Resolución 7158/2021 de DGETP](https://www.utu.edu.uy/wp-content/themes/balpadraUTU/data/archivodigital/resoluciones/2022/11/fojas-res-2021254007158.pdf), la [guía vigente de FVET](https://www.fvet.edu.uy/wp-content/uploads/2024/08/Guia_estudiantil-FVET-actualizada-2024.pdf) y el snapshot `data/bedelias/cucel-tecnologo-en-produccion-equina-2022.json`. La auditoría existente en `data/bedelias/audits/official-source-audits.json` registra Plan 2021, 270 créditos, sede Melo y overrides por código; tratarlos como hipótesis a verificar contra la fuente, no como evidencia suficiente por sí solos.
- Resolver explícitamente las discrepancias: Bedelías publica 2022, seis meses y 225 créditos; el plan aprobado seis semestres/270 créditos; el texto narrativo dice al menos 55 optativos y su cuadro suma 56. No corregir datos oficiales por extrapolación ni ocultar el conflicto.
- Mantener un solo plan y progreso, la identidad canónica de cada unidad, las optativas como alternativas flexibles y el Trabajo Final. Promover sólo correspondencias exactas o equivalencias oficiales trazables; no crear aliases por parecido de nombres, créditos o posición. No presentar la oferta de un semestre como promesa de dictado actual.

## Artefactos, verificación y entrega

- Versionar evidencia normalizada bajo `data/cucel/` con URL, autoridad, fecha de consulta, vigencia, alcance Melo, filas y códigos cotejados, páginas inspeccionadas y huella reproducible de la porción fuente. Registrar aquí el comando exacto de regeneración offline; PDF crudo y PNG pueden quedar en `tmp/` del worktree.
- Actualizar, sólo si lo prueban las fuentes, auditoría, revisión D03, proyección e inventario. Pruebas deterministas de seis períodos en orden, identidades visibles, 270 créditos y mínimos por eje, flexibilidad optativa, conservación de IDs/progreso y exclusión de candidatas no verificadas. Dos regeneraciones offline deben producir los mismos artefactos.
- Actualizar `PROJECT_CONTEXT.md` únicamente con decisiones transversales confirmadas; `docs/carreras-a-actualizar.md` sólo si la publicación oficial resulta progresiva, anuncia nueva malla o limita parte del recorrido/sede.
- Ejecutar pruebas focales, `npm test`, `npm run lint` si cambia código y `git diff --check`. Registrar aquí resultado, riesgos y próximo paso; crear commit enfocado. No integrar, pushear ni desplegar desde el worktree.
