# D03be — Licenciatura en Matemática Plan 2014

## Objetivo

Auditar la trayectoria sugerida de `bedelias-fcien-licenciatura-en-matematica-2014` sobre `main` `9ebc2e7`. El inventario actual está `research-pending`: el Plan y reglamentos verifican la estructura flexible y los perfiles, pero no demuestran una secuencia recomendada curso→período ni una declaración institucional de ausencia. Buscarla primero en FCIEN, Centro de Matemática, Comisión de Carrera y repositorios Udelar. No inferir semestres de duración, horarios o previaturas.

## Fuentes y límites

- Plan aprobado: `https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/24564/1/PLMAT_2020.pdf`.
- Reglamentación vigente: `https://eva.fcien.udelar.edu.uy/pluginfile.php/126223/mod_resource/content/2/reglamentacion_en_uso_2022.pdf`.
- Orientación en Ciencia de Datos: `https://eva.fcien.udelar.edu.uy/pluginfile.php/133474/mod_resource/content/1/reglamentacion_ciencia_datos_2022_v4.pdf`.
- Ficha FCIEN: `https://www.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-matematica`.
- Inventario y auditoría existentes: `data/official-trajectories/inventory.json`, `data/bedelias/audits/official-source-audits.json`, proyección de `app/data/bedelias-generated/`.

Preservar un solo título y progreso, Montevideo, 360 créditos, perfiles y orientación ya modelados, límites de nivel, monografía, IDs, cargas y catálogo de 367 unidades. No promocionar registros por similitud; Bedelías/EVA no son por sí solos verdad de secuencia. Si aparece una guía parcial, reproducir sólo lo que la fuente confirma. Ante conflicto de requisitos, no modificar mínimos sin resolución/vigencia aclaradas.

## Entrega

Versionar evidencia normalizada en `data/` con autoridad, URL, fecha, vigencia, alcance, filas/identidades cotejadas y huella reproducible; crear regenerador offline e incluir comando. Actualizar inventario, auditoría y pruebas. Si la publicación oficial está en desarrollo o es parcial, registrar `docs/carreras-a-actualizar.md` con condición concreta. Si no hay suficiente prueba, mantener `research-pending` y documentar el gatillo de revisión; silencio o enlace roto no prueban ausencia. Dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint` y `git diff --check`. Commit enfocado en este worktree; no integrar, pushear ni publicar desde él.

## Resultado de la revisión — 20/10/2026

**`research-pending`**. El [Centro de Matemática enlaza desde su página vigente para estudiantes](https://www.cmat.edu.uy/licenciatura/estudiantes) los [ejemplos de planes individuales](https://www.cmat.edu.uy/licenciatura/documentos/trayectorias), pero el [ejemplo de perfil Matemática con ocho semestres](https://www.cmat.edu.uy/licenciatura/documentos/trayectorias/ejemplo_perfil_mat.pdf) está rotulado expresamente para ingreso **2017** y oferta **2017–2020**. Se normalizaron sus 29 ubicaciones históricas como antecedente, no como oferta vigente ni recorrido único. La [oferta estable 2025–2029](https://www.cmat.edu.uy/licenciatura/cursos_matematica.pdf) contiene 26 filas con código, carga, paridad Impar/Par y frecuencia de dictado, pero **no** la posición ordinal de un curso en los semestres 1–8. La [orientación para ingresantes](https://www.cmat.edu.uy/noticias/novedades/generacion_ingreso) conserva tres cursos nominales y un ejemplo opcional para el primer semestre **2024**. Ninguna de estas fuentes acredita por sí sola una nueva trayectoria curso→período. No se halló declaración institucional positiva de ausencia.

La oferta estable ayuda a detectar cambios de versión: por ejemplo, publica Cálculo 1 `MA427` con 16 créditos y Cálculo Diferencial e Integral 1 `MA428` con 15. El ejemplo histórico no publica códigos. Por eso no se identifican ambas por similitud, no se transfieren cargas del ejemplo antiguo al catálogo actual y no se promueve ninguna de las 366 candidatas técnicas. Permanecen el único Plan 2014, sus seis opciones del mismo progreso, 360 créditos, los mínimos y la validación del plan individual. El recorrido visible continúa rotulado como **orientativo generado por Trayecto**; ni la paridad ni las previaturas se convierten en semestres oficiales.

No se agrega a `docs/carreras-a-actualizar.md`: no hay publicación anunciada en desarrollo, malla futura prometida ni una sede/recorrido territorial parcial; el caso permanece en la cola de investigación del inventario. Condición concreta de revisión: localizar o solicitar a la Comisión de Carrera, Centro de Matemática o FCIEN una guía para una generación actual del Plan 2014 con filas nominales curso→semestre, o confirmación expresa de la vigencia sólo como ejemplo histórico opcional del material 2017–2020; antes de proyectarla cotejar códigos, cargas, alternativas y alcance. Una declaración institucional explícita de que no se publica guía común permitiría cerrar el estado como ausencia documentada.

## Evidencia, regeneración y control

- `data/fcien/matematica-2014-trajectory-review.json`: autoridad, URL, fecha, vigencia publicada, alcance, 29 renglones en ocho semestres históricos, 26 renglones actuales de paridad, tres recomendaciones de ingreso 2024 y huella SHA-256 de `JSON.stringify(sourcePortions)`. Se guardan los datos normalizados sin requerir PDF/HTML crudo; no se afirma inspección visual del PDF ni su hash binario.
- Regenerar auditoría, proyección e inventario **sin red**: `node scripts/build-fcien-matematica-2014.mjs`. El script comprueba huella, snapshot y proyección, escribe de modo atómico la auditoría y revisión, y reutiliza los generadores locales compartidos sin repetir extracción.
- Pruebas focales: `node --test --experimental-test-isolation=none tests/fcien-matematica-2014-trajectory.test.mjs tests/fcien-mathematics-2014-official-audit.test.mjs tests/official-trajectory-inventory.test.mjs`.
- Las dos regeneraciones consecutivas produjeron los mismos bytes en los siete artefactos rastreados de auditoría/proyección/índices: hash del manifiesto de hashes `sha256:b5725a294c61c1179f7247648373ed7abfbd0048f3626ea7b78d6a62faae03f8`. Las notas previas de anomalías se preservan junto a las nuevas. Las pruebas focales pasaron **37/37**.
- `npm test`: **compilación y 1113/1113 pruebas pasan** en el segundo intento autorizado. El intento dentro del sandbox falló al crear subprocesos Vite (`spawn EPERM`). El primer intento autorizado avanzó hasta la escritura de un chunk y falló por espacio insuficiente en C: (~1,3 GB libres al revisar); el siguiente intento finalizó sin limpieza ni cambios en otros worktrees. Sólo se observaron avisos no fatales de glob experimental, tamaño de chunks y clasificación estática de rutas.
- `npm run lint`: **pasa**. `git diff --check`: **pasa**. No se validó visualmente la aplicación, porque no cambia UI ni interacción.
