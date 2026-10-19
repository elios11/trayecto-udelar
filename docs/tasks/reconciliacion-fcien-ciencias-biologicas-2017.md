# D03ax — Licenciatura en Ciencias Biológicas

## Estado y objetivo

Auditar sólo `bedelias-fcien-licenciatura-en-ciencias-biologicas-2017` sobre base `main` `2a3aead`. El inventario D03 la mantiene `research-pending`, aun cuando los mínimos oficiales del plan ya están reconstruidos. Determinar si existe una malla, grilla o trayectoria sugerida publicada y vigente con materias y períodos; reproducirla de ser verificable. Si la autoridad documenta positivamente sólo currículos personalizados sin secuencia común, registrar ausencia documentada con fecha y disparador de revisión. No inferir ausencia por silencio o enlace roto.

## Evidencia inicial

- Plan alojado en Colibrí: `https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/24553/1/PLCBIO_2020.pdf`.
- Reglamento FCIEN: `https://eva.fcien.udelar.edu.uy/pluginfile.php/197669/mod_label/intro/Reglamento%20del%20Plan%20de%20Estudios%202017%20de%20la%20Licenciatura.pdf`.
- Registro jurídico Udelar: `https://dgjuridica.udelar.edu.uy/422-reglamento-del-plan-de-estudio-de-la-licenciatura-en-ciencias-biologicas/`.
- Carrera Udelar: `https://udelar.edu.uy/carrera/licenciatura-en-ciencias-biologicas`.
- Auditoría `data/bedelias/audits/official-source-audits.json`; proyección `app/data/bedelias-generated/bedelias-fcien-licenciatura-en-ciencias-biologicas-2017.json`.

Buscar también publicaciones de FCIEN y Comisión de Carrera, incluyendo copias oficiales en Colibrí, portal Udelar e IMPO si falla un enlace. Confrontar Plan aprobado llamado 2015 con identidad de implementación 2017; separar Ciclo en Biología-Bioquímica regional de la licenciatura en Montevideo. EVA y Bedelías no son por sí solos malla oficial.

## Criterios

1. Preservar un título, progreso, 360 créditos, 210 comunes, 140 de orientación y 10 de prácticas integrales, junto con tutoría y Trabajo Final. No crear menciones certificadas desde campos disciplinares.
2. No promover los 842 códigos / 978 apariciones administrativas sin respaldo curricular vigente. No dejar la UI sin recorrido orientativo visible si no se verifica grilla oficial.
3. Guardar evidencia normalizada versionada bajo `data/`: autoridad, URL, fecha, vigencia, alcance, filas/identidades cotejadas, huella y comando de regeneración offline. Mantener `docs/carreras-a-actualizar.md` sólo si se confirma publicación progresiva o sede parcial.
4. Actualizar revisión, inventario y pruebas focales. No inventar períodos, créditos, equivalencias o oferta efectiva.

## Entrega

Dos regeneraciones idénticas, pruebas focales, `npm test`, `npm run lint`, `git diff --check`; commit enfocado sólo en este worktree, hash y limitaciones. No integrar, pushear ni publicar desde el nodo.
