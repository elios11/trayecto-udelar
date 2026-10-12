# D03al — Licenciatura en Danza Contemporánea, implementación 2018

## Estado y objetivo

Nodo preparado para implementación. `bedelias-fartes-licenciatura-en-danza-contemporanea-2018` permanece en `research-pending`: su auditoría cerró créditos y ejes, pero la Currícula todavía no demuestra correspondencia estructurada con la malla de ocho semestres publicada en el Plan. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a. Un worktree y un solo subagente, basados en el `main` posterior a D03ak.

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
