# D03aw — Licenciatura en Biología Humana

## Estado y alcance

Nodo de auditoría curricular sobre `main` `5596c2c`. Se estudia únicamente `bedelias-fcien-licenciatura-biologia-humana-2004`, carrera compartida de 360 créditos con currículo individual. El inventario D03 la clasifica `research-pending`; la auditoría anterior reconstruyó mínimos y sedes, no demostró trayectoria sugerida ni ausencia.

## Objetivo

Determinar si Facultad de Ciencias, FHCE u otra autoridad Udelar competente publica una malla, grilla o recorrido sugerido vigente para este plan, en general o por sede. Si existe, reproducirlo con sus períodos y opciones sin convertir el inmenso catálogo de Bedelías en obligaciones. Si la documentación oficial confirma que sólo existen planes individuales sin secuencia común, registrar `no-official-trajectory-documented` con evidencia positiva; si el silencio persiste, conservar `research-pending`. En ambos casos la UI debe mantener un recorrido provisional visible y correctamente rotulado.

## Fuentes y contrastes iniciales

- Plan en Colibrí: `https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/24551/1/PLBIHU_2020.pdf`.
- FHCE: `https://fhce.edu.uy/licenciatura-en-biologia-humana/`.
- Catálogo Udelar: `https://udelar.edu.uy/carrera/licenciatura-biologia-humana`.
- Carreras Interior: `https://udelar.edu.uy/carrerasinterior/licenciatura-en-biologia-humana-3/`.
- Auditoría existente en `data/bedelias/audits/official-source-audits.json` y proyección en `app/data/bedelias-generated/`.

Buscar además publicaciones de Facultad de Ciencias, Comisión Curricular y sedes regionales; ante enlaces rotos, copias de la misma autoridad en Colibrí, portal Udelar o IMPO. Contrastar 2004/2011, duración 48/60 meses y alcance de sedes. EVA y composición de Bedelías no prueban una secuencia oficial.

## Reglas de implementación

1. Separar la evidencia de plan, trayectoria, catálogo y oferta. No promover los 1.797 registros administrativos por semejanza ni por mera inclusión en la composición.
2. Conservar IDs, progreso, 360 créditos, currículo flexible, tutor y validación de pasantía. Una carrera compartida no se duplica por servicio o sede.
3. Versionar evidencia normalizada en `data/` con autoridad, URL, fecha, vigencia, alcance, filas o identidades cotejadas y huellas reproducibles; proporcionar comando de regeneración offline.
4. Actualizar inventario y revisión con tests focales. Agregar a `docs/carreras-a-actualizar.md` sólo si hay publicación progresiva o territorial parcial confirmada, no por simple falta de investigación.
5. No declarar completa una malla ni inventar semestres o cargas. Si falta una decisión de fuente, documentar condición concreta de nueva revisión.

## Entrega

Pruebas focales, dos regeneraciones, `npm test`, `npm run lint`, `git diff --check`; commit enfocado en este worktree y hash con limitaciones. Sin integrar, push ni despliegue desde el nodo.
