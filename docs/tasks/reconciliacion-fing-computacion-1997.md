# D03s — Cotejo oficial de Ingeniería en Computación 1997

## Estado y modelo

Nodo posterior a D03r. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a integrados. El coordinador mantiene un solo subagente activo. Este plan ya tiene una implementación curada: el objetivo principal es auditarla, no reconstruirla.

## Objetivo

Contrastar todos los períodos y materias de la trayectoria de Computación Plan 1997 con la trayectoria sugerida FING 2025 ya enlazada en la UI, y guardar un artefacto reproducible que permita verificar la correspondencia automáticamente. Preservar el plan histórico, progreso existente, tres opciones de Prueba Inicial, requisitos y carga diferida del catálogo optativo. Corregir sólo divergencias demostradas.

## Fuentes prioritarias

- Trayectoria sugerida 2025 publicada por la Comisión de Carrera: https://eva.fing.edu.uy/pluginfile.php/79060/mod_resource/content/5/TrayectoriaSugerida_2025_Montevideo.pdf
- Plan 1997 y composición de Bedelías ya curada en `app/data/computacion-1997-bedelias.json`; catálogo diferido en `app/data/computacion-1997-electivas.json`.
- Implementación actual de los períodos, cursos y variantes de Prueba Inicial en `app/page.tsx`; inventario y revisión en `data/official-trajectories/`.

Verificar la vigencia y el alcance del PDF oficial en la web. Si la publicación cambió, comparar su nueva revisión y documentar las diferencias; no confiar sólo en la fecha del enlace. Bedelías contrasta códigos, créditos y reglas, pero no sustituye la ubicación semestral publicada por la Comisión.

## Reglas

- Cotejar etiquetas, orden y colocaciones de todos los períodos oficiales, incluidos bloques flexibles y la sustitución/ubicación de Prueba Inicial. Toda materia enumerada en la trayectoria debe conservar una identidad visible en Currícula y disponible para el planificador.
- Distinguir la guía sugerida de los mínimos de egreso y no convertir el catálogo completo diferido en materias obligatorias. Conservar optativas ya acreditadas aunque el catálogo esté plegado o cargado bajo demanda.
- Preservar IDs de cursos y estado personal. Cualquier alias o cambio requiere fuente oficial explícita; no inferir equivalencias por parecido de nombre.
- Si el PDF no permite demostrar alguna colocación, mantener el inventario pendiente y registrar la brecha; no forzar un cierre 100% con suposiciones.

## Verificación y entrega

- Crear fuente curada, revisión e inventario deterministas sin red para el plan, reutilizando la arquitectura D03. Guardar descargas/checkpoints bajo `tmp/d03s-computacion-1997/` del worktree.
- Probar correspondencia período/curso, variantes PI, identidad de materias, catálogo diferido, progreso y unicidad. Repetir generación con hashes idénticos; ejecutar focales, `npm test`, `npm run lint` y `git diff --check`.
- Actualizar `PROJECT_CONTEXT.md` sólo con hechos estables confirmados. Dejar checkpoint y comando de reanudación en esta especificación si se interrumpe.
- Crear commit enfocado y entregar hash, evidencia, pruebas y riesgos. No integrar, hacer push ni desplegar desde el subagente. Esta iteración acumula cambios para un push/despliegue posterior.
