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
