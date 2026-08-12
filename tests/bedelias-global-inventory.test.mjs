import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInventoryManifest,
  reconcileInventoryRun,
  selectCatalogServices,
} from "../scripts/bedelias-global-inventory.mjs";

const catalog = {
  source: { system: "SGAE Bedelías", extractedAt: "2026-08-11T00:00:00.000Z" },
  services: [
    { serviceCode: "FING", serviceName: "FACULTAD DE INGENIERÍA", area: "TECNOLOGÍA" },
    { serviceCode: "FIC", serviceName: "FACULTAD DE INFORMACIÓN Y COMUNICACIÓN", area: "SOCIAL" },
  ],
};

test("selecciona servicios de forma reproducible", () => {
  assert.deepEqual(
    selectCatalogServices(catalog, { excludeServices: "FING" }).map((service) => service.serviceCode),
    ["FIC"],
  );
  assert.deepEqual(
    selectCatalogServices(catalog, { services: "FING|FIC", maxServices: 1 }).map((service) => service.serviceCode),
    ["FIC"],
  );
});

test("reanuda servicios completados sólo dentro de la misma selección", () => {
  const previous = {
    createdAt: "2026-08-11T00:00:00.000Z",
    services: [{ code: "FIC", status: "succeeded", attempts: 1 }],
  };
  const state = reconcileInventoryRun(previous, [catalog.services[1]], { services: "FIC", types: "GRADO" }, "2026-08-11T01:00:00.000Z");
  assert.equal(state.createdAt, previous.createdAt);
  assert.equal(state.services[0].status, "succeeded");
  assert.equal(state.services[0].attempts, 1);
});

test("genera manifiesto por plan y sólo una anulación explícita queda auditada", async () => {
  const runState = {
    selection: { services: "FIC" },
    services: [{ code: "FIC", status: "succeeded" }],
  };
  const indexes = new Map([["FIC", {
    source: { system: "SGAE Bedelías", extractedAt: "2026-08-11T00:00:00.000Z" },
    service: { code: "FIC", name: "FACULTAD DE INFORMACIÓN Y COMUNICACIÓN" },
    programs: [{
      name: "LICENCIATURA EN COMUNICACIÓN",
      type: "Grado",
      plans: [{ year: "2012", name: "Plan 2012", current: true }],
    }],
  }]]);
  const key = "FIC:licenciatura en comunicacion:2012";
  const manifest = await buildInventoryManifest({
    catalog,
    runState,
    indexes,
    batches: new Map(),
    overrides: [{ key, state: "audited", evidence: { source: "fixture", at: "2026-08-11" } }],
    types: "GRADO|TECNICATURA|CIO",
  });

  assert.equal(manifest.counts.services, 1);
  assert.equal(manifest.counts.careers, 1);
  assert.equal(manifest.counts.byState.audited, 1);
  assert.equal(manifest.services[0].plans[0].site, null);
  assert.equal(manifest.services[0].plans[0].coverage.site, "not-published-by-service-index");
});
