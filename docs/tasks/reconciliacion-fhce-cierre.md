# D03e — Cierre de trayectorias asociadas a FHCE

## Estado

Pendiente de implementación. Cierra los planes todavía no resueltos del inventario que se presentan bajo FHCE o dependen académicamente de ella.

## Modelo y dependencias

- Modelo: `gpt-5.6-sol`.
- Esfuerzo: `xhigh`.
- Dependencias: D03d integrado y publicado.
- Planes incluidos:
  - `bedelias-fhum-dramaturgia-2015` — Tecnicatura Universitaria en Dramaturgia, Plan 2015.
  - `bedelias-fhum-museologia-2011` — Tecnicatura Universitaria en Museología, Plan 2011.
  - `bedelias-cure-licenciatura-en-turismo-2014` — Licenciatura en Turismo, Plan 2014, presentada también bajo FHCE.

## Objetivo

Determinar para cada plan si existe una trayectoria sugerida oficial y reproducirla fielmente. Cuando la institución publique únicamente una estructura por áreas, mínimos o bloques —y la búsqueda oficial suficiente no encuentre una secuencia sugerida— conservar esa estructura sin inventar semestres y documentar la ausencia de una trayectoria secuencial.

## Reglas de autoridad

- Usar exclusivamente fuentes oficiales de FHCE, CURE, Udelar u órganos académicos competentes para estructura, vigencia e inclusión curricular.
- Priorizar mallas por semestre, grillas, planes de estudio, páginas institucionales y resoluciones.
- Una malla o grilla secuencial oficial prevalece sobre una proyección por áreas.
- Bedelías sólo contrasta identidades, códigos, créditos y reglas. Su composición u orden no crean una trayectoria.
- EVA no acredita pertenencia curricular.
- Reconciliar por código o identidad documentada; nunca por similitud aproximada.
- Una búsqueda fallida aislada no acredita ausencia de trayectoria; la conclusión debe registrar el conjunto de fuentes oficiales revisado.

## Requisitos específicos

1. Buscar una trayectoria sugerida oficial para cada plan y registrar fuente, versión, fecha, vigencia y alcance.
2. Reproducir exactamente períodos, opciones, sedes y bloques cuando exista una malla secuencial.
3. Si sólo existe estructura oficial por áreas o mínimos, conservarla como proyección no secuencial y explicitar que no es un orden de cursado sugerido.
4. En Turismo, verificar la relación FHCE/CURE y representar una sola carrera/plan con sus sedes y responsables reales; no duplicarla por servicio.
5. En Dramaturgia, preservar la gestión compartida con EMAD, el régimen de cohortes/cupos y las obligaciones oficiales sin inferir previaturas.
6. En Museología, verificar vigencia, sede, duración y cualquier cambio institucional posterior al Plan 2011 antes de publicarlo como trayectoria actual.
7. Publicar como `verified` sólo materias y bloques respaldados por fuente curricular oficial; las elecciones genéricas deben ser bloques y no materias ficticias.
8. Mantener variantes históricas, administrativas o no demostradas como candidatas recuperables fuera de Currícula.
9. Preservar IDs personales existentes cuando la identidad esté demostrada; no migrar ni borrar progreso automáticamente.

## Implementación

- Reutilizar el mecanismo auditado de trayectorias oficiales y evitar condicionales en `app/page.tsx`.
- Mantener carga diferida y el registro actual.
- Actualizar auditorías/revisiones, regenerar proyecciones e inventario determinísticamente.
- Registrar conteos antes/después por estado de autoridad.
- Actualizar `PROJECT_CONTEXT.md` sólo con resultados confirmados.

## Criterios de cierre

- Cada plan reproduce su trayectoria oficial o documenta de forma suficiente que sólo existe una estructura no secuencial.
- Toda materia enumerada explícitamente conserva al menos una identidad canónica visible.
- Ninguna candidata basada sólo en Bedelías/EVA aparece en Currícula o el planificador normal.
- Turismo no se duplica entre FHCE y CURE ni comparte progreso con identidades no demostradas.
- La generación repetida produce los mismos hashes y no modifica planes ajenos al lote.
- Pasan pruebas estrechas, `npm run trajectory:inventory`, `npm test`, `npm run lint` y `git diff --check`.
- La entrega incluye commit enfocado, fuentes, conteos, limitaciones y conclusión de cierre de FHCE.

## Fuera de alcance

- Otros servicios o planes no vinculados al lote.
- Deduplicación aproximada.
- Cambios generales de interfaz, cuentas, persistencia remota o dependencias.

## Resultado implementado

- Dramaturgia 2015 reproduce la malla FHCE de julio de 2026 en cuatro semestres. Conserva la gestión conjunta FHCE-EMAD y el ingreso por cohortes con cupo; sólo las nueve unidades nominales de la malla y sus doce bloques curriculares quedan visibles.
- Museología 2011 reproduce en un único recorrido los seis semestres del plan histórico, más la validación final ya exigida por el producto. El catálogo acumulado y las seis opciones temáticas permanecen recuperables, pero no se presentan como seis trayectorias. El plan sigue sin nuevos ingresos y no se fusiona con Bienes Culturales 2021.
- Turismo 2014 queda documentada como currícula flexible sin trayectoria secuencial publicada: FHCE anuncia la malla como “Próximamente” y CURE publica áreas, mínimos, sedes y flexibilidad, no un orden por semestre. Se conserva una sola carrera con Maldonado y Salto bajo responsabilidad académica de FHCE.

## Fuentes oficiales cerradas

- Índice de mallas FHCE: `https://fhce.edu.uy/mallas-curriculares/`.
- Dramaturgia: mallas por semestre y área de julio de 2026, Plan 2015 y página vigente FHCE-EMAD.
- Museología: Plan de Estudios histórico publicado por FHCE y página vigente de Bienes Culturales.
- Turismo: página vigente de CURE y estado “Próximamente” del índice de mallas FHCE.

## Conteos de autoridad

Orden: `verified / candidate / historical-equivalent / administrative / rejected`.

- Dramaturgia: `80 / 50 / 0 / 0 / 0` antes; `21 / 120 / 0 / 0 / 7` después.
- Museología: `23 / 369 / 0 / 0 / 0` antes; `17 / 378 / 0 / 0 / 0` después.
- Turismo no cambia su catálogo: conserva `28 / 353 / 13 / 0 / 0` y pasa a ausencia documentada de trayectoria secuencial.
- Inventario D03: `71` reproducidas, `19` con fuente pendiente, `1` sin trayectoria secuencial documentada y `56` por investigar sobre `147` planes.

## Limitaciones documentadas

- Los bloques genéricos de optativas, electivas y lengua extranjera no acreditan por sí solos una unidad concreta salvo cuando la malla publica un bloque acreditable explícito.
- El período “Validación de egreso” de Museología es un control del producto para las opciones, equivalencias y pasantía; no agrega créditos ni altera los seis semestres oficiales.
- Turismo debe revisarse nuevamente cuando FHCE publique la malla anunciada.
