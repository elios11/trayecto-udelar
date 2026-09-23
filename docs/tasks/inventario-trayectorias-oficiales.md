# D03a — Inventario global de trayectorias oficiales

## Estado

Nodo preparado para implementación. Es el siguiente paso de D03 después del piloto de Corrección de Estilo y precede a las reconciliaciones masivas por servicio.

## Modelo y dependencias

- Modelo: `gpt-5.6-sol`.
- Esfuerzo: `xhigh`.
- Dependencias: D01 integrado y regla global de autoridad curricular registrada en `PROJECT_CONTEXT.md`.

## Objetivo

Construir un inventario determinista que cubra todos los planes seleccionables y permita saber, sin ambigüedad, si la trayectoria predeterminada de Currícula reproduce la sugerencia oficial vigente. El inventario organiza la investigación y bloquea regresiones; no sustituye la revisión documental de cada carrera.

## Estados permitidos

Cada plan seleccionable debe tener exactamente uno:

- `official-trajectory-reproduced`: existe una malla, grilla, damero o trayectoria sugerida oficial vigente y la proyección reproduce sus períodos, perfiles y bloques flexibles.
- `official-trajectory-identified-pending`: la fuente oficial fue localizada, pero la proyección todavía no la reproduce fielmente.
- `no-official-trajectory-documented`: fuentes oficiales suficientes describen una currícula flexible o confirman que no se publica una trayectoria sugerida. Debe incluir evidencia y fecha de revisión.
- `research-pending`: todavía no existe evidencia suficiente para afirmar ninguno de los estados anteriores.

No encontrar una fuente mediante una búsqueda inicial nunca permite usar `no-official-trajectory-documented`.

## Artefacto

- Crear un manifiesto versionado bajo `data/` con una entrada por ID de plan seleccionable.
- Registrar servicio, carrera, plan, estado, fuentes oficiales, fecha de vigencia o consulta, alcance territorial/perfil y notas de conflicto.
- Registrar el mecanismo actual de la proyección: períodos oficiales, perfiles oficiales, estructura flexible oficial, áreas o composición administrativa.
- Mantener conteos globales y por servicio, más una cola priorizada de `identified-pending` y `research-pending`.
- Generarlo sin red a partir del catálogo y las auditorías guardadas; la investigación posterior actualiza fuentes auditadas y regenera el manifiesto.

## Reglas de autoridad

- La fuente debe pertenecer al servicio, Udelar o un órgano competente y publicar la estructura sugerida del plan vigente.
- Un programa individual, EVA, la composición de Bedelías o el orden de sus filas no demuestran por sí solos una trayectoria sugerida.
- Las áreas y mínimos no reemplazan períodos cuando la fuente también publica semestres, años o ciclos.
- Variantes por perfil, sede o cohorte se registran por separado dentro del mismo plan cuando la fuente así las define.
- Las fuentes históricas se conservan, pero no justifican el estado vigente salvo que el servicio las mantenga expresamente en vigor.

## Puertas automáticas

- Una prueba debe exigir cobertura exacta de todos los planes seleccionables, sin IDs repetidos ni entradas huérfanas.
- `official-trajectory-reproduced` requiere al menos una fuente y evidencia estructurada de correspondencia con la proyección.
- `no-official-trajectory-documented` requiere fuente, fecha y justificación explícita; no puede derivarse de campos vacíos.
- Si una auditoría registra una fuente de trayectoria sugerida, el plan no puede quedar como ausencia documentada.
- El reporte debe hacer visible cualquier plan aún pendiente; no se exige falsamente cerrar los 139 planes en este nodo.

## Entrega del nodo

- Generador determinista, manifiesto inicial y pruebas.
- Migración conservadora del conocimiento existente: sólo clasificar como reproducidas las trayectorias ya demostradas por auditorías/pruebas; el resto queda pendiente.
- Resumen de cobertura y primera cola por servicio para continuar D03 en lotes pequeños y revisables.
- Actualizar `PROJECT_CONTEXT.md` sólo con el contrato estable y conteos confirmados.
- Ejecutar `npm test`, `npm run lint` y `git diff --check`.

## Fuera de alcance

- Buscar y reconciliar en este mismo nodo las fuentes faltantes de todas las facultades.
- Cambiar la UI o reordenar currículas cuya fuente aún no fue auditada.
- Inferir períodos desde Bedelías, EVA, nombres, códigos o áreas.
- Declarar una ausencia oficial por silencio, error de red o enlace roto.

## Continuación

Después de integrar D03a, ejecutar lotes secuenciales por servicio. Cada lote convierte entradas `identified-pending` o `research-pending` en `reproduced` o `documented-none`, añade pruebas de estructura y conserva el progreso personal mediante identidades trazables.
