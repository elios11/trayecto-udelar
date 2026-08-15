# Integración UI de carreras extraídas

## Objetivo

Incorporar al selector académico todas las identidades canónicas vigentes extraídas de Bedelías, sin duplicar una carrera por servicio o sede y sin presentar como auditada información que todavía no pasó por revisión documental oficial.

## Decisiones de modelo

- La identidad canónica es `carrera + año de plan`.
- Una sede es una oferta del mismo plan; no es otra carrera ni otro plan.
- El selector `Sede` sólo aparece cuando una auditoría oficial registra más de una localización concreta.
- Una trayectoria territorial sólo se asocia a una sede cuando una fuente oficial la define. La oferta flexible adicional de Bedelías no alcanza para inferirla.
- Los planes extraídos conservan estado `auditoría oficial pendiente` hasta su revisión documental. Las tres auditorías de evidencia regional cerradas habilitan el modelo de sedes, pero no cambian por sí solas la elegibilidad de publicación.
- Si Bedelías no publica la composición, la carrera sigue siendo seleccionable y muestra un estado vacío explícito, sin inventar materias, áreas ni créditos.

## Alcance funcional

- Catálogo generado y reproducible a partir de `audit-queue.json`, los snapshots y el registro de auditorías oficiales.
- Carga diferida de cada plan para no descargar todas las mallas al abrir la aplicación.
- Persistencia retrocompatible de plan, trayectoria y sede.
- Sedes oficiales para Ingeniería Agronómica 2020, Licenciatura en Biotecnología 2024 y Abogacía 2016.
- Trayectoria `Agrícola-ganadera` disponible únicamente al elegir Salto en Ingeniería Agronómica.
- Avisos diferenciados para proyecciones auditadas, evidencia oficial incompleta, extracción estructural y composición no publicada.

## Verificación requerida

- Generación determinista, identidad única y referencias internas válidas.
- Casos sin sede, con varias sedes, sede con trayectoria, almacenamiento legado e identificadores inválidos.
- Plan sin composición y fallo de carga sin pérdida de progreso.
- `npm test`, `npm run lint` y compilación local.
- Prueba funcional en navegador en escritorio, tablet y móvil, incluyendo todos los temas claros/oscuros y controles de teclado/táctiles.

## Límites

- No integrar en `main`, hacer push, desplegar ni publicar.
- No completar auditorías oficiales pendientes durante este hito.
- No convertir catálogos optativos regionales en núcleos obligatorios ni variantes curriculares.
