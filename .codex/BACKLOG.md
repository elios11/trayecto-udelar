# Backlog técnico de Trayecto Udelar

Este archivo reúne mejoras planificadas que todavía no están implementadas. No describe el comportamiento actual ni autoriza cambios automáticos: cada ítem debe investigarse, implementarse en una rama aislada y validarse antes de integrarlo.

## BL-001 · Restauración de optativas sin descargar el catálogo completo

- Estado: propuesto, no implementado
- Prioridad: media antes de sumar nuevas carreras; alta al escalar el catálogo
- Origen: seguimiento de la restauración automática de optativas guardadas en `localStorage`

### Problema

El progreso actual guarda principalmente `id -> estado`. Si el identificador pertenece a una optativa del catálogo ampliado, ese dato no alcanza para mostrar la tarjeta ni calcular créditos y áreas: faltan nombre, créditos, asignaciones curriculares y procedencia.

La solución vigente carga bajo demanda el bloque ampliado completo cuando detecta al menos una optativa aprobada o exonerada fuera del catálogo inicial. Evita la descarga para usuarios que no la necesitan y deduplica solicitudes simultáneas, pero una sola materia todavía provoca la carga de todo el bloque.

Medición de referencia del 2026-08-08:

- JSON fuente: 527.764 bytes.
- Chunk cliente minificado: aproximadamente 298.783 bytes antes de compresión HTTP.
- El navegador normalmente puede reutilizar el chunk por caché, pero el costo inicial sigue existiendo.

### Objetivo

Restaurar y contabilizar una optativa guardada descargando solo la información mínima necesaria, sin perder exactitud académica ni romper progresos existentes.

### Arquitectura propuesta

Separar la proyección ampliada en tres niveles:

1. **Índice liviano de materias**
   - Un registro por materia con `id`, nombre legible, créditos, nodos/áreas a los que aporta, estado de procedencia y una versión/hash del catálogo.
   - Sin reglas completas de previas, textos originales ni metadatos pesados de oferta.
   - Suficiente para restaurar tarjetas, créditos totales y créditos por área.
2. **Detalles y reglas particionados**
   - Dividir fichas completas y previaturas en chunks estables, por ejemplo mediante 16 buckets derivados del código.
   - Cargar un bucket solo al abrir una ficha, evaluar habilitación o necesitar información no incluida en el índice.
   - Evitar un archivo por materia para no multiplicar excesivamente solicitudes y archivos de despliegue.
3. **Caché local versionada de materias utilizadas**
   - Al marcar o abrir una optativa, conservar un resumen compacto junto al progreso.
   - Guardar el `contentHash` del catálogo que originó ese resumen.
   - En sesiones posteriores, pintar y contar desde la caché inmediatamente; refrescar desde el índice cuando cambie el hash.
   - La caché nunca debe sustituir silenciosamente una fuente institucional más reciente.

### Contrato mínimo sugerido

```json
{
  "schemaVersion": 1,
  "catalogHash": "sha256:...",
  "courses": {
    "codigo-estable": {
      "id": "codigo-estable",
      "name": "Nombre legible",
      "credits": 10,
      "allocations": [
        { "nodeId": "area-id", "credits": 10, "status": "official" }
      ],
      "source": "bedelias",
      "detailBucket": "0a"
    }
  }
}
```

El formato final debe reutilizar los tipos universales del proyecto y evitar duplicar URLs idénticas en cada registro.

### Plan de implementación

#### Fase 1 · Medir y fijar presupuesto

- Registrar tamaños actuales sin compresión, gzip y Brotli.
- Medir cuántas materias y reglas contiene cada bloque.
- Fijar un presupuesto inicial para el índice; objetivo orientativo: menos de 100 KB transferidos para todo el catálogo de Computación 1997.
- Definir una métrica que pueda repetirse al agregar carreras.

#### Fase 2 · Generar el índice

- Extender `scripts/build-app-data.mjs` para producir un índice determinista desde la misma proyección oficial.
- Incluir únicamente campos necesarios para tarjeta, búsqueda, créditos totales y créditos por área.
- Conservar `schemaVersion`, `contentHash`, procedencia y validaciones estructurales.
- Comprobar que la suma de créditos y asignaciones coincida con la proyección completa.

#### Fase 3 · Particionar detalles

- Elegir una función de bucket estable basada en el identificador, no en el orden del catálogo.
- Generar chunks con curso completo, oferta y reglas correspondientes.
- Crear un cargador con caché de promesas para evitar solicitudes duplicadas.
- Mantener una ruta de reintento cuando un chunk falle.

#### Fase 4 · Migrar la persistencia

- Evolucionar el progreso exportable a una nueva versión que admita resúmenes de materias utilizadas.
- Leer sin pérdida el formato actual, que contiene únicamente estados.
- Para progresos antiguos, resolver IDs mediante el índice liviano.
- Para progresos nuevos, usar primero la caché local y validar su hash en segundo plano.
- No borrar estados desconocidos: conservarlos y advertir únicamente si ya no existen en el índice vigente.

#### Fase 5 · Integrar la interfaz

- Restaurar tarjetas y créditos desde resúmenes o índice sin cargar reglas completas.
- Mantener visibles solo las optativas aprobadas/exoneradas cuando el catálogo completo no esté expandido.
- Cargar detalles al abrir el drawer o cuando una evaluación de previas los requiera.
- Mantener el orden exonerada, aprobada y pendiente, con orden alfabético dentro de cada grupo.

#### Fase 6 · Validar y desplegar gradualmente

- Comparar créditos totales y por área contra la implementación actual usando el mismo progreso.
- Probar progreso nuevo, progreso histórico, JSON importado y datos dañados.
- Verificar que cero optativas ampliadas implique cero solicitudes del índice y de detalles.
- Verificar que una optativa histórica requiera como máximo el índice, y que abrir su ficha cargue un solo bucket.
- Mantener temporalmente un fallback al bloque completo durante una versión si una migración no puede resolverse.
- Eliminar el fallback solo después de confirmar telemetría o pruebas equivalentes sin pérdida de progreso.

### Criterios de aceptación

- Un usuario sin optativas ampliadas no descarga índice ni detalles.
- Una optativa exonerada guardada aparece y cuenta créditos sin descargar el chunk ampliado actual de aproximadamente 299 KB.
- Una optativa aprobada aparece, pero no suma créditos.
- Los créditos totales y por área son idénticos a los de la proyección completa.
- Abrir una ficha descarga como máximo un bucket de detalles y reglas.
- Dos solicitudes simultáneas del mismo índice o bucket comparten una sola promesa.
- Los formatos históricos de `localStorage` y exportación JSON siguen importándose sin pérdida.
- Cambiar el hash del catálogo invalida o refresca resúmenes obsoletos de forma explícita.
- Las pruebas automatizadas cubren orden, migración, deduplicación, fallo de red y coherencia de créditos.

### Riesgos y decisiones pendientes

- **Datos obsoletos:** persistir créditos y áreas acelera el inicio, pero exige invalidación por hash.
- **Demasiados chunks:** un archivo por curso aumenta solicitudes; usar buckets limita ese costo.
- **Búsqueda global:** el índice debe incluir suficiente texto para buscar sin reglas completas.
- **Reglas de habilitación:** no declarar una materia habilitada hasta cargar la regla necesaria.
- **Escala Udelar:** el índice deberá separarse por carrera y plan; no crear un índice universal monolítico.
- **Complejidad prematura:** para Computación 1997 el bloque actual es moderado. Implementar este backlog cuando la medición o la expansión de carreras justifique el costo de mantenimiento.

### Fuera de alcance de este ítem

- Cuentas y sincronización entre dispositivos.
- Cambiar la semántica aprobada/exonerada.
- Reemplazar Bedelías como fuente de verdad.
- Precargar todos los planes o carreras.

## Plantilla para nuevos ítems

Cada nuevo ítem debe incluir como mínimo:

- estado y prioridad;
- problema observable;
- objetivo;
- arquitectura o alternativas consideradas;
- fases de implementación;
- criterios de aceptación verificables;
- riesgos, compatibilidad y fuera de alcance.
