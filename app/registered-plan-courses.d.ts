export type RegisteredPlanPeriod = {
  label: string;
  courseIds: string[];
  alternativeGroups?: Array<{ id: string; courseIds: string[]; required: boolean }>;
  choiceCourseIds?: string[];
};

export type RegisteredPlanPathway = {
  label?: string;
  description?: string;
  periods: RegisteredPlanPeriod[];
  catalogCourseIds?: string[];
};

export type RegisteredPlanProjection<TCourse extends { id: string; authorityStatus?: string; credits?: number; hours?: number; curricularBlock?: boolean; placeholder?: boolean; eligibleRequirementIds?: string[]; creditAllocations?: unknown[] }> = {
  courses: TCourse[];
  plan?: { durationMonths?: number | null };
  pathways: Record<string, RegisteredPlanPathway>;
  publishedPathways?: Record<string, RegisteredPlanPathway>;
};

export const GENERATED_PATHWAY_LABEL: "Recorrido orientativo generado";

export function isRealCurricularCourse(course: { authorityStatus?: string; credits?: number; hours?: number; curricularBlock?: boolean; placeholder?: boolean } | null | undefined): boolean;

export function buildRegisteredPlanPresentation<TCourse extends { id: string; authorityStatus?: string; credits?: number; hours?: number; curricularBlock?: boolean; placeholder?: boolean; eligibleRequirementIds?: string[]; creditAllocations?: unknown[] }>(
  pathwayId: string,
  data: RegisteredPlanProjection<TCourse> | null,
): {
  courses: Array<TCourse & { provisional?: true; semester: number | "opt"; offered: never[] }>;
  periods: RegisteredPlanPeriod[];
  generated: boolean;
  label: "Trayectoria oficial" | "Recorrido orientativo generado";
  description: string;
};

export function buildRegisteredPlanCourses<TCourse extends { id: string; authorityStatus?: string; credits?: number; hours?: number; curricularBlock?: boolean; placeholder?: boolean; eligibleRequirementIds?: string[]; creditAllocations?: unknown[] }>(
  pathwayId: string,
  data: RegisteredPlanProjection<TCourse> | null,
): Array<TCourse & { provisional?: true; semester: number | "opt"; offered: never[] }>;
