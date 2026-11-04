import { readFile, writeFile, rename } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = async p => JSON.parse(await readFile(new URL(p, root), 'utf8'));
// Transcripción de C. Curso, no de las columnas de área, que tienen conflictos.
const credits = [[15,8,9,6,6],[5,4,6,6,6,9,10],[14,8,12,6,4],[7,10,12,11,6],
  [12,8,8,6,4,10],[6,10,12,14],[6,12,7,2,8,10],[8,14,7,2,14],[12,7,6,9,2,8],[6,7,4,2,12,2,6,7]];
const bindings = { '1:1':'11.2U', '1:2':'11.3', '1:3':'11.4U', '1:4':'11.5', '1:5':'11.6', '6:3':'32.1', '6:4':'32.2U' };
// Columnas de área transcritas literalmente. No normalizar sus discrepancias
// para hacerlas coincidir con C. Curso o los mínimos del pie de la grilla.
const areas = [
  [{socio:2,publico:13},{socio:8},{socio:9},{socio:6},{privado:6}],
  [{socio:5},{socio:4},{privado:6},{publico:6},{socio:4,practica:2},{socio:7,practica:2},{social:10}],
  [{socio:2,privado:12,practica:2},{socio:6,practica:2},{publico:10,practica:2},{socio:4,practica:2},{socio:4}],
  [{publico:7},{privado:10},{publico:12},{social:10,practica:1},{flexibles:6}],
  [{privado:10,practica:2},{publico:8},{practica:8},{publico:6},{publico:4},{practica:10}],
  [{publico:6},{practica:10},{publico:12},{privado:12,practica:2}],
  [{social:6},{privado:10,practica:2},{publico:7},{publico:2},{privado:8},{social:10}],
  [{privado:6,practica:2},{practica:14},{practica:7},{privado:2},{flexibles:14}],
  [{practica:12},{practica:7},{practica:6},{practica:9},{social:2},{flexibles:8}],
  [{practica:6},{practica:7},{social:4},{practica:2},{socio:10,practica:2},{publico:3},{publico:6},{flexibles:7}],
];
const evidence = await read('data/fder/notariado-2016-evidence.json');
const technical = await read('data/fder/notariado-2016-technical-evidence.json');
const codes = new Map(technical.sources.flatMap(s => s.rows.map(r => [r.code, {...r, sourceUrl:s.url}])));
const rows = evidence.sourcePortion.semesterRows.flatMap((period, p) => {
  assert.equal(period.labels.length, credits[p].length);
  assert.equal(period.labels.length, areas[p].length);
  assert.equal(credits[p].reduce((a,b)=>a+b,0), evidence.sourcePortion.semesterCredits[p]);
  return period.labels.map((name, i) => {
    const code = bindings[`${period.semester}:${i+1}`];
    if (code) assert.equal(codes.get(code)?.credits, credits[p][i]);
    const flexible = /opcional o electiva/i.test(name);
    return { id:`notariado-grilla-s${period.semester}-r${i+1}`, semester:period.semester,
      sourcePage:period.page, name, credits:credits[p][i],
      printedAreaCredits:areas[p][i],
      areaAllocationStatus:Object.values(areas[p][i]).reduce((a,b)=>a+b,0) === credits[p][i] ? 'source-consistent' : 'source-conflict',
      kind:flexible?'flexible-slot':'official-course',
      ...(code ? { bedeliasCode:code, technicalSourceUrl:codes.get(code).sourceUrl } : {}),
      ...(period.semester===6 && i<2 ? { conflict:'La carga teórico/práctico de la grilla contradice los códigos técnicos: se conserva identidad sólo-fuente.' } : {}),
      ...(period.semester===10 && i===5 ? { conflict:'C. Curso publica 2; la columna Derecho Público publica 3. Se conserva la contradicción.' } : {}),
    };
  });
});
assert.equal(rows.length,57);
assert.equal(rows.reduce((sum,r)=>sum+r.credits,0),450);
assert.equal(rows.filter(r=>r.kind==='flexible-slot').reduce((s,r)=>s+r.credits,0),35);
assert.equal(rows.filter(r=>r.bedeliasCode).length,7);
const observedAreaTotals = {};
for (const row of rows) for (const [area, value] of Object.entries(row.printedAreaCredits)) observedAreaTotals[area] = (observedAreaTotals[area] ?? 0) + value;
const result = { schemaVersion:1, planId:evidence.planId, reviewedAt:'2026-11-04',
  authority:evidence.authority, sourceUrl:evidence.curriculumUrl, sourcePdfSha256:evidence.sourcePdfSha256,
  evidenceHash:createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),
  policy:'Filas de la grilla vigente. Los códigos sólo se asignan con corroboración institucional; los bloques flexibles representan cupos y no oferta nominal.',
  rows,
  observedAreaTotals,
  printedFooterAreaCredits:Object.fromEntries(['socio','publico','privado','social','practica','flexibles'].map((key,i)=>[key,evidence.sourcePortion.gridCreditsByArea[i]])),
  pending:['Validar la contradicción entre columnas, C. Curso y totales del pie antes de automatizar acreditación por áreas.',
    'Regla de cohorte del seminario, antes de publicar una nueva obligación sobre progreso histórico.',
    'Proyección de períodos y unión del catálogo del planificador.'],
};
const target = new URL('data/fder/notariado-2016-curricular-rows.json',root);
await writeFile(new URL(`${target.href}.tmp`),`${JSON.stringify(result,null,2)}\n`);
await rename(new URL(`${target.href}.tmp`),target);
console.log('Notariado: 57 filas, 450 créditos, 35 flexibles y 7 códigos inequívocos.');
