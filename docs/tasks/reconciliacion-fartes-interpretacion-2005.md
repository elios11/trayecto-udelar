# D03an — Licenciatura en Interpretación Musical, Plan 2005

## Estado y objetivo

Nodo preparado para implementación. `bedelias-fartes-licenciatura-en-interpretacion-musical-2005` permanece en `research-pending` aunque la auditoría anterior identificó las menciones oficiales, los mínimos y la Actividad de Graduación: falta correspondencia estructurada de las grillas de ocho semestres. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a. Un worktree y un solo subagente, basados en el `main` posterior a D03am.

## Autoridad y límites

- Cotejar íntegramente el [Plan 2005 de la Escuela Universitaria de Música](https://www.artes.udelar.edu.uy/wp-content/uploads/2023/09/plan_2005_libro_naranja.pdf), especialmente las grillas de Instrumentos y Canto (páginas impresas 20–21), con la [página institucional actual](https://www.artes.udelar.edu.uy/carrera/licenciaturas-instituto-de-musica/) y la [admisión 2026](https://www.artes.udelar.edu.uy/admisiones/). Inspeccionar visualmente las tablas y registrar URL, autoridad, fecha, vigencia, páginas/filas y huellas reproducibles.
- Reutilizar `data/bedelias/fartes-licenciatura-en-interpretacion-musical-2005.json` y la auditoría existente; no repetir extracción. Las menciones instrumentales comparten una grilla de Instrumentos con la materia de instrumento correspondiente; Canto tiene su grilla propia. Conservar ocho períodos, tronco común sin duplicar IDs, 360 créditos, mínimos de electivas/proyectos y Actividad de Graduación. Cotejar códigos únicamente por identidad oficial exacta; usar bloques sólo-fuente cuando el Plan no individualice código, edición o instrumento.
- Distinguir oferta de ingreso vigente de continuidad de menciones históricas: la auditoría ya señala Corno y Trombón sin ingreso publicado para 2026. No eliminarlas ni presentarlas como ingreso actual sin evidencia. Mantener esta licenciatura separada de Música 2005 y de planes 1987; no inferir equivalencias ni transferir progreso entre ellos.
- No convertir todos los seminarios de interpretación, proyectos, electivas, instrumentos u ofertas anuales en obligaciones acumulativas. Registrar contradicciones del Plan o de las fuentes complementarias en vez de prorratear créditos silenciosamente.

## Artefactos y cierre

- Versionar evidencia normalizada bajo `data/fartes/` y un generador offline que reconstruya proyección, auditoría, revisión e inventario sin red. Dos regeneraciones idénticas con comandos y huellas documentados.
- Probar cada mención disponible en el selector, ocho períodos, identidad visible de cada unidad oficial, tronco común no duplicado, 360 créditos y mínimos, flexibilidad, Actividad de Graduación, frontera `verified`/`candidate` y separación de Música 2005.
- Actualizar `docs/carreras-a-actualizar.md` sólo ante implementación progresiva, malla futura o cobertura parcial oficialmente demostrada; `PROJECT_CONTEXT.md` sólo ante decisión estable.
- Ejecutar focales, `npm test`, `npm run lint` si cambia código y `git diff --check`. Commit enfocado en el worktree; el coordinador revisa e integra. No push ni despliegue desde el worktree.
