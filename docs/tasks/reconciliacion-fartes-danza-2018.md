# D03al — Licenciatura en Danza Contemporánea, implementación 2018

## Estado y objetivo

Nodo implementado. `bedelias-fartes-licenciatura-en-danza-contemporanea-2018` pasa de `research-pending` a `official-trajectory-reproduced`: la Currícula reproduce la malla oficial de ocho semestres con 30 correspondencias técnicas exactas, seis bloques sólo-fuente y 387 entradas técnicas candidatas. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a. Un worktree y un solo subagente, basados en el `main` posterior a D03ak.

## Autoridad y límites

- Cotejar íntegramente el [Plan oficial de Danza Contemporánea](https://www.artes.udelar.edu.uy/wp-content/uploads/2024/06/Licenciatura_Danza_Contemporanea_Plan_de_Estudios_v2.pdf), especialmente la grilla del anexo, y comprobar vigencia/alcance con la página institucional de Facultad de Artes. El documento llama al plan «2008 / Implementación 2018»: conservar esa distinción. Registrar URL, autoridad, fecha, páginas/filas, alcance y huellas reproducibles.
- Reutilizar `data/bedelias/fartes-licenciatura-en-danza-contemporanea-2018.json` y la auditoría existente; no repetir extracción. Reconciliar cada unidad explícita de los ocho semestres con código técnico sólo mediante identidad exacta demostrable. Las unidades sin código inequívoco pueden ser bloques sólo-fuente; las entradas técnicas no verificadas deben permanecer candidatas. Ninguna materia de la malla oficial debe desaparecer de Currícula.
- Mantener los mínimos oficiales de 360 créditos, seis ejes de formación, optativas, electivas y Trabajo Final. La grilla contiene una discrepancia entre el mínimo narrativo de Estudios del Cuerpo (38) y su cuadro resumen (43): rastrear autoridad y documentar la decisión sin corregir silenciosamente. No convertir optativas, ofertas variables ni ejemplos en obligaciones acumulativas; no crear orientaciones certificadas de perfiles personales.
- Preservar los IDs de progreso ya guardados. No inferir oferta periódica, prerrequisitos ni equivalencias de otras carreras desde EVA o nombres semejantes.

## Artefactos y cierre

- Versionar evidencia normalizada bajo `data/fartes/` y un generador offline que reconstruya proyección, auditoría, revisión e inventario sin red. Dos regeneraciones idénticas y huellas/comandos documentados.
- Probar ocho períodos, visibilidad de cada unidad oficial, 360 créditos mínimos y distribución por ejes, flexibilidad de optativas/electivas, Trabajo Final, frontera `verified`/`candidate` y ausencia de orientaciones inventadas.
- Actualizar `docs/carreras-a-actualizar.md` sólo ante implementación progresiva, malla futura o cobertura parcial oficialmente demostrada; `PROJECT_CONTEXT.md` sólo si cambia una decisión estable.
- Ejecutar focales, `npm test`, `npm run lint` si cambia código y `git diff --check`. Crear commit enfocado en el worktree; el coordinador revisa e integra. No push ni despliegue desde el worktree.

## Implementación reproducible

- La evidencia normalizada vive en `data/fartes/danza-contemporanea-2018.json`. La huella canónica de `sourcePortions` es `sha256:e10c0a3d05d014ec297c04696f7fcbc9aad71c03f2f239c3a956a2fdbbb7980b` y la del snapshot de Bedelías cotejado es `sha256:911151de334b99506193acfec19c6acbed400f9cd2afca52111d6c3614eef3be`.
- Las páginas 3, 4 y 5 del Plan fueron renderizadas e inspeccionadas visualmente y sus cinco páginas se extrajeron para el cotejo textual. La huella cruda del PDF oficial es `sha256:e54d8ddd06f8d768a63ce7d905ca560413d3d1d69cd536af40a251f302d45ce4`; la página vigente de Facultad de Artes confirmó cuatro años, modalidad semestral, 360 créditos, seis ejes, programas troncales y la sede de Montevideo al 11 de octubre de 2026.
- Regeneración offline: `npm run trajectory:fartes-danza-2018`. Dos ejecuciones consecutivas produjeron las mismas huellas: proyección `sha256:d678775dc546f843b23fd69782b198d4217c5af24e52375895b0620643346d53`, registro de auditorías `sha256:748848a628675fa0dfaa11c0d5b7cc786665c34d1839edcc815394c8cabc2921`, revisiones `sha256:b60b7b894979d0b4de1b5747319507d221d4c4dddc2758f4262ce82ea75d05e0` e inventario `sha256:b61c7e193dd786683657572620b047bc52b4355f94e7b64fecee7e9e672c7912`.
- La trayectoria conserva 36 ubicaciones visibles en ocho semestres: 30 mantienen sus IDs de progreso preexistentes y seis se modelan sin código inventado. `STAM1`, `STAM2`, `SI1`, `SI2`, `LTFE1` y `LTFE2` permanecen candidatas porque el Plan publica cupos o componentes genéricos, no esas equivalencias técnicas.
- Los 257 créditos ubicados en la malla se complementan con 67 optativos y 36 electivos flexibles hasta 360. La UI no convierte las 387 candidatas en oferta vigente ni crea orientaciones certificadas a partir de perfiles personales.
- El texto narrativo del Plan publica 38 créditos para Estudios del cuerpo, mientras su cuadro y sus nueve ubicaciones suman 43. La proyección controla 43 para mantener la malla y el total institucional de 360, y conserva 38 como contradicción explícita del mismo documento.
- No corresponde modificar `docs/carreras-a-actualizar.md`: las fuentes cotejadas muestran una malla completa y vigente en Montevideo, no una implementación progresiva, futura ni territorialmente parcial.
