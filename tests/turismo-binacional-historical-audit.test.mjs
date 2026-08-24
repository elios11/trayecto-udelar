import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8"));

test("las dos identidades binacionales quedan cerradas como antecedentes del Plan 2014", () => {
  const registry = readJson("data/bedelias/audits/official-source-audits.json");
  const identities = ["licenciatura binacional en turismo:2004", "tecnicatura binacional en turismo:2004"];
  const audits = identities.map((identity) => registry.audits.find((entry) => entry.identity === identity));
  assert.ok(audits.every(Boolean));
  assert.ok(audits.every((audit) => audit.status === "official-evidence-complete"));
  assert.ok(audits.every((audit) => audit.conclusion.excludeFromCurrentUi));
  assert.ok(audits.every((audit) => audit.conclusion.canonicalIdentity === "licenciatura en turismo:2014"));
  assert.ok(audits.every((audit) => audit.officialPlan.lastAdmissionGeneration === 2012));
  assert.equal(audits[1].officialPlan.currentSuccessor.intermediateTitleAvailable, false);
});

test("la UI conserva una sola Licenciatura en Turismo vigente y ninguna opción binacional", () => {
  const report = readJson("data/bedelias/inventory/ui-extracted-plans.json");
  const identities = new Set(report.plans.map((plan) => plan.identity));
  assert.ok(!identities.has("licenciatura binacional en turismo:2004"));
  assert.ok(!identities.has("tecnicatura binacional en turismo:2004"));
  assert.ok(identities.has("licenciatura en turismo:2014"));
  assert.equal(report.plans.filter((plan) => plan.identity === "licenciatura en turismo:2014").length, 1);
});
