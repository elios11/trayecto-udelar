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
  assert.match(projection.plan.notice, /activo desde marzo de 2026/i);
});

test("mantiene una trayectoria flexible y no inventa menciones desde las líneas de trabajo", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["trayectoria-flexible"]);
  assert.equal(pathway.credentialId, "licenciado-ingenieria-medios");
  assert.deepEqual(pathway.campusIds, ["montevideo"]);
  assert.match(pathway.description, /currículo/i);
  assert.equal(projection.creditStructure.credentials.length, 1);
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

test("identifica exactamente las cinco unidades del primer semestre efectivo", () => {
  const firstSemester = pathway.periods.find(({ label }) => label === "Semestre 1");
  const names = firstSemester.courseIds.map((id) => projection.courses.find((course) => course.id === id)?.name).sort();
  assert.deepEqual(names, [
    "Informática",
    "Introducción al Estudio del Audiovisual",
    "Matemática Inicial",
    "Taller Integrador",
    "Teoría de la Comunicación II",
  ].sort());
});

test("expone las áreas aún incompletas sin simular asignaturas o previaturas", () => {
  assert.equal(projection.courses.length, 29);
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
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 162);
  assert.equal(queue.counts.pendingCanonicalIdentities, 15);
  assert.equal(queue.queue[0].identity, "ingenieria naval:1997");
});
