# Estado del proyecto: Trayecto Udelar

## Tarea activa - Ingeniería Eléctrica Plan 2023 (Montevideo)

- Rama/worktree: `feature/ingenieria-electrica-2023` en `MallaCurricularUniversal-electrica-2023`.
- Alcance corregido por evidencia oficial: el plan fue aprobado en 2022, pero entró en vigencia y está identificado por Bedelías/FING como Plan 2023.
- Auditoría Bedelías completa al 2026-08-09: 221 unidades/equivalencias, 173 cursos locales, 48 equivalencias externas, 233 reglas publicadas (155 curso, 78 examen) y 17 consultas sin regla publicada.
- Fuentes, cobertura y pendientes: `data/fing/electrica-2023-fuentes.json` y `docs/tasks/ingenieria-electrica-2023.md`.
- Fuentes curriculares confirmadas: plan Colibrí/Diario Oficial, página FING, EVA de la Comisión de Carrera, dos trayectorias con Matemática Inicial y planilla de perfiles 2026.
- La condición especial de actividad de curso de Diseño Lógico quedó normalizada; el snapshot tiene cero nodos sin interpretar. Siguiente paso: proyectar núcleo/perfiles/catálogo y generalizar la interfaz.
- No integrar en `main`, no hacer push y no publicar sin autorización explícita.

Última actualización: 2026-08-09
Workspace: `C:\Users\elios\Documents\Proyectos_GPT\MallaCurricularUniversal`
Rama activa: `main`  
Commit de importación académica de referencia: `a63f653` (`Import official Bedelias prerequisite rules`)
Sitio desplegado: <https://trayecto-udelar-piloto.tokyo121.chatgpt.site>  
Acceso actual: público; cualquier persona con el enlace puede abrirlo.

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
   - Contiene 29 materias de trayectoria, 61 unidades curriculares flexibles y 126 reglas de curso/examen relevantes.
4. Snapshot de Bedelías para Ingeniería en Computación Plan 2025:
   - `data/bedelias/fing-ingenieria-en-computacion-2025.json`
   - Confirma vigencia, 450 créditos, 60 meses y 38 unidades/equivalencias actualmente presentes en la composición. La composición y las previas siguen incompletas en SGAE.
5. Trayectorias oficiales y proyección Plan 2025:
   - Fuente curada: `data/fing/computacion-2025-trayectorias.json`.
   - Proyección web: `app/data/computacion-2025-fing.json`.
   - Conserva dos trayectorias oficiales de FING para Montevideo (`PI >=60%` y `PI 20–59%`), mínimos por área, procedencia por materia y la cobertura parcial de Bedelías.

6. Modelo universal de requisitos y catálogo inicial de programas:
   - `scripts/academic-requirements.mjs` define árboles y requisitos por título para Computación 1997 y 2025.
   - `data/fing/computacion-programas-oficiales.json` registra programas oficiales por UC, carrera y plan.
   - Las proyecciones web usan `schemaVersion: 2`, `creditStructure`, `creditAllocations`, `eligibleRequirementIds`, `programSources` y `sourceCoverage`.

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

### La fuente más específica prevalece para cada tipo de dato

La consulta pública de Bedelías/SGAE es la autoridad operativa para composición y previaturas. Para saber en qué área suma una UC prevalece el Anexo B oficial específico de esa carrera y plan, luego las resoluciones, la composición de Bedelías, el plan y la trayectoria oficial. Los ejemplos externos como trayectoria.fely.dev, micarrera.uy y mallas existentes sirven para comparar UX o detectar inconsistencias, pero no alimentan reglas oficiales sin validación.

La Comisión Académica de Grado de Fing exige que el Anexo B indique el área para cada plan. No se reutiliza automáticamente una clasificación del Plan 97 en el Plan 2025. Si no existe documento aplicable, la UI puede contar una asignación `suggested`, pero la identifica en la tarjeta y en el drawer.

### Protocolo de investigación documental por carrera y plan

Antes de incorporar datos de una carrera nueva se deben buscar y contrastar todas las fuentes institucionales disponibles, no limitarse a Bedelías ni inferir el plan por el nombre del archivo:

1. Identificar servicio, carrera, título, año/nombre del plan y generación de entrada en Bedelías.
2. Localizar el plan o resolución aprobado en Colibrí, CDC, consejo de facultad o sitio institucional equivalente.
3. Revisar páginas de carrera, comisiones, EVA y materiales oficiales de ingreso para trayectorias sugeridas, perfiles, orientaciones, CIO, títulos intermedios y reglas transitorias.
4. Clasificar cada documento por el plan que describe usando sus materias, créditos, total y fecha interna; el nombre o año de publicación no basta.
5. Contrastar créditos, semestres, mínimos por área y títulos entre al menos Bedelías y el documento oficial específico del plan. Investigar discrepancias antes de publicar.
6. Conservar URL, fecha de revisión, alcance y estado por dato: `verified`, `partial`, `historical`, `project-assumption` o equivalente.
7. Usar sitios estudiantiles únicamente como detector de faltantes o comparación de UX; nunca como autoridad final.

Caso importante: `TrayectoriaSugerida_2025_Montevideo.pdf`, publicado por FING y compartido por el usuario, explicita 4 créditos de Prueba Inicial para `>=60%`, pero corresponde al Plan 1997 cursado durante 2025. Se reconoce por Programación 1–4, Física 1, Proyecto de Grado en semestres 9–10 y total de 329 créditos. No confirma por sí solo los créditos de la PI del nuevo Plan de Estudios 2025 vigente desde 2026.

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
- mínimos de créditos dentro de un grupo/área curricular;
- evidencia de curso, examen o inscripción;
- equivalencias de otros servicios/planes;
- texto original para formatos futuros.

Ejemplo validado: para cursar Arquitectura de Computadoras 1466 en Plan 97 no alcanza Programación 1. Deben satisfacerse grupos de Discreta 1, Programación 1, Lógica y Programación 2, además de no tener aprobada la versión anterior 1443. Programación 1 aparece como requisito de examen, por lo que debe estar exonerada en el modelo actual.

### Separación entre trayectoria sugerida y reglas oficiales

Los semestres no provienen de Bedelías. Fueron transcritos de la trayectoria sugerida compartida por el usuario para Plan 97, con dedicación total. No son una optimización algorítmica de egreso ni una garantía de oferta semestral.

Los créditos, áreas y previaturas de las 29 materias centrales provienen del snapshot de Bedelías y llevan una etiqueta visual `Bedelías`. El catálogo flexible contiene otras 61 unidades verificadas en la composición oficial; 60 tienen regla de curso publicada/importada y `Ciencia, Tecnología y Sociedad` queda explícitamente con previas aún no consultadas/publicadas.

La implementación curricular publicada por FING respalda el núcleo obligatorio de 22 unidades y la alternativa `Programación Funcional o Programación Lógica`. La regla vigente de Proyecto de Grado se extrajo de Bedelías y evalúa tres caminos alternativos: 365 créditos con cursos clave, 330 créditos con mínimos por área, o 380 créditos totales. La división visual `1730-A/B` sigue siendo una decisión de interfaz, pero la habilitación de la primera etapa usa la regla oficial de `1730`.

Para el Plan 2025, la trayectoria sí proviene de la página oficial de Carreras de Computación en EVA/FING. FING publica dos láminas para Montevideo según el resultado de la Prueba Inicial y aclara que el ordenamiento es un ejemplo flexible, no una secuencia única. Bedelías sigue siendo la autoridad para vigencia, composición y previaturas, pero al 2026-08-08 su composición solo muestra 38 unidades/equivalencias. Se consultaron las diez materias iniciales identificadas por código y la proyección conserva 17 reglas de curso/examen correspondientes a nueve materias. La UI distingue las etiquetas `FING` y `Bedelías`; una ausencia de regla nunca se presenta como “sin previas”.

El índice oficial completo es <https://eva.fing.edu.uy/course/view.php?id=800&section=4>. Además de las dos trayectorias de ingreso en primer semestre ya proyectadas, publica variantes todavía no integradas en la UI: ingreso en segundo semestre para `>=60%` y `20–59%`, trayectoria CENUR Litoral Norte, Analista en Computación en Colonia, trayecto inicial de Tacuarembó y un procedimiento transitorio para estudiantes con estudios previos avanzados. No presentar la malla actual como cobertura de todas las sedes o momentos de ingreso.

## 4. Funcionalidad implementada

### UI y progreso

- Selector de carrera, plan y trayectoria. Ingeniería en Computación permite elegir Plan 2025 o Plan 1997.
- Plan 2025 es la opción predeterminada y ofrece las tres ramas oficiales: `PI <20%`, `PI 20–59%` y `PI >=60%`.
- Malla horizontal de pre-semestre a décimo semestre en escritorio.
- En mobile (hasta 720 px), la malla se convierte en una trayectoria vertical: los semestres y sus materias se recorren hacia abajo, sin desplazamiento horizontal; el panel de avance queda después de la malla para priorizar las materias.
- La rueda desplaza la página verticalmente con una interpolación breve mediante `requestAnimationFrame`; nunca se convierte en scroll horizontal sobre la malla. Los paneles internos conservan su propio scroll, el desplazamiento horizontal queda disponible mediante la barra inferior/gestos horizontales y `prefers-reduced-motion` mantiene el comportamiento nativo.
- La interpolación vertical usa tiempo transcurrido, no una fracción fija por cuadro, para mantener la misma respuesta en pantallas de 60/120/144 Hz y recuperarse de cuadros ocasionalmente lentos. La barra fija evita `backdrop-filter` durante el recorrido para reducir recomposición gráfica.
- Al abrir la ficha lateral se cancela cualquier animación vertical y se bloquea el scroll de `html/body`; solo el panel puede desplazarse y usa `overscroll-behavior` para impedir encadenamiento al fondo. El gutter estable evita saltos de ancho, el fondo no usa blur y `Escape` cierra la ficha.
- En escritorio, dos flechas accesibles en la barra de herramientas mueven la malla exactamente una columna/semestre por clic con animación nativa suave y se deshabilitan en los extremos. El listener horizontal solo actualiza React cuando cambia uno de esos extremos, evitando recalcular toda la malla durante el desplazamiento. Las flechas se ocultan en móvil, donde la trayectoria ya es vertical.
- La malla horizontal se excluye del detector de paneles con scroll vertical: apuntar una materia nunca desactiva el suavizado vertical de la página, aunque el navegador reporte `overflow-y: auto` como efecto de `overflow-x`.
- Las condiciones de Bedelías se presentan con lenguaje normalizado y alternativas en viñetas. La transformación es únicamente visual: códigos, reglas y evaluación conservan intactos los datos oficiales extraídos.
- Las fichas identifican en texto cuándo una materia o asignación proviene de Bedelías; no enlazan esas menciones a la portada general porque no existe una URL pública permanente para la ficha concreta.
- Buscador compartido por la malla y el planificador: ignora mayúsculas y tildes, admite código, nombre, área, prefijos de palabras y siglas genéricas sin conectores (`GAL`, `GAL2`, `P1`, `PROG1`), sin aceptar fragmentos internos arbitrarios. Las siglas con número exigen coincidencia exacta. Incluye botón `×` para limpiar todo el texto de una vez.
- Filtro de materias habilitadas en Plan 1997. En Plan 2025 se reemplaza por un indicador de cobertura de previas, porque todavía no corresponde afirmar habilitación oficial.
- Estados visuales pendiente/aprobada/exonerada.
- Persistencia local.
- Exportar/importar progreso con `formatVersion: 1`. El importador valida estructura, estados, versión y plan antes de tocar el progreso; JSON erróneo o incompatible abre un modal propio centrado en vez de `window.alert`.
- Reinicio del progreso.
- Panel de créditos totales.
- Panel de título intermedio y título de grado.
- Árbol anidado de grupos y áreas con metas oficiales para Plan 2025 y Plan 1997.
- Requisitos explícitos de total de créditos, núcleo obligatorio, paradigma adicional y Proyecto de Grado para Ingeniería Plan 97, con faltantes desplegables y enlace a FING.
- Selector de requisitos de Analista o Ingeniería, manteniendo ambas tarjetas resumen.
- Mínimos superiores de grupo, mínimos de área y créditos flexibles adicionales; el Plan 2025 muestra los 60 créditos tecnológicos adicionales.
- Nodos con mínimo cero rotulados `Sin mínimo propio`, sin barras `0/0`.
- Asignaciones de área oficiales o sugeridas visibles por materia; las sugeridas cuentan normalmente y nunca duplican créditos.
- Sección plegable de optativas/electivas.
- Al restaurar el Plan 1997, si `localStorage` contiene una optativa aprobada o exonerada fuera del catálogo inicial, la aplicación carga una sola vez el bloque ampliado, incorpora únicamente esas materias a la lista visible y contabiliza sus créditos sin exigir una nueva búsqueda.
- Las optativas visibles se ordenan por progreso: exoneradas, aprobadas y pendientes; dentro de cada grupo se usa orden alfabético español con numeración natural.
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
- Seleccionar la rama `>=60%` fija automáticamente PI como `exonerated`: suma los 4 créditos, se muestra acreditada y no puede desmarcarse. Al cambiar a otra rama, PI deja de contabilizarse.
- Para 2025 esos 4 créditos son un supuesto operativo pedido por el usuario, coherente con la equivalencia histórica PI/MI, pero aún pendiente de confirmación documental explícita para 2026. El dato queda marcado `assumed-current-pending-verification` y no debe presentarse como una regla oficial ya comprobada.
- Para Plan 1997 los 4 créditos sí quedan verificados también por la trayectoria oficial publicada por FING en 2025: <https://eva.fing.edu.uy/pluginfile.php/79060/mod_resource/content/5/TrayectoriaSugerida_2025_Montevideo.pdf>.
- La UI ya no etiqueta la PI del Plan 2025 como dato FING: usa procedencia `project-assumption`. La PI del Plan 1997 sí enlaza la evidencia oficial de FING en su drawer.

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
- 29 materias de trayectoria y 61 unidades curriculares flexibles proyectadas para el Plan 97.
- 126 reglas de curso/examen del Plan 97: 89 de curso y 37 de examen. Entre las flexibles, 60/61 tienen regla de curso publicada.
- El lote flexible se ejecutó a 500 ms entre interacciones: 62 códigos, 74 reglas recuperadas, 4.260 solicitudes de interfaz y cero incidencias/bloqueos; luego se fusionó con las 53 reglas centrales y se normalizó el conjunto completo.
- Cobertura de áreas Plan 97: 2 asignaciones respaldadas por programa oficial y 88 por composición de Bedelías; 0 sugeridas, conflictos o faltantes en la proyección.
- Cobertura de áreas Plan 2025: 11 asignaciones respaldadas por composición de Bedelías y 22 sugeridas; 0 conflictos o faltantes estructurales.
- Cero requisitos sin interpretar después de la normalización actual.
- Títulos detectados: Ingeniero en Computación y Analista en Computación.
- Documento estable del Plan 97: <https://hdl.handle.net/20.500.12008/43879>.

## 5. Pruebas y validación

Pruebas en `tests/bedelias-data.test.mjs`:

- procedencia institucional y hash;
- todas las materias centrales tienen regla oficial para cursar;
- Arquitectura 1466 contiene los cuatro grupos relevantes y exclusiones;
- Arquitectura exige Programación 1 exonerada, no solo aprobada;
- catálogo flexible de 61 unidades con créditos y áreas oficiales;
- núcleo obligatorio de 22 unidades y alternativa Programación Funcional/Lógica;
- Proyecto de Grado con caminos de 330, 365 y 380 créditos y mínimos de grupo;
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

Pruebas en `tests/course-search.test.mjs`:

- normalización de mayúsculas, tildes y puntuación;
- búsqueda por siglas sin conectores y con sufijo numérico;
- alias genéricos palabra+número (`P1`, `PROG1`);
- equivalencia de numeración romana y arábiga;
- prefijos de varias palabras y casos negativos para evitar coincidencias arbitrarias.

Pruebas en `tests/course-progress.test.mjs`:

- detección de progreso académico relevante fuera del catálogo inicial;
- exclusión de estados pendientes para evitar cargas innecesarias;
- orden por exonerada/aprobada/pendiente y nombre, sin mutar el catálogo original.

Estado actual: `npm.cmd test` compila correctamente y pasan 35/35 pruebas. El lint de los archivos nuevos pasa sin observaciones. El lint global conserva 12 errores y 1 advertencia preexistentes en `app/page.tsx` y `scripts/build-computacion-2025.mjs`.

## 6. Bugs, inconsistencias y límites conocidos

### Prioridad alta

1. **Créditos de la PI 2026 asumidos, sin confirmación inequívoca.** Los cortes y el efecto sobre la trayectoria están publicados. Por decisión del proyecto, la rama `>=60%` suma los 4 créditos históricos como equivalencia de Matemática Inicial, pero el estado del dato deja explícito que falta una resolución o registro vigente que lo confirme.
2. **Cobertura de programas 2025 todavía parcial.** Las áreas de materias ya ubicadas inequívocamente en la composición de Bedelías son oficiales. Las nuevas materias sin Anexo B o resolución aplicable conservan una asignación sugerida y visible.
3. **Proyecto de Grado dividido visualmente.** `1730-A` y `1730-B` representan dos etapas de 15 créditos, no códigos oficiales. Los 30 créditos, el área y la regla de habilitación sí provienen de `1730`; la regla oficial se aplica a la primera etapa y la segunda exige completar la primera.
4. **Oferta no importada.** Los campos `offered` del Plan 97 siguen siendo manuales. El Plan 2025 no afirma oferta; sus semestres provienen de la trayectoria sugerida oficial, que FING define como ejemplo flexible.

### Datos y evaluador

5. Solo se integraron los planes 1997 y 2025 de Ingeniería en Computación. El objetivo global de grados, tecnicaturas y CIO vigentes todavía no está cubierto.
6. En Plan 97 las 29 materias centrales y 61 flexibles tienen créditos/área oficiales; 60/61 flexibles tienen regla de curso importada. La oferta efectiva por semestre todavía no fue verificada y no se afirma. En Plan 2025 todavía faltan perfiles, optativas, formación complementaria y Proyecto de Grado en la malla.
7. Bedelías todavía no contiene la implementación completa del Plan 2025: 38 unidades/equivalencias en composición y 17 reglas proyectadas para nueve materias iniciales. Las materias sin regla pueden marcarse para registrar progreso, pero no se bloquean ni se muestran como “habilitadas”.
8. Algunas materias publican regla de curso pero no regla de examen, posiblemente porque no tienen examen convencional (taller/proyecto). Hoy, si no hay regla de examen proyectada, la transición a exonerada no se bloquea. Se debe distinguir explícitamente `sin modalidad de examen`, `sin regla publicada` y `no consultada`.
9. El evaluador no registra inscripciones reales. Las opciones `course-enrollment` y `exam-enrollment` se consideran falsas. Esto funciona para muchas exclusiones, pero no alcanza para evaluar condiciones basadas en una inscripción vigente.
10. Progreso antiguo de `localStorage` no se revalida al cambiar reglas. Esto es intencional para no borrar una escolaridad real, pero un estado colocado durante la demo puede sobrevivir aunque se haya obtenido con reglas viejas.
11. Las URLs con `?cid=1` son de conversación JSF y no son enlaces permanentes. El snapshot conserva procedencia y texto, pero los enlaces estables de cara al usuario deben ser la portada de Bedelías y documentos de Colibrí.
12. El snapshot completo del Plan 97 ronda 2,1 MB y la proyección del navegador 0,9 MB. La compilación ya advierte un chunk superior a 500 KB; antes de escalar a toda Udelar hay que dividir datos por carrera/plan y cargarlos bajo demanda.

### Infraestructura

13. `npm install` reportó 20 vulnerabilidades transitivas (1 baja, 4 moderadas, 15 altas). No se ejecutó `npm audit fix` porque puede introducir cambios incompatibles. Auditar dependencias antes de producción pública.
14. No existe autenticación propia, base de datos ni sincronización. Las cuentas quedaron explícitamente para una etapa futura.
15. El sitio está público por pedido del usuario para poder probarlo y compartirlo. Antes de una publicación estable conviene revisar si se mantiene este acceso o se vuelve a una lista acotada.

## 7. Intentos, problemas encontrados y decisiones descartadas

- **Previas manuales iniciales:** se habían cargado listas simplificadas para demostrar la UI. Se detectó que eran académicamente incorrectas; Arquitectura figuraba solo con Programación 1. Las reglas oficiales ahora tienen prioridad para las 29 materias importadas. No volver a presentar previas manuales como oficiales.
- **Distribución semestral inicial manual:** no era la trayectoria compartida ni una optimización demostrada. Se corrigió para reproducir la imagen del Plan 97 y se rotuló como trayectoria sugerida.
- **Créditos por materia aprobada:** inicialmente aprobada sumaba créditos. Se cambió para que solo exonerada sume, por decisión del usuario.
- **Cliente HTTP directo para JSF:** considerado y descartado por ViewState, IDs generados y flujos dependientes de conversación.
- **Filtro PrimeFaces con `fill`:** no disparaba siempre la búsqueda. El importador usa escritura (`type`) más Enter y espera explícita.
- **Filas de previaturas:** inicialmente se asumió `data-rk`; esas tablas usan `data-ri`. Se corrigió usando filas semánticas y texto exacto.
- **Volver mediante botón:** generaba más recargas. El importador intenta historial (`goBack`) y conserva fallback al botón.
- **Checkpoints con reglas vacías:** la primera prueba guardó marcadores `none` por el bug de filas. El flujo fue corregido y luego reextraído/normalizado.
- **Parser inicial limitado:** solo entendía `Curso/Examen de la U.C.B.`. Se amplió para `aprobado`, `U.C.B aprobada`, inscripciones, equivalencias con servicio, mínimos de créditos del plan y mínimos por grupo curricular. Las 126 reglas actuales quedan sin nodos crudos.
- **PDF histórico de Proyecto de Grado:** la página de FING anuncia reglas vigentes desde 2016, pero el PDF enlazado responde 403 aun al navegar desde la página oficial. No se reutilizó el documento accesible de 2008. Se consultó directamente la regla vigente de `1730` en Bedelías y se extrajeron sus tres caminos completos.
- **Auditoría de materias-computacion.netlify.app:** se usó como lista estudiantil de descubrimiento, nunca como fuente de verdad. Los candidatos se cruzaron con la composición de Bedelías; solo se proyectaron códigos presentes oficialmente. El archivo estudiantil descargado para el cruce no forma parte del producto final.
- **Áreas planas y metas demo:** el primer prototipo asignaba una sola etiqueta manual y no representaba mínimos superiores. Se reemplazó por un árbol universal con requisitos por título, procedencia por asignación y cómputo sin duplicados.
- **Plan 2025 tratado inicialmente como “detectado”:** se comprobó que no basta con esperar una vuelta completa del plan. FING ya publicó la estructura, las dos trayectorias de Montevideo y los mínimos, mientras Bedelías todavía está parcial. Se adoptó un modelo de doble procedencia en vez de bloquear toda la integración.
- **Confundir año de publicación con año del plan:** el PDF `TrayectoriaSugerida_2025_Montevideo.pdf` fue publicado para la cursada 2025, pero sus materias y total corresponden al Plan 1997. Se usa como verificación histórica de PI=4, no como prueba del nuevo Plan de Estudios 2025.
- **Búsqueda de reglas 2025 solo por códigos:** la composición parcial no contiene códigos para muchas materias nuevas. Se añadió `--course-names` con normalización de acentos para consultar por nombre sin ampliar innecesariamente el volumen de solicitudes.
- **Ausencia de resultado tratada como error:** los checkpoints `noPublishedRule` producían falsos errores de expresión faltante. La validación ahora distingue consulta sin regla publicada de regla malformada.
- **Ubicación física del proyecto:** originalmente todo estaba directamente en `Proyectos_GPT`. A pedido del usuario se trasladó el proyecto completo, incluido `.git`, a `Proyectos_GPT\MallaCurricularUniversal`.
- **Pruebas del starter:** `tests/rendered-html.test.mjs` todavía esperaba el skeleton inicial de Sites. Se reemplazó por pruebas del producto real.
- **Scripts npm con variables Unix:** `WRANGLER_LOG_PATH=...` fallaba en Windows. Los scripts quedaron como `vinext dev/build/start` para ser multiplataforma.
- **`npm.ps1`:** bloqueado por ExecutionPolicy. Usar `npm.cmd`.

## 8. Próximos pasos recomendados

El backlog de mejoras técnicas todavía no implementadas se mantiene en [BACKLOG.md](BACKLOG.md). El primer ítem, `BL-001`, diseña la separación del catálogo ampliado en índice liviano, caché local versionada y chunks de detalles para restaurar una optativa sin descargar el bloque completo.

Las plantillas para abrir tareas aisladas de una carrera o feature nueva se mantienen en [PROMPTS.md](PROMPTS.md).

Orden sugerido:

1. Confirmar documentalmente si la Prueba Inicial 2026 otorga 4 créditos y reemplazar el estado de supuesto por uno verificado, o corregir la contabilización si la evidencia vigente lo contradice.
2. Definir la transición guiada desde el bloque `PI <20%` a una trayectoria posterior sin asumir automáticamente una rama.
3. Añadir selector de sede y semestre de ingreso antes de integrar las trayectorias oficiales de segundo semestre, CENUR Litoral Norte, Colonia y Tacuarembó publicadas en la página del Plan 2025.
4. Añadir estados explícitos para modalidad/regla de curso y examen: `published`, `not-published`, `not-applicable`, `not-scraped`.
5. Volver a extraer el Plan 2025 periódicamente y comparar snapshots para detectar cuándo Bedelías agrega composición, códigos y reglas; no sustituir datos FING automáticamente.
6. Incorporar perfiles del Plan 2025, optativas reales, créditos complementarios y Proyecto de Grado cuando la Comisión de Carrera publique su implementación.
7. Documentar con una fuente institucional la división temporal en dos etapas de Proyecto de Grado, o reemplazarla por una sola tarjeta de 30 créditos si no corresponde presentarla como dos semestres.
8. Importar programa/EVA y oferta efectiva de las 61 unidades flexibles sin confundir presencia curricular con dictado actual; resolver específicamente la ausencia de regla de curso de `1223`.
9. Ampliar el catálogo de Anexos B y resoluciones del Plan 2025 hasta reducir a cero las asignaciones sugeridas.
10. Construir el catálogo global de carreras/ciclos/CIO por servicio y filtrar planes vigentes de grado/tecnicatura/CIO.
11. Separar datos por carrera/plan y cargarlos bajo demanda antes de integrar muchas carreras; el chunk del Plan 97 ya supera 500 KB.
12. Añadir reportes de diferencias y un panel visible de procedencia por plan.
13. Evaluar cuentas/sincronización solo después de estabilizar el modelo académico.

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
