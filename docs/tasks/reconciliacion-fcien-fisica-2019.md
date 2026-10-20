# D03az — Licenciatura en Física

## Estado y objetivo

Auditoría aislada del plan `bedelias-fcien-licenciatura-en-fisica-2019` sobre `main` `e25a390`. El inventario D03 está `research-pending`: los mínimos ya se cotejaron, pero falta establecer si FCIEN/Udelar publica una trayectoria sugerida vigente de materias y períodos. Reproducir sólo una secuencia respaldada; una ausencia documentada requiere afirmación oficial positiva, no silencio o enlace roto.

## Fuentes iniciales

- Plan Colibrí: `https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/25632/1/PLFIS_2020.pdf`.
- Reglamento DG Jurídica: `https://dgjuridica.udelar.edu.uy/496-reglamento-del-plan-de-estudios-licenciatura-en-fisica-2017/`.
- Carrera FCIEN: `https://www.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-ciencias-fisicas`.
- Carrera Udelar: `https://udelar.edu.uy/carrera/licenciatura-en-fisica`.
- Auditoría existente en `data/bedelias/audits/official-source-audits.json` y proyección en `app/data/bedelias-generated/`.

Buscar además publicaciones del Instituto de Física, Comisión de Carrera, CSE y copias de la misma autoridad en Colibrí/IMPO. Comparar Plan aprobado 2017 con implementación técnica 2019. EVA y Bedelías no bastan como verdad de trayectoria.

## Reglas

1. Conservar un título, progreso y sede Montevideo; 360 créditos, mínimos de cinco áreas por 268 y 92 flexibles, diez integrales y ocho de iniciación a investigación sujetos a validación. No convertir ejemplos de perfil en menciones certificadas.
2. No promover por similitud los 266 registros y 290 apariciones de Bedelías. Si la secuencia oficial no aparece, conservar recorrido orientativo claramente provisional, con materias reales y sin créditos o períodos inventados.
3. Versionar evidencia normalizada en `data/` (autoridad, URL, fecha, vigencia, alcance, filas/identidades cotejadas, huella, regeneración offline). Registrar publicaciones parciales o futuras en `docs/carreras-a-actualizar.md` cuando corresponda.
4. Actualizar revisión/inventario y pruebas focales. Preservar IDs, cargas y datos personales; documentar límites y condición de nueva revisión.

## Entrega

Dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint` y `git diff --check`; commit enfocado sólo en este worktree. No integrar, pushear ni publicar desde el nodo.

## Checkpoint de continuidad — 19/10/2026

- El agente asignado se interrumpió por el límite de uso antes de modificar archivos. El worktree quedó limpio en `16011f4`; `main` permanece en `e25a390` y este nodo no está integrado.
- Búsqueda inicial en fuentes institucionales: el registro [Colibrí Plan 2019](https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/25632?mode=full) confirma identidad 2019, código de carrera 301 y código de plan 1385, pero no muestra una secuencia en sus metadatos. El visor web no pudo abrir el PDF por respuesta 403; el contenido del PDF sigue por cotejar mediante una vía oficial alternativa.
- El [Anuario FCIEN 2010](https://biblioteca.fcien.edu.uy/wp-content/uploads/2023/08/facultad-de-ciencias-anuario-2010.pdf) publica semestres de la antigua Licenciatura en Ciencias Físicas. Es antecedente histórico, **no** evidencia de adopción de esa grilla por el Plan 2019. No usar sus filas para esta proyección.
- Próximo paso: inspeccionar el Plan/Reglamento 2019 y la página vigente de FCIEN, buscar publicaciones de la Comisión de Carrera o del Instituto de Física con versión y alcance explícitos. Si hay fuente curso-período vigente, normalizar y cotejar; si no, mantener `research-pending` hasta evidencia suficiente. No repetir una extracción masiva de Bedelías.

## Resultado de la investigación — 20/10/2026

**`research-pending`**: no se demuestra una grilla vigente curso→semestre ordinal ni una ausencia positivamente declarada. La flexibilidad del currículo no demuestra por sí sola la ausencia de recomendaciones. Se conserva el único Plan 2019, un título/progreso, Montevideo, cuatro años, 360 créditos y mínimos de 110/70/60/10/18 (268), con 92 flexibles y validación académica de los 10 integrales y 8 de investigación.

La ruta HTTP de [Instituto → Grado → Física Plan 2017](http://info.fisica.edu.uy/fisica-plan-2017/) sí es recuperable aunque el visor web y HTTPS fallan. Publica:

- [Plan](http://info.fisica.edu.uy/wp-content/uploads/2019/02/Plan-de-Estudios-Lic.-Física-1.pdf), cinco páginas cotejadas: áreas y currículo individual, tutor desde 180 créditos y aprobación por Comisión, sin grilla nominal.
- [Reglamento 496 republicado en mayo 2026](http://info.fisica.edu.uy/wp-content/uploads/2026/05/Reglamento-496.pdf), dos páginas: es idéntico byte a byte a la [copia DG Jurídica 2021](https://dgjuridica.udelar.edu.uy/wp-content/uploads/2021/07/Reglamento-496.pdf). Los artículos 10–13 regulan el currículo personal, los 92 flexibles, formación integral e investigación. Los artículos 14–17 conservan la validación de planes anteriores; no crean equivalencias automáticas.
- [Cursos regulares](http://info.fisica.edu.uy/wp-content/uploads/2019/02/Listado-de-cursos-regulares.pdf): 28 filas, 13 de Física, seis de Matemática y nueve de Herramientas. La columna `SEMESTRE` sólo dice **Impar/Par** y `FRECUENCIA` dice **Anual**: son datos de dictado, no posiciones 1–8, duración curricular ni garantía de oferta futura. No hay códigos ni créditos individuales. No se promueve ninguna identidad técnica por ese listado.
- [Requisitos](http://info.fisica.edu.uy/wp-content/uploads/2019/02/Requisitos-de-unidades-curriculares.pdf): 28 etiquetas con mínimos de créditos para cursar. No se deducen períodos ni se reemplazan las previaturas existentes. `CTE I/II` se transcribe literalmente en el listado y no se mapea a códigos por expansión intuitiva de la sigla.
- Un enlace de la Comisión a EVA 448 y otro a programas. No se usa EVA como única verdad curricular; el visor no recuperó la página y ese error no prueba ausencia.

El [Diario Oficial de 03/08/2018](https://www.impo.com.uy/diariooficial/2018/08/03/avisos.pdf), páginas PDF 71–72, impresas 84–85, permite suplir el 403 de Colibrí y precisa la cronología: Claustro FCIEN 6 de 01/12/2017, Consejo 130 de 18/12/2017 y **CDC 21 de 26/06/2018**, Dist. 432/18. El Plan se denomina 2017, Colibrí lo registra como implementación 2019 y el Reglamento es 2021, republicado 2026; no se crean planes adicionales. Las copias comparten título, duración, mínimos, currículo y tutoría; diferencias editoriales no constituyen una grilla.

Se contrastaron también las fichas actuales FCIEN/Udelar y búsquedas delimitadas en CSE, Colibrí, Instituto e IMPO. Los resultados de Física Médica, Astronomía, Ciencias de la Atmósfera, programas aislados y el Anuario 2010 no acreditan una trayectoria actual de Física 2019. No se repitió la extracción Bedelías.

No se agrega la carrera a `docs/carreras-a-actualizar.md`: no se halló un anuncio expreso de malla futura, implementación progresiva ni alcance territorial parcial; el caso sigue en la cola de investigación del inventario, no en el registro de publicaciones anunciadas.

## Evidencia y reconstrucción sin red

- Fuente normalizada versionada: `data/fcien/fisica-2019-trajectory-review.json`. Incluye autoridades, URLs, consulta/vigencia, 28 filas regulares literales, 28 etiquetas de requisitos agrupadas por mínimos, límites de uso, cronología, huellas SHA-256 de PDFs y de `JSON.stringify(sourcePortions)` UTF-8. La transcripción visual corrige la lectura lineal del PDF: `Física` es la celda de área, no parte del nombre `Ondas`.
- Temporales no versionados: `tmp/d03az/` (PDFs, HTML y renders). El generador no los lee ni requiere red, acceso a EVA, nuevas extracciones o turnos del agente.
- Regenerar auditoría, proyección e inventario: `node scripts/build-fcien-fisica-2019.mjs`. Usa los datos normalizados y el snapshot guardado, verifica huellas y preserva los finales de línea locales y los 291 registros proyectados: 290 apariciones candidatas y una validación manual. No cambia IDs, nombres, créditos, asignaciones, estados de autoridad ni reglas personales/previas.
- Validación focal: `node --test tests/fcien-fisica-2019-trajectory.test.mjs tests/fcien-physics-2019-official-audit.test.mjs tests/official-trajectory-inventory.test.mjs`.
- La presentación funcional pura debe seguir como `Recorrido orientativo generado`, con materias reales provisionales y sin semestres ni créditos acreditados por inferencia. Los mínimos normativos permanecen separados del catálogo parcial.

Condición concreta de revisión: una guía adoptada por Comisión/Instituto/FCIEN que publique las filas curso-período y su vigencia para la implementación 2019, o una declaración expresa de que no se publica trayectoria común. Antes de reemplazar el recorrido se cotejarán versión, carga e identidad, sin extrapolar desde paridad, previaturas ni plan anterior.

## Validación y entrega

- Dos ejecuciones consecutivas del generador: **idénticas byte a byte en 177 archivos** de auditoría/proyección/índices; hash del manifiesto de comparación `sha256:7e81f64c2020d64fa8dff734dca8ee4c63f4b8e4382d29006b5f5d416c6afd4c`. El comprobador temporal está en `tmp/d03az/check-determinism.mjs`; para regenerar basta el comando versionado indicado arriba.
- Pruebas focales: **36/36 pasan**, ejecutadas con `node --test --experimental-test-isolation=none tests/fcien-fisica-2019-trajectory.test.mjs tests/fcien-physics-2019-official-audit.test.mjs tests/official-trajectory-inventory.test.mjs`. La variante sin aislamiento evitó `spawn EPERM` del sandbox; las pruebas y aserciones son las mismas.
- `npm test`: **compilación y 1100/1100 pruebas pasan**. El primer intento dentro del sandbox falló al crear subprocesos Vite (`spawn EPERM`); el reintento autorizado del mismo comando terminó correctamente. Sólo avisos de herramientas sobre glob experimental, tamaños de chunks y clasificación estática de rutas; sin fallos de producto.
- `npm run lint`: **pasa**, sin errores.
- `git diff --check`: **pasa**. Sólo cambia la proyección de Física y los hashes/metadatos derivados comunes; se conservan intactos los demás planes y la configuración de publicación.
- Validación funcional pura de la presentación: recorrido generado con materias reales provisionales y sin acreditación normativa de candidatas. No se realizó validación visual en navegador ni se modificó diseño/interacción.
- Sin cambios en `PROJECT_CONTEXT.md`: no hay cambio transversal, curricular ni de arquitectura; el inventario mantiene los mismos conteos de estados y detalla mejor esta investigación.

El resultado está listo para revisión e integración autorizada, pero **no cierra la investigación de trayectoria**: sigue pendiente la condición institucional indicada arriba. No se integra, hace push ni publica desde este nodo.
