import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-linguistica-2014.json");
const officialAudit = audits.audits.find(({ identity }) => identity === "linguistica:2014");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "licenciado-linguistica");
const courses = new Map(projection.courses.map((course) => [course.bedeliasCode ?? course.id, course]));

test("publica una sola Licenciatura en Lingüística vigente en Montevideo", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Lingüística")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fhum");
  assert.deepEqual(matches[0].career.plans, [{
    id: "bedelias-fhum-linguistica-2014",
    label: "Plan 2014 · vigente",
    defaultTrajectoryId: "trayectoria-flexible",
    defaultCredentialId: "licenciado-linguistica",
  }]);
  assert.deepEqual(
    [projection.plan.degreeTitle, projection.plan.durationMonths, projection.plan.minCredits],
    ["Licenciado en Lingüística", 48, 360],
  );
  assert.deepEqual(projection.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "trayectoria-flexible",
  }]);
});

test("modela una trayectoria flexible sin inventar menciones", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["trayectoria-flexible"]);
  assert.equal(projection.pathways["trayectoria-flexible"].credentialId, "licenciado-linguistica");
  assert.equal(officialAudit.conclusion.canonicalModel, "one-degree-flexible-trajectory");
  assert.match(projection.plan.notice, /malla de ocho semestres es sugerida/);
});

test("controla los tres bloques de egreso y los cuatro mínimos fundamentales", () => {
  const targets = new Map(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.deepEqual(
    [targets.get("ling-fundamental"), targets.get("ling-optionals"), targets.get("ling-electives")],
    [255, 50, 55],
  );
  assert.equal(255 + 50 + 55, 360);
  assert.deepEqual(
    [targets.get("ling-area-a"), targets.get("ling-area-b"), targets.get("ling-area-c"), targets.get("ling-area-d")],
    [48, 65, 52, 75],
  );
  assert.equal(48 + 65 + 52 + 75, 240);
  assert.deepEqual(
    [targets.get("ling-language"), targets.get("ling-seminars"), targets.get("ling-social-practice")],
    [8, 46, 10],
  );
});

test("asigna áreas, seminarios y prácticas sin duplicar el crédito total", () => {
  assert.equal(courses.get("LI4").eligibleRequirementIds[0], "ling-area-a");
  assert.equal(courses.get("LI120").eligibleRequirementIds[0], "ling-area-b");
  assert.equal(courses.get("LI176").eligibleRequirementIds[0], "ling-area-c");
  assert.ok(courses.get("20").eligibleRequirementIds.includes("ling-area-d"));
  assert.ok(courses.get("20").eligibleRequirementIds.includes("ling-seminars"));
  assert.ok(courses.get("EXT").eligibleRequirementIds.includes("ling-area-d"));
  assert.ok(courses.get("EXT").eligibleRequirementIds.includes("ling-social-practice"));
  assert.ok(courses.get("ALEM").eligibleRequirementIds.includes("ling-language"));
});

test("exige IVU, orientación, dos seminarios y validación final", () => {
  const groups = new Map(credential.requiredCourseGroups.map((group) => [group.id, group]));
  assert.equal(groups.get("ling-university-introduction").minCompleted, 1);
  assert.equal(groups.get("ling-entry-orientation").minCompleted, 1);
  assert.equal(groups.get("ling-two-seminars").minCompleted, 2);
  assert.equal(groups.get("ling-two-seminars").courseIds.length, 10);
  assert.equal(groups.get("validacion-final-plan").minCompleted, 1);
});

test("presenta ocho semestres y no acredita los bloques flexibles ficticiamente", () => {
  const pathway = projection.pathways["trayectoria-flexible"];
  for (let semester = 1; semester <= 8; semester += 1) {
    assert.ok(pathway.periods.some(({ label }) => label === `Semestre ${semester}`));
  }
  const flexibleBlocks = projection.courses.filter(({ name }) => name.startsWith("Elegí "));
  assert.equal(flexibleBlocks.length, 9);
  assert.ok(flexibleBlocks.every(({ credits, curricularBlock }) => credits === 0 && curricularBlock));
  assert.match(officialAudit.anomalies.find(({ field }) => field === "suggestedCurriculumTotal").resolution, /366/);
});

test("conserva catálogo y previaturas sin volver obligatorias las recomendaciones", () => {
  assert.equal(projection.courses.length, 237);
  assert.equal(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).length, 227);
  assert.equal(new Set(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map(({ bedeliasCode }) => bedeliasCode)).size, 226);
  assert.equal(projection.rules.length, 40);
  assert.equal(projection.plan.noPublishedRule, 184);
  assert.equal(projection.courses.filter(({ credits }) => credits === 0).length, 72);
  assert.match(officialAudit.anomalies.find(({ field }) => field === "prerequisites").resolution, /40 reglas explícitas/);
});
