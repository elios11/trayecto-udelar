import curatedAcademicCatalogJson from "./data/curated-academic-catalog.json";
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

const curatedAcademicCatalog = curatedAcademicCatalogJson as AcademicFacultyOption[];
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
