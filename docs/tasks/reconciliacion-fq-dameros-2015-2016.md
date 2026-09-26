# D03i — Reconciliación de dameros de Facultad de Química 2015–2016

## Estado

Especificación lista para implementación en un worktree aislado basado en `main` después de D03h.

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

## Verificación y cierre

1. Ejecutar el generador de proyecciones y `npm run trajectory:inventory` dos veces, comprobando estabilidad determinista de los artefactos canónicos.
2. Ejecutar las pruebas focalizadas de los tres planes y del inventario.
3. Ejecutar `npm test`, `npm run lint` y `git diff --check`.
4. Crear un commit enfocado en el worktree y devolver hash, fuentes verificadas, cambios de conteo del inventario, riesgos y límites.

No integrar, hacer push ni publicar desde el subagente.
