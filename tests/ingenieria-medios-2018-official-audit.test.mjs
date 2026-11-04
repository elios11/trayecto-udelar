import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fic-licenciatura-en-ingenieria-de-medios-2018.json");
const officialAudit = audits.audits.find(({ identity }) => identity === "licenciatura en ingenieria de medios:2018");
const credential = projection.creditStructure.credentials[0];
const pathway = projection.pathways["trayectoria-flexible"];

test("publica la carrera conjunta que funciona desde 2026 como un único plan", () => {
  assert.equal(officialAudit.status, "official-evidence-complete");
  assert.equal(officialAudit.publicationEligible, true);
  assert.equal(projection.plan.year, "2018");
  assert.equal(projection.plan.degreeTitle, "Licenciado en Ingeniería de Medios");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), ["montevideo"]);
  assert.deepEqual(projection.plan.sharedWith, ["FACULTAD DE INGENIERÍA"]);
  assert.match(projection.plan.notice, /semestres 1 a 4/i);
});

test("publica las dos guías iniciales y conserva el recorrido flexible y los IDs", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["malla-fing-1-4", "malla-fcea-1-4", "trayectoria-flexible"]);
  assert.deepEqual(projection.pathways["malla-fing-1-4"].periods.map(({ label }) => label), ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4"]);
  assert.deepEqual(projection.pathways["malla-fcea-1-4"].periods.map(({ label }) => label), ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4"]);
  assert.equal(pathway.credentialId, "licenciado-ingenieria-medios");
  assert.deepEqual(pathway.campusIds, ["montevideo"]);
  assert.match(pathway.description, /compatibilidad/i);
  assert.equal(projection.creditStructure.credentials.length, 1);
  assert.ok(projection.courses.some(({ id }) => id === "fic-2601l"));
});

test("controla los tres grupos y los doce mínimos de área del plan", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.deepEqual(requirements, {
    "media-engineering": 85,
    "media-signals": 16,
    "media-informatics": 16,
    "media-mathematics": 25,
    "media-physics": 16,
    "media-information": 80,
    "media-languages": 24,
    "media-theory": 36,
    "media-information-science": 8,
    "media-creativity": 150,
    "media-content-conception": 40,
    "media-content-techniques": 40,
    "media-integrative": 58,
  });
  assert.equal(requirements["media-engineering"] + requirements["media-information"] + requirements["media-creativity"], 315);
  assert.equal(credential.minTotalCredits - 315, 45);
});

test("identifica las seis unidades del primer semestre sugerido compartido", () => {
  const firstSemester = pathway.periods.find(({ label }) => label === "Semestre 1");
  const names = firstSemester.courseIds.map((id) => projection.courses.find((course) => course.id === id)?.name).sort();
  assert.deepEqual(names, [
    "Informática LIM",
    "Curso Introductorio",
    "Introducción al Estudio del Audiovisual",
    "Matemática Inicial (Fing)",
    "Taller integrador I",
    "Teoría de la Comunicación II",
  ].sort());
});

test("expone las áreas aún incompletas sin simular asignaturas o previaturas", () => {
  assert.equal(projection.courses.length, 37);
  assert.equal(projection.rules.length, 0);
  assert.equal(projection.plan.noPublishedRule, 14);
  assert.equal(officialAudit.bedeliasComparison.compositionMatterCount, 25);
  const signals = pathway.periods.find(({ label }) => label === "Señales e Ingeniería Eléctrica");
  assert.equal(signals.courseIds.length, 1);
  assert.match(projection.courses.find(({ id }) => id === signals.courseIds[0]).name, /Elegí unidades acreditables/i);
  assert.equal(projection.courses.find(({ id }) => id === signals.courseIds[0]).credits, 0);
  assert.equal(pathway.periods.at(-1).label, "Validación de egreso");
  assert.equal(credential.requiredCourseGroups[0].id, "validacion-final-plan");
});

test("mantiene la identidad cerrada después de auditar Ingeniería de Alimentos", () => {
  assert.ok(!queue.queue.some(({ identity }) => identity === "licenciatura en ingenieria de medios:2018"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 177);
  assert.equal(queue.counts.pendingCanonicalIdentities, 0);
  assert.equal(queue.queue.length, 0);
});
