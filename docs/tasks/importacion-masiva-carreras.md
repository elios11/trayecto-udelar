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
