import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const projection = JSON.parse(await readFile(new URL("../app/data/computacion-2025-fing.json", import.meta.url), "utf8"));
const curated = JSON.parse(await readFile(new URL("../data/fing/computacion-2025-trayectorias.json", import.meta.url), "utf8"));
const snapshot = JSON.parse(await readFile(new URL("../data/bedelias/fing-ingenieria-en-computacion-2025.json", import.meta.url), "utf8"));
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

function walk(node, output = []) {
  if (!node) return output;
  output.push(node);
  for (const child of node.children ?? []) walk(child, output);
  return output;
}

test("el Plan 2025 conserva por separado sus dos fuentes institucionales", () => {
  assert.equal(projection.schemaVersion, 2);
  assert.equal(projection.plan.current, true);
  assert.equal(projection.plan.minCredits, 450);
  assert.equal(projection.plan.bedeliasCompositionCourses, 38);
  assert.equal(projection.plan.placementTestCredits, null);
  assert.equal(projection.plan.placementTestCreditsStatus, "not-published-as-curricular-credit");
  assert.match(projection.source.curriculumPage, /^https:\/\/eva\.fing\.edu\.uy\//);
  assert.match(projection.source.bedeliasContentHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(projection.source.evidence.documents.map(({ id, contentHash }) => [id, contentHash]), [
    ["curriculum-section", "sha256:ea8eb1ce31558586e13df1d1e17b67e8796a914fb5cc52a98de4564eb064d043"],
    ["plan-2025", "sha256:90f781344eab5e356b51010005c4075322151ad1ddd3b174d8aa0f0260f623db"],
    ["trajectory-pi-60-plus", "sha256:0fb7bfda8bd8d848da66b5be49b37d2a2566934a30a2e9326bd62ecb940e7539"],
    ["trajectory-pi-20-59", "sha256:e0cffb6037fde785c1e091542437c74c58a0b7c0884002b6d208633e56e5584f"],
  ]);
  assert.equal(snapshot.validation.issues.length, 0);
});

test("el Plan 2025 diferencia mínimos de grupo, áreas y título intermedio", () => {
  const nodes = new Map(projection.creditStructure.nodes.map((node) => [node.id, node]));
  assert.equal(nodes.get("p2025-basic").minCredits, 120);
  assert.equal(nodes.get("p2025-tech").minCredits, 180);
  assert.equal(nodes.get("p2025-comp").minCredits, 20);
  assert.equal(["p2025-fs", "p2025-is", "p2025-gdi", "p2025-ca", "p2025-ai"].reduce((sum, id) => sum + nodes.get(id).minCredits, 0), 120);

  const analyst = projection.creditStructure.credentials.find((item) => item.id === "analyst");
  assert.equal(analyst.minTotalCredits, 270);
  assert.deepEqual(Object.fromEntries(analyst.nodeRequirements.map((item) => [item.nodeId, item.minCredits])), {
    "p2025-mce": 20,
    "p2025-fc": 40,
    "p2025-fs": 20,
    "p2025-is": 10,
    "p2025-gdi": 10,
    "p2025-ai": 15,
  });
});

test("las asignaciones sugeridas cuentan una vez y nunca se presentan como oficiales", () => {
  assert.deepEqual(projection.sourceCoverage, { officialProgram: 0, officialBedelias: 11, suggested: 21, conflicts: 0, missing: 0 });
  for (const course of projection.courses) {
    const allocated = course.creditAllocations.reduce((sum, item) => sum + item.credits, 0);
    assert.ok(allocated <= course.credits, `${course.id} no puede duplicar créditos`);
  }
  assert.equal(projection.courses.find((course) => course.id === "2044").creditAllocations[0].status, "official");
  assert.equal(projection.courses.find((course) => course.id === "P25-ARQ").creditAllocations[0].status, "suggested");
  assert.equal(projection.courses.find((course) => course.id === "1275").creditAllocations[0].nodeId, "p2025-society");
});

test("Bedelías vincula Matemática Inicial con Cálculo DIV y la PI no se acredita ni suma créditos", () => {
  const rule = projection.rules.find((item) => item.target.code === "1061" && item.target.assessment === "course");
  assert.ok(rule, "regla de curso de Cálculo DIV");
  const miOptions = walk(rule.expression).flatMap((node) => node.options ?? []).filter((option) => option.code === "MI2");
  assert.ok(miOptions.some((option) => option.assessment === "course-enrollment"), "conserva la exclusión por inscripción simultánea a MI");
  assert.ok(miOptions.some((option) => option.assessment === "exam"), "conserva Matemática Inicial aprobada como alternativa");
  const pi = projection.courses.find((course) => course.id === "PI");
  assert.equal(pi.credits, 0);
  assert.equal(pi.nonCurricular, true);
  assert.equal(pi.dataStatus, "project-assumption");
  assert.deepEqual(pi.creditAllocations, []);
  assert.ok(Object.values(projection.trajectories).every((trajectory) => trajectory.periods.every((period) => !period.courseIds.includes("PI"))));
  assert.doesNotMatch(pageSource, /PI:\s*"exonerated"/);
  assert.doesNotMatch(pageSource, /Acreditada automáticamente por la trayectoria/);
});

test("las trayectorias oficiales mantienen etiquetas, orden y créditos publicados por período", () => {
  const byId = new Map(projection.courses.map((course) => [course.id, course]));
  let placements = 0;
  for (const [id, sourceTrajectory] of Object.entries(curated.trajectories)) {
    const projected = projection.trajectories[id];
    assert.deepEqual(projected.periods, sourceTrajectory.periods, id);
    assert.deepEqual(projected.semesters, sourceTrajectory.periods.map(({ courseIds }) => courseIds), id);
    for (const period of projected.periods) {
      placements += period.courseIds.length;
      assert.equal(period.courseIds.reduce((sum, courseId) => sum + byId.get(courseId).credits, 0), period.publishedCredits, `${id}/${period.label}`);
    }
  }
  assert.equal(placements, 63);
  const totals = (id) => projection.trajectories[id].periods.map(({ publishedCredits }) => publishedCredits);
  assert.deepEqual(totals("pi-under-20"), [7]);
  assert.deepEqual(totals("pi-60-plus"), [36, 38, 42, 43, 44, 35, 30, 15]);
  assert.deepEqual(totals("pi-20-59"), [18, 38, 44, 43, 44, 45, 40, 15]);
});

test("toda materia de las trayectorias tiene ficha y el planificador conserva la unión oficial", () => {
  const byId = new Map(projection.courses.map((course) => [course.id, course]));
  const trajectoryIds = new Set();
  for (const trajectory of Object.values(projection.trajectories)) {
    for (const id of trajectory.periods.flatMap(({ courseIds }) => courseIds)) {
      trajectoryIds.add(id);
      assert.ok(byId.has(id), id);
      assert.match(byId.get(id).dataStatus, /^(bedelias-composition|fing-trajectory)$/);
    }
  }
  assert.equal(trajectoryIds.size, 32);
  assert.deepEqual(new Set(projection.courses.filter((course) => !course.nonCurricular).map(({ id }) => id)), trajectoryIds);
  assert.ok(!projection.trajectories["pi-60-plus"].semesters.flat().includes("MI2"));
  assert.ok(trajectoryIds.has("MI2"), "la alternativa de otra trayectoria sigue disponible en el planificador");
  const catalogBlock = pageSource.slice(pageSource.indexOf("const plan2025CatalogCourses"), pageSource.indexOf("function buildExtendedPlan1997Courses"));
  assert.match(catalogBlock, /filter\(\(course\) => !course\.nonCurricular\)/);
  assert.doesNotMatch(catalogBlock, /plan1997FlexibleCourses/);
  assert.equal(byId.get("2044").dataStatus, "bedelias-composition");
  assert.equal(byId.get("P25-ARQ").dataStatus, "fing-trajectory");
});

test("la cobertura permanece parcial y no inventa semestres noveno y décimo", () => {
  assert.ok(Object.values(projection.trajectories).every(({ coverage }) => coverage === "partial-official"));
  assert.equal(projection.trajectories["pi-60-plus"].periods.length, 8);
  assert.equal(projection.trajectories["pi-20-59"].periods.length, 8);
  assert.match(projection.documentedGaps.join(" "), /diez semestres/);
  assert.match(projection.documentedGaps.join(" "), /Proyecto de Grado/);
});
