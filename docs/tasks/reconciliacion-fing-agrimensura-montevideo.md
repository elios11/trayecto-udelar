# Ingeniería en Agrimensura 2023 — guía de Montevideo

El 18 de noviembre de 2026 se identificaron seis semestres de la variante de ingreso con 60% o más en la Prueba Inicial en la guía de la Comisión de Carrera. El sitio institucional de FING remite a la Comisión; se usa su publicación formal, no un listado de aulas de EVA. Los períodos verificados no sustituyen las guías de Salto y Paysandú, ni extienden el alcance a otras variantes.

La transcripción normalizada está en `data/official-trajectories/fing-agrimensura-2023-pi60.json`. Se conservan las dos alternativas de Informática del cuarto semestre: se elige una, no se suman ambas. 28 de las 30 filas coinciden por código y créditos con el catálogo del plan (incluida la correspondencia 423EU → FQ-423EU); TCI24 y 1858 no tienen coincidencia por código en la proyección actual. No se infieren equivalencias ni los semestres 7–10. Las otras dos variantes enlazadas no pudieron verificarse.

El informe de inscripciones de grado 2025 de FING confirma las identidades TCI24 (Captura de Datos por Percepción Remota) y 1858 (Fotogrametría). No confirma por sí solo su relación vigente con la composición de Bedelías del Plan 2023.

Para regenerar y validar la clasificación desde las fuentes versionadas: `npm run trajectory:inventory` y `node --test --experimental-test-isolation=none tests/official-trajectory-inventory.test.mjs`. El siguiente paso es cotejar las dos identidades faltantes con Bedelías y representar la elección del cuarto semestre en la proyección sin alterar el catálogo general, los requisitos ni los recorridos regionales.
