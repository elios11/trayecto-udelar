export type CredentialId = "analyst" | "engineer" | "pharmacist";

export type PlanId = "1997" | "2025" | "electrica-2023" | "civil-2021" | "qf-2015";
export type FacultyId = "fing" | "fq";
export type CareerId = "computacion" | "electrica" | "civil" | "quimica-farmaceutica";

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
];

export const academicPlanIds = academicCatalog.flatMap((faculty) =>
  faculty.careers.flatMap((career) => career.plans.map((plan) => plan.id)),
);

export function createAcademicPlanRecord<T>(factory: (planId: PlanId) => T): Record<PlanId, T> {
  return Object.fromEntries(academicPlanIds.map((planId) => [planId, factory(planId)])) as Record<PlanId, T>;
}
