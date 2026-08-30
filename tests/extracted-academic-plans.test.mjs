import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const report = await readJson("data/bedelias/inventory/ui-extracted-plans.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");

test("integra una sola proyección por identidad canónica vigente y excluye planes históricos verificados", () => {
  assert.equal(report.counts.canonicalCurrentIdentities, 184);
  assert.equal(report.counts.generatedPlans, 139);
  assert.equal(report.counts.excludedFromCurrentUi, 38);
  assert.equal(new Set(report.plans.map((plan) => plan.identity)).size, report.plans.length);
  assert.equal(new Set(report.plans.map((plan) => plan.planId)).size, report.plans.length);
  assert.equal(catalog.flatMap((faculty) => faculty.careers).flatMap((career) => career.plans).length, 139);
  assert.ok(!report.plans.some((plan) => plan.identity === "diplomatura en musica:1994"));
  assert.ok(!report.plans.some((plan) => plan.identity === "escalonada de enfermeria:2001"));
  assert.ok(!report.plans.some((plan) => plan.identity === "enfermeria universitaria:1983"));
  assert.ok(!report.plans.some((plan) => plan.identity === "letras hispanicas:1976"));
  assert.ok(!report.plans.some((plan) => plan.identity === "tecnicatura en turismo:1996"));
  assert.ok(!report.plans.some((plan) => plan.identity === "ingenieria en computacion revalida:1987"));
  assert.ok(!report.plans.some((plan) => plan.identity === "tecnologo agroenergetico:2008"));
  assert.ok(!report.plans.some((plan) => plan.identity === "licenciatura en vitivinicultura:2006"));
  assert.ok(!report.plans.some((plan) => plan.identity === "tecnico rural:1956"));
  assert.ok(!report.plans.some((plan) => plan.identity === "licenciatura en oceanografia biologica:1978"));
  assert.ok(!report.plans.some((plan) => plan.identity === "diplomacia:1918"));
  assert.ok(!report.plans.some((plan) => plan.identity === "licenciatura en ciencias de la comunicacion:2012"));
  assert.ok(!report.plans.some((plan) => plan.identity === "licenciatura en comunicacion generacion 2014:2012"));
  assert.ok(!report.plans.some((plan) => plan.identity === "licenciatura en comunicacion plan 2012 version 2019:2012"));
  assert.ok(!report.plans.some((plan) => plan.identity === "tecnicatura en archivo medico:2006"));
  assert.ok(!report.plans.some((plan) => plan.identity === "tecnicatura en electroencefalografia:1900"));
  assert.ok(!report.plans.some((plan) => plan.identity === "tecnicatura en electroencefalografia y neurofisiologia clinica:1990"));
  assert.ok(!report.plans.some((plan) => plan.identity === "creador plastico:1991"));
  assert.ok(!report.plans.some((plan) => plan.identity === "profesorado:1967"));
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
      for (const id of pathway.catalogCourseIds ?? []) assert.ok(ids.has(id), `${item.identity}: referencia de catálogo ${id}`);
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
    ["archivologia:2012", ["montevideo", "paysandu"]],
    ["bibliotecologia:2012", ["montevideo", "paysandu"]],
    ["lic en ingenieria biologica:2013", ["montevideo-tramo-inicial", "salto-tramo-inicial", "paysandu-carrera-completa"]],
    ["licenciatura en fisioterapia:2006", ["montevideo", "paysandu"]],
    ["licenciatura en imagenologia:2006", ["montevideo-carrera-completa", "paysandu-carrera-completa", "rio-negro-3-er-y-4-ano"]],
    ["licenciatura en instrumentacion quirurgica:2006", ["montevideo", "paysandu"]],
    ["licenciatura en laboratorio clinico:2006", ["montevideo", "paysandu"]],
    ["licenciatura en psicomotricidad:2006", ["montevideo", "paysandu"]],
    ["licenciatura en registros medicos:2006", ["montevideo", "paysandu"]],
    ["tecnicatura en anatomia patologica:2006", ["montevideo", "paysandu"]],
    ["tecnicatura en hemoterapia:2006", ["montevideo", "paysandu"]],
    ["tecnicatura en podologia:2006", ["montevideo", "paysandu"]],
    ["tecnicatura en salud ocupacional:2006", ["montevideo", "paysandu"]],
    ["tecnologo quimico:2025", ["montevideo", "paysandu"]],
    ["doctor en ciencias veterinarias:2021", ["sur-montevideo-y-san-jose-instituto-de-produccion-animal", "norte-salto-1-7-y-paysandu-8-10"]],
    ["tecnologo en administracion y contabilidad:2012", ["colonia", "mercedes", "tacuarembo", "maldonado", "rocha", "treinta-y-tres"]],
    ["licenciatura en gestion ambiental:2011", ["maldonado", "rocha", "treinta-y-tres"]],
    ["tecnologo carnico:2010", ["tacuarembo", "durazno"]],
    ["licenciatura en nutricion:2014", ["montevideo", "paysandu-solo-ciclo-iv"]],
    ["obstetra partera:1990", ["montevideo", "paysandu"]],
    ["ciclo en biologia bioquimica:2016", ["salto", "paysandu"]],
    ["tecnicatura universitaria en bienes culturales:2021", ["colonia", "paysandu", "tacuarembo"]],
    ["licenciatura en turismo:2014", ["maldonado", "salto"]],
    ["interpretacion lsu espanol lsu:2014", ["montevideo", "salto"]],
    ["tecnologo int y trad lsu esp:2025", ["montevideo", "salto"]],
    ["licenciatura biologia humana:2004", ["montevideo", "salto", "paysandu", "rivera", "tacuarembo"]],
    ["ingenieria de produccion:2010", ["montevideo", "maldonado", "paysandu", "rivera", "rocha", "salto", "tacuarembo"]],
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
