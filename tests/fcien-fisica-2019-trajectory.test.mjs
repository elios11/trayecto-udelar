import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validatePhysicsProjection, validatePhysicsSource } from "../scripts/build-fcien-fisica-2019.mjs";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const source = await readJson("data/fcien/fisica-2019-trajectory-review.json");
const snapshot = await readJson("data/bedelias/fcien-licenciatura-en-fisica-2019.json");
const projection = await readJson(`app/data/bedelias-generated/${source.planId}.json`);
const inventory = await readJson("data/official-trajectories/inventory.json");
const entry = inventory.plans.find(({ planId }) => planId === source.planId);
const reviews = await readJson("data/official-trajectories/reviews.json");
const registry = await readJson("data/bedelias/audits/official-source-audits.json");

test("Física 2019 conserva evidencia institucional normalizada, huella y regeneración sin red", () => {
  validatePhysicsSource(source, snapshot);
  assert.equal(source.regeneration.networkRequired, false);
  assert.equal(source.regeneration.rawFilesRequired, false);
  assert.equal(source.regeneration.command, "node scripts/build-fcien-fisica-2019.mjs");
  const changed = structuredClone(source);
  changed.sourcePortions["regular-courses"].rows[0][2] = "Semestre 1";
  assert.throws(() => validatePhysicsSource(changed, snapshot), /Huella/);
  changed.fingerprint.value = `sha256:${createHash("sha256").update(JSON.stringify(changed.sourcePortions)).digest("hex")}`;
  assert.throws(() => validatePhysicsSource(changed, snapshot), /assertion|false|truthy/i);
});

test("paridad y frecuencia de 28 cursos no se convierten en trayectoria, oferta ni catálogo verificado", () => {
  validatePhysicsProjection(source, projection, entry);
  const review = reviews.reviews.find(({ planId }) => planId === source.planId);
  assert.equal(review.state, "research-pending");
  assert.equal(review.evidence.ordinalCoursePeriodRows, 0);
  assert.equal(review.evidence.promotedCourseCount, 0);
  assert.equal(review.evidence.regularCourseRows, 28);
  assert.match(review.evidence.reason, /afirmación oficial positiva de ausencia/);
  assert.match(review.evidence.reviewTrigger, /filas nominales curso-período/);
  assert.ok(inventory.pendingQueue.plans.some(({ planId, state }) => planId === source.planId && state === "research-pending"));
});

test("coteja normativa 2017/2018/2021 y mantiene identidad 2019, progreso, mínimos y validación transversal", () => {
  const audit = registry.audits.find(({ identity }) => identity === source.auditIdentity);
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.trajectoryStatus, "research-pending");
  assert.equal(audit.officialPlan.curriculum.sourceDataPath, entry.evidence.sourceDataPath);
  assert.equal(source.sourcePortions["impo-plan"].cdc, "21 de 26/06/2018, Dist. 432/18");
  assert.equal(source.sourcePortions["colibri-record"].issued, "2019");
  assert.deepEqual(projection.creditStructure.credentials[0].requiredCourseGroups.map(({ id, minCompleted, courseIds }) => ({ id, minCompleted, courseIds })), [{ id: "validacion-final-plan", minCompleted: 1, courseIds: ["fcien-validacion-final-plan"] }]);
  assert.match(projection.plan.notice, /recorrido orientativo generado por Trayecto/);
  assert.match(projection.plan.notice, /10 créditos integrales y 8 de iniciación/);
});

test("impide promover o cambiar carga e identidad sin evidencia de inclusión vigente", () => {
  const promoted = structuredClone(projection);
  promoted.courses.find(({ authorityStatus }) => authorityStatus === "candidate").authorityStatus = "verified";
  assert.throws(() => validatePhysicsProjection(source, promoted, entry), /No alterar IDs/);
  const changedLoad = structuredClone(projection);
  changedLoad.courses[0].credits += 1;
  assert.throws(() => validatePhysicsProjection(source, changedLoad, entry), /No alterar IDs/);
  assert.ok(source.trajectoryConclusion.doesNotAuthorize.some((rule) => rule.includes("Anuario 2010")));
});
