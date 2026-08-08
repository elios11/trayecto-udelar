# Acuerdos de trabajo para agentes

## Contexto del proyecto

- Este repositorio contiene una aplicacion web de malla curricular y planificacion de materias.
- Conserva la arquitectura existente con React, vinext, npm y el despliegue configurado en `.openai/hosting.json`.
- Mantiene en espanol el contenido visible para las personas usuarias, salvo que la tarea pida otro idioma.

## Inicio de cada tarea

- Trabaja unicamente dentro de este repositorio.
- Revisa el estado de Git antes de editar. No sobrescribas, reviertas ni incluyas en el commit cambios ajenos a la tarea.
- Lee por completo cualquier especificacion mencionada en el prompt antes de implementar. Para nuevas especificaciones, prefiere un archivo unico por funcionalidad bajo `docs/tasks/<nombre>.md`; no uses un `task.md` compartido como backlog mutable.
- Inspecciona la implementacion existente relacionada antes de proponer cambios. Si falta en la rama base una funcionalidad de la que depende la tarea, informa el bloqueo en vez de reconstruirla o mezclar ramas por tu cuenta.
- Haz supuestos razonables cuando los detalles menores no cambien el producto. Consulta al usuario solo si una decision pendiente altera materialmente el comportamiento o el alcance.

## Implementacion

- Mantiene cada chat y worktree enfocado en una sola funcionalidad o correccion coherente.
- Prefiere cambios pequenos y compatibles con la estructura actual. Evita refactorizaciones, renombrados o actualizaciones de dependencias no requeridos.
- No agregues dependencias de produccion sin autorizacion explicita.
- Preserva el comportamiento existente, la accesibilidad, el uso con teclado y tactil, y el diseno adaptable a movil.
- Para preferencias exclusivamente locales, como tema o configuracion visual, usa almacenamiento del navegador salvo que la especificacion exija persistencia remota.
- No cambies metadatos, imagenes sociales ni identidad visual fuera del alcance de la tarea.
- Nunca incluyas secretos, credenciales, archivos `.env` ni artefactos locales de desarrollo en commits.

## Verificacion

- Ejecuta las comprobaciones mas estrechas que cubran el cambio durante el desarrollo.
- Antes de finalizar una implementacion, ejecuta `npm test`.
- Ejecuta `npm run lint` cuando cambies codigo fuente. Si existe un fallo previo no relacionado, documentalo y no amplifiques el cambio para corregirlo sin permiso.
- Para cambios visuales o interactivos, verifica el flujo afectado en la aplicacion cuando las herramientas disponibles lo permitan. No declares validacion visual si solo se ejecuto una compilacion.

## Git, worktrees y publicacion

- Usa un worktree independiente por funcionalidad cuando haya trabajo paralelo.
- Parte de la version mas reciente de `main` que contenga todas las dependencias necesarias de la tarea.
- Crea un commit enfocado despues de validar la implementacion, salvo que el usuario pida expresamente no hacerlo.
- No mezcles, rebases, elimines ni modifiques ramas o worktrees pertenecientes a otros chats.
- No hagas push, despliegue ni publicacion en Sites sin autorizacion explicita del usuario, aunque la compilacion local haya terminado correctamente.

## Entrega

- Resume el resultado funcional, no solo los archivos editados.
- Informa las comprobaciones ejecutadas y su resultado.
- Indica el commit creado y cualquier decision, limitacion o paso de publicacion pendiente.
