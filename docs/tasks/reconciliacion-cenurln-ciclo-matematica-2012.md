# D03aa — Ciclo Inicial en Matemática 2012

## Estado y objetivo

Nodo implementado y validado. La auditoría reconcilia la trayectoria y el catálogo del Ciclo Inicial en Matemática (CIM) que Bedelías identifica como Plan 2012, sin confundirlo con el primer año del CIO Científico-Tecnológico ni con carreras posteriores que reconocen sus créditos.

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

## Checkpoint final — 2026-10-07

- Fuente curricular propia localizada: el Plan de Estudio de pregrado «Ciclo Inicial de Matemática», aprobado por Resolución Nº 81 del Consejo de Facultad de Ciencias (24/09/2012) y Resolución Nº 30 del CDC (18/12/2012), publicado en el Diario Oficial Nº 28.655 del 08/02/2013. El plan define una propuesta amplia y flexible, admite distintas trayectorias, exige un Plan de Formación individual aprobado por la Comisión de Carrera y enumera ejemplos de asignaturas, pero no fija semestres ni una trayectoria sugerida única.
- Evidencia vigente localizada: el Departamento de Matemática y Estadística del Litoral publica actualmente seis cursos del CIM y separa expresamente las UC del CIO-CT de las UC del CIM. La página de ingresos de Udelar mantiene el CIM abierto en Salto en el segundo semestre de 2026.
- Resultado documental: `no-official-trajectory-documented`. La flexibilidad está expresamente establecida por el plan; no se deriva del silencio de una búsqueda. Los semestres primero y segundo del CIO-CT son antecedentes de ingreso y no se proyectarán como períodos propios del CIM.
- Duración: el plan académico define un año propio después del CIO-CT; las fichas de difusión describen dos años para el recorrido acumulado CIO-CT + CIM. La proyección debe conservar ambos alcances sin convertir el año previo en semestres del CIM.
- Cobertura: ocho UC propias tienen correspondencia oficial inequívoca con Bedelías y se publican con sus códigos y cargas verificadas. Las otras 21 entradas del snapshot permanecen candidatas recuperables; entre ellas se conservan las UC previas del CIO-CT y no se las promueve por su ubicación administrativa. El Plan aprobado también enumera 22 ejemplos opcionales sin código ni carga: se conservan como identidades oficiales sólo-fuente, electivas, con carga no publicada y sin afirmar oferta vigente ni equivalencia con entradas de Bedelías de nombre parecido.
- Alcance de los 160 créditos: las ocho UC cotejadas suman 86 créditos, todos matemáticos, frente a los 160 totales y 120 de Matemática exigidos. La proyección conserva esta cobertura como metadata `creditComputationCoverage` y la UI muestra un aviso accesible de «Cómputo parcial» junto a las metas: la formación previa CIO-CT o equivalente y las opciones del Plan de Formación individual todavía no se computan y requieren validación de la Comisión de Carrera. No se alteran los cálculos, candidatos o equivalencias ni se habilita ingreso manual de créditos; los ejemplos opcionales no se convierten en obligaciones u oferta vigente.
- Artefactos durables: `data/cenurln/ciclo-inicial-matematica-2012.json` conserva fuentes, autoridad, consulta, vigencia, alcance, identidades, conflictos y la huella de `sourcePortions`; `data/official-trajectories/reviews.json` registra la ausencia documentada con fuente, fecha y justificación. No se modificó `docs/carreras-a-actualizar.md` porque la evidencia no anuncia una malla futura ni muestra una brecha territorial publicada: la falta de secuencia es parte del diseño flexible aprobado.
- Regeneración offline y reanudación: `npm run trajectory:cenurln-cim-2012`. El comando valida la huella y la frontera 8 cotejadas + 22 sólo-fuente + 21 candidatas antes de reconstruir la proyección, la cola y el inventario. Se ejecutó dos veces consecutivas con el mismo resultado.
- Última validación: prueba focal propia 5/5 (incluye tope computable, metadata y marcado accesible), oferta vigente 5/5 y presentación registrada 3/3; doble regeneración estable; `npm test` 998/998, `npm run lint` sin observaciones y `git diff --check` limpio. El servidor de desarrollo alcanzó `http://localhost:4317/`, pero la sesión no expuso navegador ni superficie CUA para inspección visual directa; el build completo y la prueba específica validan el render condicional y el aviso `role="note"` con nombre accesible.
- Siguiente paso: revisar y enmendar el commit enfocado D03aa con el aviso de cobertura parcial. Una revisión futura sólo requiere reconsultar las fuentes institucionales si el CIM publica códigos, cargas, una nueva oferta o una secuencia que cambie esta ausencia documentada.
