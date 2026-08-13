# Importador de Bedelías

Bedelías es la fuente institucional del proyecto. El portal público no ofrece una API REST documentada: la consulta está implementada con Jakarta Faces y PrimeFaces, conserva estado de vista y genera identificadores temporales. El importador usa la interfaz pública mediante un navegador automatizado para evitar depender de esos detalles internos.

## Principios

- Acceso exclusivamente público, sin credenciales.
- Pausa mínima de 500 ms y valor predeterminado de 900 ms entre interacciones.
- Extracción reanudable mediante un checkpoint por plan.
- Archivos JSON atómicos: un proceso incompleto no reemplaza el último resultado válido.
- Conservación de URLs de origen, fecha, texto original, estructura de reglas y hash del contenido.
- Curso y examen se guardan como requisitos diferentes.
- Las expresiones conservan operadores `all`, `any`, `none`, mínimos de créditos del plan, mínimos por grupo y requisitos con alternativas; los formatos desconocidos permanecen como texto original para revisión.
- Un operador lógico sin opciones ni descendientes se considera una extracción incompleta, nunca una regla válida ni ausencia de previaturas.

## Comandos

```powershell
npm run bedelias:catalog
npm run bedelias:inventory -- --types "GRADO|TECNICATURA|CIO" --dry-run
npm run bedelias:service -- --service FING
npm run bedelias:report -- --service FADU --types "GRADO|TECNICATURA|CIO"
npm run bedelias:plan -- --service FING --career "INGENIERÍA EN COMPUTACIÓN" --year 1997 --courses 1466,1321
npm run bedelias:plan -- --service FING --career "INGENIERÍA EN COMPUTACIÓN" --year 2025 --course-names "Fundamentos de la Combinatoria|Programación Imperativa"
```

En PowerShell, el carácter `|` de los filtros debe llegar literalmente a Node. La forma comprobada es `npm.cmd --% run bedelias:inventory -- --types "GRADO|TECNICATURA|CIO" --dry-run` y, para un servicio, `npm.cmd --% run bedelias:service -- --service FADU --types "GRADO|TECNICATURA|CIO" --delay 500`.

`bedelias:inventory` recorre secuencialmente el catálogo global, invoca el modo `--dry-run` por servicio y genera `data/bedelias/inventory/global-current.json`. Conserva un checkpoint local en `data/bedelias/batches/global-inventory.json`, reintenta fallos transitorios con backoff y omite servicios completos al ejecutar de nuevo el mismo comando. El manifiesto preserva los estados académicos `discovered`, `extracted`, `structurally-valid`, `official-sources-pending`, `audited` y `blocked`; sólo una anulación curada puede marcar un plan como `audited`.

`bedelias:report` resume snapshots completos de un servicio en `data/bedelias/reports/<servicio>-pilot.json`. Reporta cursos, reglas publicadas, consultas sin regla, incidencias, requests, tamaños y hashes sin volcar los snapshots extensos. Un reporte sin incidencias queda `official-sources-pending`, no `audited`: Bedelías no sustituye la revisión de planes, resoluciones, sedes, áreas y trayectorias oficiales.

El modo `bedelias:service` descubre todas las carreras de un servicio y procesa secuencialmente sus planes vigentes. No llama a modelos ni APIs de IA: una vez iniciado, trabaja localmente sin necesitar turnos de Codex. Guarda un índice del servicio en `data/bedelias/services/`, un estado reanudable en `data/bedelias/batches/` y mantiene además los checkpoints individuales del modo `plan`. Si se interrumpe, el mismo comando omite los planes ya completados y continúa con los pendientes. El índice descubierto también se reutiliza; `--refresh-index true` fuerza una actualización desde Bedelías.

### Interrupción y reanudación

El lote escribe atómicamente su estado antes y después de cada plan en `data/bedelias/batches/<servicio>-vigentes.json`. Cada plan guarda además un archivo `<salida>.checkpoint` después de cada consulta de previaturas; el snapshot JSON definitivo solo reemplaza al anterior cuando la extracción del plan termina correctamente.

Ante `Ctrl+C`, el coordinador conserva esos archivos y deja de iniciar planes nuevos después de finalizar o interrumpir el plan activo. Para continuar se ejecuta exactamente el mismo comando: los planes con salida completa se omiten, los fallidos o interrumpidos se reintentan y las reglas ya presentes en el checkpoint individual no se consultan de nuevo. No uses `--resume false`, borres checkpoints ni fuerces `--refresh-index true` salvo que se haya verificado que es necesario reiniciar esos datos.

El proceso local no consume uso ni créditos de modelos mientras recolecta. Puede seguir trabajando sin intervención del agente mientras el proceso y la computadora permanezcan activos; si cualquiera se detiene, los checkpoints permiten retomar sin repetir todo el servicio. El agente debe registrar una sola vez el comando, la ruta del estado del lote y la ubicación de las salidas, y luego evitar sondeos periódicos.

Para revisar el lote antes de iniciarlo se puede usar `--dry-run`. Los filtros `--types "GRADO|TECNICATURA|CIO"`, `--careers "CARRERA A|CARRERA B"` y `--max-plans N` permiten acotar la ejecución. `--current-only false` incluye planes históricos. De forma predeterminada se procesan únicamente planes vigentes con tipos compatibles con grado, tecnicaturas y CIO. `Posgrado` se excluye de manera explícita aunque contenga la palabra “grado”; `--types all` incluye posgrados y cualquier otro tipo.

Sin `--courses`, el modo `plan` intenta consultar las previaturas de todas las unidades curriculares locales encontradas en la composición. Para pruebas y desarrollo se recomienda comenzar por un conjunto pequeño.

Para lotes revisados se puede usar `--delay 500`, que es el mínimo prudente aceptado por la herramienta. Conviene agrupar muchos códigos en una sola ejecución porque abrir la carrera, el plan y la consulta pública tiene un costo fijo importante. El checkpoint permite reanudar un lote interrumpido sin repetir reglas ya guardadas.

Si el checkpoint local quedó desactualizado o no viajó con un worktree, el modo reanudable recupera primero las reglas del último snapshot válido del mismo servicio, carrera y plan. Las entradas más nuevas del checkpoint prevalecen y el archivo publicado solo se reemplaza cuando termina el lote.

Al reanudar, el importador elimina del checkpoint únicamente las reglas con operadores lógicos vacíos y las vuelve a consultar. `npm run bedelias:audit-rules` detecta estos casos en todos los snapshots; antes de cerrar una importación global debe pasar también `npm run bedelias:audit-rules -- --strict`. Las proyecciones y la interfaz tratan cualquier regla incompleta como cobertura parcial y no la usan para bloquear una materia.

`npm run bedelias:project` genera `app/data/computacion-1997-electivas.json` con todas las unidades curriculares de la composición del Plan 1997 que no forman parte de la carga inicial de 20 optativas. Bedelías determina inclusión, código, créditos y áreas posibles; sólo se omiten entradas administrativas de créditos por reválida o no acumulables. La interfaz importa este archivo cuando la persona busca o solicita el catálogo completo. Buscar sólo hace visibles las coincidencias y, al limpiar la consulta, vuelve a las 20 optativas iniciales; el botón de expansión sí mantiene todo el catálogo visible. `data/fing/computacion-oferta-2026-2.json` es opcional y sólo agrega semestre, cupo y enlace cuando existe: una materia de Bedelías nunca desaparece por faltar en EVA, horarios u otra publicación.

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
