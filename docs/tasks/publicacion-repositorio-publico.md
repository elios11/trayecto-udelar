# Publicación del repositorio canónico

## Estado

Implementada localmente; la configuración remota debe verificarse después de crear `trayecto-udelar` en GitHub.

## Objetivo

Publicar el código de Trayecto sin exponer credenciales ni datos personales, con CI reproducible, divulgación privada de vulnerabilidades y mantenimiento básico de dependencias, conservando independencia del proveedor de hosting.

## Criterios cubiertos

- Auditoría inicial del árbol rastreado sin coincidencias de credenciales ni archivos sensibles.
- Exclusiones explícitas para artefactos locales y secretos comunes.
- Comando local y paso de CI que revisan futuros archivos rastreados.
- Política de seguridad y procedimiento operativo documentados.
- Actualizaciones de npm y GitHub Actions configuradas sin auto-merge.
- Checklist remoto para alertas, CodeQL, protección de secretos, rama principal y 2FA.

## Pendientes remotos

- Crear el repositorio público `trayecto-udelar` en la cuenta elegida.
- Configurar `origin`, subir `main` y verificar la primera ejecución de CI.
- Aplicar y comprobar la configuración de seguridad enumerada en `docs/security-public-repository.md`.
- Elegir una licencia por separado; hasta entonces el repositorio es visible, pero no se declara de código abierto.
