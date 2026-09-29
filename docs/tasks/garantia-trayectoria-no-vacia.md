# D03k — Garantía global de trayectorias no vacías

## Estado

Implementación funcional completa y validada en el worktree `d03k-trayectorias-no-vacias`; lista para el commit enfocado y la posterior integración serial.

## Problema

Algunos planes seleccionables contienen datos y materias, pero Currícula muestra sólo marcadores administrativos, una estructura sin materias reales o nada útil. Ingeniería Química Plan 2021 es el caso visible prioritario. Esto contradice el propósito principal del producto y no puede considerarse una degradación aceptable mientras se completa la reconciliación oficial.

## Objetivo

Garantizar que cada plan seleccionable tenga una trayectoria utilizable y un catálogo completo en el planificador:

1. usar siempre la trayectoria sugerida oficial vigente cuando exista y esté reconciliada;
2. mientras esté pendiente, o si su ausencia está documentada, generar un `Recorrido orientativo generado` desde la composición disponible de Bedelías;
3. identificarlo visualmente como provisional y no oficial, explicar su procedencia y reemplazarlo al cerrar la auditoría oficial;
4. incluir todas las materias disponibles y optativas/electivas del plan sin duplicados en el planificador, diferenciando las verificadas de las provisionales;
5. preservar progreso e identidades al sustituir luego el recorrido provisional por el oficial.

## Reglas de seguridad académica

- La composición de Bedelías puede sostener el fallback de planificación, pero no se atribuye como trayectoria sugerida por la institución.
- Los marcadores de orientación, validación de egreso y otros asientos administrativos no cuentan como materias reales ni satisfacen la garantía.
- No inventar previas, equivalencias, obligatoriedad ni oferta temporal.
- La secuencia provisional debe ser determinista y explicable. Usar períodos publicados por Bedelías cuando existan; si sólo hay agrupaciones, distribuirlas conservando ese orden y rotular el resultado como orientativo, sin afirmar semestres oficiales.
- Las materias candidatas o de procedencia parcial pueden mostrarse únicamente dentro del recorrido provisional con señalización clara; no completan requisitos oficiales ni cambian su `authorityStatus`.
- La reconciliación oficial siempre reemplaza al fallback y conserva identidades canónicas compatibles.

## Alcance de implementación

- Detectar todos los planes seleccionables cuya trayectoria publicada no tenga al menos un período con una materia curricular real.
- Corregir el generador o adaptador común, no sólo Ingeniería Química.
- Asegurar que el planificador use la unión completa de materias de trayectoria y catálogo, incluidas optativas, sin ocultarlas por el recorrido activo.
- Añadir una indicación visible y accesible de recorrido provisional.
- No cargar todos los catálogos globales de forma anticipada; mantener la carga por plan.

## Criterios de aceptación

- Una prueba global recorre todos los planes seleccionables y falla si alguno no ofrece materias reales en Currícula.
- Ingeniería Química Plan 2021 deja de verse vacía y presenta un recorrido provisional útil hasta su reconciliación oficial.
- El planificador de cada plan incluye todas las materias disponibles de sus trayectorias y catálogos, incluidas optativas/electivas, sin IDs duplicados.
- La UI distingue inequívocamente `Trayectoria oficial` de `Recorrido orientativo generado`.
- Las materias provisionales no completan requisitos oficiales ni se convierten silenciosamente en verificadas.
- `npm test`, `npm run lint` y `git diff --check` pasan.

## Entrega

Implementar en un worktree aislado, documentar el conjunto de planes corregidos y los límites, ejecutar verificaciones, crear un commit enfocado y devolver el hash. No integrar, hacer push ni publicar desde el subagente.

## Estado recuperable de la implementación

### Estrategia aplicada

- `buildRegisteredPlanPresentation` es el adaptador común que entrega a Currícula sus períodos y al planificador la unión completa de materias.
- Una trayectoria con al menos una materia curricular real y verificada conserva sus períodos publicados y la unión verificada incorporada en D03i.
- Una trayectoria vacía o compuesta sólo por marcadores administrativos recibe un `Recorrido orientativo generado` determinista. El núcleo visible prioriza materias verificadas en el orden disponible de Bedelías; si no existe ninguna, usa las primeras materias reales disponibles. Respeta agrupaciones reales cuando existen y limita cada tramo a seis materias para evitar una grilla ilegible.
- Las materias reales que no integran ese núcleo quedan con `semester: "opt"`: aparecen en Currícula bajo `Catálogo flexible de Bedelías` y en el catálogo completo del planificador. Currícula muestra inicialmente hasta 20 opciones y permite desplegar el total o buscar sobre él.
- Las candidatas conservan su `authorityStatus`, se señalizan como provisionales y, sólo en la vista adaptada, reciben listas vacías de asignaciones y requisitos elegibles. Sus estados personales se conservan, pero una copia `officialStatuses` las fuerza a pendientes al evaluar previas, créditos, áreas, actividades y requisitos oficiales.
- No se crean reglas de previas, equivalencias ni oferta temporal. El fallback sólo ordena identidades y cargas ya presentes en la proyección del plan.

### Cobertura diagnosticada

La prueba global cubre los 147 planes seleccionables actuales: 142 proyecciones registradas y los 5 planes especializados (`1997`, `2025`, `electrica-2023`, `civil-2021` y `qf-2015`). Detectó 76 recorridos que necesitaban fallback, distribuidos en 40 planes:

- CENUR Litoral Norte: Ciclo en Biología/Bioquímica 2016, Ciclo Inicial de Matemática 2012, Licenciatura en Ciencias Sociales 2009 y Tecnicatura en Tecnologías de la Imagen Fotográfica 2008.
- CURE/CUT: Licenciatura en Diseño de Paisaje 2008 y Licenciatura en Economía Agrícola y Gestión de Agronegocios 2022.
- Facultad de Agronomía: Ingeniero Agrónomo 2020.
- Facultad de Artes: Licenciaturas en Composición 1987, Danza Contemporánea 2018, Dirección Coral 1987, Dirección Orquestal 1987, Interpretación Musical 2005, Música 2005 y Musicología 1987.
- Facultad de Ciencias: Licenciaturas en Biología Humana 2004, Bioquímica 2017, Ciencias Biológicas 2017, Ciencias de la Atmósfera 2007, Física 2019, Física Médica 2025, Geografía 2018, Geología 2018 y Matemática 2014.
- FCEA: Licenciatura en Estadística 2014.
- Facultad de Derecho: Abogacía 2016, Notariado 2016 y Tecnicatura en Relaciones Laborales 1995.
- Facultad de Enfermería: Licenciatura en Enfermería 2016.
- FING: Ingeniería en Agrimensura 2023, Ingeniería Química 2021 y Tecnólogo Industrial Mecánico 2016.
- Facultad de Medicina: Doctor en Medicina 2008.
- Facultad de Psicología: Licenciatura en Psicología 2013.
- Facultad de Química: Bioquímico Clínico 2015, Ingeniería de Alimentos 2003, Licenciatura en Biotecnología 2024, Licenciatura en Química 2016 y Químico 2015.
- ISEF: Licenciatura en Educación Física 2017 y Tecnicatura en Deportes 2007.

Ingeniería Química Plan 2021 queda con 10 tramos orientativos y 22 materias verificadas en el núcleo de Montevideo. El planificador conserva 375 materias reales sin duplicados; 353 candidatas quedan provisionales y en el catálogo flexible. El inicio de Salto conserva sus 18 unidades regionales reales como núcleo y la misma unión completa en el planificador.

### Límites explícitos

- Los tramos generados no son semestres institucionales ni una recomendación académica de orden de cursado.
- El límite de seis materias por tramo es sólo una decisión de presentación legible; las opciones restantes no se descartan.
- Una entrada real de Bedelías puede seguir necesitando reconciliación curricular. Mostrarla como provisional no valida su vigencia, sus asignaciones ni sus previas.
- Al publicarse una trayectoria oficial reconciliada, el adaptador deja de generar el fallback y vuelve a los períodos oficiales sin cambiar las identidades canónicas.

### Verificaciones finales

Aprobadas:

- `node tests/selectable-plan-trajectories.test.mjs`
- `node tests/registered-plan-courses.test.mjs`
- `node tests/extracted-academic-ui.test.mjs`
- `node tests/ingenieria-quimica-2021-official-audit.test.mjs`
- `node tests/fadu-ui-integration.test.mjs`

- `npm test`: compilación de producción y 919/919 pruebas aprobadas.
- `npm run lint`: aprobado sin errores.
- `git diff --check`: aprobado sin errores.

La validación visual manual no pudo ejecutarse porque la sesión no expuso ninguna superficie de navegador o aplicación controlable. La cobertura de UI y procedencia quedó verificada mediante las pruebas estáticas y funcionales indicadas arriba; no se declara una inspección visual que no ocurrió.
