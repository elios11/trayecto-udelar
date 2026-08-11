# Corrección del cambio entre carreras

## Problema

Al cambiar desde un perfil de Ingeniería Civil a otra carrera, React podía renderizar brevemente el Plan 2025 con el identificador del perfil anterior. La interfaz accedía directamente a esa trayectoria inexistente y mostraba la pantalla genérica de error. Al recargar, la selección persistida seguía apuntando a Civil porque el cambio no alcanzaba a guardarse.

## Comportamiento esperado

- Cambiar de facultad, carrera o plan nunca debe derribar la aplicación.
- Durante una transición, el Plan 2025 debe usar su trayectoria predeterminada si recibe temporalmente un identificador perteneciente a otro plan.
- La selección de trayectoria y título debe prepararse antes de activar el plan nuevo.
- La persistencia local continúa guardando únicamente una selección académica válida.

## Verificación

- Regresión automatizada para el identificador `construction` al entrar al Plan 2025.
- `npm test`.
- `npm run lint`.
