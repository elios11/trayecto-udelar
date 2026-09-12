# Calendario personal — propuesta futura

## Estado y prioridad

Propuesta de producto solicitada el 12 de septiembre de 2026. No implementada y sin prioridad asignada. Este archivo conserva la idea fuera de la secuencia ejecutable de `docs/roadmaps/planificacion-y-cuentas.md`: no agrega nodos, cambia dependencias ni desplaza su próximo paso.

Es una funcionalidad nueva, no deuda técnica. Su implementación requiere una tarea expresamente autorizada y concretar los detalles pendientes indicados al final. Documentarla no autoriza servicios externos, integración, push ni publicación.

## Objetivo

Incorporar una solapa `Calendario` para organizar un calendario propio con clases y tareas personales, elegir materias según sus horarios y distinguir encuentros teóricos y prácticos. Debe acompañar la estética de Trayecto con una interfaz relativamente minimalista y respuestas visuales discretas.

## Contexto verificado

- `app/page.tsx` ofrece actualmente las vistas `Currícula` y `Planificador` mediante `AppMode`; no existe una vista de calendario.
- El planificador organiza materias en semestres; sus rangos personales opcionales no representan horarios de clases.
- P04, documentado en `docs/tasks/oferta-periodos.md`, aporta evidencia de oferta por período, procedencia y caducidad. No garantiza horarios semanales, grupos ni distinción teórico/práctico. Elegir una materia ofrecida no permite inventar su horario.
- El documento personal vigente es v4, con migración, exportación, recuperación y protección de concurrencia local. El calendario debe respetar esa frontera y no introducir otra fuente de verdad desconectada.

## Alcance solicitado

### Solapa y navegación

- Añadir `Calendario` junto a las vistas principales existentes, conservando el contexto académico al cambiar de vista.
- Mantener un estado vacío sencillo con acciones para agregar una materia o una tarea propia.
- Vincular una clase a una materia por su identidad académica, sin modificar progreso, créditos, historial ni inscripción institucional.

### Materias, clases y nombres

- Permitir organizar materias por horarios y distinguir `Teórico` y `Práctico` en cada encuentro.
- Una materia puede tener varios encuentros, incluidos teórico y práctico, sin duplicar su identidad académica ni sus créditos.
- Permitir nombres personalizados de los eventos. El nombre visible funciona como alias personal: el nombre y código oficiales de la materia siguen disponibles en el detalle.
- Permitir tareas propias sin materia asociada, con nombre editable y horario cuando corresponda. No crear materias ficticias en el catálogo para representarlas.
- Si se incorporan alternativas de grupos, elegir una alternativa no debe agregar automáticamente todos los grupos ni interpretarse como inscripción.

### Edición de horarios

- Ofrecer escritura manual de inicio y fin y un selector con intervalos elegibles de 15 o 30 minutos.
- El intervalo simplifica la entrada; no redondea silenciosamente horarios manuales válidos, por ejemplo 08:10.
- Usar formato de 24 horas y validar horarios imposibles o fin anterior al inicio. La especificación de implementación debe definir expresamente los encuentros que cruzan medianoche.
- Editar o eliminar un evento no debe borrar la materia del planificador ni su progreso.
- Usar fechas reales, clases recurrentes y tareas puntuales; no limitar el calendario a una semana tipo sin fechas.
- La primera versión permite cargar horarios manualmente. La selección de horarios institucionales queda para una etapa posterior y no bloquea el uso manual.

### Recurrencia y superposiciones

- Permitir repetir clases durante un rango de fechas explícito. Propuesta de detalle para implementar: repetición semanal por días elegidos, con fin de serie y excepciones para suspensiones o cambios puntuales.
- Distinguir al editar o eliminar entre una sola ocurrencia y toda la serie; conservar las excepciones al exportar y restaurar.
- Conservar las horas locales de las clases y una zona horaria explícita, con valor inicial propuesto `America/Montevideo`; no desplazar una clase inadvertidamente por la configuración de otro dispositivo.
- Mostrar avisos discretos cuando se superponen clases o tareas con duración, incluyendo las ocurrencias recurrentes. Permitir guardar ambas y explicar qué eventos coinciden.
- Dos eventos contiguos, donde uno termina cuando el otro comienza, no se consideran superpuestos. Un vencimiento sin duración, si se incorpora, no bloquea una franja horaria.
- La primera versión no busca automáticamente una combinación óptima ni impide planificar por conflictos.

## Diseño e interacción

- Reutilizar tipografía, espaciado, bordes, superficies y colores de los temas actuales, incluidos modo oscuro y accesibilidad cromática.
- Grilla y tarjetas con jerarquía sobria; evitar badges repetidos, sombras intensas y animaciones llamativas.
- Hovers discretos sobre elementos interactivos, con equivalentes de foco visibles. El detalle esencial y las acciones no pueden depender de hover.
- Mantener edición completa mediante formularios, teclado y tacto. Si se añade arrastre, debe ser una alternativa y no el único mecanismo.
- Resolver la lectura móvil sin comprimir siete columnas hasta hacer ilegibles los eventos; evaluar vista de día o agenda como representación adaptable, sin comprometer todavía nuevas vistas de producto.
- Respetar movimiento reducido y evitar que los cambios de tamaño o animación desplacen controles durante una interacción.

## Datos, procedencia y conservación

- Separar eventos personales de evidencia institucional. Los horarios cargados por la persona se identifican como personales, aunque enlacen una materia oficial.
- Un horario institucional seleccionable requiere fuente, período, sede y grupo/tipo inequívocos. La falta de información no significa que no exista una clase.
- Una actualización de horarios oficiales debe poder revisarse antes de cambiar una elección personal; conservar los nombres personalizados.
- Definir IDs estables para eventos y referencias a perfil, escenario y semestre cuando corresponda. No unir calendarios por nombre de materia o posición de semestre.
- Guardar y exportar los datos del calendario sin perder los datos personales existentes; incluirlos en recuperación y control de concurrencia. Validar también exportación desde memoria cuando falle el guardado.
- Antes de implementar, decidir si el contrato requiere nueva versión o una extensión compatible según `docs/personal-data-compatibility.md`; no fijar ahora una nueva clave ni versión por conveniencia.
- Los títulos de tareas son texto personal libre: limitar y validar su tamaño, tratarlos como texto, excluirlos de logs y fixtures públicos, y no sincronizarlos o compartirlos sin una decisión explícita. Esto no habilita notas extensas ni servicios de calendario externos.
- La funcionalidad debe ser útil sin cuenta; cualquier sincronización futura debe respetar el aislamiento por propietario.

## Relación con el roadmap

- Mantener esta propuesta fuera del orden aprobado hasta que se priorice expresamente.
- La base manual puede diseñarse con el catálogo y la persistencia existentes, sin esperar una cobertura institucional completa de horarios.
- Seleccionar horarios oficiales necesita ampliar y auditar el modelo de P04: una confirmación de oferta por semestre no basta.
- Si se decide un calendario por escenario, revisar primero el estado integrado de P03. No reconstruir funcionalidades pendientes dentro de esta tarea.
- La exportación a calendarios externos mencionada como opcional en el roadmap es un alcance distinto de esta solapa; no queda implementada ni autorizada por este documento.

## Decisiones confirmadas por el usuario

1. Calendario con fechas, clases recurrentes y tareas puntuales.
2. Avisos discretos de superposición, sin bloquear la planificación.
3. Carga manual en la primera versión; horarios institucionales en una etapa posterior.

Los detalles propuestos de recurrencia semanal, excepciones y zona horaria deben concretarse en la especificación ejecutable. También definir si las tareas son bloques horarios, vencimientos o ambos, y cómo se asocia el calendario con semestres/escenarios. Estas decisiones pendientes no impiden guardar esta propuesta ni alteran el roadmap actual.

## Ideas opcionales para una conversación posterior

No forman parte del alcance confirmado: duplicar bloques, ubicación/salón, colores personales moderados, marcar tareas completadas, agenda de vencimientos y exportación de eventos personales a un archivo de calendario. Recordatorios, notificaciones, conexión con Google/Apple y recomendación automática de combinaciones quedan fuera de la primera propuesta.

## Criterios para preparar la implementación

- Conservar las tres decisiones confirmadas y resolver los detalles pendientes antes de implementar.
- Comprobar en `main` la persistencia y las dependencias realmente disponibles al iniciar.
- Probar una materia con teórico y práctico, múltiples encuentros y alias, y una tarea independiente.
- Verificar entrada manual 08:10 y selectores de 15/30 minutos sin redondeo destructivo.
- Probar edición/eliminación sin alterar la planificación académica ni el progreso.
- Probar migración, ida y vuelta por exportación/importación, recuperación y escrituras concurrentes sin pérdida.
- Probar recurrencias y excepciones, límites de fecha, superposiciones y eventos contiguos. La futura selección de horarios oficiales requiere pruebas adicionales de identidad, fuente y vigencia.
- Ejecutar `npm test`, `npm run lint` y QA funcional de escritorio, móvil, teclado y tacto antes de cerrar la futura implementación.

## Entrega documental

Se creó únicamente esta propuesta en un worktree independiente. El roadmap y `PROJECT_CONTEXT.md` mantienen su contenido. La revisión de esta entrega es documental; no se afirma implementación ni validación visual del calendario.
