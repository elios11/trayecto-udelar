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
