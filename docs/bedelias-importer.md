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
