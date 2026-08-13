# Reglas incompletas de Bedelías

## Problema

El importador expandía como máximo 12 nodos del árbol de previaturas. En reglas extensas quedaban operadores lógicos visibles pero sin descendientes. Un grupo `debe tener alguna` vacío se evaluaba como falso y podía bloquear una materia para siempre. La primera manifestación reportada fue Fisicoquímica 102 (`508A`) de Química Farmacéutica Plan 2015.

Los bloques negativos no causaban ese bloqueo: un check verde en `No tener aprobada ninguna de estas equivalencias` significa correctamente que la exclusión se cumple. Sin embargo, la lista interior se redactaba en positivo y resultaba engañosa.

## Solución estable

- El extractor agota todos los nodos colapsados, con un límite defensivo alto y error explícito si el árbol no termina de abrirse.
- Al reanudar, descarta del checkpoint únicamente las reglas estructuralmente incompletas para volver a consultarlas sin repetir el resto del plan.
- La normalización y la validación identifican cualquier operador `all`, `any` o `none` sin opciones ni descendientes.
- Los generadores nunca publican una regla incompleta como evaluable: la materia queda marcada con cobertura parcial y la regla no bloquea el avance.
- La interfaz repite esa protección para cualquier proyección futura y redacta en negativo las equivalencias excluyentes.

## Auditoría actual

Al implementar la corrección, el problema solo estaba presente en `data/bedelias/fq-quimica-farmaceutica-2015.json`: 8 reglas (`508A`, `102`, `303A`, `702X`, `700`, `701X`, `579A` y `06A`). Los snapshots de las demás carreras incorporadas no contenían grupos lógicos vacíos.

## Cierre antes de terminar la app

1. Ejecutar `npm run bedelias:audit-rules` para listar snapshots pendientes.
2. Reejecutar el comando original de extracción de cada plan afectado. La reanudación vuelve a consultar solamente las reglas incompletas.
3. Regenerar las proyecciones correspondientes.
4. Ejecutar `npm run bedelias:audit-rules -- --strict`; debe finalizar sin hallazgos.
5. Ejecutar `npm test` y `npm run lint` sobre el resultado combinado.

No se deben rellenar manualmente ramas faltantes ni interpretar un árbol incompleto como ausencia de previaturas.
