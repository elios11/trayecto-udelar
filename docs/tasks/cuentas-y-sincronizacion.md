# Cuentas y sincronización segura

## Estado

Propuesta de arquitectura y producto. No implementada.

## Objetivo

Permitir que una persona recupere y sincronice su progreso y planificación entre dispositivos sin volver obligatoria una cuenta, sin perder datos locales y sin convertir Trayecto en custodio de información académica innecesaria.

## Estado actual verificado

- El sitio es público y funciona sin autenticación.
- Progreso, planificación, semestre actual, selección académica y preferencias viven en `localStorage` mediante formatos versionados separados.
- Existe exportación completa y exportación exclusiva del planificador, con importación validada.
- `.openai/hosting.json` no declara D1 ni R2.
- No existe persistencia remota ni una identidad de usuario en la aplicación.

## Decisiones recomendadas

### Cuenta opcional

- Mantener toda la exploración y planificación local disponible sin iniciar sesión.
- Presentar la cuenta como `Guardar y sincronizar`, no como requisito para comenzar.
- No forzar una cuenta al abrir el sitio ni degradar el uso anónimo.
- Permitir cerrar sesión sin borrar silenciosamente la copia local.

### Autenticación inicial

- Para una primera beta alojada en Sites, usar inicio de sesión con ChatGPT gestionado por la plataforma, sin contraseñas propias.
- No asumir que ChatGPT es la identidad definitiva para toda la comunidad Udelar. Antes de un lanzamiento general, evaluar una vía pública adecuada —por ejemplo identidad federada o institucional— según las capacidades vigentes del hosting.
- No construir autenticación propia ni almacenar contraseñas.
- Ejecutar toda autorización de lectura y escritura en el servidor usando el identificador estable entregado por la plataforma; nunca confiar en un ID enviado por el navegador.

### Datos sincronizados

Sincronizar inicialmente:

- perfiles académicos —carrera, plan, sede y trayectoria—;
- estados acreditables de materias;
- semestres, materias distribuidas y semestre actual;
- escenarios personales cuando existan;
- notas personales si se implementan y la persona acepta sincronizarlas.

Mantener locales por defecto:

- tema, contraste y preferencias puramente visuales;
- búsquedas recientes y estado abierto o cerrado de paneles;
- borradores no confirmados.

### Minimización de datos

- Usar como clave de propietario el ID opaco y específico del sitio proporcionado por el sistema de autenticación.
- No guardar cédula, número de estudiante, escolaridad oficial, calificaciones, teléfono ni fecha de nacimiento.
- Usar el correo sólo para mostrar la sesión cuando sea necesario; evitar duplicarlo en la base si el proveedor ya lo entrega.
- No incorporar telemetría de comportamiento dentro de esta funcionalidad.
- No registrar en logs el contenido del plan personal ni las notas.

## Persistencia propuesta

Usar D1 para los datos estructurados. R2 no es necesario mientras no se almacenen archivos subidos.

### Entidades mínimas

- `account_profiles`: propietario, versión de esquema, fechas de creación y actividad.
- `academic_profiles`: carrera, plan, sede, trayectoria, versión de datos curriculares y revisión de sincronización.
- `course_progress`: perfil académico, ID estable de materia, estado acreditable y fecha de actualización.
- `planner_scenarios`: perfil académico, nombre, condición principal o archivada y revisión.
- `planner_terms`: escenario, ID estable, etiqueta, orden, estado y fechas opcionales.
- `planner_term_courses`: semestre, materia, orden y metadatos personales mínimos.
- `personal_notes`: sólo si la funcionalidad se aprueba; separadas de los datos oficiales.

Cada consulta debe filtrar por el propietario autenticado. Las claves únicas deben impedir duplicados por perfil, escenario y materia. Los índices se agregan únicamente para las consultas reales por propietario, perfil y fecha de modificación.

## Migración desde el dispositivo

### Primera sesión

1. La persona inicia sesión y los datos locales permanecen intactos.
2. Si la nube está vacía, se muestra un resumen y se ofrece `Guardar este progreso en mi cuenta`.
3. Si existen datos locales y remotos, no se sobrescribe ninguno automáticamente.
4. Se comparan carrera, plan, cantidad de estados y semestres, con fecha de última modificación.
5. La persona elige conservar la nube, conservar este dispositivo o revisar una combinación.
6. Antes de una sustitución completa se genera una copia exportable o una instantánea recuperable.

### Reglas de combinación

- Los estados de una misma materia pueden sugerir el estado acreditable más avanzado, pero la interfaz debe mostrar cualquier diferencia antes de confirmarla.
- Los semestres y escenarios no se combinan por posición ni por nombre. Se usan IDs estables; ante versiones divergentes se conserva una copia de conflicto.
- Una carrera o plan diferente se guarda como otro perfil académico y nunca se fusiona por similitud textual.
- Toda importación y sincronización valida la versión del formato y las materias contra el plan correspondiente.

## Protocolo de sincronización

- D1 es la fuente autoritativa para una cuenta; el navegador conserva una caché local recuperable.
- Cada perfil o escenario tiene un número de revisión.
- Las escrituras envían la revisión conocida y el servidor rechaza una actualización obsoleta en lugar de pisar datos nuevos.
- Ante conflicto, el cliente descarga ambas versiones y ofrece elegir o conservar una copia duplicada.
- Las operaciones de escritura deben ser idempotentes para tolerar reintentos de red.
- El modo sin conexión puede seguir editando localmente, marcando claramente `Pendiente de sincronizar`.
- La interfaz distingue `Guardado en este dispositivo`, `Sincronizando`, `Guardado en tu cuenta` y `Necesita revisión`.

## Seguridad y privacidad

- Proteger páginas o endpoints de cuenta en el servidor; ocultar botones en el cliente no es autorización.
- Verificar propiedad en todas las consultas y mutaciones.
- Validar tamaños, forma y versiones de todos los documentos recibidos.
- Limitar frecuencia y tamaño de escrituras para evitar abuso.
- Mantener las migraciones de D1 versionadas e inmutables una vez aplicadas.
- Ofrecer exportación de todos los datos personales y eliminación completa de la información de la cuenta.
- Definir y mostrar una política breve de privacidad, retención y contacto antes de abrir la beta.
- Documentar que Trayecto es un proyecto estudiantil no oficial y que la cuenta no se vincula automáticamente con Bedelías.

## Experiencia de cuenta

### Anónimo

- Indicador discreto: `Guardado en este dispositivo`.
- Acción secundaria: `Guardar y sincronizar`.
- Exportación manual siempre disponible.

### Con sesión

- Mostrar estado de sincronización y última sincronización, no un avatar dominante.
- Permitir administrar perfiles académicos, exportar datos, cerrar sesión y eliminar los datos remotos.
- Avisar si otro dispositivo modificó la planificación.
- No mostrar el correo en superficies compartibles o capturas exportadas.

## Fases de entrega

### Fase 0 — Preparación local

- Diseñar un único documento de datos personales versionado.
- Agregar migraciones locales, deshacer e instantáneas recuperables.
- Mantener compatibilidad con las exportaciones actuales.

### Fase 1 — Beta de cuenta en un dispositivo

- Incorporar autenticación opcional y D1.
- Subir datos locales sólo con confirmación explícita.
- Descargar, exportar y eliminar los datos de cuenta.
- Mantener preferencias visuales locales.

### Fase 2 — Sincronización entre dispositivos

- Agregar revisiones, cola local, reintentos idempotentes y resolución de conflictos.
- Mostrar estados de sincronización comprensibles.
- Probar pérdida de red, dos pestañas, dos dispositivos y sesiones expiradas.

### Fase 3 — Recuperación y colaboración limitada

- Historial breve o instantáneas para recuperar cambios.
- Evaluar enlaces de sólo lectura para compartir una planificación, con vencimiento y revocación.
- No habilitar edición colaborativa hasta tener un modelo explícito de permisos y auditoría.

## Pruebas obligatorias

- Un usuario nunca puede leer o modificar registros de otro.
- Primera sesión con nube vacía, local vacío y ambos con datos.
- Conflicto de progreso y conflicto estructural del planificador.
- Edición sin conexión seguida de reconexión.
- Importación de formatos anteriores y exportación completa.
- Cierre de sesión, sesión vencida y eliminación de datos.
- Dos pestañas y dos dispositivos actualizando la misma revisión.
- Cambio de carrera, plan, sede o trayectoria sin mezclar progreso incompatible.
- Uso completo de la plataforma sin cuenta.

## Preguntas de producto antes de implementar

1. ¿La primera beta puede depender de una cuenta de ChatGPT o debe admitir desde el inicio una identidad accesible fuera de ChatGPT?
2. ¿La cuenta sincroniza una sola carrera principal o permite varios perfiles académicos desde la primera versión? La recomendación es soportar varios en el modelo, aunque la interfaz empiece con uno.
3. ¿Se sincronizan notas personales? La recomendación es postergarlas hasta publicar la política de privacidad.
4. ¿Cuánto tiempo se conservan instantáneas y datos de una cuenta inactiva?
5. ¿Se desea compartir planificaciones? La recomendación es dejarlo fuera del MVP de cuentas.

## Condición para comenzar implementación

No implementar cuentas hasta cerrar la Fase 0 y decidir el proveedor de identidad de la beta. La primera publicación con D1 debe incluir migración reversible para datos locales, exportación y eliminación; una pantalla de login aislada no constituye una cuenta utilizable ni segura.

