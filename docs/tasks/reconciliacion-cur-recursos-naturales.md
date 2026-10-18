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

- Investigación pendiente. Las auditorías del 24/08/2026 verificaron planes y requisitos, no una secuencia temporal oficial.
