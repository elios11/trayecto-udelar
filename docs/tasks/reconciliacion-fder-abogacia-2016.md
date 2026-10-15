# D03ap — Abogacía, Plan 2016

## Estado y objetivo

`bedelias-fder-abogacia-2016` figura `research-pending` en el inventario D03 pese a que Facultad de Derecho publica la distribución del Plan 2016. Reconciliar la trayectoria oficial con la Currícula y el catálogo disponible del planificador. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a. Un solo subagente en un worktree propio basado en el `main` actual.

## Autoridad y límites

- Usar la [página oficial de Abogacía](https://www.fder.edu.uy/node/4052), que enumera materias por año y semestre, y cotejarla con la [grilla vigente actualizada en 2024](https://www.fder.edu.uy/sites/default/files/2024-05/grilla-abogac%C3%ADa-actualizada-20240527.pdf), el [Plan 2016](https://www.fder.edu.uy/node/529) y la [grilla de Procurador](https://www.fder.edu.uy/node/3873). Inspeccionar visualmente las tablas PDF. Registrar conflictos entre fuentes, fecha, vigencia, páginas/filas y huellas reproducibles; no resolver discrepancias por intuición.
- Reutilizar `data/bedelias/fder-abogacia-2016.json`, `data/bedelias/cenurln-abogacia-2016.json` y la auditoría regional versionada. No repetir extracción. Conservar un solo plan y progreso para Montevideo y Salto; contrastar toda diferencia territorial antes de afirmar una variante.
- Mantener 450 créditos y los seis mínimos de área ya auditados; Procurador es título intermedio de 160 créditos dentro del mismo plan. Las unidades optativas/electivas, talleres repetidos, seminarios de área y actividades integrativas son cupos o ediciones según fuente, nunca una obligación de aprobar todos los registros técnicos. Una misma materia no debe contar dos veces sólo por repetirse en la página.
- La pertenencia al catálogo visible exige evidencia curricular oficial exacta. Códigos, créditos y previas de Bedelías sirven para cotejo, no para crear materias. Preservar IDs de progreso; bloques sólo-fuente cuando no exista código inequívoco. No tomar programas individuales, EVA ni oferta semestral como malla principal.

## Artefactos y cierre

- Versionar evidencia normalizada bajo `data/fder/` con fuentes, alcance, filas/identidades cotejadas y huellas de porción fuente. Generador offline que reconstruya proyección, auditoría, revisión, colas e inventario; dos regeneraciones idénticas sin red.
- Probar períodos, todas las materias publicadas, áreas, 450 créditos, Procurador 160, flexibilidad, frontera `verified`/`candidate`, sedes y compatibilidad de progreso. Una prueba debe detectar que desaparezca cualquier materia explícita de la grilla oficial.
- Actualizar `docs/carreras-a-actualizar.md` sólo si se demuestra malla futura, implementación progresiva o alcance parcial; `PROJECT_CONTEXT.md` sólo ante una decisión estable confirmada.
- Ejecutar pruebas focales, `npm test`, `npm run lint` si cambia código y `git diff --check`. Crear un commit enfocado, reportar riesgos. No integrar, hacer push ni desplegar desde el worktree.

## Estado de implementación

- Evidencia normalizada: `data/fder/abogacia-2016-trajectory-review.json`, con las diez filas de período, 65 identidades técnicas inequívocas, cinco cupos flexibles sólo-fuente, las sedes compartidas y huellas por porción.
- Generación offline: `npm run trajectory:fder-abogacia-2016`; reconstruye proyección, auditoría, revisión, colas e inventario sin volver a consultar la red.
- Conflictos preservados: la grilla suma 452 créditos por filas aunque publica 450; Bedelías consigna 10 créditos para cada Consultorio frente a 11 en la grilla; la composición publicada de Procurador suma 162 aunque el título exige 160; la página HTML no enumera cuatro de los cinco cupos flexibles del PDF.
- Cierre local: dos regeneraciones offline consecutivas produjeron el mismo SHA-256 agregado (`005fd31941ba6f1abac6de7c67c792f36a22ce242e05dbcb60bd8de0a357a81e`). Pasaron las pruebas focales, `npm test` (1063 pruebas), `npm run lint` y `git diff --check`; no hubo integración, push ni despliegue.
