import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const dataDirectory = new URL("../data/bedelias/", import.meta.url);
const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));
const snapshots = readdirSync(dataDirectory)
  .filter((name) => /^fcien-.*\.json$/.test(name))
  .map((name) => readJson(`data/bedelias/${name}`));
const report = readJson("data/bedelias/reports/fcien-pilot.json");
const manifest = readJson("data/bedelias/inventory/global-current.json");

function flatten(node, output = []) {
  if (!node) return output;
  output.push(node);
  for (const child of node.children ?? []) flatten(child, output);
  return output;
}

test("FCIEN conserva los doce planes vigentes extraídos", () => {
  assert.equal(snapshots.length, 12);
  assert.ok(snapshots.every((snapshot) => snapshot.service.code === "FCIEN"));
  assert.ok(snapshots.every((snapshot) => snapshot.plan.current));
});

test("normaliza los créditos por ciclo de Bioquímica sin requisitos crudos", () => {
  const biochemistry = snapshots.find((snapshot) => snapshot.program.name === "LICENCIATURA EN BIOQUÍMICA");
  const nodes = biochemistry.prerequisites.flatMap((rule) => flatten(rule.expression));
  assert.ok(nodes.some((node) => node.cycleCreditRequirement?.minimum === 90
    && node.cycleCreditRequirement?.cycleCode === "22"));
  assert.equal(biochemistry.validation.issues.length, 0);
});

test("reporte y manifiesto conservan la única excepción sin habilitar UI", () => {
  assert.equal(report.totals.plans, 12);
  assert.equal(report.totals.validationIssues, 1);
  assert.equal(report.status, "extracted");

  const oceanography = snapshots.find((snapshot) => snapshot.program.name === "LICENCIATURA EN OCEANOGRAFÍA BIOLÓGICA");
  assert.deepEqual(oceanography.validation.issues.map((issue) => issue.code), ["composition-unavailable"]);
  assert.ok(snapshots.filter((snapshot) => snapshot !== oceanography)
    .every((snapshot) => snapshot.validation.issues.length === 0));

  const fcien = manifest.services.find((service) => service.code === "FCIEN");
  assert.deepEqual(fcien.counts.byState, { "structurally-valid": 11, extracted: 1 });
  assert.equal(fcien.plans.some((plan) => plan.state === "audited"), false);
});
