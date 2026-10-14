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

## Resultado de la investigación — 2026-10-14

- El enlace al Plan 2016 modificado en 2023 que publica el Departamento devuelve HTTP 404. El registro institucional alternativo de Colibri identifica el Plan 916/2016 de la carrera 300 y el archivo `PLAST_2016.pdf`; la descarga automatizada del PDF fue rechazada por el filtro de tráfico, por lo que no se atribuyen cambios de 2023 no cotejados.
- La evidencia institucional indexada describe un currículo individual aprobado por la Comisión de Carrera, pero también exige que se ofrezca una implementación concreta. La guía de ingreso 2026 de Facultad remite unidades y, para algunas carreras, trayectorias sugeridas a EVA. No se halló una trayectoria pública, vigente y reproducible específica de Astronomía ni una declaración que pruebe su ausencia. El estado se conserva como `research-pending` con cero períodos temporales oficiales reproducidos.
- Los programas Colibri de `AS20` y `AS28` verifican que ambas unidades pertenecen a la carrera 300, Plan 916/2016. Sus créditos se cotejan con el snapshot versionado de Bedelías. Las restantes identidades continúan como candidatas y no satisfacen requisitos oficiales en la presentación generada.
- Los ocho semestres publicados son una duración estimada de 48 meses. No se crean ocho períodos ni se distribuyen materias por inferencia.

## Artefactos y regeneración

- Evidencia normalizada: `data/fcien/astronomia-2016-trajectory-review.json`.
- Snapshot reutilizado: `data/bedelias/fcien-licenciatura-en-astronomia-2016.json`, SHA-256 `93f3b4cb616c6a0666fd22ce5724453d7dbbc1f3bac11d2d9ad3dbeaea4e5a3a`.
- Huella canónica de las porciones institucionales: `sha256:d77c9985f94b06f3c1fe7a4c9896251bcb7b53df4af9fd2957d2d3245120cac6`.
- Regeneración offline: `npm run trajectory:fcien-astronomia-2016`.
- Conteo esperado: 187 registros proyectados; 2 materias reales verificadas (`AS20`, `AS28`), 1 bloque de validación verificado y 184 candidatas. El fallback visible contiene sólo las dos materias cotejadas en un bloque generado no temporal; el resto del catálogo permanece recuperable como candidato.

La regeneración valida las huellas de evidencia y snapshot, actualiza auditoría, proyección, colas e inventario y falla si cambia la frontera de autoridad o aparece un período inferido. Para comprobar determinismo, ejecutar el comando dos veces y comparar las huellas de todos los artefactos modificados. La próxima revisión requiere una implementación o trayectoria vigente publicada por la Comisión/EVA con identidades y períodos reproducibles, o una declaración institucional explícita de que no existe una secuencia oficial.
