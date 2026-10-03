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
