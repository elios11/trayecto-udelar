# Publicación segura del repositorio

Este documento separa controles versionados, configuración de GitHub y decisiones futuras. No afirma que una opción remota esté activa hasta verificarla en el repositorio canónico.

## Controles incluidos en Git

- `SECURITY.md` define un canal privado, alcance y manejo de datos académicos y credenciales.
- `.gitignore` excluye entornos, claves, bases locales, adjuntos, temporales, logs y paquetes de despliegue.
- `npm run security:repo` revisa los archivos rastreados y falla sin imprimir el valor encontrado si detecta nombres sensibles o firmas conocidas de credenciales.
- CI usa permisos globales `contents: read`, instala desde el lockfile y ejecuta la auditoría antes de lint, pruebas, build y empaquetado.
- Dependabot revisa npm semanalmente y GitHub Actions mensualmente. Sus PR deben pasar CI y revisarse; no se fusionan automáticamente.
- La aplicación continúa sin cuentas, telemetría ni persistencia remota. Las exportaciones de progreso no deben adjuntarse a issues.

## Configuración obligatoria en GitHub

Tras crear el repositorio público:

1. Activar **Private vulnerability reporting**.
2. Confirmar **Secret scanning** y **Push protection**; en repositorios públicos GitHub los ofrece de forma predeterminada, pero se verifica el estado real.
3. Activar **Dependabot alerts** y **Dependabot security updates**.
4. Habilitar **Code scanning** con la configuración predeterminada de CodeQL para JavaScript/TypeScript. Se prefiere default setup para no duplicar lógica en el workflow portable.
5. Crear una ruleset para `main`: impedir force-push y borrado, exigir pull request cuando haya colaboradores y requerir el check de CI antes de fusionar. Mientras exista un único mantenedor, conservar una vía administrativa de recuperación y no declarar revisión de dos personas inexistente.
6. Mantener los permisos predeterminados de Actions en sólo lectura y no permitir que workflows de forks reciban secretos.
7. Usar 2FA en la cuenta mantenedora y otorgar a colaboradores el nivel mínimo necesario.

## Revisión previa a cada publicación

```bash
npm run security:repo
npm run verify
npm run package
```

Además, revisar `git status`, el diff y los archivos nuevos. Ningún secreto debe viajar en Git, en artefactos de CI, en capturas, issues o exportaciones de usuario.

## Incidentes

Ante una credencial expuesta: revocarla o rotarla primero, revisar accesos, abrir un advisory privado y recién después limpiar el historial si corresponde. Reescribir Git sin revocación no resuelve el incidente.

Ante datos personales expuestos: retirar el acceso cuando sea posible, conservar evidencia mínima sin redistribuirla, evaluar el alcance y avisar a las personas afectadas por un canal privado.

## Decisiones pendientes que no deben asumirse

- Una licencia de código abierto requiere una elección explícita del titular; hacer público el repositorio no concede automáticamente permisos de reutilización.
- Las cuentas y la sincronización exigirán un modelo de amenazas, privacidad, borrado, recuperación y minimización de datos antes de añadir una base de datos.
- Un dominio propio debe aplicar HTTPS y permitir cambiar de hosting sin trasladar credenciales al repositorio.
