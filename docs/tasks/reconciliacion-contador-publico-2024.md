# D03u — Trayectoria oficial de Contador Público 2024

## Estado y objetivo

Nodo preparado para implementación. Reconciliar la Currícula de Contador Público Plan 2024 con las grillas semestrales vigentes publicadas por FCEA, conservando los cinco perfiles certificados y el progreso único ya auditados.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D03a y de la auditoría oficial de Contador Público 2024 ya integradas.

## Alcance

- Comparar exhaustivamente las grillas del ciclo común y de cada perfil con la proyección actual `app/data/bedelias-generated/bedelias-fcea-contador-publico-2024.json` y su auditoría en `data/bedelias/audits/official-source-audits.json`.
- Reproducir sólo períodos, materias, alternativas y bloques flexibles que la fuente oficial respalde. Mantener un catálogo normal únicamente con identidades oficiales verificadas; Bedelías contrasta código, créditos y previas, sin acreditar por sí sola inclusión vigente.
- Evitar duplicar unidades compartidas entre perfiles o convertir alternativas en obligaciones acumulativas. Preservar los IDs de progreso existentes o documentar explícitamente cualquier incompatibilidad.
- Registrar fuente, fecha, variantes y correspondencia estructurada en `data/official-trajectories/reviews.json`; regenerar `data/official-trajectories/inventory.json` sin red.
- Si la publicación oficial cubre sólo parte de un perfil o promete una futura malla, registrar la brecha y condición de nueva revisión en `docs/carreras-a-actualizar.md`. No completar períodos por extrapolación.

## Criterios de cierre

- Pruebas específicas cotejan semestres y perfiles con la fuente oficial, identidad canónica visible de cada materia publicada y disponibilidad de todas las verificadas en el planificador.
- `npm run trajectory:inventory`, pruebas estrechas, `npm test`, `npm run lint` y `git diff --check` pasan.
- La documentación compartida se actualiza en el mismo commit si cambia una decisión o hecho transversal.
- El nodo termina en un commit aislado listo para revisión. Integración local, push y despliegue quedan a cargo del coordinador; no se publica desde el worktree.

## Fuentes iniciales

- [FCEA: Contador Público, Plan 2024, ciclo común, perfiles y grillas](https://fcea.udelar.edu.uy/ensenanza/las-carreras-de-fcea/7538-contador-publico-planes-varios.html).
- [FCEA: resoluciones de interés](https://fcea.udelar.edu.uy/bedelia-carreras-grado/resoluciones-de-interes.html).

Estas fuentes se deben verificar de nuevo al implementar; una página institucional puede cambiar. No usar EVA como autoridad curricular.

## Estado de implementación

- Fuente FCEA revisada el 5 de octubre de 2026: publicación completa, actualizada en julio de 2026, con ciclo común, catálogos flexibles y las cinco grillas de perfil. No corresponde registrar una brecha en `docs/carreras-a-actualizar.md`.
- Artefacto auditable: `data/fcea/contador-publico-2024-trayectorias.json`. Regeneración: `node scripts/build-extracted-academic-plans.mjs` y `npm run trajectory:inventory`.
- Resultado: 101 identidades verificadas, 27 asientos históricos excluidos y 232 colocaciones exactas distribuidas en cinco recorridos de ocho semestres (47, 43, 50, 46 y 46).
- Validación final: `npm run trajectory:inventory`, pruebas específicas (24/24), `npm test` (972/972), `npm run lint` y `git diff --check` ejecutados antes del commit aislado.
