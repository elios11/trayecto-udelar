# D03b — Reconciliación FHCE, lote 1

## Estado

Implementado y validado el 2026-09-23. Los tres planes quedaron cerrados con su trayectoria oficial vigente y sin publicar variantes demostradas únicamente por Bedelías.

## Modelo y dependencias

- Modelo: `gpt-5.6-sol`.
- Esfuerzo: `xhigh`.
- Dependencias: D01, D02, D03a y el piloto TUCE integrados.
- Planes incluidos:
  - `bedelias-fhum-letras-2014` — Licenciatura en Letras, Plan 2014.
  - `bedelias-fhum-linguistica-2014` — Licenciatura en Lingüística, Plan 2014.
  - `bedelias-fhum-educacion-2014` — Licenciatura en Educación, Plan 2014.

## Objetivo

Investigar y reconciliar cada plan contra la malla, grilla o trayectoria sugerida oficial vigente que publique FHCE. Cuando exista, Currícula debe reproducir sus períodos, bloques flexibles y variantes oficiales; las áreas permanecen como asignaciones y requisitos y no sustituyen la secuencia publicada.

## Fuentes y autoridad

- Usar únicamente fuentes oficiales de FHCE, Udelar o sus órganos académicos competentes para afirmar estructura, vigencia e inclusión curricular.
- Priorizar páginas vigentes de la carrera, mallas por semestre, planes de estudio y resoluciones aprobatorias.
- Bedelías sirve para contrastar identidad, código, créditos y reglas, pero su composición y orden no acreditan por sí solos una trayectoria sugerida.
- EVA no acredita pertenencia curricular y sólo puede conservarse como enlace auxiliar de una materia ya verificada.
- Una búsqueda fallida o un enlace roto no demuestra que la trayectoria oficial no exista.

## Reconciliación por plan

Para cada uno de los tres planes:

1. Registrar las fuentes oficiales, fecha de consulta, vigencia y alcance.
2. Determinar si existe una trayectoria sugerida oficial y documentar sus períodos, perfiles y bloques flexibles.
3. Hacer correspondencia por código o identidad documentada, nunca por similitud aproximada de nombre.
4. Publicar como `verified` solamente las materias o bloques respaldados por la fuente curricular.
5. Mantener variantes administrativas, históricas o no demostradas como candidatos recuperables y fuera de Currícula.
6. Conservar créditos, áreas, mínimos y requisitos oficiales sin convertir alternativas en obligaciones acumulativas.
7. Preservar IDs existentes cuando representen la misma identidad demostrada; no migrar ni borrar progreso personal automáticamente.

Si la evidencia oficial disponible no permite cerrar un plan sin inferencias, conservarlo como pendiente, documentar exactamente la brecha y no degradarlo a estructura de Bedelías.

## Implementación

- Extender el generador o los datos auditados compartidos; no agregar condicionales específicos de carrera en `app/page.tsx`.
- Mantener carga diferida y el registro actual de planes.
- Actualizar `data/official-trajectories/reviews.json` y regenerar `data/official-trajectories/inventory.json` de forma determinista.
- Actualizar `PROJECT_CONTEXT.md` sólo con resultados confirmados y transversales.
- Registrar conteos antes/después de materias verificadas, candidatas, históricas y rechazadas.

## Pruebas y criterios de cierre

- Cada trayectoria oficial cerrada tiene una prueba de períodos y estructura.
- Toda materia enumerada explícitamente por la trayectoria conserva al menos una identidad canónica visible en Currícula.
- Ninguna candidata basada sólo en Bedelías o EVA aparece en la experiencia normal.
- Regenerar los artefactos dos veces no produce diferencias.
- `npm run trajectory:inventory`, pruebas estrechas, `npm test`, `npm run lint` y `git diff --check` pasan.
- La entrega incluye commit enfocado, fuentes consultadas, conteos por plan, limitaciones y cualquier plan que permanezca pendiente.

## Cierre y estado recuperable

- Datos auditados: `data/fhce/official-trajectories-2014.json`.
- Fuentes vigentes: malla FHCE de Letras de mayo de 2025; mallas de Lingüística y Educación de julio de 2026; planes 2014 oficiales para los mínimos de egreso. La malla semestral de Educación de julio de 2026 sustituye la referencia de 2025 previamente inventariada.
- Resultado: Letras, Lingüística y las tres áreas de Educación reproducen ocho semestres. Los bloques sin identidad curricular única se mantienen como bloques oficiales de cero créditos; no acreditan ficticiamente una unidad concreta. Las variantes acumuladas de Bedelías quedan como candidatas recuperables fuera de Currícula.
- Reconciliación de autoridad, antes/después: Letras `159/110/13/0/0` → `39/241/13/0/0`; Lingüística `46/191/0/0/0` → `34/203/0/0/0`; Educación `50/250/0/0/0` → `36/285/0/0/0`, en el orden `verified/candidate/historical-equivalent/administrative/rejected`. El aumento total de Letras y Educación corresponde a bloques flexibles oficiales agregados, no a materias inferidas.
- Inventario: 147 planes, 63 reproducidos, 19 con fuente identificada pendiente y 65 por investigar; este lote no deja planes pendientes.
- Verificación final: generación repetida con hashes idénticos; pruebas estrechas de los tres planes, proyecciones, inventario y cola derivada; `npm run trajectory:inventory`; `npm test` (907/907); `npm run lint`; `git diff --check`.

## Fuera de alcance

- Reconciliar otras carreras de FHCE o de otros servicios.
- Deduplicar por distancia de texto o escoger arbitrariamente una variante.
- Introducir cuentas, persistencia remota, dependencias o cambios visuales generales.
