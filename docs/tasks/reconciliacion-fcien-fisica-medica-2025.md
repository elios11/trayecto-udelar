# D03ba — Licenciatura en Física Médica 2025

## Estado y objetivo

Auditar de forma aislada `bedelias-fcien-licenciatura-en-fisica-medica-2025` desde `main` `a9b2173`. El inventario de trayectorias marca `research-pending`: los requisitos del plan están auditados, pero falta verificar si FCIEN, Medicina o la Comisión de Carrera publican una trayectoria sugerida vigente de materias y períodos. Reproducirla únicamente con respaldo institucional; ni el carácter flexible del plan ni la falta de una página demuestran por sí solos la ausencia de una malla.

## Contexto y fuentes

- Revisar la auditoría existente en `data/bedelias/audits/official-source-audits.json`, su proyección en `app/data/bedelias-generated/`, la entrada en `data/official-trajectories/inventory.json` y `docs/tasks/importacion-masiva-carreras.md`.
- Contrastar el Plan aprobado por CDC el 17/09/2024 y publicado en Diario Oficial con las páginas vigentes de FCIEN, Medicina y Udelar. Buscar también Comisión de Carrera, departamentos participantes, CSE, Colibrí e IMPO, cotejando versión, vigencia, sede y alcance antes de usar una copia alternativa.
- EVA, la composición de Bedelías y programas aislados pueden ayudar a contrastar identidad y carga, pero no bastan como fuente de verdad para incluir materias o asignar semestres.

## Reglas de implementación

1. Mantener un único plan vigente 2025, título y progreso compartidos, sede completa Montevideo, cuatro años y 360 créditos. No recuperar el plan histórico 2011 como malla actual ni duplicar la carrera por sus dos servicios responsables.
2. Preservar los siete mínimos disciplinares (41/81/27/23/11/81/60), los 10 créditos de prácticas como grupo operativo adicional y los 26 flexibles. Las opciones de electivas no son menciones certificadas; el currículo individual requiere aprobación desde 180 créditos.
3. Sólo promover al catálogo normal identidades con inclusión curricular oficial exacta; conservar candidatos recuperables y evitar equivalencias por nombre. Una trayectoria publicada debe conservar al menos una identidad visible por materia oficial. Si no se demuestra la secuencia, conservar un recorrido generado claramente provisorio con materias reales, sin atribuirlo a la institución.
4. Versionar evidencia normalizada bajo `data/` con autoridad, URL, fecha de consulta, vigencia, alcance, filas o identidades cotejadas y huella reproducible. Proveer regeneración offline determinista desde snapshots existentes, sin repetir extracción masiva ni requerir turnos del agente. Documentar condición concreta de revisión y actualizar `docs/carreras-a-actualizar.md` si hay publicación futura o territorial parcial.
5. Mantener IDs, cargas, requisitos y datos personales. Actualizar revisión/inventario, pruebas focales y sólo los archivos derivados imprescindibles.

## Entrega

Registrar hallazgo y brecha restante en esta especificación. Ejecutar dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint` y `git diff --check`. Crear un commit enfocado en este worktree; el nodo no integra, pushea ni publica.
