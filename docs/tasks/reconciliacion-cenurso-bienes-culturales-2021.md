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
