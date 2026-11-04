#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const evidence = await readJson("data/fder/relaciones-laborales-1995-programas.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fder-tecnicatura-en-relaciones-laborales-1995.json");
const auditRegistry = await readJson("data/bedelias/audits/official-source-audits.json");
const reviewRegistry = await readJson("data/official-trajectories/reviews.json");

const hash = `sha256:${createHash("sha256").update(JSON.stringify(evidence.sourceRows)).digest("hex")}`;
assert.equal(evidence.sourceRowsSha256, hash, "Huella de filas oficiales desactualizada");
assert.equal(evidence.sourceRows.length, 13);
assert.deepEqual(evidence.sourceRows.map(({ group }) => group).reduce((counts, group) => {
  counts[group] = (counts[group] ?? 0) + 1;
  return counts;
}, {}), { Primero: 5, Segundo: 5, Tercero: 3 });

const courses = new Map(projection.courses.map((course) => [course.id, course]));
assert.equal(courses.size, 13);
for (const row of evidence.sourceRows) {
  const course = courses.get(row.courseId);
  assert.ok(course, row.courseId);
  assert.equal(course.bedeliasCode, row.bedeliasCode);
  assert.equal(course.authorityStatus, "verified");
  assert.equal(course.credits, 0);
  assert.notEqual(course.fieldProvenance.credits, "official-curriculum");
}
assert.equal(projection.plan.current, false);
assert.equal(projection.plan.durationMonths, 30);
assert.equal(projection.plan.courseCatalogAuditStatus, "verified");
assert.equal(projection.pathways.bedelias.periods.length, 3);
assert.deepEqual(projection.pathways.bedelias.periods.map(({ courseIds }) => courseIds.length), [5, 5, 3]);
assert.match(projection.pathways.bedelias.label, /índice de programas/i);
assert.doesNotMatch(projection.pathways.bedelias.description, /malla oficial|semestre/i);

const audit = auditRegistry.audits.find(({ identity }) => identity === "tecnicatura en relaciones laborales:1995");
assert.equal(audit.officialPlan.curriculum.verifiedCourseIds.length, 13);
assert.equal(audit.officialPlan.curriculum.sourceUrl, evidence.sourceUrl);
const review = reviewRegistry.reviews.find(({ planId }) => planId === evidence.planId);
assert.equal(review.state, "research-pending");
assert.equal(review.evidence.sourceDataPath, "data/fder/relaciones-laborales-1995-programas.json");

console.log(`FDER Relaciones Laborales 1995: 13 identidades cotejadas; ${hash}; secuencia formal pendiente.`);
