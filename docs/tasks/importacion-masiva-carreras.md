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

### Tecnicatura en Hemoterapia Plan 2006 — malla y sedes vigentes auditadas 2026-08-20

- Facultad de Medicina publica el título `Técnico en Hemoterapia`, tres años, 2840 horas y 21 unidades: 11 en primer año, 8 en segundo y 2 en tercero. La suma anual de la tabla oficial coincide con la carga total.
- Montevideo y Paysandú son las sedes vigentes del mismo Plan 2006. La coordinación 2026 y el catálogo territorial confirman actividad en ambas, sin diferencias de título o malla.
- Rocha aparece en el snapshot CURE, estadísticas 2020 y ofertas antiguas, pero está ausente de la ficha vigente de Facultad y del catálogo actual de CURE. No se muestra como sede actual hasta que una fuente oficial vigente la vuelva a confirmar.
- La UI conserva las 21 unidades con cero créditos explícitos, porque el plan está expresado en horas, y no inventa conversiones ni previaturas.
- Registro de auditoría: hash `sha256:dc8610c9657bc33576d62e3923f12e91bf7ebff0e0c5650af3f82610fb60ccb9`. Cola actualizada: 154 identidades pendientes, 7 de prioridad `insufficient-regional-content`; hash `sha256:89dd39b04ef769d419504284fd9e6134645a5c3b71e907d36f083ba0d6896c38`.
- Manifiesto UI: 175 proyecciones, 102 con composición, 73 sin composición y veintiún planes con sedes oficiales; hash `sha256:5d0383531fa4462fa5ee01086fbdd5c177a17baf102be1bd069ece73cb14f89b`.
- Siguiente paso: auditar Tecnicatura en Podología Plan 2006 entre Facultad de Medicina y Paysandú.

### Tecnicatura en Podología Plan 2006 — malla y sedes auditadas 2026-08-20

- Facultad de Medicina publica el título `Técnico en Podología`, tres años, 2450 horas y 23 unidades: 10 en primer año, 8 en segundo y 5 en tercero. Las cargas anuales oficiales suman exactamente las 2450 horas.
- Montevideo y Paysandú ofrecen el mismo Plan 2006 y la coordinación vigente organiza las materias comunes para ambas sedes. No hay evidencia oficial de una trayectoria curricular territorial diferente.
- El catálogo general informa 60 meses, mientras la ficha del servicio responsable publica tres años. Se prioriza Facultad de Medicina y se conserva la discrepancia en la auditoría.
- La UI conserva las 23 unidades con cero créditos explícitos, porque el plan está expresado en horas, y no inventa conversiones ni previaturas.
- Registro de auditoría: hash `sha256:57b8068a0a97887e45046853c9aab19b87e21792eebcc0cf1d7e26da78856a2d`. Cola actualizada: 153 identidades pendientes, 6 de prioridad `insufficient-regional-content`; hash `sha256:4415aea4dd85dee5e8337e88cb733738f3d47fb219b6f5ac2d26861d26660760`.
- Manifiesto UI: 175 proyecciones, 103 con composición, 72 sin composición y veintidós planes con sedes oficiales; hash `sha256:ea5707681642d86190bdc3d3c616df427f79b886b3aa1db0aab21c9932908f7b`.
- Siguiente paso: auditar Tecnicatura en Radioterapia Plan 2006 entre Facultad de Medicina y Paysandú.

### Tecnicatura en Radioterapia Plan 2006 — título, malla y oferta vigente auditados 2026-08-20

- Facultad de Medicina mantiene la identidad `Tecnicatura en Radioterapia`, pero publica el título oficial `Tecnólogo en Radioterapia`, tres años y 3025 horas. La malla contiene 21 unidades: 11 en primer año, 9 en segundo y el Curso Práctico de Radioterapia en tercero.
- La suma de las tablas anuales da 3040 horas, quince más que el total explícito de la ficha. La UI prioriza las 3025 horas del servicio, conserva la anomalía y no convierte horas en créditos.
- La ficha vigente sólo publica ingreso en Montevideo. El snapshot CENURLN se conserva como antecedente, pero Radioterapia no figura en el catálogo territorial actual de Paysandú y por eso no se muestra como sede vigente.
- Registro de auditoría intermedio: hash `sha256:ea0a3b3ac3a9119fdb8970792f593d2606fed273876b616405d9af9dda050ab7`. La malla queda incorporada sin inventar créditos ni previaturas.

### Tecnicatura en Salud Ocupacional Plan 2006 — malla y sedes auditadas 2026-08-20

- Facultad de Medicina publica el título `Tecnólogo en Salud Ocupacional`, tres años, 3069 horas y 20 unidades: 11 en primer año, 3 en segundo y 6 en tercero. Las cargas anuales suman exactamente el total vigente.
- Montevideo y Paysandú ofrecen el mismo Plan 2006 y perfil profesional, sin evidencia de una trayectoria territorial diferente. El CIO Salud de Paysandú es una vía de ingreso y no otra carrera.
- La UI conserva las 20 unidades y la Monografía con cero créditos explícitos, porque el plan está expresado en horas, y no inventa conversiones ni previaturas.
- Registro de auditoría: hash `sha256:a2be2379537045ba31c1ed4ead1c0b90272f5f09bdb5910edafc9233173a71f5`. Cola actualizada: 151 identidades pendientes, 4 de prioridad `insufficient-regional-content`; hash `sha256:4eaeece2109a0cad95516d51447c753dbbcdb76ef5199d013bd1c71e90f1b8a7`.
- Manifiesto UI: 175 proyecciones, 105 con composición, 70 sin composición y veintitrés planes con sedes oficiales; hash `sha256:ef5e02bddc9190f856ec4a5442fc7967a7f848064bbacd715cadc6d90cf7675f`.
- Siguiente paso: auditar Tecnólogo Químico Plan 2025 y resolver su identidad compartida entre Facultad de Química y Paysandú.

### Tecnólogo Químico Plan 2025 — malla compartida y sedes auditadas 2026-08-20

- Udelar, DGETP-UTU y UTEC publican un único Plan 2025 de tres años y seis semestres. La grilla oficial contiene 32 cargas obligatorias por período, ocho optativas y la Pasantía; las unidades anuales se conservan en ambos semestres con los créditos que el documento asigna a cada tramo.
- Las cargas obligatorias suman 266 créditos. Bedelías y el catálogo central exigen un mínimo de 270, mientras las optativas publicadas valen 5 o 6 créditos; la UI exige el total y permite superar el mínimo sin inventar una cantidad fija de optativas.
- Montevideo y Paysandú son sedes del mismo plan compartido. No existe evidencia de título, mínimos o trayectoria territorial diferente, por lo que la elección de sede conserva una única malla y el mismo progreso.
- Bedelías informa 24 meses y no muestra composición; el plan oficial vigente está organizado en 36 meses y prevalece. Tampoco se inventan previaturas para el nuevo plan.
- Registro de auditoría: hash `sha256:0b268a5d02dcba14afe7e53b4f4872116d06a73608421ef95a8698c0f960f881`. Cola actualizada: 150 identidades pendientes, 3 de prioridad `insufficient-regional-content`; hash `sha256:ec1ea7504537fc2a693821d1b9bc58b2e95073132627a4d9b12b93785220b7b3`.
- Manifiesto UI: 175 proyecciones, 106 con composición, 69 sin composición y veinticuatro planes con sedes oficiales; hash `sha256:4e9a1c3ff7073423cc5381cd370ee30a76ee0dfc83dc50b8ed900b9174562b4d`.
- Siguiente paso: auditar Doctor en Ciencias Veterinarias Plan 2021 y localizar su estructura oficial cuando la composición de Bedelías resulte insuficiente.

### Médico Veterinario Plan 2021 — malla 2026, previaturas y recorridos territoriales auditados 2026-08-20

- Facultad publica el Plan 2021 modificado para 2026 con título `Médico Veterinario`, cinco años, diez semestres, ciclo flexible y 453 créditos. La UI incorpora 69 unidades o actividades rígidas, cuatro mínimos flexibles y 56 reglas oficiales para cursar.
- El egreso exige 21 créditos optativos/electivos, 9 de EFI, 30 de practicantados —al menos dos— y 10 del Trabajo Final de Grado, además del tronco obligatorio y el total de 453.
- Se modelan dos recorridos territoriales del mismo plan: Sur combina Montevideo y el Instituto de Producción Animal en San José; Norte cursa 1.º–7.º en Salto y 8.º–10.º en Paysandú. Facultad declara una única malla y permite cambiar de sede, por lo que no se duplican carrera, plan ni progreso.
- El anexo de previaturas 2026 está rotulado provisorio. Sus cursos previos y umbrales de 28 a 215 créditos quedan operativos y trazables, con revisión pendiente únicamente cuando exista una versión definitiva.
- El PDF de créditos imprime 45 como subtotal del semestre 6, aunque sus ocho filas suman 46. El total general y la suma de todas las filas coinciden en 453; se preservan los créditos por unidad y se muestra la advertencia.
- Un PDF de créditos intercambia las infecciosas de rumiantes/monogástricos entre 5.º y 6.º. La malla vigente, la página de cursos y el anexo de previaturas coinciden en Monogástricos en 5.º y Rumiantes en 6.º; prevalece esa coincidencia triple.
- Registro de auditoría: hash `sha256:6c6874f16ee3d5fcc85bfd0cd5f5ad5898758ff1ca63ee461b5339d32cb42653`. Cola actualizada: 149 identidades pendientes, 2 de prioridad `insufficient-regional-content`; hash `sha256:a4e71626ae13deb831ae5b2fa3bd0d4b188048db75b19f3426952c063b9914b5`.
- Manifiesto UI: 175 proyecciones, 107 con composición, 68 sin composición y veinticinco planes con sedes oficiales; hash `sha256:b0ef90996f53c223688f7545b749289933ce36e388ebe4d598fc10e6365011f7`.
- Siguiente paso: auditar Asistente en Odontología Plan 2017, cuya composición no está publicada por Bedelías.

### Asistente e Higienista en Odontología Plan 2017 — mallas y previaturas auditadas 2026-08-20

- Facultad publica dos carreras tecnológicas de dos años y 160 créditos. Ambas comparten las catorce unidades del primer año; el segundo año diferencia el perfil asistencial del educativo-preventivo.
- Cada proyección contiene cuatro semestres, 22 unidades o bloques y exactamente 160 créditos. El egreso exige 12 créditos optativos/electivos, representados como carga flexible y no como asignaturas nominales obligatorias.
- Las pautas reglamentarias aprobadas el 18/09/2025 distinguen aprobación de curso y aprobación de evaluación final/examen. La UI conserva ambas clases de condición en 21 reglas por carrera.
- La carrera completa vigente se publica en Montevideo. Las prácticas en servicios pueden realizarse en instituciones conveniadas de Montevideo o del interior según cupos; esa movilidad de práctica no se presenta como una sede regional completa ni como trayectoria diferente.
- Los snapshots de CUR y CENUR Litoral Norte conservan la identidad del Plan 2017 pero están vacíos. Al no existir oferta regional completa en el catálogo vigente, no se exponen como sedes actuales.
- En Higienista, Práctica en Servicios exige además estar cursando o haber cursado Práctica en Posgrado. La UI informa esta correquisita, pero no la transforma en una aprobación previa más restrictiva que el reglamento.
- Algunos programas individuales asignan 8 créditos a unidades que la malla valora en 6. Se prioriza la malla porque su suma coincide con los 160 créditos del plan y del catálogo vigente, y la discrepancia queda documentada.
- Registro de auditoría: hash `sha256:d5fd2b3259e6c893e842601f6237b4261b3f779306913d6a52f5fab24f27f070`. Cola actualizada: 147 identidades pendientes, sin casos `insufficient-regional-content`; hash `sha256:8a8cd8f12e9b932dd37be9de7c040eb89952d12ed3301a0753a8995d6b5f9311`.
- Manifiesto UI: 175 proyecciones, 109 con composición y 66 sin composición; hash `sha256:7a01739d5425fbb7593a194e41c6e67317fdb7082d439ae536e43ea589fa35fe`.
- Siguiente paso: auditar Licenciatura en Ciencias Hídricas Aplicadas Plan 2016, primera identidad sin composición de la cola reproducible.

### Licenciatura en Recursos Hídricos y Riego Plan 2017 — identidad, malla y previaturas normalizadas 2026-08-20

- La identidad histórica `Licenciatura en Ciencias Hídricas Aplicadas` Plan 2016 queda únicamente como clave técnica del snapshot. La resolución del Claustro y las páginas vigentes de Facultad de Ingeniería y CENUR Litoral Norte confirman que Recursos Hídricos y Riego la sustituyó; la UI muestra una sola carrera y un solo Plan 2017.
- La combinación tipo 2024 publica 36 unidades en ocho semestres. Como el plan permite elegir el currículo cumpliendo mínimos por área, sus 377 créditos visibles no se interpretan como un tronco íntegramente obligatorio.
- El egreso exige 360 créditos: 110 en Ciencias básicas, 190 en áreas específicas, 5 complementarios y 55 de libre elección, junto con los mínimos temáticos, Pasantía y Proyecto Final. Los créditos libres se representan como bloque flexible y no como asignaturas inventadas.
- La malla interactiva oficial aporta 27 reglas de cursado, diferenciando curso y examen aprobados. Pasantía requiere 210 créditos y Proyecto Final 250.
- Salto es la única sede completa vigente. Algunas asignaturas pueden dictarse en Concordia, Argentina, pero esa ubicación puntual no se presenta como otra sede ni trayectoria.
- Registro de auditoría: hash `sha256:37ee845bb8076902436527a735dbb37dbceff248537e18cf3f82382cda7efdb3`. Cola actualizada: 146 identidades pendientes, 37 sin composición; hash `sha256:7d130af0c3c6d562b9048a2bcad2e2f4972985a4b7433c89c8ef669b07655208`.
- Manifiesto UI: 175 proyecciones, 110 con composición y 65 sin composición; hash `sha256:8310a8fdeab561ec995a047b1afe79fc6c11578f9566bb4adb42bcaf23bd2d87`.
- Siguiente paso: auditar Licenciatura en Diseño Integrado Plan 2012, próxima identidad sin composición de la cola reproducible.

### Licenciatura en Diseño Integrado Plan 2012 — perfiles, malla y previaturas auditados 2026-08-20

- FADU mantiene un único Plan 2012, un único título `Licenciado en Diseño Integrado`, cuatro años y 360 créditos. La UI agrupa la carrera bajo FADU aunque su snapshot técnico provenga de CENUR Litoral Norte.
- La carrera se dicta en Salto y ofrece dos perfiles oficiales de pre-especialización: Desarrollo Local y Eficiencia Energética. Se modelan como trayectorias del mismo plan, no como carreras ni títulos duplicados, y comparten el progreso del núcleo común.
- La estructura exige 90 créditos en Ciclo Básico, 180 en Ciclo Desarrollo y 90 en Ciclo Egreso. Se conservan los mínimos por área, los 20 créditos optativos/electivos de Desarrollo y los 40 de Egreso.
- El mapa aprobado por CFADU y actualizado el 05/04/2025 aporta 30 unidades obligatorias, `Introducción a la Vida Universitaria` con cero créditos y 36 reglas de cursado. Proyecto Final de Carrera y Práctica Pre-profesional se representa como una unidad anual de 50 créditos y exige 270 créditos previos, además del núcleo indicado.
- Las optativas nominales se presentan como oferta posible. El perfil Desarrollo Local incluye un bloque flexible para completar sus 40 créditos de Egreso sin inventar asignaturas; Eficiencia Energética conserva sus seis opciones publicadas.
- Registro de auditoría: hash `sha256:6db4b47a806c596bca0b0a817c687125f4af9c62e4c7e942c27f02cf36632787`. Cola actualizada: 145 identidades pendientes, 36 sin composición; hash `sha256:17adfd3fb393d80d9b3dacfdde422b632e6d515d9d10937bf2b6ab0f9636dd20`.
- Manifiesto UI: 175 proyecciones, 111 con composición y 64 sin composición; hash `sha256:0ca7e35cf95740ac0308bbec000fe60f664c623d9842f5ab59fb2deabebfa14f`.
- Siguiente paso: auditar Tecnólogo en Administración y Contabilidad Plan 2012, próxima identidad sin composición de la cola reproducible.

### Tecnólogo en Administración y Contabilidad Plan 2012 — menciones y sedes normalizadas 2026-08-20

- FCEA mantiene una sola carrera, un solo Plan 2012 y el título `Tecnólogo en Administración y Contabilidad`. La implementación vigente dura cinco semestres y exige 225 créditos; los 60 meses del catálogo general se conservan como anomalía, no como duración académica.
- La grilla actual exige 200 créditos comunes: 50 en Administración, 70 en Contabilidad e Impuestos, 30 Jurídicos, 10 de Economía, 20 de Métodos Cuantitativos y 20 de Actividades Integradoras. Los 25 restantes son de distribución flexible y definen la mención.
- La UI ofrece siete menciones del mismo plan: Cooperativismo y Asociativismo en Colonia/Mercedes; Agroindustria y Comunicación Organizacional en Tacuarembó; Turismo, Gestión Ambiental y Salud en el Cenur del Este; y Minería en Treinta y Tres. El selector filtra menciones por sede y conserva el progreso del núcleo común.
- Las opciones nominales de cada región se muestran como catálogo elegible. No se marcan todas como obligatorias: basta cumplir el mínimo flexible de 25 créditos. Para Salud se conserva una bolsa residual de siete créditos porque las opciones nominales identificadas suman dieciocho.
- `Introducción a la Microeconomía` sustituye a `Análisis de las Interacciones Económicas` desde 2026. `Cálculo I` representa también la equivalencia publicada `Cálculo I/A + Cálculo I/B` sin duplicar créditos.
- El Plan original distribuía 170 créditos obligatorios y 55 opcionales; la grilla vigente de FCEA establece 200 y 25. La UI prioriza la implementación actual y mantiene trazada la diferencia. No se inventan previaturas ante la ausencia de una tabla consolidada vigente.
- Registro de auditoría: hash `sha256:be7823100dbd6346473ddd9ccac65ab000851f1066b06412246761cc57e0f45d`. Cola actualizada: 144 identidades pendientes, 35 sin composición; hash `sha256:3938e4e6fac243aa0949bdf388ab5b08489badd313919355c96c98203db768d3`.
- Manifiesto UI: 175 proyecciones, 112 con composición y 63 sin composición; hash `sha256:3abe983ff1da7e4c500eeddbacd8dab61b570eda532a03c623fcd94cfb444da2`.
- Siguiente paso: auditar Licenciatura en Gestión Ambiental Plan 2011, próxima identidad sin composición de la cola reproducible.

### Licenciatura en Gestión Ambiental Plan 2011 — currículo flexible, perfiles y sedes auditados 2026-08-20

- CURE publica un único Plan 2011, el título `Licenciado en Gestión Ambiental`, cuatro años y 360 créditos. La carrera se organiza en un Ciclo Básico de 180 créditos y un Ciclo de Profundización de otros 180.
- El Ciclo Básico exige 24 créditos en Ciencias Exactas, 24 en Ciencias Naturales y Geociencias, 24 en Ciencias Sociales, 48 interdisciplinarios, 24 técnico-metodológicos y 36 optativos. Taller Interdisciplinario I y II son sus únicas unidades obligatorias.
- La profundización exige Taller III 24 créditos, 91 créditos de cursos vinculados al perfil, Monografía 20 y Trabajo Final 45. Para ingresar se requieren 180 créditos cursados y 120 aprobados; la UI informa el doble umbral y no lo automatiza de forma incompleta.
- Se modelan cinco perfiles del mismo título: Manejo de Ecosistemas, Gestión Sostenible de Sistemas Agrarios, Contaminación Ambiental, Ordenamiento Territorial y Recursos Pesqueros. Los cursos fundamentales y opciones generales se filtran como trayectorias sugeridas, no como secuencias rígidas.
- Maldonado y Rocha ofrecen los cinco perfiles. Treinta y Tres ofrece la carrera completa únicamente con Gestión Sostenible de Sistemas Agrarios. La elección de sede conserva carrera, plan y progreso compartidos.
- La oferta efectiva puede alternar por semestre, año, modalidad y sede. La UI usa las planillas oficiales 2025/2026 con créditos, mantiene una bolsa explícita de optativas básicas y advierte que la grilla definitiva requiere tutoría y aval de la Comisión de Carrera.
- No se inventan previaturas individuales: CURE confirma que existen, pero no publica una tabla consolidada vigente en las fuentes revisadas.
- Registro de auditoría: hash `sha256:3891095d5c4fc579f1394895cfef32fe292ebf6848541715e92c8923957623ad`. Cola actualizada: 143 identidades pendientes, 34 sin composición; hash `sha256:2a7c0c07b0c8a5a398cf84e93096df24a490fe16395777226d74ab98a3d2f72b`.
- Manifiesto UI: 175 proyecciones, 113 con composición, 62 sin composición y veintisiete planes con sedes oficiales; hash `sha256:73bbe9f826094c67f2ce0c3339444d2f6a7472642741c8b32371128e14f2b687`.
- Siguiente paso: auditar Licenciatura en Lenguajes y Medios Audiovisuales Plan 2011, próxima identidad sin composición de la cola reproducible.

### Licenciatura en Lenguajes y Medios Audiovisuales Plan 2011 — trayectorias y malla auditadas 2026-08-20

- CURE y Facultad de Artes mantienen una sola carrera, un único título `Licenciado en Lenguajes y Medios Audiovisuales`, cuatro años y 360 créditos. La oferta e inscripción 2026 se concentra en la sede Maldonado.
- Primer año es común: Taller de los Fenómenos de la Percepción y Lenguajes 55 créditos y Legados Histórico-Culturales 35. Su aprobación habilita la elección de trayectoria.
- Desde segundo año se elige Creación Audiovisual o Creación Audiovisual Interactiva. Cada recorrido conserva 90 créditos por año y suma exactamente 360 con Estéticas, optativas/electivas y el Trabajo Final de Egreso de 20 créditos.
- La UI filtra únicamente los talleres de segundo a cuarto; el primer año, Estéticas, las bolsas flexibles y el egreso conservan progreso compartido. Animación y Videojuegos son focos internos de cuarto interactivo, no carreras, títulos ni trayectorias certificadas adicionales.
- El catálogo de Bedelías informa 60 meses y Plan 2011; CURE y Udelar publican cuatro años, mientras estadísticas históricas rotulan Plan 2008. Se prioriza la duración y grilla actuales, conservando 2011 como clave de inscripción y registrando ambas discrepancias.
- Documentos antiguos ubican la carrera en Playa Hermosa/Piriápolis. La oferta vigente 2026 publica sede Maldonado; la UI no duplica ubicaciones históricas.
- Registro de auditoría: hash `sha256:322d0be6ce28a712d39155b8a7ce210f4116f412a580b68126daa2ab6a3feea7`. Cola actualizada: 142 identidades pendientes, 33 sin composición; hash `sha256:c011b9eac405178343d9015dd0c79eb864ab9a7ee838b2dd58da3f70f32ba342`.
- Manifiesto UI: 175 proyecciones, 114 con composición y 61 sin composición; hash `sha256:b595ccfcc9e59b5ce395e0d4ddc6f28230a22aa79fc7790e90e5b8cb0626a61f`.
- Siguiente paso: auditar Ingeniería Forestal Plan 2013, próxima identidad sin composición de la cola reproducible.

### Ingeniería Forestal Plan 2013 — mínimos, cogestión y sede auditados 2026-08-20

- Udelar mantiene un único título `Ingeniero Forestal`, cinco años y 450 créditos. La carrera se dicta en Tacuarembó y es compartida por las facultades de Agronomía, Ingeniería y Química.
- La UI la agrupa una sola vez bajo Agronomía, explicita los otros dos servicios y conserva el snapshot regional CUT como fuente técnica. La cogestión no crea tres copias de carrera, plan o progreso.
- El egreso exige 5 créditos introductorios, 120 de Ciencias Básicas, 64 de Biociencias, 72 de Ecología Forestal y Silvicultura, 68 de Procesos Industriales, 52 de Gestión, 34 de Formación Complementaria y 35 de Trabajo Final. También se incorporan todos los mínimos oficiales de sus subáreas.
- El plan describe contenidos y ejemplos, pero no publica una grilla nominal vigente y cerrada por semestre. La UI presenta los 450 créditos como bloques de formación verificables: no transforma ejemplos en materias obligatorias ni inventa orientaciones o previaturas.
- El documento técnico se denomina Plan 2012; el CDC lo aprobó en diciembre de 2013, FING informa aprobación 2013 y Bedelías usa Plan 2013. La UI conserva 2013 como clave vigente.
- Documentación histórica contempló cursados posteriores en otras localidades según tutor y oferta. Las páginas vigentes publican Tacuarembó, por lo que no se exponen Rivera, Cerro Largo o Montevideo como sedes completas independientes.
- Registro de auditoría: hash `sha256:c9dfed44e6bec02a3b3c780521ece65d87d0522b8338babd98739f3464f67ecb`. Cola actualizada: 141 identidades pendientes, 32 sin composición; hash `sha256:d1b1ee4e1e4a2cf6e4010917ff3d5e4f6ddcdc2e8dc6630934330e8c2115fc37`.
- Manifiesto UI: 175 proyecciones, 115 con composición y 60 sin composición; hash `sha256:cb4f4f5b117322c779dcba012579d9d17073ce2377af99fa8713239822d6b80a`.
- Siguiente paso: auditar Tecnicatura en Desarrollo Regional Sustentable Plan 2013, próxima identidad sin composición de la cola reproducible.

### Tecnicatura en Desarrollo Regional Sustentable Plan 2013 — malla flexible y pasantía auditadas 2026-08-20

- Facultad de Ciencias Sociales es el servicio académico de referencia de un único Plan 2013, título `Técnico en Desarrollo Regional Sustentable`, tres años, seis semestres y 270 créditos en Tacuarembó.
- El plan exige cinco módulos: Problemas del Desarrollo 50, Abordajes Teóricos 40, Herramientas Metodológicas 45, Promoción y Gestión 90, y Práctica Profesional y Trabajo Final 45.
- Los 48 créditos de libre elección se mantienen dentro de los módulos en la distribución normativa 5/10/8/5/20. Las materias marcadas como sustituibles y los espacios libres no se convierten en asignaturas nominales obligatorias.
- La malla enlazada por Udelar se proyecta como recorrido de referencia con cargas semestrales 38/45/44/46/42/55, que suman exactamente 270. La pasantía y memoria final de 25 créditos quedan como requisito explícito de egreso.
- El Reglamento alude a asignaturas definidas como previas, pero no publica una tabla consolidada. La UI no inventa correlatividades ni confunde el carácter flexible del plan con trayectorias certificadas.
- La participación docente híbrida reciente de Rivera y Cerro Largo no transforma esas localidades en sedes completas: el catálogo vigente mantiene Tacuarembó.
- Registro de auditoría: hash `sha256:b14a6f1d67de82d9372fdbd8d9df71c1c0972418b54abebe3e56307a7f78879d`. Cola actualizada: 140 identidades pendientes, 31 sin composición; hash `sha256:3735f8d052a5cc9a7da8a5ff366f3c8b9fa7c60230becce4caa81395df63f375`.
- Manifiesto UI: 175 proyecciones, 116 con composición y 59 sin composición; hash `sha256:b9adeada5a57794ef41b78f8865f1187444c72d12208c662aa522ae05679a7e0`.
- Siguiente paso: auditar Técnico Operador de Alimentos Plan 2011, próxima identidad sin composición de la cola reproducible.

### Técnico Operador de Alimentos Plan 2011 — malla flexible, práctica y sede auditadas 2026-08-20

- Escuela de Nutrición mantiene un único Plan 2011, título `Técnico Operador de Alimentos`, dos años, cuatro semestres y 160 créditos en Tacuarembó.
- El egreso exige 111 créditos de cursos disciplinares e interdisciplinares, 12 optativos, 5 electivos y 32 de práctica de campo con informe final. Los cuatro mínimos suman exactamente 160.
- Se incorporaron los quince cursos y talleres obligatorios vigentes, que suman 111 créditos, junto con siete optativas publicadas para 2025. Las optativas forman un catálogo de 36 créditos posibles: la UI exige sólo 12 y no las presenta todas como obligatorias.
- Los cinco créditos electivos se mantienen como espacio flexible. El plan prevé articulación especial con Tecnólogo Cárnico, pero esa articulación no crea una trayectoria, título o sede distinta.
- La práctica de campo exige haber aprobado todos los cursos y talleres y queda automatizada con quince condiciones trazables. Las demás previaturas requieren sólo haber cursado —incluso sin aprobación— y una correquisita; se documentan pero no se endurecen hasta que la UI pueda representar esos estados académicos con fidelidad.
- Bedelías y el catálogo general publican 60 meses. El plan, el reglamento y la ficha territorial coinciden en 24 meses y cuatro semestres, que es la duración usada en la UI.
- Las tres áreas Biopsicosocial, Nutrición y Alimentación, y Gestión organizan contenidos; no son orientaciones ni trayectorias seleccionables.
- Registro de auditoría: hash `sha256:3c502e7d59ea733139b4f91429cf6afd076eb212dd4d24dff0f8f0226d30f717`. Cola actualizada: 139 identidades pendientes, 30 sin composición; la UI genera 117 planes con composición y 58 sin composición.
- Siguiente paso: auditar Tecnólogo Cárnico Plan 2010, próxima identidad sin composición de la cola reproducible.

### Tecnólogo Cárnico Plan 2010 — ejes, optatividad, trabajo final y sedes auditados 2026-08-20

- Udelar y DGETP-UTU mantienen un único título `Tecnólogo Cárnico`, tres años, seis semestres y 262 créditos. La UI lo agrupa una sola vez bajo Facultad de Veterinaria y explicita la participación de Agronomía, Ingeniería, Química y DGETP-UTU.
- El egreso exige 57 créditos del eje Básico e instrumental, 142 de Tecnología Industrial, 48 de Formación Integral y 15 de Trabajo Final. Dentro de los tres ejes se conservan exactamente los mínimos 45+12, 101+41 y 28+20 de formación obligatoria y optativa; los 189 obligatorios y 73 optativos suman 262.
- Se incorporaron las diecinueve actividades obligatorias de la distribución semestral y quince optativas oficiales como catálogo de 80 créditos posibles. La UI exige sólo los mínimos por eje: no convierte todas las alternativas en materias obligatorias.
- El anexo orientativo suma 74 créditos optativos, pero la tabla normativa fija 73 y totaliza 262. Se aplica la tabla y se registra la inconsistencia; `Carne y Salud` se omite hasta contar con un crédito oficial.
- El Trabajo Final de 15 créditos queda como requisito explícito. El plan delega las previaturas a reglamentación posterior y no publica una tabla consolidada, por lo que no se inventan correlatividades.
- DGETP-UTU, cogestora de la carrera, publica sedes en Tacuarembó y Durazno; el catálogo central de Udelar sólo enumera Tacuarembó. Se exponen ambas sedes del mismo plan, sin duplicar la carrera ni crear una trayectoria territorial ficticia.
- Bedelías identifica Plan 2010, mientras el documento académico y las facultades informan aprobación en 2008. La UI conserva 2010 como clave de inscripción y deja trazada la diferencia.
- Registro de auditoría: hash `sha256:2d5acd1ecc337febfa6d18b1f3e9505b46c6cd30b8a792bdbbb2726ac36c6c4e`. Cola actualizada: 138 identidades pendientes, 29 sin composición; hash `sha256:873982255ea63dc0b92214440fae28e065a452fdfe4ade8d75bb8ddfce17942e`.
- Manifiesto UI: 175 proyecciones, 118 con composición y 57 sin composición; hash `sha256:92c53214f1f83ef25055edf74d559955777d1d5844caaf664c70ac35b608beb9`.
- Siguiente paso: auditar Licenciatura en Nutrición Plan 2014, próxima identidad sin composición de la cola reproducible.

### Licenciatura en Nutrición Plan 2014 — ciclos, flexibilidad, previaturas y alcance territorial auditados 2026-08-20

- Escuela de Nutrición mantiene un único Plan 2014, título `Licenciado en Nutrición`, cuatro años, ocho semestres y 360 créditos. La UI incorpora 31 unidades obligatorias o actividades y dos bloques flexibles.
- El egreso exige 190 créditos disciplinares, 30 optativos, 10 electivos, 40 de prácticas articuladoras y 90 de Desempeño Profesional. La malla vigente desagrega estos últimos en Práctica Profesional 45 y Trabajo Final de Grado 45.
- Los créditos optativos y electivos aparecen en el catálogo flexible: no crean un noveno semestre ni se congelan como materias obligatorias las ofertas que Escuela de Nutrición actualiza cada período.
- La cadena de cinco prácticas articuladoras queda automatizada. El ingreso al Ciclo III exige 56 créditos de las unidades obligatorias del Ciclo I; el nuevo soporte de grupos calcula ese mínimo dentro del ciclo y no contra créditos cualesquiera del plan.
- Práctica Profesional exige las 24 unidades disciplinares de los tres primeros ciclos. El inicio del TFG exige Práctica Articuladora V y las obligatorias de ciclos I y II. Las condiciones basadas sólo en haber rendido una evaluación y la defensa final del TFG quedan documentadas sin transformarse en bloqueos más estrictos que la norma.
- La carrera completa se dicta en Montevideo. Paysandú permite realizar únicamente el Ciclo IV de Desempeño Profesional; se muestra como `Paysandú · sólo Ciclo IV` dentro del mismo plan y progreso, no como carrera o trayectoria duplicada.
- Los campos de práctica y los itinerarios flexibles son elecciones personales reorientables y no trayectorias certificadas, por lo que no se crea un selector adicional.
- Registro de auditoría: hash `sha256:3b8744e5f48e13ad1bb2b7112f3f185bc42f9449ebe6322ada44a6eb09123fb6`. Cola actualizada: 137 identidades pendientes, 28 sin composición; hash `sha256:e8ea913bd94da75d35e00f84ca4ee2498c3d42409ce2d41dd0a1d98d585d645c`.
- Manifiesto UI: 175 proyecciones, 119 con composición y 56 sin composición; hash `sha256:4e7a5eb619ae65511a3369e958fcb9eced71ed17657b543927cb460540e588de`.
- Siguiente paso: auditar Licenciatura en Vitivinicultura Plan 2006, próxima identidad sin composición de la cola reproducible.

### Licenciatura en Vitivinicultura Plan 2006 — falso vigente cerrado 2026-08-20

- Bedelías mantiene `current: true` para un Plan 2006 de 150 créditos y sin composición, pero la carrera no integra la oferta de ingreso 2026 de Facultad de Química ni las carreras vigentes de Facultad de Agronomía.
- La admisión oficial localizada corresponde a 2010 y estaba dirigida exclusivamente a Enólogos egresados de UTU. Las estadísticas de Planeamiento registran dos ingresos en 2010, ninguno entre 2011 y 2024, y no enumeran la carrera entre estudiantes activos 2025.
- Se normaliza como licenciatura complementaria histórica compartida por Agronomía y Química. La UI actual deja de ofrecerla y conserva su snapshot y evidencia para una eventual reapertura.
- No se confunde con la opción Fruti-Vitivicultura de Ingeniería Agronómica ni con cursos y posgrados actuales de viticultura o enología; tampoco se reconstruye una malla desde asignaturas sueltas.
- Registro de auditoría: hash `sha256:27dfb30060066e199d81e8444f08353cae611e1341511abf021bf1823d196ee6`. Cola actualizada: 136 identidades pendientes, 27 sin composición; hash `sha256:09d1212fd13432524307ab271e215e0b3ec3e890cc3bcad7dab3cae15f2871b5`.
- Manifiesto UI: 174 proyecciones vigentes, 119 con composición, 55 sin composición y tres identidades históricas excluidas; hash `sha256:604bbbebde697602bc53b3809b9d585a55d45f6c1f53fe3cc0fefb5d4b082033`.
- Siguiente paso: auditar Técnico Rural Plan 1956, próxima identidad sin composición de la cola reproducible.

### Técnico Rural Plan 1956 — registro histórico cerrado 2026-08-20

- El snapshot se contradice: `metadata.current` es `false`, pero `plan.current` es `true`. La historia oficial de Agronomía resuelve que el curso funcionó desde 1956 hasta mediados de los sesenta.
- Era una formación rotativa de tres años: primero en Salto, segundo en Bañado de Medina (Cerro Largo) y tercero en Paysandú. Esas etapas no son sedes actuales ni trayectorias opcionales.
- Se excluye de la UI vigente sin reconstruir una malla incompleta. Registro de auditoría `sha256:380a63dd6593dbb5d133720b6e3448911250d473fdd734a47eafdecbba18d0c6`; cola `sha256:39b71b040e922b2a6b45755dfc2cf8dbc55543aa90a211987ea857a6e41cf947`.
- La UI queda en 173 proyecciones: 119 con composición, 54 sin composición y cuatro identidades históricas excluidas; hash `sha256:196f858d849fee24495eef1e520482fd7d1c5ed313da4a9075ef0b59da05704e`.
- Siguiente paso: auditar Tecnólogo en Gestión Universitaria Plan 2018.

### Tecnólogo en Gestión Universitaria Plan 2018 — malla vigente, libre elección y UPC auditadas 2026-08-20

- FCEA mantiene un único título `Tecnólogo en Gestión Universitaria`, dos años y medio, cinco semestres y 225 créditos en Montevideo. EVA es el entorno virtual de apoyo y no una segunda sede o trayectoria.
- La UI incorpora la grilla oficial actualizada en julio de 2026: diecinueve unidades obligatorias, Pasantía de 20 créditos o Proyecto de Gestión de 10 como alternativas de la Unidad de Práctica Curricular y veinticuatro opciones activas de libre elección.
- El egreso exige 40 créditos de Ciencias Sociales y Humanísticas, 90 de Administración, 20 Jurídicos, 10 Contables, 20 de Integradora, 10 de Métodos Cuantitativos y 35 de libre elección. Los mínimos suman exactamente 225.
- El plan aprobado publicaba 30 créditos de CSH y 45 libres. La grilla vigente redistribuye esos diez créditos a 40/35 sin cambiar el total; la UI prioriza el requisito actualizado.
- Las libres elecciones aparecen también clasificadas por área en la grilla. Como el núcleo obligatorio ya satisface los mínimos de área, la proyección las asigna al bloque libre para impedir que un mismo crédito se cuente dos veces.
- Las opciones `Taller de Cargos y Remuneraciones` y `Transformación Cultural` figuran reconocidas pero sin dictado en 2026, por lo que no integran el catálogo activo.
- Desde septiembre de 2020 FCEA remite las previaturas a cada ficha de curso o a Autogestión. Sin una tabla pública consolidada vigente, no se inventan correlatividades a partir del orden semestral.
- Registro de auditoría: hash `sha256:39a443d47dc111f58b916ad37f4aa84e12e510b30037480fb5220f82760c38aa`. Cola actualizada: 134 identidades pendientes, 25 sin composición; hash `sha256:08e38daf59d930e2fdfa496cf908dec808bd67cfa20dd945d4e45ef94214cb97`.
- La UI conserva 173 proyecciones: 120 con composición, 53 sin composición y cuatro identidades históricas excluidas; hash `sha256:100dea5f22ae08b19a8d87e41627293c85fd52d241bdeb7fff637557e548ec84`.
- Siguiente paso: auditar Licenciatura en Oceanografía Biológica Plan 1978.

### Licenciatura en Oceanografía Biológica Plan 1978 — registro histórico cerrado 2026-08-20

- El snapshot se contradice: `metadata.current` es `false`, pero `plan.current` es `true`. Udelar documenta expresamente que la Licenciatura en Oceanografía Biológica dejó de dictarse y el registro histórico de Facultad de Ciencias acota su funcionamiento a 1978-1994.
- La oferta 2026 de Facultad de Ciencias no incluye ese título. La formación oceanográfica actual integra el tramo flexible de Licenciatura en Ciencias Biológicas Plan 2017 y no prueba continuidad del Plan 1978.
- La nueva Licenciatura en Oceanografía es otra carrera: tendrá base común y cinco orientaciones, con apertura formal prevista para 2027. En 2026 las personas interesadas deben ingresar por Ciencias Biológicas; no se publica anticipadamente una carrera todavía sin inscripción propia vigente.
- Se excluye el Plan 1978 de la UI actual y se conserva el título histórico `Licenciado en Oceanografía Biológica`, sin reconstruir materias desde programas modernos ni mezclar progresos.
- Registro de auditoría: hash `sha256:1aa1d93f4e49efd315d077b6df52bfd8ef7f395ec5400734944f654be441dcfe`. Cola actualizada: 133 identidades pendientes, 24 sin composición; hash `sha256:6cb7440a2175ecb252e699b41492ab2c5b3a45287de18dcc03e3b1f080f2ee4b`.
- La UI queda en 172 proyecciones: 120 con composición, 52 sin composición y cinco identidades históricas excluidas; hash `sha256:8b65438473436aaf684802721117bfdbf29031a4c8b0a506a1b8d1fff3ddacf7`.
- Siguiente paso: auditar Licenciatura en Ciencia Política Plan 2009.

### Licenciatura en Ciencia Política Plan 2009 — ciclos solapables y módulos auditados 2026-08-20

- Facultad de Ciencias Sociales mantiene un único Plan 2009, título `Licenciado en Ciencia Política`, cuatro años y 360 créditos en Montevideo.
- El Ciclo Inicial exige 120 créditos: 48 de Introducción, 26 de Métodos, 8 de Temáticas y 38 optativos. El Ciclo Avanzado aporta los 240 restantes en ocho módulos, incluido un Trabajo Final de 30 créditos.
- La UI usa doce módulos en vez de semestres rígidos. El reglamento permite comenzar el Ciclo Avanzado con 48 créditos iniciales y completar ambos ciclos en paralelo; imponer 120 créditos previos a todo el Avanzado sería más restrictivo que la norma.
- Se incorporaron 27 unidades obligatorias y nueve grupos de alternativas: una introducción, matemática, temática, Instituciones III, Estado IV, Teoría III, técnica cuantitativa, base de análisis económico y modalidad de Trabajo Final.
- Análisis Económico exige elegir Macro o Micro de 4 créditos y completar al menos 6 adicionales. Las seis unidades sugeridas vigentes se muestran como catálogo flexible, sujeto a actualización anual.
- El Trabajo Final permite Monografía o Pasantía Educativa, ambas de 30 créditos. Son modalidades del mismo título y no trayectorias distintas.
- La tabla de previaturas permite rendir si la previa fue promovida, aprobada por examen o conserva condición de reglamentado. Como la UI no representa esta tercera condición, no se reemplaza por una exigencia automática de aprobación.
- Registro de auditoría: hash `sha256:f1b135bf0a7442c41686c40db5e7f75c8a42d9a6d30e97fc0d1d3a90e4cd5cc6`. Cola actualizada: 132 identidades pendientes, 23 sin composición; hash `sha256:765d31f5233ec39552b50f579dc9e3b01cbc8fd1d2c7d3614fdd8a0c983cdfb6`.
- La UI queda en 172 proyecciones: 121 con composición, 51 sin composición y cinco identidades históricas excluidas; hash `sha256:d3e24994ab399e0f939ef7edd6dd9f472c065c30fb926e00abd80a42658dd1fb`.
- Siguiente paso: auditar Licenciatura en Desarrollo Plan 2009.

### Licenciatura en Desarrollo Plan 2009 — módulos y profundizaciones auditados 2026-08-20

- Facultad de Ciencias Sociales mantiene un único Plan 2009, título `Licenciado en Desarrollo`, cuatro años y 360 créditos en Montevideo.
- El Ciclo Inicial exige 120 créditos. El Avanzado suma 240 en Problemas del Desarrollo 60, Profundización Teórica 30, Metodología 30, Taller 30, Módulo Optativo Integral 35 y Práctica Académico-Profesional/Trabajo Final 55.
- La UI ofrece tres profundizaciones actuales del mismo título: Desarrollo Económico, Desarrollo Territorial y Gestión y Políticas Públicas. Comparten el núcleo completo y difieren sólo en los 35 créditos del MOI.
- Cada trayectoria conserva las obligatorias nominales que FCS publica. Las opciones cuya oferta cambia por semestre se representan como bloques flexibles con el crédito exacto restante; no se congelan como obligatorias todas las materias de la nómina 2023.
- Métodos Cuantitativos puede acreditarse en Práctica o en Desarrollo Económico. Si se usa en Práctica, el MOI exige una sustitución metodológica; la proyección mantiene un componente alternativo y evita duplicar una misma materia.
- Las normas vigentes eliminaron las previaturas reglamentadas. La secuencia acumulativa y los conocimientos previos publicados son recomendaciones académicas, no bloqueos automáticos.
- El documento antiguo que enumeraba cinco MOI y uno autoconstruido no prevalece sobre la página institucional actual, que publica tres. Ninguno crea otro título, plan o carrera.
- Registro de auditoría: hash `sha256:324a155771cee681ef8ee9ecfaddf56afdc7cec17cf89429477e427097994b2c`. Cola actualizada: 131 identidades pendientes, 22 sin composición; hash `sha256:1cd11f38d5499743d2b73242def8fe22ab922c571a213197228724d1912964c9`.
- La UI queda en 172 proyecciones: 122 con composición, 50 sin composición y cinco identidades históricas excluidas; hash `sha256:d1f7a92814f362ff02abda7734b004abfc87e8c47115f6f8543b2bcbc6e8645b`.
- Siguiente paso: auditar Licenciatura en Sociología Plan 2009.

### Licenciatura en Sociología Plan 2009 — módulos, Taller Central y egreso auditados 2026-08-24

- Facultad de Ciencias Sociales mantiene un único Plan 2009, título `Licenciado en Sociología`, cuatro años y 360 créditos en Montevideo. No existen trayectorias o títulos diferenciados por tema de investigación.
- El Ciclo Inicial exige 120 créditos: 48 de Introducción, 26 de Métodos, 8 de Temáticas y 38 optativos, incluidos 10 de Teoría Sociológica como opción específica. El Avanzado suma 240 en seis módulos: Teorías 40, Metodología 40, Sociologías Especiales y Temáticas 40, Otras Ciencias Sociales 30, Talleres y Actividades Integrales 60 y Trabajo Final 30.
- La malla incorpora el núcleo obligatorio nominal y conserva como bloques flexibles los 16 créditos de sociologías electivas, 24 de otras ciencias/actividades y dos seminarios-taller de 8. Sus temas y equipos cambian anualmente; congelarlos como perfiles permanentes confundiría una oferta temporal con una trayectoria certificada.
- Taller Central se desarrolla durante tres semestres por 15, 15 y 14 créditos. Para el primero se automatizan el seminario-taller correspondiente, Teoría I y las cuatro metodologías de base; para el segundo se automatizan Taller I, Teoría II y Cuantitativa III.
- Las previas correlativas para rendir Teorías y Metodologías también admiten mantener la condición de reglamentado. La UI no representa ese estado y por eso no lo sustituye por una aprobación obligatoria más restrictiva.
- El Trabajo Final ofrece Monografía Final de Grado o Pasantía Final e Informe, ambas por 30 créditos. Se exige un umbral de 330 créditos previos y la credencial sigue verificando todos los mínimos modulares.
- Las normas históricas mencionan 64 créditos iniciales para inscribirse en Sociología; la página vigente del Ciclo Inicial permite comenzar el Avanzado con 48 y regularizar inscripciones provisorias. La UI informa la diferencia, no bloquea el recorrido por un umbral administrativo ambiguo y conserva los 120 créditos iniciales como requisito de egreso.
- Registro de auditoría: hash `sha256:df12d836df50eb6ab420b11d0c269373a4255c92b8a5722064d7b57286b26f7a`. Cola actualizada: 130 identidades pendientes, 21 sin composición; hash `sha256:0bc664edc606c9d436eb03f1b3a38cd7408de8f037eed066aeb9cbca047c9e96`.
- La UI queda en 172 proyecciones: 123 con composición, 49 sin composición y cinco identidades históricas excluidas; hash `sha256:90c9fc873cfa0afd9588a8a2bc4e4f01be31d420c1a9e8f2d836bc28ae6f69e2`.
- Siguiente paso: auditar Diplomacia Plan 1918, próxima identidad sin composición de la cola reproducible.

### Diplomacia Plan 1918 — antecedente histórico de Relaciones Internacionales cerrado 2026-08-24

- Facultad de Derecho identifica el `Doctorado en Diplomacia`, creado en 1918, como antecedente histórico de Relaciones Internacionales. Fue interrumpido a fines de la década de 1970, restablecido en 1984 como Licenciatura en Comercio Internacional y denominado Licenciatura en Relaciones Internacionales desde 1985.
- El snapshot se contradice: `metadata.current` es `false`, mientras `plan.current` es `true`; no publica composición, créditos, duración ni previaturas. La historia institucional, la oferta 2026 y la matrícula activa 2025 resuelven que no existe ingreso vigente a Diplomacia.
- La UI deja de ofrecer Diplomacia como carrera actual y conserva su título histórico para trazabilidad. No reconstruye una malla de 1918 con cursos modernos ni migra progreso a Relaciones Internacionales Plan 2013.
- La mención de `Doctor en Diplomacia` en la ordenanza electoral reconoce derechos de egresados históricos; no constituye prueba de reapertura o dictado actual.
- Relaciones Internacionales permanece como una identidad vigente separada, con su propio título, plan, credencial y futura auditoría curricular.
- Registro de auditoría: hash `sha256:5b9eeb3db8a2adef68a772d1af3c5d511b112cc62b7d3af17935b7f8dea88228`. Cola actualizada: 129 identidades pendientes, 20 sin composición; hash `sha256:d75be0a355b07894a1794626e2f66d9e9fcf5e578a2382c865ef07a7578acb08`.
- La UI queda en 171 proyecciones: 123 con composición, 48 sin composición y seis identidades históricas excluidas; hash `sha256:901e9b86999ec7cc0b2d2bb9bf5869821c8e4acfaa67f592d81a35bfdcc5275b`.
- Siguiente paso: auditar Licenciatura en Relaciones Laborales Plan 2012, próxima identidad sin composición de la cola reproducible.

### Licenciatura en Relaciones Laborales Plan 2012 — título intermedio, ciclos y egreso auditados 2026-08-24

- Facultad de Derecho mantiene un único Plan 2012 vigente en Montevideo, organizado en cuatro años y ocho semestres. El catálogo central y el snapshot indican 60 meses; la UI prioriza los cuatro años y ocho semestres de la documentación curricular del servicio.
- El plan exige 320 créditos: 80 de Formación Básica, 120 de Estudios Orientados y 120 del Ciclo Profesional. La composición incorpora 27 unidades obligatorias nominales y tres bloques flexibles de 36, 30 y 30 créditos; las opciones concretas pueden cambiar y no se inventa una nómina permanente.
- A los 200 créditos de los dos primeros ciclos —134 obligatorios y 66 opcionales— se representa la credencial intermedia `Técnico Asesor en Relaciones Laborales`, separada de la licenciatura y sin duplicar carrera, plan ni progreso.
- El octavo semestre exige elegir una de tres metodologías y una modalidad de egreso de 30 créditos: monografía, pasantía o acreditación de práctica profesional. Las alternativas comparten una única credencial de `Licenciado en Relaciones Laborales` y no son trayectorias distintas.
- El protocolo vigente permite iniciar la modalidad de egreso estando cursando o habiendo aprobado una metodología. Como la UI no representa inscripción concurrente, informa la condición y evita convertirla en una exigencia automática de aprobación más restrictiva.
- Se automatizaron 14 reglas oficiales. El motor ahora soporta mínimos de cantidad de unidades aprobadas dentro de un grupo: las condiciones del Ciclo Profesional verifican 80 créditos de Formación Básica y nueve asignaturas aprobadas de Estudios Orientados, además de la previa nominal cuando corresponde.
- El régimen transitorio del Plan 1994 estuvo acotado a 2012-2013 y no se publica como trayectoria actual.
- Registro de auditoría: hash `sha256:ddb66774bfa5117d4978469e60e4dd7689204c5a69f08c53c770393d77400010`. Cola actualizada: 128 identidades pendientes, 19 sin composición; hash `sha256:67ada2624832d1639ad64db718a07ae73bbec8312549bb7c8002016b6da0b209`.
- La UI conserva 171 proyecciones: 124 con composición, 47 sin composición y seis identidades históricas excluidas; hash `sha256:7d6a6c4244961e417527fdea3adaa220244a4f197ff1894fd62139b56e9ef324`.
- Siguiente paso: auditar Licenciatura en Comunicación Plan 2012, próxima identidad sin composición de la cola reproducible.

### Licenciatura en Comunicación Plan 2012 — identidad, malla 2019 y siete orientaciones auditadas 2026-08-24

- FIC mantiene un único Plan 2012 vigente, de cuatro años, ocho semestres y 360 créditos. La modificación de 2019 es la malla aplicable a generaciones 2018 y posteriores, no un nuevo plan ni una segunda carrera.
- Las cuatro identidades SGAE se normalizan en una sola carrera: `Licenciatura en Comunicación`. `Licenciatura en Ciencias de la Comunicación` generación 2013, `Comunicación generación 2014` y `Plan 2012 versión 2019` quedan como aliases auditados fuera del selector, con sus snapshots preservados para trazabilidad.
- La UI ofrece las siete orientaciones oficiales —Audiovisual, Educativa y Comunitaria, Investigación y Análisis, Multimedia y Tecnologías Digitales, Organizacional, Periodismo y Publicidad—. Se pueden cambiar durante Profundización o Graduación, comparten sede Montevideo y otorgan el mismo título `Licenciado en Comunicación`.
- La proyección conserva las unidades comunes de la malla, 90 créditos del Ciclo Inicial, 135 de Profundización y 135 de Graduación. Cada orientación completa exactamente 360 créditos mediante bloques flexibles: 16 créditos de orientación en Profundización, 16 en Graduación, 20 de seminarios y 40 de TFG.
- La credencial controla mínimos de 58 créditos en Lenguajes y Medios, 50 en Teoría y Análisis, 50 en Sociedad/Cultura/Políticas, 40 en Metodología y 84 en Profesional-Integral. También exige experiencia de investigación, extensión, práctica preprofesional, una electiva, seminarios y TFG.
- El tránsito se automatiza según las disposiciones vigentes: 45 créditos del Ciclo Inicial para cursar Profundización y 67,5 del Ciclo de Profundización para cursar Graduación. El generador admite declarar una misma condición para un conjunto de objetivos sin duplicar la fuente.
- La malla oficial lista el Curso Introductorio con 2 créditos pero, en el mismo cuadro, fija 72 obligatorios más 18 opcionales para completar los 90 iniciales; las restantes obligatorias ya suman 72. Se conserva como actividad obligatoria de 0 créditos y se documenta la inconsistencia para no contarla dos veces.
- La oferta semestral 2026 contiene optativas con cupos, alternancias y suspensiones. No se convierten en obligaciones permanentes: los bloques flexibles permiten registrar el avance sin confundir oferta anual con estructura del plan.
- Registro de auditoría: hash `sha256:065bc4a92a78f84aafd8d103f326a62c6803aed6d1aefa55e9f3c78043584426`. Cola actualizada: 124 identidades pendientes, 17 sin composición; hash `sha256:343388445792a2888f21715c6dd7a7690a79b4ce11638a2e03ac6a3fc92f9670`.
- La UI queda en 168 proyecciones: 123 con composición, 45 sin composición y nueve identidades excluidas; hash `sha256:ffa9a988b7a5ecd044190a636e6c6c333a3389f2a54d2781ec03ff9eaed4712f`.
- Siguiente paso: auditar `Tecnicatura en Archivo Médico` Plan 2006, próxima identidad sin composición de la cola reproducible.

### Tecnicatura en Archivo Médico Plan 2006 — título histórico convertido cerrado 2026-08-24

- El propio snapshot se contradice: sus metadatos marcan el plan como no vigente, mientras el índice de Bedelías hereda `current: true`; además no publica composición, duración ni carga curricular.
- La Dirección General Jurídica conserva el Reglamento 245, aprobado por Resolución 18 del CDC de 09/12/2008, que convierte los títulos de Técnico en Archivo Médico o Técnico en Registros Médicos al de Licenciado en Registros Médicos.
- Facultad de Medicina publica actualmente una sola Licenciatura en Registros Médicos Plan 2006, de cuatro años y 4.030 horas, con título intermedio de Tecnólogo en Registros Médicos a las 2.980 horas y oferta en Montevideo y Paysandú.
- La UI excluye la Tecnicatura en Archivo Médico como opción actual independiente y preserva el snapshot histórico. No migra progreso ni convierte horas de contacto en créditos sin equivalencia oficial.
- Registro de auditoría: hash `sha256:eda865ecee51cb239667667e7024e68b610119fc3f3c2aaf35e15f2cb8ee3bc2`. Cola actualizada: 123 identidades pendientes, 16 sin composición; hash `sha256:c729c0d91e9eba5f80841180cb2f5e0d20592e75fbfb24d5acfa5ffa91464e09`.
- La UI queda en 167 proyecciones: 123 con composición, 44 sin composición y diez identidades excluidas; hash `sha256:869b635583186e195315ab4c62b025c635c251b330f1e9dbeb83d4b97b7c0cae`.
- Siguiente paso: auditar `Tecnicatura en Electroencefalografía` Plan 1900 y contrastarla con la Licenciatura en Neurofisiología Clínica vigente.

### Tecnicaturas históricas en Electroencefalografía — conversión a Neurofisiología Clínica cerrada 2026-08-24

- El Reglamento 285 de la Dirección General Jurídica, aprobado por Resolución 56 de la Comisión Ejecutiva Delegada de 16/12/2002, comprende expresamente los títulos `Técnico en Electroencefalografía` y `Técnico en Electroencefalografía y Neurofisiología Clínica` y los convierte al de `Licenciado en Neurofisiología Clínica`.
- Los dos snapshots históricos —años administrativos 1900 y 1990— tienen `metadata.current: false`, carecen de composición y contradicen el `current: true` heredado del índice. El valor 1900 no se interpreta como fecha real del plan.
- Facultad de Medicina publica actualmente la Licenciatura en Neurofisiología Clínica: cuatro años, 3.674 horas, Montevideo y actividad académica confirmada en 2026. No publica ninguna de las dos tecnicaturas como ingreso vigente independiente.
- La UI conserva los snapshots para trazabilidad, excluye ambas denominaciones históricas y no migra progreso automáticamente. La licenciatura vigente queda como identidad separada pendiente de auditoría curricular por horas.
- Registro de auditoría: hash `sha256:a0b40ef8dc5eea78c02586100ab9808fa93b690a618100248b118c22d66ebf7e`. Cola actualizada: 121 identidades pendientes, 14 sin composición; hash `sha256:c1196a1a74602cc4d5e61c7a5209fa80cb4217247bb4542b86833c52a99ec9bd`.
- La UI queda en 165 proyecciones: 123 con composición, 42 sin composición y doce identidades excluidas; hash `sha256:2f3fdded84c6ede6a7f50118820b30d816f3549c67b3f3b6c4f8e0b1c51c7b14`.
- Siguiente paso: auditar `Tecnicatura en Fisioterapia` Plan 1901 frente a la Licenciatura en Fisioterapia vigente.

### Titulaciones técnicas históricas de EUTM — nueve conversiones oficiales cerradas 2026-08-24

- Se cerraron conjuntamente Fisioterapia, Fonoaudiología, Instrumentación Quirúrgica, Laboratorio Clínico, Neumocardiología, Oftalmología, Radiología, Reeducación Psicomotriz y Registros Médicos. Sus reglamentos oficiales convierten los títulos históricos a las licenciaturas vigentes de Fisioterapia, Fonoaudiología, Instrumentación Quirúrgica, Laboratorio Clínico, Neumocardiología, Oftalmología, Imagenología, Psicomotricidad y Registros Médicos.
- Los nueve snapshots tienen `metadata.current: false`, carecen de composición y contradicen el `current: true` heredado del índice. Los años 1900/1901 se conservan como claves administrativas y no se presentan como fechas normativas documentadas.
- Instrumentación se resolvió por el título real del snapshot, `Instrumentista Quirúrgico`, que coincide con el Reglamento 324; la etiqueta administrativa `Tecnicatura` no crea una oferta distinta.
- La UI excluye sólo los nueve antecedentes y conserva sus licenciaturas sucesoras. No migra progreso automáticamente ni convierte horas de contacto o U.C.B. en créditos.
- Registro de auditoría: hash `sha256:a351b685381114f9f2c0c48be8790b895c555842dde016a6c8fee122fd68129a`. Cola actualizada: 112 identidades pendientes, cinco sin composición; hash `sha256:f3ff99e7150cc1e118307680ed9891e95a2e34354e79daf9493a4a4d2e966268`.
- La UI queda en 156 proyecciones: 123 con composición, 33 sin composición y veintiuna identidades excluidas; hash `sha256:f69430e7fe77543b4036e309cc9ad10b264cae17716235df34962624be9e688c`.
- Siguiente paso: auditar conjuntamente `Asistente Dental`, `Higienista Dental` y `Laboratorista Dental` Plan 1963 frente a los títulos actuales de Odontología.

### Odontología — certificados de 1963 y Laboratorista Plan 2017 cerrados 2026-08-24

- El Reglamento 237, aprobado por Resolución 14 del CDC de 10/12/2002, canjea los certificados de Asistente Dental, Higienista Dental y Laboratorista Dental de la ex Escuela de Auxiliares del Odontólogo por los títulos de Asistente, Higienista y Laboratorista en Odontología. Los tres snapshots históricos tienen `metadata.current: false`, carecen de composición y quedan fuera del selector.
- Asistente e Higienista conservan sus mallas Plan 2017 ya auditadas. Laboratorista Plan 2017 se completa ahora con 19 unidades o bloques: 89 créditos en primer año, 85 en segundo y 66 en tercero, total 240 y tres años en Montevideo.
- La tabla web trunca Ortopedia II como `1` crédito. Su programa enlazado declara 14 créditos y 128 horas; 14 también reconcilia el subtotal oficial de segundo año y el total del plan.
- Las optativas I, II y III se representan como bloques de 6, 7 y 4 créditos. Sus opciones y previas dependen de la elección concreta, por lo que no se congela una alternativa ni se aplica una previa única falsa.
- El plan distribuye 240 créditos entre seis áreas, pero la malla no publica la correspondencia materia-área. Se conserva la distribución en la auditoría y la UI controla el total sin inventar asignaciones.
- Se automatizan doce previaturas inequívocas. Las condiciones que permiten cursado simultáneo se informan sin transformarlas en aprobación obligatoria.
- Registro de auditoría: hash `sha256:70d357a3190a56d7e8fcf1ced0641238df68dcd56ad760b45ac25ddbc13a48d0`. Cola actualizada: 108 identidades pendientes, una sin composición; hash `sha256:3255cd21aab7ab99aa143a0da907ce31fbb14aec83eaaadd6150fb8052e68332`.
- La UI queda en 153 proyecciones: 124 con composición, 29 sin composición y veinticuatro identidades excluidas; hash `sha256:0d985a9510cbff2e2192ff41b7efd1c07b8e415dcea5688b47bf014206feeda4`.
- Siguiente paso: auditar `Psicología Infantil` Plan 1960, último caso sin composición de la cola reproducible.

### Psicología Infantil Plan 1960 — título histórico convertido cerrado 2026-08-24

- La historia oficial de Facultad sitúa el curso de Psicología Aplicada a la Infancia desde 1950 y el otorgamiento del título de Técnico Universitario en Psicología Infantil desde 1967. El año 1960 del snapshot se conserva como clave administrativa y no se afirma como fecha normativa.
- La Ordenanza 175, texto vigente aprobado por Resolución 16 del CDC de 11/06/2002, incluye expresamente los títulos de Técnico en Psicología Infantil de sus distintas procedencias y habilita su conversión a Licenciado en Psicología.
- El snapshot tiene `metadata.current: false`, composición vacía y `current: true` heredado del índice. Se excluye como carrera actual, sin reconstruir cursos de 1960 con materias modernas ni migrar progreso automáticamente.
- La Licenciatura en Psicología Plan 2013 permanece como sucesora vigente con su malla, 320 créditos y sedes oficiales ya auditadas.
- Registro de auditoría: hash `sha256:cf360bfb1566d396ab00461565527957f3a8686958699c1ac007a545190a20ef`. Cola actualizada: 107 identidades pendientes y ninguna cuya prioridad primaria siga siendo la advertencia cruda del scraper; hash `sha256:18e65a42677d6c999ce8732a154cb197b35d131ff51e6ecce632478939ac73a1`.
- La UI queda en 152 proyecciones: 124 con composición utilizable, 28 todavía sin malla y veinticinco identidades excluidas; hash `sha256:68a96f6384bdca6ac022d620e26aff2aa73512fe70853aa4030e9490d78f863a`.
- La ausencia de prioridad `composition-unavailable` en la cola no equivale a cobertura total de UI: varias auditorías anteriores cerraron identidad, vigencia o sedes sin incorporar materias. El siguiente paso es cerrar primero esas 28 proyecciones vacías —normalizando malla o excluyendo un falso vigente con evidencia— y recién después continuar los 107 contrastes generales desde `Ciclo en Biología Bioquímica` Plan 2016.
- La cobertura funcional se controla por separado en `data/bedelias/inventory/ui-curriculum-queue.json`, reproducible sin red con `node scripts/bedelias-ui-curriculum-queue.mjs`. Esta cola evita que una identidad con auditoría oficial cerrada desaparezca del trabajo pendiente mientras su proyección siga sin unidades curriculares; primero prioriza los 3 casos ya auditados y luego los 25 que también requieren auditoría de vigencia.

### Trabajo Social Plan 2009 — normalización curricular completa 2026-08-24

- La malla oficial vigente de FCS completa el Plan 2009 con el Ciclo Inicial común de 120 créditos y el Ciclo Avanzado de 240 créditos. Se incorporaron 50 entradas: materias obligatorias, alternativas iniciales, bloques optativos por módulo, Proyectos Integrales y Monografía Final.
- Los seis semestres avanzados conservan cargas de referencia de 22, 32, 26, 48, 33 y 49 créditos; los 30 créditos de Monografía completan los 240 del Ciclo Avanzado. Los doce mínimos modulares suman exactamente los 360 créditos del título.
- La oferta nominal de optativas cambia por semestre y no se congela como trayectoria. La UI representa sus mínimos mediante bloques flexibles dentro del módulo correspondiente y mantiene Montevideo/Salto como sedes del mismo plan.
- Quedaron operativas las previas oficiales de Proyecto Integral I y II. La condición alternativa de examen de Teorías Sociales II y los requisitos por ciclos del Trabajo Final permanecen documentados, pero no se endurecen artificialmente mientras el motor no represente condición de reglamentado/promovido ni aprobación por ciclo.
- La cola funcional baja a 27 mallas pendientes: dos identidades ya auditadas y veinticinco que también requieren contraste oficial.

### Profesionalización de Auxiliares de Enfermería Plan 1999 — normalización curricular completa 2026-08-24

- El reglamento vigente de FENF, con modificaciones aprobadas por Resolución 25 del 06/08/2025, publica tres ciclos, seis módulos, 24 unidades, Internado y Trabajo Final de Investigación.
- Los módulos suman 2.885 horas. La UI conserva la carga horaria por unidad y el total, sin convertirla a créditos ni reutilizar los 360 créditos de la Licenciatura Plan 2016.
- Se exige completar las 24 unidades y el Trabajo Final. Quedaron operativas las secuencias de Epistemología, Metodología Científica, Bioestadística y Administración, además de la aprobación de los ciclos I y II para iniciar el Trabajo Final.
- La habilitación condicional entre módulos depende de haber ganado el derecho a examen. Ese estado no existe en la UI y se informa sin transformarlo en una aprobación completa más estricta.
- Montevideo, Mercedes y Colonia del Sacramento siguen siendo sedes de cohortes del mismo programa, sin trayectorias territoriales ficticias. La cola funcional baja a 26 mallas pendientes: Ingeniería Biológica ya auditada y veinticinco identidades que todavía requieren fuentes curriculares oficiales.
- Registro de auditoría: hash `sha256:c68317190ed8cc3bffc65ba0bd8a098fd2348d54c6a955d1cf552fb40c944cf6`. Manifiesto UI: 152 proyecciones, 126 con composición y 26 sin composición; hash `sha256:7a7b2472fa0767b0d6de58e8d471247a2ff4d7238fd538f44cc1dd3111266f2a`. Cola funcional: hash `sha256:08a18f03849e8d07d26292beec46e65f2fcb2e3ee6dd8f4483a5e40c27848d15`.

### Licenciatura en Ingeniería Biológica Plan 2013 — estructura flexible operativa 2026-08-24

- El plan normativo vigente no fija una grilla única. Su anexo describe una implementación inicial expresamente tentativa y sujeta a disponibilidad; la página de ingreso actual sólo publica una sugerencia para el primer semestre. La UI evita presentar cualquiera de esas referencias como una secuencia obligatoria cerrada.
- Se normalizaron diecinueve bloques de mínimos oficiales que suman 360 créditos: 150 de Formación Básica, 70 de Formación Tecnológica Fundamental, 10 de Formación Complementaria, 60 de Formación Tecnológica, y 70 de distribución flexible restante.
- Los 160 créditos de formación específica se conservan como validación manual transversal porque se superponen con los grupos anteriores. Automatizarlos como un nodo acumulable duplicaría créditos y podría conceder una credencial incorrecta.
- La pasantía o actividad equivalente, la tesis y la aprobación del perfil por la Comisión de Carrera también se representan como validaciones manuales obligatorias. Los cuatro requisitos transversales no agregan créditos ficticios.
- Montevideo y Salto ofrecen el tramo inicial; Paysandú ofrece la carrera completa. Son sedes del mismo plan y comparten la estructura oficial, sin trayectorias territoriales inventadas.
- Registro de auditoría: hash `sha256:a270b45545887e54fc5f389808a5f1262995e64ede9654e174fb5116a1074d25`. Manifiesto UI: 152 proyecciones, 127 con composición y 25 sin composición; hash `sha256:daa087b9c72ba47b119f666f1a50968f718c292d6220019f292eae90e3049fda`. Cola funcional: hash `sha256:0bd4861871b32260e610eb061231174e16168eec7f2cb20af6f724c1728e30e7`.
- Las 25 mallas pendientes requieren ahora auditoría de fuentes curriculares oficiales; la siguiente identidad reproducible es Licenciatura Binacional en Turismo Plan 2004.

### Turismo binacional Plan 2004 — identidades históricas cerradas 2026-08-24

- La evaluación institucional de FHCE documenta que la última generación de la Licenciatura Binacional ingresó en 2012. Desde 2014 Salto y Maldonado aplican un único Plan 2014 de Licenciatura en Turismo, exclusivamente de Udelar y sin carácter binacional.
- El cambio de plan también eliminó el título intermedio de Técnico en Turismo. Por tanto, la Licenciatura Binacional y la Tecnicatura Binacional Plan 2004 son dos registros históricos del mismo programa a término, no ofertas vigentes ni trayectorias territoriales.
- La ficha central todavía rotulada `Licenciatura Binacional` y las marcas `current` de Bedelías se consideran desactualizadas frente a la evaluación académica específica, el Plan 2014 y las páginas actuales de CURE y Litoral Norte.
- La UI excluye las dos identidades antiguas y conserva una sola Licenciatura en Turismo Plan 2014, ya utilizable, con Salto y Maldonado como sedes del mismo plan. No se migra progreso automáticamente desde los títulos históricos.
- Registro de auditoría: hash `sha256:ff59d4647aa878f657bb80f89b61b9837aa07e236c1024e865076515331b30e3`. Cola general: 105 identidades pendientes; hash `sha256:ffc35826bbba168a1dba55de2790fffa21f158cad60fed2b05cab021044497e1`.
- Manifiesto UI: 150 proyecciones, 127 con composición, 23 sin composición y veintisiete identidades excluidas; hash `sha256:e372a73d4d52fb697e7841bf81af86ba221102680a8aa2e6819408f7e08862c1`. Cola funcional: hash `sha256:df1317031af5df0f0621c6025a673273e8ad733988d8b6b600c107c05b173ef7`.
- Siguiente paso: auditar las dos tecnicaturas artísticas Plan 2002 de Salto —Dirección de Coros e Interpretación— y contrastarlas con la oferta e ingresos vigentes de Facultad de Artes.

### Tecnicaturas de Música en Salto Plan 2002 — mallas operativas 2026-08-24

- Facultad de Artes y las bases de admisión 2026 confirman la vigencia de Técnico en Dirección de Coros y Técnico en Interpretación en Salto. Interpretación es una sola carrera con opciones Guitarra, Piano y Canto; el selector de opción no duplica plan, sede ni progreso.
- Cada tecnicatura conserva las 32 unidades reglamentarias en ocho semestres y dos ciclos. Dirección usa Taller de Práctica Coral en el segundo ciclo; Interpretación usa Taller de Práctica Docente.
- Facultad resume 360 créditos y el catálogo general de Udelar informa 2.368 horas presenciales/clase, pero ninguna fuente distribuye esos créditos por unidad. La UI permite marcar cada curso y conserva el total mediante un bloque explícito de validación, sin prorratear ni inventar créditos unitarios.
- Para ingresar al segundo ciclo se exige aprobar las dieciséis unidades de los primeros cuatro semestres. También se automatizan la ante-anterior de Lectoescritura y las condiciones adicionales de Dirección Coral IV. El requisito de tener la unidad inmediata anterior reglamentada se informa sin endurecerlo a aprobación completa.
- El reglamento histórico sólo nombra Guitarra y Piano en el artículo del título, pero la oferta y la admisión 2026 incluyen Canto. Se normalizan las tres opciones actuales bajo el mismo título Técnico en Interpretación.
- Registro de auditoría: hash `sha256:8f510dfd32c7bec5f57e781bb07d2f287cf135fd31b945881c4304cbf0a019f6`. Cola general: 103 identidades pendientes; hash `sha256:24509be9577d21c791680dffa588b4b100b30b19bf820ecf01dc57a97de85cf0`.
- Manifiesto UI: 150 proyecciones, 129 con composición y 21 sin composición; hash `sha256:ebfe25b44df0522c46d7ffdaa491776a38d726f03f400e8826d879d856a6194b`. Cola funcional: hash `sha256:e2ac69a8f37ad6a610f2eaff0e424ecab63cbdfb93311deecda6296a23c9d9f0`.
- Siguiente paso: auditar conjuntamente las seis identidades de Facultad de Artes sin composición, comenzando por Creador Plástico Plan 1991 y sus planes sucesores.

### Planes históricos de Facultad de Artes — seguimiento para cohortes existentes 2026-08-24

- La Facultad confirma que todo estudiante puede finalizar la carrera en el plan de ingreso, que el cambio al Plan 2004/2005 es irreversible y que en 2025 todavía organiza exámenes específicos para las Licenciaturas Plan 1987. Por eso Composición, Dirección Coral, Dirección Orquestal y Musicología Plan 1987 no se eliminan: se muestran explícitamente como planes históricos, sin sugerir nuevos ingresos.
- Los cuatro snapshots conservan 129, 122, 119 y 144 unidades respectivamente, aunque el scraper no las había proyectado porque Bedelías no distribuye créditos. El generador incorpora de forma optativa y auditada esos árboles, agrupa sus unidades por año y mantiene cada valor en cero.
- Como la composición administrativa tampoco determina por completo obligatoriedad ni egreso, cada plan exige una validación final manual con Bedelía. No se calculan créditos ficticios, no se convierten materias al Plan 2005 y no se concede automáticamente la credencial.
- Creador Plástico Plan 1991 y Profesor de Solfeo Plan 1967 quedan fuera de la UI actual: ambos tienen `metadata.current=false`, no aparecen en la oferta vigente y el segundo ni siquiera conserva composición. Creador Plástico se preserva como antecedente de Artes Plásticas y Visuales sin migración automática.
- Registro de auditoría: hash `sha256:78a8487ff176b8724079a063244ffe278c70be05e12434646388ff2fcdbab5ff`. Cola general: 97 identidades pendientes; hash `sha256:8f8c0caa3affccb6872449323d6529f14a2a7b3a7c697528ccd8ce0f537ffba7`.
- Manifiesto UI: 148 proyecciones, 133 con composición, 15 sin composición y veintinueve identidades excluidas; hash `sha256:99eb4fb89ff0193382a1f221d9a5b85d4fa3708288f18dfc45b2e15b627cfdc7`. Cola funcional: hash `sha256:7dd405f18c94c376153691abda05d7a0e3ffbf91963912a592038baee0556a0b`.
- Siguiente paso funcional: Tecnicatura en Relaciones Laborales Plan 1995, cuyo snapshot conserva trece unidades sin créditos y requiere auditar vigencia y reglas de culminación.

### Tecnicatura en Relaciones Laborales Plan 1995 — seguimiento histórico operativo 2026-08-24

- Facultad de Derecho rotula expresamente esta propuesta como `plan anterior`, publica sus trece programas y documenta la evolución desde la Tecnicatura creada en 1994 hacia la Licenciatura actual. Los calendarios oficiales todavía incluyeron mesas del Plan 1995 en 2023.
- La UI la conserva como plan histórico para cohortes existentes: cinco unidades de primer año, cinco de segundo y tres de tercero. Los tres mínimos `5+5+3 U.C.B.` de Bedelías obligan a completar las trece unidades.
- El plan no publica créditos. Todas las unidades valen cero en el contador y la duración institucional se conserva en treinta meses; no se prorratean créditos ni se mezcla con la Licenciatura Plan 2012.
- El título `Técnico en Relaciones Laborales` Plan 1995 sigue separado de `Técnico Asesor en Relaciones Laborales`, credencial intermedia de 200 créditos de la Licenciatura Plan 2012. El cambio de plan y sus reválidas continúan siendo trámites individuales.
- Registro de auditoría: hash `sha256:43e40f1187b547181157bc9df5f196fec7124f054f96fbab3f2cb467097acbf4`. Cola general: 96 identidades pendientes; hash `sha256:ada4ab1bae08c60e8cb1d4a14d03257f9c92eb6b5b66e9461ff1ca77ad17e48b`.
- Manifiesto UI: 148 proyecciones, 134 con composición y 14 sin composición; hash `sha256:e3e06111d278797426ccf6e01781e7ffc25bbe325de3eca73f3995f6b50697fe`. Cola funcional: hash `sha256:7e554ee03224d8454a2058bac5a903a73723f996ca15ba800c52bee7def01432`.
- Siguiente paso funcional: Enfermería Universitaria Plan 1983, cuyo árbol conserva 53 unidades sin créditos y debe contrastarse con el plan vigente y el régimen de egreso.

### Enfermería Universitaria Plan 1983 — antecedente histórico cerrado 2026-08-24

- La historia institucional de Facultad ubica a la Escuela Universitaria de Enfermería Dr. Carlos Nery entre 1973 y 1985. El Plan 1983 y su título Enfermero Universitario pertenecen a esa institución predecesora.
- Bedelías conserva 53 materias distribuidas en cuatro grupos, pero marca `metadata.current=false`; los cuatro mínimos son cero U.C.B. y no publica créditos, obligatoriedad ni regla de egreso. El índice que lo marcaba vigente no alcanza para habilitar una malla.
- La oferta y los cronogramas 2026 publican Plan 2016, Plan 1993, Carrera Escalonada y Profesionalización. No publican ingreso, cursado ni exámenes del Plan 1983. La evidencia de egresados históricos tampoco demuestra estudiantes activos actuales.
- La UI excluye el registro Plan 1983 y conserva Licenciatura en Enfermería Plan 2016 como sucesora vigente. Las 53 materias permanecen en el snapshot para trazabilidad; la auditoría deberá reabrirse si Facultad publica continuidad específica para cohortes de 1983.
- Registro de auditoría: hash `sha256:4a9c60498092cf4497039cf142321ded086b36358b0d6a19c137ea9f9c815d5a`. Cola general: 95 identidades pendientes; hash `sha256:99b5e8c4b3ff3856cb84592911247ceedb180ceb6ff2e6154e3e0b5ba32be2c8`.
- Manifiesto UI: 147 proyecciones, 134 con composición, 13 sin composición y treinta identidades excluidas; hash `sha256:b9994022a2bfabe47c1fa0ec3a70ed5860c5b180f476dc162858f2f845513243`. Cola funcional: hash `sha256:04b1ce11396ea8cacdec51fed9c12c494baf1f7b7dbc3d3b2e700c0f4c08c119`.
- Siguiente paso funcional: Letras Hispánicas Plan 1976, contrastando el registro sin composición con la estructura actual y los mecanismos oficiales de transición de FHCE.

### Letras Hispánicas Plan 1976 — título histórico cerrado 2026-08-24

- FHCE publica para Licenciatura en Letras únicamente el Plan 2014 vigente —cuatro años y 360 créditos— y el Plan 1991 anterior. El título Licenciado en Letras Hispánicas permanece reconocido para egresados, pero no aparece como plan ofrecido o utilizable.
- La documentación administrativa histórica identifica Letras Hispánicas como carrera 54, Plan 1976, separada de las claves de Letras. El snapshot conserva ese nombre y título, marca `metadata.current=false` y no contiene materias, créditos, perfiles ni requisitos.
- La UI excluye Letras Hispánicas 1976 y conserva Letras 2014 como carrera vigente. No copia la malla 1991/2014 al registro vacío ni presume equivalencias; cualquier cambio de plan sigue siendo una resolución individual de FHCE.
- Registro de auditoría: hash `sha256:5f362906296a80c7d0424258a595f66bbddb152b7d034eee589476e0d130ce12`. Cola general: 94 identidades pendientes; hash `sha256:d1a8ff0ba91522050887e09afe1890380d804c38a63c0b3c5fb2bed2b10eb650`.
- Manifiesto UI: 146 proyecciones, 134 con composición, 12 sin composición y treinta y una identidades excluidas; hash `sha256:a2d23ee3ed76be76c586b8cb78149bd7ab1cb653df9ab5a446978f145fae8231`. Cola funcional: hash `sha256:49ee9c5bdcac02d882eafe743228598d58544d0e1d0264a7232d65abe28cedc6`.
- Siguiente paso funcional: Tecnicatura en Turismo Plan 1996, contrastando su registro sin materias con la Licenciatura en Turismo Plan 2014 y cualquier régimen oficial de continuidad de FHCE.

### Tecnicatura en Turismo Plan 1996 — oferta itinerante histórica cerrada 2026-08-24

- La historia oficial de FHCE identifica el Plan 1996 como el primer plan formal de Técnico Universitario en Turismo. Se implementó de forma itinerante en Fray Bentos, Colonia y Maldonado, con dos cohortes por sede; no fue una oferta territorial permanente.
- La secuencia institucional continuó con la Licenciatura desde 2005 y con los planes 2010 y 2014. Actualmente FHCE ofrece únicamente la Licenciatura en Turismo Plan 2014 en Salto y Maldonado y no publica ingreso, cursado, exámenes ni estudiantes activos del Plan 1996.
- El snapshot histórico marca `metadata.current=false` y no contiene materias, créditos ni requisitos. Una página heredada menciona una Tecnicatura de 225 créditos, pero no demuestra que esa estructura pertenezca al Plan 1996; por eso no se copia ni se infiere una malla.
- La UI excluye la Tecnicatura 1996 y conserva Turismo 2014 como única oferta vigente. Fray Bentos, Colonia y Maldonado quedan como sedes históricas de cohortes concluidas, no como opciones actuales, y cualquier reválida requiere resolución individual.
- Registro de auditoría: hash `sha256:2df77a67cbff48adad908663d60447e6b9015f96fc09dd14583753f6acc27aa1`. Cola general: 93 identidades pendientes; hash `sha256:630651334afade7a02519970f32677a9f5cb2c608d2332450880091947b55f51`.
- Manifiesto UI: 145 proyecciones, 134 con composición, 11 sin composición y treinta y dos identidades excluidas; hash `sha256:0d8c3f63a16ac30eb906b4e0afe3f7e55d92706872b717caf82b5053002f18de`. Cola funcional: hash `sha256:316ef109936d471aa8873c086d7d09c4a0d2125b028087fe6ae5e420b41172ce`.
- Siguiente paso funcional: Ingeniería en Computación Reválida Plan 1987, para determinar si corresponde a un plan académico histórico utilizable o a una identidad administrativa de reválidas.

### Ingeniería en Computación Reválida Plan 1987 — contenedor administrativo cerrado 2026-08-24

- FING documenta un Plan 1987 académico real bajo la identidad Ingeniería en Computación y publica mecanismos de adaptación y tablas de equivalencias para que sus estudiantes completen estudios con asignaturas del Plan 1997. La carrera `Ingeniería en Computación Reválida` no aparece en la oferta académica.
- El snapshot de Reválida marca `metadata.current=false`, no define título, duración, créditos ni reglas de egreso y reúne 184 materias en dos grupos con mínimos cero. El índice lista además y por separado al verdadero Plan 1987 de Ingeniería en Computación.
- La UI excluye únicamente el contenedor administrativo Reválida: publicarlo permitiría aprobar una falsa carrera sin requisitos y duplicaría Ingeniería en Computación. Se conservan los Planes 1997 y 2025 ya operativos.
- La exclusión no declara extinguido el Plan 1987 real. Los estudiantes de planes previos al 97 son derivados oficialmente a la Comisión de Enseñanza; una eventual malla histórica exige extraer y auditar esa identidad académica y no puede inferirse desde las entradas de reválida.
- Registro de auditoría: hash `sha256:123492637962d586c9e0db9e54df9a16e6c07beb682ff385dccbf9349fd02658`. Cola general: 92 identidades pendientes; hash `sha256:8e4b1c357db51eed1c2d89cf9b65851b34925ceec50228030364b9c92d245552`.
- Manifiesto UI: 144 proyecciones, 134 con composición, 10 sin composición y treinta y tres identidades excluidas; hash `sha256:20e525ff5b9493a630ea165f7cde3d256d945ec20f8e9891819bf31c611b3f0c`. Cola funcional: hash `sha256:0428c20bab76a7ac7a6cdd7c171dff9db65fe259c6b533539f442b552c0732d0`.
- Siguiente paso funcional: cerrar en un lote coherente las nueve carreras de Tecnología Médica Plan 2006 cuya composición no fue publicada por Bedelías, comenzando por Fonoaudiología.

### Tecnología Médica y Obstetra-Partera — nueve mallas oficiales operativas 2026-08-24

- Se completaron Fonoaudiología, Neumocardiología, Neurofisiología Clínica, Oftalmología, Registros Médicos, Terapia Ocupacional, Radioisótopos, Cosmetología Médica y Obstetra-Partera. Las nueve proyecciones usan exclusivamente las tablas curriculares vigentes de Facultad de Medicina y mantienen cero previaturas cuando no existe una publicación oficial completa.
- Los ocho planes horarios no convierten horas ni UCB a créditos: la UI exige aprobar cada unidad oficial y conserva la carga institucional del título. Terapia Ocupacional sí mantiene los 290,5 créditos publicados y representa Opcionales I/II como bloques acreditables, sin inventar una oferta nominal permanente.
- Registros Médicos conserva Montevideo y Paysandú como sedes del mismo plan y habilita el título intermedio Tecnólogo tras los tres primeros años, que suman exactamente 2.980 horas. Obstetra-Partera conserva ambas sedes y la clave Plan 1990 de Bedelías; la discrepancia con referencias administrativas a Plan 1996 queda explícita hasta una resolución inequívoca.
- Fonoaudiología elimina dos filas duplicadas de la propia tabla —Lingüística II y Neuropsicología II— y así reconcilia 4.665 horas. Neumocardiología, Neurofisiología y Cosmetología conservan sin alterar las discrepancias de +42, +60 y +10 horas entre sus tablas y fichas institucionales.
- Radioisótopos suma 2.740 horas exactas; Oftalmología, 3.733; Registros Médicos, 4.030. Cosmetología conserva 35 unidades; Obstetra-Partera, 33 unidades oficiales aun cuando la página publica sus horas en cero.
- Registro de auditoría: hash `sha256:17b61757548aa568d8aced0a807c094dba299815c8b7ddc182fc52e6fa5ccf22`. Cola general: 83 identidades pendientes; hash `sha256:0ab5cda9510dbae9895da5c0e00b1daa3792efa88aa96ff3363c5e19313a9324`.
- Manifiesto UI: 144 proyecciones, 143 con composición, una sin composición y treinta y tres identidades excluidas; hash `sha256:f708c3c1f429a816c11f9b4a8ab0def901e675cbac19eb2771e4d7dea3ec22c9`. Cola funcional: sólo `Tecnólogo Agroenergético` Plan 2008; hash `sha256:9986a1f7b2b58fb9225b5ee6db6354c0b61313317e7e15246c6e4ad9f4e310c1`.
- Siguiente paso funcional: cerrar Tecnólogo Agroenergético Plan 2008, última proyección actual sin malla utilizable; después continuar las auditorías oficiales generales sin reabrir extracciones.

### Tecnólogo Agroenergético Plan 2008 — cohorte histórica cerrada 2026-08-24

- El Plan Estratégico de Desarrollo de Udelar documentó que en 2014 se encontraba cursando la última generación en Artigas. La serie oficial de ingresos registra cuatro cohortes y ninguna desde 2013; las estadísticas de egresos no muestran titulaciones después de 2014.
- La oferta e inscripciones de Facultad de Química 2026 tampoco incluyen Tecnólogo Agroenergético. La página curricular histórica de UTU y los convenios fundacionales se conservan como evidencia de la carrera conjunta en Bella Unión, pero no demuestran cursado ni régimen de egreso actual.
- Bedelías mantiene `current: true`, 36 meses y 321 créditos, pero no publica una sola materia. La documentación universitaria histórica describe tres años y 270 créditos. La discrepancia no se reconcilia porque la cohorte terminó y no existe una malla vigente que habilite una proyección segura.
- La UI excluye la identidad y conserva Bella Unión únicamente como sede histórica. Reabrirla requiere evidencia oficial de una nueva cohorte o de estudiantes activos con régimen de culminación publicado.
- Registro de auditoría: hash `sha256:e08992d94f5f3f15990960160272d4f1172bad51eadd76d9b437d3faa1b4cfbc`. Cola general: 82 identidades pendientes; hash `sha256:ec0aee2dfd3a500339608aeb85b6d209e1c7cd48f093008ac38d7c64ac542c3f`.
- Manifiesto UI: 143 proyecciones, las 143 con composición utilizable, ninguna vacía y treinta y cuatro identidades excluidas; hash `sha256:e94bffd0cb5410f5fe1137b6c3700dbfe800ae99beb26db6ee0180daf3195a48`. La cola funcional quedó vacía; hash `sha256:5d4f7a9cb6c79fa677713fe1afe1a9fc0c2b9e8ad84086381d552ee431eb4978`.
- Siguiente paso: continuar las 82 auditorías oficiales generales de vigencia, títulos, mínimos y reglas; la extracción y la cobertura funcional de mallas visibles ya están cerradas.

### CENUR Litoral Norte — cuatro ofertas vigentes auditadas 2026-08-24

- Se cerraron con fuentes oficiales el Ciclo en Biología-Bioquímica Plan 2016, el Ciclo Inicial de Matemática Plan 2012, la Licenciatura en Ciencias Sociales Plan 2009 y la Tecnicatura en Tecnologías de la Imagen Fotográfica Plan 2008.
- La UI publica Salto y Paysandú para Biología-Bioquímica; Salto para Matemática y Ciencias Sociales; y Paysandú para Fotografía. Son ofertas del mismo plan sin variantes territoriales inferidas.
- Se corrigieron tres metadatos administrativos: Matemática pasa de 60 a 24 meses, Ciencias Sociales de 60 a 48 meses con mínimo de 360 créditos, y Fotografía de 60 a 36 meses. Biología-Bioquímica conserva un año y 90 créditos.
- Ciencias Sociales mantiene la clave administrativa Plan 2009: el plan aprobado, SGAE y llamados docentes recientes sostienen esa identidad, mientras una descripción vigente conserva una referencia contradictoria a Plan 1992; la anomalía queda explícita y no se duplica la carrera.
- Registro de auditoría: hash `sha256:30fc142b8fa93068c1a9b70ffd47c33f2c17616e803d6dc2420782599f7da5c2`. Cola general: 78 identidades pendientes; hash `sha256:8bc7ca01f4f4fab2ac748c2165e93f6e2ebb2e78a0bcba82cceabce7208259c3`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 32 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:4038595050e64a7f261c4f8b6f63be9697479a21017065b57ec1e227e816c37f`. Cola funcional vacía; hash `sha256:6dd51f1e6c481628efeba945a80c7a7af11f2f19dd883d4e9b85afa946c17eae`.
- Siguiente paso: auditar la Tecnicatura Universitaria en Bienes Culturales Plan 2021, primera identidad reproducible restante.

### Tecnicatura Universitaria en Bienes Culturales Plan 2021 — menciones y sedes operativas 2026-08-24

- El plan aprobado por FHCE y el CDC define un único título de Técnico Universitario en Bienes Culturales, cinco semestres y 200 créditos. FHCE certifica una de tres menciones: Historia Regional y Local, Museología o Patrimonio.
- La UI conserva una sola carrera y un solo progreso para Colonia, Paysandú y Tacuarembó. Las tres sedes publicadas por el portal central acceden a las tres menciones; no existe evidencia oficial vigente de una variante curricular o restricción territorial.
- El generador proyecta por primera vez la composición jerárquica completa de Bedelías: 44 alternativas comunes, el bloque integrado específico y únicamente la rama de la mención elegida. Las listas optativas, electivas e integradas siguen siendo catálogos acreditables y no se convierten en una secuencia obligatoria.
- Los requisitos controlan 91 créditos de Historia y Patrimonio, 26 de Museología, 20 de Gestión y Promoción Cultural, 4 de idioma moderno, 29 de formación específica, 20 electivos y actividades integradas de 3+7 créditos. Los mínimos suman exactamente los 200 créditos del título.
- La rama administrativa de 36 créditos de formación específica se descompone conforme al cuadro oficial: 29 créditos específicos y siete integrados. Cuando la fuente no fija una unidad nominal para esos siete créditos, la UI muestra un bloque acreditable y no inventa una materia.
- Registro de auditoría: hash `sha256:ba5adbe2f57d457a1e5f5ae2ef6522a2b7ebabf4dc9ce2cea76fcad5f5aa64d0`. Cola general: 77 identidades pendientes; hash `sha256:75a9accbd8d4a70926afedde314f1623c8c48e3dfa52d2eb914a387e4b94883c`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 33 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:38a3841fa4c10615a866d46a50995c1cb1416d7c62d796950aa832a5879b3d8a`. Cola funcional vacía; hash `sha256:189cea525ce4dd06e66809107faa7c9f80d974fbbf86caab4928dcd737a78f2f`.
- Siguiente paso: auditar el Tecnólogo en Producción Equina Plan 2022, primera identidad reproducible restante.

### Tecnólogo en Producción Equina — plan conjunto y trayectoria sugerida operativos 2026-08-24

- La resolución de ANEP-DGETP y el plan conjunto publicado por IMPO establecen seis semestres, 270 créditos y el título de Tecnólogo en Producción Equina. La UI muestra la denominación oficial Plan 2021 y conserva Plan 2022 sólo como identidad técnica de la oferta de Bedelías iniciada en 2022.
- Se corrigen los metadatos imposibles de Bedelías: seis meses y 225 créditos pasan a 36 meses y 270 créditos. La referencia anterior de Facultad de Veterinaria a 254 créditos se documenta como versión superada por la aprobación de 270.
- El egreso controla 36+15 créditos del eje Básico e introductorio, 122+29 de Producción equina, 32+12 de Formación integral y 24 del Trabajo Final. Los 56 créditos optativos del cuadro oficial cierran el total; la contradicción con la frase narrativa “al menos 55” queda explícita.
- La distribución oficial de seis semestres se publica como trayectoria sugerida, no como orden obligatorio. Las optativas se mantienen flexibles y la unidad Introducción a las Dinámicas Universitarias, incorporada actualmente en Bedelías, queda disponible sin convertirse por inferencia en requisito de egreso.
- La carrera se representa una sola vez con sede Melo, Cerro Largo y sin variante territorial. Las previaturas se limitan a reglas efectivamente publicadas por Bedelías.
- El generador admite correcciones oficiales por código de unidad, orden reproducible de períodos y grupos nominales obligatorios dentro de composiciones jerárquicas; esto evita alterar el snapshot y mantiene trazabilidad entre la fuente administrativa y la normativa.
- Registro de auditoría: hash `sha256:47bee90131fa5750315546f96be45ecf0592e15f18b7bcaa556eb27d098d926a`. Cola general: 76 identidades pendientes; hash `sha256:80b991a370e546248b7bef0819dffe7e048c4335da1923a9c4a168ede4301f6a`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 33 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:3d6393feff5a245eb896dc3347eb0fd64e3fa03b0b02a93baef93a11cdf48555`. Cola funcional vacía; hash `sha256:087f0f4f91f6a3719076bb0957669db45160aef561ef595618d82fb42ca66c82`.
- Siguiente paso: auditar el Tecnólogo en Sistemas Integrados de Producción Agropecuaria Plan 2022, primera identidad reproducible restante.

### TESIPA Plan 2022 — currículo semiabierto y trayectorias operativas 2026-08-24

- El plan de Facultad de Agronomía publicado por IMPO define seis semestres, 270 créditos y una carrera única del CENUR Noreste con Agronomía y Veterinaria como servicios de referencia académica. Las páginas vigentes de ambos servicios y el portal central confirman su dictado en Melo, Cerro Largo.
- El egreso exige 64 créditos en Sistemas Integrados de Producción, 37 en Recursos Naturales y Sostenibilidad, 26 en el módulo Económico-Social, 40 de Actividades Integradoras, 79 optativos/electivos y 24 de Trabajo Final. Los mínimos suman exactamente 270.
- La composición jerárquica de Bedelías aporta 43 unidades y 299 créditos disponibles; no se interpreta como una obligación de aprobarlos todos. Para hacer operable la norma se agregan solamente tres bloques trazables: cinco créditos obligatorios de Sistemas Integrados no individualizados, tres flexibles sujetos a validación y el Trabajo Final de 24 créditos.
- La UI ofrece una trayectoria personalizada y los tres énfasis sugeridos por el plan: Sistemas Integrados de Producción, Manejo sustentable de los Recursos Naturales y Enfoque Económico-Social. Todos conservan el catálogo completo, los mismos requisitos, la misma sede y el mismo título; no se presentan como menciones certificadas.
- Registro de auditoría: hash `sha256:88c29ce1739f8002a7e67bcd0ae27113493f4250c6185e82c7875843cb7871ba`. Cola general: 75 identidades pendientes; hash `sha256:5715a640cce5bf9320222af41e212023223cf15269eac00dd7aac9dffd80484b`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 33 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:0037a5d774256dd1cfbef48c466544db156b2eff1a0aec1e8759bc57fadf7e04`. Cola funcional vacía; hash `sha256:28d783a19e280fe16e224abdf37704be71f61644a39b0ec5a08064ef2625cf62`.
- Siguiente paso: auditar la Licenciatura en Educación Física Plan 2014, primera identidad reproducible restante.

### Licenciatura en Educación Física, opción Prácticas Educativas — Plan 2014 operativo 2026-08-24

- El programa conjunto ANEP-CFE/Udelar-ISEF define un título propio —Licenciado en Educación Física, opción Prácticas Educativas—, cuatro años, ocho semestres y 360 créditos. Es una propuesta radicada en Rivera con estructura normativa distinta del Plan 2017; no se deduplica como otra sede de ese plan.
- La continuidad académica está respaldada por la publicación vigente del plan y reglamento de ISEF, actividad docente planificada para 2025 y trámites estudiantiles del Plan 2014 resueltos en 2025. La evidencia no acredita una nueva cohorte de ingreso, pero sí justifica conservarlo para estudiantes activos.
- La UI controla 304 créditos obligatorios: Deportes 64, Educación 130, Prácticas Corporales 34, Salud 50 y Tiempo Libre y Ocio 26. Exige las 33 unidades nominales del anexo oficial y organiza las prácticas docentes I, II y III como cursos anuales dentro de la trayectoria de ocho semestres.
- Los 56 créditos optativos o electivos se seleccionan del catálogo acreditable de Bedelías; sus 406 alternativas acumuladas no se convierten en obligaciones. Como la composición no clasifica de forma suficiente todos los casos, queda una validación explícita de Bedelía para el 40% relacionado con Educación y los 10 créditos de extensión, investigación o enseñanza.
- Registro de auditoría: hash `sha256:4cd79081109ed7389250358058aee2c1da21493d1968da8711ad653e29dacee5`. Cola general: 74 identidades pendientes; hash `sha256:a30aa9eb53f13321a9d2c29d6e4c7ba1fbf38de219af34c38a5d27be5d00ab4a`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 33 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:b75b21e2a05b8b4442ba3d7cb9afedb6f795f684e3fd68952c3f6ba181c4bda1`. Cola funcional vacía; hash `sha256:e4832409b097b7f1872f7ad458bde84cbb863fdc9ef409ecdcd4bb12ceeaa0f2`.
- Siguiente paso: auditar la Licenciatura en Recursos Naturales Plan 2010, primera identidad reproducible restante.

### Licenciatura en Recursos Naturales Plan 2010 — currículo flexible por áreas operativo 2026-08-24

- El plan aprobado por el CDC y publicado en Diario Oficial define un título único de Licenciado en Recursos Naturales, 360 créditos y dictado íntegro en Rivera bajo Facultad de Ciencias. La página vigente de Facultad mantiene inscripciones, cuatro años y las siete áreas del plan; Planeamiento registra actividad estudiantil en 2025.
- Se normaliza la duración a 48 meses conforme al plan y a Facultad de Ciencias. Los 60 meses del portal central y de Bedelías quedan documentados como metadato administrativo contradictorio.
- La UI controla mínimos de 50 créditos Físico-Matemáticos, 75 Químico-Biológicos, 40 de Geociencias, 65 de Recursos Naturales, 38 de Ciencias Sociales, 15 optativos y 40 de Tesina. Esos mínimos suman 323; el título exige 360 y los 37 restantes se distribuyen en el currículo personal coherente aprobado por la Comisión de Carrera.
- Las 378 unidades y 2.811 créditos visibles en la composición son un catálogo acumulado por áreas, no una malla obligatoria completa. La Tesina de Graduación queda como requisito nominal y se agrega una validación final explícita de la Comisión de Carrera, sin inventar materias ni secuencia semestral.
- La Tecnicatura en Gestión de Recursos Naturales continúa como carrera y título separados: su articulación permite continuar estudios, pero no se presenta como credencial intermedia automática del Plan 2010.
- Registro de auditoría: hash `sha256:7b5cd949953296be18fe5fc9f7efc6436ad18acb689b022158e6ed33e076b1c0`. Cola general: 73 identidades pendientes; hash `sha256:ba8b77c2aa59b0e286b2d684aa22c91ed5f0b2db09f0c9d05a666e924018c137`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 33 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:03eb10a533735326c3bfe03caf29e466fc26f6784f8823099e4e7a9e401760b3`. Cola funcional vacía; hash `sha256:4d2e512ef0dc57f9ca9a8a17d64982fb9a3bb01c28d57f2e9155131c893816fa`.
- Siguiente paso: auditar la Tecnicatura en Artes Plásticas y Visuales Plan 2017, primera identidad reproducible restante.

### Tecnicatura en Artes Plásticas y Visuales — planes territoriales de Rocha y Rivera operativos 2026-08-24

- Facultad de Artes publica una única carrera y el mismo título `Técnico Universitario en Artes - Artes Plásticas y Visuales`, con dos planes vigentes y territorialmente radicados: Plan 2013 en Rocha y Plan 2017 en Rivera. Ambos duran tres años, se organizan en seis semestres y exigen 240 créditos.
- La UI agrupa ambos bajo una sola Tecnicatura y conserva dos opciones de plan independientes. No crea carreras duplicadas, no ofrece una sede incompatible con el plan elegido y no mezcla como trayectoria los cursos específicos de Rocha y Rivera.
- El Plan 2017 exige catorce unidades nominales y un seminario de 5 créditos en el tercer semestre. Bedelías ofrece allí `SPAF` y `Seminario I Maquillaje`; la UI los presenta como alternativas y no exige los dos, evitando elevar falsamente el total a 245 créditos.
- El Plan 2013 exige sus quince unidades oficiales. `INUNI` de 4 créditos y `Botánica y Arte` de 0 créditos aparecen en Bedelías pero no en la grilla oficial: permanecen visibles como oferta complementaria sin contar para el título ni sustituir la Introducción a la Universidad oficial de 2 créditos.
- Registro de auditoría: hash `sha256:9d2c0b740b123206dd85e113c9fb2e26190780ee16385f39bf6ac98cb6dc0d16`. Cola general: 71 identidades pendientes; hash `sha256:d2c72b71a991bdc966b5f4f7344c7472a55965bcf16bdf70a2ced01bffd02c26`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 33 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:bf6ecac1e0d02c1b8212559bdbee11da216a0ec8788f1a8681efe885fa619aec`. Cola funcional vacía; hash `sha256:ffdac73966bdd484be4573682ec65d8e5fac682aa81ccb042d812af8b611ab69`.
- Siguiente paso: auditar la Tecnicatura en Gestión de Recursos Naturales Plan 2011 y contrastar su articulación con la Licenciatura Plan 2010 sin convertirla en título intermedio automático.

### Tecnicatura en Gestión de Recursos Naturales Plan 2011 — currículo flexible operativo 2026-08-24

- La Resolución 33 del CDC de 07/06/2011 aprobó el título `Técnico en Gestión de Recursos Naturales y Desarrollo Sustentable`: 195 créditos, con mínimos de 50 en Conceptuales-Operativas, 50 en Diagnóstico, 50 en Aplicación, 35 de Trabajo Final o pasantía y un máximo de 10 optativos.
- Facultad de Ciencias y Planeamiento publican una duración de dos años y medio y sede Rivera. La UI normaliza a 30 meses y documenta como metadato administrativo contradictorio los 60 meses de Bedelías y del portal central.
- El plan declara las asignaturas de cada eje como ejemplos ilustrativos. Por eso las 75 entradas y 535 créditos visibles por caminos de composición se conservan como catálogo acreditable y no se convierten en una malla que deba aprobarse completa.
- El contador controla los tres mínimos, el Trabajo Final nominal y 195 créditos totales. Como el modelo no limita máximos por nodo, agrega una validación explícita de Comisión de Carrera para el máximo de 10 optativos y la pertinencia del currículo.
- La tecnicatura mantiene carrera, plan y título propios. Su articulación con la Licenciatura en Recursos Naturales permite continuidad académica, pero no se presenta como una credencial intermedia automática de la Licenciatura Plan 2010.
- Registro de auditoría: hash `sha256:c6a3d260538bebc1071b3708977a1b35eb1c873fee54ac30fc4b011dd3eae06d`. Cola general: 70 identidades pendientes; hash `sha256:1dbf39afcacf8d4e5d95495fd27e6218316c30c8ddb973750f6ad41c483a8174`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 33 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:086d19650ab13c707522c76564c0b1a92f16fb0d52cd30cc8406a6e43bdf20db`. Cola funcional vacía; hash `sha256:4bbcb78107625ee3d2a05eaa561b05157612a396de3f6c75f8871c15af554b01`.
- Siguiente paso: auditar el Tecnólogo en Madera Plan 2012, primera identidad reproducible restante.

### Tecnólogo en Madera — plan conjunto y currículo flexible operativo 2026-08-24

- El plan conjunto de Facultad de Ingeniería, Facultad de Agronomía y DGETP-UTU aprobado por el CDC define el título `Tecnólogo en Madera`, seis semestres y 270 créditos, con dictado en Rivera. La UI muestra la denominación normativa Plan 2011 y conserva Plan 2012 solamente como identidad técnica de la oferta iniciada en Bedelías.
- El egreso controla 22 créditos de Matemática, Estadística y Control de Procesos, 27 de Procesos Físicos, 45 de Procesos Biológicos y Químicos, 110 de Formación Tecnológica —incluidos los 66 del eje común— y 34 de Formación Complementaria. También exige el Taller Introductorio, las diez unidades del eje tecnológico común, los tres talleres complementarios y la Pasantía o Proyecto.
- Las combinaciones por Gestión de la Producción, Secado y Energía y Tecnología de la Madera son ejemplos de currículos tipo; no se publican como menciones ni trayectorias certificadas. El catálogo de 63 unidades y 406 créditos se mantiene flexible, y la Comisión de Carrera valida la coherencia del currículo individual que completa los 270 créditos.
- La composición jerárquica de Bedelías aporta 63 unidades distintas y 406 créditos disponibles. La proyección verifica unicidad por código y nombre y conserva su ubicación curricular específica, sin confundir la repetición visual de los caminos padre e hijo con materias adicionales.
- Se corrigen los metadatos administrativos de 60 meses a 36 meses y se documenta el carácter conjunto del título. Rivera es la única sede oficial; no aparece un selector territorial innecesario.
- Registro de auditoría: hash `sha256:8adf9c544e85b15c6e90e4c7f97684a98564ffe553c71539c3401740cecec116`. Cola general: 69 identidades pendientes; hash `sha256:b92972418a4285fdea43da332bc12256c296b0b2862e49f5d5d840dc2f6f240b`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 33 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:1ea058dc8739c532aff3e5154ebc80c7c1d712d4554473ae78debac6523d3c55`. Cola funcional vacía; hash `sha256:0f041ae18183170d820e8e3af1acd25cc5933204b3bbdcee3a0e9f73a8e70065`.
- Siguiente paso: auditar la Licenciatura en Diseño de Paisaje Plan 2008, primera identidad reproducible restante.

### Licenciatura en Diseño de Paisaje — plan conjunto y currículo por ejes operativo 2026-08-24

- El plan aprobado por el CDC el 18/12/2007 define una licenciatura conjunta de FADU y Facultad de Agronomía, ocho semestres, 360 créditos y sede Maldonado. La UI muestra Plan 2007 y conserva 2008 únicamente como identidad técnica del inicio del dictado y de Bedelías.
- La norma distribuye 103 créditos en Ciencias, Técnicas y Tecnologías, 162 en Prácticas Proyectuales, 45 en Teoría e Historia y 50 optativos. Bedelías separa el Taller Transversal de 6 créditos y descuenta dos de cada eje común: la UI controla la implementación equivalente 6+101+160+43+50, que suma exactamente 360.
- La composición conserva 302 unidades y 2.450 créditos como catálogo acreditable. Once optativas externas no aparecen en el índice resumido de cursos, pero la composición las identifica con su servicio y código; se mantienen disponibles sin convertir el catálogo acumulado en obligación de aprobarlo completo.
- El plan declara flexibilidad e individualidad curricular. No se publican perfiles ni menciones certificadas: una validación explícita representa la aprobación de la Comisión de Carrera sobre el balance de los 360 créditos y la orientación elegida.
- Maldonado es la única sede completa vigente. La carrera se agrupa bajo FADU, registra su carácter compartido con Agronomía y no muestra un selector territorial innecesario.
- Registro de auditoría: hash `sha256:c9f8a72c26b9add120177645cee2e795edacd5faf27caa078ccb4841a4312271`. Cola general: 68 identidades pendientes; hash `sha256:6067912f1a617d0e2dcf9687281ea47af2d47767b6bfdc30b7411e8cbaab29b1`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 33 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:e5f5b195da5b223a18bb1bb2cfb2c7c8b6682021c1d04b9c0fd7d6314cdde78f`. Cola funcional vacía; hash `sha256:9a5e4a8f211fb8a49a711656be2c47347b7b94aeafd9fd5d4e9dda2ae6409804`.
- Siguiente paso: auditar la Licenciatura en Turismo Plan 2014, primera identidad reproducible restante.

### Licenciatura en Turismo Plan 2014 — dos sedes y currículo modular operativo 2026-08-24

- FHCE confirma un único Plan 2014 de ocho semestres y 360 créditos aplicado en Maldonado y Salto. La UI ofrece ambas sedes sobre la misma carrera y el mismo progreso; el ingreso directo alterna por año, pero no existe una variante curricular territorial.
- El egreso controla 67 créditos introductorios, 57 instrumentales, 91 de Conceptualizaciones y Enfoques, 69 operativos, 46 del Espacio de Aplicación Turística y 30 de Tesina. Los seis mínimos suman exactamente 360 créditos.
- Se exigen las veinte obligaciones nominales del anexo mediante grupos que reconocen códigos equivalentes por sede o generación. Esto incluye lenguas, metodología, el núcleo de turismo, Seminario, Taller de Investigación, Proyectos Turísticos, Práctica Profesional y Tesina sin exigir versiones duplicadas de una misma unidad.
- La composición aporta 382 unidades y 2.942 créditos como catálogo acumulado. Los grupos modulares permiten completar sus mínimos con optativas; las electivas generales cuentan para el total, pero su asignación a módulo queda como validación explícita de la Comisión de Carrera.
- El perfil propio que forma cada estudiante mediante el 30% flexible no se publica como mención certificada. La Licenciatura Binacional y el título intermedio de Técnico en Turismo permanecen excluidos: FHCE documenta que dejaron de existir al aplicarse el Plan 2014 común.
- Registro de auditoría: hash `sha256:6a703dcb8672f427bec3cb143ce13bc1be44eb8f6263f29a953692d93ba91d54`. Cola general: 67 identidades pendientes; hash `sha256:a969a6dae18484ceb986ff63603e4e4e0689729378db1774ddb9409c504d4ea2`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 34 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:40a5f692485b5fe16f0845b7b31ab1f61034129511c1b7d75ec6391da5e51e1a`. Cola funcional vacía; hash `sha256:02f254b6f50a81b62bfa764890f3aa97eaca34bf2eef9bac99f30ff1ec57b57d`.
- Siguiente paso: auditar el Tecnólogo Minero Plan 2013, primera identidad reproducible restante.

### Tecnólogo Minero — plan conjunto, catálogo flexible y trayectoria sugerida operativos 2026-08-26

- El CDC aprobó el Plan 2012 como carrera conjunta de Facultad de Ciencias, Agronomía e Ingeniería. Facultad de Ingeniería y CURE confirman tres años o seis semestres, título de Tecnólogo Minero y dictado exclusivo en Treinta y Tres; la UI conserva 2013 sólo como identidad técnica del comienzo de la oferta en Bedelías.
- La implementación vigente de CURE y Bedelías exige 272 créditos. El texto aprobado dice 270: la discrepancia queda visible y no se fuerza una conciliación ficticia. La UI controla 40 créditos de Matemática-Física-Química, 70 de Geología, 40 de Prospección y Exploración, 50 de Explotación y Beneficiación, 20 de Ambiental y Seguridad, 20 de Humanística y 15 de Pasantía.
- La secuencia de seis semestres del plan se publica como trayectoria sugerida para ingreso desde CIO, no como una malla rígida. Las demás unidades permanecen en un catálogo flexible orientado por tutor; la Comisión de Carrera valida el currículo de 272 créditos y la condición transversal de al menos 10 créditos de formación social-productiva o cursados en otros servicios.
- La Pasantía de 15 créditos es una obligación nominal de egreso. Los 47 cursos visibles suman 398 créditos de oferta potencial y no deben aprobarse completos.
- Bedelías duplicaba Sistemas de Información Geográfica bajo `TMM32` y `TM32`, con el mismo nombre, área y tres créditos. La proyección conserva una sola unidad `TM32` y documenta el alias administrativo.
- Registro de auditoría: hash `sha256:39c182dc1393dcb4cfc03d4be27388ad6b619efc692c3da428484680e20943d0`. Cola general: 66 identidades pendientes; hash `sha256:7f8ee2643337d063e7e9c4e0a0f39e574da001c59a328b53233d2d18c9931e8a`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 34 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:f0571ff0244c107023df5454eb24d943b56bc79eb15826f8247b81748dfa3021`. Cola funcional vacía; hash `sha256:9f98a2f5e4795cde1c6091970f93d2d3cb1a34e9e66de47c3fce0e17a12342d0`.
- Siguiente paso: auditar la Licenciatura en Economía Agrícola y Gestión de Agronegocios Plan 2022, primera identidad reproducible restante.

### Licenciatura en Economía Agrícola y Gestión de Agronegocios — menciones acreditadas operativas 2026-08-26

- FCEA y el portal central confirman una única Licenciatura Plan 2022, cuatro años, 360 créditos y sede Tacuarembó. El reglamento vigente establece un solo título; Bedelía expide una constancia de la mención elegida.
- La UI ofrece Mención en Investigación y Mención Profesional como trayectorias del mismo plan y conserva el progreso compartido al cambiar entre ellas. No crea carreras, planes ni títulos duplicados.
- Investigación controla 15 créditos de Actividades Integradoras, 90 de Administración, 30 de Ciencias Sociales, 20 de Contabilidad, 100 de Economía, 90 de Métodos Cuantitativos y 15 de Opción Libre. Profesional controla 10, 100, 10, 80, 75, 60 y 25 respectivamente; ambos conjuntos suman exactamente 360.
- También se controlan los submínimos obligatorios y opcionales de Administración, Economía, Métodos Cuantitativos y Contabilidad. El subgrupo cuantitativo opcional de Investigación exige cinco créditos pero no enumera materias; se controla mediante el mínimo raíz de 90 y el piso obligatorio de 85, sin inventar una unidad.
- Los 135 nodos administrativos de composición se normalizan a 70 materias distintas y 632 créditos de oferta potencial. Las materias repetidas entre perfiles comparten identificador y progreso; `FCEA-A10`, `CURE-A10TM`, `FCEA-MC30` y `CURE-MCC30` permanecen diferenciadas.
- Registro de auditoría: hash `sha256:6490ad7dc3f06b10f7dcae291ae60e76f96d6c98e63dc5c07efad7699e772135`. Cola general: 65 identidades pendientes; hash `sha256:8245d09b212280dcfdca3460bedc560b5da7b12201ef345b49e8a84c5295eb54`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 34 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:2d450705a6c481fdd09ef76f83ccfaf77aa953cb0979361da48f330fa2aa3856`. Cola funcional vacía; hash `sha256:d0ac7605c289d9c64d083c2a75151664e40b886b343473e46e30e22a853f9fcc`.
- Siguiente paso: auditar la Licenciatura en Arte Digital y Electrónico Plan 2013, primera identidad reproducible restante.

### Licenciatura en Arte Digital y Electrónico — Plan 2014 y bloques oficiales operativos 2026-08-26

- El plan aprobado por el CDC y publicado en el Diario Oficial define seis años, 480 créditos y el título de Licenciado en Arte Digital y Electrónico. La oferta vigente de Facultad de Artes confirma la continuidad de la carrera en Montevideo.
- La UI muestra Plan 2014, año de aprobación y registro en la oferta académica, y conserva 2013 sólo como identidad técnica de la versión definitiva cargada en Bedelías. También corrige la duración administrativa de 60 a 72 meses.
- Los dos períodos insumen 240 créditos cada uno. La proyección controla seis años de 80 créditos y 18 bloques: taller y optativas del primer período; Estéticas III, TPLOEP, Lenguajes Computarizados y optativas en cuarto y quinto; y Estéticas III, TPLOEP, Lenguajes Computarizados y Trabajo Final en sexto.
- La composición administrativa suma mínimos por 410 créditos: omite 45 optativos o electivos del primer período y 25 del segundo. La proyección restituye esos 70 créditos desde el plan oficial y suma exactamente 480.
- Los talleres paralelos y la oferta acumulada de electivas no se transforman en materias obligatorias. Cada elección se representa como bloque acreditable del año correspondiente y la oferta nominal queda sujeta a validación de Bedelía.
- Registro de auditoría: hash `sha256:3d50435d993346cb49b9ea074246e6d85746b47d6086a58d602cc91f7a67d634`. Cola general: 64 identidades pendientes; hash `sha256:abeb636cf30f52dbe2b42702ce44336227d5b667d8ebad5f1399fce6cf7fac9c`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 34 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:85688b040c6a84743dc966dec32f47ae24dd4afa4d3bc4a9c9fe9d33762a784a`. Cola funcional vacía; hash `sha256:174f5d7490c616231a32155820a436d8b053c0bd985d5a298172cf691205ace1`.
- Siguiente paso: auditar la Licenciatura en Artes – Artes Plásticas y Visuales Plan 2002, primera identidad reproducible restante.

### Licenciatura en Artes – Artes Plásticas y Visuales Plan 2002 — orientación flexible operativa 2026-08-26

- El plan aprobado por el CDC y la oferta 2026 de Facultad de Artes confirman seis años, 330 créditos, el título de Licenciado en Artes – Artes Plásticas y Visuales y dictado en Montevideo.
- La UI corrige la duración administrativa de 60 a 72 meses y controla dos períodos de 165 créditos mediante seis años de 55.
- El Primer Período exige el Taller de los Fenómenos de la Percepción y Lenguajes y los Seminarios-Taller de las Estéticas I y II. El Segundo Período distribuye los 15 créditos de Estéticas III en tres niveles, exige talleres de 50, 50 y 30 créditos y cierra con el Trabajo Final de Egreso de 20.
- La composición jerárquica de Bedelías conserva correctamente mínimos por 330 créditos, pero la proyección plana anterior sumaba 630 porque trataba varias cátedras históricas de TPLOEP como obligaciones simultáneas. La proyección auditada usa un solo bloque elegible por año y no congela la nómina docente como perfiles certificados.
- Registro de auditoría: hash `sha256:1ebfabeb3c033beb5a6ae3ea6e20fe5e78c081b7e8b83d69428971b029b43ea9`. Cola general: 63 identidades pendientes; hash `sha256:afb583687980dc0d56ab2083f692f9bc06da4edf4162a6e248e884c94eb203fb`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 34 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:d8dc0373e9973435541060d5dffbdacb2a80a1e7177beef3b55c00aa9253b671`. Cola funcional vacía; hash `sha256:57bba40bbeb47edb0eb4fee21a03de18c76149900e2982388fc22948ab660ec6`.
- Siguiente paso: auditar la Licenciatura en Artes – Cerámica Plan 2002, primera identidad reproducible restante.

### Licenciatura en Artes – Cerámica Plan 2002 — Artes del Fuego operativa 2026-08-26

- El plan aprobado y la oferta 2026 de Facultad de Artes confirman seis años, 330 créditos, el título de Licenciado en Artes – Cerámica y dictado en Montevideo. La UI corrige la duración administrativa de 60 a 72 meses.
- El Primer Período exige el Taller de los Fenómenos de la Percepción y Lenguajes y los Seminarios-Taller de las Estéticas I y II. El Segundo Período distribuye los 15 créditos de Estéticas III en tres niveles y cierra con el Trabajo Final de Egreso de 20 créditos.
- Cuarto, quinto y sexto exigen un único taller de libre orientación de 50, 50 y 30 créditos, respectivamente, con actividades del Área Asistencial de Artes del Fuego. Los módulos técnicos se actualizan por edición y no constituyen carreras, perfiles o trayectorias separados.
- La composición jerárquica de Bedelías conserva correctamente mínimos por 330 créditos, pero la proyección plana anterior sumaba 575 al tratar cuatro cátedras alternativas de cada año como obligaciones simultáneas. La proyección auditada usa diez bloques normativos que suman exactamente 330 y no congela la nómina docente.
- Registro de auditoría: hash `sha256:c43973bcbcbb1828843f509a7cd64be9ce5dd9a0a8b1557692a505e3397c88ba`. Cola general: 62 identidades pendientes; hash `sha256:28f2ff21327b8d018eebd988cdafe01255d5111b6255a90fbc0b3d8584c3858a`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 34 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:58ec27bae47850e0c5b30ad0185cd812f8296a7a5c44b19d77c8f6820a8df6d3`. Cola funcional vacía; hash `sha256:24b557a860165e1a9f4a124fb7ca9a0519586cac564be708821c687583d6e75a`.
- Siguiente paso: auditar la Licenciatura en Artes – Dibujo y Pintura Plan 2002, primera identidad reproducible restante.

### Licenciatura en Artes – Dibujo y Pintura Plan 2002 — Plano en el Espacio operativo 2026-08-26

- El plan aprobado y la oferta 2026 confirman seis años, 330 créditos, el título de Licenciado en Artes – Dibujo y Pintura y dictado en Montevideo. La UI corrige la duración administrativa de 60 a 72 meses.
- La proyección controla seis años de 55 créditos. En cuarto, quinto y sexto combina cinco créditos de Estéticas III con un solo bloque de taller de 50, 50 y 30 créditos, respectivamente, y exige el Trabajo Final de Egreso de 20 créditos.
- Las actividades del Área Plano en el Espacio y el plan de trabajo individual orientan el cursado dentro de la misma opción. No crean menciones, perfiles, títulos o trayectorias certificadas y no congelan los cursos opcionales de una edición.
- La composición jerárquica de Bedelías conserva mínimos por 330 créditos, pero la proyección plana anterior sumaba 575 al acumular cátedras alternativas. Los diez bloques normalizados suman exactamente 330.
- Registro de auditoría: hash `sha256:9c4dc57d2dfa15a17e43c634d319454b8d963104a37552b89d066ae03a0f2877`. Cola general: 61 identidades pendientes; hash `sha256:dd0587889042feece52dfd8e8342e42de24c75fb276010b895cd9e8b848767d8`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 34 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:f8a5f9c2b4d9b829ec458129682129beda3d338f20a8dc1979621241b4148da2`. Cola funcional vacía; hash `sha256:202f5cf58e3c125dba9c8c9e5e3a6018a82104e26299cd335fc29f65eddce030`.
- Siguiente paso: auditar en el mismo lote Diseño Gráfico, Escultura y Volumen en el Espacio y Fotografía Plan 2002.

### Licenciatura en Artes Plan 2002 — opciones técnicas restantes operativas 2026-08-26

- Los planes oficiales y la oferta 2026 confirman Diseño Gráfico, Escultura y Volumen en el Espacio y Fotografía como opciones vigentes de la Licenciatura en Artes en Montevideo, cada una de seis años y 330 créditos.
- Las tres proyecciones controlan seis años de 55 créditos con diez bloques normativos: el Primer Período común, Estéticas III durante los tres años avanzados, talleres de 50, 50 y 30 créditos y el Trabajo Final de Egreso de 20.
- Artes Gráficas, Volumen en el Espacio y Foto-Cine-Video son áreas asistenciales dentro del bloque anual. Sus secciones, talleres técnicos, módulos y opciones cambian por edición y no se publican como carreras, menciones o trayectorias certificadas.
- La proyección plana anterior sumaba 685 créditos en Diseño Gráfico, 585 en Escultura y 575 en Fotografía al acumular alternativas. La composición jerárquica conserva el total correcto; las mallas normalizadas suman exactamente 330 cada una. En Diseño Gráfico se documenta además el grupo padre del Primer Período que dice 55 aunque el ciclo y sus tres años exigen 165.
- Registro de auditoría: hash `sha256:959bb8f542514553daa5e4e586720eb004366d0520a57600a65757c6c667a11f`. Cola general: 58 identidades pendientes; hash `sha256:0e2365c90fe854cf653e7a92db047a979d58ac974178714262fcf1fcb4760980`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable, 34 con más de una sede oficial y treinta y cuatro identidades excluidas; hash `sha256:2520cb4611a8832f8030414288e0150bb4ce8a0e5d31f2160a9b984d9b259d98`. Cola funcional vacía; hash `sha256:c4fa4a4888db9e95656ade273aeb0dd11d54b59194a6dc923fc93859607d0951`.
- Siguiente paso: auditar la Licenciatura en Danza Contemporánea Plan 2018, primera identidad reproducible restante.

### Licenciatura en Danza Contemporánea — ejes y catálogo flexible operativos 2026-08-26

- El plan oficial 2008, implementado administrativamente en 2018, y la oferta 2026 confirman una carrera única en Montevideo de cuatro años, ocho semestres y 360 créditos, con título de Licenciado en Danza Contemporánea.
- La proyección controla ocho requisitos que suman exactamente 360: Creación Artística 81, Investigación 34, Teórico-Histórico de Arte y Danza 43, Teorías y Estudios del Cuerpo 43, Mediación 20, Optativas 67, Electivas 36 y Trabajo Final de Egreso 36.
- El árbol de Bedelías conserva 417 unidades elegibles después de excluir tres complementos históricos de 2020 con cero créditos. Sus 2787 créditos representan oferta acumulada y flexible, no obligaciones simultáneas; cada materia se asigna al eje correspondiente y los dos laboratorios de egreso aportan 18 créditos cada uno.
- El texto descriptivo del PDF dice 38 créditos para Estudios del Cuerpo, mientras su tabla operativa y Bedelías publican 43. La normalización usa 43 porque coincide con las unidades del eje y permite cerrar el total oficial de 360 junto con el Trabajo Final separado.
- El plan descarta expresamente orientaciones diversificadas. Las optativas y electivas permiten construir perfiles personales, pero no se publican como menciones, títulos o trayectorias certificadas.
- Registro de auditoría: hash `sha256:0f431d97c00da628d019d3f8ebfa5d2e96120bbb017120e9527caba2f3b74682`. Cola general: 57 identidades pendientes; hash `sha256:fb8a07216676ce1bc36bb20808e53a9889f9713b96ad2b4777eff8f01019305f`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:89b469c94a73b44c05b02286a21e3a17d736d592b42c6d9683994b8ccd250fa8`. Cola funcional vacía; hash `sha256:635928c74b82b7b5ab939cc8e02e7019bee38c4950ea058fb88e392d36d33fa3`.
- Siguiente paso: auditar la Licenciatura en Interpretación Musical Plan 2005, primera identidad reproducible restante.

### Licenciatura en Interpretación Musical Plan 2005 — menciones operativas 2026-08-26

- El plan oficial confirma un único título de cuatro años, ocho semestres y 360 créditos en Montevideo, con mención a la opción elegida. La UI ofrece diecisiete trayectorias registradas en Bedelías; quince integran la admisión publicada para 2026 y Corno/Trombón se conservan expresamente para continuidad de estudiantes ya registrados.
- Cada mención controla seis mínimos que suman 360: Tronco Común 138, materias troncales 18, materias específicas 152, electivas 29, proyectos especiales 8 y Actividad de Graduación 15. El catálogo de 1026 cursos representa alternativas acumuladas, no obligaciones simultáneas.
- La opción Canto conserva su formación específica en canto, arte escénico, idiomas y acompañamiento; las opciones instrumentales mantienen separadas sus series específicas. El árbol histórico de Trombón omitía la Actividad de Graduación, por lo que la proyección incorpora el bloque normativo de 15 créditos exigido por el Plan 2005 y lo limita a esa trayectoria.
- La ficha administrativa informa 60 meses, pero el plan aprobado establece ocho semestres; la UI normaliza la duración a 48 meses y documenta la discrepancia. El certificado opcional de Primer Ciclo no se automatiza porque la fuente pública no publica un umbral autónomo seguro por opción.
- Registro de auditoría: hash `sha256:91eb28ecb20fa47dbc923e712383e3d70f969a1e4e8206f6acb13a77992bd9a2`. Cola general: 56 identidades pendientes; hash `sha256:5cf2aaf233770d9cfab260a29645410e0426282b5f10325d577ae52574f2fc72`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:0eec102167cff451797085c6a717782cb1c1f0a322089ea9bcb961c147b68def`. Cola funcional vacía; hash `sha256:18b0d3acb502de42ce48936cf3f851e5013696c9114d2acc619bdd05022cb2c1`.
- Siguiente paso: auditar la Licenciatura en Música Plan 2005, primera identidad reproducible restante.

### Licenciatura en Música Plan 2005 — cuatro opciones operativas 2026-08-27

- El Plan 2005 y la oferta vigente confirman una única Licenciatura en Música en Montevideo, de cuatro años, ocho semestres y 360 créditos, con cuatro opciones certificadas: Composición, Dirección de Coro, Dirección de Orquesta y Musicología.
- Las cuatro opciones comparten 138 créditos de Tronco Común, 12 de materias troncales y 8 de proyectos especiales. Composición exige 144 específicos y 58 electivos; Dirección de Coro 124 y 78; Dirección de Orquesta y Musicología 116 y 86. Los mínimos raíz suman exactamente 360 en cada opción.
- Dentro de las electivas se conservan los submínimos de formación musical y no musical: 20+20 en Composición, 26+26 en Dirección de Coro y 29+29 en Dirección de Orquesta y Musicología. El saldo hasta el mínimo electivo total permanece flexible.
- La proyección anterior mezclaba los cuatro catálogos y sólo publicaba la primera credencial. La normalización genera cuatro trayectorias, comparte el tronco y deduplica 656 cursos; sus 3587 créditos representan oferta acumulada y alternativas, no obligaciones simultáneas.
- Bedelías informa 60 meses, pero el plan aprobado establece ocho semestres; la UI normaliza la duración a 48 meses. Dirección de Coro ofrece 132 créditos específicos para un mínimo de 124, por lo que no convierte los ocho excedentes en obligaciones.
- Registro de auditoría: hash `sha256:851ac79720debef70f8d2463b279579f6e618b7f194eab3e8a0eba15edd972a4`. Cola general: 55 identidades pendientes; hash `sha256:8c62cb525ff453d00b2fd161baec65ebdd59c4b6077ba9f631bd1c2f510960b1`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:e4644d66a23b29e70459a4c5836d4261e9de3c46487afa2baf5ca8785f2b59f4`. Cola funcional vacía; hash `sha256:77227e3020345bc3f6de543a6ca19b199b0cc98c1152b92e2858810eb011169f`.
- Siguiente paso: auditar Contador Público Plan 2024, primera identidad reproducible restante.

### Contador Público Plan 2024 — cinco perfiles certificados operativos 2026-08-27

- FCEA confirma un único título de Contador Público, ocho semestres y 360 créditos en Montevideo. La carrera exige elegir al menos uno de cinco perfiles: Asesoría Financiera, Aspectos Tributarios y Jurídicos, Controller y Transformación Digital, Reportes Externos y Atestiguamiento o Sector Público.
- Cada recorrido controla 260 créditos del Ciclo Común Obligatorio, 10 de Ciencias Sociales y Humanas, 60 del perfil y 30 opcionales libres. Dentro del perfil se exigen 40 créditos obligatorios y 20 opcionales.
- Los perfiles quedan registrados en la escolaridad y habilitan constancias, pero no son menciones distintas del título. La UI conserva un solo título y presenta cinco opciones de Perfil.
- Bedelías publica mínimos cero en los grupos de perfil y acumula equivalencias en el ciclo común. La normalización aplica los mínimos oficiales de FCEA y conserva las alternativas como catálogo elegible.
- El grupo Controller del snapshot incluía I137 e I138 y sumaba 60 créditos obligatorios. La nómina vigente de FCEA exige seis cursos que suman 40; ambos cursos se conservan como opcionales libres y no bloquean el egreso del perfil.
- Registro de auditoría: hash `sha256:c2d7ca667fd4cd3817ad4c6bbf1e2d066aafd1324874deb893bfac81294588cd`. Cola general: 54 identidades pendientes; hash `sha256:d1084942f0f345da2467b25c41d5bc41c452eb53c4cab6116e5d0d328c2d5f13`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable y 34 con sedes oficiales; hash `sha256:2fb5e4f12acb1a61c40fde6acbdb90b6cdf45eef84a3cf9f547f741bd331efc3`. Cola funcional vacía; hash `sha256:12f54ef6a9d9010dc47fade84532572258ccbd59038e9f17b34e0fc82ca0e75c`.
- Siguiente paso: auditar la Licenciatura en Administración Plan 2012, primera identidad reproducible restante.

### Licenciatura en Administración Plan 2012 — flexibilidad y guías operativas 2026-08-27

- La grilla vigente de FCEA confirma un único título de Licenciado en Administración, ocho semestres, 360 créditos y dictado en Montevideo con apoyo en EVA.
- La UI controla mínimos de Administración 120, Contabilidad e Impuestos 60, Métodos Cuantitativos 45, Economía 40, Actividades Integradoras 20, Ciencias Sociales y Humanísticas 20 y Jurídica 15. Los 320 créditos de área se completan con 40 de libre distribución.
- Cada unidad puede asignarse a su área o al saldo libre, sin contabilizarse dos veces. Se conservan además los submínimos de U.C. básicas 80/40/30/40/10/10 publicados por Bedelías.
- FCEA publica dos trayectorias sugeridas: Gestión de Personas y Marketing. La UI incorpora ambas como guías no certificadas y mantiene una opción Personalizada con el catálogo completo; cada guía destaca sus recomendaciones pero deja disponibles todas las demás unidades en el catálogo.
- Las equivalencias y reválidas históricas del árbol de Bedelías permanecen como alternativas, no como obligaciones simultáneas. A85 se mantiene en la guía oficial de Personas con aviso de que no se ofrece en 2026.
- Registro de auditoría: hash `sha256:3343d2d864aee12bb34919f112849b5285f97c656de9cea3967c4d9980721632`. Cola general: 53 identidades pendientes; hash `sha256:46f75c1c65d52980b451c166d17121b511ca9041bc0f62844cbc540568726c60`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:b3e2119988e9bc84f36d57752d69292799568b0f7d79110e89c7aabfed7683d8`. Cola funcional vacía; hash `sha256:53b4357c75cb9b8de11b19d5e61087989ba54c822677c460b1cc7e9d3f630b64`.
- Siguiente paso: auditar la Licenciatura en Economía Plan 2012, primera identidad reproducible restante.

### Licenciatura en Economía — trayectorias sugeridas operativas 2026-08-27

- FCEA confirma la vigencia del Plan 2012, un único título de Licenciado en Economía, ocho semestres, 360 créditos y cursado en Montevideo con apoyo de EVA. El Plan no establece menciones ni especializaciones en el título.
- La UI controla mínimos de 150 créditos en Economía, 80 en Métodos Cuantitativos, 50 en Ciencias Sociales y Humanísticas, 10 en Actividades Integradoras, 10 en Contabilidad e Impuestos y 10 en Administración. Esos mínimos suman 310; los 50 créditos restantes se modelan como libre distribución entre áreas sin duplicar el cómputo.
- Se conservan los submínimos básicos de Bedelías: 120 en Economía, 70 en Métodos Cuantitativos, 20 en Ciencias Sociales y Humanísticas y 10 en cada una de Actividades Integradoras, Contabilidad y Administración. Reválidas y equivalencias históricas permanecen como alternativas, no como obligaciones simultáneas.
- FCEA publica cuatro trayectorias sugeridas: Académica, Empresarial, Políticas Públicas y Sector Financiero. La UI las presenta como guías no certificadas, destaca sus cursos concretos y mantiene las categorías abiertas y las 500 unidades del catálogo disponibles para cualquier combinación válida. La opción Personalizada muestra el catálogo completo.
- MC10 conserva la alternativa 114A + 128A. E10 es la única oferta inicial obligatoria desde 2026; E11 queda como equivalencia de egreso y no se exige en paralelo.
- Registro de auditoría: hash `sha256:aa6fd9d0bc4a53531616aed15260daea3e98caad5b55e86868dcdb9e01b5fa20`. Cola general: 52 identidades pendientes; hash `sha256:c65cee1a7c4c6819ccee423ece60cff5a2195bc79b342c87a43d39a57e82f950`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:ca1f2860ad668b3ab8758eefad6ea194d3ae8054e0b89ac84faa84a57a0b051e`. Cola funcional vacía; hash `sha256:8b5b5b6319ae4e5724d429a064df003aa84bb008ee495539855bb03bf38019f7`.
- Siguiente paso: auditar la Licenciatura en Estadística Plan 2014, primera identidad reproducible restante.

### Licenciatura en Estadística Plan 2014 — perfiles oficiales operativos 2026-08-27

- La carrera conduce a un único título de Licenciado en Estadística y ofrece cuatro perfiles de especialización: Actuarial-Demográfico, Bioestadístico, Economía y Tecnológico. La UI los presenta como trayectorias del mismo plan y conserva el progreso compartido al cambiar de perfil.
- Cada perfil controla los mismos mínimos normativos: 85 créditos de Matemática, 85 de Inferencia Estadística, 30 de Instrumental, 60 del área asociada, 10 de Conocimientos Generales y 20 de Actividades Integradoras, más 70 créditos de libre distribución; el total es 360.
- Tres árboles administrativos de Bedelías publicaban mínimos cero y la grilla tecnológica resumía 83 créditos de Matemática. La normalización aplica la tabla del Plan aprobado, que exige 85 y suma 290 antes del bloque libre.
- Las 642 apariciones jerárquicas se normalizan a 263 unidades de UI. Cada perfil conserva su grilla propia y deja el resto disponible como catálogo flexible para los 70 créditos libres; los 192 registros de `plan.courses` no incluían todas las unidades externas presentes en la composición.
- Montevideo es la única sede completa; EVA se conserva como apoyo virtual y no como localización seleccionable.
- Registro de auditoría: hash `sha256:3d1032b069b84a182d5dd576b1d47bd3bb3952f8311614f6bb98a53ba2eaf214`. Cola general: 51 identidades pendientes; hash `sha256:cad5ec50f4542d82a8eaa57ea187e0da6aaa909712447499241fcee636d2430a`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:947db1f137b713981ae4fb39f76bc62ed48cf80d125cc659d58f35f2eda14b87`. Cola funcional vacía; hash `sha256:8489690f53b8235832b1dcbf260116245949160e8f8347054bc04996e7cd6cf5`.
- Siguiente paso: auditar el Técnico en Administración Plan 2014, primera identidad reproducible restante.

### Técnico en Administración Plan 2014 — currículo semiabierto operativo 2026-08-27

- FCEA mantiene vigente un único título de Técnico en Administración de 225 créditos y cinco semestres. La UI normaliza la duración a 30 meses y ofrece sólo Montevideo; EVA es apoyo virtual y no una sede seleccionable.
- Los mínimos vigentes son 60 créditos de Administración, 50 de Contabilidad e Impuestos, 20 de Jurídica, 10 de Economía, 30 de Métodos Cuantitativos y 15 de Actividades Integradoras. Esos 185 créditos más 40 de libre distribución completan 225.
- La tabla al pie de la ficha y el grupo de Bedelías todavía muestran 30 créditos libres, lo que suma 215. Se usa el texto vigente de FCEA, que establece 40 y es compatible con el total oficial; también se documenta el metadato administrativo obsoleto de 60 meses.
- La grilla de julio de 2026 queda como recorrido sugerido de cinco semestres. Sus quince unidades obligatorias inequívocas se controlan nominalmente; E10 o E11 satisfacen la obligación de Economía y MC10 satisface Cálculo completo, mientras 114A más 128A permiten completarlo en dos mitades.
- La composición aporta 198 unidades normalizadas y 2.364 créditos de oferta acumulada. Las 39 unidades de la grilla se destacan por semestre y las otras 159 permanecen en el catálogo flexible; no se confunde esta carrera montevideana con el Tecnólogo en Administración y Contabilidad del interior.
- Registro de auditoría: hash `sha256:57e89b31f41eb9957308fa8cc7a9563d1119b3b284d4849876cd9efb7b6b73cd`. Cola general: 50 identidades pendientes; hash `sha256:0153d6f0fff665be7a91f1f062acc3be17362c137ce35846d042d2b3d2fc9762`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:950a6e0b9d24e269b2b85f80ef10ba2990efcefda481c2272b42259a5fe39835`. Cola funcional vacía; hash `sha256:c278baf660514e582ada02858ca2302daf4b3e5b66f8db800e40c8ae9400471d`.
- Siguiente paso: auditar la Licenciatura en Biología Humana Plan 2004, primera identidad reproducible restante.

### Licenciatura en Biología Humana — currículo personal y cinco sedes operativos 2026-08-27

- El plan oficial confirma un único título interservicios de Licenciado en Biología Humana, cuatro años y al menos 360 créditos. Participan Ciencias, Humanidades y Ciencias de la Educación, Medicina y Odontología; la UI conserva Facultad de Ciencias como servicio canónico sin ocultar el carácter compartido.
- La carrera está disponible en Montevideo, Salto, Paysandú, Rivera y Tacuarembó. Las cinco localidades son ofertas del mismo plan y comparten progreso; no se crean carreras, planes ni perfiles territoriales separados.
- La UI controla 79 créditos de Ciencias Básicas, 133 de Ciencias Biológicas, 29 de Ciencias Sociales y Humanísticas y 119 de Orientación Específica. Los cuatro mínimos suman exactamente 360.
- La orientación es individual y se construye con tutoría. No se convierten ejemplos como genética humana, neurobiología o epidemiología en menciones prefijadas; se muestra una única trayectoria de currículo personalizado y la Comisión Curricular conserva la aprobación final.
- El plan exige una pasantía de al menos 120 horas y un informe científico. Como Bedelías publica varias pasantías con códigos, créditos y duraciones diferentes, la UI agrega una validación de egreso explícita en lugar de imponer una unidad arbitraria.
- Las 2.032 apariciones del árbol se conservan como catálogo flexible por área y no como obligaciones simultáneas. Se normaliza la duración a 48 meses; los 60 meses administrativos de Bedelías y del catálogo central quedan documentados. También se conserva la discrepancia entre la identidad 2004 del registro institucional y el rótulo Plan de Estudios 2011 del PDF depositado.
- Registro de auditoría: hash `sha256:270fde1dbd7368d3b8cda78184872b33bb7c03188e47ef9b525a21e784d4ee10`. Cola general: 49 identidades pendientes; hash `sha256:6a9f9f24fc2c7796ce1f708998a93a7b8cd1389c763ea23be7a9dd42bb9abf42`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable y 35 con sedes oficiales; hash `sha256:20236d388a96f27e16672b2e9bbcc30824fecbc1841c350a71c1613e54852e0f`. Cola funcional vacía; hash `sha256:a156957faed3aba057ac53992a6e69791b81901efbb7a45784992dff961524ee`.
- Siguiente paso: auditar la Licenciatura en Astronomía Plan 2016, primera identidad reproducible restante.

### Licenciatura en Astronomía Plan 2016 — recorrido flexible operativo 2026-08-27

- Facultad de Ciencias confirma un único título de Licenciado en Astronomía, ocho semestres, 360 créditos y sede Montevideo. La elección personal de optativas y electivas puede formar un perfil académico o profesional, pero no constituye una mención certificada ni otra carrera.
- La UI controla siete mínimos raíz que suman exactamente 360: Matemática 70, Física 100, Astronomía 90, Métodos Computacionales 20, Ciencias Sociales y Humanas 8, Experiencias de Formación 22 y un bloque combinado Optativas-Electivas de 50.
- Dentro del bloque flexible se exigen al menos 30 créditos optativos y 10 electivos. El saldo de diez puede distribuirse entre ambos respetando el rango normativo de 10-20 electivos y 30-40 optativos; la UI documenta que todavía no automatiza el máximo electivo.
- Las Experiencias de Formación conservan sus submínimos de 12 créditos de Iniciación a la Investigación y 10 de Práctica de Formación. Se reparan localmente las identidades administrativas de FI182 y BG802 sin alterar los demás planes; FI189, BG802 y BG928 permanecen como experiencias de práctica acreditables publicadas.
- Las 186 apariciones de composición forman un catálogo flexible por áreas y no una obligación de aprobar 1.755 créditos. La proyección conserva 175 reglas publicadas por Bedelías y exige validación final de la Comisión de Carrera para el currículo personal.
- Registro de auditoría: hash `sha256:369e52b4f32aeae1f9fd5c7253913ef1afc1859ab485e3da0eeab7e61ca79d89`. Cola general: 48 identidades pendientes; hash `sha256:3550940e45874f59eaf00a8dcd832d18f44169ccfbb356dcca66b6be7b571efd`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:5de947dd55c7876f585873be7fe0d8fec929db524cc51961e1468ef07f609003`. Cola funcional vacía; hash `sha256:0ca7478e249c2379733344385e034be44ac334ff7130e3cfe09e77dbd25c72c4`.
- Siguiente paso: auditar la Licenciatura en Bioquímica Plan 2017, primera identidad reproducible restante.

### Licenciatura en Bioquímica Plan 2017 — orientación personalizada operativa 2026-08-27

- Facultad de Ciencias confirma un único título de Licenciado en Bioquímica, cuatro años, 360 créditos y sede Montevideo. Investigación, diagnóstico, biotecnología, bioinformática y las demás orientaciones publicadas son énfasis posibles del mismo perfil y no menciones ni títulos separados.
- La UI controla los mínimos del tramo común: 60 créditos Físico-Matemáticos, 70 de Química, 60 de Biología, 45 de Bioquímica Básica y 6 de Humanística. El tramo diferencial exige 33 créditos optativos/electivos de orientación y BQ200 satisface la Tesina de Graduación de 40 créditos; los mínimos suman 314 y los 46 restantes quedan disponibles para completar el total flexible de 360.
- El Plan exige además 10 créditos de formación social/productiva o cursos afines de otros servicios o instituciones. Bedelías mantiene sólo dos actividades explícitas por 7 créditos en ese grupo, por lo que la UI no inventa una materia ni un mínimo imposible: conserva el catálogo y exige validación académica explícita de esa condición y del currículo individual.
- Las 428 apariciones de composición se presentan como catálogo por áreas y no como obligación acumulativa. De los 530 registros de previaturas, la proyección conserva 443 reglas operativas y deja 87 unidades explícitamente sin regla publicada; mantiene una única trayectoria personalizada y la sede montevideana.
- Registro de auditoría: hash `sha256:80c95b9802840be917d0857218337334938d6ff222e9a8dcd08c80e0156323f2`. Cola general: 47 identidades pendientes; hash `sha256:015bac66251b642da9120133fa3b667ce1fdd7b2ae34f1bde18410aae0d6a1c2`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:6b4a67750b7aed5c577d473761b4b6c8829c908bba4dc7c87b5a8ce2485d8658`. Cola funcional vacía; hash `sha256:9ceba1e79472e47f5006a9658838ccc2921b9c34c0c5116cd61e3057a06235db`.
- Siguiente paso: auditar la Licenciatura en Ciencias Biológicas Plan 2017, primera identidad reproducible restante.

### Licenciatura en Ciencias Biológicas Plan 2017 — trayectoria personal por tramos operativa 2026-08-28

- Facultad de Ciencias y Udelar confirman un único título de Licenciado en Ciencias Biológicas, cuatro años, 360 créditos y sede completa en Montevideo. Biología celular, ecología, genética, oceanografía, zoología y los demás campos publicados son énfasis posibles de una trayectoria individual, no menciones certificadas.
- La UI controla tres mínimos raíz que completan exactamente 360 créditos: 210 de tramo común, 140 de tramo de orientación y 10 de prácticas integrales o extensión. Dentro del tramo común se exigen 90 de Científico-Básica, 40 de Biología Celular y Molecular, 60 de Diversidad Biológica y 10 de Reflexión Científica y Formación General; BG900 aporta los 32 créditos de Trabajo Final dentro de orientación.
- Las 978 apariciones de composición se normalizan a 977 unidades curriculares más una validación manual, separadas por tramo y área. La proyección conserva 897 reglas operativas y deja 318 unidades explícitamente sin regla publicada; no convierte el catálogo acumulado de 6.710 créditos en obligaciones simultáneas.
- El documento aprobado y el Reglamento se denominan Plan 2015, mientras Colibri, Bedelías y el catálogo institucional registran la implementación vigente como Plan 2017. La UI conserva la identidad canónica 2017 y documenta el antecedente normativo sin crear otro plan.
- El Ciclo en Biología-Bioquímica permite iniciar 90 créditos en Salto o Paysandú, pero la fuente institucional indica que esta Licenciatura continúa en Facultad de Ciencias en Montevideo. Por eso no se agregan sedes regionales completas ni se duplica la carrera.
- Registro de auditoría: hash `sha256:234bd3859f6dbd8f32a18405bb7cb636f78b17351ce5ea2a7c3be995168190cf`. Cola general: 46 identidades pendientes; hash `sha256:6bf539288a27aa14d6f8eb2c3d62c077bb735388db3dddbf9efa9ef880d100de`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:ae41aa2554cb2763c06c6d651a789f732e9cf8af942489f6614d29884b5ffe4c`. Cola funcional vacía; hash `sha256:ff378b4bf0f7988f16605723984201088aef0872c901abbe2e175c176d2079a7`.
- Siguiente paso: auditar la Licenciatura en Ciencias de la Atmósfera Plan 2007, primera identidad reproducible restante.

### Licenciatura en Ciencias de la Atmósfera Plan 2007 — currículo compartido y flexible operativo 2026-08-28

- Facultad de Ciencias y Facultad de Ingeniería confirman un único título compartido de Licenciado en Ciencias de la Atmósfera, cuatro años, 360 créditos y sede completa en Montevideo. Se puede ingresar por cualquiera de los dos servicios; la UI conserva un solo plan y progreso.
- La UI controla nueve mínimos: Matemática 68, Física 64, Mecánica de los Fluidos y Dinámica Atmosférica 54, Actividades Integradoras/Laboratorios/Especiales 24, Tratamiento de Datos 20, Métodos Numéricos 18, Química 10, Recursos Hídricos y otras Geociencias 15 y Ciencia y Sociedad 6.
- Los mínimos suman 279 créditos. Los 81 restantes se distribuyen flexiblemente entre actividades acreditables hasta completar 360 y la Comisión de Carrera aprueba la coherencia del currículo individual; no se inventa un décimo bloque ni una mención certificada.
- Las 238 apariciones de composición se conservan como catálogo por áreas y no como obligación de aprobar 1.792 créditos. La proyección mantiene 150 reglas operativas y deja 41 unidades explícitamente sin regla publicada.
- Bedelías y el catálogo central muestran 60 meses, pero el Plan y las páginas vigentes de ambas facultades establecen cuatro años; la UI normaliza la duración a 48 meses. La aprobación ocurrió en 2006 y la implementación institucional se conserva como Plan 2007.
- El CIO Científico-Tecnológico regional es una vía inicial y no una sede completa de la Licenciatura. No se agregan Salto ni Paysandú ni se confunden los dos servicios montevideanos con sedes distintas.
- Registro de auditoría: hash `sha256:19ca7e05a36ca2aa425e55241ba344e5119bc1e9c07bebf86026bd6774f2f1ab`. Cola general: 45 identidades pendientes; hash `sha256:fcb84c94efcbcf9436f02c47000cf218c50c6ac0659aa3ee0aea413133d8ef6d`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:e5868ff5e4d6a008fd663d4264d5eba831b831a95687c5848072fad470c64b96`. Cola funcional vacía; hash `sha256:9b0d1d9bd4b64a433e9decac54ea33f20227bcbba6df1ec1502359149a6211c5`.
- Siguiente paso: auditar la Licenciatura en Física Plan 2019, primera identidad reproducible restante.

### Licenciatura en Física Plan 2019 — trayectoria flexible con tutoría operativa 2026-08-28

- Facultad de Ciencias confirma un único título de Licenciado/a en Física, cuatro años, 360 créditos y sede Montevideo. El currículo es individual y la Comisión asigna tutoría al alcanzar 180 créditos, o antes si se solicita un perfil específico.
- La UI controla Física 110, Matemática 70, Herramientas para la Investigación y el Desarrollo Profesional 60, Otras Disciplinas Científicas y Tecnológicas 10 y Formación Integral/Ciencias Humanas y Sociales 18. Los mínimos suman 268 y los 92 restantes son de distribución flexible.
- El Plan exige que 10 de los créditos del área humanística correspondan a formación integral y que al menos 8 créditos, en cualquier área, impliquen iniciación a la investigación. Bedelías no clasifica reproduciblemente todas las alternativas, por lo que la UI conserva la validación académica explícita en vez de inferirla por nombre.
- Matemáticas, enseñanza de la física, biofísica, astrofísica y geofísica son ejemplos de perfiles que pueden construirse con tutoría; no son menciones certificadas. La UI presenta una sola trayectoria personalizada y conserva el progreso compartido.
- Las 290 apariciones de composición se proyectan como catálogo flexible por área, más la validación de egreso. Se mantienen 229 reglas operativas y 102 unidades sin regla publicada; los 2.534 créditos acumulados no son obligaciones simultáneas.
- El texto normativo se denomina Plan 2017 y su Reglamento conserva ese rótulo, mientras Colibri, Bedelías y Planeamiento registran la implementación vigente como Plan 2019. La UI mantiene la identidad institucional 2019.
- Registro de auditoría: hash `sha256:abee4c9111bdd515ae7d9117d36f3309034ce8290f52f039bbc1d6a43b01effe`. Cola general: 44 identidades pendientes; hash `sha256:99b092ecc5064d7114fe92800212fc3e44d3b121a85923f9793ec539e2d712c3`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:f149ccf8bfacea8d5cadc20972f2b9b00de3ad4e9965c1444634af82722fc885`. Cola funcional vacía; hash `sha256:9d038587e211447076fa7e2a1d5e39c4df8364793a2346ad7bc02d9b4f72c99d`.
- Siguiente paso: auditar la Licenciatura en Física Médica Plan 2025, primera identidad reproducible restante.

### Licenciatura en Física Médica Plan 2025 — plan individual compartido operativo 2026-08-28

- El Consejo Directivo Central aprobó el nuevo Plan mediante Resolución Nº 10 del 17/09/2024, el Diario Oficial lo publicó y comenzó a regir en 2025. Sustituye el antecedente Plan 2011 de 323/324 créditos; la identidad vigente es de cuatro años y 360 créditos.
- La carrera y el título son compartidos por Facultad de Ciencias y Facultad de Medicina. La inscripción y la sede completa publicada están en Facultad de Ciencias, Montevideo; la UI conserva un solo plan y progreso y muestra a Medicina como servicio responsable, no como segunda carrera o sede.
- La UI controla Biología-Medicina 41, Física 81, Física de Radiaciones 27, Física Experimental 23, Formación Complementaria 11, Matemática 81 y Módulos Electivos 60. Estos siete mínimos suman 324 créditos.
- Además se controlan 10 créditos de prácticas de formación en ámbitos social y productivo o cursos afines admitidos por la Ordenanza de Grado. Bedelías los presenta como octavo grupo operativo; no se los rotula como una octava área disciplinar. Quedan 26 créditos flexibles hasta completar 360.
- La Comisión de Carrera aprueba el plan individual una vez alcanzados 180 créditos. Radioterapia, medicina nuclear, imagenología, radiología y radioprotección son opciones dentro de los módulos electivos y no menciones certificadas.
- Las 48 apariciones de composición se proyectan en ocho bloques operativos, más la validación final. La UI mantiene 49 apariciones, 55 reglas publicadas y nueve unidades sin regla publicada; los 468 créditos del catálogo no son obligaciones simultáneas.
- Registro de auditoría: hash `sha256:9673992f0326987cb26f7295baae1e62cd04adea59703568e8a4de4be1b4c7d4`. Cola general: 43 identidades pendientes; hash `sha256:282f726f3f87b250689ebc194cbb55070000fe7fe9a7483ce6a0f7268e5e437d`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:2a64f1d75eed220d2084f41194ed0f9a2c1ba794bef72eb5f3da4148b6263d29`. Cola funcional vacía; hash `sha256:2baa31d05c3f1e2f625dc55d3f397170d2dbb592a10f5e0f08652be052b386c6`.
- Siguiente paso: auditar la Licenciatura en Geografía Plan 2018, primera identidad reproducible restante.

### Licenciatura en Geografía Plan 2018 — trayectoria flexible y tesina operativa 2026-08-28

- El Plan fue aprobado por Claustro y Consejo de Facultad de Ciencias en 2017 y por Resolución Nº 16 del CDC del 12/12/2017. Facultad de Ciencias y el catálogo central confirman un único título de Licenciado en Geografía, cuatro años, 360 créditos y sede Montevideo.
- La UI controla Conocimientos Básicos y Generales 60, Teórico-Metodológica 45, Socioespacial 45, Sistemas Ambientales 40 y Tecnologías de la Información Geográfica 30. El núcleo de las cinco áreas suma 220 créditos.
- Los 140 créditos restantes se controlan como 90 de materias optativas, 10 de extensión y actividades en el medio y 40 de tesina. El texto admite entre 10 y 15 créditos de prácticas pertinentes; el cuadro oficial y Bedelías fijan el mínimo operativo de 10.
- La tesina requiere tutor, aval previo de la Comisión de Carrera y haber aprobado los mínimos de las cinco áreas. Como Bedelías no publica una regla automática para GF303, la UI conserva esta condición como validación académica explícita.
- El Plan permite énfasis personales mediante optativas y el tema de tesina, pero no nombra menciones, orientaciones ni perfiles certificados. La UI ofrece una única trayectoria flexible y preserva un solo progreso.
- Las 167 apariciones de composición se proyectan en ocho bloques, más la validación final. Se mantienen 168 apariciones operativas, 148 reglas publicadas y 56 unidades sin regla publicada; los 1.314 créditos del catálogo no son obligaciones simultáneas.
- Registro de auditoría: hash `sha256:c974e406c9ad7e8f2fe2f1d6447094c798a0e988488be216a2c1981e9806b085`. Cola general: 42 identidades pendientes; hash `sha256:ac4e15be46ddc4f5815315c5ad9d1be61ec55e2bcac1f5e1795b752290b03907`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:c88ee64555f1cf1e6632eba3ac61cf7405d40ef6e409f10f0f04fbf7cb95b227`. Cola funcional vacía; hash `sha256:61db32f9a00c0386d1b81b27e4c50b39d09a8cb063cef92e7a05ebdcfda8d040`.
- Siguiente paso: auditar la Licenciatura en Geología Plan 2018, primera identidad reproducible restante.

### Licenciatura en Geología Plan 2018 — orientación individual operativa 2026-08-28

- El Plan 2018 publicado en el Diario Oficial, Facultad de Ciencias y el catálogo central confirman un único título de Licenciado en Geología, cuatro años, 360 créditos y sede Montevideo.
- La UI controla 210 créditos de tramo común: 90 del área científico-básica, 100 de geología fundamental y 20 de profundización. La orientación individual aporta 140 créditos y contiene el trabajo final obligatorio de 35.
- Los 10 créditos de reflexión científica y formación general pueden cursarse en cualquiera de los dos tramos. Bedelías muestra simultáneamente 210 comunes, 150 de orientación y 10 transversales; la proyección aplica la equivalencia oficial 210 + 140 + 10 para no inflar el egreso a 370 créditos.
- El ingreso a la orientación requiere 130 créditos comunes con formación geológica fundamental. Para iniciar el trabajo final se requieren los 210 comunes, 90 de orientación, tutor, propuesta y aprobación de la Comisión; estas condiciones quedan como validación académica explícita.
- La orientación se acuerda individualmente con la Comisión y un futuro tutor. El Plan permite recorridos sugeridos, pero no menciones ni títulos certificados separados; la UI conserva una única trayectoria individual.
- Las 220 unidades publicadas usan 205 códigos administrativos por reutilización entre versiones y suman 1.642 créditos de oferta acumulada. La UI conserva sus variantes trazables, 220 reglas publicadas y una validación final; el egreso no exige completar todo el catálogo.
- Se corrigió el parser general de composición para usar los campos estructurados de cada materia. Esto evita nombres truncados como `Créditos: 8 programa` y conserva correctamente tanto códigos locales como materias ofrecidas por otros servicios.
- Registro de auditoría: hash `sha256:fd5584d8c9da94fe493a21cefa6a06d0a49acf2e9a3aca65e7ad881a4d6b72d7`. Cola general: 41 identidades pendientes; hash `sha256:58f14fc5f246370359c4bc876e1e966c4f1525e58860e02403d1964cb37c5a04`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:6a73cde1a625360206d860127d74d61386c90fb613c7f8439350a186f17ee891`. Cola funcional vacía; hash `sha256:fabc76656313f30c627f4c0ded70de214344f4cdba57f8d37e6cfc81498525b4`.
- Siguiente paso: auditar la Licenciatura en Matemática Plan 2014, primera identidad reproducible restante.

### Licenciatura en Matemática Plan 2014 — perfiles reglamentados y metas vinculadas operativos 2026-08-28

- El Plan 2014, Facultad de Ciencias y el catálogo central confirman un único título de Licenciado en Matemática, 360 créditos y sede Montevideo. El texto normativo y la oferta vigente establecen cuatro años; la UI normaliza a 48 meses y documenta como anomalía los 60 meses del catálogo central.
- La reglamentación vigente distingue el Perfil en Matemática y cuatro perfiles en otras ciencias: Ciencias de la Computación, Ciencias Físicas, Ciencias Biológicas e Ingeniería Eléctrica. La Orientación en Ciencia de Datos pertenece al Perfil en Matemática y permite una constancia específica de la Comisión, pero no cambia el título.
- La UI ofrece las seis opciones sobre una sola carrera y progreso. Cada trayectoria queda vinculada a su propia credencial de metas, de modo que cambiar de perfil actualiza los requisitos correctos y no los presenta como un falso título intermedio.
- El Perfil en Matemática exige al menos 284 créditos del Área A, 36 del Área B y 8 del Área C. Los perfiles en otras ciencias exigen 220 en A, 96 en B —72 en la ciencia elegida— y 8 en C. Ciencia de Datos conserva 284 en A, eleva Probabilidad y Estadística a 48, exige los 36 de B en Computación y agrega una pasantía de 10 créditos.
- Todos los perfiles controlan los mínimos temáticos de Matemática, entre 10 y 15 créditos de seminarios y el trabajo monográfico de 24 dentro del Área A. Los requisitos superpuestos de nivel básico/intermedio/avanzado, la coherencia del plan individual y el inicio de la monografía quedan como validación académica explícita para evitar doble conteo.
- Las 367 unidades normalizadas y 292 reglas operativas se presentan como catálogo flexible por áreas y subáreas, no como una secuencia semestral ni como obligación acumulativa. El parser reconoce además códigos jerárquicos con guiones y puntos para acreditar correctamente Computación, Física, Biología e Ingeniería Eléctrica.
- Registro de auditoría: hash `sha256:1fe73182ab8b09dc7cf2dc39ae88afb2787fab8af6d3112b2d0edf8b0e04502f`. Cola general: 40 identidades pendientes; hash `sha256:e728b1c06144e1871b44aa2c5657d9ed16dc05b69532978ae8f9e7ec028d5bbf`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:d2a830f90076e1c52eb357af39a71de351893ba1d6bc9e3aeb9cd941806ba002`. Cola funcional vacía; hash `sha256:b22b71424516957868725c0027b2ed46d4247c7d254b81ab93f643b1bfc81980`.
- Siguiente paso: auditar la Licenciatura en Relaciones Internacionales Plan 2013, primera identidad reproducible restante.

### Licenciatura en Relaciones Internacionales Plan 2013 — título intermedio y grilla vigente cerrados 2026-08-28

- Las fuentes actuales de Facultad de Derecho y del catálogo central confirman una única Licenciatura en Relaciones Internacionales Plan 2013 en Montevideo, de 320 créditos y 60 meses. La grilla académica se organiza en ocho semestres, sin perfiles, orientaciones ni variantes territoriales.
- El título intermedio `Técnico Asesor en Comercio Internacional` pertenece al mismo plan: exige 200 créditos, compuestos por los 147 obligatorios de los ciclos Inicial y de Estudios Orientados y 53 opcionales. La UI conserva como objetivo predeterminado el título final y permite consultar las metas del intermedio.
- Para la licenciatura se normalizaron los mínimos operativos que Bedelías publica y que suman exactamente 320: 60 del Ciclo Inicial, 87 de Estudios Orientados, 80 del Profesional y 93 opcionales/electivos. Las 436 unidades y 3.064 créditos del snapshot son catálogo acumulado y no una obligación total.
- Se recuperó la secuencia nominal de los ocho semestres, las 28 reglas derivadas exclusivamente del sistema oficial de previaturas, una de tres Funciones Universitarias y una modalidad de egreso de 30 créditos entre monografía, práctica profesional o práctica educativa.
- La grilla oficial enumera 60 créditos profesionales nominales más 30 de egreso, pero declara 227 obligatorios totales; Bedelías operacionaliza 80 profesionales para que `60 + 87 + 80 = 227`. La normalización respeta ese mínimo, mantiene las alternativas obligatorias y documenta la inconsistencia sin inventar qué diez créditos quedarían fuera.
- Registro de auditoría: hash `sha256:5d69d74290ffdc850f7671ac5f417aee5cde95b8a3d4834a2d737862fcbf901a`. Cola general: 39 identidades pendientes; hash `sha256:8870c06c1f233f32c804f270b75ab54138d470d9d068141b0d5c6e75c5b77a0a`.
- Manifiesto UI: 143 proyecciones, todas con composición utilizable; hash `sha256:8088fa6f35911b67f6ebc34c19214ac98225ecd6e1b4f2e88cdaf0fbddd9a590`. Cola funcional vacía; hash `sha256:3ed58058437b91b277b60b7b61b6d8ffa95aea93de81235a7fb7c0a5fbf2aaf5`.
- Siguiente paso: auditar en conjunto los cinco Traductorados Públicos Plan 2022 de Facultad de Derecho, comenzando por Alemán.

### Licenciatura en Traducción Pública Plan 2022 — cinco lenguas consolidadas y operativas 2026-08-28

- El Plan oficial, Facultad de Derecho y el catálogo central confirman una única Licenciatura en Traducción Pública de cuatro años, 320 créditos y sede Montevideo. Alemán, Francés, Inglés, Italiano y Portugués son cinco áreas lingüísticas del mismo plan, no cinco carreras independientes.
- La UI publica una sola carrera y un solo Plan 2022 con selector de lengua. Cada opción conserva sus 42 componentes visibles, sus previas y la denominación específica del título: `Licenciado/a en Traducción Pública en Lengua ...`.
- La proyección unificada contiene 106 componentes: 24 comunes, 16 específicos por cada lengua y dos bloques flexibles. Cada trayectoria suma exactamente 320 créditos y deja las 64 unidades de las otras lenguas fuera de la malla activa, disponibles sólo como catálogo trazable.
- El egreso controla 112 créditos de formación lingüística, 84 de formación jurídica, 84 de práctica profesional y 40 flexibles. Los 10 créditos de prácticas sociales y productivas son un submínimo de los 40 flexibles y no elevan el total a 330.
- Las carpetas finales están incluidas en Práctica Profesional II —4 dentro de 12 créditos— y IV —8 dentro de 16—. No se inventa una materia ni créditos adicionales de trabajo final.
- Se reconstruyeron 94 previaturas desde el régimen oficial vigente para las materias comunes y las cinco lenguas. La normalización corrige el mínimo truncado de 12 créditos que el snapshot inglés mostraba para cuarto año y aplica los 72 publicados por el Plan.
- Los cuatro Traductorados idiomáticos restantes quedan como alias administrativos excluidos del selector. Esto conserva trazabilidad con SGAE sin duplicar carrera, plan, progreso ni credenciales.
- Registro de auditoría: hash `sha256:685c0679067bb298bb80382049f4e20476a0c1ad7c3365b65b5b90e858555837`. Cola general: 34 identidades pendientes; hash `sha256:a78ab1d9747b070faf004512d0e482f31302d10b8c1088903ad86ef3a0b728db`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable, 35 con sedes oficiales y 38 identidades excluidas; hash `sha256:0412cfac75d43093e73eb2a14f83836c232fbd32cba8d4d22423cdc90b67418f`. Cola funcional vacía; hash `sha256:109baf5808d9e939e8aebe2b7f0d631596c126564aef52ba86282573c5773de1`.
- Siguiente paso: auditar la Licenciatura en Ciencias Antropológicas Plan 2014, primera identidad reproducible restante.

### Licenciatura en Ciencias Antropológicas Plan 2014 — tres opciones tituladas operativas 2026-08-28

- FHCE y el Plan oficial confirman una sola Licenciatura en Ciencias Antropológicas de cuatro años, 360 créditos y sede Montevideo. Antropología Biológica, Arqueología y Antropología Social son opciones del mismo plan que integran la denominación del título, no carreras independientes.
- La UI ofrece las tres opciones sobre un único progreso y vincula cada una con su credencial exacta. Las áreas Específica I y II cambian con la opción; la formación general, las optativas de las tres ramas y las electivas permanecen compartidas.
- La distribución operativa que publica Bedelías suma exactamente 360 créditos: 114 de formación general, 84 de contenidos optativos específicos, 58 electivos, 66 de Específica I y 38 de Específica II. Dentro de formación general se controlan 8 créditos de lenguas y 12 de extensión.
- Cada opción exige 52 créditos optativos de su propia rama y 16 de cada una de las otras dos. Esos valores completan los 84 del bloque sin duplicar sus submínimos.
- La proyección contiene 273 unidades de Bedelías más una validación final de la opción y del plan individual por la Comisión de Carrera. Conserva 83 reglas operativas y marca 182 unidades sin regla publicada; los seminarios y talleres de investigación pertenecen a Específica II y no se inventa una tesis separada.
- Registro de auditoría: hash `sha256:e8785443bd4be84159a6580796b7bc5777627421e6944e10aa5ed60c381b68f0`. Cola general: 33 identidades pendientes; hash `sha256:79a5e61958bbe5bd90c03e37909de2f20baa42c9faa019c579262a76c27eed3f`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable; hash `sha256:cf6771b4fab97ccde2cec30b206d44adf0f623ba8bb1be30c5a8405a030dee37`. Cola funcional vacía; hash `sha256:40802721e67fd1f75fd8958124afb769bb831b09b47ba908fffdf24168fa8a7a`.
- Siguiente paso: auditar la Tecnicatura Universitaria en Corrección de Estilo Plan 2014, primera identidad reproducible restante.

### Tecnicatura Universitaria en Corrección de Estilo Plan 2014 — currículo por áreas operativo 2026-08-28

- FHCE y el catálogo central confirman una única tecnicatura vigente de dos años, 180 créditos y sede Montevideo, con el título `Técnico Universitario en Corrección de Estilo (lengua española)`. No tiene menciones ni variantes territoriales.
- La UI controla cuatro mínimos que suman exactamente 180 créditos: 84 del área técnico-instrumental, 56 de lingüística, 26 de literatura y 14 de formación general y académica. La comprensión lectora en lengua extranjera conserva su submínimo operativo de cuatro créditos dentro de lingüística.
- Se exigen las unidades vigentes del núcleo técnico —escritura académica, informática, instrumentos, producción editorial, Taller I, Taller II y Pasantía— y el núcleo lingüístico publicado, admitiendo las equivalencias administrativas presentes en Bedelías.
- La malla actual de cuatro semestres suma 193 créditos por cambios posteriores en las cargas de lingüística y literatura. Se presenta como guía, no como un nuevo total normativo; las literaturas, electivas, extensión y lenguas extranjeras se eligen desde el catálogo flexible.
- Las 180 apariciones de composición y sus 1.218 créditos positivos incluyen versiones, equivalencias y oferta acumulada. La proyección conserva 36 reglas operativas y deja 144 unidades marcadas sin regla publicada; la Pasantía de 15 créditos permanece dentro del área técnico-instrumental.
- Registro de auditoría: hash `sha256:977914f64660289830ba2ea870e73e1d6a9e00502c389c111906da149d097593`. Cola general: 32 identidades pendientes; hash `sha256:b27404c377826ad27f93bd6f2b2f589d60d97e524b9a6d0962e20a44e8903441`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable; hash `sha256:f585b8f05a5d6fc16d5d7e28feda98d3bc88174d04348e6c1af1069f46069e75`. Cola funcional vacía; hash `sha256:77a773fb1b142b1de7f45c462bb7cba65b452c28bb69f2efebe788f44b1bd3cf`.
- Siguiente paso: auditar la Tecnicatura Universitaria en Dramaturgia Plan 2015, primera identidad reproducible restante.

### Tecnicatura Universitaria en Dramaturgia Plan 2015 — carrera compartida y flexible operativa 2026-08-28

- FHCE, EMAD y el catálogo central confirman una única tecnicatura compartida de dos años, 180 créditos y sede Montevideo, con el título `Técnico Universitario en Dramaturgia`. El ingreso es por cohortes, con cupo y selección; la cohorte comprobada más reciente comenzó en 2025.
- La UI controla tres mínimos raíz que suman exactamente 180 créditos: 100 de práctica de la escritura, 60 de formación teórico-práctica y 20 de actividades complementarias.
- Dentro de práctica se exigen 60 créditos de Talleres de Dramaturgia I-IV, 15 de talleres optativos para formatos específicos y 25 de pasantías. Dentro de teoría se controlan 36 créditos obligatorios, 24 optativos, 8 afines a puesta en escena y 16 de ciencias humanas y sociales.
- Bedelías deja vacíos los dos subgrupos teórico-prácticos de 8 y 16 créditos. Las 39 opciones del padre común se clasificaron de forma reproducible por contenido y procedencia: 13 de puesta en escena y 26 de humanidades, sin crear nuevas unidades.
- Las electivas del snapshot aparecen con crédito cero. La malla oficial de julio de 2026 fija Electiva 1 por 10 y Electiva 2 por 4; la UI las representa como dos bloques acreditables oficiales y excluye siete referencias administrativas imposibles de computar.
- La proyección contiene 131 componentes: 129 unidades útiles de Bedelías y los dos bloques electivos. No inventa previaturas: las 136 consultas del snapshot permanecen sin regla publicada y la obligatoriedad se controla mediante el Plan y la malla vigentes.
- Registro de auditoría: hash `sha256:79eb36c03f3a2e082ab3a5975bb0e546e9d05721545a78e649bb9dc1eda9de71`. Cola general: 31 identidades pendientes; hash `sha256:2eb98a28cf4517ecbaec3069d22dba760dfba6f199f0a96282c1e1e77a6258fa`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable; hash `sha256:734ddd3d1c6610f4318c1762677ff29441c1064ee7db9727d0f50d0a984c4d58`. Cola funcional vacía; hash `sha256:fd614742f76fac94df529c73092fc03287793426de45482e3b224f298de17110`.
- Siguiente paso: auditar la Licenciatura en Educación Plan 2014, primera identidad reproducible restante.

### Licenciatura en Educación Plan 2014 — tres áreas de profundización operativas 2026-08-28

- FHCE, el Plan oficial y el catálogo central confirman una única Licenciatura en Educación vigente, de cuatro años, 360 créditos y sede Montevideo, con un solo título de `Licenciado en Educación`.
- Historia y Filosofía de la Educación, Pedagogía, Política y Sociedad, y Enseñanza y Aprendizaje son áreas de concentración para los talleres de investigación y la tesina. La UI las ofrece como trayectorias del mismo plan y las vincula a una credencial común; no replica las etiquetas históricas de Bedelías como títulos distintos.
- La distribución vigente controla diez mínimos cuya suma es exactamente 360: 41 introductorios, 40 de Historia y Filosofía, 32 de Pedagogía, Política y Sociedad, 24 de Enseñanza y Aprendizaje, 63 de formación específica, 12 de integración interdisciplinaria, 58 de abordajes interdisciplinarios o docencia, 72 electivos, 10 de actividades integrales y 8 de lengua extranjera.
- El egreso exige el núcleo común actual, una alternativa de vida universitaria, los tres talleres de investigación consecutivos, la Defensa de Tesina y una lengua extranjera. Optativas, electivas y actividades integrales se eligen desde el catálogo acreditable y conservan una validación final explícita de la Comisión de Carrera.
- La proyección deduplica 351 apariciones de composición en 300 componentes utilizables. Conserva las 75 reglas de previaturas publicadas y marca 227 consultas sin regla; las 55 filas con crédito cero quedan visibles pero no suman a ningún mínimo ni se presentan como acreditación automática.
- Registro de auditoría: hash `sha256:23ca2879e72d11c8f218f7bad4426d9c2acab76aa6544913b7f7293c40959952`. Cola general: 30 identidades pendientes; hash `sha256:c1187b65a6308af4586558d0d6e5b05749b7f2271f320c347752afd1bf63cdd4`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable; hash `sha256:ec2f66e38d617cf37710fd7732fbf75569d13c91e8ab661ff2cf3f8a3ba0097d`. Cola funcional vacía; hash `sha256:f8ba77107f5a1a4dfcb95e249e8f93737a92331d7b5adc86fab70c7a3c5e8950`.
- Siguiente paso: auditar la Licenciatura en Filosofía Plan 2010, primera identidad reproducible restante.

### Licenciatura en Filosofía Plan 2010 — trayectoria flexible operativa 2026-08-28

- FHCE, el Plan oficial y el catálogo central confirman una única Licenciatura en Filosofía vigente, de cuatro años, 360 créditos y sede Montevideo, con un solo título de `Licenciado en Filosofía`.
- La UI controla seis mínimos raíz que suman exactamente 360: 143 créditos de obligatorias filosóficas, 12 de obligatorias complementarias, 147 de formación flexible, 20 de Taller Integral, 13 de Seminario de Tesina y 25 de Tesina.
- Dentro de los 147 créditos flexibles se exigen 65 de electivas filosóficas, 30 de Tópicos Especiales y 52 de electivas universitarias. La guía divulgativa menciona 32 Tópicos y 149 flexibles, pero el Plan normativo y Bedelías coinciden en `30 + 65 + 52 = 147`.
- Se exige cada una de las once unidades filosóficas obligatorias, una introducción universitaria, comprensión lectora en una lengua extranjera, Taller Integral, Seminario y Tesina. Las equivalencias administrativas se presentan como alternativas y no como obligaciones simultáneas.
- El recorrido se construye con un docente orientador y debe ser avalado por el Instituto. La UI ofrece una única trayectoria flexible, no inventa menciones ni convierte la secuencia sugerida de ocho semestres en previaturas.
- La proyección contiene 283 componentes, incluida la validación final. Conserva las 46 reglas de previaturas publicadas y marca 228 consultas sin regla; las 91 filas proyectadas con crédito cero permanecen visibles pero no suman a ningún mínimo.
- Registro de auditoría: hash `sha256:2452e37f3754a7fae3f33b657d3d6488f51cf9fab25f573376325300ff2dd5a7`. Cola general: 29 identidades pendientes; hash `sha256:d334d82f7f02f0438c12aa5dc6a5f8f8e17210a4dddcf88ed2020b375bdefe26`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable; hash `sha256:111f221d3ddd301e57cb3d878ea250263f37578a599218dc78119675623859d6`. Cola funcional vacía; hash `sha256:9e39e9becf29258d00efa6aa0fdc65ee9330a968243f63be7af59e746af561f3`.
- Siguiente paso: auditar la Licenciatura en Historia Plan 2014, primera identidad reproducible restante.

### Licenciatura en Historia Plan 2014 — ingreso general y continuidad CFE operativos 2026-08-28

- FHCE, el Plan oficial y el catálogo central confirman una única Licenciatura en Historia vigente, de cuatro años, 360 créditos y sede Montevideo, con un solo título de `Licenciado en Historia`.
- La UI controla nueve mínimos que suman exactamente 360: 13 créditos de actividades integradas, 65 obligatorios de Europa y el mundo, 2 introductorios obligatorios, 39 teórico-metodológicos, 78 de Uruguay y América, 50 electivos, 8 de lengua moderna, 65 optativos y 40 de Seminario de Tesis y Tesis.
- El ingreso general exige las catorce unidades obligatorias de las cuatro áreas. La secuencia de ocho semestres se muestra como trayectoria sugerida; optativas, electivas e integralidad permanecen flexibles y no se convierten en previaturas.
- La resolución para egresados del Profesorado de Historia del CFE Plan 2008 o anteriores se modela como segunda vía curricular del mismo título. Cinco bloques exclusivos acreditan 245 créditos y se exigen cuatro unidades posteriores: una de Europa y el mundo, una de Uruguay, una de Historia Americana y una teórico-metodológica.
- Ambas vías exigen IVU, lengua moderna, 13 créditos de integralidad, Seminario de Tesis, Tesis y validación final. El reconocimiento CFE no aparece en la vía general ni duplica materias para sus estudiantes.
- La proyección contiene 206 componentes, incluidos cinco reconocimientos CFE y la validación final. Conserva 21 reglas de previaturas publicadas y marca 174 consultas sin regla; 56 componentes con crédito cero quedan visibles sin sumar a ningún mínimo.
- Registro de auditoría: hash `sha256:d9b6a6837b82bd8bced15b3aba8962fe8ffe9988d2eafa781458b0e3ba5f7958`. Cola general: 28 identidades pendientes; hash `sha256:87e414289e718642fc26ef92b39ccb26412ca1050f2d79943c465bd3a2ded4fb`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable; hash `sha256:e0ab0562122351736e8d0c2767f2eb18557b3bbe20e64ff535c38b7b6642c646`. Cola funcional vacía; hash `sha256:85cb593e27d2717b526969822f9957f110f66bc41dcdbe6274af429c2dcdd1f1`.
- Siguiente paso: auditar el Tecnólogo en Interpretación y Traducción LSU–Español Plan 2014, primera identidad reproducible restante.

### Tecnólogo en Interpretación y Traducción LSU–Español Plan 2014 — recorridos lingüísticos y sedes normalizados 2026-08-28

- FHCE, el Plan oficial y el catálogo central confirman un único título de `Tecnólogo en Interpretación y Traducción LSU–Español`, de tres años y 270 créditos. El Plan 2014 se conserva para sus cohortes durante la transición al Plan 2025; no se presenta como una carrera diferente.
- La UI controla siete mínimos que suman exactamente 270 créditos: 112 técnico-instrumentales, 52 de lingüística, 46 de lengua, 22 optativos, 10 electivos, 26 de extensión, investigación y formación general, y 2 de cursos universitarios de FHCE.
- Estudiantes oyentes cursan cuatro niveles de LSU y Estructura de la LSU; estudiantes sordos/as cursan cuatro niveles de español escrito y Estructuras del Español. Son dos recorridos lingüísticos del mismo plan y título, con núcleo, progreso y catálogo compartidos.
- El egreso exige el núcleo común, cuatro niveles de segunda lengua, tres pasantías, los mínimos flexibles y validación final por la Comisión de Carrera. La secuencia de seis semestres es sugerida y no crea previaturas nuevas.
- La malla vigente ejemplifica dos optativas de 13 créditos y alcanza 274, pero el mínimo normativo es 22 optativos y 270 totales. La UI controla el Plan y mantiene las unidades excedentes como catálogo elegible.
- Montevideo y Salto se ofrecen como sedes actuales del mismo plan. Las huellas regionales de Salto y Tacuarembó coinciden con la central; Tacuarembó queda documentado como cohorte territorial anterior porque no figura como sede de ingreso en el catálogo vigente.
- La proyección contiene 201 componentes y conserva 29 reglas operativas; 173 unidades quedan sin regla publicada y 43 componentes de crédito cero permanecen visibles sin sumar a ningún mínimo.
- Registro de auditoría: hash `sha256:1419262d382dad716313c8003b0517e778561caaee78d72433c83af16cc04484`. Cola general: 27 identidades pendientes; hash `sha256:d2eb1685cc2633b8b44f71476b8f921a8d99f807b79f1138d4e8ec8176dac39b`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 36 con sedes oficiales; hash `sha256:7cc04f2db1637e76dbf4726ff3fcec633710c759ab9d3371e0a073cad6e0a1b3`. Cola funcional vacía; hash `sha256:a2315745f887ad93835a0dfa550f2d00198544ef8d86ba1fc060d451d2c882c3`.
- Siguiente paso: auditar la Licenciatura en Letras Plan 2014, primera identidad reproducible restante; después cerrar conjuntamente el Plan 2025 del Tecnólogo y la Licenciatura en Estudios Sordos para compartir correctamente sus primeros 270 créditos.

### Licenciatura en Letras Plan 2014 — auditoría oficial e integración funcional 2026-08-29

- FHCE y el catálogo vigente de Udelar confirman una única Licenciatura en Letras Plan 2014, de cuatro años, 360 créditos, título Licenciado en Letras y sede Montevideo. No existen menciones, perfiles certificados ni sedes interiores vigentes.
- El Plan normativo distribuye 98 créditos de formación general y 262 de formación específica. La UI controla once mínimos operativos que suman exactamente 360: 90 de formación general fuera de lengua, 8 de lengua extranjera, 30 de Filología Clásica, 20 de Literaturas Europeas, 20 de Literaturas Uruguaya y de América Latina, 30 teórico-metodológicos, 52 optativos, 32 electivos, 48 de seminarios, 10 de Taller de Tesina y 20 de Tesina.
- La trayectoria exige el núcleo introductorio, contenidos en epistemología, tres niveles de griego o latín, las unidades de las cuatro áreas temáticas, una actividad que incluya extensión, tres seminarios —uno uruguayo/latinoamericano, uno europeo y un tercero elegible—, Taller y Tesina. Las elecciones permanecen como un recorrido flexible del mismo título.
- La malla actualizada el 12 de mayo de 2025 suma 363 créditos porque Gramática Básica figura con 13 en lugar de los 10 usados por el Plan original. La UI conserva los 13 créditos reales como excedente, pero mantiene 360 como mínimo normativo.
- La proyección deduplica los 280 códigos de Bedelías, incorpora dos controles manuales trazables, conserva las 31 previaturas publicadas y deja 247 unidades sin regla explícita. Las 68 unidades administrativas de crédito cero no aportan a ningún mínimo.
- Registro de auditoría: hash `sha256:36eb085bd378f10fa9ff16c1c761fc4ea048eb46bbdc2f4817dd7a75a88e67ef`. Cola general: 26 identidades pendientes; hash `sha256:7707fcb9b46b65166c288e34bd40ac712668825adb843db48d77c3bdcccecb0e`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 36 con sedes oficiales; hash `sha256:4ee15334c21766cefb6dfe7a5e1fdd63e6ade6202dd42a9f7223c164396cff91`. Cola funcional vacía; hash `sha256:096d6c429ea45b712ecd3d33d489eb46fb1fe6d7d912d6c8c7ba0563a9e795d9`.
- Siguiente paso: cerrar conjuntamente `licenciatura en estudios sordos:2025` y `tecnologo int y trad lsu esp:2025`, verificando el título intermedio compartido de 270 créditos y el tramo final de 90 créditos sin duplicar progreso ni carrera.

### Estudios Sordos Plan 2025 — títulos articulados y progreso común operativos 2026-08-29

- FHCE y el Plan 2025 confirman dos carreras vigentes y articuladas: el Tecnólogo en Interpretación y Traducción LSU–Español, de tres años y 270 créditos, y la Licenciatura en Estudios Sordos, de cuatro años y 360 créditos. La Licenciatura incluye íntegramente el tramo del Tecnólogo y agrega un cuarto año de 90 créditos; no son aliases ni una única credencial.
- Ambas carreras ofrecen los recorridos oficiales para estudiantes oyentes —LSU como segunda lengua— y estudiantes sordos/as —español escrito como segunda lengua—. Comparten materias, progreso local y los primeros 270 créditos, pero conservan selectores, mínimos y credenciales propios.
- El Tecnólogo está vigente en Montevideo y Salto. La Licenciatura se ofrece en Montevideo. CUCEL aparece en la composición administrativa de Bedelías, pero no se publica como sede actual porque no se encontró respaldo en el catálogo oficial vigente.
- Los siete mínimos del Tecnólogo suman 270 créditos: 112 técnico-instrumentales, 52 de lingüística, 46 de lengua, 22 optativos, 10 electivos, 26 de extensión, investigación y formación general, y 2 universitarios de FHCE.
- La Licenciatura conserva esos mínimos en su credencial intermedia. Para el egreso aumenta las electivas a 30 y el bloque interdisciplinario a 96, completando 360. El cuarto año representa explícitamente 20 créditos electivos, 5 de herramientas de investigación, 15 de metodologías, 5 de diseño de proyecto, 20 de tutorías y 25 de trabajo final.
- La composición de Bedelías de la Licenciatura sólo contenía 71 unidades del tramo común. Por eso la proyección reutiliza el catálogo completo y los identificadores compatibles del Tecnólogo para los primeros 270 créditos, y agrega únicamente los bloques del cuarto año publicados por el Plan oficial; no inventa previaturas ni asignaturas optativas concretas.
- Registro de auditoría: hash `sha256:2d0a6b047827a163c8c54e0819334773a68919656cd18913137e452d33071550`. Cola general: 24 identidades pendientes; hash `sha256:58696a4c43d965934c291cf87ec7cc25a8d1a210acbe8a8df1396c5894004e23`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable, 37 con sedes oficiales y 38 identidades excluidas; hash `sha256:25d153c711cd35195b9043ae22ca28598982ac2d2f08d2de0f0728ceca338f49`. Cola funcional vacía; hash `sha256:a4041e0503cb8f2b0e51a10e8313a859295073929fffd438d4083d62b8422f89`.
- Siguiente paso: auditar la Licenciatura en Lingüística Plan 2014, primera identidad reproducible restante.

### Licenciatura en Lingüística Plan 2014 — seis áreas y trayectoria flexible operativas 2026-08-30

- FHCE y el catálogo vigente de Udelar confirman una única Licenciatura en Lingüística Plan 2014, de cuatro años, 360 créditos, título `Licenciado en Lingüística` y sede Montevideo. Los énfasis que cada estudiante construye no son menciones ni carreras separadas.
- La UI controla 255 créditos de formación fundamental, 50 de recorridos interdisciplinarios optativos y 55 electivos. Dentro de la formación fundamental exige los mínimos A=48, B=65, C=52 y D=75; los 15 créditos restantes se distribuyen libremente entre esas cuatro áreas.
- También controla los requisitos transversales del Plan: 8 créditos de lengua extranjera moderna dentro de las optativas, 10 de prácticas en ámbitos social o productivo y dos seminarios de 23 créditos aprobados por monografía. IVU, Orientación a la generación de ingreso y la validación final de la Comisión de Carrera quedan explícitos.
- La malla oficial de julio de 2026 se presenta como una trayectoria sugerida de ocho semestres. Sus bloques optativos y electivos son instrucciones de elección con crédito cero, para que no dupliquen las unidades reales que cada estudiante seleccione del catálogo flexible.
- La trayectoria publicada suma 366 créditos y 261 fundamentales. La UI conserva el mínimo normativo de 360 y 255 fundamentales: los seis créditos excedentes son una propuesta de cursado, no un cambio de plan.
- La proyección contiene 227 apariciones de Bedelías con 226 códigos únicos, nueve instrucciones flexibles y una validación final. Conserva las 40 previaturas publicadas y deja 184 unidades sin regla explícita; 62 filas administrativas originales de crédito cero no suman a ningún mínimo.
- El generador ahora admite grupos raíz oficiales y asignaciones adicionales trazables por unidad. Esto permite que las cuatro áreas alimenten el mínimo fundamental y que seminarios o prácticas controlen simultáneamente su requisito transversal sin duplicar los créditos totales.
- Registro de auditoría: hash `sha256:a29f007df8e1102b70d87ca18b2078e73ccd5af6293621d807d7a44371b171f9`. Cola general: 23 identidades pendientes; hash `sha256:44aaea20f04f9c07bd93faa754e0305656dd6049639f4ede263ac9329481f08f`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 37 con sedes oficiales; hash `sha256:efffe16b4e8e1e06d47e30ce69fd5c7a19080f95ab0174bf340430606511e9ba`. Cola funcional vacía; hash `sha256:c27dbdcb4bc4d729765f31f3d77daf730d647f26cf84d0f38f358f195ee724e0`.
- Siguiente paso: auditar Museología Plan 2011, primera identidad reproducible restante.

### Tecnicatura Universitaria en Museología Plan 2011 — seis opciones y admisión cerrada 2026-08-30

- FHCE mantiene publicados la carrera y el Plan 2011, pero informa expresamente que no abre inscripciones desde 2010. La UI la conserva para estudiantes con escolaridad existente y muestra esa limitación; no la ofrece como alternativa de nuevo ingreso.
- El plan otorga un único título de Técnico Universitario en Museología, dura seis semestres y exige 211 créditos: 133 técnico-profesionales, 39 de una opción temática y 39 complementarios electivos.
- Historia del Uruguay, Historia Americana, Ciencia y Tecnología, Arte, Antropología Social y Cultural y Arqueología son seis opciones temáticas seleccionables dentro del mismo título. El perfil de Antropología que Bedelías fija en el rótulo administrativo deja de ser un valor implícito.
- La trayectoria común ubica Museología I, Museografía I e Introducción a los estudios patrimoniales en el primer semestre; Museología II, Museografía II y Educación y acción cultural en el segundo; Gestión, Conservación y una lengua extranjera en el tercero; las selecciones temática y complementaria entre cuarto y quinto; y la pasantía en el sexto.
- La proyección controla las nueve unidades técnico-profesionales nominales, una de nueve alternativas publicadas de comprensión lectora, los tres mínimos de crédito y la validación final de opción, electivas, equivalencias y pasantía.
- Bedelías aporta 344 códigos únicos, 36 reglas explícitas y 304 unidades sin regla publicada. Sus alternativas y equivalencias se conservan dentro de cada opción, sin convertir el catálogo completo en una secuencia obligatoria.
- La Tecnicatura Universitaria en Bienes Culturales Plan 2021 permanece separada: tiene otro título, 200 créditos, tres menciones y sedes del interior; su mención Museología no reemplaza las escolaridades del Plan 2011.
- El generador ordena ahora conjuntamente los períodos comunes y específicos de planes con perfiles, de modo que la validación de egreso siempre queda después de la opción y de las electivas.
- Registro de auditoría: hash `sha256:f5b63f8fcae859602bf2510100d3ab34d09b4211baaf327f2d5385ecd84c7638`. Cola general: 22 identidades pendientes; hash `sha256:95aabddc13d3fd3375f5ed77e31523af40b693e8026c41697683f1a5f2e5bccb`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 37 con sedes oficiales; hash `sha256:4f585548c95c7a783eb324a5bc01d3a9222e1916e107963d9013ff48d6a09d67`. Cola funcional vacía; hash `sha256:8dcd6ac4cb3a82ccb92c57f8dbbe761a9e6dc3363d55817de7976073020d1ba3`.
- Siguiente paso: auditar la Licenciatura en Ingeniería de Medios Plan 2018, primera identidad reproducible restante.

### Licenciatura en Ingeniería de Medios Plan 2018 — implementación conjunta y currículo flexible 2026-08-30

- FIC y FING implementan conjuntamente un único Plan 2018 en Montevideo. Aunque fue creado en 2017 y publicado oficialmente en 2019, la primera cohorte comenzó en marzo de 2026 con 50 cupos; las páginas históricas que todavía decían que la carrera no funcionaba quedaron superadas.
- El plan otorga un único título de Licenciado en Ingeniería de Medios, dura ocho semestres y exige 360 créditos. La UI no convierte las líneas de investigación ni los campos de trabajo en menciones o carreras separadas.
- El egreso controla 85 créditos de Ingeniería —Señales 16, Informática 16, Matemática 25 y Física 16—; 80 de Información, Comunicación y Medios —Lenguajes 24, Teoría 36 y Ciencia de la Información 8—; y 150 de Creatividad e Innovación —Concepción y Producción 40, Técnicas 40 y Actividades Integradoras 58—.
- Los mínimos de los tres grupos suman 315 créditos. Los 45 restantes completan un currículo individual coherente en áreas del plan o formación complementaria, sujeto a aprobación de la Comisión de Carrera.
- El primer semestre efectivamente dictado en 2026 contiene Taller Integrador, Matemática Inicial, Informática, Introducción al Estudio del Audiovisual y Teoría de la Comunicación II. La secuencia posterior presentada en diciembre de 2025 no está publicada como tabla estable; la UI organiza esas alternativas por área sin inventar semestre u obligatoriedad.
- Bedelías aporta 25 entradas de composición y catorce consultas sin regla de previatura publicada. El catálogo es parcial —no incluye aún unidades de Señales e Ingeniería Eléctrica—, por lo que la proyección agrega instrucciones explícitas de elección y una validación final, sin simular materias ni créditos.
- La proyección contiene 29 componentes: 25 unidades de Bedelías, tres instrucciones flexibles de crédito cero y la validación del currículo individual. Conserva una sola trayectoria y una sola sede, con responsabilidad compartida FIC-FING.
- Registro de auditoría: hash `sha256:5d9961c0c29f799b6e49c075a217c93450eb766a5be8e3c454f69d35f17c449a`. Cola general: 21 identidades pendientes; hash `sha256:ce2925fbdb2e6ffee63445fd032f7002bf9d34b67ed6d83ced2651860303f40a`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 37 con sedes oficiales; hash `sha256:f9e5ce958846b5f5bccbdd57698402ff05ecc4fb8cf8275fecdd503566643833`. Cola funcional vacía; hash `sha256:6699d64c39015d60e994f195ba3be129c71076de10fadb5506055e3b0cb3e3f7`.
- Siguiente paso: auditar Ingeniería de Alimentos Plan 2003, primera identidad reproducible restante.

### Ingeniería de Alimentos Plan 2003 — carrera conjunta y currículo flexible 2026-08-30

- Agronomía, Ingeniería, Química y Veterinaria sostienen un único Plan 2003 de cinco años y 450 créditos, con título `Ingeniero Alimentario`. La sede completa y el ingreso vigente están en Facultad de Química, Montevideo.
- La UI conserva una sola trayectoria flexible. Controla 180 créditos de formación básica, 150 de formación profesional específica, 35 de formación complementaria y 35 de actividades integradoras, además de once mínimos positivos por materia.
- Los mínimos de grupo suman 400 créditos: el currículo individual debe agregar al menos 50. Dentro de los grupos, los mínimos por materia dejan 30 créditos básicos, 31 complementarios y 28 profesionales de distribución flexible; estas brechas se muestran como orientación y no se suman otra vez al total.
- El Plan oficial exige aprobación del currículo individual. La proyección incorpora una validación final explícita y no inventa semestres, obligatoriedad ni equivalencias para las alternativas acumuladas de Bedelías.
- FQ, FING y CENURLN publican las mismas 389 entradas y los mismos 17 grupos. Se usa el snapshot FQ por ser la sede e ingreso vigentes: aporta 155 previaturas explícitas y 103 consultas sin regla publicada. FING publica 141 y 47; CENURLN, 10 y 8.
- Salto permite cursar el primer año, pero la guía oficial indica continuidad posterior en Montevideo. No se presenta como sede completa, carrera separada ni trayectoria curricular diferente; el aviso de la UI explica el alcance regional.
- La proyección contiene 394 componentes: 389 entradas acreditables, cuatro instrucciones flexibles de crédito cero y la validación final. La carrera quedó trasladada canónicamente de FING a FQ sin perder la corresponsabilidad institucional.
- Registro de auditoría: hash `sha256:d5c7d6d42ccb5d06b3b96b8276af8c4912ad2741fa95bde359e284a4e6e8705b`. Cola general: 20 identidades pendientes; hash `sha256:2a5f762aff8aaf164ae657ce4e682323018bd9a73020c8c56e83a61a4615898a`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 37 con sedes oficiales; hash `sha256:48f9f4bd7225fdd54b0eb0663f1970c377912d968941045d6c5060eec91fe7e5`. Cola funcional vacía; hash `sha256:6899b636fe06ec0c222e22e8ff8b806f054afb276c3f84f6fe26ee7f84c0b6b4`.
- Siguiente paso: auditar Ingeniería de Producción Plan 2010, primera identidad reproducible restante.

### Ingeniería de Producción Plan 2010 — currícula central y seis tramos territoriales operativos 2026-08-30

- FING y el Plan oficial confirman una única carrera de cinco años y 450 créditos, con título `Ingeniero de Producción`. Las ofertas de Maldonado, Paysandú, Rivera, Rocha, Salto y Tacuarembó son tramos iniciales del mismo plan, no carreras, menciones ni títulos diferentes.
- La UI ofrece siete opciones de sede. Montevideo muestra la currícula sugerida actualizada el 7 de febrero de 2026; Maldonado, Rivera y Rocha ofrecen dos semestres iniciales y continúan desde tercero en Montevideo; Paysandú, Salto y Tacuarembó ofrecen cuatro y continúan desde quinto.
- Paysandú y Salto se presentan como recorridos intersede: algunas unidades requieren presencialidad en la sede hermana. La explicación queda visible antes de elegir la trayectoria y no se confunde esa articulación con una sede completa independiente.
- Los mínimos raíz suman 400 créditos: 160 básicos, 120 específicos de Producción, 60 industriales y 60 integradores. El currículo individual debe completar al menos 50 créditos electivos adicionales aprobados por Facultad.
- Los submínimos dejan distribuciones flexibles de 8 créditos básicos, 10 específicos y 25 industriales. Talleres —22—, Pasantía —8— y Proyecto —30— completan exactamente el bloque integrador; la validación final controla la aprobación del currículo y de las electivas sin duplicar créditos.
- La currícula central distingue obligatorias y electivas sugeridas por semestre. El Proyecto de 30 créditos se presenta una sola vez como actividad anual de los semestres 9 y 10, y el resto de las 206 unidades de Bedelías permanece disponible como catálogo acreditable.
- La proyección contiene 261 componentes: las 206 unidades centrales, cincuenta unidades de los seis tramos regionales, cuatro orientaciones flexibles y una validación final. Conserva 201 reglas publicadas y 46 consultas sin regla explícita.
- El generador ahora incorpora automáticamente orientación y validación en trayectorias territoriales personalizadas y deja como catálogo todas las unidades no seleccionadas. Así cambiar de sede no oculta electivas ni requisitos finales.
- Registro de auditoría: hash `sha256:66ba095b83c7a64662d65eacde58581f82ebdecf192f235dc6897eddf035a4a4`. Cola general: 19 identidades pendientes; hash `sha256:341c13489b0509c4f1b68c419b94da974fd2a1262e09cb30a17c08e1bfc184f9`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 38 con sedes oficiales; hash de auditoría `sha256:66ba095b83c7a64662d65eacde58581f82ebdecf192f235dc6897eddf035a4a4`. Cola funcional vacía.
- Siguiente paso: auditar Ingeniería en Agrimensura Plan 2023, primera identidad reproducible restante.

### Ingeniería en Agrimensura Plan 2023 — currículo individual flexible operativo 2026-08-30

- FING, el Plan 2023 y el catálogo vigente de Udelar confirman una única Ingeniería en Agrimensura de cinco años y 450 créditos, con título `Ingeniero Agrimensor / Ingeniera Agrimensora` y carrera completa en Montevideo. El nuevo plan comenzó a implementarse para ingresos 2025.
- Los cuatro mínimos raíz suman 393 créditos: 145 de formación básica, 193 de formación básico-técnica y tecnológica, 15 de formación complementaria y 40 de actividades integradoras. Los 57 restantes son opcionales aprobados dentro del currículo individual.
- La UI controla además los dieciséis mínimos por área: Matemática, Física, Económicas y Jurídicas, Informática, Teoría de las Observaciones, Agrimensura Legal, Avaluaciones, Catastro, Geodesia, Geomática, Ordenamiento Territorial, Topografía, Ciencias Humanas, Gestión, Pasantía y Proyecto.
- No se encontró una secuencia semestral pública estable con carácter de currícula sugerida. Por eso la trayectoria no inventa semestres: presenta orientación, las 77 unidades de Bedelías como catálogo acreditable organizado por área y una validación final de la Comisión de Carrera.
- Los CIO de Paysandú y Salto son ofertas independientes que pueden articular el inicio de estudios de Ingeniería. No se publican como sedes completas, carreras duplicadas ni trayectorias propias de Agrimensura.
- La proyección contiene 79 componentes: 77 unidades acreditables, una orientación explícita sobre los 57 créditos opcionales y la validación final. Conserva 61 reglas de previatura publicadas y dos consultas sin regla explícita.
- Registro de auditoría: hash `sha256:cc9677be8d2688ba5f8b05bf11e5f6b9b4c8962b56c5e17f24e2da64c9804b45`. Cola general: 18 identidades pendientes; hash `sha256:dd87e48ac164f5c108f174f9b30e9b79d53e6cb8d7bb6fb1894b1e6ebc83d980`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 38 con sedes oficiales; hash `sha256:c71aae268c8600f230dbe45f9e05ae7e4219a2ee4809f42a78cd05cdd5038589`. Cola funcional vacía; hash `sha256:ebea5428b9b1d2c0c87a93e3f1797de7c44eafcf952eb4efee32c53984a9a1cd`.
- Siguiente paso: auditar Ingeniería en Sistemas de Comunicación Plan 2018, primera identidad reproducible restante.

### Ingeniería en Sistemas de Comunicación Plan 2018 — perfiles sugeridos y currículo personalizado operativos 2026-08-30

- FING, el Plan 2018, el catálogo vigente de Udelar y la Comisión de Carrera confirman una única Ingeniería en Sistemas de Comunicación de cinco años, 450 créditos, título `Ingeniero en Sistemas de Comunicación` y carrera completa en Montevideo.
- La UI ofrece cuatro recorridos del mismo título: currícula general con perfil personalizado, Electrónica para comunicaciones, Redes de telecomunicaciones y Procesamiento de información y señales. Los tres perfiles tipo son sugerencias sustituibles, no menciones ni especializaciones certificadas.
- Los cuatro mínimos raíz suman 337 créditos: 110 básicos, 105 básico-tecnológicos, 108 tecnológicos y 14 complementarios. La credencial controla además los trece submínimos positivos, una de las dos modalidades publicadas de proyecto final, 450 créditos y la validación del perfil por la Comisión de Carrera.
- La currícula general identifica 383 créditos antes de opcionales. Los perfiles seleccionan 406, 405 y 416 créditos nominales actuales respectivamente; el resto se elige del catálogo hasta cubrir todos los mínimos y 450, sin convertir las tablas orientativas —que contienen discrepancias internas— en reglas de egreso.
- Bedelías publica 227 apariciones de composición. Cinco códigos reparten sus créditos entre dos áreas, por lo que el generador ahora puede fusionarlos de forma explícita: quedan 222 cursos únicos con ambos destinos de crédito y sin doble conteo total.
- La proyección contiene 224 componentes: 222 cursos acreditables, una orientación de opcionales y una validación final. Conserva 194 reglas de previatura publicadas y 36 consultas sin regla explícita.
- El Proyecto se muestra una sola vez como actividad anual. El requisito de egreso acepta las dos modalidades administrativas publicadas, de 35 y 30 créditos; la distribución sugerida entre semestres no duplica la actividad.
- Registro de auditoría: hash `sha256:11f18ec1884b824c901b6c661acdc118dbc793a1e7dfef8f1bf67fbc379a5872`. Cola general: 17 identidades pendientes; hash `sha256:5c9438ac98350ef7b32d6bee7189481914b1472243d573487649599e11e4278b`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 38 con sedes oficiales; hash `sha256:3392b1c1026f2cfd682fd726af17a3979da0625a2dca55e61a27475785a64268`. Cola funcional vacía; hash `sha256:be9eb2b7e3c31aa6b0e6db31683ac669e3520259f2ad010147ba0a934846e333`.
- Siguiente paso: auditar Ingeniería Físico Matemática Plan 2017, primera identidad reproducible restante.

### Ingeniería Físico-Matemática Plan 2017 — currícula personalizada y ocho perfiles guía operativos 2026-08-30

- FING, el Plan 2017, el catálogo vigente de Udelar y la Comisión de Carrera confirman una única Ingeniería Físico-Matemática de cinco años, 450 créditos, título `Ingeniero Físico-Matemático` y carrera completa en Montevideo.
- La UI ofrece una currícula personalizada y ocho perfiles guía vigentes: Procesos industriales, Energía, Física, Mecánica computacional, Investigación de operaciones, Control, Ciencia de datos y Procesamiento de señales. Son puntos de partida flexibles para el mismo título, no menciones ni especializaciones certificadas.
- Los cuatro mínimos raíz suman 412 créditos: 200 de Ciencias básicas, 80 de Ciencias de la ingeniería, 120 de Ingeniería aplicada y 12 complementarios. Los 38 restantes completan el currículo individual sin asignarse por inferencia a un área.
- Los mínimos subordinados dejan márgenes internos de 50 créditos en Ciencias básicas, 10 en Ciencias de la ingeniería y 7 en Ingeniería aplicada. Estas brechas se solapan con el total y no se presentan como bolsas adicionales independientes.
- Cada perfil selecciona su formación inicial y las unidades fuertemente recomendadas dentro de las áreas oficiales. Todas las demás unidades permanecen en el catálogo acreditable, de modo que el estudiante puede sustituir, profundizar o construir un perfil propio sujeto a aprobación de la Comisión.
- Bedelías publica 335 apariciones de composición. Seis códigos reparten sus créditos entre dos áreas; se fusionan como 329 cursos únicos, con ambas asignaciones conservadas y una sola aparición visual dentro de cada perfil.
- La proyección contiene 331 componentes: 329 cursos acreditables, una orientación para completar mínimos y una validación final. Conserva 241 reglas de previatura publicadas y 34 consultas sin regla explícita.
- El Proyecto de Ingeniería Físico-Matemática se controla como requisito nominal de 35 créditos. La Pasantía, Talleres, mínimos por área, 450 créditos y aprobación del currículo individual se verifican separadamente.
- Los CIO de Paysandú y Salto pueden articular el inicio de estudios de Ingeniería, pero son ofertas independientes: no se muestran como sedes completas ni perfiles territoriales de esta carrera.
- Registro de auditoría: hash `sha256:dcb62e439c34837a091a22e42c21586205892f07e31615d264b5679807454bdf`. Cola general: 16 identidades pendientes; hash `sha256:9b9361d74a244cb4fd8e7761dfab898241bbb40683b9f3337642b78768334fde`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 38 con sedes oficiales; hash `sha256:060afde7423a185e9b0dcdd54ec7ec08365de87142c5d3139d867bf3d6425609`. Cola funcional vacía; hash `sha256:d7e02fa35cd70fa6f4bce1c2c26399cb9b0578d5d1d48fa08f0b67847ce73d2c`.
- Siguiente paso: auditar Ingeniería Industrial Mecánica Plan 1997, primera identidad reproducible restante.

### Ingeniería Industrial Mecánica Plan 1997 — perfiles guía, mínimos alternativos y tramos regionales operativos 2026-08-30

- FING, el Plan 1997 y el catálogo vigente de Udelar confirman una única Ingeniería Industrial Mecánica de cinco años y 450 créditos, con título `Ingeniero Industrial Mecánico`. Existe una propuesta sucesora, pero todavía no reemplaza al plan vigente.
- La UI ofrece una currícula personalizada y tres combinaciones tipo en Montevideo: Fluidos y Energía, Diseño Mecánico y Materiales e Ingeniería de Planta. Los bloques 2016 suman 436, 419 y 443 créditos y advierten que no cubren por sí solos 450 ni todos los mínimos; se presentan como guías sustituibles con catálogo completo.
- Paysandú permite cursar cuatro semestres iniciales articulados con Salto y Tacuarembó publica tres semestres iniciales. Son opciones de sede dentro de la misma carrera y el mismo progreso, con alcance parcial y continuidad posterior en Montevideo claramente indicada.
- El egreso controla doce mínimos fijos que suman 345 créditos, una alternativa de 18 créditos completos en Electrotecnia o en Química y 25 créditos adicionales concentrados en una de once materias. El nuevo requisito alternativo de la UI evita exigir ambas áreas o aceptar una profundización repartida.
- Taller, Pasantía y Proyecto anual se controlan como actividades nominales, además de sus mínimos de 6, 20 y 30 créditos. El currículo individual, las opcionales y la profundización requieren aprobación del Consejo de Facultad.
- Bedelías publica 430 apariciones normalizadas a 427 códigos. Métodos Numéricos y Métodos Numéricos para EDP reparten créditos entre Matemática y Sistemas; Tutoría en Matemática figura completa en dos materias. Los tres códigos se muestran una sola vez y conservan sus asignaciones sin duplicar el total.
- La proyección contiene 462 componentes: 427 unidades únicas de Bedelías, 31 unidades territoriales documentadas, tres orientaciones flexibles y una validación final. Conserva 237 reglas de previatura publicadas y 251 unidades sin regla explícita.
- La guía de Tacuarembó repite Administración y Gestión de las Organizaciones I en los semestres 1 y 3; la proyección la cuenta una sola vez y documenta la anomalía.
- Registro de auditoría: hash actualizado en `data/bedelias/audits/official-source-audits.json`. Cola general: 15 identidades pendientes; Ingeniería Naval Plan 1997 queda como siguiente caso reproducible.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 39 con sedes oficiales. Cola funcional vacía.
- Siguiente paso: auditar Ingeniería Naval Plan 1997, primera identidad reproducible restante.

### Ingeniería Naval Plan 1997 — currícula flexible y combinación sugerida operativas 2026-08-30

- El Plan 1997, la página vigente de FING y el catálogo de Udelar confirman una única Ingeniería Naval de cinco años, 450 créditos y título `Ingeniero Naval`, dictada completamente en Montevideo. Los CIO regionales articulan con la carrera, pero permanecen como ofertas de ingreso independientes y no se presentan como sedes completas.
- La UI ofrece dos trayectorias del mismo título y progreso: `Currícula personalizada`, con todo el catálogo de Bedelías organizado por materias, y `Currícula sugerida 2017`, una combinación tipo oficial sustituible de diez semestres. La guía histórica suma 466 créditos porque asigna 12 a `Máquinas para Fluidos 1`; Bedelías vigente asigna 10 y la proyección actual suma 464. `Estructuras de Buques` se representa una sola vez como unidad anual de 20 créditos.
- Se controlan los dieciséis mínimos oficiales por materia y actividad, Taller, Pasantía, Proyecto Final, 450 créditos y la aprobación del currículo individual por el Consejo de Facultad. La tabla del Plan imprime `TOTAL 385`, aunque sus valores literales suman 382; se conservan los mínimos publicados y no se deriva una cantidad fija de créditos adicionales de ese subtotal inconsistente.
- Bedelías aporta 329 apariciones normalizadas a 326 códigos y 242 reglas publicadas. Tres códigos compartidos se fusionan sin duplicar el total: `2041` y `1087` distribuyen créditos entre Matemática e Informática, mientras `1233` conserva cuatro créditos totales con asignación a dos materias.
- Registro de auditoría: hash `sha256:dce914102b3a6d794acedf96bfebdf2346dfa528b67dcd1d4c7460e35ffb1422`. Cola general: 14 identidades pendientes; hash `sha256:a63e7dcf04f5bc173185dd5b72d32e7e02911922a330809724a92e7c565b208f`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable; hash `sha256:da218baa1f7a1f7e6fc6823a004862fbb3bd88c3b3c6664e40736f33a4108046`. Cola funcional vacía; hash `sha256:8c9fa7c660e2eea27565536ad5cbb8a5b2f8d5ed7c04fc2bb7d437fc3ecf602e`.
- Siguiente paso: auditar Ingeniería Química Plan 2021, primera identidad reproducible restante.

### Ingeniería Química Plan 2021 — carrera compartida y primer año en Salto operativos 2026-08-31

- El Plan 2021, FING, FQ y el catálogo vigente de Udelar confirman una única Ingeniería Química compartida, de cinco años, 450 créditos y título `Ingeniero Químico`. El ingreso por FING o FQ no crea orientaciones ni carreras distintas.
- La UI ofrece una currícula personalizada y dos recorridos iniciales en Montevideo —ingreso por FING e ingreso por FQ— sobre el mismo progreso. Las secuencias completas no se fijan como obligatorias: el informe ARCU-SUR enlaza tres currículas 2024, pero sus archivos de EVA dejaron de estar disponibles anónimamente; se conserva la guía de ingreso y el catálogo vigente sin inventar una malla cerrada.
- Salto aparece como sede seleccionable únicamente para el primer año. Su recorrido muestra las 18 unidades regionales identificadas por el snapshot de CENURLN y explica que la carrera continúa en Montevideo; no se duplica el plan ni se presenta la sede como carrera completa.
- El egreso controla simultáneamente 190 créditos de formación básica, 190 de formación específica, 30 de técnicas no específicas y 5 complementarios, además de los ocho mínimos subordinados que suman 375, 450 créditos totales, Proyecto Industrial I y II y la aprobación del currículo individual por la Comisión de Carrera.
- FING, FQ y CENURLN publican la misma composición de 376 apariciones normalizadas a 375 códigos. `Q47` figura en Química y Avanzadas: se representa una sola vez, conserva elegibilidad en ambas áreas y cuenta cuatro créditos en el total. Las diferencias entre servicios corresponden a cobertura de previaturas, no a currículas distintas.
- La proyección contiene 380 componentes: 375 unidades de Bedelías, cuatro orientaciones de recorrido y una validación final. Conserva 168 reglas publicadas y 88 unidades consultadas sin regla explícita.
- Registro de auditoría: hash `sha256:6bd48322a5b081a5049ecb11419afcd616797ae4dce953bd28f9335409ecc77c`. Cola general: 13 identidades pendientes; hash `sha256:bd16cee0de0d839312ffa9fc3b9cc17a5b728ca754c39c8a23e88faaec99f2c8`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable; hash `sha256:6394b715d7e5aac83de50164349ea1dd3c7990b52efcd6e143b6d043c642dc3a`. Cola funcional vacía.
- Siguiente paso: auditar Licenciatura en Computación Plan 2025, primera identidad reproducible restante.

### Licenciatura en Computación Plan 2025 — ingreso directo, título intermedio y cinco sedes operativos 2026-08-31

- El Plan 2025 publicado en el Diario Oficial, FING y la comunicación institucional de Udelar confirman una única Licenciatura en Computación de cuatro años y 360 créditos, vigente para ingreso directo desde 2026. El catálogo general todavía conserva la descripción anterior de 60 meses e ingreso mediante Analista; la UI prioriza la norma nueva y deja trazada la discrepancia.
- Analista en Computación se modela como título intermedio a los 270 créditos, con mínimos propios de Matemática y Ciencias Experimentales, Fundamentos de la Computación, Fundamentos de Sistemas, Ingeniería de Software, Gestión de Datos e Información y Actividades Integradoras. El título final de Licenciado en Computación exige 360 créditos, todos los mínimos del Plan y el trabajo final.
- FING publica la carrera completa en Montevideo, Tacuarembó, Colonia, Salto y Paysandú. Las cinco ubicaciones son opciones de sede del mismo Plan 2025, recorrido flexible y progreso; no existe evidencia oficial de títulos, mínimos o currículas diferentes por sede y no se crean carreras duplicadas.
- La UI controla 90 créditos de formación básica y 130 de formación básica-tecnológica y técnica, además de sus mínimos subordinados. Los 140 créditos restantes se distribuyen dentro de la currícula personalizada aprobada por la Comisión de Carrera, sin transformar una selección histórica de optativas en obligaciones permanentes.
- Bedelías aporta 44 unidades acreditables y 26 reglas publicadas, pero no lista cursos bajo algunas áreas con mínimo positivo. Se preservan esos mínimos como objetivos oficiales verificables y no se inventan asignaciones. El trabajo final integrador de 20 créditos y la validación del currículo individual se agregan desde la norma oficial.
- La proyección contiene 47 componentes: 44 unidades de Bedelías, una orientación de flexibilidad, el trabajo final y la validación final. El selector académico mantiene una sola carrera bajo FING, una sola trayectoria y cinco sedes intercambiables.
- Registro de auditoría: hash `sha256:f1fb3f23aef96e0a48d5c99b4c28b58bf47f713fe4079fe1c20bdb4dcae86063`. Cola general: 12 identidades pendientes; hash `sha256:707b49595b572fee5f8b567463f056a9d6f153b0f52b4b7fef548eb955b205f0`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 41 con sedes oficiales; hash `sha256:2330d715297343e7e85f3a3702b4973e0cbbe12c49ed08e5c148ce19fdf8304a`. Cola funcional vacía; hash `sha256:355ff722073a52b2bbea5f0ef52358b37bed5f48fa0de92a9762cbb628c86b3d`.
- Siguiente paso: auditar Tecnólogo en Cartografía Plan 2011, primera identidad reproducible restante.

### Tecnólogo en Cartografía Plan 2011 — carrera compartida y currículo flexible operativos 2026-08-31

- El Plan 2011, la página vigente de FING y el catálogo de Udelar confirman una única carrera compartida por las facultades de Ingeniería y Ciencias, con título `Tecnólogo en Cartografía`, sede Montevideo y una duración oficial de cuatro semestres/dos años.
- El egreso exige 180 créditos: 160 de cursos, 10 de Pasantía y 10 de Proyecto. Los ocho mínimos por área suman 144 créditos —Matemáticas 30, Geodesia 16, Análisis Territorial 18, Geomática 24, Humanística 9, Taller de Cartografía Digital 27, Pasantía 10 y Proyecto 10— y los 36 restantes se completan dentro del currículo individual aprobado.
- Bedelías conserva 102 opciones acreditables, incluidas sustituciones y unidades históricas, organizadas en esas ocho áreas. La UI muestra el catálogo completo y sus mínimos, pero no convierte automáticamente los módulos orientativos del plan en una secuencia obligatoria que mezcle versiones incompatibles.
- Pasantía y Proyecto se controlan como actividades nominales de 10 créditos además de sus mínimos de área. La aprobación del currículo individual por la Comisión Coordinadora aparece como validación final de crédito cero.
- Ingeniería y Ciencias muestran la carrera en sus respectivos selectores, pero ambas entradas cargan el mismo identificador de plan, trayectoria y progreso; no se duplica la identidad académica.
- Se resolvieron dos discrepancias oficiales: Bedelías y el catálogo general conservan 60 meses, mientras el Plan y FING establecen dos años; la página de FING abrevia `160 créditos`, pero el Plan agrega Pasantía y Proyecto y fija 180 totales.
- La proyección contiene 104 componentes: 102 unidades de Bedelías, una orientación sobre los 36 créditos flexibles y una validación final. Conserva 55 reglas publicadas y 30 consultas sin regla explícita.
- Registro de auditoría: hash `sha256:c693171b1c1377fcb96ad2277ae376eb8a54a76632eea57ee48157836167b44c`. Cola general: 11 identidades pendientes; hash `sha256:6ef5a98fafa896d36e907388b9de93223de00b20c71a41b3c5685fa59e39e431`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 41 con múltiples sedes oficiales; hash `sha256:3d945ed4f726b9cf95e5515fcf1966ca8900a9ae4939f948569594a239310d75`. Cola funcional vacía; hash `sha256:6311e14861b4dcf68c395b508e74d74b5a1ff8a65edbfc6b8ff80b823af3b07d`.
- Siguiente paso: auditar Tecnólogo en Informática Plan 2007, primera identidad reproducible restante.

### Tecnólogo en Informática Plan 2007 — plan interinstitucional y cinco sedes operativos 2026-08-31

- El Plan 2007, la página vigente de UTEC, los sitios actuales de FING y el acuerdo interinstitucional confirman una única carrera de seis semestres y 252 créditos, con título `Tecnólogo en Informática`, gestionada conjuntamente por Udelar, UTEC y DGETP-UTU.
- Montevideo, Florida, Maldonado, San José y Paysandú aparecen como sedes seleccionables del mismo plan, trayectoria y progreso. Buceo y LATU se conservan como ubicaciones de la oferta montevideana, no como carreras o sedes académicas duplicadas.
- La modalidad territorial no altera el modelo académico: Florida, Maldonado y San José publican oferta presencial y Paysandú híbrida. CURE y CENURLN tienen exactamente la misma huella curricular de 57 unidades que FING; su menor cobertura de previaturas no prueba una variante de plan.
- El egreso controla siete mínimos oficiales —Matemática 26, Programación 44, Arquitectura/Sistemas Operativos/Redes 32, Bases de Datos/Sistemas de Información 24, Desarrollo de Software 12, Ciencias Humanas y Sociales 28 y Proyecto/Pasantía 30— que suman 196 créditos. Los 56 restantes se completan dentro de la implementación curricular aprobada.
- Pasantía Laboral y Proyecto se exigen nominalmente con 10 y 20 créditos. La validación de la implementación curricular y del egreso por la Comisión Nacional se representa como control manual de crédito cero.
- Bedelías aporta 57 unidades y 61 reglas publicadas; tres consultas no tienen regla explícita. La UI conserva todo el catálogo por área y no fuerza una secuencia semestral única porque la disponibilidad concreta de optativas depende de cada sede.
- Se corrigió la duración genérica de 60 meses de Bedelías a los 36 meses/seis semestres del Plan oficial y la oferta vigente. La evolución institucional desde ANEP/CETP hacia UTEC y DGETP-UTU queda trazada sin cambiar la identidad del Plan 2007.
- Registro de auditoría: hash `sha256:8d55bcfbd6ba3ce1f7afd675ccd47e75afa90af6ea46ad58ec38ce27ceb4f909`. Cola general: 10 identidades pendientes; hash `sha256:fef4da64fc7f5cf862945d670fbb489e5a406262c44f1ddc9b3a11b452ef2f62`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 42 con sedes oficiales; hash `sha256:487ee89b4ecd51c9f4e772d7893f2de82df244b3269b45b12541f8923bc1d244`. Cola funcional vacía; hash `sha256:365754cac4863889e85bfe7b3ec5da68bdedce4b9836e6b63264c1f9b45bea68`.
- Las pruebas deterministas cubren identidad única, cinco sedes, mínimos, flexibilidad, Pasantía, Proyecto, validación y avance de cola. El navegador integrado no estuvo disponible en esta sesión, por lo que no se declara una nueva inspección visual manual; siguen vigentes las pruebas estructurales de temas y adaptación móvil/tablet.
- Siguiente paso: auditar Tecnólogo en Telecomunicaciones Plan 2009, primera identidad reproducible restante.

### Tecnólogo en Telecomunicaciones Plan 2009 — carrera completa en Rocha y primer año en Montevideo operativos 2026-08-31

- El Plan 2009, la oferta vigente 2026 del CURE, FING y el catálogo de Udelar confirman una única carrera y título `Tecnólogo en Telecomunicaciones` de 200 créditos. Rocha dicta la carrera completa; Montevideo ofrece sólo el primer año y la continuidad se realiza en Rocha sin crear otro plan ni perder el progreso.
- La implementación vigente se organiza en cinco semestres/dos años y medio. El Plan original recomendó dos años con seis cuatrimestres y Bedelías conserva un valor genérico de 60 meses; la UI prioriza los 30 meses publicados por CURE y FING para el recorrido actual y conserva las otras cifras como anomalías trazables.
- Rocha muestra la grilla actual por semestre y deja las demás unidades en el catálogo flexible. Montevideo muestra exclusivamente las ocho unidades de su tramo inicial; no expone Proyecto, Pasantía, validación ni el catálogo de la carrera completa como si pudieran cursarse allí.
- Los seis mínimos oficiales son Matemática y Estadística 25, Física 18, Informática 25, Telecomunicaciones 60, Ciencias Humanas y Sociales 10 y Proyecto/Pasantía 12. Suman 150 créditos; la credencial controla además 200 créditos totales, una alternativa entre Proyecto y Pasantía y la validación de la Comisión de Carrera.
- La grilla vigente de Rocha suma 185 créditos antes de la actividad final y 199 al elegir Proyecto o Pasantía de 14 créditos. No se redondea ni inventa el crédito faltante: la UI mantiene el objetivo oficial de 200 y el catálogo aprobado para completar simultáneamente el total y los mínimos.
- FING y CURE publican la misma huella curricular de 37 unidades. Se usa el snapshot CURE como fuente canónica porque aporta 30 reglas de previatura frente a 6 en FING; nueve consultas siguen sin regla publicada. La diferencia de cobertura no se presenta como variante curricular.
- Registro de auditoría: hash `sha256:8f69a3e78e4a8e208b2b28369de9ecb28b910c08018fe6cafb88d3481058e5f5`. Cola general: 9 identidades pendientes; hash `sha256:d554de4f14a75fc5b4994043079b9a4683420e7dfa983018dbd6ddc931e7852c`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 43 con sedes oficiales; hash `sha256:9c9216ed5deb64c5dcef5037de97c9351bc0dea4ccbbd2bdc980a418b360b0a2`. Cola funcional vacía; hash `sha256:41c27e86e8e2cfe8c4f19ed020ba466323569c7228c74ddd522ba30281ec7809`.
- Las pruebas deterministas cubren plan único, filtrado por sede, alcance parcial de Montevideo, grilla de Rocha, mínimos, alternativa de egreso, previaturas y avance de cola. El navegador integrado sigue sin estar disponible, por lo que no se declara una nueva inspección visual manual; las pruebas estructurales de temas y adaptación móvil/tablet permanecen activas.
- Siguiente paso: auditar Tecnólogo Industrial Mecánico Plan 2016, primera identidad reproducible restante.

### Tecnólogo Industrial Mecánico Plan 2016 — carrera interinstitucional y cuatro perfiles guía operativos 2026-08-31

- El Plan 2016, FING, UTEC y el catálogo de carreras del interior confirman una única carrera interinstitucional de seis semestres y 270 créditos, con título `Tecnólogo Industrial Mecánico`. Montevideo y Paysandú son sedes del mismo plan y progreso, no carreras ni variantes curriculares separadas.
- La UI ofrece una currícula personalizada y cuatro combinaciones tipo oficiales: Fluidos y Energía, Diseño Mecánico y Materiales, Planta y Producción. Son guías sustituibles del mismo título y suman respectivamente 273, 272, 271 y 270 créditos; la disponibilidad concreta de optativas debe verificarse por sede y período.
- El egreso controla ocho mínimos: Taller 20, Matemática 40, Física 36, Fluidos y Energía 40, Materiales y Diseño 42, Ingeniería de la Producción Industrial 24, Electrotecnia y Control 30 y Actividades complementarias 10. Suman 242 créditos; los 28 restantes completan un conjunto optativo coherente hasta alcanzar 270.
- Pasantía se exige nominalmente con 10 créditos y la validación final controla el currículo, las optativas y el egreso por la Comisión de Carrera. Las elecciones genéricas de 10 créditos que completan Diseño y Producción se muestran como instrucciones de crédito cero: sólo cuentan las unidades reales seleccionadas del catálogo.
- Bedelías aporta 44 unidades, 68 reglas publicadas y ocho consultas sin regla explícita. Todas las unidades quedan disponibles como catálogo acreditable al cambiar de perfil o sede, sin duplicar progreso ni ocultar alternativas.
- Se preservan tres discrepancias trazables: el resumen del Anexo II imprime 40 en vez de 42 créditos para Materiales y Diseño; el Anexo I imprime 8 para Instrumentación y Control frente a los 10 de la implementación y Bedelías vigentes; e Instalaciones de gases figura con 10 en el plan y 12 en Bedelías actual.
- Registro de auditoría: hash `sha256:a121fd087f2714cfd17dc8859d8f82693d489c9aa8d83fafbf3b83b3a1a6b9c9`. Cola general: 8 identidades pendientes; hash `sha256:36a530472630f39646ce7cfd6f265b81b69730eebbf2451eb700fc88862e228c`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable y 44 con múltiples sedes oficiales; hash `sha256:055f4933d53df758ed2ae32878da6a91eb2f679d42f6a830943b95a2e4cf61f0`. Cola funcional vacía; hash `sha256:bb421a5643013ff9ced5159b22daf7d451d9148f974f6ac4fb3516b5aaf62572`.
- Las pruebas deterministas cubren identidad única, sedes, cinco recorridos, créditos semestrales, catálogo completo, mínimos, Pasantía, validación y avance de cola. El navegador integrado no está disponible en esta sesión; no se declara inspección visual manual nueva y permanecen activas las pruebas estructurales de temas y adaptación móvil/tablet.
- Siguiente paso: auditar Bachiller en Ciencias Químicas Plan 2000, primera identidad reproducible restante.

### Bachiller en Ciencias Químicas Plan 2000 — título intermedio y cinco carreras de origen operativos 2026-08-31

- Facultad de Química, el damero oficial, el procedimiento vigente de solicitud de títulos y las estadísticas de Udelar confirman un único título intermedio Plan 2000 de 230 créditos y tres años. Continúa siendo solicitable por estudiantes habilitados, pero no tiene ingreso directo.
- La UI lo separa explícitamente de la Tecnicatura Bachiller en Ciencias Químicas Plan 2015, que es una oferta distinta de cinco semestres y 225 créditos. El selector académico rotula el Plan 2000 como `título intermedio vigente · sin ingreso directo`.
- `Carrera de origen` permite elegir cinco recorridos hacia el mismo título y progreso: Bioquímico Clínico Plan 2000, Químico Farmacéutico Plan 2000, Químico Plan 2000, Ingeniería de Alimentos e Ingeniería Química. No se crean cinco carreras ni cinco credenciales académicas diferentes.
- Todos los recorridos controlan 230 créditos, al menos 170 obligatorios y 60 electivos. Los perfiles de Ingeniería de Alimentos e Ingeniería Química aplican además los mínimos publicados por Bedelías: 28 físico-matemáticos, 89 químicos y distribuciones 9/44 o 4/49 entre Biología y asignaturas específicas.
- El damero reconstruye los tres recorridos FQ que SGAE no etiqueta: el núcleo y las unidades específicas seleccionan 173 créditos para Bioquímico Clínico y Químico Farmacéutico, y 176 para Químico. El resto se completa con electivas y validación de Bedelía, sin inventar equivalencias entre versiones históricas.
- Se conservan las discrepancias documentales: el damero declara 136 créditos comunes aunque sus valores suman 135 y llama 37 a bloques que suman 38; Bedelías y el catálogo general publican 24 meses, mientras Planeamiento clasifica el título con tres años. La UI usa los mínimos normativos, los créditos literales y 36 meses.
- El generador ahora admite rótulos de credencial distintos de `Título de grado`, estados académicos precisos en el selector, cursos oficiales válidos para más de un requisito y exclusiones de catálogo por recorrido. Esto evita que el título intermedio aparezca como carrera de ingreso o que unidades históricas exclusivas contaminen los perfiles de Ingeniería.
- La proyección contiene 169 componentes: 164 alternativas normalizadas de Bedelías, cuatro unidades históricas del damero que no estaban en esos perfiles y la validación final. Conserva 67 reglas publicadas y 115 consultas sin regla explícita.
- Registro de auditoría: hash `sha256:a387a2aba9d04381b134c7e5eca734e255bf83d8364c5d6ed497a9427b2da725`. Cola general: 7 identidades pendientes; hash `sha256:2471ff23a342fff3fed0445273470cee5f2c6a9ddaca468fbbe6193c4d08fe62`.
- Manifiesto UI: 139 proyecciones, todas con composición utilizable; hash `sha256:64cd616e379949d1db140805f0eb2bc8e6f4ae25f578f8c60751073002daf757`. Cola funcional vacía; hash `sha256:3a153df0cf30b8a7ca42001d6763d66c57b2d5143545d0926af08837452189be`.
- Siguiente paso: auditar Bioquímico Clínico Plan 2015, primera identidad reproducible restante.
