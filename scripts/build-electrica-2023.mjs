#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isRequirementExpressionEvaluable } from "../lib/requirement-expression.mjs";

const trajectoryPath = path.resolve(process.argv[2] ?? "data/fing/electrica-2023-trayectorias.json");
const bedeliasPath = path.resolve(process.argv[3] ?? "data/bedelias/fing-ingenieria-electrica-2023.json");
const outputPath = path.resolve(process.argv[4] ?? "app/data/electrica-2023-fing.json");
const catalogOutputPath = path.resolve(process.argv[5] ?? "app/data/electrica-2023-electivas.json");

const trajectory = JSON.parse(await readFile(trajectoryPath, "utf8"));
const bedelias = JSON.parse(await readFile(bedeliasPath, "utf8"));
const bedeliasSource = "https://bedelias.udelar.edu.uy/";
const localCourses = bedelias.plan.courses.filter((course) => !course.serviceCode);
const localByCode = new Map(localCourses.map((course) => [course.code, course]));
const publishedCourseRuleCodes = new Set(bedelias.prerequisites.filter((rule) => rule.target.assessment === "course" && isRequirementExpressionEvaluable(rule.expression)).map((rule) => rule.target.code));
const partialCourseRuleCodes = new Set(bedelias.prerequisites.filter((rule) => rule.target.assessment === "course" && rule.expression && !isRequirementExpressionEvaluable(rule.expression)).map((rule) => rule.target.code));
const noPublishedRuleCodes = new Set(bedelias.prerequisites.filter((rule) => rule.noPublishedRule).map((rule) => rule.target.code));

const areaDefinitions = [
  ["01", null, "Áreas de formación básica de Ingeniería", "Formación básica", 150],
  ["011", "01", "Matemática", "Matemática", 75],
  ["012", "01", "Física", "Física", 50],
  ["013", "01", "Otras áreas de formación básica", "Otras básicas", 0],
  ["02", null, "Áreas de formación básico-tecnológica", "Formación básico-tecnológica", 60],
  ["021", "02", "Fundamentos de Ingeniería Eléctrica", "Fundamentos de Eléctrica", 20],
  ["022", "02", "Fundamentos de Sistemas Digitales", "Fund. sistemas digitales", 5],
  ["023", "02", "Fundamentos de Electrónica", "Fund. electrónica", 5],
  ["024", "02", "Fundamentos de Comunicación y Señales", "Fund. comunicación y señales", 5],
  ["025", "02", "Fundamentos de Convertidores Electromagnéticos de Energía", "Fund. convertidores", 5],
  ["026", "02", "Fundamentos de Informática", "Fund. informática", 5],
  ["027", "02", "Otras áreas de formación básico-tecnológica", "Otras básico-tecnológicas", 0],
  ["03", null, "Áreas de formación tecnológica", "Formación tecnológica", 100],
  ["031", "03", "Control", "Control", 5],
  ["032", "03", "Convertidores Electromagnéticos de Energía", "Convertidores", 0],
  ["033", "03", "Informática", "Informática", 5],
  ["034", "03", "Instalaciones Eléctricas y Sistemas de Potencia", "Instalaciones y potencia", 5],
  ["035", "03", "Electrónica", "Electrónica", 0],
  ["036", "03", "Sistemas Digitales", "Sistemas digitales", 5],
  ["037", "03", "Transmisión de Información", "Transmisión", 5],
  ["038", "03", "Procesamiento de Información", "Procesamiento", 0],
  ["039", "03", "Ingeniería aplicada a la Medicina y la Biología", "Ing. biomédica", 0],
  ["0310", "03", "Práctica de Ingeniería Eléctrica", "Práctica de Eléctrica", 35],
  ["0311", "03", "Otras áreas de formación tecnológica", "Otras tecnológicas", 0],
  ["04", null, "Áreas de formación complementaria", "Formación complementaria", 20],
  ["041", "04", "Ingeniería Industrial", "Ingeniería industrial", 5],
  ["042", "04", "Ingeniería y Sociedad", "Ingeniería y sociedad", 5],
  ["043", "04", "Otras áreas de formación complementaria", "Otras complementarias", 5]
];
const nodeId = (code) => `p2023-${code}`;
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
      id: "degree-project", label: "Proyecto", minCredits: 35,
      courseIds: ["2013-A", "2013-B"], representationStatus: "modeled",
      sourceUrl: trajectory.source.profilesSpreadsheet
    }],
    sourceUrl: trajectory.source.planDocument
  }]
};
const areaCodeMap = new Map(areaDefinitions.map(([code]) => [code, nodeId(code)]));

function allocationFromPaths(course, credits = course.credits) {
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
      id,
      bedeliasCode: code,
      name: special?.name ?? displayName(official.name),
      credits,
      ...allocationFromPaths(official, credits),
      prerequisites: special?.prerequisites,
      dataStatus: "bedelias-composition",
      ruleCoverage: partialCourseRuleCodes.has(code) ? "partial" : publishedCourseRuleCodes.has(code) ? "published" : noPublishedRuleCodes.has(code) ? "not-published" : "not-scraped"
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
const catalogCourses = bedelias.plan.courses.map((course) => {
  const id = course.serviceCode ? `${course.serviceCode}:${course.code}` : course.code;
  return {
    id, serviceCode: course.serviceCode, bedeliasCode: course.code, name: displayName(course.name), credits: course.credits,
    ...allocationFromPaths(course), offered: [], elective: !trajectoryBedeliasCodes.has(course.code),
    dataStatus: "bedelias-composition",
    ruleCoverage: partialCourseRuleCodes.has(course.code) ? "partial" : publishedCourseRuleCodes.has(course.code) ? "published" : noPublishedRuleCodes.has(course.code) ? "not-published" : "not-scraped"
  };
});
const allRules = bedelias.prerequisites
  .filter((rule) => isRequirementExpressionEvaluable(rule.expression))
  .map(({ target, expression, heading, sourceUrl }) => ({ target, expression, heading, sourceUrl }));
const rules = allRules.filter((rule) => trajectoryBedeliasCodes.has(rule.target.code));
const catalogRules = allRules.filter((rule) => !trajectoryBedeliasCodes.has(rule.target.code));
const flexibleCatalogCourses = catalogCourses.filter((course) => !trajectoryBedeliasCodes.has(course.bedeliasCode));

const output = {
  schemaVersion: 1,
  source: {
    ...trajectory.source,
    reviewedAt: trajectory.reviewedAt,
    bedeliasSystem: bedelias.source.system,
    bedeliasExtractedAt: bedelias.source.extractedAt,
    bedeliasContentHash: bedelias.contentHash,
    bedeliasPlanUrl: bedelias.plan.sourceUrl
  },
  plan: {
    ...trajectory.plan,
    current: bedelias.plan.current,
    bedeliasCompositionCourses: bedelias.plan.courses.length,
    localCourses: localCourses.length,
    externalEquivalences: bedelias.plan.courses.length - localCourses.length,
    publishedRules: allRules.length,
    partialRules: bedelias.prerequisites.filter((rule) => rule.expression && !isRequirementExpressionEvaluable(rule.expression)).length,
    noPublishedRule: bedelias.prerequisites.filter((rule) => rule.noPublishedRule).length
  },
  creditStructure,
  requirementGroupMap: Object.fromEntries(areaDefinitions.map(([code]) => [code, nodeId(code)])),
  courses: [...projectedCourses.values()],
  profiles,
  commonCourseIds,
  rules
};

const catalogOutput = {
  schemaVersion: 1,
  source: {
    system: bedelias.source.system,
    extractedAt: bedelias.source.extractedAt,
    planUrl: bedelias.plan.sourceUrl,
    contentHash: bedelias.contentHash
  },
  courses: flexibleCatalogCourses,
  rules: catalogRules
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
await writeFile(catalogOutputPath, `${JSON.stringify(catalogOutput, null, 2)}\n`, "utf8");
console.log(`Eléctrica 2023: ${output.courses.length} bloques, ${commonCourseIds.length} comunes y ${rules.length} reglas iniciales -> ${outputPath}`);
console.log(`Catálogo diferido: ${flexibleCatalogCourses.length} materias/equivalencias y ${catalogRules.length} reglas -> ${catalogOutputPath}`);
