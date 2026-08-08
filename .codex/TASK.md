# Estado del proyecto: Trayecto Udelar

Última actualización: 2026-08-08  
Workspace: `C:\Users\elios\Documents\Proyectos_GPT`  
Rama activa: `main`  
Último commit funcional al redactar este documento: `a63f653` (`Import official Bedelias prerequisite rules`)  
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

El piloto actual es Ingeniería en Computación, Plan 1997. Aunque ese plan ya figura como no vigente en Bedelías, debe mantenerse porque todavía puede haber estudiantes cursándolo. Para expansión nueva se deben priorizar los planes vigentes, especialmente el Plan 2025 de Ingeniería en Computación.

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
- Clave actual: `trayecto-udelar-demo-v1`.
- Solo se guarda el mapa de estados por código de materia.
- No son cookies, no se envía al servidor y no se sincroniza entre navegadores/dispositivos.
- Hay importación/exportación manual a JSON.
- El botón de reinicio borra el estado de la aplicación después de confirmación.

### Datos académicos

Hay tres niveles de datos:

1. Snapshot completo de Bedelías:
   - `data/bedelias/fing-ingenieria-computacion-1997.json`
   - Contiene composición, cursos/equivalencias, reglas de curso/examen, procedencia, texto original, validaciones y hash.
2. Catálogo institucional inicial:
   - `data/bedelias/catalog.json`
   - Contiene 25 servicios encontrados en la consulta pública.
3. Proyección compacta consumida por la interfaz:
   - `app/data/computacion-1997-bedelias.json`
   - Contiene solo las 29 materias centrales mostradas y sus 53 reglas relevantes.

El snapshot completo es deliberadamente más grande que la proyección. La aplicación no debe importar el snapshot completo al navegador.

### Herramientas de importación

- Importador principal: `scripts/scrape-bedelias.mjs`.
- Generador de proyección: `scripts/build-app-data.mjs`.
- Documentación operativa: `docs/bedelias-importer.md`.
- Automatización con `playwright-core` y Chrome/Edge instalado localmente.

Comandos relevantes:

```powershell
npm.cmd run bedelias:catalog
npm.cmd run bedelias:plan -- --service FING --career "INGENIERÍA EN COMPUTACIÓN" --year 1997 --courses 1466,1321
node scripts\scrape-bedelias.mjs normalize --input data\bedelias\fing-ingenieria-computacion-1997.json
npm.cmd run bedelias:project
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

## 4. Funcionalidad implementada

### UI y progreso

- Selector de carrera, plan y trayectoria (solo una opción funcional por ahora).
- Malla horizontal de pre-semestre a décimo semestre.
- Buscador por código, nombre o área.
- Filtro de materias habilitadas.
- Estados visuales pendiente/aprobada/exonerada.
- Persistencia local.
- Exportar/importar progreso.
- Reinicio del progreso.
- Panel de créditos totales.
- Panel de título intermedio y título de grado.
- Panel de créditos por área, todavía rotulado como metas demo.
- Sección plegable de optativas/electivas.
- Drawer de detalles de materia.
- Identificación visual de materias con datos importados de Bedelías.
- Visualización de la condición relevante para el siguiente cambio de estado: curso si está pendiente, examen si está aprobada.

### Prueba Inicial y Matemática Inicial

- Existe una materia especial `PI` en pre-semestre.
- Se comporta como check, no como el ciclo de tres estados.
- Al acreditarla suma 4 créditos.
- Sustituye y oculta Matemática Inicial (`MI2`).
- PI y MI2 no pueden acumularse; marcar una limpia la otra.
- El evaluador trata PI acreditada como sustitución de MI2 para reglas posteriores.

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
- Guarda checkpoint ignorado por Git (`data/bedelias/*.checkpoint`).

### Datos obtenidos

- 25 servicios institucionales descubiertos.
- Plan 1997 de Ingeniería en Computación.
- Plan tipo créditos, 60 meses, 450 créditos mínimos.
- Plan 97 marcado como no vigente.
- Plan 2025 detectado como vigente en Bedelías, todavía no importado.
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
- presencia de procedencia Bedelías;
- estados pendiente/aprobada/exonerada y Prueba Inicial.

Estado al redactar: `npm.cmd test` compila correctamente y pasan 7/7 pruebas.

## 6. Bugs, inconsistencias y límites conocidos

### Prioridad alta

1. **Selector de Prueba Inicial inconsistente.** La UI dice `Ingreso 1er semestre · PI 20–59%`, pero permite acreditar PI por 4 créditos y omitir Matemática Inicial. Según la orientación pública de FING, la trayectoria 20–59% incluye Matemática Inicial; la acreditación de 4 créditos y omisión corresponde al tramo de 60% o más. Hay que modelar ambas trayectorias o corregir el selector antes de afirmar que esta rama es oficial.
2. **Metas por área no verificadas.** `areaTargets` y el progreso de Analista 270 están curados como demo. Bedelías sí contiene grupos y mínimos, pero todavía no se proyectan al panel lateral ni se ha validado la estructura exacta de cada título.
3. **Proyecto de Grado dividido manualmente.** `1730-A` y `1730-B` son una representación visual de dos semestres. No son códigos oficiales importados. Debe confirmarse cómo Bedelías representa el Proyecto de Grado y sus créditos/reglas.
4. **Oferta y semestres no importados.** Los campos `offered` y la distribución semestral siguen siendo manuales. No usar esos datos para garantizar cuándo se dicta una materia.

### Datos y evaluador

5. Solo se integró Plan 97 de Ingeniería en Computación. El objetivo global de grados, tecnicaturas y CIO vigentes todavía no está cubierto.
6. Solo 29 materias centrales están proyectadas; las optativas/electivas visibles aún usan previas manuales y no tienen etiqueta Bedelías.
7. Algunas materias publican regla de curso pero no regla de examen, posiblemente porque no tienen examen convencional (taller/proyecto). Hoy, si no hay regla de examen proyectada, la transición a exonerada no se bloquea. Se debe distinguir explícitamente `sin modalidad de examen`, `sin regla publicada` y `no consultada`.
8. El evaluador no registra inscripciones reales. Las opciones `course-enrollment` y `exam-enrollment` se consideran falsas. Esto funciona para muchas exclusiones, pero no alcanza para evaluar condiciones basadas en una inscripción vigente.
9. Progreso antiguo de `localStorage` no se revalida al cambiar reglas. Esto es intencional para no borrar una escolaridad real, pero un estado colocado durante la demo puede sobrevivir aunque se haya obtenido con reglas viejas.
10. Las URLs con `?cid=1` son de conversación JSF y no son enlaces permanentes. El snapshot conserva procedencia y texto, pero los enlaces estables de cara al usuario deben ser la portada de Bedelías y documentos de Colibrí.
11. El snapshot completo ronda 1,5 MB y la proyección del navegador ronda 430 KB. El chunk cliente minificado quedó cerca de 258 KB. Es aceptable para el piloto, pero no escalará a toda Udelar sin dividir datos por carrera/plan o servirlos bajo demanda.

### Infraestructura

12. `npm install` reportó 20 vulnerabilidades transitivas (1 baja, 4 moderadas, 15 altas). No se ejecutó `npm audit fix` porque puede introducir cambios incompatibles. Auditar dependencias antes de producción pública.
13. No existe autenticación propia, base de datos ni sincronización. Las cuentas quedaron explícitamente para una etapa futura.
14. El sitio está privado/owner-only. Copiar el enlace no da acceso a otros usuarios mientras no se cambie el control de acceso.

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
- **Pruebas del starter:** `tests/rendered-html.test.mjs` todavía esperaba el skeleton inicial de Sites. Se reemplazó por pruebas del producto real.
- **Scripts npm con variables Unix:** `WRANGLER_LOG_PATH=...` fallaba en Windows. Los scripts quedaron como `vinext dev/build/start` para ser multiplataforma.
- **`npm.ps1`:** bloqueado por ExecutionPolicy. Usar `npm.cmd`.

## 8. Próximos pasos recomendados

Orden sugerido:

1. Corregir la experiencia de Prueba Inicial modelando al menos las ramas `<20%`, `20–59%` y `>=60%`, con texto y efectos consistentes.
2. Importar Ingeniería en Computación Plan 2025 completo y convertirlo en la opción vigente predeterminada, manteniendo Plan 97 como plan histórico disponible.
3. Añadir al snapshot estados explícitos para modalidad/regla de curso y examen: `published`, `not-published`, `not-applicable`, `not-scraped`.
4. Proyectar grupos, mínimos de créditos y títulos desde la composición de Bedelías; reemplazar `areaTargets` y Analista 270 solo después de validación documental.
5. Confirmar Proyecto de Grado y eliminar o documentar formalmente la división manual `1730-A/B`.
6. Extraer y validar optativas/electivas reales del plan, con créditos aportados por grupo y equivalencias.
7. Construir el catálogo global de carreras/ciclos/CIO por servicio y filtrar planes vigentes de grado/tecnicatura/CIO.
8. Investigar fuentes institucionales para trayectoria recomendada y oferta por semestre; Bedelías no necesariamente contiene una secuencia sugerida estable.
9. Separar datos por carrera/plan y cargarlos bajo demanda antes de integrar muchas carreras.
10. Añadir reportes de diferencias entre snapshots para revisar cambios de Bedelías antes de publicar; nunca desplegar cambios académicos automáticamente sin revisión.
11. Añadir un panel visible de procedencia por plan: fecha del snapshot, vigencia, documento Colibrí, cobertura de reglas y advertencias pendientes.
12. Evaluar cuentas/sincronización solo después de estabilizar el modelo académico. Hasta entonces mantener `localStorage` y exportación/importación.

## 9. Flujo seguro para continuar

1. Leer este archivo y `docs/bedelias-importer.md`.
2. Ejecutar `git status --short`; preservar cambios del usuario.
3. Ejecutar primero una extracción acotada con `--courses` al modificar el scraper.
4. Revisar el checkpoint y snapshot; normalizar sin red cuando sea posible.
5. Ejecutar `npm.cmd run bedelias:project` para regenerar la proyección.
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
