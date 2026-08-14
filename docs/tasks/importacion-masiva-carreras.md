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
