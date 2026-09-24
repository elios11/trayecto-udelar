# D03c — Reconciliación FHCE, lote 2

## Estado

Implementado y validado el 23 de septiembre de 2026. Continúa la reconciliación secuencial de FHCE después de Letras, Lingüística y Educación.

## Modelo y dependencias

- Modelo: `gpt-5.6-sol`.
- Esfuerzo: `xhigh`.
- Dependencias: D03b integrado y publicado.
- Planes incluidos:
  - `bedelias-fhum-historia-2014` — Licenciatura en Historia, Plan 2014.
  - `bedelias-fhum-filosofia-2010` — Licenciatura en Filosofía, Plan 2010.
  - `bedelias-fhum-antropologia-2014` — Licenciatura en Ciencias Antropológicas, Plan 2014.

## Objetivo

Investigar y reconciliar cada plan contra la malla, grilla o trayectoria sugerida oficial vigente que publique FHCE. Currícula debe reproducir períodos, opciones, bloques flexibles y alcance oficial; las áreas y mínimos se conservan como reglas y no sustituyen una secuencia publicada.

## Reglas de autoridad

- Usar exclusivamente fuentes oficiales de FHCE, Udelar u órganos académicos competentes para estructura, vigencia e inclusión curricular.
- Priorizar la página vigente de mallas curriculares, mallas por semestre, planes de estudio y resoluciones.
- Bedelías sólo contrasta identidades, códigos, créditos y reglas. Su composición u orden no crean una trayectoria.
- EVA no acredita pertenencia curricular.
- Reconciliar por código o identidad documentada; nunca por similitud aproximada.
- Una búsqueda fallida no acredita ausencia de trayectoria oficial.

## Requisitos por plan

1. Registrar fuentes, versión, fecha de consulta, vigencia y alcance.
2. Determinar períodos y cualquier opción o perfil oficial sin inventar menciones.
3. En Antropología, preservar separadamente las opciones oficiales sólo si la fuente vigente las define, compartiendo el núcleo cuando corresponda.
4. Publicar como `verified` únicamente materias y bloques respaldados por fuente curricular.
5. Modelar elecciones genéricas como bloques oficiales sin acreditar una materia ficticia.
6. Mantener variantes históricas, administrativas o no demostradas como candidatas recuperables fuera de Currícula.
7. Conservar créditos, áreas, mínimos, requisitos y discrepancias documentales sin corregirlos artificialmente.
8. Preservar IDs personales existentes cuando la identidad esté demostrada; no migrar ni borrar progreso automáticamente.

Si no existe evidencia suficiente para cerrar un plan, debe permanecer pendiente con la brecha documentada. No usar Bedelías como fallback visual.

## Implementación

- Reutilizar el mecanismo auditado de `data/fhce/official-trajectories-2014.json` o generalizarlo de forma acotada si Filosofía 2010 exige otra versión; evitar condicionales en `app/page.tsx`.
- Mantener carga diferida y el registro actual.
- Actualizar auditorías/revisiones, regenerar proyecciones e inventario determinísticamente.
- Registrar conteos antes/después por estado de autoridad.
- Actualizar `PROJECT_CONTEXT.md` sólo con resultados confirmados.

## Criterios de cierre

- Cada plan cerrado reproduce exactamente sus períodos, opciones y bloques oficiales.
- Toda materia enumerada explícitamente conserva al menos una identidad canónica visible.
- Ninguna candidata basada sólo en Bedelías/EVA aparece en Currícula o el planificador normal.
- La generación repetida produce los mismos hashes y no modifica planes ajenos al lote.
- Pasan pruebas estrechas, `npm run trajectory:inventory`, `npm test`, `npm run lint` y `git diff --check`.
- La entrega incluye commit enfocado, fuentes, conteos, limitaciones y planes pendientes.

## Fuera de alcance

- Otras carreras de FHCE o servicios.
- Deduplicación aproximada.
- Cambios generales de interfaz, cuentas, persistencia remota o dependencias.

## Resultado implementado

- Historia 2014 reproduce la malla FHCE de julio de 2026 en ocho semestres y conserva la continuidad CFE como una segunda vía oficial de dos bloques: reconocimiento de 245 créditos y requisitos posteriores. Ambas conducen al mismo título.
- Filosofía 2010 reproduce la malla FHCE de julio de 2026 en ocho semestres y mantiene una sola trayectoria flexible. Los mínimos vigentes son 143, 10, 149, 20, 13 y 25 créditos; los 149 flexibles se desagregan en 65, 32 y 52.
- Ciencias Antropológicas 2014 conserva exclusivamente las tres opciones tituladas documentadas por FHCE: Antropología Biológica, Arqueología y Antropología Social. Cada opción reproduce ocho semestres de las mallas de julio de 2025 y comparte el primer año.
- Las elecciones genéricas y las identidades no demostradas por una coincidencia exacta se representan como bloques curriculares de cero créditos o permanecen como candidatas de auditoría; ninguna candidata se incorpora a los períodos visibles.

## Fuentes oficiales cerradas

- Índice FHCE de mallas curriculares: `https://fhce.edu.uy/mallas-curriculares/`.
- Historia: malla por semestre y malla por área de julio de 2026, más el Plan 2014 publicado por FHCE.
- Filosofía: malla por semestre y malla por área de julio de 2026, más el Plan 2010 publicado por FHCE.
- Ciencias Antropológicas: página oficial de opciones, las tres mallas por semestre de julio de 2025 y el Plan 2014 publicado por FHCE.

## Conteos de autoridad

Orden: `verified / candidate / historical-equivalent / administrative / rejected`.

- Historia: `49 / 154 / 3 / 0 / 1` antes; `40 / 180 / 0 / 0 / 0` después.
- Filosofía: `32 / 248 / 3 / 0 / 0` antes; `29 / 263 / 0 / 0 / 0` después.
- Ciencias Antropológicas: `1 / 272 / 0 / 0 / 0` antes; `67 / 260 / 0 / 0 / 0` después.
- Inventario D03: `66` reproducidas, `19` con fuente pendiente y `62` por investigar sobre `147` planes.

## Limitaciones documentadas

- Las mallas publican varias elecciones por categoría sin identificar una unidad concreta; esos bloques no acreditan créditos por sí mismos y requieren selección o validación académica.
- La fuente de continuidad CFE de Historia publica el reconocimiento y los requisitos restantes, no una distribución semestral de esa vía.
- La metodología específica de Antropología Social es anual y se muestra como inicio y continuación, sin duplicar sus 16 créditos.

## Verificación de cierre

- La proyección completa se generó nuevamente y una repetición conservó los mismos hashes para los tres planes y los agregados controlados.
- Las pruebas estrechas de Historia, Filosofía, Ciencias Antropológicas, proyecciones diferidas, UI e inventario pasaron.
- `npm run trajectory:inventory` pasó y reprodujo los conteos registrados arriba.
- `npm test` pasó con `909/909` pruebas.
- `npm run lint` y `git diff --check` pasaron sin observaciones.
