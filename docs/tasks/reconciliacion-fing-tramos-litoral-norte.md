# Agrimensura y Físico-Matemática: inicios del Litoral Norte

La [página vigente de FING sobre Trayectorias Ingeniería](https://www.fing.edu.uy/es/node/49415) enlaza las tablas de Salto y Paysandú y distingue la inscripción a una trayectoria inicial de la inscripción a un CIO. FING documenta la continuidad por inscripción en una sede que dicta la carrera completa, con escolaridad; la sede completa identificada para estos planes es Montevideo. No se afirman apertura para una cohorte particular, presencialidad de todas las filas ni equivalencias individuales.

Mostrar dos semestres de Agrimensura 2023 y cuatro de Físico-Matemática 2017, diferenciados por sede donde cambian las filas. No sustituir el recorrido ni los perfiles de Montevideo, ni retirar el plan de la cola mientras la secuencia capitalina no esté cotejada. Mantener IDs de plan, mínimos y progreso. Las guías no dan códigos: usar IDs sólo-fuente compartidos entre Salto y Paysandú para la misma fila, sin reemplazar las identidades previas de Bedelías. Currícula y el listado de materias para agregar se ajustan a la sede; las materias ya planificadas, el progreso y las referencias del documento personal se resuelven contra el mismo plan completo aunque se cambie de sede.

Evidencia: `data/bedelias/audits/fing-trayectos-iniciales-litoral-norte-review.json`. Regenerar sin red: `node scripts/build-fing-tramos-litoral-norte.mjs`. Prueba focal: `node tests/fing-tramos-litoral-norte.test.mjs`.

## Continuación en Montevideo: Físico-Matemática

La Comisión publica los cuatro primeros semestres para ingreso con suficiencia en la prueba diagnóstica. La transcripción normalizada está en `data/official-trajectories/fing-fisico-matematica-2017-montevideo.json`. El taller de primero se elige una vez; Introducción a la Ingeniería Civil sigue anotada como pendiente de incorporación según esa versión. Las doce opciones referidas a tercero y cuarto no se asignan a un semestre ordinal por su paridad de dictado.

El índice de la Comisión enlaza ocho perfiles-guía. Física contiene dos ejemplos de diez semestres en las pp. 3–4; su existencia está verificada, pero las tablas aún no están reconciliadas con los códigos. Antes de proyectarlas, cotejar los otros perfiles y los créditos por versión, conservar los espacios flexibles y contar una sola vez el proyecto que los ejemplos distribuyen en dos períodos. Mantener separados los tramos regionales y la oferta efectiva. El visualizador curricular enlazado por la Comisión fue elaborado por un estudiante: no es fuente oficial de los períodos.

El cotejo de la guía inicial guarda 27 de 28 correspondencias por código y carga con la proyección actual: las 13 filas fijas, las tres opciones del taller y 11 de las 12 opciones de tercero y cuarto. FING identifica como 1322 la Programación 1 de Montevideo en su horario de segundo semestre de 2025; éste sirve para distinguir el código entre cuatro homónimos, no para atribuir pertenencia curricular ni oferta futura. El catálogo aún marca 1322, 1990 y 1723 como candidatas: el cotejo no las publica automáticamente ni activa sus reglas.

Principios de Química General sigue discrepante: 7 créditos en la guía, 8 para 1620 y 10 para el registro regional. No reemplazar ni sumar cargas por similitud. El siguiente paso para la app es proyectar primero la guía inicial con taller alternativo, opciones sin semestre ordinal y la discrepancia explícita; preservar los IDs previos y comprobar Salto y Paysandú. Los perfiles avanzados se pueden cotejar por separado.

Regenerar el inventario desde la evidencia versionada: `npm run trajectory:inventory`. Verificar con `node --test --experimental-test-isolation=none tests/fing-tramos-litoral-norte.test.mjs tests/official-trajectory-inventory.test.mjs`.
