import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fhum-antropologia-2014.json");
const officialAudit = audits.audits.find(({ identity }) => identity === "antropologia:2014");
const courseById = new Map(projection.courses.map((course) => [course.id, course]));
const optionIds = ["antropologia-biologica", "arqueologia", "antropologia-social"];
const optionDetails = {
  "antropologia-biologica": {
    credentialId: "titulo-antropologia-biologica",
    title: "Licenciado en Ciencias Antropológicas opción Antropología Biológica",
    optionNodeId: "anth-options-biological",
    specificNodeIds: ["anth-biological-specific-i", "anth-biological-specific-ii"],
    periodPattern: /Antropología Biológica/,
  },
  arqueologia: {
    credentialId: "titulo-arqueologia",
    title: "Licenciado en Ciencias Antropológicas opción Arqueología",
    optionNodeId: "anth-options-archaeology",
    specificNodeIds: ["anth-archaeology-specific-i", "anth-archaeology-specific-ii"],
    periodPattern: /Arqueología/,
  },
  "antropologia-social": {
    credentialId: "titulo-antropologia-social",
    title: "Licenciado en Ciencias Antropológicas opción Antropología Social",
    optionNodeId: "anth-options-social",
    specificNodeIds: ["anth-social-specific-i", "anth-social-specific-ii"],
    periodPattern: /Antropología Social/,
  },
};

test("publica una sola Licenciatura en Ciencias Antropológicas Plan 2014", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => /Ciencias Antropológicas/i.test(career.label))
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fhum");
  assert.deepEqual(matches[0].career.plans, [{
    id: "bedelias-fhum-antropologia-2014",
    label: "Plan 2014 · vigente",
    defaultTrajectoryId: "antropologia-biologica",
    defaultCredentialId: "titulo-antropologia-biologica",
  }]);
  assert.deepEqual(
    [projection.plan.degreeTitle, projection.plan.durationMonths, projection.plan.minCredits],
    ["Licenciado en Ciencias Antropológicas", 48, 360],
  );
  assert.deepEqual(projection.campuses, [{
    id: "montevideo",
    label: "Montevideo",
    official: true,
    defaultPathwayId: "antropologia-biologica",
  }]);
  assert.equal(officialAudit.conclusion.canonicalModel, "one-degree-three-titled-options");
});

test("expone las tres opciones oficiales con su título y sólo sus áreas específicas", () => {
  assert.deepEqual(Object.keys(projection.pathways), optionIds);
  assert.equal(projection.creditStructure.credentials.length, 3);

  for (const optionId of optionIds) {
    const detail = optionDetails[optionId];
    const pathway = projection.pathways[optionId];
    const credential = projection.creditStructure.credentials.find(({ id }) => id === detail.credentialId);
    const periodLabels = pathway.periods.map(({ label }) => label);
    const visibleIds = pathway.periods.flatMap(({ courseIds }) => courseIds);
    const referencedIds = [...visibleIds, ...(pathway.catalogCourseIds ?? [])];

    assert.equal(pathway.credentialId, detail.credentialId);
    assert.equal(credential.title, detail.title);
    assert.equal(periodLabels.filter((label) => /^Específica (?:I|II)/.test(label)).length, 2);
    assert.ok(periodLabels.filter((label) => /^Específica (?:I|II)/.test(label)).every((label) => detail.periodPattern.test(label)));
    assert.ok(referencedIds.every((id) => courseById.has(id)));
    assert.ok(visibleIds.includes("fhum-validacion-final-plan"));
    assert.ok(pathway.catalogCourseIds.length > 0);
  }
});

test("representa los mínimos de 360 créditos sin duplicar los submínimos", () => {
  const nodes = new Map(projection.creditStructure.nodes.map((node) => [node.id, node]));
  assert.equal(nodes.get("plan-total").minCredits, 360);
  assert.equal(114 + 84 + 58 + 66 + 38, 360);
  assert.deepEqual([
    nodes.get("anth-general").minCredits,
    nodes.get("anth-options").minCredits,
    nodes.get("anth-electives").minCredits,
  ], [114, 84, 58]);
  assert.deepEqual([
    nodes.get("anth-language").minCredits,
    nodes.get("anth-extension").minCredits,
  ], [8, 12]);
  assert.equal(nodes.get("anth-language").parentId, "anth-general");
  assert.equal(nodes.get("anth-extension").parentId, "anth-general");

  for (const optionId of optionIds) {
    const detail = optionDetails[optionId];
    const credential = projection.creditStructure.credentials.find(({ id }) => id === detail.credentialId);
    const requirements = new Map(credential.nodeRequirements.map(({ nodeId, minCredits }) => [nodeId, minCredits]));
    assert.equal(requirements.get(detail.optionNodeId), 52);
    assert.equal(detail.specificNodeIds.reduce((sum, nodeId) => sum + requirements.get(nodeId), 0), 104);
    assert.deepEqual(
      ["anth-options-biological", "anth-options-archaeology", "anth-options-social"]
        .filter((nodeId) => nodeId !== detail.optionNodeId)
        .map((nodeId) => requirements.get(nodeId)),
      [16, 16],
    );
  }
});

test("exige la validación final de la opción y del plan individual", () => {
  const validation = courseById.get("fhum-validacion-final-plan");
  assert.equal(validation.credits, 0);
  assert.equal(validation.curricularBlock, true);
  for (const credential of projection.creditStructure.credentials) {
    assert.deepEqual(credential.requiredCourseGroups, [{
      id: "validacion-final-plan",
      label: "Validación final de la opción y del plan de optativas por la Comisión de Carrera",
      minCompleted: 1,
      courseIds: ["fhum-validacion-final-plan"],
      sourceUrl: "https://fhce.edu.uy/wp-content/uploads/2023/01/Nuevo-Plan-Antropologia.pdf",
    }]);
  }
});

test("conserva las previas publicadas y no inventa una tesis separada", () => {
  assert.equal(projection.rules.length, 83);
  assert.equal(projection.plan.publishedRules, 83);
  assert.equal(projection.plan.noPublishedRule, 182);
  assert.equal(projection.courses.filter(({ name }) => /tesis/i.test(name)).length, 0);
  assert.ok(Object.values(projection.pathways).every(({ periods }) => periods.some(({ label }) => /Específica II/.test(label))));
  assert.match(officialAudit.anomalies.find(({ field }) => field === "finalWork").resolution, /seminarios|talleres/i);
});
