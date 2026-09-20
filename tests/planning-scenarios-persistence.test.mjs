import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { addLocalConflict, parseLocalConflictStore, serializeLocalConflictStore, writeWithLocalLease } from "../app/local-data-concurrency.mjs";
import {
  appStateToPersonalData,
  migratePersonalDataV3ToV4,
  parseCompleteTransfer,
  parsePlannerTransferFile,
  personalDataToAppState,
  serializePersonalDataForStorage,
} from "../app/personal-data-migration.mjs";
import { parsePersonalDataV4 } from "../app/personal-data.mjs";
import { duplicatePlanningScenario, replaceActiveScenarioPlanning } from "../app/planning-scenarios.mjs";

const now = "2026-09-15T12:00:00.000Z";
const fixture = async (name) => JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const catalogFor = (document) => document.profiles.map((profile) => ({
  ...profile.selection,
  defaultTrajectoryId: profile.selection.trajectoryId,
  defaultCredentialId: profile.selection.credentialId,
  trajectoryIds: profile.selection.trajectoryId ? [profile.selection.trajectoryId] : [],
  campusIds: profile.selection.campusId ? [profile.selection.campusId] : [],
  credentialIds: profile.selection.credentialId ? [profile.selection.credentialId] : [],
  loadUnit: profile.loadUnit,
}));

async function documentWithScenarios() {
  const migrated = migratePersonalDataV3ToV4(await fixture("personal-data-v3-complete.json"));
  assert.equal(migrated.ok, true);
  const document = migrated.document;
  const profile = document.profiles[0];
  const duplicate = duplicatePlanningScenario(profile.planning, profile.planning.activeScenarioId, {
    now,
    activate: true,
    idGenerator: ((values) => () => values.shift())(["scenario-alt", "term-alt-1", "term-alt-2"]),
  });
  assert.equal(duplicate.ok, true);
  const archived = structuredClone(duplicate.scenario);
  archived.id = "scenario-archived";
  archived.name = "Archivado";
  archived.archived = true;
  const archivedCurrentIndex = archived.terms.findIndex((term) => term.id === archived.currentTermId);
  archived.terms = archived.terms.map((term, index) => ({ ...term, id: `archived-${index}` }));
  archived.currentTermId = archivedCurrentIndex >= 0 ? archived.terms[archivedCurrentIndex].id : null;
  profile.planning = { ...duplicate.planning, scenarios: [...duplicate.planning.scenarios, archived] };
  return document;
}

test("v4 conserva todos los escenarios mientras sólo el activo recibe la edición React", async () => {
  const document = await documentWithScenarios();
  const catalog = catalogFor(document);
  const progressBefore = structuredClone(document.profiles[0].progress);
  const historyBefore = structuredClone(document.profiles[0].academicHistory);
  const primaryBefore = structuredClone(document.profiles[0].planning.scenarios.find((scenario) => scenario.isPrimary));
  const archivedBefore = structuredClone(document.profiles[0].planning.scenarios.find((scenario) => scenario.archived));
  const adapted = personalDataToAppState(document, catalog);
  assert.equal(adapted.ok, true);
  adapted.state.plannerPlans[document.profiles[0].selection.planId][0].label = "Editado en alternativa";
  const rebuilt = appStateToPersonalData(adapted.state, { catalog, now: "2026-09-15T12:01:00.000Z", previousDocument: document });
  assert.equal(rebuilt.ok, true);
  const planning = rebuilt.document.profiles[0].planning;
  assert.equal(planning.scenarios.find((scenario) => scenario.id === "scenario-alt").terms[0].label, "Editado en alternativa");
  assert.deepEqual(planning.scenarios.find((scenario) => scenario.isPrimary), primaryBefore);
  assert.deepEqual(planning.scenarios.find((scenario) => scenario.archived), archivedBefore);
  assert.deepEqual(
    Object.fromEntries(rebuilt.document.profiles[0].progress.map((entry) => [entry.courseId, entry])),
    Object.fromEntries(progressBefore.map((entry) => [entry.courseId, entry])),
  );
  assert.deepEqual(rebuilt.document.profiles[0].academicHistory, historyBefore);

  const exported = parseCompleteTransfer(JSON.parse(serializePersonalDataForStorage(rebuilt.document)), { catalog, now, documentId: "unused" });
  assert.equal(exported.ok, true);
  assert.deepEqual(exported.document.profiles[0].planning.scenarios.map((scenario) => [scenario.id, scenario.archived]), [
    [primaryBefore.id, false], ["scenario-alt", false], ["scenario-archived", true],
  ]);
});

test("planificador v1 sustituye sólo el escenario activo y conserva identidades ajenas", async () => {
  const document = await documentWithScenarios();
  const profile = document.profiles[0];
  const untouched = profile.planning.scenarios.filter((scenario) => scenario.id !== profile.planning.activeScenarioId).map((scenario) => structuredClone(scenario));
  const plannerFile = await fixture("personal-data-planner-v1.json");
  plannerFile.plan = profile.selection.planId;
  const parsed = parsePlannerTransferFile(plannerFile, { catalog: catalogFor(document), now, documentId: "unused", planId: profile.selection.planId });
  assert.equal(parsed.ok, true);
  const replaced = replaceActiveScenarioPlanning(profile.planning, parsed.planner, { now });
  assert.equal(replaced.ok, true);
  assert.deepEqual(replaced.planning.scenarios.filter((scenario) => scenario.id !== profile.planning.activeScenarioId), untouched);
  assert.deepEqual(replaced.scenario.terms.map((term) => ({ id: term.id, label: term.label, courseIds: term.courseIds })), parsed.planner.terms.map((term) => ({ id: term.id, label: term.label, courseIds: term.courseIds })));
});

test("una escritura estructural obsoleta conserva la rama externa y devuelve conflicto", async () => {
  const base = await documentWithScenarios();
  const external = structuredClone(base);
  external.revision += 1;
  external.updatedAt = "2026-09-15T12:02:00.000Z";
  external.profiles[0].planning.scenarios[0].name = "Cambio externo";
  const local = structuredClone(base);
  local.revision += 1;
  local.updatedAt = "2026-09-15T12:03:00.000Z";
  local.profiles[0].planning.scenarios[0].name = "Cambio local";
  const dataKey = "data";
  const memory = new Map([[dataKey, serializePersonalDataForStorage(external)]]);
  const result = writeWithLocalLease(serializePersonalDataForStorage(local), {
    dataKey,
    expectedSerialized: serializePersonalDataForStorage(base),
    ownerId: "tab-local",
    read: (key) => memory.get(key) ?? null,
    write: (key, value) => memory.set(key, value),
    remove: (key) => memory.delete(key),
    randomId: () => "lease",
  });
  assert.equal(result.ok, false);
  assert.equal(result.kind, "conflict");
  const durable = parsePersonalDataV4(JSON.parse(memory.get(dataKey)));
  assert.equal(durable.ok, true);
  assert.equal(durable.document.profiles[0].planning.scenarios[0].name, "Cambio externo");
  const conflicts = addLocalConflict(parseLocalConflictStore(null), {
    id: "conflict-scenario",
    detectedAt: now,
    reason: "stale-write",
    localDocument: local,
    externalDocument: external,
  });
  const reloaded = parseLocalConflictStore(serializeLocalConflictStore(conflicts));
  assert.equal(reloaded.items[0].localDocument.profiles[0].planning.scenarios[0].name, "Cambio local");
  assert.equal(reloaded.items[0].externalDocument.profiles[0].planning.scenarios[0].name, "Cambio externo");
});
