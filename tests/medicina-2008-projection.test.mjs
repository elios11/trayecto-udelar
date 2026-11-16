import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const source = read("../data/official-trajectories/medicina-2008-grilla.json");
const plan = read("../app/data/bedelias-generated/bedelias-fmed-doctor-en-medicina-2008.json");
test("Medicina ofrece la misma grilla oficial, sin duplicaciones ni candidatos, en ambas sedes", () => {
  assert.equal(plan.campuses.length, 2);
  for (const campus of plan.campuses) {
    const view = buildRegisteredPlanPresentation(campus.defaultPathwayId, plan);
    assert.equal(view.generated, false);
    assert.match(view.description, /CIO Salud/);
    const byId = new Map(view.courses.map(c => [c.id,c]));
    assert.equal(byId.size, 25);
    assert.deepEqual(view.periods.map(p => p.courseIds.map(id => {
      const course = byId.get(id);
      return [course.bedeliasCode,course.credits];
    })), source.periods.map(p => p.rows.map(([code,,credits]) => [code,credits])));
  }
});
test("la grilla no da por cumplidas las actas ni los créditos flexibles", () => {
  assert.equal(plan.plan.minCredits,741);
  assert.match(plan.plan.notice,/RCPA y RCRP y 60 créditos flexibles/);
  assert.deepEqual(plan.creditStructure.credentials.map(c => c.minTotalCredits),[741,395]);
  assert.deepEqual(plan.creditStructure.credentials.map(c => c.requiredCourseGroups.map(g => g.minCompleted)),[[25,1],[18,1]]);
  assert.ok(plan.creditStructure.credentials.every(c => c.requiredCourseGroups.some(g => g.id === "validacion-final-plan")));
});
