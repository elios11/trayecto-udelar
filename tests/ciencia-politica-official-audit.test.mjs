import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fcs-licenciatura-en-ciencia-politica-2009.json");
const audit = audits.audits.find((entry) => entry.identity === "licenciatura en ciencia politica:2009");
const credential = projection.creditStructure.credentials[0];

test("publica una única Licenciatura en Ciencia Política vigente en Montevideo", () => {
  const matches = catalog.flatMap((faculty) => faculty.careers
    .filter((career) => career.label === "Licenciatura en Ciencia Política")
    .map((career) => ({ faculty, career })));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].faculty.id, "bedelias-fcs");
  assert.equal(matches[0].career.plans[0].label, "Plan 2009 · vigente");
  assert.equal(projection.plan.degreeTitle, "Licenciado en Ciencia Política");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.campuses.map(({ id, label }) => ({ id, label })), [
    { id: "montevideo", label: "Montevideo" },
  ]);
  assert.deepEqual(Object.keys(projection.pathways), ["bedelias"]);
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
});

test("conserva los 120 créditos iniciales y 240 avanzados por módulos", () => {
  const requirements = new Map(projection.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  const moduleIds = [
    "cp-ci-introduccion",
    "cp-ci-metodos",
    "cp-ci-tematicas",
    "cp-ci-optativas",
    "cp-sistema-politico",
    "cp-instituciones",
    "cp-estado-politicas",
    "cp-teoria",
    "cp-metodologia",
    "cp-complementarias",
    "cp-profundizacion",
    "cp-trabajo-final",
  ];
  assert.deepEqual(moduleIds.map((id) => requirements.get(id)), [48, 26, 8, 38, 24, 24, 24, 24, 39, 39, 36, 30]);
  assert.equal(moduleIds.slice(0, 4).reduce((sum, id) => sum + requirements.get(id), 0), 120);
  assert.equal(moduleIds.slice(4).reduce((sum, id) => sum + requirements.get(id), 0), 240);
  assert.equal(moduleIds.reduce((sum, id) => sum + requirements.get(id), 0), 360);
  assert.deepEqual(credential.nodeRequirements.map(({ nodeId }) => nodeId), moduleIds);
});

test("reproduce ocho semestres, el solapamiento de ciclos y el catálogo flexible", () => {
  assert.equal(projection.courses.length, 57);
  assert.deepEqual(projection.pathways.bedelias.periods.map(({ label }) => label), [
    "1.er semestre",
    "2.º semestre",
    "3.er semestre",
    "4.º semestre",
    "5.º semestre",
    "6.º semestre",
    "7.º semestre",
    "8.º semestre",
  ]);
  const periods = new Map(projection.pathways.bedelias.periods.map((period) => [period.label, period.courseIds]));
  assert.ok(periods.get("3.er semestre").includes("fcs-ci-politicas-publicas"));
  assert.ok(periods.get("3.er semestre").includes("fcs-c60"));
  assert.ok(periods.get("4.º semestre").includes("fcs-ci-desafios-contemporaneos"));
  assert.ok(periods.get("4.º semestre").includes("fcs-c51"));
  assert.deepEqual(projection.pathways.bedelias.catalogCourseIds, [
    "fcs-ci-optativas-generales",
    "fcs-cp-educacion-desarrollo",
    "fcs-cp-economia-discriminacion",
    "fcs-cp-desigualdad-pobreza",
    "fcs-cp-economia-publica",
    "fcs-cp-mercado-trabajo-familia",
    "fcs-cp-economia-internacional",
    "fcs-cp-monografia-final",
    "fcs-cp-pasantia-final",
  ]);
  const placements = [
    ...projection.pathways.bedelias.periods.flatMap(({ courseIds }) => courseIds),
    ...projection.pathways.bedelias.catalogCourseIds,
  ];
  assert.equal(placements.length, 57);
  assert.equal(new Set(placements).size, 57);
  assert.ok(projection.pathways.bedelias.periods.every(({ label }) => !/catálogo|trabajo final/i.test(label)));

  const malla = audit.sources.find(({ url }) => url.endsWith("CP-Malla-2511.pdf"));
  const cicloInicial = audit.sources.find(({ url }) => url.endsWith("CI-Malla-04062026.pdf"));
  assert.equal(malla.contentHash, "sha256:8eca41a377719c845d06da0d6650c89e484e5a1ef4f02b6330cefd2ecf8c0898");
  assert.equal(cicloInicial.contentHash, "sha256:719f4d62b5aa20036dab142d9bf7a270ad837f59e679ea8012fb331c9932aa73");
});

test("distingue núcleo obligatorio y alternativas sin exigir todo el catálogo", () => {

  const groups = new Map(credential.requiredCourseGroups.map((group) => [group.id, group]));
  assert.deepEqual(
    [
      "cp-nucleo-obligatorio",
      "cp-ci-introduccion-alternativa",
      "cp-ci-matematica",
      "cp-ci-tematica",
      "cp-instituciones-3",
      "cp-estado-4",
      "cp-teoria-3",
      "cp-cuantitativas",
      "cp-analisis-economico-base",
      "cp-trabajo-final-modalidad",
    ].map((id) => [groups.get(id).minCompleted, groups.get(id).courseIds.length]),
    [[27, 27], [1, 3], [1, 2], [1, 5], [1, 3], [1, 2], [1, 2], [1, 2], [1, 2], [1, 2]],
  );
  assert.deepEqual(groups.get("cp-analisis-economico-base").courseIds
    .map((id) => projection.courses.find((course) => course.id === id).credits), [4, 4]);
  assert.deepEqual(groups.get("cp-trabajo-final-modalidad").courseIds
    .map((id) => projection.courses.find((course) => course.id === id).credits), [30, 30]);
});

test("no endurece como aprobación las previas que admiten condición reglamentada", () => {
  assert.equal(projection.rules.length, 0);
  assert.match(projection.plan.notice, /condición de reglamentado/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "prerequisites").resolution, /no la sustituye por aprobación obligatoria/i);
  assert.match(audit.anomalies.find((entry) => entry.field === "cycleOverlap").resolution, /48 créditos/i);
});
