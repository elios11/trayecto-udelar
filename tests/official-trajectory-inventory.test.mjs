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
    "official-trajectory-reproduced": 103,
    "official-trajectory-identified-pending": 1,
    "no-official-trajectory-documented": 3,
    "research-pending": 40,
  });
  assert.equal(savedInventory.pendingQueue.total, 41);
  assert.equal(savedInventory.pendingQueue.plans.length, 41);
  assert.ok(savedInventory.pendingQueue.plans.slice(0, 1).every(({ priority, state }) => priority === 1 && state === "official-trajectory-identified-pending"));
  assert.ok(savedInventory.pendingQueue.plans.slice(1).every(({ priority, state }) => priority === 2 && state === "research-pending"));

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

test("D03z cierra el Ciclo en Biología - Bioquímica con dos semestres y sedes compartidas", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-cenurln-ciclo-en-biologia-bioquimica-2016");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-periods");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [["bedelias", 2]]);
  assert.equal(plan.evidence.expectedCoursePlacements, 8);
  assert.equal(plan.evidence.matchedCoursePlacements, 8);
  assert.deepEqual(plan.scope.territories, ["Salto", "Paysandú"]);
});

test("D03ae cierra Producción Equina 2021 con el ejemplo flexible de seis semestres", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-cucel-tecnologo-en-produccion-equina-2022");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-periods");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [["bedelias", 6]]);
  assert.equal(plan.evidence.expectedCoursePlacements, 45);
  assert.equal(plan.evidence.matchedCoursePlacements, 45);
  assert.deepEqual(plan.scope.territories, ["Melo, Cerro Largo"]);
  assert.ok(plan.conflictNotes.some((note) => /55 créditos optativos/.test(note)));
  assert.ok(plan.conflictNotes.some((note) => /Introducción a las Dinámicas Universitarias/.test(note)));
});

test("D03ah cierra Tecnólogo en Madera 2011 con la guía flexible oficial", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-cur-tecnologo-en-madera-2012");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-periods");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [["bedelias", 6]]);
  assert.equal(plan.evidence.expectedCoursePlacements, 54);
  assert.equal(plan.evidence.matchedCoursePlacements, 54);
  assert.deepEqual(plan.scope.territories, ["Rivera"]);
  assert.ok(plan.conflictNotes.some((note) => /Anexo IV.*ejemplos/i.test(note)));
});

test("D03ak cierra Artes Plásticas y Visuales 2013 con seis semestres propios de Rocha", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-cure-tecnicatura-en-artes-artes-plasticas-y-visuales-2013");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-periods");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [["bedelias", 6]]);
  assert.equal(plan.evidence.expectedCoursePlacements, 15);
  assert.equal(plan.evidence.matchedCoursePlacements, 15);
  assert.deepEqual(plan.scope.territories, ["Rocha"]);
  assert.ok(plan.conflictNotes.some((note) => /página HTML sólo se usa para vigencia/i.test(note)));
  assert.ok(plan.conflictNotes.some((note) => /planes territoriales distintos/i.test(note)));
});

test("D03u cierra Contador Público 2024 con cinco perfiles semestrales exactos", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-fcea-contador-publico-2024");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-profiles");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["asesoria-financiera", 8],
    ["aspectos-tributarios-y-juridicos", 8],
    ["controller-y-transformacion-digital", 8],
    ["reportes-externos-y-atestiguamiento", 8],
    ["sector-publico", 8],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 232);
  assert.equal(plan.evidence.matchedCoursePlacements, 232);
  assert.deepEqual(plan.scope.territories, ["Montevideo"]);
});

test("D03v cierra Administración 2012 con su grilla y dos guías sugeridas", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-fcea-licenciatura-en-administracion-2012");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-profiles");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["personalizada", 8],
    ["gestion-de-personas", 8],
    ["marketing", 8],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 153);
  assert.equal(plan.evidence.matchedCoursePlacements, 153);
  assert.deepEqual(plan.scope.territories, ["Montevideo"]);
});

test("D03w cierra Economía 2012 con su grilla y cuatro guías sugeridas", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-fcea-licenciatura-en-economia-2012");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-profiles");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["personalizada", 8],
    ["academica", 8],
    ["empresarial", 8],
    ["politicas-publicas", 8],
    ["sector-financiero", 8],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 215);
  assert.equal(plan.evidence.matchedCoursePlacements, 215);
  assert.deepEqual(plan.scope.territories, ["Montevideo"]);
});

test("D03x cierra Estadística 2014 con cuatro perfiles y un único título", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-fcea-licenciatura-en-estadistica-2014");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-profiles");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["actuarial-demografico", 8],
    ["bioestadistico", 8],
    ["economia", 8],
    ["tecnologico", 8],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 293);
  assert.equal(plan.evidence.matchedCoursePlacements, 293);
  assert.deepEqual(plan.scope.territories, ["Montevideo"]);
});

test("D03y coteja las dos menciones y los ocho semestres de Economía Agrícola 2022", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-cut-licenciatura-en-economia-agricola-y-gestion-de-agronegocios-2022");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-profiles");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["mencion-en-investigacion", 8],
    ["mencion-profesional", 8],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 53);
  assert.equal(plan.evidence.matchedCoursePlacements, 53);
  assert.deepEqual(plan.scope.territories, ["Tacuarembó"]);
});

test("D03s cierra Computación 1997 con cuatro trayectorias completas y el tramo PI menor a 20", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "1997");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-profiles");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["pi-under-20", 1],
    ["pi-20-59", 10],
    ["pi-60-plus", 10],
    ["august-pi-20-59", 10],
    ["august-pi-60-plus", 10],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 126);
  assert.equal(plan.evidence.matchedCoursePlacements, 126);
  assert.deepEqual(plan.scope.territories, ["Montevideo"]);
});

test("D03t coteja las ocho variantes de Computación 2025 y conserva abiertas las continuaciones no publicadas", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "2025");
  assert.equal(plan.state, "official-trajectory-identified-pending");
  assert.equal(plan.currentProjection.primary, "official-periods");
  assert.equal(plan.evidence.kind, "audited-projection");
  assert.equal(plan.evidence.coverage, "partial-official");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["pi-under-20", 1],
    ["pi-60-plus", 8],
    ["pi-20-59", 8],
    ["second-semester-pi-60-plus", 8],
    ["second-semester-pi-20-59", 8],
    ["litoral-norte", 8],
    ["colonia-analyst", 7],
    ["tacuarembo-initial", 6],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 201);
  assert.equal(plan.evidence.matchedCoursePlacements, 201);
  assert.deepEqual(plan.scope.territories, ["Montevideo", "CENUR Litoral Norte", "Colonia", "Tacuarembó"]);
  assert.match(plan.evidence.reason, /ninguna fuente cierra los diez semestres/);
  assert.match(plan.evidence.reason, /248 de 270 créditos/);
  assert.ok(plan.conflictNotes.some((note) => /no publican la Prueba Inicial como unidad curricular/.test(note)));
  assert.ok(plan.conflictNotes.some((note) => /no atribuye la trayectoria a Salto o Paysandú/.test(note)));
  assert.ok(plan.conflictNotes.some((note) => /mismo Plan 2025/.test(note)));
});

test("D03l cierra Ingeniería Química con las dos currículas exactas y conserva Salto parcial", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-fing-ingenieria-quimica-2021");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-profiles");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["ingreso-fing", 10],
    ["ingreso-fq", 10],
    ["curricula-personalizada", 2],
    ["inicio-salto", 2],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 96);
  assert.equal(plan.evidence.matchedCoursePlacements, 96);
  assert.deepEqual(plan.scope.territories, ["Montevideo · carrera completa", "Salto · primer año"]);
});

test("D03m cierra TIM 2016 con cuatro perfiles exactos y currícula personalizada", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-fing-tecnologo-industrial-mecanico-2016");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-profiles");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["curricula-personalizada", 2],
    ["perfil-fluidos-energia", 6],
    ["perfil-diseno-materiales", 6],
    ["perfil-planta", 6],
    ["perfil-produccion", 6],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 120);
  assert.equal(plan.evidence.matchedCoursePlacements, 120);
  assert.deepEqual(plan.scope.territories, ["Montevideo · carrera completa", "Paysandú · carrera completa"]);
});

test("D03n cierra Telecomunicaciones 2009 con Rocha completa y Montevideo parcial", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-cure-tecnologo-en-telecomunicaciones-2009");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-profiles");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["curricula-rocha", 5],
    ["primer-ano-montevideo", 2],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 28);
  assert.equal(plan.evidence.matchedCoursePlacements, 28);
  assert.deepEqual(plan.scope.territories, ["Rocha · carrera completa", "Montevideo · primer año"]);
});

test("D03o cierra Ingeniería Naval 1997 con la currícula sugerida exacta", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-fing-ingenieria-naval-1997");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-periods");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["curricula-sugerida-2017", 11],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 45);
  assert.equal(plan.evidence.matchedCoursePlacements, 45);
  assert.deepEqual(plan.scope.territories, ["Montevideo"]);
});

test("D03r cierra Sistemas de Comunicación 2018 con cinco trayectorias exactas", () => {
  const plan = savedInventory.plans.find(({ planId }) => planId === "bedelias-fing-ingenieria-en-sistemas-de-comunicacion-2018");
  assert.equal(plan.state, "official-trajectory-reproduced");
  assert.equal(plan.currentProjection.primary, "official-profiles");
  assert.deepEqual(plan.evidence.pathways.map(({ id, periodCount }) => [id, periodCount]), [
    ["perfil-general-personalizado", 11],
    ["curricula-con-matematica-inicial", 12],
    ["perfil-electronica-comunicaciones", 11],
    ["perfil-redes-telecomunicaciones", 11],
    ["perfil-procesamiento-informacion-senales", 11],
  ]);
  assert.equal(plan.evidence.expectedCoursePlacements, 221);
  assert.equal(plan.evidence.matchedCoursePlacements, 221);
  assert.deepEqual(plan.scope.territories, ["Montevideo"]);
});

test("D03j cierra los tres planes FQ con correspondencia exacta y sedes explícitas", () => {
  const byPlanId = new Map(savedInventory.plans.map((plan) => [plan.planId, plan]));
  const expected = new Map([
    ["bedelias-fq-bachiller-en-ciencias-quimicas-2000", { primary: "official-profiles", periods: [3, 3, 3, 3, 3], placements: 108 }],
    ["bedelias-fq-licenciatura-en-tecnologias-de-la-quimica-2022", { primary: "official-profiles", periods: [11, 11], placements: 81 }],
    ["bedelias-fq-tecnico-bach-en-cs-quimicas-2015", { primary: "official-periods", periods: [6, 3], placements: 35 }],
  ]);
  for (const [planId, expectation] of expected) {
    const plan = byPlanId.get(planId);
    assert.equal(plan.state, "official-trajectory-reproduced", planId);
    assert.equal(plan.currentProjection.primary, expectation.primary, planId);
    assert.deepEqual(plan.evidence.pathways.map(({ periodCount }) => periodCount), expectation.periods, planId);
    assert.equal(plan.evidence.expectedCoursePlacements, expectation.placements, planId);
    assert.equal(plan.evidence.matchedCoursePlacements, expectation.placements, planId);
  }
  assert.deepEqual(byPlanId.get("bedelias-fq-tecnico-bach-en-cs-quimicas-2015").scope.territories, [
    "Montevideo · carrera completa", "Salto · primer año",
  ]);
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
