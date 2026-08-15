import extractedAcademicCatalogJson from "./data/extracted-academic-catalog.json";

export type CredentialId = string;
export type PlanId = string;
export type FacultyId = string;
export type CareerId = string;

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

const curatedAcademicCatalog: AcademicFacultyOption[] = [
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

const extractedAcademicCatalog = extractedAcademicCatalogJson as AcademicFacultyOption[];

export const academicCatalog: AcademicFacultyOption[] = [
  ...curatedAcademicCatalog.map((faculty) => {
    const extractedFaculty = extractedAcademicCatalog.find((candidate) => candidate.id === `bedelias-${faculty.id}`);
    return extractedFaculty ? { ...faculty, careers: [...faculty.careers, ...extractedFaculty.careers] } : faculty;
  }),
  ...extractedAcademicCatalog.filter((faculty) => !curatedAcademicCatalog.some((curated) => faculty.id === `bedelias-${curated.id}`)),
];

export const academicPlanIds = academicCatalog.flatMap((faculty) =>
  faculty.careers.flatMap((career) => career.plans.map((plan) => plan.id)),
);

export function createAcademicPlanRecord<T>(factory: (planId: PlanId) => T): Record<PlanId, T> {
  return Object.fromEntries(academicPlanIds.map((planId) => [planId, factory(planId)])) as Record<PlanId, T>;
}
