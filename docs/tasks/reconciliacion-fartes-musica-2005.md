# D03am — Licenciatura en Música, Plan 2005

## Estado y objetivo

Implementación terminada en el worktree de D03am. `bedelias-fartes-licenciatura-en-musica-2005` pasó de `research-pending` a `official-trajectory-reproduced`: la proyección conserva un único Plan 2005, cuatro opciones certificadas, ocho semestres por opción y 360 créditos. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a.

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

## Implementación y decisiones

- `data/fartes/musica-2005.json` conserva la evidencia normalizada del libro del Plan 2005, la página vigente del Instituto de Música y el snapshot ya versionado de Bedelías. El PDF institucional se inspeccionó visualmente en sus páginas 16–19; su SHA-256 crudo es `9994f1c969c824718b2eae0e092b62bd8ed00db7bd6820b1c9121ae67659d335`.
- Las cuatro grillas reúnen 223 ubicaciones: 56 de Composición, 61 de Dirección de Coro, 55 de Dirección de Orquesta y 51 de Musicología. El tronco común se guarda una sola vez en la evidencia y se proyecta con IDs de progreso compartidos.
- Se publican 93 correspondencias técnicas inequívocas y diez bloques sólo-fuente para Introducción a la Universidad, Armonía 1–4, Repertorio 1–3 y Técnicas Vocales 2–3. Las otras 563 entradas técnicas quedan candidatas y ocultas de las grillas.
- Los mínimos raíz de cada opción suman exactamente 360 créditos. Los submínimos de electivas musicales y no musicales están anidados dentro del mínimo electivo, de modo que no se acumulan dos veces; la oferta concreta de electivas y proyectos no se congela como obligación.
- Se preservan como conflictos auditables el subtotal impreso de 40 frente a 44 en Composición semestre 5, el total web de 20 frente a 30 en Musicología semestre 8 y la repetición web de Transcripción frente a Metodología de la Investigación 2 en el libro. No se prorratearon créditos.
- Interpretación Musical Plan 2005 y los cuatro planes nominales 1987 permanecen como planes separados en el inventario. No apareció una publicación futura, progresiva ni territorialmente parcial, por lo que `docs/carreras-a-actualizar.md` no cambia.

## Regeneración reproducible

```powershell
npm run trajectory:fartes-musica-2005
```

El comando es offline: parte de `data/fartes/musica-2005.json`, del snapshot `data/bedelias/fartes-licenciatura-en-musica-2005.json` y de los registros versionados. Dos ejecuciones consecutivas produjeron el mismo SHA-256 agregado sobre los 177 artefactos regenerados: `f9d0ecf75b6d54a6c53c8bec9df2889c7a3cbecd28adb14c6df6d1e60b5d4ac3`.

## Verificación

- `node tests/fartes-music-degree-official-audit.test.mjs`: pasó, 6/6.
- `npm test`: pasó el build y las 1053 pruebas.
- `npm run lint`: pasó sin observaciones.
- `git diff --check`: pasó sin errores.
- La comprobación funcional en navegador no pudo ejecutarse porque la sesión no expuso ningún proveedor de navegador; la compilación de producción sí pasó. La inspección visual obligatoria de las tablas PDF se realizó sobre las páginas 16–19 renderizadas localmente.

## Integración

- Implementación aislada `8371829`; integrada en `main` como `fd513f4`.
- Verificación del resultado combinado: `npm test` (1053/1053), `npm run lint` y `git diff --check`, todas correctas. No se hizo push ni despliegue en este nodo.
