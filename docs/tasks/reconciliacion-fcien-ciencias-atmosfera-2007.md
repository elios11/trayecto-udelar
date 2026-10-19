# D03ay — Licenciatura en Ciencias de la Atmósfera

## Estado y objetivo

Auditoría de un solo plan: `bedelias-fcien-licenciatura-en-ciencias-de-la-atmosfera-2007`, base `main` `c4c8f98`. El inventario D03 conserva `research-pending` aunque los mínimos normativos y servicios compartidos ya están auditados. Investigar si FCIEN, FING o una autoridad Udelar publican una trayectoria sugerida vigente con materias/períodos. Reproducir sólo filas demostradas; si la documentación oficial confirma positivamente únicamente currículo individual sin grilla común, registrar ausencia documentada. No inferir ausencia de un enlace roto o silencio.

## Fuentes iniciales

- Plan Colibrí: `https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/24554/1/PLATM_2020.pdf`.
- FCIEN: `https://www.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-ciencias-de-la-atmosfera`.
- FING: `https://www.fing.edu.uy/es/carrera/grado/lic-en-ciencias-de-la-atm%C3%B3sfera` y `https://www.fing.edu.uy/es/paginas/lic-en-cs-de-la-atm%C3%B3sfera`.
- Auditoría y proyección versionadas en `data/bedelias/audits/official-source-audits.json` y `app/data/bedelias-generated/`.

Buscar también Comisión de Carrera, Udelar/CSE, Colibrí e IMPO para copias o nuevas versiones. Distinguir aprobación 2006 / identidad 2007, cuatro años / 60 meses administrativos, ingreso por ambas facultades y CIO regional como vía parcial sin sede completa. EVA y Bedelías por sí solos no prueban una secuencia.

## Criterios

1. Conservar un único título y progreso, 360 créditos, nueve mínimos por 279, 81 flexibles, currículo personal aprobado y Montevideo. No crear dos planes por FCIEN/FING.
2. No promover 173 códigos ni 238 apariciones acumuladas como currícula vigente sin respaldo inequívoco; no inventar semestres ni obligaciones. Si no hay grilla, mantener recorrido orientativo visible y provisional.
3. Guardar evidencia normalizada bajo `data/` con autoridad, URL, fecha, vigencia, alcance, filas cotejadas, huella y comando de regeneración offline. Si se verifica publicación parcial o en desarrollo, actualizar `docs/carreras-a-actualizar.md` con condición de revisión.
4. Actualizar inventario/revisión y pruebas focales preservando IDs y datos personales. Registrar contradicciones sin conciliación ficticia.

## Entrega

Dos regeneraciones idénticas, focales, `npm test`, `npm run lint`, `git diff --check`; commit aislado y hash. No integrar, pushear ni publicar desde este worktree.

## Hallazgo y decisión — 19/10/2026

Se recuperó el sitio departamental por **HTTP**, no HTTPS, siguiendo el enlace de la ficha vigente de FCIEN:

- [Enseñanza](http://www.meteorologia.edu.uy/ensenanza/) publica cursos específicos de **2026** y enlaza el Plan, el PDF de ingreso y las preguntas frecuentes.
- [Plan de estudios](http://www.meteorologia.edu.uy/plan-de-estudios/) publica una **Trayectoria ejemplo**: 32 filas en ocho semestres, 26 materias nominales con 300 créditos distribuidos, cinco espacios Optativa/Electiva y un espacio Área ciencia y sociedad sin carga fija. Publica además 14 opciones por áreas sin semestre. No se distribuyen por inferencia los 60 créditos faltantes: los 279 mínimos normativos por área y los 81 flexibles no son el subtotal de las materias de la grilla.
- El [PDF de ingreso](http://www.meteorologia.edu.uy/wp-content/uploads/2021/Info_nuevos_estudiantes.pdf), actualmente enlazado, corrobora las ocho materias de los dos primeros semestres. Recomienda TICA, permite alternativas y cursos de Matemática/Física en Ingeniería; no se crean recorridos adicionales sin grilla propia.
- Las [preguntas frecuentes](http://www.meteorologia.edu.uy/preguntas-frecuentes/) confirman tutor, ingreso por ambas facultades y que no hay orientaciones formalmente definidas. La aprobación de un currículo individual no implica ausencia de una trayectoria sugerida.
- La [copia completa del Plan en FING](https://www.fing.edu.uy/sites/default/files/Licenciatura%20en%20Ciencias%20de%20la%20Atm%C3%B3sfera.pdf) conserva nueve mínimos, 360 créditos y tres ejemplos históricos en el Anexo II, con totales impresos 360/363/363. No se mezclan con la tabla departamental actual. Las páginas 11–13 se renderizaron e inspeccionaron; el [folleto FING](https://www.fing.edu.uy/sites/default/files/Folleto.LCA_.pdf) sólo recomienda el primer semestre **2020**.

Resultado: `official-trajectory-reproduced`, no ausencia documentada ni `research-pending`. El sitio no fecha editorialmente su tabla, pero está enlazada desde la ficha institucional y desde Enseñanza con cursos 2026; además incorpora versiones técnicas 2022/2023. Se reproduce como **ejemplo flexible**, sin afirmar oferta actual de cada opción. No se agrega a `docs/carreras-a-actualizar.md`: no hay anuncio de futura malla, implementación progresiva ni secuencia o sede parcial; las ambigüedades del catálogo se siguen en este artefacto.

## Frontera de autoridad y compatibilidad

Se cotejaron 31 códigos técnicos inequívocos por nombre, carga, área y versión abierta. Las variantes históricas cerradas no se reactivan. Las 238 identidades previas de proyección conservan exactamente sus IDs y cargas; 206 continúan candidatas recuperables, fuera de la Currícula y planificador normales. No se modifica la clave del plan, trayectoria, sede, progreso ni requisito de aprobación manual.

Nueve materias quedan sólo-fuente, sin código ni equivalencia inventada:

- Termodinámica: tabla 10, FI04 de Bedelías 11; se conservan ambos valores y asientos separados, sin acreditar uno por el otro.
- Física del Sistema Climático: la tabla y Enseñanza 2026 la publican; FI048 termina en 2025 y no hay sucesor técnico inequívoco.
- Bioestadística: tabla 10; MA402 de 10 cerró 2022, MA485 de 12 cerró 2024, y MA503 tiene otro nombre/carga.
- SIG de 8 no se equipara a GF203 vigente de 12 ni reactiva GF02 cerrado; Percepción Remota de FING no se fusiona con Teledetección; Inestabilidad en Fluidos de FING de 8 no se equipara a FI15 de 4.
- Elementos de Ingeniería Ambiental conserva carga no publicada; Economía FING y Ciencia, Tecnología y Sociedad conservan sus identidades nominales sin código técnico supuesto.

El catálogo normal reúne 47 registros: 31 códigos, nueve materias sólo-fuente, seis bloques flexibles sin carga y la validación manual existente. Las 14 opciones no se vuelven obligaciones acumulativas; 22 reglas de Bedelías se publican sólo cuando todas sus identidades están verificadas. El CIO regional sigue siendo vía inicial, no sede completa de la Licenciatura.

## Evidencia y regeneración offline

- Fuente normalizada: `data/fcien/ciencias-atmosfera-2007-trajectory-review.json`, con autoridad, URL, fecha, vigencia, filas literales, catálogo, correspondencias, reservas de identidad, huellas SHA-256 del contenido recuperado y huella de `sourcePortions`.
- Generador: `scripts/build-fcien-ciencias-atmosfera-2007.mjs`; comando exacto: `npm run trajectory:fcien-ciencias-atmosfera-2007`. No consulta red ni necesita extraer otra vez los HTML/PDF. Actualiza auditoría, proyección, colas y revisión/inventario D03 preservando finales de línea locales. Sus escrituras propias usan archivo temporal contiguo y reemplazo atómico; no se modificaron los generadores compartidos.
- Materias sólo-fuente y bloques tienen identidades estables explícitas; el generador bloquea cambios de cargas/IDs anteriores, promoción de versiones cerradas, pérdida de filas u opciones y evidencia cuyo fingerprint no coincida.
- Descargas y páginas renderizadas de consulta: `tmp/d03ay/`, excluidas del commit. Una nueva consulta sirve para detectar cambios, no para reconstruir manualmente el estado guardado.
- El bitstream Colibrí devolvió 403, pero sus metadatos confirman Plan 2007, carrera 20 y plan 335; se usó la copia institucional FING. Se buscaron también FCIEN, FING, Udelar, CSE, Colibrí e IMPO. El servidor viejo `meteo.fisica.edu.uy` sólo dice `It works`; el enlace EVA 2021 devolvió 404. Ninguno de esos fallos se interpreta como ausencia de currícula.

## Verificación y continuidad

La implementación y la auditoría están completas. Verificación:

- Dos ejecuciones consecutivas de `npm run trajectory:fcien-ciencias-atmosfera-2007`: nueve artefactos idénticos byte a byte; manifiesto local `tmp/d03ay/regeneration-hashes.json`.
- `node --test --experimental-test-isolation=none tests/fcien-atmospheric-sciences-2007-*.test.mjs tests/official-trajectory-inventory.test.mjs`: **36/36 correctas**. El modo normal de Node falló por `spawn EPERM` del sandbox, no por aserciones.
- `npm test`: compilación correcta y **1096/1096** pruebas correctas en ejecución serial; log local `tmp/d03ay/npm-test-serial.log`. Requirió permiso de ejecución por `spawn EPERM` de Vite/Node. Dos expectativas globales de FArtes se actualizaron exclusivamente de 111/29 a 112/28 por el cierre de este nodo, sin cambiar sus verificaciones curriculares.
- `npm run lint`: correcto, sin errores.
- `git diff --check`: correcto. Los finales de línea del checkout se preservan, sin cambios masivos en otros planes.
- Navegador no disponible: `iab` no conectado y lista de navegadores vacía. No se declara validación visual de la aplicación. Sí se inspeccionaron visualmente el Anexo II del Plan y la página completa del PDF de ingreso.

Ejecutar **siempre en serie**: terminar primero las regeneraciones, luego las pruebas. Una repetición superpuesta leyó transitoriamente un JSON de Sistemas de Comunicación mientras el generador compartido lo escribía; la repetición serial completa pasó sin cambios en ese plan. Para reanudar desde estos datos: `npm run trajectory:fcien-ciencias-atmosfera-2007`, esperar su salida y luego `npm test`, `npm run lint` y `git diff --check`.

Siguiente revisión académica: sólo al cambiar la tabla departamental, aparecer una sugerencia FCIEN/FING nueva o aclararse los nueve códigos/cargas reservados. La oferta por período y la aprobación del currículo siguen siendo comprobaciones académicas separadas. No integrar, hacer push ni publicar desde este worktree.
