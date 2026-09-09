# C04 — Evolución de datos y referencias curriculares

Estado: implementado, validado e integrado en `main`.

## Objetivo

Permitir que Trayecto agregue historial, escenarios y sincronización sin que un cliente anterior elimine campos nuevos, y conservar progreso válido cuando cambie la currícula publicada.

## Conceptos separados

- `formatVersion`: forma del documento exportable y sus migraciones.
- revisión de concurrencia: orden de escrituras de una misma identidad documental.
- versión de API: capacidades del cliente y servidor, cuando existan cuentas.
- revisión curricular: versión inmutable o recuperable de la referencia académica usada por cada perfil.

## Política de compatibilidad

- Migraciones encadenadas, puras, idempotentes y testeadas; nunca reinterpretar una versión futura como la actual.
- Un cliente que no comprende campos obligatorios entra en modo protegido de sólo lectura/exportación o rechaza el documento conservando el original.
- Definir qué extensiones pueden preservarse sin comprenderlas y cuáles exigen cambio de `formatVersion`.
- Probar cliente viejo → documento nuevo → intento de edición sin pérdida.
- Documentar retiro de escrituras v1/v2, duración del rollback y condición verificable para eliminar claves heredadas.

## Evolución curricular

- Cada perfil referencia una revisión curricular trazable, no sólo el plan nominal actual.
- Mantener snapshots o artefactos reproducibles suficientes para explicar requisitos históricos.
- Alias y reemplazos de materias son explícitos, fechados y con fuente; no se deducen sólo por nombre o código parecido.
- Materias personales que ya no existen en el catálogo actual se conservan como pendientes de revisión y siguen siendo exportables.
- P06 presentará y aplicará las diferencias; C04 define primero el contrato y la conservación.

## Pruebas y cierre

- Matriz de versiones soportadas, futuras e incompatibles.
- Round-trip con campos nuevos a través de un cliente anterior simulado.
- Currícula retirada, materia renombrada, alias confirmado y materia sin equivalencia.
- Restauración de una exportación históricamente válida sin exigir que toda identidad siga en el catálogo vigente.
- Cierre con decisión documentada de versionado, migraciones puras, fixtures, suite completa, lint y auditoría pública.

## Resultado implementado

- `classifyPersonalDataCompatibility` distingue v3, legado migrable, versión futura protegida e incompatible sin confundir `revision` con versión.
- V3 conserva `extensions` JSON namespaced a través de parseo, edición, serialización y reconstrucción de perfiles, escenarios y semestres.
- El catálogo asigna una `curriculumRevision` estable a cada plan y la migración la incorpora a perfiles nuevos o antiguos sin revisión.
- `curriculum-revisions.mjs` clasifica referencias vigentes, alias explícitos, retiradas y huérfanas; los alias exigen fecha, tipo y fuente HTTPS.
- Importaciones completas e instantáneas conservan materias fuera del catálogo actual y lo informan. El planificador separado sigue validando contra el catálogo vigente.
- La política de retiro de escrituras v1/v2 y el contrato de compatibilidad quedaron documentados en `docs/personal-data-compatibility.md`.

## Reanudación y verificación

Validación final del worktree: `npm test` (829/829), `npm run lint`, `git diff --check` y `npm run security:repo`, todos correctos. La prueba focal es `node tests/personal-data-evolution.test.mjs` (8/8).
