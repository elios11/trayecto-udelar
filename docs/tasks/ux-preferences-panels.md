# Controles plegables y preferencias locales

## Objetivo

Reducir ruido visual, corregir detalles de contraste y recordar las opciones de interfaz elegidas por la persona en el mismo dispositivo.

## Alcance

- Cerrar el selector de temas al hacer clic fuera o presionar Escape.
- Usar separadores compatibles con temas claros y oscuros en las metas de créditos.
- Dar aire inferior consistente al contenido de optativas y electivas.
- Cargar el catálogo diferido completo al entrar al planificador para mostrar todas las materias disponibles.
- Permitir plegar las metas de créditos, cerradas por defecto.
- Permitir minimizar el catálogo lateral de materias del planificador.
- Recordar localmente carrera/plan/trayectoria y las preferencias visuales: modo, vista del planificador, filtros y paneles plegables.

## Persistencia

Las preferencias son locales al navegador y no requieren cuenta. Los formatos existentes de progreso, planificación y tema se preservan.

## Verificación

- `npm test`
- `npm run lint`
- Validación funcional de los paneles, el selector de temas y la restauración tras recargar cuando las herramientas lo permitan.