# D03bb — Licenciatura en Geografía 2018

## Estado y objetivo

Auditar de forma aislada `bedelias-fcien-licenciatura-en-geografia-2018` desde `main` `2a8ba34`. El Plan, la sede y los requisitos ya fueron contrastados, pero el inventario de trayectorias sigue `research-pending`. Determinar si Facultad de Ciencias, su Departamento de Geografía o la Comisión de Carrera publican una malla o guía vigente con materias y períodos. Reproducir únicamente el alcance respaldado; no convertir los bloques por área de Bedelías en semestres ni deducir una ausencia institucional a partir de enlaces fallidos.

## Contexto y fuentes iniciales

- Revisar la auditoría en `data/bedelias/audits/official-source-audits.json`, el snapshot de Geografía bajo `data/bedelias/`, la proyección en `app/data/bedelias-generated/`, el inventario `data/official-trajectories/inventory.json` y la sección pertinente de `docs/tasks/importacion-masiva-carreras.md`.
- Plan en Colibrí: `https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/24562/1/PLGEOF_2020.pdf` y ficha `https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/24562`.
- Carrera FCIEN: `https://www.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-geografia`; catálogo Udelar: `https://udelar.edu.uy/carrera/licenciatura-en-geografia`.
- Buscar además publicaciones oficiales del Departamento y Comisión, guías de ingreso, CSE, repositorios institucionales e IMPO. Comparar versión, vigencia y alcance, y distinguir programas u oferta temporal de una trayectoria adoptada. EVA y Bedelías no son fuente única de verdad curricular.

## Reglas de implementación

1. Conservar una carrera, título y progreso, Plan 2018, Montevideo, cuatro años y 360 créditos. Mantener cinco mínimos del núcleo común (60/45/45/40/30), 90 optativos, 10 de extensión y 40 de tesina; la Comisión valida su propuesta y requisitos previos. Los énfasis personales no son menciones certificadas.
2. Sólo publicar materias con inclusión curricular oficial exacta. La composición técnica mantiene candidatas recuperables; no fusionar ni promover por semejanza. Una guía oficial debe conservar al menos una identidad visible por materia enumerada y distinguir optativas y espacios flexibles sin inventar créditos. Si no se demuestra secuencia oficial, conservar el recorrido orientativo generado, rotulado como provisional y con materias reales, sin atribuirlo a FCIEN.
3. Versionar evidencia normalizada en `data/` con autoridad, URL, fecha de consulta, vigencia, alcance, filas o identidades cotejadas y huella reproducible. Proveer regeneración offline desde snapshots existentes, sin repetir scraping masivo. Registrar una condición concreta de revisión y actualizar `docs/carreras-a-actualizar.md` sólo si hay publicación futura o territorial parcial.
4. Preservar IDs, cargas, reglas, persistencia personal y demás carreras. Actualizar auditoría, inventario, prueba focal y únicamente los artefactos derivados necesarios.

## Entrega

Documentar hallazgo y límites en esta especificación. Ejecutar dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint` y `git diff --check`; crear un commit enfocado en este worktree. No integrar, pushear ni publicar desde el nodo.
