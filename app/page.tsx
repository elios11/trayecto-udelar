"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import bedeliasDataJson from "./data/computacion-1997-bedelias.json";
import plan2025DataJson from "./data/computacion-2025-fing.json";
import { academicCatalog, createAcademicPlanRecord, type AcademicPlanOption, type CredentialId, type PlanId } from "./academic-catalog";
import { isRegisteredAcademicPlan, isRegisteredPathway, loadRegisteredAcademicPlan, registeredAcademicPlans } from "./academic-plan-registry";
import { resolveAcademicOption } from "./academic-option.mjs";
import { availablePathwayEntries, resolveCampus, resolveCampusPathway } from "./academic-campus.mjs";
import { matchesCourseSearch } from "./course-search.mjs";
import { hasRecordedCourseProgress, hasRecordedProgressOutsideCatalog, sortCoursesByProgress } from "./course-progress.mjs";
import { collectRequirementOptions, isRequirementExpressionEvaluable } from "../lib/requirement-expression.mjs";

type CourseStatus = "pending" | "approved" | "exonerated";
type AllocationStatus = "official" | "suggested" | "conflict";

type CreditAllocation = {
  nodeId: string;
  credits: number;
  status: AllocationStatus;
  sourceUrl: string;
};

type RequirementNode = {
  id: string;
  parentId: string | null;
  kind: "group" | "area" | "cycle" | "module" | "category" | "activity";
  name: string;
  shortName?: string;
  minCredits: number;
  sourceStatus: "official" | "partial" | "suggested";
  sourceUrl: string;
};

type Credential = {
  id: CredentialId;
  title: string;
  minTotalCredits: number;
  nodeRequirements: Array<{ nodeId: string; minCredits: number; maxCredits?: number }>;
  alternativeNodeRequirements?: Array<{
    id: string;
    label: string;
    minSatisfied: number;
    options: Array<{ nodeId: string; minCredits: number }>;
    sourceUrl: string;
  }>;
  requiredCourseGroups: Array<{ id: string; label: string; minCompleted: number; courseIds: string[]; sourceUrl: string }>;
  requiredActivities: Array<{ id: string; label: string; minCredits: number; courseIds: string[]; representationStatus: "modeled" | "not-modeled"; sourceUrl: string }>;
  sourceUrl: string;
};

type CreditStructure = {
  countingMode: "allocated" | "independent";
  nodes: RequirementNode[];
  credentials: Credential[];
};

type Course = {
  id: string;
  name: string;
  credits: number;
  hours?: number;
  semester: number | "opt";
  area?: string;
  eligibleRequirementIds?: string[];
  creditAllocations?: CreditAllocation[];
  prerequisites?: string[];
  minCredits?: number;
  offered: Array<"impar" | "par" | "libre">;
  elective?: boolean;
  placementTest?: boolean;
  engineeringOnly?: boolean;
  dataStatus?: "bedelias-composition" | "fing-trajectory" | "project-assumption" | "fq-damero" | "fadu-official" | "official-curriculum";
  bedeliasCode?: string;
  core?: boolean;
  placeholder?: boolean;
  serviceCode?: string | null;
  ruleCoverage?: "published" | "partial" | "not-published" | "not-scraped" | "not-applicable";
  curricularBlock?: boolean;
  offering?: { term: string; sourceUrl: string; evaUrl?: string; capacity: number | null };
};

type RequirementOption = {
  assessment: "course" | "exam" | "course-enrollment" | "exam-enrollment" | "course-activity";
  serviceCode: string | null;
  code: string;
  name: string;
};

type RequirementExpression = {
  kind: "all" | "any" | "none" | "requirement";
  label: string;
  minimum: number | null;
  options: RequirementOption[];
  creditRequirement: { minimum: number; planYear: string; planName: string } | null;
  groupCreditRequirement?: { minimum: number; groupCode: string; groupName: string } | null;
  groupApprovalRequirement?: { minimum: number; groupCode: string; groupName: string } | null;
  children: RequirementExpression[];
};

const courseLoadLabel = (course: Pick<Course, "credits" | "hours">) => course.credits > 0
  ? `${course.credits} cr.`
  : course.hours
    ? `${course.hours} h`
    : "Créditos no publicados";

const coursesLoadLabel = (courses: Course[]) => {
  const credits = courses.reduce((sum, course) => sum + course.credits, 0);
  const hours = courses.reduce((sum, course) => sum + (course.hours ?? 0), 0);
  if (credits > 0 && hours > 0) return `${credits} créditos · ${hours} horas`;
  if (credits > 0) return `${credits} créditos`;
  if (hours > 0) return `${hours} horas`;
  return "Créditos no publicados";
};

type VerifiedRule = {
  target: { code: string; name: string; assessment: "course" | "exam" };
  expression: RequirementExpression;
  heading: string;
  sourceUrl: string;
};

type BedeliasProjection = {
  schemaVersion: number;
  source: { extractedAt: string; contentHash: string };
  plan: { minCredits: number; colibriUrl: string };
  creditStructure: CreditStructure;
  requirementGroupMap: Record<string, string>;
  programSources: Array<{ courseCode: string; courseName: string; area: string; url: string }>;
  courses: Array<{ code: string; name: string; credits: number; catalogKind: "trajectory" | "flexible"; eligibleRequirementIds: string[]; creditAllocations: CreditAllocation[] }>;
  rules: VerifiedRule[];
};
type ExtendedElectivesProjection = {
  schemaVersion: number;
  source: { system: string; extractedAt: string; planUrl: string; contentHash: string; enrichmentSources: Array<{ system: string; url: string; reviewedAt: string; term: { year: number; semester: number; label: string } }> };
  courses: Array<{ id: string; serviceCode: string; code: string; name: string; credits: number; catalogKind: "bedelias-catalog"; eligibleRequirementIds: string[]; creditAllocations: CreditAllocation[]; offered: Array<"impar" | "par" | "libre">; offering?: { term: string; sourceUrl: string; evaUrl?: string; capacity: number | null } }>;
  rules: VerifiedRule[];
  offeredOutsidePlanComposition: Array<{ code: string; name: string }>;
  excludedAdministrativeEntries: Array<{ id: string; serviceCode: string; code: string; name: string; credits: number }>;
};


type Plan2025Projection = {
  schemaVersion: number;
  source: { reviewedAt: string; curriculumPage: string; bedeliasExtractedAt: string };
  plan: { minCredits: number; intermediateCredits: number; intermediateTitle: string; degreeTitle: string; notice: string; bedeliasCompositionCourses: number; publishedRules: number };
  creditStructure: CreditStructure;
  programSources: Array<{ courseCode: string; courseName: string; area: string; url: string }>;
  courses: Array<{ id: string; name: string; credits: number; eligibleRequirementIds: string[]; creditAllocations: CreditAllocation[]; placementTest?: boolean; engineeringOnly?: boolean; dataStatus: "bedelias-composition" | "fing-trajectory" | "project-assumption" }>;
  trajectories: Record<string, { label: string; description: string; notice?: string; preSemester?: string[]; semesters: string[][] }>;
  rules: VerifiedRule[];
};

type Electric2023Projection = Omit<Plan2025Projection, "trajectories" | "source" | "plan" | "courses" | "programSources"> & {
  source: { reviewedAt: string; profilesSpreadsheet: string; commissionPage: string; planDocument: string; bedeliasExtractedAt: string };
  plan: Plan2025Projection["plan"] & { approvalYear: number; careerCode: string; noPublishedRule: number; localCourses: number; externalEquivalences: number };
  courses: Array<Plan2025Projection["courses"][number] & { bedeliasCode?: string; core?: boolean; placeholder?: boolean; elective?: boolean; ruleCoverage?: Course["ruleCoverage"] }>;
  profiles: Record<string, { label: string; description: string; semesters: string[][] }>;
  commonCourseIds: string[];
  requirementGroupMap: Record<string, string>;
};
type Electric2023CatalogProjection = {
  schemaVersion: number;
  source: { system: string; extractedAt: string; planUrl: string; contentHash: string };
  courses: Array<Plan2025Projection["courses"][number] & { serviceCode: string | null; bedeliasCode: string; elective: boolean; offered: Array<"impar" | "par" | "libre">; ruleCoverage?: Course["ruleCoverage"] }>;
  rules: VerifiedRule[];
};
type Civil2021Projection = Electric2023Projection;
type Civil2021CatalogProjection = Electric2023CatalogProjection;

type Qf2015Projection = {
  schemaVersion: number;
  source: { reviewedAt: string; careerPage: string; planDocument: string; suggestedCurriculum: string; bedeliasExtractedAt: string };
  plan: { year: string; degreeTitle: string; minCredits: number; durationMonths: number; notice: string; bedeliasCompositionCourses: number; publishedRules: number; partialRules: number; noPublishedRule: number };
  creditStructure: CreditStructure;
  courses: Array<{ id: string; bedeliasCode: string; name: string; credits: number; eligibleRequirementIds: string[]; creditAllocations: CreditAllocation[]; dataStatus: "fq-damero"; ruleCoverage: Course["ruleCoverage"]; elective: boolean }>;
  trajectories: Record<string, { label: string; description: string; semesters: string[][] }>;
  rules: VerifiedRule[];
  requirementGroupMap: Record<string, string>;
};
type Qf2015CatalogProjection = {
  schemaVersion: number;
  source: { system: string; extractedAt: string; planUrl: string; contentHash: string; optativesCatalog: string; electivesCatalog: string };
  courses: Array<{ id: string; serviceCode: string | null; bedeliasCode: string; name: string; credits: number; eligibleRequirementIds: string[]; creditAllocations: CreditAllocation[]; offered: Array<"impar" | "par" | "libre">; elective: boolean; dataStatus: "bedelias-composition"; ruleCoverage: Course["ruleCoverage"] }>;
  rules: VerifiedRule[];
};

type CampusOption = {
  id: string;
  label: string;
  official: true;
  defaultPathwayId?: string;
};

type RegisteredProjection = {
  schemaVersion: number;
  source: { reviewedAt: string | null; careerPage: string; planDocument: string; bedeliasExtractedAt: string; bedeliasContentHash: string; bedeliasPlanUrl?: string };
  plan: { year: string; current: boolean; degreeTitle: string; minCredits: number; publishedMinCredits?: number | null; durationMonths: number | null; totalHours?: number | null; campuses: string[] | CampusOption[]; sharedWith: string[]; auditStatus: "audited" | "official-evidence-complete" | "structurally-valid" | "extracted"; compositionAvailable?: boolean; notice: string; publishedRules: number; partialRules: number; noPublishedRule: number };
  creditStructure: CreditStructure;
  courses: Array<{ id: string; bedeliasCode?: string; name: string; credits: number; eligibleRequirementIds: string[]; creditAllocations: CreditAllocation[]; dataStatus: "fadu-official" | "bedelias-composition" | "official-curriculum"; ruleCoverage: Course["ruleCoverage"]; curricularBlock?: boolean }>;
  pathways: Record<string, { label: string; description: string; credentialId?: CredentialId; campusIds?: string[]; periods: Array<{ label: string; courseIds: string[] }>; catalogCourseIds?: string[] }>;
  campuses?: CampusOption[];
  rules: VerifiedRule[];
  requirementGroupMap: Record<string, string>;
  requirementCourseGroups?: Record<string, string[]>;
  audit: { anomalies: unknown[]; priority?: string; publicationEligible?: boolean };
};

const bedeliasData = bedeliasDataJson as unknown as BedeliasProjection;
const plan2025Data = plan2025DataJson as unknown as Plan2025Projection;
const plan1997PlacementTestSource = "https://eva.fing.edu.uy/pluginfile.php/79060/mod_resource/content/5/TrayectoriaSugerida_2025_Montevideo.pdf";

const plan1997BaseCourses: Course[] = [
  { id: "PI", name: "Prueba Inicial", credits: 4, semester: 0, area: "Matemática", creditAllocations: [], placementTest: true, offered: ["impar", "par"] },
  { id: "MI2", name: "Matemática Inicial", credits: 4, semester: 1, area: "Matemática", offered: ["impar", "par"] },
  { id: "1023", name: "Matemática Discreta 1", credits: 9, semester: 1, area: "Fundamentos", offered: ["impar", "par", "libre"] },
  { id: "1373", name: "Programación 1", credits: 10, semester: 1, area: "Programación", offered: ["impar", "par"] },
  { id: "1061", name: "Cálculo Diferencial e Integral en una Variable", credits: 13, semester: 2, area: "Matemática", prerequisites: ["MI2"], offered: ["impar", "par", "libre"] },
  { id: "1151", name: "Física 1", credits: 10, semester: 2, area: "Ciencias", offered: ["impar", "par", "libre"] },
  { id: "1030", name: "Geometría y Álgebra Lineal 1", credits: 9, semester: 2, area: "Matemática", offered: ["impar", "par", "libre"] },
  { id: "1321", name: "Programación 2", credits: 12, semester: 2, area: "Programación", prerequisites: ["1373"], offered: ["impar", "par"] },
  { id: "1062", name: "Cálculo Diferencial e Integral en Varias Variables", credits: 13, semester: 3, area: "Matemática", prerequisites: ["1061"], offered: ["impar", "par", "libre"] },
  { id: "1031", name: "Geometría y Álgebra Lineal 2", credits: 9, semester: 3, area: "Matemática", prerequisites: ["1030"], offered: ["impar", "par", "libre"] },
  { id: "1027", name: "Lógica", credits: 12, semester: 3, area: "Fundamentos", prerequisites: ["1023"], offered: ["impar"] },
  { id: "1026", name: "Matemática Discreta 2", credits: 9, semester: 3, area: "Fundamentos", prerequisites: ["1023"], offered: ["impar", "par", "libre"] },
  { id: "1466", name: "Arquitectura de Computadoras", credits: 10, semester: 4, area: "Sistemas", prerequisites: ["1373"], offered: ["par", "libre"] },
  { id: "1323", name: "Programación 3", credits: 15, semester: 4, area: "Programación", prerequisites: ["1321"], offered: ["par", "libre"] },
  { id: "1025", name: "Probabilidad y Estadística", credits: 10, semester: 4, area: "Matemática", prerequisites: ["1061"], offered: ["impar", "par", "libre"] },
  { id: "1033", name: "Métodos Numéricos", credits: 8, semester: 4, area: "Matemática", prerequisites: ["1062"], offered: ["par"] },
  { id: "1537", name: "Sistemas Operativos", credits: 12, semester: 5, area: "Sistemas", prerequisites: ["1466", "1323"], offered: ["impar", "libre"] },
  { id: "1324", name: "Programación 4", credits: 15, semester: 5, area: "Programación", prerequisites: ["1321"], offered: ["impar"] },
  { id: "1325", name: "Teoría de Lenguajes", credits: 12, semester: 5, area: "Fundamentos", prerequisites: ["1027", "1026"], offered: ["impar"] },
  { id: "1944", name: "Administración General para Ingenieros", credits: 5, semester: 5, area: "Gestión", minCredits: 120, offered: ["impar", "libre"] },
  { id: "1911", name: "Fundamentos de Bases de Datos", credits: 15, semester: 6, area: "Datos", prerequisites: ["1323"], offered: ["par"] },
  { id: "1327", name: "Taller de Programación", credits: 15, semester: 6, area: "Integradora", prerequisites: ["1323", "1324"], offered: ["par"] },
  { id: "1446", name: "Redes de Computadoras", credits: 12, semester: 6, area: "Sistemas", prerequisites: ["1537"], offered: ["par"] },
  { id: "1945", name: "Práctica de Administración para Ingenieros", credits: 5, semester: 6, area: "Gestión", minCredits: 150, offered: ["par", "libre"] },
  { id: "1650", name: "Introducción a la Investigación de Operaciones", credits: 10, semester: 7, area: "Matemática", prerequisites: ["1025"], offered: ["impar"] },
  { id: "1783", name: "Taller Introductorio de Ingeniería de Software", credits: 10, semester: 7, area: "Software", prerequisites: ["1327"], offered: ["impar"] },
  { id: "1340", name: "Programación Lógica", credits: 10, semester: 7, area: "Programación", prerequisites: ["1027", "1324"], offered: ["impar"] },
  { id: "1721", name: "Proyecto de Ingeniería de Software", credits: 15, semester: 8, area: "Integradora", prerequisites: ["1783", "1911"], minCredits: 250, offered: ["par"] },
  { id: "1224", name: "Economía", credits: 7, semester: 8, area: "Gestión", minCredits: 120, offered: ["par", "libre"] },
  { id: "1225", name: "Políticas Científicas en Informática", credits: 3, semester: 8, area: "Gestión", minCredits: 120, offered: ["par"] },
  { id: "1730-A", name: "Proyecto de Grado · primera etapa", credits: 15, semester: 9, area: "Integradora", offered: ["impar", "par"] },
  { id: "1730-B", name: "Proyecto de Grado · segunda etapa", credits: 15, semester: 10, area: "Integradora", prerequisites: ["1730-A"], offered: ["impar", "par"] },
];

const plan1997VerifiedCourses = new Map(bedeliasData.courses.map((course) => [course.code, course]));
const plan1997TrajectoryCourses: Course[] = plan1997BaseCourses.map((course) => {
  const lookupId = course.id === "1730-A" || course.id === "1730-B" ? "1730" : course.id;
  const official = plan1997VerifiedCourses.get(lookupId);
  if (official) {
    return {
      ...course,
      credits: course.id.startsWith("1730-") ? 15 : official.credits,
      eligibleRequirementIds: official.eligibleRequirementIds,
      creditAllocations: official.creditAllocations.map((allocation) => ({ ...allocation, credits: course.id.startsWith("1730-") ? 15 : allocation.credits })),
    };
  }
  if (course.id === "PI") {
    return {
      ...course,
      eligibleRequirementIds: [],
      creditAllocations: [{ nodeId: "p1997-math", credits: 4, status: "suggested", sourceUrl: plan1997PlacementTestSource }],
    };
  }
  return course;
});

const plan1997FlexibleCourses: Course[] = bedeliasData.courses
  .filter((course) => course.catalogKind === "flexible" && !plan1997BaseCourses.some((item) => item.id === course.code))
  .map((course) => ({
    id: course.code,
    name: readableCourseName(course.name),
    credits: course.credits,
    semester: "opt",
    eligibleRequirementIds: course.eligibleRequirementIds,
    creditAllocations: course.creditAllocations,
    offered: [],
    elective: true,
  }));

const plan1997Courses = [...plan1997TrajectoryCourses, ...plan1997FlexibleCourses];
const initialPlan1997CourseIds = new Set(plan1997Courses.map((course) => course.id));
const plan1997NodeLabels = new Map(bedeliasData.creditStructure.nodes.map((node) => [node.id, node.shortName ?? node.name]));
const plan2025CatalogCourses: Course[] = (() => {
  const projected = plan2025Data.courses.map((course) => ({ ...course, semester: "opt" as const, offered: [] }));
  const projectedIds = new Set(projected.map((course) => course.id));
  const projectedNames = new Set(projected.map((course) => course.name.toLocaleLowerCase("es-UY")));
  const electives = plan1997FlexibleCourses
    .filter((course) => !projectedIds.has(course.id) && !projectedNames.has(course.name.toLocaleLowerCase("es-UY")))
    .map((course) => ({
      ...course,
      semester: "opt" as const,
      area: plan1997NodeLabels.get(course.creditAllocations?.[0]?.nodeId ?? "") ?? "Optativa",
      eligibleRequirementIds: [],
      creditAllocations: [],
      offered: [],
      elective: true,
    }));
  return [...projected, ...electives];
})();


function buildExtendedPlan1997Courses(data: ExtendedElectivesProjection | null): Course[] {
  return (data?.courses ?? []).map((course) => ({
    id: course.id,
    name: readableCourseName(course.name),
    credits: course.credits,
    semester: "opt",
    eligibleRequirementIds: course.eligibleRequirementIds,
    creditAllocations: course.creditAllocations,
    offered: course.offered,
    offering: course.offering,
    elective: true,
  }));
}
function buildPlan2025Courses(trajectoryId: string): Course[] {
  const trajectory = plan2025Data.trajectories[trajectoryId] ?? plan2025Data.trajectories["pi-60-plus"];
  const semesters = new Map<string, number>();
  trajectory.preSemester?.forEach((id) => semesters.set(id, 0));
  trajectory.semesters.forEach((ids, index) => ids.forEach((id) => semesters.set(id, index + 1)));
  return plan2025Data.courses
    .filter((course) => semesters.has(course.id))
    .map((course) => ({ ...course, semester: semesters.get(course.id)!, offered: [] }));
}

function buildElectric2023Courses(profileId: string, data: Electric2023Projection | null): Course[] {
  if (!data) return [];
  const profile = resolveAcademicOption(data.profiles, profileId, "basic");
  if (!profile) return [];
  const semesters = new Map<string, number>();
  profile.semesters.forEach((ids, index) => ids.forEach((id) => semesters.set(id, index + 1)));
  return data.courses
    .filter((course) => semesters.has(course.id))
    .map((course) => ({ ...course, semester: semesters.get(course.id)!, offered: [] }));
}

function buildElectric2023Catalog(profileId: string, planData: Electric2023Projection | null, data: Electric2023CatalogProjection | null): Course[] {
  const trajectoryCourses = buildElectric2023Courses(profileId, planData);
  const ids = new Set(trajectoryCourses.map((course) => course.id));
  const bedeliasCodes = new Set(trajectoryCourses.map((course) => course.bedeliasCode).filter(Boolean));
  const catalog = (data?.courses ?? [])
    .filter((course) => !ids.has(course.id) && !bedeliasCodes.has(course.bedeliasCode))
    .map((course) => ({ ...course, semester: "opt" as const }));
  return [...trajectoryCourses, ...catalog];
}

function buildQf2015Courses(trajectoryId: string, data: Qf2015Projection | null): Course[] {
  if (!data) return [];
  const trajectory = resolveAcademicOption(data.trajectories, trajectoryId, "suggested");
  if (!trajectory) return [];
  const semesters = new Map<string, number>();
  trajectory.semesters.forEach((ids, index) => ids.forEach((id) => semesters.set(id, index + 1)));
  return data.courses
    .filter((course) => semesters.has(course.id))
    .map((course) => ({ ...course, semester: semesters.get(course.id)!, offered: [] }));
}

function buildQf2015Catalog(trajectoryId: string, planData: Qf2015Projection | null, data: Qf2015CatalogProjection | null): Course[] {
  const trajectoryCourses = buildQf2015Courses(trajectoryId, planData);
  const ids = new Set(trajectoryCourses.map((course) => course.id));
  const bedeliasCodes = new Set(trajectoryCourses.map((course) => course.bedeliasCode));
  const catalog = (data?.courses ?? [])
    .filter((course) => !ids.has(course.id) && !bedeliasCodes.has(course.bedeliasCode))
    .map((course) => ({ ...course, semester: "opt" as const }));
  return [...trajectoryCourses, ...catalog];
}

function buildRegisteredPlanCourses(pathwayId: string, data: RegisteredProjection | null): Course[] {
  if (!data) return [];
  const pathway = resolveAcademicOption(data.pathways, pathwayId, Object.keys(data.pathways)[0] ?? "");
  if (!pathway) return [];
  const periods = new Map<string, number>();
  pathway.periods.forEach((period, index) => period.courseIds.forEach((id) => periods.set(id, index + 1)));
  const catalogIds = new Set(pathway.catalogCourseIds ?? []);
  return data.courses
    .filter((course) => periods.has(course.id) || catalogIds.has(course.id))
    .map((course) => ({ ...course, semester: catalogIds.has(course.id) ? "opt" : periods.get(course.id)!, offered: [] }));
}

function optionSatisfied(option: RequirementOption, statuses: Record<string, CourseStatus>) {
  const status = statuses[option.code] ?? "pending";
  const placementTestSubstitution = option.code === "MI2" && statuses.PI === "exonerated";
  if (option.assessment === "course" || option.assessment === "course-activity") return placementTestSubstitution || status === "approved" || status === "exonerated";
  if (option.assessment === "exam") return placementTestSubstitution || status === "exonerated";
  return false;
}

function expressionSatisfied(expression: RequirementExpression, statuses: Record<string, CourseStatus>, earnedCredits: number, groupCredits: (groupCode: string) => number = () => 0, groupApprovals: (groupCode: string) => number = () => 0): boolean {
  if (expression.kind === "all") return expression.children.every((child) => expressionSatisfied(child, statuses, earnedCredits, groupCredits, groupApprovals));
  if (expression.kind === "any") return expression.children.some((child) => expressionSatisfied(child, statuses, earnedCredits, groupCredits, groupApprovals));
  if (expression.kind === "none") return !expression.children.some((child) => expressionSatisfied(child, statuses, earnedCredits, groupCredits, groupApprovals));
  if (expression.creditRequirement) return earnedCredits >= expression.creditRequirement.minimum;
  if (expression.groupCreditRequirement) return groupCredits(expression.groupCreditRequirement.groupCode) >= expression.groupCreditRequirement.minimum;
  if (expression.groupApprovalRequirement) return groupApprovals(expression.groupApprovalRequirement.groupCode) >= expression.groupApprovalRequirement.minimum;
  const required = expression.minimum ?? 1;
  return expression.options.filter((option) => optionSatisfied(option, statuses)).length >= required;
}

function expressionReferencesCode(expression: RequirementExpression, code: string): boolean {
  return expression.options.some((option) => option.code === code)
    || expression.children.some((child) => expressionReferencesCode(child, code));
}

function readableCourseName(rawName: string) {
  const normalized = rawName
    .replace(/\(P\.\s*74\)/gi, "· Plan 1974")
    .replace(/\(1ER\.\s*SEM\.\)/gi, "· 1.er semestre")
    .replace(/\(2DO\.\s*SEM\.\)/gi, "· 2.º semestre")
    .replace(/\(ANUAL\)/gi, "· anual")
    .replace(/\bDIF\.\b/gi, "diferencial")
    .replace(/\bPROB\.\b/gi, "probabilidad")
    .replace(/\bEST\.\b/gi, "estadística")
    .replace(/\s+/g, " ")
    .trim();
  const lower = normalized.toLocaleLowerCase("es-UY");
  const accented = lower.replace(/\b(analisis|matematico|matematica|calculo|creditos|revalida|algebra|programacion|logica|fisica|estadistica)\b/g, (word) => ({
    analisis: "análisis",
    matematico: "matemático",
    matematica: "matemática",
    calculo: "cálculo",
    creditos: "créditos",
    revalida: "reválida",
    algebra: "álgebra",
    programacion: "programación",
    logica: "lógica",
    fisica: "física",
    estadistica: "estadística",
  })[word] ?? word);
  return accented.replace(/(^|[·(]\s*|\s)([a-záéíóúüñ])/g, (match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("es-UY")}`)
    .replace(/\b(Ii|Iii|Iv|Vi|Vii|Viii|Ix|Xi|Xii)\b/g, (roman) => roman.toUpperCase())
    .replace("1.er Semestre", "1.er semestre")
    .replace("2.º Semestre", "2.º semestre")
    .replace("· Anual", "· anual");
}

function describeOption(option: RequirementOption, courses: Course[]) {
  const course = courses.find((item) => item.id === option.code);
  const name = course?.name ?? readableCourseName(option.name);
  const evidence = option.assessment === "exam" ? "examen aprobado"
    : option.assessment === "course" ? "curso aprobado"
      : option.assessment === "course-activity" ? "actividad de curso registrada"
        : option.assessment === "exam-enrollment" ? "inscripción a examen"
          : "inscripción a curso";
  return `${name} · ${evidence}`;
}

function describeExcludedOption(option: RequirementOption, courses: Course[]) {
  const course = courses.find((item) => item.id === option.code);
  const name = course?.name ?? readableCourseName(option.name);
  if (option.assessment === "course-enrollment") return `No estar inscripto/a al curso de ${name}`;
  if (option.assessment === "exam-enrollment") return `No estar inscripto/a al examen de ${name}`;
  if (option.assessment === "course-activity") return `No tener actividad de curso aprobada o reprobada de ${name}`;
  if (option.assessment === "course") return `No tener aprobado el curso de ${name}`;
  return `No tener aprobado el examen de ${name}`;
}

type RequirementRow = {
  key: string;
  label: string;
  alternatives?: string[];
  alternativeGroups?: Array<{ label: string; conditions: string[]; done: boolean }>;
  done: boolean;
};

function expressionOptions(expression: RequirementExpression, courses: Course[], courseIds: Set<string>) {
  const localOptions = expression.options.filter((option) => courseIds.has(option.code));
  const displayOptions = localOptions.length ? localOptions : expression.options.slice(0, 3);
  return displayOptions.map((option) => describeOption(option, courses));
}

function describeExpression(expression: RequirementExpression, courses: Course[], courseIds: Set<string>): string {
  if (expression.creditRequirement) return `${expression.creditRequirement.minimum} créditos acumulados en el plan`;
  if (expression.groupCreditRequirement) return `${expression.groupCreditRequirement.minimum} créditos en ${readableCourseName(expression.groupCreditRequirement.groupName)}`;
  if (expression.groupApprovalRequirement) return `${expression.groupApprovalRequirement.minimum} unidades aprobadas en ${readableCourseName(expression.groupApprovalRequirement.groupName)}`;
  if (expression.kind === "none") {
    const options = (collectRequirementOptions(expression) as RequirementOption[]).slice(0, 3);
    return options.length ? options.map((option) => describeExcludedOption(option, courses)).join(" o ") : "No cumplir una condición excluyente";
  }
  if (expression.kind === "all") return expression.children.map((child) => describeExpression(child, courses, courseIds)).filter(Boolean).join(" y ");
  if (expression.kind === "any") return expression.children.map((child) => describeExpression(child, courses, courseIds)).filter(Boolean).join(" o ");
  const displayOptions = expressionOptions(expression, courses, courseIds);
  return displayOptions.length ? displayOptions.join(" o ") : expression.label;
}

function branchConditions(expression: RequirementExpression, courses: Course[], courseIds: Set<string>): string[] {
  if (expression.kind === "all") return expression.children.flatMap((child) => branchConditions(child, courses, courseIds));
  if (expression.kind === "any") return [`Una de estas alternativas: ${expression.children.map((child) => describeExpression(child, courses, courseIds)).join(" / ")}`];
  if (expression.kind === "none") return [describeExpression(expression, courses, courseIds)];
  return [describeExpression(expression, courses, courseIds)];
}

function requirementRows(expression: RequirementExpression, statuses: Record<string, CourseStatus>, earnedCredits: number, courses: Course[], courseIds: Set<string>, groupCredits: (groupCode: string) => number, groupApprovals: (groupCode: string) => number, prefix = "r"): RequirementRow[] {
  if (expression.kind === "all") return expression.children.flatMap((child, index) => requirementRows(child, statuses, earnedCredits, courses, courseIds, groupCredits, groupApprovals, `${prefix}-${index}`));
  if (expression.kind === "none") {
    const options = collectRequirementOptions(expression) as RequirementOption[];
    const localOptions = options.filter((option) => courseIds.has(option.code));
    const alternatives = (localOptions.length ? localOptions : options).slice(0, 3).map((option) => describeExcludedOption(option, courses));
    return [{ key: prefix, label: alternatives.length ? "No tener aprobada ninguna de estas equivalencias" : "No cumplir una condición excluyente", alternatives, done: expressionSatisfied(expression, statuses, earnedCredits, groupCredits, groupApprovals) }];
  }
  if (expression.kind === "any") {
    const isComplex = expression.children.some((child) => child.kind === "all" && child.children.length > 2);
    if (isComplex) {
      const alternativeGroups = expression.children.map((child, index) => ({
        label: `Opción ${index + 1}`,
        conditions: branchConditions(child, courses, courseIds),
        done: expressionSatisfied(child, statuses, earnedCredits, groupCredits, groupApprovals),
      }));
      return [{ key: prefix, label: "Cumplir una de estas opciones", alternativeGroups, done: alternativeGroups.some((group) => group.done) }];
    }
    const alternatives = expression.children.map((child) => describeExpression(child, courses, courseIds)).filter(Boolean);
    return [{ key: prefix, label: "Cumplir una de estas opciones", alternatives, done: expressionSatisfied(expression, statuses, earnedCredits, groupCredits, groupApprovals) }];
  }
  const alternatives = expressionOptions(expression, courses, courseIds);
  if (alternatives.length > 1) {
    const minimum = expression.minimum ?? 1;
    const label = minimum === 1 ? "Cumplir una de estas opciones" : `Cumplir al menos ${minimum} de estas opciones`;
    return [{ key: prefix, label, alternatives, done: expressionSatisfied(expression, statuses, earnedCredits, groupCredits, groupApprovals) }];
  }
  return [{ key: prefix, label: describeExpression(expression, courses, courseIds), done: expressionSatisfied(expression, statuses, earnedCredits, groupCredits, groupApprovals) }];
}

const stateLabels: Record<CourseStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  exonerated: "Exonerada",
};

const STORAGE_KEY = "trayecto-udelar-progress-v2";
const LEGACY_STORAGE_KEY = "trayecto-udelar-demo-v1";
type PlanProgress = Record<PlanId, Record<string, CourseStatus>>;
type AppMode = "curriculum" | "planner";
type PlannerView = "board" | "compact" | "balance";
type PlannerTerm = { id: string; label: string; courseIds: string[] };
type PlannerPlans = Record<PlanId, PlannerTerm[]>;
type CurrentPlannerTerms = Record<PlanId, string | null>;
type ThemeId = "udelar" | "violeta" | "solarized" | "bosque" | "terracota";
type ThemeScheme = "light" | "dark";
type ColorVisionType = "deuteranopia" | "protanopia" | "tritanopia";
type VisualPreferences = {
  theme: ThemeId;
  scheme: ThemeScheme;
  colorVisionEnabled: boolean;
  colorVisionType: ColorVisionType;
  appMode: AppMode;
  plannerView: PlannerView;
  availableOnly: boolean;
  showElectives: boolean;
  showRequirements: boolean;
  showPlannerCatalog: boolean;
};

const PLANNER_STORAGE_KEY = "trayecto-udelar-planner-v1";
const CURRENT_TERM_STORAGE_KEY = "trayecto-udelar-current-term-v1";
const VISUAL_PREFERENCES_STORAGE_KEY = "trayecto-udelar-visual-preferences-v1";
const ACADEMIC_SELECTION_STORAGE_KEY = "trayecto-udelar-academic-selection-v1";
const themeOptions: Array<{ id: ThemeId; label: string; colors: [string, string, string, string] }> = [
  { id: "udelar", label: "Udelar", colors: ["#004a82", "#55b7cc", "#f3f5f4", "#0c161c"] },
  { id: "violeta", label: "Violeta", colors: ["#7650aa", "#d9b7ef", "#f4f0f7", "#17101f"] },
  { id: "solarized", label: "Solarized", colors: ["#268bd2", "#f2d58b", "#fdf6e3", "#002b36"] },
  { id: "bosque", label: "Bosque", colors: ["#167565", "#91d0bd", "#eef4f0", "#0c1815"] },
  { id: "terracota", label: "Terracota", colors: ["#ad503d", "#e7b98f", "#f7f0ec", "#1d1211"] },
];
const colorVisionOptions: Array<{ id: ColorVisionType; label: string }> = [
  { id: "deuteranopia", label: "Deuteranopia" },
  { id: "protanopia", label: "Protanopia" },
  { id: "tritanopia", label: "Tritanopia" },
];
const isThemeId = (value: unknown): value is ThemeId => themeOptions.some((option) => option.id === value);
const isThemeScheme = (value: unknown): value is ThemeScheme => value === "light" || value === "dark";
const isColorVisionType = (value: unknown): value is ColorVisionType => colorVisionOptions.some((option) => option.id === value);
const isAppMode = (value: unknown): value is AppMode => value === "curriculum" || value === "planner";
const isPlannerView = (value: unknown): value is PlannerView => value === "board" || value === "compact" || value === "balance";
const electricProfileIds = new Set(["basic", "electronics", "signals-aa", "telecommunications", "biomedical", "power", "control"]);
const civilProfileIds = new Set(["construction", "structures", "hydraulic-environmental", "transportation"]);
const createDefaultTerms = (): PlannerTerm[] => Array.from({ length: 4 }, (_, index) => ({
  id: `term-${index + 1}`,
  label: `Semestre ${index + 1}`,
  courseIds: [],
}));

export default function Home() {
  const [appMode, setAppMode] = useState<AppMode>("curriculum");
  const [planYear, setPlanYear] = useState<PlanId>("2025");
  const [trajectoryId, setTrajectoryId] = useState("pi-60-plus");
  const [campusId, setCampusId] = useState("");
  const [progress, setProgress] = useState<PlanProgress>(() => createAcademicPlanRecord(() => ({})));
  const [credentialId, setCredentialId] = useState<CredentialId>("engineer");
  const [selected, setSelected] = useState<Course | null>(null);
  const [importError, setImportError] = useState<{ title: string; message: string } | null>(null);
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showElectives, setShowElectives] = useState(true);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showPlannerCatalog, setShowPlannerCatalog] = useState(true);
  const [extendedElectivesData, setExtendedElectivesData] = useState<ExtendedElectivesProjection | null>(null);
  const [extendedElectivesLoadState, setExtendedElectivesLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [electric2023Data, setElectric2023Data] = useState<Electric2023Projection | null>(null);
  const [electricPlanLoadState, setElectricPlanLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [electricCatalogData, setElectricCatalogData] = useState<Electric2023CatalogProjection | null>(null);
  const [electricCatalogLoadState, setElectricCatalogLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [civil2021Data, setCivil2021Data] = useState<Civil2021Projection | null>(null);
  const [civilPlanLoadState, setCivilPlanLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [civilCatalogData, setCivilCatalogData] = useState<Civil2021CatalogProjection | null>(null);
  const [civilCatalogLoadState, setCivilCatalogLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [qf2015Data, setQf2015Data] = useState<Qf2015Projection | null>(null);
  const [qfPlanLoadState, setQfPlanLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [qfCatalogData, setQfCatalogData] = useState<Qf2015CatalogProjection | null>(null);
  const [qfCatalogLoadState, setQfCatalogLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [registeredPlanData, setRegisteredPlanData] = useState<Partial<Record<PlanId, RegisteredProjection>>>({});
  const [registeredPlanLoadStates, setRegisteredPlanLoadStates] = useState<Partial<Record<PlanId, "idle" | "loading" | "loaded" | "error">>>({});
  const [fullElectivesCatalogExpanded, setFullElectivesCatalogExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [curriculumEdges, setCurriculumEdges] = useState({ atStart: true, atEnd: false });
  const [plannerPlans, setPlannerPlans] = useState<PlannerPlans>(() => createAcademicPlanRecord(() => createDefaultTerms()));
  const [plannerView, setPlannerView] = useState<PlannerView>("board");
  const [plannerSearch, setPlannerSearch] = useState("");
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);
  const [currentPlannerTerms, setCurrentPlannerTerms] = useState<CurrentPlannerTerms>(() => createAcademicPlanRecord(() => null));
  const [rolloverTermId, setRolloverTermId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeId>("udelar");
  const [themeScheme, setThemeScheme] = useState<ThemeScheme>("light");
  const [colorVisionEnabled, setColorVisionEnabled] = useState(false);
  const [colorVisionType, setColorVisionType] = useState<ColorVisionType>("deuteranopia");
  const importRef = useRef<HTMLInputElement>(null);
  const importErrorButtonRef = useRef<HTMLButtonElement>(null);
  const appearanceMenuRef = useRef<HTMLDetailsElement>(null);
  const curriculumScrollRef = useRef<HTMLDivElement>(null);
  const curriculumEdgesRef = useRef(curriculumEdges);
  const verticalScrollTargetRef = useRef(0);
  const verticalScrollPositionRef = useRef(0);
  const verticalScrollLastFrameRef = useRef<number | null>(null);
  const verticalScrollFrameRef = useRef<number | null>(null);
  const extendedElectivesPromiseRef = useRef<Promise<ExtendedElectivesProjection | null> | null>(null);
  const electricCatalogPromiseRef = useRef<Promise<Electric2023CatalogProjection | null> | null>(null);
  const electricPlanPromiseRef = useRef<Promise<Electric2023Projection | null> | null>(null);
  const civilCatalogPromiseRef = useRef<Promise<Civil2021CatalogProjection | null> | null>(null);
  const civilPlanPromiseRef = useRef<Promise<Civil2021Projection | null> | null>(null);
  const qfPlanPromiseRef = useRef<Promise<Qf2015Projection | null> | null>(null);
  const qfCatalogPromiseRef = useRef<Promise<Qf2015CatalogProjection | null> | null>(null);
  const registeredPlanPromisesRef = useRef<Partial<Record<PlanId, Promise<RegisteredProjection | null>>>>({});
  const activeThemeOption = themeOptions.find((option) => option.id === theme) ?? themeOptions[0];


  const loadExtendedElectives = useCallback(async (): Promise<ExtendedElectivesProjection | null> => {
    if (extendedElectivesData) return extendedElectivesData;
    if (extendedElectivesPromiseRef.current) return extendedElectivesPromiseRef.current;
    setExtendedElectivesLoadState("loading");
    const request = (async () => {
      try {
        const catalogImport = await import("./data/computacion-1997-electivas.json");
        const projection = catalogImport.default as unknown as ExtendedElectivesProjection;
        setExtendedElectivesData(projection);
        setExtendedElectivesLoadState("loaded");
        return projection;
      } catch {
        setExtendedElectivesLoadState("error");
        return null;
      } finally {
        extendedElectivesPromiseRef.current = null;
      }
    })();
    extendedElectivesPromiseRef.current = request;
    return request;
  }, [extendedElectivesData]);
  const loadElectricPlan = useCallback(async (): Promise<Electric2023Projection | null> => {
    if (electric2023Data) return electric2023Data;
    if (electricPlanPromiseRef.current) return electricPlanPromiseRef.current;
    setElectricPlanLoadState("loading");
    const request = (async () => {
      try {
        const planImport = await import("./data/electrica-2023-fing.json");
        const projection = planImport.default as unknown as Electric2023Projection;
        setElectric2023Data(projection);
        setElectricPlanLoadState("loaded");
        return projection;
      } catch {
        setElectricPlanLoadState("error");
        return null;
      } finally {
        electricPlanPromiseRef.current = null;
      }
    })();
    electricPlanPromiseRef.current = request;
    return request;
  }, [electric2023Data]);
  const loadElectricCatalog = useCallback(async (): Promise<Electric2023CatalogProjection | null> => {
    if (electricCatalogData) return electricCatalogData;
    if (electricCatalogPromiseRef.current) return electricCatalogPromiseRef.current;
    setElectricCatalogLoadState("loading");
    const request = (async () => {
      try {
        const catalogImport = await import("./data/electrica-2023-electivas.json");
        const projection = catalogImport.default as unknown as Electric2023CatalogProjection;
        setElectricCatalogData(projection);
        setElectricCatalogLoadState("loaded");
        return projection;
      } catch {
        setElectricCatalogLoadState("error");
        return null;
      } finally {
        electricCatalogPromiseRef.current = null;
      }
    })();
    electricCatalogPromiseRef.current = request;
    return request;
  }, [electricCatalogData]);
  const loadCivilPlan = useCallback(async (): Promise<Civil2021Projection | null> => {
    if (civil2021Data) return civil2021Data;
    if (civilPlanPromiseRef.current) return civilPlanPromiseRef.current;
    setCivilPlanLoadState("loading");
    const request = (async () => {
      try {
        const planImport = await import("./data/civil-2021-fing.json");
        const projection = planImport.default as unknown as Civil2021Projection;
        setCivil2021Data(projection);
        setCivilPlanLoadState("loaded");
        return projection;
      } catch {
        setCivilPlanLoadState("error");
        return null;
      } finally {
        civilPlanPromiseRef.current = null;
      }
    })();
    civilPlanPromiseRef.current = request;
    return request;
  }, [civil2021Data]);
  const loadCivilCatalog = useCallback(async (): Promise<Civil2021CatalogProjection | null> => {
    if (civilCatalogData) return civilCatalogData;
    if (civilCatalogPromiseRef.current) return civilCatalogPromiseRef.current;
    setCivilCatalogLoadState("loading");
    const request = (async () => {
      try {
        const catalogImport = await import("./data/civil-2021-electivas.json");
        const projection = catalogImport.default as unknown as Civil2021CatalogProjection;
        setCivilCatalogData(projection);
        setCivilCatalogLoadState("loaded");
        return projection;
      } catch {
        setCivilCatalogLoadState("error");
        return null;
      } finally {
        civilCatalogPromiseRef.current = null;
      }
    })();
    civilCatalogPromiseRef.current = request;
    return request;
  }, [civilCatalogData]);
  const isProfilePlan = planYear === "electrica-2023" || planYear === "civil-2021";
  const activeProfileData = planYear === "electrica-2023" ? electric2023Data : planYear === "civil-2021" ? civil2021Data : null;
  const activeProfileCatalogData = planYear === "electrica-2023" ? electricCatalogData : planYear === "civil-2021" ? civilCatalogData : null;
  const activeProfileCatalogLoadState = planYear === "electrica-2023" ? electricCatalogLoadState : civilCatalogLoadState;
  const loadQfPlan = useCallback(async (): Promise<Qf2015Projection | null> => {
    if (qf2015Data) return qf2015Data;
    if (qfPlanPromiseRef.current) return qfPlanPromiseRef.current;
    setQfPlanLoadState("loading");
    const request = (async () => {
      try {
        const planImport = await import("./data/quimico-farmaceutico-2015-fq.json");
        const projection = planImport.default as unknown as Qf2015Projection;
        setQf2015Data(projection);
        setQfPlanLoadState("loaded");
        return projection;
      } catch {
        setQfPlanLoadState("error");
        return null;
      } finally {
        qfPlanPromiseRef.current = null;
      }
    })();
    qfPlanPromiseRef.current = request;
    return request;
  }, [qf2015Data]);
  const loadQfCatalog = useCallback(async (): Promise<Qf2015CatalogProjection | null> => {
    if (qfCatalogData) return qfCatalogData;
    if (qfCatalogPromiseRef.current) return qfCatalogPromiseRef.current;
    setQfCatalogLoadState("loading");
    const request = (async () => {
      try {
        const catalogImport = await import("./data/quimico-farmaceutico-2015-electivas.json");
        const projection = catalogImport.default as unknown as Qf2015CatalogProjection;
        setQfCatalogData(projection);
        setQfCatalogLoadState("loaded");
        return projection;
      } catch {
        setQfCatalogLoadState("error");
        return null;
      } finally {
        qfCatalogPromiseRef.current = null;
      }
    })();
    qfCatalogPromiseRef.current = request;
    return request;
  }, [qfCatalogData]);
  const loadRegisteredPlan = useCallback(async (planId: PlanId): Promise<RegisteredProjection | null> => {
    if (!isRegisteredAcademicPlan(planId)) return null;
    if (registeredPlanData[planId]) return registeredPlanData[planId] ?? null;
    if (registeredPlanPromisesRef.current[planId]) return registeredPlanPromisesRef.current[planId] ?? null;
    setRegisteredPlanLoadStates((current) => ({ ...current, [planId]: "loading" }));
    const request = (async () => {
      try {
        const projection = await loadRegisteredAcademicPlan(planId) as RegisteredProjection | null;
        if (!projection || !projection.plan || !projection.pathways || !Array.isArray(projection.courses)) throw new Error("Proyección inválida");
        setRegisteredPlanData((current) => ({ ...current, [planId]: projection }));
        setRegisteredPlanLoadStates((current) => ({ ...current, [planId]: "loaded" }));
        return projection;
      } catch {
        setRegisteredPlanLoadStates((current) => ({ ...current, [planId]: "error" }));
        return null;
      } finally {
        delete registeredPlanPromisesRef.current[planId];
      }
    })();
    registeredPlanPromisesRef.current[planId] = request;
    return request;
  }, [registeredPlanData]);
  const isRegisteredPlan = isRegisteredAcademicPlan(planYear);
  const activeRegisteredPlan = registeredPlanData[planYear] ?? null;
  const hasClosedOfficialEvidence = activeRegisteredPlan?.plan.auditStatus === "audited"
    || activeRegisteredPlan?.plan.auditStatus === "official-evidence-complete";
  const activeProgressPlanId = isRegisteredPlan
    ? (registeredAcademicPlans[planYear]?.progressPlanId ?? planYear)
    : planYear;
  const registeredCampuses = activeRegisteredPlan?.campuses ?? [];
  const activeCampus = resolveCampus(registeredCampuses, campusId) as CampusOption | undefined;
  const registeredPathwayEntries = availablePathwayEntries(activeRegisteredPlan?.pathways ?? {}, activeCampus) as Array<[string, RegisteredProjection["pathways"][string]]>;
  const activeRegisteredPathwayId = resolveCampusPathway(activeRegisteredPlan?.pathways ?? {}, activeCampus, trajectoryId);
  const activeFaculty = academicCatalog.find((faculty) => faculty.careers.some((career) => career.plans.some((plan) => plan.id === planYear))) ?? academicCatalog[0];
  const activeCareer = activeFaculty.careers.find((career) => career.plans.some((plan) => plan.id === planYear)) ?? activeFaculty.careers[0];
  const selectAcademicPlan = async (nextPlan: AcademicPlanOption) => {
    const nextRegisteredPlan = isRegisteredAcademicPlan(nextPlan.id) ? await loadRegisteredPlan(nextPlan.id) : null;
    if (isRegisteredAcademicPlan(nextPlan.id) && !nextRegisteredPlan) {
      setImportError({ title: "No pudimos cargar la carrera", message: "Probá seleccionar el plan nuevamente. Tu progreso no se modificó." });
      return;
    }
    if (nextPlan.id === "electrica-2023" && !await loadElectricPlan()) {
      setImportError({ title: "No pudimos cargar la carrera", message: "Probá seleccionar Ingeniería Eléctrica nuevamente. Tu progreso no se modificó." });
      return;
    }
    if (nextPlan.id === "civil-2021" && !await loadCivilPlan()) {
      setImportError({ title: "No pudimos cargar la carrera", message: "Probá seleccionar Ingeniería Civil nuevamente. Tu progreso no se modificó." });
      return;
    }
    if (nextPlan.id === "qf-2015" && !await loadQfPlan()) {
      setImportError({ title: "No pudimos cargar la carrera", message: "Probá seleccionar Química Farmacéutica nuevamente. Tu progreso no se modificó." });
      return;
    }
    setTrajectoryId(nextPlan.defaultTrajectoryId);
    setCampusId(nextRegisteredPlan?.campuses?.[0]?.id ?? "");
    setCredentialId(nextPlan.defaultCredentialId);
    setPlanYear(nextPlan.id);
    setFullElectivesCatalogExpanded(false);
    setSelected(null);
  };

  const expandFullElectivesCatalog = async () => {
    const projection = planYear === "electrica-2023"
      ? await loadElectricCatalog()
      : planYear === "civil-2021"
        ? await loadCivilCatalog()
        : planYear === "qf-2015" ? await loadQfCatalog() : await loadExtendedElectives();
    if (projection) setFullElectivesCatalogExpanded(true);
  };
  const ensureFullCatalogForSearch = (value: string) => {
    if (planYear === "1997" && value.trim() && !extendedElectivesData && extendedElectivesLoadState !== "loading") {
      void loadExtendedElectives();
    }
    if (planYear === "electrica-2023" && value.trim() && !electricCatalogData && electricCatalogLoadState !== "loading") {
      void loadElectricCatalog();
    }
    if (planYear === "civil-2021" && value.trim() && !civilCatalogData && civilCatalogLoadState !== "loading") {
      void loadCivilCatalog();
    }
    if (planYear === "qf-2015" && value.trim() && !qfCatalogData && qfCatalogLoadState !== "loading") {
      void loadQfCatalog();
    }
  };
  const handleCurriculumSearch = (value: string) => {
    setSearch(value);
    ensureFullCatalogForSearch(value);
  };
  const handlePlannerSearch = (value: string) => {
    setPlannerSearch(value);
    ensureFullCatalogForSearch(value);
  };
  const extendedPlan1997Courses = useMemo(
    () => buildExtendedPlan1997Courses(extendedElectivesData),
    [extendedElectivesData],
  );
  const extendedPlan1997CourseIds = useMemo(() => new Set(extendedPlan1997Courses.map((course) => course.id)), [extendedPlan1997Courses]);
  const plan1997AvailableCourses = useMemo(() => [...plan1997Courses, ...extendedPlan1997Courses], [extendedPlan1997Courses]);

  const electric2023AvailableCourses = useMemo(() => buildElectric2023Catalog(trajectoryId, electric2023Data, electricCatalogData), [trajectoryId, electric2023Data, electricCatalogData]);
  const civil2021AvailableCourses = useMemo(() => buildElectric2023Catalog(trajectoryId, civil2021Data, civilCatalogData), [trajectoryId, civil2021Data, civilCatalogData]);
  const profileAvailableCourses = planYear === "electrica-2023" ? electric2023AvailableCourses : civil2021AvailableCourses;
  const profileCatalogCourseIds = useMemo(() => new Set((activeProfileCatalogData?.courses ?? []).map((course) => course.id)), [activeProfileCatalogData]);
  const qf2015AvailableCourses = useMemo(() => buildQf2015Catalog(trajectoryId, qf2015Data, qfCatalogData), [trajectoryId, qf2015Data, qfCatalogData]);
  const qfCatalogCourseIds = useMemo(() => new Set((qfCatalogData?.courses ?? []).map((course) => course.id)), [qfCatalogData]);
  const registeredAvailableCourses = useMemo(() => {
    const campuses = activeRegisteredPlan?.campuses ?? [];
    const selectedCampus = resolveCampus(campuses, campusId) as CampusOption | undefined;
    const effectivePathwayId = resolveCampusPathway(activeRegisteredPlan?.pathways ?? {}, selectedCampus, trajectoryId);
    return buildRegisteredPlanCourses(effectivePathwayId, activeRegisteredPlan);
  }, [trajectoryId, campusId, activeRegisteredPlan]);
  const courses = useMemo(
    () => isRegisteredPlan
      ? registeredAvailableCourses
      : planYear === "2025"
      ? buildPlan2025Courses(trajectoryId)
      : isProfilePlan ? profileAvailableCourses : planYear === "qf-2015" ? qf2015AvailableCourses : plan1997AvailableCourses,
    [planYear, trajectoryId, plan1997AvailableCourses, isProfilePlan, profileAvailableCourses, qf2015AvailableCourses, isRegisteredPlan, registeredAvailableCourses],
  );
  const plannerCourses = useMemo<Course[]>(() => isRegisteredPlan
    ? registeredAvailableCourses
    : planYear === "2025"
    ? plan2025CatalogCourses
    : isProfilePlan ? profileAvailableCourses : planYear === "qf-2015" ? qf2015AvailableCourses : plan1997AvailableCourses,
  [planYear, plan1997AvailableCourses, isProfilePlan, profileAvailableCourses, qf2015AvailableCourses, isRegisteredPlan, registeredAvailableCourses]);
  const plannerTerms = plannerPlans[planYear];
  const currentPlannerTermId = currentPlannerTerms[planYear];
  const activeCourses = appMode === "planner" ? plannerCourses : courses;
  const hasStoredExtendedElectiveProgress = useMemo(
    () => hasRecordedProgressOutsideCatalog(progress["1997"] ?? {}, initialPlan1997CourseIds),
    [progress],
  );
  const initialProfileCourseIds = useMemo(() => new Set((activeProfileData?.courses ?? []).map((course) => course.id)), [activeProfileData]);
  const hasStoredProfileCatalogProgress = useMemo(
    () => isProfilePlan && hasRecordedProgressOutsideCatalog(progress[planYear] ?? {}, initialProfileCourseIds),
    [progress, planYear, isProfilePlan, initialProfileCourseIds],
  );
  const initialQfCourseIds = useMemo(() => new Set((qf2015Data?.courses ?? []).map((course) => course.id)), [qf2015Data]);
  const hasStoredQfCatalogProgress = useMemo(
    () => hasRecordedProgressOutsideCatalog(progress["qf-2015"] ?? {}, initialQfCourseIds),
    [progress, initialQfCourseIds],
  );
  const statuses = useMemo(() => {
    const storedStatuses = progress[activeProgressPlanId] ?? {};
    return planYear === "2025" && trajectoryId === "pi-60-plus"
      ? { ...storedStatuses, PI: "exonerated" as CourseStatus }
      : storedStatuses;
  }, [progress, activeProgressPlanId, planYear, trajectoryId]);
  const courseIds = useMemo(() => new Set(activeCourses.map((course) => course.id)), [activeCourses]);
  const verifiedCourses = useMemo(() => {
    if (isRegisteredPlan && activeRegisteredPlan) return new Map<string, unknown>(activeRegisteredPlan.courses.map((course) => [course.id, course]));
    if (planYear === "2025") return new Map(plan2025Data.courses.filter((course) => course.dataStatus === "bedelias-composition").map((course) => [course.id, course]));
    if (isProfilePlan && activeProfileData) {
      const merged = new Map<string, unknown>(activeProfileData.courses.map((course) => [course.id, course]));
      for (const course of activeProfileCatalogData?.courses ?? []) merged.set(course.id, course);
      return merged;
    }
    if (planYear === "qf-2015" && qf2015Data) {
      const merged = new Map<string, unknown>(qf2015Data.courses.map((course) => [course.id, course]));
      for (const course of qfCatalogData?.courses ?? []) merged.set(course.id, course);
      return merged;
    }
    const merged = new Map<string, unknown>(plan1997VerifiedCourses);
    for (const course of extendedElectivesData?.courses ?? []) merged.set(course.id, course);
    return merged;
  }, [planYear, isProfilePlan, isRegisteredPlan, activeRegisteredPlan, activeProfileData, activeProfileCatalogData, extendedElectivesData, qfCatalogData, qf2015Data]);
  const verifiedRules = useMemo(() => {
    const rules = isRegisteredPlan
      ? (activeRegisteredPlan?.rules ?? [])
      : planYear === "2025"
      ? plan2025Data.rules
      : isProfilePlan
        ? [...(activeProfileData?.rules ?? []), ...(activeProfileCatalogData?.rules ?? [])]
        : planYear === "qf-2015" ? [...(qf2015Data?.rules ?? []), ...(qfCatalogData?.rules ?? [])] : [...bedeliasData.rules, ...(extendedElectivesData?.rules ?? [])];
    return new Map(rules.filter((rule) => isRequirementExpressionEvaluable(rule.expression)).map((rule) => [`${rule.target.code}:${rule.target.assessment}`, rule]));
  }, [planYear, isProfilePlan, isRegisteredPlan, activeRegisteredPlan, activeProfileData, activeProfileCatalogData, extendedElectivesData, qfCatalogData, qf2015Data]);
  const creditStructure = isRegisteredPlan
    ? (activeRegisteredPlan?.creditStructure ?? plan2025Data.creditStructure)
    : planYear === "2025"
    ? plan2025Data.creditStructure
    : isProfilePlan ? (activeProfileData?.creditStructure ?? plan2025Data.creditStructure) : planYear === "qf-2015" ? (qf2015Data?.creditStructure ?? plan2025Data.creditStructure) : bedeliasData.creditStructure;
  const activePlan2025Trajectory = plan2025Data.trajectories[trajectoryId] ?? plan2025Data.trajectories["pi-60-plus"];
  const activeRegisteredPathway = registeredPathwayEntries.find(([id]) => id === activeRegisteredPathwayId)?.[1];
  const requirementNodes = creditStructure.nodes;
  const nodeById = useMemo(() => new Map(requirementNodes.map((node) => [node.id, node])), [requirementNodes]);
  const pathwayCredentialId = isRegisteredPlan ? activeRegisteredPathway?.credentialId : undefined;
  const credential = creditStructure.credentials.find((item) => item.id === (pathwayCredentialId ?? credentialId)) ?? creditStructure.credentials[0];
  const credentialTargets = useMemo(() => new Map(credential.nodeRequirements.map((item) => [item.nodeId, item])), [credential]);
  const semesters = isRegisteredPlan
    ? (activeRegisteredPathway?.periods ?? []).map((_, index) => index + 1)
    : planYear === "2025"
    ? [
      ...(activePlan2025Trajectory.preSemester?.length ? [0] : []),
      ...activePlan2025Trajectory.semesters.map((_, index) => index + 1),
    ]
    : isProfilePlan || planYear === "qf-2015" ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const planMinCredits = isRegisteredPlan
    ? (activeRegisteredPlan?.plan.minCredits ?? registeredAcademicPlans[planYear]?.minCredits ?? 0)
    : planYear === "2025"
    ? plan2025Data.plan.minCredits
    : isProfilePlan ? (activeProfileData?.plan.minCredits ?? 450) : planYear === "qf-2015" ? (qf2015Data?.plan.minCredits ?? 450) : bedeliasData.plan.minCredits;
  const hasPathwayCredentials = isRegisteredPlan && Object.values(activeRegisteredPlan?.pathways ?? {}).some((pathway) => pathway.credentialId);
  const degreeCredential = hasPathwayCredentials
    ? credential
    : creditStructure.credentials.find((item) => item.id === "engineer" || item.id === "bedelias-degree") ?? creditStructure.credentials.at(-1)!;
  const intermediateCredential = hasPathwayCredentials ? undefined : creditStructure.credentials.find((item) => item.id !== degreeCredential.id);

  const setStatuses = (updater: Record<string, CourseStatus> | ((current: Record<string, CourseStatus>) => Record<string, CourseStatus>)) => {
    setProgress((current) => {
      const currentPlan = current[activeProgressPlanId] ?? {};
      const next = typeof updater === "function" ? updater(currentPlan) : updater;
      return { ...current, [activeProgressPlanId]: next };
    });
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setProgress({ ...createAcademicPlanRecord(() => ({})), ...JSON.parse(saved) });
      else {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) setProgress({ ...createAcademicPlanRecord(() => ({})), 1997: JSON.parse(legacy) });
      }
      const savedPlanner = localStorage.getItem(PLANNER_STORAGE_KEY);
      if (savedPlanner) setPlannerPlans({ ...createAcademicPlanRecord(() => createDefaultTerms()), ...JSON.parse(savedPlanner) });
      const savedCurrentPlannerTerms = localStorage.getItem(CURRENT_TERM_STORAGE_KEY);
      if (savedCurrentPlannerTerms) {
        const parsed = JSON.parse(savedCurrentPlannerTerms) as Partial<CurrentPlannerTerms>;
        setCurrentPlannerTerms(createAcademicPlanRecord((planId) => typeof parsed[planId] === "string" ? parsed[planId] : null));
      }
      const savedVisualPreferences = localStorage.getItem(VISUAL_PREFERENCES_STORAGE_KEY);
      if (savedVisualPreferences) {
        const preferences = JSON.parse(savedVisualPreferences) as Record<string, unknown>;
        if (preferences.theme === "oscuro") {
          setTheme("udelar");
          setThemeScheme("dark");
        } else {
          if (isThemeId(preferences.theme)) setTheme(preferences.theme);
          if (isThemeScheme(preferences.scheme)) setThemeScheme(preferences.scheme);
        }
        if (typeof preferences.colorVisionEnabled === "boolean") setColorVisionEnabled(preferences.colorVisionEnabled);
        if (isColorVisionType(preferences.colorVisionType)) setColorVisionType(preferences.colorVisionType);
        if (isAppMode(preferences.appMode)) setAppMode(preferences.appMode);
        if (isPlannerView(preferences.plannerView)) setPlannerView(preferences.plannerView);
        if (typeof preferences.availableOnly === "boolean") setAvailableOnly(preferences.availableOnly);
        if (typeof preferences.showElectives === "boolean") setShowElectives(preferences.showElectives);
        if (typeof preferences.showRequirements === "boolean") setShowRequirements(preferences.showRequirements);
        if (typeof preferences.showPlannerCatalog === "boolean") setShowPlannerCatalog(preferences.showPlannerCatalog);
      }
      const savedAcademicSelection = localStorage.getItem(ACADEMIC_SELECTION_STORAGE_KEY);
      if (savedAcademicSelection) {
        const selection = JSON.parse(savedAcademicSelection) as Record<string, unknown>;
        const selectedPlan = academicCatalog
          .flatMap((faculty) => faculty.careers)
          .flatMap((career) => career.plans)
          .find((plan) => plan.id === selection.planId);
        if (selectedPlan) {
          const candidate = typeof selection.trajectoryId === "string" ? selection.trajectoryId : selectedPlan.defaultTrajectoryId;
          const isValid = isRegisteredAcademicPlan(selectedPlan.id)
            ? isRegisteredPathway(selectedPlan.id, candidate)
            : selectedPlan.id === "2025"
            ? Object.hasOwn(plan2025Data.trajectories, candidate)
            : selectedPlan.id === "1997" ? candidate === "pi-20-59"
              : selectedPlan.id === "electrica-2023" ? electricProfileIds.has(candidate)
                : selectedPlan.id === "civil-2021" ? civilProfileIds.has(candidate)
                  : candidate === "suggested";
          setPlanYear(selectedPlan.id);
          setTrajectoryId(isValid ? candidate : selectedPlan.defaultTrajectoryId);
          setCampusId(typeof selection.campusId === "string" ? selection.campusId : "");
          setCredentialId(selectedPlan.defaultCredentialId);
        }
      }
      } catch {
        // A damaged local save should never prevent the curriculum from loading.
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress, hydrated]);

  useEffect(() => {
    const closeAppearanceMenu = (event: PointerEvent) => {
      const menu = appearanceMenuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    };
    const closeAppearanceMenuWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape" && appearanceMenuRef.current?.open) {
        appearanceMenuRef.current.open = false;
        appearanceMenuRef.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeAppearanceMenu);
    document.addEventListener("keydown", closeAppearanceMenuWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeAppearanceMenu);
      document.removeEventListener("keydown", closeAppearanceMenuWithKeyboard);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || planYear !== "electrica-2023" || electric2023Data || electricPlanLoadState !== "idle") return;
    void loadElectricPlan();
  }, [hydrated, planYear, electric2023Data, electricPlanLoadState, loadElectricPlan]);

  useEffect(() => {
    if (!hydrated || planYear !== "civil-2021" || civil2021Data || civilPlanLoadState !== "idle") return;
    void loadCivilPlan();
  }, [hydrated, planYear, civil2021Data, civilPlanLoadState, loadCivilPlan]);
  useEffect(() => {
    if (!hydrated || planYear !== "qf-2015" || qf2015Data || qfPlanLoadState !== "idle") return;
    void loadQfPlan();
  }, [hydrated, planYear, qf2015Data, qfPlanLoadState, loadQfPlan]);
  useEffect(() => {
    if (!hydrated || !isRegisteredPlan || activeRegisteredPlan || ["loading", "loaded", "error"].includes(registeredPlanLoadStates[planYear] ?? "idle")) return;
    void loadRegisteredPlan(planYear);
  }, [hydrated, planYear, isRegisteredPlan, activeRegisteredPlan, registeredPlanLoadStates, loadRegisteredPlan]);

  useEffect(() => {
    if (!hydrated || appMode !== "planner") return;
    if (planYear === "1997" && !extendedElectivesData && extendedElectivesLoadState === "idle") void loadExtendedElectives();
    if (planYear === "electrica-2023" && !electricCatalogData && electricCatalogLoadState === "idle") void loadElectricCatalog();
    if (planYear === "civil-2021" && !civilCatalogData && civilCatalogLoadState === "idle") void loadCivilCatalog();
    if (planYear === "qf-2015" && !qfCatalogData && qfCatalogLoadState === "idle") void loadQfCatalog();
  }, [hydrated, appMode, planYear, extendedElectivesData, extendedElectivesLoadState, electricCatalogData, electricCatalogLoadState, civilCatalogData, civilCatalogLoadState, qfCatalogData, qfCatalogLoadState, loadExtendedElectives, loadElectricCatalog, loadCivilCatalog, loadQfCatalog]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(ACADEMIC_SELECTION_STORAGE_KEY, JSON.stringify({ planId: planYear, trajectoryId, campusId }));
  }, [planYear, trajectoryId, campusId, hydrated]);

  useEffect(() => {
    if (planYear !== "1997" || !hydrated || !hasStoredExtendedElectiveProgress || extendedElectivesData || extendedElectivesLoadState !== "idle") return;
    void loadExtendedElectives();
  }, [planYear, hydrated, hasStoredExtendedElectiveProgress, extendedElectivesData, extendedElectivesLoadState, loadExtendedElectives]);

  useEffect(() => {
    if (!isProfilePlan || !hydrated || !hasStoredProfileCatalogProgress || activeProfileCatalogData || activeProfileCatalogLoadState !== "idle") return;
    void (planYear === "electrica-2023" ? loadElectricCatalog() : loadCivilCatalog());
  }, [planYear, isProfilePlan, hydrated, hasStoredProfileCatalogProgress, activeProfileCatalogData, activeProfileCatalogLoadState, loadElectricCatalog, loadCivilCatalog]);

  useEffect(() => {
    if (planYear !== "qf-2015" || !hydrated || !hasStoredQfCatalogProgress || qfCatalogData || qfCatalogLoadState !== "idle") return;
    void loadQfCatalog();
  }, [planYear, hydrated, hasStoredQfCatalogProgress, qfCatalogData, qfCatalogLoadState, loadQfCatalog]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(plannerPlans));
  }, [plannerPlans, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CURRENT_TERM_STORAGE_KEY, JSON.stringify(currentPlannerTerms));
  }, [currentPlannerTerms, hydrated]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.scheme = themeScheme;
    root.dataset.colorVision = colorVisionEnabled ? colorVisionType : "standard";
    root.style.colorScheme = themeScheme;
    if (hydrated) {
      const preferences: VisualPreferences = { theme, scheme: themeScheme, colorVisionEnabled, colorVisionType, appMode, plannerView, availableOnly, showElectives, showRequirements, showPlannerCatalog };
      localStorage.setItem(VISUAL_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    }
  }, [theme, themeScheme, colorVisionEnabled, colorVisionType, appMode, plannerView, availableOnly, showElectives, showRequirements, showPlannerCatalog, hydrated]);

  useEffect(() => {
    verticalScrollTargetRef.current = window.scrollY;
    verticalScrollPositionRef.current = window.scrollY;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const animateToTarget = (timestamp: number) => {
      const previousTimestamp = verticalScrollLastFrameRef.current ?? timestamp - 16.67;
      const elapsedSeconds = Math.min((timestamp - previousTimestamp) / 1000, 0.05);
      verticalScrollLastFrameRef.current = timestamp;
      const distance = verticalScrollTargetRef.current - verticalScrollPositionRef.current;
      if (Math.abs(distance) < 0.2) {
        verticalScrollPositionRef.current = verticalScrollTargetRef.current;
        window.scrollTo(0, verticalScrollTargetRef.current);
        verticalScrollLastFrameRef.current = null;
        verticalScrollFrameRef.current = null;
        return;
      }
      const timeIndependentBlend = 1 - Math.exp(-16 * elapsedSeconds);
      verticalScrollPositionRef.current += distance * timeIndependentBlend;
      window.scrollTo(0, verticalScrollPositionRef.current);
      verticalScrollFrameRef.current = window.requestAnimationFrame(animateToTarget);
    };

    const canScrollInside = (target: EventTarget | null, delta: number) => {
      let element = target instanceof HTMLElement ? target : null;
      while (element && element !== document.body) {
        const overflowY = window.getComputedStyle(element).overflowY;
        const isCurriculumTrack = element.classList.contains("curriculum-scroll");
        const isScrollable = !isCurriculumTrack && /auto|scroll/.test(overflowY) && element.scrollHeight > element.clientHeight + 1;
        if (isScrollable) {
          const canContinue = delta > 0
            ? element.scrollTop < element.scrollHeight - element.clientHeight - 1
            : element.scrollTop > 1;
          if (canContinue) return true;
        }
        element = element.parentElement;
      }
      return false;
    };

    const handleWheel = (event: WheelEvent) => {
      if (document.documentElement.dataset.scrollLocked === "true") return;
      if (reducedMotion.matches || event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (event.deltaY === 0 || canScrollInside(event.target, event.deltaY)) return;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;

      const normalizedDelta = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * 36
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? event.deltaY * window.innerHeight * 0.85
          : event.deltaY;
      const currentTarget = Math.max(0, Math.min(maxScroll, verticalScrollTargetRef.current));
      const atStart = currentTarget <= 0.5 && normalizedDelta < 0;
      const atEnd = currentTarget >= maxScroll - 0.5 && normalizedDelta > 0;
      if (atStart || atEnd) return;

      event.preventDefault();
      verticalScrollTargetRef.current = Math.max(0, Math.min(maxScroll, currentTarget + normalizedDelta * 1.1));
      if (verticalScrollFrameRef.current === null) {
        verticalScrollPositionRef.current = window.scrollY;
        verticalScrollLastFrameRef.current = null;
        verticalScrollFrameRef.current = window.requestAnimationFrame(animateToTarget);
      }
    };

    const syncTarget = () => {
      if (verticalScrollFrameRef.current === null) {
        verticalScrollTargetRef.current = window.scrollY;
        verticalScrollPositionRef.current = window.scrollY;
      }
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", syncTarget, { passive: true });
    return () => {
      document.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", syncTarget);
      if (verticalScrollFrameRef.current !== null) window.cancelAnimationFrame(verticalScrollFrameRef.current);
      verticalScrollLastFrameRef.current = null;
      verticalScrollFrameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selected && !importError && !rolloverTermId) return;
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    if (verticalScrollFrameRef.current !== null) window.cancelAnimationFrame(verticalScrollFrameRef.current);
    verticalScrollFrameRef.current = null;
    verticalScrollLastFrameRef.current = null;
    verticalScrollTargetRef.current = window.scrollY;
    verticalScrollPositionRef.current = window.scrollY;
    root.dataset.scrollLocked = "true";
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    const focusFrame = importError
      ? window.requestAnimationFrame(() => importErrorButtonRef.current?.focus())
      : null;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (rolloverTermId) setRolloverTermId(null);
        else if (importError) setImportError(null);
        else setSelected(null);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      delete root.dataset.scrollLocked;
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      if (focusFrame !== null) window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", closeOnEscape);
      verticalScrollTargetRef.current = window.scrollY;
      verticalScrollPositionRef.current = window.scrollY;
    };
  }, [selected, importError, rolloverTermId]);

  useEffect(() => {
    const scroller = curriculumScrollRef.current;
    if (!scroller) return;
    scroller.scrollLeft = 0;
    const updateEdges = () => {
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const nextEdges = { atStart: scroller.scrollLeft <= 1, atEnd: scroller.scrollLeft >= maxScroll - 1 };
      const currentEdges = curriculumEdgesRef.current;
      if (currentEdges.atStart === nextEdges.atStart && currentEdges.atEnd === nextEdges.atEnd) return;
      curriculumEdgesRef.current = nextEdges;
      setCurriculumEdges(nextEdges);
    };
    updateEdges();
    scroller.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [planYear, trajectoryId]);

  const earnedCredits = useMemo(
    () => activeCourses.reduce((sum, course) => statuses[course.id] === "exonerated" ? sum + course.credits : sum, 0),
    [activeCourses, statuses],
  );
  const earnedHours = useMemo(
    () => activeCourses.reduce((sum, course) => statuses[course.id] === "exonerated" ? sum + (course.hours ?? 0) : sum, 0),
    [activeCourses, statuses],
  );
  const planTotalHours = isRegisteredPlan ? (activeRegisteredPlan?.plan.totalHours ?? null) : null;
  const usesPublishedHours = planMinCredits <= 0 && activeCourses.some((course) => (course.hours ?? 0) > 0);

  const allocationBelongsTo = (allocationNodeId: string, targetNodeId: string) => {
    let current = nodeById.get(allocationNodeId);
    while (current) {
      if (current.id === targetNodeId) return true;
      current = current.parentId ? nodeById.get(current.parentId) : undefined;
    }
    return false;
  };
  const nodeCredits = (nodeId: string) => activeCourses.reduce((total, course) => {
    if (statuses[course.id] !== "exonerated") return total;
    const contribution = (course.creditAllocations ?? [])
      .filter((allocation) => allocationBelongsTo(allocation.nodeId, nodeId))
      .reduce((sum, allocation) => sum + allocation.credits, 0);
    return total + Math.min(course.credits, contribution);
  }, 0);
  const courseAreaLabel = (course: Course) => {
    const allocation = course.creditAllocations?.[0];
    return allocation ? (nodeById.get(allocation.nodeId)?.shortName ?? nodeById.get(allocation.nodeId)?.name ?? course.area ?? "Área sin nombre") : (course.area ?? (course.elective ? "Optativa" : "Área pendiente"));
  };
  const courseAllocationStatus = (course: Course): AllocationStatus | undefined => course.creditAllocations?.[0]?.status;
  const hasCredentialRequirement = (nodeId: string) => credentialTargets.has(nodeId)
    || requirementNodes.some((node) => node.parentId === nodeId && hasCredentialRequirement(node.id));
  const rootRequirementNodes = requirementNodes.filter((node) => node.parentId === null && hasCredentialRequirement(node.id));
  const suggestedAllocationCount = courses.filter((course) => courseAllocationStatus(course) === "suggested").length;
  const activityProgress = (activity: Credential["requiredActivities"][number]) => activity.courseIds.reduce((sum, id) => {
    const course = activeCourses.find((item) => item.id === id);
    return sum + (course && statuses[id] === "exonerated" ? course.credits : 0);
  }, 0);
  const requiredCourseGroupProgress = (group: Credential["requiredCourseGroups"][number]) => group.courseIds.filter((id) => statuses[id] === "exonerated").length;
  const countableNodeRequirements = credential.nodeRequirements.filter((requirement) => requirement.minCredits > 0);
  const alternativeNodeRequirements = credential.alternativeNodeRequirements ?? [];
  const alternativeNodeRequirementProgress = (requirement: NonNullable<Credential["alternativeNodeRequirements"]>[number]) => requirement.options.filter((option) => nodeCredits(option.nodeId) >= option.minCredits).length;
  const hasTotalCreditRequirement = credential.minTotalCredits > 0;
  const credentialRequirementsMet = (hasTotalCreditRequirement && earnedCredits >= credential.minTotalCredits ? 1 : 0)
    + countableNodeRequirements.filter((requirement) => nodeCredits(requirement.nodeId) >= requirement.minCredits).length
    + alternativeNodeRequirements.filter((requirement) => alternativeNodeRequirementProgress(requirement) >= requirement.minSatisfied).length
    + credential.requiredCourseGroups.filter((group) => requiredCourseGroupProgress(group) >= group.minCompleted).length
    + credential.requiredActivities.filter((activity) => activityProgress(activity) >= activity.minCredits).length;
  const credentialRequirementsTotal = (hasTotalCreditRequirement ? 1 : 0) + countableNodeRequirements.length + alternativeNodeRequirements.length + credential.requiredCourseGroups.length + credential.requiredActivities.length;

  const isComplete = (id: string) => statuses[id] === "approved" || statuses[id] === "exonerated";
  const isFixedPlacementTest = (course: Course) => planYear === "2025" && trajectoryId === "pi-60-plus" && course.id === "PI";
  const isRequirementComplete = (id: string) => id === "MI2"
    ? isComplete("MI2") || statuses.PI === "exonerated"
    : isComplete(id);
  const officialRule = (course: Course, assessment: "course" | "exam") => verifiedRules.get(`${course.bedeliasCode ?? (course.id === "1730-A" ? "1730" : course.id)}:${assessment}`);
  const groupCredits = (groupCode: string) => {
    const registeredCourseGroup = isRegisteredPlan ? activeRegisteredPlan?.requirementCourseGroups?.[groupCode] : undefined;
    if (registeredCourseGroup) {
      return registeredCourseGroup.reduce((sum, courseId) => {
        const course = activeCourses.find((item) => item.id === courseId);
        return sum + (course && statuses[courseId] === "exonerated" ? course.credits : 0);
      }, 0);
    }
    const nodeId = planYear === "1997"
      ? bedeliasData.requirementGroupMap[groupCode]
      : isRegisteredPlan ? activeRegisteredPlan?.requirementGroupMap[groupCode] : isProfilePlan ? activeProfileData?.requirementGroupMap[groupCode] : planYear === "qf-2015" ? qf2015Data?.requirementGroupMap[groupCode] : undefined;
    return nodeId ? nodeCredits(nodeId) : 0;
  };
  const groupApprovals = (groupCode: string) => {
    const registeredCourseGroup = isRegisteredPlan ? activeRegisteredPlan?.requirementCourseGroups?.[groupCode] : undefined;
    return (registeredCourseGroup ?? []).filter((courseId) => statuses[courseId] === "exonerated").length;
  };
  const hasVerifiedCourseRule = (course: Course) => Boolean(officialRule(course, "course"));
  const isCourseAvailabilityKnown = (course: Course) => course.curricularBlock || course.placementTest || hasVerifiedCourseRule(course) || Boolean(course.prerequisites?.length || course.minCredits);
  const isCourseUnlocked = (course: Course) => {
    if (course.placeholder) return false;
    if (course.placementTest) return true;
    const modeledPrerequisitesMet = (course.prerequisites ?? []).every(isRequirementComplete);
    const rule = officialRule(course, "course");
    if (rule) return modeledPrerequisitesMet && expressionSatisfied(rule.expression, statuses, earnedCredits, groupCredits, groupApprovals);
    return modeledPrerequisitesMet && (!course.minCredits || earnedCredits >= course.minCredits);
  };
  const isExamUnlocked = (course: Course) => {
    const rule = officialRule(course, "exam");
    return rule ? expressionSatisfied(rule.expression, statuses, earnedCredits, groupCredits, groupApprovals) : true;
  };
  const isUnlocked = (course: Course) => {
    const status = statuses[course.id] ?? "pending";
    return status === "pending" ? isCourseUnlocked(course) : status === "approved" ? isExamUnlocked(course) : true;
  };

  const cycleStatus = (course: Course) => {
    if (course.placeholder || !isUnlocked(course) || isFixedPlacementTest(course)) return;
    setStatuses((current) => {
      const now = current[course.id] ?? "pending";
      if (course.placementTest) {
        const next: CourseStatus = now === "exonerated" ? "pending" : "exonerated";
        const updated = { ...current, [course.id]: next };
        if (next === "exonerated") updated.MI2 = "pending";
        return updated;
      }
      const next: CourseStatus = now === "pending" ? "approved" : now === "approved" ? "exonerated" : "pending";
      const updated = { ...current, [course.id]: next };
      if (course.id === "MI2" && next !== "pending") updated.PI = "pending";
      return updated;
    });
  };

  const filtered = (semester: Course["semester"]) => {
    const matches = courses.filter((course) => {
      const matchesSemester = course.semester === semester;
      const matchesSearch = matchesCourseSearch(course, courseAreaLabel(course), search);
      const isReplacedByPlacementTest = course.id === "MI2" && statuses.PI === "exonerated";
      const isSearchOnlyPlan1997Elective = extendedPlan1997CourseIds.has(course.id) && !fullElectivesCatalogExpanded && !search.trim() && !hasRecordedCourseProgress(statuses[course.id]);
    const isSearchOnlyElectricElective = profileCatalogCourseIds.has(course.id) && !fullElectivesCatalogExpanded && !search.trim() && !hasRecordedCourseProgress(statuses[course.id]);
    const isSearchOnlyQfElective = qfCatalogCourseIds.has(course.id) && !fullElectivesCatalogExpanded && !search.trim() && !hasRecordedCourseProgress(statuses[course.id]);
    const isSearchOnlyElective = isSearchOnlyPlan1997Elective || isSearchOnlyElectricElective || isSearchOnlyQfElective;
      return matchesSemester && matchesSearch && !isSearchOnlyElective && !isReplacedByPlacementTest && (!availableOnly || (isCourseAvailabilityKnown(course) && isUnlocked(course)));
    });
    return semester === "opt" ? sortCoursesByProgress(matches, statuses) : matches;
  };
  const visibleElectives = filtered("opt");

  const exportProgress = () => {
    const career = activeCareer.id;
    const blob = new Blob([JSON.stringify({ formatVersion: 1, career, plan: planYear, trajectory: trajectoryId, statuses }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mi-trayecto-udelar.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importProgress = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { formatVersion?: unknown; career?: unknown; plan?: unknown; statuses?: unknown };
        if (!parsed || typeof parsed !== "object" || !parsed.statuses || typeof parsed.statuses !== "object" || Array.isArray(parsed.statuses)) {
          setImportError({ title: "Archivo incompatible", message: "El archivo es JSON, pero no contiene un progreso de Trayecto reconocible." });
          return;
        }
        if (parsed.formatVersion !== undefined && parsed.formatVersion !== 1) {
          setImportError({ title: "Versión no compatible", message: "Este archivo fue creado con una versión de Trayecto que todavía no podemos importar." });
          return;
        }
        if (parsed.plan !== undefined && parsed.plan !== planYear) {
          setImportError({ title: "Corresponde a otro plan", message: `Este progreso pertenece al Plan ${String(parsed.plan)}. Seleccioná ese plan antes de importarlo.` });
          return;
        }
        const entries = Object.entries(parsed.statuses as Record<string, unknown>);
        const validStatuses = new Set<CourseStatus>(["pending", "approved", "exonerated"]);
        const validCourseIds = new Set(courses.map((course) => course.id));
        if (planYear === "1997" && entries.some(([id]) => !validCourseIds.has(id))) {
          const extended = await loadExtendedElectives();
          if (!extended) {
            setImportError({ title: "No pudimos cargar el catálogo", message: "El progreso incluye optativas del catálogo ampliado, pero no pudimos abrir esos datos. Probá nuevamente." });
            return;
          }
          for (const course of extended.courses) validCourseIds.add(course.id);
        }
        if (planYear === "qf-2015" && entries.some(([id]) => !validCourseIds.has(id))) {
          const extended = await loadQfCatalog();
          if (!extended) {
            setImportError({ title: "No pudimos cargar el catálogo", message: "El progreso incluye optativas del catálogo ampliado, pero no pudimos abrir esos datos. Probá nuevamente." });
            return;
          }
          for (const course of extended.courses) validCourseIds.add(course.id);
        }
        if (entries.some(([id, status]) => !validCourseIds.has(id) || typeof status !== "string" || !validStatuses.has(status as CourseStatus))) {
          setImportError({ title: "Progreso inválido", message: "El archivo contiene materias o estados que no tienen un formato válido." });
          return;
        }
        setStatuses(Object.fromEntries(entries) as Record<string, CourseStatus>);
      } catch {
        setImportError({ title: "JSON incorrecto", message: "No pudimos interpretar el archivo. Puede estar incompleto, dañado o no ser un archivo JSON válido." });
      }
    };
    reader.onerror = () => setImportError({ title: "No pudimos abrir el archivo", message: "El navegador no pudo leerlo. Probá seleccionándolo nuevamente o exportándolo otra vez." });
    reader.readAsText(file);
    event.target.value = "";
  };

  const resetProgress = () => {
    if (window.confirm(`¿Querés borrar el progreso guardado para el Plan ${planYear}?`)) setStatuses({});
  };

  const moveCurriculum = (direction: -1 | 1) => {
    const scroller = curriculumScrollRef.current;
    const column = scroller?.querySelector<HTMLElement>(".semester-column");
    if (!scroller || !column) return;
    const grid = scroller.querySelector<HTMLElement>(".semester-grid");
    const gap = grid ? Number.parseFloat(window.getComputedStyle(grid).columnGap) || 0 : 0;
    scroller.scrollBy({ left: direction * (column.getBoundingClientRect().width + gap), behavior: "smooth" });
  };

  const updatePlannerTerms = (updater: (terms: PlannerTerm[]) => PlannerTerm[]) => {
    setPlannerPlans((current) => ({ ...current, [planYear]: updater(current[planYear] ?? createDefaultTerms()) }));
  };
  const addPlannerTerm = () => updatePlannerTerms((terms) => [
    ...terms,
    { id: `term-${Date.now()}`, label: `Semestre ${terms.length + 1}`, courseIds: [] },
  ]);
  const renamePlannerTerm = (termId: string, label: string) => updatePlannerTerms((terms) => terms.map((term) => term.id === termId ? { ...term, label } : term));
  const removePlannerTerm = (termId: string) => {
    updatePlannerTerms((terms) => terms.length === 1 ? terms : terms.filter((term) => term.id !== termId));
    if (currentPlannerTermId === termId) setCurrentPlannerTerms((current) => ({ ...current, [planYear]: null }));
  };
  const assignPlannerCourse = (courseId: string, termId: string) => updatePlannerTerms((terms) => terms.map((term) => ({
    ...term,
    courseIds: term.id === termId
      ? [...term.courseIds.filter((id) => id !== courseId), courseId]
      : term.courseIds.filter((id) => id !== courseId),
  })));
  const unassignPlannerCourse = (courseId: string) => updatePlannerTerms((terms) => terms.map((term) => ({ ...term, courseIds: term.courseIds.filter((id) => id !== courseId) })));
  const setCurrentPlannerTerm = (termId: string) => setCurrentPlannerTerms((current) => ({ ...current, [planYear]: termId }));
  const finishPlannerTerm = (moveIncomplete: boolean) => {
    const termId = rolloverTermId ?? currentPlannerTermId;
    const currentIndex = plannerTerms.findIndex((term) => term.id === termId);
    if (currentIndex < 0) return;
    const sourceTerm = plannerTerms[currentIndex];
    const unfinishedIds = new Set(sourceTerm.courseIds.filter((id) => (statuses[id] ?? "pending") !== "exonerated"));
    const existingNext = plannerTerms[currentIndex + 1];
    const nextTerm: PlannerTerm = existingNext ?? { id: "term-" + Date.now(), label: "Semestre " + (plannerTerms.length + 1), courseIds: [] };
    updatePlannerTerms((terms) => {
      const extended = existingNext ? terms : [...terms, nextTerm];
      if (!moveIncomplete || unfinishedIds.size === 0) return extended;
      return extended.map((term) => {
        if (term.id === sourceTerm.id) return { ...term, courseIds: term.courseIds.filter((id) => !unfinishedIds.has(id)) };
        if (term.id === nextTerm.id) return { ...term, courseIds: [...term.courseIds.filter((id) => !unfinishedIds.has(id)), ...unfinishedIds] };
        return term;
      });
    });
    setCurrentPlannerTerms((current) => ({ ...current, [planYear]: nextTerm.id }));
    setRolloverTermId(null);
  };
  const assignedPlannerIds = new Set(plannerTerms.flatMap((term) => term.courseIds));
  const plannedCredits = plannerCourses.reduce((sum, course) => assignedPlannerIds.has(course.id) ? sum + course.credits : sum, 0);
  const plannedHours = plannerCourses.reduce((sum, course) => assignedPlannerIds.has(course.id) ? sum + (course.hours ?? 0) : sum, 0);
  const creditProgressPercent = planMinCredits > 0
    ? Math.min((appMode === "planner" ? plannedCredits : earnedCredits) / planMinCredits * 100, 100)
    : usesPublishedHours && planTotalHours
      ? Math.min((appMode === "planner" ? plannedHours : earnedHours) / planTotalHours * 100, 100)
      : 0;
  const availablePlannerCourses = plannerCourses.filter((course) => {
    const query = plannerSearch.trim();
    const isSearchOnlyPlan1997Elective = appMode !== "planner" && extendedPlan1997CourseIds.has(course.id) && !fullElectivesCatalogExpanded && !query && !hasRecordedCourseProgress(statuses[course.id]);
    const isSearchOnlyElectricElective = appMode !== "planner" && profileCatalogCourseIds.has(course.id) && !fullElectivesCatalogExpanded && !query && !hasRecordedCourseProgress(statuses[course.id]);
    const isSearchOnlyQfElective = appMode !== "planner" && qfCatalogCourseIds.has(course.id) && !fullElectivesCatalogExpanded && !query && !hasRecordedCourseProgress(statuses[course.id]);
    const isSearchOnlyElective = isSearchOnlyPlan1997Elective || isSearchOnlyElectricElective || isSearchOnlyQfElective;
    return !isSearchOnlyElective && !assignedPlannerIds.has(course.id) && matchesCourseSearch(course, courseAreaLabel(course), plannerSearch);
  });

  const rolloverTerm = plannerTerms.find((term) => term.id === rolloverTermId);
  const rolloverCourses = rolloverTerm?.courseIds.map((id) => plannerCourses.find((course) => course.id === id)).filter(Boolean) as Course[] | undefined;
  const rolloverIncompleteCourses = rolloverCourses?.filter((course) => (statuses[course.id] ?? "pending") !== "exonerated") ?? [];
  const rolloverIncompleteCredits = rolloverIncompleteCourses.reduce((sum, course) => sum + course.credits, 0);
  const rolloverIncompleteHours = rolloverIncompleteCourses.reduce((sum, course) => sum + (course.hours ?? 0), 0);

  const selectedStatus = selected ? statuses[selected.id] ?? "pending" : "pending";
  const selectedAssessment: "course" | "exam" = selectedStatus === "approved" ? "exam" : "course";
  const selectedRule = selected ? officialRule(selected, selectedAssessment) : undefined;
  const selectedAllocation = selected?.creditAllocations?.[0];
  const selectedRows = selectedRule ? requirementRows(selectedRule.expression, statuses, earnedCredits, activeCourses, courseIds, groupCredits, groupApprovals) : [];
  const selectedDependents = selected ? activeCourses.filter((course) => {
    if (course.id === selected.id) return false;
    if (course.prerequisites?.includes(selected.id)) return true;
    const courseRule = officialRule(course, "course");
    return Boolean(courseRule && expressionReferencesCode(courseRule.expression, selected.id));
  }) : [];
  const sourceLabel = (course: Course): "Bedelías" | "FING" | "FQ" | "FADU" | "Udelar" | undefined => {
    if (planYear === "1997") return course.id === "PI" ? "FING" : verifiedCourses.has(course.id.startsWith("1730-") ? "1730" : course.id) ? "Bedelías" : undefined;
    return course.dataStatus === "bedelias-composition" ? "Bedelías" : course.dataStatus === "fing-trajectory" ? "FING" : course.dataStatus === "fq-damero" ? "FQ" : course.dataStatus === "fadu-official" ? "FADU" : course.dataStatus === "official-curriculum" ? "Udelar" : undefined;
  };
  const deferredCatalogLoadState = isProfilePlan ? activeProfileCatalogLoadState : planYear === "qf-2015" ? qfCatalogLoadState : extendedElectivesLoadState;
  const deferredCatalogCount = isProfilePlan ? (activeProfileCatalogData?.courses.length ?? 0) : planYear === "qf-2015" ? (qfCatalogData?.courses.length ?? 0) : extendedPlan1997Courses.length;
  const electivesSummary = visibleElectives.length > 0
    ? `${visibleElectives.length} materias verificadas en la composición`
    : (isProfilePlan && !fullElectivesCatalogExpanded) || (planYear === "qf-2015" && !fullElectivesCatalogExpanded)
      ? "Catálogo oficial disponible"
      : "Sin materias visibles";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <svg viewBox="0 0 53 60" className="udelar-logo" role="img" aria-labelledby="udelar-logo-title">
            <title id="udelar-logo-title">Universidad de la República</title>
            <use href="/udelar.svg#udelar-mark" />
          </svg>
          <span className="brand-separator" aria-hidden="true" />
          <div>
            <p className="eyebrow">Proyecto estudiantil no oficial</p>
            <h1>Trayecto Udelar</h1>
          </div>
        </div>
        <nav className="mode-switch" aria-label="Modo de trabajo">
          <button className={appMode === "curriculum" ? "active" : ""} onClick={() => setAppMode("curriculum")}><span>Mapa</span> Currícula</button>
          <button className={appMode === "planner" ? "active" : ""} onClick={() => setAppMode("planner")}><span>Propio</span> Planificador</button>
        </nav>
        <div className="header-actions">
          <button className="quiet-button" onClick={() => importRef.current?.click()}>Importar</button>
          <button className="quiet-button" onClick={exportProgress}>Exportar</button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={importProgress} />
          <details ref={appearanceMenuRef} className="appearance-menu">
            <summary aria-label={`Tema ${activeThemeOption.label}, modo ${themeScheme === "dark" ? "oscuro" : "claro"}. Abrir apariencia`}>
              <span
                className="theme-orb appearance-orb"
                style={{
                  "--swatch-a": activeThemeOption.colors[0],
                  "--swatch-b": activeThemeOption.colors[1],
                  "--swatch-c": activeThemeOption.colors[2],
                  "--swatch-dark": activeThemeOption.colors[3],
                } as React.CSSProperties}
                aria-hidden="true"
              />
              <span className="appearance-trigger-copy">
                <strong>Tema</strong>
                <small>{activeThemeOption.label} · {themeScheme === "dark" ? "Oscuro" : "Claro"}</small>
              </span>
            </summary>
            <div className="appearance-panel">
              <div className="appearance-heading">
                <div>
                  <p className="eyebrow">Apariencia</p>
                  <h2>Tema y contraste</h2>
                </div>
                <span>Se guarda en este dispositivo</span>
              </div>
              <div className="scheme-section">
                <div>
                  <strong>Modo de pantalla</strong>
                  <span>Cada familia tiene versión clara y oscura</span>
                </div>
                <label className="scheme-toggle">
                  <span>Claro</span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label="Usar modo oscuro"
                    checked={themeScheme === "dark"}
                    onChange={(event) => setThemeScheme(event.target.checked ? "dark" : "light")}
                  />
                  <span className="scheme-track" aria-hidden="true" />
                  <span>Oscuro</span>
                </label>
              </div>
              <div className="theme-grid" role="group" aria-label="Familia de color">
                {themeOptions.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    className={theme === option.id ? "active" : ""}
                    aria-pressed={theme === option.id}
                    onClick={() => setTheme(option.id)}
                  >
                    <span
                      className="theme-orb"
                      style={{
                        "--swatch-a": option.colors[0],
                        "--swatch-b": option.colors[1],
                        "--swatch-c": option.colors[2],
                        "--swatch-dark": option.colors[3],
                      } as React.CSSProperties}
                      aria-hidden="true"
                    />
                    <small>{option.label}</small>
                  </button>
                ))}
              </div>
              <div className="color-vision-section">
                <div className="color-vision-heading">
                  <div>
                    <strong>Modo daltónico</strong>
                    <span>Señales más distinguibles</span>
                  </div>
                  <label className="toggle-control color-vision-toggle">
                    <input
                      type="checkbox"
                      checked={colorVisionEnabled}
                      onChange={(event) => setColorVisionEnabled(event.target.checked)}
                    />
                    <span aria-hidden="true" />
                    <b>{colorVisionEnabled ? "Activado" : "Desactivado"}</b>
                  </label>
                </div>
                {colorVisionEnabled && (
                  <label className="color-vision-select">
                    <span>Tipo de visión de color</span>
                    <select value={colorVisionType} onChange={(event) => setColorVisionType(event.target.value as ColorVisionType)}>
                      {colorVisionOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
                    </select>
                  </label>
                )}
              </div>
            </div>
          </details>
          <button className="avatar" aria-label="Progreso guardado en este dispositivo">LOCAL</button>
        </div>
      </header>

      <section className="hero-row">
        <div className="career-heading">
          <div className="selector-row">
            <label className="faculty-selector">
              <span>Facultad</span>
              <select value={activeFaculty.id} onChange={(event) => {
                const nextFaculty = academicCatalog.find((faculty) => faculty.id === event.target.value);
                const nextPlan = nextFaculty?.careers[0]?.plans[0];
                if (nextPlan) void selectAcademicPlan(nextPlan);
              }}>
                {academicCatalog.map((faculty) => <option value={faculty.id} key={faculty.id}>{faculty.label}</option>)}
              </select>
            </label>
            <label className="career-selector">
              <span>Carrera</span>
              <select value={activeCareer.id} onChange={(event) => {
                const nextCareer = activeFaculty.careers.find((career) => career.id === event.target.value);
                const nextPlan = nextCareer?.plans[0];
                if (nextPlan) void selectAcademicPlan(nextPlan);
              }}>
                {activeFaculty.careers.map((career) => (
                  <option value={career.id} key={career.id}>
                    {(career.id === "electrica" && electricPlanLoadState === "loading") || (career.id === "civil" && civilPlanLoadState === "loading") || registeredPlanLoadStates[career.plans[0]?.id] === "loading" ? `${career.label} · cargando…` : career.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Plan</span>
              <select value={planYear} onChange={(event) => {
                const nextPlan = activeCareer.plans.find((plan) => plan.id === event.target.value);
                if (nextPlan) void selectAcademicPlan(nextPlan);
              }}>
                {activeCareer.plans.map((plan) => <option value={plan.id} key={plan.id}>{plan.label}</option>)}
              </select>
            </label>
            {isRegisteredPlan && registeredCampuses.length > 1 && <label className="campus-selector">
              <span>Sede</span>
              <select value={activeCampus?.id ?? ""} onChange={(event) => {
                const nextCampus = registeredCampuses.find((campus) => campus.id === event.target.value);
                if (!nextCampus) return;
                const nextPathwayId = resolveCampusPathway(activeRegisteredPlan?.pathways ?? {}, nextCampus, "");
                setCampusId(nextCampus.id);
                setTrajectoryId(nextPathwayId);
                const nextCredentialId = activeRegisteredPlan?.pathways[nextPathwayId]?.credentialId;
                if (nextCredentialId) setCredentialId(nextCredentialId);
                setSelected(null);
              }}>
                {registeredCampuses.map((campus) => <option value={campus.id} key={campus.id}>{campus.label}</option>)}
              </select>
            </label>}
            {appMode === "curriculum" && (!isRegisteredPlan || registeredPathwayEntries.length > 1 || activeRegisteredPlan?.plan.auditStatus === "audited") && <label>
              <span>{isRegisteredPlan ? registeredAcademicPlans[planYear]?.pathwayLabel : isProfilePlan ? "Perfil" : "Trayectoria"}</span>
              <select value={trajectoryId} onChange={(event) => {
                const next = event.target.value;
                setTrajectoryId(next);
                const nextCredentialId = isRegisteredPlan ? activeRegisteredPlan?.pathways[next]?.credentialId : undefined;
                if (nextCredentialId) setCredentialId(nextCredentialId);
                if (planYear === "2025" && next !== "pi-60-plus") {
                  setStatuses((current) => ({ ...current, PI: "pending" }));
                }
                setSelected(null);
              }}>
                {isRegisteredPlan ? registeredPathwayEntries.map(([id, pathway]) => (
                  <option value={id} key={id}>{pathway.label}</option>
                )) : planYear === "2025" ? Object.entries(plan2025Data.trajectories).map(([id, trajectory]) => (
                  <option value={id} key={id}>{trajectory.label}</option>
                )) : planYear === "electrica-2023" ? Object.entries(electric2023Data?.profiles ?? {}).map(([id, profile]) => (
                  <option value={id} key={id}>{profile.label}</option>
                )) : planYear === "civil-2021" ? Object.entries(civil2021Data?.profiles ?? {}).map(([id, profile]) => (
                  <option value={id} key={id}>{profile.label}</option>
                )) : planYear === "qf-2015" ? Object.entries(qf2015Data?.trajectories ?? {}).map(([id, trajectory]) => (
                  <option value={id} key={id}>{trajectory.label}</option>
                )) : <option value="pi-20-59">Ingreso 1er semestre · PI 20–59%</option>}
              </select>
            </label>}
          </div>
          {appMode === "planner" ? (
            <p className="pilot-note planner-note"><span className="pilot-note-mark" aria-hidden="true">i</span><span className="pilot-note-copy">Armá una currícula propia con las mismas materias, {usesPublishedHours ? "horas" : "créditos"} y áreas del plan. Los cambios quedan guardados en este dispositivo.{isRegisteredPlan && !hasClosedOfficialEvidence ? " Esta composición de Bedelías tiene auditoría oficial pendiente." : ""}</span></p>
          ) : isRegisteredPlan ? (
            <p className={`pilot-note ${activeRegisteredPlan?.plan.auditStatus === "audited" ? "" : "pending-audit-note"}`}><span className="pilot-note-mark" aria-hidden="true">{activeRegisteredPlan?.plan.auditStatus === "audited" ? "✓" : "i"}</span><span className="pilot-note-copy">{activeCampus ? `Sede: ${activeCampus.label}. ` : ""}{activeRegisteredPathway?.description} {activeRegisteredPlan?.plan.notice}</span></p>
          ) : planYear === "2025" ? (
            <p className="pilot-note"><span className="pilot-note-mark" aria-hidden="true">i</span><span className="pilot-note-copy">{activePlan2025Trajectory.description} Bedelías confirma el plan vigente, pero su composición y sus previaturas todavía están incompletas.</span></p>
          ) : isProfilePlan ? (
            <p className="pilot-note"><span className="pilot-note-mark" aria-hidden="true">i</span><span className="pilot-note-copy">{activeProfileData?.profiles[trajectoryId]?.description} Trayectoria sugerida por la Comisión de Carrera; créditos, áreas y previaturas contrastados con Bedelías.</span></p>
          ) : planYear === "qf-2015" ? (
            <p className="pilot-note"><span className="pilot-note-mark" aria-hidden="true">i</span><span className="pilot-note-copy">{qf2015Data?.trajectories[trajectoryId]?.description} Los 71 créditos optativos y electivos se eligen del catálogo vigente y no tienen un semestre único.</span></p>
          ) : (
            <p className="pilot-note"><span className="pilot-note-mark" aria-hidden="true">i</span><span className="pilot-note-copy">Semestres de la trayectoria sugerida compartida. Créditos, áreas y reglas centrales importados de Bedelías; núcleo obligatorio contrastado con la implementación curricular de FING.</span></p>
          )}
        </div>

        <div className="credit-summary">
          <div className="credit-ring" style={{ "--progress": `${creditProgressPercent}%` } as React.CSSProperties}>
            <div><strong>{usesPublishedHours ? (appMode === "planner" ? plannedHours : earnedHours) : (appMode === "planner" ? plannedCredits : earnedCredits)}</strong><span>{usesPublishedHours && planTotalHours ? `de ${planTotalHours} h` : planMinCredits > 0 ? `de ${planMinCredits}` : "mínimo pendiente"}</span></div>
          </div>
          <div>
            <p>{usesPublishedHours ? (appMode === "planner" ? "Horas planificadas" : "Horas completadas") : appMode === "planner" ? "Créditos planificados" : "Créditos obtenidos"}</p>
            <strong>{usesPublishedHours && planTotalHours ? `${Math.round((appMode === "planner" ? plannedHours : earnedHours) / planTotalHours * 100)}% de la carga publicada` : appMode === "planner" ? `${plannedCredits} cr. distribuidos` : planMinCredits > 0 ? `${Math.round(earnedCredits / planMinCredits * 100)}% de la carrera` : "Mínimo no publicado"}</strong>
          </div>
        </div>
      </section>

      <section className="workspace">
        <aside className="progress-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Tu avance</p>
              <h2>Requisitos</h2>
            </div>
            <button className="icon-button" aria-label="Reiniciar progreso" onClick={resetProgress}>↺</button>
          </div>

          {intermediateCredential && <div className={`degree-card analyst ${credentialId === intermediateCredential.id ? "selected-degree" : ""}`}>
            <div>
              <span>Título intermedio</span>
              <h3>{intermediateCredential.title}</h3>
            </div>
            <strong>{Math.min(earnedCredits, intermediateCredential.minTotalCredits)}<small>/{intermediateCredential.minTotalCredits}</small></strong>
            <div className="linear-progress"><i style={{ width: `${Math.min(earnedCredits / intermediateCredential.minTotalCredits * 100, 100)}%` }} /></div>
          </div>}

          <div className={`degree-card engineer ${credentialId === degreeCredential.id ? "selected-degree" : ""}`}>
            <div>
              <span>Título de grado</span>
              <h3>{degreeCredential.title}</h3>
            </div>
            <strong>{usesPublishedHours ? earnedHours : earnedCredits}<small>/{usesPublishedHours && planTotalHours ? `${planTotalHours} h` : planMinCredits > 0 ? planMinCredits : "—"}</small></strong>
            <div className="linear-progress"><i style={{ width: `${usesPublishedHours && planTotalHours ? Math.min(earnedHours / planTotalHours * 100, 100) : planMinCredits > 0 ? Math.min(earnedCredits / planMinCredits * 100, 100) : 0}%` }} /></div>
          </div>

          <button type="button" className="requirement-heading" onClick={() => setShowRequirements((value) => !value)} aria-expanded={showRequirements}>
            <div>
              <h3>{usesPublishedHours ? "Requisitos de egreso" : "Metas de créditos"}</h3>
              <span>{usesPublishedHours ? "Por unidades obligatorias" : "Por título y área"}</span>
            </div>
            <b className="panel-toggle-symbol" aria-hidden="true">{showRequirements ? "−" : "+"}</b>
          </button>
          {showRequirements && <>
          {intermediateCredential && <div className="credential-switch" role="group" aria-label="Título para las metas detalladas">
            <button className={credentialId === intermediateCredential.id ? "active" : ""} onClick={() => setCredentialId(intermediateCredential.id)}>Título intermedio</button>
            <button className={credentialId === degreeCredential.id ? "active" : ""} onClick={() => setCredentialId(degreeCredential.id)}>Título de grado</button>
          </div>}
          <div className="requirements-overview">
            <span>{credential.title}</span>
            <strong>{credentialRequirementsMet}/{credentialRequirementsTotal} requisitos</strong>
            {suggestedAllocationCount > 0 && <small>{suggestedAllocationCount} áreas sugeridas en esta trayectoria</small>}
          </div>
          <div className="requirements-tree">
            {hasTotalCreditRequirement && <div className="required-activity"><span><b>Total de créditos</b><small>Requisito general del título</small></span><strong className={earnedCredits >= credential.minTotalCredits ? "met" : ""}>{earnedCredits}/{credential.minTotalCredits}</strong></div>}
            {usesPublishedHours && planTotalHours && <div className="required-activity"><span><b>Carga horaria publicada</b><small>El programa no expresa equivalencia en créditos</small></span><strong className={earnedHours >= planTotalHours ? "met" : ""}>{earnedHours}/{planTotalHours} h</strong></div>}
            {rootRequirementNodes.map((root) => {
              const rootTarget = credentialTargets.get(root.id)?.minCredits;
              const current = nodeCredits(root.id);
              const children = requirementNodes.filter((node) => node.parentId === root.id && credentialTargets.has(node.id));
              const childMinimum = children.reduce((sum, child) => sum + (credentialTargets.get(child.id)?.minCredits ?? 0), 0);
              const flexibleMinimum = rootTarget === undefined ? 0 : Math.max(0, rootTarget - childMinimum);
              return (
                <details className="requirement-group" key={root.id} open>
                  <summary>
                    <span><b>{root.shortName ?? root.name}</b><small>{rootTarget === undefined ? "Agrupa las áreas exigidas" : rootTarget === 0 ? "Sin mínimo propio" : `${current} de ${rootTarget} cr.`}</small></span>
                    {rootTarget !== undefined && rootTarget > 0 && <strong className={current >= rootTarget ? "met" : ""}>{current}/{rootTarget}</strong>}
                  </summary>
                  {rootTarget !== undefined && rootTarget > 0 && <div className="area-track group-track"><i style={{ width: `${Math.min(current / rootTarget * 100, 100)}%` }} /></div>}
                  <div className="requirement-children">
                    {children.map((node) => {
                      const target = credentialTargets.get(node.id)!.minCredits;
                      const nodeCurrent = nodeCredits(node.id);
                      return (
                        <div className="requirement-leaf" key={node.id}>
                          <div><span>{node.name}</span>{target === 0 ? <strong>Sin mínimo propio</strong> : <strong className={nodeCurrent >= target ? "met" : ""}>{nodeCurrent}/{target}</strong>}</div>
                          {target > 0 && <div className="area-track"><i style={{ width: `${Math.min(nodeCurrent / target * 100, 100)}%` }} /></div>}
                        </div>
                      );
                    })}
                    {flexibleMinimum > 0 && <p className="flexible-credits">{childMinimum > 0 ? `Además de los mínimos por área, faltan ${flexibleMinimum} cr. flexibles dentro del grupo.` : `El título exige ${flexibleMinimum} cr. flexibles dentro de este grupo.`}</p>}
                  </div>
                </details>
              );
            })}
            {credential.requiredActivities.map((activity) => {
              const current = activityProgress(activity);
              return <div className="required-activity" key={activity.id}><span><b>{activity.label}</b><small>{activity.representationStatus === "not-modeled" ? "Aún sin ubicación completa en la trayectoria" : "Actividad obligatoria"}</small></span><strong className={current >= activity.minCredits ? "met" : ""}>{current}/{activity.minCredits}</strong></div>;
            })}
            {alternativeNodeRequirements.map((requirement) => {
              const satisfied = alternativeNodeRequirementProgress(requirement);
              return <details className="required-course-group" key={requirement.id}>
                <summary><span><b>{requirement.label}</b><small>{satisfied} de {requirement.minSatisfied} alternativas cumplen el mínimo</small></span><strong className={satisfied >= requirement.minSatisfied ? "met" : ""}>{satisfied}/{requirement.minSatisfied}</strong></summary>
                <div className="required-course-body">
                  <ul>{requirement.options.map((option) => {
                    const current = nodeCredits(option.nodeId);
                    const node = nodeById.get(option.nodeId);
                    return <li key={option.nodeId}>{node?.name ?? option.nodeId}: <b className={current >= option.minCredits ? "met" : ""}>{current}/{option.minCredits} cr.</b></li>;
                  })}</ul>
                  <a href={requirement.sourceUrl} target="_blank" rel="noreferrer">Ver fuente oficial ↗</a>
                </div>
              </details>;
            })}
            {credential.requiredCourseGroups.map((group) => {
              const current = requiredCourseGroupProgress(group);
              const missing = group.courseIds
                .filter((id) => statuses[id] !== "exonerated")
                .map((id) => ({ id, name: activeCourses.find((course) => course.id === id)?.name ?? id }));
              return <details className="required-course-group" key={group.id}>
                <summary><span><b>{group.label}</b><small>{current} de {group.minCompleted} completadas</small></span><strong className={current >= group.minCompleted ? "met" : ""}>{current}/{group.minCompleted}</strong></summary>
                <div className="required-course-body">
                  {missing.length ? <><p>Te faltan:</p><ul>{missing.map(({ id, name }) => <li key={id}>{name}</li>)}</ul></> : <p className="all-complete">✓ Requisito completo</p>}
                  <a href={group.sourceUrl} target="_blank" rel="noreferrer">Ver fuente oficial ↗</a>
                </div>
              </details>;
            })}
          </div>
          <p className="data-source">{isRegisteredPlan ? activeRegisteredPlan?.plan.auditStatus === "audited" ? "Las metas, etapas, perfiles y bloques provienen de documentación oficial auditada; el snapshot SGAE se usa como contraste." : activeRegisteredPlan?.plan.auditStatus === "official-evidence-complete" ? "Títulos, mínimos, sedes y recorridos se contrastaron con fuentes oficiales. Las unidades combinan la composición de Bedelías y las normalizaciones trazables indicadas en el plan." : "Las unidades y grupos visibles provienen de la composición de Bedelías. Títulos, mínimos, obligatoriedad y trayectoria conservan auditoría oficial pendiente salvo donde el aviso indique evidencia cerrada." : planYear === "qf-2015" ? "Las metas y el damero provienen del Plan 2015 y de Facultad de Química; códigos y previaturas se contrastan con Bedelías." : "Las metas y el núcleo obligatorio provienen del plan, la implementación curricular de FING y la composición oficial de Bedelías."}</p>
          </>}
        </aside>

        <section className="curriculum-panel">
          {appMode === "planner" ? (
            <div className="planner-shell">
              <div className="planner-toolbar">
                <div>
                  <p className="eyebrow">Tu currícula, a tu ritmo</p>
                  <h2>Planificador</h2>
                  <span>{assignedPlannerIds.size} materias · {usesPublishedHours ? `${plannedHours} horas distribuidas` : `${plannedCredits} créditos distribuidos`}</span>
                </div>
                <div className="planner-actions">
                  <div className="view-switch" role="group" aria-label="Opciones visuales del planificador">
                    <button className={plannerView === "board" ? "active" : ""} onClick={() => setPlannerView("board")} aria-pressed={plannerView === "board"}><b>▥</b> Tablero</button>
                    <button className={plannerView === "compact" ? "active" : ""} onClick={() => setPlannerView("compact")} aria-pressed={plannerView === "compact"}><b>☷</b> Compacta</button>
                    <button className={plannerView === "balance" ? "active" : ""} onClick={() => setPlannerView("balance")} aria-pressed={plannerView === "balance"}><b>▰</b> Carga</button>
                  </div>
                  {currentPlannerTermId && <button className="finish-term-button" onClick={() => setRolloverTermId(currentPlannerTermId)}>Terminar semestre</button>}
                  <button className="add-term-button" onClick={addPlannerTerm}>+ Nuevo semestre</button>
                </div>
              </div>

              {plannerView === "balance" && (
                <div className="planner-load-overview" aria-label="Comparación de carga por semestre">
                  {plannerTerms.map((term) => {
                    const load = term.courseIds.reduce((sum, id) => {
                      const course = plannerCourses.find((candidate) => candidate.id === id);
                      return sum + (usesPublishedHours ? (course?.hours ?? 0) : (course?.credits ?? 0));
                    }, 0);
                    const maxLoad = Math.max(1, ...plannerTerms.map((item) => item.courseIds.reduce((sum, id) => {
                      const course = plannerCourses.find((candidate) => candidate.id === id);
                      return sum + (usesPublishedHours ? (course?.hours ?? 0) : (course?.credits ?? 0));
                    }, 0)));
                    return <div className="load-row" key={term.id}><span>{term.label}</span><i><b style={{ width: `${load / maxLoad * 100}%` }} /></i><strong>{load} {usesPublishedHours ? "h" : "cr."}</strong></div>;
                  })}
                </div>
              )}

              <div className={`planner-layout${showPlannerCatalog ? "" : " catalog-collapsed"}`}>
                <aside className={`course-catalog${showPlannerCatalog ? "" : " collapsed"}`}>
                  <div className="catalog-heading">
                    <div><p className="eyebrow">Plan y optativas</p><h3>Materias disponibles</h3></div>
                    <span>{availablePlannerCourses.length}</span>
                    <button type="button" className="catalog-toggle" onClick={() => setShowPlannerCatalog((value) => !value)} aria-expanded={showPlannerCatalog} aria-label={showPlannerCatalog ? "Minimizar materias disponibles" : "Mostrar materias disponibles"}>{showPlannerCatalog ? "−" : "+"}</button>
                  </div>
                  <div className="search-box planner-search">
                    <span aria-hidden="true">⌕</span>
                    <input aria-label="Buscar materias para planificar" value={plannerSearch} onChange={(event) => handlePlannerSearch(event.target.value)} placeholder="Nombre, código, área o sigla (ej. GAL)" />
                    {plannerSearch && <button type="button" className="search-clear" onClick={() => setPlannerSearch("")} aria-label="Limpiar búsqueda">×</button>}
                  </div>
                  <p className="catalog-help">Arrastrá una materia o elegí su semestre. La {usesPublishedHours ? "carga horaria" : "cantidad de créditos"} se conserva tal como figura en el plan.</p>
                  <div className="catalog-list">
                    {availablePlannerCourses.map((course) => (
                      <article className="catalog-course" key={course.id} draggable onDragStart={() => setDraggedCourseId(course.id)} onDragEnd={() => setDraggedCourseId(null)}>
                        <button className="catalog-course-main" onClick={() => setSelected(course)} aria-label={`Ver detalles de ${course.name}`}>
                          <span>#{course.id} · {courseAreaLabel(course)}</span>
                          <h4>{course.name}</h4>
                          <strong>{courseLoadLabel(course)}</strong>
                        </button>
                        <select aria-label={`Agregar ${course.name} a un semestre`} defaultValue="" onChange={(event) => { if (event.target.value) assignPlannerCourse(course.id, event.target.value); }}>
                          <option value="" disabled>Agregar a…</option>
                          {plannerTerms.map((term) => <option value={term.id} key={term.id}>{term.label}</option>)}
                        </select>
                      </article>
                    ))}
                    {availablePlannerCourses.length === 0 && <div className="catalog-empty"><span>✓</span><p>{plannerSearch ? "No hay materias que coincidan con la búsqueda." : "Todas las materias del catálogo están distribuidas."}</p></div>}
                  </div>
                </aside>

                <div className={`planner-board ${plannerView}`}>
                  {plannerTerms.map((term, termIndex) => {
                    const termCourses = term.courseIds.map((id) => plannerCourses.find((course) => course.id === id)).filter(Boolean) as Course[];
                    const termCredits = termCourses.reduce((sum, course) => sum + course.credits, 0);
                    const exoneratedCredits = termCourses.reduce((sum, course) => sum + ((statuses[course.id] ?? "pending") === "exonerated" ? course.credits : 0), 0);
                    const termHours = termCourses.reduce((sum, course) => sum + (course.hours ?? 0), 0);
                    const exoneratedHours = termCourses.reduce((sum, course) => sum + ((statuses[course.id] ?? "pending") === "exonerated" ? (course.hours ?? 0) : 0), 0);
                    const termLoad = usesPublishedHours ? termHours : termCredits;
                    const completedTermLoad = usesPublishedHours ? exoneratedHours : exoneratedCredits;
                    const isCurrentTerm = currentPlannerTermId === term.id;
                    return (
                      <section className={"planner-term" + (isCurrentTerm ? " current" : "")} key={term.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedCourseId) assignPlannerCourse(draggedCourseId, term.id); setDraggedCourseId(null); }}>
                        <header>
                          <span>{String(termIndex + 1).padStart(2, "0")}</span>
                          <div>
                            <input value={term.label} onChange={(event) => renamePlannerTerm(term.id, event.target.value)} aria-label={`Nombre del semestre ${termIndex + 1}`} />
                            <p>{termCourses.length} materias · <strong>{termLoad} {usesPublishedHours ? "horas planificadas" : "créditos planeados"}</strong></p>
                            {isCurrentTerm && <>
                              <div className="current-term-progress" role="progressbar" aria-label={"Progreso de " + term.label} aria-valuemin={0} aria-valuemax={termLoad} aria-valuenow={completedTermLoad}><i style={{ width: (termLoad ? completedTermLoad / termLoad * 100 : 0) + "%" }} /></div>
                              <p className="current-progress-copy"><strong>{completedTermLoad}/{termLoad}</strong> {usesPublishedHours ? "horas completadas" : "créditos exonerados"}</p>
                            </>}
                            <button type="button" className={"current-term-button" + (isCurrentTerm ? " active" : "")} onClick={() => setCurrentPlannerTerm(term.id)}>{isCurrentTerm ? "Semestre actual" : "Marcar como actual"}</button>
                          </div>
                          <button className="remove-term" onClick={() => removePlannerTerm(term.id)} disabled={plannerTerms.length === 1} aria-label={`Eliminar ${term.label}`} title="Las materias vuelven al catálogo">×</button>
                        </header>
                        <div className="term-load"><i style={{ width: `${Math.min(termLoad / (usesPublishedHours ? 1000 : 45) * 100, 100)}%` }} /></div>
                        <div className="planned-course-list">
                          {termCourses.map((course) => {
                            const status = statuses[course.id] ?? "pending";
                            return <article className={`planned-course ${status}`} key={course.id} draggable onDragStart={() => setDraggedCourseId(course.id)} onDragEnd={() => setDraggedCourseId(null)}>
                              <button className="planned-course-info" onClick={() => setSelected(course)}>
                                <span>#{course.id} · {courseAreaLabel(course)}</span>
                                <h3>{course.name}</h3>
                              </button>
                              <div><strong>{courseLoadLabel(course)}</strong><button className="mini-status" onClick={() => cycleStatus(course)} title="Cambiar estado">{status === "pending" ? "○" : status === "approved" ? "◐" : "●"}</button><button onClick={() => unassignPlannerCourse(course.id)} aria-label={`Quitar ${course.name} del plan`}>×</button></div>
                            </article>;
                          })}
                          {termCourses.length === 0 && <div className="term-empty"><span>+</span><p>Arrastrá materias acá</p></div>}
                        </div>
                      </section>
                    );
                  })}
                  <button className="add-term-card" onClick={addPlannerTerm}><span>+</span><strong>Agregar semestre</strong><small>Extendé tu plan cuando quieras</small></button>
                </div>
              </div>
            </div>
          ) : (<>
          <div className="toolbar">
            <div className="search-box">
              <svg className="search-icon" aria-hidden="true" viewBox="0 0 20 20">
                <circle cx="8.5" cy="8.5" r="5.25" />
                <path d="m12.4 12.4 4.1 4.1" />
              </svg>
              <input aria-label="Buscar materia por nombre, código, área o sigla" value={search} onChange={(event) => handleCurriculumSearch(event.target.value)} placeholder="Nombre, código, área o sigla (ej. GAL)" />
              {search && <button type="button" className="search-clear" onClick={() => setSearch("")} aria-label="Limpiar búsqueda" title="Limpiar búsqueda">×</button>}
            </div>
            {planYear === "1997" ? <label className="toggle-control">
              <input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
              <span /> Solo habilitadas
            </label> : isRegisteredPlan
              ? <span className={`rules-coverage ${hasClosedOfficialEvidence ? "" : "pending-audit-status"}`}>{activeRegisteredPlan?.plan.auditStatus === "audited" ? `Proyección auditada · revisión ${activeRegisteredPlan.source.reviewedAt}` : activeRegisteredPlan?.plan.auditStatus === "official-evidence-complete" ? `Malla normalizada · evidencia oficial cerrada${activeRegisteredPlan?.plan.publishedRules ? ` · ${activeRegisteredPlan.plan.publishedRules} reglas` : ""}` : `Composición Bedelías · auditoría oficial pendiente${activeRegisteredPlan?.plan.publishedRules ? ` · ${activeRegisteredPlan.plan.publishedRules} reglas` : ""}`}</span>
              : isProfilePlan
              ? <span className="rules-coverage">Bedelías auditada: {activeProfileData?.plan.publishedRules ?? 0} reglas · {activeProfileData?.plan.noPublishedRule ?? 0} sin publicar</span>
              : planYear === "qf-2015" ? <span className="rules-coverage">Bedelías auditada: {qf2015Data?.plan.publishedRules ?? 0} reglas · {qf2015Data?.plan.partialRules ?? 0} parciales · {qf2015Data?.plan.noPublishedRule ?? 0} sin publicar</span>
              : <span className="rules-coverage">Previas publicadas: {new Set(plan2025Data.rules.map((rule) => rule.target.code)).size}/{courses.length} materias</span>}
            <div className="curriculum-navigation" role="group" aria-label="Navegar por semestres">
              <button type="button" onClick={() => moveCurriculum(-1)} disabled={curriculumEdges.atStart} aria-label="Ir al semestre anterior" title="Semestre anterior">←</button>
              <button type="button" onClick={() => moveCurriculum(1)} disabled={curriculumEdges.atEnd} aria-label="Ir al semestre siguiente" title="Semestre siguiente">→</button>
            </div>
            <div className="legend" aria-label="Estados de las materias">
              <span><i className="dot pending" /> Pendiente</span>
              <span title="Curso aprobado; todavía no suma al avance"><i className="dot approved" /> Aprobada · examen pendiente</span>
              <span title="Unidad curricular completada; suma al avance"><i className="dot exonerated" /> Exonerada · completada</span>
            </div>
          </div>

          <div className="curriculum-scroll" ref={curriculumScrollRef} role="region" tabIndex={0} aria-label="Trayectoria académica; usá las flechas o la barra inferior para desplazarte horizontalmente">
            {isRegisteredPlan && activeRegisteredPlan && activeRegisteredPlan.plan.compositionAvailable === false ? <section className="curriculum-unavailable" role="status">
              <span aria-hidden="true">i</span>
              <div><p className="eyebrow">Composición no publicada</p><h2>La carrera está identificada, pero su malla todavía no está disponible</h2><p>{activeRegisteredPlan.plan.notice}</p><a href={activeRegisteredPlan.source.bedeliasPlanUrl ?? activeRegisteredPlan.source.planDocument} target="_blank" rel="noreferrer">Consultar la fuente en Bedelías ↗</a></div>
            </section> : <div className="semester-grid">
              {semesters.map((semester) => (
                <section className="semester-column" key={semester}>
                  <header>
                    <span>{semester === 0 ? "PI" : String(semester).padStart(2, "0")}</span>
                    <div><h2>{isRegisteredPlan ? activeRegisteredPathway?.periods[Number(semester) - 1]?.label : semester === 0 ? "Pre-semestre" : `${semester}º semestre`}</h2><p>{coursesLoadLabel(filtered(semester))}</p></div>
                  </header>
                  <div className="course-stack">
                    {planYear === "1997" && semester === 1 && statuses.PI === "exonerated" && <p className="replacement-note">✓ Matemática Inicial sustituida por la Prueba Inicial.</p>}
                    {filtered(semester).map((course) => (
                      <CourseCard key={course.id} course={course} areaLabel={courseAreaLabel(course)} allocationStatus={courseAllocationStatus(course)} status={statuses[course.id] ?? "pending"} unlocked={isUnlocked(course)} rulesKnown={isCourseAvailabilityKnown(course)} fixed={isFixedPlacementTest(course)} sourceLabel={sourceLabel(course)} onCycle={() => cycleStatus(course)} onDetails={() => setSelected(course)} />
                    ))}
                    {filtered(semester).length === 0 && <p className="empty-column">Sin resultados</p>}
                  </div>
                </section>
              ))}
            </div>}
          </div>

          {planYear === "1997" || isProfilePlan || planYear === "qf-2015" ? <section className="electives-section">
            <button className="electives-heading" onClick={() => setShowElectives((value) => !value)} aria-expanded={showElectives}>
              <div><span className="eyebrow">Trayectoria flexible</span><h2>Optativas y electivas</h2></div>
              <div><span>{electivesSummary}</span><b>{showElectives ? "−" : "+"}</b></div>
            </button>
            {showElectives && (
              <>
              <div className="electives-grid">
                {visibleElectives.map((course) => (
                  <CourseCard key={course.id} course={course} areaLabel={courseAreaLabel(course)} allocationStatus={courseAllocationStatus(course)} status={statuses[course.id] ?? "pending"} unlocked={isUnlocked(course)} rulesKnown={isCourseAvailabilityKnown(course)} fixed={isFixedPlacementTest(course)} sourceLabel={sourceLabel(course)} onCycle={() => cycleStatus(course)} onDetails={() => setSelected(course)} />
                ))}
              </div>
              <div className="electives-loader" role="status" aria-live="polite">
                {fullElectivesCatalogExpanded ? <p>Se muestran <strong>{deferredCatalogCount} materias adicionales</strong> de la composición oficial del plan en Bedelías.</p> : <>
                  <p>{deferredCatalogLoadState === "error" ? "No pudimos abrir el catálogo ampliado. Podés reintentar sin perder tu progreso." : isProfilePlan ? activeProfileData?.plan.notice : planYear === "qf-2015" ? qf2015Data?.plan.notice : "La vista inicial mantiene 20 optativas. Al buscar se consultan temporalmente todas las materias de Bedelías; este botón deja visible el catálogo completo incluso al limpiar la búsqueda."}</p>
                  <button type="button" className="primary-button" disabled={deferredCatalogLoadState === "loading"} onClick={() => void expandFullElectivesCatalog()}>
                    {deferredCatalogLoadState === "loading" ? "Cargando materias..." : deferredCatalogLoadState === "error" ? "Reintentar carga" : "Cargar catálogo de Bedelías"}
                  </button>
                </>}
              </div>
              </>
            )}
          </section> : isRegisteredPlan ? <section className={`plan-transition-note ${activeRegisteredPlan?.plan.auditStatus === "audited" ? "" : "pending-audit-panel"}`}>
            <p className="eyebrow">{activeRegisteredPlan?.plan.auditStatus === "audited" ? "Plan vigente · proyección auditada" : activeRegisteredPlan?.plan.auditStatus === "official-evidence-complete" ? "Plan contrastado · malla normalizada" : "Extracción de Bedelías · auditoría oficial pendiente"}</p>
            <h2>{activeRegisteredPlan?.plan.auditStatus === "audited" ? "Fuentes oficiales y alcance" : "Alcance provisional de los datos"}</h2>
            <p>{activeRegisteredPlan?.plan.notice}</p>
            <a href={activeRegisteredPlan?.source.planDocument} target="_blank" rel="noreferrer">Consultar la fuente disponible ↗</a>
          </section> : <section className="plan-transition-note">
            <p className="eyebrow">Plan vigente · implementación en curso</p>
            <h2>Lo que todavía no tiene semestre publicado</h2>
            <p>{activePlan2025Trajectory.notice ?? plan2025Data.plan.notice}</p>
            <a href={plan2025Data.source.curriculumPage} target="_blank" rel="noreferrer">Ver documentación oficial de FING ↗</a>
          </section>}
          </>)}
        </section>
      </section>

      <footer>
        <p>Trayecto es un proyecto estudiantil independiente. La información oficial prevalece siempre sobre este prototipo.</p>
        <a href="https://bedelias.udelar.edu.uy/" target="_blank" rel="noreferrer">Consultar Bedelías ↗</a>
      </footer>

      {rolloverTerm && (
        <div className="modal-backdrop">
          <section className="import-modal rollover-modal" role="dialog" aria-modal="true" aria-labelledby="rollover-title">
            <div className="modal-symbol rollover-symbol" aria-hidden="true">→</div>
            <h2 id="rollover-title">Terminar {rolloverTerm.label}</h2>
            <p>{rolloverIncompleteCourses.length > 0
              ? "Quedan " + rolloverIncompleteCourses.length + " materias sin exonerar, por " + (usesPublishedHours ? rolloverIncompleteHours + " horas" : rolloverIncompleteCredits + " créditos") + ". ¿Querés moverlas al próximo semestre?"
              : "Todas las materias de este semestre están exoneradas. El próximo semestre pasará a ser el actual."}</p>
            <div className="rollover-actions">
              <button type="button" className="primary-button" onClick={() => finishPlannerTerm(true)}>{rolloverIncompleteCourses.length > 0 ? "Mover y continuar" : "Continuar"}</button>
              {rolloverIncompleteCourses.length > 0 && <button type="button" className="secondary-button" onClick={() => finishPlannerTerm(false)}>Cerrar sin mover</button>}
              <button type="button" className="quiet-button" onClick={() => setRolloverTermId(null)}>Cancelar</button>
            </div>
          </section>
        </div>
      )}

      {importError && (
        <div className="modal-backdrop">
          <button type="button" className="backdrop-dismiss" aria-label="Cerrar mensaje de importación" onClick={() => setImportError(null)} />
          <section className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-error-title">
            <div className="modal-symbol" aria-hidden="true">!</div>
            <h2 id="import-error-title">{importError.title}</h2>
            <p>{importError.message}</p>
            <button ref={importErrorButtonRef} type="button" className="primary-button" onClick={() => setImportError(null)}>Entendido</button>
          </section>
        </div>
      )}

      {selected && (
        <div className="drawer-backdrop">
          <button type="button" className="backdrop-dismiss" aria-label="Cerrar detalles de la materia" onClick={() => setSelected(null)} />
          <aside className="details-drawer" role="dialog" aria-modal="true" aria-label={`Detalles de ${selected.name}`}>
            <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Cerrar detalles">×</button>
            <p className="eyebrow">{selected.id} · {courseAreaLabel(selected)}</p>
            <h2>{selected.name}</h2>
            <div className="drawer-stats"><div><span>{selected.credits > 0 ? "Créditos" : selected.hours ? "Horas" : "Créditos"}</span><strong>{selected.credits > 0 ? selected.credits : selected.hours ?? "No publicados"}</strong></div><div><span>Estado</span><strong>{selected.placeholder ? "Espacio a completar" : selected.placementTest ? (statuses.PI === "exonerated" ? "Acreditada" : "No acreditada") : stateLabels[statuses[selected.id] ?? "pending"]}</strong></div></div>
            {selectedAllocation?.status === "suggested" ? <p className="allocation-source suggested-allocation"><span>≈</span> Cuenta en <strong>{courseAreaLabel(selected)}</strong> mediante una asignación sugerida. Los créditos se computan normalmente, pero todavía falta un Anexo B o resolución específica para este plan.</p>
              : selectedAllocation?.status === "conflict" ? <p className="allocation-source conflict-allocation"><span>!</span> Hay fuentes oficiales en conflicto para esta asignación. Revisá los documentos antes de tomarla como definitiva.</p>
                : selectedAllocation && <p className="allocation-source official-allocation"><span>✓</span> Cuenta oficialmente en <strong>{courseAreaLabel(selected)}</strong> según {selected.dataStatus === "fadu-official" ? "FADU" : planYear === "qf-2015" && selected.dataStatus === "fq-damero" ? "Facultad de Química" : selected.dataStatus === "official-curriculum" ? "el servicio universitario" : "Bedelías"}.</p>}
            {planYear === "1997" && selected.id === "PI" ? <p className="verified-source fing-source"><span>F</span> La <a href={plan1997PlacementTestSource} target="_blank" rel="noreferrer">trayectoria sugerida publicada por FING en 2025</a> explicita 4 créditos para quienes obtienen 60% o más.</p>
              : selected.dataStatus === "fq-damero" ? <p className="verified-source fing-source"><span>FQ</span> Materia, créditos y semestre publicados en el <a href={qf2015Data?.source.suggestedCurriculum} target="_blank" rel="noreferrer">damero vigente de Facultad de Química</a>; códigos y previaturas se contrastan con Bedelías.</p>
              : selected.dataStatus === "fadu-official" ? <p className="verified-source fing-source"><span>FA</span> {selected.curricularBlock ? "Bloque y créditos" : "Unidad curricular y créditos"} contrastados con el <a href={activeRegisteredPlan?.source.planDocument} target="_blank" rel="noreferrer">plan y la organización oficial de FADU</a>.</p>
              : selected.dataStatus === "official-curriculum" ? <p className="verified-source fing-source"><span>U</span> {selected.curricularBlock ? (selected.hours ? "Bloque y carga horaria" : "Bloque y créditos") : selected.hours ? "Unidad curricular, carga horaria y período" : "Unidad curricular, créditos y período"} publicados en la <a href={activeRegisteredPlan?.source.careerPage} target="_blank" rel="noreferrer">malla curricular oficial del servicio</a>.</p>
              : selected.placeholder ? <p className="verified-source fing-source"><span>F</span> Espacio previsto en la <a href={activeProfileData?.source.profilesSpreadsheet} target="_blank" rel="noreferrer">trayectoria oficial del perfil</a>; debe completarse eligiendo una unidad curricular admitida por el plan.</p>
              : verifiedCourses.has(selected.id) ? <p className="verified-source"><span>✓</span> Materia incluida en la composición publicada por <strong>Bedelías</strong>.</p>
                : selected.dataStatus === "fing-trajectory" ? <p className="verified-source fing-source"><span>F</span> Materia y semestre publicados en la <a href={plan2025Data.source.curriculumPage} target="_blank" rel="noreferrer">trayectoria sugerida de FING</a>; Bedelías aún no publica su regla para este plan.</p>
                  : selected.dataStatus === "project-assumption" && <p className="verified-source fing-source"><span>!</span> Los 4 créditos se mantienen como supuesto del proyecto para el Plan 2025; la <a href={plan2025Data.source.curriculumPage} target="_blank" rel="noreferrer">trayectoria vigente de FING</a> confirma el corte de 60%, pero no explicita este crédito.</p>}
            {selected.offering && <p className="verified-source fing-source offering-source"><span>F</span> FING publica esta materia en la oferta del <strong>{selected.offering.term}</strong>. <a href={selected.offering.sourceUrl} target="_blank" rel="noreferrer">Ver publicación &nearr;</a>{selected.offering.evaUrl && <> · <a href={selected.offering.evaUrl} target="_blank" rel="noreferrer">Abrir curso en EVA &nearr;</a></>}</p>}
            {selected.core && <p className="verified-source fing-source"><span>F</span> Esta unidad integra el núcleo común de los perfiles oficiales publicados por la Comisión de Carrera.</p>}
            {!selectedAllocation && (selected.eligibleRequirementIds?.length ?? 0) > 1 && <p className="allocation-source suggested-allocation"><span>i</span> Suma al total del plan, pero Bedel&iacute;as la admite en m&aacute;s de un &aacute;rea ({selected.eligibleRequirementIds?.map((id) => nodeById.get(id)?.shortName ?? nodeById.get(id)?.name ?? id).join(" o ")}). La asignaci&oacute;n de &aacute;rea queda pendiente para no duplicar cr&eacute;ditos.</p>}
            <h3>{selected.placeholder ? "Cómo completar este espacio" : selectedAssessment === "exam" ? "Condiciones para rendir o exonerar" : "Condiciones para cursar"}</h3>
            {selectedRule ? (
              selectedRows.length ? <ul className="requirements-list">
                {selectedRows.map((row) => <li className={row.done ? "done" : "missing"} key={row.key}>
                  <span>{row.done ? "✓" : "○"}</span>
                  <div className="requirement-copy">
                    <strong>{row.label}</strong>
                    {row.alternativeGroups?.length ? <div className="requirement-paths">
                      {row.alternativeGroups.map((group) => <details key={`${row.key}-${group.label}`} open={group.done}>
                        <summary><span>{group.done ? "✓" : "○"}</span>{group.label}</summary>
                        <ul>{group.conditions.map((condition, index) => <li key={`${row.key}-${group.label}-${index}`}>{condition}</li>)}</ul>
                      </details>)}
                    </div> : null}
                    {row.alternatives?.length ? <ul className="requirement-alternatives">
                      {row.alternatives.map((alternative, index) => <li key={`${row.key}-option-${index}`}>{alternative}</li>)}
                    </ul> : null}
                  </div>
                </li>)}
              </ul> : <p className="free-course">Bedelías no publica condiciones adicionales para esta instancia.</p>
            ) : (selected.prerequisites?.length || selected.minCredits) ? (
              <ul className="requirements-list">
                {selected.prerequisites?.map((id) => {
                  const prerequisite = activeCourses.find((course) => course.id === id);
                  return <li className={isRequirementComplete(id) ? "done" : "missing"} key={id}><span>{isRequirementComplete(id) ? "✓" : "○"}</span>{prerequisite?.name ?? id}</li>;
                })}
                {selected.minCredits && <li className={earnedCredits >= selected.minCredits ? "done" : "missing"}><span>{earnedCredits >= selected.minCredits ? "✓" : "○"}</span>{selected.minCredits} créditos acumulados</li>}
              </ul>
            ) : <p className="free-course">{selected.placeholder ? "Elegí una unidad curricular del catálogo que cumpla el área o perfil indicado; el bloque no suma créditos por sí mismo." : selected.curricularBlock ? "Este bloque se acredita manualmente cuando completás el mínimo oficial que representa; no se presenta como una unidad curricular individual ni como una regla de previaturas." : selected.ruleCoverage === "not-published" ? "Bedelías fue consultada y no publica una regla para esta unidad; no se interpreta como ausencia de previas." : selected.ruleCoverage === "partial" ? "La regla publicada por Bedelías llegó incompleta. No se usa para bloquear esta materia hasta volver a auditarla." : "Sin una regla importada para esta instancia; no se presenta como validación oficial."}</p>}
            {selectedDependents.length > 0 && <><h3>Puede habilitar o condicionar</h3><ul className="requirements-list dependent-list">
              {selectedDependents.map((course) => <li key={course.id}><span>→</span>{course.name}</li>)}
            </ul></>}
            {selected.offered.length > 0 && <><h3>Se dicta</h3><div className="offering-list">{selected.offered.map((item) => <span key={item}>{item === "par" ? "2.\u00ba semestre" : item === "impar" ? "1.er semestre" : "Libre"}</span>)}</div></>}
            <button className="primary-button" disabled={selected.placeholder || !isUnlocked(selected) || isFixedPlacementTest(selected)} onClick={() => cycleStatus(selected)}>
              {selected.placeholder
                ? "Elegí una materia del catálogo"
                : isFixedPlacementTest(selected)
                ? "Acreditada automáticamente por la trayectoria"
                : selected.placementTest
                ? (statuses.PI === "exonerated" ? "Desmarcar Prueba Inicial" : "Acreditar Prueba Inicial")
                : isUnlocked(selected) ? `Marcar como ${(statuses[selected.id] ?? "pending") === "pending" ? "aprobada" : (statuses[selected.id] ?? "pending") === "approved" ? "exonerada" : "pendiente"}` : selectedStatus === "approved" ? "Examen aún no habilitado" : "Materia aún no habilitada"}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}

function CourseCard({ course, areaLabel, allocationStatus, status, unlocked, rulesKnown, fixed = false, sourceLabel, onCycle, onDetails }: { course: Course; areaLabel: string; allocationStatus?: AllocationStatus; status: CourseStatus; unlocked: boolean; rulesKnown: boolean; fixed?: boolean; sourceLabel?: "Bedelías" | "FING" | "FQ" | "FADU"; onCycle: () => void; onDetails: () => void }) {
  return (
    <article className={`course-card ${status} ${unlocked ? "unlocked" : "locked"}`}>
      <div className="course-topline">
        <span>#{course.id}{sourceLabel && <i className={`official-tag ${sourceLabel !== "Bedelías" ? "fing-tag" : ""}`}>{sourceLabel}</i>}{course.core && <i className="official-tag fing-tag">Común</i>}</span>
        <button onClick={onDetails} aria-label={`Ver detalles de ${course.name}`}>i</button>
      </div>
      <h3>{course.name}</h3>
      <div className="course-meta"><span>{areaLabel}{allocationStatus === "suggested" && <i className="suggested-badge">sugerida</i>}</span><strong>{courseLoadLabel(course)}</strong></div>
      <button className="status-button" disabled={course.placeholder || !unlocked || fixed} onClick={onCycle}>
        {course.placeholder
          ? <><span className="status-mark">+</span>Elegí una UC del catálogo</>
          : fixed
          ? <><span className="status-mark">✓</span>Acreditada por trayectoria · 4 cr.</>
          : course.ruleCoverage === "not-published" && status === "pending"
          ? <><span className="status-mark">?</span>Bedelías no publica regla</>
          : course.ruleCoverage === "partial" && status === "pending"
          ? <><span className="status-mark">?</span>Regla oficial en revisión</>
          : !rulesKnown && status === "pending"
          ? <><span className="status-mark">?</span>Previas aún no consultadas</>
          : !unlocked
          ? <><span className="lock-mark">⌑</span>{status === "approved" ? "Examen no habilitado" : "No habilitada"}</>
          : course.placementTest
            ? <><span className="status-mark">{status === "exonerated" ? "✓" : "□"}</span>{status === "exonerated" ? "Acreditada · suma 4 cr." : "Acreditar prueba"}</>
            : <><span className="status-mark">{status === "pending" ? "○" : status === "approved" ? "◐" : "●"}</span>{stateLabels[status]}</>}
      </button>
    </article>
  );
}
