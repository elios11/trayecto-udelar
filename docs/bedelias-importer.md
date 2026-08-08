# Importador de Bedelías

Bedelías es la fuente institucional del proyecto. El portal público no ofrece una API REST documentada: la consulta está implementada con Jakarta Faces y PrimeFaces, conserva estado de vista y genera identificadores temporales. El importador usa la interfaz pública mediante un navegador automatizado para evitar depender de esos detalles internos.

## Principios

- Acceso exclusivamente público, sin credenciales.
- Pausa mínima de 500 ms y valor predeterminado de 900 ms entre interacciones.
- Extracción reanudable mediante un checkpoint por plan.
- Archivos JSON atómicos: un proceso incompleto no reemplaza el último resultado válido.
- Conservación de URLs de origen, fecha, texto original, estructura de reglas y hash del contenido.
- Curso y examen se guardan como requisitos diferentes.
- Las expresiones conservan operadores `all`, `any`, `none` y requisitos con alternativas; los formatos desconocidos permanecen como texto original para revisión.

## Comandos

```powershell
npm run bedelias:catalog
npm run bedelias:plan -- --service FING --career "INGENIERÍA EN COMPUTACIÓN" --year 1997 --courses 1466,1321
npm run bedelias:plan -- --service FING --career "INGENIERÍA EN COMPUTACIÓN" --year 2025 --course-names "Fundamentos de la Combinatoria|Programación Imperativa"
```

Sin `--courses`, el modo `plan` intenta consultar las previaturas de todas las unidades curriculares locales encontradas en la composición. Para pruebas y desarrollo se recomienda comenzar por un conjunto pequeño.

En planes cuya composición todavía está incompleta, `--course-names` permite consultar nombres exactos separados por `|`. Los nombres se comparan sin distinguir mayúsculas, acentos ni puntuación. Si Bedelías no devuelve una materia/regla, el checkpoint registra `noPublishedRule`; esto significa “consulta realizada sin regla publicada”, no “materia sin previas”.

## Modelo de datos

Cada conjunto contiene:

- procedencia y método de extracción;
- servicio, carrera y plan;
- metadatos del plan y vínculo al documento de Colibrí;
- árbol de composición y mínimos de créditos;
- títulos/certificados visibles;
- catálogo deduplicado de unidades curriculares;
- reglas separadas para curso y examen;
- texto original de cada regla;
- incidencias automáticas y hash reproducible.

El JSON extraído es un insumo, no una publicación automática. Para habilitar una carrera en la aplicación debe pasar validaciones estructurales y una comparación manual inicial con Bedelías.

## Áreas de formación y programas oficiales

Las previaturas y la composición operativa se contrastan con Bedelías, pero la asignación de créditos por área usa la fuente más específica disponible para cada carrera y plan:

1. Anexo B del programa oficial de la unidad curricular.
2. Resolución de la Comisión de Carrera o del Consejo.
3. Composición curricular de Bedelías.
4. Plan de estudios y documentos de implementación.
5. Trayectoria sugerida oficial.
6. Asignación curada marcada como `suggested`.

La Comisión Académica de Grado de Fing exige que el Anexo B aclare en qué área suma créditos la UC para cada plan. Una clasificación del Plan 1997 no se traslada automáticamente al Plan 2025.

El catálogo inicial está en `data/fing/computacion-programas-oficiales.json`. Cada programa registra código, plan aplicable, área, URL y estado. Los generadores combinan este catálogo con las rutas curriculares del snapshot y producen proyecciones `schemaVersion: 2` con:

- `creditStructure.nodes`: árbol de grupos y áreas;
- `creditStructure.credentials`: requisitos por título;
- `eligibleRequirementIds`: áreas oficialmente posibles;
- `creditAllocations`: asignación efectiva, créditos, estado y fuente;
- `sourceCoverage`: cobertura por programas, Bedelías, sugerencias, conflictos y faltantes.

En modo `allocated`, usado actualmente por Computación, una materia nunca puede aportar más créditos que su valor total. Los grupos acumulan contribuciones directas y de sus descendientes sin duplicarlas.

## Áreas de formación y programas oficiales

Las previaturas y la composición operativa se contrastan con Bedelías, pero la asignación de créditos por área usa la fuente más específica disponible para cada carrera y plan:

1. Anexo B del programa oficial de la unidad curricular.
2. Resolución de la Comisión de Carrera o del Consejo.
3. Composición curricular de Bedelías.
4. Plan de estudios y documentos de implementación.
5. Trayectoria sugerida oficial.
6. Asignación curada marcada como `suggested`.

La Comisión Académica de Grado de Fing exige que el Anexo B aclare en qué área suma créditos la UC para cada plan. Una clasificación del Plan 1997 no se traslada automáticamente al Plan 2025.

El catálogo inicial está en `data/fing/computacion-programas-oficiales.json`. Cada programa registra código, plan aplicable, área, URL y estado. Los generadores combinan este catálogo con las rutas curriculares del snapshot y producen proyecciones `schemaVersion: 2` con:

- `creditStructure.nodes`: árbol de grupos y áreas;
- `creditStructure.credentials`: requisitos por título;
- `eligibleRequirementIds`: áreas oficialmente posibles;
- `creditAllocations`: asignación efectiva, créditos, estado y fuente;
- `sourceCoverage`: cobertura por programas, Bedelías, sugerencias, conflictos y faltantes.

En modo `allocated`, usado actualmente por Computación, una materia nunca puede aportar más créditos que su valor total. Los grupos acumulan contribuciones directas y de sus descendientes sin duplicarlas.
