import type { PersonalDataLoadTargetV3, PersonalDataLoadUnit } from "./personal-data.mjs";

export type PlannerLoadCourse = { id: string; credits?: number; hours?: number; creditAllocations?: Array<{ nodeId: string; credits: number }> };
export type PlannerLoadTerm = { id: string; courseIds: string[]; loadTarget?: PersonalDataLoadTargetV3 | null };
export type TermLoad = {
  unit: PersonalDataLoadUnit;
  value: number;
  courseCount: number;
  missingCourseIds: string[];
  missingValueCourseIds: string[];
  partial: boolean;
};

export function calculateTermLoad(input: { term: PlannerLoadTerm; courses: PlannerLoadCourse[] | Map<string, PlannerLoadCourse>; unit: PersonalDataLoadUnit }): TermLoad;
export function compareTermLoad(load: TermLoad, target: PersonalDataLoadTargetV3 | null | undefined): { status: "none" | "invalid" | "partial" | "exceeded" | "met" | "below"; difference: number | null };
export function analyzePlannerLoad(input: { terms: PlannerLoadTerm[]; courses: PlannerLoadCourse[] | Map<string, PlannerLoadCourse>; progress: Record<string, string> }): {
  terms: Array<{ termId: string; load: TermLoad; target: PersonalDataLoadTargetV3 | null; targetStatus: ReturnType<typeof compareTermLoad> }>;
  duplicateCourseIds: string[];
  accreditedCourseIds: string[];
};
export function calculatePotentialCreditImpact(courses: PlannerLoadCourse[]): { totalCredits: number; nodeCredits: Record<string, number>; ambiguousCourseIds: string[]; unknownCourseIds: string[] };
