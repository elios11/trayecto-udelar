# Legibilidad de selectores y catálogo académico

## Objetivo

Corregir los controles comprimidos del planificador y evitar que el catálogo presente como materias cursables las entradas administrativas genéricas usadas por Bedelías para registrar créditos reconocidos.

## Alcance implementado

- El editor de objetivo de carga usa una sola columna, conserva ancho útil y mantiene legibles unidad, valor y placeholder incluso dentro del encabezado angosto de un semestre.
- Los selectores de Facultad, Carrera, Plan, Sede y Trayectoria comparten superficies, radios, espaciado, estados hover y foco con el resto de la interfaz.
- La proyección determinista descarta nombres que comienzan exactamente con `Créditos reconocidos`, con o sin tildes y separadores. Son asientos administrativos de crédito variable, no unidades curriculares para cursar.
- La regla se aplica tanto al listado plano como al árbol de composición y se valida en los tres planes FCEA afectados.

## Límite deliberado: variantes oficiales

No se fusionan materias por similitud textual. Corrección de Estilo publica varias codificaciones de Informática Aplicada y su requisito oficial exige aprobar una de esas alternativas; eliminarlas convertiría una equivalencia real en pérdida de datos.

La mejora posterior debe agrupar visualmente variantes únicamente cuando una auditoría o un `requiredCourseGroup` oficial las relacione. El grupo debe mostrar una tarjeta resumida expandible, conservar códigos, créditos y previaturas individuales, y no alterar progreso ni exportaciones. Una heurística por nombre queda expresamente prohibida.

## Criterios de aceptación

- `Créditos Reconocidos` no aparece en los catálogos de Economía, Administración ni Técnico en Administración.
- Las alternativas oficiales de Informática Aplicada de Corrección de Estilo permanecen presentes y asociadas a `tuce-informatics`.
- Los controles de carga no truncan `Créditos`, `Horas`, `Materias` ni `Sin objetivo` en la vista compacta.
- Los selectores académicos conservan funcionamiento por teclado, foco visible y adaptación a móvil/tablet.
- `npm test`, `npm run lint`, `npm run security:repo` y `git diff --check` pasan antes de integrar.
