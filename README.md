# Trayecto

Trayecto ayuda a estudiantes de Udelar a explorar su currícula, registrar avance y planificar materias. La aplicación se construye con React, vinext y npm; su proceso de verificación y empaquetado funciona desde un clon limpio, sin depender de ChatGPT Sites.

## Requisitos y reconstrucción

- Node.js `>=22.13.0` con npm 10 (el distribuido con Node 22) y el `package-lock.json` versionado.
- No sustituir `npm ci` por una instalación que cambie el lockfile durante la reproducción.

```bash
npm ci
npm run verify
npm run build
npm run package
```

`npm run verify` ejecuta lint y las pruebas Node sin compilar. `npm test` conserva el contrato completo: compila y luego ejecuta esas pruebas. Tras compilar, `npm run package` copia `dist/` a `outputs/portable/` y genera un manifiesto determinista con los hashes de cada archivo y del lockfile. Para comprobarlo:

```bash
node scripts/package-portable-build.mjs --verify
```

La guía completa, incluyendo la conexión futura de un remoto y la separación entre artefacto y despliegue, está en [docs/portable-build.md](docs/portable-build.md).

## Desarrollo

```bash
npm run dev
```

El despliegue no forma parte de los comandos de CI ni del empaquetado portable.
