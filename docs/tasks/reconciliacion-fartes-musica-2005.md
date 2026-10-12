# D03am — Licenciatura en Música, Plan 2005

## Estado y objetivo

Nodo preparado para implementación. `bedelias-fartes-licenciatura-en-musica-2005` permanece en `research-pending` aunque la auditoría anterior confirmó cuatro opciones certificadas y 360 créditos: falta correspondencia estructurada de las grillas de ocho semestres de cada opción. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a. Un worktree y un solo subagente, basados en el `main` posterior a D03al.

## Autoridad y límites

- Cotejar íntegramente el [Plan 2005 de la Escuela Universitaria de Música](https://www.artes.udelar.edu.uy/wp-content/uploads/2023/09/plan_2005_libro_naranja.pdf), especialmente las grillas de Composición, Musicología, Dirección de Orquesta y Dirección de Coro, con la [página actual de Facultad de Artes](https://www.artes.udelar.edu.uy/carrera/licenciaturas-instituto-de-musica/). Revisar visualmente las tablas del PDF, no sólo la extracción textual. Registrar URL, autoridad, fecha, vigencia, páginas/filas y huellas reproducibles.
- Reutilizar `data/bedelias/fartes-licenciatura-en-musica-2005.json` y la auditoría existente; no repetir extracción. Cada opción debe conservar ocho períodos oficiales, un tronco común compartido sin duplicar IDs de progreso, su bloque específico y sus mínimos flexibles. Contrastar las materias de cada celda con Bedelías sólo por identidad demostrable. Si una unidad oficial no tiene código inequívoco, usar bloque sólo-fuente; las entradas no verificadas siguen candidatas.
- Mantener los cuatro perfiles como opciones certificadas de un mismo Plan 2005, sin mezclar con Interpretación Musical 2005 ni con los planes históricos 1987 de Composición/Dirección. No convertir todas las electivas, proyectos especiales, seminarios de contenido variable ni ofertas de una edición en requisitos acumulativos. Los cuadros de oferta 2025/2026 pueden corroborar vigencia, no sustituir la grilla estable del Plan.
- No inferir previaturas, equivalencias de planes o disponibilidad semestral desde EVA. Registrar contradicciones internas del libro o entre el libro y datos técnicos en vez de prorratear créditos silenciosamente.

## Artefactos y cierre

- Versionar evidencia normalizada bajo `data/fartes/` y un generador offline que reconstruya proyección, auditoría, revisión e inventario sin nueva consulta. Dos regeneraciones idénticas con comandos y huellas documentados.
- Probar cuatro opciones, ocho períodos por opción, identidad visible de cada unidad oficial, tronco común no duplicado, 360 créditos y mínimos propios, electivas/proyectos flexibles, frontera `verified`/`candidate` y separación de otros planes.
- Actualizar `docs/carreras-a-actualizar.md` sólo si aparece fuente oficial que anuncie implementación progresiva, malla futura o cobertura parcial; `PROJECT_CONTEXT.md` sólo ante decisión estable.
- Ejecutar focales, `npm test`, `npm run lint` si cambia código y `git diff --check`. Commit enfocado en el worktree; el coordinador revisa e integra. No push ni despliegue desde el worktree.
