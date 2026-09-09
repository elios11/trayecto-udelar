# P01 — Objetivo de carga y validaciones del semestre

## Objetivo

Convertir el planificador actual en una ayuda de decisión de largo plazo sin volverlo restrictivo. Cada semestre podrá tener su propia unidad y objetivo personal; mostrará su carga, el impacto académico conocido y advertencias explicables, pero la persona siempre podrá conservar una planificación libre.

## Dependencias y alcance

- Parte del contrato personal v3 y de su migración/persistencia local ya integrados.
- Mantiene el planificador existente, sus vistas, arrastre, importación/exportación, recuperación y selección académica.
- No agrega cuentas, sincronización, fechas de dictado, horarios, notas personales ni escenarios múltiples; pertenecen a nodos posteriores.
- No agrega dependencias de producción ni servicios externos.

## Contrato de datos

- Conservar `profile.loadUnit` como descripción de la unidad oficial publicada por el plan. No es una preferencia editable: hoy se valida contra el catálogo académico.
- Usar `term.loadTarget`, ya previsto en v3, para guardar el objetivo personal de cada semestre como `{ unit, value }`, con `credits`, `hours` o `courses`. La ausencia de objetivo es válida y no debe fabricar un valor recomendado por la institución.
- Extender el estado interno del planificador para transportar ese campo sin perderlo al editar, hidratar o reconstruir el documento canónico.
- Preservar compatibilidad con documentos v1/v2/v3 y con exportaciones de solo planificador. Un documento anterior debe hidratar con `loadTarget: null`; el formato legado de solo planificador puede seguir omitiendo esta preferencia si incorporarla exigiera romper su versión.
- Las identificaciones siguen siendo propias del perfil/plan; no convertir nombres coincidentes en equivalencias académicas.

## Cálculo de carga

- `credits`: sumar créditos publicados de las materias del semestre. Los créditos cero o desconocidos no se estiman.
- `hours`: sumar solamente horas publicadas. Si alguna materia carece de horas, mostrar el subtotal conocido y señalar que la carga es parcial.
- `courses`: contar materias únicas del semestre.
- Comparar con el objetivo solo cuando exista. Alcanzarlo o excederlo es información, no un bloqueo ni una afirmación de dificultad real.
- Mantener los cálculos en un módulo puro y testeable, separado de React.

## Advertencias no bloqueantes

Cada advertencia debe indicar la materia o el motivo y distinguir certeza de información incompleta:

1. Materia repetida dentro del mismo semestre o del escenario. La UI actual debería impedirla; el diagnóstico también debe tolerar documentos importados inconsistentes.
2. Materia ya acreditada/exonerada. Una materia solamente aprobada no se considera crédito ya obtenido cuando el plan exige examen.
3. Previaturas conocidas que todavía no figuran satisfechas en el progreso real, usando exclusivamente las reglas evaluables ya normalizadas. Una materia ubicada en un semestre anterior no se presume aprobada.
4. Regla de previa publicada pero no evaluable automáticamente: informar que requiere revisión, sin marcarla incumplida.
5. Objetivo personal excedido.
6. Horas parciales o ausentes al medir por horas.

No inferir dificultad, disponibilidad, período de dictado ni correlatividades a partir del orden sugerido. Ninguna advertencia impide agregar, mover, importar o conservar una materia.

## Impacto académico

- Por semestre, mostrar créditos planificados y el aporte potencial conocido a áreas y títulos.
- El impacto es una proyección: no suma al progreso obtenido hasta que corresponda según el estado académico existente.
- Usar únicamente asignaciones y requisitos oficiales/sugeridos ya presentes en el catálogo. Ante asignaciones alternativas o ambiguas, mostrar el máximo potencial como pendiente de distribución, sin elegir un área silenciosamente.
- Evitar duplicar créditos al sumar nodos padre e hijo; reutilizar la lógica de estructura de créditos existente o extraer una función pura compartida.

## Interfaz y accesibilidad

- Añadir en cada semestre un control compacto para unidad y objetivo, bajo demanda; debe funcionar con teclado y tacto y persistir localmente.
- Cada tarjeta de semestre debe conservar su resumen actual y exponer detalles de carga/impacto bajo demanda para no aumentar el ruido visual.
- Advertencias con texto, no solo color o iconos. Usar regiones accesibles y asociaciones claras con el semestre correspondiente.
- Mantener buen comportamiento en móvil, temas, modo daltónico y movimiento reducido.

## Casos límite

- Planes con créditos u horas cero/desconocidos.
- Materias que aportan a más de un área o cuya distribución depende de una decisión posterior.
- Previaturas por créditos, grupos, alternativas o expresiones parciales.
- Semestres vacíos, importaciones antiguas y planes sin estructura de créditos completa.
- Fallo de almacenamiento: el cambio puede permanecer en memoria, pero F05 debe informar que todavía no quedó guardado.

## Verificación y cierre

- Pruebas unitarias deterministas para las tres unidades, objetivo ausente/excedido, horas parciales, duplicados, acreditadas y previas evaluables/no evaluables.
- Pruebas de migración y round-trip del objetivo por semestre sin romper formatos anteriores.
- Pruebas de integración estática/funcional de controles, textos accesibles y carácter no bloqueante.
- Ejecutar `npm test`, `npm run lint`, `git diff --check` y `npm run security:repo`.
- Cierre: la persona puede planificar libremente; ninguna ausencia de datos se presenta como cero cierto ni como regla oficial inventada.

## Estado

- Implementado en el worktree `feat/p01-planner-load`.
- `term.loadTarget` se conserva en el estado, fingerprint, hidratación, recuperación y documento v3; el export legado de solo planificador continúa omitiéndolo.
- El planificador permite definir o quitar objetivos por semestre, calcula subtotales conocidos y presenta avisos no bloqueantes por exceso, carga incompleta, materias exoneradas, duplicados y previas conocidas o no evaluables.
- El impacto potencial informa créditos de título y áreas con asignación unívoca; las asignaciones ambiguas quedan explícitamente pendientes.
- Validación funcional local: objetivo de 1 crédito, materia de 4 créditos y aviso de exceso/acreditación visibles; controles accesibles desde teclado. La captura de pantalla del navegador de prueba no estuvo disponible, por lo que no se declara revisión visual píxel a píxel.
- Validación automática final: `npm test` (817/817), `npm run lint`, `git diff --check` y `npm run security:repo` correctos.
