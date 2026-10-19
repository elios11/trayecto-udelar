# D03ax — Licenciatura en Ciencias Biológicas

## Estado y objetivo

Auditar sólo `bedelias-fcien-licenciatura-en-ciencias-biologicas-2017` sobre base `main` `2a3aead`. El inventario D03 la mantiene `research-pending`, aun cuando los mínimos oficiales del plan ya están reconstruidos. Determinar si existe una malla, grilla o trayectoria sugerida publicada y vigente con materias y períodos; reproducirla de ser verificable. Si la autoridad documenta positivamente sólo currículos personalizados sin secuencia común, registrar ausencia documentada con fecha y disparador de revisión. No inferir ausencia por silencio o enlace roto.

## Evidencia inicial

- Plan alojado en Colibrí: `https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/24553/1/PLCBIO_2020.pdf`.
- Reglamento FCIEN: `https://eva.fcien.udelar.edu.uy/pluginfile.php/197669/mod_label/intro/Reglamento%20del%20Plan%20de%20Estudios%202017%20de%20la%20Licenciatura.pdf`.
- Registro jurídico Udelar: `https://dgjuridica.udelar.edu.uy/422-reglamento-del-plan-de-estudio-de-la-licenciatura-en-ciencias-biologicas/`.
- Carrera Udelar: `https://udelar.edu.uy/carrera/licenciatura-en-ciencias-biologicas`.
- Auditoría `data/bedelias/audits/official-source-audits.json`; proyección `app/data/bedelias-generated/bedelias-fcien-licenciatura-en-ciencias-biologicas-2017.json`.

Buscar también publicaciones de FCIEN y Comisión de Carrera, incluyendo copias oficiales en Colibrí, portal Udelar e IMPO si falla un enlace. Confrontar Plan aprobado llamado 2015 con identidad de implementación 2017; separar Ciclo en Biología-Bioquímica regional de la licenciatura en Montevideo. EVA y Bedelías no son por sí solos malla oficial.

## Criterios

1. Preservar un título, progreso, 360 créditos, 210 comunes, 140 de orientación y 10 de prácticas integrales, junto con tutoría y Trabajo Final. No crear menciones certificadas desde campos disciplinares.
2. No promover los 842 códigos / 978 apariciones administrativas sin respaldo curricular vigente. No dejar la UI sin recorrido orientativo visible si no se verifica grilla oficial.
3. Guardar evidencia normalizada versionada bajo `data/`: autoridad, URL, fecha, vigencia, alcance, filas/identidades cotejadas, huella y comando de regeneración offline. Mantener `docs/carreras-a-actualizar.md` sólo si se confirma publicación progresiva o sede parcial.
4. Actualizar revisión, inventario y pruebas focales. No inventar períodos, créditos, equivalencias o oferta efectiva.

## Entrega

Dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint`, `git diff --check`; commit enfocado sólo en este worktree, hash y limitaciones. No integrar, pushear ni publicar desde el nodo.

## Cotejo y resultado — 19/10/2026

Se encontró una guía inicial oficial **parcial**, no una ausencia documentada: la Comisión de Carrera publica en su taller CIDU 2026 ocho ubicaciones nominales, cuatro en primer semestre y cuatro en segundo. La recomendación del segundo está condicionada a haber ganado los cursos del primero; no se interpreta como una nueva previatura técnica. El Plan conserva una duración de ocho semestres, pero la publicación cotejada no ubica materias en los semestres 3–8.

Cadena de autoridad: [página vigente FCIEN](https://www.fcien.edu.uy/ensenanza/carreras-de-grado/licenciatura-en-ciencias-biologicas/2327-licenciatura-en-ciencias-biologicas) → [espacio público de la carrera](https://eva.fcien.udelar.edu.uy/course/view.php?id=5) → recurso `88552`, «Presentación taller CIDU 2026» → [PDF de la Comisión](https://eva.fcien.udelar.edu.uy/pluginfile.php/146022/mod_resource/content/3/Taller%20ingreso%202026_final.pdf). La atribución no proviene del catálogo administrativo de EVA ni de la composición Bedelías. [DG Jurídica](https://dgjuridica.udelar.edu.uy/422-reglamento-del-plan-de-estudio-de-la-licenciatura-en-ciencias-biologicas/) y [la copia IMPO](https://www.impo.com.uy/diariooficial/2019/06/20/avisos.pdf), páginas impresas 85–86, corroboran el Reglamento ratificado el 21/05/2019, sus mínimos y tutorías. El Reglamento usa la denominación Plan 2015, mientras [Colibrí](https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/24553) identifica carrera 137 / plan 1110 / año de implementación 2017. No se crea otra identidad ni se migra progreso.

Se inspeccionaron el texto completo del Reglamento, las páginas 1–20 del CIDU y visualmente sus páginas 11, 12, 15 y 19. Las páginas 11–12 son ejemplos por **áreas y tramos**, sin períodos temporales; no se convierten en secuencia, catálogo completo ni obligaciones acumulativas. El PDF Colibrí `PLCBIO_2020.pdf` devolvió 403 durante esta consulta: se preserva la auditoría estructural previa y se contrasta el Reglamento con una copia oficial independiente. Ese fallo no se usa como prueba de ausencia ni para afirmar que no existan recomendaciones adicionales.

### Frontera de publicación y discrepancias

- Primer semestre: Biología General `BG456`, Química General `BG1`, Física 1 `FI252` y Matemática 1 `MA400`, con códigos expresos en CIDU.
- Segundo semestre: Química Orgánica 1 `BQ426`, Física 2 `FI253`, Matemática 2 módulo 1 `MA403` por correspondencia nominal y versión abierta inequívoca en el tramo común. Las variantes históricas de Química Orgánica y Matemática 2 no se equiparan.
- Seminario de Biología permanece como identidad oficial sólo-fuente sin código ni carga publicados en la recomendación. No se presume equivalencia con `BG861`, ni con los dos seminarios de 6 créditos del ejemplo por áreas.
- Trabajo Final `BG900`, 32 créditos, se conserva verificado en el catálogo flexible, sin semestre asignado; el bloque de validación de la Comisión sigue separado.
- El catálogo publicado reúne ocho identidades técnicas, un seminario sólo-fuente y la validación manual. Las restantes **969 entradas de proyección** siguen candidatas recuperables y no acreditan requisitos. Se preservan los IDs y cargas de los 978 registros previos por una huella estable; el único registro adicional es el seminario sólo-fuente.
- La recomendación inicial habla de 45 créditos aproximados; las cuatro cargas cotejadas suman 46. No se ajustan cursos para forzar el aproximado.
- El ejemplo imprime 217 comunes + 145 de orientación = 362 totales; incluye 10 de extensión dentro del TO y una tabla de orientación subtotalizada en 135. Ese ejemplo no sustituye los mínimos normativos ya auditados **210 + 140 + 10 = 360**, ni autoriza doble cómputo o una malla de 362 obligatorios.

La UI denomina el alcance «Guía inicial oficial 2026 · parcial», advierte que no es una malla completa y conserva un único título, sede Montevideo, plan, trayectoria y progreso. Se añadió la revisión futura a `docs/carreras-a-actualizar.md`: ampliar sólo cuando la Comisión o FCIEN publique una guía posterior al segundo semestre, revise CIDU 2026 o identifique inequívocamente código y carga del seminario. El ciclo regional no se reutiliza como sede completa ni continuación semestral inferida.

## Reproducción offline y estado recuperable

- Fuente normalizada: `data/fcien/ciencias-biologicas-2017-trajectory-review.json`, con autoridades, URLs, vigencias, fecha, identidades cotejadas, porciones normalizadas y huellas SHA-256 de los tres PDF recuperados.
- Huella de `sourcePortions`: `sha256:0ea6b178df1a2e6c2f00ebcb6c523237954a55de7d36d6dd9ae595dc93280025`.
- Regenerar sin red: `npm run trajectory:fcien-ciencias-biologicas-2017`. El generador conserva el formato de línea del checkout y actualiza auditoría, proyección, colas e inventario; no descarga ni reextrae los PDF.
- Artefactos crudos locales no versionados: `tmp/d03ax/basic.pdf`, `cidu.pdf`, `regulation.pdf`; capturas locales `cidu-11.png`, `cidu-12.png`, `cidu-15.png`, `cidu-19.png`. La proyección no depende de esos archivos.
- Focales: `node --experimental-test-isolation=none --test tests/fcien-biological-sciences-2017-official-audit.test.mjs tests/fcien-ciencias-biologicas-2017-trajectory.test.mjs tests/official-trajectory-inventory.test.mjs tests/selectable-plan-trajectories.test.mjs`: **40/40**. La variante sin aislamiento evita el bloqueo `spawn EPERM` del sandbox y no cambia la semántica de las pruebas.
- `npm run lint`: correcto. `npm test`: compilación correcta y **1092/1092** pruebas, sin fallos. En este equipo requirió la autorización acotada de ejecución local fuera del sandbox por `spawn EPERM`; no se cambiaron dependencias ni controles del proyecto. Las dos expectativas globales de inventario en pruebas de Música/Interpretación se actualizaron únicamente de 110/30 a 111/29.
- Dos regeneraciones completas idénticas sobre 177 archivos (todos los planes generados y sus catálogos, auditorías, colas e inventarios): `sha256:bfcb0166b942b51e5cfd56c2249e2665f5f51c0cb34014eede0eca3387aff7af`. `git diff --check`: correcto.
- Validación visual de la aplicación **no realizada**: el inventario de uso de interfaz devolvió `apps: []`, `browsers: []`; no existe navegador controlable en esta sesión. La inspección visual citada arriba corresponde a las fuentes PDF, no a la aplicación.
- Implementación y validación cerradas; siguiente paso pendiente de autorización: revisión e integración serial del commit sobre el `main` más reciente, con nueva verificación combinada. No se integró, pusheó ni publicó desde el nodo.
