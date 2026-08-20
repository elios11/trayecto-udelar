# Contexto compartido del proyecto

Este documento contiene el contexto estable que todos los chats deben conocer. No es un backlog ni una especificacion de una funcionalidad concreta. Las reglas operativas para los agentes estan en `AGENTS.md`.

## Producto

- El producto se llama **Trayecto** y ayuda a estudiantes de Udelar a explorar su curricula, registrar avance y planificar materias.
- La experiencia debe ser clara para estudiantes, funcionar con teclado y tactil, y adaptarse a escritorio y movil.
- La interfaz y los textos destinados a las personas usuarias se mantienen en espanol, salvo una solicitud explicita distinta.
- La informacion curricular debe conservar su trazabilidad. No se deben presentar supuestos, sugerencias o datos incompletos como si fueran informacion institucional confirmada.

## Alcance y datos actuales

- Bedelías inventaría 184 identidades canónicas como vigentes de grado, tecnicatura, tecnólogo y CIO. La auditoría oficial excluye de la UI actual la Diplomatura en Música Plan 1994, sustituida por las Tecnicaturas de Salto, y la Carrera Escalonada de Enfermería Plan 2001, que permanece sólo en régimen de finalización. La aplicación ofrece así 182 identidades vigentes y conserva además el Plan 1997 histórico de Ingeniería en Computación. Ocho planes tienen proyecciones curadas específicas; otros 175 se generan desde snapshots y auditorías. Quince de estos últimos ya incorporan sedes verificadas oficialmente; Archivología, Bibliotecología y Fisioterapia recuperan sus mallas vigentes directamente de los servicios, e Ingeniería Biológica 2013 muestra sus mínimos oficiales aun cuando Bedelías no publica unidades.
- Los datos consumidos por la interfaz estan en `app/data/`. Las transformaciones y fuentes asociadas viven en `data/`, `scripts/` y `docs/bedelias-importer.md` cuando corresponde.
- El inventario global vigente de Bedelías se genera de forma secuencial y reanudable con `npm run bedelias:inventory -- --types "GRADO|TECNICATURA|CIO" --dry-run`; sus índices por servicio viven en `data/bedelias/services/` y el manifiesto académico en `data/bedelias/inventory/global-current.json`. `scripts/build-extracted-academic-plans.mjs` proyecta de forma determinista las identidades pendientes habilitadas explícitamente por este producto y conserva sus estados, anomalías y elegibilidad de publicación en `data/bedelias/inventory/ui-extracted-plans.json`.
- Los servicios regionales se modelan como ofertas de un plan canónico, no como currículas independientes por defecto. Una coincidencia exacta de carrera normalizada y año sólo es candidata a reutilización hasta comparar contenido; las diferencias curriculares verificadas se representan como variantes por sede y no como perfiles o trayectorias.
- Ingeniería Eléctrica Plan 2023 conserva siete perfiles oficiales, núcleo común derivado de esos perfiles, 450 créditos, mínimos por cuatro grupos y 24 áreas, y previaturas de curso/examen auditadas. No tiene un título intermedio publicado y la interfaz no inventa uno.
- La proyección principal de Eléctrica (`app/data/electrica-2023-fing.json`) y su catálogo ampliado (`app/data/electrica-2023-electivas.json`) se cargan bajo demanda al seleccionar la carrera o buscar/expandir optativas. La fuente curada es `data/fing/electrica-2023-trayectorias.json` y el generador es `scripts/build-electrica-2023.mjs`.
- Ingeniería Civil Plan 2021 conserva cuatro perfiles oficiales de diez semestres, 450 créditos, mínimos por cuatro grupos y 19 áreas, y previaturas auditadas. Su fuente curada es `data/fing/civil-2021-trayectorias.json`; `scripts/build-civil-2021.mjs` genera la proyección inicial y el catálogo diferido, excluyendo las entradas administrativas de reválidas sin perder su auditoría.
- Química Farmacéutica Plan 2015 conserva el damero vigente 2026 y dos referencias históricas oficiales —la actualización 2024 y la implementación original 2015—, todas en diez semestres, con 450 créditos totales, 324 obligatorios, 71 optativos/electivos y 55 de Practicantado. Sus proyecciones inicial y de catálogo se cargan bajo demanda; la fuente curada vive en `data/fq/` y se genera con `scripts/build-quimico-farmaceutico-2015.mjs`. Las diferencias entre damero y Bedelías se representan explícitamente como conflictos.
- Los tres planes vigentes de FADU se proyectan desde `data/fadu/audited-plans.json` con `npm run bedelias:project:fadu` y se cargan bajo demanda mediante `app/academic-plan-registry.ts`. Arquitectura se representa por etapas flexibles, LDCV conserva 363 créditos y el ingreso 2026, y Diseño Industrial conserva un título con perfiles Producto y Textil-Indumentaria y la regla flexible vigente 35/16/10. El catálogo SGAE histórico/electivo no se presenta como oferta vigente.
- La navegación académica usa una jerarquía explícita `Facultad/servicio → Carrera → Plan → Sede → Perfil/Trayectoria`. `Sede` es una oferta del mismo plan, sólo aparece cuando una auditoría oficial aporta más de una localización y nunca duplica carrera ni progreso. Una trayectoria territorial se asocia a una sede únicamente con respaldo oficial; una oferta regional más amplia de electivas no se interpreta como variante curricular.
- Las auditorías oficiales de catorce planes generados alimentan sus sedes y metadatos normalizados. Educación Física filtra sus trayectos según la sede y la Tecnicatura en Deportes vincula cada opción deportiva con su localización y estado de ingreso; las vías regionales de primer año no se muestran como sedes completas. Una auditoría puede aportar una malla oficial o sólo su estructura de mínimos cuando el snapshot de Bedelías está vacío, conservando una procedencia distinta de Bedelías y sin inventar unidades, créditos ni previaturas. Estas proyecciones siguen sin ser elegibles para publicación automática.
- Bedelias es una fuente institucional importante, pero los datos pueden combinar fuentes oficiales, proyecciones y sugerencias. Mantener visible esa diferencia en el modelo y en la interfaz cuando sea relevante.
- Las reglas de Bedelías con operadores lógicos sin alternativas ni descendientes se consideran parciales: los generadores y la interfaz no las evalúan ni bloquean materias, y `npm run bedelias:audit-rules -- --strict` debe quedar limpio antes de cerrar una importación global.
- Para el Plan 1997, la carga inicial conserva el núcleo y 20 optativas verificadas. El catálogo completo se genera desde la composición publicada por Bedelías en `app/data/computacion-1997-electivas.json` y se carga bajo demanda para no incorporarlo al paquete inicial. Los buscadores lo cargan temporalmente y muestran sólo coincidencias; limpiar la búsqueda vuelve a las 20 iniciales, salvo que la persona haya expandido explícitamente el catálogo.
- Bedelías es la fuente primaria para existencia, código, créditos y pertenencia al plan. EVA, horarios, programas y otras publicaciones oficiales son enriquecimientos opcionales y nunca condicionan que una materia de Bedelías sea visible o acreditable. Se excluyen únicamente entradas administrativas que no representan unidades curriculares, como créditos genéricos por reválida.
- El avance, los planes personales, la selección académica y las preferencias de interfaz se guardan actualmente en el almacenamiento local del navegador. No hay persistencia remota activa: `.openai/hosting.json` no declara D1 ni R2.

## Arquitectura

- Aplicacion web con React 19, TypeScript, vinext y Vite.
- El codigo principal de la interfaz esta bajo `app/`; `app/page.tsx` contiene actualmente gran parte del estado y la interaccion, y `app/globals.css` contiene los estilos globales.
- La jerarquía de facultades, carreras y planes vive en `app/academic-catalog.ts`, que combina el núcleo curado con `app/data/extracted-academic-catalog.json`; los registros de estado por plan se inicializan desde ese catálogo. Los datasets masivos se registran para carga diferida mediante `app/data/extracted-academic-loaders.ts` y `app/academic-plan-registry.ts`, sin condicionales por carrera en la interfaz central. Una composición no publicada mantiene la carrera seleccionable y muestra un estado vacío explícito, sin inventar materias o mínimos.
- Las pruebas automatizadas estan bajo `tests/` y se ejecutan con el runner nativo de Node despues de la compilacion.
- El proyecto usa npm y requiere Node.js `>=22.13.0`.
- El despliegue esta configurado mediante `.openai/hosting.json` para Sites.

## Decisiones de producto transversales

- Preservar los datos y el progreso existentes al introducir nuevas preferencias o formatos de almacenamiento. Toda migracion debe ser compatible hacia atras o incluir una estrategia explicita.
- Las preferencias personales sin requisito de sincronizacion remota se guardan localmente en el navegador.
- No introducir autenticacion, base de datos, telemetria ni servicios externos solo por conveniencia de implementacion; requieren una decision de producto explicita.
- Mantener accesibilidad, contraste suficiente, estados de foco, navegacion por teclado, soporte tactil y respeto por `prefers-reduced-motion`.
- Evitar que una funcionalidad nueva cambie identidad visual, metadatos o datos curriculares fuera de su alcance.

## Fuentes de verdad

- Para el objetivo de una tarea: la solicitud actual del usuario y su archivo en `docs/tasks/`.
- Para el comportamiento existente: el codigo y las pruebas de la rama en la que se trabaja.
- Para decisiones estables compartidas: este archivo.
- Para el protocolo de trabajo, integracion y publicacion: `AGENTS.md`.
- Para la importacion y validacion curricular desde Bedelias: `docs/bedelias-importer.md`.
- El importador puede ejecutarse por plan, como lote secuencial y reanudable por servicio o como inventario global en seco; estos procesos locales no usan modelos ni APIs de IA y no publican datos automáticamente.

Si estas fuentes parecen incompatibles, el agente debe comprobar primero si su worktree quedo desactualizado respecto de `main`. No debe inventar una conciliacion ni copiar cambios desde otro worktree sin autorizacion.

## Comandos de verificacion

- `npm test`: compila y ejecuta la suite automatizada.
- `npm run lint`: valida el codigo fuente.
- `npm run dev`: inicia el entorno local para validacion funcional y visual.

## Reglas para mantener este contexto

- Leer el archivo completo al comienzo de cada tarea.
- Registrar solo hechos confirmados y decisiones duraderas que afecten a varias funcionalidades.
- No agregar planes temporales, tareas pendientes, conversaciones, nombres de chats, ramas, hashes de commits ni detalles exclusivos de una feature.
- Las especificaciones detalladas van en `docs/tasks/<nombre>.md`, un archivo por funcionalidad.
- Actualizar este documento en el mismo commit que cambie una decision transversal, una fuente de datos, la arquitectura, la persistencia o los comandos oficiales.
- Mantenerlo breve. Cuando un tema requiera detalle operativo, enlazar un documento especifico en `docs/` en lugar de copiarlo aqui.
- Durante la integracion final, revisar que el documento describa el estado combinado de `main`, no solamente el worktree de una funcionalidad.
