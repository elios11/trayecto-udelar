# D03ao — Licenciatura en Astronomía, Plan 2016

## Estado y objetivo

Nodo preparado para implementación. `bedelias-fcien-licenciatura-en-astronomia-2016` figura `research-pending` en el inventario D03. Investigar la trayectoria oficial vigente y reconciliarla con Currícula y el planificador sin confundir duración estimada con semestres de materias publicados. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a. Un worktree y un solo subagente.

## Autoridad y alcance

- Partir de la [página institucional del Departamento de Astronomía](https://astronomia.fcien.edu.uy/carrera/licenciatura), que declara 360 créditos, ocho semestres estimados y las áreas del Plan 2016. Su [enlace al Plan modificado en 2023](https://eva.fcien.udelar.edu.uy/pluginfile.php/165106/mod_resource/content/4/PlanyReglamentoAstronomia2016modif2023.pdf) devolvió 404 en la consulta inicial: buscar una copia institucional accesible y registrar el fallo, sin asumir el contenido. Rastrear una malla, grilla o trayectoria sugerida vigente publicada por Facultad de Ciencias, Departamento o Comisión de Carrera antes de clasificar el estado. La página por sí sola no prueba ni niega una secuencia oficial.
- Reutilizar los snapshots y la auditoría ya versionados; no repetir scraping de Bedelías. Distinguir Plan vigente, oferta semestral y programas individuales. EVA y horarios pueden contrastar identidades, no crear una malla sugerida.
- Si existe guía oficial por períodos, reproducir sus períodos, bloques flexibles y variantes sin convertir todas las optativas en obligatorias. Si la publicación oficial demuestra que el plan es deliberadamente individual sin trayectoria sugerida, documentar `no-official-trajectory-documented` con fuente, fecha y argumento explícito. Si no se puede demostrar ninguna de ambas cosas, conservar `research-pending` y entregar el hallazgo sin inventar semestres.
- No cambiar IDs de progreso ni agregar créditos/previas por inferencia. Las materias del catálogo normal necesitan respaldo curricular oficial exacto; las técnicas no cotejadas siguen candidatas.

## Artefactos y cierre

- Versionar la evidencia normalizada bajo `data/fcien/` con URL, autoridad, fecha, vigencia, alcance, filas e identidades cotejadas, huella de porción fuente reproducible y conflictos. Crear generador offline determinista para proyección, auditoría, revisión e inventario; ejecutar dos veces y comparar huellas.
- Probar estado, períodos y materias visibles —si hay malla oficial—, mínimos/áreas y 360 créditos, catálogo del planificador, flexibilidad y frontera `verified`/`candidate`. Verificar que ningún resultado sustituya ocho semestres *estimados* por ocho períodos inventados.
- Actualizar `docs/carreras-a-actualizar.md` sólo si se acredita malla futura, implementación progresiva o recorrido/sede parcial; `PROJECT_CONTEXT.md` sólo ante decisión transversal confirmada.
- Ejecutar focales, `npm test`, `npm run lint` si se cambia código y `git diff --check`. Crear commit aislado, informar riesgos; no push ni despliegue desde el worktree.
