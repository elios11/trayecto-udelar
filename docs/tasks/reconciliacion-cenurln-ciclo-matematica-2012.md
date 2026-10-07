# D03aa — Ciclo Inicial en Matemática 2012

## Estado y objetivo

Nodo preparado. Auditar la trayectoria y el catálogo del Ciclo Inicial en Matemática (CIM) que Bedelías identifica como Plan 2012, sin confundirlo con el primer año del CIO Científico-Tecnológico ni con carreras posteriores que reconocen sus créditos.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D01, D02 y el inventario D03a ya integrados. Ejecutar en un worktree desde el `main` actual.

## Alcance

- Confirmar identidad, vigencia, duración y sede del CIM en fuentes actuales del CENUR Litoral Norte y Udelar. La auditoría previa indica Salto y dos años, pero debe contrastarse con la descripción de «segundo año» después del CIO-CT; no convertir una continuidad académica en semestres propios sin evidencia.
- Buscar una malla o trayectoria sugerida **del CIM**. Las listas «primer/segundo semestre» del CIO-CT describen ese ciclo de ingreso, no necesariamente el CIM. Si sólo se publican orientaciones flexibles o requisitos, documentarlo con fuentes suficientes y mantener un recorrido orientativo generado, etiquetado como provisional; no marcar una trayectoria como reproducida por una lista ajena.
- Cotejar cada materia que una fuente curricular vigente atribuya al CIM con el snapshot `data/bedelias/cenurln-ciclo-inicial-de-matematica-2012.json`. Bedelías contrasta código, créditos y previaturas, pero no prueba por sí sola inclusión ni semestre. Conservar identidades candidatas y progreso importado, sin promover por semejanza textual.
- Mantener sedes, posibles certificados y continuidades separados: Ingeniería, Ciencias, Química y carreras regionales no son títulos o perfiles internos del CIM sin decisión institucional explícita.
- Versionar un artefacto normalizado bajo `data/cenurln/` con URL, autoridad, fecha de consulta, vigencia, alcance, identidades cotejadas y huella reproducible; registrar aquí el comando offline de regeneración. Si la malla oficial está anunciada pero no publicada, o cubre sólo parte del CIM/sede, actualizar `docs/carreras-a-actualizar.md` con la brecha y condición concreta de revisión.
- Actualizar proyección, auditoría, inventario y `PROJECT_CONTEXT.md` sólo donde la evidencia lo permita. Si la evidencia no alcanza para declarar trayectoria o ausencia, conservar `research-pending` y entregar un checkpoint claro.

## Verificación y entrega

- Pruebas focales de alcance, autoridad curricular, identidad de materias, catálogo visible, períodos cuando existan y conservación de candidatos. Ninguna prueba debe dar por completa una malla por la composición de Bedelías o por el CIO-CT.
- Doble regeneración, `npm test`, `npm run lint` y `git diff --check`; commit enfocado sin ruido EOL ni planes ajenos.
- No integrar, pushear ni desplegar desde el worktree. El coordinador revisa el commit y repite verificaciones sobre el `main` combinado.

## Fuentes iniciales a verificar

- [CENUR Litoral Norte: Ciclo Inicial en Matemática](https://www.litoralnorte.udelar.edu.uy/457-ciclo-inicial-en-matematica).
- [Udelar: ficha de CIM](https://udelar.edu.uy/carrerasinterior/ciclo-inicial-en-matematica/).
- [Udelar: ingresos al segundo semestre de 2026](https://udelar.edu.uy/noticias/inscripciones-de-ingreso-carreras-de-la-udelar-en-el-2deg-semestre).
- [Udelar: CIO Científico-Tecnológico](https://udelar.edu.uy/carrerasinterior/ciclo-inicial-optativo-area-cientifico-tecnologico/), sólo para distinguir el ciclo previo de la trayectoria propia del CIM.

Estas URL son punto de partida de la auditoría, no demostración de malla propia ni de completitud.
