# P05 — Línea temporal e hitos

## Estado

Implementado, validado e integrado en `main`. Este nodo agrega una lectura temporal del historial y del escenario activo; no cambia el contrato personal v4, no inventa fechas y no incorpora cuentas ni servicios externos.

## Objetivo

Dar a la persona una vista comprensible de lo que ya cursó, lo que está cursando y lo que planea, junto con títulos intermedios y requisitos relevantes que pueda verificar Trayecto. La vista debe ayudar a orientarse a largo plazo sin presentarse como una escolaridad oficial ni prometer una fecha de egreso.

## Principios de producto

- La línea temporal es una proyección de datos existentes: historial personal P02, progreso derivado, escenario activo P03 y requisitos curriculares publicados. No crea una segunda fuente de verdad.
- Los acontecimientos académicos reales y la planificación futura se distinguen siempre por texto, forma y semántica; no sólo por color.
- Una fecha desconocida permanece desconocida. El orden de registro, la posición de un semestre o la duración publicada del plan no se convierten en fecha académica.
- Los períodos planificados pertenecen exclusivamente al escenario activo. Cambiar de escenario recalcula la vista sin modificar historial, progreso ni otros escenarios.
- Los hitos de títulos y requisitos provienen de credenciales y reglas curriculares auditadas. La interfaz sólo afirma `Alcanzado` cuando el progreso actual satisface la regla; para el futuro usa `Planificado` o `No evaluable`, nunca `vas a obtener`.
- Debe funcionar en planes medidos en créditos, horas o cantidad de materias, y también cuando parte de la carga o de los requisitos no esté publicada.

## Proyección de dominio

Crear un módulo puro, importable por Node y React, que produzca una secuencia estable sin mutar sus entradas.

### Períodos

- Proyectar semestres personales con estado `closed`, `in-progress` o `planned`, preservando etiqueta, IDs, fechas opcionales, materias y unidad de carga.
- Un período con `startsAt`/`endsAt` válidos se ordena cronológicamente. Sin fechas, conserva el orden del escenario y se muestra como `Período sin fecha` o con su etiqueta personal, sin alinearlo con un semestre institucional.
- Si las fechas se superponen o contradicen el estado, conservar los datos y devolver una advertencia descriptiva; no corregirlos silenciosamente.
- Los hitos efectivos del historial con `occurredAt` válido se ubican en el período que los contiene. Los hitos sin fecha aparecen en una sección `Fecha no registrada`, no en el semestre del planificador por coincidencia de materia.
- Una materia acreditada que también está planificada se presenta como advertencia existente de P01; no se elimina automáticamente de la planificación.
- La carga acumulada sólo se muestra cuando sus unidades son compatibles. Valores desconocidos producen totales parciales y nunca cuentan como cero.

### Hitos curriculares

- Derivar hitos desde las credenciales publicadas: título principal, títulos intermedios, constancias o actividades nominales cuando estén modeladas como requisito verificable.
- Evaluar con las mismas funciones usadas actualmente por las metas de créditos y títulos; no duplicar ni reinterpretar reglas en la UI.
- Estados mínimos: `alcanzado`, `en progreso`, `planificado`, `pendiente` y `no evaluable`. `En progreso` y `planificado` son descripciones personales, no certificaciones.
- Un hito alcanzado se ubica en la fecha del último evento necesario sólo cuando todas las evidencias relevantes tienen fecha académica. En otro caso se muestra sin fecha exacta.
- Un hito futuro puede asociarse al primer período planificado que, acumulado con el progreso actual, satisfaga todos los requisitos conocidos. Debe rotularse como estimación del escenario y ocultarse si hay requisitos desconocidos, cargas incompatibles o información insuficiente.
- No convertir la duración nominal, la oferta habitual ni la cantidad de semestres en una fecha estimada de egreso.

## Interfaz

- Añadir una vista o panel `Línea temporal` dentro del planificador, sin crear otra navegación global.
- Mostrar una secuencia vertical en móvil y una disposición horizontal sólo cuando exista ancho suficiente y no requiera desplazamiento lateral provocado por la rueda vertical.
- Cada período resume estado, rango de fechas si existe, materias y carga conocida. El detalle se expande de forma accesible y no replica todas las tarjetas completas de materias.
- Distinguir visualmente y con etiquetas: `Completado`, `En curso`, `Planificado`, `Sin fecha` y `Hito curricular`.
- Mostrar el nombre del escenario activo y aclarar que los períodos futuros corresponden a esa alternativa. El historial pasado permanece compartido por el perfil.
- Permitir saltar desde un período a su semestre en el planificador y desde una materia a su detalle cuando el elemento siga disponible en la currícula activa.
- La sección debe poder minimizarse; esa preferencia visual se guarda localmente como preferencia, no dentro del documento personal.
- Mantener teclado, tacto, foco visible, lectores de pantalla, temas, modo daltónico y `prefers-reduced-motion`. El orden de lectura debe coincidir con el orden temporal mostrado.

## Persistencia y compatibilidad

- No elevar `formatVersion: 4`: períodos, estados, fechas, historial y escenarios ya están representados.
- No guardar la proyección temporal ni el estado calculado de hitos; deben recalcularse desde el documento y la currícula vigente.
- Exportación completa, importación, instantáneas, conflictos y planificador v1 conservan su comportamiento actual.
- Currículas retiradas o materias huérfanas mantienen los acontecimientos personales visibles con la política de C04, aunque no exista enlace a una tarjeta actual.
- Una revisión curricular puede cambiar la evaluación actual de requisitos; P05 muestra la referencia curricular utilizada y deja las alertas comparativas para P06.

## Casos límite

- Perfil sin historial y escenario vacío: estado vacío útil, sin falsa fecha de inicio.
- Historial con eventos efectivos sin `occurredAt`: sección sin fecha, orden estable y texto prudente.
- Escenario sin fechas, con fechas parciales, invertidas o solapadas.
- Plan por horas o materias, plan sin carga total publicada y mezcla de materias con carga desconocida.
- Dos escenarios con períodos diferentes: la vista cambia sólo la parte futura y conserva el pasado compartido.
- Credencial sin regla suficiente, requisito nominal no cuantificable o actividad obligatoria externa: `No evaluable` con explicación.
- Hito intermedio y título final alcanzados en el mismo acontecimiento: conservar ambos sin presentarlos como duplicados.
- Materia o currícula huérfana: conservar nombre/ID disponible y evitar enlaces rotos.

## Pruebas obligatorias

- Proyección pura e inmutable de períodos fechados y sin fecha, con orden y advertencias deterministas.
- Ubicación de eventos históricos dentro y fuera de períodos; los eventos sin fecha nunca se asignan por inferencia.
- Estados `closed`, `in-progress` y `planned`, incluidas fechas contradictorias y solapamientos.
- Carga completa y parcial para créditos, horas y materias; nunca sumar unidades incompatibles.
- Hitos alcanzados, planificados, pendientes y no evaluables reutilizando las reglas curriculares existentes.
- Ausencia de fecha estimada cuando falten fechas o requisitos; ninguna derivación desde duración nominal.
- Cambio de escenario conserva el pasado y recalcula solamente la planificación futura.
- Materias retiradas, perfiles sin datos y credenciales múltiples/intermedias.
- Integración UI: panel minimizable, etiquetas no cromáticas, escenario visible, navegación por teclado, foco y estructura móvil.
- Regresión: escenarios P03, historial P02, carga P01, oferta P04, exportaciones, recuperación, concurrencia y selección académica permanecen intactos.

## Límites

- No agregar calendario externo, recordatorios, notificaciones, cuentas, sincronización, enlaces compartibles, analítica ni dependencias de producción.
- No predecir egreso, aprobación, oferta futura, duración real ni resultado de materias.
- No modificar currículas, períodos oficiales, progreso, historial o escenarios desde la proyección.
- No incorporar edición masiva de fechas; se reutilizan los controles ya disponibles.
- No implementar alertas de cambios curriculares P06.

## Verificación y cierre

- Ejecutar pruebas estrechas durante el desarrollo.
- Antes del commit ejecutar `npm test`, `npm run lint`, `npm run security:repo` y `git diff --check`.
- Hacer QA funcional en escritorio y móvil con un perfil sin fechas, otro con historial fechado y al menos dos escenarios. Declarar los recorridos no comprobados.
- Actualizar `PROJECT_CONTEXT.md` sólo si la implementación confirma una convención transversal nueva.
- Registrar en este archivo resultado, comandos, limitaciones y reanudación.
- Crear un único commit enfocado en el worktree. No integrar, hacer push ni publicar desde el subagente.

P05 queda cerrado cuando la persona puede leer pasado, presente y planificación futura del escenario activo, junto con hitos verificables, sin que la aplicación invente fechas, requisitos o certezas académicas.

## Resultado de implementación

- Se agregó `app/planning-timeline.mjs`, una proyección pura e inmutable que ordena períodos fechados, conserva el orden personal de los no fechados, calcula carga completa o parcial y advierte fechas inválidas, invertidas o superpuestas sin corregirlas.
- Los acontecimientos efectivos del historial se separan entre los que pertenecen a un período, los fechados fuera de los rangos del escenario y los que realmente carecen de fecha. Ninguna materia se usa para inventar una asignación temporal.
- El planificador incorpora un panel minimizable con el escenario activo, estados textuales, períodos, materias, hitos personales y credenciales curriculares. Los saltos a semestre y detalle reutilizan las superficies existentes.
- Los hitos alcanzados se evalúan con el progreso actual. Una proyección futura sólo aparece cuando las materias planificadas satisfacen todos los requisitos modelados; requisitos incompletos o no modelados quedan como `No evaluable` y nunca producen fecha de egreso.
- El estado abierto/cerrado del panel se guarda como preferencia visual local. El documento personal continúa en v4 y el intercambio del planificador permanece en v1.

## Verificación y continuidad

- Pruebas focales finales: `node --test tests/planning-timeline.test.mjs tests/planning-timeline-ui.test.mjs` — 11/11.
- Suite global: `npm test` — build correcto y 892/892 pruebas aprobadas.
- Calidad: `npm run lint`, `npm run security:repo` y `git diff --check` — correctos.
- QA funcional de escritorio: se abrió el planificador local, se verificaron escenario, períodos, estados e hitos; el panel se minimizó, se recargó la aplicación y la preferencia permaneció cerrada; después volvió a expandirse correctamente. La automatización disponible no permitió fijar un viewport móvil real, por lo que la adaptación móvil se verificó mediante las reglas responsive y las pruebas estructurales, no como revisión visual pixel a pixel.
- Revisión del coordinador: se corrigió la clasificación de hitos fechados fuera de períodos, la visibilidad de credenciales cuando no existen semestres y la aceptación de fechas calendario imposibles; se agregaron casos de regresión para superposición y estado vacío.
- Riesgo residual: la evaluación futura es deliberadamente conservadora. Una currícula con requisitos no modelados no proyecta el hito, aunque la persona pueda cumplirlo en la realidad.
- Integración final: el coordinador integró P05 sobre el `main` más reciente y repitió `npm test` (893/893), `npm run lint`, `npm run security:repo` y `git diff --check`, todos correctos junto con la depuración estricta del catálogo.
- Próximo paso: P06, alertas por cambios curriculares. No reabrir P05 salvo que aparezca una regresión verificada.
