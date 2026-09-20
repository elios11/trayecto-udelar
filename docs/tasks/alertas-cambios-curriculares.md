# P06 — Alertas por cambios curriculares

## Estado

Especificación lista para implementar sobre `main`, con C04 y P02 integrados. Este nodo compara la referencia curricular guardada por cada perfil con la vigente, pero no modifica automáticamente historial, progreso, escenarios ni selección académica.

## Objetivo

Avisar de forma comprensible cuando Trayecto publica una revisión distinta de la currícula que una persona venía usando, explicar los cambios relevantes y permitir adoptar la nueva referencia sólo mediante una acción explícita y recuperable.

## Principios de producto

- La revisión guardada en el perfil sigue siendo la referencia histórica de sus datos personales hasta que la persona revise y acepte una actualización.
- Detectar una revisión nueva no reescribe historial, progreso, semestres, escenarios, metas ni identificadores personales.
- La ausencia de un snapshot anterior suficiente se presenta como información incompleta; nunca se reconstruye una currícula histórica por semejanza de nombres.
- Una equivalencia sólo existe cuando hay un alias explícito, trazable y validado por C04. Las coincidencias aproximadas de nombre o código no migran datos personales.
- Antes de adoptar una revisión se crea una instantánea local recuperable y se ofrece exportar los datos completos.
- Ignorar o cerrar un aviso sólo oculta esa comparación exacta; no equivale a adoptar la revisión y una revisión posterior vuelve a avisar.

## Contrato de snapshots y comparación

Crear un módulo puro, importable por Node y React, que reciba una referencia anterior, la currícula vigente y aliases explícitos, y produzca un informe estable sin mutar sus entradas.

La referencia histórica mínima debe permitir explicar:

- `planId`, identificador de revisión y fecha o fuente cuando estén publicadas;
- materias conocidas por ID, nombre, código, créditos, horas, área o asignaciones de crédito;
- períodos o ubicación curricular cuando sean parte del plan publicado;
- reglas de previas conocidas;
- estructura de créditos, mínimos, grupos obligatorios, actividades y credenciales.

El comparador debe clasificar al menos:

- materias agregadas y retiradas;
- alias o reemplazos oficiales;
- cambios de nombre o código sin cambio de identidad;
- cambios de créditos, horas, área o asignación a mínimos;
- cambios de previas y otras reglas;
- cambios de mínimos, grupos, actividades, credenciales y metadatos del plan;
- referencias personales que quedan retiradas, huérfanas o requieren revisión.

Cada diferencia tendrá severidad y efecto explícitos:

- `informativo`: no altera la interpretación de datos personales;
- `revisar`: puede cambiar totales, habilitaciones o hitos y requiere lectura humana;
- `bloquea adopción automática`: falta identidad, alias o evidencia suficiente para trasladar una referencia personal.

El informe debe ser determinista, ordenado y serializable. Dos snapshots equivalentes producen cero diferencias aunque cambien metadatos técnicos irrelevantes. Una versión futura o un snapshot dañado entra en modo protegido y conserva el original.

## Adopción explícita

- Adoptar actualiza únicamente la referencia curricular del perfil y los metadatos necesarios para explicar esa decisión.
- Antes de confirmar, mostrar resumen por severidad, materias personales afectadas y consecuencias calculables sobre créditos, áreas, previas e hitos.
- Los eventos históricos conservan sus `courseId`. Un alias oficial puede resolver su lectura contra la currícula nueva, pero no debe reemplazar silenciosamente el ID histórico.
- Materias retiradas o huérfanas permanecen exportables y visibles como pendientes de revisión; no acreditan una materia distinta.
- Si existe cualquier diferencia bloqueante, la revisión puede consultarse pero no adoptarse desde la UI normal.
- La confirmación crea primero una instantánea mediante F04 y persiste después por el flujo canónico v4. Un fallo conserva la referencia anterior y muestra el error de guardado de F05.
- Deshacer una adopción se realiza restaurando la instantánea completa, no mediante una reversión parcial inventada por P06.

## Interfaz

- Mostrar una alerta no invasiva cuando el perfil activo usa una revisión distinta de la currícula vigente.
- El aviso indica en lenguaje claro si hay cambios sólo informativos, cambios que requieren revisión o un bloqueo.
- Un detalle accesible agrupa diferencias por materias, requisitos y estructura del plan; por defecto muestra primero lo que afecta datos personales.
- Incluir acciones `Revisar cambios`, `Exportar mis datos`, `Seguir usando esta revisión` y, sólo cuando sea seguro, `Adoptar revisión nueva`.
- Aclarar que Trayecto compara publicaciones y datos guardados en el dispositivo; no certifica una escolaridad ni decide equivalencias académicas.
- Las materias huérfanas deben poder consultarse aunque ya no tengan tarjeta en la malla activa.
- Conservar teclado, tacto, foco, lectores de pantalla, temas, modo daltónico y `prefers-reduced-motion`.

## Persistencia y compatibilidad

- Mantener `formatVersion: 4` si la decisión de adopción y el snapshot mínimo pueden representarse en `curriculumReference` o una extensión namespaced opcional. Elevar formato sólo si aparece semántica obligatoria que un cliente v4 no pueda preservar.
- No guardar el informe derivado completo si puede recalcularse; guardar únicamente referencias, evidencia mínima, decisión y par de revisiones descartado cuando corresponda.
- La preferencia de aviso descartado es local y se identifica por perfil, revisión anterior y revisión nueva. No forma parte de exportaciones ni sincronización futura.
- Exportaciones, importaciones, instantáneas y conflictos conservan la referencia histórica y cualquier extensión sin pérdida.
- Un cliente que no comprende la semántica obligatoria entra en modo protegido conforme a C04.

## Casos límite

- La revisión coincide: no hay alerta ni escritura.
- Cambia el hash o identificador, pero los snapshots son académicamente equivalentes: aviso informativo resumido, sin afirmar cambios inexistentes.
- Materia renombrada con alias oficial, materia retirada sin alias y materia nueva con nombre parecido a otra: sólo la primera se resuelve como equivalencia.
- Cambio de créditos o área de una materia aprobada: requiere revisión y conserva el valor histórico hasta adoptar.
- Cambio de previa o mínimo que altera un hito de P05: mostrar la consecuencia sin cambiar historial ni planificación.
- Perfil sin revisión o sin snapshot reproducible: modo prudente, exportación disponible y adopción bloqueada si no puede explicarse el traslado.
- Dos perfiles del mismo plan con referencias distintas: alertas y decisiones independientes; compartir `progressPlanId` no autoriza a actualizar ambos.
- Conflicto local o guardado fallido: no adoptar hasta resolverlo y no perder ninguna rama.

## Pruebas obligatorias

- Comparación idéntica y determinista; inmutabilidad de entradas.
- Altas, bajas, alias oficial, renombre, cambios de carga, áreas, asignaciones, previas, mínimos, grupos, actividades y credenciales.
- Una semejanza de nombre o código nunca crea equivalencia.
- Historial aprobado, curso aprobado y planificación vinculados a una materia retirada o huérfana permanecen completos.
- Consecuencias sobre créditos, áreas, habilitaciones e hitos usan las reglas existentes y no duplican cálculos.
- Adopción segura crea instantánea antes de persistir; un fallo o una diferencia bloqueante conserva la revisión anterior.
- Descartar un aviso sólo afecta el par exacto de revisiones y no modifica el documento personal.
- Round trip v4, exportación, importación, recuperación y conflictos conservan referencias y extensiones.
- UI accesible: alerta, detalle, severidad no dependiente del color, confirmación, foco y textos prudentes.
- Regresión: historial P02, escenarios P03, línea temporal P05, carga P01, selección, recuperación y concurrencia permanecen intactos.

## Límites

- No obtener fuentes por red ni ejecutar scraping dentro de la aplicación.
- No inventar aliases, equivalencias, créditos, áreas, previas o fechas.
- No migrar automáticamente a otra carrera o plan.
- No modificar currículas oficiales desde datos personales.
- No agregar cuentas, sincronización remota, base de datos, notificaciones push, correo, telemetría ni dependencias de producción.

## Verificación y cierre

- Ejecutar pruebas focales durante el desarrollo.
- Antes del commit ejecutar `npm test`, `npm run lint`, `npm run security:repo` y `git diff --check`.
- Hacer QA funcional del aviso, detalle, descarte y adopción segura con una revisión compatible y otra bloqueante. Declarar recorridos no comprobados.
- Actualizar `PROJECT_CONTEXT.md` únicamente con las convenciones transversales confirmadas.
- Registrar aquí resultado, verificaciones, riesgos y reanudación.
- Crear un único commit enfocado en el worktree de P06. No integrar, hacer push ni publicar desde la implementación aislada.

P06 queda cerrado cuando una persona puede entender y decidir sobre una revisión curricular nueva sin que Trayecto reescriba sus datos personales, infiera equivalencias ni pierda la referencia histórica.
