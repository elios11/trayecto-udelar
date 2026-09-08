# F04 — Deshacer, papelera e instantáneas locales

## Estado

Lista para implementación sobre `b47c553`, después de F03. Este nodo agrega recuperación exclusivamente local sobre el documento personal v3; no incorpora cuentas, sincronización, historial académico ni escenarios múltiples.

## Objetivo

Evitar que una acción accidental, una importación válida pero equivocada o la eliminación de un semestre obligue a reconstruir manualmente el progreso y la planificación. La recuperación debe ser comprensible, acotada y portable entre hosts web sin depender de Sites.

## Decisiones de producto

- `Deshacer` cubre cambios de estado de materias y mutaciones del planificador realizadas durante la sesión actual.
- El historial de deshacer es deliberadamente efímero: no sobrevive a una recarga, porque una acción antigua aplicada sobre otro catálogo o versión resulta difícil de explicar. Se conservan como máximo 20 pasos.
- Los semestres eliminados sí sobreviven a recargas en una papelera local durante 30 días, con un máximo de 20 elementos. El vencimiento se limpia al hidratar y antes de cada escritura.
- Las instantáneas completas sobreviven a recargas. Se conservan las 10 más recientes durante 90 días.
- Papelera, instantáneas e historial de deshacer no forman parte de `trayecto-personal-data` v3, no se exportan y no se sincronizarán automáticamente con una cuenta. Son mecanismos del dispositivo.
- La clave de recuperación será `trayecto-udelar-recovery-v1`, con un contrato puro y versionado separado.
- Las claves heredadas que F03 conserva siguen siendo la recuperación de bajo nivel para la primera migración. Además, al crear por primera vez el v3 se guarda una instantánea normalizada con motivo `Migración local`, de modo que la UI pueda restaurarla sin interpretar formatos viejos.

## Modelo local

Crear un módulo puro importable por Node y la aplicación que valide y normalice:

- `formatVersion: 1`;
- instantáneas `{ id, createdAt, expiresAt, reason, document }`, donde `document` debe ser un v3 válido;
- semestres eliminados `{ id, deletedAt, expiresAt, profileId, planId, scenarioId, originalIndex, term }`;
- nunca preferencias visuales, datos curriculares copiados, credenciales ni identificadores de dispositivo.

El módulo debe recibir fecha e IDs como dependencias para que las pruebas sean deterministas. Una entrada dañada se recupera por fragmentos válidos; nunca debe impedir cargar la aplicación ni reemplazarse antes de intentar preservar los elementos legibles.

## Deshacer en la sesión

- Mantener una pila de hasta 20 operaciones inversas o estados personales anteriores, sin guardarla en `localStorage`.
- Cubrir como mínimo: cambio de estado de materia, asignar/quitar/mover una materia, crear/renombrar/cerrar semestre, cambiar semestre actual y eliminar/restaurar semestre.
- Agrupar una sola interacción de arrastre como un paso. No registrar hidratación, persistencia automática ni la propia acción de deshacer.
- `Ctrl+Z` y `Cmd+Z` deshacen sólo cuando el foco no está en `input`, `textarea`, `select` ni un elemento editable, y cuando no hay un diálogo modal que deba manejar primero Escape.
- Ofrecer una acción visible `Deshacer` con descripción de la última operación; debe quedar deshabilitada cuando la pila esté vacía.
- Tras deshacer, mostrar un aviso accesible y permitir que la persistencia canónica de F03 guarde el resultado normalmente. Rehacer queda fuera de alcance.

## Papelera de semestres

- Eliminar un semestre lo quita del escenario activo y devuelve sus materias al catálogo, como hoy, pero conserva término, posición y contexto en la papelera.
- Restaurar reinsertará el semestre en su plan y escenario originales, respetando la posición cuando siga siendo posible.
- Si el perfil, plan o escenario ya no existe, mantener el elemento y explicar que no puede restaurarse todavía; no adivinar otro destino.
- Si alguna materia ya está asignada a otro semestre, restaurar el semestre sin duplicarla y comunicar cuántas materias no se pudieron reponer.
- No permitir dejar un escenario sin semestres. El botón de eliminación continúa deshabilitado cuando sólo queda uno.
- La UI de papelera vive dentro del panel `Datos`, muestra nombre, plan, fecha de eliminación y acciones `Restaurar`/`Eliminar definitivamente`. Vaciar o eliminar definitivamente requiere confirmación en un modal propio, no `alert`.

## Instantáneas

Crear una instantánea validada inmediatamente antes de:

1. aplicar una importación completa válida;
2. aplicar una importación de sólo planificador válida;
3. reiniciar el progreso de un plan;
4. reemplazar de forma completa el estado personal por cualquier flujo futuro;
5. escribir por primera vez el documento canónico tras migrar almacenamiento heredado.

No crear instantáneas para cada clic de una materia. Deduplicar instantáneas consecutivas semánticamente iguales. Una importación rechazada no crea instantánea.

La UI dentro de `Datos` lista motivo y fecha, permite restaurar y eliminar. Restaurar una instantánea crea primero otra instantánea de seguridad del estado actual, valida materias y referencias con el catálogo diferido de F03 y sólo entonces reemplaza el estado. Si la restauración falla, no modifica almacenamiento.

## Persistencia y fallos

- Serializar y validar completamente antes de `localStorage.setItem`.
- Una escritura fallida no debe impedir que el cambio principal se guarde en v3; mostrar que la copia de recuperación no pudo guardarse sin afirmar que se perdió el progreso principal.
- F05 será responsable del indicador general de guardado y diagnóstico de cuota. F04 sólo debe exponer errores concretos de recuperación mediante el modal accesible existente.
- Evitar bucles entre restauración, snapshot preventivo y persistencia automática mediante operaciones explícitas e idempotentes.

## UI y accesibilidad

- Añadir en `Datos` una sección compacta `Recuperación` con contadores de instantáneas y papelera; plegada por defecto para no aumentar el ruido visual.
- El botón visible de deshacer puede vivir en esa sección y, cuando exista una acción reciente, también aparecer en el aviso temporal posterior a la acción.
- Anunciar resultados mediante una región `aria-live="polite"`.
- Mantener uso por teclado y tacto, foco devuelto al disparador al cerrar modales y objetivos táctiles adecuados.
- Todo texto visible permanece en español y deja claro que las copias están sólo en este dispositivo.

## Pruebas obligatorias

- Validación, limpieza por vencimiento y límites 10/20 del almacén local.
- Entrada parcialmente dañada conserva instantáneas y elementos de papelera válidos.
- Dedupe de instantáneas semánticamente iguales.
- Snapshot previo a migración, importación completa, importación de planificador y reinicio.
- Importación rechazada no crea snapshot.
- Eliminación/restauración conserva posición, término actual y materias cuando no hay conflicto.
- Restauración evita duplicar materias ya reasignadas y reporta omisiones.
- Elemento huérfano permanece recuperable cuando vuelve a existir su contexto.
- Deshacer de estados y todas las mutaciones principales del planificador; límite de 20 y ausencia de registro recursivo.
- Atajo de teclado ignora campos editables y diálogos.
- Restaurar snapshot crea copia preventiva y una falla no muta el documento vigente.
- Pruebas documentales o de integración de `app/page.tsx` para panel, modal y región accesible.

## Límites

- No agregar dependencias ni servicios externos.
- No cambiar el contrato exportable v3 salvo que una incompatibilidad comprobada lo exija.
- No implementar rehacer, sincronización, cuenta, backups remotos, historial académico ni escenarios alternativos.
- No modificar currículas, requisitos, fuentes oficiales o identidad visual.
- No borrar las claves heredadas de F03.

## Verificación y cierre

- Ejecutar pruebas estrechas durante el desarrollo.
- Antes del commit ejecutar `npm test`, `npm run lint`, `npm run security:repo` y `git diff --check`.
- Verificar funcionalmente el flujo afectado cuando las herramientas disponibles lo permitan; no declarar QA visual si no se realizó.
- Actualizar `PROJECT_CONTEXT.md` si el resultado confirma nuevas claves o políticas estables de retención.
- Registrar aquí el resultado real, comandos y limitaciones.
- Crear un commit enfocado en este worktree. No integrar, hacer push ni publicar desde el subagente.

F04 queda cerrado cuando una persona puede deshacer errores inmediatos, recuperar semestres eliminados y volver a un estado anterior después de una importación o reinicio sin perder el estado vigente si la restauración falla.

## Resultado de implementación

- Se incorporó `app/personal-data-recovery.mjs`, un contrato puro y versionado que normaliza, depura por vencimiento y limita instantáneas y papelera sin incorporar esos datos a las exportaciones v3.
- La interfaz conserva hasta 20 estados de sesión para deshacer cambios de avance y del planificador; el atajo Ctrl/Cmd+Z excluye campos editables y modales.
- `Datos` contiene una sección plegada de recuperación con región de aviso accesible, instantáneas, papelera y confirmaciones propias para acciones irreversibles; al cerrar una confirmación, el foco vuelve al control que la abrió.
- Antes de migrar, importar, restaurar o reiniciar se crea una instantánea preventiva validada. Restaurar un semestre respeta el contexto y posición; si era el término activo, vuelve a serlo. Las materias ya asignadas se omiten y se informan.

## Verificación realizada

- `node --test tests/personal-data-recovery.test.mjs tests/personal-data-recovery-session.test.mjs tests/personal-data-recovery-ui.test.mjs`
- `npm test`
- `npm run lint`
- `npm run security:repo`
- `git diff --check`

La comprobación funcional local verificó que la aplicación carga y expone la sección plegada de recuperación en `Datos`. No se hizo una eliminación ni restauración sobre datos existentes durante esa revisión.

## Corrección posterior a revisión

- Los checkpoints de deshacer ahora incluyen tanto el estado personal como el almacén de recuperación, por lo que deshacer una eliminación o una restauración mantiene la papelera consistente sin crear un paso recursivo.
- Las instantáneas y operaciones de papelera reconstruyen el documento vigente de forma síncrona desde el estado actual mediante `appStateToPersonalData`, conservando la metadata del documento anterior.
- Las operaciones que requieren una copia previa escriben la recuperación validada antes de mutar el estado; un fallo de cuota o bloqueo cancela la operación y no depende del efecto de React. El efecto evita repetir una escritura ya confirmada.
- La restauración de una instantánea carga un catálogo compatible y usa exactamente ese catálogo para validar y adaptar el documento.
- Se añadieron pruebas deterministas del stack de deshacer, papelera incluida, límite de 20, atajo en campos/modales y fallo de persistencia antes de importar o reiniciar. El renombrado del semestre agrupa los cambios hasta perder el foco.
