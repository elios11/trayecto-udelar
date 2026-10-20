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

## Resultado de la auditoría (20/10/2026)

- La [ficha vigente de FCIEN](https://www.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-fisica-medica) y el [catálogo Udelar](https://udelar.edu.uy/carrera/licenciatura-en-fisica-medica) remiten al sitio de la carrera, donde se publicó la [Trayectoria Sugerida 2025](https://medicanew.fisica.edu.uy/wp-content/uploads/2025/03/Trayectoria-sugerida-2025_sinRB.pdf). La tabla indexada contiene ocho semestres y 35 renglones nominales; la alternativa Computación/Física Computacional da 36 ubicaciones técnicas en la proyección. El [Plan aprobado](https://www.fcien.edu.uy/noticias/3158-la-licenciatura-en-fisica-medica-tiene-un-nuevo-plan-de-estudios) y [su publicación oficial](https://www.impo.com.uy/diariooficial/2024/10/11/avisos.pdf) conservan los requisitos y la aprobación individual, sin imponer esa guía como recorrido único.
- El PDF no pudo descargarse para inspección visual porque el servidor rechazó la conexión y el visor web devolvió 502; la tabla completa y sus notas se transcribieron desde la indexación pública. Esto no autoriza ampliar por inferencia: la fuente y la limitación están registradas en `data/fcien/fisica-medica-2025-trajectory-review.json`. Próxima revisión concreta: descargar e inspeccionar visualmente la copia cuando responda y comprobar posibles cambios de la Comisión, especialmente las notas y equivalencias ESFUNO.
- Se cotejaron 35 identidades técnicas con el snapshot versionado. FI284 es Taller II 2025, mientras FI41 (1991-2024) permanece candidato. FI44 y FI273 son sólo sugerencias opcionales, no obligación; MA069 y FI57 son alternativas del sexto semestre. Los dos espacios opcionales y la práctica transversal quedan sin código ni crédito inventados. Otras 13 entradas técnicas de la composición quedan candidatas recuperables fuera de la experiencia normal.
- Permanecen una carrera, un plan, una sede completa en Montevideo, el mismo `plan-individual` para no alterar la selección guardada, 360 créditos, los siete mínimos 41/81/27/23/11/81/60, el requisito transversal de 10 y los 26 flexibles. Los módulos hospitalarios no crean menciones ni progreso nuevo.
- Artefacto normalizado: `data/fcien/fisica-medica-2025-trajectory-review.json`; huella `sha256:ff46ad6c75eba62fae73d27e4a33d5d31f6ab6b50b298947199ae1d8ae92d193` de `JSON.stringify(sourcePortions)` en UTF-8. La fuente cruda no es necesaria para reconstruir la proyección. Regenerar sin red con `node scripts/build-fcien-fisica-medica-2025.mjs`.
- Verificación recuperable: ejecutar dos veces el comando anterior y comprobar que la segunda no modifica archivos; después `node tests/fcien-fisica-medica-2025-trajectory.test.mjs`, `npm test`, `npm run lint` y `git diff --check`. No se ha validado visualmente el flujo en navegador.
