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
const sourcePath = path.join(projectRoot, "data", "fcea", "economia-agricola-2022-trayectorias.json");
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const projectionPath = path.join(projectRoot, "app", "data", "bedelias-generated", `${source.planId}.json`);
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

assert.equal(
  digest({
    grid: source.grid,
    mentions: source.mentions,
    trajectories: source.trajectories,
    requirements: source.requirements,
    crosswalk: source.crosswalk,
  }),
  source.fingerprints.normalizedCurriculum,
  "Cambió el currículo normalizado; actualizá la huella sólo después de cotejar la publicación oficial.",
);

const rows = source.grid.periods.flatMap(({ rows: periodRows }) => periodRows);
const courseIds = new Set(rows.map(({ sourceId }) => sourceId));
assert.equal(source.grid.periods.length, 8);
assert.equal(rows.length, 57);
assert.equal(rows.filter(({ inclusion }) => inclusion === "principal").length, 30);
assert.equal(rows.filter(({ inclusion }) => inclusion !== "principal").length, 27);
assert.equal(courseIds.size, rows.length, "La grilla normalizada no debe repetir identidades entre semestres.");
assert.equal(source.mentions.length, 2);
assert.equal(source.trajectories.length, 2);
assert.equal(source.requirements.research.filter(({ nodeId }) => !nodeId.includes("required") && !nodeId.includes("optional")).reduce((sum, requirement) => sum + requirement.minCredits, 0), 360);
assert.equal(source.requirements.professional.filter(({ nodeId }) => !nodeId.includes("required") && !nodeId.includes("optional")).reduce((sum, requirement) => sum + requirement.minCredits, 0), 360);
for (const trajectory of source.trajectories) {
  assert.equal(trajectory.periods.length, 8, trajectory.id);
  const expected = source.grid.periods.map(({ label, rows: periodRows }) => ({
    label,
    courseIds: periodRows.filter((row) => row.inclusion === "principal" && row.mentionIds.includes(trajectory.id)).map(({ sourceId }) => sourceId),
  }));
  assert.deepEqual(trajectory.periods, expected, trajectory.id);
}
assert.equal(source.crosswalk["FCEA-I111N"].status, "not-proven-equivalent");
assert.equal(rows.find(({ sourceId }) => sourceId === "EGAF2")?.creditStatus, "source-conflict-unresolved");

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
assert.equal(projection.courses.length, 57);
assert.ok(projection.courses.every(({ authorityStatus }) => authorityStatus === "verified"));
for (const trajectory of source.trajectories) {
  const projected = projection.publishedPathways[trajectory.id];
  assert.ok(projected, trajectory.id);
  assert.deepEqual(projected.periods.map(({ label, courseIds: projectedIds }) => ({ label, courseIds: projectedIds })), trajectory.periods.map(({ label, courseIds: sourceIds }) => ({
    label,
    courseIds: sourceIds.map((sourceId) => projectedCourseBySourceId.get(sourceId)),
  })), trajectory.id);
}

console.log(`Economía Agrícola 2022 regenerada desde ${path.relative(projectRoot, sourcePath)}: ${rows.length} identidades, ${source.trajectories.length} menciones y ocho semestres.`);
