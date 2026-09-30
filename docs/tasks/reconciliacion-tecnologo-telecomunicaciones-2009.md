# D03n — Currícula oficial del Tecnólogo en Telecomunicaciones 2009

## Estado y modelo

Nodo preparado después de D03m. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D01, D03a y D03k integrados.

## Objetivo

Cerrar la correspondencia exacta entre la grilla vigente de cinco semestres publicada por CURE/FING y la currícula de Rocha. Mantener el mismo plan y progreso para el primer año parcial de Montevideo. El planificador debe incluir toda la oferta verificada y las optativas/electivas disponibles sin IDs repetidos.

## Fuentes prioritarias

- Plan 2009 FING: https://www.fing.edu.uy/sites/default/files/2011/3054/plan_tecnologo_telecom.pdf
- Oferta y grilla vigentes CURE: https://www.cure.edu.uy/ensenanza/oferta-educativa/tecnologo-en-telecomunicaciones/
- Página vigente FING: https://www.fing.edu.uy/carrera/grado/tecn%C3%B3logo-en-telecomunicaciones-rocha
- Ficha Udelar: https://udelar.edu.uy/carrera/tecnologo-en-telecomunicaciones

Comprobar los documentos de la grilla enlazados por esas páginas y su vigencia. Registrar autoridad, URL, fecha y huella de los artefactos usados. Bedelías respalda identidad, códigos y reglas disponibles; no sustituye a la grilla sugerida.

## Reglas

- Rocha debe mostrar cinco semestres con etiquetas, materias, orden y actividades opcionales exactamente respaldados por la publicación vigente.
- Montevideo conserva sólo el primer año respaldado y explica la continuación en Rocha. No inferir períodos o una carrera completa para esa sede.
- Mantener 200 créditos, seis mínimos, alternativa entre Proyecto y Pasantía y validación de la Comisión. La suma de la grilla vigente da 199 al elegir una actividad de 14 créditos; mostrar la discrepancia, sin redondear ni crear un crédito.
- El Plan 2009 original menciona seis cuatrimestres, pero la implementación vigente usa cinco semestres. Documentar esa diferencia temporal sin mezclar las secuencias.
- Toda materia de la grilla oficial debe conservar una identidad visible. Mantener candidatos o equivalencias no verificadas fuera de la oferta normal.
- Si la correspondencia completa no se demuestra, conservar el estado pendiente y el recorrido actual; documentar el límite sin declarar trayectoria reproducida.

## Verificación y entrega

- Crear fuente curada/generador determinista y reanudable según la estructura vigente del repositorio. Guardar descargas y checkpoints en `tmp/d03n-telecom-2009/` dentro del worktree.
- Actualizar auditoría, inventario y contexto compartido sólo con resultados confirmados.
- Probar período y colocaciones exactas, sedes, alternativas, catálogo completo y ausencia de IDs duplicados. Regenerar dos veces con hashes idénticos; ejecutar focales, `npm test`, `npm run lint` y `git diff --check`.
- Crear commit enfocado en worktree aislado basado en el `main` más reciente. Entregar hash, evidencia, verificaciones y riesgos; no integrar, pushear ni publicar desde el subagente.
