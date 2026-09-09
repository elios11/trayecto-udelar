import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  PERSONAL_DATA_LOCK_KEY,
  addLocalConflict,
  classifyExternalChange,
  parseLocalConflictStore,
  serializeLocalConflictStore,
  writeWithLocalLease,
} from "../app/local-data-concurrency.mjs";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    read: (key) => values.get(key) ?? null,
    write: (key, value) => values.set(key, value),
    remove: (key) => values.delete(key),
    values,
  };
}

const optionsFor = (storage, expectedSerialized = null, ownerId = "tab-a") => ({
  dataKey: "data",
  expectedSerialized,
  ownerId,
  read: storage.read,
  write: storage.write,
  remove: storage.remove,
  randomId: () => "token",
  now: () => 1_000,
});

test("writes only when the durable base still matches and releases its lease", () => {
  const storage = memoryStorage({ data: "old" });
  assert.deepEqual(writeWithLocalLease("new", optionsFor(storage, "old")), { ok: true, serialized: "new" });
  assert.equal(storage.read("data"), "new");
  assert.equal(storage.read(PERSONAL_DATA_LOCK_KEY), null);
});

test("rejects a stale writer without replacing the newer document", () => {
  const storage = memoryStorage({ data: "newer" });
  const result = writeWithLocalLease("stale", optionsFor(storage, "old"));
  assert.equal(result.ok, false);
  assert.equal(result.kind, "conflict");
  assert.equal(storage.read("data"), "newer");
});

test("a live foreign lease makes the fallback conservative", () => {
  const storage = memoryStorage({ [PERSONAL_DATA_LOCK_KEY]: JSON.stringify({ ownerId: "tab-b", token: "b", expiresAt: 5_000 }) });
  const result = writeWithLocalLease("new", optionsFor(storage));
  assert.equal(result.ok, false);
  assert.equal(result.kind, "busy");
  assert.equal(storage.read("data"), null);
});

test("an expired lease can be recovered after a suspended or failed tab", () => {
  const storage = memoryStorage({ [PERSONAL_DATA_LOCK_KEY]: JSON.stringify({ ownerId: "tab-b", token: "b", expiresAt: 999 }) });
  assert.equal(writeWithLocalLease("new", optionsFor(storage)).ok, true);
  assert.equal(storage.read(PERSONAL_DATA_LOCK_KEY), null);
});

test("a failure while writing does not leave a permanent lease", () => {
  const storage = memoryStorage();
  const base = optionsFor(storage);
  assert.throws(() => writeWithLocalLease("new", {
    ...base,
    write: (key, value) => {
      if (key === "data") throw new Error("write failed");
      storage.write(key, value);
    },
  }), /write failed/);
  assert.equal(storage.read(PERSONAL_DATA_LOCK_KEY), null);
});

test("classifies clean, dirty, delayed, and same-revision storage events conservatively", () => {
  const base = { knownSerialized: "a", actualSerialized: "b", eventOldValue: "a", eventNewValue: "b", hasUnsavedChanges: false, knownRevision: 4, eventNewRevision: 5 };
  assert.equal(classifyExternalChange(base), "incorporate");
  assert.equal(classifyExternalChange({ ...base, hasUnsavedChanges: true }), "conflict");
  assert.equal(classifyExternalChange({ ...base, actualSerialized: "c" }), "ignore");
  assert.equal(classifyExternalChange({ ...base, eventOldValue: "older" }), "conflict");
  assert.equal(classifyExternalChange({ ...base, eventNewRevision: 4 }), "conflict");
});

test("conflicting branches survive reload in a bounded durable store", async () => {
  const document = JSON.parse(await readFile(new URL("./fixtures/personal-data-v3-minimal.json", import.meta.url), "utf8"));
  let store = parseLocalConflictStore(null);
  store = addLocalConflict(store, { id: "conflict-1", detectedAt: "2026-09-09T12:00:00.000Z", reason: "stale-write", localDocument: document, externalDocument: document });
  assert.deepEqual(parseLocalConflictStore(serializeLocalConflictStore(store)), store);
});
