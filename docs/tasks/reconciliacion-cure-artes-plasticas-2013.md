# D03ak — Tecnicatura en Artes Plásticas y Visuales, Rocha 2013

## Estado y objetivo

Nodo implementado. `bedelias-cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013` pasa de `research-pending` a `official-trajectory-reproduced`: reproduce los seis semestres oficiales de Rocha con quince correspondencias exactas y conserva dos entradas auxiliares como candidatas. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a. Un worktree y un subagente, basados en el `main` posterior a D03aj.

## Autoridad y límites

- Cotejar las tres páginas del [Plan publicado por Facultad de Artes para Rocha](https://www.artes.udelar.edu.uy/wp-content/uploads/2023/09/Tecnicatura_Artes-Artes_Plasticas_y_Visuales.pdf), las fuentes institucionales actuales y cualquier resolución o programa pertinente. Registrar URL, autoridad, fecha de consulta, vigencia, alcance, páginas/filas y huellas reproducibles. Si no se puede confirmar que el Plan 2013 sigue vigente, no presentarlo como vigente por inferencia de Bedelías.
- Reutilizar el snapshot `data/bedelias/cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013.json` y la auditoría existente; no repetir la extracción. Resolver correspondencias exactas de las unidades y los seminarios de contenido variable sin exigir todas las opciones disponibles a la vez. Los seis semestres oficiales suman 240 créditos, 40 por período, e incluyen Proyecto de Egreso en sexto.
- Mantener este plan de Rocha separado del Plan 2017 de Rivera: no transferir identidades, códigos, calendario aprobado ni progreso entre sedes. No crear equivalencias por semejanza de nombres.
- Conservar unidades auxiliares no curriculares como candidatas o fuera de la trayectoria, según autoridad comprobada; no sustituir un semestre por «Validación de egreso».

## Artefactos y cierre

- Versionar evidencia normalizada bajo `data/fartes/` y crear un generador offline que reconstruya proyección, auditoría, revisión e inventario sin reconsultar fuentes. Ejecutarlo dos veces y documentar comandos y huellas idénticas.
- Probar seis períodos, mínimos oficiales, identidad visible de cada unidad requerida, seminarios alternativos, Proyecto de Egreso único, frontera `verified`/`candidate` y separación de Rivera.
- Si la fuente oficial anuncia implementación progresiva, plan futuro o cobertura parcial, actualizar `docs/carreras-a-actualizar.md` en el mismo commit. Actualizar `PROJECT_CONTEXT.md` sólo si cambia una decisión estable.
- Ejecutar focales, `npm test`, `npm run lint` si cambia código y `git diff --check`. Crear commit enfocado en el worktree; el coordinador revisa e integra. No push ni despliegue desde el worktree.

## Implementación reproducible

- La evidencia normalizada vive en `data/fartes/cure-artes-plasticas-2013.json`. La huella canónica de `sourcePortions` es `sha256:93c598cae6162a736f21dd5ed107d4ded59f26cd61e1460a1cd7bf85216607a8` y la del snapshot cotejado es `sha256:92044d53aa9f58575239f4150fd62d6b3a094a73ff49e345017591d544e64c3c`.
- Las tres páginas del Plan fueron renderizadas e inspeccionadas. Su huella cruda es `sha256:bd646d5527965e2c88e919ab288e5d9bd9e5c467511bee8ae5c84ec2b2b0c194`; la página de carrera de Facultad de Artes dio `sha256:07fb3c7c7da3f677024563bbcf2cc6e7f95452e9e87dea2996a37c5a0d217ea2` y la apertura CURE para la generación 2026 `sha256:1531730b028ddce2d780134701ee81b1a2a0c921dae8d602a4dedcef1e8c357c`.
- La fuente vigente de Facultad de Artes confirma Rocha, tres años, los dos cupos de seminario y el Proyecto de Egreso; CURE confirma ingreso en 2026. El resumen HTML publica cargas de quinto semestre que no cierran 40 créditos y contradicen el Plan PDF. La proyección conserva el conflicto y usa el Plan para la estructura curricular.
- Regeneración offline: `npm run trajectory:cure-artes-plasticas-2013`. Dos ejecuciones consecutivas produjeron las mismas huellas: proyección `sha256:fa2784f9362c0f04f8518f34564d29ec510c898bee0752d681a6109e641c571d`, registro de auditorías `sha256:7fa682830ebb51b62c4db95af40f81c02257bf08cc1b5b7aa997fd2652cfefab`, revisiones `sha256:02721384db9317dbfcf03004bb717f723e67cb511fdaf07871783a9c100845df` e inventario `sha256:be51ceae96a8c8a6379864e9344a43c1ff0d4380e9ecb414bd5848364286cd48`.
- AP07 y AP15 se modelan como dos cupos semestrales de contenido variable; no se acumulan todas sus ediciones o propuestas. INUNI y AP16 permanecen candidatas recuperables fuera de la trayectoria y el catálogo normal. Los IDs de progreso `cure-*` se preservan y no se articulan con Rivera 2017.
- No corresponde agregar esta carrera a `docs/carreras-a-actualizar.md`: las fuentes cotejadas muestran una oferta completa y vigente, no una implementación progresiva, malla futura ni cobertura territorial parcial.

## Integración

- Implementación aislada `ad210ce`; integrada en `main` como `9897d4f`.
- Verificación del resultado combinado: `npm test` (1046/1046), `npm run lint` y `git diff --check`, todas correctas. No se hizo push ni despliegue en este nodo.
