import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  appStateToPersonalData,
  hydratePersonalData,
  migrateLegacyStateToPersonalData,
  parseCompleteTransfer,
  parsePlannerTransferFile,
  personalDataStateFingerprint,
  personalDataToAppState,
  serializePersonalDataForStorage,
} from "../app/personal-data-migration.mjs";
import { parsePersonalDataV3 } from "../app/personal-data.mjs";

const fixture = async (name) => JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const now = "2026-09-08T12:00:00.000Z";
const catalog = [
  { facultyId: "fing", careerId: "computacion", planId: "1997", progressPlanId: "1997", defaultTrajectoryId: "pi-20-59", defaultCredentialId: "engineer", trajectoryIds: ["pi-20-59"], campusIds: ["montevideo"], credentialIds: ["engineer"], loadUnit: "credits" },
  { facultyId: "fing", careerId: "computacion", planId: "2025", progressPlanId: "2025", defaultTrajectoryId: "pi-60-plus", defaultCredentialId: "engineer", trajectoryIds: ["pi-60-plus"], campusIds: ["montevideo"], credentialIds: ["engineer"], loadUnit: "credits" },
  { facultyId: "fmed", careerId: "hours", planId: "hours-plan", progressPlanId: "hours-plan", defaultTrajectoryId: "standard", defaultCredentialId: "degree", loadUnit: "hours" },
  { facultyId: "fartes", careerId: "courses", planId: "courses-plan", progressPlanId: "courses-plan", defaultTrajectoryId: "standard", defaultCredentialId: "degree", loadUnit: "courses" },
  { facultyId: "fhum", careerId: "degree", planId: "shared-degree", progressPlanId: "shared-degree", defaultTrajectoryId: "listener", defaultCredentialId: "degree", loadUnit: "credits" },
  { facultyId: "fhum", careerId: "technical", planId: "shared-technical", progressPlanId: "shared-degree", defaultTrajectoryId: "listener", defaultCredentialId: "technical", loadUnit: "credits" },
];
const options = { catalog, now, documentId: "migration-document" };

test("migrates legacy Computación 1997 progress when v2 is absent", async () => {
  const progressV1 = await fixture("personal-data-legacy-progress-v1.json");
  const result = migrateLegacyStateToPersonalData({
    progressV1,
    selectionV1: { planId: "1997", trajectoryId: "pi-20-59", campusId: "montevideo" },
  }, options);
  assert.equal(result.ok, true);
  assert.deepEqual(result.document.profiles[0].progress, [
    { courseId: "1023", status: "approved", updatedAt: null },
    { courseId: "1061", status: "exonerated", updatedAt: null },
  ]);
});

test("migrates partial v2 storage with credits and hours", async () => {
  const stored = await fixture("personal-data-local-v2.json");
  const result = migrateLegacyStateToPersonalData(stored, options);
  assert.equal(result.ok, true);
  assert.deepEqual(result.document.profiles.map((profile) => [profile.selection.planId, profile.loadUnit]), [
    ["2025", "credits"],
    ["hours-plan", "hours"],
  ]);
  assert.equal(result.document.profiles[0].planning.scenarios[0].currentTermId, "term-1");
  assert.equal(result.document.profiles[0].planning.scenarios[0].terms[0].status, "in-progress");
});

test("keeps equal course IDs isolated across profiles and honors shared progressPlanId", () => {
  const separate = migrateLegacyStateToPersonalData({
    progressV2: { "2025": { SAME: "approved" }, "hours-plan": { SAME: "exonerated" } },
    selectionV1: { planId: "2025" },
  }, options);
  assert.equal(separate.ok, true);
  assert.equal(separate.document.profiles.find((profile) => profile.selection.planId === "2025").progress[0].status, "approved");
  assert.equal(separate.document.profiles.find((profile) => profile.selection.planId === "hours-plan").progress[0].status, "exonerated");

  const shared = migrateLegacyStateToPersonalData({
    progressV2: { "shared-degree": { SHARED: "approved" } },
    plannerV1: { "shared-technical": [{ id: "term-a", label: "Semestre A", courseIds: [] }] },
    selectionV1: { planId: "shared-technical" },
  }, options);
  assert.equal(shared.ok, true);
  assert.equal(shared.document.profiles[0].selection.progressPlanId, "shared-degree");
  assert.equal(shared.document.profiles[0].progress[0].courseId, "SHARED");
});

test("accepts articulated profiles with the same progress in a different entry order", async () => {
  const complete = await fixture("personal-data-v3-complete.json");
  const first = complete.profiles[0];
  const articulated = {
    ...structuredClone(first),
    id: "profile-articulated",
    selection: { facultyId: "fhum", careerId: "technical", planId: "shared-technical", progressPlanId: "shared-degree", campusId: null, trajectoryId: "listener", credentialId: "technical" },
    progress: [...first.progress].reverse(),
  };
  first.selection = { facultyId: "fhum", careerId: "degree", planId: "shared-degree", progressPlanId: "shared-degree", campusId: null, trajectoryId: "listener", credentialId: "degree" };
  complete.activeProfileId = first.id;
  complete.profiles = [first, articulated];
  const articulatedCatalog = catalog.filter((entry) => entry.progressPlanId === "shared-degree");
  const result = personalDataToAppState(complete, articulatedCatalog);
  assert.equal(result.ok, true);
});

test("represents plans that use credits, hours, and course counts", () => {
  const result = migrateLegacyStateToPersonalData({
    progressV2: { "2025": { A: "pending" }, "hours-plan": { B: "approved" }, "courses-plan": { C: "exonerated" } },
    selectionV1: { planId: "courses-plan" },
  }, options);
  assert.equal(result.ok, true);
  assert.deepEqual(new Set(result.document.profiles.map((profile) => profile.loadUnit)), new Set(["credits", "hours", "courses"]));
});

test("prefers a valid v3 document and rereads it without changing metadata", async () => {
  const complete = await fixture("personal-data-v3-complete.json");
  const matchingCatalog = complete.profiles.map((profile) => ({
    ...profile.selection,
    defaultTrajectoryId: profile.selection.trajectoryId,
    defaultCredentialId: profile.selection.credentialId,
    loadUnit: profile.loadUnit,
  }));
  const raw = serializePersonalDataForStorage(complete);
  const hydrated = hydratePersonalData({ personalDataV3: raw, progressV2: "{broken" }, { ...options, catalog: matchingCatalog });
  assert.equal(hydrated.ok, true);
  assert.equal(hydrated.source, "v3");
  assert.equal(hydrated.shouldPersist, false);
  assert.equal(serializePersonalDataForStorage(hydrated.document), raw);
});

test("does not overwrite a corrupt v3 and recovers valid legacy fragments", () => {
  const hydrated = hydratePersonalData({
    personalDataV3: "{broken",
    progressV2: JSON.stringify({ "2025": { GOOD: "approved", BAD: "unknown" } }),
    plannerV1: "{also-broken",
    selectionV1: JSON.stringify({ planId: "2025" }),
    visualPreferences: JSON.stringify({ theme: "oscuro", appMode: "planner" }),
  }, options);
  assert.equal(hydrated.ok, true);
  assert.equal(hydrated.canonicalWriteBlocked, true);
  assert.equal(hydrated.shouldPersist, false);
  assert.deepEqual(hydrated.state.progress["2025"], { GOOD: "approved" });
  assert.ok(hydrated.issues.some((entry) => entry.path === "$.personalDataV3"));
  assert.ok(hydrated.issues.some((entry) => entry.path === "$.plannerV1"));
  assert.doesNotMatch(serializePersonalDataForStorage(hydrated.document), /theme|oscuro|appMode/);
});

test("exports, imports, and exports v3 without semantic loss", async () => {
  const complete = await fixture("personal-data-v3-complete.json");
  const matchingCatalog = complete.profiles.map((profile) => ({
    ...profile.selection,
    defaultTrajectoryId: profile.selection.trajectoryId,
    defaultCredentialId: profile.selection.credentialId,
    loadUnit: profile.loadUnit,
  }));
  const adapted = personalDataToAppState(complete, matchingCatalog);
  assert.equal(adapted.ok, true);
  const rebuilt = appStateToPersonalData(adapted.state, {
    catalog: matchingCatalog,
    now: complete.updatedAt,
    previousDocument: complete,
  });
  assert.equal(rebuilt.ok, true);
  rebuilt.document.revision = complete.revision;
  assert.equal(serializePersonalDataForStorage(rebuilt.document), serializePersonalDataForStorage(complete));
});

test("imports the complete historical v1/v2 shapes actually accepted by the app", async () => {
  for (const name of ["personal-data-complete-v1.json", "personal-data-complete-v2.json"]) {
    const transfer = await fixture(name);
    const result = parseCompleteTransfer(transfer, options);
    assert.equal(result.ok, true, name);
    assert.equal(result.sourceVersion, transfer.formatVersion);
    assert.equal(result.document.profiles[0].selection.planId, transfer.plan);
  }
});

test("extracts planner v1 and planner data from complete v2 and v3", async () => {
  const plannerV1 = await fixture("personal-data-planner-v1.json");
  const fullV2 = await fixture("personal-data-complete-v2.json");
  const v3Migration = parseCompleteTransfer(fullV2, options);
  assert.equal(v3Migration.ok, true);
  const cases = [plannerV1, fullV2, v3Migration.document];
  for (const value of cases) {
    const result = parsePlannerTransferFile(value, { ...options, planId: "2025" });
    assert.equal(result.ok, true);
    assert.equal(result.planner.currentTermId, value === plannerV1 ? "term-1" : "term-2");
  }
});

test("rejects future versions, broken references, duplicates, and other-plan planner files", async () => {
  const future = await fixture("personal-data-complete-v2.json");
  future.formatVersion = 99;
  assert.equal(parseCompleteTransfer(future, options).ok, false);
  const planner = await fixture("personal-data-planner-v1.json");
  planner.planner.terms.push({ id: "term-2", label: "Semestre 2", courseIds: ["MAT1"] });
  assert.equal(parsePlannerTransferFile(planner, { ...options, planId: "2025" }).ok, false);
  assert.equal(parsePlannerTransferFile({ ...planner, plan: "1997" }, { ...options, planId: "2025" }).ok, false);
  const badSelection = migrateLegacyStateToPersonalData({ selectionV1: { planId: "missing" } }, options);
  assert.equal(badSelection.ok, true);
  assert.ok(badSelection.issues.some((entry) => entry.code === "unknown_plan"));
});

test("state fingerprint excludes visual preferences and remains deterministic", () => {
  const state = { progress: {}, plannerPlans: {}, currentPlannerTerms: {}, selection: null, theme: "bosque" };
  assert.equal(personalDataStateFingerprint(state), '{"progress":{},"plannerPlans":{},"currentPlannerTerms":{},"selection":null}');
  assert.equal(parsePersonalDataV3({}).ok, false);
});
