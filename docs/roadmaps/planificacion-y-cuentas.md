# Roadmap ejecutable: planificación prolongada, portabilidad y cuentas

## Estado

Roadmap aprobado para planificación. No inicia implementaciones ni autoriza servicios externos, integración, push o publicación.

## Objetivo

Evolucionar Trayecto desde una herramienta local de progreso y planificación hacia un producto recuperable, portable y sincronizable, sin perder el uso anónimo ni depender estructuralmente de ChatGPT Sites, una base de datos o un proveedor de identidad.

## Cómo leer este roadmap

- `Modelo` identifica el subagente propietario recomendado.
- `Esfuerzo` es el nivel de razonamiento solicitado al crear el subagente.
- `Deps.` enumera los nodos que deben estar integrados antes de comenzar.
- Cada nodo se implementa en un worktree y commit independientes.
- El coordinador mantiene un unico subagente activo: termina y revisa un nodo antes de iniciar el siguiente.
- Antes de delegar un nodo, el coordinador crea o completa su especificación en el archivo indicado bajo `docs/tasks/`.
- Sol coordina, revisa e integra; ningún subagente publica.

## Política de modelos

| Perfil | Uso | No usar para |
|---|---|---|
| `gpt-5.6-luna` | Cambios mecánicos pequeños con pruebas deterministas | Datos personales, autenticación, migraciones, fuentes académicas |
| `gpt-5.6-terra` | UI acotada, CI, adaptadores ya diseñados, accesibilidad y pruebas | Decisiones abiertas de seguridad o arquitectura distribuida |
| `gpt-5.6-sol` | Modelo de dominio, investigación, migraciones, API, sincronización e integración | Trabajo repetitivo que pueda resolver Luna/Terra o un script |
| `gpt-6-astra` | Auditoría final de seguridad y conflictos complejos | Implementación cotidiana o cambios visuales pequeños |

Si un modelo no está disponible: Astra pasa a Sol dejando auditoría reforzada pendiente; Terra pasa a Sol; Luna pasa a Terra. No se rebajan tareas de Sol a Terra o Luna.

## Decisiones humanas previas

Estas decisiones no bloquean la Ola 1, pero deben cerrarse antes de la Ola 3:

1. Dominio propio y proveedor registrador con cambio libre de DNS.
2. Repositorio GitHub público o privado.
3. Proveedor OIDC candidato para la beta.
4. Política de retención y eliminación de cuentas inactivas.
5. Confirmación de que notas personales quedan fuera del MVP.

## Resumen de nodos

| ID | Resultado | Modelo | Esfuerzo | Deps. |
|---|---|---|---|---|
| F01 | Contrato unificado de datos personales v3 | `gpt-5.6-sol` | high | — |
| F02 | CI portable y repositorio canónico | `gpt-5.6-terra` | medium | — |
| F03 | Migración local y exportación compatible | `gpt-5.6-sol` | high | F01 |
| F04 | Deshacer, papelera e instantáneas locales | `gpt-5.6-terra` | high | F03 |
| F05 | Indicador de guardado y diagnóstico local | `gpt-5.6-luna` | medium | F03 |
| P01 | Objetivo de carga y validaciones del semestre | `gpt-5.6-terra` | high | F03 |
| P02 | Historial académico personal | `gpt-5.6-sol` | high | F03 |
| P03 | Escenarios de planificación | `gpt-5.6-sol` | high | F03 |
| P04 | Modelo trazable de oferta y período de dictado | `gpt-5.6-sol` | high | — |
| P05 | Línea temporal e hitos | `gpt-5.6-terra` | high | P02 |
| P06 | Alertas por cambios curriculares | `gpt-5.6-sol` | high | F03,P02 |
| B01 | Prueba portable PostgreSQL | `gpt-5.6-sol` | high | F01,F02 |
| B02 | Prueba de identidad OIDC | `gpt-5.6-sol` | high | F02 |
| B03 | Esquema y adaptador de persistencia | `gpt-5.6-sol` | high | B01,B02 |
| B04 | Superficie opcional de cuenta | `gpt-5.6-terra` | high | B02,B03 |
| B05 | Migración explícita local → cuenta | `gpt-5.6-sol` | high | F04,B03,B04 |
| B06 | Motor de sincronización y revisiones | `gpt-5.6-sol` | xhigh | B05 |
| B07 | Conflictos y modo sin conexión | `gpt-5.6-terra` | high | B06 |
| B08 | Privacidad, exportación y eliminación | `gpt-5.6-sol` | high | B03,B04 |
| B09 | Backups y ensayo de salida | `gpt-5.6-terra` | high | B03,F02 |
| S01 | Auditoría integral de seguridad | `gpt-6-astra` | high | B05,B06,B07,B08,B09 |
| R01 | Integración y beta cerrada | `gpt-5.6-sol` | xhigh | S01 |

## Ola 1 — Base local y CI

### F01 — Contrato unificado de datos personales v3

- Especificación: `docs/tasks/datos-personales-v3.md`.
- Diseñar tipos puros para progreso, selección académica, planificación, versiones y metadatos de guardado.
- Mantener separada la definición curricular oficial.
- Definir serialización JSON, validación, IDs estables y compatibilidad con planes en créditos, horas o unidades.
- No cambiar todavía las claves de `localStorage` ni la UI.
- Cierre: pruebas unitarias del contrato, muestras válidas e inválidas y estrategia de migración aprobada.

### F02 — CI portable y repositorio canónico

- Especificación: `docs/tasks/ci-portable.md`.
- Hacer que el CI invoque únicamente scripts npm existentes o nuevos scripts portables del repositorio.
- Separar verificar, compilar, empaquetar y desplegar.
- No incluir credenciales ni lógica indispensable dentro de acciones propietarias.
- Añadir una guía de reconstrucción fuera de Sites.
- Cierre: el mismo flujo de verificación corre localmente y en CI; el despliegue sigue siendo opcional y separado.

### F03 — Migración local y exportación compatible

- Especificación: `docs/tasks/migracion-datos-v3.md`.
- Leer las claves locales actuales y producir el documento v3 sin pérdida.
- Conservar importación de exportaciones completas y exclusivas del planificador actuales.
- Hacer la migración idempotente y recuperable.
- Cierre: fixtures de todas las versiones, doble migración sin cambios y exportación/restauración equivalentes.

### F04 — Deshacer, papelera e instantáneas

- Especificación: `docs/tasks/recuperacion-local.md`.
- Incorporar deshacer acotado para estados y planificación.
- Conservar semestres eliminados en una papelera temporal.
- Crear instantáneas antes de importaciones, migraciones y reemplazos completos.
- Cierre: recuperación por UI y teclado, límites de retención y pruebas de restauración.

### F05 — Estado de guardado

- Especificación: `docs/tasks/estado-guardado-local.md`.
- Mostrar `Guardado en este dispositivo`, última modificación y errores de persistencia.
- Evitar prometer respaldo remoto.
- Cierre: estados accesibles y pruebas deterministas de éxito, cuota y almacenamiento bloqueado.

## Ola 2 — Planificación prolongada

### P01 — Carga y validaciones

- Especificación: `docs/tasks/planificador-carga-validaciones.md`.
- Objetivo personal por créditos, horas o cantidad de materias.
- Advertencias no bloqueantes por exceso de carga, duplicados, materias acreditadas y previaturas conocidas.
- Mostrar impacto estimado en totales, áreas y títulos.
- Cierre: no inferir carga u oferta ausentes y conservar planificación libre.

### P02 — Historial personal

- Especificación: `docs/tasks/historial-academico-personal.md`.
- Separar eventos de cursado, examen y acreditación del estado actual.
- Diseñar correcciones y borrado sin alterar la currícula oficial.
- Cierre: cálculo de créditos idéntico al actual y trazabilidad de cambios personales.

### P03 — Escenarios

- Especificación: `docs/tasks/escenarios-planificacion.md`.
- Duplicar, nombrar, comparar, archivar y promover una planificación principal.
- Evitar mezclar escenarios con trayectorias oficiales.
- Cierre: IDs estables, comparación comprensible y exportación completa.

### P04 — Oferta y período de dictado

- Especificación: `docs/tasks/oferta-periodos.md`.
- Investigar fuentes oficiales separadas de la composición de Bedelías.
- Modelar oferta confirmada, habitual y desconocida con procedencia y fecha.
- No implementar scraping masivo hasta validar una muestra de servicios distintos.
- Cierre: esquema común, política de caducidad y prototipo con fuentes trazables.

### P05 — Línea temporal e hitos

- Especificación: `docs/tasks/linea-temporal-hitos.md`.
- Mostrar semestres planeados, actuales y cerrados, más títulos intermedios y requisitos relevantes.
- Cierre: accesible en móvil, compatible con planes sin créditos y sin estimaciones falsas de egreso.

### P06 — Cambios curriculares

- Especificación: `docs/tasks/alertas-cambios-curriculares.md`.
- Versionar la referencia curricular usada por datos personales.
- Comparar créditos, áreas, requisitos e identidad de materias antes de aplicar una actualización.
- Cierre: nunca reescribir automáticamente el historial; ofrecer revisión y conservar la versión anterior.

## Ola 3 — Portabilidad y cuentas

### B01 — Prueba PostgreSQL portable

- Especificación: `docs/tasks/spike-postgresql-portable.md`.
- Implementar un adaptador mínimo con PostgreSQL local y un proveedor edge candidato.
- Exportar con `pg_dump`, restaurar en otro PostgreSQL y ejecutar las mismas pruebas.
- No introducir aún cuentas reales ni datos de producción.
- Cierre: informe reproducible con comandos, latencia básica, límites y cambios necesarios para migrar.

### B02 — Prueba OIDC

- Especificación: `docs/tasks/spike-identidad-oidc.md`.
- Validar un proveedor independiente, identidad interna y vinculación de una segunda identidad.
- Probar el mismo flujo en Sites y un runtime alternativo.
- No registrar usuarios reales en producción.
- Cierre: amenaza básica, cookies/tokens, cierre de sesión y procedimiento de migración documentados.

### B03 — Persistencia de cuentas

- Especificación: `docs/tasks/persistencia-cuentas.md`.
- Implementar esquema PostgreSQL, ownership, revisiones y adaptadores.
- Mantener el dominio libre de SDKs de proveedor.
- Cierre: aislamiento entre usuarios, migraciones SQL revisadas y pruebas contra dos PostgreSQL compatibles.

### B04 — Superficie de cuenta opcional

- Especificación: `docs/tasks/experiencia-cuenta-opcional.md`.
- Añadir `Guardar y sincronizar`, sesión, estado y administración sin bloquear el modo anónimo.
- Cierre: navegación accesible, estados de carga/error y cierre de sesión sin pérdida local.

### B05 — Migración local a cuenta

- Especificación: `docs/tasks/migracion-local-cuenta.md`.
- Comparar nube y dispositivo, mostrar resumen y exigir confirmación antes de sustituir.
- Conservar copia recuperable.
- Cierre: nube vacía, local vacío, ambos con datos y planes distintos cubiertos por pruebas.

### B06 — Sincronización

- Especificación: `docs/tasks/sincronizacion-revisiones.md`.
- Revisiones optimistas, operaciones idempotentes, cola local y reintentos.
- Cierre: dos pestañas, dos dispositivos, red intermitente y sesión vencida sin pérdida silenciosa.

### B07 — Resolución de conflictos

- Especificación: `docs/tasks/conflictos-sincronizacion.md`.
- Mostrar ambas versiones, sugerir combinaciones seguras y duplicar escenarios estructurales divergentes.
- Cierre: ninguna resolución destructiva ocurre sin confirmación.

### B08 — Privacidad y ciclo de vida

- Especificación: `docs/tasks/privacidad-cuentas.md`.
- Exportar datos, eliminar cuenta, definir retención, minimizar PII y evitar contenido personal en logs.
- Cierre: eliminación verificable, exportación legible y política visible antes de abrir la beta.

### B09 — Backups y salida

- Especificación: `docs/tasks/backups-plan-salida.md`.
- Automatizar respaldo lógico fuera del proveedor principal.
- Restaurar en otro PostgreSQL y desplegar una copia temporal en un segundo runtime.
- Cierre: runbook ejecutado, integridad comparada y tiempo de recuperación registrado.

## Ola 4 — Auditoría y beta

### S01 — Auditoría de seguridad

- Especificación: `docs/tasks/auditoria-seguridad-cuentas.md`.
- Revisar autenticación, autorización, aislamiento, CSRF, sesiones, conflictos, migraciones, logs, exportación y borrado.
- Producir hallazgos priorizados; no reescribir la implementación completa.
- Cierre: cero hallazgos críticos o altos abiertos. Si Astra no está disponible, Sol ejecuta la revisión y la beta queda marcada como pendiente de auditoría reforzada.

### R01 — Integración y beta cerrada

- Propietario: coordinador con `gpt-5.6-sol`, esfuerzo `xhigh`.
- Integrar serialmente sobre `main`, ejecutar suite completa, lint, pruebas de migración, restauración y validación funcional.
- Requiere autorización separada para push, cambios externos y publicación.
- Cierre: beta cerrada recuperable, portable y con rollback documentado.

## Trabajo opcional posterior

- Compartir escenarios con enlace de sólo lectura: Sol, después de S01 y con un modelo explícito de revocación.
- Exportación a calendario: Terra, después de P04 y sólo con fechas oficiales.
- Notas sincronizadas: Sol, después de política de privacidad y decisión de retención.
- Edición colaborativa: fuera del alcance hasta diseñar permisos y auditoría.

## Orden secuencial recomendado

Se mantiene un solo subagente activo durante todo el roadmap. El orden prioriza hitos recuperables y evita dejar dos tareas incompletas si se alcanza un límite de uso.

1. Base local: F01 → F02 → F03 → F04 → F05.
2. Planificación prolongada: P01 → P02 → P04 → P03 → P05 → P06.
3. Portabilidad y cuentas, después de cerrar las decisiones humanas: B01 → B02 → B03 → B04 → B05 → B06 → B07 → B08 → B09.
4. Cierre: S01 → R01.

## Prompt para iniciar la orquestación

Usar en este chat o en una tarea nueva ejecutada con Sol:

> Lee completos `AGENTS.md`, `PROJECT_CONTEXT.md`, `docs/roadmaps/planificacion-y-cuentas.md` y los planes enlazados. Actúa como coordinador del roadmap. Ejecuta solamente el próximo nodo del orden recomendado cuyas dependencias estén satisfechas. Antes de delegarlo crea o completa su especificación individual en `docs/tasks/`. Crea un worktree separado bajo `.worktrees/`, delega al modelo y esfuerzo declarados y mantén un solo subagente activo. Revisa su resultado antes de iniciar cualquier otro nodo. El subagente debe ejecutar verificaciones estrechas y `npm test`, crear un commit enfocado y devolver el hash. No integres, hagas push, cambies servicios externos ni publiques sin mi autorización explícita. Al cerrar el nodo, entrega el commit, verificaciones, riesgos y decisiones pendientes.

## Cómo continuar después de una interrupción

1. Leer este roadmap y las especificaciones de los nodos iniciados.
2. Revisar `git status`, worktrees y commits antes de repetir trabajo.
3. Considerar completo un nodo sólo si existe commit, verificaciones y criterio de cierre documentado.
4. No asumir que un worktree recibió integraciones posteriores de `main`.
5. Reanudar el nodo incompleto; no abrir el siguiente hasta terminar y revisar el anterior.
