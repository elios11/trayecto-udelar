# D03ag — Educación Física, opción Prácticas Educativas 2014

## Estado y objetivo

Nodo preparado para implementación. Reconciliar la Licenciatura en Educación Física, opción Prácticas Educativas, Plan 2014 de Rivera. El inventario D03 la mantiene en `research-pending`: la auditoría previa registra ocho semestres y actividades anuales, pero todavía no tiene correspondencia estructurada que pruebe que la proyección reproduce el programa oficial. El catálogo técnico contiene 34 entradas verificadas y 406 candidatas; su volumen no autoriza promociones automáticas.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a. Trabajar en un solo worktree basado en el `main` que ya integra D03af. El coordinador revisa el commit y cualquier integración posterior.

## Fuentes y preguntas de autoridad

- Programa conjunto ANEP-CFE/Udelar-ISEF publicado por ISEF: <https://isef.udelar.edu.uy/wp-content/uploads/2012/10/VF-Programa-conjunto-a-color-con-modificaci%C3%B3n-CSE-publicada-DO.pdf>. Confirmar por lectura completa de páginas pertinentes y, si es posible, render visual la aprobación, vigencia, sede, ocho semestres, tres bloques anuales, unidades, créditos y flexibilidad.
- Contrastar con una ficha o malla institucional vigente del servicio y con el snapshot `data/bedelias/cur-licenciatura-en-educacion-fisica-2014.json`. Bedelías valida identidades y previaturas ya respaldadas, pero no acredita por sí sola las 406 candidatas ni oferta actual.
- Diferenciar las ocho posiciones semestrales de las actividades anuales y del catálogo optativo. Una actividad anual conserva una sola identidad y crédito, aunque abarque dos semestres; no duplicarla ni moverla arbitrariamente a uno de ellos.
- Verificar los 360 créditos y la regla documentada de 304 obligatorios y 56 optativos/electivos, incluido el porcentaje vinculado a Educación y el requisito de extensión/investigación/enseñanza. No transformar todas las alternativas publicadas en obligaciones acumulativas.
- Mantener un único título, plan y progreso para la oferta de Rivera. No inferir equivalencias por parecido de nombre/código ni previaturas desde el orden del programa. Separar inclusión curricular de dictado actual.

## Artefactos y cierre

- Guardar evidencia normalizada versionada bajo `data/cur/` con URL institucional, autoridad, fecha, vigencia expresamente publicada, alcance, páginas, identidades cotejadas, candidatos y huella reproducible. Documentar cualquier página que no pueda verificarse visualmente; no declarar QA visual por extracción de texto.
- Crear un generador offline para reconstruir proyección, auditoría, revisión D03 e inventario sin reconsultar fuentes. Registrar aquí el comando exacto y comprobar dos regeneraciones idénticas.
- Pasar a `official-trajectory-reproduced` sólo con prueba determinista de períodos en orden, actividades anuales, identidad visible de cada unidad enumerada, catálogo flexible y requisitos. Si la evidencia demuestra otra estructura o deja ambigüedades materiales, conservar estado pendiente y documentar la brecha sin inventar períodos o equivalencias.
- Actualizar `PROJECT_CONTEXT.md` sólo si cambia una decisión estable. Actualizar `docs/carreras-a-actualizar.md` si la fuente oficial anuncia una malla futura, implementación progresiva o cobertura parcial, con condición de nueva revisión.
- Ejecutar pruebas focales, `npm test`, `npm run lint` cuando cambie código y `git diff --check`; documentar resultado, limitaciones y siguiente paso. Crear commit enfocado, sin integrar, push ni desplegar desde el worktree.
