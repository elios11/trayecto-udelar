import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createDeletedTerm, createRecoverySnapshot, emptyRecoveryStore, matchesPersistedRecoveryStore, persistRecoveryStore, removeRecoveryItem } from "../app/personal-data-recovery.mjs";
import { MAX_UNDO_STEPS, createUndoEntry, isUndoShortcut, pushUndoEntry, takeUndoEntry } from "../app/personal-data-recovery-session.mjs";

const now = "2026-09-08T12:00:00.000Z";
const fixture = async () => JSON.parse(await readFile(new URL("./fixtures/personal-data-v3-complete.json", import.meta.url), "utf8"));
const state = (label = "Semestre 1") => ({
  progress: { "2025": { MAT1: "approved" } },
  plannerPlans: { "2025": [{ id: "term-1", label, courseIds: ["MAT1"] }] },
  currentPlannerTerms: { "2025": "term-1" },
  selection: { facultyId: "fing", careerId: "computacion", planId: "2025", progressPlanId: "2025", campusId: null, trajectoryId: "pi-60-plus", credentialId: "engineer" },
});

test("undo stores both personal state and recovery, is capped, and does not recurse", () => {
  const deleted = createDeletedTerm({
    profileId: "profile", planId: "2025", scenarioId: "scenario", originalIndex: 0,
    term: { id: "term-1", label: "Semestre 1", status: "planned", startsAt: null, endsAt: null, loadTarget: null, courseIds: ["MAT1"] },
  }, { now, id: "trash-1" });
  const recovery = { ...emptyRecoveryStore(), deletedTerms: [deleted] };
  const deletedCheckpoint = createUndoEntry("eliminación", state(), emptyRecoveryStore());
  const restoredCheckpoint = createUndoEntry("restauración", state("Restaurado"), recovery);
  const deletionUndo = takeUndoEntry([deletedCheckpoint]);
  const restorationUndo = takeUndoEntry([restoredCheckpoint]);

  assert.deepEqual(deletionUndo.entry.recovery.deletedTerms, []);
  assert.equal(restorationUndo.entry.recovery.deletedTerms[0].id, "trash-1");
  assert.equal(deletionUndo.stack.length, 0);
  assert.equal(restorationUndo.stack.length, 0);

  const sourceState = state("Origen");
  const isolated = createUndoEntry("aislado", sourceState, emptyRecoveryStore());
  sourceState.plannerPlans["2025"][0].label = "cambiado";
  assert.equal(isolated.state.plannerPlans["2025"][0].label, "Origen");

  let stack = [];
  for (let index = 0; index < MAX_UNDO_STEPS + 2; index += 1) stack = pushUndoEntry(stack, createUndoEntry(`paso ${index}`, state(String(index)), emptyRecoveryStore()));
  assert.equal(stack.length, MAX_UNDO_STEPS);
  assert.equal(stack[0].description, "paso 2");
  const popped = takeUndoEntry(stack);
  assert.equal(popped.entry.description, "paso 21");
  assert.equal(popped.stack.length, MAX_UNDO_STEPS - 1);
});

test("undo shortcut ignores editable targets and modals", () => {
  assert.equal(isUndoShortcut({ key: "z", ctrlKey: true, target: { tagName: "DIV" } }), true);
  assert.equal(isUndoShortcut({ key: "z", metaKey: true, target: { tagName: "INPUT" } }), false);
  assert.equal(isUndoShortcut({ key: "z", ctrlKey: true, target: { isContentEditable: true } }), false);
  assert.equal(isUndoShortcut({ key: "z", ctrlKey: true, modalOpen: true, target: { tagName: "DIV" } }), false);
});

test("a recovery write failure leaves the proposed import or reset state untouched", async () => {
  const document = await fixture();
  const proposedState = state("Importado");
  let appliedState = state();
  const prepared = createRecoverySnapshot(emptyRecoveryStore(), document, { now, id: "before-import", reason: "Importación completa" });
  assert.equal(prepared.ok, true);
  const snapshot = persistRecoveryStore(prepared.store, { now, write: () => { throw new Error("quota"); } });
  if (snapshot.ok) appliedState = proposedState;

  assert.equal(snapshot.ok, false);
  assert.equal(appliedState.plannerPlans["2025"][0].label, "Semestre 1");
  assert.equal(document.formatVersion, 3);
});

test("permanent removal and trash clearing only commit after their recovery write succeeds", async () => {
  const document = await fixture();
  const snapshot = createRecoverySnapshot(emptyRecoveryStore(), document, { now, id: "removable", reason: "Prueba" });
  assert.equal(snapshot.ok, true);
  const removed = removeRecoveryItem(snapshot.store, "snapshot", "removable", { now });
  assert.equal(removed.ok, true);
  let visibleStore = snapshot.store;
  const failed = persistRecoveryStore(removed.store, { now, write: () => { throw new Error("quota"); } });
  if (failed.ok) visibleStore = removed.store;
  assert.equal(visibleStore.snapshots.length, 1);
});

test("an undo skips the recovery write when the checkpoint already matches durable storage", () => {
  const store = emptyRecoveryStore();
  const saved = persistRecoveryStore(store, { now, write: () => {} });
  assert.equal(saved.ok, true);
  assert.equal(matchesPersistedRecoveryStore(store, saved.serialized, { now }), true);
  const item = createDeletedTerm({
    profileId: "profile", planId: "2025", scenarioId: "scenario", originalIndex: 0,
    term: { id: "term-1", label: "Semestre 1", status: "planned", startsAt: null, endsAt: null, loadTarget: null, courseIds: [] },
  }, { now, id: "changed" });
  assert.equal(matchesPersistedRecoveryStore({ ...store, deletedTerms: [item] }, saved.serialized, { now }), false);
});
