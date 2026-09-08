import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PersonalDataValidationError,
  parsePersonalDataV3,
  serializePersonalDataV3,
} from "../app/personal-data.mjs";

const fixture = async (name) => JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

test("acepta y normaliza el documento mínimo sin perfiles", async () => {
  const input = await fixture("personal-data-v3-minimal.json");
  const result = parsePersonalDataV3({ ...input, extensionCompatible: { future: true } });
  assert.equal(result.ok, true);
  assert.deepEqual(result.document, input);
});

test("acepta dos perfiles, unidades distintas y un progressPlanId canónico explícito", async () => {
  const input = await fixture("personal-data-v3-complete.json");
  const result = parsePersonalDataV3(input);
  assert.equal(result.ok, true);
  assert.equal(result.document.profiles.length, 2);
  assert.deepEqual(result.document.profiles.map((profile) => profile.loadUnit), ["credits", "hours"]);
  assert.equal(result.document.profiles[0].selection.planId, "computacion-1997");
  assert.equal(result.document.profiles[0].selection.progressPlanId, "1997");
});

test("serializa de forma determinista y conserva el documento en un round-trip", async () => {
  const input = await fixture("personal-data-v3-complete.json");
  const first = serializePersonalDataV3(input);
  const second = serializePersonalDataV3(input);
  assert.equal(first, second);
  const roundTrip = parsePersonalDataV3(JSON.parse(first));
  assert.equal(roundTrip.ok, true);
  assert.deepEqual(roundTrip.document, input);
});

test("rechaza formatos y versiones desconocidos explícitamente", async () => {
  const input = await fixture("personal-data-v3-minimal.json");
  const result = parsePersonalDataV3({ ...input, format: "desconocido", formatVersion: 2 });
  assert.equal(result.ok, false);
  assert.deepEqual(result.issues.map((issue) => issue.code), ["unknown_format", "unsupported_version"]);
});

test("acumula problemas estructurales, referencias, fechas, estados, objetivos e IDs", async () => {
  const input = await fixture("personal-data-v3-invalid-multiple.json");
  const result = parsePersonalDataV3(input);
  assert.equal(result.ok, false);
  const codes = new Set(result.issues.map((issue) => issue.code));
  for (const code of ["unknown_format", "unsupported_version", "invalid_id", "invalid_revision", "invalid_date", "invalid_enum", "invalid_number", "duplicate_id", "multiple_primary", "archived_reference", "closed_reference", "missing_reference"]) {
    assert.equal(codes.has(code), true, `falta el problema ${code}`);
  }
  assert.ok(result.issues.length > 12);
  assert.ok(result.issues.some((issue) => issue.path.endsWith("selection.progressPlanId")));
});

test("rechaza una materia repetida entre semestres del mismo escenario", async () => {
  const input = await fixture("personal-data-v3-complete.json");
  input.profiles[0].planning.scenarios[0].terms[1].courseIds.push("1061");
  const result = parsePersonalDataV3(input);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "duplicate_course"));
});

test("rechaza un escenario o semestre actual archivado, cerrado o inexistente", async () => {
  const input = await fixture("personal-data-v3-complete.json");
  const scenario = input.profiles[0].planning.scenarios[0];
  scenario.archived = true;
  scenario.currentTermId = "semestre-1";
  const result = parsePersonalDataV3(input);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "archived_reference"));
  assert.ok(result.issues.some((issue) => issue.code === "closed_reference"));

  scenario.archived = false;
  scenario.currentTermId = "inexistente";
  const missing = parsePersonalDataV3(input);
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some((issue) => issue.path.endsWith("currentTermId") && issue.code === "missing_reference"));
});

test("rechaza fechas, revisión, objetivo y estados inválidos", async () => {
  const input = await fixture("personal-data-v3-complete.json");
  input.revision = Number.NaN;
  input.updatedAt = "2020-01-01T00:00:00Z";
  const profile = input.profiles[0];
  profile.progress[0].status = "complete";
  const term = profile.planning.scenarios[0].terms[1];
  term.status = "active";
  term.loadTarget.value = Number.POSITIVE_INFINITY;
  const result = parsePersonalDataV3(input);
  assert.equal(result.ok, false);
  for (const code of ["not_json", "invalid_revision", "invalid_date_order", "invalid_enum", "invalid_number"]) {
    assert.ok(result.issues.some((issue) => issue.code === code), `falta ${code}`);
  }
});

test("no muta la entrada y normaliza fechas con offset", async () => {
  const input = await fixture("personal-data-v3-minimal.json");
  input.createdAt = "2026-09-07T07:00:00-03:00";
  const before = structuredClone(input);
  const result = parsePersonalDataV3(input);
  assert.equal(result.ok, true);
  assert.deepEqual(input, before);
  assert.equal(result.document.createdAt, "2026-09-07T10:00:00.000Z");
  assert.notEqual(result.document, input);
});

test("no lanza ante valores no JSON ni referencias circulares", async () => {
  const input = await fixture("personal-data-v3-minimal.json");
  input.extra = undefined;
  input.circular = input;
  let result;
  assert.doesNotThrow(() => {
    result = parsePersonalDataV3(input);
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.filter((issue) => issue.code === "not_json").length >= 2);
});

test("el serializador sólo acepta documentos v3 válidos", async () => {
  const input = await fixture("personal-data-v3-minimal.json");
  input.activeProfileId = "inexistente";
  assert.throws(() => serializePersonalDataV3(input), (error) => (
    error instanceof PersonalDataValidationError
    && error.issues.some((issue) => issue.code === "missing_reference")
  ));
});
