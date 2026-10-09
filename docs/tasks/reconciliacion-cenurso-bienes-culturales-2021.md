# D03ad — Bienes Culturales, Plan 2021

## Estado y objetivo

Nodo preparado para implementación. Resolver con evidencia oficial el estado de la trayectoria de la Tecnicatura Universitaria en Bienes Culturales, Plan 2021, sin convertir su distribución tentativa por años en semestres obligatorios ni fusionar sus tres menciones.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D01, D02 y D03a integrados. Un solo subagente en un worktree dedicado desde el `main` actual; el coordinador revisa el resultado.

## Fuentes y decisiones que se deben verificar

- [FHCE, mallas curriculares](https://fhce.edu.uy/mallas-curriculares/) enumera mallas publicadas por semestre y coloca Bienes Culturales en «Próximamente» al 9/10/2026. Confirmar ese estado y no declarar ausencia permanente: registrar la carrera en `docs/carreras-a-actualizar.md` con ID del plan y disparador de nueva revisión.
- [Plan de estudios 2021](https://fhce.edu.uy/wp-content/uploads/2025/01/tubicu_museologia_version-final-rev-segun-DGJ-para-publicar.pdf), enlazado desde la [página de planes FHCE](https://fhce.edu.uy/plan-de-estudios-7/), establece un solo título, tres menciones certificables, cinco semestres y 200 créditos. Su «creditización por años» es expresamente tentativa y permite acreditar en cualquier momento. Inspeccionar visualmente la tabla y la nota al pie, además del texto.
- Investigar si FHCE/CENUR publicó otra malla vigente y completa para este mismo plan y sus sedes Colonia, Paysandú y Tacuarembó. No usar calendarios de dictado, programas aislados, EVA ni el orden de Bedelías como malla sugerida. Si existe malla autorizada, reproducirla; si la propia FHCE confirma que todavía no la publica, clasificar prudentemente como `no-official-trajectory-documented` para la revisión actual y conservar el recorrido orientativo provisional ya visible. Una mera búsqueda negativa no basta.
- Cotejar la proyección y auditoría existentes. Preservar IDs, progreso, catálogo `verified` y candidatos, las tres menciones, mínimos y bloques flexibles. No crear materias o equivalencias nuevas por nombre similar, ni duplicar el plan por sede.

## Artefactos, pruebas y entrega

- Versionar en `data/` evidencia normalizada con URL, autoridad, fecha, vigencia, alcance territorial y de menciones, filas/identidades cotejadas y huella reproducible de la porción fuente. Registrar el comando exacto de regeneración offline. Los PDF/HTML crudos pueden quedar en `tmp/` del worktree.
- Actualizar la auditoría, revisión e inventario de trayectorias de forma determinista; agregar pruebas del estado, la fuente, la conservación de tres menciones y de la trayectoria orientativa con materias reales. No atribuir los períodos orientativos a FHCE.
- Actualizar `PROJECT_CONTEXT.md` sólo si un hecho confirmado cambia el contexto transversal. Documentar aquí el resultado, verificaciones, riesgos y siguiente paso. Ejecutar pruebas focales, `npm test`, `npm run lint` si cambia código y `git diff --check`.
- Entregar commit enfocado, sin integrar, pushear ni desplegar desde el worktree.

## Resultado implementado

La revisión del 9/10/2026 documenta una ausencia actual y explícitamente temporal de trayectoria oficial publicada. El índice institucional de FHCE mantiene a Bienes Culturales bajo «Próximamente». La página vigente de la carrera confirma el único Plan 2021, sus tres menciones y las sedes Paysandú, Tacuarembó y Colonia, pero sólo enlaza planes, programas y calendarios: no publica una malla alternativa. Los portales regionales cotejados tampoco sustituyen esa ausencia con una trayectoria completa autorizada.

Las páginas 9 y 10 del Plan 2021 se inspeccionaron visualmente además de extraer su texto. El cuadro general distribuye 200 créditos por años, pero la nota declara tentativa la distribución de actividades integradas y permite acreditarlas en cualquier momento; el idioma también puede acreditarse en cualquier momento. Esas filas no se proyectan como semestres o períodos institucionales.

La evidencia normalizada queda en `data/fhce/bienes-culturales-2021-trajectory-review.json`, con autoridad, URL, fecha, alcance, filas cotejadas, páginas inspeccionadas y huellas SHA-256 de cada porción. La proyección conserva los IDs existentes, 64 entradas auditables —una verificada y 63 candidatas—, las tres menciones, las tres sedes y el progreso compartido. Cada mención recibe un orden no temporal con materias reales, marcado como `Recorrido orientativo generado`; las candidatas siguen siendo provisionales y no aportan a requisitos oficiales.

Regeneración offline exacta:

```powershell
npm run trajectory:fhce-bienes-culturales-2021
```

El comando valida la huella de la evidencia, la auditoría, la revisión, la conservación del catálogo y la atribución provisional; luego regenera la proyección, la cola de curaduría y el inventario D03 sin consultar la red.

## Verificación

- `npm run trajectory:fhce-bienes-culturales-2021`: aprobado; regeneró 139 planes y cerró D03ad con 1 identidad verificada y 63 candidatas.
- Pruebas focales de Bienes Culturales, inventario, cola de auditoría y presentación de planes registrados: 36 casos aprobados.
- `npm test`: build aprobado y 1010 pruebas aprobadas.
- `npm run lint`: aprobado sin errores.
- Flujo local comprobado visualmente en Currícula: el único Plan 2021 permite Colonia, Paysandú y Tacuarembó, conserva las tres menciones, muestra `Recorrido orientativo generado`, tramos `Selección orientativa Bedelías` y señaliza las materias candidatas como `Provisional`; no aparecen años o semestres atribuidos a FHCE.

## Riesgo y siguiente revisión

La composición de Bedelías demuestra identidades y agrupaciones administrativas, no una secuencia recomendada. Por eso el orden provisional puede diferir de la futura malla FHCE. Repetir el cotejo cuando FHCE retire la carrera de «Próximamente» y publique una malla por área o semestre, o cuando FHCE/CENUR publique una trayectoria completa autorizada para el Plan 2021; conservar IDs y progreso al reconciliarla.
