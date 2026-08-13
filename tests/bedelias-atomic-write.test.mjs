import test from "node:test";
import assert from "node:assert/strict";
import { renameWithRetry } from "../scripts/bedelias-atomic-write.mjs";

test("reintenta bloqueos transitorios de Windows antes de completar el renombre", async () => {
  let attempts = 0;
  const waits = [];

  await renameWithRetry("source.tmp", "destination.json", {
    renameFile: async () => {
      attempts += 1;
      if (attempts < 3) throw Object.assign(new Error("locked"), { code: "EPERM" });
    },
    wait: async (delay) => waits.push(delay),
    baseDelayMs: 10,
  });

  assert.equal(attempts, 3);
  assert.deepEqual(waits, [10, 20]);
});

test("no reintenta errores que no representan un bloqueo transitorio", async () => {
  let attempts = 0;

  await assert.rejects(
    renameWithRetry("source.tmp", "destination.json", {
      renameFile: async () => {
        attempts += 1;
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      },
      wait: async () => {},
    }),
    { code: "ENOENT" },
  );

  assert.equal(attempts, 1);
});
