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

test("el cotejo ISEF distingue el tronco, las opciones y las identidades ambiguas en las tres sedes", () => {
  const crosswalk = audit.bedeliasCrosswalk;
  const technicalIds = [
    ...crosswalk.commonCodes.flat().filter(Boolean),
    ...crosswalk.annualCodes,
    ...Object.values(crosswalk.optionCodes).flat(),
    ...crosswalk.deporteChoiceCodes,
  ];
  assert.equal(technicalIds.length, 62);
  assert.equal(new Set(technicalIds).size, technicalIds.length);
  assert.deepEqual(crosswalk.commonCodes.map((rows) => rows.length), audit.common.map((rows) => rows.length));
  assert.equal(crosswalk.annualCodes.length, audit.annualCommon.length);
  assert.deepEqual(crosswalk.seminarioSemesters, [7, 8]);
  assert.equal(crosswalk.deporteChoiceCodes.length, audit.deporteChoice.rows.length);
  const missing = crosswalk.commonCodes.flatMap((rows, index) =>
    rows.flatMap((id, column) => id === null ? [[index + 1, column]] : []));
  assert.deepEqual(missing, crosswalk.unresolvedCommon.map(({ semester, index }) => [semester, index]));
  const branches = {
    "practicas-corporales": "173 - OPCIÓN PRÁCTICAS CORPORALES",
    salud: "172 - OPCIÓN SALUD",
    "tiempo-libre-y-ocio": "174 - OPCIÓN TIEMPO LIBRE Y OCIO",
    deporte: "171 - OPCIÓN DEPORTE",
  };
  for (const path of [crosswalk.snapshot, ...crosswalk.regionalSnapshots]) {
    const courses = JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8")).plan.courses;
    const byCode = new Map();
    for (const code of technicalIds) {
      const matches = courses.filter((row) => row.code === code);
      assert.equal(matches.length, 1, `${path}: ${code}`);
      byCode.set(code, matches[0]);
    }
    const hasBranch = (course, prefix) =>
      course.curriculumPaths.some((trail) => trail.some((node) => node.startsWith(prefix)));
    let commonCredits = 0;
    for (const code of [...crosswalk.commonCodes.flat().filter(Boolean), ...crosswalk.annualCodes]) {
      const course = byCode.get(code);
      assert.ok(hasBranch(course, "2030 - TRONCO COMÚN"), code);
      commonCredits += course.credits;
    }
    for (const row of crosswalk.unresolvedCommon) {
      assert.ok(audit.sources[row.source]?.startsWith("https://isef.udelar.edu.uy/"));
      for (const code of row.candidateCodes) {
        assert.ok(!byCode.has(code), code);
        const candidate = courses.find((course) => course.code === code);
        assert.ok(candidate && hasBranch(candidate, "2030 - TRONCO COMÚN"), code);
        assert.equal(candidate.credits, row.credits, code);
      }
      commonCredits += row.credits;
    }
    assert.equal(commonCredits, audit.minimumCredits.common, path);
    for (const [key, codes] of Object.entries(crosswalk.optionCodes)) {
      assert.equal(codes.length, audit.options[key].length);
      for (const [index, code] of codes.entries()) {
        const course = byCode.get(code);
        const [, name, officialCredits] = audit.options[key][index];
        const conflict = crosswalk.creditConflicts[code];
        if (conflict) {
          assert.equal(conflict.official, officialCredits);
          assert.notEqual(conflict.official, conflict.bedelias);
          assert.ok(audit.sources[conflict.source]);
        }
        assert.ok(hasBranch(course, branches[key]), code);
        assert.equal(course.credits, conflict?.bedelias ?? officialCredits, code);
        if (name === "Seminario") assert.match(course.name, /^SEMINARIO /);
      }
    }
    for (const code of crosswalk.deporteChoiceCodes) {
      const course = byCode.get(code);
      assert.ok(hasBranch(course, branches.deporte), code);
      assert.equal(course.credits, 6, code);
    }
  }
});
