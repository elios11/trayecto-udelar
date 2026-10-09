# D03af — Sistemas Integrados de Producción Agropecuaria 2022

## Estado y objetivo

Nodo preparado para implementación. Reconciliar el Plan 2022 del Tecnólogo en Sistemas Integrados de Producción Agropecuaria de Melo con su publicación oficial y la composición técnica de Bedelías. El inventario D03 lo mantiene en `research-pending`: la auditoría del plan reconoce seis semestres y tres enfoques orientativos, pero la proyección usa áreas administrativas y sólo tres bloques están verificados; 43 entradas siguen como candidatas.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D01, D02 y D03a integrados. Un único subagente en un worktree propio basado en el `main` más reciente; el coordinador revisa el commit y la integración por separado.

## Fuentes y alcance a cotejar

- Plan publicado en el Diario Oficial: <https://impo.com.uy/diariooficial/2023/06/26/avisos.pdf>. Inspeccionar visualmente las páginas pertinentes y registrar URL, autoridad, fecha, vigencia expresamente publicada, páginas, huella y transcripción normalizada de la estructura curricular.
- Facultad de Agronomía: <https://portal.fagro.edu.uy/ensenanza/unidad-de-ensenanza/tecnologo-en-sistemas-integrados-de-produccion-agropecuaria/>; Facultad de Veterinaria: <https://www.fvet.edu.uy/ensenanza/grado/tecnologo-en-sistemas-integrados-de-produccion-agropecuaria/>. Verificar qué confirman sobre sede, duración, catálogo y enfoques; no trasladar a 2026 una oferta de un año previo.
- Snapshot conservado en `data/bedelias/cucel-tecnologo-en-sistemas-integrados-de-produccion-agropecuaria-2022.json`, auditoría en `data/bedelias/audits/official-source-audits.json`, proyección en `app/data/` e inventario D03. Bedelías valida identidades respaldadas, pero no acredita por sí sola vigencia de las 43 candidatas.

## Preguntas que debe resolver la auditoría

1. ¿El Plan publica una distribución real por semestres para cada ejemplo de énfasis, o sólo áreas, créditos y orientaciones flexibles? Reproducir únicamente los períodos y trayectorias explícitos. Si la fuente no publica orden semestral, documentar esa ausencia con evidencia; el recorrido generado sigue identificado como provisional, nunca como malla oficial.
2. ¿Cuáles de las 43 unidades técnicas aparecen con identidad exacta en el Plan, una grilla vigente, programa o resolución? Promover sólo esas; conservar el resto como candidatas recuperables. No crear aliases por similitud ni convertir los 299 créditos del catálogo en obligaciones acumulativas.
3. Comprobar los mínimos de 270 créditos, incluidos 167 obligatorios, 79 flexibles y 24 de Trabajo Final, y el alcance de las tres orientaciones. Revisar expresamente los bloques actuales de 5 y 3 créditos «no individualizados»: conservarlos sólo si el documento oficial respalda el saldo y el modelo no los presenta como materias cursables inventadas.
4. Conservar un único plan, título y progreso para Melo; los enfoques no son menciones certificadas salvo prueba oficial en contrario. Preservar IDs de materias y avance personal existentes; no deducir previaturas ni dictado actual del orden curricular.

## Artefactos, verificación y cierre

- Guardar evidencia normalizada versionada bajo `data/cucel/`, con correspondencias exactas, candidatas, fuentes, fechas, conflictos y huella reproducible de la porción auditada. Crear un generador offline que reconstruya la proyección, auditoría, revisión D03 e inventario sin otra extracción. Registrar aquí el comando exacto; dos ejecuciones deben dejar artefactos idénticos.
- Si existe una trayectoria oficial verificable, probar cantidad y orden de períodos, enfoques, materias visibles, bloques flexibles y créditos sin volver obligatorias todas las opciones. Si no existe, documentar la ausencia con evidencia suficiente y probar el aviso de recorrido orientativo generado. Un PDF de plan flexible no basta por sí solo para declarar ausencia de una malla publicada aparte.
- Actualizar `PROJECT_CONTEXT.md` sólo con decisiones estables confirmadas. Añadir `docs/carreras-a-actualizar.md` únicamente si una publicación oficial está en desarrollo, anuncia nueva malla o cubre parcialmente una sede/recorrido, con condición concreta de nueva revisión.
- Ejecutar pruebas focales, `npm test`, `npm run lint` si cambia código fuente, y `git diff --check`. Registrar aquí resultado, riesgos y próximo paso, crear un commit enfocado y dejarlo listo para integrar; no hacer push ni desplegar desde el worktree.
