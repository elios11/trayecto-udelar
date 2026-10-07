import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildRegisteredPlanPresentation } from "../app/registered-plan-courses.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const source = await readJson("data/cenurln/ciclo-inicial-matematica-2012.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cenurln-ciclo-inicial-de-matematica-2012.json");
const inventory = await readJson("data/official-trajectories/inventory.json");
const pageSource = await readFile(new URL("app/page.tsx", root), "utf8");
const digest = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

test("versiona evidencia propia del CIM con alcance, vigencia y huella reproducible", () => {
  assert.equal(source.reviewedAt, "2026-10-07");
  assert.equal(source.fingerprint.canonicalField, "sourcePortions");
  assert.equal(source.fingerprint.value, digest(source.sourcePortions));
  assert.equal(source.publication.currentAtReview, true);
  assert.equal(source.publication.ownDurationMonths, 12);
  assert.equal(source.publication.accumulatedCioCimDurationMonths, 24);
  assert.equal(source.publication.minimumCredits, 160);
  assert.deepEqual(source.scope.campuses.map(({ label }) => label), ["Salto"]);
  assert.ok(source.sources.some(({ id, authority }) => id === "impo-plan-2012" && /Diario Oficial/.test(authority)));
  assert.ok(source.sources.some(({ id, authority }) => id === "dmel-cim-current" && /Departamento de Matemática/.test(authority)));
});

test("documenta que el plan es flexible y no convierte el CIO-CT en semestres del CIM", () => {
  const inventoryEntry = inventory.plans.find(({ planId }) => planId === source.planId);
  assert.equal(inventoryEntry.state, "no-official-trajectory-documented");
  assert.equal(inventoryEntry.reviewedAt, "2026-10-07");
  assert.equal(inventoryEntry.evidence.kind, "documented-absence");
  assert.match(inventoryEntry.evidence.justification, /amplia y flexible/);
  assert.equal(inventoryEntry.currentProjection.primary, "official-flexible-structure");

  const pathway = projection.publishedPathways.bedelias;
  assert.equal(pathway.label, "Recorrido flexible del CIM");
  assert.deepEqual(pathway.periods.map(({ label }) => label), [
    "Unidades propias del CIM sin orden sugerido",
    "Opciones oficiales sin código ni carga publicada",
  ]);
  assert.ok(pathway.periods.every(({ label }) => !/primer|segundo|tercer|cuarto\s+semestre/i.test(label)));

  const projectedIdsBySource = new Map(projection.courses.map((course) => [course.bedeliasCode, course.id]));
  const visibleIds = new Set(pathway.periods.flatMap(({ courseIds }) => courseIds));
  for (const sourceCourseId of source.scope.predecessor.sourceCourseIdsRetainedAsCandidates) {
    const course = projection.courses.find(({ bedeliasCode }) => bedeliasCode === sourceCourseId);
    assert.equal(course.authorityStatus, "candidate", sourceCourseId);
    assert.equal(visibleIds.has(projectedIdsBySource.get(sourceCourseId)), false, sourceCourseId);
  }
});

test("separa ocho coincidencias exactas, 22 opciones sólo-fuente y 21 candidatas", () => {
  const verified = projection.courses.filter(({ authorityStatus }) => authorityStatus === "verified");
  const candidates = projection.courses.filter(({ authorityStatus }) => authorityStatus === "candidate");
  const expectedSourceIds = new Set(source.authorityPolicy.verifiedSourceCourseIds);
  const visibleIds = new Set(projection.publishedPathways.bedelias.periods.flatMap(({ courseIds }) => courseIds));
  const matched = verified.filter(({ bedeliasCode }) => expectedSourceIds.has(bedeliasCode));
  const sourceOnly = verified.filter(({ catalogRole }) => catalogRole === "official-plan-example-option");

  assert.equal(verified.length, 30);
  assert.equal(matched.length, 8);
  assert.equal(sourceOnly.length, 22);
  assert.equal(candidates.length, 21);
  assert.deepEqual(new Set(matched.map(({ bedeliasCode }) => bedeliasCode)), expectedSourceIds);
  assert.ok(verified.every(({ id }) => visibleIds.has(id)));
  assert.ok(candidates.every(({ id }) => !visibleIds.has(id)));
  assert.equal(projection.plan.courseCatalogAuditStatus, "partial");

  for (const row of source.rows) {
    const course = projection.courses.find(({ bedeliasCode }) => bedeliasCode === row.sourceCourseId);
    assert.equal(course.name, row.officialLabel, row.sourceCourseId);
    assert.equal(course.credits, row.credits, row.sourceCourseId);
    assert.deepEqual(course.eligibleRequirementIds, ["matematica"], row.sourceCourseId);
    assert.equal(course.fieldProvenance.inclusion, "official-curriculum", row.sourceCourseId);
    assert.equal(course.fieldProvenance.name, "official-curriculum", row.sourceCourseId);
    assert.equal(course.fieldProvenance.credits, "official-curriculum", row.sourceCourseId);
  }

  assert.ok(source.officialSourceOnlyOptions.every((option) => !("credits" in option)));
  assert.deepEqual(new Set(sourceOnly.map(({ name }) => name)), new Set(source.officialSourceOnlyOptions.map(({ officialLabel }) => officialLabel)));
  assert.ok(sourceOnly.every((course) => course.bedeliasCode === undefined && course.sourceCourseId === undefined));
  assert.ok(sourceOnly.every((course) => course.creditsPublished === false));
  assert.ok(sourceOnly.every((course) => course.elective === true));
  assert.ok(sourceOnly.every((course) => course.availabilityStatus === "not-asserted-by-plan"));
  assert.ok(sourceOnly.every((course) => course.fieldProvenance.credits === "official-source-no-load"));
  assert.equal(new Set([...matched, ...sourceOnly, ...candidates].map(({ id }) => id)).size, 51);
});

test("controla los mínimos del Plan 2012 y conserva el conflicto de Cálculo Vectorial", () => {
  const nodeMinimums = Object.fromEntries(projection.creditStructure.nodes.map(({ id, minCredits }) => [id, minCredits]));
  assert.equal(nodeMinimums["plan-total"], 160);
  assert.equal(nodeMinimums.matematica, 120);
  assert.equal(nodeMinimums["cientifico-tecnologica"], 20);
  assert.equal(nodeMinimums["social-humanistica"], 10);
  assert.equal(projection.plan.durationMonths, 12);
  assert.match(projection.plan.notice, /un año posterior al CIO-CT/);
  assert.match(projection.plan.notice, /dos años.*recorrido acumulado/);
  assert.match(projection.plan.notice, /160 créditos no se completan con las ocho UC propias/);
  assert.match(projection.plan.notice, /formación previa reconocida/);
  assert.match(projection.plan.notice, /Plan de Formación individual/);
  assert.match(projection.plan.notice, /No existe una secuencia semestral oficial/);

  const calculoVectorial = projection.courses.find(({ bedeliasCode }) => bedeliasCode === "CIM10");
  assert.equal(calculoVectorial.credits, 12);
  assert.match(calculoVectorial.creditConflict, /Bedelías conserva 10/);
  assert.equal(projection.publishedRules.length, 0);
  assert.equal(projection.rules.length, 43);
});

test("declara el tope computable y advierte la validación manual junto a las metas", () => {
  const presentation = buildRegisteredPlanPresentation("bedelias", projection);
  const countableCourses = presentation.courses.filter(({ creditsPublished }) => creditsPublished !== false);
  const countableCredits = countableCourses.reduce((sum, course) => sum + course.credits, 0);
  const countableMathematicsCredits = countableCourses.reduce((sum, course) => sum + course.creditAllocations
    .filter(({ nodeId }) => nodeId === "matematica")
    .reduce((allocated, { credits }) => allocated + credits, 0), 0);

  assert.equal(presentation.courses.length, 30);
  assert.equal(countableCourses.length, 8);
  assert.equal(countableCredits, 86);
  assert.equal(countableMathematicsCredits, 86);
  assert.deepEqual(projection.plan.creditComputationCoverage, source.creditComputationCoverage);
  assert.deepEqual(projection.plan.creditComputationCoverage, {
    status: "partial",
    countableCredits: 86,
    countableMathematicsCredits: 86,
    requiredCredits: 160,
    requiredMathematicsCredits: 120,
    manualValidationRequired: true,
    uncountedComponents: [
      "formación previa del CIO-CT o equivalente",
      "opciones del Plan de Formación individual",
    ],
    notice: "Trayecto puede computar 86 créditos matemáticos con carga publicada frente a 160 exigidos. La formación previa del CIO-CT o equivalente y las opciones del Plan de Formación individual todavía no se computan aquí; su reconocimiento requiere validación de la Comisión de Carrera.",
  });
  assert.match(pageSource, /className="credit-computation-notice" role="note"/);
  assert.match(pageSource, /aria-label="Cobertura parcial del cómputo de créditos"/);
  assert.match(pageSource, /<strong>Cómputo parcial<\/strong>/);
  assert.match(pageSource, /creditComputationCoverage\.notice/);
  assert.ok(
    pageSource.indexOf('className="credit-computation-notice"') < pageSource.indexOf('className="requirement-heading"'),
    "el aviso debe aparecer antes de la tarjeta desplegable de metas",
  );
});
