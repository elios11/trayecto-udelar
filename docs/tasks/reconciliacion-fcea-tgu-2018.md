# D03g — Reconciliación oficial de TGU 2018

## Estado

Implementado y validado en el worktree del nodo. Pendiente de revisión e integración serial sobre `main`.

## Objetivo

Reproducir exactamente la grilla oficial vigente del Tecnólogo en Gestión Universitaria, Plan 2018, preservando sus cinco semestres, alternativas de UPC y flexibilidad real sin hacer obligatoria toda la oferta reconocida.

## Alcance y fuentes

- Plan: `bedelias-fcea-tecnologo-en-gestion-universitaria-2018`.
- Servicio: Facultad de Ciencias Económicas y de Administración.
- Fuente principal: página institucional y grilla actualizada en julio de 2026 publicada por FCEA.
- Contraste: plan aprobado, resoluciones de Bedelía FCEA, ficha central de Udelar y ficha de la Escuela de Gobierno.
- Mantener Montevideo como única sede; EVA es apoyo virtual, no sede ni trayectoria.

## Reglas de autoridad

- La grilla vigente de FCEA define períodos, ubicación de unidades y mínimos actuales.
- El plan y las resoluciones resuelven identidad, cambios históricos y alternativas; Bedelías sólo contrasta códigos, créditos, áreas y reglas.
- No convertir opciones reconocidas no dictadas en 2026 en oferta activa ni exigir todas las optativas/electivas.
- Representar Pasantía o Proyecto de Gestión como alternativas de UPC sin contar créditos dos veces.
- No inferir previaturas desde el orden semestral cuando FCEA remite a fichas individuales o Autogestión.

## Trabajo requerido

1. Cotejar las 45 ubicaciones oficiales actuales contra las 21 coincidentes y explicar la diferencia entre la grilla, la oferta flexible y el catálogo.
2. Eliminar cualquier falso período de catálogo y reproducir los cinco semestres oficiales.
3. Mantener los mínimos vigentes de 2026: 225 créditos totales, áreas actualizadas y 35 créditos libres.
4. Actualizar auditoría, proyección, inventario, hashes y pruebas de forma determinista.
5. Registrar fuentes finales, antes/después, comandos y límites en este archivo.

## Criterios de cierre

- Estado `official-trajectory-reproduced` con correspondencia estructurada verificable.
- Toda unidad explícita de la grilla tiene una representación visible y `verified`; las opciones variables quedan en catálogo flexible.
- Una sola carrera, plan, sede y título; ninguna equivalencia automática inventada.
- Regeneración determinista, pruebas específicas, `npm test`, `npm run lint` y `git diff --check` en verde.
- Commit enfocado, sin integración, push ni despliegue desde el worktree.

## Continuidad

### Fuentes finales

- Página y grilla curricular vigente de FCEA: <https://fcea.udelar.edu.uy/ensenanza/las-carreras-de-fcea/243-tecnico-en-gestion-universitaria.html>, revisada el 25 de septiembre de 2026. Publica 225 créditos, cinco semestres, los mínimos 40/90/20/10/20/10 por área, 35 créditos libres, la UPC alternativa y la actualización de julio de 2026. También identifica `Taller de Cargos y Remuneraciones` y `Transformación Cultural` como opciones que no se dictan en 2026 y remite las previaturas a las fichas o a Autogestión.
- Plan de estudios aprobado por FCEA: <https://www.fcea.udelar.edu.uy/images/micrositios/bedelia/planes/Tecn%C3%B3logo_TGU/TGU_-_Plan_de_Estudios_2017.pdf>. Respalda título, 225 créditos, cinco semestres, áreas y flexibilidad optativa/electiva; la grilla vigente prevalece para los mínimos modificados.
- Resoluciones de interés de Bedelía FCEA: <https://fcea.udelar.edu.uy/bedelia-carreras-grado/resoluciones-de-interes.html>. Respaldan la identidad Plan 2018, las modificaciones de grilla, la incorporación y reválida de UPC y equivalencias históricas sin convertirlas automáticamente en materias vigentes.
- Ficha central de Udelar: <https://udelar.edu.uy/carrera/tecnologo-en-gestion-universitaria>. Confirma 30 meses, 225 créditos y radicación en FCEA.
- Ficha de la Escuela de Gobierno: <https://escueladegobierno.udelar.edu.uy/wp-content/uploads/2025/02/TGU.pdf>. Confirma dos años y medio, cinco semestres y el carácter interdisciplinario de la carrera.

### Resultado antes/después

- Antes: la auditoría guardaba las 24 opciones de libre elección como un sexto período técnico. El inventario esperaba 45 ubicaciones en seis períodos, encontraba sólo las 21 entradas de los cinco semestres de la proyección y mantenía el plan en `official-trajectory-identified-pending` con `21/45`.
- Después: la auditoría conserva cinco períodos con 21 entradas estructurales —19 obligatorias y dos alternativas de UPC— y un `catalogCourses` separado con 24 opciones activas. El inventario coteja períodos y catálogo por separado, obtiene `45/45`, registra cinco períodos y clasifica el plan como `official-trajectory-reproduced`.
- La proyección ya separaba correctamente los cinco semestres del catálogo; se regeneró para actualizar su procedencia al 25 de septiembre de 2026. Conserva una única sede `Montevideo`, EVA sólo como apoyo, 225 créditos, los siete mínimos vigentes y el grupo que exige una sola UPC entre Pasantía de 20 créditos o Proyecto de Gestión de 10.
- Las 24 opciones activas permanecen flexibles y no se vuelven obligaciones acumulativas. `Taller de Cargos y Remuneraciones` y `Transformación Cultural` siguen fuera del catálogo activo porque FCEA indica que no se dictan en 2026.
- No se añadieron reglas: el orden semestral no se interpretó como previatura. El inventario global queda en 73 trayectorias reproducidas, 17 identificadas pendientes, una ausencia documentada y 56 en investigación.

### Regeneración y verificación

```text
node scripts/bedelias-audit-queue.mjs
node scripts/build-extracted-academic-plans.mjs
node scripts/bedelias-ui-curriculum-queue.mjs
npm run trajectory:inventory
node --test tests/bedelias-audit-queue.test.mjs tests/bedelias-ui-curriculum-queue.test.mjs tests/tecnologo-gestion-universitaria-official-audit.test.mjs tests/official-trajectory-inventory.test.mjs tests/extracted-academic-plans.test.mjs
npm test
npm run lint
git diff --check
```

- Hash de auditoría: `sha256:064a2d9e84dabf1434f9449b306d94106eda3ad1cdd57c1fca6247a9d002eb55`; cola de auditoría: `sha256:cde6bec45db61183ea358d1d46813aa7f1e0b6feaf884ac4af1f8335f18d2f82`; cola curricular: `sha256:8a936ca7eaa3a2a68b80f48379226f307d01fad8bf2456fd1014b355cf128f44`; reporte extraído: `sha256:d29546d71b4a7e83f41551f384305de0264d23515293bb1dbcf5afb8f92f4f75`; inventario: `sha256:164dfb9fbd84d3f3a44f6d03373c7ad37b438da4b0c4d76ad50dbbb3fe279c35`.
- En una segunda pasada, los SHA-256 byte a byte de la proyección TGU (`5d850842db25f65c0f3cd71b69b1bc4d5cc458a4fbb53e3fd9294224e71aac55`), el reporte extraído (`4a8cfb48bcefebc3730b9c154f24b4d1e7a80376f23e79c3668d2774b2693239`) y el inventario (`c15a0de601b981ad4a3bbb09a256697c967b091862935c90d15af721ef0fd176`) permanecieron idénticos. Las colas actualizan `generatedAt`, pero conservaron sus `contentHash` estables.
- Las pruebas estrechas finalizaron con 25/25 casos y `npm test` con 912/912. `npm run lint` y `git diff --check` finalizaron sin errores.

### Límites y decisiones pendientes

- La oferta de libre elección puede cambiar por edición. Debe actualizarse sólo desde una nueva publicación oficial y nunca transformarse en una lista obligatoria completa.
- Las previaturas permanecen fuera de la automatización hasta contar con fichas consolidadas o una exportación oficial de Autogestión que permita modelarlas sin endurecer condiciones.
- No quedan decisiones académicas pendientes para cerrar D03g. La integración, el push y la publicación requieren autorización separada.
