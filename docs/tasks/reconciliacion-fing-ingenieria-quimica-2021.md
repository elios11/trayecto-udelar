# D03l — Trayectoria oficial de Ingeniería Química Plan 2021

## Estado

Nodo preparado para implementación. Continúa D03 después del cierre FQ y de la garantía global de recorridos no vacíos.

## Modelo y dependencias

- Modelo: `gpt-5.6-sol`.
- Esfuerzo: `xhigh`.
- Dependencias: D01, D03a, D03k y D03j integrados en `main`.

## Objetivo

Reemplazar el `Recorrido orientativo generado` de Ingeniería Química Plan 2021 por la trayectoria institucional vigente, siempre que las currículas sugeridas oficiales puedan recuperarse y reconciliarse de forma exacta. Mantener una sola carrera y un solo progreso compartidos entre FING y FQ, con Montevideo y el primer año de Salto como alcances territoriales del mismo plan.

## Fuentes y autoridad

- Priorizar las tres currículas de ingreso 2024 enlazadas por el informe de autoevaluación ARCU-SUR 2025 y cualquier copia institucional vigente que publique FING, FQ, la Comisión de Carrera o Udelar.
- Usar el Plan de Estudios 2021, el catálogo de carreras y las páginas de FING/FQ para validar identidad, título, duración, créditos, mínimos, alcance territorial y vigencia; no usarlos para inventar una secuencia que no publiquen.
- EVA puede ayudar a localizar archivos oficiales, pero un curso EVA ni la composición de Bedelías demuestran por sí solos la trayectoria sugerida.
- Registrar URL, autoridad, fecha, alcance y huella de cada artefacto utilizado. Si un enlace oficial ya no responde, buscar una copia institucional o archivada trazable antes de declararlo irrecuperable.

## Comportamiento esperado

1. Reproducir los períodos, materias y variantes de ingreso exactamente como los publique la fuente vigente.
2. No convertir ingreso por FING, ingreso por FQ ni primer año en Salto en carreras, títulos u orientaciones de egreso distintos.
3. Mantener una `Currícula personalizada` solamente si la fuente oficial la define como opción flexible; no usarla para ocultar una secuencia sugerida publicada.
4. Conservar al menos una identidad canónica visible para toda materia enumerada en los períodos oficiales.
5. Mantener en el planificador la unión completa y sin IDs duplicados de todas las materias vigentes del plan y sus optativas/electivas verificadas, aunque no pertenezcan al recorrido activo.
6. Restringir Salto al alcance oficial demostrado y explicar la continuidad en Montevideo.
7. Preservar progreso, estados personales e identidades canónicas existentes al sustituir el fallback.

## Seguridad académica

- No promover como vigente ninguna materia respaldada sólo por la composición de Bedelías.
- No inferir semestres por orden, código, área, previas o parecido de nombres.
- No fusionar materias parecidas sin equivalencia o grupo de alternativas oficial.
- Si las currículas sugeridas no pueden recuperarse con evidencia suficiente, conservar D03k como fallback provisional, documentar el bloqueo y mantener el inventario en `official-trajectory-identified-pending`; no declarar el nodo cerrado ni fabricar una malla.
- Las materias provisionales del fallback no cuentan para requisitos oficiales ni cambian silenciosamente a `verified`.

## Implementación

- Guardar fuentes y notas de extracción recuperables dentro del worktree bajo `tmp/d03l-iq-2021/` y datos curados permanentes bajo `data/fing/` o una ubicación compartida FING/FQ coherente con el repositorio.
- Preferir un generador determinista y reanudable que produzca la proyección registrada de `bedelias-fing-ingenieria-quimica-2021`.
- Actualizar la auditoría oficial, el inventario D03 y `PROJECT_CONTEXT.md` sólo con resultados confirmados.
- Añadir pruebas focales de correspondencia de períodos, materias, variantes/sedes, catálogo completo del planificador, preservación de identidades y ausencia de duplicados.
- Regenerar dos veces y comprobar que la segunda ejecución no cambia archivos.

## Criterios de aceptación

- La currícula predeterminada reproduce la trayectoria sugerida oficial vigente con correspondencia estructurada y deja de mostrar el rótulo provisional.
- Todas las materias de cada período oficial existen en la proyección y ninguna desaparece por la purga de candidatos.
- El planificador contiene todas las materias verificadas y optativas/electivas disponibles para la carrera, sin IDs repetidos.
- FING y FQ siguen apuntando al mismo ID de plan y progreso; Salto sigue siendo una sede inicial parcial.
- `data/official-trajectories/inventory.json` cambia a `official-trajectory-reproduced` sólo si la evidencia estructurada es exacta.
- `npm test`, `npm run lint` y `git diff --check` pasan.

## Entrega

Implementar en un worktree aislado basado en el `main` más reciente. Crear un commit enfocado y devolver el hash, fuentes usadas, alcance reproducido, catálogo publicado, verificaciones y cualquier limitación. No integrar, hacer push ni publicar desde el subagente.
