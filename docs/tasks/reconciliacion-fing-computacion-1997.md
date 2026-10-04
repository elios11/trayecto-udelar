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

## Checkpoint documental — 2026-10-03

- Worktree comprobado limpio en `e08532121bf4042d599239823270568537d77071` al iniciar.
- La sección vigente de EVA de Ingeniería en Computación Plan 97 (`course/view.php?id=800&section=5`) continúa publicando la trayectoria de Montevideo como recurso `72938`. Se descargó el PDF oficial bajo `tmp/d03s-computacion-1997/`, se extrajeron sus cinco páginas y se revisaron también sus cinco renderizados.
- Huella SHA-256 del PDF: `1695f507d635737823ace832d35d24e95aee0ca1508c9fe7445d42423434f089`; metadatos del archivo: creado el 28/02/2025, cinco páginas A4.
- Cobertura demostrable: cuatro trayectorias completas de diez semestres y 31 colocaciones cada una (124 colocaciones), más el tramo inicial para PI menor a 20% con Matemática Inicial y TBEO (dos colocaciones). Total auditado: cinco variantes, 41 períodos y 126 colocaciones.
- Brecha preservada: el PDF no fija una continuación única para PI menor a 20%; sólo indica que después puede seguirse alguna trayectoria compatible y menciona como ejemplo las que comienzan en agosto. No se cerrará ni proyectará una continuación inventada.
- Discrepancias verificadas de la implementación inicial: sólo reproducía la variante de ingreso en marzo con PI 20–59%, mostraba PI como presemestre en todas las variantes y no conservaba las dos trayectorias de ingreso en agosto ni el bloque PI menor a 20%.
- Reanudación exacta: ejecutar `npm.cmd run trajectory:computacion-1997`, inspeccionar `app/data/computacion-1997-trayectorias.json` y `data/official-trajectories/inventory.json`, y continuar por `tests/computacion-1997-official-trajectory.test.mjs`.

## Checkpoint de implementación — 2026-10-04

- Fuente curada guardada en `data/fing/computacion-1997-trayectorias.json`; el generador sin red `scripts/build-computacion-1997-trajectories.mjs` valida identidades, créditos, recomendaciones y alternativas antes de escribir `app/data/computacion-1997-trayectorias.json`.
- La UI ofrece las cinco variantes y toma de la proyección tanto la colocación como la etiqueta oficial de cada período. `pi-20-59` continúa como trayectoria predeterminada y todos los estados siguen usando el mismo `progressPlanId` 1997.
- TBEO se incorpora únicamente al tramo PI menor a 20%; el generador comprueba su identidad diferida 1275. Programación Lógica 1340 permanece visible y Programación Funcional 1354 disponible como alternativa; Proyecto de Grado conserva `1730-A` y `1730-B`.
- El inventario regenerado quedó en `official-trajectory-reproduced` con cinco variantes, 41 períodos y correspondencia 126/126. El catálogo diferido conserva sus 434 materias y se filtran duplicados frente a la carga inicial.
- Verificación final: focales 66/66; `npm.cmd test` completó build y 965/965 pruebas; `npm.cmd run lint` sin hallazgos. Dos ejecuciones consecutivas de `npm.cmd run trajectory:computacion-1997` conservaron SHA-256 `042f159742d1328bb8ebba7478281cb5104c40f2f791df6004395fb4d7f0a59e` para la proyección y `a5f97bdf8e76ec26cc4269def2b4c04e76b845ed0436aa1652bf1a5686607ffb` para el inventario; `git diff --check` quedó limpio.
