# D03p — Trayectorias oficiales de Ingeniería Industrial Mecánica 1997

## Estado y modelo

Nodo preparado después de D03o. Modelo `gpt-5.6-sol`, esfuerzo `xhigh`. Depende de D01, D03a y D03k integrados.

## Objetivo

Reconciliar los diez semestres de los tres perfiles guía publicados por FING en 2016 —Fluidos y Energía, Diseño Mecánico y Materiales, Ingeniería de Planta— y los tramos iniciales de Paysandú y Tacuarembó. Mantener una sola carrera, plan, título y progreso, con currícula personalizada y guías sustituibles. El planificador debe reunir las materias verificadas y alternativas acreditables sin IDs repetidos.

## Fuentes prioritarias

- Plan 1997 Udelar: https://www.colibri.udelar.edu.uy/jspui/bitstream/20.500.12008/43888/1/PLMEC_1997.pdf
- Bloques por perfil FING 2016: https://www.fing.edu.uy/sites/default/files/2016/26628/20160603%20bloques%20semestrales%20por%20perfil%20v%202016.pdf
- Trayecto inicial Paysandú: https://www.fing.edu.uy/sites/default/files/2025-02/curriculos-paysandu-v2.pdf
- Trayecto inicial Tacuarembó: https://www.fing.edu.uy/sites/default/files/2024-12/curriculos-tacuarembo-v2.pdf
- Ficha vigente Udelar: https://udelar.edu.uy/carrera/ingenieria-industrial-mecanica

Verificar vigencia, alcance y contenido de esas publicaciones; registrar autoridad, URL, fecha y huella de artefactos. Bedelías contrasta identidad, créditos y previaturas, no decide los períodos oficiales.

## Reglas

- Cotejar etiquetas, orden y colocaciones completas de los tres perfiles guía y las sedes parciales. Toda materia enumerada oficialmente conserva al menos una identidad canónica visible.
- Paysandú y Tacuarembó sólo muestran los semestres iniciales demostrados y explican continuidad; no se infiere una carrera completa local.
- La guía de Tacuarembó repite Administración y Gestión de las Organizaciones I: conservar la referencia temporal sin duplicar unidad ni créditos.
- Mantener 450 créditos, los doce mínimos fijos, alternativa Electrotecnia/Química de 18 créditos, profundización de 25 créditos en una sola materia, Taller, Pasantía, Proyecto y aprobación del currículo individual.
- Los tres perfiles son guías que no completan necesariamente los mínimos; no convertir sus créditos orientativos en reglas de egreso. No anticipar la propuesta de plan sucesor no vigente.
- Conservar materias verificadas del catálogo como opciones del planificador, no como obligaciones semestrales. Candidatos de Bedelías y equivalencias dudosas permanecen fuera de la experiencia normal.
- Si la correspondencia no se demuestra, mantener el estado pendiente y el recorrido provisional, registrando la brecha sin atribuir períodos inventados a FING.

## Verificación y entrega

- Crear fuente curada y generador determinista sin red. Guardar descargas/checkpoints en `tmp/d03p-industrial-mecanica-1997/` dentro del worktree.
- Actualizar auditoría, inventario y `PROJECT_CONTEXT.md` sólo con resultados confirmados.
- Probar colocaciones exactas, sedes, materia repetida, requisitos, catálogo y unicidad de IDs. Regenerar dos veces con hashes idénticos; ejecutar focales, `npm test`, `npm run lint` y `git diff --check`.
- Crear commit enfocado en worktree aislado desde el `main` más reciente. Entregar hash, evidencia, verificaciones y riesgos; no integrar, pushear ni publicar desde el subagente.

## Cierre de implementación

- Los tres perfiles de 2016 y los tramos iniciales de Paysandú y Tacuarembó quedan cotejados: 157/157 colocaciones oficiales, con la repetición de Administración I en Tacuarembó documentada pero contada una sola vez.
- El planificador reúne 84 identidades reales verificadas y cuatro bloques estructurales; 374 entradas de Bedelías permanecen candidatas, fuera de la experiencia normal. Las diferencias entre los totales impresos, las sumas de filas y los créditos vigentes se conservan explícitas.
- La fuente curada conserva seis fuentes oficiales con fecha y SHA-256. El generador sin red produjo los mismos hashes de la proyección, el reporte y el inventario en dos ejecuciones sucesivas.
- Verificación local final: 13/13 pruebas focales, `npm test` 949/949, `npm run lint` correcto y `git diff --check` limpio. Próximo paso: integrar el commit de este worktree sobre el `main` más reciente, repetir pruebas y lint, y publicar sólo después de esos controles.
