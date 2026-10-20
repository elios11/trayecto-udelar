# D03be — Licenciatura en Matemática Plan 2014

## Objetivo

Auditar la trayectoria sugerida de `bedelias-fcien-licenciatura-en-matematica-2014` sobre `main` `9ebc2e7`. El inventario actual está `research-pending`: el Plan y reglamentos verifican la estructura flexible y los perfiles, pero no demuestran una secuencia recomendada curso→período ni una declaración institucional de ausencia. Buscarla primero en FCIEN, Centro de Matemática, Comisión de Carrera y repositorios Udelar. No inferir semestres de duración, horarios o previaturas.

## Fuentes y límites

- Plan aprobado: `https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/24564/1/PLMAT_2020.pdf`.
- Reglamentación vigente: `https://eva.fcien.udelar.edu.uy/pluginfile.php/126223/mod_resource/content/2/reglamentacion_en_uso_2022.pdf`.
- Orientación en Ciencia de Datos: `https://eva.fcien.udelar.edu.uy/pluginfile.php/133474/mod_resource/content/1/reglamentacion_ciencia_datos_2022_v4.pdf`.
- Ficha FCIEN: `https://www.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-matematica`.
- Inventario y auditoría existentes: `data/official-trajectories/inventory.json`, `data/bedelias/audits/official-source-audits.json`, proyección de `app/data/bedelias-generated/`.

Preservar un solo título y progreso, Montevideo, 360 créditos, perfiles y orientación ya modelados, límites de nivel, monografía, IDs, cargas y catálogo de 367 unidades. No promocionar registros por similitud; Bedelías/EVA no son por sí solos verdad de secuencia. Si aparece una guía parcial, reproducir sólo lo que la fuente confirma. Ante conflicto de requisitos, no modificar mínimos sin resolución/vigencia aclaradas.

## Entrega

Versionar evidencia normalizada en `data/` con autoridad, URL, fecha, vigencia, alcance, filas/identidades cotejadas y huella reproducible; crear regenerador offline e incluir comando. Actualizar inventario, auditoría y pruebas. Si la publicación oficial está en desarrollo o es parcial, registrar `docs/carreras-a-actualizar.md` con condición concreta. Si no hay suficiente prueba, mantener `research-pending` y documentar el gatillo de revisión; silencio o enlace roto no prueban ausencia. Dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint` y `git diff --check`. Commit enfocado en este worktree; no integrar, pushear ni publicar desde él.
