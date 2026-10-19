# D03az — Licenciatura en Física

## Estado y objetivo

Auditoría aislada del plan `bedelias-fcien-licenciatura-en-fisica-2019` sobre `main` `e25a390`. El inventario D03 está `research-pending`: los mínimos ya se cotejaron, pero falta establecer si FCIEN/Udelar publica una trayectoria sugerida vigente de materias y períodos. Reproducir sólo una secuencia respaldada; una ausencia documentada requiere afirmación oficial positiva, no silencio o enlace roto.

## Fuentes iniciales

- Plan Colibrí: `https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/25632/1/PLFIS_2020.pdf`.
- Reglamento DG Jurídica: `https://dgjuridica.udelar.edu.uy/496-reglamento-del-plan-de-estudios-licenciatura-en-fisica-2017/`.
- Carrera FCIEN: `https://www.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-ciencias-fisicas`.
- Carrera Udelar: `https://udelar.edu.uy/carrera/licenciatura-en-fisica`.
- Auditoría existente en `data/bedelias/audits/official-source-audits.json` y proyección en `app/data/bedelias-generated/`.

Buscar además publicaciones del Instituto de Física, Comisión de Carrera, CSE y copias de la misma autoridad en Colibrí/IMPO. Comparar Plan aprobado 2017 con implementación técnica 2019. EVA y Bedelías no bastan como verdad de trayectoria.

## Reglas

1. Conservar un título, progreso y sede Montevideo; 360 créditos, mínimos de cinco áreas por 268 y 92 flexibles, diez integrales y ocho de iniciación a investigación sujetos a validación. No convertir ejemplos de perfil en menciones certificadas.
2. No promover por similitud los 266 registros y 290 apariciones de Bedelías. Si la secuencia oficial no aparece, conservar recorrido orientativo claramente provisional, con materias reales y sin créditos o períodos inventados.
3. Versionar evidencia normalizada en `data/` (autoridad, URL, fecha, vigencia, alcance, filas/identidades cotejadas, huella, regeneración offline). Registrar publicaciones parciales o futuras en `docs/carreras-a-actualizar.md` cuando corresponda.
4. Actualizar revisión/inventario y pruebas focales. Preservar IDs, cargas y datos personales; documentar límites y condición de nueva revisión.

## Entrega

Dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint` y `git diff --check`; commit enfocado sólo en este worktree. No integrar, pushear ni publicar desde el nodo.
