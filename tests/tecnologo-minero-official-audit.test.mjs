import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cure-tecnologo-minero-2013.json");
const audit = registry.audits.find((entry) => entry.identity === "tecnologo minero:2013");

test("normaliza el plan conjunto vigente en Treinta y Tres", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-joint-plan-flexible-by-areas-with-suggested-path");
  assert.equal(projection.plan.year, "2012");
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.plan.minCredits, 272);
  assert.deepEqual(projection.plan.sharedWith, ["Facultad de Agronomía", "Facultad de Ingeniería"]);
  assert.deepEqual(projection.campuses.map((campus) => campus.label), ["Treinta y Tres"]);

  const faculty = catalog.find((candidate) => candidate.label === "Facultad de Ciencias");
  const career = faculty.careers.find((candidate) => candidate.label === "Tecnólogo Minero");
  assert.deepEqual(career.plans.map((plan) => plan.label), ["Plan 2012 · vigente"]);
});

test("controla las seis áreas, el total vigente y la pasantía", () => {
  const credential = projection.creditStructure.credentials[0];
  assert.deepEqual(credential.nodeRequirements, [
    { nodeId: "mathematics-physics-chemistry", minCredits: 40 },
    { nodeId: "geology", minCredits: 70 },
    { nodeId: "prospecting-exploration", minCredits: 40 },
    { nodeId: "exploitation-beneficiation", minCredits: 50 },
    { nodeId: "environment-safety", minCredits: 20 },
    { nodeId: "humanistic", minCredits: 20 },
    { nodeId: "internship", minCredits: 15 },
  ]);
  assert.equal(credential.minTotalCredits, 272);
  assert.deepEqual(
    credential.requiredCourseGroups.map((group) => [group.id, group.minCompleted, group.courseIds.length]),
    [
      ["mandatory-internship", 1, 1],
      ["validacion-final-plan", 1, 1],
    ],
  );
  assert.match(credential.requiredCourseGroups[1].label, /10 créditos.*social-productiva|10 créditos.*otros servicios/i);
});

test("presenta los seis semestres como sugerencia y conserva la flexibilidad", () => {
  const periods = projection.pathways.bedelias.periods;
  assert.deepEqual(periods.slice(0, 6).map((period) => period.label), [
    "1.er semestre · trayectoria sugerida",
    "2.º semestre · trayectoria sugerida",
    "3.er semestre · trayectoria sugerida",
    "4.º semestre · trayectoria sugerida",
    "5.º semestre · trayectoria sugerida",
    "6.º semestre · trayectoria sugerida",
  ]);
  assert.deepEqual(periods.slice(0, 6).map((period) => period.courseIds.length), [6, 4, 3, 3, 4, 4]);
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.match(projection.plan.notice, /secuencia semestral es sugerida/i);
});

test("elimina el alias duplicado de SIG sin recortar el catálogo flexible", () => {
  const courses = projection.courses.filter((course) => course.dataStatus !== "manual-validation");
  const geographicInformationSystems = courses.filter((course) => course.name === "Sistemas de la Información Geográfica");
  assert.equal(courses.length, 47);
  assert.equal(courses.reduce((sum, course) => sum + course.credits, 0), 398);
  assert.deepEqual(geographicInformationSystems.map((course) => course.bedeliasCode), ["TM32"]);
  assert.ok(courses.reduce((sum, course) => sum + course.credits, 0) > projection.plan.minCredits);
});

test("documenta sin ocultar la diferencia entre el plan aprobado y la implementación", () => {
  const anomaly = audit.anomalies.find((candidate) => candidate.field === "minimumCredits");
  assert.match(anomaly.resolution, /texto aprobado dice 270/i);
  assert.match(anomaly.resolution, /CURE y Bedelías.*272/i);
  assert.match(audit.sources[0].supports.join(" "), /270 créditos/i);
});
