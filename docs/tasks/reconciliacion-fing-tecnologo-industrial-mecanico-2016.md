# D03m — Trayectorias oficiales del Tecnólogo Industrial Mecánico 2016

## Estado y modelo

Nodo preparado tras D03l. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D03a y D03k integrados.

## Objetivo

Reproducir los seis semestres de los cuatro perfiles guía publicados por FING para el Plan 2016: Fluidos y Energía, Diseño Mecánico y Materiales, Planta y Producción. Conservar una única carrera y progreso para Montevideo y Paysandú y la opción de currícula personalizada flexible. El planificador debe incluir todas las materias verificadas y optativas/electivas disponibles, sin IDs duplicados.

## Fuentes

- Plan de Estudios 2016 publicado por FING y Diario Oficial: https://www.fing.edu.uy/sites/default/files/2012/6564/Plan_Tecnologo_Ind_Mecanico_diario_oficial.pdf
- Bloques semestrales de los cuatro perfiles publicados por FING: https://www.fing.edu.uy/sites/default/files/2012/6564/Bloque%20semestre%20tecn%C3%B3logo%20industrial%20mec%C3%A1nico_2016.pdf
- Página vigente de plan y perfiles: https://www.fing.edu.uy/es/grado/tecnomec/plan-de-estudios
- Bedelías sólo respalda identidad, códigos, créditos actuales y composición; no demuestra por sí sola períodos ni vigencia de alternativas.

Registrar URL, autoridad, fecha, huella y alcance de cada archivo utilizado. Contrastar que la guía de perfiles siga vigente en 2026; una fuente histórica no basta si fue sustituida.

## Reglas académicas

- Reproducir etiquetas, orden, cursos y alternativas por semestre y perfil. No convertir los perfiles guía en títulos ni hacer acumulativas sus alternativas.
- Conservar 270 créditos, ocho mínimos, 28 créditos optativos, Pasantía y validación del currículo coherente. No sustituir los mínimos por la suma de los ejemplos, que difiere entre perfiles.
- Mantener separadas las discrepancias documentadas: Materiales y Diseño 42 frente a 40, Instrumentación 8 frente a 10, Instalaciones de gases 10 frente a 12. Resolver su presentación mediante fuente vigente y anotación trazable, sin cambiar créditos por ajuste aritmético.
- No inventar oferta por sede o período. La carrera completa se ofrece en Montevideo y Paysandú bajo el mismo plan; la disponibilidad concreta de optativas puede variar.
- Toda materia de la trayectoria oficial debe conservar al menos una identidad canónica visible en Currícula. Mantener candidatos recuperables fuera de la oferta normal y sin conteo oficial.
- Si la secuencia completa no puede cotejarse, conservar el fallback provisional y documentar el bloqueo; el inventario permanece pendiente.

## Implementación y verificación

- Crear fuente curada y generador determinista/reanudable sin red, preferentemente siguiendo D03l. Guardar descargas y artefactos temporales en `tmp/d03m-tim-2016/` dentro del worktree.
- Actualizar auditoría, inventario y `PROJECT_CONTEXT.md` sólo con hechos confirmados.
- Probar correspondencia estructurada de períodos y colocaciones, cuatro perfiles, currícula personalizada, sedes, catálogo completo y ausencia de IDs duplicados.
- Regenerar dos veces y verificar hashes idénticos. Ejecutar pruebas focales, `npm test`, `npm run lint` y `git diff --check`.
- Crear un commit enfocado en un worktree basado en el `main` más reciente. Entregar hash, fuentes, alcance, pruebas y riesgos; no integrar, pushear ni publicar desde el subagente.
