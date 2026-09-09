# C02 — Adaptador personal sin pérdida

## Objetivo

Eliminar la diferencia entre lo que acepta `trayecto-personal-data` v3 y lo que el estado React puede conservar. Ningún guardado, exportación o cambio de progreso puede fusionar perfiles ni sustituir un escenario distinto del que la persona está editando.

## Problemas reproducidos

- Un documento v3 válido con dos perfiles del mismo `planId` se adapta a mapas indexados por plan y vuelve a serializarse con un solo perfil.
- Si `activeScenarioId` no apunta al escenario principal, el adaptador entrega ese contenido a React y la reconstrucción posterior lo escribe dentro del principal.

## Diseño requerido

- Identificar perfiles por `profile.id`, no solamente por `planId`. `progressPlanId` puede seguir compartiendo progreso cuando la articulación académica lo declare, pero no define identidad del perfil.
- Identificar escenarios por `scenario.id` y transportar `activeScenarioId`; nunca inferir que el escenario visible es el principal.
- Preservar perfiles y escenarios no editados del documento anterior de forma estructural, no como campos desconocidos copiados a ciegas.
- La selección activa debe resolver un `profileId` inequívoco. Una selección antigua por plan sólo puede migrarse si existe un único candidato; ante ambigüedad debe conservarse el original y detener escrituras destructivas.
- Mantener compatibilidad de lectura con v1/v2 y con el planificador v1. No cambiar aún `formatVersion`.

## Casos de prueba obligatorios

- Dos perfiles distintos del mismo plan sobreviven a hidratación → cambio de progreso → serialización.
- Dos perfiles articulados que comparten `progressPlanId` conservan identidades y progreso coherente sin duplicación.
- Escenario alternativo activo recibe las ediciones; el principal queda byte-semánticamente igual.
- Escenarios archivados/no activos sobreviven a cambios de progreso y selección.
- Selección ambigua no se degrada ni se guarda parcialmente.
- Exportación e importación mantienen IDs, `isPrimary`, `activeScenarioId`, términos y metadatos.

## Límites y cierre

- No añadir todavía UI para crear o comparar escenarios; P03 hará esa superficie.
- No implementar sincronización entre pestañas ni cambiar el formato público.
- Actualizar `PROJECT_CONTEXT.md` si cambia la frontera estable entre React y v3.
- Cierre con pruebas específicas, `npm test`, `npm run lint`, `git diff --check` y auditoría pública.

