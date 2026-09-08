# F03 — Migración local y exportación compatible

## Estado

Implementada y validada en el worktree `feat/f03-local-data-migration`, pendiente de integración en `main`. Este nodo migra y conecta el contrato `trayecto-personal-data` v3 con la persistencia local y el intercambio de archivos; no agrega cuentas, sincronización remota ni nuevas preferencias visuales.

## Objetivo

Convertir sin pérdida el progreso, la selección académica y los planes semestrales actuales al documento personal v3, usarlo como representación portable y mantener la compatibilidad de lectura con las exportaciones completas v1/v2 y las exportaciones exclusivas del planificador v1.

## Estado de entrada confirmado

- El contrato y validador v3 viven en `app/personal-data.mjs` y `app/personal-data.d.ts`.
- El progreso actual usa `trayecto-udelar-progress-v2`; el legado de Computación 1997 puede existir en `trayecto-udelar-demo-v1`.
- La planificación usa `trayecto-udelar-planner-v1` y `trayecto-udelar-current-term-v1`.
- La selección usa `trayecto-udelar-academic-selection-v1`.
- Las preferencias visuales usan `trayecto-udelar-visual-preferences-v1` y deben permanecer fuera del documento transferible.
- La exportación completa actual usa `scope: "all"` y `formatVersion: 2`; la del planificador usa `scope: "planner"` y `formatVersion: 1`.
- `PlanId` es global en el catálogo actual, mientras que el progreso se consulta mediante `progressPlanId`; no se debe inferir uno a partir del otro ni fusionar perfiles sólo porque una materia comparta código.

## Arquitectura requerida

Crear un módulo puro, importable por Node y por la aplicación, que concentre:

1. lectura y validación de las formas locales heredadas;
2. migración determinista a v3 con dependencias explícitas para fecha, ID de documento y catálogo académico;
3. adaptación entre el documento v3 y el estado React existente;
4. lectura de exportaciones completas v1/v2 y v3;
5. lectura del planificador v1 y extracción de una planificación desde una exportación completa compatible.

La lógica de migración no debe quedar duplicada dentro de `app/page.tsx`. Las funciones puras reciben `unknown`, nunca acceden directamente a `window` o `localStorage` y devuelven resultados discriminados con problemas comprensibles.

## Persistencia local

- Introducir una clave canónica `trayecto-udelar-personal-data-v3`.
- Durante la primera carga, preferir un v3 válido. Si no existe, migrar las claves heredadas en memoria, validar el resultado y escribir v3 sólo después de completar la conversión.
- No borrar ni modificar las claves heredadas en este nodo. Funcionan como recuperación ante una migración fallida y podrán retirarse en una versión futura explícita.
- Una clave v3 dañada no debe ser reemplazada silenciosamente ni bloquear la interfaz: conservarla, intentar cargar de forma segura el estado heredado y registrar un resultado de migración fallida que la UI pueda presentar mediante el modal existente.
- Las escrituras posteriores deben mantener v3 como fuente canónica. Se acepta escritura dual temporal de las claves actuales únicamente si queda encapsulada, documentada y probada como compatibilidad de rollback; nunca permitir que una copia heredada posterior pise un v3 válido.
- Persistir sólo después de la hidratación para evitar sobrescribir datos al montar.
- Ninguna operación debe incluir tema, modo oscuro, paneles, búsquedas u otras preferencias visuales.

## Identidad e idempotencia

- Los perfiles se identifican mediante una composición estable de la identidad académica completa, no sólo por código de materia ni por el año visible del plan.
- Cada perfil conserva explícitamente `facultyId`, `careerId`, `planId` y `progressPlanId`; sede, trayectoria y credencial siguen siendo referencias anulables.
- Materias con el mismo código en perfiles distintos no colisionan porque el progreso queda dentro de su perfil. Planes oficialmente articulados sólo comparten progreso cuando el catálogo ya declara el mismo `progressPlanId`.
- Una migración repetida sobre un v3 válido devuelve el mismo documento semántico y no incrementa revisión, cambia IDs ni fechas.
- No inventar fechas históricas de aprobación: `progress[].updatedAt` queda en `null` para datos heredados. Las fechas obligatorias del documento y del escenario describen el momento técnico de migración y deben inyectarse o conservarse, no recalcularse en cada lectura.
- El dispositivo puede quedar `null` si todavía no existe un identificador local estable; no crear fingerprinting.

## Conversión del estado actual

- Crear un perfil por plan con datos personales reales o planificación no vacía; incluir además la selección activa aunque esté vacía.
- Resolver facultad, carrera, plan, `progressPlanId`, sede, trayectoria y credencial desde el catálogo y la selección, rechazando referencias imposibles en vez de adivinarlas.
- Convertir los mapas de estados a entradas v3, conservando `pending`, `approved` y `exonerated`.
- Convertir los términos actuales en un único escenario principal inicial. Conservar IDs, etiquetas, orden de materias y `currentTermId`; mapear el semestre actual a `in-progress` y los demás a `planned` sin inventar fechas.
- Elegir `loadUnit` desde los metadatos publicados del plan: créditos cuando existen créditos oficiales, horas cuando el plan usa carga horaria y `courses` cuando no se publicó ninguna de las anteriores. No convertir una ausencia en cero créditos.
- Los cuatro semestres iniciales vacíos creados por defecto no obligan a crear perfiles de todas las carreras del catálogo.

## Exportación e importación

- La exportación completa nueva debe serializar el documento v3 validado mediante `serializePersonalDataV3`, incluyendo todos los perfiles locales y no sólo el plan visible.
- Mantener el archivo exclusivo del planificador en formato v1 para compartir un escenario con personas que aún usan la versión publicada, salvo que una incompatibilidad demostrada exija una extensión retrocompatible.
- La importación completa acepta v3 y las exportaciones completas v1/v2 existentes. Los formatos heredados se convierten primero a v3 y pasan por el mismo validador antes de modificar el estado.
- La importación de sólo planificador acepta el formato v1 actual y puede extraer la planificación del plan correspondiente desde una exportación completa v2 o v3.
- Validar que las materias importadas pertenezcan al plan, cargando el catálogo diferido cuando sea necesario, como hace la aplicación actual.
- Rechazar versiones futuras, JSON inválido, IDs duplicados, referencias rotas y materias ajenas mediante el modal accesible existente. No usar `alert` ni fallar parcialmente.
- Una importación rechazada no modifica estado ni almacenamiento. Una importación válida debe restaurar un documento semánticamente equivalente al exportado.

## Compatibilidad y recuperación

- Incluir fixtures representativos de: almacenamiento legado v1, almacenamiento actual v2, exportación completa v1 si está soportada por el código histórico, exportación completa v2, planificador v1 y documento v3.
- Si no existe evidencia de una exportación completa v1 distinta de la forma v2, documentar el resultado y cubrir la forma histórica realmente aceptada; no inventar campos.
- La escritura de v3 debe ser atómica desde la perspectiva de `localStorage`: serializar y validar completamente antes de llamar a `setItem`.
- Conservar los datos heredados permite volver a la versión anterior. Instantáneas múltiples, papelera y deshacer pertenecen a F04.

## Pruebas obligatorias

- Migración de cada forma local heredada y de sus combinaciones parciales.
- Progreso 1997 desde `trayecto-udelar-demo-v1` cuando no existe progreso v2.
- IDs iguales de materia en dos perfiles sin colisión.
- Plan canónico cuyo `progressPlanId` difiere de `planId`.
- Plan con créditos, plan con horas y plan con conteo de materias.
- Doble migración idempotente y relectura de v3 sin cambios.
- Clave v3 corrupta, JSON heredado corrupto y campos parciales sin pérdida del resto válido.
- Exportar v3, importar y volver a exportar con equivalencia semántica.
- Importar exportación completa v2 y planificador v1.
- Extraer sólo el planificador desde una exportación completa v2 y v3.
- Catálogo diferido y rechazo de materias ajenas antes de mutar estado.
- Comprobación de que las preferencias visuales no aparecen en v3.
- Pruebas de integración/documentales de `app/page.tsx` para hidratación, persistencia y mensajes del modal.

## Límites

- No agregar dependencias.
- No agregar UI de cuenta, API, base de datos, telemetría, cookies ni servicios externos.
- No cambiar datos curriculares, requisitos ni identidad visual.
- No implementar todavía escenarios múltiples, historial académico, instantáneas ni sincronización.
- No borrar las claves heredadas ni migrar automáticamente datos entre planes no articulados.

## Verificación y cierre

- Ejecutar las pruebas estrechas del módulo de migración durante el desarrollo.
- Ejecutar `npm test`, `npm run lint`, `npm run security:repo` y `git diff --check` antes del commit.
- Actualizar `PROJECT_CONTEXT.md` para declarar v3 como almacenamiento personal canónico sólo cuando la integración esté efectivamente conectada.
- Registrar en este archivo el resultado, compatibilidades comprobadas, claves conservadas, comandos y riesgos pendientes.
- Crear un commit enfocado en este worktree. No integrar, hacer push ni publicar desde el subagente.

F03 queda cerrado cuando una persona conserva su progreso y planificación al actualizar, puede exportar/restaurar todos sus perfiles en v3, todavía puede importar los archivos anteriores y una segunda migración no altera el resultado.

## Resultado de implementación

- `app/personal-data-migration.mjs` concentra la conversión pura entre almacenamiento heredado, estado de la aplicación y documento v3; `app/page.tsx` sólo coordina lectura, carga diferida de catálogos y actualización de React.
- La hidratación prefiere un v3 válido. Si no existe, migra progreso, selección y planificación v1/v2; si el v3 está dañado, lo conserva, recupera los fragmentos heredados válidos y bloquea escrituras canónicas hasta una importación válida.
- La exportación completa produce un v3 con todos los perfiles locales. La exportación exclusiva del planificador permanece en v1 y ambas rutas de importación aceptan los formatos históricos documentados.
- Las claves heredadas se conservan y continúan con escritura dual temporal: `trayecto-udelar-progress-v2`, `trayecto-udelar-demo-v1`, `trayecto-udelar-planner-v1`, `trayecto-udelar-current-term-v1` y `trayecto-udelar-academic-selection-v1`.
- Los perfiles aíslan materias con el mismo ID. Sólo los planes cuyo catálogo declara el mismo `progressPlanId` comparten progreso; además, la comparación es independiente del orden de inserción del mapa.
- Las preferencias visuales siguen fuera de v3. No se agregaron servicios, cuentas, cookies ni dependencias.

## Compatibilidad y riesgos pendientes

- Los fixtures confirman las formas completas v1/v2 realmente aceptadas por el código anterior; no se inventó una variante v1 adicional sin evidencia.
- Los datos heredados no contienen fechas académicas confiables, por lo que `progress[].updatedAt` se migra como `null`.
- La escritura dual queda deliberadamente para rollback y deberá retirarse sólo mediante una migración futura explícita.
- Instantáneas, recuperación avanzada y mensajes de error de cuota de almacenamiento permanecen en F04/F05.

## Verificación ejecutada

- `node --test tests/personal-data-migration.test.mjs tests/user-preferences.test.mjs`
- `npm test`
- `npm run lint`
- `npm run security:repo`
- `git diff --check`
