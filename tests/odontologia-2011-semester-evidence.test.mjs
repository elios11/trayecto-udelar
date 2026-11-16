import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const evidence = read("data/bedelias/audits/odontologia-2011-semester-evidence.json");
const audit = read("data/bedelias/audits/official-source-audits.json").audits
  .find(({ identity }) => identity === evidence.identity);
const snapshot = read(evidence.bedeliasSnapshot);
const byCode = new Map(snapshot.plan.courses.map((course) => [course.code, course]));

test("Odontología conserva 40 identidades troncales sin repetir las unidades que abarcan dos semestres", () => {
  const { periods, finalWork, optatives } = evidence;
  assert.equal(evidence.normalizedRowsHash,
    `sha256:${createHash("sha256").update(JSON.stringify({ periods, finalWork, optatives })).digest("hex")}`);
  const ids = [...evidence.periods.flatMap(({ courseCodes }) => courseCodes), evidence.finalWork.code];
  assert.equal(ids.length, 40);
  assert.equal(new Set(ids).size, ids.length);
  const auditedCore = new Set(audit.officialPlan.curriculum.requiredCourseGroups
    .find(({ id }) => id === "odontologia-nucleo-troncal").sourceCourseIds);
  for (const { prior, current, source, equivalenceConfirmed } of evidence.priorAuditCodeConflicts) {
    assert.ok(!auditedCore.has(prior) && auditedCore.has(current));
    assert.equal(byCode.get(prior).credits, byCode.get(current).credits);
    assert.ok(evidence.sources[source]);
    assert.equal(equivalenceConfirmed, false);
  }
  assert.deepEqual(new Set(ids), auditedCore);
  assert.deepEqual([...new Set(evidence.periods.flatMap(({ semesters }) => semesters))],
    Array.from({ length: 11 }, (_, index) => index + 1));
  let credits = 0;
  for (const code of ids) {
    assert.equal(snapshot.plan.courses.filter((course) => course.code === code).length, 1, code);
    credits += byCode.get(code).credits;
  }
  assert.equal(credits, evidence.minimumCredits.core);
  assert.equal(credits + evidence.minimumCredits.flexible, audit.officialPlan.minimumCredits);
  assert.deepEqual(evidence.periods.filter(({ source }) => source === "regulation").map(({ semesters, courseCodes }) =>
    [semesters, courseCodes]), [[[10], ["5070"]], [[11], ["5071"]]]);
  assert.equal(byCode.get(evidence.finalWork.code).credits, evidence.finalWork.credits);
  assert.equal(evidence.finalWork.fixedSemester, null);
});

test("Odontología registra 20 optativas sin imponerlas ni confundir el Taller con el Trabajo Final", () => {
  assert.equal(evidence.optatives.length, 20);
  const technical = evidence.optatives.filter(([, , code]) => code);
  assert.equal(technical.length, 17);
  assert.equal(new Set(technical.map(([, , code]) => code)).size, technical.length);
  const seenConflicts = [];
  for (const [name, published, code, candidates] of evidence.optatives) {
    if (!code) {
      assert.ok(candidates?.length, name);
      assert.ok(candidates.every((id) => byCode.get(id)?.credits === published), name);
      continue;
    }
    assert.notEqual(code, evidence.finalWork.code);
    const actual = byCode.get(code).credits;
    if (actual !== published) {
      seenConflicts.push(code);
      assert.deepEqual(evidence.optativeCreditConflicts[code], { malla: published, bedelias: actual });
    }
  }
  assert.deepEqual(seenConflicts.sort(), Object.keys(evidence.optativeCreditConflicts).sort());
});
