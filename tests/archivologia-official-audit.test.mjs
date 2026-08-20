import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-fic-archivologia-2012.json");
const audit = audits.audits.find((entry) => entry.identity === "archivologia:2012");

test("normaliza un único Plan 2012 para Montevideo y Paysandú", () => {
  assert.equal(audit.conclusion.canonicalModel, "one-plan-multiple-offerings");
  assert.equal(audit.conclusion.regionalCurriculumVariant, false);
  assert.deepEqual(projection.campuses.map((campus) => campus.id), ["montevideo", "paysandu"]);
  assert.equal(projection.plan.minCredits, 360);
  assert.equal(projection.plan.durationMonths, 48);
});

test("proyecta la malla oficial de FIC sin atribuirla a Bedelías", () => {
  assert.equal(projection.plan.compositionAvailable, true);
  assert.equal(projection.pathways.bedelias.label, "Malla oficial");
  assert.equal(projection.pathways.bedelias.periods.length, 9);
  assert.equal(projection.courses.length, 45);
  assert.ok(projection.courses.every((course) => course.dataStatus === "official-curriculum"));
  assert.match(projection.source.planDocument, /mallas-curriculares\.fic\.edu\.uy/);
  assert.match(projection.plan.notice, /malla curricular vigente/i);
});

test("conserva mínimos, alternativas y bloques opcionales oficiales", () => {
  const credential = projection.creditStructure.credentials[0];
  const requirements = new Map(credential.nodeRequirements.map((item) => [item.nodeId, item.minCredits]));
  assert.equal(requirements.get("arch-ftc"), 48);
  assert.equal(requirements.get("arch-ain"), 48);
  assert.equal(requirements.get("arch-opc"), 87);
  assert.equal(requirements.get("arch-optativas"), 35);
  assert.equal(requirements.get("arch-electivas"), 5);
  assert.equal(requirements.get("arch-investigacion"), 5);
  assert.equal(requirements.get("arch-extension"), 5);
  assert.equal(requirements.has("arch-opc-restantes"), false);
  assert.deepEqual(credential.requiredCourseGroups.map((group) => group.minCompleted), [1, 1, 2, 1]);
  assert.equal(projection.courses.filter((course) => course.curricularBlock).reduce((sum, course) => sum + course.credits, 0), 87);
});

test("la UI distingue una malla oficial de la composición de Bedelías", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /official-curriculum/);
  assert.match(page, /malla curricular oficial del servicio/);
  assert.match(page, /según \{selected\.dataStatus === "fadu-official"[\s\S]*el servicio universitario/);
});
