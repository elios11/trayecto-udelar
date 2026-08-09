import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile(new URL("../app/data/computacion-1997-bedelias.json", import.meta.url), "utf8"));
const extended = JSON.parse(await readFile(new URL("../app/data/computacion-1997-electivas.json", import.meta.url), "utf8"));
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

function walk(node, output = []) {
  if (!node) return output;
  output.push(node);
  for (const child of node.children ?? []) walk(child, output);
  return output;
}

function satisfies(node, statuses, credits = 0) {
  if (node.kind === "all") return node.children.every((child) => satisfies(child, statuses, credits));
  if (node.kind === "any") return node.children.some((child) => satisfies(child, statuses, credits));
  if (node.kind === "none") return !node.children.some((child) => satisfies(child, statuses, credits));
  if (node.creditRequirement) return credits >= node.creditRequirement.minimum;
  const completed = node.options.filter((option) => {
    const status = statuses[option.code] ?? "pending";
    if (option.assessment === "course") return status === "approved" || status === "exonerated";
    if (option.assessment === "exam") return status === "exonerated";
    return false;
  }).length;
  return completed >= (node.minimum ?? 1);
}

test("la proyección conserva procedencia institucional", () => {
  assert.equal(data.schemaVersion, 2);
  assert.equal(data.source.system, "SGAE Bedelías");
  assert.equal(data.plan.serviceCode, "FING");
  assert.equal(data.plan.year, "1997");
  assert.equal(data.plan.minCredits, 450);
  assert.match(data.source.contentHash, /^[a-f0-9]{64}$/);
});

test("todas las materias del núcleo de la trayectoria tienen regla oficial para cursar", () => {
  const coreCodes = ["MI2", "1023", "1373", "1061", "1151", "1030", "1321", "1062", "1031", "1027", "1026", "1466", "1323", "1025", "1033", "1537", "1324", "1325", "1944", "1911", "1327", "1446", "1945", "1650", "1783", "1340", "1721", "1224", "1225"];
  for (const code of coreCodes) {
    assert.ok(data.rules.some((rule) => rule.target.code === code && rule.target.assessment === "course"), code);
  }
});

test("el Plan 1997 usa la jerarquía y las áreas oficiales de Bedelías", () => {
  assert.deepEqual(data.sourceCoverage, { officialProgram: 2, officialBedelias: 88, suggested: 0, conflicts: 0, missing: 0 });
  const targets = new Map(data.creditStructure.nodes.map((node) => [node.id, node.minCredits]));
  assert.equal(targets.get("p1997-basic"), 80);
  assert.equal(targets.get("p1997-math"), 70);
  assert.equal(targets.get("p1997-science"), 10);
  assert.equal(targets.get("p1997-tech"), 220);
  assert.equal(targets.get("p1997-integrating"), 45);
  assert.equal(targets.get("p1997-complementary"), 10);

  const allocation = (code) => data.courses.find((course) => course.code === code).creditAllocations[0];
  assert.equal(allocation("1023").nodeId, "p1997-math", "Discreta 1 aporta a Matemática");
  assert.equal(allocation("1027").nodeId, "p1997-math", "Lógica aporta a Matemática");
  assert.equal(allocation("1151").nodeId, "p1997-science", "Física aporta a Ciencias Experimentales");
  assert.equal(allocation("1373").sourceUrl, "https://www.fing.edu.uy/sites/default/files/2022-09/Programacion%201.pdf");
});

test("el catálogo flexible conserva inclusión, créditos y área oficiales", () => {
  const flexible = data.courses.filter((course) => course.catalogKind === "flexible");
  assert.equal(flexible.length, 61);
  assert.ok(flexible.every((course) => course.creditAllocations.length > 0));
  assert.equal(flexible.find((course) => course.code === "1731").credits, 10, "incluye Pasantía");
  assert.equal(flexible.find((course) => course.code === "1866").creditAllocations[0].nodeId, "p1997-ai");
});

test("el catalogo diferido cubre las materias reales de la composicion de Bedelias", () => {
  assert.equal(extended.schemaVersion, 2);
  assert.equal(extended.source.system, "SGAE Bedelías");
  assert.equal(extended.source.contentHash, data.source.contentHash);
  assert.equal(extended.courses.length, 394);
  assert.equal(new Set(extended.courses.map((course) => course.id)).size, extended.courses.length, "los ids por servicio son unicos");
  assert.ok(extended.courses.every((course) => course.catalogKind === "bedelias-catalog"));
  assert.equal(extended.excludedAdministrativeEntries.length, 126);
  assert.ok(extended.excludedAdministrativeEntries.every((course) => /^CREDITOS? (?:ASIGNADOS? POR REVALIDAS?|NO ACUM)/.test(course.name)));
  assert.ok(!extended.courses.some((course) => /CREDITOS? ASIGNADOS? POR REVALIDA/.test(course.name)));

  const introductoryCyberPhysical = extended.courses.find((course) => course.id === "1888");
  assert.equal(introductoryCyberPhysical.name, "TALLER DE INICIACION A LOS SISTEMAS CIBER-FISICOS");
  assert.equal(introductoryCyberPhysical.credits, 4, "conserva los creditos que Bedelias asigna al Plan 1997");
  assert.deepEqual(introductoryCyberPhysical.eligibleRequirementIds, ["p1997-systems", "p1997-ai"]);
  assert.equal(introductoryCyberPhysical.offering, undefined, "no depende de una ficha EVA ni de una oferta auxiliar para aparecer");

  const advancedCyberPhysical = extended.courses.find((course) => course.id === "1952");
  assert.equal(advancedCyberPhysical.credits, 6);
  assert.ok(advancedCyberPhysical.offered.includes("par"), "la oferta de FING solo enriquece la materia de Bedelias");
  assert.match(advancedCyberPhysical.offering.evaUrl, /^https:\/\/eva\.fing\.edu\.uy\//);

  const externalCourse = extended.courses.find((course) => course.id === "FCEA:MC10");
  assert.equal(externalCourse.serviceCode, "FCEA");
  assert.equal(externalCourse.creditAllocations[0].nodeId, "p1997-math");
  assert.equal(data.courses.length + extended.courses.length, 484, "cubre toda la composicion salvo entradas administrativas");
  assert.match(pageSource, /const plan1997FlexibleCourses:[\s\S]*?id: course\.code,/);
  assert.match(pageSource, /import\("\.\/data\/computacion-1997-electivas\.json"\)/);
  assert.match(pageSource, /Cargar catálogo completo de Bedelías/);
});

test("el título de Analista 1997 conserva sus mínimos específicos", () => {
  const credential = data.creditStructure.credentials.find((item) => item.id === "analyst");
  assert.equal(credential.minTotalCredits, 270);
  assert.deepEqual(Object.fromEntries(credential.nodeRequirements.map((item) => [item.nodeId, item.minCredits])), {
    "p1997-basic": 80,
    "p1997-programming": 60,
    "p1997-systems": 30,
    "p1997-management": 10,
    "p1997-data": 10,
    "p1997-integrating": 15,
  });
});

test("el título de Ingeniería exige el núcleo obligatorio y un paradigma adicional", () => {
  const credential = data.creditStructure.credentials.find((item) => item.id === "engineer");
  const core = credential.requiredCourseGroups.find((group) => group.id === "mandatory-curriculum");
  const paradigm = credential.requiredCourseGroups.find((group) => group.id === "additional-programming-paradigm");
  assert.equal(core.minCompleted, 22);
  assert.equal(core.courseIds.length, 22);
  assert.deepEqual(paradigm.courseIds, ["1354", "1340"]);
  assert.equal(paradigm.minCompleted, 1);
});

test("Proyecto de Grado usa la regla vigente de Bedelías con tres caminos", () => {
  const rule = data.rules.find((item) => item.target.code === "1730" && item.target.assessment === "course");
  assert.ok(rule);
  const nodes = walk(rule.expression);
  assert.ok(nodes.some((node) => node.creditRequirement?.minimum === 330));
  assert.ok(nodes.some((node) => node.creditRequirement?.minimum === 365));
  assert.ok(nodes.some((node) => node.creditRequirement?.minimum === 380));
  assert.ok(nodes.some((node) => node.groupCreditRequirement?.groupCode === "4083" && node.groupCreditRequirement.minimum === 70));
});

test("Arquitectura 1466 no se reduce a Programación 1", () => {
  const rule = data.rules.find((item) => item.target.code === "1466" && item.target.assessment === "course");
  assert.ok(rule);
  const nodes = walk(rule.expression);
  const requiredCodes = new Set(nodes.flatMap((node) => node.options ?? []).map((option) => option.code));
  assert.ok(requiredCodes.has("1023"), "incluye Matemática Discreta 1");
  assert.ok(requiredCodes.has("1373"), "incluye Programación 1");
  assert.ok(requiredCodes.has("1027"), "incluye Lógica");
  assert.ok(requiredCodes.has("1321"), "incluye Programación 2");
  assert.ok(nodes.some((node) => node.kind === "none"), "conserva exclusiones");
});

test("Arquitectura exige examen de P1 y los otros tres grupos", () => {
  const rule = data.rules.find((item) => item.target.code === "1466" && item.target.assessment === "course");
  assert.equal(satisfies(rule.expression, { 1023: "approved", 1373: "approved", 1027: "approved", 1321: "approved" }), false);
  assert.equal(satisfies(rule.expression, { 1023: "approved", 1373: "exonerated", 1027: "approved", 1321: "approved" }), true);
  assert.equal(satisfies(rule.expression, { 1023: "approved", 1373: "exonerated", 1027: "pending", 1321: "approved" }), false);
});

test("ningún requisito normalizado quedó como texto sin interpretar", () => {
  for (const rule of data.rules) {
    for (const node of walk(rule.expression)) {
      if (node.kind === "requirement") assert.equal(node.parserStatus, "parsed", `${rule.target.code}: ${node.label}`);
    }
  }
});
