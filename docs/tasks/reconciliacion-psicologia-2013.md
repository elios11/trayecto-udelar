# D03bl — Psicología Plan 2013

## Objetivo

Reproducir en Currícula la [malla oficial actualmente enlazada por Facultad de Psicología](https://psico.edu.uy/ensenanza/grado/licenciatura/plan/malla-curricular), publicada como [PDF actualizado en diciembre de 2025](https://www.psico.edu.uy/sites/default/files/2026-02/malla%20curricular_0.pdf). Partir del `main` `89ed10b` y conservar el único Plan 2013, sus tres sedes completas y el progreso existente. El PDF es una guía de ocho semestres; no convertir sus cupos variables ni franjas plurianuales en materias obligatorias repetidas.

## Criterios de autoridad

- Usar el PDF de 2026 enlazado hoy como fuente de cursos, códigos, créditos y ubicación. La página HTML enumera `Psicopatología Clínica (vigente hasta el año 2018)` y no prevalece sobre la malla actual.
- Cotejar código y créditos con el snapshot de Bedelías. Mantener IDs técnicos exactos cuando la correspondencia sea inequívoca; dejar las variantes, reválidas y oferta periódica como candidatas. Un rótulo parecido no basta para fusionar.
- Los bloques que abarcan más de un semestre (idiomas, cooperación, construcción de itinerario, proyectos y prácticas) se modelan como una sola identidad acreditable o catálogo flexible, no como obligaciones repetidas ni períodos ficticios.
- Conservar 320 créditos y mínimos por ciclo y módulo del Plan aprobado; los sumandos de la malla no sustituyen el control normativo ni garantizan oferta por sede.

## Evidencia y recuperación

- Fuente descargada en `tmp/d03bl-psico-2013/malla-psicologia-2026.pdf`, SHA-256 `728c7ea5b865364e66d662a253cf24480190e4b3d8cf8016c5dedcf2d44ec5e8`, una página A3. El PNG de inspección visual está en el mismo directorio temporal.
- Normalizar bajo `data/psico/` la fecha de consulta, vigencia impresa, URL, códigos, créditos, períodos y ambigüedades. No versionar el PDF crudo.
- Regeneración offline: `node scripts/build-psicologia-2013.mjs`, `npm run trajectory:inventory`. Verificar dos ejecuciones idénticas y una prueba focal.
- Si falta equivalencia técnica para una franja flexible, preservar un bloque oficial sólo-fuente sin código ni curso inventado. Cerrar como parcial si alguna ubicación no puede cotejarse con seguridad.

## Validación

Ejecutar prueba focal, `npm test`, `npm run lint` y `git diff --check`. Documentar la discrepancia de cualquier código/crédito en la evidencia, sin ajustarlo intuitivamente. Crear commit enfocado en este worktree; integrar sobre `main` sólo después de revisar el resultado combinado.
