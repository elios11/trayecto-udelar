import type { PlanId } from "./academic-catalog";
import { extractedAcademicPlanRegistrations } from "./data/extracted-academic-loaders";

type PlanModule = { default: unknown };
type PlanLoader = () => Promise<PlanModule>;

type RegisteredAcademicPlan = {
  load: PlanLoader;
  pathwayIds: readonly string[];
  pathwayLabel: "Perfil" | "Trayectoria" | "Opción" | "Recorrido lingüístico";
  minCredits: number;
  progressPlanId?: PlanId;
};

export const registeredAcademicPlans: Partial<Record<PlanId, RegisteredAcademicPlan>> = {
  "fadu-arquitectura-2015": {
    load: () => import("./data/fadu-arquitectura-2015.json"),
    pathwayIds: ["flexible"],
    pathwayLabel: "Trayectoria",
    minCredits: 450,
  },
  "fadu-ldcv-2007": {
    load: () => import("./data/fadu-ldcv-2007.json"),
    pathwayIds: ["current-2026"],
    pathwayLabel: "Trayectoria",
    minCredits: 363,
  },
  "fadu-ldind-2013": {
    load: () => import("./data/fadu-ldind-2013.json"),
    pathwayIds: ["product", "textile"],
    pathwayLabel: "Perfil",
    minCredits: 360,
  },
  ...extractedAcademicPlanRegistrations,
};

export function isRegisteredAcademicPlan(planId: PlanId) {
  return Boolean(registeredAcademicPlans[planId]);
}

export async function loadRegisteredAcademicPlan(planId: PlanId) {
  const registration = registeredAcademicPlans[planId];
  if (!registration) return null;
  return (await registration.load()).default;
}

export function isRegisteredPathway(planId: PlanId, pathwayId: string) {
  return registeredAcademicPlans[planId]?.pathwayIds.includes(pathwayId) ?? false;
}
