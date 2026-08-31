import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));

const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fing-ingenieria-en-agrimensura-2023.json");
const audit = registry.audits.find(({ identity }) => identity === "ingenieria en agrimensura:2023");
const credential = projection.creditStructure.credentials.find(({ id }) => id === "ingeniero-agrimensor");
const pathway = projection.pathways["trayectoria-flexible"];

test("publica una única Ingeniería en Agrimensura Plan 2023 en Montevideo", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.publicationEligible, true);
  assert.equal(audit.conclusion.canonicalModel, "one-degree-flexible-individual-curriculum");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.equal(projection.plan.degreeTitle, "Ingeniero Agrimensor / Ingeniera Agrimensora");
  assert.equal(projection.plan.durationMonths, 60);
  assert.equal(projection.plan.minCredits, 450);
  assert.deepEqual(projection.plan.campuses.map(({ id }) => id), ["montevideo"]);
  assert.deepEqual(pathway.campusIds, ["montevideo"]);
  assert.equal(pathway.label, "Trayectoria flexible");
});

test("controla los mínimos oficiales y deja explícitos los 57 créditos opcionales", () => {
  const requirements = Object.fromEntries(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
  assert.equal(
    requirements["agrimensura-integradoras"]
      + requirements["agrimensura-basica"]
      + requirements["agrimensura-tecnologica"]
      + requirements["agrimensura-complementaria"],
    393,
  );
  assert.equal(credential.minTotalCredits - 393, 57);
  assert.equal(requirements["agrimensura-integradoras"], requirements["agrimensura-pasantia"] + requirements["agrimensura-proyecto"]);
  assert.equal(
    requirements["agrimensura-basica"],
    requirements["agrimensura-matematica"]
      + requirements["agrimensura-fisica"]
      + requirements["agrimensura-economicas-juridicas"]
      + requirements["agrimensura-informatica"]
      + requirements["agrimensura-observaciones"],
  );
  assert.equal(
    requirements["agrimensura-tecnologica"],
    requirements["agrimensura-legal"]
      + requirements["agrimensura-avaluaciones"]
      + requirements["agrimensura-catastro"]
      + requirements["agrimensura-geodesia"]
      + requirements["agrimensura-geomatica"]
      + requirements["agrimensura-ordenamiento"]
      + requirements["agrimensura-topografia"],
  );
  assert.equal(requirements["agrimensura-complementaria"], requirements["agrimensura-humanas"] + requirements["agrimensura-gestion"]);
  assert.equal(credential.requiredCourseGroups[0].id, "validacion-final-plan");
});

test("mantiene las 77 unidades como catálogo flexible y no inventa semestres", () => {
  assert.deepEqual(pathway.periods.map(({ label }) => label), ["Orientación del recorrido", "Validación de egreso"]);
  assert.equal(pathway.catalogCourseIds.length, 77);
  assert.equal(projection.courses.length, 79);
  assert.equal(new Set(pathway.catalogCourseIds).size, 77);
  const byId = new Map(projection.courses.map((course) => [course.id, course]));
  assert.ok(pathway.catalogCourseIds.every((id) => byId.get(id).bedeliasCode));
  assert.ok(pathway.catalogCourseIds.every((id) => !byId.get(id).eligibleRequirementIds.includes("plan-total")));
  assert.match(byId.get(pathway.periods[0].courseIds[0]).name, /57 créditos opcionales/i);
  assert.match(byId.get(pathway.periods.at(-1).courseIds[0]).name, /Validación del currículo individual/i);
});

test("conserva la cobertura de previaturas sin fabricar reglas", () => {
  assert.equal(audit.bedeliasComparison.compositionMatterCount, 77);
  assert.equal(audit.bedeliasComparison.compositionGroupCount, 20);
  assert.equal(projection.rules.length, 61);
  assert.equal(projection.plan.publishedRules, 61);
  assert.equal(projection.plan.noPublishedRule, 2);
  assert.equal(new Set(projection.courses.map(({ id }) => id)).size, projection.courses.length);
  assert.ok(projection.courses.every(({ creditAllocations }) => creditAllocations?.length > 0));
});

test("no confunde los CIO regionales con sedes de la carrera", () => {
  assert.deepEqual(audit.offerings.map(({ locations }) => locations), [["Montevideo"]]);
  assert.ok(audit.sources.some(({ url }) => url.includes("cio-trayectoria-ingenieria")));
  assert.match(audit.anomalies.find(({ field }) => field === "regionalGatewayVsCampus").resolution, /carreras independientes/i);
  assert.equal(projection.plan.campuses.some(({ id }) => ["paysandu", "salto"].includes(id)), false);
});

test("ubica la carrera bajo FING y avanza la cola a Sistemas de Comunicación", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-fing");
  const career = faculty.careers.find(({ label }) => label === "Ingeniería en Agrimensura");
  assert.equal(career.plans[0].id, "bedelias-fing-ingenieria-en-agrimensura-2023");
  assert.equal(career.plans[0].defaultTrajectoryId, "trayectoria-flexible");
  assert.ok(!queue.queue.some(({ identity }) => identity === "ingenieria en agrimensura:2023"));
  assert.equal(queue.counts.evidenceClosedCanonicalIdentities, 162);
  assert.equal(queue.counts.pendingCanonicalIdentities, 15);
  assert.equal(queue.queue[0].identity, "ingenieria naval:1997");
});
