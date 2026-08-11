#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { allocationFromPaths, plan2025SuggestedNodes, requirementStructures } from "./academic-requirements.mjs";

const trajectoryPath = path.resolve(process.argv[2] ?? "data/fing/computacion-2025-trayectorias.json");
const bedeliasPath = path.resolve(process.argv[3] ?? "data/bedelias/fing-ingenieria-en-computacion-2025.json");
const outputPath = path.resolve(process.argv[4] ?? "app/data/computacion-2025-fing.json");

const trajectory = JSON.parse(await readFile(trajectoryPath, "utf8"));
const bedelias = JSON.parse(await readFile(bedeliasPath, "utf8"));
const programCatalog = JSON.parse(await readFile(path.resolve("data/fing/computacion-programas-oficiales.json"), "utf8"));
const composition = new Map(
  bedelias.plan.courses
    .filter((course) => !course.serviceCode || course.serviceCode === bedelias.service.code)
    .map((course) => [course.code, course]),
);
const trajectoryIds = new Set(trajectory.courses.map((course) => course.id));
const rules = bedelias.prerequisites
  .filter((rule) => rule.expression && trajectoryIds.has(rule.target?.code))
  .map(({ target, expression, heading, sourceUrl }) => ({ target, expression, heading, sourceUrl }));

const projectedCourses = trajectory.courses.map((course) => {
  const courseFields = { ...course };
  delete courseFields.area;
  const official = composition.get(course.id);
  const credits = official?.credits ?? course.credits;
  const allocation = allocationFromPaths(
    official,
    "2025",
    plan2025SuggestedNodes[course.id],
    trajectory.source.curriculumPage,
  );
  return {
    ...courseFields,
    credits,
    dataStatus: official ? "bedelias-composition" : course.dataStatus ?? "fing-trajectory",
    ...allocation,
    creditAllocations: allocation.creditAllocations.map((item) => ({ ...item, credits })),
  };
});
const programUrls = new Set(programCatalog.programs.map((program) => program.url));
const sourceCoverage = projectedCourses.reduce((summary, course) => {
  const allocation = course.creditAllocations[0];
  if (!allocation) summary.missing += 1;
  else if (allocation.status === "suggested") summary.suggested += 1;
  else if (allocation.status === "conflict") summary.conflicts += 1;
  else if (programUrls.has(allocation.sourceUrl)) summary.officialProgram += 1;
  else summary.officialBedelias += 1;
  return summary;
}, { officialProgram: 0, officialBedelias: 0, suggested: 0, conflicts: 0, missing: 0 });

const output = {
  schemaVersion: 2,
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
  creditStructure: requirementStructures["2025"],
  programSources: programCatalog.programs.filter((program) => program.planYears.includes("2025")),
  sourceCoverage,
  courses: projectedCourses,
  trajectories: trajectory.trajectories,
  rules,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Plan 2025: ${output.courses.length} materias, ${rules.length} reglas publicadas -> ${outputPath}`);
