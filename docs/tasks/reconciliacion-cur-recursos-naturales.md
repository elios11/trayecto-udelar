# D03au — Recursos Naturales en Rivera

## Objetivo

Auditar las trayectorias de la Licenciatura en Recursos Naturales Plan 2010 y la Tecnicatura en Gestión de Recursos Naturales Plan 2011. Comparten servicio, sede y articulación, pero conservan títulos, planes y progreso separados. Ambas auditorías de plan y mínimos ya existen; falta resolver con evidencia oficial si publican una secuencia sugerida propia o sólo un currículo individual flexible. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; un subagente y un worktree aislado basado en `main`.

## Fuentes y límites

- Partir de los snapshots `data/bedelias/cur-licenciatura-en-recursos-naturales-2010.json` y `data/bedelias/cur-tecnicatura-en-gestion-de-recursos-naturales-2011.json`, sus auditorías oficiales y las proyecciones actuales. La Licenciatura controla 360 créditos y siete mínimos, incluida Tesina de 40; la Tecnicatura 195 créditos y ejes 50+50+50, Trabajo Final 35 y máximo optativo 10.
- Contrastar el Plan 2010 publicado por IMPO el 15/11/2010 y el Plan 2011 publicado el 08/08/2011 con páginas vigentes de FCIEN/CENUR, publicaciones departamentales y repositorios Udelar. Buscar dameros, grillas, recorridos o guías semestrales oficiales; si un enlace falla, buscar copia de la misma autoridad antes de cerrar la búsqueda. EVA u oferta de un período no son fuente única de verdad curricular.
- El texto de la Tecnicatura dice que las asignaturas del plan son ejemplos ilustrativos: no convertirlas en obligaciones ni semestres sin otra fuente oficial. La articulación no convierte la Tecnicatura en título intermedio automático de la Licenciatura.
- No presentar las 378 y 75 entradas acumuladas de Bedelías como una malla obligatoria. Preservar IDs de progreso y candidatas. Si no se halla trayectoria oficial, mantener una experiencia provisional claramente rotulada según la política del proyecto; sólo declarar ausencia oficial si una autoridad lo confirma expresamente.

## Artefactos y cierre

- Guardar evidencia normalizada/versionada bajo `data/` con URL, autoridad, consulta, vigencia, alcance, filas cotejadas, conflictos y huella reproducible; crudos en `tmp/d03au-recursos-naturales/`.
- Si hay malla oficial, reproducir períodos y alternativas exactos con un generador offline; si sólo hay flexibilidad documentada, registrar la brecha o ausencia explícita sin inventar secuencia. En ambos casos regenerar auditoría, revisión, colas e inventario desde datos versionados, sin red.
- Probar créditos, mínimos, Tesina/Trabajo Final, máximo optativo como validación humana, separación entre títulos, frontera `verified`/`candidate`, conservación de IDs y catálogo del planificador. Ejecutar dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint` si cambia código y `git diff --check`.
- Crear commit enfocado. No integrar, hacer push ni publicar desde el worktree; informar fuentes inaccesibles y decisiones pendientes.

## Estado

- Auditoría cerrada el 18/10/2026 con estado `official-trajectory-identified-pending` para ambos planes. No se documenta ausencia: hay evidencia institucional de recorridos/calendarios por cohorte, pero no se obtuvo una publicación con filas curso-período.

## Resultado documental

- Para la Licenciatura, el Plan 2010 de IMPO y las fichas vigentes de FCIEN/Udelar confirman la estructura flexible por áreas, 360 créditos, Rivera y aprobación individual por la Comisión, sin damero temporal. Un artículo institucional depositado en Colibrí en 2023 documenta que cada generación recibe una trayectoria sugerida para cubrir mínimos en el tiempo ideal, pero no publica sus cursos ni períodos.
- Para la Tecnicatura, el Plan 2011 de IMPO y los anuarios de FCIEN confirman 195 créditos, ejes 50+50+50, Trabajo Final de 35 y que las asignaturas enumeradas son ejemplos ilustrativos. La presentación institucional de CSE de 2017 registra calendarios organizados por años como práctica de implementación conjunta, pero no relaciona cursos concretos con años o semestres.
- La ficha externa histórica del portal `fc-si-portal.fcien.edu.uy` y una página regional de Rivera no respondieron de forma estable durante el cotejo. Se usaron la página vigente de FCIEN, el portal central Udelar, IMPO, Colibrí, CSE y la Biblioteca de FCIEN como copias o publicaciones de las mismas autoridades. El PDF de Colibrí no quedó como crudo reproducible por una falla de caché, pero el registro institucional y su contenido indexado permitieron delimitar la afirmación; no se atribuyeron filas ausentes.
- Los dos títulos, planes y progresos permanecen separados. La articulación no convierte la Tecnicatura en credencial intermedia de la Licenciatura ni autoriza compartir avance.

## Proyección y regeneración

- La evidencia normalizada y sus huellas viven en `data/cur/recursos-naturales-rivera-trajectory-review.json`. Conserva URL, autoridad, consulta, estado de publicación, alcance, brecha y las fronteras de IDs candidatas de ambos snapshots.
- Hasta obtener la asignación oficial de cursos y períodos, la UI fuerza `Recorrido orientativo generado`. Conserva las 377 candidatas de la Licenciatura y las 74 de la Tecnicatura disponibles para el planificador, pero las marca provisionales y no les permite computar mínimos ni créditos sin validación.
- Regenerar sin red con `npm run trajectory:cur-recursos-naturales`. El comando actualiza auditorías, revisiones, colas, proyecciones e inventario y valida títulos, requisitos, sede, Tesina/Trabajo Final, fronteras e IDs.
- La regeneración se ejecutó dos veces y produjo las mismas huellas en todos los artefactos alcanzados. Después se ejecutaron las pruebas focales, `npm test`, `npm run lint` y `git diff --check`.

## Condición de nueva revisión

- Licenciatura: obtener de la Comisión de Carrera, FCIEN o CENUR Noreste una trayectoria de cohorte vigente con materias y períodos.
- Tecnicatura: obtener de esas autoridades un calendario vigente que asigne materias concretas a años o semestres. Los ejemplos del Plan 2011 no bastan.
