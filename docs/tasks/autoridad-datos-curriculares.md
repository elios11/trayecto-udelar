# D01–D03 — Autoridad y saneamiento urgente de datos curriculares

## Estado y prioridad

Prioridad **urgente y bloqueante** aprobada el 21 de septiembre de 2026. No implementada.

Este frente debe completarse antes de ampliar el catálogo, iniciar cuentas o sincronizar datos curriculares. El problema no se resuelve con una deduplicación más agresiva: la composición administrativa de SGAE/Bedelías contiene unidades vigentes, versiones históricas, equivalencias, reválidas y otras entradas que no constituyen por sí solas una oferta curricular actual.

La medición inicial sobre las 169 proyecciones generadas encontró 33.849 entradas: 30.797 dependen de la composición de Bedelías, 3.002 tienen estado `official-curriculum` y 50 son bloques de validación manual. Hay 68 planes sin una lista oficial explícita de materias en la proyección actual. Estas cifras son una línea de base y deben recalcularse de forma determinista durante D01.

## Objetivo

Mantener la cobertura de Bedelías como evidencia y mecanismo de conciliación sin presentarla como fuente suficiente de verdad para el catálogo cursable. La interfaz normal debe priorizar certeza; las materias plausibles pero no verificadas deben conservarse de forma recuperable y accesible sin contaminar la malla principal.

## Jerarquía de autoridad

De mayor a menor autoridad para definir una materia canónica y su estado:

1. Plan de estudios y reglamento aprobados por los órganos competentes.
2. Malla, grilla, damero o implementación curricular oficial vigente del servicio.
3. Programa o ficha oficial aprobada de la unidad curricular.
4. Resolución del Consejo, Comisión de Carrera u órgano competente sobre oferta, créditos, equivalencias o modificaciones.
5. SGAE/Bedelías para validar y enriquecer una identidad ya respaldada: código, créditos, previaturas, equivalencias y registros operativos.
6. EVA únicamente como enlace o evidencia auxiliar de un dictado; nunca crea una materia canónica, acredita vigencia ni determina créditos.

Una fuente de nivel inferior no puede contradecir silenciosamente una de nivel superior. Los conflictos permanecen trazados y bloquean la promoción automática del dato afectado.

## Estados por materia

- `verified`: una fuente curricular oficial vigente respalda la identidad o su inclusión en el plan.
- `candidate`: aparece en Bedelías u otra fuente institucional, pero todavía no existe evidencia suficiente para presentarla como parte vigente del catálogo.
- `historical-equivalent`: versión, equivalencia o identidad anterior útil para reconocer progreso, sin ser cursable por defecto.
- `administrative`: reválida genérica, créditos reconocidos, asiento técnico u otra entrada no cursable.
- `rejected`: falso positivo revisado, conservado sólo en auditoría.

El estado pertenece a la materia dentro de un plan y revisión concretos. La vigencia del plan no se hereda automáticamente a todas las entradas de su composición.

## Identidad y conciliación

- No fusionar ni publicar materias mediante semejanza de nombres.
- Usar coincidencia exacta de servicio, plan y código canónico cuando la fuente oficial publique código.
- Aceptar aliases solamente cuando exista una equivalencia oficial trazable o un grupo oficial que declare alternativas de la misma unidad.
- Usar comparaciones aproximadas únicamente para producir una cola de revisión.
- Conservar los identificadores anteriores necesarios para importar progreso sin atribuirlo automáticamente a otra materia.
- Separar `planAuditStatus` de `courseCatalogAuditStatus`; auditar existencia, sede, créditos totales o estructura no certifica el catálogo completo.

## D01 — Contención y contrato de procedencia

**Modelo:** `gpt-5.6-sol`  
**Esfuerzo:** `xhigh`  
**Dependencias:** ninguna; bloquea D02, D03 y la Ola 3 del roadmap.

### Alcance

- Introducir estados por materia y procedencia por campo sin borrar snapshots ni candidatos.
- Recalcular un informe reproducible de cobertura y riesgo por plan.
- Dejar de incorporar al catálogo principal entradas sustentadas únicamente por una composición de Bedelías.
- Mantener estructura, créditos mínimos y títulos oficialmente confirmados aunque el catálogo quede parcial.
- Cambiar las etiquetas de auditoría para no llamar completo a un catálogo que sólo tiene verificada la estructura del plan.
- Preservar importaciones, historial y progreso mediante aliases explícitos y materias huérfanas recuperables.
- Impedir que nuevos generadores publiquen candidatos automáticamente.

### Contención visible

- La malla y los resultados normales muestran únicamente materias `verified`.
- Un plan sin catálogo suficiente permanece seleccionable y explica que sus materias están en validación.
- No se afirma que una carrera está completa sólo porque Bedelías expone una composición extensa.
- No se eliminan datos extraídos; cambian su clasificación y elegibilidad de publicación.

### Cierre

- Informe antes/después por plan y por estado.
- Cero materias `candidate`, `historical-equivalent` o `administrative` en el catálogo normal.
- Pruebas de compatibilidad con progreso e importaciones anteriores.
- `npm test`, `npm run lint` y validación visual de al menos un plan limpio, uno mixto y uno sin catálogo oficial.

## D02 — Materias sin verificar

**Modelo:** `gpt-5.6-terra` para la superficie, con revisión final de `gpt-5.6-sol` por su impacto académico.  
**Esfuerzo:** `high`  
**Dependencias:** D01.

### Experiencia

- Añadir una sección **Materias sin verificar**, cerrada por defecto y separada de la malla oficial.
- No renderizar el conjunto completo: exigir búsqueda por nombre o código y cargar resultados bajo demanda.
- Mostrar únicamente `candidate`; nunca entradas administrativas ni equivalencias históricas aisladas.
- Explicar de forma breve que la entrada aparece en Bedelías, pero no pudo confirmarse en una fuente curricular vigente.
- Agrupar variantes sólo cuando D01 haya producido un alias o grupo oficial trazable; no usar similitud visual como fusión.
- Permitir agregar una candidata al plan mediante una confirmación comprensible.
- Distinguir su aporte como provisional en carga, planificación y totales. Los créditos provisionales no pueden completar silenciosamente un título o requisito oficial.
- Mostrar el total oficial separado del aporte provisional cuando exista al menos una candidata utilizada.
- Promover una candidata a `verified` sin perder su estado personal cuando una fuente oficial posterior confirme su identidad.
- Conservar accesibilidad, teclado, tacto, carga diferida y buen rendimiento con miles de candidatos.

### Cierre

- La experiencia predeterminada permanece limpia aun en planes con miles de candidatos.
- Buscar una candidata conocida, añadirla y retirarla está cubierto en escritorio y móvil.
- Los avisos y cálculos diferencian con claridad créditos oficiales y provisionales.
- Ningún candidato puede hacer aparecer un requisito o título como oficialmente cumplido.

## D03 — Reconciliación con fuentes oficiales

**Modelo:** `gpt-5.6-sol`  
**Esfuerzo:** `xhigh`  
**Dependencias:** D01; puede comenzar después de D02 y avanza de forma incremental por servicio.

### Estrategia

- Crear adaptadores reproducibles por servicio para grillas, dameros, programas, resoluciones y ofertas oficiales.
- Priorizar carreras con mayor cantidad de candidatos y uso esperado.
- Promover candidatos por código e identidad oficial exactos; enviar ambigüedades a revisión.
- Registrar fuente, fecha de vigencia, alcance territorial y revisión curricular de cada promoción.
- Separar catálogo canónico de oferta por período: que una materia pertenezca al plan no implica que se dicte este semestre.
- Mantener Bedelías como contraste de códigos, créditos y previaturas, no como creador automático de materias.
- Mantener EVA fuera de la decisión curricular; sólo puede adjuntar el enlace del aula a una unidad ya verificada.
- Publicar reportes de cobertura por plan y no declarar completitud sin criterios explícitos.

### Cierre por servicio

- Fuente oficial actual identificada y archivada con hash o fecha.
- Catálogo reconciliado con conteos de verificadas, candidatas, históricas, administrativas, rechazadas y conflictos.
- Muestra manual documentada y pruebas deterministas del adaptador.
- Las promociones conservan progreso y no crean equivalencias aproximadas.

## Fuera de alcance

- Borrar snapshots o checkpoints de Bedelías.
- Inferir vigencia desde EVA, nombres de docentes o actividad reciente del aula.
- Fusionar materias sólo por nombre, distancia de texto, créditos o semestre.
- Usar una base de datos o cuentas para resolver calidad curricular.
- Presentar datos provisionales como información institucional confirmada.

## Orden urgente

1. D01 — contención y contrato.
2. D02 — recuperación controlada mediante Materias sin verificar.
3. D03 — reconciliación oficial por servicio, comenzando por los planes con mayor contaminación.

No se amplía el catálogo global ni se inicia la Ola 3 de cuentas hasta cerrar D01 y D02. D03 continúa incrementalmente sin bloquear mejoras locales que no dependan de datos curriculares dudosos.

## Estado recuperable

- D01 implementado en el generador de proyecciones: contrato de autoridad, procedencia por campo, separación de auditorías y reporte determinista antes/después.
- Los candidatos continúan en `projection.courses` para compatibilidad de importaciones, pero las rutas publicadas y la UI normal sólo aceptan `verified`.
- Las reglas completas permanecen en `projection.rules` para auditoría; `projection.publishedRules` excluye cualquier regla cuyo objetivo o dependencias no estén publicados, para que una candidata oculta nunca bloquee una materia visible.
- Los aliases oficiales, asientos administrativos y exclusiones curadas quedan en `courseAuthority.records`; los snapshots originales no se modifican.
- D02 sigue pendiente y será la única superficie donde se podrán consultar candidatos bajo demanda.
