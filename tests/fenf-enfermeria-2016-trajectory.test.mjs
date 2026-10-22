import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { verifyFenfProjection, verifyFenfSource, writeJsonIfChanged } from "../scripts/build-fenf-enfermeria-2016.mjs";

const readJson = (relative) => JSON.parse(readFileSync(new URL(`../${relative}`, import.meta.url), "utf8"));
const source = readJson("data/fenf/enfermeria-2016-trajectory-review.json");
const snapshot = readJson("data/bedelias/fenf-licenciatura-en-enfermeria-2016.json");
const projection = readJson("app/data/bedelias-generated/bedelias-fenf-licenciatura-en-enfermeria-2016.json");
const inventory = readJson("data/official-trajectories/inventory.json");
const entry = inventory.plans.find(({ planId }) => planId === source.planId);

test("coteja fuente, períodos indicativos y cuatro sedes de un solo plan", () => {
  verifyFenfSource(source, snapshot);
  verifyFenfProjection(source, projection, entry);
  assert.equal(projection.plan.courseCatalogAuditStatus, "partial");
  assert.match(projection.plan.notice, /verificación visual.*pendiente/i);
  assert.equal(source.conclusion.completeDegreeSequence, false);
  assert.deepEqual(source.sourcePortion.flexiblePlacements, [[2, 10], [3, 5], [5, 5], [6, 5], [7, 5]]);
  const courseById = new Map(projection.courses.map((course) => [course.id, course]));
  assert.deepEqual(projection.publishedPathways["plan-2016-indicativo"].periods.map(({ courseIds }) =>
    courseIds.reduce((sum, id) => sum + courseById.get(id).credits, 0)), Array(9).fill(40));
});

test("mantiene 20 UC técnicas obligatorias y evita el alias compuesto", () => {
  const verified = projection.courses.filter(({ bedeliasCode, authorityStatus }) => bedeliasCode && authorityStatus === "verified");
  assert.equal(verified.length, 20);
  assert.ok(verified.every(({ id, bedeliasCode }) => id === `fenf-${bedeliasCode.toLowerCase()}`));
  assert.equal(verified.reduce((sum, course) => sum + course.credits, 0), 330);
  assert.equal(projection.courses.find(({ bedeliasCode }) => bedeliasCode === "2001").authorityStatus, "candidate");
  assert.ok(projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate").length > 200);
  assert.equal(projection.publishedRules.length, 23);
  assert.ok(projection.publishedRules.every(({ sourceUrl }) => sourceUrl.includes("bedelias.udelar.edu.uy")));
});

test("preserva 360 créditos, título intermedio y discrepancia 240/90", () => {
  const credentials = Object.fromEntries(projection.creditStructure.credentials.map((credential) => [credential.id, credential]));
  assert.equal(credentials["auxiliar-enfermeria"].minTotalCredits, 200);
  assert.equal(credentials["auxiliar-enfermeria"].requiredCourseGroups[0].courseIds.length, 11);
  assert.equal(credentials["licenciado-enfermeria"].minTotalCredits, 360);
  assert.equal(credentials["licenciado-enfermeria"].requiredCourseGroups[0].courseIds.length, 20);
  assert.ok(credentials["licenciado-enfermeria"].nodeRequirements.some(({ nodeId, minCredits }) => nodeId === "flexible" && minCredits === 30));
  assert.match(source.technicalComparison.categoryConflict, /245/);
  assert.match(source.technicalComparison.categoryConflict, /85/);
});

test("la escritura JSON usa reemplazo atómico e idempotente", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const tempRoot = path.join(root, "tmp");
  await mkdir(tempRoot, { recursive: true });
  const directory = await mkdtemp(path.join(tempRoot, "fenf-atomic-"));
  try {
    const target = path.join(directory, "review.json");
    const relative = path.relative(root, target);
    await writeFile(target, "{}\n", "utf8");
    await writeJsonIfChanged(relative, { checked: true });
    const first = await readFile(target, "utf8");
    const firstMtime = (await stat(target)).mtimeMs;
    assert.equal(first, '{\n  "checked": true\n}\n');
    assert.deepEqual(await readdir(directory), ["review.json"]);
    await writeJsonIfChanged(relative, { checked: true });
    assert.equal((await stat(target)).mtimeMs, firstMtime);
    assert.deepEqual(await readdir(directory), ["review.json"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
