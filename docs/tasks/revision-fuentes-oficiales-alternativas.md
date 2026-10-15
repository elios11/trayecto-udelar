# Revisión de trayectorias con fuentes oficiales alternativas

## Motivo y alcance

En Astronomía 2016 un enlace EVA roto llevó a clasificar la trayectoria como `research-pending`, pese a que el Anexo 2 del Plan 2016 está publicado íntegro en el Diario Oficial. Esta lista evita repetir el error; no declara que las carreras siguientes tengan una malla encontrada ni cambia su estado sin auditoría.

## Cola de revisión

- **Reconciliada: Astronomía 2016**, `bedelias-fcien-licenciatura-en-astronomia-2016`. El [Diario Oficial de 30/03/2017, páginas PDF 56–57](https://www.impo.com.uy/diariooficial/2017/03/30/avisos.pdf) publica los ocho semestres originales y el recurso EVA modificado en 2023, todavía enlazado por el Departamento aunque devuelva HTTP 404 directo, conserva contenido íntegramente indexado con los rótulos actualizados. Currícula reproduce esa versión como trayectoria sugerida y mantiene la reserva de acceso/versionado.
- **Fuente identificada, aún sin reconciliar: Bioquímica 2017**, `bedelias-fcien-licenciatura-en-bioquimica-2017`. La [presentación institucional 2025 de la Comisión de Carrera y el Instituto de Química Biológica](https://eva.fcien.udelar.edu.uy/mod/resource/view.php?id=1150&redirect=1), páginas PDF 10–11, contiene «Trayectoria sugerida para el primer año» y «Trayectoria sugerida para los años 2–4», con materias y períodos. Confirmar que corresponde al mismo Plan 2017 y contrastar su vigencia y versiones antes de cambiar la proyección.
- **Prioridad: otros planes de Facultad de Ciencias aún `research-pending`**: Biología Humana 2004, Ciencias Biológicas 2017, Ciencias de la Atmósfera 2007, Física 2019, Física Médica 2025, Geografía 2018, Geología 2018 y Matemática 2014. Revisar departamento, Facultad, Colibri y, si el plan fue publicado allí, IMPO; cotejar versiones antes de cambiar estado. No se ha comprobado aún que repitan el problema de Astronomía.
- **Resto de planes pendientes**: continuar con la cola generada en `data/official-trajectories/inventory.json`, que registra `research-pending` e `official-trajectory-identified-pending` por ID. Ante enlace roto o acceso restringido, repetir la búsqueda en fuentes institucionales alternativas antes de cerrar la investigación. Este documento no reemplaza el inventario ni `docs/carreras-a-actualizar.md`.

## Criterio de cierre por carrera

Guardar fuente, autoridad, fecha, versión, alcance y filas normalizadas bajo `data/`; contrastar con el plan que el servicio presenta como vigente; registrar conflictos y correspondencias con Bedelías; regenerar y probar Currícula, planificador e inventario. Si una versión posterior no es accesible, mantener visible esa reserva en vez de afirmar certeza que la evidencia no permite.
