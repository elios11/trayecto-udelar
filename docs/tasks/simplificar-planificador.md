# Simplificación visual del planificador

## Objetivo

Devolver el foco del planificador a su tarea principal: distribuir materias entre semestres. La gestión de escenarios y la línea temporal agregan conceptos, controles y contenido antes del tablero sin aportar valor inmediato a la mayoría de las personas.

## Alcance

- Retirar de la interfaz visible el selector de escenarios, la distinción `Plan principal` y sus diálogos de administración y comparación.
- Retirar la línea temporal y sus hitos del flujo principal del planificador.
- Mantener intacto el contrato de datos personales, la migración y las exportaciones existentes. Los escenarios ya guardados no se borran ni se reescriben; el planificador continúa usando el escenario activo.
- Mantener historial académico, estados de materias, semestres, objetivos de carga, recuperación e importación.
- Eliminar estilos y preferencias visuales que queden sin consumidor.

## Criterios de cierre

- Al entrar al planificador se muestran encabezado, controles esenciales y semestres, sin `Escenario`, `Plan principal` ni `Línea temporal`.
- Una planificación existente sigue hidratando y guardando el escenario activo sin pérdida.
- Las exportaciones completas anteriores continúan siendo compatibles.
- Las pruebas de dominio de escenarios y línea temporal permanecen: se conserva el formato aunque deje de exponerse como interfaz principal.
- `npm test` y `npm run lint` finalizan correctamente.

