# D03ac — Tecnicatura en Tecnologías de la Imagen Fotográfica 2008

## Estado y objetivo

Nodo preparado para implementación. Reconciliar la trayectoria predeterminada de la Tecnicatura en Tecnologías de la Imagen Fotográfica de Paysandú con el Plan 2008 que Facultad de Artes mantiene enlazado desde la página vigente de la carrera.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`; depende de D01, D02 y D03a integrados. Un único subagente en worktree dedicado desde el `main` actual. El coordinador revisa e integra.

## Alcance académico

- Verificar la vigencia y autoridad del [Plan de Estudios de Facultad de Artes](https://www.artes.udelar.edu.uy/wp-content/uploads/2023/09/PLAN_DE_ESTUDIOS_TECNICATURA_FOTOGRAFIA_web_v.2.pdf), aprobado por Consejo IENBA (24/11/2008) y CDC (16/12/2008), todavía enlazado en la [página de carrera](https://www.artes.udelar.edu.uy/carrera/tecnicatura-en-tecnologias-de-la-imagen-fotografica/). Confirmar sede Paysandú, seis semestres y 240 créditos; documentar la contradicción de los 60 meses de la ficha central y Bedelías frente a los tres años del plan.
- Leer visualmente la tabla de la segunda página del PDF, no sólo su texto extraído: los semestres 3–6 y los seminarios opcionales aparecen en columnas que la extracción lineal desordena. Conservar el orden, ubicación y carga de cada fila exactamente como figure en el documento. Si el PDF resulta inaccesible o alguna ubicación no puede distinguirse, no inventarla y registrar el bloqueo.
- Cotejar las materias de la grilla con `data/bedelias/cenurln-tecnicatura-en-tecnologias-de-la-imagen-fotografica-2008.json`. El snapshot contiene códigos como EPI–EPIV, TFI–TFV, IUR, SOPI/SOPII, STEA y TFE, pero esa composición administrativa no prueba por sí sola las materias Fotografía I–V ni la distribución real de Taller LOEP; crear identidades de fuente si son necesarias y no atribuirles códigos inventados. Conservar IDs y progreso previo, sin equivalencias por similitud.
- Modelar correctamente optativas y Trabajo Final: una fila opcional no debe convertirse en obligación acumulativa, y el total aprobado de 240 créditos debe reconciliarse contra las seis cargas semestrales de 40. Distinguir créditos de actividades, requisitos de semestre y título.
- No importar la grilla de la Licenciatura en Fotografía de Montevideo ni de la Tecnicatura en Artes Plásticas y Visuales: son programas distintos.
- Versionar fuente normalizada bajo `data/cenurln/` con URL, autoridad, fecha, vigencia, alcance, filas cotejadas y huella reproducible; agregar generador offline y pruebas deterministas. Actualizar auditoría, proyección, inventario y `PROJECT_CONTEXT.md` sólo con hechos verificados; `docs/carreras-a-actualizar.md` sólo si se descubre anuncio de malla futura o cobertura parcial.

## Verificación y entrega

- Pruebas focales de seis períodos, orden, créditos, catálogo visible y flexibles, identidad/progreso, exclusión de candidatas y no confusión con otras carreras. Doble regeneración offline estable.
- Ejecutar `npm test`, `npm run lint` y `git diff --check`. Para cualquier cambio visual, validar el flujo en la app si las herramientas lo permiten y no afirmar validación visual de la UI si sólo hubo build.
- Crear commit enfocado; registrar aquí resultado, cobertura, fuentes, comandos, validación y próximo paso. No integrar, pushear ni desplegar desde el worktree.
