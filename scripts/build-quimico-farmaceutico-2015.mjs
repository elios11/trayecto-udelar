#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const trajectoryPath = path.resolve(process.argv[2] ?? "data/fq/quimico-farmaceutico-2015-trayectoria.json");
const bedeliasPath = path.resolve(process.argv[3] ?? "data/bedelias/fq-quimica-farmaceutica-2015.json");
const outputPath = path.resolve(process.argv[4] ?? "app/data/quimico-farmaceutico-2015-fq.json");
const catalogOutputPath = path.resolve(process.argv[5] ?? "app/data/quimico-farmaceutico-2015-electivas.json");

const trajectory = JSON.parse(await readFile(trajectoryPath, "utf8"));
const bedelias = JSON.parse(await readFile(bedeliasPath, "utf8"));
const bedeliasSource = "https://bedelias.udelar.edu.uy/";
const localCourses = bedelias.plan.courses.filter((course) => !course.serviceCode);
const localByCode = new Map(localCourses.map((course) => [course.code, course]));

function normalized(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-UY")
    .replace(/\b(teorico|teorica)\b/g, "t")
    .replace(/\b(practico|practica|laboratorio)\b/g, "l")
    .replace(/\bprimero\b/g, "1")
    .replace(/\bsegundo\b/g, "2")
    .replace(/\btercero\b/g, "3")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function displayName(name) {
  return String(name).toLocaleLowerCase("es-UY").replace(/(^|[\s(/.-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("es-UY"));
}

function resolveCourse(alias, specification) {
  if (specification.bedeliasCode) {
    const byCode = localByCode.get(specification.bedeliasCode);
    if (!byCode) throw new Error(`No se encontró ${alias} con código ${specification.bedeliasCode} en la composición local de Bedelías.`);
    return byCode;
  }

  const wanted = normalized(specification.name);
  const sameCredits = localCourses.filter((course) => course.credits === specification.credits);
  const exact = sameCredits.filter((course) => normalized(course.name) === wanted);
  if (exact.length === 1) return exact[0];
  const containing = sameCredits.filter((course) => {
    const candidate = normalized(course.name);
    return candidate.includes(wanted) || wanted.includes(candidate);
  });
  if (containing.length === 1) return containing[0];
  const candidates = (exact.length ? exact : containing.length ? containing : sameCredits)
    .slice(0, 12)
    .map((course) => `${course.code} · ${course.name} · ${course.credits} cr.`)
    .join(" | ");
  throw new Error(`No se pudo resolver de forma única ${alias} (${specification.name}, ${specification.credits} cr.). Candidatos: ${candidates || "ninguno"}`);
}

function hasRawNode(expression) {
  if (!expression) return false;
  if (expression.kind === "requirement" && expression.parserStatus === "raw") return true;
  return (expression.children ?? []).some(hasRawNode);
}

const resolvedByAlias = new Map();
const aliasesByCode = new Map();
for (const [alias, specification] of Object.entries(trajectory.courses)) {
  const official = resolveCourse(alias, specification);
  const previousAlias = aliasesByCode.get(official.code);
  if (previousAlias) throw new Error(`${alias} y ${previousAlias} resuelven al mismo código ${official.code}.`);
  resolvedByAlias.set(alias, official);
  aliasesByCode.set(official.code, alias);
}

const rawRules = bedelias.prerequisites.filter((rule) => rule.expression && hasRawNode(rule.expression));
const modeledRules = bedelias.prerequisites.filter((rule) => rule.expression && !hasRawNode(rule.expression));
const modeledRuleCodes = new Set(modeledRules.map((rule) => rule.target.code));
const rawRuleCodes = new Set(rawRules.map((rule) => rule.target.code));
const noPublishedRuleCodes = new Set(bedelias.prerequisites.filter((rule) => rule.noPublishedRule).map((rule) => rule.target.code));

const mandatoryRootId = "qf2015-mandatory";
const flexibleRootId = "qf2015-flexible";
const optativeId = "qf2015-optative";
const electiveId = "qf2015-elective";
const practicumId = "qf2015-practicum";
const nodes = [
  { id: mandatoryRootId, parentId: null, kind: "group", name: "Asignaturas obligatorias", shortName: "Obligatorias", minCredits: trajectory.plan.mandatoryCredits },
  ...trajectory.requirements.map((requirement) => ({ ...requirement, parentId: mandatoryRootId, kind: "area" })),
  { id: flexibleRootId, parentId: null, kind: "group", name: "Asignaturas optativas y electivas", shortName: "Optativas y electivas", minCredits: trajectory.plan.flexibleCredits },
  { id: optativeId, parentId: flexibleRootId, kind: "category", name: "Asignaturas optativas", shortName: "Optativas", minCredits: trajectory.plan.minimumOptativeCredits },
  { id: electiveId, parentId: flexibleRootId, kind: "category", name: "Asignaturas electivas", shortName: "Electivas", minCredits: 0 },
  { id: practicumId, parentId: null, kind: "activity", name: "Practicantado", shortName: "Practicantado", minCredits: trajectory.plan.practicumCredits }
].map((node) => ({
  ...node,
  sourceStatus: "official",
  sourceUrl: node.id === optativeId || node.id === electiveId ? trajectory.source.careerPage : trajectory.source.planDocument
}));

function nodeForLabel(label) {
  const value = normalized(label);
  if (value.includes("fisico matematic")) return "qf2015-cfm";
  if (value.includes("ciencias quimic")) return "qf2015-cq";
  if (value.includes("biologic") || value.includes("biomedic")) return "qf2015-cbb";
  if (value.includes("farmaceutic") || value.includes("legislacion") || value.includes("gestion de empresas")) return "qf2015-cflg";
  if (value.includes("practicant") || value.includes("internado") || value.includes("proyecto especifico")) return practicumId;
  if (value.includes("optativ")) return optativeId;
  if (value.includes("electiv")) return electiveId;
  return null;
}

const requirementGroupMap = {};
for (const course of bedelias.plan.courses) {
  for (const curriculumPath of course.curriculumPaths ?? []) {
    for (const label of curriculumPath) {
      const match = String(label).match(/^(\d+)\s+-\s+/);
      const nodeId = nodeForLabel(label);
      if (match && nodeId) requirementGroupMap[match[1]] = nodeId;
    }
  }
}

function allocationFromPaths(course) {
  const eligible = new Set();
  for (const curriculumPath of course.curriculumPaths ?? []) {
    let mostSpecific = null;
    for (const label of curriculumPath) mostSpecific = nodeForLabel(label) ?? mostSpecific;
    if (mostSpecific) eligible.add(mostSpecific);
  }
  const eligibleRequirementIds = [...eligible];
  return {
    eligibleRequirementIds,
    creditAllocations: eligibleRequirementIds.length === 1
      ? [{ nodeId: eligibleRequirementIds[0], credits: course.credits, status: "official", sourceUrl: bedeliasSource }]
      : []
  };
}

function ruleCoverage(code) {
  if (modeledRuleCodes.has(code)) return "published";
  if (rawRuleCodes.has(code)) return "partial";
  if (noPublishedRuleCodes.has(code)) return "not-published";
  return "not-scraped";
}

const projectedCourses = [];
const courseIdByAlias = new Map();
for (const [alias, specification] of Object.entries(trajectory.courses)) {
  const official = resolvedByAlias.get(alias);
  const id = official.code;
  courseIdByAlias.set(alias, id);
  projectedCourses.push({
    id,
    bedeliasCode: official.code,
    name: specification.name,
    credits: specification.credits,
    eligibleRequirementIds: [specification.requirementId],
    creditAllocations: [{
      nodeId: specification.requirementId,
      credits: specification.credits,
      status: official.credits === specification.credits ? "official" : "conflict",
      sourceUrl: official.credits === specification.credits ? trajectory.source.planDocument : trajectory.source.suggestedCurriculum
    }],
    dataStatus: "fq-damero",
    ruleCoverage: ruleCoverage(official.code),
    elective: false
  });
}

const semesters = trajectory.trajectory.semesters.map((aliases) => aliases.map((alias) => {
  const id = courseIdByAlias.get(alias);
  if (!id) throw new Error(`El damero referencia un alias inexistente: ${alias}.`);
  return id;
}));
const trajectoryCodes = new Set(courseIdByAlias.values());
const practicumCourseId = courseIdByAlias.get("practicantado");

const mandatoryCreditsByRequirement = Object.fromEntries(trajectory.requirements.map((requirement) => [requirement.id, 0]));
for (const course of projectedCourses) {
  if (course.creditAllocations[0].nodeId in mandatoryCreditsByRequirement) {
    mandatoryCreditsByRequirement[course.creditAllocations[0].nodeId] += course.credits;
  }
}
for (const requirement of trajectory.requirements) {
  if (mandatoryCreditsByRequirement[requirement.id] !== requirement.minCredits) {
    throw new Error(`${requirement.name}: el damero suma ${mandatoryCreditsByRequirement[requirement.id]} y el plan exige ${requirement.minCredits}.`);
  }
}

const catalogCourses = bedelias.plan.courses
  .filter((course) => !trajectoryCodes.has(course.code))
  .map((course) => ({
    id: course.serviceCode ? `${course.serviceCode}:${course.code}` : course.code,
    serviceCode: course.serviceCode,
    bedeliasCode: course.code,
    name: displayName(course.name),
    credits: course.credits,
    ...allocationFromPaths(course),
    offered: [],
    elective: true,
    dataStatus: "bedelias-composition",
    ruleCoverage: ruleCoverage(course.code)
  }));

const normalizedRules = modeledRules.map(({ target, expression, heading, sourceUrl }) => ({ target, expression, heading, sourceUrl }));
const rules = normalizedRules.filter((rule) => trajectoryCodes.has(rule.target.code));
const catalogRules = normalizedRules.filter((rule) => !trajectoryCodes.has(rule.target.code));
const creditStructure = {
  countingMode: "allocated",
  nodes,
  credentials: [{
    id: "pharmacist",
    title: trajectory.plan.degreeTitle,
    minTotalCredits: trajectory.plan.minCredits,
    nodeRequirements: nodes.map((node) => ({ nodeId: node.id, minCredits: node.minCredits })),
    requiredCourseGroups: [],
    requiredActivities: [{
      id: "practicum",
      label: "Practicantado",
      minCredits: trajectory.plan.practicumCredits,
      courseIds: [practicumCourseId],
      representationStatus: "modeled",
      sourceUrl: trajectory.source.planDocument
    }],
    sourceUrl: trajectory.source.planDocument
  }]
};

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
    publishedRules: modeledRules.length,
    partialRules: rawRules.length,
    noPublishedRule: bedelias.prerequisites.filter((rule) => rule.noPublishedRule).length
  },
  creditStructure,
  requirementGroupMap,
  programSources: [],
  courses: projectedCourses,
  trajectories: {
    [trajectory.trajectory.id]: {
      label: trajectory.trajectory.label,
      description: trajectory.trajectory.description,
      semesters
    }
  },
  rules,
  sourceCoverage: {
    mandatoryCourses: projectedCourses.length,
    bedeliasCompositionCourses: bedelias.plan.courses.length,
    modeledRules: modeledRules.length,
    partialRules: rawRules.length,
    noPublishedRule: bedelias.prerequisites.filter((rule) => rule.noPublishedRule).length
  }
};

const catalogOutput = {
  schemaVersion: 1,
  source: {
    system: bedelias.source.system,
    extractedAt: bedelias.source.extractedAt,
    planUrl: bedelias.plan.sourceUrl,
    contentHash: bedelias.contentHash,
    optativesCatalog: trajectory.source.optativesCatalog,
    electivesCatalog: trajectory.source.electivesCatalog
  },
  courses: catalogCourses,
  rules: catalogRules
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
await writeFile(catalogOutputPath, `${JSON.stringify(catalogOutput, null, 2)}\n`, "utf8");
console.log(`Químico Farmacéutico 2015: ${projectedCourses.length} materias/bloques y ${rules.length} reglas iniciales -> ${outputPath}`);
console.log(`Catálogo diferido: ${catalogCourses.length} materias/equivalencias y ${catalogRules.length} reglas -> ${catalogOutputPath}`);
console.log(`Reglas no proyectadas por texto sin interpretar: ${rawRules.length}.`);
