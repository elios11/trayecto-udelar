# Legibilidad de selectores y catálogo académico

## Objetivo

Corregir los controles comprimidos del planificador y evitar que el catálogo presente como materias cursables las entradas administrativas genéricas usadas por Bedelías para registrar créditos reconocidos.

## Alcance implementado

- El editor de objetivo de carga usa una sola columna, conserva ancho útil y mantiene legibles unidad, valor y placeholder incluso dentro del encabezado angosto de un semestre.
- Los selectores de Facultad, Carrera, Plan, Sede y Trayectoria comparten superficies, radios, espaciado, estados hover y foco con el resto de la interfaz.
- La proyección determinista descarta nombres que comienzan exactamente con `Créditos reconocidos`, con o sin tildes y separadores. Son asientos administrativos de crédito variable, no unidades curriculares para cursar.
- La regla se aplica tanto al listado plano como al árbol de composición y se valida en los tres planes FCEA afectados.

## Variantes oficiales equivalentes

No se fusionan materias por similitud textual aislada. La consolidación exige que la fuente oficial ya agrupe los códigos como alternativas de un requisito de una materia, que el nombre académico normalizado coincida y que créditos, horas y asignación por área sean iguales.

Corrección de Estilo publica cuatro codificaciones equivalentes de Informática Aplicada. Se muestra una sola unidad canónica y se conservan en ella los IDs y códigos alternativos para recuperar progreso local previo. Las introducciones a Gramática con 9 y 13 créditos permanecen separadas, así como materias con niveles, cargas o nombres realmente distintos.

## Criterios de aceptación

- `Créditos Reconocidos` no aparece en los catálogos de Economía, Administración ni Técnico en Administración.
- Las cuatro variantes oficiales de Informática Aplicada de Corrección de Estilo se presentan como una materia canónica asociada a `tuce-informatics`, sin perder sus alias.
- Los controles de carga no truncan `Créditos`, `Horas`, `Materias` ni `Sin objetivo` en la vista compacta.
- Los selectores académicos conservan funcionamiento por teclado, foco visible y adaptación a móvil/tablet.
- `npm test`, `npm run lint`, `npm run security:repo` y `git diff --check` pasan antes de integrar.
