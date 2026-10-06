# D03x — Trayectoria oficial de Licenciatura en Estadística 2014

## Estado y objetivo

Nodo preparado. Reconciliar Currícula y planificador del Plan 2014 de Licenciatura en Estadística con la publicación oficial vigente de FCEA, conservando el único título, los cuatro perfiles ya seleccionables y los IDs de progreso existentes.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`. Depende del inventario D03a y de las reconciliaciones FCEA previas ya integradas; ejecutar en un worktree creado desde el `main` actual.

## Alcance

- Verificar desde FCEA la vigencia de la grilla, sus semestres, perfiles, bloques flexibles, créditos y sedes. El inventario actual mantiene este plan en `research-pending`; no atribuirle una trayectoria oficial hasta cotejar las filas de la fuente.
- Comparar cada identidad oficial con el snapshot y la proyección `bedelias-fcea-licenciatura-en-estadistica-2014`. Una coincidencia de nombre o una entrada de Bedelías por sí sola no acredita inclusión. Conservar como candidatos recuperables los registros no demostrados.
- Reproducir los períodos y perfiles que la fuente efectivamente publica sin convertir todas las opciones en obligaciones acumulativas, ni transformar perfiles en títulos. El planificador debe reunir una sola vez las identidades verificadas de todos los recorridos y catálogos flexibles.
- Conservar los IDs usados por datos personales; toda equivalencia o alias histórico debe tener respaldo explícito. Documentar las discrepancias ya inventariadas: mínimos de perfiles, Matemática del perfil Tecnológico, etiquetas de título y duplicados de composición.
- Guardar bajo `data/fcea/` una fuente normalizada versionada con autoridad, URL exacta, fecha de consulta, vigencia publicada, alcance, filas/códigos y huellas reproducibles de las secciones cotejadas. La proyección debe regenerarse sin HTML/PDF crudos ni red mediante un comando registrado aquí al completar el nodo.
- Actualizar las auditorías, el inventario y `PROJECT_CONTEXT.md` sólo con hechos confirmados. Si la publicación es parcial, anuncia ampliaciones o limita sede/recorrido, registrar la brecha y condición de revisión en `docs/carreras-a-actualizar.md`.

## Verificación y entrega

- Las pruebas focales deben cotejar cantidad y ubicación de materias con la fuente normalizada, asegurar al menos una identidad visible por materia oficial, comprobar la unión sin duplicados del planificador y proteger el progreso histórico.
- Regenerar dos veces y comparar salidas para detectar no determinismo. Ejecutar pruebas focales, `npm test`, `npm run lint` y `git diff --check` antes del commit enfocado.
- El implementador no integra, pushea ni despliega. El coordinador revisa el commit y valida nuevamente el `main` combinado.

## Fuentes iniciales a verificar

- [FCEA: ficha y publicaciones de la Licenciatura en Estadística](https://fcea.udelar.edu.uy/publicaciones/buscar/advanced-search/156.html?page=2).
- [FCEA: Plan de Estudios de Licenciatura en Estadística](https://fcea.udelar.edu.uy/images/micrositios/bedelia/equivalencias/1990-2012/Plan_Lic_Estadistica_Junio2013_modificado.pdf).
- [FCEA: planes de estudio vigentes](https://fcea.udelar.edu.uy/institucional/novedades/54-gestion/bedelia-cat/180-planes-de-estudio-vigentes.html).

Estos enlaces provienen de la auditoría previa. Localizar y fijar las URLs directas de las grillas vigentes durante el cotejo; no suponer que la página de búsqueda o el plan de 2013 publican la secuencia actual.

## Checkpoint de implementación — 2026-10-06

- Investigación completada: la ficha vigente de FCEA publica cuatro grillas completas, cada una con ocho semestres, y declara actualización de julio de 2026. El plan vigente confirma un único título, 360 créditos y los mínimos comunes; no se detectó publicación futura, parcial ni territorial que justifique una entrada en `docs/carreras-a-actualizar.md`.
- Fuente durable guardada en `data/fcea/estadistica-2014-trayectorias.json`: 121 identidades oficiales y 293 ubicaciones perfil/semestre, con códigos, nombres, créditos, áreas, obligatoriedad, alternativas, alcance y huella SHA-256 de la sección normalizada.
- Discrepancias abiertas ya resueltas en el artefacto: 83/85 créditos de Matemática en la tabla tecnológica; tres filas sin código estable; dos códigos oficiales ausentes del snapshot; créditos editoriales que difieren de Bedelías; y ubicación de 335 en Instrumental para Bioestadística.
- Implementación completada: la fuente alimenta el generador compartido, la proyección publica 121 identidades verificadas y 293 ubicaciones exactas, la auditoría y el inventario quedan cerrados como `official-trajectory-reproduced`, y `PROJECT_CONTEXT.md` registra la convención estable.
- Regeneración offline exacta: `npm run trajectory:estadistica-2014` (equivalente a `node scripts/build-fcea-estadistica-2014.mjs`). No consulta red; valida la huella de `data/fcea/estadistica-2014-trayectorias.json` antes de escribir la proyección.
- Doble regeneración: dos ejecuciones consecutivas produjeron los mismos SHA-256 para la proyección (`CB529004…`), el catálogo (`62132147…`), los loaders (`E242AAC7…`) y el informe (`71824EBF…`); la cola curricular derivada quedó reproducible con `contentHash` `sha256:ff14ebfcf22a59a430bf422c85f335edcda349d639fadc92d7ec73df869a27a8`.
- Validación completada: las pruebas focales de auditoría e inventario pasan 28/28, la prueba de cola derivada pasa 2/2, `npm test` pasa build y 982/982 pruebas, `npm run lint` finaliza sin errores y `git diff --check` no informa defectos.
