# F02 — CI portable y repositorio canónico

## Estado

Implementada y validada en el commit F02; pendiente de integración sobre `main`. Prepara verificación, compilación y empaquetado reproducibles sin publicar el sitio ni crear/configurar un repositorio remoto.

## Resultado

- Se agregaron los scripts `test:unit`, `verify` y `package`, el empaquetador `scripts/package-portable-build.mjs`, el workflow `.github/workflows/ci.yml`, sus pruebas, y la documentación `README.md` y `docs/portable-build.md`.
- Se ejecutaron `node --test tests/portable-build.test.mjs`, `npm run verify`, `npm run build`, `npm run package`, `node scripts/package-portable-build.mjs --verify`, `npm test`, `npm run lint` y `git diff --check` con resultado correcto. El artefacto permanece ignorado en `outputs/portable/`.
- El repositorio todavía no tiene remoto canónico configurado: elegir organización, URL y visibilidad, configurar `origin`, hacer push y desplegar siguen siendo acciones posteriores y requieren autorización explícita.

## Objetivo

Hacer que la calidad y el artefacto compilado de Trayecto puedan reproducirse desde un clon limpio usando Node y npm, independientemente de ChatGPT Sites. GitHub Actions puede actuar como primer ejecutor de CI, pero toda lógica indispensable debe permanecer en scripts npm y Node dentro del repositorio.

## Estado actual verificado

- `main` no tiene ningún remoto Git configurado; `git remote -v` no devuelve entradas.
- No existe `.github/workflows/`.
- `npm test` ejecuta primero `npm run build` y luego todas las pruebas Node.
- `npm run lint` y `npm run build` ya funcionan localmente.
- La compilación genera `dist/`, actualmente ignorado por Git.
- `.openai/hosting.json` configura Sites, pero no contiene D1 ni R2.
- El README todavía describe el starter y no documenta una reconstrucción portable de Trayecto.

## Decisiones de esta tarea

- Conservar `npm test` como comprobación completa compatible con las instrucciones actuales: compilación más suite Node.
- Añadir comandos separados para pruebas sin compilación, verificación, compilación y empaquetado, evitando ejecutar la compilación dos veces en CI.
- El flujo continuo debe ejecutar únicamente esos comandos del repositorio. Las acciones de GitHub sólo preparan Node, restauran dependencias, invocan npm y conservan el artefacto.
- El despliegue queda fuera del CI general. Sites y cualquier host futuro tendrán adaptadores separados y requerirán autorización explícita.
- No inventar URL, organización ni visibilidad del futuro repositorio remoto. Documentar el paso pendiente para configurar `origin` cuando el usuario elija el repositorio GitHub.

## Entregables

### Scripts npm

Definir comandos con responsabilidades claras:

- `npm run test:unit`: ejecutar `node --test tests/*.test.mjs` sin compilar;
- `npm run verify`: ejecutar lint y pruebas unitarias, sin desplegar ni depender de Sites;
- `npm run build`: conservar la compilación actual;
- `npm test`: conservar compilación más pruebas unitarias;
- `npm run package`: empaquetar un `dist/` ya compilado mediante un script Node portable.

`verify` y el workflow no deben descargar navegadores, consultar Bedelías, usar secretos ni iniciar servicios.

### Empaquetado portable

Crear un script Node sin dependencias nuevas que:

- falle claramente si `dist/` no existe;
- copie el resultado a una ruta exacta e ignorada bajo `outputs/`;
- limpie sólo su propio destino conocido, nunca `outputs/` completo ni rutas recibidas sin validación;
- produzca un manifiesto versionado con versión de Node, hash de `package-lock.json` y hashes SHA-256 ordenados de todos los archivos copiados;
- no incluya timestamps, rutas absolutas, secretos ni estado local, para que el manifiesto sea determinista con la misma entrada;
- use exclusivamente APIs estándar de Node y funcione en Windows y Linux;
- permita verificar el manifiesto generado mediante pruebas automatizadas o un modo acotado del script.

El artefacto no necesita ser un ZIP/TAR: un directorio autocontenido más manifiesto es suficiente y evita depender de utilidades del sistema. El empaquetador no debe afirmar compatibilidad con un runtime alternativo que todavía no se haya probado.

### CI inicial

Agregar un workflow de GitHub Actions que se active en `push` y `pull_request` y:

1. haga checkout;
2. configure la versión de Node declarada por el repositorio y caché npm;
3. ejecute `npm ci`;
4. ejecute `npm run verify`;
5. ejecute `npm run build` una sola vez;
6. ejecute `npm run package`;
7. suba el directorio portable como artefacto del workflow.

El YAML no debe contener lógica de negocio, secretos, despliegue, URLs de producción ni comandos equivalentes duplicados. Preferir versiones mayores estables de acciones oficiales y permisos mínimos de sólo lectura del contenido.

### Documentación de salida

Actualizar el README para identificar Trayecto y enlazar una guía nueva, por ejemplo `docs/portable-build.md`, que documente:

- requisitos exactos de Node/npm y uso de `package-lock.json`;
- reconstrucción desde un clon limpio mediante `npm ci`, `npm run verify`, `npm run build` y `npm run package`;
- contenido y verificación del artefacto;
- separación entre compilar, empaquetar y desplegar;
- variables/secretos que no pertenecen al repositorio;
- cómo conectar un remoto Git después de crear el repositorio canónico, usando placeholders y sin ejecutar el cambio;
- procedimiento conceptual para alojar el artefacto en otro runtime, dejando explícitas las partes todavía específicas de vinext/Cloudflare/Sites;
- checklist de salida de Sites que no afirme completado el ensayo de restauración previsto para B09.

## Pruebas obligatorias

- El empaquetador rechaza ausencia de `dist/` con un mensaje útil.
- Copia archivos anidados y genera hashes correctos y ordenados.
- Dos empaquetados del mismo fixture producen manifiestos idénticos.
- El manifiesto no contiene rutas absolutas ni timestamps variables.
- No elimina archivos fuera de su destino exacto.
- El workflow referencia únicamente scripts existentes en `package.json`.
- Una prueba documental o estructural comprueba pasos y permisos esenciales del workflow sin depender de GitHub.

## Límites

- No crear una cuenta, organización o repositorio GitHub.
- No ejecutar `git remote add`, push ni publicación.
- No modificar `.openai/hosting.json` ni desplegar.
- No añadir dependencias de producción o desarrollo.
- No introducir base de datos, autenticación o secretos.
- No rediseñar el sistema de build ni eliminar vinext/Cloudflare en esta fase.

## Verificación y cierre

- Ejecutar pruebas estrechas del empaquetador y workflow.
- Ejecutar `npm run verify`, `npm run build`, `npm run package`, `npm test` y `npm run lint` antes del commit; se acepta que lint/pruebas se repitan para demostrar los contratos públicos.
- Inspeccionar el artefacto generado y mantenerlo ignorado por Git.
- Actualizar `PROJECT_CONTEXT.md` con los comandos estables y la separación entre CI y despliegue.
- Crear un commit enfocado sin incluir `dist/`, `outputs/`, logs ni otros artefactos locales.

F02 queda cerrada cuando un clon limpio puede verificar, compilar y producir el mismo manifiesto portable mediante comandos del repositorio, el workflow sólo los orquesta y queda documentado que configurar el remoto y desplegar son acciones posteriores.
