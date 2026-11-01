import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildNotariadoCrosswalk } from '../scripts/build-notariado-2016-crosswalk.mjs';

test('el cotejo cubre todas las filas oficiales y preserva las contradicciones técnicas', async () => {
  const report = await buildNotariadoCrosswalk({ write: false });
  assert.equal(report.counts.rows, 57);
  assert.equal(report.counts.flexibleSlots, 4);
  assert.deepEqual([...new Set(report.rows.map(r => r.semester))], [1,2,3,4,5,6,7,8,9,10]);
  const registral = report.rows.filter(r => r.semester === 6 && /Registral/.test(r.officialLabel));
  assert.deepEqual(registral.map(r => r.candidates[0].credits), [10,6]);
  assert.ok(registral.every(r => r.conflict));
  assert.ok(report.rows.find(r => r.semester === 10 && /Parte 1/.test(r.officialLabel)).conflict);
  assert.ok(report.rows.every(r => !('verified' in r) && !('aliases' in r)));
  const saved = JSON.parse(await readFile(new URL('../data/fder/notariado-2016-crosswalk.json', import.meta.url), 'utf8'));
  assert.deepEqual(report, saved);
});
