# D03ay — Licenciatura en Ciencias de la Atmósfera

## Estado y objetivo

Auditoría de un solo plan: `bedelias-fcien-licenciatura-en-ciencias-de-la-atmosfera-2007`, base `main` `c4c8f98`. El inventario D03 conserva `research-pending` aunque los mínimos normativos y servicios compartidos ya están auditados. Investigar si FCIEN, FING o una autoridad Udelar publican una trayectoria sugerida vigente con materias/períodos. Reproducir sólo filas demostradas; si la documentación oficial confirma positivamente únicamente currículo individual sin grilla común, registrar ausencia documentada. No inferir ausencia de un enlace roto o silencio.

## Fuentes iniciales

- Plan Colibrí: `https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/24554/1/PLATM_2020.pdf`.
- FCIEN: `https://www.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-ciencias-de-la-atmosfera`.
- FING: `https://www.fing.edu.uy/es/carrera/grado/lic-en-ciencias-de-la-atm%C3%B3sfera` y `https://www.fing.edu.uy/es/paginas/lic-en-cs-de-la-atm%C3%B3sfera`.
- Auditoría y proyección versionadas en `data/bedelias/audits/official-source-audits.json` y `app/data/bedelias-generated/`.

Buscar también Comisión de Carrera, Udelar/CSE, Colibrí e IMPO para copias o nuevas versiones. Distinguir aprobación 2006 / identidad 2007, cuatro años / 60 meses administrativos, ingreso por ambas facultades y CIO regional como vía parcial sin sede completa. EVA y Bedelías por sí solos no prueban una secuencia.

## Criterios

1. Conservar un único título y progreso, 360 créditos, nueve mínimos por 279, 81 flexibles, currículo personal aprobado y Montevideo. No crear dos planes por FCIEN/FING.
2. No promover 173 códigos ni 238 apariciones acumuladas como currícula vigente sin respaldo inequívoco; no inventar semestres ni obligaciones. Si no hay grilla, mantener recorrido orientativo visible y provisional.
3. Guardar evidencia normalizada bajo `data/` con autoridad, URL, fecha, vigencia, alcance, filas cotejadas, huella y comando de regeneración offline. Si se verifica publicación parcial o en desarrollo, actualizar `docs/carreras-a-actualizar.md` con condición de revisión.
4. Actualizar inventario/revisión y pruebas focales preservando IDs y datos personales. Registrar contradicciones sin conciliación ficticia.

## Entrega

Dos regeneraciones idénticas, focales, `npm test`, `npm run lint`, `git diff --check`; commit aislado y hash. No integrar, pushear ni publicar desde este worktree.
