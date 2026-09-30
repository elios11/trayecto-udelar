# D03o — Trayectoria oficial de Ingeniería Naval 1997

## Estado y modelo

Nodo preparado después de D03n. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D01, D03a y D03k integrados.

## Objetivo

Reconciliar los diez semestres de la `Currícula sugerida 2017` publicada por FING con las identidades visibles de Ingeniería Naval Plan 1997. Mantener una sola carrera y progreso, la opción de currícula personalizada y la guía oficial como sugerencia sustituible. El planificador debe reunir sin duplicados todas las materias respaldadas y las opciones flexibles verificadas.

## Fuentes prioritarias

- Plan 1997 Udelar: https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/43884/1/PLNAV_1997.pdf
- Currícula sugerida 2017 FING: https://www.fing.edu.uy/sites/default/files/2015/24857/20170214%20bloques%20por%20semestre%20naval.pdf
- Página vigente FING: https://www.fing.edu.uy/en/carrera/grado/ingenier%C3%ADa-naval
- Ficha Udelar: https://udelar.edu.uy/carrera/ingenieria-naval

Verificar vigencia y contenido de las fuentes. Registrar autoridad, URL, fecha y huella de los artefactos usados. Bedelías contrasta identidades, créditos y previaturas; no sustituye la distribución semestral publicada.

## Reglas

- Cotejar exhaustivamente los períodos, sus rótulos, el orden y cada colocación de materia de la guía FING. Toda unidad enumerada debe conservar una identidad canónica visible en Currícula.
- `Estructuras de Buques` aparece en dos semestres de la guía como curso anual; representarla una sola vez con su carga anual vigente, sin perder su ubicación temporal ni contar créditos dos veces.
- Mantener el Plan 1997 de 450 créditos, sus dieciséis mínimos, Taller, Pasantía, Proyecto Final y validación del currículo individual. La suma de mínimos impresa y la carga de `Máquinas para Fluidos 1` divergen entre documentos: conservar valores respaldados y anomalías explícitas, sin inventar créditos.
- Montevideo es la sede completa; los CIO regionales sólo articulan con la carrera y no se convierten en sedes completas.
- Conservar las alternativas realmente verificadas en el planificador y fuera de la malla obligatoria. No publicar candidatos por simple presencia en Bedelías ni fusionar identidades por similitud de nombre.
- Si una correspondencia no puede demostrarse, mantener la trayectoria pendiente y el recorrido provisional donde corresponda; documentar el límite sin declararla reproducida.

## Verificación y entrega

- Crear fuente curada y generador determinista sin red, siguiendo los nodos D03l–D03n cuando convenga. Guardar descargas y artefactos temporales en `tmp/d03o-naval-1997/` dentro del worktree.
- Actualizar auditoría, inventario D03 y `PROJECT_CONTEXT.md` sólo con resultados confirmados.
- Probar colocaciones exactas, curso anual, requisitos, catálogo del planificador, candidatos ocultos e IDs únicos. Regenerar dos veces con hashes idénticos; ejecutar focales, `npm test`, `npm run lint` y `git diff --check`.
- Crear commit enfocado en worktree aislado basado en el `main` más reciente. Entregar hash, evidencia, verificaciones y riesgos; no integrar, pushear ni publicar desde el subagente.
