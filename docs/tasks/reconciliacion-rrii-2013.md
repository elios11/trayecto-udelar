# D03bg — Relaciones Internacionales Plan 2013

## Objetivo

Reconciliar el estado `research-pending` del inventario para `bedelias-fder-licenciatura-en-relaciones-internacionales-2013` sobre `main` `2f165e3`. La auditoría previa y la proyección ya describen una [grilla de ocho semestres de Facultad de Derecho](https://www.fder.edu.uy/sites/default/files/2021-09/Plan%20de%20Estudios%20RRII%202013_0.pdf), con ciclos, créditos, título intermedio y modalidades de egreso. Verificar visualmente el PDF si es posible y contrastar con la [página documental vigente](https://www.fder.edu.uy/node/3553), antes de cerrar el inventario. No reconstruir ni duplicar una funcionalidad que ya está presente.

## Límites

Conservar el único Plan 2013, sede, título, progreso e IDs; las ocho posiciones, áreas y mínimos ya publicados; variantes de Función Universitaria y modalidades de egreso sin convertirlas en obligaciones acumulativas. El catálogo central informa 60 meses aunque la grilla tenga ocho semestres: documentar ambas magnitudes sin corregirlas intuitivamente. La discrepancia de créditos del ciclo profesional sigue abierta y no autoriza sumar/fusionar cursos para cuadrar subtotales. Bedelías coteja código y carga, no crea pertenencia oficial por sí sola. Si la grilla 2021 fue reemplazada o su vigencia no es comprobable, no declarar trayectoria actual reproducida; documentar conflicto y gatillo de revisión.

## Entrega

Normalizar evidencia versionada bajo `data/` con URL, autoridad, consulta, vigencia, alcance, filas cotejadas y huella; regenerar offline sin red ni nueva extracción. Actualizar auditoría/inventario/proyección sólo donde sea necesario para reflejar evidencia, sin cambiar comportamiento correcto existente. Añadir pruebas focales de cobertura, identidad, créditos, alternativas y estado. Si no se puede verificar visualmente la grilla, dejar el límite explícito. Dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint`, `git diff --check`. Commit enfocado en este worktree, sin integrar, pushear ni publicar desde él.

## Revisión conservadora del 21 de octubre de 2026

- La [página documental actual de Facultad de Derecho](https://www.fder.edu.uy/node/3553) enlaza expresamente «Plan de estudios de RRII 2013 (actualizado 2021)» al mismo [PDF institucional de dos páginas](https://www.fder.edu.uy/sites/default/files/2021-09/Plan%20de%20Estudios%20RRII%202013_0.pdf). El texto recuperable confirma ocho semestres, título intermedio de 200 créditos (147 obligatorios y 53 opcionales), título final de 320 (227 obligatorios y 93 opcionales) y una sola unidad «Introducción a la Investigación».
- La descarga local del PDF falló al conectar con el proxy del entorno y el visor del navegador mostró una página vacía. La extracción textual desordena las columnas, por lo que **no** se atribuyó una nueva validación visual ni se promovieron las correspondencias materia-semestre sólo por el OCR.
- La proyección previa conserva `2015` y `2015I`, ambas Introducción a la Investigación de 5 créditos, en el segundo semestre y con autoridad `verified` del mismo PDF. Sin código en la grilla ni equivalencia oficial para estas variantes, no se elige una ni se fusiona progreso: ambas identidades quedan estables y el inventario sigue `research-pending`.
- La suma del Ciclo Profesional y la diferencia de 60 meses de duración publicada frente a ocho semestres siguen registradas como contradicciones, sin ajustes intuitivos. La presencia de tres Funciones Universitarias y tres modalidades de egreso no las convierte en requisitos acumulativos.
- Evidencia normalizada: `data/fder/rrii-2013-2021-evidence.json`. Los códigos por período proceden de la auditoría de 2026-08-28, **no** de una lectura visual nueva. `data/fder/rrii-2013-2021-validation.json` incluye la huella de la porción textual normalizada, la huella del artefacto, las comparaciones por período y la anomalía abierta. Esas huellas no son el hash binario del PDF.
- Regeneración offline, sin consultar la web: `node scripts/verify-rrii-2013-evidence.mjs` y `npm run trajectory:inventory`. La prueba focal es `node --test tests/rrii-2013-evidence-validation.test.mjs`.
- Gatillo de cierre: obtener una copia visual legible de la grilla vigente y una fuente oficial que distinga `2015` de `2015I` o establezca su equivalencia; cotejar todas las filas contra la proyección y recién entonces decidir si corresponde cambiar catálogo, semestres o progreso con una migración explícita. No se requiere volver a extraer la composición de Bedelías para repetir el contraste ya guardado.
