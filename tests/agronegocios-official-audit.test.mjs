import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
const registry = await readJson("data/bedelias/audits/official-source-audits.json");
const catalog = await readJson("app/data/extracted-academic-catalog.json");
const projection = await readJson("app/data/bedelias-generated/bedelias-cut-licenciatura-en-economia-agricola-y-gestion-de-agronegocios-2022.json");
const audit = registry.audits.find((entry) => entry.identity === "licenciatura en economia agricola y gestion de agronegocios:2022");

const nodeById = new Map(projection.creditStructure.nodes.map((node) => [node.id, node]));
const rootRequirements = (credential) => credential.nodeRequirements.filter((requirement) => nodeById.get(requirement.nodeId)?.parentId === "plan-total");

test("publica una sola carrera de FCEA en Tacuarembó con dos menciones", () => {
  assert.equal(audit.status, "official-evidence-complete");
  assert.equal(audit.conclusion.canonicalModel, "one-plan-one-campus-two-accredited-mentions");
  assert.equal(projection.plan.year, "2022");
  assert.equal(projection.plan.durationMonths, 48);
  assert.equal(projection.plan.minCredits, 360);
  assert.deepEqual(projection.campuses.map((campus) => campus.label), ["Tacuarembó"]);
  assert.deepEqual(Object.keys(projection.pathways), ["mencion-en-investigacion", "mencion-profesional"]);

  const faculty = catalog.find((candidate) => candidate.label === "Facultad de Ciencias Económicas y de Administración");
  const career = faculty.careers.find((candidate) => candidate.label === "Licenciatura en Economía Agrícola y Gestión de Agronegocios");
  assert.deepEqual(career.plans.map((plan) => plan.label), ["Plan 2022 · vigente"]);
});

test("controla los siete mínimos específicos de cada mención", () => {
  const [research, professional] = projection.creditStructure.credentials;
  assert.deepEqual(rootRequirements(research), [
    { nodeId: "research-integrative", minCredits: 15 },
    { nodeId: "research-administration", minCredits: 90 },
    { nodeId: "research-social", minCredits: 30 },
    { nodeId: "research-accounting", minCredits: 20 },
    { nodeId: "research-economics", minCredits: 100 },
    { nodeId: "research-quantitative", minCredits: 90 },
    { nodeId: "research-free-choice", minCredits: 15 },
  ]);
  assert.deepEqual(rootRequirements(professional), [
    { nodeId: "professional-integrative", minCredits: 10 },
    { nodeId: "professional-administration", minCredits: 100 },
    { nodeId: "professional-social", minCredits: 10 },
    { nodeId: "professional-accounting", minCredits: 80 },
    { nodeId: "professional-economics", minCredits: 75 },
    { nodeId: "professional-quantitative", minCredits: 60 },
    { nodeId: "professional-free-choice", minCredits: 25 },
  ]);
  assert.equal(rootRequirements(research).reduce((sum, requirement) => sum + requirement.minCredits, 0), 360);
  assert.equal(rootRequirements(professional).reduce((sum, requirement) => sum + requirement.minCredits, 0), 360);
  assert.equal(research.minTotalCredits, 360);
  assert.equal(professional.minTotalCredits, 360);
});

test("conserva los submínimos obligatorios y opcionales sin inventar el opcional cuantitativo vacío", () => {
  const [research, professional] = projection.creditStructure.credentials;
  assert.deepEqual(research.nodeRequirements.slice(7), [
    { nodeId: "research-administration-required", minCredits: 30 },
    { nodeId: "research-administration-optional", minCredits: 60 },
    { nodeId: "research-economics-required", minCredits: 80 },
    { nodeId: "research-economics-optional", minCredits: 20 },
    { nodeId: "research-quantitative-required", minCredits: 85 },
  ]);
  assert.deepEqual(professional.nodeRequirements.slice(7), [
    { nodeId: "professional-administration-required", minCredits: 30 },
    { nodeId: "professional-administration-optional", minCredits: 70 },
    { nodeId: "professional-accounting-required", minCredits: 60 },
    { nodeId: "professional-accounting-optional", minCredits: 20 },
    { nodeId: "professional-economics-required", minCredits: 70 },
    { nodeId: "professional-economics-optional", minCredits: 5 },
  ]);
  assert.ok(!projection.creditStructure.nodes.some((node) => node.id === "research-quantitative-optional"));
  assert.match(audit.anomalies.find((entry) => entry.field === "quantitativeOptionalResearch").resolution, /no enumera unidades/i);
});

test("deduplica las materias compartidas y preserva el progreso entre menciones", () => {
  assert.equal(projection.courses.length, 70);
  assert.equal(projection.courses.reduce((sum, course) => sum + course.credits, 0), 632);
  assert.equal(new Set(projection.courses.map((course) => course.bedeliasCode)).size, 70);
  assert.equal(projection.pathways["mencion-en-investigacion"].periods.flatMap((period) => period.courseIds).length, 67);
  assert.equal(projection.pathways["mencion-profesional"].periods.flatMap((period) => period.courseIds).length, 68);

  const shared = projection.courses.find((course) => course.bedeliasCode === "FCEA-A10");
  assert.deepEqual(shared.eligibleRequirementIds, ["research-administration-required", "professional-administration-required"]);
  assert.deepEqual(shared.creditAllocations.map((allocation) => allocation.nodeId), ["research-administration-required", "professional-administration-required"]);
  assert.ok(projection.pathways["mencion-en-investigacion"].periods.some((period) => period.courseIds.includes(shared.id)));
  assert.ok(projection.pathways["mencion-profesional"].periods.some((period) => period.courseIds.includes(shared.id)));
});

test("distingue servicio y código en las materias compartidas", () => {
  const codes = new Set(projection.courses.map((course) => course.bedeliasCode));
  assert.ok(codes.has("FCEA-A10"));
  assert.ok(codes.has("CURE-A10TM"));
  assert.ok(codes.has("FCEA-MC30"));
  assert.ok(codes.has("CURE-MCC30"));
  assert.ok(!codes.has("FCEA"));
  assert.ok(!codes.has("CURE"));
});

test("mantiene un título único y acredita las menciones como constancias", () => {
  assert.equal(projection.plan.degreeTitle, "Licenciado en Economía Agrícola y Gestión de Agronegocios");
  assert.match(audit.officialPlan.degreeRule, /Bedelía expide una constancia/i);
  assert.match(audit.sources.find((source) => /impo/.test(source.url)).supports.join(" "), /título único.*constancia de mención/i);
});
