# Plantillas de prompts

Prompts reutilizables para abrir tareas nuevas de Trayecto sin perder el contexto compartido ni mezclar trabajos paralelos. Reemplazar los campos entre corchetes antes de enviarlos.

## Incorporar una carrera nueva

```text
Vamos a incorporar [CARRERA] de [SERVICIO/FACULTAD] al proyecto Trayecto Udelar, para [SEDE] y [PLAN/AÑO]. Trabajá sobre el workspace MallaCurricularUniversal.

Antes de actuar, leé completos AGENTS.md, PROJECT_CONTEXT.md, .codex/TASK.md, .codex/BACKLOG.md y docs/bedelias-importer.md. Revisá también el código y las pruebas actuales: no asumas que otro worktree contiene cambios todavía no integrados.

Investigá primero las fuentes oficiales aplicables: Bedelías/SGAE, sitio de la facultad o servicio, EVA, Colibrí, resoluciones de consejo/CDC, planes, anexos y trayectorias sugeridas. Separá explícitamente carrera, título, sede, plan, generación de ingreso y vigencia. Conservá procedencia, fecha de consulta y estado de verificación por dato. Los sitios estudiantiles pueden servir para detectar faltantes o comparar UX, pero no como fuente oficial.

Para la investigación pública usá primero herramientas web o de navegador y agrupá búsquedas/aperturas. No ejecutes un comando de red diferente por cada URL ni me pidas aprobaciones repetidas para leer documentos públicos. Si una aprobación es realmente inevitable, consolidá la operación inmediata en una única solicitud estrecha y reutilizable; después continuá con ese método sin reformular el comando en cada fuente.

Para inspeccionar el repositorio usá primero `rg`/`rg --files` y reuní los patrones relacionados en una sola lectura con contexto. No leas `app/page.tsx` u otro archivo grande en tramos sucesivos mediante `Get-Content | Select-Object`, pipes o cadenas separadas por punto y coma. Si una lectura local vuelve a pedir aprobación después de una autorización equivalente, cambiá de método o continuá con lo ya inspeccionado; no vuelvas a interrumpirme por bloques del mismo archivo.

Para extraer Bedelías no supervises materias una por una ni repitas solicitudes ya guardadas. Reutilizá el recolector desatendido y su índice por servicio: primero ejecutá `npm.cmd run bedelias:service -- --service [CÓDIGO] --careers "[CARRERA]" --dry-run` para confirmar la selección y después repetí el comando sin `--dry-run`. Dejá que el proceso local termine sin sondeos ni intervenciones periódicas del agente; si se interrumpe, ejecutá exactamente el mismo comando para reanudar desde los checkpoints. Recién después revisá el snapshot, las incidencias y la cobertura, y contrastalos con las demás fuentes oficiales. No publiques automáticamente lo recolectado.

El objetivo es integrar materias obligatorias y optativas/electivas, créditos, áreas y mínimos por título, trayectorias sugeridas, títulos intermedios y previaturas de curso/examen sin presentar información parcial o inferida como oficial. Si una fuente todavía está incompleta, modelá y mostrá esa limitación en lugar de inventar el dato.

Trabajá en una rama y un worktree aislados basados en el main más reciente. Mantené esta tarea enfocada únicamente en [CARRERA/PLAN]. Actualizá la documentación estable solo si cambia una decisión transversal y mantené .codex/TASK.md al día. Ejecutá las verificaciones exigidas por AGENTS.md, creá un commit enfocado y entregame el hash junto con fuentes, cobertura, supuestos y pendientes. No integres en main, no hagas push y no publiques sin mi autorización explícita.
Si Codex ya asignó un worktree, usalo. Si necesitás crearlo, debe quedar dentro de la raíz del proyecto en `.worktrees/[NOMBRE]`, y todos los temporales y descargas deben permanecer dentro de ese worktree. Concentrá cualquier aprobación inevitable en el bootstrap inicial; si el sandbox devuelve `apply deny-read ACLs` o `helper_unknown_error`, no vuelvas a escalar cada lectura durante la ejecución.
```

## Desarrollar una feature nueva

```text
Vamos a implementar la feature [NOMBRE] en el proyecto Trayecto Udelar.

Objetivo para la persona usuaria: [RESULTADO ESPERADO].
Alcance y comportamiento esperado: [DETALLES Y REGLAS].
Criterios de aceptación: [CASOS QUE DEBEN FUNCIONAR].
Fuera de alcance por ahora: [LO QUE NO DEBE CAMBIAR].

Trabajá sobre el workspace MallaCurricularUniversal. Antes de actuar, leé completos AGENTS.md, PROJECT_CONTEXT.md, .codex/TASK.md y .codex/BACKLOG.md. Inspeccioná el código, los datos y las pruebas relacionados antes de diseñar la solución. Si la feature necesita una especificación duradera, creá docs/tasks/[NOMBRE-CORTO].md y usala como alcance único de esta tarea.

Partí del main más reciente y trabajá en una rama y un worktree aislados. Preservá el progreso existente en localStorage, la compatibilidad hacia atrás, la accesibilidad, teclado y tacto, la experiencia móvil, prefers-reduced-motion y la identidad visual actual. No agregues dependencias, servicios externos, autenticación, telemetría ni cambios curriculares fuera del alcance sin consultarme.
Si el worktree no fue asignado por Codex, crealo dentro de la raíz del proyecto en `.worktrees/[NOMBRE]`, nunca como carpeta hermana. Conservá temporales y descargas dentro de él y resolvé las aprobaciones inevitables durante el bootstrap, no a lo largo de toda la implementación.

Implementá la solución más simple que cubra los criterios sin introducir coincidencias o comportamientos accidentales. Agregá o actualizá pruebas para los casos principales y los bordes relevantes. Para cambios visuales o interactivos, validá también el flujo real en escritorio y móvil cuando sea posible. Actualizá PROJECT_CONTEXT.md solo si cambia una decisión transversal estable y mantené .codex/TASK.md al día.

Al terminar, ejecutá npm.cmd test y npm.cmd run lint según AGENTS.md, diferenciando fallos nuevos de deuda previa. Creá un commit enfocado y entregame el hash, el resultado funcional, las verificaciones realizadas, decisiones importantes y cualquier limitación pendiente. No integres en main, no hagas push y no publiques sin mi autorización explícita.
```

## Uso recomendado

- Abrir una tarea independiente por carrera o feature para evitar mezclar contextos y ramas.
- Completar como mínimo el resultado esperado y los criterios de aceptación; si algo menor queda abierto, el agente puede avanzar con supuestos razonables.
- Mantener una única tarea como integradora/publicadora y autorizar allí, de forma explícita, los commits que deben entrar en `main`.
