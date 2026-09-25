# D03f — Reconciliación oficial de Nutrición 2014

## Estado

Implementado y validado en el worktree del nodo. Pendiente de revisión e integración serial sobre `main`.

## Objetivo

Reproducir con correspondencia exacta la trayectoria sugerida oficial de la Licenciatura en Nutrición, Plan 2014, sin convertir la oferta optativa variable ni el alcance parcial de Paysandú en trayectorias separadas.

## Alcance

- Plan: `bedelias-enut-licenciatura-en-nutricion-2014`.
- Servicio: Escuela de Nutrición.
- Fuente principal de secuencia: Plan de Estudios 2014 y malla curricular vigente publicados por la Escuela de Nutrición.
- Fuentes de contraste: programas obligatorios vigentes, disposiciones reglamentarias de diciembre de 2025 y páginas institucionales de Udelar.
- Conservar un único recorrido académico; Paysandú ofrece únicamente Ciclo IV y debe seguir expresado como alcance territorial parcial.

## Reglas de autoridad

- La secuencia oficial define períodos, pertenencia y orden de las materias visibles en Currícula.
- Bedelías contrasta códigos, créditos, áreas y reglas; no rellena huecos ni crea una trayectoria institucional.
- Las optativas y electivas variables permanecen como bloques flexibles y no como una lista obligatoria congelada.
- Toda materia explícita de la trayectoria debe conservar al menos una representación visible y `verified`.
- No inferir previaturas de la posición semestral ni endurecer condiciones que dependen de intentos de evaluación no representables en la UI.

## Trabajo requerido

1. Cotejar las 33 ubicaciones oficiales contra las 31 actualmente coincidentes y resolver las dos divergencias mediante evidencia institucional.
2. Normalizar etiquetas y cantidad de períodos, incluyendo las actividades finales sólo donde la fuente las ubique.
3. Actualizar la auditoría, reconciliación, proyección generada, inventario y hashes derivados de forma determinista.
4. Añadir pruebas específicas de períodos, materias, territorio, flexibilidad y autoridad.
5. Documentar cualquier discrepancia que no pueda automatizarse sin inventar reglas.

## Criterios de cierre

- Estado `official-trajectory-reproduced` con correspondencia exacta o una limitación oficial explícita y comprobable.
- Ninguna candidata de Bedelías pasa a visible por similitud de nombre.
- La trayectoria conserva todas las materias oficiales una sola vez cuando corresponda.
- Regeneración determinista, pruebas específicas, `npm test`, `npm run lint` y `git diff --check` en verde.
- Commit enfocado listo para revisión e integración; sin push ni despliegue desde el worktree.

## Continuidad

### Fuentes finales

- Plan de Estudios 2014 de la Escuela de Nutrición: <https://www.nutricion.edu.uy/wp-content/uploads/2019/07/Plan-Estudios-2014-1.pdf>. Respalda título, duración normativa de ocho semestres, 360 créditos, cuatro ciclos y modalidades flexibles.
- Malla curricular vigente de la Escuela de Nutrición: <https://www.nutricion.edu.uy/wp-content/uploads/2024/11/malla-curricular-V2png.jpg>. Respalda 31 ubicaciones de unidades y dos bloques flexibles transversales; SHA-256 archivado: `2adbe0bfec022f99b2a4a127b57ed68ab5b77192ad130113b365b4c73cb36760`.
- Disposiciones reglamentarias actualizadas a diciembre de 2025: <https://www.nutricion.edu.uy/wp-content/uploads/2025/12/Disposiciones-reglamentarias-Actualizado-Diciembre-2025.pdf>. Su artículo 2 confirma que los ciclos I a III son semestrales y que el Ciclo IV se extiende de abril a noviembre; el artículo 42 respalda las condiciones de acceso ya representables sin inventar aprobaciones.
- Página institucional de la carrera: <https://www.nutricion.edu.uy/?page_id=11002>; programas obligatorios: <https://www.nutricion.edu.uy/?page_id=654>.
- Ficha Udelar: <https://udelar.edu.uy/carrera/licenciatura-en-nutricion>; oferta territorial: <https://udelar.edu.uy/carrerasinterior/licenciatura-en-nutricion/>. Respaldan que Montevideo ofrece la carrera completa y Paysandú sólo el Ciclo IV.

### Resultado antes/después

- Antes: la auditoría trataba `Catálogo flexible` como un noveno período, la proyección mostraba ocho períodos, Práctica Profesional y TFG se separaban artificialmente entre los dos últimos, y el inventario sólo conciliaba 31 de 33 ubicaciones. El plan permanecía `official-trajectory-identified-pending`.
- Después: la fuente auditada contiene seis semestres para los ciclos I a III y un único período anual para el Ciclo IV, con Práctica Profesional y TFG juntas. Los 30 créditos optativos y 10 electivos se conservan como dos bloques internos de catálogo, fuera de los períodos. El inventario concilia 33/33, registra siete períodos curriculares —el último abarca los dos semestres normativos— y clasifica el plan como `official-trajectory-reproduced`.
- Paysandú permanece como alcance territorial parcial de Ciclo IV; no se creó otra carrera, plan ni trayectoria. Las 13 reglas existentes se preservaron y no se añadieron previaturas inferidas.
- Conteos globales regenerados: 72 trayectorias reproducidas, 18 identificadas pendientes, una ausencia documentada y 56 en investigación. Hash de auditoría: `sha256:27f41470949517132b5dabd59f82c0424394a59391c8d4133bd7257b0ba416cd`; cola de auditoría: `sha256:ce1ace2bf6901a0ae0c7684319b9a7381712f1d82e62a6a33fac7d13b09aeaef`; cola curricular: `sha256:515dd31f359976817d85aa55805b84b54e9baa2c85c73532de53da7a59932bd6`; reporte extraído: `sha256:7e1cfae8d42fcb4d7f2bd8e515f41a5e46947c8d52798650a7ea51d2a8f3b67d`; inventario: `sha256:4f1d8ad0ace5cb974399f21e40c188cdba13466fa89ca4ddd235669d9c155489`.

### Regeneración y verificación

```text
node scripts/bedelias-audit-queue.mjs
node scripts/bedelias-ui-curriculum-queue.mjs
node scripts/build-extracted-academic-plans.mjs
npm run trajectory:inventory
node --test tests/bedelias-ui-curriculum-queue.test.mjs tests/licenciatura-nutricion-official-audit.test.mjs tests/official-trajectory-inventory.test.mjs tests/extracted-academic-plans.test.mjs
npm test
npm run lint
git diff --check
```

Se repitieron ambos generadores y los SHA-256 byte a byte de la proyección de Nutrición (`f0c83133c80de157be01b1c1f9444926494ac89cd8a879c9149ca8eda44aee5f`), el reporte extraído (`57e1c3cf7bfd6322069ce3e100a417b851be85379c1902005af29fb1d6936f73`) y el inventario (`d2a33730e8147306f4b2a8e631bd5e3ccf1ce8b21b49fa224c65a2ce3066fc65`) permanecieron idénticos. Las pruebas estrechas finalizaron con 23/23 casos en verde y `npm test` con 912/912.

### Límites y decisiones pendientes

- La oferta concreta de optativas cambia por semestre y no se congela como catálogo obligatorio; deberá actualizarse sólo con publicaciones oficiales posteriores.
- La UI no registra intentos de evaluación fallidos ni distingue inicio y defensa del TFG. Las condiciones reglamentarias que dependen de esos estados permanecen documentadas, pero no se endurecen como previaturas de aprobación.
- No quedan decisiones académicas pendientes para cerrar D03f. La integración, el push y la publicación requieren autorización separada.
