import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fq-bachiller-en-ciencias-quimicas-2000.json");
const audit = registry.audits.find(({ identity }) => identity === "bachiller en ciencias quimicas:2000");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));

const selectedCredits = (pathway) => pathway.periods
  .flatMap(({ courseIds }) => courseIds)
  .reduce((sum, id) => sum + courseById.get(id).credits, 0);

test("publica un único título intermedio vigente sin presentarlo como ingreso directo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-current-intermediate-title-five-origin-pathways-no-direct-admission");
  assert.equal(projection.plan.current, true);
  assert.equal(projection.plan.credentialLabel, "Título intermedio");
  assert.equal(projection.plan.degreeTitle, "Bachiller en Ciencias Químicas");
  assert.equal(projection.plan.durationMonths, 36);
  assert.equal(projection.plan.minCredits, 230);
  assert.deepEqual(projection.campuses.map(({ id }) => id), ["montevideo"]);
  assert.match(projection.plan.notice, /sin ingreso directo/i);
  assert.match(projection.plan.notice, /No es la Tecnicatura Plan 2015/i);

  const career = catalog.find(({ id }) => id === "bedelias-fq").careers
    .find(({ label }) => label === "Bachiller en Ciencias Químicas");
  assert.equal(career.plans.length, 1);
  assert.equal(career.plans[0].label, "Plan 2000 · título intermedio vigente · sin ingreso directo");
});

test("ofrece cinco carreras de origen para el mismo título", () => {
  assert.deepEqual(Object.keys(projection.pathways), [
    "bioquimico-clinico-plan-2000",
    "quimico-farmaceutico-plan-2000",
    "quimico-plan-2000",
    "ing-alimentos",
    "ing-quimica",
  ]);
  assert.equal(projection.creditStructure.credentials.length, 5);
  assert.ok(projection.creditStructure.credentials.every(({ title, minTotalCredits }) => (
    title === "Bachiller en Ciencias Químicas" && minTotalCredits === 230
  )));
  for (const pathway of Object.values(projection.pathways)) {
    assert.deepEqual(pathway.campusIds, ["montevideo"]);
    assert.ok(projection.creditStructure.credentials.some(({ id }) => id === pathway.credentialId));
    const selected = pathway.periods.flatMap(({ courseIds }) => courseIds);
    assert.equal(new Set(selected).size, selected.length);
    assert.ok(selected.every((id) => courseById.has(id)));
    assert.ok((pathway.catalogCourseIds ?? []).every((id) => courseById.has(id) && !selected.includes(id)));
  }
});

test("modela el damero FQ sin ajustar sus discrepancias aritméticas", () => {
  assert.equal(selectedCredits(projection.pathways["bioquimico-clinico-plan-2000"]), 173);
  assert.equal(selectedCredits(projection.pathways["quimico-farmaceutico-plan-2000"]), 173);
  assert.equal(selectedCredits(projection.pathways["quimico-plan-2000"]), 176);

  const legacy = new Map(projection.courses
    .filter(({ dataStatus }) => dataStatus === "official-curriculum")
    .map((course) => [course.name, course]));
  assert.equal(legacy.get("Química Analítica II · versión QF/Bioquímico Clínico Plan 2000").credits, 7);
  assert.equal(legacy.get("Matemática 02").credits, 10);
  assert.equal(legacy.get("Fisicoquímica 102").credits, 13);
  assert.equal(legacy.get("Bioquímica").credits, 15);
  assert.ok(audit.anomalies.some(({ field }) => field === "dameroArithmetic"));
  assert.ok(audit.sources.some(({ url, supports }) => url.endsWith("QU%C3%8DMICAS.pdf") && supports.includes("núcleo común")));
});

test("controla 170 obligatorios, 60 electivos y los mínimos por área de las ingenierías", () => {
  const credentials = new Map(projection.creditStructure.credentials.map((credential) => [credential.id, credential]));
  const requirements = (id) => Object.fromEntries(credentials.get(id).nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.deepEqual(requirements("bachiller-bioquimico-clinico"), { "bcl-obligatorias": 170, "bcl-electivas": 60 });
  assert.deepEqual(requirements("bachiller-quimico-farmaceutico"), { "qf-obligatorias": 170, "qf-electivas": 60 });
  assert.deepEqual(requirements("bachiller-quimico"), { "quimico-obligatorias": 170, "quimico-electivas": 60 });
  assert.deepEqual(requirements("bachiller-ingenieria-alimentos"), {
    "alimentos-obligatorias": 170,
    "alimentos-fisicomatematicas": 28,
    "alimentos-quimica": 89,
    "alimentos-biologica": 9,
    "alimentos-especificas": 44,
    "alimentos-electivas": 60,
  });
  assert.deepEqual(requirements("bachiller-ingenieria-quimica"), {
    "iq-obligatorias": 170,
    "iq-fisicomatematicas": 28,
    "iq-quimica": 89,
    "iq-biologica": 4,
    "iq-especificas": 49,
    "iq-electivas": 60,
  });
  assert.ok([...credentials.values()].every(({ requiredCourseGroups }) => (
    requiredCourseGroups.length === 1
      && requiredCourseGroups[0].id === "validacion-final-plan"
      && courseById.get(requiredCourseGroups[0].courseIds[0]).dataStatus === "manual-validation"
  )));
});

test("cierra la auditoría y avanza a Bioquímico Clínico", () => {
  assert.ok(!queue.queue.some(({ identity }) => identity === "bachiller en ciencias quimicas:2000"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 172);
  assert.equal(queue.counts.pendingCanonicalIdentities, 5);
  assert.equal(queue.queue[0].identity, "licenciatura en tecnologias de la quimica:2022");
});
