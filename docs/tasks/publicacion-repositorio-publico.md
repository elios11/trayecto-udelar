# Publicación del repositorio canónico

## Estado

Implementada y publicada en <https://github.com/elios11/trayecto-udelar>. El remoto local `origin` apunta al repositorio público y `main` quedó publicado. La configuración de seguridad remota fue inspeccionada después del primer push.

## Objetivo

Publicar el código de Trayecto sin exponer credenciales ni datos personales, con CI reproducible, divulgación privada de vulnerabilidades y mantenimiento básico de dependencias, conservando independencia del proveedor de hosting.

## Criterios cubiertos

- Auditoría inicial del árbol rastreado sin coincidencias de credenciales ni archivos sensibles.
- Exclusiones explícitas para artefactos locales y secretos comunes.
- Comando local y paso de CI que revisan futuros archivos rastreados.
- Política de seguridad y procedimiento operativo documentados.
- Actualizaciones de npm y GitHub Actions configuradas sin auto-merge.
- Checklist remoto para alertas, CodeQL, protección de secretos, rama principal y 2FA.

## Estado remoto verificado

- Activos: política de seguridad, advisories y escaneo de secretos.
- Pendientes: habilitar GitHub Actions para ejecutar CI, reporte privado de vulnerabilidades, alertas y actualizaciones de seguridad de Dependabot, CodeQL y ruleset de `main`.
- La configuración versionada de Dependabot se aplicará cuando sus funciones y Actions estén habilitadas en el repositorio.
- Falta elegir una licencia; hasta entonces el repositorio es visible, pero no se declara de código abierto.
