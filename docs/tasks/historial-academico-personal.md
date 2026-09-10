# P02 — Historial académico personal

## Estado

Integrada y validada en `main` después de C04 y P01. Este nodo incorpora un historial personal trazable y una evolución explícita del contrato portable. No agrega cuentas, sincronización, notas, calificaciones ni datos oficiales nuevos.

## Objetivo

Permitir que una persona registre y corrija los hitos académicos de una unidad curricular sin confundir cursado aprobado, examen aprobado y acreditación con el estado actual que usa Trayecto para previas y créditos. El cálculo visible debe seguir dando exactamente el mismo resultado que antes para el mismo conjunto de estados `pending`, `approved` y `exonerated`.

## Decisiones de producto

- El historial es información personal, nunca una modificación de la currícula oficial.
- `approved` conserva su semántica actual: curso aprobado, útil para requisitos de curso pero sin sumar créditos. `exonerated` conserva la semántica acreditable actual: unidad completada por exoneración, examen u otra acreditación y suma su carga publicada.
- Los tipos de hito visibles son `curso aprobado`, `exoneración`, `examen aprobado` y `acreditación`. Los tres últimos producen estado acreditable `exonerated`; no se intenta inferir cuál ocurrió al migrar datos antiguos.
- Un dato heredado se representa como un hito de origen `migración`, con resultado equivalente y fecha académica desconocida. No se inventan fecha, nota, período, docente, acta ni forma de aprobación.
- Corregir un hito conserva trazabilidad mediante una nueva revisión que referencia al hito anterior. Eliminarlo crea una anulación personal; no borra ni altera la materia oficial. La UI debe permitir restaurar o volver a corregir sin depender de la papelera local de semestres.
- La proyección actual se obtiene de los hitos efectivos en orden determinista. Si no queda ninguno, el estado es `pending`. No se permite que historial y estado actual discrepen al persistir o importar.
- La identidad de un hito está acotada al perfil personal. Una misma materia institucional puede aparecer en carreras o perfiles distintos sin colisión ni invalidar una exportación.
- El historial no se comparte automáticamente entre perfiles sólo porque coincidan `courseId`. Si dos perfiles comparten expresamente el mismo `progressPlanId`, comparten también la misma secuencia académica materializada para ese progreso canónico.
- Los hitos sobreviven aunque la materia quede retirada o huérfana por una revisión curricular; siguen sin acreditar automáticamente otra materia.

## Evolución del contrato portable

P02 introduce `trayecto-personal-data` `formatVersion: 4`, porque el historial pasa a ser semántica obligatoria y no corresponde ocultarlo en `extensions`.

El contrato v4 debe:

- conservar todos los campos, revisiones concurrentes, referencias curriculares y `extensions` de v3;
- añadir a cada perfil una colección de historial académico validada y normalizada;
- mantener `progress` como proyección materializada para lectura rápida y compatibilidad interna, pero reconstruirla y verificarla desde el historial antes de escribir;
- migrar v3 → v4 sin pérdida y de forma idempotente;
- aceptar importaciones completas v1, v2 y v3 por la ruta migratoria existente;
- clasificar v4 como compatible y versiones mayores como futuras protegidas;
- impedir que un cliente que sólo comprende v3 sobrescriba un v4;
- preservar bolsas `extensions` desconocidas en documento, perfil y nodos existentes o nuevos;
- incluir el historial en exportaciones completas, instantáneas y conflictos locales; el formato separado del planificador permanece sin historial y sin cambio de versión.

Modelo mínimo recomendado por hito efectivo:

- `id`: string estable y no vacío, único dentro del perfil;
- `courseId`: string institucional dentro del `progressPlanId` del perfil;
- `kind`: `course-passed | exemption | exam-passed | accreditation | recorded-status`;
- `resultStatus`: `approved | exonerated` y coherente con `kind`;
- `occurredAt`: fecha ISO opcional o `null`, elegida por la persona; no controla por sí sola el orden lógico;
- `recordedAt`: fecha ISO obligatoria de registro;
- `revision`: entero positivo;
- `supersedesEventId`: ID previo o `null`;
- `voided`: booleano para una anulación explícita;
- `source`: `user | migration | import`;
- `extensions`: bolsa opcional con namespace según la política de C04.

El implementador puede ajustar nombres o separar revisiones de eventos si obtiene un contrato más simple, siempre que mantenga estas invariantes:

1. no existen IDs ambiguos dentro de un perfil;
2. las referencias de corrección no forman ciclos ni atraviesan perfil o materia;
3. cada cadena posee una única revisión terminal;
4. la proyección elige la última revisión terminal no anulada por orden lógico (`recordedAt`, revisión e ID como desempate estable);
5. `course-passed` sólo proyecta `approved` y los hitos acreditables sólo proyectan `exonerated`;
6. ninguna fecha desconocida se completa automáticamente;
7. serializar, parsear y volver a serializar es semánticamente idempotente.

## Migración y compatibilidad

- Cada entrada v3 `progress` distinta de `pending` genera exactamente un antecedente `recorded-status` determinista. Debe reutilizar `updatedAt` sólo cuando sea una fecha válida; de lo contrario `occurredAt` queda `null`.
- `pending` no genera un falso acontecimiento histórico.
- Cuando varios perfiles comparten `progressPlanId`, la migración produce una historia canónica equivalente y no duplica hitos al reejecutarse.
- La adaptación documento ↔ estado React debe transportar el historial de todos los perfiles y escenarios sin reconstruir ni sobrescribir perfiles no activos.
- Una importación con historial inválido se rechaza antes de mutar memoria o almacenamiento. Una importación histórica válida conserva materias fuera del catálogo con la misma política de C04.
- Restaurar una instantánea v3 la migra a v4; restaurar v4 conserva su historial. Las claves heredadas pueden mantener escritura dual de estados, pero nunca se convierten en fuente autoritativa sobre un v4 válido.
- Los conflictos entre pestañas conservan ambas ramas completas, incluyendo sus historias. P02 no intenta fusionar eventos concurrentes.

## Derivación de estado

Crear un módulo puro, importable por Node y React, que concentre al menos:

- validación y normalización de hitos;
- migración determinista desde `progress` heredado;
- derivación `courseId → CourseStatus`;
- agregado de un hito de usuario;
- corrección mediante nueva revisión;
- anulación y restauración trazables;
- consulta cronológica de la historia efectiva y sus revisiones.

`app/page.tsx` debe consumir esa API; no debe duplicar reglas de proyección. Los cálculos de créditos, horas, requisitos y títulos continúan leyendo el mismo mapa de estados derivado.

## Interfaz

- Mantener el ciclo rápido de estado existente en cada tarjeta. Cada cambio crea el hito mínimo coherente y conserva deshacer de sesión.
- En el panel de detalle de una materia, agregar una sección plegable `Historial personal`, cerrada por defecto.
- Mostrar el estado actual y una lista breve, en español, con tipo de hito, fecha académica si existe y si fue corregido o anulado. No presentar `recorded-status` como un dato más preciso de lo que es: usar `Estado importado, sin fecha`.
- Permitir agregar un hito eligiendo tipo y fecha opcional, corregir el último hito efectivo y anular/restaurar una revisión con confirmación comprensible.
- No solicitar ni guardar calificaciones en este incremento.
- Los cambios deben funcionar con teclado y tacto, anunciarse en la región accesible existente y devolver el foco de forma predecible.
- En materias huérfanas, el historial debe seguir disponible desde `Datos` o la superficie histórica ya existente aunque no haya tarjeta curricular activa.
- Todo texto aclara que el registro es personal y está guardado en este dispositivo; no aparenta ser una escolaridad oficial.

## Pruebas obligatorias

- Contrato v4 mínimo/completo, extensiones, errores múltiples, IDs duplicados por perfil y el mismo ID permitido en perfiles distintos.
- Reglas de tipos y resultados, referencias, ciclos, revisiones terminales, desempates y fechas nulas.
- Derivación de `pending`, `approved` y `exonerated`; anular/restaurar/corregir vuelve siempre a una proyección determinista.
- Migración v3 → v4 idempotente, incluidos perfiles con `progressPlanId` compartido, `updatedAt: null` y materias huérfanas.
- Importación v1/v2/v3/v4, rechazo atómico de v4 inválido y protección de una versión futura.
- Round trip documento → estado → documento conserva historial, perfiles no activos, escenarios, revisiones curriculares y extensiones.
- Exportación completa, instantáneas y conflictos conservan v4; el intercambio separado del planificador no cambia.
- Para un fixture representativo, créditos, horas, aprobaciones de grupo, previas y títulos son idénticos antes y después de migrar.
- Pruebas de integración/documentales de la UI: sección plegable, textos de origen migrado, controles accesibles y ausencia de campos de nota.

## Límites

- No agregar dependencias, servicios externos, cuentas, base de datos, telemetría o cookies.
- No importar escolaridades ni consultar autenticación institucional.
- No cambiar definiciones curriculares, créditos, áreas, previaturas ni fuentes oficiales.
- No implementar escenarios nuevos, línea temporal global, oferta por período, alertas curriculares ni sincronización.
- No exponer el historial en enlaces públicos ni archivos del planificador.

## Verificación y cierre

- Ejecutar pruebas estrechas durante el desarrollo.
- Antes del commit ejecutar `npm test`, `npm run lint`, `npm run security:repo` y `git diff --check`.
- Realizar validación funcional disponible del panel de una materia; no declarar QA visual si sólo se compiló.
- Actualizar `PROJECT_CONTEXT.md` con v4 y la política estable del historial en el mismo commit.
- Registrar en este archivo el resultado real, comandos, artefactos y cualquier limitación pendiente.
- Crear un único commit enfocado en este worktree. No integrar, hacer push ni publicar desde el subagente.

P02 queda cerrado cuando un historial personal v4 puede migrarse, editarse, corregirse, anularse, exportarse y restaurarse sin cambiar el resultado académico que producía el mismo estado en v3 y sin confundirlo con la currícula o una escolaridad oficial.

## Resultado de implementación

- Se agregó el contrato portable v4 con `academicHistory` obligatorio por perfil, validación acumulativa de eventos y referencias, proyección determinista a `progress`, extensiones con namespace y protección de versiones futuras.
- La migración v3 → v4 es pura e idempotente, conserva estados, fechas heredadas válidas, perfiles articulados, materias huérfanas, escenarios, revisiones curriculares y extensiones; no crea fecha académica para datos sin fecha.
- La hidratación, exportación completa, recuperación, conflictos locales, huella de estado y frontera documento ↔ React transportan v4. La clave v3 queda como fuente migratoria y el intercambio separado del planificador permanece en v1 sin historial.
- El detalle de materia incorpora una sección plegable y accesible para agregar hitos, corregir la revisión vigente, anularla y restaurarla mediante el diálogo modal existente. La interfaz distingue el registro personal de la currícula oficial, muestra origen migrado y no incluye calificaciones.
- La importación completa v4 inválida se rechaza atómicamente con sus errores de contrato antes de cualquier aplicación de estado.

## Continuidad y reanudación

Último bloque coherente terminado: implementación, documentación y verificaciones de P02 completas; no quedan archivos funcionales pendientes dentro del nodo.

- Pruebas focales: `node --test tests/academic-history.test.mjs tests/personal-data-v4.test.mjs tests/personal-data-migration.test.mjs tests/personal-data-evolution.test.mjs tests/personal-data-recovery.test.mjs tests/local-data-concurrency.test.mjs` — 47/47.
- Suite global: `npm test` — build correcto y 849/849 pruebas.
- Calidad: `npm run lint`, `npm run security:repo` y `git diff --check` — correctos.
- QA funcional: en la aplicación local se abrió una materia, se verificó que el historial iniciara plegado y se ejercitaron agregar, corregir, anular y restaurar. Los dos cambios destructivos pasaron por el diálogo modal accesible; el estado y los créditos siguieron la proyección y no hubo errores de consola. El navegador embebido aislado no permitió verificar de forma fiable el valor del control nativo de fecha ni la persistencia tras recarga; ambos recorridos quedan cubiertos por pruebas puras de fechas, migración, hidratación, serialización y round-trip. No se realizó una revisión visual pixel a pixel ni de breakpoints.
- Integración serial: el coordinador revisó e integró P02 sobre el `main` más reciente y repitió `npm test` (849/849), `npm run lint`, `npm run security:repo` y `git diff --check`, todos correctos.
- Reanudación exacta: revisar `git status --short` y `docs/roadmaps/planificacion-y-cuentas.md`; el próximo nodo secuencial es P04. No hacer push ni publicar sin autorización explícita.

P02 está cerrado. No reabrirlo al iniciar P04 salvo que una regresión verificada lo exija.
