# D03q — Trayectoria oficial de Ingeniería de Producción 2010

## Estado y modelo

Nodo preparado después de D03p. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D01, D03a y D03p integrados. Ejecutar un solo subagente a la vez; el coordinador revisa e integra.

## Objetivo

Reconciliar la currícula sugerida vigente de Montevideo y los trayectos iniciales publicados para Maldonado, Paysandú, Rivera, Rocha, Salto y Tacuarembó. Conservar una sola carrera, Plan 2010, título y progreso; las sedes regionales sólo ofrecen tramos cuya extensión esté demostrada, con continuidad explícita. El planificador debe contener la unión sin duplicados de materias verificadas en esas trayectorias y opciones flexibles oficialmente respaldadas.

## Fuentes prioritarias

- Plan oficial 2010: https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/43883/1/PLPROD_2010.pdf
- Currícula sugerida 2026 de la Comisión de Carrera: https://eva.fing.edu.uy/pluginfile.php/79190/mod_resource/content/14/Por%20semestre%20-%20Versi%C3%B3n%20en%20espa%C3%B1ol.pdf
- Portal de FING: https://www.fing.edu.uy/carrera/grado/ingenier%C3%ADa-de-producci%C3%B3n
- Trayectos territoriales publicados por FING, URLs y alcance individualizados en `data/official-trajectories/inventory.json` para este plan.

Verificar vigencia, contenido y alcance de cada documento; registrar autoridad, URL, fecha y huella. La composición de Bedelías contrasta identidades, créditos y previaturas, pero no inventa la secuencia ni acredita por sí sola pertenencia vigente. EVA sólo vale como fuente curricular cuando la Comisión de Carrera identifica explícitamente la currícula publicada.

## Reglas de producto

- Cotejar etiquetas, orden y colocaciones de todos los períodos oficiales completos. Cada materia enumerada debe conservar al menos una identidad canónica visible en Currícula; una alternativa no se transforma en obligación universal.
- Mantener los 450 créditos, mínimos por grupos y áreas, 50 créditos electivos, Taller, Pasantía, Proyecto y aprobación del currículo individual según el plan vigente. No convertir totales ilustrativos o tramos regionales parciales en requisitos de egreso.
- Las siete ubicaciones son sedes de un mismo plan y progreso, no carreras distintas. Restringir cada tramo regional a los períodos y unidades comprobados; no inferir una oferta completa local.
- Conservar en el planificador opciones verificadas aunque no estén en el recorrido activo, sin duplicados. Candidatos, equivalencias ambiguas y asientos administrativos permanecen fuera del catálogo normal.
- Ante una correspondencia no demostrada, mantener el estado pendiente y el recorrido provisional, documentando la brecha sin atribuir datos inventados a FING.

## Verificación y entrega

- Crear fuente curada y generador determinista sin red; guardar descargas y checkpoints en `tmp/d03q-produccion-2010/` dentro del worktree.
- Actualizar auditoría, inventario y `PROJECT_CONTEXT.md` solamente con resultados confirmados.
- Probar colocaciones, sedes parciales, requisitos, cobertura del planificador y unicidad de IDs. Regenerar dos veces y cotejar hashes; ejecutar pruebas focales, `npm test`, `npm run lint` y `git diff --check`.
- Crear un commit enfocado en un worktree aislado desde el `main` más reciente. Entregar hash, evidencia, verificaciones, riesgos y paso de reanudación; no integrar, pushear ni publicar desde el subagente.

## Checkpoint recuperable — 2026-10-02

- Completado: se verificaron y conservaron diez fuentes oficiales con fecha y SHA-256; la fuente curada cubre Montevideo y los seis tramos regionales, el catálogo estricto y los requisitos nominales de Pasantía y Proyecto. El generador sin red terminó correctamente y el inventario clasifica el plan como `official-trajectory-reproduced`.
- Cobertura actual: 145 materias reales verificadas y 112 candidatas; siete trayectorias; 174 colocaciones auditadas coinciden 174/174, incluidas las cinco actividades de control curricular compartidas por recorrido. Los períodos académicos comprobados son 19 bloques en Montevideo, 2 semestres en Maldonado/Rivera/Rocha y 4 en Paysandú/Salto/Tacuarembó.
- Artefactos: `data/fing/ingenieria-produccion-2010-trayectorias.json`, `app/data/bedelias-generated/bedelias-fing-ingenieria-de-produccion-2010.json`, `data/official-trajectories/{reviews,inventory}.json` y descargas ignoradas bajo `tmp/d03q-produccion-2010/`.
- Última validación: 33 pruebas focales y de integración pasaron; dos regeneraciones consecutivas produjeron hashes idénticos; `npm.cmd test` pasó la compilación y 951/951 pruebas; `npm.cmd run lint` y `git diff --check` terminaron sin hallazgos. El alcance final quedó revisado y está listo para un commit enfocado.
- Reanudación: si el commit no existe, agregar únicamente los artefactos enumerados en este checkpoint, la fuente/generador, pruebas, contexto y registro de auditoría; crear el commit sin integrar, pushear ni publicar. Si el commit ya existe, entregar su hash al coordinador para integración serial sobre el `main` más reciente.
