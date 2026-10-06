#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "data", "fcea", "economia-2012-trayectoria.json");
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", `${source.planId}.json`);
const fingerprint = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

assert.equal(fingerprint(source.mainGrid), source.fingerprints.normalizedGrid, "Cambió la sección normalizada de la grilla; actualizá su huella después de cotejar la fuente oficial.");
assert.equal(fingerprint(source.suggestedGuides), source.fingerprints.normalizedSuggestedGuides, "Cambió la sección normalizada de las guías; actualizá su huella después de cotejar el PDF oficial.");

const rows = source.mainGrid.periods.flatMap(({ rows: periodRows }) => periodRows);
const gridSourceIds = rows.flatMap(({ sourceIds }) => sourceIds);
const verifiedSourceIds = new Set([
  ...gridSourceIds,
  ...source.additionalVerifiedCourses.map(({ sourceId }) => sourceId),
]);
assert.equal(source.mainGrid.periods.length, 8);
assert.equal(rows.length, 81);
assert.equal(new Set(gridSourceIds).size, gridSourceIds.length, "La grilla normalizada no debe duplicar identidades entre semestres.");
assert.equal(source.interpretation.fixedRequiredSourceIds.length, 22);
for (const sourceId of source.interpretation.fixedRequiredSourceIds) assert.ok(verifiedSourceIds.has(sourceId), sourceId);
for (const guide of source.suggestedGuides) {
  assert.equal(guide.suggestions.reduce((sum, suggestion) => sum + suggestion.printedCredits, 0), guide.printedSuggestedCredits, guide.id);
  for (const sourceId of guide.suggestions.flatMap(({ sourceIds = [] }) => sourceIds)) assert.ok(verifiedSourceIds.has(sourceId), `${guide.id}: ${sourceId}`);
}

const report = await buildExtractedAcademicPlans();
const economy = report.plans.find(({ planId }) => planId === source.planId);
assert.ok(economy, source.planId);
const projection = JSON.parse(await readFile(projectionPath, "utf8"));
const coursesById = new Map(projection.courses.map((course) => [course.id, course]));
for (const trajectory of source.trajectories) {
  const projected = projection.publishedPathways[trajectory.id];
  assert.ok(projected, trajectory.id);
  assert.deepEqual(projected.periods.map(({ label, courseIds }) => ({
    label,
    courseIds: courseIds.map((courseId) => coursesById.get(courseId)?.bedeliasCode),
  })), trajectory.periods, trajectory.id);
}
console.log(`Economía 2012 regenerada desde ${path.relative(projectRoot, sourcePath)}: ${rows.length} filas, ${verifiedSourceIds.size} identidades verificadas y ${source.suggestedGuides.length} guías.`);
