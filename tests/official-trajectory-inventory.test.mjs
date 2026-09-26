import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildOfficialTrajectoryInventory,
  PROJECTION_MECHANISMS,
  TRAJECTORY_STATES,
  validateInventoryEntry,
} from "../scripts/build-official-trajectory-inventory.mjs";

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));
const savedInventory = await readJson(new URL("../data/official-trajectories/inventory.json", import.meta.url));
const curatedCatalog = await readJson(new URL("../app/data/curated-academic-catalog.json", import.meta.url));
const extractedCatalog = await readJson(new URL("../app/data/extracted-academic-catalog.json", import.meta.url));
const auditRegistry = await readJson(new URL("../data/bedelias/audits/official-source-audits.json", import.meta.url));
const extractedReport = await readJson(new URL("../data/bedelias/inventory/ui-extracted-plans.json", import.meta.url));

const catalogPlanIds = (catalog) => catalog.flatMap((faculty) => faculty.careers.flatMap((career) => career.plans.map(({ id }) => id)));

test("el inventario de trayectorias es determinista y cubre exactamente los planes seleccionables", async () => {
  const generated = await buildOfficialTrajectoryInventory({ write: false });
  assert.deepEqual(generated, savedInventory);

  const selectablePlanIds = new Set([...catalogPlanIds(curatedCatalog), ...catalogPlanIds(extractedCatalog)]);
  const inventoryPlanIds = savedInventory.plans.map(({ planId }) => planId);
  assert.equal(savedInventory.counts.selectablePlanIds, 147);
  assert.equal(savedInventory.counts.catalogPlacements, 149);
  assert.equal(inventoryPlanIds.length, selectablePlanIds.size);
  assert.equal(new Set(inventoryPlanIds).size, inventoryPlanIds.length);
  assert.deepEqual(new Set(inventoryPlanIds), selectablePlanIds);
  assert.equal(savedInventory.plans.flatMap(({ catalogPlacements }) => catalogPlacements).length, 149);
});

test("los estados cerrados tienen evidencia suficiente y los pendientes permanecen visibles", () => {
  const stateTotals = Object.fromEntries(TRAJECTORY_STATES.map((state) => [state, savedInventory.plans.filter((plan) => plan.state === state).length]));
  assert.deepEqual(savedInventory.counts.states, stateTotals);
  assert.deepEqual(stateTotals, {
    "official-trajectory-reproduced": 75,
    "official-trajectory-identified-pending": 15,
    "no-official-trajectory-documented": 1,
    "research-pending": 56,
  });
  assert.equal(savedInventory.pendingQueue.total, 71);
  assert.equal(savedInventory.pendingQueue.plans.length, 71);
  assert.ok(savedInventory.pendingQueue.plans.slice(0, 15).every(({ priority, state }) => priority === 1 && state === "official-trajectory-identified-pending"));
  assert.ok(savedInventory.pendingQueue.plans.slice(15).every(({ priority, state }) => priority === 2 && state === "research-pending"));

  for (const plan of savedInventory.plans) {
    assert.ok(TRAJECTORY_STATES.includes(plan.state));
    assert.ok(PROJECTION_MECHANISMS.includes(plan.currentProjection.primary));
    if (plan.state === "official-trajectory-reproduced") {
      assert.ok(plan.officialSources.length > 0, plan.planId);
      assert.ok(["audited-projection", "exact-period-course-placement"].includes(plan.evidence.kind), plan.planId);
      if (plan.evidence.kind === "exact-period-course-placement") {
        assert.equal(plan.evidence.periodLabelsMatch, true, plan.planId);
        assert.equal(plan.evidence.coursePlacementsMatch, true, plan.planId);
      } else {
        assert.ok(plan.evidence.pathways.length > 0, plan.planId);
      }
    }
  }
});

test("la puerta rechaza cierres sin fuentes o sin justificación de ausencia", () => {
  const base = {
    planId: "ejemplo",
    officialSources: [],
    reviewedAt: null,
    currentProjection: { primary: "areas" },
    evidence: { kind: "source-identified" },
  };
  assert.throws(() => validateInventoryEntry({ ...base, state: "official-trajectory-reproduced" }, null), /correspondencia estructurada/);
  assert.throws(() => validateInventoryEntry({ ...base, state: "no-official-trajectory-documented" }, null), /justificación/);
  assert.throws(() => validateInventoryEntry({
    ...base,
    state: "no-official-trajectory-documented",
    reviewedAt: "2026-09-22",
    officialSources: [{ url: "https://udelar.edu.uy/plan" }],
    evidence: { kind: "documented-absence", justification: "La fuente lo declara." },
  }, { officialPlan: { curriculum: { periods: [{ label: "Semestre 1" }] } } }), /períodos oficiales/);
});

test("una fuente de períodos o trayectorias auditada nunca se degrada a ausencia documentada", () => {
  const auditsByIdentity = new Map(auditRegistry.audits.map((audit) => [audit.identity, audit]));
  const inventoryByPlanId = new Map(savedInventory.plans.map((plan) => [plan.planId, plan]));
  for (const reportPlan of extractedReport.plans) {
    const audit = auditsByIdentity.get(reportPlan.identity);
    const hasOfficialTrajectory = Boolean(audit?.officialPlan?.curriculum?.periods?.length
      || audit?.officialPlan?.trajectories?.some(({ periods }) => periods?.length));
    if (hasOfficialTrajectory) assert.notEqual(inventoryByPlanId.get(reportPlan.planId).state, "no-official-trajectory-documented", reportPlan.planId);
  }
});

test("TUCE, Nutrición, TGU y las dos licenciaturas FCS quedan cerrados", () => {
  const byPlanId = new Map(savedInventory.plans.map((plan) => [plan.planId, plan]));
  const correction = byPlanId.get("bedelias-fhum-correccion-de-estilo-2014");
  assert.equal(correction.state, "official-trajectory-reproduced");
  assert.equal(correction.evidence.officialPeriodCount, 4);
  assert.equal(correction.evidence.expectedCoursePlacements, correction.evidence.matchedCoursePlacements);

  const nutrition = byPlanId.get("bedelias-enut-licenciatura-en-nutricion-2014");
  assert.equal(nutrition.state, "official-trajectory-reproduced");
  assert.equal(nutrition.evidence.officialPeriodCount, 7);
  assert.equal(nutrition.evidence.expectedCoursePlacements, 33);
  assert.equal(nutrition.evidence.matchedCoursePlacements, 33);
  assert.deepEqual(nutrition.scope.territories, ["Montevideo", "Paysandú · Sólo Ciclo IV"]);

  const tgu = byPlanId.get("bedelias-fcea-tecnologo-en-gestion-universitaria-2018");
  assert.equal(tgu.state, "official-trajectory-reproduced");
  assert.equal(tgu.evidence.officialPeriodCount, 5);
  assert.equal(tgu.evidence.expectedCoursePlacements, 45);
  assert.equal(tgu.evidence.matchedCoursePlacements, 45);
  assert.deepEqual(tgu.scope.territories, ["Montevideo"]);

  const cienciaPolitica = byPlanId.get("bedelias-fcs-licenciatura-en-ciencia-politica-2009");
  assert.equal(cienciaPolitica.state, "official-trajectory-reproduced");
  assert.equal(cienciaPolitica.currentProjection.primary, "official-periods");
  assert.equal(cienciaPolitica.evidence.officialPeriodCount, 8);
  assert.equal(cienciaPolitica.evidence.expectedCoursePlacements, 57);
  assert.equal(cienciaPolitica.evidence.matchedCoursePlacements, 57);
  assert.deepEqual(cienciaPolitica.evidence.projectedPathways.map(({ periodCount }) => periodCount), [8]);

  const desarrollo = byPlanId.get("bedelias-fcs-licenciatura-en-desarrollo-2009");
  assert.equal(desarrollo.state, "official-trajectory-reproduced");
  assert.equal(desarrollo.currentProjection.primary, "official-profiles");
  assert.equal(desarrollo.evidence.officialPeriodCount, 8);
  assert.equal(desarrollo.evidence.expectedCoursePlacements, 55);
  assert.equal(desarrollo.evidence.matchedCoursePlacements, 55);
  assert.deepEqual(desarrollo.evidence.projectedPathways.map(({ periodCount }) => periodCount), [8, 8, 8]);
});

test("el primer lote FHCE queda cerrado con ocho semestres y correspondencia exacta", () => {
  const byPlanId = new Map(savedInventory.plans.map((plan) => [plan.planId, plan]));
  for (const planId of [
    "bedelias-fhum-letras-2014",
    "bedelias-fhum-linguistica-2014",
    "bedelias-fhum-educacion-2014",
  ]) {
    const plan = byPlanId.get(planId);
    assert.equal(plan.state, "official-trajectory-reproduced", planId);
    assert.equal(plan.currentProjection.primary, "official-periods", planId);
    assert.ok(plan.evidence.pathways.every(({ periodCount }) => periodCount === 8), planId);
    assert.equal(plan.evidence.expectedCoursePlacements, plan.evidence.matchedCoursePlacements, planId);
  }
});

test("el segundo lote FHCE conserva los períodos y opciones oficialmente documentados", () => {
  const byPlanId = new Map(savedInventory.plans.map((plan) => [plan.planId, plan]));
  const expected = new Map([
    ["bedelias-fhum-historia-2014", { primary: "official-periods", periodCounts: [8, 2] }],
    ["bedelias-fhum-filosofia-2010", { primary: "official-periods", periodCounts: [8] }],
    ["bedelias-fhum-antropologia-2014", { primary: "official-profiles", periodCounts: [8, 8, 8] }],
  ]);
  for (const [planId, { primary, periodCounts }] of expected) {
    const plan = byPlanId.get(planId);
    assert.equal(plan.state, "official-trajectory-reproduced", planId);
    assert.equal(plan.currentProjection.primary, primary, planId);
    assert.deepEqual(plan.evidence.pathways.map(({ periodCount }) => periodCount), periodCounts, planId);
    assert.equal(plan.evidence.expectedCoursePlacements, plan.evidence.matchedCoursePlacements, planId);
  }
});

test("el tercer lote FHCE mantiene identidades separadas y sólo articula los dos planes 2025", () => {
  const byPlanId = new Map(savedInventory.plans.map((plan) => [plan.planId, plan]));
  const expected = new Map([
    ["bedelias-fhum-interpretacion-lsu-espanol-lsu-2014", [6, 6]],
    ["bedelias-fhum-tecnologo-int-y-trad-lsu-esp-2025", [7, 7]],
    ["bedelias-fhum-licenciatura-en-estudios-sordos-2025", [9, 9]],
  ]);
  for (const [planId, periodCounts] of expected) {
    const plan = byPlanId.get(planId);
    assert.equal(plan.state, "official-trajectory-reproduced", planId);
    assert.equal(plan.currentProjection.primary, "official-periods", planId);
    assert.deepEqual(plan.evidence.pathways.map(({ periodCount }) => periodCount), periodCounts, planId);
    assert.equal(plan.evidence.expectedCoursePlacements, plan.evidence.matchedCoursePlacements, planId);
  }
});

test("el cierre FHCE reproduce Dramaturgia y Museología sin inventar semestres para Turismo", () => {
  const byPlanId = new Map(savedInventory.plans.map((plan) => [plan.planId, plan]));
  const dramaturgia = byPlanId.get("bedelias-fhum-dramaturgia-2015");
  const museologia = byPlanId.get("bedelias-fhum-museologia-2011");
  const turismo = byPlanId.get("bedelias-cure-licenciatura-en-turismo-2014");
  assert.equal(dramaturgia.state, "official-trajectory-reproduced");
  assert.deepEqual(dramaturgia.evidence.pathways.map(({ periodCount }) => periodCount), [4]);
  assert.equal(museologia.state, "official-trajectory-reproduced");
  assert.deepEqual(museologia.evidence.pathways.map(({ periodCount }) => periodCount), [7]);
  assert.equal(turismo.state, "no-official-trajectory-documented");
  assert.equal(turismo.currentProjection.primary, "official-flexible-structure");
  assert.equal(turismo.evidence.kind, "documented-absence");
  assert.match(turismo.evidence.justification, /Próximamente/);
});

test("los planes interservicio conservan todas sus ubicaciones sin duplicar el ID global", () => {
  const byPlanId = new Map(savedInventory.plans.map((plan) => [plan.planId, plan]));
  assert.deepEqual(byPlanId.get("bedelias-fing-ingenieria-quimica-2021").catalogPlacements.map(({ serviceId }) => serviceId).sort(), ["fing", "fq"]);
  assert.deepEqual(byPlanId.get("bedelias-fing-tecnologo-en-cartografia-2011").catalogPlacements.map(({ serviceId }) => serviceId).sort(), ["bedelias-fcien", "fing"]);
});
