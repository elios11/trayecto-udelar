# D03bc — Licenciatura en Geología 2018

## Estado y objetivo

Auditar de forma aislada `bedelias-fcien-licenciatura-en-geologia-2018` desde `main` `1eec97e`. El plan, los requisitos y la sede están cotejados, pero el inventario de trayectoria sigue `research-pending`. Determinar si la Comisión, FCIEN o el Instituto de Ciencias Geológicas publica recorridos sugeridos vigentes con materias y períodos. Reproducir únicamente el alcance verificable: los tramos y áreas del Plan no son semestres ordinales, y una guía de oferta tampoco es una malla adoptada.

## Contexto y fuentes iniciales

- Inspeccionar la auditoría existente en `data/bedelias/audits/official-source-audits.json`, el snapshot bajo `data/bedelias/`, la proyección en `app/data/bedelias-generated/`, el inventario de trayectorias y la sección de Geología en `docs/tasks/importacion-masiva-carreras.md`.
- Plan FCIEN/Diario Oficial: `https://www.fcien.edu.uy/images/pdf/planes-estudio/Plan2018_Geologia.pdf`. Copia Colibrí: `https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/24563`.
- Ficha FCIEN: `https://fc-si-portal.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-geologia/2336-licenciatura-en-geologia-2`; catálogo Udelar: `https://udelar.edu.uy/carrera/licenciatura-en-geologia`.
- La auditoría previa enlaza una Guía del Estudiante en EVA: contrastar su autoridad, versión y alcance con FCIEN, Comisión, Instituto, Colibrí e IMPO. EVA no basta como única fuente de verdad curricular. Buscar copias oficiales alternativas si falla una URL.

## Reglas de implementación

1. Mantener una carrera, un título, progreso y sede Montevideo, Plan 2018, cuatro años y 360 créditos. Preservar el tramo común 210 (90 científico-básica, 100 geología fundamental, 20 profundización), orientación 140 con trabajo final de 35 y 10 transversales sin doble conteo. Los umbrales de acceso y aprobación por la Comisión siguen como validación humana.
2. No convertir trayectorias personales o ejemplos sugeridos en menciones certificadas. Sólo promover identidades con inclusión oficial exacta, conservando variantes de códigos, cargas y candidatas recuperables; no inferir equivalencias por nombre. Si no se demuestra una secuencia vigente curso→período, conservar el recorrido orientativo generado claramente provisional con materias reales y sin atribuirlo a FCIEN.
3. Versionar evidencia normalizada bajo `data/` con autoridad, URL, fecha de consulta, vigencia, alcance, filas/identidades cotejadas y huella reproducible. Proveer regeneración offline desde los snapshots existentes sin repetir scraping masivo. Documentar límite y condición concreta de nueva revisión; agregar `docs/carreras-a-actualizar.md` sólo si la publicación oficial es futura o parcial.
4. Preservar IDs, créditos, previaturas, persistencia personal y otras carreras. Actualizar auditoría, inventario y pruebas focales; modificar únicamente derivados necesarios.

## Entrega

Registrar hallazgo y límites en esta especificación. Ejecutar dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint` y `git diff --check`; crear un commit enfocado en el worktree. No integrar, pushear ni publicar desde el nodo.

## Resultado de la auditoría (20/10/2026)

- La [presentación CIDU Geología 2025](https://eva.fcien.udelar.edu.uy/pluginfile.php/189471/mod_resource/content/2/CIDU%20Licenciatura%20en%20Geolog%C3%ADa%202025.pdf), página 24, recomienda siete filas para el primer semestre del Plan 2018: Geología General I, Física I, Laboratorio de Física I, Matemática I, Química General, Alfabetización en Información I y una EFI no especificada. No incluye los semestres 2–8. Se reproduce únicamente ese primer período como **guía parcial de ingreso 2025**, no como obligación ni malla completa. Los mínimos oficiales y el único título permanecen intactos.
- Cinco identidades coinciden inequívocamente con códigos de los [horarios FCIEN del semestre impar 2025](https://www.fcien.edu.uy/images/2025/Marzo/2025-03-05_HORARIOS_2025_IMPAR.pdf) y el snapshot versionado: `GL002`, `FI252`, `MA400`, `BG1` y `B01`. Las otras 215 identidades técnicas siguen candidatas. Los exámenes publicados y la grilla de horarios constatan dictado y códigos, pero **no** determinan semestres ordinales posteriores.
- Laboratorio de Física I aparece con **3 cr.** en CIDU 2025. Bedelías conserva `BG833` de 3 cr. hasta 2024 y `B0025` de 4 cr. desde 2025; no hay equivalencia inequívoca. Se usa una identidad sólo-fuente de 3 cr. sin código técnico. EFI no tiene código, programa ni carga en CIDU: se conserva como cupo sólo-fuente de carga no publicada. `B01` sólo representa la versión 2025 y no se fusiona con `B09` de 2026 sin documentación oficial.
- La [Guía del Estudiante aprobada por Comisión en 2019](https://eva.fcien.udelar.edu.uy/pluginfile.php/1953/mod_resource/content/1/Gu%C3%ADa%20del%20Estudiante.pdf), páginas 1 y 4–6, ofrece ejemplos por tramo/área, no una grilla de ocho semestres. El [Plan publicado por FCIEN](https://www.fcien.edu.uy/images/pdf/planes-estudio/Plan2018_Geologia.pdf), [Colibrí](https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/24563?mode=full) y [Diario Oficial](https://www.impo.com.uy/diariooficial/2018/01/05/avisos.pdf) corroboran Plan 2018, flexibilidad, duración y mínimos. La ficha FCIEN vigente tampoco ubica cursos por semestre. La grilla del Plan histórico 2008 no corresponde a este plan.
- La publicación es **parcial** y queda registrada en `docs/carreras-a-actualizar.md`. Revisar al aparecer una guía posterior del CIDU/Comisión/Instituto con semestres 2–8, una actualización de ingreso que aclare códigos actuales o una resolución de los 3/4 cr. de Laboratorio de Física I. No afirmar que no exista una malla más extensa sólo porque no se encontró.

## Evidencia y reproducción sin red

- Porciones normalizadas, autoridades, URLs, fecha de consulta, vigencia, siete filas, correspondencias y huella SHA-256: `data/fcien/geologia-2018-trajectory-review.json`. La huella se calcula sobre `JSON.stringify(sourcePortions)` UTF-8. Los PDFs crudos no son necesarios para regenerar; una consulta nueva se reserva para detectar cambios institucionales.
- Desde este worktree, `node scripts/build-fcien-geologia-2018.mjs` reconstituye auditoría, revisión, proyección, colas e inventario desde datos versionados. El generador valida IDs, cargas, reglas, conteos y la frontera entre verificados y candidatos. Ejecutarlo dos veces debe producir el mismo árbol.
- Prueba focal: `node tests/fcien-geology-2018-official-audit.test.mjs`. Validación global: `npm test`, `npm run lint`, `git diff --check`. El runner directo evita un fallo de `spawn EPERM` de `node --test` dentro del sandbox; la suite completa debe ejecutarse con el permiso de proceso que requiera el entorno.
- No se hizo validación visual del navegador. Si una publicación 2026 o posterior cambia el primer semestre, reauditar antes de mover identidades o cargas del progreso existente.

## Validación y reanudación

- Doble ejecución de `node scripts/build-fcien-geologia-2018.mjs`: mismo diff del árbol (`d229b04113149e401d61ba920a441fecd06b64d5`, antes de actualizar únicamente las expectativas globales de pruebas). La huella de porciones de fuente es `sha256:91278ffd071602955a2d09ecbddfcac68406ece81d479345bd954b2d715c5022`.
- `node tests/fcien-geology-2018-official-audit.test.mjs`: 4/4. `npm test`: 1109/1109. `npm run lint`: sin errores. `git diff --check`: sin errores.
- La primera ejecución de `npm test` dentro del sandbox no pudo crear procesos secundarios (`spawn EPERM`); con permiso de proceso completó. Una ejecución simultánea con lint tuvo un fallo transitorio de escritura en `dist`; la repetición aislada de `npm test` pasó íntegra.
- Para reanudar: leer esta especificación y el JSON de evidencia, consultar fuentes sólo para detectar revisiones oficiales nuevas, correr el generador offline y las pruebas. No repetir la extracción masiva ni promover variantes técnicas por parecido de nombre.
