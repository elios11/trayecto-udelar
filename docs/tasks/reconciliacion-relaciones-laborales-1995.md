# D03bi — Tecnicatura en Relaciones Laborales Plan 1995

## Objetivo

Reconciliar `bedelias-fder-tecnicatura-en-relaciones-laborales-1995`, hoy `research-pending`, con la [página oficial de programas del plan anterior](https://www.fder.edu.uy/node/8457), que enumera trece unidades agrupadas en primero, segundo y tercero, y la [historia institucional de la carrera](https://www.fder.edu.uy/node/6317). Comprobar si la agrupación por años es una trayectoria curricular oficial publicable o sólo un índice de programas. Buscar el plan aprobado o copia institucional antes de cerrar el estado; contrastar vigencia histórica, duración y correspondencias técnicas sin confundirlo con Licenciatura Plan 2012.

## Límites

Mantener la carrera histórica, título, progreso e IDs. No atribuir créditos ausentes ni inferir semestres de una carrera descrita como de dos años y medio. Si los trece nombres respaldan unidades pero no secuencia recomendada, preservar las agrupaciones con una etiqueta fiel a su autoridad y registrar la brecha. Una coincidencia nominal con Bedelías no autoriza fusionar IDs ni sumar unidades del Plan 2012. El PDF de calendario de exámenes prueba actividad y códigos, no necesariamente la grilla curricular completa.

## Entrega

Guardar artefacto normalizado versionado en `data/fder/` con autoridad, URL, fecha, versión, alcance, trece filas y huella reproducible de la porción fuente; registrar comando offline de regeneración/verificación. Actualizar auditoría, inventario, proyección y `PROJECT_CONTEXT.md` sólo si la fuente permite una decisión segura y estable. Añadir pruebas focales de cobertura, identidad, carga desconocida, estado histórico y no mezcla con 2012. Ejecutar dos regeneraciones idénticas, `npm test`, `npm run lint` y `git diff --check`. Commit enfocado en este worktree, sin integrar, push ni despliegue.
