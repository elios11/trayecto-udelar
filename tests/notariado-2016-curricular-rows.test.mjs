import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => JSON.parse(readFileSync(new URL(`../data/fder/${p}`,import.meta.url),'utf8'));
test('las filas curriculares conservan cada rótulo oficial sin forzar códigos conflictivos',()=>{
  const {rows} = read('notariado-2016-curricular-rows.json');
  const source = read('notariado-2016-evidence.json').sourcePortion;
  assert.deepEqual(rows.map(r=>r.name),source.semesterRows.flatMap(p=>p.labels));
  assert.equal(new Set(rows.map(r=>r.id)).size,57);
  assert.deepEqual(source.semesterRows.map(p=>rows.filter(r=>r.semester===p.semester).reduce((s,r)=>s+r.credits,0)),source.semesterCredits);
  assert.equal(rows.filter(r=>r.kind==='flexible-slot').reduce((s,r)=>s+r.credits,0),35);
  assert.ok(rows.filter(r=>/Registral/.test(r.name)).every(r=>!r.bedeliasCode && r.conflict));
  const codes = new Map(read('notariado-2016-technical-evidence.json').sources.flatMap(s=>s.rows.map(r=>[r.code,r])));
  const bound = rows.filter(r=>r.bedeliasCode);
  assert.equal(bound.length,7);
  for(const row of bound) assert.equal(codes.get(row.bedeliasCode)?.credits,row.credits);
});
