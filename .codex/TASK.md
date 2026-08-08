# Estado del proyecto: Trayecto Udelar

Última actualización: 2026-08-08  
Workspace: `C:\Users\elios\Documents\Proyectos_GPT\MallaCurricularUniversal`
Rama activa: `main`  
Commit de importación académica de referencia: `a63f653` (`Import official Bedelias prerequisite rules`)
Sitio desplegado: <https://trayecto-udelar-piloto.tokyo121.chatgpt.site>  
Acceso actual: privado, solo propietario.

## 1. Objetivo del producto

Construir una malla curricular independiente para carreras de Udelar que permita:

- consultar la trayectoria sugerida por semestre;
- marcar materias como pendientes, aprobadas o exoneradas;
- contabilizar créditos obtenidos;
- mostrar y evaluar previaturas reales;
- desbloquear curso y examen de acuerdo con Bedelías;
- consultar optativas/electivas;
- mostrar mínimos de créditos por área y requisitos para títulos intermedios/de grado;
- comenzar por carreras de grado, tecnicaturas y CIO vigentes;
- mantener una interfaz moderna, minimalista y coherente con la identidad visual de Udelar;
- continuar siendo un proyecto estudiantil no oficial y mostrar claramente qué datos están verificados.

El piloto actual es Ingeniería en Computación con dos planes seleccionables. El Plan 2025 vigente es la opción predeterminada y el Plan 1997 se mantiene como histórico porque todavía puede haber estudiantes cursándolo. El Plan 2025 entró en vigor para la generación 2026 y su implementación académica sigue evolucionando.

## 2. Arquitectura actual

### Aplicación web

- React 19 con vinext/Vite.
- Despliegue mediante OpenAI Sites sobre una salida compatible con Cloudflare Workers.
- Una única página principal en `app/page.tsx`.
- Estilos globales en `app/globals.css`.
- Metadatos e identidad del sitio en `app/layout.tsx`.
- Logo institucional real en `public/udelar.svg`.
- Configuración del sitio en `.openai/hosting.json`.
- No hay backend de usuarios ni base de datos en producción.

### Persistencia del progreso

- El progreso del usuario se guarda en `localStorage`.
- Clave actual: `trayecto-udelar-progress-v2`.
- Se guarda un mapa de estados separado por plan. Si solo existe la clave histórica `trayecto-udelar-demo-v1`, se migra automáticamente al Plan 1997.
- No son cookies, no se envía al servidor y no se sincroniza entre navegadores/dispositivos.
- Hay importación/exportación manual a JSON.
- El botón de reinicio borra el estado de la aplicación después de confirmación.

### Datos académicos

Hay cinco conjuntos relevantes de datos:

1. Snapshot completo de Bedelías:
   - `data/bedelias/fing-ingenieria-computacion-1997.json`
   - Contiene composición, cursos/equivalencias, reglas de curso/examen, procedencia, texto original, validaciones y hash.
2. Catálogo institucional inicial:
   - `data/bedelias/catalog.json`
   - Contiene 25 servicios encontrados en la consulta pública.
3. Proyección compacta consumida por la interfaz:
   - `app/data/computacion-1997-bedelias.json`
   - Contiene solo las 29 materias centrales mostradas y sus 53 reglas relevantes.
4. Snapshot de Bedelías para Ingeniería en Computación Plan 2025:
   - `data/bedelias/fing-ingenieria-en-computacion-2025.json`
   - Confirma vigencia, 450 créditos, 60 meses y 38 unidades/equivalencias actualmente presentes en la composición. La composición y las previas siguen incompletas en SGAE.
5. Trayectorias oficiales y proyección Plan 2025:
   - Fuente curada: `data/fing/computacion-2025-trayectorias.json`.
   - Proyección web: `app/data/computacion-2025-fing.json`.
   - Conserva dos trayectorias oficiales de FING para Montevideo (`PI >=60%` y `PI 20–59%`), mínimos por área, procedencia por materia y la cobertura parcial de Bedelías.

El snapshot completo es deliberadamente más grande que la proyección. La aplicación no debe importar el snapshot completo al navegador.

### Herramientas de importación

- Importador principal: `scripts/scrape-bedelias.mjs`.
- Generador de proyección: `scripts/build-app-data.mjs`.
- Generador Plan 2025: `scripts/build-computacion-2025.mjs`.
- Documentación operativa: `docs/bedelias-importer.md`.
- Automatización con `playwright-core` y Chrome/Edge instalado localmente.

Comandos relevantes:

```powershell
npm.cmd run bedelias:catalog
npm.cmd run bedelias:plan -- --service FING --career "INGENIERÍA EN COMPUTACIÓN" --year 1997 --courses 1466,1321
npm.cmd run bedelias:plan -- --service FING --career "INGENIERÍA EN COMPUTACIÓN" --year 2025 --course-names "Fundamentos de la Combinatoria|Programación Imperativa"
node scripts\scrape-bedelias.mjs normalize --input data\bedelias\fing-ingenieria-computacion-1997.json
npm.cmd run bedelias:project
npm.cmd run bedelias:project:2025
npm.cmd test
```

En Windows debe usarse `npm.cmd`; `npm.ps1` puede fallar por la política de ejecución de PowerShell.

## 3. Decisiones importantes y razones

### Bedelías es la fuente de verdad académica

La consulta pública de Bedelías/SGAE es la autoridad operativa para planes y previaturas. Los ejemplos externos como trayectoria.fely.dev, micarrera.uy y mallas existentes sirven para comparar UX o detectar inconsistencias, pero no deben alimentar reglas oficiales sin validación.

### Automatización de la interfaz en lugar de imitar endpoints internos

La auditoría mostró una aplicación Jakarta Faces/PrimeFaces con `ViewState`, formularios POST, AJAX parcial e identificadores generados. No se encontró una API REST pública/documentada.

Se descartó implementar un cliente que reprodujera directamente las solicitudes JSF porque dependería de identificadores temporales y sería muy frágil frente a cambios de versión. El importador controla la interfaz pública con selectores semánticos y extrae el DOM resultante.

El método actual:

- no requiere autenticación;
- no usa la cuenta del usuario;
- es secuencial, no paralelo;
- pausa 900 ms por defecto entre interacciones, con mínimo forzado de 500 ms;
- bloquea imágenes, fuentes y medios innecesarios;
- utiliza checkpoints para reanudar sin repetir reglas ya obtenidas;
- escribe JSON de forma atómica;
- conserva texto original y estructura normalizada;
- registra fecha, URLs, hash y validaciones.

### Curso y examen se modelan por separado

Bedelías publica condiciones distintas para cursar y rendir examen. En la UI:

- `pending` -> `approved` requiere satisfacer la regla oficial de curso;
- `approved` -> `exonerated` requiere satisfacer la regla oficial de examen cuando existe;
- una materia `approved` satisface requisitos de tipo curso, pero no suma créditos;
- una materia `exonerated` satisface requisitos de curso y examen, y suma créditos.

Esta semántica responde a la preferencia explícita del usuario: los créditos solo se cuentan cuando la materia está exonerada/completada.

### Las reglas conservan lógica compleja

No se reducen las previaturas a listas planas. El modelo guarda:

- `all`: deben cumplirse todos los hijos;
- `any`: debe cumplirse alguna alternativa;
- `none`: no debe cumplirse ninguna condición excluyente;
- `requirement`: cantidad mínima de aprobaciones entre opciones;
- mínimos de créditos en el plan;
- evidencia de curso, examen o inscripción;
- equivalencias de otros servicios/planes;
- texto original para formatos futuros.

Ejemplo validado: para cursar Arquitectura de Computadoras 1466 en Plan 97 no alcanza Programación 1. Deben satisfacerse grupos de Discreta 1, Programación 1, Lógica y Programación 2, además de no tener aprobada la versión anterior 1443. Programación 1 aparece como requisito de examen, por lo que debe estar exonerada en el modelo actual.

### Separación entre trayectoria sugerida y reglas oficiales

Los semestres no provienen de Bedelías. Fueron transcritos de la trayectoria sugerida compartida por el usuario para Plan 97, con dedicación total. No son una optimización algorítmica de egreso ni una garantía de oferta semestral.

Los créditos y previaturas de las 29 materias centrales sí provienen del snapshot de Bedelías y llevan una etiqueta visual `Bedelías`.

Las optativas del catálogo piloto, los dos bloques manuales del Proyecto de Grado y algunas metas siguen siendo curados/no verificados.

Para el Plan 2025, la trayectoria sí proviene de la página oficial de Carreras de Computación en EVA/FING. FING publica dos láminas para Montevideo según el resultado de la Prueba Inicial y aclara que el ordenamiento es un ejemplo flexible, no una secuencia única. Bedelías sigue siendo la autoridad para vigencia, composición y previaturas, pero al 2026-08-08 su composición solo muestra 38 unidades/equivalencias. Se consultaron las diez materias iniciales identificadas por código y la proyección conserva 17 reglas de curso/examen correspondientes a nueve materias. La UI distingue las etiquetas `FING` y `Bedelías`; una ausencia de regla nunca se presenta como “sin previas”.

## 4. Funcionalidad implementada

### UI y progreso

- Selector de carrera, plan y trayectoria. Ingeniería en Computación permite elegir Plan 2025 o Plan 1997.
- Plan 2025 es la opción predeterminada y ofrece las tres ramas oficiales: `PI <20%`, `PI 20–59%` y `PI >=60%`.
- Malla horizontal de pre-semestre a décimo semestre en escritorio.
- En mobile (hasta 720 px), la malla se convierte en una trayectoria vertical: los semestres y sus materias se recorren hacia abajo, sin desplazamiento horizontal; el panel de avance queda después de la malla para priorizar las materias.
- Buscador por código, nombre o área.
- Filtro de materias habilitadas en Plan 1997. En Plan 2025 se reemplaza por un indicador de cobertura de previas, porque todavía no corresponde afirmar habilitación oficial.
- Estados visuales pendiente/aprobada/exonerada.
- Persistencia local.
- Exportar/importar progreso.
- Reinicio del progreso.
- Panel de créditos totales.
- Panel de título intermedio y título de grado.
- Panel de créditos por área: metas oficiales para Plan 2025 y metas todavía demo para Plan 1997.
- Sección plegable de optativas/electivas.
- Drawer de detalles de materia.
- Identificación visual de materias con datos importados de Bedelías.
- Visualización de la condición relevante para el siguiente cambio de estado: curso si está pendiente, examen si está aprobada.
- Progreso separado por plan en `localStorage`, con migración automática del progreso histórico del Plan 1997.

### Prueba Inicial y Matemática Inicial

El check especial se usa en el Plan 1997 y, desde la decisión del 2026-08-08, también en la rama `PI >=60%` del Plan 2025:

- Existe una materia especial `PI` en pre-semestre.
- Se comporta como check, no como el ciclo de tres estados.
- Al acreditarla suma 4 créditos.
- Sustituye y oculta Matemática Inicial (`MI2`).
- PI y MI2 no pueden acumularse; marcar una limpia la otra.
- El evaluador trata PI acreditada como sustitución de MI2 para reglas posteriores.
- En Plan 2025 aparece solo en la rama `>=60%`, como instancia presemestre de 4 créditos; no altera los totales oficiales de los semestres 1–8.
- Para 2025 esos 4 créditos son un supuesto operativo pedido por el usuario, coherente con la equivalencia histórica PI/MI, pero aún pendiente de confirmación documental explícita para 2026. El dato queda marcado `assumed-current-pending-verification` y no debe presentarse como una regla oficial ya comprobada.

### Trayectoria Plan 97 cargada

La distribución visible se alineó con la imagen compartida:

- Semestre 1: Matemática Inicial, Matemática Discreta 1, Programación 1.
- Semestre 2: CDIV, Física 1, GAL 1, Programación 2.
- Semestre 3: CDIVV, GAL 2, Lógica, Matemática Discreta 2.
- Semestre 4: Arquitectura, Programación 3, Probabilidad y Estadística, Métodos Numéricos.
- Semestre 5: Sistemas Operativos, Programación 4, Teoría de Lenguajes, Administración General.
- Semestre 6: Fundamentos de Bases de Datos, Taller de Programación, Redes, Práctica de Administración.
- Semestre 7: Investigación de Operaciones, Taller Introductorio de Ingeniería de Software, Programación Lógica.
- Semestre 8: Proyecto de Ingeniería de Software, Economía, Políticas Científicas.
- Semestres 9 y 10: Proyecto de Grado dividido visualmente en dos etapas de 15 créditos.

### Trayectoria Plan 2025 cargada

- Fuente: sección oficial `Planes de Estudio 2025` de Carreras de Computación en EVA/FING.
- Dos trayectorias completas para ingreso en primer semestre: `PI >=60%` y `PI 20–59%`.
- Un tercer tramo `PI <20%` muestra únicamente el primer semestre obligatorio con Matemática Inicial y TBEO (7 créditos); no inventa la continuación posterior.
- Ocho semestres de núcleo común y requisitos específicos publicados por FING.
- Los totales por semestre coinciden exactamente con las láminas oficiales: `36, 38, 42, 43, 44, 35, 30, 15` para `>=60%` y `18, 38, 44, 43, 44, 45, 40, 15` para `20–59%`.
- La rama `>=60%` incluye la Prueba Inicial como check presemestre de 4 créditos. Por estar fuera de los semestres, reproduce sin cambios los totales publicados por FING.
- Las páginas oficiales de ingreso 2026 consultadas mantienen los cortes `<20%`, `20–59%` y `>=60%`. La documentación reciente de la trayectoria no confirma de forma inequívoca los 4 créditos; se contabilizan por decisión del proyecto y quedan marcados como `assumed-current-pending-verification` hasta localizar una resolución o registro vigente.
- Las reglas SGAE muestran a Matemática Inicial (`MI2`) dentro de la condición de Cálculo DIV (`1061`): se conserva tanto la aprobación de MI como la exclusión de inscripción simultánea. El drawer puede mostrar materias que una unidad puede habilitar o condicionar.
- La UI advierte que perfiles, optativas, 20 créditos complementarios y Proyecto de Grado de 30 créditos todavía no tienen una ubicación semestral completa en la trayectoria proyectada.
- Materias ya presentes en la composición SGAE llevan etiqueta `Bedelías`; el resto lleva etiqueta `FING`.

### Importador de Bedelías

- Descubre servicios desde la oferta académica pública.
- Selecciona servicio, carrera y plan.
- Extrae vigencia, duración, créditos mínimos y vínculo a Colibrí.
- Recorre la composición completa del plan sin tener que expandir visualmente todos los nodos; los hijos ya están presentes en el DOM.
- Deduplica unidades curriculares y conserva múltiples rutas curriculares.
- Consulta reglas por código y separa Curso/Examen.
- Expande ramas colapsadas, incluidas exclusiones `no debe tener`.
- Normaliza requisitos directos, alternativas, equivalencias, inscripciones y créditos mínimos.
- Permite normalizar snapshots existentes sin nuevas solicitudes.
- Permite extracción acotada con `--courses`.
- Permite buscar materias por nombre exacto con `--course-names`, útil cuando un plan todavía no incorporó todos los códigos a su composición.
- Los marcadores `noPublishedRule` no se validan como reglas rotas: representan explícitamente una consulta sin regla publicada.
- Guarda checkpoint ignorado por Git (`data/bedelias/*.checkpoint`).

### Datos obtenidos

- 25 servicios institucionales descubiertos.
- Plan 1997 de Ingeniería en Computación.
- Plan tipo créditos, 60 meses, 450 créditos mínimos.
- Plan 97 marcado como no vigente.
- Plan 2025 importado y confirmado como vigente, 60 meses y 450 créditos mínimos.
- Bedelías muestra actualmente 38 unidades/equivalencias en la composición del Plan 2025.
- FING publica 32 materias diferentes en las tres ramas combinadas; la proyección contiene 33 fichas al sumar la Prueba Inicial presemestre asumida y conserva 17 reglas de curso/examen para nueve materias iniciales localizables por código.
- 610 unidades/equivalencias únicas en la composición del Plan 97.
- 29 materias centrales proyectadas en la UI.
- 53 reglas de curso/examen.
- Cero requisitos sin interpretar después de la normalización actual.
- Títulos detectados: Ingeniero en Computación y Analista en Computación.
- Documento estable del Plan 97: <https://hdl.handle.net/20.500.12008/43879>.

## 5. Pruebas y validación

Pruebas en `tests/bedelias-data.test.mjs`:

- procedencia institucional y hash;
- todas las materias centrales tienen regla oficial para cursar;
- Arquitectura 1466 contiene los cuatro grupos relevantes y exclusiones;
- Arquitectura exige Programación 1 exonerada, no solo aprobada;
- ningún requisito normalizado queda como texto crudo.

Pruebas en `tests/rendered-html.test.mjs`:

- render del sitio real y metadatos correctos;
- ausencia del starter de Sites;
- presencia de procedencia FING y Bedelías;
- Plan 2025 predeterminado y Plan 1997 seleccionable;
- estados pendiente/aprobada/exonerada y rama de Prueba Inicial.

Pruebas en `tests/computacion-2025-data.test.mjs`:

- procedencia independiente de FING y Bedelías;
- vigencia, 450 créditos y cobertura de composición;
- totales exactos por semestre en ambas trayectorias oficiales;
- ficha y estado de procedencia para todas las materias proyectadas.

Estado actual: `npm.cmd test` compila correctamente y pasan 11/11 pruebas.

## 6. Bugs, inconsistencias y límites conocidos

### Prioridad alta

1. **Créditos de la PI 2026 asumidos, sin confirmación inequívoca.** Los cortes y el efecto sobre la trayectoria están publicados. Por decisión del proyecto, la rama `>=60%` suma los 4 créditos históricos como equivalencia de Matemática Inicial, pero el estado del dato deja explícito que falta una resolución o registro vigente que lo confirme.
2. **Plan 97 conserva metas por área demo.** El Plan 2025 ya usa mínimos oficiales por área; `areaTargets` del Plan 1997 y algunos detalles del título intermedio siguen curados como demo.
3. **Proyecto de Grado dividido manualmente.** `1730-A` y `1730-B` son una representación visual de dos semestres. No son códigos oficiales importados. Debe confirmarse cómo Bedelías representa el Proyecto de Grado y sus créditos/reglas.
4. **Oferta no importada.** Los campos `offered` del Plan 97 siguen siendo manuales. El Plan 2025 no afirma oferta; sus semestres provienen de la trayectoria sugerida oficial, que FING define como ejemplo flexible.

### Datos y evaluador

5. Solo se integraron los planes 1997 y 2025 de Ingeniería en Computación. El objetivo global de grados, tecnicaturas y CIO vigentes todavía no está cubierto.
6. En Plan 97 solo 29 materias centrales tienen cobertura oficial y las optativas visibles aún usan previas manuales. En Plan 2025 todavía faltan perfiles, optativas, formación complementaria y Proyecto de Grado en la malla.
7. Bedelías todavía no contiene la implementación completa del Plan 2025: 38 unidades/equivalencias en composición y 17 reglas proyectadas para nueve materias iniciales. Las materias sin regla pueden marcarse para registrar progreso, pero no se bloquean ni se muestran como “habilitadas”.
8. Algunas materias publican regla de curso pero no regla de examen, posiblemente porque no tienen examen convencional (taller/proyecto). Hoy, si no hay regla de examen proyectada, la transición a exonerada no se bloquea. Se debe distinguir explícitamente `sin modalidad de examen`, `sin regla publicada` y `no consultada`.
9. El evaluador no registra inscripciones reales. Las opciones `course-enrollment` y `exam-enrollment` se consideran falsas. Esto funciona para muchas exclusiones, pero no alcanza para evaluar condiciones basadas en una inscripción vigente.
10. Progreso antiguo de `localStorage` no se revalida al cambiar reglas. Esto es intencional para no borrar una escolaridad real, pero un estado colocado durante la demo puede sobrevivir aunque se haya obtenido con reglas viejas.
11. Las URLs con `?cid=1` son de conversación JSF y no son enlaces permanentes. El snapshot conserva procedencia y texto, pero los enlaces estables de cara al usuario deben ser la portada de Bedelías y documentos de Colibrí.
12. El snapshot completo del Plan 97 ronda 1,5 MB y la proyección del navegador ronda 430 KB. Es aceptable para el piloto, pero no escalará a toda Udelar sin dividir datos por carrera/plan o servirlos bajo demanda.

### Infraestructura

13. `npm install` reportó 20 vulnerabilidades transitivas (1 baja, 4 moderadas, 15 altas). No se ejecutó `npm audit fix` porque puede introducir cambios incompatibles. Auditar dependencias antes de producción pública.
14. No existe autenticación propia, base de datos ni sincronización. Las cuentas quedaron explícitamente para una etapa futura.
15. El sitio está privado/owner-only. Copiar el enlace no da acceso a otros usuarios mientras no se cambie el control de acceso.

## 7. Intentos, problemas encontrados y decisiones descartadas

- **Previas manuales iniciales:** se habían cargado listas simplificadas para demostrar la UI. Se detectó que eran académicamente incorrectas; Arquitectura figuraba solo con Programación 1. Las reglas oficiales ahora tienen prioridad para las 29 materias importadas. No volver a presentar previas manuales como oficiales.
- **Distribución semestral inicial manual:** no era la trayectoria compartida ni una optimización demostrada. Se corrigió para reproducir la imagen del Plan 97 y se rotuló como trayectoria sugerida.
- **Créditos por materia aprobada:** inicialmente aprobada sumaba créditos. Se cambió para que solo exonerada sume, por decisión del usuario.
- **Cliente HTTP directo para JSF:** considerado y descartado por ViewState, IDs generados y flujos dependientes de conversación.
- **Filtro PrimeFaces con `fill`:** no disparaba siempre la búsqueda. El importador usa escritura (`type`) más Enter y espera explícita.
- **Filas de previaturas:** inicialmente se asumió `data-rk`; esas tablas usan `data-ri`. Se corrigió usando filas semánticas y texto exacto.
- **Volver mediante botón:** generaba más recargas. El importador intenta historial (`goBack`) y conserva fallback al botón.
- **Checkpoints con reglas vacías:** la primera prueba guardó marcadores `none` por el bug de filas. El flujo fue corregido y luego reextraído/normalizado.
- **Parser inicial limitado:** solo entendía `Curso/Examen de la U.C.B.`. Se amplió para `aprobado`, `U.C.B aprobada`, inscripciones, equivalencias con servicio y mínimos de créditos. Luego se normalizaron las 53 reglas sin nuevas solicitudes.
- **Plan 2025 tratado inicialmente como “detectado”:** se comprobó que no basta con esperar una vuelta completa del plan. FING ya publicó la estructura, las dos trayectorias de Montevideo y los mínimos, mientras Bedelías todavía está parcial. Se adoptó un modelo de doble procedencia en vez de bloquear toda la integración.
- **Búsqueda de reglas 2025 solo por códigos:** la composición parcial no contiene códigos para muchas materias nuevas. Se añadió `--course-names` con normalización de acentos para consultar por nombre sin ampliar innecesariamente el volumen de solicitudes.
- **Ausencia de resultado tratada como error:** los checkpoints `noPublishedRule` producían falsos errores de expresión faltante. La validación ahora distingue consulta sin regla publicada de regla malformada.
- **Ubicación física del proyecto:** originalmente todo estaba directamente en `Proyectos_GPT`. A pedido del usuario se trasladó el proyecto completo, incluido `.git`, a `Proyectos_GPT\MallaCurricularUniversal`.
- **Pruebas del starter:** `tests/rendered-html.test.mjs` todavía esperaba el skeleton inicial de Sites. Se reemplazó por pruebas del producto real.
- **Scripts npm con variables Unix:** `WRANGLER_LOG_PATH=...` fallaba en Windows. Los scripts quedaron como `vinext dev/build/start` para ser multiplataforma.
- **`npm.ps1`:** bloqueado por ExecutionPolicy. Usar `npm.cmd`.

## 8. Próximos pasos recomendados

Orden sugerido:

1. Confirmar documentalmente si la Prueba Inicial 2026 otorga 4 créditos y reemplazar el estado de supuesto por uno verificado, o corregir la contabilización si la evidencia vigente lo contradice.
2. Definir la transición guiada desde el bloque `PI <20%` a una trayectoria posterior sin asumir automáticamente una rama.
3. Añadir estados explícitos para modalidad/regla de curso y examen: `published`, `not-published`, `not-applicable`, `not-scraped`.
4. Volver a extraer el Plan 2025 periódicamente y comparar snapshots para detectar cuándo Bedelías agrega composición, códigos y reglas; no sustituir datos FING automáticamente.
5. Incorporar perfiles del Plan 2025, optativas reales, créditos complementarios y Proyecto de Grado cuando la Comisión de Carrera publique su implementación.
6. Confirmar Proyecto de Grado del Plan 97 y eliminar o documentar formalmente la división manual `1730-A/B`.
7. Reemplazar metas demo por área del Plan 97 después de validarlas documentalmente.
8. Construir el catálogo global de carreras/ciclos/CIO por servicio y filtrar planes vigentes de grado/tecnicatura/CIO.
9. Investigar fuentes institucionales de oferta efectiva por semestre sin confundirlas con la trayectoria sugerida.
10. Separar datos por carrera/plan y cargarlos bajo demanda antes de integrar muchas carreras.
11. Añadir reportes de diferencias y un panel visible de procedencia por plan.
12. Evaluar cuentas/sincronización solo después de estabilizar el modelo académico.

## 9. Flujo seguro para continuar

1. Leer este archivo y `docs/bedelias-importer.md`.
2. Ejecutar `git status --short`; preservar cambios del usuario.
3. Ejecutar primero una extracción acotada con `--courses` o `--course-names` al modificar el scraper.
4. Revisar el checkpoint y snapshot; normalizar sin red cuando sea posible.
5. Ejecutar `npm.cmd run bedelias:project` para Plan 97 y `npm.cmd run bedelias:project:2025` para Plan 2025.
6. Ejecutar `npm.cmd test`.
7. Solo integrar datos con procedencia y validación completa.
8. Para publicar, usar el flujo existente de Sites y el `project_id` de `.openai/hosting.json`; no crear otro sitio.
9. Mantener el despliegue privado salvo autorización explícita del usuario para compartir/publicar.
10. No solicitar credenciales de Bedelías: la cobertura actual usa acceso público y no las necesita.

## 10. Criterios de “fuente de verdad”

Un dato puede mostrarse como verificado por Bedelías solo si:

- fue extraído desde el servicio/carrera/plan correctos;
- conserva fecha y procedencia;
- pasó validación estructural;
- su regla no tiene nodos `raw` sin interpretar;
- distingue curso de examen;
- la carrera/plan y vigencia son visibles;
- no se mezcló con una trayectoria sugerida sin indicarlo;
- un cambio posterior de snapshot fue revisado antes de desplegarse.

Cuando falte cualquiera de estas condiciones, mostrar `en revisión`, `trayectoria sugerida` o `sin regla importada`, nunca una afirmación oficial.
