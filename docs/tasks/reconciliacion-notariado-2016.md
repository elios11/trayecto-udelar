# D03bh — Notariado Plan 2016

## Objetivo

Reconciliar `bedelias-fder-notariado-2016`, hoy `research-pending`, con la [página del Plan 2016 de Facultad de Derecho](https://www.fder.edu.uy/node/431) y su [grilla vigente de diciembre de 2024, publicada en 2025](https://www.fder.edu.uy/sites/default/files/2025-10/GRILLA%202025%20Notariado.pdf). La grilla muestra diez semestres y 450 créditos en cinco años. Verificar visualmente sus tres páginas si es posible antes de atribuir a cada semestre las filas mezcladas por la extracción textual.

## Límites

Conservar un único plan, título Escribano Público, progreso, sedes e IDs técnicos. Mantener los mínimos vigentes por área y el título intermedio Procurador ya auditados. No convertir los cupos optativos/electivos en materias obligatorias ni usar la composición de Bedelías o EVA como prueba de pertenencia vigente. Distinguir materias, talleres, seminarios, bloques y alternativas en la grilla; no inferir equivalencias por nombres parecidos ni ajustar cargas para cuadrar totales. Si no se puede cotejar visualmente una fila o código ambiguo, conservar la identidad sin fusión y documentar la brecha, sin declarar cerrada la trayectoria.

## Entrega

Guardar evidencia normalizada y versionada bajo `data/fder/`, con autoridad, URL, fecha de consulta, vigencia, alcance, filas/identidades cotejadas y huella reproducible de la porción de fuente. Crear verificador/generador offline con salida atómica y comando de regeneración documentado. Cambiar auditoría, inventario y proyección sólo en lo respaldado por evidencia. Añadir pruebas focales para períodos, cobertura visible, identidad, créditos, flexibilidad y conflictos. Actualizar `docs/carreras-a-actualizar.md` sólo si se descubre publicación parcial o en desarrollo. Ejecutar verificación focal, dos regeneraciones idénticas, `npm test`, `npm run lint` y `git diff --check`; dejar commit enfocado sin push ni despliegue desde el worktree.
