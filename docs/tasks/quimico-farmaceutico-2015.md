# Química Farmacéutica - Plan 2015

## Alcance

Incorporar a Trayecto la carrera **Química Farmacéutica** de la Facultad de Química de Udelar, Plan 2015 vigente. La trayectoria es general; la carrera se dicta en Montevideo y permite cursar el primer año en Salto. El plan otorga el título de **Químico Farmacéutico**.

La implementación debe incluir el damero sugerido vigente, materias obligatorias, optativas y electivas, créditos, mínimos por materia/área, Practicantado y previaturas de curso/examen publicadas por Bedelías. Las ausencias o diferencias entre fuentes deben quedar identificadas, sin presentarse como información oficial completa.

## Identidad y requisitos confirmados

- Carrera en Bedelías: `QUÍMICA FARMACÉUTICA`.
- Servicio Bedelías: `FQ` - Facultad de Química.
- Plan: 2015, de grado y vigente; rige desde el curso lectivo 2016.
- Título: Químico Farmacéutico.
- Duración nominal: 10 semestres / 5 años.
- Total: 450 créditos.
- Asignaturas obligatorias: 324 créditos.
- Optativas y electivas: 71 créditos combinados, con al menos 60 créditos optativos.
- Practicantado: 55 créditos.
- No se confirmó un título intermedio propio de esta carrera y no se modelará uno.

## Fuentes oficiales

Consultadas el 2026-08-11:

- Página de carrera FQ: <https://www.fq.edu.uy/?q=es%2Fnode%2F619>
- Plan de Estudios 2015 aprobado por CDC: <https://www.fq.edu.uy/sites/default/files/archivos/QU%C3%8DMICO%20FARMAC%C3%89UTICO%202015%20VERSI%C3%93N%20FINAL.pdf>
- Damero sugerido adjunto como resolución 112 CFQ del 12/03/2026: <https://www.fq.edu.uy/sites/default/files/archivos/Qu%C3%ADmico%20farmac%C3%A9utico%20res%20112%20CFQ%2012%2003%202026.pdf>
- Catálogo de optativas, actualizado 13/07/2026: <https://www.fq.edu.uy/sites/default/files/archivos/Optativas%20QF_31.pdf>
- Catálogo de electivas, actualizado 21/07/2026: <https://www.fq.edu.uy/sites/default/files/archivos/Electivas%20QF_42.pdf>
- Consulta pública de Bedelías: <https://bedelias.udelar.edu.uy/>

El damero adjunto en 2026 prevalece para la trayectoria sugerida sobre el archivo de damero anterior enlazado por buscadores. Mantiene la leyenda de actualización del 19/12/2024, pero incorpora cambios concretos como `Bioquímica Opción II` (10 créditos), `Laboratorio de Bioquímica` (5 créditos) y `Sistemas de Gestión` (4 créditos).

## Extracción Bedelías

Extracción completada sin incidencias el 2026-08-11. Resultado: 441 cursos/equivalencias en la composición y 446 reglas de curso/examen.

Comando reanudable utilizado:

```powershell
npm.cmd run bedelias:service -- --service FQ --careers "QUÍMICA FARMACÉUTICA"
```

- Estado del lote: `data/bedelias/batches/fq-vigentes.json`.
- Índice del servicio: `data/bedelias/services/fq-index.json`.
- Snapshot: `data/bedelias/fq-quimica-farmaceutica-2015.json`.
- Para reanudar tras una interrupción se debe ejecutar exactamente el mismo comando, sin borrar checkpoints ni forzar una actualización del índice.
- La reconsulta selectiva del 13 de agosto de 2026 recuperó 8 reglas que habían quedado truncadas por el límite anterior de expansión del árbol. El snapshot actual conserva 448 reglas, cero grupos lógicos incompletos y supera `npm run bedelias:audit-rules -- --strict`.

## Criterios de aceptación

- Facultad, carrera y Plan 2015 aparecen en la jerarquía académica sin alterar el plan predeterminado actual.
- El damero sugerido se representa en 10 semestres con los 324 créditos obligatorios y el Practicantado de 55 créditos.
- Las metas muestran 450 totales, los cuatro mínimos de materias formativas (42, 108, 69 y 105), 71 créditos flexibles, mínimo 60 optativos y 55 de Practicantado.
- El catálogo completo de composición y las reglas de Bedelías se cargan bajo demanda para este plan.
- Curso y examen permanecen separados; consultas sin regla publicada se identifican explícitamente.
- Progreso, planificador, exportación/importación y selección académica persisten por plan sin romper datos previos.
- Las pruebas de datos verifican identidad, sumas del damero, cobertura de composición, reglas, procedencia y referencias resolubles.
- `npm.cmd test` y `npm.cmd run lint` se ejecutan antes del commit final.

## Estado recuperable

- Completado: lectura de contexto e importador, creación del worktree, dry-run de selección, investigación de fuentes oficiales y verificación textual/visual del plan y damero.
- Completado: extracción y auditoría de Bedelías, modelado del damero y fuentes, proyecciones inicial/diferida, integración en la interfaz y pruebas específicas.
- Cobertura inicial: el damero vigente contiene 48 materias/bloques en 10 semestres con 87 reglas iniciales; el catálogo diferido conserva las restantes 393 materias/equivalencias y 359 reglas.
- Diferencia documentada: Laboratorio de Bioquímica usa los 5 créditos del damero 2026 y queda marcado como conflicto porque Bedelías aún publica 10.
- Verificación final: `npm.cmd test` pasa 67/67. `npm.cmd run lint` conserva exactamente la deuda previa de `main` (12 errores y 1 advertencia), sin hallazgos nuevos.

## Ampliación: dameros históricos

- Se conservan tres trayectorias seleccionables: damero 2026 vigente, actualización 2024 histórica e implementación original incluida en el Plan 2015.
- El PDF directo actualizado el 19/12/2024 y su copia adjunta a la resolución 74/2025 se consideran la misma versión, no dos dameros distintos.
- Las trayectorias históricas se rotulan explícitamente como no vigentes y mantienen sus diferencias de distribución: Matemática 01/02, Bioquímica Opción III, Microbiología General integrada y los bloques de Calidad/Gestión correspondientes.
- Cada trayectoria debe validar por separado 324 créditos obligatorios, 55 de Practicantado y diez semestres; los 71 créditos flexibles permanecen sin semestre inventado.
- Fuente 2024: <https://www.fq.edu.uy/sites/default/files/archivos/Damero%20QF%20plan%202015.pdf>
- Respaldo resolución 74/2025: <https://www.fq.edu.uy/sites/default/files/archivos/Quimico%20farmaceutico%20res%2074%20CFQ%2031%2007%202025.pdf>
- Fuente original 2015: <https://www.fq.edu.uy/sites/default/files/archivos/QU%C3%8DMICO%20FARMAC%C3%89UTICO%202015%20VERSI%C3%93N%20FINAL.pdf>
- Cobertura ampliada: 54 materias/bloques compartidos entre las tres trayectorias y 91 reglas iniciales; catálogo diferido de 389 materias/equivalencias y 355 reglas. La unión sigue cubriendo las 441 entradas y 446 reglas auditadas de Bedelías, más dos bloques históricos sustentados por documentos de Facultad.
- Verificación de la ampliación: `npm.cmd test` pasa 69/69. `npm.cmd run lint` conserva exactamente la deuda previa de `main` (12 errores y 1 advertencia), sin hallazgos nuevos.
