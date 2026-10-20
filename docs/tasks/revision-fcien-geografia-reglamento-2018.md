# D03bd — Revisión del reglamento y trayectorias de Geografía 2018

## Motivo y objetivo

Reabrir la auditoría D03bb desde `main` `adc41ad` por un hallazgo institucional omitido: el PDF `Reglamento Licenciatura en Geografia.pdf` alojado en EVA FCIEN contiene tablas de trayectorias sugeridas por semestre. Antes de proyectarlas, verificar resolución de aprobación, versión, vigencia y relación con el Plan 2018 aprobado. El documento indexado como `25marzo2021.docx` propone 220 básicos + 80 optativos + 20 elegibles + 10 extensión + 30 tesina, mientras la auditoría actual conserva 220 + 90 optativos + 10 extensión + 40 tesina. Es una contradicción material; no reemplazar requisitos normativos por la sola existencia del PDF.

## Fuentes y comprobaciones

- PDF: `https://eva.fcien.udelar.edu.uy/pluginfile.php/60567/mod_resource/content/3/Reglamento%20Licenciatura%20en%20Geografia.pdf`. Inspeccionar visualmente cuadros 1–4 y notas, no sólo extracción textual. Buscar portada, firma, resolución o metadatos que prueben adopción.
- Contrastar con Plan 2018 en Colibrí `https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/24562`, publicación IMPO, ficha actual FCIEN, Comisión/Departamento, Consejo FCIEN y DG Jurídica. Buscar versiones posteriores o copia aprobada de la misma autoridad. EVA no basta como única fuente de verdad.
- Revisar `docs/tasks/reconciliacion-fcien-geografia-2018.md`, `data/fcien/geografia-2018-trajectory-review.json`, auditoría, snapshot y proyección actuales antes de editar. No mezclar Geología.

## Criterios de decisión

1. Si se confirma reglamento vigente y trayectorias adoptadas: normalizar cada cuadro y sus alternativas, cotejar identidad y carga con fuente oficial y snapshot, reproducir semestres sin inventar códigos, y preservar los datos personales existentes. Distinguir orientaciones pedagógicas de menciones o títulos certificados. Resolver explícitamente la discrepancia de requisitos con jerarquía normativa y evidencia de aprobación; si no se puede, no cambiar mínimos automáticamente y dejar conflicto visible/documentado.
2. Si no se confirma autoridad/vigencia suficiente: mantener `research-pending` y recorrido provisional. Registrar el documento, las tablas y la contradicción como evidencia recuperable, con condición concreta de revisión. No afirmar que no existe malla; tampoco promover candidatas por similitud.
3. Versionar fuente normalizada en `data/`, huella reproducible y comando de regeneración offline desde snapshots existentes. No repetir scraping masivo. Actualizar inventario, auditoría, `docs/carreras-a-actualizar.md` cuando la publicación sea parcial/futura, y pruebas focales. Mantener intactas otras carreras.

## Entrega

Documentar hallazgo, decisión y límites aquí y en la auditoría. Dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint`, `git diff --check`; commit enfocado en este worktree. No integrar, pushear ni publicar desde el nodo.

## Resultado de D03bd — 20/10/2026

**Continúa `research-pending` y no se cambian los mínimos ni la trayectoria visible.** El [PDF alojado en EVA FCIEN](https://eva.fcien.udelar.edu.uy/pluginfile.php/60567/mod_resource/content/3/Reglamento%20Licenciatura%20en%20Geografia.pdf) está titulado «Reglamentación del Plan de Estudios 2018» y su nombre indexado menciona `25marzo2021.docx`. El texto indexado identifica el Cuadro 2 como trayectoria ambiental por semestre, el Cuadro 3 como trayectorias con énfasis en tecnologías de la información y socioespacial, y el Cuadro 4 como elenco de cursos regulares. Sugiere cursar elegibles desde el quinto semestre. No se localizaron en la versión indexada resolución de aprobación, firma o constancia de vigencia. Las búsquedas delimitadas en FCIEN, Departamento, Colibrí, Udelar e IMPO no aportaron aprobación independiente ni modificación del Plan.

El mismo PDF distribuye 360 créditos en 220 básicos, **80 optativos, 20 elegibles**, 10 de extensión y **30 de tesina**; el [Plan 2018 aprobado](https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/24562) y su publicación oficial en IMPO sostienen 220, **90 optativos**, 10 de extensión y **40 de tesina**. El conflicto también afecta la condición para iniciar la tesina: el PDF EVA menciona 200 créditos básicos validados, frente a todos los mínimos por área del Plan. Un recurso en EVA no puede por sí solo modificar los requisitos aprobados por CDC. Tampoco puede darse por adoptada su guía semestral sin aclarar versión y autoridad. Se conserva en `data/fcien/geografia-2018-trajectory-review.json` el contraste normalizado y su huella SHA-256, como evidencia recuperable pero no utilizada para promover candidatas o períodos.

También se verificó la [ruta actual del recurso EVA](https://eva.fcien.udelar.edu.uy/mod/resource/view.php?id=40307&redirect=1), que entrega el mismo documento indexado, y la [copia del Plan aprobada que sirve FCIEN](https://www.fcien.edu.uy/images/Plan_de_estudios_-_Lic_Geograf%C3%ADa.pdf), con resoluciones identificables de Claustro, Consejo y CDC. La disponibilidad reciente del recurso EVA no acredita por sí misma la adopción del texto ni modifica esa jerarquía.

La inspección visual pedida **quedó pendiente**: la descarga local del PDF fue impedida por la red del entorno y las capturas del PDF indexado devolvieron `cache miss`. Por eso no se transcribieron filas de los cuadros ni sus notas, ni se afirma que se hayan verificado visualmente. Condición concreta de reanudación: obtener de Comisión de Carrera/Consejo FCIEN/DG Jurídica resolución y versión vigente que aclaren la distribución de créditos; recuperar y revisar visualmente los Cuadros 2–4; cotejar identidad, carga y alcance antes de reemplazar el recorrido generado. Una declaración oficial expresa de que no hay guía común también resolvería el estado de trayectoria.

La fuente no anuncia una futura publicación curricular ni una implementación territorial parcial; no corresponde una entrada en `docs/carreras-a-actualizar.md`. El expediente queda en la cola de investigación del inventario. La regeneración offline se ejecuta con `node scripts/build-fcien-geografia-2018.mjs`; no requiere red ni PDF crudo. Esta auditoría no incluye Geología.

## Validación

- Dos ejecuciones de `node scripts/build-fcien-geografia-2018.mjs` produjeron el mismo diff byte a byte (hash Git `60c34cf3298e38dbc28889c4761d7e1aa8921c2d`).
- Pruebas focales: 34/34. Suite completa: `npm test` 1110/1110. El primer intento de build en sandbox falló por `spawn EPERM` de Vite; el reintento autorizado pasó.
- `npm run lint` y `git diff --check`: pasan. No hubo validación visual del PDF ni prueba de interfaz en navegador.
