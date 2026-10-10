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

## Resultado documental e implementación

Consulta cerrada el 9 de octubre de 2026. La fuente normativa principal es el programa conjunto ANEP-CFE/Udelar-ISEF de 19 páginas enlazado arriba, con SHA-256 `e689573a997b8ac05d48c2c8f9e43d7fc3c5570d6a536c0bc2910401634c6a00`. Se leyó el texto completo y se renderizaron las 19 páginas; se inspeccionaron visualmente las páginas 1, 7, 8, 18 y 19. Poppler advirtió que no encontraba algunas fuentes Arial Narrow, pero las páginas resultaron legibles y la grilla curricular no presentó pérdida visual relevante.

El Diario Oficial del 23 de marzo de 2015, páginas impresas 68-69, publica la resolución `3-CDC-24-02-2015`, expediente `008450-000678-14`, que aprueba el Plan y el título; el PDF tiene SHA-256 `2b3ff765e1e952f7cf29d5542b183a4a29400ade6a1fd97c85e2c5d0b066b675`. También se renderizó e inspeccionó visualmente la página impresa 68. La oferta 2026 de ISEF y la ficha central vigente de Udelar confirman la opción conjunta en Rivera, 48 meses y 360 créditos; el índice de convenios del CFE confirma el programa aprobado por ambas instituciones y su radicación permanente en Rivera desde 2016.

El Anexo 3 normativo publica once períodos: ocho semestres y tres actividades anuales —Didáctica / Práctica Docente I en semestres 3-4, II en 5-6 y III en 7-8— con 33 ubicaciones obligatorias únicas. Las filas suman 304 créditos obligatorios y los 56 restantes son optativos o electivos. La publicación HTML vigente de ISEF intercala las prácticas anuales de forma incompleta; prevalece el Anexo aprobado y no se movió ni duplicó ninguna actividad. La grilla usa el rótulo plural «Prácticas Corporales Regionales» y la tabla contigua el singular; se conserva una sola actividad PCR de 6 créditos.

La evidencia reproducible vive en `data/cur/educacion-fisica-practicas-educativas-2014.json`, con huella de porción fuente `sha256:b7e5b852b8bbebd21757836ffbcb8a6cead66d140a3aa29cc533695f96ee811b`. El snapshot Bedelías contiene 439 entradas de composición y 404 códigos únicos: sólo las 33 correspondencias demostradas por el Plan se promovieron como verificadas; las otras 406 entradas permanecen candidatas recuperables fuera de la trayectoria y del catálogo normal. EVA no se usó como autoridad. «Validación de egreso» permanece como requisito manual para el 40% vinculado con Educación y los 10 créditos de extensión, investigación o enseñanza, pero no como período curricular.

Comando offline exacto:

```powershell
npm.cmd run trajectory:cur-educacion-fisica-2014
```

Se ejecutó dos veces y ambas corridas informaron once períodos, 33 ubicaciones, 304 + 56 créditos y 406 candidatas ocultas. Las huellas SHA-256 de la evidencia, revisión, proyección, catálogo, registro de carga, colas e inventario fueron idénticas antes y después de la segunda regeneración; la proyección quedó en `bb589c6bd1cb37433c35580f87280eac2851b385cf3416b30bf9faeefbd7148b` y el inventario en `f68fe9bef3d89e9cfdadcd0838563e866f32a4e6508e50b4d6eec6f8c280028d`.

No se actualizó `docs/carreras-a-actualizar.md`: las fuentes no anuncian una malla futura, una implementación académica progresiva ni una cobertura territorial parcial de este recorrido.

Verificación final:

- focales D03ag: 8/8 pruebas;
- inventario D03: 25/25 pruebas;
- `npm.cmd test`: build y 1023/1023 pruebas;
- `npm.cmd run lint`: sin errores;
- `git diff --check`: sin errores en los archivos del cambio.
