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
