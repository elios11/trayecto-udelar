import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";
import { validateCartographyProjection, validateCartographySource } from "../scripts/build-cartografia-2011.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relative) => JSON.parse(await readFile(new URL(relative, root), "utf8"));
const source = await readJson("data/fing/cartografia-2011-trajectory-review.json");
const snapshot = await readJson("data/bedelias/fing-tecnologo-en-cartografia-2011.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-tecnologo-en-cartografia-2011.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const audit = (await readJson("data/bedelias/audits/official-source-audits.json")).audits
  .find(({ identity }) => identity === source.auditIdentity);

test("conserva un solo Plan 2011 compartido, mínimos y progreso", () => {
  validateCartographySource(source, snapshot);
  validateCartographyProjection(source, projection, inventory.plans.find(({ planId }) => planId === source.planId));
  assert.deepEqual([projection.plan.minCredits, projection.plan.durationMonths], [180, 24]);
  assert.equal(projection.creditStructure.credentials.length, 1);
  assert.equal(projection.creditStructure.credentials[0].minTotalCredits, 180);
  assert.equal(projection.creditStructure.credentials[0].nodeRequirements.reduce((sum, row) => sum + row.minCredits, 0), 144);
  assert.equal(audit.officialPlan.trajectories.length, 1);
});

test("reproduce sólo recomendaciones asignadas por módulo sin equiparar candidatos", () => {
  const presentation = buildRegisteredPlanPresentation("curricula-personalizada", projection);
  assert.equal(presentation.generated, false);
  assert.deepEqual(presentation.periods.map(({ label }) => label), [
    "Módulo I", "Módulo II", "Módulo III", "Módulo IV", "Optativas y currículo personal (sin semestre fijo)",
  ]);
  assert.equal(presentation.periods[2].courseIds.includes("fing-tci21-2"), true);
  assert.equal(presentation.periods[3].courseIds.includes("fing-tci26-2"), true);
  assert.equal(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length, 100);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "TCI13").authorityStatus, "candidate");
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "TCI19").authorityStatus, "candidate");
  for (const id of presentation.periods.slice(0, 4).flatMap(({ courseIds }) => courseIds)) {
    const course = projection.courses.find((entry) => entry.id === id);
    assert.equal(course.authorityStatus, "verified");
    if (course.bedeliasCode) assert.ok(["TCI21", "TCI26"].includes(course.bedeliasCode));
    else assert.equal(course.creditsPublished, false);
  }
});

test("declara la cobertura parcial y el límite de verificación visual", () => {
  const entry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.equal(entry.evidence.partial, true);
  assert.equal(entry.evidence.completeDegreeSequence, false);
  assert.equal(entry.evidence.matchedCoursePlacements, 13);
  assert.match(source.source.visualVerification, /no realizada/);
  assert.match(audit.uiNotice, /parcial/i);
  assert.match(audit.remainingWork, /Cotejar visualmente/);
});
