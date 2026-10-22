# D03bj — Licenciatura en Enfermería Plan 2016

## Objetivo

Reconciliar `bedelias-fenf-licenciatura-en-enfermeria-2016`, hoy `research-pending`, con la [página documental vigente de Facultad de Enfermería](https://www.fenf.edu.uy/plan-de-estudios-2016/), el [Plan aprobado](https://www.fenf.edu.uy/wp-content/uploads/2019/01/PdeE2016-modificaciones-CAG-noviembre-2017.pdf), el [Anexo III: esquema de Plan de Estudios](https://www.fenf.edu.uy/wp-content/uploads/2019/02/Anexo-III.-Diagrama15.1.19.pdf) y la [Guía del estudiante 2025](https://www.fenf.edu.uy/wp-content/uploads/2025/11/GUIA-DEL-ESTUDIANTE-.pdf). Verificar qué fuente ubica unidades por semestre, ciclo o tramo anual; distinguir secuencia sugerida de requisitos, título intermedio y oferta efectiva por sede.

## Límites

Mantener un único Plan 2016 y progreso compartido entre Montevideo, Rivera, Rocha y Salto. Conservar los 360 créditos, cuatro ciclos (80/200/40/40), 330 obligatorios y 30 optativos/electivos, y el título intermedio de Auxiliar a 200 créditos según la regla vigente. No inferir que los grupos de Bedelías son una malla oficial ni que todos los cursos optativos se ofrecen siempre. El Anexo III es un diagrama de columnas: verificar visualmente el PDF antes de fijar asignaciones que su extracción textual mezcle. Preservar IDs técnicos; códigos y créditos se cotejan sólo con respaldo exacto. Si la fuente es parcial, mostrar ese alcance y mantener la investigación abierta.

## Entrega

Versionar evidencia normalizada bajo `data/fenf/` con URL, autoridad, fecha, vigencia, alcance, filas/identidades cotejadas y huella reproducible. Añadir regeneración/verificador offline y registrar el comando. Cambiar auditoría, inventario, proyección y contexto compartido sólo cuando la evidencia lo permita; registrar en `docs/carreras-a-actualizar.md` cualquier publicación parcial o en desarrollo con gatillo de revisión. Pruebas focales de sedes, períodos, cobertura, créditos, flexibles y título intermedio; dos regeneraciones idénticas, `npm test`, `npm run lint` y `git diff --check`. Commit enfocado en este worktree; no integrar, pushear ni desplegar desde él.

## Resultado de la auditoría (21/10/2026)

- Se conservaron el único Plan 2016 y las cuatro sedes. La tabla «a título indicativo» de la página PDF 26 del Plan aprobado ubica 20 UC obligatorias y cinco cupos flexibles en nueve semestres; las 20 identidades se cotejaron por nombre y crédito con la Guía 2025 y con códigos y cargas del snapshot FENF. La proyección no afirma oferta efectiva por sede ni inventa previaturas: 23 reglas de Bedelías entre identidades verificadas pasan el filtro técnico existente, sin atribuirlas al Plan. El compuesto técnico `2001` (Adulto y Anciano I y II) sigue candidato, pues el Plan presenta las UC I y II separadas.
- Se intentó la verificación visual del Anexo III: la herramienta web devolvió sólo referencia, el visor PDF del navegador no permitió capturar imagen y la descarga local fue rechazada. Por ello el cotejo del diagrama permanece abierto y la trayectoria se marca parcial, aun cuando la tabla textual del Plan permite ubicar esos renglones. La extracción textual del Anexo III no se usó para asignar columnas.
- La Guía declara 240 créditos integrados y 90 independientes, pero sus diez UC integradas enumeradas suman 245 y las independientes 85. Se preservan los 330 créditos obligatorios y 30 flexibles, el total de 360, las cargas individuales, los 200 créditos y UC hasta quinto para Auxiliar; no se aplica un mínimo categorial imposible sin aclaración institucional.
- La evidencia normalizada y su huella están en `data/fenf/enfermeria-2016-trajectory-review.json`. Regeneración y verificación offline: `node scripts/build-fenf-enfermeria-2016.mjs`; prueba focal: `node --test tests/fenf-enfermeria-2016-trajectory.test.mjs`. La fuente cruda no es necesaria para reconstruir la proyección.
- Volver a revisar al obtener una inspección visual del Anexo III, una aclaración oficial del 240/90, un cambio del esquema o una publicación de oferta territorial. No extrapolar los catálogos optativos de Bedelías a cursos efectivos.
