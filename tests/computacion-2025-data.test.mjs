import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { migrateLegacyStateToPersonalData } from "../app/personal-data-migration.mjs";

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
    ["trajectory-second-semester-pi-60-plus", "sha256:6046414453ca23c2cdc5a7cb9e876befeaa9ac2e548d87fb2739d02f2df7b975"],
    ["trajectory-second-semester-pi-20-59", "sha256:bee2bacd70d308a948c2aeed57aec5b1cd8a6b64bcbaae3c4c6dfa67ac551afa"],
    ["trajectory-litoral-norte", "sha256:164576b25c959b134630ca84a69a8c2431de91c3725c0c86a269a07fd165d445"],
    ["trajectory-colonia-analyst", "sha256:4736746873934c2a2f70ada271dc4c58adc20e90fb50f7aa571bcdc320d63155"],
    ["trajectory-tacuarembo-initial", "sha256:54bcd9de82113255edfb68c04dbfccccfde67d256dd61042c595e82a7f0621e8"],
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
  assert.deepEqual(projection.sourceCoverage, { officialProgram: 0, officialBedelias: 11, suggested: 35, conflicts: 0, missing: 0 });
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

test("el progreso histórico de PI se conserva sin convertirlo en créditos ni colocarlo en el planificador", () => {
  const catalog = [{
    facultyId: "fing",
    careerId: "computacion",
    planId: "2025",
    progressPlanId: "2025",
    defaultTrajectoryId: "pi-60-plus",
    defaultCredentialId: "engineer",
    trajectoryIds: Object.keys(projection.trajectories),
    campusIds: [...new Set(Object.values(projection.trajectories).map(({ campusId }) => campusId))],
    credentialIds: projection.creditStructure.credentials.map(({ id }) => id),
    loadUnit: "credits",
  }];
  const migrated = migrateLegacyStateToPersonalData({
    progressV2: { "2025": { PI: "exonerated", "1061": "approved" } },
    selectionV1: { planId: "2025", campusId: "montevideo", trajectoryId: "pi-60-plus", credentialId: "engineer" },
  }, { catalog, now: "2026-10-05T12:00:00.000Z", documentId: "pi-history" });
  assert.equal(migrated.ok, true);
  assert.deepEqual(Object.fromEntries(migrated.document.profiles[0].progress.map(({ courseId, status }) => [courseId, status])), {
    PI: "exonerated",
    "1061": "approved",
  });
  assert.ok(!projection.courses.filter((course) => !course.nonCurricular).some(({ id }) => id === "PI"));
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
  assert.equal(placements, 201);
  const totals = (id) => projection.trajectories[id].periods.map(({ publishedCredits }) => publishedCredits);
  assert.deepEqual(totals("pi-under-20"), [7]);
  assert.deepEqual(totals("pi-60-plus"), [36, 38, 42, 43, 44, 35, 30, 15]);
  assert.deepEqual(totals("pi-20-59"), [18, 38, 44, 43, 44, 45, 40, 15]);
  assert.deepEqual(totals("second-semester-pi-60-plus"), [38, 36, 46, 45, 45, 48, 15, 10]);
  assert.deepEqual(totals("second-semester-pi-20-59"), [20, 43, 34, 45, 42, 38, 35, 30]);
  assert.deepEqual(projection.trajectories["second-semester-pi-20-59"].periods[1].courseIds, ["1061", "P25-EDA", "2044", "2043", "P25-LPO"]);
  assert.equal(projection.trajectories["second-semester-pi-20-59"].periods[1].courseIds.reduce((sum, id) => sum + byId.get(id).credits, 0), 43);
  assert.equal(totals("litoral-norte").reduce((sum, credits) => sum + credits, 0), 295);
  assert.equal(totals("colonia-analyst").reduce((sum, credits) => sum + credits, 0), 248);
  assert.equal(totals("tacuarembo-initial").reduce((sum, credits) => sum + credits, 0), 167);
});

test("cada variante conserva sede, credencial y período de ingreso exactos", () => {
  const summary = Object.fromEntries(Object.entries(projection.trajectories).map(([id, trajectory]) => [id, {
    campus: trajectory.campusLabel,
    credential: trajectory.credentialId,
    periods: trajectory.periods.length,
  }]));
  assert.deepEqual(summary, {
    "pi-under-20": { campus: "Montevideo", credential: "engineer", periods: 1 },
    "pi-60-plus": { campus: "Montevideo", credential: "engineer", periods: 8 },
    "pi-20-59": { campus: "Montevideo", credential: "engineer", periods: 8 },
    "second-semester-pi-60-plus": { campus: "Montevideo", credential: "engineer", periods: 8 },
    "second-semester-pi-20-59": { campus: "Montevideo", credential: "engineer", periods: 8 },
    "litoral-norte": { campus: "CENUR Litoral Norte", credential: "engineer", periods: 8 },
    "colonia-analyst": { campus: "Colonia", credential: "analyst", periods: 7 },
    "tacuarembo-initial": { campus: "Tacuarembó", credential: "engineer", periods: 6 },
  });
  assert.equal(projection.trajectories["second-semester-pi-60-plus"].periods[0].label, "Semestre 0");
  assert.equal(projection.trajectories["second-semester-pi-20-59"].periods[0].label, "Semestre 0");
  assert.deepEqual(
    new Set(Object.values(projection.trajectories).map(({ campusLabel }) => campusLabel)),
    new Set(["Montevideo", "CENUR Litoral Norte", "Colonia", "Tacuarembó"]),
  );
  assert.doesNotMatch(JSON.stringify(projection.trajectories["litoral-norte"]), /Salto|Paysandú/);
  assert.equal(projection.creditStructure.credentials.find(({ id }) => id === "analyst").minTotalCredits, 270);
  assert.match(pageSource, /nextTrajectory\.credentialId/);
  assert.match(pageSource, /plan2025CampusEntries/);
  assert.match(pageSource, /activeTargetMinCredits = planYear === "2025" \? credential\.minTotalCredits/);
  assert.match(pageSource, /campusId: "montevideo"/);
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
  assert.equal(trajectoryIds.size, 46);
  const plannerIds = projection.courses.filter((course) => !course.nonCurricular).map(({ id }) => id);
  assert.equal(plannerIds.length, new Set(plannerIds).size, "el planificador no duplica identidades compartidas entre variantes");
  assert.deepEqual(new Set(plannerIds), trajectoryIds);
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
  assert.equal(projection.trajectories["colonia-analyst"].periods.flatMap(({ courseIds }) => courseIds).reduce((sum, id) => sum + projection.courses.find((course) => course.id === id).credits, 0), 248);
  assert.equal(projection.trajectories["tacuarembo-initial"].periods.length, 6);
  assert.match(projection.documentedGaps.join(" "), /diez semestres/);
  assert.match(projection.documentedGaps.join(" "), /248 créditos.+270 créditos/);
  assert.match(projection.documentedGaps.join(" "), /Tacuarembó/);
  assert.match(projection.documentedGaps.join(" "), /Proyecto de Grado/);
});
