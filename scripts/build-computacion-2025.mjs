#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const trajectoryPath = path.resolve(process.argv[2] ?? "data/fing/computacion-2025-trayectorias.json");
const bedeliasPath = path.resolve(process.argv[3] ?? "data/bedelias/fing-ingenieria-en-computacion-2025.json");
const outputPath = path.resolve(process.argv[4] ?? "app/data/computacion-2025-fing.json");

const trajectory = JSON.parse(await readFile(trajectoryPath, "utf8"));
const bedelias = JSON.parse(await readFile(bedeliasPath, "utf8"));
const composition = new Map(
  bedelias.plan.courses
    .filter((course) => !course.serviceCode || course.serviceCode === bedelias.service.code)
    .map((course) => [course.code, course]),
);
const trajectoryIds = new Set(trajectory.courses.map((course) => course.id));
const rules = bedelias.prerequisites
  .filter((rule) => rule.expression && trajectoryIds.has(rule.target?.code))
  .map(({ target, expression, heading, sourceUrl }) => ({ target, expression, heading, sourceUrl }));

const output = {
  schemaVersion: 1,
  source: {
    ...trajectory.source,
    bedeliasSystem: bedelias.source.system,
    bedeliasExtractedAt: bedelias.source.extractedAt,
    bedeliasContentHash: bedelias.contentHash,
    bedeliasPlanUrl: bedelias.plan.sourceUrl,
  },
  plan: {
    ...trajectory.plan,
    current: bedelias.plan.current,
    minCredits: bedelias.plan.metadata.minCredits,
    durationMonths: Number.parseInt(bedelias.plan.metadata.duration, 10),
    bedeliasCompositionCourses: bedelias.plan.courses.length,
    publishedRules: rules.length,
  },
  areaTargets: trajectory.areaTargets,
  courses: trajectory.courses.map((course) => {
    const official = composition.get(course.id);
    return {
      ...course,
      credits: official?.credits ?? course.credits,
      dataStatus: official ? "bedelias-composition" : course.dataStatus ?? "fing-trajectory",
    };
  }),
  trajectories: trajectory.trajectories,
  rules,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Plan 2025: ${output.courses.length} materias, ${rules.length} reglas publicadas -> ${outputPath}`);
