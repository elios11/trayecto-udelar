# D03bn — Ingeniería de Alimentos Plan 2003

## Objetivo y estado

Reemplazar el recorrido orientativo generado del plan `bedelias-fq-ingenieria-de-alimentos-2003` por las dos currículas sugeridas de diez semestres publicadas por FING: una con Matemática y Física de FING y otra con esas materias de FQ. Ambas son variantes del mismo título, plan y progreso, no carreras ni menciones distintas. El Plan conserva 450 créditos, sus mínimos por grupos/materias y la aprobación del currículo individual.

Este nodo está **en investigación de fuente**, sin cambios todavía en la proyección. La auditoría previa identifica la carrera compartida entre FQ, FING, Agronomía y Veterinaria, el ingreso actual por FQ y un primer año regional parcial; no convertir la grilla completa en oferta de Salto.

## Publicaciones institucionales localizadas (22/10/2026)

- [FING, ficha de la carrera](https://www.iie.fing.edu.uy/carrera/grado/ingenier%C3%ADa-de-alimentos): enlaza expresamente las dos currículas sugeridas y el Plan 2003. [FVET, ficha de la carrera](https://www.fvet.edu.uy/ensenanza/grado/ingenieria-de-alimentos/) confirma los mismos dos anexos y la corresponsabilidad institucional.
- [Currícula con Matemática/Física de FING](https://webiie.fing.edu.uy/index.php/sites/default/files/Curricula%20Sugerida%20IA%20con%20%20%20%20%20%20Matem%C3%A1ticas%20y%20F%C3%ADsicas%20de%20FI.pdf): el índice web extrae diez semestres y sus tres notas de alternativas. La apertura como PDF local falló por conexión denegada; no hay aún cotejo visual ni huella de bytes.
- [Currícula con Matemática/Física de FQ](https://webiie.fing.edu.uy/index.php/sites/default/files/Curricula%20Sugerida%20IA%20con%20%20%20%20%20%20Matem%C3%A1ticas%20y%20F%C3%ADsicas%20de%20FQ.pdf): mismo esquema de diez semestres, con tronco profesional común y base inicial diferente. También falta cotejo visual y huella de bytes.
- [FING, currícula HTML](https://www.fing.edu.uy/es/ense%C3%B1anza/carreras-terciarias-y-de-grado-5/curr%C3%ADcula-sugerida): copia institucional de una grilla que debe contrastarse con los anexos. Difiere en la presentación del noveno semestre y de Pasantía respecto al PDF indexado; no elegir una versión sin verificar vigencia y correspondencia.
- [Plan de Estudios 2003](https://webiie.fing.edu.uy/index.php/sites/default/files/Plan_de_Estudios_2003.pdf): fuente normativa de mínimos y flexibilidad ya auditada; la grilla sugerida no sustituye sus reglas.

## Reglas de reconciliación

1. Obtener y renderizar las dos fuentes PDF desde una copia institucional accesible. Revisar visualmente las páginas completas, pie de página y fecha/versión. Si el servidor actual no entrega los archivos, buscar copia de la misma autoridad en FING, FVET, FQ, repositorio Udelar/Colibrí; no usar un resultado de búsqueda o una guía histórica como única evidencia de la tabla vigente.
2. Versionar en `data/` un artefacto normalizado con autoridad, URL, consulta, vigencia demostrada, huella SHA-256 del PDF o porción fuente reproducible, dos recorridos, semestre, renglón, servicio, crédito publicado y grupos de alternativas. Conservar el comando exacto de regeneración offline.
3. Cotejar código, nombre, carga y servicio con el snapshot Bedelías. No unir por parecido nominal ni convertir todas las opciones de Bioquímica, Nutrición y Gestión en requisitos acumulativos. Mantener ID previo y materias sólo-fuente cuando falte correspondencia inequívoca.
4. Mantener una sola carrera y progreso. No asignar a Salto períodos posteriores al primer año acreditado. Indicar que una currícula sugerida es guía flexible y que la oferta efectiva por sede/período requiere otra evidencia.
5. Verificar todas las ubicaciones explícitas visibles en Currícula y la unión de las materias respaldadas en Planificador. Ejecutar regeneración dos veces, pruebas focales, `npm test`, `npm run lint` y `git diff --check`; crear un commit aislado. No integrar ni publicar desde este worktree.

## Punto de reanudación

Primero intentar obtener los dos anexos desde FING/FVET/FQ con una sola fase de descarga. El navegador redirige `webiie.fing.edu.uy` al dominio del Instituto de Ingeniería Eléctrica y da 404; la descarga local devolvió conexión denegada. Los índices de búsqueda sí conservan texto de ambas tablas, pero no bastan para validar visualmente columnas y notas. Hasta resolverlo, no se promueven materias ni se cierra `research-pending`.
