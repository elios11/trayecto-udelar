import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const snapshot = await readJson("data/bedelias/cucel-tecnologo-en-produccion-equina-2022.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cucel-tecnologo-en-produccion-equina-2022.json");
const audit = registry.audits.find((entry) => entry.identity === "tecnologo en produccion equina:2022");

test("normaliza Producción Equina como Plan 2021 de tres años y 270 créditos", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, false);
  assert.equal(audit.officialPlan.planYear, "2021");
  assert.equal(projection.plan.year, "2021");
  assert.equal(projection.plan.degreeTitle, "Tecnólogo en Producción Equina");
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.plan.minCredits, 270);
  assert.equal(snapshot.plan.metadata.duration, "6 meses");
  assert.equal(snapshot.plan.metadata.minCredits, 225);
  assert.ok(audit.anomalies.some((entry) => entry.field === "durationMonths"));
  assert.ok(audit.anomalies.some((entry) => entry.field === "minimumCredits"));

  const catalogCareer = catalog.flatMap((faculty) => faculty.careers)
    .find((career) => career.label === "Tecnólogo en Producción Equina");
  assert.deepEqual(catalogCareer.plans.map((plan) => plan.label), ["Plan 2021 · vigente"]);
});

test("publica una sola sede oficial sin inventar una variante territorial", () => {
  assert.deepEqual(projection.campuses, [{
    id: "melo-cerro-largo",
    label: "Melo, Cerro Largo",
    official: true,
    defaultPathwayId: "bedelias",
  }]);
  assert.equal(audit.conclusion.canonicalModel, "one-plan-one-offering");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(audit.conclusion.siteSpecificTrajectoryAvailability, false);
});

test("controla los 270 créditos oficiales por eje y conserva la oferta flexible", () => {
  const expectedRequirements = {
    "basic-required": 36,
    "basic-optional": 15,
    "production-required": 122,
    "production-optional": 29,
    "integral-required": 32,
    "integral-optional": 12,
    "final-project": 24,
  };
  const credential = projection.creditStructure.credentials[0];
  assert.equal(credential.minTotalCredits, 270);
  assert.deepEqual(
    Object.fromEntries(credential.nodeRequirements.map((entry) => [entry.nodeId, entry.minCredits])),
    expectedRequirements,
  );
  assert.equal(Object.values(expectedRequirements).reduce((sum, credits) => sum + credits, 0), 270);

  const availableByNode = Object.fromEntries(Object.keys(expectedRequirements).map((nodeId) => [
    nodeId,
    projection.courses
      .filter((course) => course.eligibleRequirementIds.includes(nodeId))
      .reduce((sum, course) => sum + course.credits, 0),
  ]));
  assert.deepEqual(availableByNode, {
    ...expectedRequirements,
    "basic-required": 40,
  });
  assert.equal(projection.courses.reduce((sum, course) => sum + course.credits, 0), 274);
  assert.match(projection.plan.notice, /oferta optativa puede cambiar/i);
});

test("exige las unidades obligatorias y ordena la trayectoria sugerida en seis semestres", () => {
  const credential = projection.creditStructure.credentials[0];
  assert.deepEqual(
    credential.requiredCourseGroups.map((group) => [group.id, group.minCompleted, group.courseIds.length]),
    [
      ["mandatory-basic", 5, 5],
      ["mandatory-production", 16, 16],
      ["mandatory-integral", 6, 6],
      ["mandatory-final", 1, 1],
    ],
  );
  assert.deepEqual(projection.pathways.bedelias.periods.map((period) => period.label), [
    "Semestre 1",
    "Semestre 2",
    "Semestre 3",
    "Semestre 4",
    "Semestre 5",
    "Semestre 6",
    "Oferta vigente sin semestre oficial",
  ]);
  const pathwayCourseIds = projection.pathways.bedelias.periods.flatMap((period) => period.courseIds);
  assert.equal(pathwayCourseIds.length, projection.courses.length);
  assert.equal(new Set(pathwayCourseIds).size, projection.courses.length);
  const currentIntro = projection.courses.find((course) => course.bedeliasCode === "CUR-UNIV");
  assert.deepEqual(currentIntro.eligibleRequirementIds, ["basic-required"]);
  assert.ok(!credential.requiredCourseGroups.some((group) => group.courseIds.includes(currentIntro.id)));
});
