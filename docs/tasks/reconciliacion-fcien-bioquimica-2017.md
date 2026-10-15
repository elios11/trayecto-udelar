# D03ar — Licenciatura en Bioquímica, Plan 2017

## Objetivo

Reconciliar `bedelias-fcien-licenciatura-en-bioquimica-2017`, hoy `research-pending`, con una trayectoria sugerida oficial si la publicación vigente la confirma. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02, D03a y la revisión de fuentes alternativas. Un solo subagente en un worktree propio basado en el `main` actual.

## Fuentes y límites

- Investigar la [presentación institucional de Bioquímica 2025](https://eva.fcien.udelar.edu.uy/mod/resource/view.php?id=1150&redirect=1), especialmente las páginas PDF 10–11, que parecen publicar una trayectoria para primer año y años 2–4. Contrastar autoría, Plan 2017, versión, vigencia y alcance con el [plan alojado en Colibri](https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/24552/1/PLBIO_2020.pdf), la página actual de Facultad/Departamento y otras fuentes institucionales. Inspeccionar visualmente las tablas; si un enlace falla, buscar copia de la misma autoridad antes de cerrar la investigación.
- El plan declara cuatro años, 360 créditos, tesina, tramos y mínimos por área. No convertir bloques flexibles, ejemplos de orientación ni todas las entradas históricas de Bedelías en materias obligatorias. No inventar códigos, créditos ni equivalencias cuando la fuente sólo nombra un bloque.
- Reutilizar `data/bedelias/fcien-licenciatura-en-bioquimica-2017.json` y la auditoría ya versionada. Preservar IDs de progreso y mantener recuperables las candidatas no verificadas. Distinguir materias concretas, opciones alternativas y cupos flexibles, y comprobar que Currícula y planificador no pierdan ninguna materia publicada.
- Si la guía 2025 no corresponde exactamente al Plan 2017 vigente o no puede verificarse, mantener `research-pending` con la brecha precisa; no atribuirle semestres oficiales por analogía. Registrar en `docs/carreras-a-actualizar.md` sólo si la publicación demuestra una implementación progresiva, malla futura o alcance parcial.

## Artefactos y cierre

- Guardar bajo `data/fcien/` evidencia normalizada con URLs, autoridad, consulta, vigencia, filas/identidades cotejadas, conflictos y huella reproducible. Agregar un generador offline que reconstruya proyección, auditoría, revisión, colas e inventario desde datos versionados, sin red; ejecutar dos regeneraciones idénticas.
- Probar períodos y filas oficiales, 360 créditos, tesina, mínimos, flexibilidad, límite `verified`/`candidate`, conservación de progreso y catálogo disponible del planificador. Una prueba debe detectar la pérdida de una materia publicada.
- Ejecutar pruebas focales, `npm test`, `npm run lint` y `git diff --check`. Crear un commit enfocado. Informar riesgos y cualquier fuente inaccesible. No integrar, hacer push ni publicar desde el worktree.

## Estado

- Pendiente de auditoría. La referencia a la presentación 2025 es una pista documentada, no una trayectoria validada todavía.
