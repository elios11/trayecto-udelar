# D03bk — Trayectorias de Ingeniería de Medios

## Objetivo

Auditar el Plan 2018 de la Licenciatura en Ingeniería de Medios (FIC/FING) frente a la [página vigente de FIC](https://www.fic.edu.uy/node/5573), que al 22/10/2026 enlaza una malla curricular y dos trayectorias alternativas de los primeros cuatro semestres. El inventario aún registra `research-pending`. Reproducir únicamente períodos y materias verificables, sin convertir una guía flexible o una oferta de cohorte en obligación de egreso.

## Evidencia y límites

- Partir de la auditoría y revisión existentes para `bedelias-fic-licenciatura-en-ingenieria-de-medios-2018`, su snapshot y su proyección. Conservar un único plan compartido entre FIC y FING, título, 360 créditos, mínimos, identificadores de progreso y frontera de materias verificadas/candidatas.
- Inspeccionar los enlaces de malla y trayectorias Fing/FCEA que publica FIC; registrar URLs de destino, autoridad, fecha de consulta, vigencia y alcance. El enlace de la malla apunta al repositorio institucional `files.fic.edu.uy`, que no respondió a la herramienta web en el primer intento; intentar un método seguro alternativo o copias de la misma autoridad antes de considerarlo inaccesible. No interpretar una vista previa incompleta como el documento entero.
- Contrastar cada fila y crédito con el Plan aprobado, las publicaciones vigentes FIC/FING y el snapshot técnico. Distinguir claramente el tronco compartido, las alternativas de Matemática de los semestres 1–4, las materias de implementación 2026 y los espacios flexibles.
- No inferir los semestres 5–8, equivalencias entre servicios, oferta vigente ni requisitos de egreso que los documentos no establezcan. Si los documentos no son verificables, conservar `research-pending`, guardar la pista y el bloqueo concreto, sin alterar la currícula visible.

## Artefactos y validación

- Versionar evidencia normalizada bajo `data/fic/` con filas, fuente, autoridad, vigencia, alcance, discrepancias y huella reproducible. Guardar crudos temporales sólo dentro de `tmp/d03bk-fic-medios-2018/`.
- Si hay evidencia suficiente, crear un regenerador offline de auditoría, revisión, proyección e inventario, con escrituras atómicas y sin reextracción. Probar períodos, variantes, 360 créditos, límites de cobertura, IDs de progreso, candidatas, planificador y deduplicación.
- Ejecutar regeneración dos veces con salida idéntica, pruebas focales, `npm test`, `npm run lint` si cambia código y `git diff --check`. Dejar documentado todo bloqueo de sandbox; no escalar repetidamente solicitudes de lectura equivalentes.
- Entregar un commit aislado desde este worktree. No integrar, pushear ni publicar aquí.
