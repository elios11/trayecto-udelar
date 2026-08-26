import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const plan = await readJson("app/data/bedelias-generated/bedelias-fartes-licenciatura-en-danza-contemporanea-2018.json");
const audit = registry.audits.find(({ identity }) => identity === "licenciatura en danza contemporanea:2018");

test("audita Danza Contemporánea como una carrera común de 360 créditos", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-degree-common-structure-eight-credit-requirements");
  assert.equal(audit.conclusion.siteSpecificTrajectoryAvailability, false);
  assert.equal(audit.officialPlan.durationMonths, 48);
  assert.equal(audit.officialPlan.semesters, 8);
  assert.equal(audit.officialPlan.minimumCredits, 360);
  assert.equal(audit.officialPlan.curriculum.creditRequirements.reduce((sum, requirement) => sum + requirement.minCredits, 0), 360);
  assert.match(audit.anomalies.find(({ field }) => field === "axisTotals").resolution, /43 créditos/);
});

test("proyecta los ocho mínimos oficiales sin sumar toda la oferta flexible", () => {
  assert.deepEqual([plan.plan.year, plan.plan.durationMonths, plan.plan.minCredits], ["2018", 48, 360]);
  assert.equal(plan.plan.auditStatus, "official-evidence-complete");
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Montevideo"]);
  assert.deepEqual(Object.keys(plan.pathways), ["bedelias"]);
  assert.deepEqual(
    plan.creditStructure.nodes.slice(1).map(({ id, minCredits }) => [id, minCredits]),
    [
      ["creation", 81],
      ["research", 34],
      ["theory-history", 43],
      ["body-studies", 43],
      ["mediation", 20],
      ["optatives", 67],
      ["electives", 36],
      ["final-project", 36],
    ],
  );
  assert.equal(plan.creditStructure.credentials[0].nodeRequirements.reduce((sum, requirement) => sum + requirement.minCredits, 0), 360);
  assert.ok(plan.courses.reduce((sum, course) => sum + course.credits, 0) > plan.plan.minCredits);
  assert.match(plan.plan.notice, /67 créditos optativos y 36 electivos/);
});

test("conserva el catálogo elegible por eje y separa el trabajo final", () => {
  assert.deepEqual(
    plan.pathways.bedelias.periods.map(({ label }) => label),
    [
      "Creación artística",
      "Investigación",
      "Teórico-histórico · arte y danza",
      "Teorías y estudios del cuerpo",
      "Mediación",
      "Optativas",
      "Electivas",
      "Electivas · créditos revalidados",
      "Trabajo Final de Egreso",
    ],
  );
  const finalCourses = plan.courses.filter((course) => course.eligibleRequirementIds.includes("final-project"));
  assert.deepEqual(finalCourses.map(({ credits }) => credits), [18, 18]);
  assert.equal(finalCourses.reduce((sum, course) => sum + course.credits, 0), 36);
  assert.ok(plan.courses.some((course) => course.eligibleRequirementIds.includes("optatives")));
  assert.ok(plan.courses.some((course) => course.eligibleRequirementIds.includes("electives")));
  assert.ok(!plan.courses.some((course) => ["ENBA-CD1", "ENBA-CM1", "ENBA-CTD1"].includes(course.bedeliasCode)));
  assert.ok(plan.courses.every((course) => course.eligibleRequirementIds[0] !== "plan-total"));
});
