# D03av — Tecnólogo Minero, Plan 2012

## Estado

Nodo de auditoría curricular. El ID técnico de Bedelías termina en `2013`, pero el plan aprobado corresponde a 2012. Base: `8831265` de `main`.

Reconciliación completada el 19/10/2026: ejemplo CURE vigente reproducido, 24/24 ubicaciones en seis semestres. No se infiere que el ejemplo sea obligatorio ni oferta periódica.

## Objetivo

Determinar si la currícula predeterminada de Tecnólogo Minero en Treinta y Tres reproduce una trayectoria sugerida oficial vigente con cursos y períodos. La auditoría histórica dice que el Plan publica seis semestres, mientras el inventario D03a lo mantiene `research-pending`; resolver esa discrepancia con evidencia primaria, no con inferencias desde Bedelías o EVA.

## Fuentes iniciales

- Plan aprobado alojado por FING: `https://www.fing.edu.uy/sites/default/files/Plan_Estudios_Tec_Minero.pdf`.
- Oferta FING: `https://www.fing.edu.uy/es/carrera/grado/tecn%C3%B3logo-minero-treinta-y-tres`.
- Oferta CURE: `https://www.cure.edu.uy/ensenanza/oferta-educativa/tecnologo-minero/`.
- Auditoría versionada `data/bedelias/audits/official-source-audits.json` y resumen en `docs/tasks/importacion-masiva-carreras.md`.

Si el enlace del Plan falla, buscar copia de la misma autoridad, repositorio Udelar/Colibrí o IMPO; verificar edición y vigencia. Las fuentes secundarias solo orientan la búsqueda.

## Criterio de implementación

1. Cotejar filas del Plan oficial con la proyección actual: períodos, códigos/materias, flexibles, pasantía, créditos y sede. No convertir una lista ilustrativa en materias obligatorias.
2. Si existe grilla oficial suficiente, reproducirla fielmente; si no, documentar la brecha y mantener el orden generado claramente identificado. No dejar la carrera sin recorrido visible.
3. Preservar todos los cursos oficiales sugeridos al menos una vez y la oferta disponible en el planificador; no alterar progreso ni IDs sin equivalencias verificadas.
4. Guardar evidencia normalizada bajo `data/` con URL, autoridad, fecha, vigencia, alcance, filas cotejadas, huella reproducible y comando de regeneración. Actualizar inventario/revisión y `docs/carreras-a-actualizar.md` si se confirma publicación progresiva.
5. Añadir pruebas de correspondencia estructural, identidad, créditos, regeneración y ausencia de promoción indebida. Registrar discrepancias 270/272 y 2012/2013, sin resolverlas por suposición.

## Validación y entrega

- Ejecutar pruebas focales, dos regeneraciones deterministas, `npm test`, `npm run lint` y `git diff --check`.
- Crear un commit enfocado en este worktree. No integrar, pushear ni publicar desde aquí.
- Entregar hash, estado final, fuentes, discrepancias y limitaciones. Si falta evidencia primaria, dejar checkpoint recuperable y una condición concreta de revisión.

## Resultado y discrepancias verificadas

- La página CURE vigente publica explícitamente un ejemplo con cuatro filas en cada semestre y once opciones electivas. Hidrogeología aparece también entre electivas: se conserva una sola identidad, no dos cargas. Las diez opciones restantes y la validación manual se ofrecen fuera de los períodos académicos.
- El PDF FING es un compendio: páginas 10–13 contienen la resolución CDC 25 de 18/12/2012 y la publicación definitiva del Diario Oficial de 08/02/2013. La copia IMPO, páginas impresas 72–74 (PDF 65–67), permite leer el mismo texto y tabla. Se inspeccionaron visualmente las páginas FING 10–13.
- El ejemplo aprobado para ingreso desde CIO contiene Optativa en tercero y cuarto, Beneficiación en quinto y Geología del Uruguay en sexto. CURE sustituye los cupos por Hidrogeología y Aspectos Geotécnicos, y ubica Geología del Uruguay en quinto y Beneficiación en sexto. El ejemplo vigente del servicio es el predeterminado; no se afirma una reforma normativa del Plan.
- La discrepancia histórica D03a se explica por el formato: la auditoría de agosto sólo guardaba `periodOrder` y overrides, sin filas estructuradas cotejables. Además mantenía tres variantes de Introducción a la Universidad en un mismo semestre y dejaba fuera los dos cupos Optativa. La revisión nueva demuestra cada una de las 24 ubicaciones, en lugar de promover retrospectivamente aquella proyección.
- Se mantienen 272 créditos operativos, mínimos de área y Pasantía de 15. El Plan aprobado dice 270 y la propia ficha CURE se contradice entre requisitos (272) y preguntas frecuentes (270). No se halló una resolución modificativa que cierre esa contradicción. 2012 es el año aprobado; 2013 sólo identifica técnicamente la oferta y no cambia el ID/progreso.
- Las 31 correspondencias nominales conservan IDs y créditos Bedelías con procedencia separada. Las cinco variantes `INU33`, `INUN3`, `INUNI`, `TM06` y `TM14` quedan candidatas: no hay equivalencia expresa entre las tres Introducciones, Geología II/Básica II o Aspectos geológicos-geotécnicos/Geotécnicos. Se muestran tres nombres oficiales sólo-fuente, sin código ni carga inventados, sin migración automática. Aspectos Geotécnicos no recibe un área inferida; tutor y Comisión resuelven su acreditación.
- La publicación no es progresiva ni una sede parcial: no se agrega Tecnólogo Minero a `docs/carreras-a-actualizar.md`. La revisión futura se dispara por nueva grilla CURE, códigos/cargas/equivalencias expresas o resolución sobre 270/272, no por una búsqueda fallida.

## Artefactos y regeneración sin red

- Fuente normalizada: `data/cure/tecnologo-minero-2012.json`, con autoridades, fechas, vigencia, texto HTML curricular normalizado, 34 identidades cotejadas (24 de grilla y diez electivas adicionales), ejemplo histórico y conflictos.
- Generador: `node scripts/build-tecnologo-minero-2012.mjs`. Reconstruye revisión, proyección, manifiesto e inventario desde los datos versionados; no descarga ni extrae fuentes y se puede repetir tras una interrupción. El generador global también consume la reconciliación directamente.
- Las huellas SHA-256 de las porciones normalizadas se calculan sobre JSON UTF-8 sin espacios por `mineroSourceEvidence`; quedan en `reviews.json`, el inventario y la proyección. El PDF FING tiene huella binaria `a10376db930067adb24c3bb3dfaea68f8111ca7711ade1bb3b46999e1e29f348`.
- Crudos locales no versionados: `tmp/d03av/plan-fing.pdf`, `tmp/d03av/cure.html` y `tmp/d03av/fing-10.png` a `fing-13.png`. Para una consulta futura, normalizar HTML con `html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').match(/Grilla de asignaturas[\s\S]*?Preguntas frecuentes/)[0]` y comparar con `currentSourcePortion`; consultar de nuevo sólo para detectar cambios.

## Validación recuperable

- Focales: `node --input-type=module -e "await import('./tests/tecnologo-minero-official-audit.test.mjs'); await import('./tests/cure-tecnologo-minero-2012-trajectory.test.mjs'); await import('./tests/official-trajectory-inventory.test.mjs');"`: 38/38. Se usó ejecución en el mismo proceso tras `spawn EPERM` del runner aislado dentro del sandbox.
- `npm test`: compilación y 1083/1083 pruebas aprobadas; informe local `tmp/d03av/npm-test-final.log`. El sandbox bloqueó la primera compilación con `spawn EPERM`; la ejecución permitida terminó correctamente. La primera suite completa detectó la cola derivada sin regenerar y dos aserciones de conteos globales anteriores: se regeneró la cola y se actualizaron únicamente sus conteos, sin cambiar la conducta de otros planes.
- `npm run lint`: aprobado, salida 0. Dos regeneraciones consecutivas con `node scripts/build-tecnologo-minero-2012.mjs` produjeron bytes idénticos en los cinco artefactos derivados; comparación y huellas guardadas localmente en `tmp/d03av/regeneration-check.json`. `git diff --check`: aprobado.
- Validación visual de la aplicación: no disponible; CUA no expone navegadores (inventario vacío). Se intentó iniciar dev; vinext advierte errores de escaneo de declaraciones `.d.ts` preexistentes. No se modifican dependencias ni configuración por esta auditoría. El proceso de dev se detuvo y no se declara validación visual.
- Entrega: commit enfocado listo para revisión e integración autorizada. Los archivos `M` aparentes de otras proyecciones se debían a CRLF sin diferencias semánticas y no se incluyen. Siguiente paso: revisión del coordinador; al integrar sobre `main` repetir las verificaciones combinadas y la validación visual cuando exista navegador conectado. No se integró, hizo push ni publicó.
