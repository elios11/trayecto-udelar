# Limpieza de lint y accesibilidad

## Objetivo

Dejar `npm run lint` libre de errores propios del repositorio sin analizar artefactos locales o compilados, y conservar los flujos interactivos existentes con soporte correcto para teclado.

## Alcance

- Ignorar worktrees, temporales y carpetas de compilación anidadas.
- Estabilizar la derivación de estados académicos usada por React.
- Restaurar preferencias locales después del efecto inicial sin provocar una actualización síncrona en el efecto.
- Mantener enfocable la región curricular horizontal con semántica explícita.
- Reemplazar los fondos interactivos no semánticos del modal y el panel de materia por controles nativos.
- Mantener cierre por clic exterior y por `Escape`; el error de importación recibe foco al abrirse.

## Verificación

- `npm test`
- `npm run lint`
- Validación funcional del modal de importación y del panel lateral mediante las pruebas automatizadas disponibles.
