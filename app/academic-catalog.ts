export type CredentialId = "analyst" | "engineer" | "pharmacist" | "architect" | "visual-designer" | "industrial-designer";

export type PlanId = "1997" | "2025" | "electrica-2023" | "civil-2021" | "qf-2015" | "fadu-arquitectura-2015" | "fadu-ldcv-2007" | "fadu-ldind-2013";
export type FacultyId = "fing" | "fq" | "fadu";
export type CareerId = "computacion" | "electrica" | "civil" | "quimica-farmaceutica" | "arquitectura" | "ldcv" | "ldind";

export type AcademicPlanOption = {
  id: PlanId;
  label: string;
  defaultTrajectoryId: string;
  defaultCredentialId: CredentialId;
};

export type AcademicCareerOption = {
  id: CareerId;
  label: string;
  plans: AcademicPlanOption[];
};

export type AcademicFacultyOption = {
  id: FacultyId;
  label: string;
  careers: AcademicCareerOption[];
};

export const academicCatalog: AcademicFacultyOption[] = [
  {
    id: "fing",
    label: "Facultad de Ingeniería",
    careers: [
      {
        id: "computacion",
        label: "Ingeniería en Computación",
        plans: [
          { id: "2025", label: "Plan 2025 · vigente, en transición", defaultTrajectoryId: "pi-60-plus", defaultCredentialId: "engineer" },
          { id: "1997", label: "Plan 1997 · histórico", defaultTrajectoryId: "pi-20-59", defaultCredentialId: "engineer" },
        ],
      },
      {
        id: "electrica",
        label: "Ingeniería Eléctrica",
        plans: [
          { id: "electrica-2023", label: "Plan 2023 · vigente", defaultTrajectoryId: "basic", defaultCredentialId: "engineer" },
        ],
      },
      {
        id: "civil",
        label: "Ingeniería Civil",
        plans: [
          { id: "civil-2021", label: "Plan 2021 · vigente", defaultTrajectoryId: "construction", defaultCredentialId: "engineer" },
        ],
      },
    ],
  },
  {
    id: "fq",
    label: "Facultad de Química",
    careers: [{
      id: "quimica-farmaceutica",
      label: "Química Farmacéutica",
      plans: [{ id: "qf-2015", label: "Plan 2015 · vigente", defaultTrajectoryId: "suggested", defaultCredentialId: "pharmacist" }],
    }],
  },
  {
    id: "fadu",
    label: "Facultad de Arquitectura, Diseño y Urbanismo",
    careers: [
      {
        id: "arquitectura",
        label: "Arquitectura",
        plans: [{ id: "fadu-arquitectura-2015", label: "Plan 2015 · vigente", defaultTrajectoryId: "flexible", defaultCredentialId: "architect" }],
      },
      {
        id: "ldcv",
        label: "Licenciatura en Diseño de Comunicación Visual",
        plans: [{ id: "fadu-ldcv-2007", label: "Plan 2007 · vigente", defaultTrajectoryId: "current-2026", defaultCredentialId: "visual-designer" }],
      },
      {
        id: "ldind",
        label: "Licenciatura en Diseño Industrial",
        plans: [{ id: "fadu-ldind-2013", label: "Plan 2013 · vigente", defaultTrajectoryId: "product", defaultCredentialId: "industrial-designer" }],
      },
    ],
  },
];

export const academicPlanIds = academicCatalog.flatMap((faculty) =>
  faculty.careers.flatMap((career) => career.plans.map((plan) => plan.id)),
);

export function createAcademicPlanRecord<T>(factory: (planId: PlanId) => T): Record<PlanId, T> {
  return Object.fromEntries(academicPlanIds.map((planId) => [planId, factory(planId)])) as Record<PlanId, T>;
}
