import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolveAcademicOption } from "../app/academic-option.mjs";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const civilData = JSON.parse(await readFile(new URL("../app/data/civil-2021-fing.json", import.meta.url), "utf8"));

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

test("resolves a real Civil profile while the previous plan id is still present", () => {
  assert.equal(civilData.profiles.basic, undefined);
  const profile = resolveAcademicOption(civilData.profiles, "pi-60-plus", "basic");
  assert.ok(profile);
  assert.ok(Array.isArray(profile.semesters));
  assert.equal(profile, Object.values(civilData.profiles)[0]);
});

test("profile builders stop safely when a projection has no options", () => {
  assert.equal(resolveAcademicOption({}, "construction", "basic"), undefined);
  assert.match(pageSource, /const profile = resolveAcademicOption\(data\.profiles, profileId, "basic"\);\s+if \(!profile\) return \[\];/);
  assert.match(pageSource, /const trajectory = resolveAcademicOption\(data\.trajectories, trajectoryId, "suggested"\);\s+if \(!trajectory\) return \[\];/);
});
