# D03bb — Licenciatura en Geografía 2018

## Estado y objetivo

Auditar de forma aislada `bedelias-fcien-licenciatura-en-geografia-2018` desde `main` `2a8ba34`. El Plan, la sede y los requisitos ya fueron contrastados, pero el inventario de trayectorias sigue `research-pending`. Determinar si Facultad de Ciencias, su Departamento de Geografía o la Comisión de Carrera publican una malla o guía vigente con materias y períodos. Reproducir únicamente el alcance respaldado; no convertir los bloques por área de Bedelías en semestres ni deducir una ausencia institucional a partir de enlaces fallidos.

## Contexto y fuentes iniciales

- Revisar la auditoría en `data/bedelias/audits/official-source-audits.json`, el snapshot de Geografía bajo `data/bedelias/`, la proyección en `app/data/bedelias-generated/`, el inventario `data/official-trajectories/inventory.json` y la sección pertinente de `docs/tasks/importacion-masiva-carreras.md`.
- Plan en Colibrí: `https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/24562/1/PLGEOF_2020.pdf` y ficha `https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/24562`.
- Carrera FCIEN: `https://www.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-geografia`; catálogo Udelar: `https://udelar.edu.uy/carrera/licenciatura-en-geografia`.
- Buscar además publicaciones oficiales del Departamento y Comisión, guías de ingreso, CSE, repositorios institucionales e IMPO. Comparar versión, vigencia y alcance, y distinguir programas u oferta temporal de una trayectoria adoptada. EVA y Bedelías no son fuente única de verdad curricular.

## Reglas de implementación

1. Conservar una carrera, título y progreso, Plan 2018, Montevideo, cuatro años y 360 créditos. Mantener cinco mínimos del núcleo común (60/45/45/40/30), 90 optativos, 10 de extensión y 40 de tesina; la Comisión valida su propuesta y requisitos previos. Los énfasis personales no son menciones certificadas.
2. Sólo publicar materias con inclusión curricular oficial exacta. La composición técnica mantiene candidatas recuperables; no fusionar ni promover por semejanza. Una guía oficial debe conservar al menos una identidad visible por materia enumerada y distinguir optativas y espacios flexibles sin inventar créditos. Si no se demuestra secuencia oficial, conservar el recorrido orientativo generado, rotulado como provisional y con materias reales, sin atribuirlo a FCIEN.
3. Versionar evidencia normalizada en `data/` con autoridad, URL, fecha de consulta, vigencia, alcance, filas o identidades cotejadas y huella reproducible. Proveer regeneración offline desde snapshots existentes, sin repetir scraping masivo. Registrar una condición concreta de revisión y actualizar `docs/carreras-a-actualizar.md` sólo si hay publicación futura o territorial parcial.
4. Preservar IDs, cargas, reglas, persistencia personal y demás carreras. Actualizar auditoría, inventario, prueba focal y únicamente los artefactos derivados necesarios.

## Entrega

Documentar hallazgo y límites en esta especificación. Ejecutar dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint` y `git diff --check`; crear un commit enfocado en este worktree. No integrar, pushear ni publicar desde el nodo.

## Resultado de la investigación — 20/10/2026

**`research-pending`**, sin afirmar que la institución no tenga malla. El [Plan aprobado 2018 en Colibrí](https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/24562/1/PLGEOF_2020.pdf) fue cotejado completo (cuatro páginas) con su [registro institucional](https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/24562) y la [publicación en IMPO](https://www.impo.com.uy/diariooficial/2018/01/05/avisos.pdf). Establece 360 créditos y cuatro años, 220 de núcleo común (60/45/45/40/30), 90 optativos, 10 de extensión y 40 de tesina; la prosa menciona 10–15 para actividades. El énfasis es personal, no una mención certificada. Los cinco mínimos deben preceder la tesina y su propuesta requiere tutor y aval de la Comisión. No ubica cursos por semestre.

La [ficha vigente de FCIEN](https://www.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-geografia), actualizada en febrero de 2024, confirma el carácter flexible, 220 créditos iniciales, cuatro años y Montevideo; no enlaza grilla. La [página del Departamento](https://www.fcien.edu.uy/institucional/estructura-academica/unidades/departamento-de-geografia) describe su organización, líneas y autoridades, sin secuencia. El [catálogo Udelar](https://udelar.edu.uy/carrera/licenciatura-en-geografia) sólo confirma 48 meses, 360 créditos y servicio. La Comisión tiene [programas de curso individuales del Plan 2018](https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/36837), incluso GF075; estos pueden respaldar inclusiones puntuales en una auditoría de catálogo, pero no ordenan la carrera. La ficha de GF087 menciona sexto semestre de esa UC, tampoco constituye una guía completa adoptada. La [tabla de materias por semestres del Plan 2003](https://www.fcien.edu.uy/media/pdf/planes-estudio/geo.pdf) y anuarios previos no se reutilizan en 2018.

Se buscó en publicaciones de FCIEN, Departamento, Colibrí, CSE, Udelar e IMPO. No apareció una guía vigente nominal curso→período para el Plan 2018 ni una declaración positiva de que no se publica. La búsqueda fallida no se transforma en `no-official-trajectory-documented`. Los bloques por área de Bedelías no son semestres. El recorrido visible sigue siendo **generado por Trayecto y provisional**, con 167 apariciones técnicas candidatas recuperables, sin acreditarlas como oferta vigente ni cambiar los 155 registros del snapshot, IDs, cargas, reglas o progreso. La única identidad `verified` es la validación académica manual ya existente. El catálogo normal continúa parcial; la validación de programas puntuales y un catálogo oficial completo son otra auditoría, no una promoción por parecido en esta tarea.

No se agrega a `docs/carreras-a-actualizar.md`: no se halló anuncio expreso de malla futura, despliegue progresivo o sede parcial. El caso sigue en la cola `research-pending` del inventario, distinto de aquel archivo.

## Evidencia, reanudación y límites

- Evidencia normalizada: `data/fcien/geografia-2018-trajectory-review.json`. Registra URL, autoridad, consulta, vigencia, alcance, mínimos, ejemplos de identidad oficial, filas reconciliadas (cero), contraste histórico, huella SHA-256 de `JSON.stringify(sourcePortions)` UTF-8 y baseline de snapshot/proyección. No requiere conservar PDFs o HTML crudos.
- Regeneración offline, sin repetir scraping: `node scripts/build-fcien-geografia-2018.mjs`. Regenera auditoría, proyección e inventario desde esa evidencia y los snapshots versionados; valida que los 167 candidatos, la validación manual, créditos, IDs y reglas permanezcan intactos.
- Prueba focal: `node --test --experimental-test-isolation=none tests/fcien-geografia-2018-trajectory.test.mjs tests/official-trajectory-inventory.test.mjs`.
- Condición de nueva revisión: publicación o confirmación expresa de Comisión de Carrera, Departamento o FCIEN con filas nominales curso-período y vigencia del Plan 2018, o una declaración explícita de que no existe guía común publicada. Antes de sustituir el recorrido, cotejar códigos, versiones, cargas y alcance; no extrapolar desde horarios, áreas, un programa individual o el Plan 2003.

## Validación y entrega

- Dos ejecuciones consecutivas del generador y el estado previo fueron idénticos byte a byte para los siete artefactos que cambian o reciben metadatos derivados; hash agregado SHA-256 `42d67009c68d4435eabde32509312d1209c473dd2d09388b7537f73a2eb2cdbc`.
- Pruebas focales: **33/33** pasan con el comando indicado arriba.
- `npm test`: compilación y **1108/1108** pruebas pasan. El primer intento dentro del sandbox falló por `spawn EPERM` al lanzar subprocesos de Vite; el reintento autorizado del mismo comando pasó. Sólo quedaron avisos de clasificación estática y tamaño de chunks, sin fallos de producto.
- `npm run lint`: pasa.
- `git diff --check`: pasa.
- La presentación funcional pura sigue mostrando `Recorrido orientativo generado`, con candidatas provisionales que no acreditan mínimos. No hubo validación visual en navegador ni cambios de interacción o estilo.
- El resultado es un checkpoint académico recuperable, **no** una trayectoria oficialmente cerrada. No integrar ni publicar desde este worktree.
