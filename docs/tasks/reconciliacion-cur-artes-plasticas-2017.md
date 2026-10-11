# D03aj — Tecnicatura en Artes Plásticas y Visuales, Rivera 2017

## Estado y objetivo

Nodo implementado. `bedelias-cur-tecnicatura-en-artes-plasticas-y-visuales-2017` pasa de `research-pending` a `official-trajectory-reproduced` con una correspondencia estructurada de los seis semestres oficiales de Rivera y una identidad visible para cada unidad. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; dependen D01, D02 y D03a. Un worktree y un solo subagente, basados en el `main` que integra D03ai.

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

## Implementación reproducible

- La evidencia normalizada vive en `data/fartes/cur-artes-plasticas-2017.json`; su huella canónica de `sourcePortions` es `sha256:c2fb60dd69946f448481f059303eb39b744f9ff6db93ba8a59fe54deb667448a` y la del snapshot de Bedelías cotejado es `sha256:c67bf8af2fa4f22622ed5ce46e5bae6b63951dc5c88bc6b8b6a5ba595d98337e`.
- Las porciones crudas principales quedaron identificadas por `sha256:ee73fc9fa498d439c574448d064d78c959fac75bd40e2a0d821c5df828fcc348` para el Plan, `sha256:445e5e1cb4b4fa7ac61940da052f6988d26734f1a82d2b380a0938d863a88ace` para la Resolución 48/2019 y `sha256:65a230393c67861bbfec7887f43ad016c566a6f6ad28067b85bf59c7585839a5` para la página vigente. Las huellas de previaturas y programas complementarios se versionan en el mismo artefacto.
- Regeneración offline: `npm run trajectory:cur-artes-plasticas-2017`. Dos ejecuciones consecutivas produjeron exactamente las mismas huellas: proyección `sha256:3e0b3e238e605d827a77bafe95a01227fb09ddd290395b9ac595e30be0016fbc`, registro de auditorías `sha256:038a15310af0f5e810ec124894ebd79df81431d6323b0217d7f6a8e787ca822d`, revisiones `sha256:6a03a0d9ee3f1af077b78ec2b2b4d5732621fb8469df91b64a5c069670491ac3` e inventario `sha256:85e793823c1d46b61bbc098c84da5f11ed49195a8004959639e5259a2c123cca`.
- La reconstrucción preserva los IDs de progreso existentes con sufijo `-2`, no depende de los PDF/HTML temporales y mantiene a Rocha 2013 como plan territorial independiente.

## Integración

- Implementación aislada `fea669d`; integrada en `main` como `96b7ffa`.
- Verificación del resultado combinado: `npm test` (1039/1039), `npm run lint` y `git diff --check`, todas correctas. No se hizo push ni despliegue en este nodo.
