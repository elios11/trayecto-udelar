# D03d — Reconciliación FHCE, Estudios Sordos e Interpretación LSU

## Estado

Implementado y pendiente sólo de integración. Los tres planes reproducen sus períodos oficiales, conservan las candidatas fuera de la experiencia normal y tienen pruebas explícitas de identidad y progreso.

## Modelo y dependencias

- Modelo: `gpt-5.6-sol`.
- Esfuerzo: `xhigh`.
- Dependencias: D03c integrado y publicado.
- Planes incluidos:
  - `bedelias-fhum-licenciatura-en-estudios-sordos-2025` — Licenciatura en Estudios Sordos, Plan 2025.
  - `bedelias-fhum-tecnologo-int-y-trad-lsu-esp-2025` — Tecnólogo en Interpretación y Traducción LSU-Español, Plan 2025.
  - `bedelias-fhum-interpretacion-lsu-espanol-lsu-2014` — carrera de Interpretación LSU-Español-LSU, Plan 2014.

## Objetivo

Investigar y reconciliar cada plan contra la trayectoria, malla o grilla sugerida oficial vigente. Currícula debe reproducir los períodos y bloques publicados y distinguir con claridad carreras, títulos y versiones históricas relacionadas.

## Reglas de autoridad

- Usar exclusivamente fuentes oficiales de FHCE, Udelar u órganos académicos competentes para estructura, vigencia e inclusión curricular.
- Priorizar mallas por semestre, planes de estudio, páginas institucionales y resoluciones.
- Bedelías sólo contrasta identidades, códigos, créditos y reglas. Su composición u orden no crean una trayectoria.
- EVA no acredita pertenencia curricular.
- Reconciliar por código o identidad documentada; nunca por similitud aproximada.
- Una búsqueda fallida no acredita ausencia de trayectoria oficial.

## Requisitos específicos

1. Determinar y documentar la relación académica entre la Licenciatura en Estudios Sordos 2025, el Tecnólogo en Interpretación y Traducción LSU-Español 2025 y el plan 2014.
2. No asumir sucesión, equivalencia, reválida ni progreso compartido entre carreras o planes sin evidencia oficial explícita.
3. Preservar por separado las credenciales, el estado de vigencia, las condiciones de ingreso y las trayectorias de cada plan.
4. Reproducir exactamente períodos, orientaciones y bloques flexibles cuando exista una malla oficial publicada.
5. Publicar como `verified` únicamente materias y bloques respaldados por una fuente curricular oficial.
6. Modelar elecciones genéricas como bloques oficiales sin acreditar una materia ficticia.
7. Mantener variantes históricas, administrativas o no demostradas como candidatas recuperables fuera de Currícula.
8. Preservar IDs personales existentes cuando la identidad esté demostrada; no migrar, fusionar ni borrar progreso automáticamente.
9. Probar explícitamente que no se mezcla progreso ni se duplican materias entre 2014, 2025, la licenciatura y el tecnólogo.

Si no existe evidencia suficiente para cerrar un plan, debe permanecer pendiente con la brecha documentada. No usar Bedelías como fallback visual.

## Implementación

- Reutilizar el mecanismo auditado de trayectorias oficiales de FHCE y generalizarlo sólo de forma acotada si la versión 2025 lo requiere; evitar condicionales en `app/page.tsx`.
- Mantener carga diferida y el registro actual.
- Actualizar auditorías/revisiones, regenerar proyecciones e inventario determinísticamente.
- Registrar conteos antes/después por estado de autoridad.
- Actualizar `PROJECT_CONTEXT.md` sólo con resultados confirmados.

## Criterios de cierre

- Cada plan cerrado reproduce exactamente sus períodos, opciones y bloques oficiales.
- Toda materia enumerada explícitamente conserva al menos una identidad canónica visible.
- Ninguna candidata basada sólo en Bedelías/EVA aparece en Currícula o el planificador normal.
- No existe fusión accidental de identidades o progreso entre los tres planes.
- La generación repetida produce los mismos hashes y no modifica planes ajenos al lote.
- Pasan pruebas estrechas, `npm run trajectory:inventory`, `npm test`, `npm run lint` y `git diff --check`.
- La entrega incluye commit enfocado, fuentes, conteos, limitaciones y planes pendientes.

## Fuera de alcance

- Otras carreras de FHCE o servicios.
- Deduplicación aproximada.
- Migraciones automáticas entre planes.
- Cambios generales de interfaz, cuentas, persistencia remota o dependencias.

## Resultado implementado

- El Plan 2014 reproduce dos recorridos lingüísticos de seis semestres según la malla FHCE de julio de 2025. Mantiene mínimo normativo de 270 créditos aunque la carga de las unidades ofrecidas en esa malla suma 271.
- El Tecnólogo Plan 2025 reproduce seis semestres y el bloque de lengua extranjera ubicable entre los semestres 1 y 6. La Licenciatura agrega los semestres 7 y 8 y conserva las credenciales intermedia de 270 créditos y final de 360.
- La fuente conjunta de 2025 declara que los primeros tres años de la Licenciatura corresponden al Tecnólogo. Por eso esas dos identidades comparten IDs del núcleo y progreso; el Plan 2014 usa IDs y progreso propios.
- Los recorridos se corrigieron conforme a los planes: estudiantes oyentes cursan estructuras del español como lengua primera y extensión de LSU como segunda lengua; estudiantes sordos cursan estructura de LSU y extensión de español escrito.
- Las optativas, electivas, actividades integrales, lengua extranjera y metodologías sin unidad única documentada se publican como bloques curriculares de cero créditos. Los créditos se controlan en los mínimos de área y de credencial, sin acreditar una materia ficticia.
- Las 180 entradas no demostradas de Bedelías de cada proyección permanecen como `candidate` en los artefactos, pero no aparecen en `publishedPathways` ni en el catálogo normal.

## Fuentes oficiales consultadas

- FHCE, [Planes de estudio](https://fhce.edu.uy/plan-de-estudios-4/): publica por separado los planes 2014 y 2025 del Tecnólogo y la Licenciatura 2025.
- FHCE, [Mallas curriculares](https://fhce.edu.uy/mallas-curriculares/): define la malla como adaptación del plan a la oferta efectiva y enlaza la trayectoria vigente del área.
- FHCE, [Malla curricular ILSU, julio de 2025](https://fhce.edu.uy/wp-content/uploads/2025/07/ILSU-Malla-curricular-junio2025.pdf): orden de los seis semestres del Plan 2014 y carga de la oferta efectiva.
- FHCE, [Plan de Estudios 2014 TUILSU](https://fhce.edu.uy/wp-content/uploads/2023/01/TUILSU_Plan_2014.pdf): mínimo de 270 créditos, áreas y recorridos según lengua primera y segunda.
- FHCE, [Plan conjunto 2025](https://fhce.edu.uy/wp-content/uploads/2025/06/PLAN_de_Licenciatura_de_Estudios_Sordos.pdf): períodos, mínimos, dos credenciales, condiciones de ingreso y articulación explícita Tecnólogo–Licenciatura.
- FHCE, [Licenciatura en Estudios Sordos](https://fhce.edu.uy/licenciatura-en-estudios-sordos/): apertura y servicio responsable de la Licenciatura.
- Udelar, [Interpretación LSU-Español-LSU](https://udelar.edu.uy/carrera/interpretacion-lsu-espanol-lsu): duración, créditos, sedes y condiciones de ingreso del Tecnólogo.

Bedelías se usó sólo para contrastar códigos, créditos y reglas. No se usaron EVA ni la composición de Bedelías para crear pertenencia u orden.

## Conteos de autoridad

| Plan | Antes (`verified` / `candidate`) | Después (`verified` / `candidate`) | Visible / oculto |
| --- | ---: | ---: | ---: |
| Interpretación LSU-Español-LSU 2014 | 195 / 6 | 30 / 180 | 30 / 180 |
| Tecnólogo 2025 | 195 / 6 | 30 / 180 | 30 / 180 |
| Licenciatura 2025 | 205 / 6 | 39 / 180 | 39 / 180 |

El inventario D03 pasó de 66 a 69 trayectorias reproducidas; quedan 19 con fuente identificada y 59 por investigar, para un total pendiente de 78.

## Limitaciones documentadas

- FHCE no publicó una equivalencia, reválida ni migración automática entre el Plan 2014 y los planes 2025. No se infirió ninguna.
- La distribución de bloques flexibles del Plan 2025 es una organización posible del anexo y no identifica por sí sola una unidad concreta; futuras ofertas deberán sustituir esos bloques sólo con evidencia oficial.
- La malla efectiva 2014 suma 271 créditos, mientras el Plan exige 270; se conserva la carga normativa como requisito de egreso y la discrepancia queda visible en el aviso.
- La sede completa documentada de la Licenciatura es Montevideo. Salto se conserva para el Tecnólogo y no se extiende a la Licenciatura por inferencia.

## Validación

- Pruebas estrechas de ambos recorridos, inventario, proyecciones extraídas y UI: correctas.
- `npm run trajectory:inventory`: 147 planes; 69 reproducidos, 19 con fuente pendiente, 59 por investigar.
- `npm test`: correcto.
- `npm run lint`: correcto.
- `git diff --check`: correcto.
- Se regeneraron dos veces las proyecciones y el inventario; la segunda ejecución no produjo diferencias adicionales.
