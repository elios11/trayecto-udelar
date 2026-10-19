#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";
import { mineroSourceEvidence } from "./tecnologo-minero-reconciliation.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";

const root = new URL("../", import.meta.url);
const sourcePath = "data/cure/tecnologo-minero-2012.json";
const reviewsPath = "data/official-trajectories/reviews.json";

export async function buildTecnologoMinero2012() {
  const source = JSON.parse(await readFile(new URL(sourcePath, root), "utf8"));
  const reviews = JSON.parse(await readFile(new URL(reviewsPath, root), "utf8"));
  const review = {
    planId: source.planId,
    state: "official-trajectory-reproduced",
    reviewedAt: source.reviewedAt,
    effectiveAt: source.effectiveAt,
    projectionMechanism: "official-periods",
    scope: { territories: source.scope.territories, pathwayIds: source.trajectories.map(({ id }) => id) },
    sources: mineroSourceEvidence(source).map((entry) => ({
      authority: entry.authority,
      url: entry.url,
      reviewedAt: entry.reviewedAt,
      role: entry.supports.join("; "),
      ...(entry.contentHash ? { contentHash: entry.contentHash } : {}),
    })),
    evidence: {
      kind: "audited-projection",
      sourceDataPath: sourcePath,
      projectionDataPath: `app/data/bedelias-generated/${source.planId}.json`,
      sourceCollection: "trajectories",
      projectionCollection: "pathways",
      periodField: "periods",
      compareCoursePlacements: true,
    },
    conflictNotes: source.conflicts.map(({ resolution }) => resolution),
  };
  reviews.reviews = reviews.reviews.filter(({ planId }) => planId !== source.planId);
  reviews.reviews.push(review);
  await writeFile(new URL(reviewsPath, root), `${JSON.stringify(reviews, null, 2)}\n`);
  await buildExtractedAcademicPlans();
  await buildAndWriteUiCurriculumQueue();
  const inventory = await buildOfficialTrajectoryInventory();
  return inventory.plans.find(({ planId }) => planId === source.planId);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const entry = await buildTecnologoMinero2012();
  console.log(`${entry.planId}: ${entry.state}; ${entry.evidence.matchedCoursePlacements}/${entry.evidence.expectedCoursePlacements} ubicaciones.`);
}
