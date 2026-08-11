# Corrección del cambio entre carreras

## Problema

Al cambiar desde un perfil de Ingeniería Civil a otra carrera, React podía renderizar brevemente un plan con el identificador del otro. Había dos lecturas vulnerables: el Plan 2025 asumía que el perfil anterior existía entre sus trayectorias y el constructor compartido de Eléctrica/Civil asumía que todo plan tenía un perfil `basic`. Civil no lo tiene, por lo que terminaba leyendo `semesters` de `undefined`. Al recargar, la selección persistida seguía apuntando a Civil porque el cambio no alcanzaba a guardarse.

## Comportamiento esperado

- Cambiar de facultad, carrera o plan nunca debe derribar la aplicación.
- Durante una transición, el Plan 2025 debe usar su trayectoria predeterminada si recibe temporalmente un identificador perteneciente a otro plan.
- Los planes con perfiles o trayectorias diferidas deben resolver primero la opción solicitada, luego su opción preferida y finalmente la primera opción real disponible.
- La selección de trayectoria y título debe prepararse antes de activar el plan nuevo.
- La persistencia local continúa guardando únicamente una selección académica válida.

## Verificación

- Regresión automatizada para `construction` al entrar al Plan 2025 y para `pi-60-plus` mientras Civil continúa activo.
- `npm test`.
- `npm run lint`.
