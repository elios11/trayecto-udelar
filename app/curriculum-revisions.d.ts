import type { PersonalDataDocumentV3 } from "./personal-data.mjs";

export const CURRICULUM_REVISION_EPOCH: string;
export type CurriculumAlias = {
  planId: string;
  fromCourseId: string;
  toCourseId: string | null;
  kind: "rename" | "equivalence" | "retired";
  effectiveAt: string;
  sourceUrl: string;
};
export type CurriculumReference =
  | { status: "current"; courseId: string }
  | { status: "aliased"; courseId: string; originalCourseId: string; alias: CurriculumAlias }
  | { status: "retired"; courseId: string; alias: CurriculumAlias }
  | { status: "orphaned"; courseId: string; alias?: CurriculumAlias };
export function curriculumRevisionForPlan(planId: string): string;
export function validateCurriculumAliases(aliases: unknown): { ok: true; aliases: CurriculumAlias[] } | { ok: false; issues: string[] };
export function resolveCurriculumCourseReference(courseId: string, currentCourseIds: Iterable<string>, aliases?: CurriculumAlias[]): CurriculumReference;
export function classifyCurriculumReferences(document: PersonalDataDocumentV3, courseIdsByPlan: Map<string, Set<string>>, aliases?: CurriculumAlias[]): Array<CurriculumReference & { planId: string }>;
