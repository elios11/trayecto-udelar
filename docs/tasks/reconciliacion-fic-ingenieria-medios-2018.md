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

## Hito de evidencia del 22/10/2026

- La descarga del enlace FIC produjo `tmp/d03bk-fic-medios-2018/grilla_lim_10_diciembre_2025.pdf` (cinco páginas, SHA-256 `20b9529459fbf3540fd29c3bca0791e08e127960f60bf4b1d5893d6248b1c0be`). Es un PDF de capturas de planilla sin capa de texto. Se revisaron visualmente las cinco páginas renderizadas con `pdftoppm`; la transcripción estructurada y el alcance están en `data/fic/ingenieria-medios-2018-malla-review.json`. El PDF crudo y sus PNG quedan sólo en `tmp/`.
- Las páginas 2 y 3 publican dos guías distintas para semestres 1–4: Fing y FCEA con Matemática Inicial de Fing. Comparten el primero y cuarto; difieren en las dos matemáticas de segundo y una de tercero. La página 1 confirma mínimos por grupo/área ya modelados.
- Las páginas 4 y 5 son ejemplos Creativo-Audiovisual y Tecnológico de semestres 6–9. Falta el quinto y el Plan aprobado define cuatro años como promedio. Por ello no se puede encadenar el PDF como una trayectoria íntegra ni asegurar oferta de los períodos posteriores.
- El siguiente paso es cotejar cada fila de 1–4 con el snapshot y fuentes oficiales, conservar IDs, añadir sólo identidades respaldadas y proyectar esas dos guías parciales; la UI debe seguir advirtiendo cobertura incompleta y no convertir las variantes en menciones. No se alteró aún la proyección ni el inventario.
- Verificación del hito: `node tests/ingenieria-medios-2018-malla-review.test.mjs` pasó (2/2) y `npm run lint` pasó. `npm test` se intentó, pero Vite no pudo ejecutar procesos hijos por el sandbox (`spawn EPERM`), sin fallo atribuido a esta auditoría. El integrador debe correr la suite completa fuera de esa restricción. No se requiere reextracción para reproducir la transcripción, y la fuente cruda se vuelve a consultar sólo para detectar cambios institucionales.
