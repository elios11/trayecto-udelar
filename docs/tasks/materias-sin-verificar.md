# D02 — Materias sin verificar

## Estado

Nodo pendiente del roadmap `docs/roadmaps/planificacion-y-cuentas.md`. Depende de D01, ya integrado en `main`.

## Objetivo

Permitir que una persona recupere y use de forma consciente una materia que aparece en la composición institucional de Bedelías pero todavía no pudo confirmarse en una fuente curricular oficial vigente. Esta superficie no modifica la malla oficial, no promueve datos automáticamente y no vuelve a mostrar el catálogo candidato completo.

## Fuente y alcance

- Consumir exclusivamente cursos con `authorityStatus: "candidate"` del plan activo.
- Excluir `historical-equivalent`, `administrative` y `rejected`.
- Conservar los IDs y aliases generados por D01; no fusionar por semejanza de texto.
- La malla, el buscador normal y el catálogo oficial continúan aceptando únicamente `verified`.
- La carga del conjunto candidato debe ser diferida y no debe aumentar el paquete inicial de los planes masivos.

## Experiencia

- Añadir al final de Currícula una sección `Materias sin verificar`, cerrada por defecto.
- Explicar en lenguaje breve que son registros presentes en Bedelías cuya pertenencia vigente al plan aún no pudo confirmarse.
- No listar candidatas hasta que exista una búsqueda útil por nombre o código. Reutilizar la normalización sin tildes y los criterios de coincidencia segura del buscador existente; una coincidencia parcial no puede producir resultados irrelevantes por contener unas pocas letras.
- Mostrar resultados limitados y paginables o expandibles por lotes, con estado vacío, carga y error comprensibles.
- Cada resultado debe mostrar nombre, código, carga publicada y procedencia, además de la advertencia `Sin verificar`.
- Permitir agregar una candidata al escenario activo sólo después de una confirmación explícita. Debe poder retirarse con los controles normales del planificador.
- En móvil y escritorio, la sección y la confirmación deben ser utilizables con teclado, tacto y lector de pantalla.

## Semántica personal y cálculos

- Una candidata añadida es una elección personal provisional; no cambia `authorityStatus`, la revisión curricular ni la definición oficial.
- Conservarla en exportaciones completas, importaciones, conflictos, recuperación y cambio de escenario mediante su identidad estable.
- Separar en la UI los totales oficiales del aporte provisional cuando exista al menos una candidata usada.
- Los créditos u horas provisionales pueden informar carga personal, pero nunca completar silenciosamente un mínimo de área, credencial, título o requisito oficial.
- Las validaciones de previas sólo pueden usar reglas publicadas por D01; una regla candidata no bloquea ni habilita materias.
- Si una versión posterior promueve la misma identidad o un alias oficial trazable a `verified`, conservar el estado personal y dejar de tratar su aporte como provisional.

## Rendimiento

- No importar de forma ansiosa todos los candidatos de todos los planes.
- El plan activo puede cargar su artefacto completo bajo demanda cuando se abre la sección o se busca; no realizar requests por materia.
- Filtrar localmente una vez cargado y limitar el DOM a un lote pequeño inicial.
- Limpiar la búsqueda debe volver al estado cerrado/sin resultados sin descartar materias provisionales ya utilizadas.

## Pruebas y cierre

- Plan mixto: la malla normal sólo muestra verificadas; una candidata conocida aparece únicamente tras buscarla.
- Plan sin catálogo verificado: continúa seleccionable y permite consultar candidatas sin presentarlas como currícula oficial.
- Las entradas administrativas, históricas y rechazadas nunca aparecen.
- Agregar y retirar una candidata conserva su identidad estable y sobrevive al round-trip del documento personal.
- El aporte provisional se separa de los totales oficiales y no completa credenciales ni requisitos.
- La promoción posterior por identidad o alias oficial conserva el progreso personal.
- Pruebas de interacción para abrir/cerrar, buscar, confirmar y retirar; cobertura responsive mediante las reglas y componentes existentes.
- Ejecutar `npm test` y `npm run lint`. Validar funcionalmente al menos un plan mixto y uno sin catálogo oficial antes de integrar.

## Fuera de alcance

- Promover materias a `verified` desde la UI.
- Editar créditos, nombres o códigos institucionales.
- Mostrar equivalencias históricas o asientos administrativos como cursables.
- Deduplicar por similitud, inventar aliases o reabrir la política de autoridad de D01.
- Implementar D03 o investigar nuevas fuentes oficiales.

## Estado recuperable

- Especificación creada; implementación pendiente.
