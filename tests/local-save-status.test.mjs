import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyLocalSaveError,
  failedLocalSaveStatus,
  initialLocalSaveStatus,
  localSaveStatusPresentation,
  persistLocalDocument,
  savedLocalSaveStatus,
} from "../app/local-save-status.mjs";

test("representa comprobación, éxito y última escritura válida", () => {
  assert.deepEqual(initialLocalSaveStatus(), { phase: "checking", savedAt: null, errorKind: null });
  const saved = savedLocalSaveStatus("2026-09-08T18:30:00-03:00");
  assert.equal(saved.savedAt, "2026-09-08T21:30:00.000Z");
  assert.equal(localSaveStatusPresentation(saved).title, "Guardado en este dispositivo");
});

test("sólo confirma y avanza la fecha después de escribir correctamente", () => {
  const writes = [];
  const document = { updatedAt: "2026-09-08T22:00:00.000Z" };
  const saved = persistLocalDocument(document, {
    serialize: JSON.stringify,
    write: (serialized) => writes.push(serialized),
    previousSavedAt: "2026-09-08T21:30:00.000Z",
  });
  assert.equal(saved.ok, true);
  assert.equal(saved.status.savedAt, document.updatedAt);
  assert.equal(writes.length, 1);

  const failed = persistLocalDocument({ updatedAt: "2026-09-08T23:00:00.000Z" }, {
    serialize: JSON.stringify,
    write: () => { throw { name: "QuotaExceededError" }; },
    previousSavedAt: saved.status.savedAt,
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.status.savedAt, document.updatedAt);
  assert.equal(failed.status.errorKind, "quota");
});

test("clasifica cuota, bloqueo y fallos desconocidos sin depender del mensaje", () => {
  assert.equal(classifyLocalSaveError({ name: "QuotaExceededError" }), "quota");
  assert.equal(classifyLocalSaveError({ name: "NS_ERROR_DOM_QUOTA_REACHED" }), "quota");
  assert.equal(classifyLocalSaveError({ name: "SecurityError" }), "blocked");
  assert.equal(classifyLocalSaveError({ name: "NotAllowedError" }), "blocked");
  assert.equal(classifyLocalSaveError(new Error("cualquier mensaje")), "unknown");
});

test("un fallo conserva el último instante durable y sólo el daño canónico impide reintentar", () => {
  const failed = failedLocalSaveStatus({ name: "QuotaExceededError" }, { savedAt: "2026-09-08T21:30:00.000Z" });
  assert.equal(failed.savedAt, "2026-09-08T21:30:00.000Z");
  assert.equal(localSaveStatusPresentation(failed).canRetry, true);
  const corrupt = failedLocalSaveStatus(undefined, { errorKind: "corrupt" });
  assert.equal(localSaveStatusPresentation(corrupt).canRetry, false);
});
