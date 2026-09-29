# D03k — Garantía global de trayectorias no vacías

## Estado

Especificación urgente lista para implementación antes de continuar los cierres incrementales de D03.

## Problema

Algunos planes seleccionables contienen datos y materias, pero Currícula muestra sólo marcadores administrativos, una estructura sin materias reales o nada útil. Ingeniería Química Plan 2021 es el caso visible prioritario. Esto contradice el propósito principal del producto y no puede considerarse una degradación aceptable mientras se completa la reconciliación oficial.

## Objetivo

Garantizar que cada plan seleccionable tenga una trayectoria utilizable y un catálogo completo en el planificador:

1. usar siempre la trayectoria sugerida oficial vigente cuando exista y esté reconciliada;
2. mientras esté pendiente, o si su ausencia está documentada, generar un `Recorrido orientativo generado` desde la composición disponible de Bedelías;
3. identificarlo visualmente como provisional y no oficial, explicar su procedencia y reemplazarlo al cerrar la auditoría oficial;
4. incluir todas las materias disponibles y optativas/electivas del plan sin duplicados en el planificador, diferenciando las verificadas de las provisionales;
5. preservar progreso e identidades al sustituir luego el recorrido provisional por el oficial.

## Reglas de seguridad académica

- La composición de Bedelías puede sostener el fallback de planificación, pero no se atribuye como trayectoria sugerida por la institución.
- Los marcadores de orientación, validación de egreso y otros asientos administrativos no cuentan como materias reales ni satisfacen la garantía.
- No inventar previas, equivalencias, obligatoriedad ni oferta temporal.
- La secuencia provisional debe ser determinista y explicable. Usar períodos publicados por Bedelías cuando existan; si sólo hay agrupaciones, distribuirlas conservando ese orden y rotular el resultado como orientativo, sin afirmar semestres oficiales.
- Las materias candidatas o de procedencia parcial pueden mostrarse únicamente dentro del recorrido provisional con señalización clara; no completan requisitos oficiales ni cambian su `authorityStatus`.
- La reconciliación oficial siempre reemplaza al fallback y conserva identidades canónicas compatibles.

## Alcance de implementación

- Detectar todos los planes seleccionables cuya trayectoria publicada no tenga al menos un período con una materia curricular real.
- Corregir el generador o adaptador común, no sólo Ingeniería Química.
- Asegurar que el planificador use la unión completa de materias de trayectoria y catálogo, incluidas optativas, sin ocultarlas por el recorrido activo.
- Añadir una indicación visible y accesible de recorrido provisional.
- No cargar todos los catálogos globales de forma anticipada; mantener la carga por plan.

## Criterios de aceptación

- Una prueba global recorre todos los planes seleccionables y falla si alguno no ofrece materias reales en Currícula.
- Ingeniería Química Plan 2021 deja de verse vacía y presenta un recorrido provisional útil hasta su reconciliación oficial.
- El planificador de cada plan incluye todas las materias disponibles de sus trayectorias y catálogos, incluidas optativas/electivas, sin IDs duplicados.
- La UI distingue inequívocamente `Trayectoria oficial` de `Recorrido orientativo generado`.
- Las materias provisionales no completan requisitos oficiales ni se convierten silenciosamente en verificadas.
- `npm test`, `npm run lint` y `git diff --check` pasan.

## Entrega

Implementar en un worktree aislado, documentar el conjunto de planes corregidos y los límites, ejecutar verificaciones, crear un commit enfocado y devolver el hash. No integrar, hacer push ni publicar desde el subagente.
