# D03ai — Ingeniería Agronómica, Plan 2020

## Estado y objetivo

Nodo preparado el 11 de octubre de 2026; investigación e implementación pendientes. El inventario D03 mantiene `bedelias-fagro-ingeniero-agronomo-2020` en `research-pending`: la auditoría existente confirma el plan y sus sedes, pero no demuestra una trayectoria sugerida oficial ni su ausencia. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; dependen D01, D02 y D03a. Un solo subagente y un worktree dedicado basado en el `main` que incluye D03ah; el coordinador revisa e integra.

## Fuentes y frontera de autoridad

- Partir de `data/bedelias/audits/official-source-audits.json`, `data/bedelias/fagro-ingeniero-agronomo-2020.json`, el snapshot regional y la proyección existente. No repetir la extracción completa de sus 717 entradas.
- Cotejar visualmente las páginas pertinentes del [Plan 2020 aprobado](https://portal.fagro.edu.uy/wp-content/uploads/2025/07/PE2020-Ingeniero-Agronomo-Fagro-Udelar.pdf) con las [páginas actuales de la carrera](https://portal.fagro.edu.uy/ensenanza/unidad-de-ensenanza/ingenieria-agronomica/) y de primer a quinto año, sus listas institucionales de cursos y el catálogo de programas. Investigar si publican una malla/recorrido sugerido vigente por semestre, año, ciclo o sistema de producción; registrar vigencia, sede y cohorte.
- La tabla semestral visible en la página principal está explícitamente titulada **Plan 1989** y no puede proyectarse como Plan 2020. Las listas de cursos 2026 son evidencia de oferta de ese período, no por sí solas una trayectoria estable ni garantía de futuras ediciones.
- El Plan 2020 define cinco años de 450 créditos, tres ciclos (90/180/180), primeros años de tronco común y un último ciclo flexible con tutor, sistema de producción y TFG de 45 créditos. Separar materias obligatorias, áreas de formación obligatoria, optativas/electivas, pasantías y trabajo final; no exigir todas las alternativas ni inventar un perfil certificado.
- Conservar un solo plan y progreso para Montevideo, Paysandú y Salto; verificar qué tramo o sistema de producción está publicado para cada sede antes de afirmar cobertura completa o reutilizar una grilla central. Si la fuente anuncia implementación progresiva, malla futura o cobertura territorial parcial, registrar la brecha en `docs/carreras-a-actualizar.md`.
- Promover una entrada de Bedelías sólo si plan, grilla, programa vigente o resolución oficial respaldan exactamente su identidad e inclusión. EVA no acredita pertenencia. Resolver conflictos de código/créditos con evidencia; nunca fusionar por parecido de nombre.

## Resultado exigido

- Si existe trayectoria sugerida oficial, reproducir períodos, orden, materias y variantes demostradas. Si fuentes suficientes documentan que no se publica una, usar `no-official-trajectory-documented` y mantener un recorrido orientativo generado, explícitamente provisional, con materias reales y opciones recuperables. Si la evidencia sigue incompleta, conservar `research-pending` y documentar la brecha sin vaciar la currícula.
- Versionar evidencia normalizada en `data/fagro/` con URL institucional, autoridad, fecha, vigencia, alcance, filas/códigos cotejados, conflictos y huellas reproducibles. Crear generador offline para proyección, auditoría e inventario; dos regeneraciones idénticas. Mantener 717 entradas originales como auditoría/candidatas recuperables y evitar publicar asientos administrativos como cursos.
- Pruebas deterministas de períodos, identidades visibles, créditos y frontera de candidatos; `npm test`, `npm run lint`, `git diff --check`. Documentar aquí comandos, resultados, limitaciones y siguiente paso. Commit enfocado en el worktree, sin integrar, push ni despliegue desde allí.
