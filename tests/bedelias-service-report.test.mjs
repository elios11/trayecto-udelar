import test from "node:test";
import assert from "node:assert/strict";
import { buildServiceReport } from "../scripts/bedelias-service-report.mjs";

test("resume cobertura y mantiene planes estructurales pendientes de fuentes oficiales", () => {
  const index = { service: { code: "FADU", name: "FACULTAD DE ARQUITECTURA" } };
  const target = { serviceCode: "FADU", programName: "ARQUITECTURA", programType: "Grado", year: "2015", current: true };
  const snapshot = {
    source: { system: "SGAE Bedelías", extractedAt: "2026-08-12T00:00:00.000Z", rateLimitMs: 500 },
    plan: { courses: [{ code: "A1" }, { code: "A2" }] },
    prerequisites: [{ expression: {} }, { noPublishedRule: true }],
    extraction: { requestCount: 42 },
    validation: { issues: [] },
    contentHash: "abc",
  };
  const report = buildServiceReport(index, [{ target, snapshot, bytes: 1234 }], "2026-08-12T01:00:00.000Z");
  assert.equal(report.status, "official-sources-pending");
  assert.deepEqual(report.totals, {
    plans: 1,
    courses: 2,
    prerequisiteEntries: 2,
    publishedRules: 1,
    noPublishedRuleQueries: 1,
    validationIssues: 0,
    requests: 42,
    bytes: 1234,
  });
  assert.equal(report.plans[0].state, "structurally-valid");
  assert.equal(report.plans[0].officialSources, "pending");
});
