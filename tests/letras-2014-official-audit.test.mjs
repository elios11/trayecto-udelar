import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-letras-2014.json");
const report = await readJson("data/bedelias/inventory/ui-extracted-plans.json");
const officialAudit = audits.audits.find(({ identity }) => identity === "letras:2014");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "licenciado-letras");
const groups = new Map(credential.requiredCourseGroups.map((group) => [group.id, group]));
const publishedPathway = projection.publishedPathways["trayectoria-flexible"];

test("publica una sola Licenciatura en Letras vigente en Montevideo", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Letras")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fhum");
  assert.deepEqual(matches[0].career.plans, [{
    id: "bedelias-fhum-letras-2014",
    label: "Plan 2014 · vigente",
    defaultTrajectoryId: "trayectoria-flexible",
    defaultCredentialId: "licenciado-letras",
  }]);
  assert.deepEqual(
    [projection.plan.degreeTitle, projection.plan.durationMonths, projection.plan.minCredits],
    ["Licenciado en Letras", 48, 360],
  );
  assert.deepEqual(projection.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "trayectoria-flexible",
  }]);
});

test("mantiene una trayectoria flexible sin inventar menciones", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["trayectoria-flexible"]);
  assert.equal(projection.pathways["trayectoria-flexible"].credentialId, "licenciado-letras");
  assert.equal(credential.title, "Licenciado en Letras");
  assert.equal(officialAudit.conclusion.canonicalModel, "one-degree-flexible-trajectory");
  assert.match(projection.plan.notice, /no se suman como obligaciones acumulativas/);
});

test("controla once mínimos que suman exactamente 360 créditos", () => {
  const nodes = projection.creditStructure.nodes.filter(({ id }) => id !== "plan-total");
  assert.deepEqual(nodes.map(({ minCredits }) => minCredits), [90, 8, 30, 20, 20, 30, 52, 32, 48, 10, 20]);
  assert.equal(nodes.reduce((sum, { minCredits }) => sum + minCredits, 0), 360);
  assert.equal(credential.minTotalCredits, 360);
  assert.deepEqual(
    credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]),
    nodes.map(({ id, minCredits }) => [id, minCredits]),
  );
});

test("exige el núcleo, las alternativas clásicas y las dos áreas de seminario", () => {
  const mandatoryGroups = [
    "letras-university-introduction",
    "letras-literary-theory-intro",
    "letras-latin-american-1",
    "letras-uruguayan-1",
    "letras-greco-latin",
    "letras-medieval",
    "letras-modern",
    "letras-grammar",
    "letras-epistemology",
    "letras-classical-1",
    "letras-classical-2",
    "letras-classical-3",
    "letras-uruguayan-2",
    "letras-latin-american-2",
    "letras-literary-theory",
    "letras-methodology",
    "letras-historical-theory",
    "letras-european-choice",
    "letras-spanish",
    "letras-language-course",
    "letras-extension",
    "letras-seminar-uruguay-america",
    "letras-seminar-european",
    "letras-thesis-workshop-course",
    "letras-thesis-course",
    "validacion-final-plan",
  ];
  assert.ok(mandatoryGroups.every((id) => groups.get(id)?.minCompleted === 1));
  assert.equal(groups.get("letras-three-seminars").minCompleted, 3);
  assert.ok(groups.get("letras-classical-1").courseIds.length >= 2);
  assert.ok(groups.get("letras-seminar-uruguay-america").courseIds.length > 1);
  assert.ok(groups.get("letras-seminar-european").courseIds.length > 1);
});

test("reproduce los ocho semestres oficiales y no publica el catálogo acumulado", () => {
  assert.deepEqual(
    publishedPathway.periods.map(({ label }) => label),
    Array.from({ length: 8 }, (_, index) => `Semestre ${index + 1}`),
  );
  assert.deepEqual(publishedPathway.periods.map(({ courseIds }) => courseIds.length), [5, 6, 5, 6, 6, 4, 3, 4]);
  assert.equal(publishedPathway.catalogCourseIds?.length ?? 0, 0);
  const visibleIds = new Set(publishedPathway.periods.flatMap(({ courseIds }) => courseIds));
  assert.ok([...visibleIds].every((id) => projection.courses.find((course) => course.id === id)?.authorityStatus === "verified"));
  assert.ok(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate")
    .every(({ id }) => !visibleIds.has(id)));
  assert.equal(projection.courses.filter(({ curricularBlock }) => curricularBlock).length, 13);
});

test("registra la reconciliación de autoridad y conserva los tres créditos excedentes", () => {
  assert.equal(projection.courses.length, 280);
  assert.equal(projection.rules.length, 31);
  assert.equal(projection.plan.publishedRules, 2);
  assert.equal(projection.plan.noPublishedRule, 247);
  assert.equal(projection.courses.filter(({ credits }) => credits === 0).length, 81);
  assert.equal(projection.plan.minCredits, 360);
  const authority = report.plans.find(({ planId }) => planId === "bedelias-fhum-letras-2014").authorityReconciliation;
  assert.deepEqual(authority.before, {
    verified: 159,
    candidate: 110,
    "historical-equivalent": 13,
    administrative: 0,
    rejected: 0,
  });
  assert.deepEqual(authority.after, {
    verified: 39,
    candidate: 241,
    "historical-equivalent": 13,
    administrative: 0,
    rejected: 0,
  });
  assert.match(officialAudit.anomalies.find(({ field }) => field === "suggestedCurriculumTotal").resolution, /363/);
  assert.match(officialAudit.anomalies.find(({ field }) => field === "zeroCreditRows").resolution, /68/);
});
