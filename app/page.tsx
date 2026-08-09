"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import bedeliasDataJson from "./data/computacion-1997-bedelias.json";
import plan2025DataJson from "./data/computacion-2025-fing.json";

type CourseStatus = "pending" | "approved" | "exonerated";
type CredentialId = "analyst" | "engineer";
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
  dataStatus?: "bedelias-composition" | "fing-trajectory" | "project-assumption";
};

type RequirementOption = {
  assessment: "course" | "exam" | "course-enrollment" | "exam-enrollment";
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
  children: RequirementExpression[];
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

function buildPlan2025Courses(trajectoryId: string): Course[] {
  const trajectory = plan2025Data.trajectories[trajectoryId] ?? plan2025Data.trajectories["pi-60-plus"];
  const semesters = new Map<string, number>();
  trajectory.preSemester?.forEach((id) => semesters.set(id, 0));
  trajectory.semesters.forEach((ids, index) => ids.forEach((id) => semesters.set(id, index + 1)));
  return plan2025Data.courses
    .filter((course) => semesters.has(course.id))
    .map((course) => ({ ...course, semester: semesters.get(course.id)!, offered: [] }));
}

function optionSatisfied(option: RequirementOption, statuses: Record<string, CourseStatus>) {
  const status = statuses[option.code] ?? "pending";
  const placementTestSubstitution = option.code === "MI2" && statuses.PI === "exonerated";
  if (option.assessment === "course") return placementTestSubstitution || status === "approved" || status === "exonerated";
  if (option.assessment === "exam") return placementTestSubstitution || status === "exonerated";
  return false;
}

function expressionSatisfied(expression: RequirementExpression, statuses: Record<string, CourseStatus>, earnedCredits: number, groupCredits: (groupCode: string) => number = () => 0): boolean {
  if (expression.kind === "all") return expression.children.every((child) => expressionSatisfied(child, statuses, earnedCredits, groupCredits));
  if (expression.kind === "any") return expression.children.some((child) => expressionSatisfied(child, statuses, earnedCredits, groupCredits));
  if (expression.kind === "none") return !expression.children.some((child) => expressionSatisfied(child, statuses, earnedCredits, groupCredits));
  if (expression.creditRequirement) return earnedCredits >= expression.creditRequirement.minimum;
  if (expression.groupCreditRequirement) return groupCredits(expression.groupCreditRequirement.groupCode) >= expression.groupCreditRequirement.minimum;
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
      : option.assessment === "exam-enrollment" ? "inscripción a examen"
        : "inscripción a curso";
  return `${name} · ${evidence}`;
}

function describeExcludedOption(option: RequirementOption, courses: Course[]) {
  const course = courses.find((item) => item.id === option.code);
  const name = course?.name ?? readableCourseName(option.name);
  if (option.assessment === "course-enrollment") return `No estar inscripto/a al curso de ${name}`;
  if (option.assessment === "exam-enrollment") return `No estar inscripto/a al examen de ${name}`;
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
  if (expression.kind === "none") {
    const options = expression.children.flatMap((child) => child.options).slice(0, 3);
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

function requirementRows(expression: RequirementExpression, statuses: Record<string, CourseStatus>, earnedCredits: number, courses: Course[], courseIds: Set<string>, groupCredits: (groupCode: string) => number, prefix = "r"): RequirementRow[] {
  if (expression.kind === "all") return expression.children.flatMap((child, index) => requirementRows(child, statuses, earnedCredits, courses, courseIds, groupCredits, `${prefix}-${index}`));
  if (expression.kind === "none") {
    const alternatives = expression.children.flatMap((child) => expressionOptions(child, courses, courseIds)).slice(0, 3);
    return [{ key: prefix, label: alternatives.length ? "No tener aprobada ninguna de estas equivalencias" : "No cumplir una condición excluyente", alternatives, done: expressionSatisfied(expression, statuses, earnedCredits, groupCredits) }];
  }
  if (expression.kind === "any") {
    const isComplex = expression.children.some((child) => child.kind === "all" && child.children.length > 2);
    if (isComplex) {
      const alternativeGroups = expression.children.map((child, index) => ({
        label: `Opción ${index + 1}`,
        conditions: branchConditions(child, courses, courseIds),
        done: expressionSatisfied(child, statuses, earnedCredits, groupCredits),
      }));
      return [{ key: prefix, label: "Cumplir una de estas opciones", alternativeGroups, done: alternativeGroups.some((group) => group.done) }];
    }
    const alternatives = expression.children.map((child) => describeExpression(child, courses, courseIds)).filter(Boolean);
    return [{ key: prefix, label: "Cumplir una de estas opciones", alternatives, done: expressionSatisfied(expression, statuses, earnedCredits, groupCredits) }];
  }
  const alternatives = expressionOptions(expression, courses, courseIds);
  if (alternatives.length > 1) {
    const minimum = expression.minimum ?? 1;
    const label = minimum === 1 ? "Cumplir una de estas opciones" : `Cumplir al menos ${minimum} de estas opciones`;
    return [{ key: prefix, label, alternatives, done: expressionSatisfied(expression, statuses, earnedCredits, groupCredits) }];
  }
  return [{ key: prefix, label: describeExpression(expression, courses, courseIds), done: expressionSatisfied(expression, statuses, earnedCredits, groupCredits) }];
}

const stateLabels: Record<CourseStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  exonerated: "Exonerada",
};

const STORAGE_KEY = "trayecto-udelar-progress-v2";
const LEGACY_STORAGE_KEY = "trayecto-udelar-demo-v1";
type PlanId = "1997" | "2025";
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
};

const PLANNER_STORAGE_KEY = "trayecto-udelar-planner-v1";
const CURRENT_TERM_STORAGE_KEY = "trayecto-udelar-current-term-v1";
const VISUAL_PREFERENCES_STORAGE_KEY = "trayecto-udelar-visual-preferences-v1";
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
const createDefaultTerms = (): PlannerTerm[] => Array.from({ length: 4 }, (_, index) => ({
  id: `term-${index + 1}`,
  label: `Semestre ${index + 1}`,
  courseIds: [],
}));

export default function Home() {
  const [appMode, setAppMode] = useState<AppMode>("curriculum");
  const [planYear, setPlanYear] = useState<PlanId>("2025");
  const [trajectoryId, setTrajectoryId] = useState("pi-60-plus");
  const [progress, setProgress] = useState<PlanProgress>({ 1997: {}, 2025: {} });
  const [credentialId, setCredentialId] = useState<CredentialId>("engineer");
  const [selected, setSelected] = useState<Course | null>(null);
  const [importError, setImportError] = useState<{ title: string; message: string } | null>(null);
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showElectives, setShowElectives] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [curriculumEdges, setCurriculumEdges] = useState({ atStart: true, atEnd: false });
  const [plannerPlans, setPlannerPlans] = useState<PlannerPlans>({ 1997: createDefaultTerms(), 2025: createDefaultTerms() });
  const [plannerView, setPlannerView] = useState<PlannerView>("board");
  const [plannerSearch, setPlannerSearch] = useState("");
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);
  const [currentPlannerTerms, setCurrentPlannerTerms] = useState<CurrentPlannerTerms>({ 1997: null, 2025: null });
  const [rolloverTermId, setRolloverTermId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeId>("udelar");
  const [themeScheme, setThemeScheme] = useState<ThemeScheme>("light");
  const [colorVisionEnabled, setColorVisionEnabled] = useState(false);
  const [colorVisionType, setColorVisionType] = useState<ColorVisionType>("deuteranopia");
  const importRef = useRef<HTMLInputElement>(null);
  const curriculumScrollRef = useRef<HTMLDivElement>(null);
  const verticalScrollTargetRef = useRef(0);
  const verticalScrollPositionRef = useRef(0);
  const verticalScrollLastFrameRef = useRef<number | null>(null);
  const verticalScrollFrameRef = useRef<number | null>(null);
  const activeThemeOption = themeOptions.find((option) => option.id === theme) ?? themeOptions[0];

  const courses = useMemo(
    () => planYear === "2025" ? buildPlan2025Courses(trajectoryId) : plan1997Courses,
    [planYear, trajectoryId],
  );
  const plannerCourses = useMemo<Course[]>(() => planYear === "2025"
    ? plan2025CatalogCourses
    : plan1997Courses,
  [planYear]);
  const plannerTerms = plannerPlans[planYear];
  const currentPlannerTermId = currentPlannerTerms[planYear];
  const activeCourses = appMode === "planner" ? plannerCourses : courses;
  const storedStatuses = progress[planYear] ?? {};
  const statuses = useMemo(
    () => planYear === "2025" && trajectoryId === "pi-60-plus"
      ? { ...storedStatuses, PI: "exonerated" as CourseStatus }
      : storedStatuses,
    [planYear, trajectoryId, storedStatuses],
  );
  const courseIds = useMemo(() => new Set(activeCourses.map((course) => course.id)), [activeCourses]);
  const verifiedCourses = useMemo(
    () => planYear === "2025"
      ? new Map(plan2025Data.courses.filter((course) => course.dataStatus === "bedelias-composition").map((course) => [course.id, course]))
      : plan1997VerifiedCourses,
    [planYear],
  );
  const verifiedRules = useMemo(
    () => new Map((planYear === "2025" ? plan2025Data.rules : bedeliasData.rules).map((rule) => [`${rule.target.code}:${rule.target.assessment}`, rule])),
    [planYear],
  );
  const creditStructure = planYear === "2025" ? plan2025Data.creditStructure : bedeliasData.creditStructure;
  const requirementNodes = creditStructure.nodes;
  const nodeById = useMemo(() => new Map(requirementNodes.map((node) => [node.id, node])), [requirementNodes]);
  const credential = creditStructure.credentials.find((item) => item.id === credentialId) ?? creditStructure.credentials[0];
  const credentialTargets = useMemo(() => new Map(credential.nodeRequirements.map((item) => [item.nodeId, item])), [credential]);
  const semesters = planYear === "2025"
    ? [
      ...(plan2025Data.trajectories[trajectoryId].preSemester?.length ? [0] : []),
      ...plan2025Data.trajectories[trajectoryId].semesters.map((_, index) => index + 1),
    ]
    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const planMinCredits = planYear === "2025" ? plan2025Data.plan.minCredits : bedeliasData.plan.minCredits;
  const analystCredential = creditStructure.credentials.find((item) => item.id === "analyst")!;
  const engineerCredential = creditStructure.credentials.find((item) => item.id === "engineer")!;

  const setStatuses = (updater: Record<string, CourseStatus> | ((current: Record<string, CourseStatus>) => Record<string, CourseStatus>)) => {
    setProgress((current) => {
      const currentPlan = current[planYear] ?? {};
      const next = typeof updater === "function" ? updater(currentPlan) : updater;
      return { ...current, [planYear]: next };
    });
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setProgress(JSON.parse(saved));
      else {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) setProgress({ 1997: JSON.parse(legacy), 2025: {} });
      }
      const savedPlanner = localStorage.getItem(PLANNER_STORAGE_KEY);
      if (savedPlanner) setPlannerPlans(JSON.parse(savedPlanner));
      const savedCurrentPlannerTerms = localStorage.getItem(CURRENT_TERM_STORAGE_KEY);
      if (savedCurrentPlannerTerms) {
        const parsed = JSON.parse(savedCurrentPlannerTerms) as Partial<CurrentPlannerTerms>;
        setCurrentPlannerTerms({ 1997: typeof parsed["1997"] === "string" ? parsed["1997"] : null, 2025: typeof parsed["2025"] === "string" ? parsed["2025"] : null });
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
      }
    } catch {
      // A damaged local save should never prevent the curriculum from loading.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress, hydrated]);

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
      const preferences: VisualPreferences = { theme, scheme: themeScheme, colorVisionEnabled, colorVisionType };
      localStorage.setItem(VISUAL_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    }
  }, [theme, themeScheme, colorVisionEnabled, colorVisionType, hydrated]);

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

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (rolloverTermId) setRolloverTermId(null);
        else setSelected(null);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      delete root.dataset.scrollLocked;
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
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
      setCurriculumEdges({ atStart: scroller.scrollLeft <= 1, atEnd: scroller.scrollLeft >= maxScroll - 1 });
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
  const credentialRequirementsMet = (earnedCredits >= credential.minTotalCredits ? 1 : 0)
    + countableNodeRequirements.filter((requirement) => nodeCredits(requirement.nodeId) >= requirement.minCredits).length
    + credential.requiredCourseGroups.filter((group) => requiredCourseGroupProgress(group) >= group.minCompleted).length
    + credential.requiredActivities.filter((activity) => activityProgress(activity) >= activity.minCredits).length;
  const credentialRequirementsTotal = 1 + countableNodeRequirements.length + credential.requiredCourseGroups.length + credential.requiredActivities.length;

  const isComplete = (id: string) => statuses[id] === "approved" || statuses[id] === "exonerated";
  const isFixedPlacementTest = (course: Course) => planYear === "2025" && trajectoryId === "pi-60-plus" && course.id === "PI";
  const isRequirementComplete = (id: string) => id === "MI2"
    ? isComplete("MI2") || statuses.PI === "exonerated"
    : isComplete(id);
  const officialRule = (course: Course, assessment: "course" | "exam") => verifiedRules.get(`${course.id === "1730-A" ? "1730" : course.id}:${assessment}`);
  const groupCredits = (groupCode: string) => {
    const nodeId = planYear === "1997" ? bedeliasData.requirementGroupMap[groupCode] : undefined;
    return nodeId ? nodeCredits(nodeId) : 0;
  };
  const hasVerifiedCourseRule = (course: Course) => Boolean(officialRule(course, "course"));
  const isCourseAvailabilityKnown = (course: Course) => course.placementTest || hasVerifiedCourseRule(course) || Boolean(course.prerequisites?.length || course.minCredits);
  const isCourseUnlocked = (course: Course) => {
    if (course.placementTest) return true;
    const rule = officialRule(course, "course");
    if (rule) return expressionSatisfied(rule.expression, statuses, earnedCredits, groupCredits);
    return (course.prerequisites ?? []).every(isRequirementComplete) && (!course.minCredits || earnedCredits >= course.minCredits);
  };
  const isExamUnlocked = (course: Course) => {
    const rule = officialRule(course, "exam");
    return rule ? expressionSatisfied(rule.expression, statuses, earnedCredits, groupCredits) : true;
  };
  const isUnlocked = (course: Course) => {
    const status = statuses[course.id] ?? "pending";
    return status === "pending" ? isCourseUnlocked(course) : status === "approved" ? isExamUnlocked(course) : true;
  };

  const cycleStatus = (course: Course) => {
    if (!isUnlocked(course) || isFixedPlacementTest(course)) return;
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

  const filtered = (semester: Course["semester"]) => courses.filter((course) => {
    const matchesSemester = course.semester === semester;
    const matchesSearch = `${course.id} ${course.name} ${courseAreaLabel(course)}`.toLowerCase().includes(search.toLowerCase());
    const isReplacedByPlacementTest = course.id === "MI2" && statuses.PI === "exonerated";
    return matchesSemester && matchesSearch && !isReplacedByPlacementTest && (!availableOnly || (isCourseAvailabilityKnown(course) && isUnlocked(course)));
  });

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify({ formatVersion: 1, career: `ingenieria-computacion-${planYear}`, plan: planYear, trajectory: trajectoryId, statuses }, null, 2)], { type: "application/json" });
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
    reader.onload = () => {
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
  const availablePlannerCourses = plannerCourses.filter((course) => {
    const query = plannerSearch.trim().toLocaleLowerCase("es-UY");
    return !assignedPlannerIds.has(course.id) && (!query || `${course.id} ${course.name} ${courseAreaLabel(course)}`.toLocaleLowerCase("es-UY").includes(query));
  });

  const rolloverTerm = plannerTerms.find((term) => term.id === rolloverTermId);
  const rolloverCourses = rolloverTerm?.courseIds.map((id) => plannerCourses.find((course) => course.id === id)).filter(Boolean) as Course[] | undefined;
  const rolloverIncompleteCourses = rolloverCourses?.filter((course) => (statuses[course.id] ?? "pending") !== "exonerated") ?? [];
  const rolloverIncompleteCredits = rolloverIncompleteCourses.reduce((sum, course) => sum + course.credits, 0);

  const selectedStatus = selected ? statuses[selected.id] ?? "pending" : "pending";
  const selectedAssessment: "course" | "exam" = selectedStatus === "approved" ? "exam" : "course";
  const selectedRule = selected ? officialRule(selected, selectedAssessment) : undefined;
  const selectedAllocation = selected?.creditAllocations?.[0];
  const selectedRows = selectedRule ? requirementRows(selectedRule.expression, statuses, earnedCredits, activeCourses, courseIds, groupCredits) : [];
  const selectedDependents = selected ? activeCourses.filter((course) => {
    if (course.id === selected.id) return false;
    if (course.prerequisites?.includes(selected.id)) return true;
    const courseRule = officialRule(course, "course");
    return Boolean(courseRule && expressionReferencesCode(courseRule.expression, selected.id));
  }) : [];
  const sourceLabel = (course: Course): "Bedelías" | "FING" | undefined => {
    if (planYear === "1997") return course.id === "PI" ? "FING" : verifiedCourses.has(course.id.startsWith("1730-") ? "1730" : course.id) ? "Bedelías" : undefined;
    return course.dataStatus === "bedelias-composition" ? "Bedelías" : course.dataStatus === "fing-trajectory" ? "FING" : undefined;
  };

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
          <details className="appearance-menu">
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
            <label>
              <span>Carrera</span>
              <select defaultValue="computacion">
                <option value="computacion">Ingeniería en Computación</option>
                <option disabled>Doctor en Medicina — próxima importación</option>
                <option disabled>Abogacía — próxima importación</option>
              </select>
            </label>
            <label>
              <span>Plan</span>
              <select value={planYear} onChange={(event) => {
                const next = event.target.value as PlanId;
                setPlanYear(next);
                setTrajectoryId(next === "2025" ? "pi-60-plus" : "pi-20-59");
                setSelected(null);
              }}>
                <option value="2025">Plan 2025 · vigente, en transición</option>
                <option value="1997">Plan 1997 · histórico</option>
              </select>
            </label>
            {appMode === "curriculum" && <label>
              <span>Trayectoria</span>
              <select value={trajectoryId} onChange={(event) => {
                const next = event.target.value;
                setTrajectoryId(next);
                if (planYear === "2025" && next !== "pi-60-plus") {
                  setStatuses((current) => ({ ...current, PI: "pending" }));
                }
                setSelected(null);
              }}>
                {planYear === "2025" ? Object.entries(plan2025Data.trajectories).map(([id, trajectory]) => (
                  <option value={id} key={id}>{trajectory.label}</option>
                )) : <option value="pi-20-59">Ingreso 1er semestre · PI 20–59%</option>}
              </select>
            </label>}
          </div>
          {appMode === "planner" ? (
            <p className="pilot-note planner-note"><span /> Armá una currícula propia con las mismas materias, créditos y áreas del plan. Los cambios quedan guardados en este dispositivo.</p>
          ) : planYear === "2025" ? (
            <p className="pilot-note"><span /> {plan2025Data.trajectories[trajectoryId].description} Bedelías confirma el plan vigente, pero su composición y sus previaturas todavía están incompletas.</p>
          ) : (
            <p className="pilot-note"><span /> Semestres de la trayectoria sugerida compartida. Créditos, áreas y reglas centrales importados de Bedelías; núcleo obligatorio contrastado con la implementación curricular de FING.</p>
          )}
        </div>

        <div className="credit-summary">
          <div className="credit-ring" style={{ "--progress": `${Math.min((appMode === "planner" ? plannedCredits : earnedCredits) / planMinCredits * 100, 100)}%` } as React.CSSProperties}>
            <div><strong>{appMode === "planner" ? plannedCredits : earnedCredits}</strong><span>de {planMinCredits}</span></div>
          </div>
          <div>
            <p>{appMode === "planner" ? "Créditos planificados" : "Créditos obtenidos"}</p>
            <strong>{appMode === "planner" ? `${plannedCredits} cr. distribuidos` : `${Math.round(earnedCredits / planMinCredits * 100)}% de la carrera`}</strong>
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

          <div className={`degree-card analyst ${credentialId === "analyst" ? "selected-degree" : ""}`}>
            <div>
              <span>Título intermedio</span>
              <h3>{analystCredential.title}</h3>
            </div>
            <strong>{Math.min(earnedCredits, analystCredential.minTotalCredits)}<small>/{analystCredential.minTotalCredits}</small></strong>
            <div className="linear-progress"><i style={{ width: `${Math.min(earnedCredits / analystCredential.minTotalCredits * 100, 100)}%` }} /></div>
          </div>

          <div className={`degree-card engineer ${credentialId === "engineer" ? "selected-degree" : ""}`}>
            <div>
              <span>Título de grado</span>
              <h3>{engineerCredential.title}</h3>
            </div>
            <strong>{earnedCredits}<small>/{planMinCredits}</small></strong>
            <div className="linear-progress"><i style={{ width: `${Math.min(earnedCredits / planMinCredits * 100, 100)}%` }} /></div>
          </div>

          <div className="requirement-heading">
            <div>
              <h3>Metas de créditos</h3>
              <span>Por título y área</span>
            </div>
            <div className="credential-switch" role="group" aria-label="Título para las metas detalladas">
              <button className={credentialId === "analyst" ? "active" : ""} onClick={() => setCredentialId("analyst")}>Analista</button>
              <button className={credentialId === "engineer" ? "active" : ""} onClick={() => setCredentialId("engineer")}>Ingeniería</button>
            </div>
          </div>
          <div className="requirements-overview">
            <span>{credential.title}</span>
            <strong>{credentialRequirementsMet}/{credentialRequirementsTotal} requisitos</strong>
            {suggestedAllocationCount > 0 && <small>{suggestedAllocationCount} áreas sugeridas en esta trayectoria</small>}
          </div>
          <div className="requirements-tree">
            <div className="required-activity"><span><b>Total de créditos</b><small>Requisito general del título</small></span><strong className={earnedCredits >= credential.minTotalCredits ? "met" : ""}>{earnedCredits}/{credential.minTotalCredits}</strong></div>
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
            {credential.requiredCourseGroups.map((group) => {
              const current = requiredCourseGroupProgress(group);
              const missing = group.courseIds.filter((id) => statuses[id] !== "exonerated").map((id) => activeCourses.find((course) => course.id === id)?.name ?? id);
              return <details className="required-course-group" key={group.id}>
                <summary><span><b>{group.label}</b><small>{current} de {group.minCompleted} completadas</small></span><strong className={current >= group.minCompleted ? "met" : ""}>{current}/{group.minCompleted}</strong></summary>
                <div className="required-course-body">
                  {missing.length ? <><p>Te faltan:</p><ul>{missing.map((name) => <li key={name}>{name}</li>)}</ul></> : <p className="all-complete">✓ Requisito completo</p>}
                  <a href={group.sourceUrl} target="_blank" rel="noreferrer">Ver fuente oficial de FING ↗</a>
                </div>
              </details>;
            })}
          </div>
          <p className="data-source">Las metas y el núcleo obligatorio provienen del plan, la implementación curricular de FING y la composición oficial de Bedelías.</p>
        </aside>

        <section className="curriculum-panel">
          {appMode === "planner" ? (
            <div className="planner-shell">
              <div className="planner-toolbar">
                <div>
                  <p className="eyebrow">Tu currícula, a tu ritmo</p>
                  <h2>Planificador</h2>
                  <span>{assignedPlannerIds.size} materias · {plannedCredits} créditos distribuidos</span>
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
                    const credits = term.courseIds.reduce((sum, id) => sum + (plannerCourses.find((course) => course.id === id)?.credits ?? 0), 0);
                    const maxCredits = Math.max(1, ...plannerTerms.map((item) => item.courseIds.reduce((sum, id) => sum + (plannerCourses.find((course) => course.id === id)?.credits ?? 0), 0)));
                    return <div className="load-row" key={term.id}><span>{term.label}</span><i><b style={{ width: `${credits / maxCredits * 100}%` }} /></i><strong>{credits} cr.</strong></div>;
                  })}
                </div>
              )}

              <div className="planner-layout">
                <aside className="course-catalog">
                  <div className="catalog-heading"><div><p className="eyebrow">Plan y optativas</p><h3>Materias disponibles</h3></div><span>{availablePlannerCourses.length}</span></div>
                  <div className="search-box planner-search">
                    <span aria-hidden="true">⌕</span>
                    <input aria-label="Buscar materias para planificar" value={plannerSearch} onChange={(event) => setPlannerSearch(event.target.value)} placeholder="Buscar por nombre, código o área" />
                    {plannerSearch && <button type="button" className="search-clear" onClick={() => setPlannerSearch("")} aria-label="Limpiar búsqueda">×</button>}
                  </div>
                  <p className="catalog-help">Arrastrá una materia o elegí su semestre. Los créditos se conservan tal como figuran en el plan.</p>
                  <div className="catalog-list">
                    {availablePlannerCourses.map((course) => (
                      <article className="catalog-course" key={course.id} draggable onDragStart={() => setDraggedCourseId(course.id)} onDragEnd={() => setDraggedCourseId(null)}>
                        <button className="catalog-course-main" onClick={() => setSelected(course)} aria-label={`Ver detalles de ${course.name}`}>
                          <span>#{course.id} · {courseAreaLabel(course)}</span>
                          <h4>{course.name}</h4>
                          <strong>{course.credits} cr.</strong>
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
                    const isCurrentTerm = currentPlannerTermId === term.id;
                    return (
                      <section className={"planner-term" + (isCurrentTerm ? " current" : "")} key={term.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedCourseId) assignPlannerCourse(draggedCourseId, term.id); setDraggedCourseId(null); }}>
                        <header>
                          <span>{String(termIndex + 1).padStart(2, "0")}</span>
                          <div>
                            <input value={term.label} onChange={(event) => renamePlannerTerm(term.id, event.target.value)} aria-label={`Nombre del semestre ${termIndex + 1}`} />
                            <p>{termCourses.length} materias · <strong>{termCredits} créditos planeados</strong></p>
                            {isCurrentTerm && <>
                              <div className="current-term-progress" role="progressbar" aria-label={"Progreso de " + term.label} aria-valuemin={0} aria-valuemax={termCredits} aria-valuenow={exoneratedCredits}><i style={{ width: (termCredits ? exoneratedCredits / termCredits * 100 : 0) + "%" }} /></div>
                              <p className="current-progress-copy"><strong>{exoneratedCredits}/{termCredits}</strong> créditos exonerados</p>
                            </>}
                            <button type="button" className={"current-term-button" + (isCurrentTerm ? " active" : "")} onClick={() => setCurrentPlannerTerm(term.id)}>{isCurrentTerm ? "Semestre actual" : "Marcar como actual"}</button>
                          </div>
                          <button className="remove-term" onClick={() => removePlannerTerm(term.id)} disabled={plannerTerms.length === 1} aria-label={`Eliminar ${term.label}`} title="Las materias vuelven al catálogo">×</button>
                        </header>
                        <div className="term-load"><i style={{ width: `${Math.min(termCredits / 45 * 100, 100)}%` }} /></div>
                        <div className="planned-course-list">
                          {termCourses.map((course) => {
                            const status = statuses[course.id] ?? "pending";
                            return <article className={`planned-course ${status}`} key={course.id} draggable onDragStart={() => setDraggedCourseId(course.id)} onDragEnd={() => setDraggedCourseId(null)}>
                              <button className="planned-course-info" onClick={() => setSelected(course)}>
                                <span>#{course.id} · {courseAreaLabel(course)}</span>
                                <h3>{course.name}</h3>
                              </button>
                              <div><strong>{course.credits} cr.</strong><button className="mini-status" onClick={() => cycleStatus(course)} title="Cambiar estado">{status === "pending" ? "○" : status === "approved" ? "◐" : "●"}</button><button onClick={() => unassignPlannerCourse(course.id)} aria-label={`Quitar ${course.name} del plan`}>×</button></div>
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
              <input aria-label="Buscar materia, código o área" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar materia, código o área" />
              {search && <button type="button" className="search-clear" onClick={() => setSearch("")} aria-label="Limpiar búsqueda" title="Limpiar búsqueda">×</button>}
            </div>
            {planYear === "1997" ? <label className="toggle-control">
              <input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
              <span /> Solo habilitadas
            </label> : <span className="rules-coverage">Previas publicadas: {new Set(plan2025Data.rules.map((rule) => rule.target.code)).size}/{courses.length} materias</span>}
            <div className="curriculum-navigation" role="group" aria-label="Navegar por semestres">
              <button type="button" onClick={() => moveCurriculum(-1)} disabled={curriculumEdges.atStart} aria-label="Ir al semestre anterior" title="Semestre anterior">←</button>
              <button type="button" onClick={() => moveCurriculum(1)} disabled={curriculumEdges.atEnd} aria-label="Ir al semestre siguiente" title="Semestre siguiente">→</button>
            </div>
            <div className="legend" aria-label="Estados de las materias">
              <span><i className="dot pending" /> Pendiente</span>
              <span title="Curso aprobado; todavía no suma créditos"><i className="dot approved" /> Aprobada · sin créditos</span>
              <span title="Unidad curricular completada; suma créditos"><i className="dot exonerated" /> Exonerada · suma créditos</span>
            </div>
          </div>

          <div className="curriculum-scroll" ref={curriculumScrollRef} tabIndex={0} aria-label="Trayectoria por semestres; usá las flechas o la barra inferior para desplazarte horizontalmente">
            <div className="semester-grid">
              {semesters.map((semester) => (
                <section className="semester-column" key={semester}>
                  <header>
                    <span>{semester === 0 ? "PI" : String(semester).padStart(2, "0")}</span>
                    <div><h2>{semester === 0 ? "Pre-semestre" : `${semester}º semestre`}</h2><p>{filtered(semester).reduce((sum, item) => sum + item.credits, 0)} créditos</p></div>
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
            </div>
          </div>

          {planYear === "1997" ? <section className="electives-section">
            <button className="electives-heading" onClick={() => setShowElectives((value) => !value)} aria-expanded={showElectives}>
              <div><span className="eyebrow">Trayectoria flexible</span><h2>Optativas y electivas</h2></div>
              <div><span>{filtered("opt").length} materias verificadas en la composición</span><b>{showElectives ? "−" : "+"}</b></div>
            </button>
            {showElectives && (
              <div className="electives-grid">
                {filtered("opt").map((course) => (
                  <CourseCard key={course.id} course={course} areaLabel={courseAreaLabel(course)} allocationStatus={courseAllocationStatus(course)} status={statuses[course.id] ?? "pending"} unlocked={isUnlocked(course)} rulesKnown={isCourseAvailabilityKnown(course)} fixed={isFixedPlacementTest(course)} sourceLabel={sourceLabel(course)} onCycle={() => cycleStatus(course)} onDetails={() => setSelected(course)} />
                ))}
              </div>
            )}
          </section> : <section className="plan-transition-note">
            <p className="eyebrow">Plan vigente · implementación en curso</p>
            <h2>Lo que todavía no tiene semestre publicado</h2>
            <p>{plan2025Data.trajectories[trajectoryId].notice ?? plan2025Data.plan.notice}</p>
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
              ? "Quedan " + rolloverIncompleteCourses.length + " materias sin exonerar, por " + rolloverIncompleteCredits + " créditos. ¿Querés moverlas al próximo semestre?"
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
        <div className="modal-backdrop" onClick={() => setImportError(null)}>
          <section className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-error-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-symbol" aria-hidden="true">!</div>
            <h2 id="import-error-title">{importError.title}</h2>
            <p>{importError.message}</p>
            <button type="button" className="primary-button" autoFocus onClick={() => setImportError(null)}>Entendido</button>
          </section>
        </div>
      )}

      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="details-drawer" onClick={(event) => event.stopPropagation()} aria-label={`Detalles de ${selected.name}`}>
            <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Cerrar detalles">×</button>
            <p className="eyebrow">{selected.id} · {courseAreaLabel(selected)}</p>
            <h2>{selected.name}</h2>
            <div className="drawer-stats"><div><span>Créditos</span><strong>{selected.credits}</strong></div><div><span>Estado</span><strong>{selected.placementTest ? (statuses.PI === "exonerated" ? "Acreditada" : "No acreditada") : stateLabels[statuses[selected.id] ?? "pending"]}</strong></div></div>
            {selectedAllocation?.status === "suggested" ? <p className="allocation-source suggested-allocation"><span>≈</span> Cuenta en <strong>{courseAreaLabel(selected)}</strong> mediante una asignación sugerida. Los créditos se computan normalmente, pero todavía falta un Anexo B o resolución específica para este plan.</p>
              : selectedAllocation?.status === "conflict" ? <p className="allocation-source conflict-allocation"><span>!</span> Hay fuentes oficiales en conflicto para esta asignación. Revisá los documentos antes de tomarla como definitiva.</p>
                : selectedAllocation && <p className="allocation-source official-allocation"><span>✓</span> Cuenta oficialmente en <strong>{courseAreaLabel(selected)}</strong> según Bedelías.</p>}
            {planYear === "1997" && selected.id === "PI" ? <p className="verified-source fing-source"><span>F</span> La <a href={plan1997PlacementTestSource} target="_blank" rel="noreferrer">trayectoria sugerida publicada por FING en 2025</a> explicita 4 créditos para quienes obtienen 60% o más.</p>
              : verifiedCourses.has(selected.id) ? <p className="verified-source"><span>✓</span> Materia incluida en la composición publicada por <strong>Bedelías</strong>.</p>
                : selected.dataStatus === "fing-trajectory" ? <p className="verified-source fing-source"><span>F</span> Materia y semestre publicados en la <a href={plan2025Data.source.curriculumPage} target="_blank" rel="noreferrer">trayectoria sugerida de FING</a>; Bedelías aún no publica su regla para este plan.</p>
                  : selected.dataStatus === "project-assumption" && <p className="verified-source fing-source"><span>!</span> Los 4 créditos se mantienen como supuesto del proyecto para el Plan 2025; la <a href={plan2025Data.source.curriculumPage} target="_blank" rel="noreferrer">trayectoria vigente de FING</a> confirma el corte de 60%, pero no explicita este crédito.</p>}
            <h3>{selectedAssessment === "exam" ? "Condiciones para rendir o exonerar" : "Condiciones para cursar"}</h3>
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
            ) : <p className="free-course">Sin una regla importada para esta instancia; no se presenta como validación oficial.</p>}
            {selectedDependents.length > 0 && <><h3>Puede habilitar o condicionar</h3><ul className="requirements-list dependent-list">
              {selectedDependents.map((course) => <li key={course.id}><span>→</span>{course.name}</li>)}
            </ul></>}
            {selected.offered.length > 0 && <><h3>Se dicta</h3><div className="offering-list">{selected.offered.map((item) => <span key={item}>{item}</span>)}</div></>}
            <button className="primary-button" disabled={!isUnlocked(selected) || isFixedPlacementTest(selected)} onClick={() => cycleStatus(selected)}>
              {isFixedPlacementTest(selected)
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

function CourseCard({ course, areaLabel, allocationStatus, status, unlocked, rulesKnown, fixed = false, sourceLabel, onCycle, onDetails }: { course: Course; areaLabel: string; allocationStatus?: AllocationStatus; status: CourseStatus; unlocked: boolean; rulesKnown: boolean; fixed?: boolean; sourceLabel?: "Bedelías" | "FING"; onCycle: () => void; onDetails: () => void }) {
  return (
    <article className={`course-card ${status} ${unlocked ? "unlocked" : "locked"}`}>
      <div className="course-topline">
        <span>#{course.id}{sourceLabel && <i className={`official-tag ${sourceLabel === "FING" ? "fing-tag" : ""}`}>{sourceLabel}</i>}</span>
        <button onClick={onDetails} aria-label={`Ver detalles de ${course.name}`}>i</button>
      </div>
      <h3>{course.name}</h3>
      <div className="course-meta"><span>{areaLabel}{allocationStatus === "suggested" && <i className="suggested-badge">sugerida</i>}</span><strong>{course.credits} cr.</strong></div>
      <button className="status-button" disabled={!unlocked || fixed} onClick={onCycle}>
        {fixed
          ? <><span className="status-mark">✓</span>Acreditada por trayectoria · 4 cr.</>
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
