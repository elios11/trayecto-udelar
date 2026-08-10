# Acuerdos de trabajo para agentes

## Contexto del proyecto

- Este repositorio contiene una aplicacion web de malla curricular y planificacion de materias.
- Conserva la arquitectura existente con React, vinext, npm y el despliegue configurado en `.openai/hosting.json`.
- Mantiene en espanol el contenido visible para las personas usuarias, salvo que la tarea pida otro idioma.

## Inicio de cada tarea

- Trabaja unicamente dentro de este repositorio.
- Revisa el estado de Git antes de editar. No sobrescribas, reviertas ni incluyas en el commit cambios ajenos a la tarea.
- Lee por completo `PROJECT_CONTEXT.md` antes de analizar o implementar cambios. Es la fuente compartida de contexto estable del producto; no pidas al usuario que repita lo que ya esta documentado alli.
- Lee por completo cualquier especificacion mencionada en el prompt antes de implementar. Para nuevas especificaciones, prefiere un archivo unico por funcionalidad bajo `docs/tasks/<nombre>.md`; no uses un `task.md` compartido como backlog mutable.
- Inspecciona la implementacion existente relacionada antes de proponer cambios. Si falta en la rama base una funcionalidad de la que depende la tarea, informa el bloqueo en vez de reconstruirla o mezclar ramas por tu cuenta.
- Haz supuestos razonables cuando los detalles menores no cambien el producto. Consulta al usuario solo si una decision pendiente altera materialmente el comportamiento o el alcance.

## Fuentes de contexto

- `AGENTS.md` define como trabajar y es obligatorio para todos los chats.
- `PROJECT_CONTEXT.md` describe el producto, la arquitectura y las decisiones transversales estables.
- `docs/tasks/<nombre>.md` describe exclusivamente una funcionalidad, correccion o migracion concreta.
- Para el comportamiento deseado de una tarea, prioriza la instruccion explicita actual del usuario y luego su especificacion. Para conocer el comportamiento ya implementado, verifica el codigo y las pruebas de la rama actual.
- Si una fuente contradice materialmente a otra, no ocultes el conflicto: valida el estado real y pide una decision solo cuando no exista una opcion segura y claramente compatible.
- No conviertas `PROJECT_CONTEXT.md` en historial de chats, lista de pendientes, registro de commits ni estado temporal de ramas.
- Actualiza `PROJECT_CONTEXT.md` solo cuando un cambio confirmado modifique una decision transversal, la arquitectura, la persistencia, las fuentes de datos o una convencion estable. La actualizacion debe viajar en el mismo commit de la funcionalidad.
- Antes de integrar o publicar, comprueba que el contexto compartido siga describiendo correctamente el resultado combinado de `main`.

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
- Recuerda que un worktree conserva el commit desde el que fue creado y no recibe automaticamente cambios posteriores de `main`.
- Crea un commit enfocado despues de validar la implementacion, salvo que el usuario pida expresamente no hacerlo.
- No mezcles, rebases, elimines ni modifiques ramas o worktrees pertenecientes a otros chats.
- No hagas push, despliegue ni publicacion en Sites sin autorizacion explicita del usuario, aunque la compilacion local haya terminado correctamente.

### Flujo obligatorio por funcionalidad

1. En un worktree basado en `main`, implementa una sola funcionalidad, ejecuta sus verificaciones y crea un commit enfocado.
2. No publiques desde el worktree durante el desarrollo. Entrega el hash del commit y deja claro que esta listo para integrar.
3. Cuando el usuario autorice integrar, usa `Hand off` a Local o una tarea de integracion que trabaje sobre el `main` mas reciente.
4. Integra el commit o la rama de la funcionalidad sobre ese `main`, preservando las funcionalidades ya incorporadas y resolviendo conflictos de forma explicita.
5. Ejecuta `npm test` y `npm run lint` sobre el resultado combinado. Para cambios visuales o interactivos, realiza tambien la validacion funcional disponible.
6. Solo si todas las verificaciones relevantes pasan y el usuario lo autorizo, actualiza `main`, haz push y publica en Sites.

### Coordinacion entre chats

- Puede haber varios chats implementando en paralelo, pero solo un chat debe actuar como integrador y publicador a la vez.
- Integra y publica funcionalidades de forma serial: cada nueva integracion debe partir del `main` resultante de la anterior.
- Un chat de funcionalidad no debe asumir que su worktree contiene cambios publicados despues de su creacion.
- Si el usuario pide a un mismo chat completar todo el ciclo, termina primero el commit aislado, pasa a Local mediante `Hand off`, integra sobre el `main` actual, vuelve a verificar y recien entonces publica.
- Aplica este flujo automaticamente; no pidas al usuario que vuelva a explicarlo en cada chat.

### Delegacion y seleccion de modelo

- El usuario autoriza delegar automaticamente subtareas mecanicas, repetitivas y bien delimitadas a un subagente con `gpt-5.6-terra` cuando ese modelo este disponible.
- Conserva Sol para investigacion academica y documental, interpretacion de fuentes, decisiones ambiguas, arquitectura, revision final, integracion y publicacion.
- No intentes cambiar el modelo de una tarea ya iniciada. Para usar un modelo distinto, crea un subagente nuevo con el modelo elegido, contexto minimo suficiente, una salida concreta y criterios de verificacion claros.
- No delegues cuando transferir contexto y revisar el resultado cueste mas que resolver directamente la subtarea. Revisa y valida siempre la salida antes de incorporarla.
- No uses un agente para una operacion determinista que pueda ejecutar directamente un script local. Inicia el script, deja que finalice sin sondeos periodicos del agente y valida sus artefactos al terminar.
- Usa solamente modelos expuestos por las herramientas de la sesion. Si Luna esta disponible, reservalo para cargas mecanicas de alto volumen con validacion determinista; nunca inventes ni simules un modelo no ofrecido.
- La seleccion de modelo busca eficiencia, pero no asumas ni prometas una reduccion proporcional del porcentaje de uso del plan.

### Continuidad ante limites e interrupciones

- No asumas que el agente puede ver el porcentaje restante del plan. Solo actua sobre un indicador que la herramienta exponga de forma explicita o sobre una advertencia del usuario; nunca inventes un porcentaje ni sondees repetidamente el panel de uso.
- Divide el trabajo largo en fases recuperables. Guarda estado durable en hitos significativos, no despues de cada herramienta o request: deja los cambios en disco y, cuando exista una especificacion en `docs/tasks/`, registra lo completado, lo pendiente, los comandos exactos, los artefactos, la ultima validacion y el siguiente paso. No uses `PROJECT_CONTEXT.md` para estado temporal.
- Si el usuario informa poco uso restante o una interrupcion inminente, no abras frentes nuevos. Termina primero la escritura atomica en curso, ejecuta la verificacion mas estrecha posible y crea un commit de checkpoint cuando el estado sea coherente. Si aun no puede confirmarse, conserva el worktree y deja un traspaso explicito sin declarar la tarea completa.
- Antes de iniciar un proceso local largo, comprueba que tenga checkpoints reanudables y salidas atomicas. Registra una sola vez el comando exacto de reanudacion y las rutas de estado; si no existe recuperacion segura, implementala o acota la ejecucion antes del lote completo.
- Un script local determinista no requiere turnos del agente mientras corre y puede continuar si el proceso y la computadora siguen activos. No lo sondees periodicamente para informar que sigue igual: deja que sus checkpoints automaticos preserven el avance sin consumo adicional del agente.
- Al retomar, lee primero la especificacion, `git status`, los checkpoints y el estado de cualquier proceso antes de repetir comandos. Reanuda desde lo guardado y no fuerces reinicios destructivos salvo que exista una razon verificada y documentada.

## Entrega

- Resume el resultado funcional, no solo los archivos editados.
- Informa las comprobaciones ejecutadas y su resultado.
- Indica el commit creado y cualquier decision, limitacion o paso de publicacion pendiente.
