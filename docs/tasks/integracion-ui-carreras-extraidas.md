# Integración UI de carreras extraídas

## Objetivo

Incorporar al selector académico todas las identidades canónicas vigentes extraídas de Bedelías, sin duplicar una carrera por servicio o sede y sin presentar como auditada información que todavía no pasó por revisión documental oficial.

## Decisiones de modelo

- La identidad canónica es `carrera + año de plan`.
- Una sede es una oferta del mismo plan; no es otra carrera ni otro plan.
- El selector `Sede` sólo aparece cuando una auditoría oficial registra más de una localización concreta.
- Una trayectoria territorial sólo se asocia a una sede cuando una fuente oficial la define. La oferta flexible adicional de Bedelías no alcanza para inferirla.
- Los planes extraídos conservan estado `auditoría oficial pendiente` hasta su revisión documental. Las nueve auditorías de evidencia regional cerradas habilitan el modelo de sedes y trayectos territoriales verificados, pero no cambian por sí solas la elegibilidad de publicación.
- Si Bedelías no publica la composición, la carrera sigue siendo seleccionable y muestra un estado vacío explícito, sin inventar materias, áreas ni créditos.

## Alcance funcional

- Catálogo generado y reproducible a partir de `audit-queue.json`, los snapshots y el registro de auditorías oficiales.
- Carga diferida de cada plan para no descargar todas las mallas al abrir la aplicación.
- Persistencia retrocompatible de plan, trayectoria y sede.
- Sedes oficiales para Ingeniería Agronómica 2020, Licenciatura en Biotecnología 2024, Abogacía 2016, Notariado 2016, Licenciatura en Enfermería 2016, Doctor en Medicina 2008, Licenciatura en Educación Física 2017, Tecnicatura en Deportes 2007 y Licenciatura en Psicología 2013.
- Trayectoria `Agrícola-ganadera` disponible únicamente al elegir Salto en Ingeniería Agronómica.
- Los trayectos de Educación Física se filtran por sede: Paysandú ofrece Deporte y Salud; Montevideo y Maldonado ofrecen las cuatro opciones oficiales.
- Las opciones de la Tecnicatura en Deportes se vinculan a su sede oficial y muestran el estado de ingreso: Fútbol en Montevideo, Actividades Acuáticas en Rocha y Atletismo en Paysandú. Rivera se conserva sólo en la auditoría histórica y no aparece como sede vigente.
- El CIO Psicología de CURE se conserva como vía de ingreso y no se presenta como una cuarta sede completa de la Licenciatura.
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

## Estado actualizado 2026-08-20

- La UI cubre las 184 identidades canónicas vigentes del inventario: siete ya existentes en el catálogo curado y 177 proyecciones generadas, además del Plan 1997 histórico de Ingeniería en Computación.
- De las proyecciones generadas, 93 tienen composición utilizable y 84 permanecen seleccionables con un estado vacío explícito porque Bedelías no publicó una composición suficiente.
- Nueve planes generados incorporan sedes respaldadas por auditoría oficial; las opciones territoriales no se extrapolan a los restantes planes.
- El manifiesto reproducible es `data/bedelias/inventory/ui-extracted-plans.json`, con hash de reporte `sha256:2d283a8f120d8d863b0e667fca9a0d9db31acfd7c9f601b82e80ec03c83fde03`.
