import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const audits = await readJson("data/bedelias/audits/official-source-audits.json");
const queue = await readJson("data/bedelias/inventory/audit-queue.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const technologist = await readJson("app/data/bedelias-generated/bedelias-fhum-tecnologo-int-y-trad-lsu-esp-2025.json");
const degree = await readJson("app/data/bedelias-generated/bedelias-fhum-licenciatura-en-estudios-sordos-2025.json");
const loaderSource = await readFile(new URL("app/data/extracted-academic-loaders.ts", root), "utf8");
const pageSource = await readFile(new URL("app/page.tsx", root), "utf8");

const planPdf = "https://fhce.edu.uy/wp-content/uploads/2025/06/PLAN_de_Licenciatura_de_Estudios_Sordos.pdf";
const nonRootMinima = (projection) => projection.creditStructure.nodes
  .filter(({ id }) => id !== "plan-total")
  .reduce((sum, { minCredits }) => sum + minCredits, 0);

test("publica dos carreras articuladas sin confundir títulos ni sedes", () => {
  const faculty = catalog.find(({ id }) => id === "bedelias-fhum");
  const degreeCareer = faculty.careers.find(({ label }) => label === "Licenciatura en Estudios Sordos");
  const technologistCareer = faculty.careers.find(({ label }) => label === "Tecnólogo en Interpretación y Traducción LSU-español");

  assert.equal(degreeCareer.plans[0].id, "bedelias-fhum-licenciatura-en-estudios-sordos-2025");
  assert.equal(technologistCareer.plans[0].id, "bedelias-fhum-tecnologo-int-y-trad-lsu-esp-2025");
  assert.deepEqual(degree.campuses.map(({ id }) => id), ["montevideo"]);
  assert.deepEqual(technologist.campuses.map(({ id }) => id), ["montevideo", "salto"]);
  assert.ok(!technologist.campuses.some(({ id }) => id === "colonia"));
  assert.deepEqual([degree.plan.minCredits, technologist.plan.minCredits], [360, 270]);
});

test("controla los 270 créditos comunes y los 90 finales publicados", () => {
  assert.equal(nonRootMinima(technologist), 270);
  assert.equal(nonRootMinima(degree), 360);
  assert.deepEqual(
    technologist.creditStructure.credentials.map(({ minTotalCredits, nodeRequirements }) => [
      minTotalCredits,
      nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0),
    ]),
    [[270, 270], [270, 270]],
  );
  assert.deepEqual(
    degree.creditStructure.credentials.map(({ id, minTotalCredits, nodeRequirements }) => [
      id,
      minTotalCredits,
      nodeRequirements.reduce((sum, { minCredits }) => sum + minCredits, 0),
    ]),
    [["tecnologo-tuilsu", 270, 270], ["bedelias-degree", 360, 360]],
  );
  const finalIds = [
    "fhum-lic-electiva-2", "fhum-lic-herramientas", "fhum-lic-metodologia-1",
    "fhum-lic-tutoria-1", "fhum-lic-electiva-3", "fhum-lic-diseno",
    "fhum-lic-metodologia-2", "fhum-lic-tutoria-2", "fhum-lic-trabajo-final",
  ];
  assert.equal(degree.courses.filter(({ id }) => finalIds.includes(id)).reduce((sum, { credits }) => sum + credits, 0), 90);
});

test("mantiene los dos recorridos lingüísticos y la secuencia correspondiente", () => {
  assert.deepEqual(Object.keys(technologist.pathways), ["estudiante-oyente", "estudiante-sordo"]);
  assert.deepEqual(Object.keys(degree.pathways), ["estudiante-oyente", "estudiante-sordo"]);
  for (const pathway of Object.values(technologist.pathways)) {
    assert.equal(pathway.periods.length, 6);
    assert.ok(pathway.credentialId.startsWith("tecnologo-tuilsu-"));
  }
  for (const pathway of Object.values(degree.pathways)) {
    assert.equal(pathway.credentialId, undefined);
    for (let semester = 1; semester <= 8; semester += 1) {
      assert.ok(pathway.periods.some(({ label }) => label === `Semestre ${semester}`));
    }
  }
});

test("reutiliza identificadores y progreso para todas las unidades comunes", () => {
  const degreeCourses = new Map(degree.courses.map((course) => [course.id, course]));
  for (const course of technologist.courses.filter(({ bedeliasCode }) => bedeliasCode)) {
    assert.equal(degreeCourses.get(course.id)?.bedeliasCode, course.bedeliasCode);
    assert.equal(degreeCourses.get(course.id)?.credits, course.credits);
  }
  assert.match(loaderSource, /"bedelias-fhum-tecnologo-int-y-trad-lsu-esp-2025"[\s\S]*?progressPlanId: "bedelias-fhum-licenciatura-en-estudios-sordos-2025"/);
  assert.match(pageSource, /progress\[activeProgressPlanId\]/);
  assert.match(pageSource, /\[activeProgressPlanId\]: next/);
  assert.match(pageSource, /Malla normalizada · evidencia oficial cerrada/);
  assert.match(pageSource, /Plan contrastado · malla normalizada/);
});

test("deja trazabilidad oficial y cierra ambas identidades de la cola", () => {
  for (const identity of ["licenciatura en estudios sordos:2025", "tecnologo int y trad lsu esp:2025"]) {
    const audit = audits.audits.find((entry) => entry.identity === identity);
    assert.equal(audit.status, "official-evidence-complete");
    assert.ok(audit.sources.some(({ url }) => url === planPdf));
    assert.ok(!queue.queue.some((entry) => entry.identity === identity));
  }
  assert.equal(queue.counts.pendingCanonicalIdentities, 21);
  assert.equal(queue.queue[0].identity, "ingenieria de alimentos:2003");
});
