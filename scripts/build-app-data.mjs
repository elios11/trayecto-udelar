#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { allocationFromPaths, groupCodeToNode, requirementStructures } from "./academic-requirements.mjs";

const inputPath = path.resolve(process.argv[2] ?? "data/bedelias/fing-ingenieria-computacion-1997.json");
const outputPath = path.resolve(process.argv[3] ?? "app/data/computacion-1997-bedelias.json");
const coreCourseCodes = new Set([
  "MI2", "1023", "1373", "1061", "1151", "1030", "1321", "1062", "1031", "1027", "1026",
  "1466", "1323", "1025", "1033", "1537", "1324", "1325", "1944", "1911", "1327", "1446",
  "1945", "1650", "1783", "1340", "1721", "1224", "1225",
]);
const flexibleCourseCodes = new Set([
  "2044", "2512", "1886", "1157", "1872", "5852", "1158", "1450", "2046", "1375", "1617", "1641",
  "1631", "1624", "1632", "2398", "1857", "5914", "1063", "1066", "2415", "1899", "1898", "5005",
  "1871", "1640", "2047", "1876", "2418", "1867", "1949", "1890", "1556", "5907", "1891", "1434",
  "1775", "1774", "2045", "1868", "1543", "1942", "1354", "1350", "1340", "1866", "5720", "1887",
  "1637", "1316", "1349", "5916", "1223", "1780", "1152", "1153", "1510", "1918", "1731", "1545", "1926",
]);
const appCourseCodes = new Set([...coreCourseCodes, ...flexibleCourseCodes, "1730"]);

const dataset = JSON.parse(await readFile(inputPath, "utf8"));
const programCatalog = JSON.parse(await readFile(path.resolve("data/fing/computacion-programas-oficiales.json"), "utf8"));
const programByCourse = new Map(programCatalog.programs.filter((program) => program.planYears.includes("1997")).map((program) => [program.courseCode, program]));
const courses = dataset.plan.courses
  .filter((course) => appCourseCodes.has(course.code) && (!course.serviceCode || course.serviceCode === dataset.service.code))
  .map((course) => {
    const program = programByCourse.get(course.code);
    const allocation = allocationFromPaths(course, "1997", program?.areaNodeId, program?.url ?? dataset.plan.sourceUrl);
    if (program) {
      allocation.eligibleRequirementIds = [program.areaNodeId];
      allocation.creditAllocations = [{ nodeId: program.areaNodeId, credits: course.credits, status: "official", sourceUrl: program.url }];
    }
    return { code: course.code, name: course.name, credits: course.credits, catalogKind: flexibleCourseCodes.has(course.code) ? "flexible" : "trajectory", ...allocation };
  })
  .sort((a, b) => a.code.localeCompare(b.code));
const rules = dataset.prerequisites
  .filter((rule) => appCourseCodes.has(rule.target?.code) && rule.expression)
  .map(({ target, expression, heading, sourceUrl }) => ({ target, expression, heading, sourceUrl }))
  .sort((a, b) => `${a.target.code}:${a.target.assessment}`.localeCompare(`${b.target.code}:${b.target.assessment}`));

const missingCourses = [...appCourseCodes].filter((code) => !courses.some((course) => course.code === code));
const missingCourseRules = [...coreCourseCodes].filter((code) => !rules.some((rule) => rule.target.code === code && rule.target.assessment === "course"));
if (missingCourses.length || missingCourseRules.length) {
  throw new Error(`Proyección incompleta. Cursos: ${missingCourses.join(", ") || "ninguno"}; previas de curso: ${missingCourseRules.join(", ") || "ninguna"}.`);
}
const programUrls = new Set(programCatalog.programs.map((program) => program.url));
const sourceCoverage = courses.reduce((summary, course) => {
  const allocation = course.creditAllocations[0];
  if (!allocation) summary.missing += 1;
  else if (allocation.status === "suggested") summary.suggested += 1;
  else if (allocation.status === "conflict") summary.conflicts += 1;
  else if (programUrls.has(allocation.sourceUrl)) summary.officialProgram += 1;
  else summary.officialBedelias += 1;
  return summary;
}, { officialProgram: 0, officialBedelias: 0, suggested: 0, conflicts: 0, missing: 0 });

const projection = {
  schemaVersion: 2,
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
  creditStructure: requirementStructures["1997"],
  requirementGroupMap: groupCodeToNode["1997"],
  programSources: programCatalog.programs.filter((program) => program.planYears.includes("1997")),
  sourceCoverage,
  courses,
  rules,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(projection, null, 2)}\n`, "utf8");
console.log(`Proyección: ${courses.length} cursos y ${rules.length} reglas -> ${outputPath}`);
