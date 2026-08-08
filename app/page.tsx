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
  programSources: Array<{ courseCode: string; courseName: string; area: string; url: string }>;
  courses: Array<{ code: string; name: string; credits: number; eligibleRequirementIds: string[]; creditAllocations: CreditAllocation[] }>;
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
  { id: "1730-A", name: "Proyecto de Grado · primera etapa", credits: 15, semester: 9, area: "Integradora", prerequisites: ["1721"], minCredits: 270, offered: ["impar", "par"] },
  { id: "1730-B", name: "Proyecto de Grado · segunda etapa", credits: 15, semester: 10, area: "Integradora", prerequisites: ["1730-A"], offered: ["impar", "par"] },
  { id: "1354", name: "Programación Funcional", credits: 10, semester: "opt", area: "Programación", elective: true, prerequisites: ["1324"], offered: ["impar"] },
  { id: "1866", name: "Aprendizaje Automático", credits: 10, semester: "opt", area: "Fundamentos", elective: true, prerequisites: ["1025", "1323"], offered: ["par"] },
  { id: "1434", name: "Computación de Alta Performance", credits: 10, semester: "opt", area: "Sistemas", elective: true, prerequisites: ["1537"], offered: ["impar"] },
  { id: "1316", name: "Introducción a la Computación Gráfica", credits: 10, semester: "opt", area: "Programación", elective: true, prerequisites: ["1323", "1031"], offered: ["impar"] },
  { id: "1545", name: "Criptografía", credits: 10, semester: "opt", area: "Fundamentos", elective: true, prerequisites: ["1027"], offered: ["par"] },
  { id: "1926", name: "Sistemas de Información Geográfica", credits: 8, semester: "opt", area: "Datos", elective: true, prerequisites: ["1911"], offered: ["impar"] },
];

const plan1997VerifiedCourses = new Map(bedeliasData.courses.map((course) => [course.code, course]));
const plan1997Courses: Course[] = plan1997BaseCourses.map((course) => {
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

function expressionSatisfied(expression: RequirementExpression, statuses: Record<string, CourseStatus>, earnedCredits: number): boolean {
  if (expression.kind === "all") return expression.children.every((child) => expressionSatisfied(child, statuses, earnedCredits));
  if (expression.kind === "any") return expression.children.some((child) => expressionSatisfied(child, statuses, earnedCredits));
  if (expression.kind === "none") return !expression.children.some((child) => expressionSatisfied(child, statuses, earnedCredits));
  if (expression.creditRequirement) return earnedCredits >= expression.creditRequirement.minimum;
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

type RequirementRow = { key: string; label: string; alternatives?: string[]; done: boolean };

function expressionOptions(expression: RequirementExpression, courses: Course[], courseIds: Set<string>) {
  const localOptions = expression.options.filter((option) => courseIds.has(option.code));
  const displayOptions = localOptions.length ? localOptions : expression.options.slice(0, 3);
  return displayOptions.map((option) => describeOption(option, courses));
}

function describeExpression(expression: RequirementExpression, courses: Course[], courseIds: Set<string>): string {
  if (expression.creditRequirement) return `${expression.creditRequirement.minimum} créditos acumulados en el plan`;
  if (expression.kind === "none") {
    const options = expression.children.flatMap((child) => child.options).slice(0, 3);
    return options.length ? options.map((option) => describeExcludedOption(option, courses)).join(" o ") : "No cumplir una condición excluyente";
  }
  if (expression.kind === "all") return expression.children.map((child) => describeExpression(child, courses, courseIds)).filter(Boolean).join(" y ");
  if (expression.kind === "any") return expression.children.map((child) => describeExpression(child, courses, courseIds)).filter(Boolean).join(" o ");
  const displayOptions = expressionOptions(expression, courses, courseIds);
  return displayOptions.length ? displayOptions.join(" o ") : expression.label;
}

function requirementRows(expression: RequirementExpression, statuses: Record<string, CourseStatus>, earnedCredits: number, courses: Course[], courseIds: Set<string>, prefix = "r"): RequirementRow[] {
  if (expression.kind === "all") return expression.children.flatMap((child, index) => requirementRows(child, statuses, earnedCredits, courses, courseIds, `${prefix}-${index}`));
  if (expression.kind === "none") {
    const alternatives = expression.children.flatMap((child) => expressionOptions(child, courses, courseIds)).slice(0, 3);
    return [{ key: prefix, label: alternatives.length ? "No tener aprobada ninguna de estas equivalencias" : "No cumplir una condición excluyente", alternatives, done: expressionSatisfied(expression, statuses, earnedCredits) }];
  }
  if (expression.kind === "any") {
    const alternatives = expression.children.map((child) => describeExpression(child, courses, courseIds)).filter(Boolean);
    return [{ key: prefix, label: "Cumplir una de estas opciones", alternatives, done: expressionSatisfied(expression, statuses, earnedCredits) }];
  }
  const alternatives = expressionOptions(expression, courses, courseIds);
  if (alternatives.length > 1) {
    const minimum = expression.minimum ?? 1;
    const label = minimum === 1 ? "Cumplir una de estas opciones" : `Cumplir al menos ${minimum} de estas opciones`;
    return [{ key: prefix, label, alternatives, done: expressionSatisfied(expression, statuses, earnedCredits) }];
  }
  return [{ key: prefix, label: describeExpression(expression, courses, courseIds), done: expressionSatisfied(expression, statuses, earnedCredits) }];
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

export default function Home() {
  const [planYear, setPlanYear] = useState<PlanId>("2025");
  const [trajectoryId, setTrajectoryId] = useState("pi-60-plus");
  const [progress, setProgress] = useState<PlanProgress>({ 1997: {}, 2025: {} });
  const [credentialId, setCredentialId] = useState<CredentialId>("engineer");
  const [selected, setSelected] = useState<Course | null>(null);
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showElectives, setShowElectives] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const verticalScrollTargetRef = useRef(0);
  const verticalScrollFrameRef = useRef<number | null>(null);

  const courses = useMemo(
    () => planYear === "2025" ? buildPlan2025Courses(trajectoryId) : plan1997Courses,
    [planYear, trajectoryId],
  );
  const storedStatuses = progress[planYear] ?? {};
  const statuses = useMemo(
    () => planYear === "2025" && trajectoryId === "pi-60-plus"
      ? { ...storedStatuses, PI: "exonerated" as CourseStatus }
      : storedStatuses,
    [planYear, trajectoryId, storedStatuses],
  );
  const courseIds = useMemo(() => new Set(courses.map((course) => course.id)), [courses]);
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
    } catch {
      // A damaged local save should never prevent the curriculum from loading.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress, hydrated]);

  useEffect(() => {
    verticalScrollTargetRef.current = window.scrollY;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const animateToTarget = () => {
      const distance = verticalScrollTargetRef.current - window.scrollY;
      if (Math.abs(distance) < 0.5) {
        window.scrollTo(0, verticalScrollTargetRef.current);
        verticalScrollFrameRef.current = null;
        return;
      }
      window.scrollTo(0, window.scrollY + distance * 0.2);
      verticalScrollFrameRef.current = window.requestAnimationFrame(animateToTarget);
    };

    const canScrollInside = (target: EventTarget | null, delta: number) => {
      let element = target instanceof HTMLElement ? target : null;
      while (element && element !== document.body) {
        const overflowY = window.getComputedStyle(element).overflowY;
        const isScrollable = /auto|scroll/.test(overflowY) && element.scrollHeight > element.clientHeight + 1;
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
      if (verticalScrollFrameRef.current === null) verticalScrollFrameRef.current = window.requestAnimationFrame(animateToTarget);
    };

    const syncTarget = () => {
      if (verticalScrollFrameRef.current === null) verticalScrollTargetRef.current = window.scrollY;
    };
    document.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", syncTarget, { passive: true });
    return () => {
      document.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", syncTarget);
      if (verticalScrollFrameRef.current !== null) window.cancelAnimationFrame(verticalScrollFrameRef.current);
      verticalScrollFrameRef.current = null;
    };
  }, []);

  const earnedCredits = useMemo(
    () => courses.reduce((sum, course) => statuses[course.id] === "exonerated" ? sum + course.credits : sum, 0),
    [courses, statuses],
  );

  const allocationBelongsTo = (allocationNodeId: string, targetNodeId: string) => {
    let current = nodeById.get(allocationNodeId);
    while (current) {
      if (current.id === targetNodeId) return true;
      current = current.parentId ? nodeById.get(current.parentId) : undefined;
    }
    return false;
  };
  const nodeCredits = (nodeId: string) => courses.reduce((total, course) => {
    if (statuses[course.id] !== "exonerated") return total;
    const contribution = (course.creditAllocations ?? [])
      .filter((allocation) => allocationBelongsTo(allocation.nodeId, nodeId))
      .reduce((sum, allocation) => sum + allocation.credits, 0);
    return total + Math.min(course.credits, contribution);
  }, 0);
  const courseAreaLabel = (course: Course) => {
    const allocation = course.creditAllocations?.[0];
    return allocation ? (nodeById.get(allocation.nodeId)?.shortName ?? nodeById.get(allocation.nodeId)?.name ?? "Área sin nombre") : "Área pendiente";
  };
  const courseAllocationStatus = (course: Course): AllocationStatus | undefined => course.creditAllocations?.[0]?.status;
  const hasCredentialRequirement = (nodeId: string) => credentialTargets.has(nodeId)
    || requirementNodes.some((node) => node.parentId === nodeId && hasCredentialRequirement(node.id));
  const rootRequirementNodes = requirementNodes.filter((node) => node.parentId === null && hasCredentialRequirement(node.id));
  const suggestedAllocationCount = courses.filter((course) => courseAllocationStatus(course) === "suggested").length;
  const activityProgress = (activity: Credential["requiredActivities"][number]) => activity.courseIds.reduce((sum, id) => {
    const course = courses.find((item) => item.id === id);
    return sum + (course && statuses[id] === "exonerated" ? course.credits : 0);
  }, 0);
  const countableNodeRequirements = credential.nodeRequirements.filter((requirement) => requirement.minCredits > 0);
  const credentialRequirementsMet = countableNodeRequirements.filter((requirement) => nodeCredits(requirement.nodeId) >= requirement.minCredits).length
    + credential.requiredActivities.filter((activity) => activityProgress(activity) >= activity.minCredits).length;
  const credentialRequirementsTotal = countableNodeRequirements.length + credential.requiredActivities.length;

  const isComplete = (id: string) => statuses[id] === "approved" || statuses[id] === "exonerated";
  const isFixedPlacementTest = (course: Course) => planYear === "2025" && trajectoryId === "pi-60-plus" && course.id === "PI";
  const isRequirementComplete = (id: string) => id === "MI2"
    ? isComplete("MI2") || statuses.PI === "exonerated"
    : isComplete(id);
  const officialRule = (course: Course, assessment: "course" | "exam") => verifiedRules.get(`${course.id}:${assessment}`);
  const isCourseUnlocked = (course: Course) => {
    if (course.placementTest) return true;
    const rule = officialRule(course, "course");
    if (rule) return expressionSatisfied(rule.expression, statuses, earnedCredits);
    return (course.prerequisites ?? []).every(isRequirementComplete) && (!course.minCredits || earnedCredits >= course.minCredits);
  };
  const isExamUnlocked = (course: Course) => {
    const rule = officialRule(course, "exam");
    return rule ? expressionSatisfied(rule.expression, statuses, earnedCredits) : true;
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
    return matchesSemester && matchesSearch && !isReplacedByPlacementTest && (!availableOnly || isUnlocked(course));
  });

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify({ career: `ingenieria-computacion-${planYear}`, plan: planYear, trajectory: trajectoryId, statuses }, null, 2)], { type: "application/json" });
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
        const parsed = JSON.parse(String(reader.result));
        if (parsed.statuses && typeof parsed.statuses === "object") setStatuses(parsed.statuses);
      } catch {
        window.alert("No pudimos leer ese archivo de progreso.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const resetProgress = () => {
    if (window.confirm(`¿Querés borrar el progreso guardado para el Plan ${planYear}?`)) setStatuses({});
  };

  const selectedStatus = selected ? statuses[selected.id] ?? "pending" : "pending";
  const selectedAssessment: "course" | "exam" = selectedStatus === "approved" ? "exam" : "course";
  const selectedRule = selected ? officialRule(selected, selectedAssessment) : undefined;
  const selectedAllocation = selected?.creditAllocations?.[0];
  const selectedRows = selectedRule ? requirementRows(selectedRule.expression, statuses, earnedCredits, courses, courseIds) : [];
  const selectedDependents = selected ? courses.filter((course) => {
    if (course.id === selected.id) return false;
    if (course.prerequisites?.includes(selected.id)) return true;
    const courseRule = officialRule(course, "course");
    return Boolean(courseRule && expressionReferencesCode(courseRule.expression, selected.id));
  }) : [];
  const sourceLabel = (course: Course): "Bedelías" | "FING" | undefined => {
    if (planYear === "1997") return course.id === "PI" ? "FING" : verifiedCourses.has(course.id) ? "Bedelías" : undefined;
    return course.dataStatus === "bedelias-composition" ? "Bedelías" : course.dataStatus === "fing-trajectory" ? "FING" : undefined;
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <img src="/udelar.svg" alt="Universidad de la República" className="udelar-logo" />
          <span className="brand-separator" aria-hidden="true" />
          <div>
            <p className="eyebrow">Proyecto estudiantil no oficial</p>
            <h1>Trayecto</h1>
          </div>
        </div>
        <div className="header-actions">
          <button className="quiet-button" onClick={() => importRef.current?.click()}>Importar</button>
          <button className="quiet-button" onClick={exportProgress}>Exportar</button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={importProgress} />
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
            <label>
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
            </label>
          </div>
          {planYear === "2025" ? (
            <p className="pilot-note"><span /> {plan2025Data.trajectories[trajectoryId].description} Bedelías confirma el plan vigente, pero su composición y sus previaturas todavía están incompletas.</p>
          ) : (
            <p className="pilot-note"><span /> Semestres de la trayectoria sugerida compartida. Créditos y reglas de 29 materias importados de Bedelías el 08/08/2026; metas por área aún en revisión.</p>
          )}
        </div>

        <div className="credit-summary">
          <div className="credit-ring" style={{ "--progress": `${Math.min(earnedCredits / planMinCredits * 100, 100)}%` } as React.CSSProperties}>
            <div><strong>{earnedCredits}</strong><span>de {planMinCredits}</span></div>
          </div>
          <div>
            <p>Créditos obtenidos</p>
            <strong>{Math.round(earnedCredits / planMinCredits * 100)}% de la carrera</strong>
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
          </div>
          <p className="data-source">Las metas provienen del plan y de la composición oficial. Las asignaciones sugeridas cuentan normalmente y quedan identificadas en cada materia.</p>
        </aside>

        <section className="curriculum-panel">
          <div className="toolbar">
            <label className="search-box">
              <svg className="search-icon" aria-hidden="true" viewBox="0 0 20 20">
                <circle cx="8.5" cy="8.5" r="5.25" />
                <path d="m12.4 12.4 4.1 4.1" />
              </svg>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar materia, código o área" />
            </label>
            {planYear === "1997" ? <label className="toggle-control">
              <input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
              <span /> Solo habilitadas
            </label> : <span className="rules-coverage">Previas publicadas: {new Set(plan2025Data.rules.map((rule) => rule.target.code)).size}/{courses.length} materias</span>}
            <div className="legend" aria-label="Estados de las materias">
              <span><i className="dot pending" /> Pendiente</span>
              <span title="Curso aprobado; todavía no suma créditos"><i className="dot approved" /> Aprobada · sin créditos</span>
              <span title="Unidad curricular completada; suma créditos"><i className="dot exonerated" /> Exonerada · suma créditos</span>
            </div>
          </div>

          <div className="curriculum-scroll" tabIndex={0} aria-label="Trayectoria por semestres; desplazamiento horizontal disponible con la barra inferior">
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
                      <CourseCard key={course.id} course={course} areaLabel={courseAreaLabel(course)} allocationStatus={courseAllocationStatus(course)} status={statuses[course.id] ?? "pending"} unlocked={isUnlocked(course)} fixed={isFixedPlacementTest(course)} sourceLabel={sourceLabel(course)} onCycle={() => cycleStatus(course)} onDetails={() => setSelected(course)} />
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
              <div><span>{filtered("opt").length} materias en el catálogo piloto</span><b>{showElectives ? "−" : "+"}</b></div>
            </button>
            {showElectives && (
              <div className="electives-grid">
                {filtered("opt").map((course) => (
                  <CourseCard key={course.id} course={course} areaLabel={courseAreaLabel(course)} allocationStatus={courseAllocationStatus(course)} status={statuses[course.id] ?? "pending"} unlocked={isUnlocked(course)} fixed={isFixedPlacementTest(course)} sourceLabel={sourceLabel(course)} onCycle={() => cycleStatus(course)} onDetails={() => setSelected(course)} />
                ))}
              </div>
            )}
          </section> : <section className="plan-transition-note">
            <p className="eyebrow">Plan vigente · implementación en curso</p>
            <h2>Lo que todavía no tiene semestre publicado</h2>
            <p>{plan2025Data.trajectories[trajectoryId].notice ?? plan2025Data.plan.notice}</p>
            <a href={plan2025Data.source.curriculumPage} target="_blank" rel="noreferrer">Ver documentación oficial de FING ↗</a>
          </section>}
        </section>
      </section>

      <footer>
        <p>Trayecto es un proyecto estudiantil independiente. La información oficial prevalece siempre sobre este prototipo.</p>
        <a href="https://bedelias.udelar.edu.uy/" target="_blank" rel="noreferrer">Consultar Bedelías ↗</a>
      </footer>

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
                    {row.alternatives?.length ? <ul className="requirement-alternatives">
                      {row.alternatives.map((alternative, index) => <li key={`${row.key}-option-${index}`}>{alternative}</li>)}
                    </ul> : null}
                  </div>
                </li>)}
              </ul> : <p className="free-course">Bedelías no publica condiciones adicionales para esta instancia.</p>
            ) : (selected.prerequisites?.length || selected.minCredits) ? (
              <ul className="requirements-list">
                {selected.prerequisites?.map((id) => {
                  const prerequisite = courses.find((course) => course.id === id);
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

function CourseCard({ course, areaLabel, allocationStatus, status, unlocked, fixed = false, sourceLabel, onCycle, onDetails }: { course: Course; areaLabel: string; allocationStatus?: AllocationStatus; status: CourseStatus; unlocked: boolean; fixed?: boolean; sourceLabel?: "Bedelías" | "FING"; onCycle: () => void; onDetails: () => void }) {
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
          : !unlocked
          ? <><span className="lock-mark">⌑</span>{status === "approved" ? "Examen no habilitado" : "No habilitada"}</>
          : course.placementTest
            ? <><span className="status-mark">{status === "exonerated" ? "✓" : "□"}</span>{status === "exonerated" ? "Acreditada · suma 4 cr." : "Acreditar prueba"}</>
            : <><span className="status-mark">{status === "pending" ? "○" : status === "approved" ? "◐" : "●"}</span>{stateLabels[status]}</>}
      </button>
    </article>
  );
}
