# D03y — Trayectoria oficial de Economía Agrícola y Agronegocios 2022

## Estado y objetivo

Nodo preparado. Reconciliar Currícula y planificador de la Licenciatura en Economía Agrícola y Gestión de Agronegocios Plan 2022 con la grilla vigente de FCEA, conservando un único título, progreso y sede en Tacuarembó, con las menciones Investigación y Profesional acreditadas dentro del mismo plan.

Modelo: `gpt-5.6-sol`, esfuerzo `xhigh`. Depende del inventario D03a y del cierre FCEA anterior; ejecutar en un worktree desde el `main` actual.

## Alcance

- Confirmar en la página oficial de FCEA la vigencia y la estructura de grilla, períodos, códigos, créditos, categorías flexibles y recomendaciones por mención. El inventario actual conserva este plan en `research-pending`: no atribuir períodos oficiales sin cotejo fila por fila.
- Comparar cada unidad oficial con la proyección `bedelias-cut-licenciatura-en-economia-agricola-y-gestion-de-agronegocios-2022`. Bedelías verifica identidades y reglas, pero su catálogo acumulado no acredita pertenencia vigente por sí solo. Mantener candidatos y rechazos auditables fuera del catálogo normal.
- Reproducir tronco común y las dos menciones sin duplicar progreso, créditos ni una materia compartida. No transformar toda la oferta opcional en obligación; conservar los mínimos normativos y la distinción entre mención certificada y recomendación dentro de ella.
- Preservar IDs de progreso o documentar equivalencias oficiales explícitas; prestar atención a unidades externas con códigos iguales de servicios diferentes y al subgrupo cuantitativo opcional de Investigación que no enumera materia concreta en el árbol de Bedelías.
- Versionar bajo `data/fcea/` la evidencia curricular normalizada con URL institucional exacta, autoridad, fecha de consulta, vigencia publicada, alcance, filas/códigos y huellas de secciones reproducibles. Registrar aquí el comando de regeneración determinista, sin red ni HTML/PDF crudos, al completar el nodo.
- Actualizar auditoría, inventario, contexto estable y `docs/carreras-a-actualizar.md` sólo según evidencia: si la grilla es parcial, futura o de una sede limitada, consignar la brecha y condición concreta de revisión.

## Verificación y entrega

- Pruebas focales de períodos/ubicaciones, identidad visible de cada materia oficial, unión sin duplicados del planificador, credenciales de mención y estabilidad de IDs personales.
- Ejecutar doble regeneración, pruebas focales, `npm test`, `npm run lint` y `git diff --check`; revisar que el commit no arrastre ruido EOL de otras carreras.
- Crear commit aislado. No integrar, pushear ni desplegar desde el worktree; el coordinador revisará el resultado y repetirá verificaciones sobre `main` combinado.

## Fuentes iniciales a verificar

- [FCEA: Licenciatura en Economía Agrícola y Gestión de Agronegocios](https://fcea.udelar.edu.uy/ensenanza/carreras-en-centros-universitarios-regionales/6743-licenciatura-en-economia-agricola-y-gestion-de-agronegocios.html).
- [Udelar: carrera en el interior](https://udelar.edu.uy/carrerasinterior/licenciatura-en-economia-agricola-y-gestion-de-agronegocios/).
- [Reglamento aprobado por CDC, Diario Oficial](https://www.impo.com.uy/diariooficial/2023/10/19/avisos.pdf).

Los enlaces provienen de una auditoría anterior. Cotejar la grilla y sus documentos enlazados directamente durante esta implementación; no inferir un semestre desde el orden de Bedelías.

## Resultado auditado — 2026-10-06

- La página vigente de FCEA publica una grilla completa de ocho semestres para la única sede Tacuarembó, con 57 filas normalizadas: 30 principales (incluidas las alternativas de Cálculo I) y 27 opciones/electivas o actividades flexibles. Las recomendaciones explícitas se conservaron por mención; las demás opciones no se transforman en obligaciones.
- El artefacto durable quedó en `data/fcea/economia-agricola-2022-trayectorias.json`, con autoridad, URLs institucionales, fecha de consulta, vigencia publicada, alcance, códigos, créditos, áreas, categorías, menciones, mínimos y las identidades externas preservadas por servicio.
- Discrepancias registradas antes de proyectar: CPTAL usa la denominación vigente de la ficha 2026; I111N y el histórico I71 permanecen separados porque ninguna fuente cotejada declara equivalencia; EGAF2 conserva el conflicto no resuelto entre los 5 créditos de la grilla y los 4 de su ficha/snapshot sin imponer una prioridad normativa; las prácticas tienen carga variable; el opcional cuantitativo de Investigación no enumera una materia concreta.
- La huella `sha256:6a534ea3ed446586ad90a7c123432d6d0f8c32fdbb692e2b27d1728103cddb00` fija `JSON.stringify({grid, mentions, trajectories, requirements, crosswalk})` en el orden versionado. El generador la verifica antes de proyectar.
- La proyección confirma 57 identidades verificadas para el planificador y 53 ubicaciones principales contrastadas entre ambas menciones. Las opciones quedan en el catálogo, no se suman como obligatorias. El código histórico `I71` no recibe un alias hacia `I111N` sin equivalencia publicada.
- La ficha institucional vigente de EGAF2 fija 4 créditos y la grilla imprime 5; la interfaz señala la contradicción. Prácticas Curriculares se representa como actividad flexible con carga no publicada y sin acreditación automática. Cálculo I admite MC10 o la secuencia 114A + 128A: se muestran las alternativas de la grilla y se advierte que no se cursan acumulativamente.
- No se detectó publicación curricular parcial ni ampliación anunciada; la oferta opcional puede variar por edición, pero no corresponde agregar esta carrera a `docs/carreras-a-actualizar.md`.

## Regeneración sin extracción

Desde la raíz del repositorio:

```powershell
npm run trajectory:economia-agricola-2022
```

El comando reconstruye auditoría, proyección, colas e inventario desde los datos versionados; no necesita HTML/PDF ni red. Dos ejecuciones consecutivas dejaron idénticos byte a byte los artefactos principales (proyección `8893f104a00b2d1c4698a5ea8b21ee103d389c6b62118209fde66ba7809f1a2f`, inventario `25ac2f329fefc699d76ff8a04d0275af3889904ae917dbe5e31a3dd05af6d0ae`). Para revisar una nueva edición, comparar primero las fuentes institucionales y actualizar explícitamente filas y huella si cambian.
