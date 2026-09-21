import test from "node:test";
import assert from "node:assert/strict";
import {
  compareCurriculumSnapshots,
  createCurriculumSnapshot,
  personalCourseIdsForProfile,
  readCurriculumSnapshot,
  storeCurriculumSnapshot,
} from "../app/curriculum-changes.mjs";

const build = (revision, courses, overrides = {}) => createCurriculumSnapshot({
  planId: "plan-1",
  revision,
  courses,
  creditStructure: { nodes: [{ id: "area", name: "Área", minCredits: 10 }], credentials: [{ id: "degree", title: "Título", minTotalCredits: 20 }] },
  rules: [],
  ...overrides,
});

test("produce una comparación idéntica, determinista e inmutable", () => {
  const snapshot = build("r1", [{ id: "A", name: "Materia A", credits: 10, eligibleRequirementIds: ["area"] }]);
  const original = structuredClone(snapshot);
  const first = compareCurriculumSnapshots(snapshot, structuredClone(snapshot));
  const second = compareCurriculumSnapshots(snapshot, structuredClone(snapshot));
  assert.equal(first.status, "equivalent");
  assert.deepEqual(first, second);
  assert.deepEqual(snapshot, original);
});

test("clasifica altas, cambios y bajas personales sin inferir equivalencias", () => {
  const previous = build("r1", [
    { id: "A", name: "Informática aplicada", credits: 8 },
    { id: "B", name: "Materia B", credits: 10 },
  ]);
  const current = build("r2", [
    { id: "A", name: "Informática aplicada", credits: 9 },
    { id: "C", name: "Informatica Aplicada", credits: 8 },
  ]);
  const result = compareCurriculumSnapshots(previous, current, { personalCourseIds: ["B"] });
  assert.equal(result.adoptionAllowed, false);
  assert.equal(result.severity, "blocked");
  assert.ok(result.differences.some((item) => item.id === "A" && item.kind === "changed"));
  assert.ok(result.differences.some((item) => item.id === "B" && item.kind === "removed" && item.affectsPersonalData));
  assert.ok(result.differences.some((item) => item.id === "C" && item.kind === "added"));
  assert.equal(result.differences.some((item) => item.kind === "aliased"), false);
});

test("sólo un alias oficial resuelve una identidad retirada", () => {
  const previous = build("r1", [{ id: "OLD", name: "Nombre anterior", credits: 10 }]);
  const current = build("r2", [{ id: "NEW", name: "Nombre nuevo", credits: 10 }]);
  const aliases = [{ planId: "plan-1", fromCourseId: "OLD", toCourseId: "NEW", kind: "rename", effectiveAt: "2026-09-20", sourceUrl: "https://example.edu/resolucion" }];
  const result = compareCurriculumSnapshots(previous, current, { personalCourseIds: ["OLD"], aliases });
  assert.equal(result.adoptionAllowed, true);
  assert.ok(result.differences.some((item) => item.kind === "aliased" && item.id === "OLD"));
});

test("protege snapshots ausentes, dañados o de otro plan", () => {
  const current = build("r2", []);
  assert.equal(compareCurriculumSnapshots(null, current).status, "protected");
  assert.equal(compareCurriculumSnapshots({ ...current, planId: "otro" }, current).adoptionAllowed, false);
});

test("guarda snapshots compartidos en una extensión v4 y recoge referencias personales", () => {
  const snapshot = build("r1", [{ id: "A", name: "Materia A", credits: 10 }]);
  const document = { format: "trayecto-personal-data", formatVersion: 4, extensions: { "org.example.keep": { value: true } } };
  const stored = storeCurriculumSnapshot(document, snapshot);
  assert.deepEqual(readCurriculumSnapshot(stored, "plan-1", "r1"), snapshot);
  assert.deepEqual(stored.extensions["org.example.keep"], { value: true });
  assert.deepEqual(personalCourseIdsForProfile({
    progress: [{ courseId: "A" }],
    academicHistory: { events: [{ courseId: "B" }] },
    planning: { scenarios: [{ terms: [{ courseIds: ["C", "A"] }] }] },
  }), ["A", "B", "C"]);
});
