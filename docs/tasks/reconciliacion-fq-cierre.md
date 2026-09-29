# D03j — Cierre de trayectorias identificadas de Facultad de Química

## Estado

Implementación y validación terminadas en el worktree `d03j-fq-cierre-v2`; lista para el commit enfocado y la posterior integración serial.

## Objetivo

Cerrar las tres trayectorias de Facultad de Química que aún tienen fuente oficial identificada pero no correspondencia exacta:

- Bachiller en Ciencias Químicas, Plan 2000, como título intermedio sin ingreso directo;
- Licenciatura en Tecnologías de la Química, Plan 2022;
- Técnico Bachiller en Ciencias Químicas, Plan 2015, como carrera vigente con ingreso directo.

El nodo debe reproducir los períodos y recorridos oficiales, mantener separadas las dos identidades de Bachiller y conservar en el planificador el catálogo completo verificado de cada plan, incluidas sus opciones flexibles.

## Fuentes obligatorias

Usar y verificar visualmente las fuentes oficiales ya registradas en `data/official-trajectories/inventory.json` y `data/bedelias/audits/official-source-audits.json`. Guardar descargas y renderizados temporales bajo `tmp/d03j-fq-cierre/`.

Jerarquía:

1. dameros y resoluciones vigentes de Facultad de Química para períodos y secuencia;
2. planes de estudio y fichas de carrera para títulos, créditos, mínimos y flexibilidad;
3. catálogo Udelar y publicaciones territoriales para vigencia, ingreso y sedes;
4. Bedelías sólo para contrastar identidades ya respaldadas;
5. EVA nunca crea pertenencia, obligatoriedad ni orden.

## Alcance funcional

### Bachiller en Ciencias Químicas 2000

- Conservarlo como título intermedio vigente para estudiantes de los planes de origen, sin ingreso directo y sin confundirlo con la Tecnicatura 2015.
- Reproducir el damero oficial para sus cinco recorridos de origen: Bioquímico Clínico, Químico Farmacéutico, Químico, Ingeniería de Alimentos e Ingeniería Química.
- Modelar correctamente el núcleo común, las unidades específicas y los 230 créditos sin crear cinco carreras distintas.

### Licenciatura en Tecnologías de la Química 2022

- Reproducir nueve semestres para Biotecnología y Nanotecnología según los dameros vigentes, conservando un único título de 360 créditos.
- Mantener Practicantado o Proyecto como alternativas finales y los créditos flexibles como catálogo, sin hacer obligatoria toda la oferta.
- Registrar sin ocultar las diferencias entre la duración original del plan, los metadatos actuales y la implementación vigente.

### Técnico Bachiller en Ciencias Químicas 2015

- Reproducir cinco semestres en Montevideo según la Resolución 112/2026.
- Conservar Bioquímica Opción II, Laboratorio de Bioquímica, los mínimos oficiales y 50 créditos flexibles.
- Limitar Salto al primer año demostrado y explicar la continuidad; no proyectar la composición completa de CENURLN como oferta territorial.

## Reglas transversales

- Los rótulos y la cantidad de períodos deben coincidir con la fuente oficial vigente.
- Toda materia publicada en una trayectoria debe conservar una identidad canónica visible.
- El planificador debe ofrecer la unión completa sin duplicados de materias verificadas en trayectorias y catálogos del plan; el recorrido activo sólo determina su semestre sugerido.
- No publicar candidatos, registros administrativos, equivalentes históricos ni variantes de Bedelías no respaldadas.
- No inferir previas, equivalencias, sedes u obligatoriedad por similitud textual.
- Registrar las discrepancias documentales y priorizar la fuente curricular correspondiente.

## Artefactos y verificación

- Actualizar auditorías, revisiones curadas, proyecciones y el inventario D03.
- Añadir pruebas focalizadas para períodos, recorridos, créditos, sedes, separación de identidades y catálogo completo del planificador.
- Ejecutar generadores e inventario dos veces y comprobar estabilidad determinista.
- Ejecutar pruebas focalizadas, `npm test`, `npm run lint` y `git diff --check`.
- Documentar aquí fuentes, resultados, límites y estado recuperable.
- Crear un commit enfocado y devolver su hash; no integrar, hacer push ni publicar desde el subagente.

## Resultado implementado

- `data/fq/official-trajectories-2000-2022.json` conserva la transcripción normalizada y revisada de los nueve recorridos: cinco del Bachiller 2000, dos de LTQ 2022 y dos territoriales del Técnico Bachiller 2015.
- Bachiller 2000 mantiene una sola identidad de título intermedio y sus cinco carreras de origen. Ingeniería de Alimentos e Ingeniería Química ya usan los requisitos explícitos del damero, no la expansión de grupos candidatos de Bedelías.
- LTQ 2022 conserva un único título y dos orientaciones de nueve semestres. La revisión visual corrigió Inmunología I (`506X`): corresponde al sexto semestre de Biotecnología, no al quinto.
- Técnico Bachiller 2015 mantiene la carrera completa de cinco semestres en Montevideo y limita Salto al primer año. El catálogo visible incorpora 74 coincidencias inequívocas y vigentes del catálogo oficial de electivas; los otros 31 rótulos únicos del PDF, ambiguos, históricos o sin equivalente actual, quedan enumerados literalmente en la evidencia y no se convierten en materias inventadas.
- Los tres planes pasan a `official-trajectory-reproduced`; el inventario queda en 147 planes: 81 reproducidos, 9 con fuente identificada pendiente, 56 por investigar y 1 ausencia documentada.
- La presentación del planificador conserva D03k: los nueve recorridos tienen materias oficiales reales, usan `Trayectoria oficial` y ofrecen la unión verificada de períodos y catálogos sin recurrir al fallback generado.

## Fuentes verificadas y límites

Se descargaron bajo `tmp/d03j-fq-cierre/` y se renderizaron 43 páginas de siete PDF oficiales: el damero del Bachiller 2000; el Plan 2022 y los dos dameros 2026 de LTQ; el Plan 2015, el damero 2026 y el catálogo de electivas del Técnico Bachiller. La revisión visual cubrió las 3 páginas del Bachiller, los 4 dameros LTQ, las páginas normativas pertinentes de los dos planes y las 3 páginas del catálogo de electivas.

Límites preservados:

- el documento del Bachiller 2000 organiza requisitos y carreras de origen, no semestres; la UI no inventa una secuencia temporal;
- el Plan LTQ prescribe ocho semestres, pero los dameros vigentes distribuyen la implementación en nueve y son la fuente de orden actual;
- el catálogo de electivas del Técnico Bachiller fue actualizado por Resolución 97 de 19/07/2018 y publica nombres, no códigos; Bedelías sólo resuelve código, créditos y versión cuando la identidad es inequívoca;
- la oferta flexible efectiva puede cambiar por período y sigue sujeta a la Comisión de Carrera y Bedelía.

## Verificaciones finales

- La proyección académica y el inventario se regeneraron dos veces. Los 173 artefactos comparados conservaron en ambos pases el mismo hash combinado: `618e7ed5b0242401544cb1c77cd91d321f12789f24dfce998641ae433ba1a20d`.
- Las pruebas focalizadas de los tres planes, del inventario y del catálogo del planificador aprobaron 33/33 casos.
- `npm test`: compilación de producción y 923/923 pruebas aprobadas.
- `npm run lint`: aprobado sin errores.
- La revisión visual de las tres páginas del catálogo oficial de electivas confirmó 105 rótulos únicos: 74 correspondencias vigentes inequívocas publicadas y 31 rótulos conservados literalmente como evidencia sin inventar identidades.
- `git diff --cached --check`: aprobado sobre el conjunto intencional preparado para el commit; los archivos generados marcados únicamente por finales de línea quedaron fuera.
