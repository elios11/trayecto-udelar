# D03ab — Licenciatura en Ciencias Sociales, Salto

## Estado y objetivo

Nodo preparado para implementación. Auditar la Licenciatura en Ciencias Sociales seleccionable como Plan 2009 en CENUR Litoral Norte y reproducir su trayectoria oficial vigente si la fuente la publica. Si no hay evidencia suficiente para distinguir plan, cohorte o secuencia, conservar `research-pending` y entregar un checkpoint verificable, sin inventar semestres.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D01, D02 y D03a integrados. Un solo subagente en worktree dedicado desde el `main` actual; el coordinador revisa e integra.

## Alcance y conflicto conocido

- Resolver explícitamente la identidad y vigencia: la auditoría existente y SGAE registran Plan 2009, mientras la página actual «Enseñanza» de FCS afirma que la carrera de Regional Norte continúa en Plan 1992. No trasladar la malla común de las otras cuatro licenciaturas FCS ni el Ciclo Inicial a esta carrera sin una norma o implementación que lo confirme.
- Buscar primero plan aprobado, reglamento, malla/grilla oficial de la licenciatura en Salto y documentación del CENUR/FCS que identifique cohorte, sede y períodos. Distinguir una malla sugerida de oferta semestral, lista de programas y composición administrativa.
- Cotejar identidades mediante código, créditos y alcance oficial contra `data/bedelias/cenurln-licenciatura-en-ciencias-sociales-2009.json`; conservar candidatos, aliases documentados y progreso personal. No promover las 425 entradas por pertenecer a la composición ni fusionar por semejanza de nombres.
- Si se confirma una trayectoria oficial, modelar períodos, módulos, optativas y variantes exactamente según la fuente. Si se confirma una estructura deliberadamente flexible sin secuencia oficial, documentar con evidencia positiva `no-official-trajectory-documented` y conservar el fallback orientativo correctamente etiquetado. La mera ausencia en búsquedas no basta.
- Versionar fuente normalizada en `data/cenurln/` con URL institucional, autoridad, consulta, vigencia, alcance, identidades cotejadas y huella reproducible. Agregar generador offline determinista y comando de regeneración aquí; actualizar auditoría, inventario, proyección y contexto sólo según evidencia.
- Actualizar `docs/carreras-a-actualizar.md` únicamente si la publicación oficial sigue en desarrollo, anuncia malla futura o cubre parcialmente sede/recorrido, con ID, brecha, fuente y condición concreta de revisión.

## Fuentes de partida, no conclusiones

- [FCS — Enseñanza](https://cienciassociales.edu.uy/ensenanza/): descripción actual que menciona Plan 1992 en Regional Norte.
- [FCS — Mallas curriculares y programas](https://cienciassociales.edu.uy/ensenanza/bedelia-de-grado/mallas-curriculares-y-programas/): comprobar si incluye esta licenciatura específica.
- [Udelar — Estadísticas básicas 2019](https://planeamiento.udelar.edu.uy/portal/wp-content/uploads/sites/33/2020/12/web_Estadisticas-basicas_2019.pdf): registra Ciencias Sociales 2009 en Salto; corroboración administrativa, no malla.
- [Udelar — Memoria 2011](https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/52511/1/Memoria-Udelar-2011.pdf): relata implementación del ciclo inicial y discusión del ciclo avanzado; antecedente histórico, no prueba de vigencia actual.

## Verificación y cierre

- Pruebas focales de autoridad, plan/cohorte, ubicación de materias en períodos, catálogo visible, candidatos recuperables e inventario. Probar que una malla FCS ajena no se importa silenciosamente.
- Doble regeneración offline, `npm test`, `npm run lint` y `git diff --check`; validar visualmente si cambia la UI cuando las herramientas lo permitan.
- Crear commit enfocado, sin push ni despliegue. Registrar al final de esta especificación resultado, cobertura, comandos exactos, última validación, conflictos y siguiente paso recuperable.
