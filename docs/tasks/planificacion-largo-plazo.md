# Planificación académica a largo plazo

## Estado

Propuesta de producto. No implementada.

## Problema

Trayecto ya permite registrar avance, distribuir materias en semestres, marcar un semestre actual, trasladar pendientes y exportar o importar la información. Para sostener el uso durante varios años todavía debe ayudar a responder con confianza:

- qué cursar el próximo semestre y por qué;
- si un semestre es viable por requisitos, carga y oferta;
- qué cambia entre dos alternativas de recorrido;
- qué ocurrió con una materia cursada anteriormente;
- cómo recuperar una modificación accidental o un dispositivo perdido;
- si una actualización de los datos oficiales afecta el plan personal.

## Principios

- La currícula oficial, la planificación personal y las recomendaciones deben seguir siendo conceptos distintos.
- Una sugerencia nunca se presenta como habilitación u oferta confirmada.
- La herramienta debe seguir siendo útil sin cuenta.
- Los datos desconocidos —horarios, período de dictado o carga— se muestran como desconocidos, no se infieren.
- Las mejoras deben funcionar también para planes expresados en horas o cantidad de unidades, no sólo para carreras creditizadas.

## Capacidades priorizadas

### Fase 1 — Confianza y recuperación

1. Agregar deshacer para cambios recientes de progreso y planificación.
2. Incorporar una papelera temporal para semestres eliminados.
3. Mostrar fecha de la última modificación local y el estado del respaldo.
4. Unificar la exportación completa en un formato versionado que incluya progreso, planificación, selección académica y preferencias transferibles.
5. Detectar datos locales incompatibles o parcialmente migrados y ofrecer reparación o exportación antes de descartarlos.
6. Mostrar la versión o fecha de actualización de la fuente curricular utilizada por cada plan.

### Fase 2 — Planificación realista

1. Permitir definir un objetivo de carga por semestre en créditos, horas o cantidad de materias según el plan.
2. Señalar, sin bloquear, semestres por encima del objetivo personal.
3. Validar cada semestre contra previaturas conocidas y explicar qué requisito falta.
4. Distinguir tres estados de disponibilidad: oferta confirmada, oferta habitual y sin información publicada.
5. Incorporar período de dictado, sede y modalidad únicamente cuando exista una fuente oficial o institucional trazable.
6. Advertir materias duplicadas, ya exoneradas o planificadas antes de cumplir sus requisitos.
7. Mostrar el efecto estimado del semestre sobre créditos totales, áreas y títulos intermedios.

### Fase 3 — Escenarios

1. Permitir duplicar una planificación como escenario sin alterar la principal.
2. Comparar escenarios por duración estimada, carga por período, requisitos pendientes y avance por área.
3. Marcar un escenario como plan principal y archivar los demás.
4. Permitir notas breves por semestre y por materia, explícitamente personales y no oficiales.

### Fase 4 — Seguimiento longitudinal

1. Crear una línea temporal de semestres planificados, en curso y cerrados.
2. Conservar el resultado histórico de una materia sin confundirlo con su estado actual acreditable.
3. Mostrar próximos hitos: título intermedio, mínimos de área, práctica, proyecto o egreso.
4. Avisar cuando una actualización de la fuente modifica créditos, requisitos o pertenencia al plan, mostrando la diferencia antes de aplicarla al recorrido personal.
5. Evaluar exportación a calendario sólo cuando existan fechas oficiales suficientemente completas.

## Decisiones de modelo necesarias

- Separar `estado acreditable` de `historial de cursado`. Aprobar un curso, aprobar un examen y exonerar no son eventos equivalentes.
- Identificar cada semestre con un ID estable y almacenar orden, etiqueta, estado y rango de fechas opcional.
- Identificar escenarios de planificación por ID, con uno marcado como principal.
- Conservar IDs institucionales de materias y una referencia a la versión del plan para poder explicar cambios de datos.
- Tratar notas, objetivos de carga y escenarios como datos personales; no mezclarlos con la definición curricular del repositorio.

## Fuera de alcance inicial

- Predecir horarios o cupos.
- Recomendar materias usando datos de otros estudiantes.
- Calcular probabilidades de aprobación.
- Importar automáticamente una escolaridad desde una cuenta institucional.
- Presentar una ruta “óptima” como si fuera oficial.

## Criterios de aceptación del primer incremento

- Una persona puede deshacer una modificación accidental sin restaurar todo el archivo.
- Eliminar un semestre no destruye inmediatamente su contenido.
- La exportación completa permite reconstruir el estado transferible en otro navegador.
- La interfaz informa cuándo se guardó por última vez y qué datos están sólo en el dispositivo.
- Ninguna advertencia de carga u oferta bloquea una planificación cuando la fuente no permite afirmarlo.

## Dependencias

- La Fase 1 debe preceder a la sincronización con cuentas: proporciona un formato estable, recuperación y una migración verificable.
- La disponibilidad por semestre requiere una fuente distinta de la composición de Bedelías y debe diseñarse como enriquecimiento trazable.
- Los escenarios y el historial requieren extraer el estado del planificador de la estructura monolítica actual antes de incorporar persistencia remota.

