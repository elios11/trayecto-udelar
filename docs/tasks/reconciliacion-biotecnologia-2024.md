# D03bm — Licenciatura en Biotecnología Plan 2024

## Objetivo

Reproducir las trayectorias sugeridas del Plan 2024 compartido por FCIEN, FQ y CENUR Litoral Norte, manteniendo una sola carrera, un solo progreso y los mínimos normativos de 360 créditos. La [trayectoria institucional actualizada el 22/02/2024](https://eva.fcien.udelar.edu.uy/pluginfile.php/177982/mod_forum/attachment/81185/Trayectoria%20Lic%20Biotecnologia%20actualizada%20al%2022022024.pdf) publica tres grillas de ocho semestres según la puerta de entrada. El [Plan aprobado en Colibrí](https://www.colibri.udelar.edu.uy/jspui/handle/20.500.12008/42761) fija los mínimos y la responsabilidad compartida.

## Criterios de autoridad

- Las tres grillas son ejemplos modificables, no secuencias obligatorias ni garantía de oferta actual. FCIEN y FQ son dos entradas de Montevideo; CENUR describe la entrada regional y no prueba por sí sola que cada curso de años superiores se dicte tanto en Salto como en Paysandú.
- Los perfiles molecular, agropecuario y otros del tramo de orientación son ejemplos de optativas, no títulos, menciones ni cursos simultáneos obligatorios. Los cupos de optativas/electivas/pasantía son espacios de crédito, no materias canónicas de código inventado.
- Cotejar cada identidad con la composición y la carga publicada por Bedelías; sólo promover una correspondencia inequívoca. Conservar código e historial previos. Nombres similares, ofertas históricas y créditos discrepantes quedan como candidatas o identidades sólo-fuente explícitas.
- Mantener separados los 232 créditos mínimos del tramo común, los 80 del tramo de orientación y los 48 flexibles restantes. Las sumas de las grillas orientan una implementación, no reemplazan las reglas del Plan.

## Estado recuperable

- `data/fcien/biotecnologia-2024-trayectorias.json` normaliza las filas y los subtotales impresos de los tres ejemplos. Fuente: Facultad de Ciencias, anexo actualizado 22/02/2024, consultado 22/10/2026. La persona usuaria adjuntó el PDF de 20 páginas, SHA-256 `18d5f6c4cf8c4ba61e727a8607d003405209a4f0573bdd4a3f50fc07f6f81253`, y se cotejaron visualmente las páginas 3–11; la copia cruda y los PNG están en `tmp/d03bm-biotecnologia-2024/` y no se versionan.
- `scripts/build-biotecnologia-2024.mjs` proyecta offline las tres puertas de entrada y sus 110 ubicaciones en ocho semestres cada una. Se conservaron identidades sólo-fuente para las materias sin código técnico inequívoco y para los cupos flexibles; no se promovió el resto de la composición de Bedelías por parecido del nombre.
- Dos filas con código explícito se vincularon a la composición: CBB27 (publicado allí como `CENURLN-CBB27`, mismo nombre y 14 créditos) y 536X (11 créditos). La primera relación usa el prefijo del servicio en Bedelías, no una equivalencia nominal general. La proyección conserva un solo plan y progreso; Montevideo abre FCIEN por defecto y Salto/Paysandú CENUR. La oferta efectiva de cursos avanzados por sede sigue sin confirmarse.
- La integración con `main` incorpora el mismo ID de plan en los selectores FQ, FCIEN y CENUR Litoral Norte. Cada entrada abre su trayectoria correspondiente; CENUR inicia en Salto y permite cambiar a Paysandú, sin duplicar el progreso.
- Queda pendiente revisar códigos/versiones de todas las demás materias sólo-fuente y el catálogo real de optativas. Los cupos del anexo no son el listado de cursos ofertados. Mantener la advertencia de catálogo parcial hasta una auditoría oficial de esa oferta.

## Validación del checkpoint

- Comprobar ocho períodos por puerta de entrada, subtotales por semestre, ausencia de duplicación de cupos como materias y cobertura de todas las filas transcritas.
- Regeneración exacta: `node scripts/build-biotecnologia-2024.mjs`. No necesita red ni repetir la extracción del PDF.
- `node tests/biotecnologia-2024-source.test.mjs`: 3/3 pruebas correctas. `node tests/official-trajectory-inventory.test.mjs`: 29/29 correctas; cotejo de 110/110 ubicaciones. Las tres series suman respectivamente 357, 360 y 360 créditos. Los 357 de FCIEN son el total de los subtotales impresos, no un cambio del mínimo de egreso.
- En el worktree original, `npm test` quedó bloqueado por `spawn EPERM` al cargar Vite y un caso de Psicología estaba desactualizado respecto de su auditoría; ambos problemas de verificación se resolvieron antes de la integración. La regeneración offline resultó idempotente para la fuente, la auditoría, la proyección y el inventario.
- En el `main` combinado, `npm test` pasó 1137/1137 y `npm run lint` pasó. Se comprobó en la aplicación local que las tres entradas muestran ocho semestres y el selector de sede/recorrido correcto; no se verificó una captura visual.
- Para reanudar: verificar primero esta evidencia y `git status`; contrastar códigos pendientes con un inventario oficial actualizado, sin volver a transcribir el anexo si su huella no cambió.
