# C04 — Evolución de datos y referencias curriculares

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
