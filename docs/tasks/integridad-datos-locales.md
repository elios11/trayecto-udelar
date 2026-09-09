# C01 — Integridad de exportación, importación y papelera local

## Estado

Implementado en el worktree `fix/data-integrity-hardening` sobre `main` en `87cf43c`, a partir de la auditoría independiente realizada el 9 de septiembre de 2026. Este nodo bloquea la continuación de planificación porque corrige pérdidas de datos reproducibles en F03–F05.

## Objetivo

Garantizar que los mecanismos de salida y recuperación local nunca omitan cambios vigentes, apliquen parcialmente archivos dañados ni consuman una copia recuperable antes de confirmar el documento canónico.

## Alcance

1. La exportación completa se construye y valida desde el estado vigente en memoria. Si el último guardado local falló, el archivo debe incluir igualmente esos cambios y no depender de la última referencia durable.
2. La importación iniciada por la persona es estricta: cualquier fragmento inválido que implicaría pérdida impide aplicar el archivo completo y muestra el modal de incompatibilidad existente.
3. La lectura tolerante de almacenamiento heredado continúa pudiendo rescatar fragmentos válidos para recuperación local; no se confunde con la importación explícita de un archivo.
4. Restaurar un semestre conserva su entrada en la papelera persistida hasta que el documento canónico restaurado se haya guardado correctamente. La limpieza posterior es idempotente; una falla mantiene una copia recuperable tras recargar.

## Fuera de alcance

- Dos perfiles con el mismo plan y múltiples escenarios: corrección C02 del adaptador.
- Coordinación entre pestañas: C03.
- Evolución de versiones y currículas históricas: C04.
- Cuentas, nube, sincronización remota o cambios curriculares.

## Criterios de cierre

- Caso modificar → falla de almacenamiento → exportar → importar conserva el cambio en memoria.
- Una exportación heredada con una entrada válida y otra inválida se rechaza completa, sin mutar progreso ni crear instantánea.
- La recuperación automática desde claves heredadas sigue rescatando entradas válidas cuando corresponde.
- Si guardar el documento restaurado falla, el semestre continúa en la papelera durable y el estado activo no se presenta como restaurado.
- Si el guardado canónico funciona y falla solamente la limpieza posterior, la siguiente limpieza puede completarse sin duplicar ni perder el semestre ya restaurado.
- Pruebas deterministas, `npm test`, `npm run lint`, `git diff --check` y `npm run security:repo` correctos.

## Auditoría posterior

Antes de retomar P01/P02 deben existir además especificaciones separadas para C02–C04 y deben actualizarse las dependencias y responsables del roadmap general. Este nodo no declara resueltos esos riesgos.

## Resultado y verificación

- La exportación completa reconstruye y valida el documento desde el estado React vigente en lugar de reutilizar la última referencia durable.
- `parseCompleteTransfer` rechaza una migración heredada con cualquier descarte, mientras `migrateLegacyStateToPersonalData` continúa disponible para la recuperación tolerante del almacenamiento local.
- La restauración guarda primero el documento canónico y sólo después retira la copia de la papelera. Si esa limpieza queda interrumpida, una nueva ejecución reconoce el semestre restaurado y termina la limpieza de forma idempotente.
- Pruebas específicas: 25/25.
- Suite completa: 810/810; `npm run lint`, `git diff --check` y `npm run security:repo` correctos.
- No se realizó una prueba visual porque este nodo no cambia la presentación; sí se cubrieron el cableado y el orden de operaciones mediante pruebas estructurales y puras.
