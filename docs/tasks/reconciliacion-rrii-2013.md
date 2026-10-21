# D03bg — Relaciones Internacionales Plan 2013

## Objetivo

Reconciliar el estado `research-pending` del inventario para `bedelias-fder-licenciatura-en-relaciones-internacionales-2013` sobre `main` `2f165e3`. La auditoría previa y la proyección ya describen una [grilla de ocho semestres de Facultad de Derecho](https://www.fder.edu.uy/sites/default/files/2021-09/Plan%20de%20Estudios%20RRII%202013_0.pdf), con ciclos, créditos, título intermedio y modalidades de egreso. Verificar visualmente el PDF si es posible y contrastar con la [página documental vigente](https://www.fder.edu.uy/node/3553), antes de cerrar el inventario. No reconstruir ni duplicar una funcionalidad que ya está presente.

## Límites

Conservar el único Plan 2013, sede, título, progreso e IDs; las ocho posiciones, áreas y mínimos ya publicados; variantes de Función Universitaria y modalidades de egreso sin convertirlas en obligaciones acumulativas. El catálogo central informa 60 meses aunque la grilla tenga ocho semestres: documentar ambas magnitudes sin corregirlas intuitivamente. La discrepancia de créditos del ciclo profesional sigue abierta y no autoriza sumar/fusionar cursos para cuadrar subtotales. Bedelías coteja código y carga, no crea pertenencia oficial por sí sola. Si la grilla 2021 fue reemplazada o su vigencia no es comprobable, no declarar trayectoria actual reproducida; documentar conflicto y gatillo de revisión.

## Entrega

Normalizar evidencia versionada bajo `data/` con URL, autoridad, consulta, vigencia, alcance, filas cotejadas y huella; regenerar offline sin red ni nueva extracción. Actualizar auditoría/inventario/proyección sólo donde sea necesario para reflejar evidencia, sin cambiar comportamiento correcto existente. Añadir pruebas focales de cobertura, identidad, créditos, alternativas y estado. Si no se puede verificar visualmente la grilla, dejar el límite explícito. Dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint`, `git diff --check`. Commit enfocado en este worktree, sin integrar, pushear ni publicar desde él.
