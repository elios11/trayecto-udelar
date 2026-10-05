# D03v — Trayectoria oficial de Licenciatura en Administración 2012

## Estado y objetivo

Implementación cerrada el 5 de octubre de 2026. La Currícula reproduce la grilla indicativa vigente de ocho semestres y las guías no certificadas de Gestión de Personas y Marketing, conservando los mínimos, el progreso y las identidades académicas existentes.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D03a y de la auditoría oficial de la carrera ya integrada.

## Alcance

- Cotejar la grilla de FCEA actualizada en julio de 2026, sus períodos, materias obligatorias y opciones, con la proyección actual `app/data/bedelias-generated/bedelias-fcea-licenciatura-en-administracion-2012.json` y la auditoría guardada.
- Reproducir los semestres publicados sin convertir optativas, alternativas o unidades de doble dictado en obligaciones acumulativas. Conservar catálogos flexibles con todas las identidades verificadas pertinentes, sin publicar candidatos basados sólo en Bedelías.
- Mantener IDs de progreso; documentar cualquier alias o discrepancia de código/créditos, sin fusionar por mera similitud de nombre.
- Registrar fuente, fecha y correspondencia estructurada en `data/official-trajectories/reviews.json`; regenerar el inventario sin red.
- Si la fuente oficial sólo cubre parte del plan o anuncia ampliaciones futuras, registrar alcance y nueva condición de revisión en `docs/carreras-a-actualizar.md`, sin extrapolar.

## Cierre

- Pruebas específicas contrastan períodos y colocaciones con la fuente, preservación de materias oficiales en Currícula y disponibilidad verificada en el planificador.
- Pasan pruebas estrechas, `npm test`, `npm run lint` y `git diff --check`.
- Entregar un commit aislado listo para integración; no hacer push ni desplegar desde el worktree.

## Fuentes iniciales

- [FCEA: Licenciatura en Administración y grilla curricular](https://fcea.udelar.edu.uy/depto-adm-ensenanza/lic-adm-ciencias-adm.html).
- [FCEA: resoluciones de interés](https://fcea.udelar.edu.uy/bedelia-carreras-grado/resoluciones-de-interes.html).

Las fuentes deben comprobarse de nuevo al implementar. EVA y la composición de Bedelías no son autoridad de inclusión curricular.

## Resultado verificado

- La publicación FCEA actualizada en julio de 2026 cubre el plan completo: no corresponde agregar la carrera a `docs/carreras-a-actualizar.md`.
- El catálogo normal contiene 100 identidades verificadas: 98 correspondencias inequívocas con Bedelías y dos identidades oficiales sin código. Quedan fuera 306 alias, reválidas o variantes sin correspondencia demostrada.
- La grilla indicativa conserva 98 ubicaciones canónicas en ocho semestres. Las alternativas `MC10` frente a `114A`+`128A` y `E10` frente a `E11` se ofrecen sin acumularse en el núcleo fijo de 22 unidades; las marcas de doble dictado tampoco crean obligaciones nuevas.
- Las guías sugeridas conservan 28 ubicaciones para Gestión de Personas y 27 para Marketing, con el catálogo flexible completo disponible en ambas.
- `Actividades de difusión académica` y la fila `I20` conservan identidades descriptivas de fuente, separadas respectivamente de `UADA4` y `SAI20`. El modelo actual de curso completado no puede registrar por separado la segunda acreditación opcional que admite la ficha de actividades de difusión; la limitación queda trazada en el artefacto fuente, la revisión y las pruebas.
- Artefactos recuperables: `data/fcea/administracion-2012-trayectoria.json`, auditoría oficial, proyección generada, revisión de trayectoria e inventario determinista.
- Verificación de cierre: pruebas focales 25/25; `npm test` 975/975 (incluye build); `npm run lint` y `git diff --check` sin errores. Tras cambiar la auditoría se regeneraron de forma local `audit-queue.json`, `ui-curriculum-queue.json` y el inventario; el primer test global detectó sus hashes previos y el segundo quedó verde.
