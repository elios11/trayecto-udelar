# Compatibilidad de datos personales y currículas

## Versiones que no deben confundirse

- `formatVersion` describe la forma portable del archivo. La versión actual es 4.
- `revision` sólo ordena escrituras concurrentes del mismo documento; no habilita campos.
- una futura versión de API negociará capacidades de sincronización remota y será independiente del archivo.
- `curriculumRevision` identifica la proyección académica con la que se creó o actualizó cada perfil.

Un `revision` alto sigue siendo v4. Un `formatVersion` mayor a 4 nunca se interpreta como v4: el original queda protegido y debe poder exportarse o abrirse con un cliente compatible.

## Extensiones compatibles

V4 admite opcionalmente `extensions` en documento, perfil, selección, progreso, historial, hito, planificación, escenario y semestre. Es un objeto JSON cuyas claves deben usar un namespace con puntos, por ejemplo `org.ejemplo.funcion`. El cliente conserva estas bolsas al editar campos v4 aunque no entienda su contenido.

Una extensión no puede cambiar el significado, obligatoriedad o validación de los campos v4. Si una función necesita esa semántica, una migración, un campo obligatorio o una garantía de servidor, requiere incrementar `formatVersion`. Los campos ordinarios desconocidos siguen siendo ignorados deliberadamente: sólo `extensions` promete preservación.

## Migraciones y retiro del rollback heredado

- Las exportaciones completas v1, v2 y v3 siguen entrando por migraciones puras a v4; repetir la lectura de un v4 no lo vuelve a migrar.
- La hidratación local nunca reemplaza un v4 inválido o futuro con claves heredadas. Puede recuperar una vista local, pero bloquea la escritura canónica.
- Las escrituras espejo v1/v2 se mantienen durante la etapa local y el primer lanzamiento público con cuentas.
- Sólo podrán retirarse después de dos versiones públicas estables consecutivas que hayan pasado: fixtures v1/v2/v3 → v4, exportación/restauración v4, simulacro documentado de rollback y verificación de que la última versión soportada ya no depende de esas claves. Al no existir telemetría, no se supondrá adopción por cantidad de usuarios.
- Aun después de retirar las escrituras espejo, los fixtures y el importador explícito v1/v2 se conservan mientras no exista una decisión de producto y una herramienta externa de conversión.

La clave canónica v4 es independiente de la clave v3. Un cliente antiguo puede seguir escribiendo su copia v3, pero no puede sustituir un v4 válido; la aplicación actual sólo consulta v3 como fuente migratoria cuando no existe v4. `progress` permanece materializado, pero antes de escribir se deriva y valida contra `academicHistory`.

## Revisión curricular y referencias históricas

Cada perfil nuevo recibe `trayecto-curriculum:<planId>:<fecha-epoch>`. El epoch vive en `app/curriculum-revisions.mjs` y debe cambiar en el mismo commit que altere identificadores o semántica de una proyección publicada. Git conserva el artefacto exacto de cada epoch y permite reproducirlo.

Un reemplazo de materia requiere un registro explícito con plan, identificador anterior y nuevo, tipo, fecha efectiva y URL oficial HTTPS. Nunca se deduce por nombre parecido. Una materia que desaparece sin equivalencia comprobada se clasifica como histórica/huérfana: no acredita automáticamente contra el catálogo actual, pero permanece en el documento, las instantáneas y las exportaciones.

La importación completa y la restauración aceptan esas referencias históricas si el plan sigue reconocido. La importación separada de un planificador continúa exigiendo materias del catálogo actual, porque su finalidad es incorporar una planificación ejecutable, no archivar una trayectoria completa.
