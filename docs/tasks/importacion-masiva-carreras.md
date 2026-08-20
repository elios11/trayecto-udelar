# Importación masiva de carreras vigentes

## Objetivo

Incorporar todas las carreras vigentes de grado, tecnicaturas y CIO de Udelar mediante un flujo recuperable, evitando trabajo manual por materia y publicación de datos sin auditoría.

## Alcance

- Descubrimiento de servicios, carreras, sedes y planes vigentes.
- Extracción secuencial y reanudable por servicio.
- Contrato curricular común con procedencia y datos originales.
- Auditoría automática y revisión documental dirigida por excepciones.
- Registro académico escalable y carga diferida.
- Posgrados y planes históricos quedan fuera salvo autorización posterior.

## Estados del manifiesto

Cada servicio, carrera, sede y plan conserva uno:

1. `discovered`: identificado.
2. `extracted`: snapshot completo.
3. `structurally-valid`: contratos automáticos superados.
4. `official-sources-pending`: faltan fuentes o resolver ambigüedades.
5. `audited`: contrastado y listo para integrar.
6. `blocked`: detenido con causa y acción necesaria.

Recolectar no equivale a auditar; auditar no equivale a publicar.

## Fases

### 1. Inventario

- Generar un manifiesto deduplicado desde el catálogo público.
- Comparar datasets y worktrees existentes para no duplicar trabajo.
- Ejecutar primero `--dry-run` y guardar cantidades por servicio y tipo.

### 2. Piloto

- Elegir un servicio moderado aún no incorporado.
- Verificar checkpoints, reanudación, atomicidad, límite de solicitudes y errores.
- Corregir problemas genéricos antes de escalar.

### 3. Recolección por servicio

- Un proceso local por servicio, sin supervisión request a request.
- Conservar índices, lotes, checkpoints y snapshots válidos.
- Reintentar sólo fallos transitorios con límites y backoff.
- Emitir resúmenes compactos al finalizar.

### 4. Normalización

Representar cuando la fuente lo publique: servicio, carrera, sede, plan, vigencia, títulos, materias, códigos, créditos, equivalencias, grupos, áreas, mínimos, trayectorias, perfiles, optativas, previaturas de curso/examen, texto original, URL, fecha y estado de procedencia.

Los adaptadores por servicio no deben introducir condicionales manuales en la interfaz central.

### 5. Auditoría

Verificar como mínimo:

- identificadores únicos y referencias resolubles;
- créditos no negativos y totales coherentes;
- mínimos de áreas, grupos y títulos;
- reglas parseadas o marcadas como no interpretadas o no publicadas;
- materias de trayectorias justificadas por composición o fuente oficial;
- procedencia y fecha de cada dato publicable;
- diferencias entre ejecuciones para detectar pérdidas institucionales.

La revisión documental consulta planes, resoluciones, sitios del servicio, EVA y repositorios oficiales sólo para excepciones. Sitios estudiantiles no son fuente de verdad.

### 6. Integración

- Generar un registro académico en lugar de condicionales por carrera en `app/page.tsx`.
- Cargar datasets grandes bajo demanda.
- Mostrar sólo carreras `audited`.
- Preservar progreso local, preferencias y aislamiento entre planes.
- Integrar y publicar serialmente desde una única tarea coordinadora.

## Eficiencia, modelos y continuidad

- Extracción, transformación y validación repetitiva se ejecutan con scripts locales.
- El scraper local no consume uso de modelo sin nuevos turnos del agente.
- No sondear procesos sin cambios; registrar una vez comando y rutas.
- Reducir resultados a conteos, hashes, estados y excepciones.
- Crear checkpoints por hito, no por request.
- Usar Sol para arquitectura, fuentes oficiales ambiguas, auditoría final e integración.
- Usar Terra, cuando esté disponible, sólo para subtareas mecánicas acotadas y verificables.
- Al cerrar cada hito registrar comando de reanudación, artefactos, completados, pendientes, bloqueos, validación y próximo paso.

## Paralelismo

- La tarea coordinadora puede delegar lotes independientes en worktrees separados.
- No crear un subagente por carrera ni editar simultáneamente el mismo generador, registro o documento compartido.
- No ejecutar en paralelo más resultados de los que la tarea coordinadora pueda revisar.
- Una sola tarea integra y publica en serie sobre el `main` más reciente.
- El coordinador masivo reconoce carreras ya integradas o recibidas de tareas paralelas y evita repetirlas.

## Criterios de aceptación

- Inventario reproducible de todos los planes vigentes en alcance.
- Un servicio puede extraerse y reanudarse sin intervención del agente.
- Normalización y validación tienen comandos documentados.
- Cada carrera conserva estado, procedencia, cobertura y anomalías.
- Nuevas carreras auditadas se registran sin lógica condicional específica.
- Ninguna carrera no auditada aparece públicamente.
- Las pruebas pasan o sólo documentan deuda previa no ampliada.

## Estado inicial

- Ya existe un importador individual y un lote reanudable por servicio.
- Ya están integradas Ingeniería en Computación 1997/2025, Ingeniería Eléctrica 2023, Ingeniería Civil 2021 y Química Farmacéutica 2015.
- Próximo hito: inventario global en seco y selección de un servicio piloto todavía no incorporado, sin repetir FIng ni Facultad de Química.

## Hitos recuperables

### Inventario global en seco — completado 2026-08-11

- Comando ejecutado en PowerShell: `npm.cmd --% run bedelias:inventory -- --types "GRADO|TECNICATURA|CIO" --dry-run`.
- Reanudación: ejecutar exactamente el mismo comando; el checkpoint omite servicios completos y reintenta sólo los fallidos.
- Artefactos: `data/bedelias/services/*-index.json`, `data/bedelias/inventory/global-current.json` y estado local ignorado por Git en `data/bedelias/batches/global-inventory.json`.
- Cobertura: 25/25 servicios del catálogo, 250 carreras/planes marcados vigentes por Bedelías; 246 `discovered` y 4 `audited` ya incorporados al producto.
- Hash del manifiesto: `sha256:03570279136b9af58948b2cbac77f1506924402971ed0c313bf019e5b27333f7`.
- Bloqueos: ninguno. Se corrigieron el paginador oculto y el colapso accidental de la pestaña Salud; la corrección aplica al descubridor y al extractor individual.
- Anomalías: Bedelías clasifica los 250 objetivos seleccionados con el tipo original `Grado`, incluso cuando el nombre corresponde a tecnicaturas o tecnólogos; también marca vigentes algunos planes con años 1900/1901. El índice no publica sedes. Estos datos se conservan sin reinterpretarlos y quedan pendientes de auditoría oficial.
- Piloto seleccionado: FADU, con Arquitectura 2015, Licenciatura en Diseño de Comunicación Visual 2007 y Licenciatura en Diseño Industrial 2013. Es un servicio no incorporado, no regional y de volumen moderado (3 planes).
- Siguiente paso: ejecutar una única extracción reanudable de FADU a 500 ms con `npm.cmd --% run bedelias:service -- --service FADU --types "GRADO|TECNICATURA|CIO" --delay 500` y revisar snapshots, cobertura e incidencias al finalizar.

### Servicio piloto FADU — extracción y validación estructural completadas 2026-08-12

- Comando ejecutado: `npm.cmd --% run bedelias:service -- --service FADU --types "GRADO|TECNICATURA|CIO" --delay 500`.
- Reanudación verificada en una interrupción real: ejecutar exactamente el mismo comando. Arquitectura se omitió luego de completar su snapshot y los planes de Diseño retomaron desde sus checkpoints.
- Estado local del lote: `data/bedelias/batches/fadu-vigentes.json`; checkpoints individuales: `data/bedelias/fadu-*.json.checkpoint`.
- Snapshots: Arquitectura 2015, Licenciatura en Diseño de Comunicación Visual 2007 y Licenciatura en Diseño Industrial 2013 bajo `data/bedelias/fadu-*.json`.
- Cobertura total: 4.234 entradas de composición, 4.125 entradas de previaturas, 1.848 reglas publicadas y 2.277 consultas sin regla publicada; 86.303 requests de interfaz a 500 ms.
- Volumen: 52.387.639 bytes entre los tres snapshots. Arquitectura concentra 2.864 cursos y 47.313 requests; debe presupuestarse como plan grande aunque el servicio tenga sólo tres carreras vigentes.
- Normalización genérica agregada: mínimos de aprobación por grupo, créditos por perfil, inscripción a perfil, créditos entre alternativas y etiquetas locales cuyo nombre comienza con otro código institucional.
- Validación: las 1.102 incidencias iniciales de requisitos no interpretados quedaron en cero tras renormalizar localmente, sin nuevas requests. Los tres planes están `structurally-valid`.
- Reporte compacto reproducible: `npm.cmd --% run bedelias:report -- --service FADU --types "GRADO|TECNICATURA|CIO"`; artefacto `data/bedelias/reports/fadu-pilot.json`.
- Manifiesto global actualizado: 243 planes `discovered`, 3 `structurally-valid` y 4 `audited`; hash `sha256:b5e4410f8c7112d4e4371cdd78dc753f61ad7e860cac53cbd21c466bc3564ba2`.
- Estado académico del servicio: `official-sources-pending`. Ningún plan FADU se habilita en la interfaz hasta contrastar vigencia, sedes, títulos, áreas, mínimos y trayectorias con fuentes oficiales adicionales.
- Siguiente paso: auditoría documental dirigida por las excepciones y campos todavía no publicados por el índice de Bedelías; después diseñar el registro académico y la carga diferida sin incorporar lógica condicional en `app/page.tsx`.

### FADU — auditoría oficial, normalización e integración UI completadas 2026-08-12

- Auditoría documental: `docs/fadu-auditoria-oficial.md`. Se contrastaron vigencia, sedes, títulos, duración, créditos, áreas, ciclos, perfiles, trayectorias y cambios normativos de los tres planes con documentos y páginas oficiales de FADU, Facultad de Artes y Udelar.
- Fuente curada: `data/fadu/audited-plans.json`. Generación reproducible: `npm.cmd run bedelias:project:fadu`; salidas diferidas bajo `app/data/fadu-*.json`.
- Arquitectura 2015: 450 créditos, título único Arquitecto, organización 2025 por etapa inicial 84, desarrollo 255, segundo ciclo 63 y flexibles 38 + 10. La UI usa etapas y bloques; no inventa una secuencia semestral.
- LDCV 2007: 363 créditos y cuatro años; trayectoria vigente con ingreso 2026. Se corrigieron las asignaciones parciales de L113, L114 y L117 y se conserva el carácter compartido con Facultad de Artes.
- Diseño Industrial 2013: un título de 360 créditos y perfiles Producto/Textil-Indumentaria. Se reemplazó el mínimo SGAE solapado de 24 por la regla vigente 35 totales, 16 optativos y 10 electivos; los códigos históricos quedan auditados pero fuera del núcleo.
- Registro académico: `app/academic-catalog.ts` concentra la jerarquía y `app/academic-plan-registry.ts` registra loaders y metadatos. `app/page.tsx` carga cualquier plan registrado sin condicionales específicos de FADU.
- Integración funcional: selección Facultad → Carrera → Plan → Perfil/Trayectoria, períodos oficiales variables, requisitos, avance y planificador aislados por plan, persistencia local y procedencia FADU visible.
- Verificación: `npm test` pasó 102/102; `npm run lint` pasó; validación local de las tres carreras en escritorio y a 390 px, sin desborde horizontal ni errores de consola. También se verificó persistencia del avance al recargar.
- Commits recuperables previos: `447d6e1` (registro académico común) y `df8b27c` (auditoría y proyecciones normalizadas). La integración UI se entrega en un commit separado de este mismo worktree.
- Alcance deliberado: los bloques curriculares agregados se acreditan manualmente; no se presentan como unidades individuales. Los catálogos histórico/electivo completos de Arquitectura y Diseño Industrial permanecen fuera de la UI hasta una auditoría de oferta específica.
- Estado del manifiesto: los tres planes FADU pasan a `audited` mediante evidencia explícita en `data/bedelias/inventory/status-overrides.json`; el snapshot bruto no cambia de significado.

### Carril de recolección posterior al piloto — FAGRO completado 2026-08-13

- Siguiente servicio central de la cola: FAGRO, con Ingeniero Agrónomo 2020, Licenciatura en Vitivinicultura 2006 y Técnico Rural 1956.
- Comando reanudable recomendado en Windows: `npm.cmd run bedelias:service -- --service FAGRO --delay 500`. Los tipos por defecto ya son `GRADO|TECNICATURA|CIO`; omitir el argumento evita que `cmd.exe` interprete `|` como tuberías al lanzar el proceso en segundo plano.
- Estado y checkpoints: `data/bedelias/batches/fagro-vigentes.json` y `data/bedelias/fagro-*.json.checkpoint`; salida de operación local en `tmp/importacion-masiva/fagro.*.log`.
- El intento inicial dentro del sandbox no pudo abrir Chrome. Los intentos autorizados avanzaron hasta 385/387 consultas de Ingeniería Agrónoma, pero el selector de detalle dependía del texto accesible completo de la fila y agotó la espera en `13000 - TESIS`; Vitivinicultura y Técnico Rural agotaron la espera inicial de la lista pública. El cuarto lanzamiento no ejecutó el scraper porque `cmd.exe` interpretó el argumento de tipos como tres comandos separados.
- Corrección genérica: las filas de previaturas se identifican por la grilla institucional y su `data-ri`, las filas que realmente no ofrecen detalle se registran como `noPublishedRule`, y la lista tiene una recuperación acotada ante una carga transitoria incompleta. La validación real y limpia de `13000 - TESIS` abrió el detalle y extrajo una regla; `npm test` pasó 107/107 y `npm run lint` pasó.
- Causa final de los dos planes antiguos: la interfaz oficial los declara vigentes y publica sus datos básicos y títulos, pero muestra literalmente `No se puede mostrar la composición de este plan.`. Como no existen cursos que consultar, el scraper ahora registra `compositionAvailability.available=false`, conserva esa razón como anomalía y no intenta abrir un sistema de previas vacío.
- Reanudación final: `npm.cmd run bedelias:service -- --service FAGRO --delay 500`. El lote omitió Ingeniería Agrónoma después de su snapshot exitoso, completó Técnico Rural y, tras un único timeout transitorio de navegación, reintentó solamente Vitivinicultura. Estado final: 3/3 `succeeded`, sin fallos ni interrupciones.
- Snapshots: `data/bedelias/fagro-ingeniero-agronomo-2020.json`, `data/bedelias/fagro-licenciatura-en-vitivinicultura-2006.json` y `data/bedelias/fagro-tecnico-rural-1956.json`. Cobertura: 526 cursos, 387 entradas de previaturas, 327 reglas publicadas y 60 consultas sin regla publicada.
- Normalización local sin nuevas requests: los códigos de grupo con guiones (`2020-2-3`, `UC-ELE`) quedaron interpretados; Ingeniería Agrónoma pasó de 1.128 requisitos crudos a cero incidencias. Los dos planes antiguos conservan una advertencia estructural cada uno por la ausencia oficial de composición.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service FAGRO`; artefacto `data/bedelias/reports/fagro-pilot.json`, estado `extracted` y 2 advertencias. El servicio no queda auditado ni habilitado para publicación.
- Manifiesto global actualizado sin red: 240 planes `discovered`, 7 `audited`, 1 `structurally-valid` y 2 `extracted`; hash `sha256:a41d1521d2318f01d8cc5c536b6b1b0f9f48506b35ee86b8d6abcfabcce99046`.
- Verificación: `npm test` y `npm run lint`. Siguiente servicio central de la cola: FARTES; mantener un único proceso secuencial y no integrar ni publicar sin autorización.

### Carril de recolección — FARTES completado 2026-08-13

- Comando reanudable: `npm.cmd run bedelias:service -- --service FARTES --delay 500`; estado local `data/bedelias/batches/fartes-vigentes.json` y checkpoints individuales `data/bedelias/fartes-*.json.checkpoint`.
- La primera ejecución completó 14/17 planes. Cerámica 2002, Composición 1987 y Profesorado 1967 agotaron la espera de URL al seleccionar el servicio, antes de leer datos de la carrera.
- Corrección genérica: la apertura del servicio se confirma por la aparición visible del filtro de carreras, que es el estado de UI realmente requerido, en vez de depender de un evento de navegación JS. La misma transición se comparte entre descubrimiento y extracción y queda cubierta por una prueba aislada.
- Reanudación final: el mismo comando omitió los 14 snapshots completos y reintentó únicamente los tres fallidos. Estado final: 17/17 `succeeded`, sin fallos ni interrupciones.
- Cobertura: 1.086 cursos, 304 entradas de previaturas, 97 reglas publicadas y 207 consultas sin regla publicada; 9.127 requests de interfaz a 500 ms. Los 17 snapshots no presentan incidencias estructurales.
- Algunos planes antiguos publican un árbol de composición sin nodos de materia. El snapshot conserva ese resultado literal; no se interpreta como currículo vacío ni se habilita para la UI hasta contrastarlo con fuentes oficiales.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service FARTES`; artefacto `data/bedelias/reports/fartes-pilot.json`, estado `official-sources-pending`.
- Manifiesto global actualizado sin red: 223 planes `discovered`, 7 `audited`, 18 `structurally-valid` y 2 `extracted`; hash `sha256:b58ce0d45f9b1cb0714bcc398c1fdf94ddf3950291938c9a6fa35d7294ca7e54`.
- Siguiente servicio central de la cola: FCEA. Mantener un único proceso secuencial; antes de integrar datos en la UI se requiere auditoría oficial por servicio.

### Carril de recolección — FCEA completado 2026-08-13

- Comando ejecutado y reanudable: `npm.cmd run bedelias:service -- --service FCEA --delay 500`; estado local `data/bedelias/batches/fcea-vigentes.json` y checkpoints individuales `data/bedelias/fcea-*.json.checkpoint`.
- Estado final: 6/6 `succeeded` en el primer intento, sin fallos ni interrupciones: Contador Público 2024, las licenciaturas en Administración 2012, Economía 2012 y Estadística 2014, Técnico en Administración 2014 y Tecnólogo en Gestión Universitaria 2018.
- Normalización genérica local: Bedelías publica `Actividad Examen aprobada/reprobada` como condición negativa, distinta de un examen aprobado. El contrato ahora la conserva como `exam-activity`; los cuatro snapshots afectados quedaron sin requisitos crudos y no se hicieron nuevas requests.
- Cobertura: 1.328 cursos, 1.596 entradas de previaturas, 722 reglas publicadas y 874 consultas sin regla publicada; 48.667 requests de interfaz a 500 ms.
- El Tecnólogo en Gestión Universitaria es la única excepción estructural: Bedelías lo marca vigente pero no publica su composición. Se conserva como `extracted`; los otros cinco planes quedan `structurally-valid`.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service FCEA`; artefacto `data/bedelias/reports/fcea-pilot.json`, estado `extracted` y una advertencia. Nada queda auditado ni habilitado para publicación.
- Manifiesto global actualizado sin red: 217 planes `discovered`, 7 `audited`, 23 `structurally-valid` y 3 `extracted`; hash `sha256:8390057b0ef8043cccb72e99c38dd39257c76c61d39f89a2a8b3286a2d6de922`.
- Siguiente servicio central de la cola: FCIEN. Mantener un único proceso secuencial y no integrar ni publicar sin autorización.

### Carril de recolección — FCIEN completado 2026-08-13

- Comando reanudable: `npm.cmd run bedelias:service -- --service FCIEN --delay 500`; estado local `data/bedelias/batches/fcien-vigentes.json` y checkpoints `data/bedelias/fcien-*.json.checkpoint`.
- La primera pasada terminó con 9/12 snapshots. Bioquímica y Ciencias Biológicas agotaron la espera al abrir el servicio; Ciencias de la Atmósfera llegó a `MA02` pero Bedelías no mostró el árbol de previaturas.
- Recuperaciones genéricas: la transición al servicio y la apertura del árbol admiten un único reintento acotado; el retorno desde un detalle tolera un rechazo de red y prueba el estado actual/recarga antes de fallar. Ninguna recuperación degrada el error a una falsa ausencia de regla.
- Validación real: Atmósfera superó `MA02`, luego reanudó tras un `ERR_CONNECTION_REFUSED` y cerró 173 cursos/150 reglas sin incidencias. Bioquímica y Ciencias Biológicas reutilizaron checkpoints; no se repitieron los nueve planes completos.
- Normalización local: `90 créditos en el Ciclo: 22 - TRAMO COMÚN` se conserva como `cycleCreditRequirement`. Bioquímica pasó de dos requisitos crudos a cero incidencias sin nuevas requests.
- Estado final reconciliado desde snapshots válidos: 12/12 `succeeded`. La reconciliación verifica esquema, servicio, carrera, año y contrato de validación antes de adoptar una salida generada fuera del proceso padre.
- Cobertura: 4.491 cursos, 5.225 entradas de previaturas, 2.752 reglas publicadas y 2.473 consultas sin regla publicada; 152.697 requests registradas. Once planes no tienen incidencias; Oceanografía Biológica 1978 conserva una advertencia porque Bedelías no publica su composición.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service FCIEN`; artefacto `data/bedelias/reports/fcien-pilot.json`, estado `extracted`. Ningún plan queda auditado ni habilitado para publicación.
- Manifiesto global actualizado sin red: 205 planes `discovered`, 7 `audited`, 34 `structurally-valid` y 4 `extracted`; hash `sha256:8c07585367a8a768a2782c3807ce3478467e81d45711286d3ea7daaa01d4d61c`.
- Siguiente servicio central de la cola: FCS. Mantener un único proceso secuencial y no integrar ni publicar sin autorización.

### Carril de recolección — FCS completado 2026-08-13

- Comando ejecutado y reanudable: `npm.cmd run bedelias:service -- --service FCS --delay 500`; estado local `data/bedelias/batches/fcs-vigentes.json`.
- Estado final: 4/4 `succeeded` en el primer intento, sin fallos ni interrupciones: Ciencia Política, Desarrollo, Sociología y Trabajo Social, todos con plan 2009.
- La interfaz de Bedelías marca vigentes los cuatro planes, pero no publica la composición de ninguno. Cada snapshot conserva `compositionAvailability.available=false` y la advertencia correspondiente; no se inventan materias ni previaturas.
- Cobertura literal: cero cursos/reglas publicados, 508 requests de interfaz y cuatro advertencias estructurales.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service FCS`; artefacto `data/bedelias/reports/fcs-pilot.json`, estado `extracted`. Ningún plan queda auditado ni habilitado para publicación.
- Manifiesto global actualizado sin red: 201 planes `discovered`, 7 `audited`, 34 `structurally-valid` y 8 `extracted`; hash `sha256:ce413b21cdb9198611b8d777f02d3c7e244b02c312abf29df903061c5eebfe21`.
- Siguiente servicio central de la cola: FDER. Mantener un único proceso secuencial y no integrar ni publicar sin autorización.

### Carril de recolección — FDER completado 2026-08-13

- Comando ejecutado y reanudable: `npm.cmd run bedelias:service -- --service FDER --delay 500`; estado local `data/bedelias/batches/fder-vigentes.json` y checkpoints individuales `data/bedelias/fder-*.json.checkpoint`.
- La primera pasada dejó 3/11 planes completos. Ocho planes fallaron porque Bedelías abrió una pantalla de previaturas sin filas ni filtro, que el scraper confundía con una navegación incompleta. Ese estado ahora se reconoce por el botón institucional `Volver` y se conserva como ausencia de reglas publicadas.
- Dos reanudaciones posteriores omitieron los snapshots completos. Los bloqueos transitorios `EPERM` de Windows durante el renombre atómico de checkpoints ahora admiten reintentos breves y acotados; la recuperación se comparte con snapshots, lote, reportes e inventario y tiene pruebas deterministas.
- Traductorado Público Alemán fue el único plan restante tras la segunda reanudación: agotó la espera al abrir FDER. La transición ahora reconstruye la oferta académica completa antes del único reintento. La validación real produjo 68 cursos, 68 consultas sin regla y cero incidencias.
- Estado final reconciliado: 11/11 `succeeded`, cero fallos e interrupciones. La pasada final omitió explícitamente los once snapshots existentes.
- Cobertura: 1.643 cursos, 1.545 entradas de previaturas, cero reglas publicadas y 1.545 consultas sin regla; 1.637 requests registradas. Diplomacia 1918 y Licenciatura en Relaciones Laborales 2012 conservan una advertencia porque Bedelías no publica su composición; los otros nueve planes no tienen incidencias estructurales.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service FDER`; artefacto `data/bedelias/reports/fder-pilot.json`, estado `extracted`. Ningún plan queda auditado ni habilitado para publicación.
- Manifiesto global actualizado sin red: 190 planes `discovered`, 7 `audited`, 43 `structurally-valid` y 10 `extracted`; hash `sha256:9fc52b13a759c8e1b2cf53df786b8c4734360fac5f66b697afc20116f494ffbe`.
- Siguiente servicio central de la cola: FENF. Mantener un único proceso secuencial y no integrar ni publicar sin autorización.

### Carril de recolección — FENF completado 2026-08-13

- Comando ejecutado y reanudable: `npm.cmd run bedelias:service -- --service FENF --delay 500`; estado local `data/bedelias/batches/fenf-vigentes.json` y checkpoints individuales `data/bedelias/fenf-*.json.checkpoint`.
- Alcance por tipos: cuatro planes de grado vigentes. Los 23 posgrados y el plan preuniversitario del índice quedan fuera del filtro global `GRADO|TECNICATURA|CIO`.
- Estado final: 4/4 `succeeded` en el primer intento, sin fallos ni interrupciones: Enfermería Universitaria 1983, Escalonada de Enfermería 2001, Licenciatura en Enfermería 2016 y Profesionalización de Auxiliar 1999.
- Cobertura: 223 cursos, 131 entradas de previaturas, 50 reglas publicadas y 81 consultas sin regla; 3.959 requests registradas. Los cuatro snapshots pasan la validación estructural automática.
- Los planes 1983, 1999 y 2001 publican un árbol de composición válido pero sin nodos de materia. Se conserva literalmente y no se interpreta como una currícula vacía ni se habilita para la UI sin fuentes oficiales.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service FENF`; artefacto `data/bedelias/reports/fenf-pilot.json`, estado `official-sources-pending`.
- Manifiesto global actualizado sin red: 186 planes `discovered`, 7 `audited`, 47 `structurally-valid` y 10 `extracted`; hash `sha256:17a9af7e5806109d0af67f88281dd9db7008f55f4e26b43959a44c6d8ec4d114`.
- Siguiente servicio central de la cola: FHUM. Mantener un único proceso secuencial y no integrar ni publicar sin autorización.

### Carril de recolección — FHCE (`FHUM` en Bedelías) completado 2026-08-13

- Comando ejecutado y reanudable: `npm.cmd run bedelias:service -- --service FHUM --delay 500`; estado local `data/bedelias/batches/fhum-vigentes.json` y checkpoints `data/bedelias/fhum-*.json.checkpoint`. `FHUM` se conserva sólo como código técnico; el nombre público usado en informes es FHCE.
- Estado final: 14/14 `succeeded` en el primer intento, sin fallos ni interrupciones.
- Cobertura: 2.665 cursos, 2.661 entradas de previaturas, 397 reglas publicadas y 2.264 consultas sin regla; 29.859 requests registradas. Los catorce snapshots pasan la validación estructural automática.
- Letras Hispánicas 1976 y Tecnicatura en Turismo 1996 publican árboles de composición válidos sin nodos de materia. Se conserva el resultado literal y no se interpreta como currícula vacía.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service FHUM`; artefacto `data/bedelias/reports/fhum-pilot.json`, estado `official-sources-pending`.
- Manifiesto global actualizado sin red: 172 planes `discovered`, 7 `audited`, 61 `structurally-valid` y 10 `extracted`; hash `sha256:6438941f0df5119b2205bc21bedd19509de23985eb37667d7c130e0a851eeb73`.
- Siguiente servicio central de la cola: FIC. Mantener un único proceso secuencial y no integrar ni publicar sin autorización.

### Carril de recolección — FIC completado 2026-08-14

- Comando ejecutado y reanudable: `npm.cmd run bedelias:service -- --service FIC --delay 500`; estado local `data/bedelias/batches/fic-vigentes.json` y checkpoints `data/bedelias/fic-*.json.checkpoint`.
- Estado final: 7/7 `succeeded` en el primer intento, sin fallos ni interrupciones.
- Cobertura: 1.378 cursos, 1.559 entradas de previaturas, 827 reglas publicadas y 732 consultas sin regla; 55.112 requests registradas.
- Archivología, Bibliotecología, Licenciatura en Comunicación y su versión 2019 aparecen vigentes, pero Bedelías no publica su composición. Conservan una advertencia cada una; los otros tres planes no tienen incidencias estructurales.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service FIC`; artefacto `data/bedelias/reports/fic-pilot.json`, estado `extracted`. Ningún plan queda auditado ni habilitado para publicación.
- Manifiesto global actualizado sin red: 165 planes `discovered`, 7 `audited`, 64 `structurally-valid` y 14 `extracted`; hash `sha256:0eee6d37a683edb63cbe46bd25eaa6269fbc753d581ec184d0fdf8d2d3afc8d0`.
- Siguiente servicio central de la cola: FMED. Mantener un único proceso secuencial y no integrar ni publicar sin autorización.

### Carril de recolección — FMED completado 2026-08-14

- Comando ejecutado y reanudable: `npm.cmd run bedelias:service -- --service FMED --delay 500`; estado local `data/bedelias/batches/fmed-vigentes.json` y checkpoints `data/bedelias/fmed-*.json.checkpoint`.
- La primera pasada terminó 31/32. El filtro paginado ignoró una búsqueda y presentó la primera página como si Radioterapia no existiera. La búsqueda exacta ahora reconstruye la oferta y el servicio antes de un único reintento; la prueba real extrajo solamente Radioterapia y la reconciliación omitió los otros 31 snapshots.
- Estado final: 32/32 `succeeded`, sin fallos ni interrupciones.
- Cobertura literal: 2.753 cursos, 2.276 entradas de previaturas, cero reglas publicadas y 2.276 consultas sin regla; 4.060 requests registradas. Doctor en Medicina es el único snapshot cuyo árbol enumera materias.
- Doce tecnicaturas antiguas no publican composición y conservan esa advertencia. Otros diecinueve planes publican árboles válidos sin nodos de materia; ninguno se interpreta como currícula vacía ni se habilita sin auditoría oficial.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service FMED`; artefacto `data/bedelias/reports/fmed-pilot.json`, estado `extracted`.
- Manifiesto global actualizado sin red: 133 planes `discovered`, 7 `audited`, 84 `structurally-valid` y 26 `extracted`; hash `sha256:9641544d5fa9ea6a0fc1a81f9794fb06b8a2d4cb946970404244eb9fa6d62ecb`.
- Siguiente servicio central de la cola: FVET. Mantener un único proceso secuencial y no integrar ni publicar sin autorización.

### Carril de recolección — FVET completado 2026-08-14

- Comando ejecutado y reanudable: `npm.cmd run bedelias:service -- --service FVET --delay 500`; estado local `data/bedelias/batches/fvet-vigentes.json`.
- Estado final: 1/1 `succeeded`, sin fallos ni interrupciones: Doctor en Ciencias Veterinarias 2021.
- Bedelías marca el plan vigente pero no publica su composición. El snapshot conserva la advertencia literal y no inventa materias ni previaturas.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service FVET`; artefacto `data/bedelias/reports/fvet-pilot.json`, estado `extracted`.
- Manifiesto global actualizado sin red: 132 planes `discovered`, 7 `audited`, 84 `structurally-valid` y 27 `extracted`; hash `sha256:470b26a42dd632a3f99a888cf405d5c15d12c9a34d577fc5005a8ab6c59b09cb`.
- Siguiente servicio central de la cola: ODON. El monitor debe cerrar cada servicio exitoso y continuar automáticamente, además de diagnosticar y reintentar fallos.

### Carril de recolección — ODON completado 2026-08-14

- Comando ejecutado y reanudable: `npm.cmd run bedelias:service -- --service ODON --delay 500`; estado local `data/bedelias/batches/odon-vigentes.json` y checkpoints `data/bedelias/odon-*.json.checkpoint`.
- Estado final: 7/7 `succeeded` en el primer intento, sin fallos ni interrupciones.
- Cobertura: 332 cursos, 323 entradas de previaturas, 112 reglas publicadas y 211 consultas sin regla; 8.632 requests registradas.
- Odontología 2011 es el único plan con materias publicadas. Los seis planes de asistentes, higienistas y laboratoristas no publican composición y conservan una advertencia cada uno.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service ODON`; artefacto `data/bedelias/reports/odon-pilot.json`, estado `extracted`.
- Manifiesto global actualizado sin red: 125 planes `discovered`, 7 `audited`, 85 `structurally-valid` y 33 `extracted`; hash `sha256:7e32b1db349a1b1fd622fcecb16e01793446a9374bee1dd324451c576248a3bb`.
- Siguiente servicio central de la cola: PSICO. Mantener el cierre y encadenamiento automáticos sin integrar ni publicar.

### Carril de recolección — PSICO completado 2026-08-14

- Comando ejecutado y reanudable: `npm.cmd run bedelias:service -- --service PSICO --delay 500`; estado local `data/bedelias/batches/psico-vigentes.json` y checkpoint de la licenciatura.
- Estado final: 2/2 `succeeded` en el primer intento, sin fallos ni interrupciones.
- Cobertura: 2.946 cursos y 2.647 consultas sin regla publicada; 280 requests registradas. Bedelías no publicó ninguna regla de previatura para esas consultas.
- Licenciatura en Psicología 2013 pasa la validación estructural. Psicología Infantil 1960 no publica composición y conserva una advertencia.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service PSICO`; artefacto `data/bedelias/reports/psico-pilot.json`, estado `extracted`.
- Manifiesto global actualizado sin red: 123 planes `discovered`, 7 `audited`, 86 `structurally-valid` y 34 `extracted`; hash `sha256:fbf47717de4554ca56371165383fd406f6289b6c70d21349667abf0e31374397`.
- Siguiente servicio: ENUT. Mantener cierre y encadenamiento automáticos sin integrar ni publicar.

### Carril de recolección — ENUT completado 2026-08-14

- Comando ejecutado y reanudable: `npm.cmd run bedelias:service -- --service ENUT --delay 500`; estado local `data/bedelias/batches/enut-vigentes.json`.
- Estado final: 1/1 `succeeded`, sin fallos ni interrupciones: Licenciatura en Nutrición 2014.
- Bedelías marca el plan vigente pero no publica su composición. El snapshot conserva esa advertencia, sin materias ni previaturas inventadas.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service ENUT`; artefacto `data/bedelias/reports/enut-pilot.json`, estado `extracted`.
- Manifiesto global actualizado sin red: 122 planes `discovered`, 7 `audited`, 86 `structurally-valid` y 35 `extracted`; hash `sha256:8be0d0ee042a2af6aadd885e950cfe260848dbfacc43ba7dd364db624d5d9540`.
- Siguiente servicio: ISEF. Mantener cierre y encadenamiento automáticos sin integrar ni publicar.

### Carril de recolección — ISEF completado 2026-08-14

- Comando ejecutado y reanudable: `npm.cmd run bedelias:service -- --service ISEF --delay 500`; estado local `data/bedelias/batches/isef-vigentes.json` y checkpoints `data/bedelias/isef-*.json.checkpoint`.
- Estado final: 3/3 `succeeded` en el primer intento, sin fallos ni interrupciones: Licenciatura en Educación Física 2017, Tecnicatura en Deportes 2007 y Tecnicatura en Guardavidas 2025.
- Cobertura: 2.071 cursos, 1.840 entradas de previaturas, 166 reglas publicadas y 1.674 consultas sin regla; 12.963 requests registradas. Los tres snapshots pasan la validación estructural.
- Reporte reproducible: `npm.cmd run bedelias:report -- --service ISEF`; artefacto `data/bedelias/reports/isef-pilot.json`, estado `official-sources-pending`.
- Manifiesto global actualizado sin red: 119 planes `discovered`, 7 `audited`, 89 `structurally-valid` y 35 `extracted`; hash `sha256:5bfddba51583519d0af589018356d6719cca6d358eefe4fd453b24beb9d32fcd`.
- Siguiente paso: no iniciar servicios regionales hasta modelar planes canónicos y ofertas/sedes, evitando extraer como independientes las coincidencias regionales.

### Servicios regionales — modelo canónico y cola deduplicada 2026-08-14

- Decisión de datos: una carrera y año identifican un plan canónico; cada servicio regional se conserva como una oferta de ese plan. La sede no se representa como perfil o trayectoria.
- Decisión de interfaz futura: si las ofertas tienen la misma currícula, la sede es sólo metadata y comparte progreso. Sólo una diferencia curricular verificada habilita un selector separado `Sede`; si también existen perfiles o trayectorias, ambos selectores permanecen como dimensiones distintas.
- Análisis local reproducible: `node scripts/bedelias-regional-offerings.mjs`; artefacto `data/bedelias/inventory/regional-offerings.json`.
- Hash reproducible del contenido: `sha256:a0b5c051352e1696027bc997e1e844abf01ba6387b3465f76c79e2380794845b`.
- Criterio conservador: nombre de carrera normalizado + año de plan. La coincidencia exacta con un servicio central queda como candidata y no se declara equivalencia curricular hasta comparar contenido.
- Resultado: 92 ofertas regionales forman 73 identidades; 57 ofertas (43 identidades) coinciden con un plan central y 35 ofertas forman 30 identidades exclusivamente regionales. Hay 14 identidades repetidas entre regionales, que reúnen 33 ofertas.
- Cola reducida: 30 extracciones representativas — CENURSO 2, CUCEL 2, CUR 5, CURE 6, CUT 5 y CENURLN 10 — en ese orden. Las otras 62 ofertas no se extraen de nuevo durante este hito.
- Reanudación: regenerar el manifiesto no usa red ni modifica snapshots; después reanudar únicamente los objetivos listados en `extractionTargets`.
- Siguiente paso: extraer las dos representantes de CENURSO mediante un único proceso secuencial a 500 ms, conservar checkpoints y comparar contenido antes de consolidar ofertas centrales/regionales.

### CENURSO — representantes regionales completadas 2026-08-14

- Se extrajeron únicamente las dos identidades regionales nuevas de la cola canónica: Tecnicatura Universitaria en Bienes Culturales 2021 y Tecnólogo en Administración y Contabilidad 2012. Ingeniería en Computación y Enfermería no se repitieron.
- Cobertura: 20 cursos, 3 consultas de previaturas sin regla publicada y 348 requests a 500 ms. Bienes Culturales quedó `structurally-valid`; Administración y Contabilidad quedó `extracted` porque Bedelías no publica su composición, anomalía conservada sin inventar materias.
- Reporte filtrado reproducible: `node scripts/bedelias-service-report.mjs --service CENURSO --careers "TECNICATURA UNIVERSITARIA EN BIENES CULTURALES|TECNÓLOGO EN ADMINISTRACIÓN Y CONTABILIDAD" --output data/bedelias/reports/cenurso-regional.json`.
- Manifiesto global actualizado sin red: 117 `discovered`, 90 `structurally-valid`, 36 `extracted` y 7 `audited`; hash `sha256:8e55b065e798cf9ec3814dfd87615f46ab7476d08cd267806391d7b41456c427`.
- Manifiesto regional: hash `sha256:ecafd3079192cbd773b960105d166e61f1cb827fb04f510812064bf8a566c32f`.
- Siguiente paso: extraer únicamente Tecnólogo en Producción Equina 2022 y Tecnólogo en Sistemas Integrados de Producción Agropecuaria 2022 de CUCEL.

### CUCEL — representantes regionales completadas 2026-08-14

- Se extrajeron únicamente Tecnólogo en Producción Equina 2022 y Tecnólogo en Sistemas Integrados de Producción Agropecuaria 2022. La tercera oferta del servicio, ya coincidente con una identidad central, no se repitió.
- Cobertura: 82 cursos, 72 consultas de previaturas sin regla publicada, 288 requests a 500 ms y cero incidencias estructurales. Ambos planes quedaron `structurally-valid`.
- Reporte filtrado: `data/bedelias/reports/cucel-regional.json`; estado `official-sources-pending`.
- Manifiesto global actualizado sin red: 115 `discovered`, 92 `structurally-valid`, 36 `extracted` y 7 `audited`; hash `sha256:409f085f87bedb98f6b4f29a666dcc5274129e5e464b28adec959fd2d24245d0`.
- Manifiesto regional: hash `sha256:521a6de4d8863f47864be1ca45e1f46ebd07df66aafdc164d2e6c2cd323b1715`.
- Siguiente paso: extraer las cinco identidades nuevas de CUR listadas en `regional-offerings.json`, sin repetir sus cinco coincidencias centrales.

### CUR — representantes regionales completadas 2026-08-14

- Se extrajeron las cinco identidades exclusivamente regionales: Educación Física 2014, Recursos Naturales 2010, Artes Plásticas y Visuales 2017, Gestión de Recursos Naturales 2011 y Tecnólogo en Madera 2012. Las otras cinco ofertas con identidad central no se repitieron.
- Cobertura: 922 cursos, 836 entradas de previaturas, 227 reglas publicadas, 609 consultas sin regla y 16.132 requests a 500 ms. Los cinco snapshots quedaron `structurally-valid`, sin incidencias.
- Reporte filtrado: `data/bedelias/reports/cur-regional.json`; estado `official-sources-pending`.
- Manifiesto global actualizado sin red: 110 `discovered`, 97 `structurally-valid`, 36 `extracted` y 7 `audited`; hash `sha256:cfe49339844241b9cad8c5429be335fea4e5934b5a830c792cd893f5e3bedb62`.
- Manifiesto regional: hash `sha256:e95b31b98f21c30464c531c2b0f67a013d08c006f88f3bec045a636bad1b08d5`.
- Siguiente paso: extraer las seis identidades nuevas de CURE, sin repetir sus ocho coincidencias centrales.

### CURE — representantes regionales completadas 2026-08-14

- Se extrajeron las seis identidades exclusivamente regionales: Diseño de Paisaje 2008, Gestión Ambiental 2011, Lenguajes y Medios Audiovisuales 2011, Turismo 2014, Artes Plásticas y Visuales 2013 y Tecnólogo Minero 2013. Las ocho coincidencias centrales no se repitieron.
- Cobertura: 727 cursos, 711 entradas de previaturas, 212 reglas publicadas, 499 consultas sin regla y 15.285 requests a 500 ms. Cuatro snapshots quedaron `structurally-valid`; Gestión Ambiental y Lenguajes y Medios Audiovisuales quedaron `extracted` porque Bedelías no publica sus composiciones.
- Reporte filtrado: `data/bedelias/reports/cure-regional.json`; estado `extracted`, con las dos anomalías institucionales conservadas.
- Manifiesto global actualizado sin red: 104 `discovered`, 101 `structurally-valid`, 38 `extracted` y 7 `audited`; hash `sha256:5f93b3b49db12866dfef573bf055349268f4907e4b5b088b0cb2fe40228dea45`.
- Manifiesto regional: hash `sha256:cfa68efe4143c766b88156272e0f813e4dff175c7c10684946eed2ffe8b36bf1`.
- Siguiente paso: extraer las cinco identidades nuevas de CUT, sin repetir sus tres coincidencias centrales.

### CUT — representantes regionales completadas 2026-08-14

- Se extrajeron las cinco identidades exclusivamente regionales: Ingeniería Forestal 2013, Economía Agrícola y Agronegocios 2022, Desarrollo Regional Sustentable 2013, Técnico Operador de Alimentos 2011 y Tecnólogo Cárnico 2010. Las tres coincidencias centrales no se repitieron.
- Cobertura: 42 cursos, 46 entradas de previaturas, 22 reglas publicadas, 24 consultas sin regla y 2.130 requests a 500 ms. Economía Agrícola quedó `structurally-valid`; los otros cuatro planes quedaron `extracted` porque Bedelías no publica sus composiciones.
- Reporte filtrado: `data/bedelias/reports/cut-regional.json`; estado `extracted`, con cuatro anomalías institucionales conservadas.
- Manifiesto global actualizado sin red: 99 `discovered`, 102 `structurally-valid`, 42 `extracted` y 7 `audited`; hash `sha256:402c83d5cad607ccbb10ce28d32055b5bf39c1871cbae89769fadd2588ebb177`.
- Manifiesto regional: hash `sha256:f1f4503ee668264915cae249fa2237ef08f0612450c1ccc62eac5e46a692c4f7`.
- Siguiente paso: extraer las diez identidades nuevas de CENURLN, sin repetir sus 43 ofertas con identidad central o ya representada regionalmente.

### CENURLN y cola regional deduplicada — extracción completada 2026-08-14

- Se extrajeron las diez identidades exclusivamente regionales de CENURLN. Las otras 43 ofertas del servicio, ya representadas por una identidad central o regional, no se repitieron.
- Cobertura CENURLN: 499 cursos, 194 entradas de previaturas, 127 reglas publicadas, 67 consultas sin regla y 9.717 requests a 500 ms. Ocho snapshots quedaron `structurally-valid`; Ciencias Hídricas Aplicadas y Diseño Integrado quedaron `extracted` porque Bedelías no publica sus composiciones.
- Reporte filtrado: `data/bedelias/reports/cenurln-regional.json`; estado `extracted`, con dos anomalías institucionales conservadas.
- Cola regional completa: 30/30 representantes terminales; 21 `structurally-valid` y 9 `extracted`. Las 92 ofertas y sus 73 identidades siguen conservadas en el manifiesto.
- Manifiesto global actualizado sin red: 89 `discovered`, 110 `structurally-valid`, 44 `extracted` y 7 `audited`; hash `sha256:59bf04e46531aa982160ae535b501b7af9665bebdfacb9270c59997751a9835a`.
- Manifiesto regional: hash `sha256:5e07b558c9d119d3cdc493a7190143066d4c4b307725059e806c7d4484505357`.
- Siguiente paso: comparar localmente el contenido disponible de las 43 identidades con coincidencia central antes de marcar equivalencias o variantes por sede.

### Comparación de ofertas regionales coincidentes — diagnóstico local 2026-08-14

- Comando reproducible y sin red: `node scripts/bedelias-regional-content-comparison.mjs`; artefacto `data/bedelias/inventory/regional-content-comparison.json`.
- La huella curricular compara metadatos académicos, títulos, materias, créditos, recorridos de composición y previaturas, excluyendo procedencia y fechas. Una coincidencia de huella sigue siendo candidata y no equivalencia oficial automática.
- Resultado: 43 identidades y 57 ofertas regionales candidatas, pero 0 pares comparables porque los 57 snapshots regionales coincidentes se omitieron deliberadamente para no repetir currículas; en 12 pares tampoco existe todavía un snapshot central crudo.
- No se afirmó ninguna equivalencia ni diferencia y no se habilitó ningún selector de sede. Las 43 identidades permanecen `pending-snapshots` y el manifiesto conserva el criterio conservador.
- Hash del diagnóstico: `sha256:03946772bb7259a3d87b8806f0d589c086b44557ae994bffd4e42e65974b54db`.
- Próxima decisión: mantener la deduplicación por identidad como candidata, o autorizar una extracción comparativa acotada de ofertas coincidentes antes de modelar variantes curriculares por sede.

### Comparación CENURSO — completada 2026-08-14

- Se extrajeron las dos ofertas coincidentes de CENURSO mediante `cenurso-comparison.json`, sin sobrescribir el batch ni los snapshots de sus representantes regionales nuevos.
- Recuperación aplicada: la tabla de planes de Enfermería 1999 llegó vacía en el primer intento. El scraper ahora reabre servicio y carrera una vez antes de declarar ausente un plan; la reanudación omitió Computación ya completa y recuperó únicamente Enfermería.
- Normalización genérica corregida: las materias externas con código numérico (`FING - 1886 - …`) ya conservan servicio, código y nombre separados. El snapshot se renormalizó localmente, sin requests adicionales.
- Resultado curricular: Ingeniería en Computación 2025 publica los mismos 38 cursos y créditos que FING. La diferencia está en cobertura de previaturas (3 entradas regionales contra 50 centrales), por lo que no se modela como variante curricular de sede.
- Enfermería 1999 publica cero cursos en ambas ofertas; la huella coincide pero se clasifica `insufficient-content`, no equivalencia.
- Diagnóstico acumulado: 2/57 ofertas disponibles, 1 comparación curricular determinable, 1 insuficiente y 55 snapshots regionales pendientes; todavía no hay diferencias curriculares verificadas. Hash `sha256:a60f259ca411581e80c7f07d79c01bb08f2761b7c2c1e4e5039123ec278794c2`.
- Siguiente paso: comparar Tecnólogo Intérprete y Traductor LSU–Español–LSU 2025 de CUCEL y continuar automáticamente por CUR, CURE, CUT y CENURLN.

### Comparación CUCEL — completada 2026-08-14

- Se extrajo Tecnólogo Intérprete y Traductor LSU–Español–LSU 2025 como única oferta coincidente de CUCEL: 199 cursos, 2 consultas sin regla, 159 requests y cero incidencias.
- La normalización de referencias externas se amplió a códigos alfabéticos (`FHUM - ATP - …`) usando el catálogo real de servicios; también se aplica al calcular huellas de snapshots centrales históricos, sin reescribirlos.
- Resultado: CUCEL y la oferta central contienen los mismos 199 cursos, códigos, créditos y estructura. Sólo difiere la cobertura de previaturas publicada (2 frente a 195), por lo que no se crea una variante curricular de sede.
- Diagnóstico acumulado: 3/57 ofertas disponibles, 2 currículas comparables y coincidentes, 1 caso con información insuficiente, 54 snapshots pendientes y cero diferencias curriculares verificadas. Hash `sha256:77698c38e06a1390e4d4fda3cdc33ec227f163eba71776b1d9f7271f5aa49a07`.
- Siguiente paso: comparar las cinco ofertas coincidentes de CUR y continuar sin pausa.

### Comparación CUR — completada 2026-08-14

- Se extrajeron las cinco ofertas coincidentes de CUR mediante `cur-comparison.json`, sin sobrescribir el lote ni los snapshots de las cinco identidades regionales representativas.
- Cobertura: 1.139 cursos, 61 entradas de previaturas, 4 reglas publicadas, 57 consultas sin regla y 1.013 requests a 500 ms. Asistente e Higienista en Odontología conservaron la anomalía institucional `composition-unavailable`.
- Asistente en Odontología 2017, Escalonada de Enfermería 2001 e Higienista en Odontología 2017 tienen composición vacía en al menos una oferta; permanecen `insufficient-content` y no se declaran equivalentes.
- Licenciatura en Enfermería 2016 y Tecnicatura en Deportes 2007 presentan diferencias de catálogo verificables en Bedelías. Son candidatas a variante por sede, pendientes de auditoría oficial para distinguir núcleo curricular de la oferta ampliada de electivas.
- Diagnóstico acumulado: 8/57 ofertas disponibles, 4 pares comparables, 2 coincidencias curriculares con distinta cobertura de previaturas, 2 diferencias curriculares, 4 casos insuficientes y 49 snapshots regionales pendientes. Hash `sha256:b013ea7d675ee9d3376ac9927755aafde6039cb04a084c1bc2227f91e09be5e7`.
- Siguiente paso: comparar las siete ofertas coincidentes de CURE y continuar automáticamente por CUT y CENURLN.

### Comparación CURE — completada 2026-08-14

- Se extrajeron las siete ofertas coincidentes seleccionadas de CURE mediante `cure-comparison.json`; el lote de representantes regionales permaneció intacto. Los siete snapshots quedaron `structurally-valid`.
- Cobertura: 2.659 cursos, 233 entradas de previaturas, 40 reglas publicadas, 193 consultas sin regla y 3.883 requests a 500 ms, sin incidencias estructurales.
- Educación Física 2017, Licenciatura en Enfermería 2016 y Tecnicatura en Deportes 2007 presentan diferencias de catálogo verificables en Bedelías; quedan como candidatas a variante por sede hasta separar oferta ampliada de electivas y núcleo curricular mediante auditoría oficial.
- Escalonada de Enfermería 2001 y Hemoterapia 2006 permanecen `insufficient-content` por composiciones vacías. Tecnólogo en Informática 2007 y Telecomunicaciones 2009 no son comparables porque aún falta el snapshot crudo de la oferta central; no se infiere equivalencia.
- Diagnóstico acumulado: 15/57 snapshots regionales disponibles, 13 pares con ambos snapshots, 7 comparables, 2 coincidencias curriculares con distinta cobertura de previaturas, 5 diferencias curriculares, 6 casos insuficientes y 42 snapshots regionales pendientes. Hash `sha256:aa5979d5a3b64aff42a6c46990af81ee8296ac8adca5e95d4e29bdf6d616c9bc`.
- Siguiente paso: comparar la única oferta coincidente de CUT y continuar automáticamente con las 41 de CENURLN.

### Comparación CUT — completada 2026-08-14

- Se extrajo Interpretación LSU–Español–LSU 2014 como única identidad coincidente propia de CUT mediante `cut-comparison.json`: 199 cursos, una consulta sin regla, 159 requests a 500 ms y cero incidencias.
- La oferta publica la misma currícula, códigos y créditos que la central. Sólo difiere la cobertura de previaturas (una entrada regional frente a 202 centrales), por lo que no se crea una variante curricular de sede.
- Diagnóstico acumulado: 16/57 snapshots regionales disponibles, 14 pares con ambos snapshots, 8 comparables, 3 coincidencias curriculares con distinta cobertura de previaturas, 5 diferencias curriculares, 6 casos insuficientes y 41 snapshots regionales pendientes. Hash `sha256:626db1c68095947cea9faacbdf512e32616a93ac3992f8fa09bb97f315a9badb`.
- Siguiente paso: comparar las 41 ofertas coincidentes de CENURLN con un único proceso secuencial y reanudable.

### Comparación regional completa — CENURLN y cierre 2026-08-14

- Se extrajeron las 41 ofertas coincidentes de CENURLN mediante `cenurln-comparison.json`, completando 57/57 snapshots regionales comparativos sin repetir los 30 representantes de identidades exclusivamente regionales.
- Cobertura CENURLN: 14.796 cursos, 739 entradas de previaturas, 149 reglas publicadas, 590 consultas sin regla y 15.686 requests a 500 ms. Quedaron 33 snapshots `structurally-valid` y 8 `extracted` por `composition-unavailable`.
- Comparación global: 45 pares tienen ambos snapshots y 21 son curricularmente comparables. Cinco ofertas comparten currícula con la central pero difieren en cobertura de previaturas; 16 presentan diferencias de catálogo; 24 son insuficientes por composición vacía. No falta ningún snapshot regional.
- Quedan 12 comparaciones sin snapshot central crudo y 30 identidades pendientes de conclusión por fuente ausente o información insuficiente. Ninguna coincidencia se convirtió automáticamente en equivalencia oficial y las diferencias sólo habilitan auditoría de posible variante por sede.
- Artefacto reproducible: `node scripts/bedelias-regional-content-comparison.mjs`; salida `data/bedelias/inventory/regional-content-comparison.json`, hash `sha256:70442f3463961bfe43bbd45fdee7197e24cdc917869192bbd0636b6aab86e7d8`.
- Siguiente paso: completar los snapshots centrales crudos faltantes de FING y FQ, volver a comparar sin red y después dirigir la auditoría oficial sólo a diferencias e información insuficiente.

### Comparación regional — centrales faltantes de FING completadas 2026-08-14

- Se extrajeron seis snapshots centrales crudos mediante `fing-canonical-missing.json`: Ingeniería de Alimentos 2003, Ingeniería Química 2021, Ingeniería Biológica 2013 y los tecnólogos en Informática 2007, Telecomunicaciones 2009 e Industrial Mecánico 2016.
- Cobertura: 902 cursos, 595 entradas de previaturas, 444 reglas publicadas, 151 consultas sin regla y 30.178 requests a 500 ms. Ingeniería Biológica quedó `extracted` por `composition-unavailable`; los otros cinco planes quedaron `structurally-valid`.
- Se resolvieron siete comparaciones regionales: seis comparten currícula y difieren sólo en cobertura de previaturas; Ingeniería Biológica permanece `insufficient-content`. No aparecieron nuevas diferencias curriculares.
- Diagnóstico acumulado: 52/57 pares tienen ambos snapshots, 27 son comparables, 11 coinciden curricularmente con distinta cobertura de previaturas, 16 presentan diferencias y 25 son insuficientes. Faltan cinco snapshots centrales de FQ. Hash `sha256:749eded532528f09fb614c6586116d7e3bbe62c3b046051e3f3ee5d7a71e6a04`.
- Siguiente paso: extraer los cinco snapshots centrales faltantes de FQ mediante un único proceso secuencial y reanudable.

### Comparación regional — centrales faltantes de FQ completadas 2026-08-14

- Se extrajeron Bioquímico Clínico 2015, Licenciatura en Química 2016, Químico 2015, Técnico Bachiller en Ciencias Químicas 2015 y Tecnólogo Químico 2025 mediante `fq-canonical-missing.json`. Los primeros cuatro se completaron en el primer intento; Tecnólogo Químico se reanudó solo tras un fallo transitorio DNS y terminó en el segundo.
- Cobertura: 1.972 cursos, 1.832 entradas de previaturas, 1.132 reglas publicadas, 700 consultas sin regla y 77.280 requests a 500 ms. Tecnólogo Químico quedó `extracted` por `composition-unavailable`; los otros cuatro quedaron `structurally-valid`.
- La normalización genérica ahora conserva guiones internos en códigos externos como `FQ - REV-B - …`. Se renormalizaron localmente tres snapshots de CENURLN, eliminando dos falsas diferencias sin nuevas requests.
- Diagnóstico global cerrado: 57/57 pares tienen ambos snapshots; 31 son comparables, con 15 coincidencias curriculares que sólo difieren en cobertura de previaturas y 16 diferencias de catálogo. Los 26 pares restantes son `insufficient-content`; no quedan snapshots faltantes. Hash `sha256:85594402f1e09be2ef150dfd527e85d87e72da39ba61608b87d30a1cdb180bf2`.
- Siguiente paso: extraer los diez planes centrales restantes de FING y los seis restantes de FQ; después iniciar la auditoría oficial dirigida por las 16 diferencias y las composiciones insuficientes.

### FING — extracción central restante completada 2026-08-15

- Se extrajeron los diez planes vigentes de FING que aún no tenían snapshot crudo, mediante `fing-remaining.json`, sin repetir los tres planes auditados ni los seis usados para cerrar comparaciones regionales.
- Cobertura: 1.967 cursos, 1.928 entradas de previaturas, 1.334 reglas publicadas, 594 consultas sin regla y 89.474 requests a 500 ms. Los diez planes quedaron `structurally-valid`, sin incidencias.
- El inventario global ahora combina de forma determinista todos los lotes separados por servicio y prioriza snapshots `succeeded` existentes sobre fallos posteriores. Así conserva representantes, comparaciones y extracciones centrales sin sobrescribir checkpoints.
- Manifiesto actualizado sin red: 176 planes `structurally-valid`, 56 `extracted`, 7 `audited` y 11 `discovered`; FING quedó 19/19 terminal. Los 11 restantes son seis planes centrales de FQ y cinco ofertas regionales duplicadas ya representadas canónicamente. Hash `sha256:04d81ee5c2ed3eeca0476a94d33edc6b25cf98152d43d3153a40b74e1c7f3c9a`.
- Siguiente paso: extraer los seis planes centrales restantes de FQ y comprobar que ningún servicio central conserve planes `discovered`.

### FQ y recolección central — completadas 2026-08-15

- Se extrajeron los seis planes vigentes de FQ que aún no tenían snapshot: Bachiller en Ciencias Químicas 2000, Ingeniería de Alimentos 2003, Ingeniería Química 2021, Licenciatura en Biotecnología 2024, Licenciatura en Tecnologías de la Química 2022 y Tecnólogo Agroenergético 2008.
- Cobertura: 1.457 cursos, 1.203 entradas de previaturas, 835 reglas publicadas, 368 consultas sin regla y 57.032 requests a 500 ms. Los seis snapshots quedaron `structurally-valid`, sin incidencias.
- Recolección central completa: ningún servicio no regional conserva planes `discovered`. FQ quedó con 10 planes `structurally-valid`, uno `extracted` y Química Farmacéutica `audited`.
- Manifiesto global sin red: 182 planes `structurally-valid`, 56 `extracted`, 7 `audited` y 5 `discovered`; hash `sha256:ab4c238d3fb309cccbc5e31c0a54fc2333dd6d4d1938af944d13a4781d4d0153`. Los cinco `discovered` son ofertas regionales duplicadas de tres identidades ya representadas, no carreras centrales faltantes.
- Siguiente paso: generar una cola reproducible de auditoría oficial que priorice las 16 diferencias curriculares regionales, los 26 pares con composición insuficiente y luego los planes canónicos restantes.

### Cola canónica de auditoría oficial — preparada 2026-08-15

- Se generó sin red `data/bedelias/inventory/audit-queue.json` mediante `node scripts/bedelias-audit-queue.mjs`, combinando el inventario global y los diagnósticos regionales sin duplicar una carrera por servicio o sede.
- El universo canónico contiene 184 identidades: 7 ya auditadas y 177 pendientes. La cola prioriza 9 identidades con diferencias regionales de contenido, luego 21 con información regional insuficiente, 38 cuya composición no está publicada en Bedelías y 109 pendientes ordinarias de fuentes oficiales.
- Las 9 y 21 identidades prioritarias representan respectivamente las 16 comparaciones `content-difference-detected` y los 26 pares `insufficient-content`; varias ofertas o servicios pueden corresponder a una misma identidad canónica.
- Cuatro planes compartidos entre servicios centrales se conservan como una identidad con todas sus ofertas de origen: Biotecnología 2024, Ciencias de la Atmósfera 2007, Ingeniería de Alimentos 2003 e Ingeniería Química 2021.
- Las diferencias extraídas no se interpretan todavía como variantes curriculares: la auditoría debe separar núcleo obligatorio, electivas disponibles y particularidades de sede usando planes, resoluciones y páginas oficiales.
- La cola se reconstruye de forma determinista conservando `generatedAt`; hash `sha256:bb14ece325a3cf5ff7292b9f093a56ef59ea11f9be7e6df053b081650d002aea`.
- Siguiente paso: auditar por fuentes oficiales el primer bloque de 9 identidades con diferencias regionales y registrar evidencia antes de normalizar o integrar nuevas carreras.

### Ingeniería Agronómica 2020 — excepción regional auditada 2026-08-15

- El [Plan 2020 de Facultad de Agronomía](https://portal.fagro.edu.uy/wp-content/uploads/2025/07/PE2020-Ingeniero-Agronomo-Fagro-Udelar.pdf) confirma un único título `Ingeniero Agrónomo`, cinco años y 450 créditos, aprobado por Facultad el 21/10/2019 y por el CDC el 05/11/2019.
- Estructura oficial: Ciclo Básico General 90 créditos (80 obligatorios, AFO 6, flexibles 4); Ciclo Básico Agronómico 180 (135 obligatorios, AFO 18, flexibles 27); Ciclo de Análisis y Consolidación 180 (AFO 27–63, flexibles 72–108 y TFG 45).
- La comparación local muestra 526 materias en FAGRO y 717 en CENURLN. Las 191 exclusivas del snapshot regional están todas bajo ramas optativas/electivas; no falta ninguna materia canónica ni cambia ningún crédito compartido. La cobertura de previaturas regional es menor (9 frente a 387), pero eso es una diferencia de publicación.
- Los catálogos oficiales de Udelar conservan una sola carrera y la ofrecen también en Salto/Paysandú. La [ficha central](https://udelar.edu.uy/carrera/ingeniero-agronomo) identifica Agrícola-ganadera como opción en Salto y la [página vigente de FAGRO](https://portal.fagro.edu.uy/ensenanza/unidad-de-ensenanza/ingenieria-agronomica/cuarto-ano/) define trayectorias por sistema de producción, optativas y electivas.
- Decisión de normalización: una identidad canónica con ofertas/sedes; no crear una malla regional separada. Agrícola-ganadera puede presentarse como trayectoria asociada a la oferta de Salto cuando se implemente el selector de sede.
- Evidencia durable: `data/bedelias/audits/official-source-audits.json`, hash `sha256:918fbdf2e400113d722a627a8b6b3c66bf3f0f8776a77dcacaed8bf0a05063eb`. La auditoría de excepción no habilita publicación ni sustituye la futura proyección curada de materias.
- Cola actualizada sin red: 176 identidades pendientes; quedan 8 con diferencias regionales. Hash `sha256:3f975092eaf8f70345e922f8ca68414f5349b4d4dcfa9360a2e5ef46a98de4b2`.
- Siguiente paso: auditar Licenciatura en Biotecnología 2024, compartida por FCIEN/FQ y ofrecida también en CENURLN.

### Licenciatura en Biotecnología 2024 — plan compartido auditado 2026-08-15

- El [Plan 2024 institucional](https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/42761) confirma una única carrera compartida, con Facultad de Ciencias como servicio de referencia y participación de FCIEN, FING, FQ, FADU, FAGRO, FVET y CENURLN.
- Título `Licenciado en Biotecnología`, cuatro años y 360 créditos. El tramo común exige 232: Biología 80, Química 50, Física 12, Matemática 30, Procesos 35 y Desarrollo profesional 25. El tramo de orientación exige 80: Profundización 40 y Actividades integradoras 40, incluyendo formación social/productiva 10 y TFG 30. Los 48 créditos restantes son flexibles.
- Las orientaciones Molecular, Industrial, Agropecuaria, Empresarial y Biomateriales son ejemplos sugeridos; el [plan](https://eva.fcien.udelar.edu.uy/pluginfile.php/177982/mod_forum/attachment/81185/Plan%20de%20Estudio%20Licenciatura%20Biotecnolog%C3%ADa.pdf) permite trayectorias personalizadas acordadas con la Comisión de Carrera. No son títulos ni variantes por sede.
- Se corrigió el comparador de carreras compartidas: ahora contrasta cada oferta regional con todos los snapshots centrales disponibles y conserva la mejor correspondencia antes de declarar diferencias. CENURLN y FQ coinciden exactamente en sus 246 materias y créditos; sólo difieren en previaturas (33 frente a 110). FCIEN publica un subconjunto de 127 alternativas del mismo plan.
- Decisión de normalización: una identidad con gobernanza compartida y ofertas en Montevideo, Salto y Paysandú; catálogos por servicio como alternativas para cumplir mínimos de área, no carreras duplicadas ni mallas territoriales distintas.
- Registro de auditoría: hash `sha256:cdc9711b23ad986e1723355581be27ae060da4059f0e598ea45ebab2abe1f530`. Comparación regional corregida: 16 coincidencias curriculares con distinta cobertura de previaturas, 15 diferencias y 26 casos insuficientes; hash `sha256:beb9d1e3d3b4b6a21708c2d69518d2150cea207e49c85b0cee5097fe901e4550`.
- Cola actualizada: 175 identidades pendientes, siete con diferencias regionales; hash `sha256:060ce3c7191d370dd42dc355e519ddc9111f8aa426f33f6aced0fe9537f50591`.
- Siguiente paso: auditar Abogacía 2016 entre FDER y CENURLN.

### Abogacía 2016 — oferta regional auditada 2026-08-15

- El [Plan 2016 de Facultad de Derecho](https://www.fder.edu.uy/node/529), aprobado por Facultad en 2015/2016 y por el CDC el 19/07/2016, define un único título `Abogado`, cinco años y 450 créditos. La [CSE](https://www.cse.udelar.edu.uy/proyecto-financiado/evaluacion-de-la-implementacion-y-propuesta-de-ajustes-a-los-planes-de-estudio-de-abogacia-y-notariado-2016/) confirma que el mismo plan comenzó a ejecutarse en 2017 tanto en Montevideo como en CENUR Litoral Norte.
- La [grilla vigente](https://www.fder.edu.uy/sites/default/files/2024-05/grilla-abogac%C3%ADa-actualizada-20240527.pdf) exige mínimos de 66 créditos socio-jurídicos/teórico-metodológicos, 114 de Derecho público, 90 de Derecho privado, 54 de Derecho social específico, 78 de práctica profesional y 48 optativos/electivos. Conserva además el título intermedio `Procurador` con 160 créditos.
- Los snapshots de FDER y CENURLN contienen el mismo núcleo de 85 unidades. Las 53 materias que el comparador normalizado encuentra sólo en Salto están íntegramente bajo `OPC - BOLSA DE OPCIONALES - min: 48 créditos`; la única diferencia de créditos compartida (`3206B`, Garantías Particulares) también es opcional. La menor cobertura regional de previaturas (40 frente a 468) es una diferencia de publicación.
- Decisión de normalización: una identidad canónica con ofertas en Montevideo y Salto. Las materias adicionales regionales amplían el catálogo flexible; no constituyen una malla, título ni trayectoria territorial distinta.
- Registro de auditoría: hash `sha256:faaf27ea6a74861282fea299296d3a1b843271c575f3fc1df0d928f20e70a682`. Cola actualizada: 174 identidades pendientes y seis diferencias regionales prioritarias; hash `sha256:496e9a7bd7414ea75ce72ebfe430155d3fea363e35c5f89d289bea1dd256f697`.
- La auditoría no habilita publicación ni sustituye la futura selección curada de unidades y reglas para la UI.
- Siguiente paso: auditar Notariado 2016 entre FDER y CENURLN.

### Integración funcional del inventario extraído en la UI — completada 2026-08-15

- Se proyectaron de forma determinista las 177 identidades canónicas vigentes todavía ausentes del catálogo curado. Junto con los siete planes vigentes ya integrados, la UI permite seleccionar las 184 identidades del inventario; Ingeniería en Computación 1997 se conserva como plan histórico adicional.
- Las proyecciones se cargan bajo demanda por plan. Noventa y tres tienen composición utilizable y 84 muestran un estado explícito de composición no publicada, sin fabricar períodos, créditos mínimos ni materias.
- Ninguna proyección masiva se declara auditada o publicable: conservan `publicationEligible: false`, la procedencia del snapshot y un estado visible de auditoría pendiente.
- El selector `Sede` sólo aparece cuando existe evidencia oficial registrada y más de una opción. Agronomía ofrece Montevideo, Paysandú y Salto; Salto habilita la trayectoria oficial Agrícola-ganadera. Biotecnología ofrece Montevideo, Salto y Paysandú; Abogacía ofrece Montevideo y Salto sin inventar una trayectoria regional.
- La sede se persiste separada de la trayectoria, se valida al hidratar preferencias antiguas o inválidas, se restablece al cambiar de plan y no duplica carrera ni progreso. El flujo fue verificado en escritorio, tablet y móvil, en temas claros y oscuros.
- Artefactos reproducibles: `node scripts/build-extracted-academic-plans.mjs`; manifiesto `data/bedelias/inventory/ui-extracted-plans.json`; catálogo y cargas diferidas bajo `app/data/`.
- Siguiente paso: continuar la auditoría oficial desde Notariado 2016 y reemplazar progresivamente las proyecciones pendientes por normalizaciones auditadas, sin habilitar publicación automática.

### Notariado 2016 — oferta regional auditada 2026-08-15

- El Plan 2016 de Facultad de Derecho, aprobado por Facultad el 18/06/2015 y 26/05/2016 y por el CDC el 19/07/2016, confirma el título `Escribano Público`, cinco años, 450 créditos y el certificado intermedio común de Procurador con 160 créditos.
- La grilla vigente de 27/12/2024 fija mínimos actuales de 61 créditos socio-jurídicos/teórico-metodológicos, 83 de Derecho público, 94 de Derecho privado, 42 de Derecho social específico, 135 de práctica profesional y 35 optativos/electivos. Se preservan por separado los mínimos del texto original del plan (56, 104, 90, 40, 112 y 48) para no mezclar versiones normativas.
- Facultad de Derecho, el catálogo central y la CSE describen un único Plan 2016 implantado en Montevideo y CENUR Litoral Norte desde 2017. Los cuatro primeros semestres son comunes con Abogacía y desde el quinto comienza el ciclo orientado a Notariado; esto no define una trayectoria territorial.
- Los snapshots de FDER y CENURLN conservan el mismo núcleo de 87 unidades. Las 52 materias que aparecen sólo en Salto están íntegramente bajo ramas optativas/electivas; no faltan materias canónicas ni cambian créditos compartidos. La cobertura de previaturas regional es menor (39 frente a 436), como diferencia de publicación.
- Decisión: una identidad canónica con ofertas en Montevideo y Salto, sin malla ni trayectoria regional separada. Las materias adicionales permanecen en el catálogo flexible y la auditoría no habilita publicación.
- Registro de auditoría: hash `sha256:a382590b01eaf3537417b94645f5398918fe4561046f0ea1c1a3bfabdd74fed4`. Cola actualizada: 173 identidades pendientes y cinco diferencias regionales prioritarias.
- Siguiente paso: auditar Licenciatura en Enfermería 2016 entre FENF, CUR, CURE y CENURLN.

### Licenciatura en Enfermería 2016 — ofertas regionales auditadas 2026-08-15

- La Facultad de Enfermería documenta un único Plan 2016 para Montevideo, Rivera, Rocha y Salto. La decisión institucional fue implantar el mismo plan acreditado en todas las sedes; la ampliación territorial no creó currículas ni títulos separados.
- El plan vigente dura 54 meses y exige 360 créditos en cuatro ciclos de 80, 200, 40 y 40. Son 330 créditos obligatorios —240 en unidades integradas y 90 en independientes— y 30 optativos/electivos. Otorga el título `Licenciado/a en Enfermería` y, al completar 200 créditos hasta el quinto semestre, el título intermedio `Auxiliar de Enfermería`.
- Los snapshots de FENF, CUR, CURE y CENURLN conservan exactamente el mismo núcleo de 21 unidades. Cada publicación regional contiene 78 alternativas flexibles adicionales y omite cuatro alternativas flexibles del catálogo central; las dos diferencias de créditos compartidas también pertenecen a ramas optativas/electivas.
- La cobertura de previaturas regional es mucho menor (2–3 entradas frente a 131), como diferencia de publicación. No existe evidencia oficial que vincule una trayectoria curricular a Rivera, Rocha o Salto.
- Decisión: una identidad canónica con ofertas en Montevideo, Rivera, Rocha y Salto. Las diferencias de catálogo permanecen como alternativas flexibles y no generan una malla ni trayectoria territorial. La auditoría no habilita publicación.
- Registro de auditoría: hash `sha256:725c88dc9eb07f79d2cb34ef41a2a0e43382d41712bb150d1ffdbf5d8e988a67`. Cola actualizada: 172 identidades pendientes y cuatro diferencias regionales prioritarias; hash `sha256:1152e0fe7246ca56633009af5813f72c651ee0ccedde2fe51dfcd7cfac5451c7`.
- Siguiente paso: auditar Doctor en Medicina 2008 entre FMED y CENURLN.

### Doctor en Medicina 2008 — oferta regional intersede auditada 2026-08-15

- El [Plan 2008 de Facultad de Medicina](https://www.fmed.edu.uy/gestion/bedelia/dr-en-medicina/plan-de-estudios), aprobado por Facultad el 26/03/2008 y por el CDC el 09/12/2008, define un único título `Doctor en Medicina`, siete años y 741 créditos: 265 en el primer trienio, 330 en el segundo y 146 en el internado obligatorio.
- Para egresar se requieren 60 créditos optativos/electivos, con al menos 15 optativos y 10 electivos. El título intermedio `Técnico en Promoción de Salud y Prevención de Enfermedades` exige cuarto año completo y 20 créditos flexibles; eso suma 395 y coincide con la guía central 2023. Planeamiento publica 410 en su serie 2023, discrepancia que se conserva explícita y no se oculta.
- La [oferta de CENUR Litoral Norte](https://udelar.edu.uy/carrerasinterior/doctor-en-medicina-2/) es completa pero intersede: el primer año se cursa en Paysandú mediante CIO Salud — Trayectoria Medicina y los años siguientes se distribuyen entre Paysandú y Salto. Esa “trayectoria” es una vía de ingreso reconocida como primer año, no un perfil curricular ni una carrera separada.
- Los snapshots de FMED y CENURLN conservan las mismas 70 entradas no flexibles. El comparador encuentra siete claves sólo centrales, 684 sólo regionales y dos colisiones de código/créditos (`EPAR` y `PORT`); todas pertenecen a ramas optativas/electivas. La cobertura de previaturas regional es siete entradas frente a 2276 centrales.
- Decisión: una identidad canónica, con oferta Montevideo y una única oferta regional `Litoral Norte (Paysandú y Salto)`. No presentar Salto y Paysandú como trayectorias independientes ni convertir el catálogo flexible ampliado en variante curricular.
- Registro de auditoría: hash `sha256:eb6a06b1506463169111ddf6c62cd8a2ebcd0fecaa3c7cc3968788af9d90a9e8`. Cola actualizada: 171 identidades pendientes y tres diferencias regionales prioritarias; hash `sha256:7ae7c003a425fa1de5ff3301d2f0b7b0c1eaee49bc40a79361f7e4770c23bbf9`.
- Siguiente paso: auditar Licenciatura en Educación Física 2017 entre ISEF, CURE y CENURLN.

### Licenciatura en Educación Física 2017 — trayectos por sede auditados 2026-08-20

- El [Plan 2017 de ISEF](https://isef.udelar.edu.uy/noticias/nuevo-plan-de-estudio-licenciatura-en-educacion-fisica/), aprobado por el CDC el 08/11/2016, define un único título `Licenciado en Educación Física`, cuatro años, ocho semestres y 360 créditos: 270 comunes obligatorios, 60 de una opción específica y 30 optativos/electivos.
- Desde el quinto semestre se elige uno de cuatro trayectos certificados: Deporte, Salud, Prácticas Corporales o Tiempo Libre y Ocio. El título no cambia con la opción.
- La disponibilidad sí tiene alcance territorial oficial. Montevideo ofrece los cuatro trayectos; la [página vigente de CURE](https://www.cure.edu.uy/ensenanza/oferta-educativa/licenciatura-en-educacion-fisica/) presenta los cuatro en Maldonado; [Paysandú](https://www.litoralnorte.udelar.edu.uy/bedelia-de-grado/estudiar-educacion-fisica) ofrece únicamente Deporte y Salud. Un informe nacional 2020-2024 no registra matrícula de Salud en Maldonado, pero esa ausencia estadística no se usa para contradecir la oferta pública actual.
- Los tres snapshots conservan las mismas 38 entradas no flexibles. Frente a ISEF, CURE y CENURLN tienen cada uno 107 claves regionales y omiten una clave central; todo está bajo ramas optativas/electivas. Las colisiones de código `EPAR` y `MBCM` también son flexibles. La cobertura de previaturas es 1192 en ISEF, 119 en CURE y 65 en CENURLN.
- Decisión: una identidad y una malla canónica, con selector de sede que filtre trayectos oficiales. Paysandú debe mostrar sólo Deporte y Salud; el catálogo regional ampliado no crea otra currícula ni habilita trayectos adicionales.
- Registro de auditoría: hash `sha256:26d97d99c693d4579d5dc48d2703b0b3f0840246013884cb0b1d2212f7839774`. Cola actualizada: 170 identidades pendientes y dos diferencias regionales prioritarias; hash `sha256:eb72c73b73b175b8526bd9b52445ea4a399cea9e14a30920ebe015bbc71be4b2`.
- Siguiente paso: auditar Tecnicatura en Deportes 2007 entre ISEF, CUR, CURE y CENURLN.

### Tecnicatura en Deportes 2007 — opciones territoriales y aperturas auditadas 2026-08-20

- El [Plan 2007 de ISEF](https://www.cure.edu.uy/wp-content/uploads/2025/02/Plan-de-estudios-tecnicatura_en_deportes-2_0.pdf) define un único título `Técnico Deportivo Superior`, dos años y 160 créditos: 37 comunes, 107 específicos de la opción deportiva y 16 opcionales.
- La opción deportiva es un trayecto del mismo plan y tiene alcance territorial y temporal. Las fuentes oficiales documentan Fútbol en Montevideo, Actividades Acuáticas en Rocha y Atletismo en Paysandú. Rivera abrió Fútbol y Actividades Acuáticas en 2013, pero la distribución territorial vigente de ISEF ya no presenta allí la Tecnicatura; queda como antecedente histórico, no como sede actual.
- La vigencia curricular no implica ingreso abierto. ISEF resolvió no abrir Fútbol en Montevideo en 2026 y CURE informa que tampoco abre la Tecnicatura ese año. La oferta del interior rota normalmente cada dos años; no se anuncia ingreso vigente en Paysandú ni Rivera.
- Los snapshots CUR, CURE y CENURLN tienen exactamente el mismo catálogo de 838 entradas y el mismo hash curricular, pese a corresponder a opciones territoriales diferentes. Son 78 entradas más que ISEF: 59 opcionales y 19 básicas, con una publicación más completa especialmente en Handball. La diferencia no sigue la sede y no demuestra una variante regional. La cobertura de previaturas sí cambia: 632 en ISEF frente a 59, 68 y 61.
- Decisión: una sola carrera y malla, con selector sede → opción deportiva y estado temporal de ingreso. No mostrar Rivera como vigente ni prometer ingreso 2026; construir la proyección curada desde el plan oficial y el árbol regional más completo, sin convertirlo en “malla del interior”.
- Registro de auditoría: hash `sha256:06dd414de6ecbc1f6307966b1ba0ebb959be4d952155965be517ad51e8894ba0`. Cola actualizada: 169 identidades pendientes y una diferencia regional prioritaria; hash `sha256:cb3d344dbad99305cb0e1f59a64927605e92dd3b7ef2dfdd8bce40907c883551`.
- Siguiente paso: auditar Licenciatura en Psicología 2013 entre PSICO y CENURLN.

### Licenciatura en Psicología 2013 — sedes completas y vía CIO auditadas 2026-08-20

- El [Plan 2013 de Facultad de Psicología](https://psico.edu.uy/sites/default/files/plan_de_estudio_de_la_licenciatura_en_psicologia_2013.diariooficial.pdf), aprobado por el CDC el 25/09/2012, define un único título `Licenciado en Psicología`, cuatro años y 320 créditos. Se organiza en ciclos de 80, 160 y 80 créditos y en cinco módulos: Psicología 145, Metodológico 60, Articulación de Saberes 40, Prácticas y Proyectos 50 y Referencial 20, más hasta 5 créditos de cooperación institucional.
- [Facultad declara](https://www.psico.edu.uy/noticias/publicacion-del-plan-de-estudio-2013) que el mismo PELP 2013 rige para las carreras completas de Montevideo, Paysandú y Salto. Los itinerarios son construcciones personales y flexibles dentro del plan; no son perfiles ni trayectorias territoriales.
- El CIO Ciencia y Tecnología — Trayectoria Psicología de CURE reconoce 90 créditos como primer año. Es una vía regional de ingreso desde Maldonado, Rocha o Treinta y Tres, no una cuarta sede completa ni una malla alternativa.
- Bedelías comparte 2942 claves de curso entre PSICO y CENURLN, sin cambios de créditos. Hay dos entradas sólo centrales y 46 sólo regionales; corresponden a una disposición transitoria, acreditaciones, prácticas y proyectos locales, optativas, electivas y contenidos renovables previstos por el propio plan. La cobertura regional de previaturas es 317 frente a 2647.
- Decisión: una identidad canónica con sedes Montevideo, Salto y Paysandú, sin filtrar itinerarios por sede. El CIO se muestra como vía de ingreso. La duración se normaliza a 48 meses según el plan aprobado; los 60 meses del catálogo central quedan como anomalía documental.
- Registro de auditoría: hash `sha256:dc8651ba1caafa5410a9f8b57c145982e800c40a4604412a93a8762a1f57ce60`. Cola actualizada: 168 identidades pendientes, sin diferencias regionales de contenido pendientes; hash `sha256:df72d586e3b13b6e62128e37982b3a3cdca415717b1b2a1e3bc6dd4044c30eb2`.
- Siguiente paso: auditar el lote `insufficient-regional-content`, comenzando por Diplomatura en Música 1994.

### Proyección UI actualizada con las nueve auditorías regionales — 2026-08-20

- Se regeneraron las 177 proyecciones masivas desde la cola, los snapshots y `official-source-audits.json`: 93 conservan composición utilizable y 84 muestran el estado explícito de composición no publicada. Junto con los siete planes vigentes curados, la UI cubre las 184 identidades canónicas vigentes del inventario.
- Los nueve planes con auditoría oficial cerrada publican sus sedes verificadas sin duplicar carrera ni plan: Agronomía, Biotecnología, Abogacía, Notariado, Enfermería, Medicina, Educación Física, Tecnicatura en Deportes y Psicología.
- Educación Física filtra trayectos por sede; la Tecnicatura en Deportes vincula cada opción con Montevideo, Rocha o Paysandú y advierte el cierre o ausencia de ingreso; Rivera no se expone como oferta actual. La vía CIO de Psicología en CURE y la trayectoria de primer año de Medicina no se presentan como sedes completas independientes.
- El catálogo regional flexible no genera variantes curriculares por sí solo. Todas las proyecciones masivas conservan `publicationEligible: false` aunque tengan evidencia oficial de sedes o metadatos.
- Manifiesto reproducible: `data/bedelias/inventory/ui-extracted-plans.json`, hash de reporte `sha256:2d283a8f120d8d863b0e667fca9a0d9db31acfd7c9f601b82e80ec03c83fde03`.
- Siguiente paso documental: continuar el lote `insufficient-regional-content` desde Diplomatura en Música 1994 sin bloquear la disponibilidad local de las identidades ya extraídas.

### Diplomatura en Música 1994 — marca de vigencia corregida 2026-08-20

- El listado institucional histórico registra `Diplomado en Música (Salto)` Plan 1994 con Piano, Canto, Dirección Coral y Guitarra. Bedelías conserva además la variante nominal `Diplomatura`, sin composición publicada en el servicio central ni en CENUR Litoral Norte.
- La oferta vigente de Facultad de Artes publica en Salto dos carreras sucesoras separadas: Técnico en Interpretación y Técnico en Dirección de Coros. Las bases de admisión 2026 las identifican como Plan 2004 y no convocan ingresos al Plan 1994.
- Decisión: conservar el Plan 1994 como antecedente trazable, pero excluirlo del selector vigente. No mezclar sus reglas vacías con las Tecnicaturas actuales ni usar la marca `current` de Bedelías para contradecir la oferta oficial 2026.
- La UI queda con 183 identidades vigentes verificables —siete curadas y 176 generadas— más Ingeniería en Computación Plan 1997 como plan histórico explícito. De las proyecciones generadas, 93 tienen composición y 83 muestran composición no publicada.
- Registro de auditoría: hash `sha256:f4059e60ca15617c887201df63af3b653ec7570eb93bda9297ac243221f151e2`. Cola actualizada: 167 identidades pendientes, 20 de prioridad `insufficient-regional-content`; hash `sha256:83a5ffa8a4193a49dc6f8890b004ca909d5dd8b17b5809e30f008072e5cf9253`.
- Manifiesto UI: hash `sha256:5ca7828d64cd6b24a863506d7cb709748aed97c97b81206a9fe5ad332ca8acc1`.
- Siguiente paso: auditar Licenciatura en Trabajo Social 2009, próxima identidad `insufficient-regional-content`, sin trasladar automáticamente la discrepancia Plan 2002/2004 de las Tecnicaturas de Salto.

### Trabajo Social Plan 2009 — auditoría oficial y sedes 2026-08-20

- FCS publica un único Plan 2009 de cuatro años y 360 créditos: 120 del Ciclo Inicial común y 240 del Ciclo Avanzado de Trabajo Social. La malla vigente distribuye esos 240 créditos en ocho módulos y mantiene un único título de Licenciado/a en Trabajo Social.
- La oferta institucional ubica la carrera completa en Montevideo y Salto. La ficha oficial del interior remite al mismo Plan de Estudios FCS 2009; no se encontró una orientación, título ni mínimo curricular propio de Salto.
- Decisión: conservar una sola carrera y plan, con selector de sede Montevideo/Salto y progreso compartido. No crear una trayectoria territorial a partir de prácticas u optativas locales.
- Los dos snapshots de Bedelías carecen de composición y previaturas. La UI muestra 360 créditos, cuatro años y ambas sedes auditadas, pero conserva el estado explícito de composición no publicada sin inventar materias.
- Registro de auditoría: hash `sha256:8289f34a008284af9a90ec69f6dbe1896febcf5c6443f4e0efd1623389704bdc`. Cola actualizada: 166 identidades pendientes, 19 de prioridad `insufficient-regional-content`; hash `sha256:b4648edd61780e0d6bb43142f539399241bb461d79c18ca641f38ce8b06539d3`.
- Manifiesto UI: 176 proyecciones generadas, 93 con composición y 83 sin composición, diez con sedes oficiales; hash `sha256:395ca4987b58b76dcab663951dd2320c36cec85bd1f9f6b226a8f38d68539c29`.
- Siguiente paso: auditar Escalonada de Enfermería 2001, próxima identidad `insufficient-regional-content`, y verificar su vigencia actual antes de proyectar ofertas regionales.

### Carrera Escalonada de Enfermería Plan 2001 — régimen de finalización 2026-08-20

- Facultad de Enfermería documenta la Carrera Escalonada como un programa histórico que se desarrolló en Rivera entre 2001 y 2014. La oferta e ingresos 2026 publican únicamente Licenciatura en Enfermería Plan 2016 y Profesionalización de Auxiliares.
- La continuidad es de egreso: en 2026 se mantienen calendarios de exámenes y trámites individuales para cohortes previas, y Planeamiento registró 29 estudiantes activos en 2025. Esto no equivale a una nueva oferta vigente.
- Los snapshots FENF, CUR, CURE y CENURLN marcan el Plan 2001 como no vigente y contienen cero unidades y cero previaturas. El manifiesto global lo había elevado incorrectamente como actual.
- Decisión: conservar una única identidad histórica compartida por Montevideo, Rivera, Rocha y Salto, pero excluirla del selector de carreras vigentes. No copiar la composición del Plan 2016 ni duplicar el programa por sede.
- Registro de auditoría: hash `sha256:6bbf27ed8483f32100283929caa25eb10321a65d10bf8a1415c20334a208f0dc`. Cola actualizada: 165 identidades pendientes, 18 de prioridad `insufficient-regional-content`; hash `sha256:34c7e0dc0d2f85f033bc388f3b34df9eda57e200d54acd7a83fb32787fcd3ca1`.
- Manifiesto UI: 175 proyecciones generadas, 93 con composición y 82 sin composición, dos identidades históricas excluidas; hash `sha256:827a3c4cb9c3837f33e9d249f1faf35e79518d49102377f7fe041a1df7406c2c`.
- Siguiente paso: auditar Profesionalización de Auxiliares de Enfermería Plan 1999, cuya oferta 2026 está abierta en la región suroeste pero requiere separar la identidad académica de su edición territorial actual.

### Profesionalización de Auxiliares de Enfermería Plan 1999 — cohortes vigentes 2026-08-20

- El Consejo de Facultad y la convocatoria 2026 identifican expresamente la propuesta como Profesionalización Plan 1999. La cohorte 2026 comenzó en Mercedes y Colonia del Sacramento; Montevideo conserva una cohorte nacional 2025.
- Es un único programa para auxiliares con bachillerato, título registrado, experiencia y trabajo vigente. Otorga el título Licenciado/a en Enfermería tras tres años de cursos y el Trabajo Final de Investigación; las presentaciones institucionales resumen 42 meses totales.
- Decisión: modelar Montevideo, Mercedes y Colonia del Sacramento como sedes/cohortes del mismo programa, con disponibilidad temporal y progreso compartido. Las prácticas locales no justifican trayectorias ni planes separados.
- Los snapshots FENF y CENURSO marcan erróneamente el plan como no vigente y no publican composición, créditos ni previaturas. La evidencia institucional 2026 prevalece para la vigencia; la UI mantiene créditos y materias como no publicados.
- Registro de auditoría: hash `sha256:f594e3a9b018c8fcdde1ab1ebdcbfb0041481321b51fcfd96161f9ab480087ad`. Cola actualizada: 164 identidades pendientes, 17 de prioridad `insufficient-regional-content`; hash `sha256:8219078c2397951dc9524fdcfae9a4462e9f61afbe154b3d13330942efad1284`.
- Manifiesto UI: 175 proyecciones, 93 con composición, 82 sin composición y once con sedes oficiales; hash `sha256:403d61656803d30894643f66e68256026a984936627b4923251987acfec7ea3d`.
- Siguiente paso: auditar Archivología Plan 2012 y comprobar si la oferta de Paysandú comparte íntegramente el plan de FIC o sólo una vía territorial de cursado.

### Archivología Plan 2012 — malla oficial y sedes normalizadas 2026-08-20

- El Plan 2012, aprobado por el CDC el 21/08/2012, define un único título Licenciado/a en Archivología, cuatro años, ocho semestres y 360 créditos organizados en los ciclos Inicial, Intermedio y de Graduación.
- FIC publica una malla curricular 2019 vigente con 40 unidades o alternativas explícitas en ocho semestres. La UI conserva además los 87 créditos opcionales como bloques verificables: al menos 35 optativos, 5 electivos, 5 de investigación y 5 de extensión.
- La malla exige dos prácticas preprofesionales por 18 créditos y un Trabajo Final de Grado de 30. Las elecciones Historia de las Ideas/Proceso Cultural del Uruguay y Colecciones Digitales/Introducción a la Preservación Digital quedan modeladas como alternativas, no como duplicaciones obligatorias.
- El plan original financia expresamente la implementación en Montevideo y Paysandú; la CSE identifica ambas como sedes del mismo Plan 2012 y el catálogo vigente del interior mantiene Archivología en Paysandú. No hay evidencia de título, mínimos ni trayectoria territorial diferente.
- Los snapshots FIC y CENURLN contienen cero unidades y previaturas. La proyección usa la malla oficial con procedencia `official-curriculum`, sin atribuirla a Bedelías y sin inventar correlatividades.
- Registro de auditoría: hash `sha256:d002cd1607ca1a7cbf830985589bec01afbd21f56edca7e6ceeff724f30828a8`. Cola actualizada: 163 identidades pendientes, 16 de prioridad `insufficient-regional-content`; hash `sha256:92bbad88feba2209ed4720c89370b2ee7619792b0c4ee5d8d46e22a6cac38a22`.
- Manifiesto UI: 175 proyecciones, 94 con composición, 81 sin composición y doce con sedes oficiales; hash `sha256:8d1b01f67ed0165f5e0e0bf21e15860924d559cf8cda9d8ba8c169b474adab48`.
- Siguiente paso: auditar Bibliotecología Plan 2012, que comparte el marco normativo y la oferta Montevideo/Paysandú, pero requiere convertir su propia malla oficial sin reutilizar materias específicas de Archivología.

### Bibliotecología Plan 2012 — malla oficial y sedes normalizadas 2026-08-20

- El Plan 2012 aprobado por el CDC el 21/08/2012 define el título Licenciado/a en Bibliotecología, cuatro años, ocho semestres y 360 créditos en los ciclos Inicial, Intermedio y de Graduación.
- La malla vigente de FIC aporta 44 unidades o alternativas distribuidas en ocho semestres. Se normalizaron por separado de Archivología, con sus módulos propios de Fuentes, colecciones y servicios, Descripción y recuperación, Políticas y gestión, Investigación, Documentación digital, Disciplinas complementarias, Actividades integradoras y Alfabetización académica.
- El egreso requiere 79 créditos opcionales: al menos 30 optativos, 5 electivos, 5 de investigación y 5 de extensión. La oferta optativa anual de 2026 queda como catálogo renovable y no se incorpora al núcleo obligatorio.
- Se conservaron cuatro elecciones explícitas, dos prácticas preprofesionales por 18 créditos y el Trabajo Final de Grado de 30. No se inventaron previaturas porque las fuentes oficiales consultadas no las publican.
- Montevideo y Paysandú son sedes del mismo Plan 2012, sin título, mínimos ni trayectoria territorial distinta. Los dos snapshots de Bedelías permanecen vacíos y la UI atribuye correctamente la composición a la malla oficial de FIC.
- Registro de auditoría: hash `sha256:c6b90a70a0ec7876cbd31a8fce6d21c08e9c246a95e5c9cd62230f16564d9d07`. Cola actualizada: 162 identidades pendientes, 15 de prioridad `insufficient-regional-content`; hash `sha256:22040b72eba1eef79bad9692bf360ebb77161862faa016ecf48fc15e1ba53e8e`.
- Manifiesto UI: 175 proyecciones, 95 con composición, 80 sin composición y trece con sedes oficiales; hash `sha256:c971ce926a825ec322e86f46a9fa7991d97d042831ce3f25b52993f49a3e0f15`.
- Siguiente paso: auditar Licenciatura en Ingeniería Biológica Plan 2013, próxima identidad `insufficient-regional-content`, y distinguir el plan canónico de sus ofertas FING/CENURLN.

### Licenciatura en Ingeniería Biológica Plan 2013 — estructura y cursado territorial auditados 2026-08-20

- El Plan 2013 aprobado por Facultad de Ingeniería y el CDC define un único título `Licenciado en Ingeniería Biológica`, cuatro años, ocho semestres y 360 créditos. Exige además pasantía o actividad equivalente, tesis y un perfil curricular coherente aprobado por la Comisión de Carrera.
- Se normalizaron los mínimos oficiales: Formación Básica 150, Formación Tecnológica Fundamental 70, Formación Complementaria 10 y Formación Tecnológica 60, con sus mínimos internos, además del requisito transversal de 160 créditos específicos de Ingeniería Biológica.
- Montevideo y Salto ofrecen el tramo inicial; el cursado territorial converge en Paysandú, donde puede completarse la carrera. La UI explicita estas etapas en el selector de sede y conserva una única identidad, título y plan.
- Las áreas de Biomecánica y Biomateriales, Bioinstrumentación, Señales e Imágenes Biológicas y Agroindustrial son ejemplos para perfiles individualmente aprobados, no una nómina cerrada vigente. No se publican como trayectorias seleccionables.
- Los snapshots FING y CENURLN no contienen unidades ni previaturas. La UI muestra la estructura oficial de créditos con procedencia verificable, pero conserva `compositionAvailable: false` y no inventa materias, períodos ni perfiles.
- La fuente normativa y FING indican cuatro años/ocho semestres; el catálogo del interior informa cuatro años y medio/nueve semestres para la secuencia territorial. Se conserva la duración normativa y se documenta la diferencia operativa.
- Registro de auditoría: hash `sha256:8eb514e4f7ad83283e54c13e610230fbd98e7f8789dbaf21cc8cfe8f119b5b9d`. Cola actualizada: 161 identidades pendientes, 14 de prioridad `insufficient-regional-content`; hash `sha256:d642d6a1a5c6ac220afcc9ed2b5c330ad4dfc45368b6537cdf36e25fdea34665`.
- Manifiesto UI: 175 proyecciones, 95 con composición, 80 sin composición y catorce con sedes oficiales; hash `sha256:62461766f773f5c72b07549098227d7cc2be81fcba634eb204d0cf68331c0099`.
- Siguiente paso: auditar Licenciatura en Fisioterapia Plan 2006 entre Facultad de Medicina y CENUR Litoral Norte.

### Licenciatura en Fisioterapia Plan 2006 — malla y sedes auditadas 2026-08-20

- Facultad de Medicina mantiene vigente en 2026 el Plan 2006, con título `Licenciado en Fisioterapia`, cuatro años, 4050 horas e ingreso en Montevideo y Paysandú. El catálogo del interior confirma el cursado completo en Paysandú.
- La malla oficial contiene 29 unidades: 13 en primer año, 5 en segundo, 5 en tercero y 6 en cuarto, incluyendo Internado y Monografía. La UI las proyecta por año y exige completar cada conjunto.
- El plan vigente no está creditizado. Las unidades conservan cero créditos explícitos: no se convierten horas o UCB a créditos ni se muestra un mínimo total inventado.
- La Comisión de Carrera trabajaba en octubre de 2025 sobre un nuevo plan de 360 créditos aún incompleto, con nueve créditos flexibles pendientes y ajustes de implementación. Ese borrador no se mezcla con el Plan 2006 actual.
- Montevideo y Paysandú son sedes completas del mismo plan, sin evidencia de título, núcleo o trayectoria territorial diferente. Los snapshots SGAE contienen el árbol de UCB pero no unidades normalizadas; la proyección atribuye la malla a Facultad.
- Registro de auditoría: hash `sha256:253ccd53f71f547b82b1e0cdbdb53c9b26beab5966162d68a64db55baf14e0f9`. Cola actualizada: 160 identidades pendientes, 13 de prioridad `insufficient-regional-content`; hash `sha256:3119b2b40637ed9f160965141ff8b86f20fe17a4250215b6174e8f708330ab27`.
- Manifiesto UI: 175 proyecciones, 96 con composición, 79 sin composición y quince con sedes oficiales; hash `sha256:25dbc8d8750bd226a333fab783c8a54e015fc028012faa4dccae7f0dbaf5b092`.
- Siguiente paso: auditar Licenciatura en Imagenología Plan 2006, que comparte la estructura EUTM y la oferta Montevideo/Paysandú, sin reutilizar materias específicas de Fisioterapia.

### Licenciatura en Imagenología Plan 2006 — malla y alcance territorial auditados 2026-08-20

- Facultad de Medicina publica el título `Licenciado en Imagenología`, cuatro años, 4070 horas y una malla de 29 unidades: 13 en primer año, 7 en segundo, 6 en tercero y 3 en cuarto.
- El Plan 2006 no publica créditos. La UI conserva cero créditos explícitos y exige las unidades por año, incluido el Internado y la Monografía, sin convertir horas ni inventar previaturas.
- Montevideo y Paysandú permiten cursar la carrera completa. El catálogo general vigente limita Río Negro a tercer y cuarto año; por eso el selector lo muestra como tramo avanzado y no como sede completa ni trayectoria distinta.
- El catálogo interior de 2021 situaba la continuidad en Fray Bentos desde el segundo semestre de segundo año. Se prioriza la descripción vigente más reciente y se conserva la discrepancia para seguimiento.
- Registro de auditoría: hash `sha256:e57a2a997f003a9b10b0e8028ce252953204d5f1380b3b1300bc3d9fb63e244d`. Cola actualizada: 159 identidades pendientes, 12 de prioridad `insufficient-regional-content`; hash `sha256:844b2f5591bebb5aa1eacf3289210687dc91ffa91edae4660813d2ace86a727d`.
- Manifiesto UI: 175 proyecciones, 97 con composición, 78 sin composición y dieciséis con sedes oficiales; hash `sha256:342796e8c6685ce673e5607a9251909e4857aab15aba3b97e3f4603475c4a5a2`.
- Siguiente paso: auditar Licenciatura en Instrumentación Quirúrgica Plan 2006 entre Facultad de Medicina y Paysandú.

### Licenciatura en Instrumentación Quirúrgica Plan 2006 — malla y sedes auditadas 2026-08-20

- Facultad de Medicina mantiene el Plan 2006 con título `Licenciado en Instrumentación Quirúrgica`, cuatro años y 4932 horas. Su malla oficial contiene 28 unidades: 11 en primer año, 6 en segundo, 7 en tercero y 4 en cuarto.
- La UI conserva las unidades obligatorias por año, las cuatro prácticas de instrumentación, Internado y Monografía. El plan no publica créditos, por lo que no convierte horas ni UCB y mantiene cero créditos explícitos.
- Montevideo y Paysandú ofrecen la carrera completa bajo la misma malla. El ingreso por CIO Salud en Paysandú es una vía administrativa y no una trayectoria curricular distinta.
- Registro de auditoría: hash `sha256:8016548a4c8d61b83d8bff6cf7a369442887903e1e8168646859a5cab10f53f8`. Cola actualizada: 158 identidades pendientes, 11 de prioridad `insufficient-regional-content`; hash `sha256:7fc6c7a1c21af3f3f78201f8bfec51071c4d9bccf6e8a272b0e2f4acca09c46d`.
- Manifiesto UI: 175 proyecciones, 98 con composición, 77 sin composición y diecisiete con sedes oficiales; hash `sha256:f917e6d66a56f53a7f9e6df1f159a116daef79cbe43cd0c7af70aea8998e75c3`.
- Siguiente paso: auditar Licenciatura en Laboratorio Clínico Plan 2006 entre Facultad de Medicina y Paysandú.

### Licenciatura en Laboratorio Clínico Plan 2006 — malla y sedes auditadas 2026-08-20

- Facultad de Medicina mantiene el Plan 2006 con título `Licenciado en Laboratorio Clínico`, cuatro años y 3880 horas. La malla oficial contiene 28 unidades: 13 en primer año, 7 en segundo, 5 en tercero y 3 en cuarto.
- La UI conserva las unidades por año, las prácticas de laboratorio, Internado y Monografía. Como el plan vigente está expresado en horas y no publica créditos, mantiene cero créditos explícitos y no inventa conversiones ni previaturas.
- Montevideo y Paysandú ofrecen el mismo plan completo, sin evidencia de título, mínimos o trayectoria territorial diferente. Los snapshots de ambas ofertas no exponen materias normalizadas y la composición se atribuye a Facultad de Medicina.
- Registro de auditoría: hash `sha256:d77fada9156c794714dcb62988df34e72db91f63e82ec1cdd98f94d82fff3976`. Cola actualizada: 157 identidades pendientes, 10 de prioridad `insufficient-regional-content`; hash `sha256:ca334be7fdc7177aadb06242293e1a1d0d09912858b2d1b458214a990ddd46ec`.
- Manifiesto UI: 175 proyecciones, 99 con composición, 76 sin composición y dieciocho con sedes oficiales; hash `sha256:0ade848365ffe333df4cc9eb1c38d889aa005d4df67bbc9b50631505038fc9d1`.
- Siguiente paso: auditar Licenciatura en Psicomotricidad Plan 2006 entre Facultad de Medicina y Paysandú.

### Licenciatura en Psicomotricidad Plan 2006 — malla y sedes auditadas 2026-08-20

- Facultad de Medicina mantiene el título `Licenciado en Psicomotricidad`, el Plan 2006 y cuatro años de duración. La malla oficial contiene 26 unidades: 12 en primer año, 4 en segundo, 4 en tercero y 6 en cuarto.
- Montevideo y Paysandú ofrecen el mismo plan completo. Los programas recientes mencionan explícitamente el dictado para ambas sedes y no aportan evidencia de una trayectoria territorial diferente.
- La carga horaria oficial es inconsistente: la ficha vigente informa 3388 horas, la estadística institucional 3688 y la suma de la tabla curricular da 3745. La proyección conserva 3388 como dato vigente del servicio, registra la discrepancia y no convierte horas en créditos.
- Los snapshots de ambas ofertas no exponen materias normalizadas. La UI atribuye las 26 unidades a Facultad de Medicina, exige los conjuntos publicados por año y no inventa créditos ni previaturas.
- Registro de auditoría: hash `sha256:a96346018d21b93efe8585ae39d3aad4d3d4ce3065a76bc14c22bdf3d55d2ec9`. Cola actualizada: 156 identidades pendientes, 9 de prioridad `insufficient-regional-content`; hash `sha256:96d79abc8da0e2e8d28404d7b87eaa34e702412f3980634cde5c01ce3b324345`.
- Manifiesto UI: 175 proyecciones, 100 con composición, 75 sin composición y diecinueve con sedes oficiales; hash `sha256:07e675c5db3b3a854d5c85c251762721f62ed79056d68c599c553eec6258f07b`.
- Siguiente paso: auditar Tecnicatura en Anatomía Patológica Plan 2006 entre Facultad de Medicina y Paysandú.

### Tecnicatura en Anatomía Patológica Plan 2006 — malla y sedes auditadas 2026-08-20

- Facultad de Medicina publica el título `Técnico en Anatomía Patológica`, tres años y 1196 horas. El formulario institucional de reválidas enumera 13 unidades: 7 en primer año, 2 en segundo y 4 en tercero, incluidas las Rotaciones Prácticas.
- La coordinación vigente confirma Curso I y Curso II en Montevideo y Paysandú durante 2026. CENUR Litoral Norte presenta Paysandú como cursado completo del mismo plan; el CIO Salud es una vía de ingreso y no una trayectoria separada.
- El plan no publica un total de créditos. La UI conserva cero créditos explícitos, atribuye la malla a Facultad y no inventa conversiones ni previaturas más allá de exigir los grupos oficiales por año.
- El catálogo general informa 60 meses, mientras Facultad y CENUR publican tres años. Se prioriza la duración del servicio responsable y se registra la discrepancia.
- Registro de auditoría: hash `sha256:038eb0bbb356f5f7d54e5bdd30b1ab331b380903405b63b3df63bc43c5a15703`. Cola actualizada: 155 identidades pendientes, 8 de prioridad `insufficient-regional-content`; hash `sha256:c812095affcc326281ece7b17b226b00191fd5e65b8e0102595243d72d5887c7`.
- Manifiesto UI: 175 proyecciones, 101 con composición, 74 sin composición y veinte con sedes oficiales; hash `sha256:78611fad7368f8c355bce69ad525e68c2106c3862344d4c51ca792c8835d6190`.
- Siguiente paso: auditar Tecnicatura en Hemoterapia Plan 2006 entre Facultad de Medicina y Paysandú.
