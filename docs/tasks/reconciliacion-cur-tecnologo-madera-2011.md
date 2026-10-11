# D03ah — Tecnólogo en Madera, Plan 2011 (identidad técnica 2012)

## Objetivo y alcance

Revisar la trayectoria predeterminada de Tecnólogo en Madera en Rivera. El inventario D03 mantiene `bedelias-cur-tecnologo-en-madera-2012` en `research-pending`: la auditoría del plan confirma seis semestres, 270 créditos y currículo flexible, pero no demuestra que la vista actual por áreas reproduzca una trayectoria sugerida oficial ni que tal trayectoria no se publique. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; dependen D01, D02 y D03a. Un solo worktree basado en el `main` actual; el coordinador revisa e integra.

## Fuentes y decisiones a verificar

- Partir de la auditoría `tecnologo en madera:2012` en `data/bedelias/audits/official-source-audits.json`, del snapshot `data/bedelias/cur-tecnologo-en-madera-2012.json` y de la proyección existente; no repetir su extracción completa.
- Examinar íntegramente las páginas pertinentes del Plan 2011 aprobado por el CDC en <https://www.impo.com.uy/diariooficial/2011/11/21/avisos.pdf>, sus anexos y las publicaciones actuales de <https://www.fing.edu.uy/es/carrera/grado/tecn%C3%B3logo-en-madera-rivera> y <https://portal.fagro.edu.uy/ensenanza/unidad-de-ensenanza/tecnologo-de-la-madera/>. Buscar además una grilla semestral oficial vigente del servicio o la coordinación; registrar intentos y conflictos. La vigencia del plan no prueba que cada una de las 63 entradas administrativas sea oferta actual.
- Distinguir rigurosamente entre una secuencia recomendada, ejemplos de combinaciones por énfasis y obligaciones. No convertir los tres ejemplos en menciones oficiales ni la composición por áreas en semestres atribuidos a la institución. No inferir identidad, equivalencia, período o dictado por parecido de nombres o códigos.
- Si existe trayectoria sugerida oficial, reproducir sus períodos, identidades, alternativas y créditos exactamente. Si fuentes suficientes documentan ausencia de sugerencia, declarar `no-official-trajectory-documented` y mantener un recorrido orientativo provisional con materias reales, optativas recuperables y procedencia explícita. Si persiste duda material, conservar `research-pending` con brecha precisa y sin vaciar la currícula.

## Artefactos y verificación

- Versionar evidencia normalizada en `data/cur/` con URL, autoridad, fecha de consulta, vigencia publicada, alcance, páginas/filas cotejadas, huella de fuente reproducible y conflictos. Los HTML/PDF crudos pueden quedar en `tmp/`; la regeneración futura debe ser offline.
- Crear o extender generador y pruebas deterministas para reconstruir proyección, auditoría, revisión e inventario desde los datos versionados. Ejecutar dos regeneraciones idénticas; documentar aquí comando exacto, huellas y resultado.
- Preservar los 270 créditos, mínimos por área, actividades obligatorias, aprobación de Comisión y candidatos recuperables; no promover entradas sólo por Bedelías/EVA. Evitar un período curricular ficticio «Validación de egreso» si es sólo requisito manual.
- Actualizar `docs/carreras-a-actualizar.md` únicamente si la evidencia oficial muestra implementación progresiva, malla futura o cobertura territorial parcial, con ID, fuente, brecha y condición de revisión. `PROJECT_CONTEXT.md` sólo cambia si se modifica una convención estable.
- Ejecutar focales, `npm test`, `npm run lint` al modificar código y `git diff --check`. Crear commit enfocado; no integrar, pushear ni desplegar desde el worktree.

## Estado recuperable

Implementado en el worktree dedicado el 10 de octubre de 2026. Tras una interrupción por límite de uso, el coordinador reanudó las verificaciones el 11 de octubre y lo integró en `main` mediante `6473d9c`.

### Resultado documental

- El Plan 2011 aprobado por resolución 20 del CDC de 25/10/2011 publica seis semestres, 270 créditos, mínimos por área y aprobación de la Comisión. Su Anexo III se titula «posible implementación del Plan de estudios» y distribuye 54 ubicaciones en seis semestres.
- La ficha vigente de DGETP-UTU, publicada el 21/06/2024, reproduce esas mismas 54 ubicaciones bajo «Plan de estudios» para la carrera conjunta en Rivera. Esa republicación por una de las autoridades de la carrera permite cerrar el inventario como `official-trajectory-reproduced` con mecanismo `official-periods`.
- La grilla se modela como guía flexible, no como secuencia obligatoria: reúne 342 créditos disponibles, mientras el egreso exige elegir un currículo coherente de 270 créditos, cumplir los mínimos y obtener aprobación de la Comisión.
- Los tres cuadros del Anexo IV, de 267, 262 y 271 créditos, permanecen ejemplos de combinaciones por énfasis. No se convierten en menciones, perfiles ni trayectorias certificadas separadas.
- Cincuenta y tres identidades coinciden exactamente por código con Bedelías. `Marketing` se conserva como opción oficial sólo-fuente porque no hay equivalencia publicada con `GP1 Comercialización`; `GP1` y otras nueve entradas administrativas permanecen candidatas.
- Se documentan los conflictos `TIMEM` (sin carga publicada frente a 11 en Bedelías), `ETC4` (5 en el Anexo II frente a 6 en Bedelías y mínimo común de 66) y `SE4` (11 en Anexo III frente a 7 en Anexo II y Bedelías), sin ocultar ni extrapolar autoridad.

### Evidencia y reproducción

- Evidencia normalizada: `data/cur/tecnologo-madera-2011.json`.
- PDF institucional de FING inspeccionado visualmente en sus 11 páginas: SHA-256 `afef87b689b0878f58708b9d24ac0ea3a62d3ec80c000e778d4081a031b14566`.
- Snapshot de Bedelías cotejado: SHA-256 `82ef6c74215a2b24dd2f9aa28b703f84df5a4fdc662891dd538dfc11e4f18500`.
- Huella normalizada conjunta de las porciones de fuente: `sha256:d25e38c9af5f60edb993bbfd7c23133e93fd37f59a2f5673edd9adc5b745d53c`.
- Comando offline: `npm run trajectory:cur-madera-2011`.
- Dos ejecuciones consecutivas produjeron la misma huella combinada de artefactos: `e9d79f0263c7992e2bf5170b9d48bcd8095159cb6180d68ae14df6653d2e826c`.

No se actualiza `docs/carreras-a-actualizar.md`: las fuentes vigentes cubren la carrera completa en Rivera y no anuncian una implementación progresiva, una malla futura ni un tramo territorial parcial.

### Verificación tras reanudación

- Una nueva regeneración offline mantuvo idénticas las huellas SHA-256 de la evidencia, auditoría, revisión, inventario y proyección.
- Pruebas focales D03ah, inventario y auditoría: 35/35.
- `npm.cmd test`: compilación y 1029/1029 pruebas.
- `npm.cmd run lint`: aprobado.
- Sobre el `main` combinado: `npm.cmd test` (1029/1029) y `npm.cmd run lint` aprobados. Push y despliegue quedan para un lote posterior.
