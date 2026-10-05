# D03v — Trayectoria oficial de Licenciatura en Administración 2012

## Estado y objetivo

Nodo preparado. Reconciliar la Currícula de la Licenciatura en Administración Plan 2012 con la grilla indicativa vigente publicada por FCEA, conservando los mínimos, el progreso y las identidades académicas existentes.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D03a y de la auditoría oficial de la carrera ya integrada.

## Alcance

- Cotejar la grilla de FCEA actualizada en julio de 2026, sus períodos, materias obligatorias y opciones, con la proyección actual `app/data/bedelias-generated/bedelias-fcea-licenciatura-en-administracion-2012.json` y la auditoría guardada.
- Reproducir los semestres publicados sin convertir optativas, alternativas o unidades de doble dictado en obligaciones acumulativas. Conservar catálogos flexibles con todas las identidades verificadas pertinentes, sin publicar candidatos basados sólo en Bedelías.
- Mantener IDs de progreso; documentar cualquier alias o discrepancia de código/créditos, sin fusionar por mera similitud de nombre.
- Registrar fuente, fecha y correspondencia estructurada en `data/official-trajectories/reviews.json`; regenerar el inventario sin red.
- Si la fuente oficial sólo cubre parte del plan o anuncia ampliaciones futuras, registrar alcance y nueva condición de revisión en `docs/carreras-a-actualizar.md`, sin extrapolar.

## Cierre

- Pruebas específicas contrastan períodos y colocaciones con la fuente, preservación de materias oficiales en Currícula y disponibilidad verificada en el planificador.
- Pasan pruebas estrechas, `npm test`, `npm run lint` y `git diff --check`.
- Entregar un commit aislado listo para integración; no hacer push ni desplegar desde el worktree.

## Fuentes iniciales

- [FCEA: Licenciatura en Administración y grilla curricular](https://fcea.udelar.edu.uy/depto-adm-ensenanza/lic-adm-ciencias-adm.html).
- [FCEA: resoluciones de interés](https://fcea.udelar.edu.uy/bedelia-carreras-grado/resoluciones-de-interes.html).

Las fuentes deben comprobarse de nuevo al implementar. EVA y la composición de Bedelías no son autoridad de inclusión curricular.
