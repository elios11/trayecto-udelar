# D03j — Cierre de trayectorias identificadas de Facultad de Química

## Estado

Especificación lista para implementación en un worktree aislado basado en `main` después de D03i.

## Objetivo

Cerrar las tres trayectorias de Facultad de Química que aún tienen fuente oficial identificada pero no correspondencia exacta:

- Bachiller en Ciencias Químicas, Plan 2000, como título intermedio sin ingreso directo;
- Licenciatura en Tecnologías de la Química, Plan 2022;
- Técnico Bachiller en Ciencias Químicas, Plan 2015, como carrera vigente con ingreso directo.

El nodo debe reproducir los períodos y recorridos oficiales, mantener separadas las dos identidades de Bachiller y conservar en el planificador el catálogo completo verificado de cada plan, incluidas sus opciones flexibles.

## Fuentes obligatorias

Usar y verificar visualmente las fuentes oficiales ya registradas en `data/official-trajectories/inventory.json` y `data/bedelias/audits/official-source-audits.json`. Guardar descargas y renderizados temporales bajo `tmp/d03j-fq-cierre/`.

Jerarquía:

1. dameros y resoluciones vigentes de Facultad de Química para períodos y secuencia;
2. planes de estudio y fichas de carrera para títulos, créditos, mínimos y flexibilidad;
3. catálogo Udelar y publicaciones territoriales para vigencia, ingreso y sedes;
4. Bedelías sólo para contrastar identidades ya respaldadas;
5. EVA nunca crea pertenencia, obligatoriedad ni orden.

## Alcance funcional

### Bachiller en Ciencias Químicas 2000

- Conservarlo como título intermedio vigente para estudiantes de los planes de origen, sin ingreso directo y sin confundirlo con la Tecnicatura 2015.
- Reproducir el damero oficial para sus cinco recorridos de origen: Bioquímico Clínico, Químico Farmacéutico, Químico, Ingeniería de Alimentos e Ingeniería Química.
- Modelar correctamente el núcleo común, las unidades específicas y los 230 créditos sin crear cinco carreras distintas.

### Licenciatura en Tecnologías de la Química 2022

- Reproducir nueve semestres para Biotecnología y Nanotecnología según los dameros vigentes, conservando un único título de 360 créditos.
- Mantener Practicantado o Proyecto como alternativas finales y los créditos flexibles como catálogo, sin hacer obligatoria toda la oferta.
- Registrar sin ocultar las diferencias entre la duración original del plan, los metadatos actuales y la implementación vigente.

### Técnico Bachiller en Ciencias Químicas 2015

- Reproducir cinco semestres en Montevideo según la Resolución 112/2026.
- Conservar Bioquímica Opción II, Laboratorio de Bioquímica, los mínimos oficiales y 50 créditos flexibles.
- Limitar Salto al primer año demostrado y explicar la continuidad; no proyectar la composición completa de CENURLN como oferta territorial.

## Reglas transversales

- Los rótulos y la cantidad de períodos deben coincidir con la fuente oficial vigente.
- Toda materia publicada en una trayectoria debe conservar una identidad canónica visible.
- El planificador debe ofrecer la unión completa sin duplicados de materias verificadas en trayectorias y catálogos del plan; el recorrido activo sólo determina su semestre sugerido.
- No publicar candidatos, registros administrativos, equivalentes históricos ni variantes de Bedelías no respaldadas.
- No inferir previas, equivalencias, sedes u obligatoriedad por similitud textual.
- Registrar las discrepancias documentales y priorizar la fuente curricular correspondiente.

## Artefactos y verificación

- Actualizar auditorías, revisiones curadas, proyecciones y el inventario D03.
- Añadir pruebas focalizadas para períodos, recorridos, créditos, sedes, separación de identidades y catálogo completo del planificador.
- Ejecutar generadores e inventario dos veces y comprobar estabilidad determinista.
- Ejecutar pruebas focalizadas, `npm test`, `npm run lint` y `git diff --check`.
- Documentar aquí fuentes, resultados, límites y estado recuperable.
- Crear un commit enfocado y devolver su hash; no integrar, hacer push ni publicar desde el subagente.
