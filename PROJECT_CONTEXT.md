# Contexto compartido del proyecto

Este documento contiene el contexto estable que todos los chats deben conocer. No es un backlog ni una especificacion de una funcionalidad concreta. Las reglas operativas para los agentes estan en `AGENTS.md`.

## Producto

- El producto se llama **Trayecto** y ayuda a estudiantes de Udelar a explorar su curricula, registrar avance y planificar materias.
- La experiencia debe ser clara para estudiantes, funcionar con teclado y tactil, y adaptarse a escritorio y movil.
- La interfaz y los textos destinados a las personas usuarias se mantienen en espanol, salvo una solicitud explicita distinta.
- La informacion curricular debe conservar su trazabilidad. No se deben presentar supuestos, sugerencias o datos incompletos como si fueran informacion institucional confirmada.

## Alcance y datos actuales

- La aplicacion trabaja actualmente con planes de Ingenieria en Computacion de la Facultad de Ingenieria de Udelar.
- Los datos consumidos por la interfaz estan en `app/data/`. Las transformaciones y fuentes asociadas viven en `data/`, `scripts/` y `docs/bedelias-importer.md` cuando corresponde.
- Bedelias es una fuente institucional importante, pero los datos pueden combinar fuentes oficiales, proyecciones y sugerencias. Mantener visible esa diferencia en el modelo y en la interfaz cuando sea relevante.
- Para el Plan 1997, la carga inicial conserva el núcleo y una selección de optativas verificadas. La oferta adicional se genera en `app/data/computacion-1997-electivas.json` y se carga bajo demanda para no incorporar todo el snapshot al paquete inicial.
- Una unidad adicional solo puede acreditarse automáticamente si figura tanto en una oferta oficial vigente de FING como en la composición del plan publicada por Bedelías. La oferta efectiva y la pertenencia curricular se conservan como evidencias distintas.
- El avance y los planes personales se guardan actualmente en el almacenamiento local del navegador. No hay persistencia remota activa: `.openai/hosting.json` no declara D1 ni R2.

## Arquitectura

- Aplicacion web con React 19, TypeScript, vinext y Vite.
- El codigo principal de la interfaz esta bajo `app/`; `app/page.tsx` contiene actualmente gran parte del estado y la interaccion, y `app/globals.css` contiene los estilos globales.
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
