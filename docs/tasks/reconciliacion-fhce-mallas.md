# D03 piloto — Mallas sugeridas de FHCE

## Estado

Piloto urgente de D03 completado para la Tecnicatura Universitaria en Corrección de Estilo, Plan 2014. La fuente oficial ya estaba inventariada, pero su estructura semestral no se proyectaba en Currícula.

## Objetivo

Usar las mallas o trayectorias sugeridas que publica FHCE como fuente curricular de mayor autoridad que la composición de Bedelías. La estructura principal debe seguir los semestres sugeridos; el área, el tipo y los créditos de cada fila permanecen como metadatos y reglas de egreso.

## Caso piloto: Corrección de Estilo

- Fuente de malla por semestre: `https://fhce.edu.uy/wp-content/uploads/2025/01/pdf-Malla-por-semestre-TUCE-feb-2025.pdf`.
- Fuente del plan: `https://fhce.edu.uy/wp-content/uploads/2023/01/TUCE_2014_s_a.pdf`.
- Representar cuatro períodos `1.er semestre` a `4.º semestre`.
- Conservar el área oficial de cada unidad mediante `creditAllocations` y los mínimos 84/56/26/14.
- Publicar como materias actuales sólo las identidades exactas usadas por la malla de febrero de 2025.
- Representar optativas y electivas genéricas como bloques curriculares oficiales cuando la malla no publica una identidad única.
- Conservar códigos anteriores y alternativas de Bedelías como candidatos o equivalencias históricas recuperables, fuera de Currícula.
- No fusionar por semejanza de nombres ni borrar progreso previo.
- Mantener el aviso de que la secuencia es sugerida y puede variar con la oferta.

## Generalización FHCE

- El mismo patrón debe aceptar las dos vistas oficiales de FHCE: por semestre para la trayectoria y por área para mínimos/asignaciones.
- La reconciliación es por código o identidad documentada; la malla visual no habilita coincidencias aproximadas automáticas.
- Cada carrera se promueve en un commit revisable con conteos antes/después y una prueba que cubra períodos, áreas y candidatas restantes.
- Priorizar después las carreras de FHCE que ya tienen ambos archivos oficiales y mayor contaminación en Bedelías.

## Cierre del piloto

- Currícula de TUCE muestra cuatro semestres y no cinco grupos por área.
- Cada materia visible pertenece a la malla sugerida oficial o es un bloque flexible explícito.
- Las variantes antiguas dejan de aparecer como materias vigentes, pero siguen recuperables.
- Los 180 créditos y mínimos por área se calculan igual que antes.
- `npm test` y `npm run lint` pasan; la proyección regenerada es determinista.

## Estado recuperable

- Fuente oficial verificada y piloto implementado en el generador.
- TUCE proyecta 20 identidades verificadas en cuatro semestres (46, 47, 55 y 45 créditos), 155 candidatas y 8 equivalencias históricas conservadas.
- Generación, `npm test` (900 pruebas) y `npm run lint` completados correctamente.
- No se realizó una inspección visual interactiva; la estructura y la exclusión de variantes quedan cubiertas por pruebas de proyección.
- Siguiente paso del nodo: extender el patrón carrera por carrera a las demás mallas oficiales de FHCE, sin deduplicación aproximada.
