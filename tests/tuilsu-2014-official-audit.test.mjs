import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-interpretacion-lsu-espanol-lsu-2014.json");
const officialAudit = audits.audits.find(({ identity }) => identity === "interpretacion lsu espanol lsu:2014");
const credentials = new Map(projection.creditStructure.credentials.map((credential) => [credential.id, credential]));
const courses = new Map(projection.courses.map((course) => [course.id, course]));

test("publica una sola carrera TUILSU con los planes 2025 y 2014", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Tecnólogo en Interpretación y Traducción LSU-español")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fhum");
  assert.deepEqual(matches[0].career.plans, [
    {
      id: "bedelias-fhum-tecnologo-int-y-trad-lsu-esp-2025",
      label: "Plan 2025 · vigente",
      defaultTrajectoryId: "estudiante-oyente",
      defaultCredentialId: "tecnologo-tuilsu-oyente",
    },
    {
      id: "bedelias-fhum-interpretacion-lsu-espanol-lsu-2014",
      label: "Plan 2014 · vigente",
      defaultTrajectoryId: "estudiante-oyente",
      defaultCredentialId: "tecnologo-tuilsu-oyente",
    },
  ]);
  assert.deepEqual(
    [projection.plan.degreeTitle, projection.plan.durationMonths, projection.plan.minCredits],
    ["Tecnólogo en Interpretación y Traducción LSU-español", 36, 270],
  );
  assert.match(projection.plan.notice, /Plan 2025/);
});

test("ofrece Montevideo y Salto sin convertir las cohortes de Tacuarembó en sede vigente", () => {
  assert.deepEqual(projection.campuses.map(({ id }) => id), ["montevideo", "salto"]);
  assert.ok(projection.campuses.every(({ defaultPathwayId }) => defaultPathwayId === "estudiante-oyente"));
  assert.ok(Object.values(projection.pathways)
    .every(({ campusIds }) => campusIds.join(",") === "montevideo,salto"));
  const tacuarembo = officialAudit.offerings.find(({ serviceCode }) => serviceCode === "CUT");
  assert.equal(tacuarembo.admissionStatus, "historical-not-current");
  assert.equal(officialAudit.conclusion.regionalCurriculumVariant, false);
});

test("separa el recorrido lingüístico para estudiantes oyentes y sordos", () => {
  assert.deepEqual(Object.keys(projection.pathways), ["estudiante-oyente", "estudiante-sordo"]);
  const codesFor = (pathwayId) => new Set(projection.pathways[pathwayId].periods
    .flatMap(({ courseIds }) => courseIds)
    .map((id) => courses.get(id)?.bedeliasCode));
  const hearing = codesFor("estudiante-oyente");
  const deaf = codesFor("estudiante-sordo");

  assert.ok(["IL17", "IL19", "IL21", "IL27", "IL31"].every((code) => hearing.has(code)));
  assert.ok(["LI114", "IL16", "IL20", "IL26", "IL32"].every((code) => deaf.has(code)));
  assert.ok(["IL16", "IL20", "IL26", "IL32"].every((code) => !hearing.has(code)));
  assert.ok(["IL17", "IL19", "IL21", "IL27", "IL31"].every((code) => !deaf.has(code)));
  assert.equal(projection.pathways["estudiante-oyente"].credentialId, "tecnologo-tuilsu-oyente");
  assert.equal(projection.pathways["estudiante-sordo"].credentialId, "tecnologo-tuilsu-sordo");
});

test("controla los siete mínimos oficiales que suman 270 créditos", () => {
  const nodes = projection.creditStructure.nodes.filter(({ id }) => id !== "plan-total");
  assert.deepEqual(nodes.map(({ minCredits }) => minCredits), [112, 52, 46, 22, 10, 26, 2]);
  assert.equal(nodes.reduce((sum, { minCredits }) => sum + minCredits, 0), 270);
  for (const credential of credentials.values()) {
    assert.equal(credential.minTotalCredits, 270);
    assert.deepEqual(
      credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]),
      nodes.map(({ id, minCredits }) => [id, minCredits]),
    );
    assert.equal(credential.title, "Tecnólogo en Interpretación y Traducción LSU-Español");
  }
});

test("exige el núcleo, cuatro niveles de segunda lengua y tres pasantías", () => {
  const hearing = new Map(credentials.get("tecnologo-tuilsu-oyente").requiredCourseGroups
    .map((group) => [group.id, group]));
  const deaf = new Map(credentials.get("tecnologo-tuilsu-sordo").requiredCourseGroups
    .map((group) => [group.id, group]));
  for (const id of [
    "tuilsu-university-intro", "tuilsu-studies-sordos", "tuilsu-linguistic-1",
    "tuilsu-linguistic-2", "tuilsu-video-1", "tuilsu-theory", "tuilsu-video-2",
    "tuilsu-method-1", "tuilsu-method-2", "tuilsu-method-3", "tuilsu-method-4",
    "validacion-final-plan",
  ]) assert.equal(hearing.get(id).minCompleted, 1);
  assert.equal(hearing.get("tuilsu-pasantias").minCompleted, 3);
  assert.equal(deaf.get("tuilsu-pasantias").minCompleted, 3);
  assert.equal(hearing.get("tuilsu-oyente-structure").minCompleted, 1);
  assert.equal(deaf.get("tuilsu-sordo-structure").minCompleted, 1);
  assert.ok([1, 2, 3, 4].every((level) => hearing.get(`tuilsu-oyente-language-${level}`).minCompleted === 1));
  assert.ok([1, 2, 3, 4].every((level) => deaf.get(`tuilsu-sordo-language-${level}`).minCompleted === 1));
});

test("mantiene todo el catálogo flexible sin exigir la malla sugerida de 274 créditos", () => {
  assert.equal(projection.courses.length, 201);
  for (const pathway of Object.values(projection.pathways)) {
    const scheduled = new Set(pathway.periods.flatMap(({ courseIds }) => courseIds));
    assert.equal(new Set([...scheduled, ...pathway.catalogCourseIds]).size, 201);
  }
  for (const id of ["tuilsu-optionals", "tuilsu-electives", "tuilsu-integrated"]) {
    assert.ok(projection.courses.some(({ eligibleRequirementIds }) => eligibleRequirementIds.includes(id)));
  }
  assert.match(officialAudit.anomalies.find(({ field }) => field === "suggestedCredits").resolution, /274/);
  assert.equal(projection.rules.length, 29);
  assert.equal(projection.plan.noPublishedRule, 173);
  assert.equal(projection.courses.filter(({ credits }) => credits === 0).length, 43);
});
