# D03w — Trayectoria oficial de Licenciatura en Economía 2012

## Estado y objetivo

Nodo preparado. Reconciliar Currícula y planificador de Licenciatura en Economía Plan 2012 con la grilla vigente y las trayectorias sugeridas publicadas por FCEA, sin alterar el título ni el progreso existentes.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D03a, D03u y D03v ya integrados; se ejecuta en un worktree desde el `main` actual.

## Alcance

- Revisar la grilla FCEA actualizada en julio de 2026: períodos, materias obligatorias, optativas y bloques flexibles. Revisar también el documento oficial de trayectorias opcionales por perfil si sigue vigente.
- Comparar cada identidad con la proyección y auditoría existentes. Una entrada de Bedelías sin respaldo curricular exacto queda candidata, no visible como oferta normal. Conservar IDs de progreso y registrar equivalencias sólo si la fuente las acredita.
- Reproducir períodos y perfiles con el alcance que publica FCEA; no convertir guías no certificadas en menciones, ni sumar todas las alternativas como obligaciones. El planificador debe reunir las identidades verificadas de todos los recorridos y catálogos sin duplicados.
- Registrar evidencia, fecha, discrepancias y correspondencia estructurada; regenerar el inventario determinista sin red. Si una publicación es parcial o anuncia futura ampliación, registrar la brecha en `docs/carreras-a-actualizar.md` en el mismo commit.
- Conservar en el repo un artefacto curricular normalizado reutilizable con URL exacta, autoridad, fecha de consulta, vigencia publicada, alcance, filas/códigos y una huella de la porción fuente que se cotejó. Registrar en la especificación el comando determinista que regenera la proyección desde ese artefacto. Las descargas crudas pueden permanecer en `tmp/` y no se deben necesitar para volver a generar los datos; una revisión futura sólo reconsulta la página si su versión o huella cambia.

## Verificación y entrega

- Pruebas específicas comparan semestres y colocaciones con la fuente, preservan cada identidad oficial visible y controlan la unión del catálogo del planificador.
- Ejecutar pruebas focales, `npm test`, `npm run lint` y `git diff --check` antes de crear un commit enfocado.
- No integrar, pushear ni desplegar desde el worktree; el coordinador revisa el commit y valida nuevamente el `main` combinado.

## Fuentes iniciales

- [FCEA: Licenciatura en Economía](https://fcea.udelar.edu.uy/ensenanza-dpto-economia/licenciatura-en-economia.html).
- [FCEA: ficha de la carrera, grilla y trayectorias sugeridas](https://fcea.udelar.edu.uy/ensenanza/las-carreras-de-fcea/155-licenciado-en-economia.html).

Verificar vigencia y contenido durante la implementación. EVA y la composición de Bedelías no son autoridad de inclusión curricular.

## Resultado auditado

- Consulta: 2026-10-05. Vigencia publicada: grilla FCEA actualizada en julio de 2026 para Montevideo, con ocho semestres y 360 créditos.
- Evidencia versionada: `data/fcea/economia-2012-trayectoria.json`. Contiene autoridad, URL exacta y función de cada documento; 81 filas de grilla y 83 identidades verificadas; mínimos, alternativas y cuatro guías no certificadas; contrastes puntuales con Bedelías y trayectorias normalizadas para comprobar la proyección.
- Huellas reproducibles: `sha256:7cd7b1fd61c360bd944c32021eb01ea7929c9843826dc229dad20a105fc14072` para `mainGrid` y `sha256:a38b9bf4b02ea3b46352a7f43bb749eccbcda0dff93b5cbf9786816548fe9b79` para `suggestedGuides`. La canonicalización es `JSON.stringify` de cada sección conservando el orden versionado.
- No se detectó una publicación parcial ni una ampliación futura anunciada. La oferta opcional puede variar por semestre, pero la grilla curricular cotejada está publicada como vigente; por eso no corresponde agregar esta carrera a `docs/carreras-a-actualizar.md`.

Discrepancias resueltas sin extrapolar:

- `MC52` tiene 15 créditos en la grilla vigente y aparece repartida en Bedelías como 10 básicos más 5 opcionales. Se conserva `fcea-mc52-2` como identidad canónica de 15 créditos y `fcea-mc52-3` sólo como alias histórico explícito de progreso.
- `UADA1` y `UADA2` permanecen como IDs de progreso distintos para el doble dictado de una actividad opcional de 5 créditos; no se suman como obligación.
- `I90` usa los 25 créditos de la grilla vigente. Los 20 impresos en la guía Académica y su total histórico de 100 se conservan en el artefacto como evidencia, sin recalcularlos ni convertirlos en la carga vigente.
- Las categorías abiertas y pares alternativos de las guías permanecen como recomendaciones. No se inventan materias, menciones ni equivalencias por semejanza de nombre.

## Regeneración sin extracción

Desde la raíz del repositorio:

```powershell
npm run trajectory:economia-2012
node scripts/bedelias-audit-queue.mjs
node scripts/bedelias-ui-curriculum-queue.mjs
npm run trajectory:inventory
```

El primer comando verifica ambas huellas y la estructura normalizada antes de reconstruir la proyección. Ningún comando requiere el HTML o PDF crudo ni acceso de red; una revisión futura sólo debe volver a consultar las URLs institucionales para detectar una nueva versión publicada y, si corresponde, actualizar las filas y huellas versionadas.
