# D03aw — Licenciatura en Biología Humana

## Estado y alcance

Nodo de auditoría curricular sobre `main` `5596c2c`. Se estudia únicamente `bedelias-fcien-licenciatura-biologia-humana-2004`, carrera compartida de 360 créditos con currículo individual. El inventario D03 la clasifica `research-pending`; la auditoría anterior reconstruyó mínimos y sedes, no demostró trayectoria sugerida ni ausencia.

## Objetivo

Determinar si Facultad de Ciencias, FHCE u otra autoridad Udelar competente publica una malla, grilla o recorrido sugerido vigente para este plan, en general o por sede. Si existe, reproducirlo con sus períodos y opciones sin convertir el inmenso catálogo de Bedelías en obligaciones. Si la documentación oficial confirma que sólo existen planes individuales sin secuencia común, registrar `no-official-trajectory-documented` con evidencia positiva; si el silencio persiste, conservar `research-pending`. En ambos casos la UI debe mantener un recorrido provisional visible y correctamente rotulado.

## Fuentes y contrastes iniciales

- Plan en Colibrí: `https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/24551/1/PLBIHU_2020.pdf`.
- FHCE: `https://fhce.edu.uy/licenciatura-en-biologia-humana/`.
- Catálogo Udelar: `https://udelar.edu.uy/carrera/licenciatura-biologia-humana`.
- Carreras Interior: `https://udelar.edu.uy/carrerasinterior/licenciatura-en-biologia-humana-3/`.
- Auditoría existente en `data/bedelias/audits/official-source-audits.json` y proyección en `app/data/bedelias-generated/`.

Buscar además publicaciones de Facultad de Ciencias, Comisión Curricular y sedes regionales; ante enlaces rotos, copias de la misma autoridad en Colibrí, portal Udelar o IMPO. Contrastar 2004/2011, duración 48/60 meses y alcance de sedes. EVA y composición de Bedelías no prueban una secuencia oficial.

## Reglas de implementación

1. Separar la evidencia de plan, trayectoria, catálogo y oferta. No promover los 1.797 registros administrativos por semejanza ni por mera inclusión en la composición.
2. Conservar IDs, progreso, 360 créditos, currículo flexible, tutor y validación de pasantía. Una carrera compartida no se duplica por servicio o sede.
3. Versionar evidencia normalizada en `data/` con autoridad, URL, fecha, vigencia, alcance, filas o identidades cotejadas y huellas reproducibles; proporcionar comando de regeneración offline.
4. Actualizar inventario y revisión con tests focales. Agregar a `docs/carreras-a-actualizar.md` sólo si hay publicación progresiva o territorial parcial confirmada, no por simple falta de investigación.
5. No declarar completa una malla ni inventar semestres o cargas. Si falta una decisión de fuente, documentar condición concreta de nueva revisión.

## Entrega

Pruebas focales, dos regeneraciones, `npm test`, `npm run lint`, `git diff --check`; commit enfocado en este worktree y hash con limitaciones. Sin integrar, push ni despliegue desde el nodo.

## Auditoría realizada — 19 de octubre de 2026

- FHCE mantiene expresamente a Biología Humana bajo «Próximamente» en su índice de mallas por área y semestre. Se registra `no-official-trajectory-documented` **temporal**: falta hoy una malla publicada reproducible; no se afirma que nunca existieron o existirán recomendaciones.
- El Plan depositado en Colibrí tiene cuatro páginas y se rotula 2011, mientras el registro conserva año 2004. Define currículo individual, cuatro años, 360 créditos, áreas 22/37/8/33%, tutoría y Comisión Curricular; sus cursos se organizan en semestres, pero no publica filas nominales por semestre. Se conservan el ID 2004, cinco sedes, los mínimos operativos 79/133/29/119 y la pasantía de 120 horas con informe.
- Se recuperaron la aprobación original del CDC 11 de 20/7/2004 en [IMPO 10/8/2004](https://impo.com.uy/diariooficial/2004/08/10/avisosdeldia.pdf), la [rectificación del 28/9/2004](https://impo.com.uy/diariooficial/2004/10/20/avisosdeldia.pdf) de 63/37 a 67/33 y el [Reglamento publicado el 15/5/2013](https://www.impo.com.uy/diariooficial/2013/05/15/avisos.pdf), cuyo artículo 6 conserva la aprobación individual por la Comisión. La publicación original no sustituye el documento posterior ni prueba por sí sola vigencia sin modificaciones.
- [JIES 2020/21, resumen 266, página PDF 85](https://www.cse.udelar.edu.uy/wp-content/uploads/sites/13/2021/10/jies.libro_.resumenes.pdf) presenta tres propuestas de ingreso según bachillerato: Científico/Tecnológico, Medicina/biológico y Social/Humanística. Describe dos semestres y 80–90 créditos, pero no enumera cursos ni acredita adopción actual. No crea trayectorias, menciones ni períodos en la aplicación. El [proyecto CSE 2018](https://www.cse.udelar.edu.uy/proyecto-financiado/desarrollo-e-implementacion-de-estrategias-para-el-ajuste-del-plan-de-estudios-de-la-licenciatura-en-biologia-humana/) confirma el antecedente de diseño, no su implementación vigente.
- La ficha actual FCIEN (actualizada diciembre de 2024, recuperada en el índice de búsqueda) mantiene cuatro años y las cinco localidades. El catálogo central conserva 60 meses: queda como discrepancia administrativa, sin alterar duración normativa. La ficha territorial Tacuarembó permite contrastar cuatro años y flexibilidad. No se detectó una grilla vigente alternativa por sede; no se extrapolan los CIO ni el Ciclo Biología-Bioquímica a la licenciatura.
- El sitio histórico `lbh.fmed.edu.uy` no permite recuperar el plan; se buscaron las copias y publicaciones de la misma autoridad en FCIEN, FHCE, Colibrí, Udelar, CSE e IMPO. Las capturas de PDF fallaron con `cache miss`/403: se cotejó el texto de las páginas pertinentes, sin declarar inspección visual de PDF. La página Rivera `...-3/` tampoco expone contenido completo en la herramienta; la evidencia territorial previa se preserva y se contrasta con FCIEN.

## Artefactos y regeneración offline

- Evidencia normalizada: `data/fcien/biologia-humana-2004-trajectory-review.json`. Contiene autoridades, URL, consulta, vigencia publicada, alcance, identidades y porciones normalizadas; su huella SHA-256 es la serialización `JSON.stringify(sourcePortions)` en orden guardado. No es un hash del HTML/PDF crudo. Cada fuente se propaga al registro y revisión con su propia huella de porción.
- La huella de identidades candidatas usa la lista ordenada de `[id, bedeliasCode, name, credits, eligibleRequirementIds]` de las 2.032 apariciones proyectadas. Contrasta los 1.797 registros técnicos del snapshot, conserva IDs/progreso y detecta promociones o pérdidas sin reinterpretar los rótulos por parecido.
- `npm run trajectory:fcien-biologia-humana-2004` valida la evidencia, actualiza sólo la auditoría/revisión de este plan y regenera proyección, colas e inventario sin red. Puede ejecutarse de nuevo sin repetir extracción ni investigación.
- El único registro `verified` sigue siendo la validación manual final: no es una materia real que sustituya la malla. Los candidatos permanecen provisionales y no aportan a requisitos oficiales; la presentación existente mantiene materias reales agrupadas como recorrido orientativo generado no temporal, con opciones adicionales disponibles.
- Revisión futura en `docs/carreras-a-actualizar.md`: publicar filas nominales y vigencia de la malla anunciada o de una trayectoria autorizada, incluida la eventual adopción de las propuestas iniciales históricas.

## Verificación y entrega

- `node --test --experimental-test-isolation=none tests/fcien-human-biology-2004-official-audit.test.mjs tests/fcien-biologia-humana-2004-trajectory.test.mjs tests/official-trajectory-inventory.test.mjs`: **38/38**. La forma normal del runner encontró `spawn EPERM` en el sandbox; sin aislamiento permite ejecutar las mismas pruebas focales.
- Dos llamadas consecutivas a `buildHumanBiologyReview()` (el mismo generador de `npm run trajectory:fcien-biologia-humana-2004`) produjeron SHA-256 idénticos de los siete artefactos derivados: proyección, registro de auditorías, dos colas, reporte extraído, inventario y revisiones. No requirieron red. Se conserva CRLF local al regenerar para evitar ruido en los otros planes.
- `npm test`: compilación correcta y **1.088/1.088** pruebas. El primer intento quedó impedido por `spawn EPERM` de Vite; la ejecución aprobada fuera del sandbox terminó correctamente. Permanecen los avisos habituales de tamaño de chunks y clasificación estática de rutas de vinext, sin fallo de build.
- `npm run lint`: correcto, sin errores ni advertencias.
- `git diff --check`: correcto. No se cambió lógica visual ni interacción: las pruebas del presentador confirman recorrido provisional visible, materias reales, grupos no temporales y candidatas sin contribución a mínimos. No se declara validación visual de la aplicación ni de PDF.

Estado: nodo implementado y verificado; listo para integración explícitamente autorizada después del commit enfocado. La brecha externa sigue siendo la malla anunciada y la eventual adopción de las propuestas iniciales de 2021. Sin integración, push ni publicación desde este worktree.
