# C03 — Concurrencia local entre pestañas

## Objetivo

Impedir que dos pestañas del mismo navegador sobrescriban silenciosamente cambios personales independientes mientras ambas muestran un guardado exitoso.

## Protocolo requerido

- Cada escritura parte de una revisión/fingerprint durable esperada y produce una revisión nueva.
- Escuchar cambios externos mediante `storage`, pero no tratar el evento como un bloqueo suficiente: antes de confirmar debe verificarse que la base esperada continúa vigente.
- Serializar las escrituras locales con un mecanismo disponible en navegadores compatibles y diseñar un fallback conservador. Si no puede garantizarse exclusión, detectar la divergencia y preservar ambas versiones.
- Cambios idénticos o ya contenidos pueden converger automáticamente; cambios estructurales incompatibles no se fusionan sin confirmación.
- Mostrar un estado accesible que diferencie guardado, cambio externo incorporado y conflicto pendiente. Nunca prometer sincronización entre dispositivos.
- Una pestaña suspendida o restaurada no puede escribir sobre una revisión más nueva sin detectar el conflicto.

## Recuperación

- Crear una instantánea local antes de aplicar una versión externa o resolver un conflicto.
- La exportación debe permitir sacar tanto la versión actual como la versión en conflicto.
- Recargar no debe borrar silenciosamente ninguna rama pendiente.

## Pruebas y cierre

- Dos pestañas cambian materias diferentes casi simultáneamente.
- Ambas cambian la misma materia de manera distinta.
- Una elimina un semestre mientras otra lo edita.
- Evento `storage` retrasado, pestaña suspendida y reintento tras cuota.
- Fallo entre adquisición, escritura y liberación no deja bloqueo permanente.
- Cierre con pruebas deterministas del protocolo, prueba funcional con dos contextos cuando sea posible, suite completa, lint y auditoría pública.

