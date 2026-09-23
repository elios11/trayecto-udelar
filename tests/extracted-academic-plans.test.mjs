import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const report = await readJson("data/bedelias/inventory/ui-extracted-plans.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const officialSourceAudits = await readJson("data/bedelias/audits/official-source-audits.json");
const collectRuleCourseIds = (expression, output = []) => {
  output.push(...(expression?.options ?? []).map((option) => option.code).filter(Boolean));
  for (const child of expression?.children ?? []) collectRuleCourseIds(child, output);
  return output;
};

test("integra una sola proyección por identidad canónica vigente y excluye planes históricos verificados", () => {
  assert.equal(report.counts.canonicalCurrentIdentities, 184);
  assert.equal(report.counts.generatedPlans, 139);
  assert.equal(report.counts.excludedFromCurrentUi, 38);
  assert.equal(new Set(report.plans.map((plan) => plan.identity)).size, report.plans.length);
  assert.equal(new Set(report.plans.map((plan) => plan.planId)).size, report.plans.length);
  const catalogPlanIds = catalog
    .flatMap((faculty) => faculty.careers)
    .flatMap((career) => career.plans)
    .map((plan) => plan.id);
  assert.equal(catalogPlanIds.length, 141);
  assert.equal(new Set(catalogPlanIds).size, 139);
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
    assert.match(projection.plan.planAuditStatus, /^(official-evidence-complete|structurally-valid|extracted)$/);
    assert.match(projection.plan.courseCatalogAuditStatus, /^(verified|partial|structure-only)$/);
    const ids = new Set(projection.courses.map((course) => course.id));
    assert.equal(ids.size, projection.courses.length, `${item.identity}: ids repetidos`);
    for (const course of projection.courses) {
      assert.ok(Number.isFinite(course.credits) && course.credits >= 0, `${item.identity}/${course.id}`);
      assert.match(course.authorityStatus, /^(verified|candidate|historical-equivalent)$/);
      assert.ok(course.fieldProvenance?.inclusion);
    }
    const verifiedCourses = projection.courses.filter((course) => course.authorityStatus === "verified");
    const verifiedIds = new Set(verifiedCourses.map((course) => course.id));
    const publishedCourseIdentities = new Set(verifiedCourses.flatMap((course) => [course.id, course.bedeliasCode].filter(Boolean)));
    assert.equal(projection.plan.publishedRules, projection.publishedRules.length, item.identity);
    assert.equal(projection.plan.partialRules, projection.rules.length - projection.publishedRules.length, item.identity);
    for (const rule of projection.publishedRules) {
      assert.ok(publishedCourseIdentities.has(rule.target.code), `${item.identity}: objetivo de regla no publicado ${rule.target.code}`);
      for (const id of collectRuleCourseIds(rule.expression)) assert.ok(publishedCourseIdentities.has(id), `${item.identity}: dependencia de regla no publicada ${id}`);
    }
    for (const pathway of Object.values(projection.publishedPathways)) {
      for (const id of pathway.periods.flatMap((period) => period.courseIds)) assert.ok(verifiedIds.has(id), `${item.identity}: referencia publicada no verificada ${id}`);
      for (const id of pathway.catalogCourseIds ?? []) assert.ok(verifiedIds.has(id), `${item.identity}: referencia de catálogo no verificada ${id}`);
    }
    if (projection.plan.courseCatalogAuditStatus === "structure-only") {
      assert.equal(verifiedIds.size, 0, item.identity);
      assert.ok(Object.values(projection.publishedPathways).every((pathway) => pathway.periods.length === 0), item.identity);
      assert.match(projection.plan.notice, /(no publica su composición|validación|respald)/i);
    }
  }
});

test("cada materia explícita de una trayectoria oficial conserva una copia visible en Currícula", async () => {
  const generatedPlanByIdentity = new Map(report.plans.map((plan) => [plan.identity, plan]));
  for (const audit of officialSourceAudits.audits) {
    const generatedPlan = generatedPlanByIdentity.get(audit.identity);
    const trajectories = audit.officialPlan?.trajectories ?? [];
    if (!generatedPlan || trajectories.length === 0) continue;
    const projection = await readJson(`app/data/bedelias-generated/${generatedPlan.planId}.json`);
    const courseBySourceIdentity = new Map();
    for (const course of projection.courses) {
      for (const identity of [course.id, course.bedeliasCode, ...(course.equivalentCourseIds ?? []), ...(course.equivalentBedeliasCodes ?? [])].filter(Boolean)) {
        courseBySourceIdentity.set(String(identity), course);
      }
    }
    for (const record of projection.courseAuthority?.records ?? []) {
      if (!record.sourceCourseId || !record.canonicalCourseId) continue;
      const canonical = projection.courses.find((course) => course.id === record.canonicalCourseId);
      if (canonical) courseBySourceIdentity.set(String(record.sourceCourseId), canonical);
    }
    for (const trajectory of trajectories) {
      const publishedPathway = projection.publishedPathways?.[trajectory.id];
      assert.ok(publishedPathway, `${audit.identity}/${trajectory.id}: trayectoria oficial ausente`);
      const visibleIds = new Set([
        ...publishedPathway.periods.flatMap((period) => period.courseIds),
        ...(publishedPathway.catalogCourseIds ?? []),
      ]);
      const excludedIds = new Set((trajectory.excludedCourseIds ?? []).map(String));
      const officialCourseIds = new Set([
        ...(trajectory.courseIds ?? []),
        ...(trajectory.periods ?? []).flatMap((period) => period.courseIds ?? []),
      ].map(String).filter((id) => !excludedIds.has(id)));
      for (const sourceId of officialCourseIds) {
        const course = courseBySourceIdentity.get(sourceId)
          ?? projection.courses.find((candidate) => candidate.id.endsWith(`-${sourceId.toLocaleLowerCase("es-UY")}`));
        assert.ok(course, `${audit.identity}/${trajectory.id}: materia oficial sin representación ${sourceId}`);
        assert.equal(course.authorityStatus, "verified", `${audit.identity}/${trajectory.id}: materia oficial no verificada ${sourceId}`);
        assert.ok(visibleIds.has(course.id), `${audit.identity}/${trajectory.id}: materia oficial fuera de Currícula ${sourceId} -> ${course.id}`);
      }
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
    ["bioquimico clinico:2015", ["montevideo", "salto"]],
    ["licenciatura en quimica:2016", ["montevideo", "salto"]],
    ["quimico:2015", ["montevideo", "paysandu", "salto"]],
    ["tecnico bach en cs quimicas:2015", ["montevideo", "salto"]],
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
    ["ingenieria industrial mecanica:1997", ["montevideo", "paysandu", "tacuarembo"]],
    ["ingenieria quimica:2021", ["montevideo", "salto"]],
    ["licenciatura en computacion:2025", ["montevideo", "tacuarembo", "colonia", "salto", "paysandu"]],
    ["tecnologo en informatica:2007", ["montevideo", "florida", "san-jose", "maldonado", "paysandu"]],
    ["tecnologo en telecomunicaciones:2009", ["rocha", "montevideo"]],
    ["tecnologo industrial mecanico:2016", ["montevideo", "paysandu"]],
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
  assert.ok(Object.values(education.publishedPathways).every((pathway) => pathway.periods.length === 0));
  assert.equal(education.plan.courseCatalogAuditStatus, "structure-only");
  assert.ok(education.courses.every((course) => course.authorityStatus === "candidate"));

  const sports = await readJson("app/data/bedelias-generated/bedelias-isef-tecnicatura-en-deportes-2007.json");
  assert.equal(sports.plan.durationMonths, 24);
  assert.equal(sports.plan.minCredits, 160);
  assert.deepEqual(Object.keys(sports.pathways), ["futbol", "actividades-acuaticas", "atletismo"]);
  assert.deepEqual(sports.pathways.futbol.campusIds, ["montevideo"]);
  assert.deepEqual(sports.pathways["actividades-acuaticas"].campusIds, ["rocha"]);
  assert.deepEqual(sports.pathways.atletismo.campusIds, ["paysandu"]);
  assert.ok(Object.values(sports.publishedPathways).every((pathway) => pathway.periods.length === 0));
  assert.equal(sports.plan.courseCatalogAuditStatus, "structure-only");
  assert.ok(!sports.campuses.some((campus) => campus.id === "rivera"));
  assert.match(sports.plan.notice, /no tiene ingreso abierto/i);

  const psychology = await readJson("app/data/bedelias-generated/bedelias-psico-licenciatura-en-psicologia-2013.json");
  assert.equal(psychology.plan.durationMonths, 48);
  assert.equal(psychology.plan.minCredits, 320);
  assert.deepEqual(psychology.campuses.map((campus) => campus.id), ["montevideo", "salto", "paysandu"]);
  assert.ok(!psychology.campuses.some((campus) => ["maldonado", "rocha", "treinta-y-tres"].includes(campus.id)));
});

test("el reporte queda ligado por hash a sus tres entradas reproducibles", () => {
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.counts.afterPublishedCourses, report.counts.courseAuthority.verified);
  assert.ok(report.counts.beforePublishedCourses > report.counts.afterPublishedCourses);
  assert.ok(report.counts.beforePublishedRules > report.counts.afterPublishedRules);
  assert.ok(report.counts.visibleTargetsWithUnpublishedDependencies > 0);
  assert.equal(report.counts.afterPublishedRules, report.plans.reduce((sum, plan) => sum + plan.after.publishedRules, 0));
  assert.equal(report.counts.visibleTargetsWithUnpublishedDependencies, report.plans.reduce((sum, plan) => sum + plan.after.rulesWithUnpublishedDependencies, 0));
  assert.equal(report.counts.plansWithVerifiedCatalog + report.counts.plansWithPartialCatalog + report.counts.plansWithStructureOnly, report.counts.generatedPlans);
  assert.match(report.contentHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(report.generatedFrom.auditQueueHash, /^sha256:/);
  assert.match(report.generatedFrom.officialAuditHash, /^sha256:/);
  assert.match(report.generatedFrom.globalManifestHash, /^sha256:/);
});

test("la contención conserva candidatos para importaciones sin publicarlos en rutas normales", async () => {
  const psychology = await readJson("app/data/bedelias-generated/bedelias-psico-licenciatura-en-psicologia-2013.json");
  assert.ok(psychology.courses.length > 2_000);
  assert.ok(psychology.courses.every((course) => course.authorityStatus === "candidate"));
  assert.ok(Object.values(psychology.publishedPathways).every((pathway) => pathway.periods.length === 0 && (pathway.catalogCourseIds ?? []).length === 0));
  assert.equal(psychology.plan.planAuditStatus, "official-evidence-complete");
  assert.equal(psychology.plan.courseCatalogAuditStatus, "structure-only");
  assert.equal(psychology.plan.extractedCompositionAvailable, true);
  assert.equal(psychology.plan.verifiedCompositionAvailable, false);
  assert.equal(psychology.plan.compositionAvailable, true);

  const economics = await readJson("app/data/bedelias-generated/bedelias-fcea-licenciatura-en-economia-2012.json");
  const candidate = economics.courses.find((course) => course.authorityStatus === "candidate");
  assert.ok(candidate, "el candidato queda recuperable para una importación previa o D02");
  const visibleIds = new Set(Object.values(economics.publishedPathways).flatMap((pathway) => [
    ...pathway.periods.flatMap((period) => period.courseIds),
    ...(pathway.catalogCourseIds ?? []),
  ]));
  assert.ok(!visibleIds.has(candidate.id));
  assert.equal(economics.plan.courseCatalogAuditStatus, "partial");
});
