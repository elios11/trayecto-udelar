import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const source = await readJson("data/fcea/economia-agricola-2022-trayectorias.json");
const plan = await readJson(`app/data/bedelias-generated/${source.planId}.json`);
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const audit = registry.audits.find(({ identity }) => identity === source.identity);
const coursesById = new Map(plan.courses.map((course) => [course.id, course]));
const coursesBySourceId = new Map();
for (const course of plan.courses) {
  for (const sourceId of [course.bedeliasCode, course.sourceCourseId].filter(Boolean)) coursesBySourceId.set(sourceId, course);
}

test("versiona la grilla completa y protege su huella normalizada", () => {
  assert.equal(source.source.authority, "Facultad de Ciencias Económicas y de Administración, Udelar");
  assert.equal(source.source.documents[0].url, source.grid.sourceUrl);
  assert.equal(digest({ grid: source.grid, mentions: source.mentions, trajectories: source.trajectories, requirements: source.requirements, crosswalk: source.crosswalk }), source.fingerprints.normalizedCurriculum);
  assert.equal(source.grid.periods.length, 8);
  const rows = source.grid.periods.flatMap(({ rows }) => rows);
  assert.equal(rows.length, 57);
  assert.equal(rows.filter(({ inclusion }) => inclusion === "principal").length, 30);
  assert.equal(new Set(rows.map(({ sourceId }) => sourceId)).size, rows.length);
  assert.deepEqual(source.mentions.map(({ id }) => id), ["mencion-en-investigacion", "mencion-profesional"]);
});

test("reproduce las ubicaciones oficiales de ambas menciones sin materias inventadas", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.deepEqual([plan.plan.degreeTitle, plan.plan.minCredits, plan.plan.durationMonths], ["Licenciado en Economía Agrícola y Gestión de Agronegocios", 360, 48]);
  assert.deepEqual(plan.campuses.map(({ label }) => label), ["Tacuarembó"]);
  assert.deepEqual(Object.keys(plan.pathways), source.trajectories.map(({ id }) => id));
  for (const trajectory of source.trajectories) {
    assert.deepEqual(plan.publishedPathways[trajectory.id].periods.map(({ label, courseIds }) => ({
      label,
      courseIds: courseIds.map((id) => coursesById.get(id)?.bedeliasCode ?? coursesById.get(id)?.sourceCourseId),
    })), trajectory.periods, trajectory.id);
  }
});

test("el planificador reúne las 57 identidades verificadas sin repetirlas ni obligar todas las opciones", () => {
  assert.equal(plan.courses.length, 57);
  assert.ok(plan.courses.every(({ authorityStatus }) => authorityStatus === "verified"));
  const allCourseIds = new Set(plan.courses.map(({ id }) => id));
  assert.equal(allCourseIds.size, plan.courses.length);
  for (const [id, pathway] of Object.entries(plan.pathways)) {
    const placed = pathway.periods.flatMap(({ courseIds }) => courseIds);
    assert.equal(new Set(placed).size, placed.length, id);
    assert.deepEqual(new Set([...placed, ...pathway.catalogCourseIds]), allCourseIds, id);
    assert.equal(placed.length + pathway.catalogCourseIds.length, allCourseIds.size, id);
  }
  assert.ok(plan.courseAuthority.records.some(({ status }) => status === "rejected"));
  assert.ok(!plan.courses.some(({ id }) => id === "cut-fcea-i71"));
});

test("mantiene dos menciones del mismo título y los mínimos sin sumar las opciones", () => {
  assert.deepEqual(plan.creditStructure.credentials.map(({ id }) => id), ["degree-research", "degree-professional"]);
  assert.deepEqual(new Set(plan.creditStructure.credentials.map(({ title }) => title)), new Set([source.interpretation.title]));
  for (const [id, requirements] of [["degree-research", source.requirements.research], ["degree-professional", source.requirements.professional]]) {
    const credential = plan.creditStructure.credentials.find((entry) => entry.id === id);
    assert.deepEqual(credential.nodeRequirements, requirements);
    assert.equal(credential.minTotalCredits, 360);
  }
  assert.deepEqual(source.crosswalk["FCEA-I111N"], {
    snapshotCandidate: "FCEA-I71",
    status: "not-proven-equivalent",
    action: "project-source-only-and-keep-history-separate",
  });
});

test("preserva identidades y documenta conflictos de créditos sin equivalencias supuestas", () => {
  assert.equal(coursesBySourceId.get("CPTAL").id, "cut-cptal-2");
  assert.equal(coursesBySourceId.get("CPTAL").name, "Herramientas de difusión de conocimientos en la Era Digital");
  assert.equal(coursesBySourceId.get("FCEA-I111N").id, "cut-fcea-i111n");
  assert.equal(coursesBySourceId.get("EGAF2").id, "cut-egaf2-2");
  assert.equal(coursesBySourceId.get("EGAF2").credits, 4);
  assert.equal(coursesBySourceId.get("EGAF2").creditConflict.gridCredits, 5);
  assert.equal(coursesBySourceId.get("EGAF2").creditConflict.status, "official-source-conflict-unresolved");
  assert.match(coursesBySourceId.get("EGAF2").creditSourceUrl, /EGAF2_2026/);
  assert.equal(coursesBySourceId.get("PRACTICA-LEAGA").credits, 0);
  assert.ok(source.interpretation.discrepancies.some(({ field }) => field === "practicesCredits"));
  assert.ok(plan.audit.anomalies.some(({ field }) => field === "EGAF2.credits"));
});
