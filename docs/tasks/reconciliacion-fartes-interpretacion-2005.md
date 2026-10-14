# D03an — Licenciatura en Interpretación Musical, Plan 2005

## Estado y objetivo

Implementado en el worktree de D03an. `bedelias-fartes-licenciatura-en-interpretacion-musical-2005` pasa de `research-pending` a `official-trajectory-reproduced`: la proyección coteja las diecisiete menciones con las grillas oficiales de ocho semestres, preserva los mínimos de 360 créditos y registra la correspondencia estructurada completa. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a.

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

## Implementación y decisiones

- La evidencia normalizada vive en `data/fartes/interpretacion-musical-2005.json`. Registra las tres fuentes institucionales, la huella SHA-256 del Plan PDF, las páginas impresas 20–21 inspeccionadas visualmente, las porciones fuente reproducibles y la huella canónica de cada una.
- Las dieciséis menciones instrumentales comparten la grilla de Instrumentos y Canto conserva la grilla propia del Plan. Las diecisiete reutilizan los mismos IDs para tronco común y troncales, sin duplicar progreso.
- Se cotejaron 200 identidades técnicas inequívocas y 25 filas oficiales sin código resoluble. La composición técnica repite una segunda ocurrencia de `EUMUS-PC2`, preservada fuera de la grilla; quedan 824 entradas candidatas y ninguna ingresa en los períodos oficiales.
- La transcripción web de Canto no sustituye el Plan PDF: Arte Escénico 3 conserva 6 créditos porque el subtotal oficial de 44 sólo cierra así, y Contrapunto 1 permanece en el quinto semestre porque el subtotal de 41 lo exige.
- Corno y Trombón permanecen como menciones de continuidad registradas en Bedelías, pero la convocatoria 2026 no las presenta como ingreso. No se modificó `docs/carreras-a-actualizar.md` porque no se acreditó una malla futura, una implementación progresiva ni una cobertura territorial parcial.
- Música 2005 y las cuatro carreras históricas de 1987 siguen siendo planes separados; no se infieren equivalencias ni migraciones de progreso.

## Regeneración y verificación

Regeneración offline:

```powershell
npm.cmd run trajectory:fartes-interpretacion-2005
```

El comando actualiza la auditoría, la revisión, la proyección, las colas derivadas y el inventario. Dos ejecuciones consecutivas deben producir la misma huella agregada del árbol modificado; la huella verificada se registra en la entrega del commit.

Comprobaciones de cierre:

```powershell
node tests/fartes-musical-interpretation-official-audit.test.mjs
npm.cmd test
npm.cmd run lint
git diff --check
```

El focal controla fuentes y huellas, diecisiete selectores, ocho períodos por mención, 1005 ubicaciones oficiales, cargas semestrales, IDs compartidos, mínimos no acumulativos, Actividad de Graduación, frontera de autoridad, continuidad 2026 y separación de planes.

## Integración

- Commit aislado: `742d6a6`; incorporado a `main` como `b2fe92a`.
- Sobre el resultado combinado: `npm test` pasó (1057/1057) y `npm run lint` pasó. `git diff --check` no reportó errores.
- No se hizo push ni despliegue. La revisión visual de la aplicación queda pendiente; las pruebas anteriores validan datos y comportamiento automatizado, no la pantalla en un navegador.
