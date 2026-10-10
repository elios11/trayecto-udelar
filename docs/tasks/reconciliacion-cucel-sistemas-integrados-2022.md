# D03af — Sistemas Integrados de Producción Agropecuaria 2022

## Estado y objetivo

Implementación D03af validada y lista para integrar. El Plan 2022 del Tecnólogo en Sistemas Integrados de Producción Agropecuaria de Melo quedó reconciliado con su publicación oficial y la composición técnica de Bedelías. El inventario D03 pasó de `research-pending` a `official-trajectory-reproduced`: la proyección ya no usa áreas administrativas como períodos y conserva seis semestres oficiales, cuatro selecciones flexibles y una frontera estricta entre identidades verificadas y candidatas.

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

## Resultado de la auditoría

- IMPO publica una estructura semestral real. Los cuadros 4 y 5 ubican los bloques comunes en seis semestres. El cuadro 6 agrega una selección optativa para el ejemplo de Sistemas Integrados y el cuadro 7 hace lo mismo para el ejemplo Económico-Social.
- El Plan nombra también el foco en Manejo sustentable de los Recursos Naturales y habilita trayectorias personales, pero no publica para ellos una grilla optativa propia. Ambos conservan los seis semestres comunes y el catálogo flexible, sin asignar optativas a un período por inferencia.
- El título sigue siendo único y los enfoques no son menciones certificadas. La auditoría no afirma inscripción abierta ni dictado actual de las unidades.
- El egreso conserva `167 + 79 + 24 = 270` créditos. Los totales flexibles impresos de los dos ejemplos suman 81 y 85; se conservan como dato del ejemplo, no como cargas por materia ni mínimos acumulativos.
- De las 43 entradas de Bedelías, sólo `SPS` coincide exactamente con código y nombre del Plan y se promueve. Las otras 42 mantienen autoridad `candidate` e IDs recuperables; en particular `O31T`, `CUT-O31T`, `CUT-MITMR` y `CUT-O33T` no se enlazan mediante aliases. MIMR e IERN se representan como bloques propios de la fuente oficial, sin equipararlos a esos códigos técnicos.
- Las 38 abreviaturas del Plan que no tienen carga individual publicada se modelan como bloques curriculares de 0 créditos y `creditsPublished: false`, no como materias cursables inventadas. Los bloques existentes de 5 y 3 créditos se preservan con los mismos IDs como saldos estructurales derivados y quedan fuera de los semestres; el Trabajo Final mantiene su ID y sus 24 créditos en el sexto semestre.
- La proyección resultante contiene 84 registros: 42 verificados y 42 candidatos. Las cuatro trayectorias suman 124 ubicaciones cotejadas y seis períodos cada una.

## Evidencia y límite visual

La evidencia normalizada y sus huellas viven en `data/cucel/sistemas-integrados-produccion-agropecuaria-2022-trajectory-review.json`. Registra las páginas PDF 82–86 de la extracción estructurada de IMPO (páginas impresas 166–172), las líneas de trazabilidad de los cuadros, las fichas institucionales de Fagro, Fvet y Udelar, el snapshot técnico y dos documentos EVA usados sólo como corroboración auxiliar.

No se declara inspección visual del PDF: la captura web devolvió `Cache miss` y la descarga directa agotó el tiempo de espera. La estructura se cotejó contra la extracción textual organizada por páginas y tablas. La inspección visual de esas páginas queda como riesgo de QA recuperable, no como brecha que autorice a inventar o degradar la malla.

No se agregó una entrada a `docs/carreras-a-actualizar.md`: las fuentes consultadas no anuncian una malla futura, una implantación progresiva ni una sede parcial. Una nueva revisión corresponde si aparece una publicación curricular oficial nueva o si IMPO permite completar el control visual.

## Regeneración y checkpoint

Comando offline:

```powershell
npm.cmd run trajectory:cucel-sistemas-integrados-2022
```

El generador valida huellas, frontera de autoridad, seis semestres, 124 ubicaciones e IDs estructurales; reconstruye auditoría, revisión D03, proyección, colas e inventario sin red. Dos ejecuciones consecutivas produjeron el mismo SHA-256 agregado para los artefactos regenerados: `ed9dfe3010601aaa9df68f0b660d200ddbe1eb6f485e0eff6d44876eddd4e180`.

Verificación final:

- `node tests/tesipa-official-audit.test.mjs`: 8/8 pruebas aprobadas.
- `node tests/official-trajectory-inventory.test.mjs`: 25/25 pruebas aprobadas.
- `npm.cmd test`: build completo y 1018/1018 pruebas aprobadas.
- `npm.cmd run lint`: aprobado sin observaciones.
- `git diff --check`: aprobado.

Riesgo abierto: falta únicamente el control visual de las páginas 82–86 del PDF IMPO por indisponibilidad del binario en esta sesión. La estructura y las correspondencias quedan reproducibles desde la evidencia normalizada; no se usó ese límite para inferir créditos, identidades, semestres ni vigencia.
