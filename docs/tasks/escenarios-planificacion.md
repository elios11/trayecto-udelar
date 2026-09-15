# P03 — Escenarios de planificación

## Estado

Especificación lista para implementación sobre el `main` posterior a P04. C02 ya garantiza que los escenarios activos, no activos y archivados sobrevivan al transporte entre el documento personal v4 y el estado de la aplicación. P03 agrega las operaciones de dominio y la superficie visible para administrarlos; no modifica el formato portable ni incorpora cuentas.

## Objetivo

Permitir que una persona mantenga alternativas reales de su planificación —por ejemplo una carga más liviana y otra más intensa— sin alterar el escenario principal, perder semestres ni confundir una decisión personal con una trayectoria oficial de la carrera.

## Principios de producto

- Un escenario pertenece a un perfil académico personal. No es una sede, orientación, trayectoria sugerida, mención ni versión curricular.
- El progreso y el historial académico pertenecen al perfil y se comparten entre sus escenarios. Sólo la distribución futura de materias, los semestres y sus objetivos de carga cambian entre alternativas.
- Cambiar de escenario no cambia facultad, carrera, plan, sede, trayectoria ni credencial seleccionadas.
- Todas las operaciones se guardan mediante el documento canónico local v4 y participan de las garantías actuales de concurrencia, exportación y diagnóstico. No crear una clave paralela de `localStorage`.
- No estimar duración de egreso, oferta, horarios ni cumplimiento futuro cuando falten fechas o evidencia. La comparación describe diferencias observables y mantiene prudencia académica.

## Operaciones de dominio

Crear un módulo puro, importable por Node y por la aplicación, que opere sobre un perfil o su bloque `planning`. Las funciones deben devolver un resultado explícito con el documento/planificación nuevo o un código de error comprensible, sin mutar el argumento original.

### Crear y duplicar

- `Nuevo escenario` parte de una planificación mínima coherente con el comportamiento actual del planificador. Debe tener al menos un semestre y no copiar materias silenciosamente.
- `Duplicar escenario` copia nombre como base, semestres, orden, estados, fechas opcionales, materias, objetivos de carga y extensiones compatibles.
- El escenario duplicado recibe un ID nuevo y estable. Sus semestres también reciben IDs nuevos para evitar colisiones futuras entre recuperación, sincronización y calendario; el generador de IDs y la fecha se inyectan para pruebas deterministas.
- El duplicado nunca se vuelve principal automáticamente. Puede pasar a ser el escenario activo después de crearse.
- Los nombres sugeridos (`Copia de …`) se desambiguan de forma determinista, pero la persona puede editarlos antes o después de crear.

### Cambiar y renombrar

- Cambiar de escenario debe confirmar primero el estado vigente del escenario editado en el documento canónico y después hidratar el elegido. Nunca reconstruirlo desde el escenario principal.
- Sólo se pueden activar escenarios no archivados.
- El nombre se recorta, no puede quedar vacío y debe tener un límite razonable documentado y probado. Los nombres se tratan siempre como texto; no se interpretan como HTML ni como identificadores.
- Se permiten nombres repetidos porque la identidad es el ID. La UI debe diferenciarlos cuando sea necesario mediante estado principal/archivado, no inventando identidad por texto.

### Principal y archivo

- `Hacer principal` marca exactamente un escenario como principal y desmarca el anterior de forma atómica. También lo deja no archivado; no debe cambiar las materias ni volverlo activo si la persona sólo confirmó la promoción, salvo que la interfaz lo comunique explícitamente.
- Un escenario principal no puede archivarse hasta promover otro. Un escenario activo tampoco puede archivarse: la interfaz debe pedir primero cambiar a otro, evitando una selección implícita que pueda sorprender.
- Archivar es reversible y conserva íntegros términos, IDs, extensiones y fechas. Restaurar devuelve el escenario a la lista disponible sin convertirlo en principal ni activo automáticamente.
- P03 no elimina escenarios definitivamente. El borrado y su política de recuperación requieren un alcance separado.
- Documentos v4 válidos heredados que no tengan principal no se rechazan ni se reescriben al leerlos. Las operaciones nuevas deben mantener una situación válida y la UI puede ofrecer `Hacer principal`; no endurecer el parser v4 de forma incompatible.

## Comparación

- Permitir comparar el escenario activo con otro escenario del mismo perfil, incluido uno archivado.
- Mostrar como mínimo: cantidad de semestres, materias únicas y compartidas, materias presentes sólo en cada alternativa, carga conocida total y por semestre, y cambios de ubicación de una materia entre períodos.
- Para planes por créditos, horas o cantidad de materias, usar la unidad publicada por el perfil. Si alguna carga no está publicada, marcar el total como parcial en vez de convertirla en cero.
- Comparar semestres por sus datos observables. Fechas completas pueden alinear períodos equivalentes; sin fechas, usar la posición únicamente como presentación y aclarar que no equivale a un período institucional.
- No declarar un escenario “mejor”, “más rápido” o “válido”. Reutilizar las advertencias P01 para cada alternativa sólo cuando puedan calcularse con datos conocidos, sin bloquear la planificación.
- La comparación no modifica ninguno de los escenarios y debe recalcularse de manera pura y determinista.

## Interfaz

- Incorporar un selector compacto de escenario dentro del encabezado del planificador, cerca del nombre y resumen de planificación, sin agregar una nueva navegación global.
- El selector muestra nombre, estado `Principal` cuando corresponda y acciones accesibles para crear, duplicar, renombrar, hacer principal, archivar/restaurar y comparar.
- Los archivados permanecen ocultos de la lista principal por defecto, con un control explícito para verlos. No usar solamente color o iconos para comunicar estado.
- La comparación puede abrirse en un panel o modal adaptado a escritorio y móvil. Debe tener título, nombres de ambas alternativas, cierre visible, cierre con `Escape`, foco administrado y lectura comprensible sin arrastre.
- Las acciones que cambian principal o archivan requieren una confirmación propia cuando alteren el estado global del perfil. No usar `alert`/`confirm` del navegador.
- Mantener las vistas Tablero, Compacta y Carga, el catálogo minimizable, el arrastre, tacto, teclado, temas, modo daltónico y `prefers-reduced-motion`.
- El escenario activo debe ser reconocible aun con el selector cerrado. Evitar llenar cada semestre o materia con badges repetidos.

## Persistencia, importación y recuperación

- Mantener `trayecto-personal-data` v4. Los campos `planning.activeScenarioId`, `scenarios[].id`, `name`, `isPrimary`, `archived`, fechas y términos ya expresan P03.
- La exportación completa v4 incluye todos los escenarios, activos y archivados. La importación completa conserva exactamente su identidad y estado cuando es válida.
- El archivo separado del planificador continúa en v1 y representa únicamente el escenario activo, como hasta ahora. Exportarlo no filtra ni modifica el documento completo.
- Importar un planificador v1 sustituye sólo el contenido del escenario activo después de la confirmación existente; no borra, fusiona ni renombra los demás escenarios.
- Las acciones deben integrarse con el guardado, fingerprint, conflictos entre pestañas y estado de error actuales. Una escritura fallida no puede dejar la UI afirmando que el cambio quedó guardado.
- Antes de una operación estructural confirmada, usar la recuperación local existente cuando corresponda; no duplicar el almacén ni reducir sus límites. Archivar y restaurar escenarios siguen siendo reversibles por su propio estado.
- La papelera de semestres conserva `scenarioId`: un semestre sólo puede restaurarse en su escenario original. Archivar el escenario no reasigna ni invalida esa entrada.

## Casos límite

- Perfil sin escenarios: crear el primero como principal y activo.
- Documento válido con escenarios pero sin principal: permitir uso y promoción explícita sin migración destructiva.
- Dos escenarios con el mismo nombre: conservar ambos y operar exclusivamente por ID.
- Escenario archivado que era referencia de una papelera: conservar la referencia y explicar por qué todavía no puede restaurarse el semestre.
- Cambio de carrera o perfil con un selector abierto: cerrar la superficie y resolver escenarios sólo dentro del nuevo perfil.
- Cambio entre escenarios durante una escritura pendiente o fallida: no perder la edición visible ni sobrescribir el destino.
- Materia acreditada después de duplicar: el progreso compartido se refleja en ambos escenarios, pero sus distribuciones no se reescriben automáticamente.
- Materia presente en semestres distintos o repetida por un archivo importado inconsistente: la comparación informa la anomalía sin descartar datos.

## Pruebas obligatorias

- Operaciones puras e inmutables para crear, duplicar, renombrar, activar, promover, archivar y restaurar.
- IDs deterministas en pruebas, ausencia de colisiones y preservación de extensiones, fechas, objetivos y orden.
- Promoción atómica con exactamente un principal; rechazo de activar un archivado o archivar el activo/principal.
- Comparación de materias comunes, exclusivas y movidas; carga completa, parcial y planes medidos en créditos, horas o materias.
- Round-trip documento v4 → estado → edición del escenario activo → v4 sin alterar escenarios no activos o archivados.
- Exportación completa conserva todos los escenarios; exportación/importación del planificador v1 afecta únicamente el activo.
- Papelera restaura por `profileId` y `scenarioId` sin caer en otro escenario.
- Concurrencia: una operación sobre escenarios no pisa una revisión externa y el conflicto conserva ambas ramas.
- Integración UI: selector, lista archivada, nombres y estados textuales, confirmaciones propias, comparación, teclado, foco y textos prudentes.
- Regresión: progreso, historial P02, objetivos/advertencias P01, oferta P04, créditos, previas y selección académica no cambian por alternar escenarios.

## Límites

- No agregar cuentas, base de datos, sincronización remota, enlaces compartibles, colaboración, notas, calendario, recordatorios, telemetría ni servicios externos.
- No cambiar currículas, trayectorias oficiales, sedes, perfiles académicos, oferta o reglas de previaturas.
- No implementar predicción de egreso, recomendador automático, optimización de carga ni validación institucional de una planificación.
- No agregar dependencias de producción ni cambiar identidad visual o metadatos.

## Verificación y cierre

- Ejecutar pruebas estrechas durante el desarrollo.
- Antes del commit ejecutar `npm test`, `npm run lint`, `npm run security:repo` y `git diff --check`.
- Hacer QA funcional en escritorio y móvil del cambio de escenario, duplicado, promoción, archivo/restauración y comparación. Declarar cualquier flujo no comprobado.
- Actualizar `PROJECT_CONTEXT.md` únicamente con las decisiones transversales confirmadas sobre escenarios y persistencia.
- Registrar debajo el resultado real, comandos, limitaciones y reanudación.
- Crear un único commit enfocado en el worktree. No integrar, hacer push ni publicar desde el subagente.

P03 queda cerrado cuando una persona puede mantener, alternar y comparar escenarios sin pérdida, elegir explícitamente uno principal, archivar alternativas reversiblemente y transferir el documento completo conservando todas sus identidades.

## Continuidad y reanudación

Especificación lista. Próximo paso: crear un worktree basado en el `main` que contiene este archivo, implementar P03 con `gpt-5.6-sol` y esfuerzo `high`, validar y devolver un commit aislado. No iniciar P05 hasta revisar e integrar o descartar explícitamente P03.
