import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const report = await readJson("data/bedelias/inventory/ui-extracted-plans.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");

test("integra una sola proyección por identidad canónica vigente y excluye planes históricos verificados", () => {
  assert.equal(report.counts.canonicalCurrentIdentities, 184);
  assert.equal(report.counts.generatedPlans, 175);
  assert.equal(report.counts.excludedFromCurrentUi, 2);
  assert.equal(new Set(report.plans.map((plan) => plan.identity)).size, report.plans.length);
  assert.equal(new Set(report.plans.map((plan) => plan.planId)).size, report.plans.length);
  assert.equal(catalog.flatMap((faculty) => faculty.careers).flatMap((career) => career.plans).length, 175);
  assert.ok(!report.plans.some((plan) => plan.identity === "diplomatura en musica:1994"));
  assert.ok(!report.plans.some((plan) => plan.identity === "escalonada de enfermeria:2001"));
  assert.ok(!catalog.flatMap((faculty) => faculty.careers).some((career) => career.label === "Diplomatura en Música"));
  assert.ok(!catalog.flatMap((faculty) => faculty.careers).some((career) => /Escalonada de Enfermer/i.test(career.label)));
  assert.equal(report.counts.compositionAvailable + report.counts.compositionUnavailable, report.counts.generatedPlans);
});

test("cada proyección diferida conserva referencias internas válidas y estado explícito", async () => {
  for (const item of report.plans) {
    const projection = await readJson(`app/data/bedelias-generated/${item.planId}.json`);
    assert.equal(projection.audit.publicationEligible, false, item.identity);
    assert.match(projection.plan.auditStatus, /^(official-evidence-complete|structurally-valid|extracted)$/);
    const ids = new Set(projection.courses.map((course) => course.id));
    assert.equal(ids.size, projection.courses.length, `${item.identity}: ids repetidos`);
    for (const course of projection.courses) {
      assert.ok(Number.isFinite(course.credits) && course.credits >= 0, `${item.identity}/${course.id}`);
    }
    for (const pathway of Object.values(projection.pathways)) {
      for (const id of pathway.periods.flatMap((period) => period.courseIds)) assert.ok(ids.has(id), `${item.identity}: referencia ${id}`);
    }
    if (!item.compositionAvailable) {
      assert.equal(projection.courses.length, 0, item.identity);
      assert.deepEqual(projection.pathways.bedelias.periods, [], item.identity);
      assert.match(projection.plan.notice, /no publica su composición/i);
    }
  }
});

test("las sedes sólo aparecen con auditoría oficial y no duplican carreras", async () => {
  const expected = new Map([
    ["ingeniero agronomo:2020", ["montevideo", "paysandu", "salto"]],
    ["licenciatura en biotecnologia:2024", ["montevideo", "salto", "paysandu"]],
    ["abogacia:2016", ["montevideo", "salto"]],
    ["notariado:2016", ["montevideo", "salto"]],
    ["licenciatura en enfermeria:2016", ["montevideo", "rivera", "rocha", "salto"]],
    ["doctor en medicina:2008", ["montevideo", "region-litoral-norte-paysandu-y-salto"]],
    ["licenciatura en educacion fisica:2017", ["montevideo", "maldonado", "paysandu"]],
    ["tecnicatura en deportes:2007", ["montevideo", "rocha", "paysandu"]],
    ["licenciatura en psicologia:2013", ["montevideo", "salto", "paysandu"]],
    ["licenciatura en trabajo social:2009", ["montevideo", "salto"]],
    ["licenciatura en enfermeria profesionalizacion de auxiliar:1999", ["montevideo", "mercedes-soriano", "colonia-del-sacramento"]],
  ]);
  assert.equal(report.plans.filter((plan) => plan.campusIds.length > 1).length, expected.size);
  for (const [identity, campusIds] of expected) {
    const item = report.plans.find((plan) => plan.identity === identity);
    assert.deepEqual(item.campusIds, campusIds);
  }
  const agronomyItem = report.plans.find((plan) => plan.identity === "ingeniero agronomo:2020");
  const agronomy = await readJson(`app/data/bedelias-generated/${agronomyItem.planId}.json`);
  assert.deepEqual(agronomy.pathways["salto-agricola-ganadera"].campusIds, ["salto"]);
  assert.equal(agronomy.campuses.find((campus) => campus.id === "salto").defaultPathwayId, "salto-agricola-ganadera");
  assert.equal(agronomy.campuses.find((campus) => campus.id === "montevideo").defaultPathwayId, "bedelias");
  const animalBiologyRule = agronomy.rules.find((rule) => rule.target.code === "A0620");
  assert.equal(animalBiologyRule.expression.children[0].options[0].code, "fagro-a0120");
});

test("las trayectorias auditadas se filtran por sede y conservan metadatos oficiales", async () => {
  const education = await readJson("app/data/bedelias-generated/bedelias-isef-licenciatura-en-educacion-fisica-2017.json");
  assert.equal(education.plan.durationMonths, 48);
  assert.equal(education.plan.minCredits, 360);
  assert.deepEqual(Object.keys(education.pathways), [
    "deporte",
    "salud",
    "practicas-corporales",
    "tiempo-libre-y-ocio",
  ]);
  assert.deepEqual(education.pathways["practicas-corporales"].campusIds, ["montevideo", "maldonado"]);
  assert.deepEqual(education.pathways.salud.campusIds, ["montevideo", "maldonado", "paysandu"]);
  assert.ok(Object.values(education.pathways).every((pathway) => pathway.periods.length > 0));

  const sports = await readJson("app/data/bedelias-generated/bedelias-isef-tecnicatura-en-deportes-2007.json");
  assert.equal(sports.plan.durationMonths, 24);
  assert.equal(sports.plan.minCredits, 160);
  assert.deepEqual(Object.keys(sports.pathways), ["futbol", "actividades-acuaticas", "atletismo"]);
  assert.deepEqual(sports.pathways.futbol.campusIds, ["montevideo"]);
  assert.deepEqual(sports.pathways["actividades-acuaticas"].campusIds, ["rocha"]);
  assert.deepEqual(sports.pathways.atletismo.campusIds, ["paysandu"]);
  assert.ok(Object.values(sports.pathways).every((pathway) => pathway.periods.length > 0));
  assert.ok(!sports.campuses.some((campus) => campus.id === "rivera"));
  assert.match(sports.plan.notice, /no tiene ingreso abierto/i);

  const psychology = await readJson("app/data/bedelias-generated/bedelias-psico-licenciatura-en-psicologia-2013.json");
  assert.equal(psychology.plan.durationMonths, 48);
  assert.equal(psychology.plan.minCredits, 320);
  assert.deepEqual(psychology.campuses.map((campus) => campus.id), ["montevideo", "salto", "paysandu"]);
  assert.ok(!psychology.campuses.some((campus) => ["maldonado", "rocha", "treinta-y-tres"].includes(campus.id)));
});

test("el reporte queda ligado por hash a sus tres entradas reproducibles", () => {
  assert.match(report.contentHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(report.generatedFrom.auditQueueHash, /^sha256:/);
  assert.match(report.generatedFrom.officialAuditHash, /^sha256:/);
  assert.match(report.generatedFrom.globalManifestHash, /^sha256:/);
});
