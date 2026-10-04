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

- Implementación terminada en el worktree administrado `d03t-fing-computacion-2025`, basado en `1ad9254` y con estado inicial limpio.
- Fuentes guardadas en `tmp/d03t-computacion-2025/`: plan 2025, trayectorias PI 60%+ y PI 20–59%, página EVA y sus extracciones. Hashes SHA-256: plan `90f781344eab5e356b51010005c4075322151ad1ddd3b174d8aa0f0260f623db`; PI 60%+ `0fb7bfda8bd8d848da66b5be49b37d2a2566934a30a2e9326bd62ecb940e7539`; PI 20–59% `e0cffb6037fde785c1e091542437c74c58a0b7c0884002b6d208633e56e5584f`; página `ea8eb1ce31558586e13df1d1e17b67e8796a914fb5cc52a98de4564eb064d043`.
- Cotejo confirmado: 63 de 63 ubicaciones exactas entre el tramo PI menor a 20% y las dos trayectorias montevideanas de ocho semestres. La cobertura continúa pendiente porque esas fuentes no completan diez semestres ni 450 créditos; las trayectorias de segundo semestre y regionales enlazadas actualmente por EVA quedan inventariadas para otra auditoría. La PI no tiene crédito curricular publicado y ya no se acreditará automáticamente.
- Regeneración reproducible: dos ejecuciones consecutivas produjeron SHA-256 idénticos para la proyección (`0b96a83ac79ca81d54dab9a742eb15a40f90fb0e3c5fed825f7732ecdd1c97c9`) y el inventario (`e91b23ac3609f83c3fa21f0c346d1f72ce69e639c2ecc49b43d0f93cbeeb0989`).
- Verificación terminada: focales 56/56, `npm test` 967/967, `npm run lint` sin hallazgos y `git diff --check` limpio. La validación visual no pudo ejecutarse porque la sesión no expuso ningún navegador o aplicación controlable; el servidor local sí inició en `http://localhost:3000`, con la advertencia previa de preoptimización de declaraciones `.d.ts`, y se cerró sin cambios.
- Entrega operativa: estado sellado en un commit enfocado para que el coordinador lo revise; no integrar, hacer push ni desplegar desde este worktree.
