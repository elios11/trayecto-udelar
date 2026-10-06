#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAndWriteAuditQueue } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "data", "fcea", "estadistica-2014-trayectorias.json");
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", `${source.planId}.json`);
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

assert.equal(
  digest({ courses: source.courses, profiles: source.profiles }),
  source.fingerprints.normalizedCurriculum,
  "Cambió el currículo normalizado; actualizá la huella sólo después de cotejar la publicación oficial.",
);
assert.equal(source.profiles.length, 4);
assert.ok(source.profiles.every(({ periods }) => periods.length === 8));
assert.equal(new Set(source.courses.map(({ sourceId }) => sourceId)).size, source.courses.length);
for (const profile of source.profiles) {
  const catalogIds = new Set(source.courses.map(({ sourceId }) => sourceId));
  for (const period of profile.periods) {
    assert.deepEqual(period.courseIds, period.placements.map(({ sourceId }) => sourceId), `${profile.id}/${period.label}`);
    for (const sourceId of period.courseIds) assert.ok(catalogIds.has(sourceId), `${profile.id}/${period.label}/${sourceId}`);
  }
}

await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
assert.ok(report.plans.some(({ planId }) => planId === source.planId), source.planId);
await buildAndWriteUiCurriculumQueue();
const inventory = await buildOfficialTrajectoryInventory();
assert.equal(inventory.plans.find(({ planId }) => planId === source.planId)?.state, "official-trajectory-reproduced");
const projection = JSON.parse(await readFile(projectionPath, "utf8"));
const projectedCourseBySourceId = new Map();
for (const course of projection.courses) {
  for (const sourceId of [course.bedeliasCode, course.sourceCourseId].filter(Boolean)) projectedCourseBySourceId.set(sourceId, course.id);
}
for (const profile of source.profiles) {
  const projected = projection.publishedPathways[profile.id];
  assert.ok(projected, profile.id);
  assert.deepEqual(projected.periods.map(({ label, courseIds }) => ({ label, courseIds })), profile.periods.map(({ label, courseIds }) => ({
    label,
    courseIds: courseIds.map((sourceId) => projectedCourseBySourceId.get(sourceId)),
  })), profile.id);
}

console.log(`Estadística 2014 regenerada desde ${path.relative(projectRoot, sourcePath)}: ${source.courses.length} identidades y ${source.profiles.length} perfiles de ocho semestres.`);
