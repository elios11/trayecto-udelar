# Seguridad

Trayecto Udelar es un proyecto estudiantil no oficial. Actualmente funciona sin cuentas ni backend de usuarios: el avance académico y la planificación permanecen en el almacenamiento local del navegador. Aun así, una exportación de progreso puede revelar información académica personal y debe tratarse como un dato privado.

## Versiones contempladas

Las correcciones de seguridad se aplican a la versión desplegada y a la rama `main`. No se mantienen ramas históricas independientes.

## Reportar una vulnerabilidad

No abras un issue público ni adjuntes exportaciones reales, credenciales o datos personales. Usa el formulario privado **Security > Advisories > Report a vulnerability** del repositorio. Si esa opción todavía no está disponible, informa únicamente que necesitas un canal privado, sin publicar detalles explotables.

Incluye, cuando sea posible:

- componente y versión o commit afectado;
- impacto observable;
- pasos mínimos de reproducción con datos ficticios;
- navegador y sistema operativo;
- mitigación sugerida, si la conoces.

Intentaremos confirmar la recepción en siete días y comunicar una evaluación inicial en catorce. Estos plazos son objetivos de un proyecto mantenido por estudiantes, no un acuerdo de nivel de servicio.

## Alcance

Son especialmente relevantes los fallos que permitan ejecutar código no confiable, exfiltrar o alterar progreso local sin consentimiento, insertar contenido activo mediante importaciones, comprometer el pipeline de extracción o CI, filtrar secretos, o presentar datos académicos manipulados como oficiales.

Errores de contenido curricular sin impacto de seguridad pueden reportarse como issues normales, siempre sin datos personales. La indisponibilidad de sistemas de terceros como Bedelías, EVA o Sites queda fuera del control del proyecto.

## Manejo de credenciales

El repositorio no debe contener secretos. Las credenciales de GitHub, hosting, dominios o servicios futuros deben almacenarse exclusivamente en el gestor de secretos del proveedor correspondiente y con privilegios mínimos. Si una credencial aparece en Git, hay que revocarla o rotarla de inmediato; eliminarla de un commit posterior no la vuelve segura.

El `project_id` de `.openai/hosting.json` identifica el proyecto de despliegue y no concede acceso por sí mismo. Nunca debe sustituirse por tokens, cookies ni credenciales.

## Divulgación responsable

Pedimos tiempo razonable para investigar y corregir antes de publicar detalles. No accedas a datos de otras personas, no interrumpas servicios institucionales ni realices pruebas que generen carga abusiva. La investigación de buena fe y de bajo impacto será tratada de forma colaborativa.
