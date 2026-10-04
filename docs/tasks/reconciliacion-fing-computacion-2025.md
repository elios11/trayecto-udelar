# D03t — Cotejo oficial de Ingeniería en Computación 2025

## Estado y modelo

Nodo posterior a D03s. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`. Un solo subagente a la vez; la integración y publicación quedan a cargo del coordinador. Parte del `main` que ya incorpora Computación 1997.

## Objetivo

Contrastar la proyección curada del Plan 2025 con las trayectorias oficiales vigentes publicadas por FING. Reproducir exactamente los períodos y materias que la fuente sí fija, sin completar con conjeturas los perfiles, optativas, créditos complementarios ni Proyecto de Grado cuando carezcan de ubicación publicada. El planificador debe conservar todas las materias verificadas disponibles para el plan, incluidas las alternativas oficiales fuera de la trayectoria seleccionada.

## Fuentes y límites

- Sección curricular de la Comisión de Carrera: https://eva.fing.edu.uy/course/view.php?id=800&section=4
- Recursos de trayectoria para PI 60% o más y PI 20–59%: https://eva.fing.edu.uy/mod/resource/view.php?id=72912 y https://eva.fing.edu.uy/mod/resource/view.php?id=72913
- Fuente curada existente: `data/fing/computacion-2025-trayectorias.json`; proyección: `app/data/computacion-2025-fing.json`; implementación: `app/page.tsx`; inventario D03: `data/official-trajectories/`.

Verificar vigencia, fecha y alcance de cada documento oficial. Distinguir Ingeniería en Computación 2025 de la Licenciatura en Computación 2025 y del Plan 1997; no compartir progreso ni trasladar asignaciones de área entre planes por coincidencia de código. Bedelías sólo contrasta identidades, créditos y reglas ya respaldados por el currículo, no fija semestres.

## Reglas

- Cotejar todas las variantes publicadas, etiquetas, orden, materias, bloques flexibles y créditos impresos por período. La rama PI menor a 20% permanece parcial si no hay continuación única publicada. No contar como cerrada una trayectoria que sólo cubre ocho semestres si la fuente exige más estructura aún no proyectada.
- Preservar IDs personales existentes y `progressPlanId`; cualquier cambio de identidad necesita equivalencia oficial trazable. No convertir cursos recomendados ni alternativas en obligaciones de egreso.
- La Prueba Inicial de cuatro créditos en este plan figura hoy como supuesto operativo: confirmarla expresamente con fuente vigente o mantenerla marcada como pendiente, sin presentarla como acreditación oficial automática.
- Cada materia enumerada en un período oficial debe quedar visible en Currícula y disponible en el planificador. Mantener accesibilidad, respuesta móvil y carga diferida existente.

## Verificación y entrega

- Guardar fuente curada, revisión e inventario reproducibles sin red; conservar PDFs, extracción y checkpoints en `tmp/d03t-computacion-2025/` del worktree.
- Probar correspondencia de períodos y cursos, variantes PI, identidad, catálogo del planificador y preservación de progreso. Regenerar dos veces con hashes idénticos; ejecutar focales, `npm test`, `npm run lint` y `git diff --check`.
- Actualizar `PROJECT_CONTEXT.md` sólo con decisiones estables confirmadas. Si la evidencia no alcanza, documentar la brecha y conservar estado pendiente en vez de forzar cierre del inventario.
- Dejar un commit enfocado y su hash. No integrar, hacer push ni desplegar desde el subagente; el lote local se publicará después de la revisión combinada.

## Checkpoint

- Pendiente de investigación e implementación. Punto de partida: `git status`, esta especificación, fuente curada y recursos oficiales enlazados. No repetir descargas si ya existe un PDF con hash documentado.
