#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const inputPath = path.resolve(process.argv[2] ?? "data/bedelias/fing-ingenieria-computacion-1997.json");
const outputPath = path.resolve(process.argv[3] ?? "app/data/computacion-1997-bedelias.json");
const appCourseCodes = new Set([
  "MI2", "1023", "1373", "1061", "1151", "1030", "1321", "1062", "1031", "1027", "1026",
  "1466", "1323", "1025", "1033", "1537", "1324", "1325", "1944", "1911", "1327", "1446",
  "1945", "1650", "1783", "1340", "1721", "1224", "1225",
]);

const dataset = JSON.parse(await readFile(inputPath, "utf8"));
const courses = dataset.plan.courses
  .filter((course) => appCourseCodes.has(course.code) && (!course.serviceCode || course.serviceCode === dataset.service.code))
  .map(({ code, name, credits }) => ({ code, name, credits }))
  .sort((a, b) => a.code.localeCompare(b.code));
const rules = dataset.prerequisites
  .filter((rule) => appCourseCodes.has(rule.target?.code) && rule.expression)
  .map(({ target, expression, heading, sourceUrl }) => ({ target, expression, heading, sourceUrl }))
  .sort((a, b) => `${a.target.code}:${a.target.assessment}`.localeCompare(`${b.target.code}:${b.target.assessment}`));

const missingCourses = [...appCourseCodes].filter((code) => !courses.some((course) => course.code === code));
const missingCourseRules = [...appCourseCodes].filter((code) => !rules.some((rule) => rule.target.code === code && rule.target.assessment === "course"));
if (missingCourses.length || missingCourseRules.length) {
  throw new Error(`Proyección incompleta. Cursos: ${missingCourses.join(", ") || "ninguno"}; previas de curso: ${missingCourseRules.join(", ") || "ninguna"}.`);
}

const projection = {
  schemaVersion: 1,
  source: {
    system: dataset.source.system,
    extractedAt: dataset.source.extractedAt,
    method: dataset.source.method,
    planUrl: dataset.plan.sourceUrl,
    contentHash: dataset.contentHash,
  },
  plan: {
    serviceCode: dataset.service.code,
    career: dataset.program.name,
    year: dataset.plan.year,
    current: dataset.plan.current,
    minCredits: dataset.plan.metadata.minCredits,
    colibriUrl: dataset.plan.metadata.colibriUrl,
  },
  courses,
  rules,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(projection, null, 2)}\n`, "utf8");
console.log(`Proyección: ${courses.length} cursos y ${rules.length} reglas -> ${outputPath}`);
