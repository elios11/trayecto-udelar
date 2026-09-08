# Compilación portable de Trayecto

## Reconstrucción reproducible

Se requiere Node.js `>=22.13.0` con npm 10 (la línea incluida con Node 22). El `package-lock.json` versionado fija el árbol de dependencias: desde un clon limpio se debe usar `npm ci`, que no lo modifica.

```bash
npm ci
npm run verify
npm run build
npm run package
```

`npm run verify` ejecuta lint y `npm run test:unit`, sin compilar, iniciar servicios, descargar navegadores, consultar Bedelías ni usar secretos. `npm run build` genera `dist/`. `npm run package` requiere ese directorio y crea `outputs/portable/`; `npm test` sigue siendo la comprobación completa de compilación más pruebas unitarias.

## Artefacto y manifiesto

El artefacto es un directorio autocontenido, no un archivo comprimido:

```
outputs/portable/
  dist/
  manifest.json
```

El manifiesto `trayecto-portable-build` versión 1 incluye la versión de Node, el SHA-256 de `package-lock.json` y una lista ordenada de rutas relativas, tamaños y hashes SHA-256 de los archivos copiados. No incorpora rutas absolutas, timestamps, secretos ni estado local. Se puede verificar sin GitHub:

```bash
node scripts/package-portable-build.mjs --verify
```

El empaquetador sólo reemplaza el destino fijo `outputs/portable/`; no borra el resto de `outputs/` ni acepta destinos arbitrarios. Tanto `dist/` como `outputs/` están ignorados por Git.

## CI y despliegue

El workflow inicial ejecuta exactamente `npm run verify`, `npm run build` y `npm run package` después de `npm ci`, y conserva el artefacto como resultado de CI. No despliega, no requiere secretos y no contiene lógica de producto. Compilar y empaquetar son portables; desplegar requiere un adaptador autorizado para cada host.

La compilación actual todavía usa vinext y su integración con Cloudflare/Sites. Para alojar el artefacto en otro runtime, hay que verificar qué salida de `dist/` sirve el runtime elegido, configurar el adaptador correspondiente y ejecutar una prueba de restauración. Esta guía no declara esa compatibilidad ni el ensayo de restauración B09 como completados.

## Repositorio canónico y salida de Sites

Cuando exista una cuenta, organización y repositorio elegidos por la persona responsable, se podrá conectar el remoto manualmente:

```bash
git remote add origin <URL_DEL_REPOSITORIO_ELEGIDO>
git push -u origin <RAMA_ELEGIDA>
```

Los placeholders no se deben ejecutar hasta definir URL, organización, visibilidad y política de acceso. No se versionan variables de entorno, tokens de GitHub, credenciales de hosting ni secretos de despliegue.

Checklist pendiente para una salida de Sites:

- Confirmar un repositorio canónico y permisos de mantenimiento.
- Probar el workflow desde ese repositorio.
- Definir y validar un adaptador de despliegue por cada host.
- Ejecutar y documentar el ensayo de restauración B09.
- Autorizar explícitamente cualquier cambio de remoto, push o publicación.
