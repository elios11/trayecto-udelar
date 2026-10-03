#!/usr/bin/env node

import { buildAndWriteAuditQueue } from "./bedelias-audit-queue.mjs";
import { buildAndWriteUiCurriculumQueue } from "./bedelias-ui-curriculum-queue.mjs";
import { buildExtractedAcademicPlans } from "./build-extracted-academic-plans.mjs";
import { buildOfficialTrajectoryInventory } from "./build-official-trajectory-inventory.mjs";

const PLAN_ID = "bedelias-fing-ingenieria-industrial-mecanica-1997";

await buildAndWriteAuditQueue();
const report = await buildExtractedAcademicPlans();
const reportPlan = report.plans.find(({ planId }) => planId === PLAN_ID);
if (!reportPlan) throw new Error(`La regeneración no produjo ${PLAN_ID}.`);
await buildAndWriteUiCurriculumQueue();

const inventory = await buildOfficialTrajectoryInventory();
const inventoryPlan = inventory.plans.find(({ planId }) => planId === PLAN_ID);
if (!inventoryPlan) throw new Error(`El inventario no contiene ${PLAN_ID}.`);

console.log([
  `${PLAN_ID} regenerado de forma reanudable.`,
  `${reportPlan.after.publishedCourses} materias y bloques verificados publicados.`,
  `Inventario: ${inventoryPlan.state}.`,
].join(" "));
