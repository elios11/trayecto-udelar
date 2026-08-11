import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("falls back to a valid Plan 2025 trajectory during a cross-career transition", () => {
  assert.match(
    pageSource,
    /const activePlan2025Trajectory = plan2025Data\.trajectories\[trajectoryId\] \?\? plan2025Data\.trajectories\["pi-60-plus"\]/,
  );
  const directReads = pageSource.match(/plan2025Data\.trajectories\[trajectoryId\]\./g) ?? [];
  assert.equal(directReads.length, 0);
});

test("prepares trajectory and credential before activating the new plan", () => {
  const transition = pageSource.slice(
    pageSource.indexOf("const selectAcademicPlan"),
    pageSource.indexOf("const expandFullElectivesCatalog"),
  );
  assert.ok(transition.indexOf("setTrajectoryId") < transition.indexOf("setPlanYear"));
  assert.ok(transition.indexOf("setCredentialId") < transition.indexOf("setPlanYear"));
});
