# F05 — Indicador y diagnóstico de guardado local

## Estado

Lista para implementación sobre `b421c0c`, después de F03 y F04. Este nodo hace visible el estado real de la persistencia personal local; no incorpora cuentas, nube ni sincronización.

## Objetivo

Que una persona sepa si su avance y planificación quedaron guardados en el navegador, cuándo ocurrió la última escritura correcta y qué puede hacer si el almacenamiento está bloqueado o sin espacio. La interfaz no debe insinuar que existe respaldo remoto.

## Decisiones de producto

- El indicador describe exclusivamente el documento personal canónico `trayecto-udelar-personal-data-v3`. Un fallo de instantáneas o papelera conserva su mensaje específico de F04 y no convierte un guardado principal correcto en fallido.
- Estados visibles: `Comprobando guardado…`, `Guardado en este dispositivo` y `Cambios sin guardar en este dispositivo`.
- Un guardado correcto muestra la última modificación conocida con fecha/hora local. Al hidratar un v3 válido se usa su metadata; una escritura posterior actualiza el instante sólo después de que `localStorage.setItem` termine correctamente.
- `localStorage` es síncrono: no se simula un estado prolongado de guardado ni una confirmación antes de la escritura real.
- Los fallos se clasifican sin depender de un navegador específico: cuota/espacio, acceso bloqueado o error desconocido. Todos conservan el estado anterior y recomiendan exportar una copia cuando sea posible.
- La UI vive en el panel `Datos`, visible sin desplegar `Recuperación`, con una descripción inequívoca: sólo este navegador/dispositivo, sin cuenta ni nube.
- Cuando el guardado falla se ofrece `Reintentar guardado`. El reintento serializa y valida el documento personal vigente antes de escribir; no borra datos, claves heredadas ni recuperación.
- Un v3 dañado que bloquea escrituras conserva el diagnóstico especial de F03. El indicador queda en error hasta importar una copia válida; no debe prometer que `Reintentar` puede sobrescribir el archivo protegido.

## Arquitectura

- Crear un módulo puro pequeño para el estado de guardado, clasificación de errores y textos/fechas independientes de React y del navegador.
- Centralizar las escrituras del documento v3 de hidratación/migración, persistencia automática, importación/restauración y reintento en una función de la página que:
  1. recibe un documento v3 ya validado;
  2. serializa antes de escribir;
  3. sólo marca éxito y actualiza referencias después de `setItem`;
  4. captura la excepción, conserva la referencia al último documento durable y marca el diagnóstico correspondiente.
- No convertir las escrituras heredadas de rollback ni el almacén de recuperación en fuente del indicador principal.
- Evitar bucles: cambiar el estado visual del indicador no debe disparar una nueva serialización del documento personal.

## Accesibilidad y UI

- El estado textual usa una región `role="status"` y `aria-live="polite"`; los errores no dependen sólo del color.
- El instante se presenta de forma legible y conserva un `dateTime` ISO en `<time>`.
- El control de reintento es usable con teclado y tacto y permanece dentro del panel `Datos`.
- En móvil el bloque no ensancha el panel ni desplaza sus acciones fuera de pantalla.

## Pruebas obligatorias

- Estado inicial durante hidratación y estado correcto al leer un v3 válido.
- La última modificación sólo avanza después de una escritura correcta.
- Clasificación determinista de `QuotaExceededError`, `SecurityError`/acceso bloqueado y error desconocido.
- Una escritura fallida no reemplaza las referencias/fingerprint del último documento durable ni muestra éxito.
- Reintentar escribe el documento vigente y recupera el estado correcto cuando vuelve a haber almacenamiento.
- El bloqueo protector por v3 dañado no se sobrescribe mediante reintento.
- Importación/restauración fallida por almacenamiento no aplica el documento nuevo.
- Prueba documental de la región accesible, textos locales, `<time>` y acción de reintento.

## Límites

- No agregar dependencias, telemetría, cookies, Service Worker, API, base de datos, autenticación ni sincronización.
- No medir ni mostrar una cuota estimada: su disponibilidad y precisión varían entre navegadores; F05 responde al fallo real de escritura.
- No modificar el contrato exportable v3, currículas, preferencias visuales, identidad o metadatos sociales.
- No borrar almacenamiento automáticamente ni recomendar borrar progreso como primera solución.

## Verificación y cierre

- Ejecutar pruebas estrechas durante el desarrollo.
- Antes del commit ejecutar `npm test`, `npm run lint`, `npm run security:repo` y `git diff --check`.
- Actualizar `PROJECT_CONTEXT.md` sólo si cambia una política estable de persistencia.
- Registrar aquí implementación, verificaciones y limitaciones reales.
- Crear un commit enfocado en este worktree; no integrar, hacer push ni publicar desde el subagente.

F05 queda cerrado cuando el panel `Datos` comunica fielmente el último guardado principal y permite recuperarse de un fallo temporal sin afirmar respaldo remoto ni arriesgar el documento durable anterior.

## Resultado de implementación

- El panel `Datos` muestra comprobación, éxito o cambios sin guardar, junto con el último instante canónico correcto y una aclaración explícita de que no existe copia en la nube.
- Las escrituras v3 de migración, persistencia automática, importación, restauración y reintento pasan por un único helper. La referencia y la huella durable sólo avanzan tras una escritura correcta.
- Los fallos de cuota, permisos y origen desconocido tienen diagnósticos diferenciados. Un daño v3 protegido no ofrece un reintento que pueda sobrescribirlo; una importación válida sí puede reemplazarlo de forma explícita.
- Las claves heredadas y preferencias siguen siendo auxiliares: sus fallos no falsean el indicador canónico ni hacen caer la aplicación cuando el almacenamiento está bloqueado.
- No se incorporaron cuentas, servicios, telemetría, dependencias ni estimaciones de cuota.

## Verificación realizada

- `node --test tests/local-save-status.test.mjs tests/local-save-status-ui.test.mjs`
- `npm test`
- `npm run lint`
- `npm run security:repo`
- `git diff --check`

No se realizó una inspección visual manual; la adaptación del panel queda cubierta por estilos y pruebas estructurales.
