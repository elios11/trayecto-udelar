import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fcs-licenciatura-en-sociologia-2009.json");
const audit = audits.audits.find((entry) => entry.identity === "licenciatura en sociologia:2009");
const credential = projection.creditStructure.credentials[0];

test("publica una única Licenciatura en Sociología vigente en Montevideo", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Sociología")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fcs");
  assert.equal(matches[0].career.plans[0].label, "Plan 2009 · vigente");
  assert.equal(projection.plan.degreeTitle, "Licenciado en Sociología");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.campuses.map(({ id, label }) => ({ id, label })), [
    { id: "montevideo", label: "Montevideo" },
  ]);
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});

test("conserva 120 créditos iniciales y los seis módulos avanzados por 240", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  const initialIds = ["soc-ci-introduccion", "soc-ci-metodos", "soc-ci-tematicas", "soc-ci-optativas"];
  const advancedIds = ["soc-teorias", "soc-metodologia", "soc-especiales", "soc-otras-ciencias", "soc-talleres", "soc-trabajo-final"];
  assert.deepEqual(initialIds.map((id) => requirements.get(id)), [48, 26, 8, 38]);
  assert.deepEqual(advancedIds.map((id) => requirements.get(id)), [40, 40, 40, 30, 60, 30]);
  assert.equal(initialIds.reduce((sum, id) => sum + requirements.get(id), 0), 120);
  assert.equal(advancedIds.reduce((sum, id) => sum + requirements.get(id), 0), 240);
  assert.equal(credential.nodeRequirements.reduce((sum, item) => sum + item.minCredits, 0), 360);
});

test("mantiene el núcleo, la flexibilidad anual y las dos modalidades de egreso", () => {
  assert.equal(projection.courses.length, 41);
  assert.equal(projection.pathways.bedelias.periods.length, 10);
  const groups = new Map(credential.requiredCourseGroups.map((group) => [group.id, group]));
  assert.deepEqual(
    ["soc-nucleo-obligatorio", "soc-ci-introduccion-alternativa", "soc-ci-matematica", "soc-ci-tematica", "soc-trabajo-final-modalidad"]
      .map((id) => [groups.get(id).minCompleted, groups.get(id).courseIds.length]),
    [[29, 29], [1, 3], [1, 2], [1, 5], [1, 2]],
  );
  assert.deepEqual(groups.get("soc-trabajo-final-modalidad").courseIds
    .map((id) => projection.courses.find((course) => course.id === id).credits), [30, 30]);
  assert.match(projection.courses.find((course) => course.id === "fcs-soc-especiales-electivas").name, /Sociologías Especiales/i);
  assert.match(projection.courses.find((course) => course.id === "fcs-soc-seminario-taller-vinculado").name, /Taller Central elegido/i);
  assert.match(projection.plan.notice, /no constituyen trayectorias permanentes/i);
});

test("automatiza sólo las condiciones inequívocas del Taller y el umbral final", () => {
  const rules = new Map(projection.rules.map((rule) => [rule.target.code, rule]));
  assert.deepEqual([...rules.keys()], [
    "fcs-soc-taller-central-1",
    "fcs-soc-taller-central-2",
    "fcs-soc-monografia-final",
    "fcs-soc-pasantia-final",
  ]);
  assert.equal(rules.get("fcs-soc-taller-central-1").expression.children.length, 6);
  assert.equal(rules.get("fcs-soc-taller-central-2").expression.children.length, 3);
  assert.deepEqual(
    ["fcs-soc-monografia-final", "fcs-soc-pasantia-final"]
      .map((id) => rules.get(id).expression.children[0].creditRequirement.minimum),
    [330, 330],
  );
  assert.equal(rules.has("fcs-soc-teoria-2"), false);
  assert.match(projection.plan.notice, /condición de reglamentado/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "examPrerequisites").resolution, /no la sustituye por aprobación obligatoria/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "advancedCycleEntry").resolution, /48/i);
});
