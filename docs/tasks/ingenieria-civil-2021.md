# Ingeniería Civil · Plan 2021

## Objetivo

Incorporar Ingeniería Civil de FING como una carrera independiente, con el Plan 2021 vigente, sus cuatro perfiles oficiales, mínimos de créditos, materias y previaturas verificadas.

## Fuentes institucionales

- Página de carrera FING: <https://www.fing.edu.uy/carreras/grado/ingenieriacivil>
- Comisión de Carrera en EVA: <https://eva.fing.edu.uy/course/view.php?id=773>
- Currículas de los cuatro perfiles, versión 2025-06: <https://eva.fing.edu.uy/pluginfile.php/79334/mod_folder/content/0/Curricula_Todos_Los_Perfiles%20-%20v2025_06.xlsx?forcedownload=1>
- Plan de Estudios 2021 en Colibrí: <https://hdl.handle.net/20.500.12008/43881>
- Composición y previaturas: consulta pública de SGAE Bedelías, snapshot `data/bedelias/fing-ingenieria-civil-2021.json`.

## Resultado implementado

- Carrera `Ingeniería Civil`, Plan 2021 vigente, 450 créditos y título `Ingeniero Civil`.
- Perfiles de Construcción, Estructuras, Hidráulico-Ambiental y Transporte y Vías de Comunicación, con diez semestres cada uno.
- Árbol oficial con cuatro grupos superiores y 19 áreas, con todos sus mínimos de créditos.
- Proyección inicial de las trayectorias y catálogo diferido de la composición restante.
- Reglas de curso y examen publicadas por Bedelías, manteniendo cobertura explícita cuando no hay regla publicada.
- Exclusión visible de 82 entradas administrativas de créditos por reválida; quedan registradas en el artefacto de auditoría del catálogo.
- Compatibilidad de progreso, planificador, período actual, selección académica e importación/exportación local.

## Decisiones de modelado

- Los semestres y perfiles provienen de la planilla oficial de la Comisión de Carrera; Bedelías es la fuente para códigos, pertenencia, créditos y previaturas.
- `Introducción a la Ingeniería Civil` se representa con los 5 créditos de la currícula vigente: 4 en Ciencias Sociales y Económicas y 1 en Expresión.
- `Patología de las Estructuras` se representa con los 6 créditos de la currícula: 2 en Construcción y 4 en Tecnología de Materiales.
- Los proyectos anuales de Estructuras y Transporte se dividen en etapas semestrales sin inventar códigos Bedelías. La segunda etapa requiere completar la primera y ambas conservan el código oficial para resolver previaturas.
- Los totales sugeridos pueden superar el mínimo de 450 créditos: Construcción 454, Estructuras 451, Hidráulico-Ambiental 452 y Transporte 450.

## Reanudación y verificación

```powershell
npm.cmd run bedelias:project:civil
npm.cmd test
npm.cmd run lint
```

El trabajo se mantiene en `feature/ingenieria-civil-2021`; no integrar, publicar ni desplegar sin autorización expresa.
