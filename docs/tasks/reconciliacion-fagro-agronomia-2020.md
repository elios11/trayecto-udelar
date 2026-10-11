# D03ai — Ingeniería Agronómica, Plan 2020

## Estado y objetivo

Implementado y validado en el worktree D03ai el 11 de octubre de 2026. `bedelias-fagro-ingeniero-agronomo-2020` pasa de `research-pending` a `official-trajectory-reproduced`: el Plan 2020 aprobado publica dos grillas tentativas e indicativas de diez semestres, una con máximo y otra con mínimo de AFO III. Son guías flexibles del mismo título, no perfiles certificados ni secuencias obligatorias. El coordinador conserva la revisión e integración pendientes.

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

## Evidencia y decisión

- Evidencia normalizada: `data/fagro/ingenieria-agronomica-2020-trajectory-review.json`.
- El PDF oficial fue cotejado visualmente en sus páginas 4 a 11. Sus páginas 9 a 11 llaman **TENTATIVAS** a las grillas y el texto del Plan las define como ejemplos indicativos de posibles trayectorias. Huella SHA-256 del PDF crudo: `6013c05243034b6894fb7e53def80225b7c0a5f8d0fba4c7da60314c61c1f308`.
- El formulario institucional ARCU-SUR fue cotejado visualmente en sus páginas 51 y 52 sólo como antecedente de implementación hasta 2022; no autoriza a importar cuarto y quinto del Plan 1989. Huella SHA-256 del PDF crudo: `42a01f916ff96e2a0e42d3ee5556ebec9337dceead7615f838411f50fea63bf7`.
- La página de la carrera separa explícitamente el Plan 2020 de la «Currícula académica Plan 1989». La tabla nominal semestral de portada queda fuera de la proyección.
- Las páginas por año y sus planillas corresponden a oferta 2026. Cuarto y quinto advierten que la información puede cambiar o incorporar nueva oferta; se registran como evidencia periódica sin autoridad para redefinir la trayectoria estable.
- Los dos ejemplos oficiales cierran diez semestres de 45 créditos: 45 colocaciones en «máximo AFO III» y 49 en «mínimo AFO III». La capa verificada contiene 61 bloques de fuente. Las 717 identidades ya extraídas de FAGRO/CENURLN se reutilizan y permanecen candidatas recuperables, sin períodos ni reglas publicadas.

## Regeneración y verificación

Comando offline y reanudable:

```powershell
npm run trajectory:fagro-agronomia-2020
```

El generador valida huellas, límites Plan 1989/oferta 2026, totales por semestre, equivalencia de los dos snapshots de 717 entradas, actualiza auditoría/revisión/proyección/colas/inventario y exige la correspondencia de 94 colocaciones. Dos ejecuciones consecutivas deben producir hashes idénticos en todos los artefactos generados.

Comprobaciones finales ejecutadas:

- `npm run trajectory:fagro-agronomia-2020` dos veces: pasó; nueve artefactos derivados conservaron hashes SHA-256 idénticos entre corridas.
- Pruebas focales ejecutadas directamente sobre `tests/fagro-agronomia-2020-trajectory.test.mjs`, `tests/fagro-official-audit.test.mjs`, `tests/extracted-academic-plans.test.mjs` y `tests/official-trajectory-inventory.test.mjs`: 39/39 pasaron. La invocación conjunta inicial del runner dentro del sandbox devolvió `spawn EPERM`; ejecutar los mismos cuatro archivos sin workers confirmó el resultado y `npm test` volvió a cubrirlos con el runner normal.
- `npm test`: pasó; compilación de producción y 1033/1033 pruebas.
- `npm run lint`: pasó sin observaciones.
- `git diff --check`: pasó sin errores.

## Límites y siguiente paso

La grilla aprobada no asigna una trayectoria completa estable por sede ni por sistema de producción. `docs/carreras-a-actualizar.md` conserva esa brecha y pide revisar sólo cuando Fagro publique una malla permanente que sustituya las planillas anuales o modifique los anexos del Plan 2020. No se infiere continuidad territorial desde la oferta 2026. El commit aislado `0223662` se integró en `main` como `6fcc3a3`; allí volvieron a pasar la compilación, las 1033 pruebas y el lint. Push y despliegue quedan para un lote posterior.
