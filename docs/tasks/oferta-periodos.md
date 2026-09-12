# P04 — Oferta y período de dictado trazables

## Estado

Implementada y validada en el worktree de P04; lista para revisión e integración serial sobre el `main` más reciente. El nodo conserva una muestra manual pequeña y no convierte la composición de Bedelías o una trayectoria sugerida en evidencia de dictado.

## Objetivo

Ayudar a distinguir si una unidad curricular está confirmada para un período concreto, si existe evidencia suficiente de que suele dictarse en un período comparable o si no hay información publicada. Toda afirmación debe mostrar procedencia, vigencia y alcance sin bloquear la planificación personal.

## Principios de producto

- Composición del plan, semestre sugerido y oferta efectiva son conceptos distintos.
- `Confirmada` exige una fuente oficial o institucional que nombre la unidad y un período académico concreto.
- `Habitual` exige una declaración institucional explícita de periodicidad o al menos dos ofertas oficiales independientes en períodos comparables. Una sola aparición, el orden de la malla o el nombre de la materia no alcanzan.
- `Sin información publicada` es el estado seguro cuando no se satisface lo anterior. No significa que la materia no se dicte.
- `No se dicta` sólo puede mostrarse para un período si una fuente oficial lo declara expresamente; la ausencia de una grilla nunca equivale a cancelación.
- Horario, cupo, modalidad, sede y fechas se muestran únicamente cuando la fuente los publica de forma inequívoca. Pueden cambiar y nunca se usan para calcular créditos o habilitación.
- Toda advertencia es informativa y no impide agregar, mover o conservar una materia en el planificador.

## Muestra oficial inicial

Validar el esquema con al menos tres servicios y formatos diferentes, usando exclusivamente páginas o documentos institucionales vigentes y guardando evidencia mínima reproducible:

1. FADU: página `Horarios y modalidad ARQ`, que separa obligatorias, talleres y optativas del primer y segundo semestre de 2026 y advierte que puede haber cambios: <https://www.fadu.edu.uy/bedelia/horarios-arq/>.
2. Facultad de Química: página `Horarios semestre IMPAR 2026`, que declara actualizaciones y que lo ausente aún puede no estar confirmado: <https://www.fq.edu.uy/?q=es/node/2023>.
3. FCEA: página de resoluciones con oferta académica del segundo semestre de 2026 o una resolución individual que identifique unidades y período: <https://fcea.udelar.edu.uy/bedelia-carreras-grado/resoluciones-de-interes.html>.

Se puede sustituir una fuente si no permite mapear de forma inequívoca al catálogo actual. Documentar la sustitución y usar otro servicio oficial —por ejemplo ISEF, Artes o FIC— para conservar diversidad. No incorporar una materia por mera coincidencia de nombre: resolverla por servicio, plan/carrera cuando corresponda y `courseId` o código institucional; dejar ambigua la que no pueda enlazarse con seguridad.

## Contrato común

Crear un módulo puro y tipado, separado de los datos curriculares y de los datos personales. El nombre sugerido es `app/course-offerings.mjs` con declaraciones `.d.ts` y un dataset pequeño bajo `app/data/`.

Cada evidencia normalizada debe incluir como mínimo:

- `id`: ID estable y único del registro;
- `courseId`: ID canónico de la unidad en Trayecto;
- `serviceId`: servicio/facultad que publica la oferta;
- `planIds`: cero o más planes a los que la fuente restringe explícitamente el registro; vacío significa que la fuente no lo limita, no que aplique universalmente;
- `campusIds`: cero o más sedes publicadas; vacío significa desconocido;
- `academicPeriod`: `{ year, part, startsOn?, endsOn? }`, con `part` normalizado como `first-semester | second-semester | annual | first-half-semester | second-half-semester | other`;
- `declaration`: `offered | not-offered | habitual`;
- `modality`: `in-person | remote | hybrid | unknown`;
- `source`: `{ url, title, publisher, publishedAt?, lastVerifiedAt, retrievedAt? }`;
- `validThrough`: fecha hasta la cual puede presentarse como información vigente;
- `note`: texto breve opcional que preserve una cautela publicada, sin copiar párrafos extensos.

El implementador puede refinar nombres, pero debe mantener estas invariantes:

1. URL HTTPS institucional, fechas ISO válidas y período coherente;
2. el ID de materia debe existir en el catálogo cargado o quedar en una cola explícita de mapeo, nunca enlazarse por aproximación en runtime;
3. `not-offered` requiere declaración expresa y período exacto;
4. `habitual` requiere evidencia explícita o dos registros `offered` comparables y no puede fabricarse dentro del mismo registro;
5. `validThrough` no puede preceder el período o la verificación relevante;
6. registros contradictorios se conservan y resuelven como `needs-review`, no se pisan por orden de archivo;
7. serialización/normalización determinista y sin dependencias de red en runtime.

## Resolución y caducidad

Implementar una API pura que, dados `courseId`, plan, sede, período objetivo y una fecha `now` inyectada, devuelva:

- `confirmed`: existe `offered` aplicable, no vencido y sin contradicción;
- `not-offered`: existe una negativa explícita aplicable, no vencida y sin contradicción;
- `habitual`: existe declaración habitual válida o el umbral reproducible de dos períodos comparables;
- `unknown`: no existe evidencia suficiente o la única confirmación venció;
- `needs-review`: las fuentes aplicables se contradicen o el mapeo/alcance no es resoluble.

Política inicial:

- una oferta confirmada vale sólo para el período que nombra;
- una fecha `validThrough` pasada conserva la evidencia histórica, pero ya no permite decir `confirmada` para una decisión futura;
- dos ofertas del mismo semestre/paridad en años distintos permiten `habitual` únicamente para esa parte del año, sin prometer la próxima edición;
- si la fuente publica que la grilla está sujeta a cambios, la UI conserva la cautela y muestra la fecha de última verificación;
- datos sin período objetivo pueden mostrarse en el detalle como antecedentes, pero no generan una afirmación sobre el semestre personal.

## Integración con la aplicación

- No cambiar `trayecto-personal-data` v4: la oferta es información institucional del repositorio, no un dato personal.
- Incorporar el resolver al planificador sin duplicar la lógica dentro de `app/page.tsx`.
- Cuando un semestre personal tenga rango de fechas suficiente para identificar un período, mostrar por materia un indicador compacto con los cinco resultados anteriores.
- Si el semestre no tiene fechas o el período no puede resolverse, mostrar `Período personal sin definir` o `Sin información publicada`, nunca escoger el semestre por la posición del bloque.
- En el detalle de materia, agregar una sección plegable `Oferta y dictado` con período, sede/modalidad si están publicadas, última verificación, cautela y enlace directo a la fuente.
- En el planificador, una confirmación o ausencia explícita puede originar una advertencia P01 no bloqueante. `unknown` y `needs-review` deben usar lenguaje prudente.
- Evitar llenar las tarjetas curriculares de badges: la información detallada vive en el panel y el planificador; un indicador compacto sólo aparece cuando aporta a un período definido.
- Todo control y enlace debe funcionar con teclado/tacto y respetar temas, modo daltónico y movimiento reducido.

## Prototipo y artefactos

- Incluir únicamente una muestra pequeña y auditada: al menos dos materias mapeadas por servicio, idealmente 6–12 registros totales.
- Guardar un manifiesto o notas de auditoría con URL, fecha de consulta, método de mapeo y campos omitidos por ambigüedad.
- Agregar un script determinista de validación/generación sólo si reduce errores; no debe navegar ni descargar durante `npm test`, build o runtime.
- No ejecutar el importador global de Bedelías ni un crawler de todos los servicios.

## Pruebas obligatorias

- Validación acumulativa de IDs, URL, fechas, período, modalidad, declaración, alcance y `validThrough`.
- Resolución `confirmed`, `not-offered`, `habitual`, `unknown` y `needs-review` con fecha inyectada.
- Confirmación vencida queda histórica y no confirma un período futuro.
- Una sola oferta no produce `habitual`; dos comparables sí; semestres distintos no se mezclan.
- Ausencia en una fuente o dataset vacío nunca produce `not-offered`.
- Restricciones por plan y sede no se expanden silenciosamente.
- Materias con nombres iguales en servicios distintos se mantienen separadas por ID y servicio.
- Dataset prototipo referencia materias reales del catálogo y cada registro conserva fuente institucional.
- Integración documental/funcional: panel plegable, enlace de fuente seguro, mensajes prudentes y advertencias no bloqueantes.
- Regresión: créditos, estados personales, previas, historial v4 y exportaciones no cambian por la oferta.

## Límites

- No agregar dependencias, servicios externos, autenticación, base de datos, telemetría ni cookies.
- No guardar horarios/cupos volátiles si el prototipo no puede mantenerlos con trazabilidad suficiente.
- No inferir oferta desde trayectoria sugerida, composición de Bedelías, historial personal, nombre, créditos o semestre recomendado.
- No implementar calendario, notificaciones, recomendador, predicción, scraping masivo o actualización automática.
- No modificar fuentes curriculares, créditos, áreas, previaturas o identidad visual.

## Verificación y cierre

- Ejecutar pruebas estrechas durante el desarrollo.
- Antes del commit ejecutar `npm test`, `npm run lint`, `npm run security:repo` y `git diff --check`.
- Hacer QA funcional del detalle y del planificador si las herramientas disponibles lo permiten; declarar con precisión lo no comprobado.
- Actualizar `PROJECT_CONTEXT.md` con el contrato, procedencia y caducidad confirmados.
- Registrar debajo el resultado real, las fuentes usadas/descartadas, comandos y riesgos.
- Crear un único commit enfocado en este worktree. No integrar, hacer push ni publicar desde el subagente.

P04 queda cerrado cuando existe un esquema común y probado, una política de caducidad, una muestra trazable de servicios distintos y una UI que diferencia claramente confirmación, hábito, desconocimiento, negativa expresa y conflicto sin bloquear el planificador.

## Continuidad y reanudación

Hito coherente: contrato, muestra, auditoría, UI, transporte de fechas v4, pruebas y documentación terminados. No se descargaron artefactos ni se creó evidencia temporal fuera del repositorio. El siguiente paso es revisar el commit de P04 e integrarlo de forma serial; para revalidarlo desde este worktree usar `node tests/personal-data-migration.test.mjs`, `node tests/personal-data-recovery.test.mjs`, `node tests/course-offerings.test.mjs`, `node tests/course-offerings-ui.test.mjs`, `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run security:repo` y `git diff --check`.

No iniciar P03 ni otro nodo hasta integrar o descartar explícitamente P04.

## Resultado implementado

- `app/course-offerings.mjs` concentra validación acumulativa, normalización y serialización deterministas, consulta de antecedentes y resolución pura con fecha y período inyectados. Distingue `confirmed`, `not-offered`, `habitual`, `unknown` y `needs-review`; una declaración anual cubre sus semestres, pero una grilla semestral no afirma el año completo.
- `app/data/course-offerings-prototype.json` conserva ocho registros manuales de tres servicios. `data/course-offerings/prototype-audit.json` documenta mapeos, campos omitidos y candidatos descartados.
- El detalle de materia incorpora `Oferta y dictado` con período, procedencia, última verificación, vigencia y enlace institucional. La ausencia se presenta como `Sin información publicada` y aclara que no equivale a no dictado.
- El planificador sólo resuelve indicadores cuando un rango personal permite identificar un período sin ambigüedad. Las fechas `startsAt`/`endsAt` que ya forman parte de v4 se transportan entre documento y estado, participan del fingerprint y sobreviven ediciones, persistencia, papelera y restauración. P04 no cambia v4 ni el planificador v1; los bloques sin fechas no se interpretan por posición y las advertencias no bloquean asignaciones.

## Fuentes usadas y descartadas

- FADU: se usó la página oficial de horarios y modalidades de LDCV para mapear de forma exacta `L112` y `L230` en el primer semestre de 2026: <https://www.fadu.edu.uy/bedelia/horarios-y-modalidades-de-cursos-ldcv/>. La fuente ARQ propuesta se descartó del runtime porque la proyección local de Arquitectura sólo tiene bloques curriculares y no permite enlazar materias individuales sin aproximación: <https://www.fadu.edu.uy/bedelia/horarios-arq/>.
- Facultad de Química: se usaron las negativas expresas de la página `Horarios semestre IMPAR 2026` para `734` y `417`: <https://www.fq.edu.uy/?q=es/node/2023>. Se descartó el PDF de horarios v13 porque la página oficial ya declara una revisión v16 posterior.
- FCEA: se usaron las resoluciones del Consejo 38/2025 y 63/2026, restringidas a Contador Público Plan 2024, para mapear `fcea-c20-2` y `fcea-mc10-2` en dos segundos semestres comparables: <https://www.fcea.udelar.edu.uy/images/micrositios/bedelia/resoluciones/2025/Contador_P%C3%BAblico_Plan_2024_RCF_n%C2%BA38_14072025.pdf> y <https://www.fcea.udelar.edu.uy/images/micrositios/bedelia/resoluciones/2026/RCF_n63_13072026_Contador_P%C3%BAblico_2024.pdf>.

## Verificación y riesgos residuales

- Las pruebas focales cubren contrato, serialización, caducidad, comparabilidad, contradicciones, alcance, colisiones entre servicios y los textos de integración. La suite completa, lint, auditoría de seguridad y `git diff --check` se ejecutaron antes del commit.
- La QA funcional comprobó en la aplicación local el antecedente FADU con enlace y vigencia, el vacío prudente y la leyenda del planificador que evita inferir oferta desde la posición del semestre.
- La muestra es intencionalmente manual y pequeña: puede quedar desactualizada si las instituciones cambian sus páginas, por lo que cada ampliación requiere una nueva verificación y un mapeo inequívoco. Sede, modalidad, horarios y salones permanecen desconocidos cuando la fuente no los publica claramente.
- P04 no agrega un editor de fechas. Un v4 importado que ya contiene ambos extremos resuelve el período; los términos nuevos o incompletos conservan `Período personal sin definir`. Crear o modificar rangos desde la UI sigue siendo una evolución separada, sin necesidad de cambiar el esquema v4.
