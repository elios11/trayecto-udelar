# D03aj — Tecnicatura en Artes Plásticas y Visuales, Rivera 2017

## Estado y objetivo

Nodo preparado para implementación. El inventario mantiene `bedelias-cur-tecnicatura-en-artes-plasticas-y-visuales-2017` en `research-pending` aunque la auditoría previa describe seis semestres: falta una correspondencia estructurada que demuestre que Currícula reproduce la malla oficial de Rivera y conserva una identidad visible para cada unidad. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; dependen D01, D02 y D03a. Un worktree y un solo subagente, basados en el `main` que integra D03ai.

## Autoridad y puntos delicados

- Revisar las dos páginas del [Plan de Estudios de Rivera](https://www.artes.udelar.edu.uy/wp-content/uploads/2023/09/PlandeEstudios_TecnicaturaArtesPlsticasyVisuales_CUR.pdf) y la [página vigente de Facultad de Artes](https://www.artes.udelar.edu.uy/carrera/tecnicatura-en-artes-plasticas-y-visuales/), incluyendo resoluciones de calendario, programas y cualquier errata. Registrar URL, autoridad, fecha, alcance, páginas/filas cotejadas y huellas reproducibles. La malla publica seis semestres y 240 créditos, pero sus rótulos de taller IV aparecen tanto en cuarto como en quinto: resolver con fuente competente o dejar conflicto explícito sin inventar una equivalencia.
- Reutilizar `data/bedelias/cur-tecnicatura-en-artes-plasticas-y-visuales-2017.json` y la auditoría existente: no repetir la extracción. Cotejar las 16 entradas técnicas con la malla y conservar códigos/progreso previos; la composición suma 245 créditos porque lista dos seminarios concretos para un cupo oficial de cinco, no porque el egreso exija ambos.
- Mantener la Tecnicatura Plan 2017 de Rivera separada de la del Plan 2013 de Rocha, aunque compartan carrera/título en el selector. No mezclar períodos, créditos, seminarios, sedes ni progreso entre planes.
- El Proyecto de Egreso de sexto semestre debe estar visible una sola vez. No reemplazar con «Validación de egreso» u otro marcador administrativo un semestre curricular. No inferir oferta periódica desde presencia en Bedelías o EVA.

## Artefactos y cierre

- Guardar evidencia normalizada versionada bajo `data/fartes/` y un generador offline que reconstruya proyección, auditoría, revisión e inventario sin nueva consulta. Dos regeneraciones idénticas; documentar comando y huellas aquí.
- Pruebas deterministas de seis períodos, 240 créditos exigidos, identidad visible de las unidades oficiales, alternativa de seminario, Proyecto de Egreso y frontera `verified`/`candidate`. Sólo promover por correspondencia oficial exacta; no fusionar por nombre parecido.
- Actualizar `docs/carreras-a-actualizar.md` sólo si aparece fuente oficial que anuncie implementación progresiva, malla futura o cobertura parcial. `PROJECT_CONTEXT.md` sólo si cambia una decisión estable.
- Ejecutar focales, `npm test`, `npm run lint` si cambia código y `git diff --check`. Commit enfocado en el worktree; el coordinador revisa e integra. No push ni despliegue desde el worktree.
