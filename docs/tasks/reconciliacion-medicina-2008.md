# Doctor en Medicina 2008: cotejo para la proyección

## Alcance

Reproducir la malla vigente de Medicina 2008 para un único plan y progreso. Conservar Montevideo y la oferta intersede de Región Litoral Norte (Paysandú y Salto). La referencia de primer año corresponde a la grilla del plan; en la región, el ingreso es por el CIO Salud Trayectoria Medicina reconocido como primer año. No duplicar el internado ni dividir los cursos anuales entre semestres sin respaldo por unidad.

## Evidencia cotejada (2026-11-16)

La [tabla de previaturas de FMed](https://www.fmed.edu.uy/gestion/bedelia/dr-en-medicina/sistema-de-previaturas), enlazada desde ingreso 2027, enumera 25 unidades distribuidas en seis tramos semestrales y cuatro tramos de dos semestres. La transcripción normalizada está en `data/official-trajectories/medicina-2008-grilla.json`, con huella `sha256:d7d8445d7a84fe864ac78b59115ee9bb7385d84ce6452358edb568fd2fbe7303`.

`node scripts/verify-medicina-2008-grilla.mjs` verifica sin red la cobertura, subtotales, internado, presencia de códigos únicos y diferencias frente a los dos snapshots. Ambos coinciden en 23 de las 25 cargas. La grilla indica Clínica Quirúrgica 58 y Metodología Científica 2, 24; los snapshots indican 57 y 25. Ambas fuentes suman 110 en sexto año; conservar la discrepancia por unidad, sin compensaciones posteriores.

La [página de títulos](https://www.fmed.edu.uy/gestion/bedelia/dr-en-medicina/tramite-de-titulos-y-certificados) confirma 60 flexibles para el egreso (15 optativos y 10 electivos como mínimos) y dos actas de reanimación adicionales al internado. Para el título intermedio pide cuarto año completo más 20 flexibles. Estos requisitos no tienen ubicación semestral en la tabla de 25 filas. La resolución enlazada en la página del plan está fechada en 2013 en el documento, aunque el enlace descriptivo dice 2023.

## Pendiente

Proyectar las 25 ubicaciones con cargas de Facultad y los IDs existentes. Mostrar aparte los requisitos flexibles y de reanimación: no sumar otra vez los 60 créditos a la meta del plan sin resolver la relación con el mínimo de 741, ni usar las 25 unidades como certificación automática de egreso. Verificar que ambas sedes compartan progreso y que el aviso explique el CIO; probar Currícula y planificador antes de publicar. No publicar como vigentes las equivalencias históricas ni el catálogo flexible administrativo.
