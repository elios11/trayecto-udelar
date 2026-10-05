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
