# D03ak — Tecnicatura en Artes Plásticas y Visuales, Rocha 2013

## Estado y objetivo

Nodo preparado para implementación. `bedelias-cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013` permanece en `research-pending` aunque la auditoría previa contiene una distribución semestral: falta cerrar la correspondencia estructurada y comprobar con fuentes oficiales la vigencia y el alcance de Rocha. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a. Un worktree y un subagente, basados en el `main` posterior a D03aj.

## Autoridad y límites

- Cotejar las tres páginas del [Plan publicado por Facultad de Artes para Rocha](https://www.artes.udelar.edu.uy/wp-content/uploads/2023/09/Tecnicatura_Artes-Artes_Plasticas_y_Visuales.pdf), las fuentes institucionales actuales y cualquier resolución o programa pertinente. Registrar URL, autoridad, fecha de consulta, vigencia, alcance, páginas/filas y huellas reproducibles. Si no se puede confirmar que el Plan 2013 sigue vigente, no presentarlo como vigente por inferencia de Bedelías.
- Reutilizar el snapshot `data/bedelias/cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013.json` y la auditoría existente; no repetir la extracción. Resolver correspondencias exactas de las unidades y los seminarios de contenido variable sin exigir todas las opciones disponibles a la vez. Los seis semestres oficiales suman 240 créditos, 40 por período, e incluyen Proyecto de Egreso en sexto.
- Mantener este plan de Rocha separado del Plan 2017 de Rivera: no transferir identidades, códigos, calendario aprobado ni progreso entre sedes. No crear equivalencias por semejanza de nombres.
- Conservar unidades auxiliares no curriculares como candidatas o fuera de la trayectoria, según autoridad comprobada; no sustituir un semestre por «Validación de egreso».

## Artefactos y cierre

- Versionar evidencia normalizada bajo `data/fartes/` y crear un generador offline que reconstruya proyección, auditoría, revisión e inventario sin reconsultar fuentes. Ejecutarlo dos veces y documentar comandos y huellas idénticas.
- Probar seis períodos, mínimos oficiales, identidad visible de cada unidad requerida, seminarios alternativos, Proyecto de Egreso único, frontera `verified`/`candidate` y separación de Rivera.
- Si la fuente oficial anuncia implementación progresiva, plan futuro o cobertura parcial, actualizar `docs/carreras-a-actualizar.md` en el mismo commit. Actualizar `PROJECT_CONTEXT.md` sólo si cambia una decisión estable.
- Ejecutar focales, `npm test`, `npm run lint` si cambia código y `git diff --check`. Crear commit enfocado en el worktree; el coordinador revisa e integra. No push ni despliegue desde el worktree.
