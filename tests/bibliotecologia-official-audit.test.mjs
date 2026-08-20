import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fic-bibliotecologia-2012.json");
const audit = audits.audits.find((entry) => entry.identity === "bibliotecologia:2012");

test("normaliza un único Plan 2012 de Bibliotecología para ambas sedes", () => {
  assert.equal(audit.conclusion.canonicalModel, "one-plan-multiple-offerings");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.deepEqual(projection.campuses.map((campus) => campus.id), ["montevideo", "paysandu"]);
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.plan.durationMonths, 48);
});

test("proyecta exclusivamente la malla oficial propia de Bibliotecología", () => {
  assert.equal(projection.plan.compositionAvailable, true);
  assert.equal(projection.pathways.bedelias.label, "Malla oficial");
  assert.equal(projection.pathways.bedelias.periods.length, 9);
  assert.equal(projection.courses.length, 49);
  assert.ok(projection.courses.every((course) => course.dataStatus === "official-curriculum"));
  assert.match(projection.source.planDocument, /licenciatura-en-bibliotecologia/);
  assert.ok(projection.courses.some((course) => course.name === "Referencia y Servicios al Usuario"));
  assert.ok(!projection.courses.some((course) => course.name === "Gestión Documental I"));
});

test("conserva mínimos, elecciones y créditos opcionales oficiales", () => {
  const credential = projection.creditStructure.credentials[0];
  const requirements = new Map(credential.nodeRequirements.map((item) => [item.nodeId, item.minCredits]));
  assert.equal(requirements.get("bib-ftc"), 33);
  assert.equal(requirements.get("bib-fcs"), 35);
  assert.equal(requirements.get("bib-dar"), 49);
  assert.equal(requirements.get("bib-ain"), 48);
  assert.equal(requirements.get("bib-opc"), 79);
  assert.equal(requirements.get("bib-optativas"), 30);
  assert.equal(requirements.get("bib-electivas"), 5);
  assert.equal(requirements.has("bib-opc-restantes"), false);
  assert.deepEqual(credential.requiredCourseGroups.map((group) => group.minCompleted), [1, 1, 1, 1, 2, 1]);
  assert.equal(projection.courses.filter((course) => course.curricularBlock).reduce((sum, course) => sum + course.credits, 0), 79);
});

test("no convierte el catálogo optativo anual en núcleo obligatorio", () => {
  assert.equal(audit.officialPlan.curriculum.periods.length, 9);
  assert.match(audit.anomalies.find((entry) => entry.field === "optionalCredits").resolution, /oferta optativa cambiante/);
  assert.ok(!projection.courses.some((course) => course.name === "Biblioterapia"));
});
