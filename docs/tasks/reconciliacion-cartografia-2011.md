# D03bf — Tecnólogo en Cartografía Plan 2011

## Objetivo

Auditar y, si la fuente lo permite, reproducir la trayectoria sugerida del plan `bedelias-fing-tecnologo-en-cartografia-2011`, compartido por FING y FCIEN, sobre `main` `b3ee99f`. El inventario sigue `research-pending` aunque el [Plan aprobado](https://www.fing.edu.uy/sites/default/files/2025-02/plan-de-estudios-tecnologo-en-cartografia-2011.pdf) incluye cuatro módulos, una «Propuesta de recorrido (sugerencia)» y optativas no excluyentes. Determinar su alcance exacto, versión y correspondencias actuales antes de cambiar Currícula.

## Fuentes y cautelas

- Plan FING de once páginas, portada con resolución CDC 22/02/2011 y publicación DO 22/03/2011; páginas 7–10 con módulos, recomendaciones por módulo y propuesta por materias. Inspeccionar visualmente tablas y notas además del texto; si la descarga/render no es posible, registrar el límite sin afirmar validación visual.
- Ficha FING: `https://www.fing.edu.uy/es/ia/ense%C3%B1anza/42cursos-de-grado/423tecnico-legal`.
- Ficha Udelar: `https://udelar.edu.uy/carrera/tecnologo-en-cartografia`.
- Auditoría, inventario y proyección actuales en `data/bedelias/audits/official-source-audits.json`, `data/official-trajectories/inventory.json` y `app/data/bedelias-generated/`.

Conservar una identidad y progreso entre Ingeniería/Ciencias, Montevideo, cuatro semestres, 180 créditos, los ocho mínimos (144) y 36 flexibles, Pasantía/Proyecto y currículo individual. El Plan no vuelve obligatoria toda la lista de optativas. Su tabla final agrupa por **materias/áreas**, mientras los módulos narrativos señalan etapas; no asignar a un semestre un curso que la fuente no ubique inequívocamente. Bedelías puede validar código/carga de una identidad exacta, nunca crear pertenencia curricular ni equivalencias por nombre parecido. No fusionar versiones históricas ni inventar oferta vigente.

## Entrega

Versionar bajo `data/` la evidencia normalizada con autoridad, URL, fecha, vigencia, alcance, filas/módulos e identidades cotejadas, discrepancias y huella; generar offline con comando en esta spec. Actualizar auditoría/inventario/proyección y tests sólo hasta el alcance probado. Si la evidencia permite una guía parcial, mostrar únicamente períodos/bloques justificados y conservar lo demás como flexible o candidato. Si no, mantener `research-pending` con motivo y condición concreta. Registrar en `docs/carreras-a-actualizar.md` sólo publicación progresiva, futura o territorial parcial expresamente demostrada. Dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint` y `git diff --check`; commit enfocado en este worktree. Sin integración, push ni despliegue desde el nodo.

## Resultado recuperable de D03bf

- Evidencia normalizada: `data/fing/cartografia-2011-trajectory-review.json`. La huella SHA-256 corresponde a `JSON.stringify(sourcePortion)`; registra la aprobación CDC, el alcance del anexo, diez recomendaciones nominales por módulo, Pasantía y Proyecto cotejados, y ejemplos que no se pudieron ubicar con certeza.
- La captura web no devolvió imágenes y la descarga local del PDF fue rechazada por el servidor. Se leyó el texto completo pertinente de las páginas 7–11, pero **no se afirma validación visual** de sus tablas; ésa es la primera condición de revisión futura.
- Reproducir sin red: `node scripts/build-cartografia-2011.mjs`. Es idempotente y no necesita volver a consultar ni descargar el PDF. La proyección presenta los cuatro módulos como guía **parcial y no obligatoria**, con diez identidades sólo-fuente de carga no publicada y los códigos TCI21/TCI26 intactos. Las 100 entradas técnicas restantes continúan candidatas; no se convierten en electivas verificadas por similitud de nombre.
- La tabla «Propuesta de recorrido» agrupa por materia; no determina el módulo de Matemática I/II, las variantes de Sistemas de Información Geográfica, Humanística ni toda la oferta optativa. El espacio flexible queda sin semestre fijo. No se declara completa la secuencia de 160 créditos de cursos, ni se garantiza oferta actual.
- Nueva revisión: obtener una visualización fiable del anexo y una tabla vigente FING/FCIEN que relacione las unidades nombradas con código, carga, versión, módulo y oferta. No inferir equivalencias desde Bedelías. No se agrega a `carreras-a-actualizar.md` porque el Plan 2011 no anuncia una malla futura ni una publicación territorial parcial; la brecha es de cotejo técnico y queda aquí y en el inventario.
- Verificación focal en este entorno: `node tests/cartografia-2011-trajectory-review.test.mjs` (3/3) y `node tests/tecnologo-cartografia-2011-official-audit.test.mjs` (4/4). El runner `node --test` aislado fue bloqueado por `spawn EPERM`, pero `npm test` con permiso acotado compiló y pasó 1116/1116; `npm run lint` pasó. Dos regeneraciones sucesivas produjeron la misma huella conjunta `c7e9b376f8305e982e97d815c212b2af2e08a44abaf0ff48e9a4f0a45a033e21` de los siete artefactos principales. Aún no integrado ni publicado desde este nodo.
