import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildRegionalOfferingsManifest,
  canonicalPlanIdentity,
} from "../scripts/bedelias-regional-offerings.mjs";

const globalManifest = JSON.parse(readFileSync(
  new URL("../data/bedelias/inventory/global-current.json", import.meta.url),
  "utf8",
));

test("normaliza la identidad canónica sin confundir servicio con trayectoria", () => {
  assert.equal(
    canonicalPlanIdentity("INGENIERÍA EN COMPUTACIÓN", "2025"),
    canonicalPlanIdentity("Ingenieria en Computacion", 2025),
  );
});

test("conserva las ofertas regionales y reduce la cola a planes canónicos nuevos", () => {
  const manifest = buildRegionalOfferingsManifest(globalManifest, {
    generatedAt: "2026-08-14T00:00:00.000Z",
  });

  assert.deepEqual(manifest.counts, {
    regionalOffers: 92,
    canonicalRegionalIdentities: 73,
    centralMatchedOffers: 57,
    centralMatchedIdentities: 43,
    regionalOnlyOffers: 35,
    regionalOnlyIdentities: 30,
    repeatedRegionalIdentities: 14,
    offersInRegionalRepeats: 33,
    extractionTargetsByService: {
      CENURSO: 2,
      CUCEL: 2,
      CUR: 5,
      CURE: 6,
      CUT: 5,
      CENURLN: 10,
    },
  });
  assert.equal(new Set(manifest.canonicalPlans.map((plan) => plan.identity)).size, 73);
  assert.equal(manifest.canonicalPlans.flatMap((plan) => plan.offerings).length, 92);
  assert.equal(manifest.extractionTargets.length, 30);
});

test("no extrae coincidencias centrales ni afirma equivalencia curricular sin verificar", () => {
  const manifest = buildRegionalOfferingsManifest(globalManifest);
  const matched = manifest.canonicalPlans.filter((plan) => plan.centralMatches.length > 0);

  assert.equal(matched.length, 43);
  assert.ok(matched.every((plan) => plan.extractionTarget === null));
  assert.ok(matched.every((plan) => plan.equivalence.status === "pending-content-comparison"));
  assert.ok(manifest.canonicalPlans.every((plan) => plan.presentation.dimension === "site"));
  assert.ok(manifest.canonicalPlans.every((plan) =>
    plan.presentation.siteSelector === "only-when-curricular-differences-are-verified"));
});

test("elige una única oferta representante por identidad regional nueva", () => {
  const manifest = buildRegionalOfferingsManifest(globalManifest);
  const targetKeys = new Set(manifest.extractionTargets.map((target) => target.planKey));

  assert.equal(targetKeys.size, 30);
  assert.ok(manifest.extractionTargets.every((target) =>
    !manifest.canonicalPlans.find((plan) => plan.identity === target.identity).centralMatches.length));
  assert.deepEqual(
    manifest.extractionTargets.filter((target) => target.serviceCode === "CENURSO")
      .map((target) => [target.careerName, target.planYear]),
    [
      ["TECNICATURA UNIVERSITARIA EN BIENES CULTURALES", "2021"],
      ["TECNÓLOGO EN ADMINISTRACIÓN Y CONTABILIDAD", "2012"],
    ],
  );
});
