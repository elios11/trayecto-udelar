import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fder-traductorado-publico-aleman-2022.json");
const canonicalAudit = audits.audits.find(({ identity }) => identity === "traductorado publico aleman:2022");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const languageIds = ["aleman", "frances", "ingles", "italiano", "portugues"];
const expectedTitles = {
  aleman: "Licenciado/a en Traducción Pública en Lengua Alemana",
  frances: "Licenciado/a en Traducción Pública en Lengua Francesa",
  ingles: "Licenciado/a en Traducción Pública en Lengua Inglesa",
  italiano: "Licenciado/a en Traducción Pública en Lengua Italiana",
  portugues: "Licenciado/a en Traducción Pública en Lengua Portuguesa",
};

test("publica una sola Licenciatura en Traducción Pública Plan 2022", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => /Traducción Pública/i.test(career.label))
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fder");
  assert.deepEqual(matches[0].career.plans, [{
    id: "bedelias-fder-traductorado-publico-aleman-2022",
    label: "Plan 2022 · vigente",
    defaultTrajectoryId: "lengua-aleman",
    defaultCredentialId: "titulo-aleman",
  }]);
  assert.deepEqual(
    [projection.plan.degreeTitle, projection.plan.durationMonths, projection.plan.minCredits],
    ["Licenciado/a en Traducción Pública", 48, 320],
  );
  assert.deepEqual(projection.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "lengua-aleman",
  }]);
  assert.equal(canonicalAudit.conclusion.canonicalModel, "one-translation-degree-five-language-credentials");
});

test("cada lengua conserva su malla y su título específicos sin referencias faltantes", () => {
  assert.equal(projection.courses.length, 106);
  assert.deepEqual(Object.keys(projection.pathways), languageIds.map((language) => `lengua-${language}`));
  assert.equal(projection.creditStructure.credentials.length, 5);

  for (const language of languageIds) {
    const pathway = projection.pathways[`lengua-${language}`];
    const credential = projection.creditStructure.credentials.find(({ id }) => id === `titulo-${language}`);
    const visibleIds = pathway.periods.flatMap(({ courseIds }) => courseIds);
    const referencedIds = [...visibleIds, ...(pathway.catalogCourseIds ?? [])];
    assert.equal(pathway.credentialId, `titulo-${language}`);
    assert.equal(credential.title, expectedTitles[language]);
    assert.equal(pathway.periods.length, 9);
    assert.equal(visibleIds.length, 42);
    assert.equal(new Set(visibleIds).size, 42);
    assert.equal(pathway.catalogCourseIds.length, 64);
    assert.ok(referencedIds.every((id) => courseById.has(id)));
    assert.equal(visibleIds.reduce((sum, id) => sum + courseById.get(id).credits, 0), 320);
    assert.ok(visibleIds.includes("fder-espanol-1"));
    assert.ok(visibleIds.includes(`fder-${language}-lengua-1`));
    assert.ok(languageIds.filter((other) => other !== language)
      .every((other) => !visibleIds.some((id) => id.startsWith(`fder-${other}-`))));
    assert.deepEqual(credential.requiredCourseGroups.map(({ minCompleted, courseIds }) => [minCompleted, courseIds.length]), [[40, 40]]);
  }
});

test("controla las cuatro áreas y el subconjunto social sin sumar diez créditos extra", () => {
  const nodes = new Map(projection.creditStructure.nodes.map((node) => [node.id, node]));
  assert.deepEqual([
    nodes.get("translation-linguistic").minCredits,
    nodes.get("translation-legal").minCredits,
    nodes.get("translation-professional").minCredits,
    nodes.get("translation-flexible").minCredits,
  ], [112, 84, 84, 40]);
  assert.equal(nodes.get("translation-social-productive").parentId, "translation-flexible");
  assert.equal(nodes.get("translation-social-productive").minCredits, 10);
  assert.equal(112 + 84 + 84 + 40, 320);
  for (const credential of projection.creditStructure.credentials) {
    assert.deepEqual(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]), [
      ["translation-linguistic", 112],
      ["translation-legal", 84],
      ["translation-professional", 84],
      ["translation-flexible", 40],
      ["translation-social-productive", 10],
    ]);
  }
});

test("mantiene las carpetas finales dentro de Práctica II y IV", () => {
  for (const language of languageIds) {
    assert.equal(courseById.get(`fder-${language}-practica-2`).credits, 12);
    assert.equal(courseById.get(`fder-${language}-practica-4`).credits, 16);
  }
  assert.equal(projection.courses.filter(({ name }) => /trabajo final|carpeta final/i.test(name)).length, 0);
  assert.match(canonicalAudit.anomalies.find(({ field }) => field === "portfolioCredits").resolution, /ya están incluid[oa]s/i);
});

test("aplica las previas vigentes a las materias comunes y a las cinco lenguas", () => {
  assert.equal(projection.rules.length, 94);
  const rules = new Map(projection.rules.map((rule) => [rule.target.code, rule]));
  assert.equal(rules.get("fder-espanol-2").expression.children[0].options[0].code, "fder-espanol-1");
  for (const language of languageIds) {
    assert.equal(
      rules.get(`fder-${language}-lengua-8`).expression.children[0].options[0].code,
      `fder-${language}-lengua-7`,
    );
    assert.ok(rules.has(`fder-${language}-practica-4`));
  }
  assert.equal(projection.plan.publishedRules, 94);
  assert.equal(projection.plan.noPublishedRule, 0);
});

test("excluye las cuatro ofertas idiomáticas duplicadas y normaliza la anomalía inglesa", () => {
  const aliasIds = languageIds.slice(1).map((language) => `traductorado publico ${language}:2022`);
  for (const identity of aliasIds) {
    const alias = audits.audits.find((audit) => audit.identity === identity);
    assert.equal(alias.conclusion.canonicalIdentity, "traductorado publico aleman:2022");
    assert.equal(alias.conclusion.excludeFromCurrentUi, true);
  }
  const anomaly = canonicalAudit.anomalies.find(({ field }) => field === "englishFourthYearMinimum");
  assert.match(anomaly.resolution, /72 créditos/i);
  assert.equal(projection.pathways["lengua-ingles"].periods.at(-2).courseIds.length, 5);
});
