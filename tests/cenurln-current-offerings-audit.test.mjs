import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const biology = await readJson("app/data/bedelias-generated/bedelias-cenurln-ciclo-en-biologia-bioquimica-2016.json");
const mathematics = await readJson("app/data/bedelias-generated/bedelias-cenurln-ciclo-inicial-de-matematica-2012.json");
const socialSciences = await readJson("app/data/bedelias-generated/bedelias-cenurln-licenciatura-en-ciencias-sociales-2009.json");
const photography = await readJson("app/data/bedelias-generated/bedelias-cenurln-tecnicatura-en-tecnologias-de-la-imagen-fotografica-2008.json");

const auditFor = (identity) => registry.audits.find((audit) => audit.identity === identity);

test("audita las cuatro ofertas pendientes del CENUR Litoral Norte con fuentes trazables", () => {
  const identities = [
    "ciclo en biologia bioquimica:2016",
    "ciclo inicial de matematica:2012",
    "licenciatura en ciencias sociales:2009",
    "tecnicatura en tecnologias de la imagen fotografica:2008",
  ];
  for (const identity of identities) {
    const audit = auditFor(identity);
    assert.equal(audit.status, "official-evidence-complete");
    assert.equal(audit.publicationEligible, false);
    assert.ok(audit.sources.length >= 3);
    assert.ok(audit.sources.every((source) => source.url.startsWith("https://")));
  }
});

test("publica sólo las sedes oficiales del Ciclo en Biología-Bioquímica", () => {
  assert.deepEqual(biology.campuses.map((campus) => campus.label), ["Salto", "Paysandú"]);
  assert.equal(biology.plan.durationMonths, 12);
  assert.equal(biology.plan.minCredits, 90);
  assert.equal(biology.plan.degreeTitle, "Ciclo en Biología - Bioquímica");
  assert.deepEqual(biology.pathways.bedelias.campusIds, ["salto", "paysandu"]);
  assert.equal(auditFor("ciclo en biologia bioquimica:2016").offerings[0].curriculumVariant, false);
});

test("corrige duración y denominación del Ciclo Inicial en Matemática", () => {
  assert.equal(mathematics.plan.degreeTitle, "Ciclo Inicial en Matemática");
  assert.equal(mathematics.plan.durationMonths, 24);
  assert.equal(mathematics.plan.minCredits, 160);
  assert.deepEqual(mathematics.campuses.map((campus) => campus.label), ["Salto"]);
  assert.equal(mathematics.courses.length, 29);
});

test("normaliza Ciencias Sociales como carrera completa de cuatro años en Salto", () => {
  assert.equal(socialSciences.plan.degreeTitle, "Licenciado/a en Ciencias Sociales");
  assert.equal(socialSciences.plan.durationMonths, 48);
  assert.equal(socialSciences.plan.minCredits, 360);
  assert.deepEqual(socialSciences.campuses.map((campus) => campus.label), ["Salto"]);
  assert.match(auditFor("licenciatura en ciencias sociales:2009").anomalies.find((entry) => entry.field === "planYear").resolution, /Plan 1992/i);
});

test("corrige Fotografía a seis semestres y conserva una única carrera en Paysandú", () => {
  assert.equal(photography.plan.durationMonths, 36);
  assert.equal(photography.plan.minCredits, 240);
  assert.deepEqual(photography.campuses.map((campus) => campus.label), ["Paysandú"]);
  assert.ok(photography.courses.some((course) => /Trabajo Final de Egreso/i.test(course.name)));
  const matches = catalog.flatMap((faculty) => faculty.careers)
    .filter((career) => career.label === "Tecnicatura en Tecnologías de la Imagen Fotográfica");
  assert.equal(matches.length, 1);
});
