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

- Pendiente. Composición 1987 ya quedó auditada por separado; sus expedientes originales no están disponibles públicamente y su Tabla 8 no se promovió.
