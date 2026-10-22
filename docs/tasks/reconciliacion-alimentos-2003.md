# D03bn — Ingeniería de Alimentos Plan 2003

## Objetivo y estado

Reemplazar el recorrido orientativo generado del plan `bedelias-fq-ingenieria-de-alimentos-2003` por las dos currículas sugeridas de diez semestres publicadas por FING: una con Matemática y Física de FING y otra con esas materias de FQ. Ambas son variantes del mismo título, plan y progreso, no carreras ni menciones distintas. El Plan conserva 450 créditos, sus mínimos por grupos/materias y la aprobación del currículo individual.

Las tres copias PDF proporcionadas por el usuario fueron cotejadas visualmente el 22/10/2026, incluidos ambos pies de página y las alternativas. La proyección reproduce ambas variantes en Montevideo; el primer año regional de Salto no autoriza copiar los otros nueve semestres.

## Publicaciones institucionales localizadas (22/10/2026)

- [FING, ficha de la carrera](https://www.iie.fing.edu.uy/carrera/grado/ingenier%C3%ADa-de-alimentos): enlaza expresamente las dos currículas sugeridas y el Plan 2003. [FVET, ficha de la carrera](https://www.fvet.edu.uy/ensenanza/grado/ingenieria-de-alimentos/) confirma los mismos dos anexos y la corresponsabilidad institucional.
- [Currícula con Matemática/Física de FING](https://webiie.fing.edu.uy/index.php/sites/default/files/Curricula%20Sugerida%20IA%20con%20%20%20%20%20%20Matem%C3%A1ticas%20y%20F%C3%ADsicas%20de%20FI.pdf): diez semestres, con Física Experimental 1 en quinto; SHA-256 de la copia recibida `158bb0a5066a3f3f39c93ceb1ee9e314dd1ffbc05bd7f7896dc657ab79d2518f`.
- [Currícula con Matemática/Física de FQ](https://webiie.fing.edu.uy/index.php/sites/default/files/Curricula%20Sugerida%20IA%20con%20%20%20%20%20%20Matem%C3%A1ticas%20y%20F%C3%ADsicas%20de%20FQ.pdf): diez semestres y tronco profesional común; SHA-256 de la copia recibida `266fe0e9949e5a06bc78f45f4e4f09e218c74baf1251f9338041c752b1ebacb4`.
- [FING, currícula HTML](https://www.fing.edu.uy/es/ense%C3%B1anza/carreras-terciarias-y-de-grado-5/curr%C3%ADcula-sugerida): copia institucional de una grilla que debe contrastarse con los anexos. Difiere en la presentación del noveno semestre y de Pasantía respecto al PDF indexado; no elegir una versión sin verificar vigencia y correspondencia.
- [Plan de Estudios 2003](https://webiie.fing.edu.uy/index.php/sites/default/files/Plan_de_Estudios_2003.pdf): fuente normativa de mínimos y flexibilidad ya auditada; SHA-256 de la copia recibida `75128df89123b03d03ab8a666cbc61d947e2a75dcb977ceaa94f78d177347a8c`. La grilla sugerida no sustituye sus reglas.

## Reglas de reconciliación

1. Obtener y renderizar las dos fuentes PDF desde una copia institucional accesible. Revisar visualmente las páginas completas, pie de página y fecha/versión. Si el servidor actual no entrega los archivos, buscar copia de la misma autoridad en FING, FVET, FQ, repositorio Udelar/Colibrí; no usar un resultado de búsqueda o una guía histórica como única evidencia de la tabla vigente.
2. Versionar en `data/` un artefacto normalizado con autoridad, URL, consulta, vigencia demostrada, huella SHA-256 del PDF o porción fuente reproducible, dos recorridos, semestre, renglón, servicio, crédito publicado y grupos de alternativas. Conservar el comando exacto de regeneración offline.
3. Cotejar código, nombre, carga y servicio con el snapshot Bedelías. No unir por parecido nominal ni convertir todas las opciones de Bioquímica, Nutrición y Gestión en requisitos acumulativos. Mantener ID previo y materias sólo-fuente cuando falte correspondencia inequívoca.
4. Mantener una sola carrera y progreso. No asignar a Salto períodos posteriores al primer año acreditado. Indicar que una currícula sugerida es guía flexible y que la oferta efectiva por sede/período requiere otra evidencia.
5. Verificar todas las ubicaciones explícitas visibles en Currícula y la unión de las materias respaldadas en Planificador. Ejecutar regeneración dos veces, pruebas focales, `npm test`, `npm run lint` y `git diff --check`; crear un commit aislado. No integrar ni publicar desde este worktree.

## Artefactos y reanudación

- Fuente curada: `data/fq/ingenieria-alimentos-2003-curriculas.json`, con 60 filas nominales, dos variantes de diez semestres, facultad, crédito, huella de los PDF, notas de alternativas y correspondencias técnicas cotejadas. Las dos guías comparten materias, no son dos carreras.
- La variante base FQ conserva el ID `trayectoria-flexible` de la selección anterior para no romper preferencias locales; sólo cambian la etiqueta y los períodos visibles. El progreso académico sigue compartido por el mismo ID de plan.
- Regeneración offline exacta: `node scripts/build-ingenieria-alimentos-2003.mjs`. No vuelve a descargar ni parsear los PDF. El comando proyecta auditoría, catálogos e inventario y contrasta todas las ubicaciones publicadas.
- Brechas: Matemática 05 figura con 10 cr. en la guía y 11 en Bedelías; Gestión de los Procesos en la Industria con 6 frente a 8. Fisicoquímica 101 y Proyecto Industrial 2 tienen varias identidades técnicas plausibles; Control de Calidad tiene servicio distinto en el snapshot. Quedan como unidades sólo-fuente, sin elegir código por parecido. Las restantes entradas de Bedelías no respaldadas continúan candidatas recuperables.
- Fecha de aprobación de estas versiones de las guías no impresa en los PDF; las copias digitales fueron creadas en 2020 y las fichas institucionales las enlazan al 22/10/2026. Revisar si la Comisión publica nuevas versiones o la oferta regional de Salto se amplía.
- Los grupos alternativos viajan con cada semestre en la proyección: Bioquímica exige elegir una de tres; Nutrición y Gestión son opcionales y excluyentes dentro de cada grupo. La cabecera de Currícula presenta el rango de créditos posibles, no la suma de todas las tarjetas visibles. El Planificador conserva las materias como opciones separadas.

## Validación y límites

- `node scripts/build-ingenieria-alimentos-2003.mjs` dos veces: fuente, auditoría, proyección, revisión e inventario quedan byte a byte idénticos en la segunda ejecución.
- `node --test --experimental-test-isolation=none tests/ingenieria-alimentos-2003-official-audit.test.mjs tests/ingenieria-alimentos-2003.test.mjs tests/official-trajectory-inventory.test.mjs`: 35 pruebas aprobadas.
- Tras corregir el total de alternativas: `node --test --experimental-test-isolation=none tests/ingenieria-alimentos-2003.test.mjs tests/ingenieria-alimentos-2003-official-audit.test.mjs`: 6 aprobadas; `npm run lint`: aprobado. `npm test` con permisos de ejecución de procesos compila y pasa 1130/1133 pruebas. Permanecen tres fallos ajenos: expectativa obsoleta de Psicología en `extracted-academic-plans.test.mjs` y dos pruebas de Artes Plásticas que fallan sólo en la suite concurrente pero pasan al ejecutarse aisladas. No se alteraron esas funcionalidades.
- Falta inspección visual de la UI local: comprobar en una integración posterior las dos variantes y que los semestres 5, 8 y 9 muestren rangos coherentes para los grupos alternativos.
