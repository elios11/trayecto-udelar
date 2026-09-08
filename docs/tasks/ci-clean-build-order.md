# Corrección — orden de compilación en CI

## Problema

En un clon limpio, `npm run verify` ejecutaba la suite antes de generar `dist/`. Las pruebas que renderizan `dist/server/index.js` fallaban en GitHub Actions aunque pudieran pasar localmente cuando quedaba una compilación anterior en disco.

La ejecución fallida confirmó tres síntomas de esa única causa: dos casos de `tests/rendered-html.test.mjs` y el caso de renderizado de `tests/theme-preferences.test.mjs`.

## Decisión

- `npm run verify` ejecuta lint, una única compilación y luego toda la suite Node.
- El workflow no vuelve a ejecutar `npm run build`; `npm run package` reutiliza el `dist/` ya verificado.
- La prueba estructural del workflow fija este orden para evitar regresiones.

## Criterios de cierre

- `npm run verify` funciona sin un `dist/` preexistente.
- CI compila exactamente una vez antes de ejecutar pruebas que dependen del servidor generado.
- `npm run package` y la verificación del manifiesto portable siguen funcionando.
