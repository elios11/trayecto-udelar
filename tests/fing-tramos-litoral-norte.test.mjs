import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation, completeRegisteredPlanCourses } from "../app/registered-plan-courses.mjs";
import { resolveCampusPathway } from "../app/academic-campus.mjs";

const root = new URL("../", import.meta.url);
const read = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const inventory = await read("data/official-trajectories/inventory.json");

test("el inventario de Físico-Matemática conserva los nueve ejemplos y la transcripción de Procesos", async () => {
  const source = await read("data/official-trajectories/fing-ifm-2017-perfiles-inventario.json");
  assert.equal(new Set(source.profiles.map(({ resourceId }) => resourceId)).size, 7);
  assert.equal(source.profiles.flatMap(({ examples }) => examples).length, 9);
  for (const profile of source.profiles) {
    assert.match(profile.sha256, /^[a-f0-9]{64}$/);
    for (const example of profile.examples) assert.equal(example.semesters, 10);
  }
  const [{ examples: [processes] }] = source.profiles;
  const totals = processes.rows.map((rows) => rows.reduce((sum, [, credits]) => sum + credits, 0));
  assert.deepEqual(totals, processes.printedSemesterTotals);
  assert.equal(totals.reduce((total, value) => total + value, 0), processes.printedCredits);
  assert.deepEqual(processes.rows[2].find(([name]) => name === "Princ. Quím. Gral."), ["Princ. Quím. Gral.", 8]);
});

test("los ejemplos de Física cierran en 451 créditos y su proyecto es una sola actividad", async () => {
  const source = await read("data/official-trajectories/fing-ifm-2017-fisica-ejemplos.json");
  const projection = await read(`app/data/bedelias-generated/${source.planId}.json`);
  const courses = new Map(projection.courses.filter(({ bedeliasCode }) => bedeliasCode).map((course) => [course.bedeliasCode, course]));
  const { project, internship } = source.activityReconciliation;
  const guideRows = [...source.common, ...source.examples.flatMap(({ periods4To10 }) => periods4To10)].flat();
  for (const [label, evidence] of Object.entries(source.supplementalCourseEvidence)) {
    assert.ok(guideRows.some(([name, credits]) => name === label && credits === evidence.credits), label);
    assert.equal(Object.hasOwn(source.catalogMatches, label), false, label);
    if (evidence.status === "source-only-in-plan") {
      assert.ok(evidence.programmeUrl && evidence.codeUrl, label);
      assert.equal(courses.has(evidence.code), false, label);
    }
  }
  assert.equal(source.examples.length, 2);
  for (const example of source.examples) {
    const periods = [...source.common, ...example.periods4To10];
    assert.equal(periods.length, 10);
    const totals = periods.map((rows) => rows.reduce((sum, [, credits]) => sum + credits, 0));
    assert.deepEqual(totals, example.publishedSemesterTotals);
    assert.equal(totals.reduce((sum, credits) => sum + credits, 0), example.publishedTotal);
    const projectRows = periods.flatMap((rows, i) => rows.filter(([name]) => name === "Proyecto")
      .map(([, credits]) => [i + 1, credits]));
    assert.deepEqual(projectRows, project.placements);
    assert.equal(projectRows.reduce((sum, [, credits]) => sum + credits, 0), courses.get(project.bedeliasCode).credits);
    assert.equal(courses.get(project.bedeliasCode).credits, 35);
    assert.ok(periods[internship.semester - 1].some(([name, credits]) => name === "Pasantía" && credits === internship.credits));
    for (const [name, credits] of periods.flat()) {
      if (Object.hasOwn(source.catalogMatches, name)) assert.equal(courses.get(source.catalogMatches[name])?.credits, credits, name);
    }
    const id = `fisica-ejemplo-${example.id}`;
    const view = buildRegisteredPlanPresentation(id, projection);
    assert.equal(view.generated, false);
    assert.equal(view.periods.length, 10);
    const ids = view.periods.flatMap(({ courseIds }) => courseIds);
    const projectId = courses.get(project.bedeliasCode).id;
    assert.equal(ids.filter((id) => id === projectId).length, 1);
    assert.ok(view.periods[9].courseIds.includes(projectId));
    const placeholders = view.courses.filter(({ placeholder }) => placeholder);
    assert.ok(placeholders.length > 0);
    assert.ok(placeholders.every(({ credits }) => credits === 0));
    assert.ok(completeRegisteredPlanCourses(id, projection, view.courses).every(({ placeholder }) => !placeholder));
  }
});

for (const [key, main, expected] of [
  ["ingenieria-en-agrimensura-2023", "trayectoria-flexible", [[44, 48], [44, 48]]],
  ["ingenieria-fisico-matematica-2017", "montevideo-inicial", [[44, 48, 47, 45], [40, 48, 47, 45]]],
]) {
  test(`${key}: las sedes iniciales muestran sólo su tramo oficial y no alteran Montevideo`, async () => {
    const planId = `bedelias-fing-${key}`;
    const projection = await read(`app/data/bedelias-generated/${planId}.json`);
    assert.equal(projection.plan.minCredits, 450);
    assert.deepEqual(projection.campuses.map(({ id, defaultPathwayId }) => [id, defaultPathwayId]), [
      ["montevideo", main], ["salto", "salto-inicial"], ["paysandu", "paysandu-inicial"],
    ]);
    const capital = buildRegisteredPlanPresentation(main, projection);
    assert.ok(capital.courses.length > 0);
    assert.ok(capital.courses.every(({ id }) => !id.startsWith("fing-litoral-norte-")));
    const capitalIds = new Set(completeRegisteredPlanCourses(main, projection, capital.courses).map(({ id }) => id));
    const regional = ["salto-inicial", "paysandu-inicial"].map((id, index) => {
      assert.equal(resolveCampusPathway(projection.pathways, projection.campuses[index + 1], main), id);
      const view = buildRegisteredPlanPresentation(id, projection);
      assert.equal(view.generated, false);
      assert.match(view.description, /continúa en Montevideo/);
      const courses = new Map(view.courses.map((course) => [course.id, course]));
      assert.deepEqual(view.periods.map((period) => period.courseIds.reduce((total, id) => total + courses.get(id).credits, 0)), expected[index]);
      assert.deepEqual(new Set(courses.keys()), new Set(view.periods.flatMap(({ courseIds }) => courseIds)));
      assert.ok(view.courses.every(({ id, bedeliasCode, eligibleRequirementIds }) =>
        id.startsWith("fing-litoral-norte-") && !bedeliasCode && eligibleRequirementIds.join() === "plan-total"));
      const planner = completeRegisteredPlanCourses(id, projection, view.courses);
      assert.deepEqual(new Set(planner.map(({ id }) => id)), capitalIds);
      assert.ok(planner.some((course) => course.id === capital.courses[0].id && course.semester === "opt"));
      return view;
    });
    assert.deepEqual(regional[0].periods[1], regional[1].periods[1]);
    if (expected[0].length === 4) {
      assert.ok(regional[0].courses.some(({ name }) => name === "Taller de Diseño"));
      assert.ok(!regional[0].courses.some(({ name }) => name === "Taller de Robótica"));
      assert.ok(regional[1].courses.some(({ name }) => name === "Taller de Robótica"));
    } else {
      assert.deepEqual(regional[0].periods, regional[1].periods);
    }
    assert.equal(inventory.plans.find((entry) => entry.planId === planId).state, "official-trajectory-identified-pending");
  });
}

test("Agrimensura: la guía parcial de Montevideo conserva sus alternativas e identidades pendientes", async () => {
  const guide = await read("data/official-trajectories/fing-agrimensura-2023-pi60.json");
  const projection = await read(`app/data/bedelias-generated/${guide.planId}.json`);
  const catalog = buildRegisteredPlanPresentation("trayectoria-flexible", projection).courses;
  const rows = guide.periods.flatMap(({ rows }) => rows);
  assert.equal(guide.scope.completeDegreeSequence, false);
  assert.deepEqual(guide.periods.map(({ semester }) => semester), [1, 2, 3, 4, 5, 6]);
  assert.equal(rows.length, 30);
  assert.deepEqual(guide.alternativeGroups, [{ semester: 4, choose: 1, codes: ["1411", "423EU"] }]);
  assert.ok(guide.alternativeGroups[0].codes.every((code) => guide.periods[3].rows.some(([rowCode]) => rowCode === code)));
  const unmatchedCodes = rows.filter(([code, credits]) => !catalog.some((course) =>
    course.bedeliasCode === (guide.bedeliasCodeMappings[code] ?? code) && course.credits === credits)).map(([code]) => code);
  assert.deepEqual(unmatchedCodes.sort(), Object.keys(guide.missingFromProjectedCatalog.identities).sort());
});

test("Físico-Matemática: el cotejo capitalino conserva créditos e identidades sin tomar códigos regionales", async () => {
  const guide = await read("data/official-trajectories/fing-fisico-matematica-2017-montevideo.json");
  const projection = await read(`app/data/bedelias-generated/${guide.planId}.json`);
  const review = guide.catalogReconciliation;
  assert.equal(guide.initialWorkshop.choose, 1);
  const groups = [
    ...guide.periods.map(({ rows }, index) => [rows, review.semesterCodes[index]]),
    [guide.initialWorkshop.rows, review.initialWorkshopCodes],
    [guide.earlyOptions.rows, review.earlyOptionCodes],
  ];
  const used = new Set();
  const unresolved = [];
  for (const [rows, codes] of groups) {
    assert.equal(rows.length, codes.length);
    for (const [[name, credits], code] of rows.map((row, index) => [row, codes[index]])) {
      if (code === null) {
        unresolved.push([name, credits]);
        continue;
      }
      const matches = projection.courses.filter((course) => course.bedeliasCode === code && course.credits === credits);
      assert.equal(matches.length, 1, name);
      assert.ok(!used.has(matches[0].id), name);
      assert.ok(!matches[0].id.startsWith("fing-litoral-norte-"), name);
      used.add(matches[0].id);
    }
  }
  assert.equal(used.size, 27);
  assert.deepEqual(unresolved, review.unresolved.map(({ name, sourceCredits }) => [name, sourceCredits]));
  const pathway = buildRegisteredPlanPresentation("montevideo-inicial", projection);
  const byId = new Map(pathway.courses.map((course) => [course.id, course]));
  const toCodes = (ids) => ids.map((id) => byId.get(id).bedeliasCode);
  assert.equal(pathway.generated, false);
  assert.deepEqual(pathway.periods.map(({ label }) => label), ["Semestre 1", "Semestre 2", "Semestre 3", "Semestre 4"]);
  const [workshop] = pathway.periods[0].alternativeGroups;
  assert.equal(workshop.required, true);
  assert.deepEqual(toCodes(workshop.courseIds), review.initialWorkshopCodes);
  assert.deepEqual(pathway.periods.map(({ courseIds }) => toCodes(courseIds.filter((id) => !workshop.courseIds.includes(id)))),
    review.semesterCodes);
  for (const code of review.earlyOptionCodes.filter(Boolean)) {
    assert.equal(pathway.courses.find((course) => course.bedeliasCode === code)?.semester, "opt", code);
  }
  assert.equal(pathway.courses.find((course) => course.bedeliasCode === "1620")?.credits, 8);
  assert.match(pathway.description, /7 créditos/);
});
