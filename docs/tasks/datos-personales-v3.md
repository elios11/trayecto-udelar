# F01 — Contrato unificado de datos personales v3

## Estado

Implementada y validada en el nodo F01, pendiente de integración. Esta tarea define y valida el contrato; no migra todavía `localStorage`, no cambia importaciones/exportaciones existentes y no modifica la interfaz.

## Objetivo

Crear un documento JSON portable y versionado que pueda representar sin pérdida los datos personales actuales de Trayecto y que sirva como frontera estable para las migraciones, la recuperación local y una futura sincronización. La definición curricular oficial permanece fuera del documento.

## Estado actual verificado

- El progreso vive en `trayecto-udelar-progress-v2` como estados por `progressPlanId`.
- La planificación vive en `trayecto-udelar-planner-v1` y el semestre actual en `trayecto-udelar-current-term-v1`.
- La selección académica vive en `trayecto-udelar-academic-selection-v1`.
- Las preferencias visuales viven separadas y deben continuar fuera del documento transferible.
- La exportación completa usa `formatVersion: 2`; la exclusiva del planificador usa `formatVersion: 1`.
- Los planes pueden medir carga mediante créditos, horas publicadas o cantidad de unidades. El contrato no puede asumir que todos usan créditos.

## Entregables

1. Un módulo puro, independiente de React y del navegador, que exponga los tipos del documento v3, validación segura y serialización.
2. Declaraciones TypeScript consumibles por la aplicación sin agregar dependencias.
3. Fixtures válidos e inválidos y pruebas unitarias de estructura, referencias e invariantes.
4. Una nota breve en `PROJECT_CONTEXT.md` que registre la existencia y el límite arquitectónico del contrato.

La ubicación sugerida es `app/personal-data.mjs` con `app/personal-data.d.ts`; se acepta una ubicación equivalente si las pruebas Node pueden importar el validador directamente y la aplicación puede consumir los tipos.

## Contrato requerido

El documento raíz debe identificar inequívocamente el formato y contener:

- discriminador estable `format: "trayecto-personal-data"`;
- `formatVersion: 3`;
- ID estable del documento;
- revisión entera no negativa;
- fechas ISO de creación y última modificación;
- identificador no personal del dispositivo que realizó la última modificación, nullable cuando se desconoce;
- perfil académico activo, nullable;
- una colección de perfiles académicos.

Cada perfil académico debe tener ID estable y representar:

- selección por IDs: facultad, carrera, plan, `progressPlanId`, sede nullable, trayectoria y credencial nullable;
- referencia nullable a la versión o revisión curricular usada, sin copiar materias, créditos, áreas ni reglas oficiales;
- unidad de carga `credits`, `hours` o `courses`;
- progreso por ID estable de materia, conservando `pending`, `approved` y `exonerated` y admitiendo fecha de modificación nullable para datos históricos sin timestamp;
- planificación personal con escenario activo y colección de escenarios.

Cada escenario debe tener ID y nombre estables, estado principal o archivado, fechas, semestre actual nullable y una lista ordenada de semestres. Cada semestre debe contener ID estable, etiqueta, estado planificado/en curso/cerrado, fechas opcionales y una lista ordenada de IDs de materias. Un objetivo personal de carga puede ser nullable; cuando existe usa la misma unión `credits | hours | courses` y un valor finito positivo.

No incluir en v3:

- definición de materias, créditos, horas, requisitos o áreas oficiales;
- tema, paneles abiertos, búsquedas ni otras preferencias visuales;
- correo, nombre, cédula, número de estudiante o identificadores de ChatGPT/proveedores;
- notas personales, hasta que se cierre su política de privacidad.

## Invariantes y validación

El parser debe recibir `unknown`, no lanzar ante datos inválidos y devolver un resultado discriminado con el documento normalizado o una lista de problemas comprensibles para pruebas y futuras interfaces.

Debe comprobar como mínimo:

- discriminador y versión exactos;
- IDs no vacíos y únicos en cada colección;
- fechas ISO válidas y `updatedAt >= createdAt` cuando ambas existen;
- revisión entera no negativa;
- el perfil activo existe o es `null`;
- `progressPlanId` es explícito y no se deduce por igualdad con `planId`;
- estados y unidades pertenecen a sus uniones cerradas;
- valores numéricos son finitos y cumplen sus límites;
- el escenario activo existe o es `null`;
- a lo sumo un escenario se marca como principal y, si hay uno activo, no está archivado;
- IDs de semestres únicos por escenario;
- el semestre actual pertenece al escenario o es `null`;
- una materia no aparece dos veces dentro del mismo escenario;
- todos los elementos son JSON serializable y no se muta el valor de entrada.

Campos adicionales de una misma versión pueden ignorarse de forma segura para permitir ampliaciones compatibles, pero nunca deben saltarse las invariantes conocidas. Una versión distinta se rechaza explícitamente; su migración corresponde a otro módulo.

## Serialización

- Exponer una función que sólo serialice documentos v3 ya válidos y produzca JSON determinista para el mismo valor.
- La serialización no debe depender de APIs de navegador, zona horaria local ni estado global.
- Parsear → serializar → parsear debe conservar el documento semánticamente.

## Compatibilidad y migración posterior

F03 implementará la migración. Esta tarea sólo debe dejar documentado y probado que la conversión podrá mapear:

- cada entrada actual de progreso a un perfil con `progressPlanId` explícito;
- la selección activa al perfil correspondiente;
- los términos actuales a un escenario principal inicial;
- `currentTermId` al escenario correcto;
- timestamps inexistentes a `null`, sin inventar fechas históricas;
- planes sin créditos a `hours` o `courses` según los metadatos oficiales disponibles durante la migración.

Las exportaciones v1/v2 y las claves actuales no deben cambiar en F01.

## Pruebas obligatorias

- documento mínimo válido sin perfiles;
- documento completo con dos perfiles y unidades de carga distintas;
- plan canónico cuyo `progressPlanId` difiere de `planId`;
- round-trip determinista;
- rechazo de formato o versión desconocidos;
- IDs duplicados y referencias activas inexistentes;
- fechas, revisión, objetivo y estados inválidos;
- materia repetida entre semestres del mismo escenario;
- escenario o semestre actual archivado/inexistente;
- comprobación de que el parser no muta la entrada;
- fixture inválido que acumule más de un problema cuando sea seguro continuar validando.

## Verificación y cierre

- Ejecutar las pruebas unitarias estrechas durante el desarrollo.
- Ejecutar `npm test` y `npm run lint` antes del commit.
- `PROJECT_CONTEXT.md` debe describir el nuevo contrato sin afirmar que la aplicación ya migró a él.
- El commit no debe tocar `app/page.tsx`, las claves de almacenamiento, la UI ni servicios externos.

F01 queda cerrada cuando el módulo, los tipos, los fixtures y las pruebas pasan, el formato v3 está documentado y el commit enfocado puede integrarse sin activar todavía ningún comportamiento para usuarios.

## Resultado del nodo

- El contrato puro y su serialización canónica viven en `app/personal-data.mjs`; `app/personal-data.d.ts` expone sus tipos para TypeScript.
- Los fixtures mínimo, completo e inválido viven en `tests/fixtures/`, y `tests/personal-data.test.mjs` cubre las invariantes y el round-trip requeridos.
- El formato no está conectado a React, `localStorage`, las importaciones ni las exportaciones actuales. Esa migración continúa reservada para F03.
- Verificación final: `node tests/personal-data.test.mjs`, `npm test`, `npm run lint` y `git diff --check` pasan.
