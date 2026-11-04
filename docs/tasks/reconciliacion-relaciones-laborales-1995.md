# D03bi — Tecnicatura en Relaciones Laborales Plan 1995

## Objetivo

Reconciliar `bedelias-fder-tecnicatura-en-relaciones-laborales-1995`, hoy `research-pending`, con la [página oficial de programas del plan anterior](https://www.fder.edu.uy/node/8457), que enumera trece unidades agrupadas en primero, segundo y tercero, y la [historia institucional de la carrera](https://www.fder.edu.uy/node/6317). Comprobar si la agrupación por años es una trayectoria curricular oficial publicable o sólo un índice de programas. Buscar el plan aprobado o copia institucional antes de cerrar el estado; contrastar vigencia histórica, duración y correspondencias técnicas sin confundirlo con Licenciatura Plan 2012.

## Límites

Mantener la carrera histórica, título, progreso e IDs. No atribuir créditos ausentes ni inferir semestres de una carrera descrita como de dos años y medio. Si los trece nombres respaldan unidades pero no secuencia recomendada, preservar las agrupaciones con una etiqueta fiel a su autoridad y registrar la brecha. Una coincidencia nominal con Bedelías no autoriza fusionar IDs ni sumar unidades del Plan 2012. El PDF de calendario de exámenes prueba actividad y códigos, no necesariamente la grilla curricular completa.

## Entrega

Guardar artefacto normalizado versionado en `data/fder/` con autoridad, URL, fecha, versión, alcance, trece filas y huella reproducible de la porción fuente; registrar comando offline de regeneración/verificación. Actualizar auditoría, inventario, proyección y `PROJECT_CONTEXT.md` sólo si la fuente permite una decisión segura y estable. Añadir pruebas focales de cobertura, identidad, carga desconocida, estado histórico y no mezcla con 2012. Ejecutar dos regeneraciones idénticas, `npm test`, `npm run lint` y `git diff --check`. Commit enfocado en este worktree, sin integrar, push ni despliegue.

## Cotejo D03bi · 21/10/2026

- [FDER, Programas del plan anterior](https://www.fder.edu.uy/node/8457) y su [página titulada Plan 1995](https://www.fder.edu.uy/node/1532): ambas contienen el mismo índice de 13 programas (5+5+3) bajo «Primero», «Segundo» y «Tercero». Los rótulos no son semestres ni prueban tres años académicos completos. El artefacto `data/fder/relaciones-laborales-1995-programas.json` conserva orden, nombre, código cotejado e ID histórico; `sourceRowsSha256` es SHA-256 de `JSON.stringify(sourceRows)` en UTF-8 y permite detectar cambios en la porción normalizada.
- [Historia de FDER](https://www.fder.edu.uy/node/6317) y [aviso de IMPO de 1995](https://www.impo.com.uy/bases/avisos/54640-1995): la duración publicada es dos años y medio. [FDER, calendario de exámenes de mayo de 2026](https://www.fder.edu.uy/sites/default/files/2025-12/Mayo%202026.pdf) confirma que todavía hay mesas para el Plan 1995 y sus códigos, pero no determina la grilla, las cargas ni la obligatoriedad. [FDER, exámenes y equivalencias](https://www.fder.edu.uy/node/5166) exige revisión individual para rendir materias del nuevo plan.
- Se buscó el Plan aprobado y una copia institucional en FDER, portal Udelar, Colibrí e IMPO. El distribuido 95/95 citado en referencias históricas no apareció como documento curricular recuperable; la página «Plan 1995» tampoco lo contiene. La tabla institucional de carreras técnicas informa 750 horas totales y 2,5 años, pero no distribuye horas por programa. No se adoptaron cargas individuales, créditos, semestres ni equivalencias automáticas.
- La agrupación de programas se muestra fiel a la autoridad, las 13 identidades oficiales se publican con los IDs preexistentes y carga desconocida, y el estado de trayectoria permanece `research-pending`. Los mínimos técnicos 5+5+3 proceden del árbol Bedelías y la culminación requiere validación institucional. El gatillo de revisión es una publicación del texto aprobado, grilla autorizada o aclaración expresa de régimen de egreso por FDER, CDC, Colibrí o Diario Oficial.

### Regeneración y verificación sin red

Desde la raíz del repositorio, ejecutar `node scripts/build-extracted-academic-plans.mjs`, `npm run trajectory:inventory` y `node scripts/verify-fder-relaciones-laborales-1995.mjs`. Repetir la secuencia y comparar los hashes SHA-256 de la proyección, el reporte y el inventario; el verificador falla si la huella, identidad, cobertura o carga desconocida difieren. Fuente cruda no requerida: la proyección se reconstruye desde el artefacto normalizado, la auditoría versionada y el snapshot Bedelías versionado.

Última validación: dos secuencias de regeneración con hashes idénticos (`E6D60B5A…` proyección, `AE63657A…` reporte, `FF50DF3D…` inventario); verificador focal, pruebas de Relaciones Laborales, inventario y proyecciones extraídas aprobados; `npm run lint` y `git diff --check` aprobados. `npm test` se intentó, pero la compilación de vinext falló por `spawn EPERM` del entorno Windows antes de iniciar pruebas; la validación de compilación/flujo visual queda pendiente en un entorno que permita crear procesos hijos.
