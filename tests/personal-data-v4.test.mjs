import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { classifyPersonalDataCompatibility, parsePersonalDataV4, serializePersonalDataV4 } from "../app/personal-data.mjs";
import { appStateToPersonalData, hydratePersonalData, migratePersonalDataV3ToV4, parseCompleteTransfer, personalDataToAppState } from "../app/personal-data-migration.mjs";

const fixture = async (name) => JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const now = "2026-09-09T18:00:00.000Z";
const catalogFor = (document) => document.profiles.map((profile) => ({ ...profile.selection, defaultTrajectoryId: profile.selection.trajectoryId, defaultCredentialId: profile.selection.credentialId, loadUnit: profile.loadUnit }));

test("v4 exige historial coherente, conserva extensiones y acumula errores", async () => {
  const migrated = migratePersonalDataV3ToV4(await fixture("personal-data-v3-complete.json"));
  assert.equal(migrated.ok, true);
  migrated.document.extensions = { "org.trayecto.document": { future: true } };
  migrated.document.profiles[0].academicHistory.extensions = { "org.trayecto.history": [1] };
  migrated.document.profiles[0].academicHistory.events[0].extensions = { "org.trayecto.event": "kept" };
  const roundTrip = parsePersonalDataV4(JSON.parse(serializePersonalDataV4(migrated.document)));
  assert.equal(roundTrip.ok, true);
  assert.deepEqual(roundTrip.document.extensions, migrated.document.extensions);
  assert.deepEqual(roundTrip.document.profiles[0].academicHistory.extensions, migrated.document.profiles[0].academicHistory.extensions);
  const broken = structuredClone(migrated.document);
  broken.profiles[0].progress[0].status = "pending";
  const parsed = parsePersonalDataV4(broken);
  assert.equal(parsed.ok, false);
  assert.ok(parsed.issues.some((entry) => entry.code === "history_projection_mismatch"));
  const duplicate = structuredClone(migrated.document);
  duplicate.profiles[0].academicHistory.events.push({ ...duplicate.profiles[0].academicHistory.events[0] });
  const duplicateResult = parsePersonalDataV4(duplicate);
  assert.equal(duplicateResult.ok, false);
  assert.ok(duplicateResult.issues.some((entry) => entry.code === "duplicate_id"));
});

test("el mismo ID de hito se permite en perfiles distintos pero no dentro del mismo perfil", async () => {
  const migrated = migratePersonalDataV3ToV4(await fixture("personal-data-v3-complete.json"));
  assert.equal(migrated.ok, true);
  const first = migrated.document.profiles[0];
  const second = structuredClone(first);
  second.id = "other-profile";
  second.selection = { ...second.selection, planId: "other-plan", progressPlanId: "other-progress" };
  migrated.document.profiles.push(second);
  assert.equal(parsePersonalDataV4(migrated.document).ok, true);
  first.academicHistory.events.push({ ...first.academicHistory.events[0] });
  assert.equal(parsePersonalDataV4(migrated.document).ok, false);
});

test("migración v3→v4 es idempotente, comparte historia canónica y conserva huérfanas", async () => {
  const input = await fixture("personal-data-v3-complete.json");
  input.profiles[0].progress.push({ courseId: "ORPHAN", status: "approved", updatedAt: null });
  const shared = structuredClone(input.profiles[0]);
  shared.id = "shared-profile";
  shared.selection = { ...shared.selection, campusId: null };
  input.profiles.push(shared);
  const migrated = migratePersonalDataV3ToV4(input);
  assert.equal(migrated.ok, true);
  assert.deepEqual(migrated.document.profiles[0].academicHistory, migrated.document.profiles[2].academicHistory);
  assert.equal(migrated.document.profiles[0].academicHistory.events.find((event) => event.courseId === "ORPHAN").occurredAt, null);
  const repeated = migratePersonalDataV3ToV4(migrated.document);
  assert.equal(repeated.ok, true);
  assert.equal(repeated.migrated, false);
  assert.equal(serializePersonalDataV4(repeated.document), serializePersonalDataV4(migrated.document));
});

test("importa v1/v2/v3/v4, migra instantáneamente y protege una versión futura", async () => {
  const v3 = await fixture("personal-data-v3-complete.json");
  const v4 = migratePersonalDataV3ToV4(v3).document;
  const catalog = [
    ...catalogFor(v4),
    { facultyId: "fing", careerId: "computacion", planId: "1997", progressPlanId: "1997", defaultTrajectoryId: "pi-20-59", defaultCredentialId: "engineer", trajectoryIds: ["pi-20-59"], loadUnit: "credits" },
    { facultyId: "fing", careerId: "computacion", planId: "2025", progressPlanId: "2025", defaultTrajectoryId: "pi-60-plus", defaultCredentialId: "engineer", trajectoryIds: ["pi-60-plus"], loadUnit: "credits" },
  ];
  for (const value of [await fixture("personal-data-complete-v1.json"), await fixture("personal-data-complete-v2.json"), v3, v4]) {
    const imported = parseCompleteTransfer(value, { catalog, now, documentId: "imported" });
    assert.equal(imported.ok, true, `versión ${value.formatVersion}`);
    assert.equal(imported.document.formatVersion, 4);
  }
  assert.deepEqual(classifyPersonalDataCompatibility({ ...v4, formatVersion: 5 }), { status: "future-protected", formatVersion: 5 });
  const futureRaw = JSON.stringify({ ...v4, formatVersion: 5 });
  const hydrated = hydratePersonalData({ personalDataV4: futureRaw, personalDataV3: JSON.stringify(v3) }, { catalog, now, documentId: "fallback" });
  assert.equal(hydrated.ok, true);
  assert.equal(hydrated.canonicalWriteBlocked, true);
  assert.equal(hydrated.shouldPersist, false);
});

test("round-trip documento↔estado conserva perfiles, escenarios, revisiones e historial", async () => {
  const migrated = migratePersonalDataV3ToV4(await fixture("personal-data-v3-complete.json"));
  assert.equal(migrated.ok, true);
  const document = migrated.document;
  const alternative = structuredClone(document.profiles[0].planning.scenarios[0]);
  alternative.id = "alternative";
  alternative.isPrimary = false;
  alternative.archived = true;
  document.profiles[0].planning.scenarios.push(alternative);
  const catalog = catalogFor(document);
  const adapted = personalDataToAppState(document, catalog);
  assert.equal(adapted.ok, true);
  const rebuilt = appStateToPersonalData(adapted.state, { catalog, now, previousDocument: document });
  assert.equal(rebuilt.ok, true);
  assert.deepEqual(rebuilt.document, document);
});

test("una importación v4 inválida se rechaza atómicamente sin alterar la entrada", async () => {
  const migrated = migratePersonalDataV3ToV4(await fixture("personal-data-v3-complete.json"));
  assert.equal(migrated.ok, true);
  const transfer = structuredClone(migrated.document);
  transfer.profiles[0].progress[0].status = "pending";
  const snapshot = structuredClone(transfer);
  const imported = parseCompleteTransfer(transfer, {
    catalog: catalogFor(migrated.document),
    now,
    documentId: "atomic-import",
  });
  assert.equal(imported.ok, false);
  assert.ok(imported.issues.some((entry) => entry.code === "history_projection_mismatch"));
  assert.deepEqual(transfer, snapshot);
});

test("la proyección v4 conserva el mismo resultado académico del fixture v3", async () => {
  const input = await fixture("personal-data-v3-complete.json");
  const migrated = migratePersonalDataV3ToV4(input);
  assert.equal(migrated.ok, true);
  const before = Object.fromEntries(input.profiles[0].progress.map((entry) => [entry.courseId, entry.status]));
  const after = Object.fromEntries(migrated.document.profiles[0].progress.map((entry) => [entry.courseId, entry.status]));
  assert.deepEqual(after, before);
  const credits = { 1061: 10, 1023: 8, 1031: 12 };
  const earned = (statuses) => Object.entries(statuses).reduce((sum, [id, status]) => sum + (status === "exonerated" ? credits[id] ?? 0 : 0), 0);
  const approvals = (statuses) => Object.values(statuses).filter((status) => status === "approved" || status === "exonerated").length;
  assert.equal(earned(after), earned(before));
  assert.equal(approvals(after), approvals(before));
});

test("la UI documenta panel plegable, origen migrado, controles accesibles y no guarda notas", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<details className="academic-history-panel">/);
  assert.match(page, /Estado importado, sin fecha/);
  assert.match(page, /Fecha académica \(opcional\)/);
  assert.match(page, /Agregar hito/);
  assert.match(page, /Corregir último hito/);
  assert.doesNotMatch(page, /Calificación|Nota académica|name="grade"/);
});
