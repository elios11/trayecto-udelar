# D03av — Tecnólogo Minero, Plan 2012

## Estado

Nodo de auditoría curricular. El ID técnico de Bedelías termina en `2013`, pero el plan aprobado corresponde a 2012. Base: `8831265` de `main`.

## Objetivo

Determinar si la currícula predeterminada de Tecnólogo Minero en Treinta y Tres reproduce una trayectoria sugerida oficial vigente con cursos y períodos. La auditoría histórica dice que el Plan publica seis semestres, mientras el inventario D03a lo mantiene `research-pending`; resolver esa discrepancia con evidencia primaria, no con inferencias desde Bedelías o EVA.

## Fuentes iniciales

- Plan aprobado alojado por FING: `https://www.fing.edu.uy/sites/default/files/Plan_Estudios_Tec_Minero.pdf`.
- Oferta FING: `https://www.fing.edu.uy/es/carrera/grado/tecn%C3%B3logo-minero-treinta-y-tres`.
- Oferta CURE: `https://www.cure.edu.uy/ensenanza/oferta-educativa/tecnologo-minero/`.
- Auditoría versionada `data/bedelias/audits/official-source-audits.json` y resumen en `docs/tasks/importacion-masiva-carreras.md`.

Si el enlace del Plan falla, buscar copia de la misma autoridad, repositorio Udelar/Colibrí o IMPO; verificar edición y vigencia. Las fuentes secundarias solo orientan la búsqueda.

## Criterio de implementación

1. Cotejar filas del Plan oficial con la proyección actual: períodos, códigos/materias, flexibles, pasantía, créditos y sede. No convertir una lista ilustrativa en materias obligatorias.
2. Si existe grilla oficial suficiente, reproducirla fielmente; si no, documentar la brecha y mantener el orden generado claramente identificado. No dejar la carrera sin recorrido visible.
3. Preservar todos los cursos oficiales sugeridos al menos una vez y la oferta disponible en el planificador; no alterar progreso ni IDs sin equivalencias verificadas.
4. Guardar evidencia normalizada bajo `data/` con URL, autoridad, fecha, vigencia, alcance, filas cotejadas, huella reproducible y comando de regeneración. Actualizar inventario/revisión y `docs/carreras-a-actualizar.md` si se confirma publicación progresiva.
5. Añadir pruebas de correspondencia estructural, identidad, créditos, regeneración y ausencia de promoción indebida. Registrar discrepancias 270/272 y 2012/2013, sin resolverlas por suposición.

## Validación y entrega

- Ejecutar pruebas focales, dos regeneraciones deterministas, `npm test`, `npm run lint` y `git diff --check`.
- Crear un commit enfocado en este worktree. No integrar, pushear ni publicar desde aquí.
- Entregar hash, estado final, fuentes, discrepancias y limitaciones. Si falta evidencia primaria, dejar checkpoint recuperable y una condición concreta de revisión.
