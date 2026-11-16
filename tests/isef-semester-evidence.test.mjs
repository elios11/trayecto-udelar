import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const audit = JSON.parse(readFileSync(
  new URL("../data/bedelias/audits/isef-licenciatura-2017-semester-evidence.json", import.meta.url),
  "utf8",
));

const credits = (rows) => rows.reduce((total, row) => total + row[2], 0);

test("ISEF 2017 conserva ocho semestres y dos prácticas anuales únicas", () => {
  assert.equal(audit.common.length, 8);
  assert.deepEqual(audit.annualCommon.map(([semesters]) => semesters), [[5, 6], [7, 8]]);
  const names = [...audit.common.flat(), ...audit.annualCommon.map(([, name]) => name)];
  assert.equal(names.length, 31);
  assert.equal(new Set(names).size, names.length);
});

test("las opciones suman 60 créditos; Deporte exige cuatro modalidades, no las siete", () => {
  assert.deepEqual(Object.keys(audit.options).sort(),
    ["deporte", "practicas-corporales", "salud", "tiempo-libre-y-ocio"]);
  for (const [option, rows] of Object.entries(audit.options)) {
    for (const [semester, , value] of rows) {
      assert.ok(Number.isInteger(semester) && semester >= 5 && semester <= 8);
      assert.ok(Number.isInteger(value) && value > 0);
    }
    const selected = option === "deporte" ? audit.deporteChoice.requiredCredits : 0;
    assert.equal(credits(rows) + selected, audit.minimumCredits.option);
  }
  const { requiredCount, requiredCredits, rows } = audit.deporteChoice;
  assert.equal(requiredCount, 4);
  assert.equal(rows.length, 7);
  assert.equal(new Set(rows.map(([, name]) => name)).size, rows.length);
  assert.ok(rows.every(([semester, , value]) => [6, 7, 8].includes(semester) && value === 6));
  assert.equal(requiredCredits, requiredCount * 6);
});
