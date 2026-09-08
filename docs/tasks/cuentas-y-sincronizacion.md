# Cuentas y sincronización segura

## Estado

Propuesta de arquitectura y producto. No implementada.

## Objetivo

Permitir que una persona recupere y sincronice su progreso y planificación entre dispositivos sin volver obligatoria una cuenta, sin perder datos locales, sin convertir Trayecto en custodio de información académica innecesaria y sin hacer que los datos dependan de un proveedor de hosting.

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

### Portabilidad como requisito

- El dominio propio es la dirección estable del producto; el dominio generado por el proveedor es un destino reemplazable.
- El repositorio Git independiente contiene todo lo necesario para compilar la aplicación. No se acepta como única copia el repositorio interno de un hosting.
- Los comandos `npm test`, `npm run lint` y `npm run build` son el contrato de CI. El flujo de un proveedor sólo los invoca y no contiene lógica indispensable.
- La lógica de negocio y sincronización usa APIs Web estándar y módulos TypeScript independientes de Sites.
- Todo acceso a identidad, base de datos, correo o almacenamiento pasa por adaptadores pequeños. Los componentes de interfaz no importan SDK de un proveedor.
- Los datos personales tienen un formato JSON versionado y documentado que permite exportar y restaurar sin ejecutar Trayecto.
- Las migraciones son SQL reproducible y se prueban contra PostgreSQL local antes de producción.
- Debe existir un ensayo de salida: restaurar un respaldo en otro PostgreSQL, ejecutar la aplicación contra él y documentar el cambio de hosting y DNS.

### Autenticación inicial

- No usar el identificador de ChatGPT como identidad canónica: es específico del sitio y dificultaría una migración fuera de Sites.
- Antes de implementar, crear una prueba mínima de autenticación independiente mediante un protocolo estándar como OpenID Connect. Si Sites no puede sostenerla de forma segura, alojar autenticación y API bajo un subdominio propio separado y dejar Sites como frontend.
- Una beta interna podría admitir temporalmente inicio con ChatGPT sólo si cada cuenta conserva una identidad portable propia y existe un flujo explícito para vincular otro proveedor antes de migrar.
- No construir autenticación propia ni almacenar contraseñas.
- Ejecutar toda autorización de lectura y escritura en el servidor usando un identificador interno de Trayecto asociado a identidades externas; nunca confiar en un ID enviado por el navegador.

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

- Usar como clave de propietario un ID interno de Trayecto; las identidades externas se vinculan en una tabla separada y reemplazable.
- No guardar cédula, número de estudiante, escolaridad oficial, calificaciones, teléfono ni fecha de nacimiento.
- Usar el correo sólo para mostrar la sesión cuando sea necesario; evitar duplicarlo en la base si el proveedor ya lo entrega.
- No incorporar telemetría de comportamiento dentro de esta funcionalidad.
- No registrar en logs el contenido del plan personal ni las notas.

## Arquitectura portable propuesta

### Base de datos

- Usar PostgreSQL estándar como contrato de persistencia.
- Usar Drizzle para el esquema y las consultas, evitando funciones propietarias salvo que tengan una alternativa documentada.
- Mantener `DATABASE_URL` y el adaptador como configuración. Cambiar de proveedor no debe modificar reglas de negocio ni componentes.
- Desde Sites o cualquier Worker, conectar mediante un transporte HTTP o WebSocket compatible con edge; no depender de TCP directo.
- Mantener respaldos lógicos periódicos con `pg_dump` fuera del proveedor principal y probar su restauración.
- No usar D1 como fuente primaria de cuentas. Puede seguir disponible para funciones auxiliares descartables que no contengan el único ejemplar de un dato.

Proveedor inicial recomendado: **Neon PostgreSQL**, porque conserva PostgreSQL estándar y ofrece un controlador HTTP/WebSocket para entornos edge. **Supabase PostgreSQL** es una alternativa válida si se desea incorporar autenticación y API REST, siempre que la aplicación siga usando esquema SQL portable, respaldos propios y adaptadores que no expongan su SDK al dominio central.

MongoDB Atlas no se recomienda para el MVP. Aunque ofrece un nivel gratuito, la planificación, perfiles, materias, revisiones y propiedad forman relaciones claras; PostgreSQL simplifica restricciones, transacciones, migraciones y exportación. La conexión habitual de Atlas también espera un controlador MongoDB y acceso de red específico, lo que introduce una capa adicional para el runtime de Sites.

R2 o cualquier almacenamiento de objetos no es necesario mientras no se guarden archivos. Si aparece esa necesidad, usar una interfaz compatible con S3 y conservar metadatos y respaldos fuera del proveedor.

### Límites entre componentes

```text
Navegador
  └─ dominio propio de Trayecto
      ├─ frontend React
      └─ API estable /api o api.<dominio>
          ├─ servicio de autenticación por OIDC
          ├─ lógica de sincronización portable
          └─ adaptador PostgreSQL
```

- El frontend no llama dominios internos de Sites, Neon o Supabase directamente.
- La API expone un contrato versionado y documentado.
- Los secretos viven únicamente en el entorno del servidor.
- El núcleo puede ejecutarse en un Worker compatible con Fetch o en Node sin reescribir la lógica de negocio.

### CI/CD y repositorio

- Usar un repositorio GitHub como origen canónico y mantener una copia recuperable fuera del hosting.
- GitHub Actions es una opción inicial razonable: ejecuta los scripts estándar del proyecto y los runners estándar son gratuitos para repositorios públicos; en repositorios privados se controla la cuota incluida.
- Separar `verificar`, `compilar` y `desplegar`. Los dos primeros son idénticos para todos los proveedores; sólo el último tiene adaptadores para Sites u otro destino.
- No guardar credenciales de despliegue en el repositorio. Usar secretos del CI y permisos de corta duración cuando estén disponibles.
- Generar un artefacto de compilación reutilizable para que cambiar de proveedor no obligue a cambiar el código.

## Persistencia funcional propuesta

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

- PostgreSQL es la fuente autoritativa para una cuenta; el navegador conserva una caché local recuperable.
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
- Mantener las migraciones PostgreSQL versionadas e inmutables una vez aplicadas.
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
- Publicar el repositorio canónico y automatizar verificación y compilación sin depender de Sites.
- Elegir un dominio propio y documentar DNS, variables y procedimiento de migración.

### Fase 0.5 — Prueba de portabilidad

- Levantar PostgreSQL local con el esquema completo y datos ficticios.
- Probar Neon y una restauración del mismo respaldo en otro PostgreSQL.
- Validar un flujo OIDC independiente desde el runtime elegido.
- Ejecutar el mismo núcleo de API en el entorno de Sites y en un runtime Node o Worker alternativo.
- Documentar tiempos, pasos y partes todavía dependientes del proveedor.

### Fase 1 — Beta de cuenta en un dispositivo

- Incorporar autenticación opcional y PostgreSQL mediante los adaptadores validados.
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

1. ¿Qué proveedor OIDC independiente se usará en la primera beta y cómo se vinculará una segunda identidad sin perder la cuenta interna?
2. ¿La cuenta sincroniza una sola carrera principal o permite varios perfiles académicos desde la primera versión? La recomendación es soportar varios en el modelo, aunque la interfaz empiece con uno.
3. ¿Se sincronizan notas personales? La recomendación es postergarlas hasta publicar la política de privacidad.
4. ¿Cuánto tiempo se conservan instantáneas y datos de una cuenta inactiva?
5. ¿Se desea compartir planificaciones? La recomendación es dejarlo fuera del MVP de cuentas.

6. ¿El repositorio será público? Esto determina el costo y la exposición del CI, pero no debe cambiar los comandos de verificación.
7. ¿Qué proveedor administrará el dominio? Debe permitir cambiar DNS sin transferir el dominio ni depender del hosting de la aplicación.

## Condición para comenzar implementación

No implementar cuentas hasta cerrar las Fases 0 y 0.5 y decidir el proveedor de identidad de la beta. La primera publicación con persistencia remota debe incluir migración reversible para datos locales, exportación, eliminación y un respaldo restaurable en otro PostgreSQL; una pantalla de login aislada no constituye una cuenta utilizable, segura ni portable.

## Plan de salida mínimo

Antes de considerar completa la beta se debe poder:

1. Exportar la base con herramientas PostgreSQL estándar.
2. Restaurarla en un proveedor distinto.
3. Cambiar `DATABASE_URL` y secretos sin editar el dominio central.
4. Reconstruir frontend y API desde el repositorio Git canónico.
5. Cambiar DNS del dominio propio al nuevo despliegue.
6. Reasociar o conservar las identidades sin pedir a cada persona que recree su progreso.
7. Completar el ejercicio con una guía ejecutable y un tiempo objetivo de recuperación.

## Referencias técnicas oficiales consultadas

- Neon serverless driver: https://neon.com/docs/serverless/serverless-driver
- Neon pricing: https://neon.com/pricing
- Supabase database connections: https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase backups: https://supabase.com/docs/guides/platform/backups
- Supabase pricing: https://supabase.com/pricing
- MongoDB Atlas free cluster: https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/
- MongoDB Atlas connections: https://www.mongodb.com/docs/atlas/driver-connection/
- GitHub Actions billing: https://docs.github.com/en/actions/concepts/billing-and-usage
