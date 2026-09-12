import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MAX_DELETED_TERMS,
  MAX_RECOVERY_SNAPSHOTS,
  addDeletedTerm,
  createDeletedTerm,
  createRecoverySnapshot,
  emptyRecoveryStore,
  isDeletedTermAlreadyRestored,
  parseRecoveryStore,
  restoreDeletedTerm,
} from "../app/personal-data-recovery.mjs";

const now = "2026-09-08T12:00:00.000Z";
const fixture = async () => JSON.parse(await readFile(new URL("./fixtures/personal-data-v3-complete.json", import.meta.url), "utf8"));

test("cleans expired recovery records, preserves valid fragments, and applies retention limits", async () => {
  const document = await fixture();
  const valid = { id: "valid", createdAt: now, expiresAt: "2026-12-07T12:00:00.000Z", reason: "Importación", document };
  const parsed = parseRecoveryStore({
    format: "trayecto-personal-data-recovery", formatVersion: 1,
    snapshots: [valid, { id: "broken", createdAt: now, expiresAt: "invalid", document: {} }, { ...valid, id: "expired", expiresAt: "2026-09-08T11:59:59.000Z" }],
    deletedTerms: [{ id: "bad" }],
  }, { now });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.store.snapshots.length, 1);
  assert.equal(parsed.store.snapshots[0].id, "valid");
  assert.ok(parsed.issues.length >= 2);

  let store = emptyRecoveryStore();
  for (let index = 0; index < MAX_RECOVERY_SNAPSHOTS + 2; index += 1) {
    const changed = structuredClone(document);
    changed.id = `document-${index}`;
    changed.profiles[0].progress[0].status = index % 2 ? "approved" : "exonerated";
    const added = createRecoverySnapshot(store, changed, { now: new Date(Date.parse(now) + index * 1000).toISOString(), id: `snapshot-${index}`, reason: "Prueba" });
    assert.equal(added.ok, true);
    store = added.store;
  }
  assert.equal(store.snapshots.length, MAX_RECOVERY_SNAPSHOTS);
  for (let index = 0; index < MAX_DELETED_TERMS + 2; index += 1) {
    const item = createDeletedTerm({ profileId: "profile", planId: "plan", scenarioId: "scenario", originalIndex: index, term: { id: `term-${index}`, label: "Semestre", status: "planned", startsAt: null, endsAt: null, loadTarget: null, courseIds: [] } }, { now, id: `trash-${index}` });
    const added = addDeletedTerm(store, item, { now });
    assert.equal(added.ok, true);
    store = added.store;
  }
  assert.equal(store.deletedTerms.length, MAX_DELETED_TERMS);
});

test("deduplicates consecutive semantically equal snapshots", async () => {
  const document = await fixture();
  const first = createRecoverySnapshot(emptyRecoveryStore(), document, { now, id: "first", reason: "Importación" });
  assert.equal(first.ok, true);
  const repeated = structuredClone(document);
  repeated.revision += 1;
  repeated.updatedAt = "2026-09-08T12:01:00.000Z";
  const second = createRecoverySnapshot(first.store, repeated, { now: repeated.updatedAt, id: "second", reason: "Importación" });
  assert.equal(second.ok, true);
  assert.equal(second.created, false);
  assert.equal(second.store.snapshots.length, 1);
});

test("restores a term at its original position without duplicate courses and preserves orphaned entries", async () => {
  const document = await fixture();
  const profile = document.profiles[0];
  const scenario = profile.planning.scenarios[0];
  scenario.terms = [
    { id: "term-a", label: "A", status: "planned", startsAt: null, endsAt: null, loadTarget: null, courseIds: ["MAT1"] },
    { id: "term-b", label: "B", status: "in-progress", startsAt: "2026-08-03T03:00:00.000Z", endsAt: "2026-12-12T03:00:00.000Z", loadTarget: null, courseIds: ["FIS1", "PROG1"] },
  ];
  scenario.currentTermId = "term-a";
  const deleted = createDeletedTerm({ profileId: profile.id, planId: profile.selection.planId, scenarioId: scenario.id, originalIndex: 1, wasCurrent: true, term: scenario.terms[1] }, { now, id: "deleted-b" });
  scenario.terms = [{ ...scenario.terms[0], courseIds: ["MAT1", "FIS1"] }];
  const restored = restoreDeletedTerm(document, deleted);
  assert.equal(restored.ok, true);
  assert.deepEqual(restored.document.profiles[0].planning.scenarios[0].terms.map((term) => term.id), ["term-a", "term-b"]);
  assert.deepEqual(restored.document.profiles[0].planning.scenarios[0].terms[1].courseIds, ["PROG1"]);
  assert.equal(restored.document.profiles[0].planning.scenarios[0].terms[1].startsAt, "2026-08-03T03:00:00.000Z");
  assert.equal(restored.document.profiles[0].planning.scenarios[0].terms[1].endsAt, "2026-12-12T03:00:00.000Z");
  assert.equal(restored.document.profiles[0].planning.scenarios[0].currentTermId, "term-b");
  assert.deepEqual(restored.omittedCourseIds, ["FIS1"]);
  assert.equal(isDeletedTermAlreadyRestored(document, deleted), false);
  assert.equal(isDeletedTermAlreadyRestored(restored.document, deleted), true);
  const orphan = restoreDeletedTerm(document, { ...deleted, scenarioId: "missing" });
  assert.equal(orphan.ok, false);
  assert.equal(orphan.code, "missing_context");
});
