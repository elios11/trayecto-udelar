import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  classifyPersonalDataCompatibility,
  parsePersonalDataV3,
  serializePersonalDataV3,
  serializePersonalDataV4,
} from "../app/personal-data.mjs";
import { appStateToPersonalData, hydratePersonalData, migrateLegacyStateToPersonalData, migratePersonalDataV3ToV4, personalDataToAppState } from "../app/personal-data-migration.mjs";
import {
  classifyCurriculumReferences,
  curriculumRevisionForPlan,
  resolveCurriculumCourseReference,
  validateCurriculumAliases,
} from "../app/curriculum-revisions.mjs";

const fixture = async (name) => JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

function catalogFor(document) {
  return document.profiles.map((profile) => ({
    ...profile.selection,
    defaultTrajectoryId: profile.selection.trajectoryId,
    defaultCredentialId: profile.selection.credentialId,
    trajectoryIds: profile.selection.trajectoryId ? [profile.selection.trajectoryId] : [],
    campusIds: profile.selection.campusId ? [profile.selection.campusId] : [],
    credentialIds: profile.selection.credentialId ? [profile.selection.credentialId] : [],
    loadUnit: profile.loadUnit,
    curriculumRevision: curriculumRevisionForPlan(profile.selection.planId),
  }));
}

test("distingue formato, revisión concurrente y versiones futuras protegidas", async () => {
  const input = await fixture("personal-data-v3-minimal.json");
  assert.equal(classifyPersonalDataCompatibility(input).status, "legacy-migratable");
  const current = migratePersonalDataV3ToV4(input).document;
  assert.equal(classifyPersonalDataCompatibility(current).status, "supported");
  assert.equal(classifyPersonalDataCompatibility({ ...current, revision: 999 }).status, "supported");
  assert.deepEqual(classifyPersonalDataCompatibility({ ...current, formatVersion: 5 }), { status: "future-protected", formatVersion: 5 });
  assert.equal(classifyPersonalDataCompatibility({ formatVersion: 2, scope: "all" }).status, "legacy-migratable");
});

test("una copia local futura bloquea la escritura aunque exista un fallback legado", async () => {
  const input = await fixture("personal-data-v3-minimal.json");
  const current = migratePersonalDataV3ToV4(input).document;
  const futureRaw = JSON.stringify({ ...current, formatVersion: 5, mandatorySync: { accountId: "future" } });
  const catalog = [{ facultyId: "fing", careerId: "computacion", planId: "1997", progressPlanId: "1997", defaultTrajectoryId: "pi-20-59", defaultCredentialId: "engineer", loadUnit: "credits" }];
  const hydrated = hydratePersonalData({
    personalDataV4: futureRaw,
    progressV2: JSON.stringify({ 1997: { COURSE: "approved" } }),
    selectionV1: JSON.stringify({ planId: "1997" }),
  }, { catalog, now: "2026-09-09T12:00:00.000Z", documentId: "fallback" });
  assert.equal(hydrated.ok, true);
  assert.equal(hydrated.canonicalWriteBlocked, true);
  assert.equal(hydrated.shouldPersist, false);
  assert.equal(JSON.parse(futureRaw).mandatorySync.accountId, "future");
});

test("la migración asigna una revisión curricular trazable a perfiles nuevos", () => {
  const revision = curriculumRevisionForPlan("1997");
  const migrated = migrateLegacyStateToPersonalData({
    progressV2: { 1997: { COURSE: "approved" } },
    selectionV1: { planId: "1997" },
  }, {
    catalog: [{ facultyId: "fing", careerId: "computacion", planId: "1997", progressPlanId: "1997", defaultTrajectoryId: null, defaultCredentialId: null, loadUnit: "credits", curriculumRevision: revision }],
    now: "2026-09-09T12:00:00.000Z",
    documentId: "migration",
  });
  assert.equal(migrated.ok, true);
  assert.equal(migrated.document.profiles[0].curriculumRevision, revision);
});

test("la hidratación actualiza una sola vez los perfiles v3 sin revisión curricular", async () => {
  const input = await fixture("personal-data-v3-complete.json");
  input.profiles[0].curriculumRevision = null;
  const catalog = catalogFor(input);
  const hydrated = hydratePersonalData({ personalDataV3: JSON.stringify(input) }, {
    catalog,
    now: "2026-09-09T12:00:00.000Z",
    documentId: "unused",
  });
  assert.equal(hydrated.ok, true);
  assert.equal(hydrated.shouldPersist, true);
  assert.equal(hydrated.document.revision, input.revision + 1);
  assert.equal(hydrated.document.profiles[0].curriculumRevision, curriculumRevisionForPlan(input.profiles[0].selection.planId));
  const reread = hydratePersonalData({ personalDataV4: JSON.stringify(hydrated.document) }, {
    catalog,
    now: "2026-09-09T13:00:00.000Z",
    documentId: "unused",
  });
  assert.equal(reread.ok, true);
  assert.equal(reread.shouldPersist, false);
  assert.equal(reread.document.revision, hydrated.document.revision);
});

test("un cliente actual conserva extensiones namespaced al editar datos conocidos", async () => {
  const input = await fixture("personal-data-v3-complete.json");
  input.extensions = { "org.ejemplo.sync": { apiVersion: 7 } };
  input.profiles[0].extensions = { "org.ejemplo.perfil": { nickname: "Turno noche" } };
  input.profiles[0].selection.extensions = { "org.ejemplo.seleccion": true };
  input.profiles[0].progress[0].extensions = { "org.ejemplo.nota": "conservada" };
  input.profiles[0].planning.extensions = { "org.ejemplo.plan": [1, 2] };
  input.profiles[0].planning.scenarios[0].extensions = { "org.ejemplo.escenario": { color: "azul" } };
  input.profiles[0].planning.scenarios[0].terms[0].extensions = { "org.ejemplo.semestre": null };
  const parsed = parsePersonalDataV3(input);
  assert.equal(parsed.ok, true);
  const catalog = catalogFor(parsed.document);
  const appState = personalDataToAppState(parsed.document, catalog);
  assert.equal(appState.ok, true);
  appState.state.progress[parsed.document.profiles[0].selection.progressPlanId][parsed.document.profiles[0].progress[0].courseId] = "exonerated";
  const rebuilt = appStateToPersonalData(appState.state, {
    catalog,
    now: "2026-09-09T12:00:00.000Z",
    previousDocument: parsed.document,
  });
  assert.equal(rebuilt.ok, true);
  assert.deepEqual(rebuilt.document.extensions, input.extensions);
  assert.deepEqual(rebuilt.document.profiles[0].extensions, input.profiles[0].extensions);
  assert.deepEqual(rebuilt.document.profiles[0].selection.extensions, input.profiles[0].selection.extensions);
  assert.deepEqual(rebuilt.document.profiles[0].progress[0].extensions, input.profiles[0].progress[0].extensions);
  assert.deepEqual(rebuilt.document.profiles[0].planning.extensions, input.profiles[0].planning.extensions);
  assert.deepEqual(rebuilt.document.profiles[0].planning.scenarios[0].extensions, input.profiles[0].planning.scenarios[0].extensions);
  assert.deepEqual(rebuilt.document.profiles[0].planning.scenarios[0].terms[0].extensions, input.profiles[0].planning.scenarios[0].terms[0].extensions);
  assert.deepEqual(JSON.parse(serializePersonalDataV4(rebuilt.document)).extensions, input.extensions);
});

test("rechaza extensiones sin namespace para no prometer compatibilidad accidental", async () => {
  const input = await fixture("personal-data-v3-minimal.json");
  input.extensions = { feature: true };
  const parsed = parsePersonalDataV3(input);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.issues.some((issue) => issue.code === "invalid_extension_namespace"));
});

test("resuelve materias vigentes, renombradas, retiradas y huérfanas sin inferir por nombre", () => {
  const aliases = [
    { planId: "plan", fromCourseId: "OLD", toCourseId: "NEW", kind: "rename", effectiveAt: "2026-09-01", sourceUrl: "https://udelar.edu.uy/resolucion" },
    { planId: "plan", fromCourseId: "RETIRED", toCourseId: null, kind: "retired", effectiveAt: "2026-09-01", sourceUrl: "https://udelar.edu.uy/resolucion" },
  ];
  assert.equal(validateCurriculumAliases(aliases).ok, true);
  assert.equal(resolveCurriculumCourseReference("NEW", new Set(["NEW"]), aliases).status, "current");
  assert.equal(resolveCurriculumCourseReference("OLD", new Set(["NEW"]), aliases).status, "aliased");
  assert.equal(resolveCurriculumCourseReference("RETIRED", new Set(["NEW"]), aliases).status, "retired");
  assert.equal(resolveCurriculumCourseReference("UNKNOWN", new Set(["NEW"]), aliases).status, "orphaned");
  assert.equal(validateCurriculumAliases([{ ...aliases[0], sourceUrl: "http://example.com", effectiveAt: "ayer" }]).ok, false);
});

test("las referencias huérfanas permanecen dentro del documento histórico exportable", async () => {
  const input = await fixture("personal-data-v3-complete.json");
  input.profiles[0].progress.push({ courseId: "materia-retirada", status: "approved", updatedAt: null });
  const parsed = parsePersonalDataV3(input);
  assert.equal(parsed.ok, true);
  const byPlan = new Map(input.profiles.map((profile) => [profile.selection.planId, new Set(profile.progress.filter((entry) => entry.courseId !== "materia-retirada").map((entry) => entry.courseId))]));
  const references = classifyCurriculumReferences(parsed.document, byPlan);
  assert.ok(references.some((entry) => entry.courseId === "materia-retirada" && entry.status === "orphaned"));
  assert.match(serializePersonalDataV3(parsed.document), /materia-retirada/);
});
