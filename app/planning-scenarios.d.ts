import type { PersonalDataLoadUnit, PersonalDataPlanningV3, PersonalDataScenarioV3 } from "./personal-data.mjs";
import type { LegacyPlannerTransfer } from "./personal-data-migration.mjs";

export const SCENARIO_NAME_MAX_LENGTH: 80;
export type ScenarioOperationResult = { ok: true; planning: PersonalDataPlanningV3; scenario: PersonalDataScenarioV3 } | { ok: false; code: string; message: string };
export type ScenarioOperationOptions = { now: string; idGenerator?: (kind: "scenario" | "term") => string; name?: string; activate?: boolean };
export type ScenarioLoad = { unit: PersonalDataLoadUnit; value: number; partial: boolean; perTerm: Array<{ termId: string; label: string; value: number; partial: boolean; missingCourseIds: string[]; missingValueCourseIds: string[]; target: { unit: PersonalDataLoadUnit; value: number } | null; targetStatus: "none" | "partial" | "exceeded" | "met" | "below"; difference: number | null }> };
export type ScenarioComparison = {
  left: { id: string; name: string; termCount: number; uniqueCourseCount: number; load: ScenarioLoad };
  right: { id: string; name: string; termCount: number; uniqueCourseCount: number; load: ScenarioLoad };
  sharedCourseIds: string[];
  onlyLeftCourseIds: string[];
  onlyRightCourseIds: string[];
  movedCourseIds: Array<{ courseId: string; from: { termId: string; label: string; index: number; startsAt: string | null; endsAt: string | null }; to: { termId: string; label: string; index: number; startsAt: string | null; endsAt: string | null }; basis: "dates" | "position" }>;
  duplicateCourseIds: { left: string[]; right: string[] };
  positionIsPresentationOnly: boolean;
};
export function suggestScenarioCopyName(name: string, scenarios: PersonalDataScenarioV3[]): string;
export function createPlanningScenario(planning: PersonalDataPlanningV3, options: ScenarioOperationOptions): ScenarioOperationResult;
export function duplicatePlanningScenario(planning: PersonalDataPlanningV3, sourceScenarioId: string, options: ScenarioOperationOptions): ScenarioOperationResult;
export function renamePlanningScenario(planning: PersonalDataPlanningV3, scenarioId: string, name: string, options: { now: string }): ScenarioOperationResult;
export function activatePlanningScenario(planning: PersonalDataPlanningV3, scenarioId: string): ScenarioOperationResult;
export function promotePlanningScenario(planning: PersonalDataPlanningV3, scenarioId: string, options: { now: string }): ScenarioOperationResult;
export function archivePlanningScenario(planning: PersonalDataPlanningV3, scenarioId: string, options: { now: string }): ScenarioOperationResult;
export function restorePlanningScenario(planning: PersonalDataPlanningV3, scenarioId: string, options: { now: string }): ScenarioOperationResult;
export function replaceActiveScenarioPlanning(planning: PersonalDataPlanningV3, planner: LegacyPlannerTransfer, options: { now: string }): ScenarioOperationResult;
export function comparePlanningScenarios(left: PersonalDataScenarioV3, right: PersonalDataScenarioV3, options?: { unit?: PersonalDataLoadUnit; courses?: Array<{ id: string; credits?: number; hours?: number }> | Map<string, { id: string; credits?: number; hours?: number }> }): { ok: true; comparison: ScenarioComparison } | { ok: false; code: string; message: string };
