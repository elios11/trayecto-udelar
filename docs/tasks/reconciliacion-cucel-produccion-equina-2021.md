# D03ae — Tecnólogo en Producción Equina, Plan 2021

## Estado y objetivo

Implementado y validado en el worktree D03ae. La trayectoria publicada del Tecnólogo en Producción Equina queda reconciliada con la proyección de CUCEL, sin elevar el ejemplo del anexo a una secuencia obligatoria ni confundir el año técnico 2022 de Bedelías con el Plan 2021.

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

## Resultado de la auditoría

- Se inspeccionaron visualmente las páginas PDF 13 a 16 de IMPO —páginas impresas 16 a 19—, incluida la tabla completa del anexo en la página PDF 16, índice cero 15. También se cotejaron visualmente las páginas 1, 2, 4, 5, 8 y 9 de DGETP y la página 17 de la guía FVET 2024.
- El ejemplo oficial contiene seis períodos con 8, 7, 7, 8, 8 y 7 identidades, y 48, 42, 45, 45, 48 y 42 créditos. Frente a la proyección previa se corrigieron cinco ubicaciones: `INFO` a semestre 1, `IT1` a 2, `IT2` a 3, `PBA` a 4 y `ECD` a 4; se eliminó el séptimo período inferido.
- Las 45 identidades exactas del ejemplo quedan verificadas. `CUR-UNIV`, presente sólo en el snapshot, conserva su ID canónico y queda como candidata no publicada, fuera de períodos y requisitos. No se crearon aliases ni equivalencias por parecido.
- La evidencia normalizada vive en `data/cucel/produccion-equina-2021-trajectory-review.json`. Registra las huellas de los cuatro recortes normalizados y de los PDF/snapshot crudos, el alcance Melo, la ausencia de una afirmación de oferta actual y los conflictos 55/56, 269/270 y la etiqueta regional inconsistente de la guía FVET.
- La correspondencia estructurada mueve el plan de `research-pending` a `official-trajectory-reproduced`: el inventario global queda en 97 reproducidas, una identificada pendiente, 46 en investigación y tres ausencias documentadas.

## Regeneración offline y verificación

Comando reproducible, sin volver a consultar la red:

```powershell
npm run trajectory:cucel-produccion-equina-2021
```

El generador valida huellas, seis períodos y su orden, 45 correspondencias, catálogo, exclusión de la candidata, 270 créditos y conservación de todos los IDs canónicos antes de regenerar auditorías, proyección, colas e inventario. Se ejecutó dos veces y ambas ejecuciones produjeron el mismo hash agregado sobre 175 artefactos: `sha256:7fde393ee9b11743a27601f0068f41e5a64c3c39b83c8ac883fd55be61388c27`.

Verificaciones finales: prueba focal de Producción Equina, prueba del inventario D03, `npm test`, `npm run lint` y `git diff --check`, todas correctas. Riesgo residual: la auditoría no demuestra una cohorte u oferta abierta en 2026 y no deduce previaturas desde el ejemplo; ambas cuestiones requieren publicación institucional nueva.
