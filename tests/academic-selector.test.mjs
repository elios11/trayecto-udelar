import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const curatedCatalog = JSON.parse(await readFile(new URL("../app/data/curated-academic-catalog.json", import.meta.url), "utf8"));

test("organizes every incorporated plan by faculty and career", () => {
  assert.match(pageSource, /<span>Facultad<\/span>/);
  const facultyLabels = curatedCatalog.map(({ label }) => label);
  const careers = curatedCatalog.flatMap((faculty) => faculty.careers);
  const careerLabels = careers.map(({ label }) => label);
  const planIds = careers.flatMap((career) => career.plans.map(({ id }) => id));
  assert.ok(facultyLabels.includes("Facultad de Ingeniería"));
  assert.ok(careerLabels.includes("Ingeniería en Computación"));
  assert.ok(careerLabels.includes("Ingeniería Eléctrica"));
  assert.ok(planIds.includes("2025"));
  assert.ok(planIds.includes("1997"));
  assert.ok(planIds.includes("electrica-2023"));
  assert.ok(facultyLabels.includes("Facultad de Química"));
  assert.ok(careerLabels.includes("Química Farmacéutica"));
  assert.ok(planIds.includes("qf-2015"));
  assert.ok(facultyLabels.includes("Facultad de Arquitectura, Diseño y Urbanismo"));
  assert.ok(careerLabels.includes("Arquitectura"));
  assert.ok(careerLabels.includes("Licenciatura en Diseño de Comunicación Visual"));
  assert.ok(careerLabels.includes("Licenciatura en Diseño Industrial"));
});

test("filters careers and plans through the active academic hierarchy", () => {
  assert.match(pageSource, /activeFaculty\.careers\.map/);
  assert.match(pageSource, /activeCareer\.plans\.map/);
  assert.match(pageSource, /selectAcademicPlan/);
  assert.match(pageSource, /facultyId: activeFaculty\.id/);
  assert.match(pageSource, /selectAcademicPlan\(nextPlan, nextFaculty\.id\)/);
  assert.doesNotMatch(pageSource, /planYear === "electrica-2023" \? \(\s*<option value="electrica-2023"/);
});
