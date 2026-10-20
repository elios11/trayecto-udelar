# D03bc — Licenciatura en Geología 2018

## Estado y objetivo

Auditar de forma aislada `bedelias-fcien-licenciatura-en-geologia-2018` desde `main` `1eec97e`. El plan, los requisitos y la sede están cotejados, pero el inventario de trayectoria sigue `research-pending`. Determinar si la Comisión, FCIEN o el Instituto de Ciencias Geológicas publica recorridos sugeridos vigentes con materias y períodos. Reproducir únicamente el alcance verificable: los tramos y áreas del Plan no son semestres ordinales, y una guía de oferta tampoco es una malla adoptada.

## Contexto y fuentes iniciales

- Inspeccionar la auditoría existente en `data/bedelias/audits/official-source-audits.json`, el snapshot bajo `data/bedelias/`, la proyección en `app/data/bedelias-generated/`, el inventario de trayectorias y la sección de Geología en `docs/tasks/importacion-masiva-carreras.md`.
- Plan FCIEN/Diario Oficial: `https://www.fcien.edu.uy/images/pdf/planes-estudio/Plan2018_Geologia.pdf`. Copia Colibrí: `https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/24563`.
- Ficha FCIEN: `https://fc-si-portal.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-geologia/2336-licenciatura-en-geologia-2`; catálogo Udelar: `https://udelar.edu.uy/carrera/licenciatura-en-geologia`.
- La auditoría previa enlaza una Guía del Estudiante en EVA: contrastar su autoridad, versión y alcance con FCIEN, Comisión, Instituto, Colibrí e IMPO. EVA no basta como única fuente de verdad curricular. Buscar copias oficiales alternativas si falla una URL.

## Reglas de implementación

1. Mantener una carrera, un título, progreso y sede Montevideo, Plan 2018, cuatro años y 360 créditos. Preservar el tramo común 210 (90 científico-básica, 100 geología fundamental, 20 profundización), orientación 140 con trabajo final de 35 y 10 transversales sin doble conteo. Los umbrales de acceso y aprobación por la Comisión siguen como validación humana.
2. No convertir trayectorias personales o ejemplos sugeridos en menciones certificadas. Sólo promover identidades con inclusión oficial exacta, conservando variantes de códigos, cargas y candidatas recuperables; no inferir equivalencias por nombre. Si no se demuestra una secuencia vigente curso→período, conservar el recorrido orientativo generado claramente provisional con materias reales y sin atribuirlo a FCIEN.
3. Versionar evidencia normalizada bajo `data/` con autoridad, URL, fecha de consulta, vigencia, alcance, filas/identidades cotejadas y huella reproducible. Proveer regeneración offline desde los snapshots existentes sin repetir scraping masivo. Documentar límite y condición concreta de nueva revisión; agregar `docs/carreras-a-actualizar.md` sólo si la publicación oficial es futura o parcial.
4. Preservar IDs, créditos, previaturas, persistencia personal y otras carreras. Actualizar auditoría, inventario y pruebas focales; modificar únicamente derivados necesarios.

## Entrega

Registrar hallazgo y límites en esta especificación. Ejecutar dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint` y `git diff --check`; crear un commit enfocado en el worktree. No integrar, pushear ni publicar desde el nodo.
