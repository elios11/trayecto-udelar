import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fvet-doctor-en-ciencias-veterinarias-2021.json");
const audit = audits.audits.find((entry) => entry.identity === "doctor en ciencias veterinarias:2021");

test("proyecta la malla 2026 completa de Médico Veterinario", () => {
  assert.equal(audit.officialPlan.minimumCredits, 453);
  assert.equal(projection.plan.degreeTitle, "Médico Veterinario");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.courses.length, 73);
  assert.equal(projection.courses.reduce((sum, course) => sum + course.credits, 0), 453);
  assert.equal(projection.pathways.bedelias.periods.length, 11);
  assert.equal(projection.creditStructure.credentials[0].requiredCourseGroups[0].minCompleted, 69);
  assert.match(projection.plan.notice, /semestre 6 dice 45/i);
});

test("separa los recorridos Sur y Norte sin duplicar la carrera", () => {
  assert.deepEqual(projection.campuses.map((campus) => campus.label), [
    "Sur · Montevideo y San José · Instituto de Producción Animal",
    "Norte · Salto (1.º–7.º) y Paysandú (8.º–10.º)",
  ]);
  assert.equal(Object.keys(projection.pathways).length, 1);
  assert.ok(audit.offerings.every((offering) => offering.curriculumVariant === false));
  assert.match(audit.conclusion.reason, /única malla/i);
});

test("incorpora los mínimos flexibles y las previaturas provisorias 2026", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.equal(requirements.get("vet-opcionales"), 21);
  assert.equal(requirements.get("vet-efi"), 9);
  assert.equal(requirements.get("vet-practicantados"), 30);
  assert.equal(requirements.get("vet-tfg"), 10);
  assert.equal(projection.rules.length, 56);
  const ruminants = projection.rules.find((rule) => rule.target.code === "fvet-medicina-rumiantes-1");
  assert.equal(ruminants.expression.children.at(-1).creditRequirement.minimum, 140);
  assert.ok(ruminants.expression.children.some((child) => child.options.some((option) => option.code === "fvet-enfermedades-infecciosas-rumiantes")));
  assert.ok(projection.courses.filter((course) => projection.rules.some((rule) => rule.target.code === course.id)).every((course) => course.ruleCoverage === "published"));
});

test("no oculta las dos inconsistencias documentales verificadas", () => {
  assert.match(audit.anomalies.find((entry) => entry.field === "publishedCreditSum").resolution, /subtotal de 45/);
  assert.match(audit.anomalies.find((entry) => entry.field === "semesterPlacement").resolution, /coincidencia triple/);
  assert.equal(projection.pathways.bedelias.periods[4].courseIds.includes("fvet-enfermedades-infecciosas-monogastricos"), true);
  assert.equal(projection.pathways.bedelias.periods[5].courseIds.includes("fvet-enfermedades-infecciosas-rumiantes"), true);
});
