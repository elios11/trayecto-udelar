# D03ab — Licenciatura en Ciencias Sociales, Salto

## Estado y objetivo

Nodo preparado para implementación. Auditar la Licenciatura en Ciencias Sociales seleccionable como Plan 2009 en CENUR Litoral Norte y reproducir su trayectoria oficial vigente si la fuente la publica. Si no hay evidencia suficiente para distinguir plan, cohorte o secuencia, conservar `research-pending` y entregar un checkpoint verificable, sin inventar semestres.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D01, D02 y D03a integrados. Un solo subagente en worktree dedicado desde el `main` actual; el coordinador revisa e integra.

## Alcance y conflicto conocido

- Resolver explícitamente la identidad y vigencia: la auditoría existente y SGAE registran Plan 2009, mientras la página actual «Enseñanza» de FCS afirma que la carrera de Regional Norte continúa en Plan 1992. No trasladar la malla común de las otras cuatro licenciaturas FCS ni el Ciclo Inicial a esta carrera sin una norma o implementación que lo confirme.
- Buscar primero plan aprobado, reglamento, malla/grilla oficial de la licenciatura en Salto y documentación del CENUR/FCS que identifique cohorte, sede y períodos. Distinguir una malla sugerida de oferta semestral, lista de programas y composición administrativa.
- Cotejar identidades mediante código, créditos y alcance oficial contra `data/bedelias/cenurln-licenciatura-en-ciencias-sociales-2009.json`; conservar candidatos, aliases documentados y progreso personal. No promover las 425 entradas por pertenecer a la composición ni fusionar por semejanza de nombres.
- Si se confirma una trayectoria oficial, modelar períodos, módulos, optativas y variantes exactamente según la fuente. Si se confirma una estructura deliberadamente flexible sin secuencia oficial, documentar con evidencia positiva `no-official-trajectory-documented` y conservar el fallback orientativo correctamente etiquetado. La mera ausencia en búsquedas no basta.
- Versionar fuente normalizada en `data/cenurln/` con URL institucional, autoridad, consulta, vigencia, alcance, identidades cotejadas y huella reproducible. Agregar generador offline determinista y comando de regeneración aquí; actualizar auditoría, inventario, proyección y contexto sólo según evidencia.
- Actualizar `docs/carreras-a-actualizar.md` únicamente si la publicación oficial sigue en desarrollo, anuncia malla futura o cubre parcialmente sede/recorrido, con ID, brecha, fuente y condición concreta de revisión.

## Fuentes de partida, no conclusiones

- [FCS — Enseñanza](https://cienciassociales.edu.uy/ensenanza/): descripción actual que menciona Plan 1992 en Regional Norte.
- [FCS — Mallas curriculares y programas](https://cienciassociales.edu.uy/ensenanza/bedelia-de-grado/mallas-curriculares-y-programas/): comprobar si incluye esta licenciatura específica.
- [Udelar — Estadísticas básicas 2019](https://planeamiento.udelar.edu.uy/portal/wp-content/uploads/sites/33/2020/12/web_Estadisticas-basicas_2019.pdf): registra Ciencias Sociales 2009 en Salto; corroboración administrativa, no malla.
- [Udelar — Memoria 2011](https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/52511/1/Memoria-Udelar-2011.pdf): relata implementación del ciclo inicial y discusión del ciclo avanzado; antecedente histórico, no prueba de vigencia actual.

## Verificación y cierre

- Pruebas focales de autoridad, plan/cohorte, ubicación de materias en períodos, catálogo visible, candidatos recuperables e inventario. Probar que una malla FCS ajena no se importa silenciosamente.
- Doble regeneración offline, `npm test`, `npm run lint` y `git diff --check`; validar visualmente si cambia la UI cuando las herramientas lo permitan.
- Crear commit enfocado, sin push ni despliegue. Registrar al final de esta especificación resultado, cobertura, comandos exactos, última validación, conflictos y siguiente paso recuperable.

## Checkpoint de investigación — 2026-10-09

- La identidad administrativa se resuelve como **Plan 2009**. El Plan de Estudios 2009 aprobado por FCS contiene un capítulo propio para la Licenciatura en Ciencias Sociales de Regional Norte; la ficha de Udelar para la carrera enlaza expresamente las «normas Plan 2009» y una malla propia; y llamados recientes del CENUR identifican módulos docentes de esta licenciatura como Plan 2009. La mención «Plan 1992» en la página general de Enseñanza de FCS queda registrada como contradicción desactualizada, no como norma capaz de desplazar esas evidencias convergentes.
- Se recuperó desde Internet Archive el PDF institucional `malla-curricular-ciclo-avanzado-ccss-plan-2009.pdf`, creado en 2012 y capturado el 2022-10-04, con seis semestres del Ciclo Avanzado y 240 créditos. La copia se verificó visualmente; su SHA-256 es `aa5d96ac67c9ea2fe9c01e9b99439b0e00a395ac44c534e7408edbc8c86e2936`.
- Esa malla no se toma como trayectoria vigente: el enlace institucional original está caído, la página actual de mallas de FCS omite la licenciatura regional y la oferta EVA vigente no permite reconstruir todos los períodos. La evidencia confirma una grilla histórica del Plan 2009, pero no su vigencia curricular actual.
- Decisión recuperable: conservar `research-pending`, mantener las 425 identidades del snapshot como candidatas y no importar mallas de otras licenciaturas FCS, no promover coincidencias históricas y no fusionar nombres. Para cerrar el nodo hace falta una publicación vigente de FCS/CENUR de la malla completa o una resolución que confirme expresamente que la grilla de 2012 sigue rigiendo.
- Artefactos temporales verificados: `tmp/d03ab-cenurln-ciencias-sociales-2009/malla-curricular-ciclo-avanzado-ccss-plan-2009.pdf` y su render PNG. Próximo paso: versionar la evidencia normalizada y su huella, agregar regenerador/pruebas offline, regenerar inventario dos veces y ejecutar la batería de validación.

## Resultado del nodo

- Se versionó `data/cenurln/ciencias-sociales-2009.json` con autoridad, URLs, consulta, estado de publicación, estructura normativa 120 + 240 = 360 créditos, las 27 ubicaciones históricas de la malla recuperada, 15 correspondencias exactas por identidad única/nombre normalizado/créditos y la huella reproducible de `sourcePortions`.
- El conflicto queda resuelto sólo para la identidad: Plan 2009 vigente, con Plan 1992 registrado como descripción desactualizada. La trayectoria permanece `research-pending`: 0 filas promovidas, 425 candidatas conservadas y 0 períodos publicados en la proyección.
- El regenerador offline `npm run trajectory:cenurln-cs-2009` valida la huella normalizada, el hash del snapshot, los totales, los módulos y la frontera de autoridad; luego reconstruye cola de auditoría, proyección, cola UI e inventario. Dos ejecuciones consecutivas produjeron el mismo resultado.
- No se modificaron `PROJECT_CONTEXT.md` ni `docs/carreras-a-actualizar.md`: no cambió el conteo transversal de estados ni se verificó una malla anunciada en desarrollo o una cobertura territorial parcial; la brecha es una publicación vigente ausente, ya representada por el checkpoint del inventario.

## Verificación ejecutada

```text
npm.cmd run trajectory:cenurln-cs-2009
npm.cmd run trajectory:cenurln-cs-2009
node tests/cenurln-ciencias-sociales-2009-research.test.mjs
node tests/cenurln-current-offerings-audit.test.mjs
node tests/official-trajectory-inventory.test.mjs
node tests/bedelias-audit-queue.test.mjs
npm.cmd test
npm.cmd run lint
git diff --check
```

- Regeneración: 27 ubicaciones históricas, 15 coincidencias exactas no promovidas, 425 candidatas y estado `research-pending`, estable en ambas corridas.
- Pruebas focales seriales: 35/35 aprobadas. El primer intento de ejecutar los cuatro archivos juntos con `node --test` fue rechazado por el entorno con `spawn EPERM`; la ejecución directa de los mismos archivos pasó completa.
- `npm test`: build completo y 1002/1002 pruebas aprobadas. El primer intento encontró el worktree sin `node_modules`; `npm ci` restauró las dependencias exactas del lockfile sin cambiarlo y se repitió la comprobación con éxito.
- `npm run lint`: aprobado sin diagnósticos.
- La copia PDF histórica se inspeccionó además mediante render a PNG; no hubo cambio visual o interactivo en la aplicación que requiriera prueba de UI.

## Siguiente paso recuperable

Reconsultar cuando FCS o CENUR publique una malla completa vigente, o cuando una resolución institucional confirme expresamente la continuidad de la grilla de 2012. Recién entonces reconciliar las filas exactas por código y créditos y evaluar períodos; no usar la oferta EVA, nombres semejantes ni mallas de otras licenciaturas para completar los huecos.
