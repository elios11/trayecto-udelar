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

Nodo preparado el 10 de octubre de 2026. Pendiente investigación documental y ejecución.
