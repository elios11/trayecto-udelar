import test from "node:test";
import assert from "node:assert/strict";
import { mergePrerequisiteCheckpoint, prerequisiteCheckpointKey } from "../scripts/bedelias-checkpoint.mjs";

const identity = {
  serviceCode: "FING",
  programName: "INGENIERIA EN COMPUTACION",
  year: "1997",
};

test("reconstruye el checkpoint desde el snapshot sin pisar avances mas nuevos", () => {
  const snapshot = {
    service: { code: "FING" },
    program: { name: "INGENIERIA EN COMPUTACION" },
    plan: { year: "1997" },
    prerequisites: [
      { target: { code: "A", assessment: "course" }, expression: "snapshot" },
      { target: { code: "B", assessment: "exam" }, expression: "snapshot" },
      { target: { code: null }, query: { kind: "name", value: "Sin regla" }, noPublishedRule: true },
    ],
  };
  const checkpoint = {
    prerequisites: {
      "A:course": { target: { code: "A", assessment: "course" }, expression: "checkpoint" },
    },
    updatedAt: "2026-08-08T10:00:00.000Z",
  };

  const { checkpoint: merged, restoredRules } = mergePrerequisiteCheckpoint(checkpoint, snapshot, identity);
  assert.equal(restoredRules, 2);
  assert.equal(Object.keys(merged.prerequisites).length, 3);
  assert.equal(merged.prerequisites["A:course"].expression, "checkpoint");
  assert.equal(merged.prerequisites["query:name:Sin regla:none"].noPublishedRule, true);
  assert.match(merged.restoredFromSnapshotAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("no mezcla un snapshot perteneciente a otro plan", () => {
  const { checkpoint, restoredRules } = mergePrerequisiteCheckpoint(
    { prerequisites: { "A:course": { target: { code: "A", assessment: "course" } } } },
    { service: { code: "FING" }, program: { name: "OTRA CARRERA" }, plan: { year: "1997" }, prerequisites: [{ target: { code: "B", assessment: "exam" } }] },
    identity,
  );
  assert.equal(restoredRules, 0);
  assert.deepEqual(Object.keys(checkpoint.prerequisites), ["A:course"]);
  assert.equal(checkpoint.restoredFromSnapshotAt, undefined);
});

test("genera claves estables para reglas y consultas sin publicacion", () => {
  assert.equal(prerequisiteCheckpointKey({ query: { kind: "code", value: "1234" }, noPublishedRule: true }), "query:code:1234:none");
  assert.equal(prerequisiteCheckpointKey({ target: { code: "1234", assessment: "exam" } }), "1234:exam");
  assert.equal(prerequisiteCheckpointKey({ target: {} }), null);
});
