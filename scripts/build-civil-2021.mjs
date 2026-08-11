#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const trajectoryPath = path.resolve(process.argv[2] ?? "data/fing/civil-2021-trayectorias.json");
const bedeliasPath = path.resolve(process.argv[3] ?? "data/bedelias/fing-ingenieria-civil-2021.json");
const outputPath = path.resolve(process.argv[4] ?? "app/data/civil-2021-fing.json");
const catalogOutputPath = path.resolve(process.argv[5] ?? "app/data/civil-2021-electivas.json");

const trajectory = JSON.parse(await readFile(trajectoryPath, "utf8"));
const bedelias = JSON.parse(await readFile(bedeliasPath, "utf8"));
const bedeliasSource = "https://bedelias.udelar.edu.uy/";
const isAdministrativeCourse = (course) => /CREDITOS?.*REVALIDA/i.test(course.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
const compositionCourses = bedelias.plan.courses.filter((course) => !isAdministrativeCourse(course));
const administrativeEntries = bedelias.plan.courses.filter(isAdministrativeCourse);
const localCourses = compositionCourses.filter((course) => !course.serviceCode);
const localByCode = new Map(localCourses.map((course) => [course.code, course]));
const publishedRuleCodes = new Set(bedelias.prerequisites.filter((rule) => rule.expression).map((rule) => rule.target.code));
const noPublishedRuleCodes = new Set(bedelias.prerequisites.filter((rule) => rule.noPublishedRule).map((rule) => rule.target.code));

const areaDefinitions = [
  ["61", null, "Áreas de formación básica", "Formación básica", 139],
  ["4819", "61", "Física", "Física", 45],
  ["4886", "61", "Matemática", "Matemática", 70],
  ["4985", "61", "Informática", "Informática", 16],
  ["5294", "61", "Química", "Química", 8],
  ["62", null, "Áreas de formación tecnológica específica de Ingeniería Civil", "Formación específica", 225],
  ["4148", "62", "Sanitaria", "Sanitaria", 6],
  ["4316", "62", "Infraestructura de transporte", "Infraestructura de transporte", 0],
  ["4385", "62", "Proyecto", "Proyecto", 25],
  ["4397", "62", "Construcción", "Construcción", 15],
  ["4453", "62", "Gestión y operativa de transporte", "Operativa de transporte", 6],
  ["4693", "62", "Geotécnica", "Geotécnica", 20],
  ["4818", "62", "Tecnología de materiales", "Tecnología de materiales", 8],
  ["4871", "62", "Resistencia de materiales", "Resistencia de materiales", 30],
  ["4922", "62", "Ciencias ambientales", "Ciencias ambientales", 7],
  ["4999", "62", "Mecánica de fluidos e hidrología", "Fluidos e hidrología", 20],
  ["5168", "62", "Teoría de estructuras", "Teoría de estructuras", 10],
  ["5230", "62", "Pasantía", "Pasantía", 12],
  ["63", null, "Áreas de formación tecnológica no específica de Ingeniería Civil", "Formación no específica", 15],
  ["5239", "63", "Administración y gestión", "Administración y gestión", 15],
  ["64", null, "Áreas de formación complementaria", "Formación complementaria", 24],
  ["3973", "64", "Ciencias sociales y económicas", "Ciencias sociales y económicas", 18],
  ["5291", "64", "Expresión", "Expresión", 6]
];
const nodeId = (code) => `p2021-${code}`;
const creditStructure = {
  countingMode: "allocated",
  nodes: areaDefinitions.map(([code, parent, name, shortName, minCredits]) => ({
    id: nodeId(code), parentId: parent ? nodeId(parent) : null, kind: parent ? "area" : "group",
    name, shortName, minCredits, sourceStatus: "official", sourceUrl: bedeliasSource
  })),
  credentials: [{
    id: "engineer", title: trajectory.plan.degreeTitle, minTotalCredits: trajectory.plan.minCredits,
    nodeRequirements: areaDefinitions.map(([code, , , , minCredits]) => ({ nodeId: nodeId(code), minCredits })),
    requiredCourseGroups: [],
    requiredActivities: [{
      id: "degree-project", label: "Proyecto", minCredits: 25,
      courseIds: ["2404", "2407", "2411-A", "2411-B", "2405", "2400-A", "2400-B", "2403-A", "2403-B"],
      representationStatus: "modeled", sourceUrl: trajectory.source.profilesSpreadsheet
    }],
    sourceUrl: trajectory.source.planDocument
  }]
};
const areaCodeMap = new Map(areaDefinitions.map(([code]) => [code, nodeId(code)]));

function allocationFromPaths(course, credits = course.credits, manualAllocations = null) {
  const eligible = new Set();
  for (const curriculumPath of course.curriculumPaths ?? []) {
    let mostSpecific = null;
    for (const label of curriculumPath) {
      const match = label.match(/^(\d+)\s+-\s+.*?\s+-\s+min:/i);
      if (match && areaCodeMap.has(match[1])) mostSpecific = areaCodeMap.get(match[1]);
    }
    if (mostSpecific) eligible.add(mostSpecific);
  }
  const eligibleRequirementIds = [...eligible];
  if (manualAllocations) {
    return {
      eligibleRequirementIds,
      creditAllocations: manualAllocations.map(({ groupCode, credits: allocatedCredits }) => ({
        nodeId: nodeId(groupCode), credits: allocatedCredits, status: "official", sourceUrl: trajectory.source.profilesSpreadsheet
      }))
    };
  }
  return {
    eligibleRequirementIds,
    creditAllocations: eligibleRequirementIds.length === 1
      ? [{ nodeId: eligibleRequirementIds[0], credits, status: "official", sourceUrl: bedeliasSource }]
      : []
  };
}

function displayName(name) {
  return name.toLocaleLowerCase("es-UY").replace(/(^|[\s(/.-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("es-UY"));
}

const projectedCourses = new Map();
const profileCourseSets = [];
const profiles = {};
for (const [profileId, profile] of Object.entries(trajectory.profiles)) {
  const occurrence = new Map();
  const profileConcreteIds = new Set();
  const semesters = profile.semesters.map((aliases, semesterIndex) => aliases.map((alias) => {
    const optional = trajectory.optionalSpaces[alias];
    if (optional) {
      const count = (occurrence.get(alias) ?? 0) + 1;
      occurrence.set(alias, count);
      const id = `OPT-${profileId}-${semesterIndex + 1}-${alias}-${count}`;
      projectedCourses.set(id, {
        id, name: optional.name, credits: optional.credits, eligibleRequirementIds: [], creditAllocations: [],
        elective: true, placeholder: true, dataStatus: "fing-trajectory"
      });
      return id;
    }
    const special = trajectory.specialCourses[alias];
    const code = special?.bedeliasCode ?? trajectory.aliasToBedeliasCode[alias];
    const official = localByCode.get(code);
    if (!official) throw new Error(`No se encontró ${alias} (${code ?? "sin código"}) en la composición local de Bedelías.`);
    const id = special?.id ?? code;
    const credits = special?.credits ?? official.credits;
    projectedCourses.set(id, {
      id, bedeliasCode: code, name: special?.name ?? displayName(official.name), credits,
      ...allocationFromPaths(official, credits, special?.allocations),
      prerequisites: special?.prerequisites,
      dataStatus: "bedelias-composition",
      ruleCoverage: publishedRuleCodes.has(code) ? "published" : noPublishedRuleCodes.has(code) ? "not-published" : "not-scraped"
    });
    profileConcreteIds.add(id);
    return id;
  }));
  profileCourseSets.push(profileConcreteIds);
  profiles[profileId] = { label: profile.label, description: profile.description, semesters };
}

const commonCourseIds = [...profileCourseSets[0]].filter((id) => profileCourseSets.every((set) => set.has(id)));
for (const id of commonCourseIds) projectedCourses.get(id).core = true;

const trajectoryBedeliasCodes = new Set([...projectedCourses.values()].map((course) => course.bedeliasCode).filter(Boolean));
const catalogCourses = compositionCourses.map((course) => {
  const id = course.serviceCode ? `${course.serviceCode}:${course.code}` : course.code;
  return {
    id, serviceCode: course.serviceCode, bedeliasCode: course.code, name: displayName(course.name), credits: course.credits,
    ...allocationFromPaths(course), offered: [], elective: !trajectoryBedeliasCodes.has(course.code),
    dataStatus: "bedelias-composition",
    ruleCoverage: publishedRuleCodes.has(course.code) ? "published" : noPublishedRuleCodes.has(course.code) ? "not-published" : "not-scraped"
  };
});
const allRules = bedelias.prerequisites
  .filter((rule) => rule.expression && !isAdministrativeCourse(rule.target))
  .map(({ target, expression, heading, sourceUrl }) => ({ target, expression, heading, sourceUrl }));
const rules = allRules.filter((rule) => trajectoryBedeliasCodes.has(rule.target.code));
const catalogRules = allRules.filter((rule) => !trajectoryBedeliasCodes.has(rule.target.code));
const flexibleCatalogCourses = catalogCourses.filter((course) => !trajectoryBedeliasCodes.has(course.bedeliasCode));

const output = {
  schemaVersion: 1,
  source: {
    ...trajectory.source, reviewedAt: trajectory.reviewedAt, bedeliasSystem: bedelias.source.system,
    bedeliasExtractedAt: bedelias.source.extractedAt, bedeliasContentHash: bedelias.contentHash,
    bedeliasPlanUrl: bedelias.plan.sourceUrl
  },
  plan: {
    ...trajectory.plan, current: bedelias.plan.current, bedeliasCompositionCourses: bedelias.plan.courses.length,
    modeledCompositionCourses: compositionCourses.length, administrativeEntriesExcluded: administrativeEntries.length,
    localCourses: localCourses.length, externalEquivalences: compositionCourses.length - localCourses.length,
    publishedRules: allRules.length, noPublishedRule: bedelias.prerequisites.filter((rule) => rule.noPublishedRule).length
  },
  creditStructure,
  requirementGroupMap: Object.fromEntries(areaDefinitions.map(([code]) => [code, nodeId(code)])),
  courses: [...projectedCourses.values()], profiles, commonCourseIds, rules
};

const catalogOutput = {
  schemaVersion: 1,
  source: { system: bedelias.source.system, extractedAt: bedelias.source.extractedAt, planUrl: bedelias.plan.sourceUrl, contentHash: bedelias.contentHash },
  excludedAdministrativeEntries: administrativeEntries.map(({ serviceCode, code, name, credits }) => ({ serviceCode, code, name, credits })),
  courses: flexibleCatalogCourses,
  rules: catalogRules
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
await writeFile(catalogOutputPath, `${JSON.stringify(catalogOutput, null, 2)}\n`, "utf8");
console.log(`Civil 2021: ${output.courses.length} bloques, ${commonCourseIds.length} comunes y ${rules.length} reglas iniciales -> ${outputPath}`);
console.log(`Catálogo diferido: ${flexibleCatalogCourses.length} materias/equivalencias, ${catalogRules.length} reglas y ${administrativeEntries.length} registros administrativos excluidos -> ${catalogOutputPath}`);
