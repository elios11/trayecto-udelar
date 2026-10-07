# D03z — Ciclo en Biología - Bioquímica 2016

## Estado y objetivo

Nodo preparado. Reconciliar Currícula y planificador del Ciclo en Biología - Bioquímica que Bedelías identifica como Plan 2016, respetando el alcance de Salto y Paysandú, los 90 créditos publicados y su carácter de ciclo, no de licenciatura completa.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de la regla de autoridad curricular y del inventario D03a; ejecutar en un worktree desde el `main` actual.

## Alcance

- Verificar la vigencia y la identidad del plan en CENUR Litoral Norte y la página académica del Departamento de Ciencias Biológicas. Cotejar si sus unidades orientativas por semestre constituyen una trayectoria oficial completa, parcial o sólo ejemplos flexibles; no derivar semestres ni obligatoriedad de Bedelías.
- Comparar cada unidad publicada con `bedelias-cenurln-ciclo-en-biologia-bioquimica-2016`. Bedelías puede contrastar código, créditos y previaturas, pero no justifica por sí solo oferta vigente. Conservar candidatos recuperables sin mostrarlos como materias verificadas.
- Mantener Salto y Paysandú como sedes del mismo plan y progreso cuando la fuente lo respalde; no confundir articulaciones posteriores con títulos intermedios o equivalencias automáticas.
- Versionar bajo `data/cenurln/` una fuente normalizada con URL institucional exacta, autoridad, fecha de consulta, vigencia, alcance, filas/identidades y huella reproducible. Registrar aquí comando determinista de regeneración sin red. Si la publicación oficial cubre sólo una parte del ciclo o anuncia cambios, registrar la brecha en `docs/carreras-a-actualizar.md` con condición de revisión.
- Actualizar auditorías, proyección, inventario y contexto sólo según evidencia. Si no hay trayectoria oficial suficiente, dejar `research-pending` o documentar ausencia con fuentes concluyentes; no marcar `reproduced` por completar un recorrido inventado.

## Verificación y entrega

- Pruebas focales: correspondencia de períodos y unidades oficiales, identidad visible de cada materia publicada, catálogo del planificador sin duplicados, sedes y requisitos de egreso.
- Doble regeneración, `npm test`, `npm run lint` y `git diff --check`; commit enfocado sin ruido EOL ni planes ajenos.
- No integrar, pushear ni desplegar desde el worktree. El coordinador revisa el commit y repite verificaciones sobre `main` combinado.

## Fuentes iniciales a verificar

- [CENUR Litoral Norte: Ciclo de Biología y Bioquímica](https://www.litoralnorte.udelar.edu.uy/bedelia-de-grado/ciclo-de-biologia-y-bioquimica).
- [Departamento de Ciencias Biológicas: enseñanza](https://dcb.litoralnorte.udelar.edu.uy/ense%C3%B1anza).
- [Udelar: ficha de carrera](https://udelar.edu.uy/carrera/ciclo-en-biologia-bioquimica).

Estos enlaces provienen de la auditoría previa y deben cotejarse nuevamente antes de convertirlos en secuencia curricular vigente.

## Checkpoint de ejecución

- Hito documental (2026-10-07): las tres páginas oficiales siguen publicando un ciclo vigente de 12 meses y 90 créditos en Salto y Paysandú. El Departamento de Ciencias Biológicas publica ocho unidades en dos semestres; su correspondencia inequívoca con el snapshot versionado de Bedelías suma 47 créditos en el primero y 43 en el segundo.
- Estado recuperable: la evidencia normalizada, alcance territorial, continuidades posteriores, filas cotejadas y porción fuente reproducible están en `data/cenurln/ciclo-biologia-bioquimica-2016.json`. Las otras entradas de Bedelías permanecen candidatas y no respaldan inclusión, semestre ni obligatoriedad.
- Decisión: el ciclo queda cerrado como recorrido anual completo de 90 créditos; las Licenciaturas en Ciencias Biológicas y Bioquímica son continuaciones en Montevideo y la Licenciatura en Biología Humana una continuación regional, no sedes, títulos ni perfiles de este plan.
- Regeneración offline: `npm run trajectory:cenurln-cbb-2016`. Valida la huella normalizada, las ocho identidades y créditos contra el snapshot versionado, los 90 créditos y mínimos por área, y reconstruye proyección, cola e inventario sin red.
- Resultado final (2026-10-07): dos regeneraciones consecutivas dejaron idénticos los seis artefactos derivados cotejados. Las pruebas focales pasaron (4/4 de esta trayectoria, 5/5 de oferta vigente, 7/7 del generador, 24/24 del inventario y 2/2 de la cola); `npm test` pasó 993/993 y `npm run lint` terminó sin errores.
- Cobertura y pendiente: se publican sólo las ocho unidades oficiales que completan los 90 créditos. Las 22 entradas restantes de Bedelías quedan recuperables como candidatas, fuera de la UI y sin atribuirles semestre u obligatoriedad. No corresponde agregar la carrera a `docs/carreras-a-actualizar.md`: la publicación actual cierra el ciclo anual y no anuncia una malla futura ni una brecha territorial.
