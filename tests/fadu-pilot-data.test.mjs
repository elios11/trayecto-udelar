import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const snapshots = [
  "fadu-arquitectura-2015.json",
  "fadu-licenciatura-en-diseno-de-comunicacion-visual-2007.json",
  "fadu-licenciatura-en-diseno-industrial-2013.json",
].map((file) => JSON.parse(readFileSync(new URL(`../data/bedelias/${file}`, import.meta.url), "utf8")));
const manifest = JSON.parse(readFileSync(new URL("../data/bedelias/inventory/global-current.json", import.meta.url), "utf8"));

function walk(node, output = []) {
  if (!node) return output;
  output.push(node);
  for (const child of node.children ?? []) walk(child, output);
  return output;
}

test("el piloto FADU conserva identidad, títulos y procedencia por plan", () => {
  assert.equal(snapshots.length, 3);
  for (const snapshot of snapshots) {
    assert.equal(snapshot.service.code, "FADU");
    assert.equal(snapshot.plan.current, true);
    assert.equal(snapshot.plan.metadata.type, "Plan por créditos");
    assert.ok(snapshot.plan.metadata.minCredits > 0);
    assert.ok(snapshot.plan.titleLabels.length > 0);
    assert.match(snapshot.source.extractedAt, /^2026-08-12T/);
    assert.equal(snapshot.source.rateLimitMs, 500);
    assert.match(snapshot.plan.sourceUrl, /^https:\/\/bedelias\.udelar\.edu\.uy\//);
    assert.match(snapshot.contentHash, /^[a-f0-9]{64}$/);
  }
});

test("los snapshots FADU superan el contrato estructural automático", () => {
  for (const snapshot of snapshots) {
    assert.deepEqual(snapshot.validation.issues, []);
    const courseKeys = snapshot.plan.courses.map((course) => `${course.serviceCode ?? snapshot.service.code}:${course.code}`);
    assert.equal(new Set(courseKeys).size, courseKeys.length);
    assert.ok(snapshot.plan.courses.every((course) => course.code && course.name && Number.isFinite(course.credits) && course.credits >= 0));
    assert.ok(snapshot.prerequisites.every((rule) => rule.noPublishedRule || rule.expression));
    const nodes = snapshot.prerequisites.flatMap((rule) => walk(rule.expression));
    assert.ok(nodes.every((node) => node.parserStatus !== "raw"));
    assert.ok(nodes.flatMap((node) => node.options ?? []).every((option) => option.code && option.name));
    assert.ok(nodes.flatMap((node) => node.creditOptionsRequirement?.options ?? []).every((option) => option.code && option.name));
  }
});

test("el manifiesto habilita sólo las proyecciones FADU con auditoría oficial", () => {
  const fadu = manifest.services.find((service) => service.code === "FADU");
  assert.ok(fadu);
  assert.equal(fadu.counts.plans, 3);
  assert.deepEqual(fadu.counts.byState, { audited: 3 });
  assert.ok(fadu.plans.every((plan) => plan.state === "audited"));
  assert.ok(fadu.plans.every((plan) => plan.coverage.officialSources === "audited"));
  assert.ok(fadu.plans.every((plan) => plan.stateEvidence.source === "docs/fadu-auditoria-oficial.md"));
  assert.ok(fadu.plans.every((plan) => plan.site === null));
});
