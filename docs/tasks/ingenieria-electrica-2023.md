# Ingeniería Eléctrica - Plan 2023 - Montevideo

## Identidad verificada

- Servicio: Facultad de Ingeniería (FING).
- Carrera: Ingeniería Eléctrica, código FING 22-8.
- Sede solicitada: Montevideo.
- Plan: Plan 2023. Fue aprobado por CFI y CDC en 2022, entró en vigencia el 1/1/2023 y Bedelías lo identifica como 2023.
- Título: Ingeniero Eléctrico / Ingeniera Eléctrica.
- Duración nominal: 60 meses.
- Créditos mínimos: 450.
- No se encontró un título intermedio publicado para este plan; no se modelará uno.

## Cobertura de fuentes al 2026-08-09

La procedencia estructurada está en `data/fing/electrica-2023-fuentes.json`.

- Bedelías/SGAE: 221 unidades/equivalencias en composición, de las cuales 173 son locales de FING y 48 pertenecen a otros servicios o sedes.
- Previaturas: 250 entradas consultadas; 233 reglas publicadas (155 de curso y 78 de examen) y 17 consultas sin regla publicada.
- Plan oficial: 450 créditos y mínimos por cuatro grupos y 24 áreas de formación.
- Trayectoria inicial: dos láminas oficiales con Matemática Inicial, una general (277 créditos en ocho semestres) y otra para Potencia (276 créditos).
- Perfiles: planilla oficial versión 2026 con perfil básico y perfiles Electrónica, Señales y Aprendizaje Automático, Telecomunicaciones, Ingeniería Biomédica, Potencia y Control.
- Optativas/electivas: Bedelías determina presencia, código, créditos y áreas posibles; la planilla de perfiles aporta conjuntos recomendados y condiciones específicas. Una recomendación de perfil no se convertirá en obligación general.

## Criterios de implementación

- Mostrar el plan como `Plan 2023 · vigente`; mencionar 2022 solo como año de aprobación.
- Mantener carrera, plan, sede y perfil como dimensiones separadas del progreso local.
- Proyectar una trayectoria de núcleo común y las variantes de perfil publicadas; los semestres son sugeridos y no implican oferta efectiva.
- Mantener el catálogo ampliado separado de la carga inicial para no aumentar innecesariamente el paquete del navegador.
- Evaluar curso y examen por separado. `noPublishedRule` significa consulta realizada sin regla publicada, no ausencia comprobada de previas.
- Mostrar mínimos del plan general como oficiales. Los mínimos o conjuntos adicionales de un perfil deben conservar procedencia de la planilla 2026.
- No inventar título intermedio, oferta semestral, continuación de la trayectoria sin Matemática Inicial ni resoluciones específicas no localizadas.

## Pendientes documentales explícitos

- El recurso de EVA “Trayectoria sin Mat Inicial - todos los perfiles” no resolvió su destino desde el acceso invitado; no se usará hasta recuperar el documento.
- El recurso adicional de Control entregó un contenedor HTML, no un archivo directo; la planilla 2026 cubre su trayectoria y notas.
- No se localizaron documentos adicionales separados para Señales/AA y Telecomunicaciones; sus datos se conservarán con procedencia de la planilla 2026.
- La cobertura de previaturas alcanza todas las unidades locales encontradas, pero la interfaz debe distinguir reglas publicadas, consultas sin regla y equivalencias externas no consultadas.

## Estado de la tarea

- Auditoría institucional: completa; la condición especial de actividad de curso de Diseño Lógico quedó normalizada y el snapshot no conserva nodos sin interpretar.
- Proyección web: implementada con 112 bloques de trayectoria, 36 unidades de núcleo común, siete perfiles y catálogo diferido de 165 materias/equivalencias adicionales.
- Interfaz: navegación Facultad de Ingeniería → Ingeniería Eléctrica → Plan 2023 → perfil, requisitos de grado sin título intermedio inventado, espacios optativos explícitos, procedencia y estados de cobertura de previaturas.
- Verificación focalizada: generador reproducible, compilación y pruebas curriculares completas; la suite general y el lint final se registran en `.codex/TASK.md`.
- Publicación, push e integración en `main`: fuera de alcance sin autorización explícita.
