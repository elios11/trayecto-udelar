"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import bedeliasDataJson from "./data/computacion-1997-bedelias.json";
import plan2025DataJson from "./data/computacion-2025-fing.json";

type CourseStatus = "pending" | "approved" | "exonerated";

type Course = {
  id: string;
  name: string;
  credits: number;
  semester: number | "opt";
  area: string;
  prerequisites?: string[];
  minCredits?: number;
  offered: Array<"impar" | "par" | "libre">;
  elective?: boolean;
  placementTest?: boolean;
  engineeringOnly?: boolean;
  dataStatus?: "bedelias-composition" | "fing-trajectory";
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
  source: { extractedAt: string; contentHash: string };
  plan: { minCredits: number; colibriUrl: string };
  courses: Array<{ code: string; name: string; credits: number }>;
  rules: VerifiedRule[];
};

type Plan2025Projection = {
  source: { reviewedAt: string; curriculumPage: string; bedeliasExtractedAt: string };
  plan: { minCredits: number; intermediateCredits: number; intermediateTitle: string; degreeTitle: string; notice: string; bedeliasCompositionCourses: number; publishedRules: number };
  areaTargets: Array<{ id: string; name: string; target: number }>;
  courses: Array<{ id: string; name: string; credits: number; area: string; engineeringOnly?: boolean; dataStatus: "bedelias-composition" | "fing-trajectory" }>;
  trajectories: Record<string, { label: string; description: string; semesters: string[][] }>;
  rules: VerifiedRule[];
};

const bedeliasData = bedeliasDataJson as unknown as BedeliasProjection;
const plan2025Data = plan2025DataJson as unknown as Plan2025Projection;

const plan1997BaseCourses: Course[] = [
  { id: "PI", name: "Prueba Inicial", credits: 4, semester: 0, area: "Matemática", placementTest: true, offered: ["impar", "par"] },
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
  const official = plan1997VerifiedCourses.get(course.id);
  return official ? { ...course, credits: official.credits } : course;
});

function buildPlan2025Courses(trajectoryId: string): Course[] {
  const trajectory = plan2025Data.trajectories[trajectoryId] ?? plan2025Data.trajectories["pi-60-plus"];
  const semesters = new Map<string, number>();
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

function describeOption(option: RequirementOption, courses: Course[]) {
  const course = courses.find((item) => item.id === option.code);
  const name = course?.name ?? option.name;
  const evidence = option.assessment === "exam" ? "examen aprobado"
    : option.assessment === "course" ? "curso aprobado"
      : option.assessment === "exam-enrollment" ? "inscripción a examen"
        : "inscripción a curso";
  return `${name} · ${evidence}`;
}

function describeExpression(expression: RequirementExpression, courses: Course[], courseIds: Set<string>): string {
  if (expression.creditRequirement) return `${expression.creditRequirement.minimum} créditos acumulados en el plan`;
  if (expression.kind === "none") {
    const options = expression.children.flatMap((child) => child.options).slice(0, 3);
    return options.length ? `No tener: ${options.map((option) => describeOption(option, courses)).join(" o ")}` : "No cumplir una condición excluyente";
  }
  if (expression.kind === "all") return expression.children.map((child) => describeExpression(child, courses, courseIds)).filter(Boolean).join(" y ");
  if (expression.kind === "any") return expression.children.map((child) => describeExpression(child, courses, courseIds)).filter(Boolean).join(" o ");
  const localOptions = expression.options.filter((option) => courseIds.has(option.code));
  const displayOptions = localOptions.length ? localOptions : expression.options.slice(0, 3);
  return displayOptions.length ? displayOptions.map((option) => describeOption(option, courses)).join(" o ") : expression.label;
}

function requirementRows(expression: RequirementExpression, statuses: Record<string, CourseStatus>, earnedCredits: number, courses: Course[], courseIds: Set<string>, prefix = "r"): Array<{ key: string; label: string; done: boolean }> {
  if (expression.kind === "all") return expression.children.flatMap((child, index) => requirementRows(child, statuses, earnedCredits, courses, courseIds, `${prefix}-${index}`));
  return [{ key: prefix, label: describeExpression(expression, courses, courseIds), done: expressionSatisfied(expression, statuses, earnedCredits) }];
}

const plan1997AreaTargets = [
  { name: "Matemática", target: 60 },
  { name: "Fundamentos", target: 60 },
  { name: "Programación", target: 70 },
  { name: "Sistemas", target: 50 },
  { name: "Software", target: 20 },
  { name: "Datos", target: 15 },
  { name: "Integradora", target: 30 },
  { name: "Gestión", target: 15 },
];

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
  const [selected, setSelected] = useState<Course | null>(null);
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showElectives, setShowElectives] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const courses = useMemo(
    () => planYear === "2025" ? buildPlan2025Courses(trajectoryId) : plan1997Courses,
    [planYear, trajectoryId],
  );
  const statuses = progress[planYear] ?? {};
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
  const areaTargets = planYear === "2025"
    ? plan2025Data.areaTargets.map((area) => ({ name: area.id, label: area.name, target: area.target }))
    : plan1997AreaTargets.map((area) => ({ ...area, label: area.name }));
  const semesters = planYear === "2025" ? [1, 2, 3, 4, 5, 6, 7, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const planMinCredits = planYear === "2025" ? plan2025Data.plan.minCredits : bedeliasData.plan.minCredits;
  const intermediateCredits = planYear === "2025" ? plan2025Data.plan.intermediateCredits : 270;
  const intermediateTitle = planYear === "2025" ? plan2025Data.plan.intermediateTitle : "Analista en Computación";

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

  const earnedCredits = useMemo(
    () => courses.reduce((sum, course) => statuses[course.id] === "exonerated" ? sum + course.credits : sum, 0),
    [courses, statuses],
  );

  const isComplete = (id: string) => statuses[id] === "approved" || statuses[id] === "exonerated";
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
    if (!isUnlocked(course)) return;
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
    const matchesSearch = `${course.id} ${course.name} ${course.area}`.toLowerCase().includes(search.toLowerCase());
    const isReplacedByPlacementTest = course.id === "MI2" && statuses.PI === "exonerated";
    return matchesSemester && matchesSearch && !isReplacedByPlacementTest && (!availableOnly || isUnlocked(course));
  });

  const areaCredits = (area: string) => courses.reduce(
    (sum, course) => course.area === area && statuses[course.id] === "exonerated" ? sum + course.credits : sum,
    0,
  );

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
  const selectedRows = selectedRule ? requirementRows(selectedRule.expression, statuses, earnedCredits, courses, courseIds) : [];

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
              <select value={trajectoryId} onChange={(event) => { setTrajectoryId(event.target.value); setSelected(null); }}>
                {planYear === "2025" ? Object.entries(plan2025Data.trajectories).map(([id, trajectory]) => (
                  <option value={id} key={id}>{trajectory.label}</option>
                )) : <option value="pi-20-59">Ingreso 1er semestre · PI 20–59%</option>}
              </select>
            </label>
          </div>
          {planYear === "2025" ? (
            <p className="pilot-note"><span /> Trayectoria oficial publicada por FING para la generación 2026. Bedelías confirma el plan vigente, pero su composición y sus previaturas todavía están incompletas.</p>
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

          <div className="degree-card analyst">
            <div>
              <span>Título intermedio</span>
              <h3>{intermediateTitle}</h3>
            </div>
            <strong>{Math.min(earnedCredits, intermediateCredits)}<small>/{intermediateCredits}</small></strong>
            <div className="linear-progress"><i style={{ width: `${Math.min(earnedCredits / intermediateCredits * 100, 100)}%` }} /></div>
          </div>

          <div className="degree-card engineer">
            <div>
              <span>Título de grado</span>
              <h3>Ingeniero/a en Computación</h3>
            </div>
            <strong>{earnedCredits}<small>/{planMinCredits}</small></strong>
            <div className="linear-progress"><i style={{ width: `${Math.min(earnedCredits / planMinCredits * 100, 100)}%` }} /></div>
          </div>

          <div className="area-heading">
            <h3>Créditos por área</h3>
            <span>{planYear === "2025" ? "Plan oficial" : "Metas demo"}</span>
          </div>
          <div className="area-list">
            {areaTargets.map((area) => {
              const current = areaCredits(area.name);
              return (
                <div className="area-row" key={area.name}>
                  <div><span>{area.label}</span><strong>{current}/{area.target}</strong></div>
                  <div className="area-track"><i style={{ width: `${Math.min(current / area.target * 100, 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
          <p className="data-source">{planYear === "2025" ? "Los mínimos por área provienen del Plan 2025. La suma total también requiere perfil, optativas, formación complementaria y proyecto final." : "Progreso guardado únicamente en este navegador."}</p>
        </aside>

        <section className="curriculum-panel">
          <div className="toolbar">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
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

          <div className="curriculum-scroll">
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
                      <CourseCard key={course.id} course={course} status={statuses[course.id] ?? "pending"} unlocked={isUnlocked(course)} sourceLabel={verifiedCourses.has(course.id) ? "Bedelías" : planYear === "2025" ? "FING" : undefined} onCycle={() => cycleStatus(course)} onDetails={() => setSelected(course)} />
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
                  <CourseCard key={course.id} course={course} status={statuses[course.id] ?? "pending"} unlocked={isUnlocked(course)} sourceLabel={verifiedCourses.has(course.id) ? "Bedelías" : undefined} onCycle={() => cycleStatus(course)} onDetails={() => setSelected(course)} />
                ))}
              </div>
            )}
          </section> : <section className="plan-transition-note">
            <p className="eyebrow">Plan vigente · implementación en curso</p>
            <h2>Lo que todavía no tiene semestre publicado</h2>
            <p>{plan2025Data.plan.notice}</p>
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
            <p className="eyebrow">{selected.id} · {selected.area}</p>
            <h2>{selected.name}</h2>
            <div className="drawer-stats"><div><span>Créditos</span><strong>{selected.credits}</strong></div><div><span>Estado</span><strong>{selected.placementTest ? (statuses.PI === "exonerated" ? "Acreditada" : "No acreditada") : stateLabels[statuses[selected.id] ?? "pending"]}</strong></div></div>
            {verifiedCourses.has(selected.id) ? <p className="verified-source"><span>✓</span> Materia incluida en la composición publicada por <a href="https://bedelias.udelar.edu.uy/" target="_blank" rel="noreferrer">Bedelías</a>.</p>
              : planYear === "2025" && <p className="verified-source fing-source"><span>F</span> Materia y semestre publicados en la <a href={plan2025Data.source.curriculumPage} target="_blank" rel="noreferrer">trayectoria sugerida de FING</a>; Bedelías aún no publica su regla para este plan.</p>}
            <h3>{selectedAssessment === "exam" ? "Condiciones para rendir o exonerar" : "Condiciones para cursar"}</h3>
            {selectedRule ? (
              selectedRows.length ? <ul className="requirements-list">
                {selectedRows.map((row) => <li className={row.done ? "done" : "missing"} key={row.key}><span>{row.done ? "✓" : "○"}</span>{row.label}</li>)}
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
            {selected.offered.length > 0 && <><h3>Se dicta</h3><div className="offering-list">{selected.offered.map((item) => <span key={item}>{item}</span>)}</div></>}
            <button className="primary-button" disabled={!isUnlocked(selected)} onClick={() => cycleStatus(selected)}>
              {selected.placementTest
                ? (statuses.PI === "exonerated" ? "Desmarcar Prueba Inicial" : "Acreditar Prueba Inicial")
                : isUnlocked(selected) ? `Marcar como ${(statuses[selected.id] ?? "pending") === "pending" ? "aprobada" : (statuses[selected.id] ?? "pending") === "approved" ? "exonerada" : "pendiente"}` : selectedStatus === "approved" ? "Examen aún no habilitado" : "Materia aún no habilitada"}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}

function CourseCard({ course, status, unlocked, sourceLabel, onCycle, onDetails }: { course: Course; status: CourseStatus; unlocked: boolean; sourceLabel?: "Bedelías" | "FING"; onCycle: () => void; onDetails: () => void }) {
  return (
    <article className={`course-card ${status} ${unlocked ? "unlocked" : "locked"}`}>
      <div className="course-topline">
        <span>#{course.id}{sourceLabel && <i className={`official-tag ${sourceLabel === "FING" ? "fing-tag" : ""}`}>{sourceLabel}</i>}</span>
        <button onClick={onDetails} aria-label={`Ver detalles de ${course.name}`}>i</button>
      </div>
      <h3>{course.name}</h3>
      <div className="course-meta"><span>{course.area}</span><strong>{course.credits} cr.</strong></div>
      <button className="status-button" disabled={!unlocked} onClick={onCycle}>
        {!unlocked
          ? <><span className="lock-mark">⌑</span>{status === "approved" ? "Examen no habilitado" : "No habilitada"}</>
          : course.placementTest
            ? <><span className="status-mark">{status === "exonerated" ? "✓" : "□"}</span>{status === "exonerated" ? "Acreditada · suma 4 cr." : "Acreditar prueba"}</>
            : <><span className="status-mark">{status === "pending" ? "○" : status === "approved" ? "◐" : "●"}</span>{stateLabels[status]}</>}
      </button>
    </article>
  );
}
