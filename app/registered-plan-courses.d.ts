export type RegisteredPlanPathway = {
  periods: Array<{ label: string; courseIds: string[] }>;
  catalogCourseIds?: string[];
};

export type RegisteredPlanProjection<TCourse extends { id: string; authorityStatus?: string }> = {
  courses: TCourse[];
  pathways: Record<string, RegisteredPlanPathway>;
  publishedPathways?: Record<string, RegisteredPlanPathway>;
};

export function buildRegisteredPlanCourses<TCourse extends { id: string; authorityStatus?: string }>(
  pathwayId: string,
  data: RegisteredPlanProjection<TCourse> | null,
): Array<TCourse & { semester: number | "opt"; offered: never[] }>;
