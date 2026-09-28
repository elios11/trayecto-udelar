# D03i — Reconciliación de dameros de Facultad de Química 2015–2016

## Estado

Implementación completada y validada el 28 de septiembre de 2026 en el worktree aislado de D03i. Los tres planes quedaron cerrados como `official-trajectory-reproduced`; no hay trabajo funcional pendiente dentro del nodo. Resta únicamente integrar el commit sobre el `main` vigente mediante el flujo del roadmap. No se hizo push ni publicación.

## Objetivo

Cerrar la correspondencia exacta entre las trayectorias predeterminadas de Currícula y los dameros oficiales vigentes de Facultad de Química para:

- Bioquímico Clínico, Plan 2015;
- Licenciatura en Química, Plan 2016;
- Químico, Plan 2015, incluidos sus cuatro recorridos vigentes.

Las materias y sus créditos ya cuentan con una auditoría oficial sustancial. Este nodo debe corregir la estructura y los rótulos de los períodos, perfiles y alcances territoriales sin ampliar la pertenencia curricular desde Bedelías ni congelar como obligatoria una oferta flexible cambiante.

## Fuentes obligatorias

Usar las fuentes oficiales ya registradas para cada plan en `data/official-trajectories/inventory.json` y `data/bedelias/audits/official-source-audits.json`. Verificar visualmente los dameros enlazados antes de modelarlos y guardar cualquier artefacto temporal bajo `tmp/d03i-fq-dameros/`.

La jerarquía de autoridad es:

1. damero o resolución vigente de Facultad de Química para orden y períodos sugeridos;
2. plan de estudios e instructivos vigentes para créditos, mínimos, títulos y flexibilidad;
3. catálogo Udelar y publicaciones territoriales para sedes y continuidad;
4. Bedelías sólo como contraste de código, créditos y reglas de identidades ya demostradas;
5. EVA únicamente como apoyo, nunca como fuente de pertenencia u orden.

## Alcance funcional

### Bioquímico Clínico 2015

- Reproducir los diez semestres del damero vigente aprobado por Resolución 112/2026.
- Conservar Bioquímica Opción II, Laboratorio de Bioquímica y el Practicantado de 55 créditos según la resolución vigente.
- Representar Montevideo como carrera completa y Salto únicamente con el primer año demostrado; no duplicar el plan.

### Licenciatura en Química 2016

- Reproducir los ocho semestres del damero vigente aprobado por Resolución 112/2026.
- Conservar Bioquímica Opción II, Laboratorio de Bioquímica y Proyecto Específico de Título con los créditos propios de esta carrera.
- Representar Montevideo como carrera completa y Salto únicamente con el primer año demostrado.

### Químico 2015

- Reproducir diez semestres reales para Agrícola y Medio Ambiente, Calidad, Materiales y el recorrido Sin orientación.
- Mantener un único plan y título, con recorridos seleccionables que compartan sólo las identidades realmente comunes.
- Respetar Montevideo, Paysandú y Salto según el alcance oficial: no ofrecer como completa en una sede una orientación que sólo esté documentada parcialmente.
- Separar los bloques flexibles de la secuencia sugerida y evitar que optativas o electivas históricas se vuelvan obligaciones permanentes.

## Reglas de modelado

- La trayectoria predeterminada debe mostrar los rótulos y la cantidad de períodos publicados, no áreas ni agrupaciones administrativas en su lugar.
- Toda materia enumerada en un período oficial debe conservar al menos una identidad canónica visible en Currícula.
- Una misma materia compartida entre recorridos conserva identidad estable; no se duplica para satisfacer conteos.
- No inferir previas, equivalencias, vigencia territorial ni obligatoriedad por similitud de texto.
- No corregir silenciosamente contradicciones entre damero y Bedelías: priorizar la fuente curricular y registrar el conflicto.
- Las opciones flexibles deben quedar en catálogo separado cuando la fuente no fija una edición permanente.

## Artefactos esperados

- Auditorías y revisiones curadas actualizadas.
- Proyecciones regeneradas de los tres planes.
- Inventario D03 regenerado, con los tres planes en `official-trajectory-reproduced` si se logra correspondencia exacta.
- Pruebas focalizadas que validen períodos, colocaciones, perfiles, sedes, créditos y ausencia de duplicación.
- Estado y resultados finales documentados en este archivo.

## Resultado implementado

- Bioquímico Clínico 2015 reproduce diez semestres en Montevideo. El Practicantado conserva una sola identidad acreditable de 55 créditos en décimo semestre y un bloque de inicio sin créditos en noveno, de modo que se representa su extensión temporal sin duplicar créditos. Salto continúa limitado al primer año y a sus 17 alternativas regionales verificadas.
- Licenciatura en Química 2016 reproduce ocho semestres en Montevideo. El Proyecto Específico de Título se representa con inicio en séptimo, guía de 20 créditos de asignaturas específicas y Tesis de 40 créditos en octavo, sin duplicar la identidad acreditable. Salto continúa limitado al primer año y a sus cinco alternativas regionales verificadas.
- Químico 2015 reproduce diez semestres para Agrícola y Medio Ambiente, Calidad, Materiales y Sin orientación. Practicantado queda en décimo semestre; Internado, Proyecto específico y el bloque flexible propio de cada recorrido permanecen disponibles en catálogo sin convertirse en materias fijas de la grilla. Paysandú sólo completa Agrícola y Medio Ambiente y Salto sigue siendo un primer año con continuidad.
- El generador admite `excludedPeriodCourseIds`, por lo que una alternativa normativa puede permanecer publicada en catálogo aunque se quite de la secuencia sugerida.
- El planificador construye para cada plan la unión de todas las materias verificadas referenciadas por cualquier trayectoria publicada y por sus catálogos, sin depender del recorrido activo ni de carga diferida. Conserva el semestre del recorrido activo y presenta como `opt` lo disponible sólo en otros recorridos; candidatos, registros administrativos, rechazados, equivalentes históricos y duplicados no publicados quedan fuera.
- La cola de auditoría y la cola curricular se regeneraron para mantener sus hashes alineados con el registro y el reporte derivados.

## Fuentes verificadas visualmente

Se revisaron las páginas relevantes de los nueve PDF oficiales, renderizados bajo `tmp/d03i-fq-dameros/`:

- Bioquímico Clínico: damero Resolución 112/2026 y Plan de Estudios 2015.
- Licenciatura en Química: damero Resolución 112/2026 e instructivo vigente del Plan 2016.
- Químico: Plan de Estudios 2015 y dameros vigentes de Agrícola y Medio Ambiente (Resolución 74/2025), Calidad, Materiales (Resolución 112/2026) y Sin orientación.

La revisión confirmó rótulos y cantidad de semestres, unidades enumeradas, créditos de las actividades finales, bloques flexibles y alcance de cada recorrido. Las URL canónicas y el soporte de cada una quedaron registrados en `data/bedelias/audits/official-source-audits.json` y `data/official-trajectories/reviews.json`.

## Inventario y límites

- Inventario anterior: 75 planes reproducidos, 15 con fuente pendiente, 1 sin trayectoria documentada y 56 por investigar.
- Inventario final: 78 reproducidos, 12 con fuente pendiente, 1 sin trayectoria documentada y 56 por investigar, sobre 147 planes seleccionables.
- La oferta concreta de optativas, electivas y unidades cursables en el interior puede cambiar por período; este nodo publica sólo identidades vigentes demostradas y no infiere oferta temporal.
- El registro duplicado `fq-733-3` se preserva como evidencia extraída, pero no se expone en el planificador porque ningún damero ni catálogo vigente publicado lo referencia. La identidad vigente `733A` sí permanece disponible.
- La Comisión de Carrera continúa siendo la autoridad para validar orientación, equivalencias, selección flexible, actividad final y egreso.

## Verificación ejecutada

- `node scripts/bedelias-audit-queue.mjs`: 184 identidades canónicas y 0 pendientes.
- `node scripts/bedelias-ui-curriculum-queue.mjs`: 139 planes con malla y 0 pendientes de composición.
- `node scripts/build-extracted-academic-plans.mjs` y `npm run trajectory:inventory`: ejecutados dos veces; las tres proyecciones FQ y los dos inventarios comparados conservaron SHA-256 idénticos entre corridas.
- Pruebas focalizadas de los tres planes, inventario y unión del catálogo del planificador: 30/30.
- `npm test`: compilación completa y 915/915 pruebas.
- `npm run lint`: sin errores.
- `git diff --check`: sin errores.

## Verificación y cierre

1. Ejecutar el generador de proyecciones y `npm run trajectory:inventory` dos veces, comprobando estabilidad determinista de los artefactos canónicos.
2. Ejecutar las pruebas focalizadas de los tres planes y del inventario.
3. Ejecutar `npm test`, `npm run lint` y `git diff --check`.
4. Crear un commit enfocado en el worktree y devolver hash, fuentes verificadas, cambios de conteo del inventario, riesgos y límites.

No integrar, hacer push ni publicar desde el subagente.
