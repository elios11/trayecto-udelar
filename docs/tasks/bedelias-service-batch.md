# Recolector desatendido de Bedelías por servicio

## Objetivo

Permitir que una única ejecución local descubra y extraiga secuencialmente todos los planes de un servicio de Bedelías sin intervención de un agente. El proceso no utiliza modelos ni APIs de IA.

## Comportamiento

- Descubre carreras y planes del servicio seleccionado desde la consulta pública de Bedelías.
- Procesa por defecto únicamente planes marcados como vigentes y tipos compatibles con grado, tecnicaturas y CIO; `Posgrado` queda excluido incluso si contiene la palabra “grado”.
- Permite filtrar por tipo de carrera, nombre de carrera y cantidad máxima de planes.
- Ejecuta un solo plan a la vez y respeta la pausa mínima del importador existente.
- Conserva los checkpoints por plan y un estado adicional del lote.
- Al reanudar, omite resultados ya completados y vuelve a intentar planes fallidos o interrumpidos.
- Continúa con los demás planes si una extracción falla y entrega un resumen final.
- Ofrece un modo `--dry-run` que descubre y enumera el lote sin extraer previaturas.

## Fuera de alcance

- Publicar automáticamente los datos en la aplicación.
- Investigar trayectorias sugeridas, Anexos B, resoluciones u otras fuentes documentales.
- Ejecutar planes en paralelo o evadir los límites prudentes de solicitudes.
- Decidir automáticamente si un dato parcial es apto para mostrarse como oficial.

## Criterios de aceptación

- Existe un comando npm por servicio.
- El lote puede interrumpirse y reanudarse sin repetir planes completados.
- Los argumentos se construyen sin invocar una shell, para conservar nombres y caracteres especiales de forma segura.
- La selección de planes y la recuperación del estado tienen pruebas unitarias.
- `npm test` pasa y el lint no incorpora errores nuevos.
