# D03at — Dirección Coral, Dirección Orquestal y Musicología, Plan 1987

## Objetivo

Auditar en un solo nodo las tres licenciaturas históricas Plan 1987 del Instituto de Música que siguen `research-pending`: Dirección Coral, Dirección Orquestal y Musicología. El documento de investigación hallado para Composición 1987 contiene también sus tablas, por lo que se comparte extracción y criterio sin fusionar carreras, planes ni progreso. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; worktree aislado sobre el `main` más reciente.

## Fuentes y límites

- Revisar las auditorías y snapshots Bedelías de los tres planes, además de `data/fartes/composicion-1987.json` como antecedente metodológico, no como evidencia transferible de identidad curricular.
- La [tesis de Carreño 2017](https://www.cse.udelar.edu.uy/wp-content/uploads/2017/10/tesis_graciela_carreno_2017.pdf) contiene las Tablas 9 (Dirección Coral y Orquestal, pp. impresas 49–51) y 10 (Musicología, pp. 54–55). Son elaboraciones de la autora a partir de planes; inspeccionar las tablas visualmente y transcribirlas como evidencia secundaria, nunca como grilla oficial por sí solas. Verificar cada referencia a expedientes/planes originales y eventuales modificaciones.
- Buscar documentos aprobados o copias de la misma autoridad en Facultad de Artes/Instituto de Música, Udelar, Colibrí e IMPO. Un enlace roto no demuestra ausencia. El Plan 2005 y el orden administrativo de Bedelías no suplen evidencia del Plan 1987.
- Mantener estado histórico sin nuevos ingresos, créditos no publicados como cero sin atribuirles carga real, IDs de progreso estables y candidatas recuperables. No inferir equivalencias entre los tres planes ni con 2005.

## Artefactos y cierre

- Guardar evidencia normalizada y versionada bajo `data/fartes/` por plan, con URL, autoridad, consulta, versión, alcance, filas cotejadas y huella reproducible; crudos en `tmp/d03at-licenciaturas-1987/`.
- Sólo proyectar períodos como oficiales si una fuente primaria o confirmación institucional valida exactamente la secuencia aplicable. Si no, mantener `research-pending` con brecha concreta por carrera; no declarar ausencia sin afirmación institucional expresa.
- Proveer regeneración offline determinista desde los datos versionados para proyección, auditoría, revisión, colas e inventario; probar frontera `verified`/`candidate`, no pérdida de IDs, créditos desconocidos y separación de los planes. Ejecutar dos regeneraciones idénticas, focales, `npm test`, `npm run lint` si corresponde y `git diff --check`.
- Crear un commit enfocado. No integrar, hacer push ni publicar desde el worktree. Informar hallazgos y próximos documentos necesarios para cada carrera.

## Estado

- Implementación completada el 18 de octubre de 2026, pendiente únicamente de integración autorizada. Composición 1987 quedó auditada por separado; sus expedientes originales tampoco están disponibles públicamente y su Tabla 8 no se promovió.

### Hallazgos y brechas

- La consulta agrupada en Facultad de Artes/Instituto de Música, portal Udelar/CSE, Colibrí e IMPO confirmó identidad institucional, régimen histórico de egreso y continuidad de exámenes, pero no localizó el Plan 1987 aprobado, una resolución que publique la secuencia ni copias de los expedientes `2642/87` y `7704/87`.
- La tesis de Carreño se descargó desde CSE con huella `sha256:900b145000232c173ead36d9ebe1afd845d1a47342a8120a85aa03a109f61107`; su copia en Colibrí conserva el mismo contenido visual relevante. La Tabla 9 contiene 39 ubicaciones para Dirección Coral y 38 para Dirección Orquestal en siete años. La Tabla 10 contiene 25 ubicaciones para Musicología en cuatro años; la revisión visual muestra que comienza en la página impresa 53 y continúa en la 54, aunque el índice de la tesis la remite a la 54.
- Las tablas declaran «Elaboración propia a partir de los PE». Se preservan como evidencia secundaria normalizada en `data/fartes/direccion-coral-1987.json`, `data/fartes/direccion-orquestal-1987.json` y `data/fartes/musicologia-1987.json`, con huella de `sourcePortions`, pero no se proyecta ninguna de sus filas como trayectoria oficial.
- Los tres planes permanecen separados entre sí y de Música 2005. Se conservan sin cambios 122, 119 y 144 IDs candidatos de Bedelías, respectivamente, con créditos desconocidos representados por cero; el único registro `verified` de cada proyección continúa siendo `fartes-validacion-final-plan`.
- Para cerrar cada brecha se necesita una copia institucional del Plan 1987 aprobado o de los expedientes `2642/87` y `7704/87`, con versión aplicable, o confirmación expresa de Facultad de Artes/Udelar de que la columna correspondiente de las Tablas 9 o 10 reproduce la secuencia oficial aplicable al régimen de egreso.

### Regeneración y verificación

- Crudo revisado localmente: `tmp/d03at-licenciaturas-1987/tesis-graciela-carreno-2017-2017-10.pdf`; las páginas relevantes se renderizaron con Poppler y se cotejaron visualmente antes de transcribir.
- Regeneración offline: `npm run trajectory:fartes-licenciaturas-1987`.
- Se ejecutaron dos regeneraciones consecutivas y coincidieron las huellas SHA-256 de las tres proyecciones, el registro de auditorías, ambas colas, el manifiesto de planes extraídos y el inventario de trayectorias.
- Pruebas focales: `node tests/fartes-licenciaturas-1987-research.test.mjs` y `node tests/fartes-historical-music-plans.test.mjs`.
- Verificación final: `npm test`, `npm run lint` y `git diff --check`.
