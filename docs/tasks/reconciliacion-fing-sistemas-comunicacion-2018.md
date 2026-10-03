# D03r — Trayectorias de Ingeniería en Sistemas de Comunicación 2018

## Estado y modelo

Nodo posterior a D03q. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; requiere D01, D02, D03a y los cierres FING ya integrados. El coordinador crea un único worktree y mantiene un solo subagente activo.

## Objetivo

Reconciliar exactamente las currículas sugeridas y los perfiles tipo vigentes del Plan 2018 de FING con la proyección visible en Currícula y el catálogo del planificador. Mantener una sola carrera, título, plan, sede Montevideo y progreso. Los perfiles son guías sustituibles, no títulos; el recorrido personalizado sigue disponible. Tratar la variante con Matemática Inicial como secuencia académica del mismo plan, no como nueva carrera.

## Fuentes prioritarias

- Plan 2018: https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/43877/1/PLSIST_2018.pdf
- Comisión de Carrera FING y secciones de currículas sugeridas, Matemática Inicial y tres perfiles: https://eva.fing.edu.uy/course/view.php?id=1314
- Ficha institucional vigente: https://udelar.edu.uy/carrera/ingenieria-en-sistemas-de-comunicacion
- URLs por sección, alcance y discrepancias heredadas: registro del plan en `data/official-trajectories/inventory.json`.

Verificar las publicaciones actuales antes de fijar períodos. Registrar autoridad, URL, fecha y huella de cada artefacto estable; si una página mutable cambió, dejar traza de la versión observada. EVA sólo acredita la secuencia porque aquí la publica expresamente la Comisión de Carrera; otros cursos EVA no crean materias canónicas.

## Reglas

- Cotejar todas las etiquetas, orden y colocaciones de cada secuencia publicada, incluidos diez semestres, la alternativa de once con Matemática Inicial y los perfiles con sus bloques flexibles. Toda materia explícitamente enumerada conserva una identidad canónica visible; no duplicar cursos con créditos distribuidos entre áreas.
- Mantener 450 créditos, mínimos oficiales por grupos y áreas, Proyecto Final y aprobación del currículo individual. Totales impresos de perfiles son orientativos y sus sustituciones no se convierten en obligaciones universales.
- Representar Proyecto anual una sola vez aunque abarque dos semestres; preservar alternativas administrativas de 35 y 30 créditos sólo cuando la norma las avale.
- El planificador reúne sin duplicados todas las materias y opciones verificadas de los recorridos publicados. Bedelías contrasta identidad, créditos y previaturas, pero su composición sola no prueba pertenencia vigente; candidatos y asientos administrativos quedan fuera de la experiencia normal.
- Si alguna correspondencia o versión documental no se puede demostrar, mantener ese tramo como pendiente y el recorrido provisional en lugar de atribuir una colocación inventada a FING.

## Verificación y entrega

- Fuente curada y generador sin red; descargas y checkpoints bajo `tmp/d03r-sistemas-comunicacion-2018/` del worktree.
- Actualizar auditoría, inventario y `PROJECT_CONTEXT.md` sólo con resultados confirmados. Registrar brechas y siguiente paso recuperable en esta especificación.
- Probar correspondencia período/curso, variante Matemática Inicial, perfiles, proyecto, mínimos, catálogo y unicidad. Regenerar dos veces y cotejar hashes; ejecutar focales, `npm test`, `npm run lint` y `git diff --check`.
- Crear commit enfocado y entregar hash, evidencia, pruebas y riesgos. No integrar, pushear ni desplegar desde el subagente. Esta iteración acumula el cierre sin despliegue individual, conforme a la preferencia más reciente del usuario.

## Checkpoint recuperable — 2026-10-03

- Worktree comprobado en `8832a08fcdada8f9998e1851ade31606ec7b2aed`, limpio al iniciar.
- Se capturaron como invitado las páginas vigentes de EVA FING del curso y de las secciones 1 a 6, además de la ficha Udelar, bajo `tmp/d03r-sistemas-comunicacion-2018/`. El extractor determinista es `tmp/d03r-sistemas-comunicacion-2018/extract-live-sources.mjs` y su salida normalizada es `extracted-live.json`.
- La observación actual confirma diez semestres para la currícula sugerida, once comenzando con Matemática Inicial y diez para cada uno de los perfiles Electrónica, Redes y Procesamiento. También confirma el proyecto anual, los bloques flexibles y el procedimiento de aprobación del perfil individual.
- Huellas normalizadas EVA: curso `ded492d39f3345d2fbc755aabdcd03cc686e30d1ee19bacdcde3d3640ab5a547`; secciones 1–6 `f2c8fd2f1e173895beecc79265c401ca0dedd0ca7da9743f6c4d837b72a52e44`, `6602bf50068bcbf327ba61636a7215e319ad62ea427bc0fd72df929400b6d30b`, `8b804849b74851e277a1f67e316b3c0e978160e650a8a1ff15e3ac9338689b18`, `d5608499c97f7daee641af53317b94138b5197c6ec871685c82d0020d3a70d2e`, `3e59abca7a1e19fc121dd6a1b8a9d12f348cdf1390bd6b15b3d0dd3c1848e2a5` y `fdcc9579f6183430ab73640afaeb8a115e0089f9d87986b2e8951a4675c59a53`. Ficha Udelar: `9c3ea4a3cf087ee63857a66b428d9de5f015fee209268c2281e8ee3a646a9862`.
- El PDF normativo fue verificado mediante el visor web oficial; la descarga directa posterior quedó bloqueada por el filtro automatizado de Colibri y no se reemplazó con una copia no oficial.
- Pendiente al guardar este hito: reconciliar códigos inequívocos y opciones sin código, crear la fuente curada y el generador, agregar pruebas focales, regenerar dos veces, ejecutar la suite completa y crear el commit.
- Reanudación exacta: leer este checkpoint y `git status`; luego ejecutar `node tmp/d03r-sistemas-comunicacion-2018/extract-live-sources.mjs` sólo si hace falta reconstruir `extracted-live.json` desde las capturas ya guardadas.

## Checkpoint de implementación — 2026-10-03

- La fuente curada quedó en `data/fing/ingenieria-sistemas-comunicacion-2018-trayectorias.json` y reconcilia cinco trayectorias: currícula general, variante con Matemática Inicial y los tres perfiles tipo. Conserva una sola carrera, plan, credencial y sede.
- Cobertura proyectada: 221/221 colocaciones exactas entre las cinco trayectorias; 81 códigos oficiales inequívocos, tres identidades oficiales de fuente sin código Bedelías inventado y 26 bloques flexibles explícitos. El catálogo normal publica 112 materias o bloques verificados y excluye candidatos.
- La primera regeneración corregida dejó el inventario en `official-trajectory-reproduced`. Se agregó una revisión auditada que coteja etiquetas y colocaciones contra `publishedPathways` y registra las nueve fuentes verificadas.
- Discrepancias preservadas, sin ajuste inventado: créditos EVA/Bedelías para Diseño Lógico 2, Sistemas Embebidos en Tiempo Real, Estimación y Predicción y Diseño Topológico de Redes; totales orientativos de perfiles; alternativas de Proyecto de 35/30 créditos.
- Pendiente al guardar este hito: agregar y ajustar pruebas focales, actualizar `PROJECT_CONTEXT.md`, ejecutar dos regeneraciones finales con comparación de hashes, `npm test`, `npm run lint`, `git diff --check` y crear el commit enfocado.
- Reanudación exacta: ejecutar `npm.cmd run bedelias:project:sistemas-comunicacion`, inspeccionar `data/official-trajectories/inventory.json` y continuar por `tests/ingenieria-sistemas-comunicacion-2018-official-audit.test.mjs`.

## Cierre validado — 2026-10-03

- Las pruebas focales de D03r y del inventario pasan 28/28; `npm test` compila la aplicación y pasa 958/958 pruebas. `npm run lint` finaliza sin diagnósticos.
- Dos regeneraciones finales consecutivas conservaron byte a byte las siete salidas controladas: proyección del plan, catálogo y cargador extraídos, ambas colas de UI, reporte de proyección e inventario de trayectorias.
- `git diff --check` pasa. El inventario global queda en 88 planes reproducidos, dos con trayectoria identificada pendiente, 56 por investigar y una ausencia documentada.
- Riesgos conservados: las páginas EVA son mutables y deben recapturarse si cambia alguna huella; Colibri bloqueó la descarga automatizada del PDF normativo después de que su contenido y registro fueran verificados en el visor oficial, por lo que no se registra una huella local del archivo.
- Siguiente paso: integrar el commit enfocado sobre el `main` más reciente y repetir allí las verificaciones combinadas. No se hizo integración, push ni publicación.
