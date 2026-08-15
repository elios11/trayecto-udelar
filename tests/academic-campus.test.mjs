import assert from "node:assert/strict";
import test from "node:test";
import { availablePathwayEntries, resolveCampus, resolveCampusPathway } from "../app/academic-campus.mjs";

const campuses = [
  { id: "montevideo", label: "Montevideo", defaultPathwayId: "common" },
  { id: "salto", label: "Salto", defaultPathwayId: "regional" },
];
const pathways = {
  common: { campusIds: ["montevideo", "salto"] },
  regional: { campusIds: ["salto"] },
};

test("un valor de sede legado o inválido cae al valor oficial por defecto", () => {
  assert.equal(resolveCampus(campuses, "").id, "montevideo");
  assert.equal(resolveCampus(campuses, "sede-eliminada").id, "montevideo");
  assert.equal(resolveCampus([], "sede-eliminada"), undefined);
});

test("la trayectoria territorial sólo se ofrece en su sede", () => {
  assert.deepEqual(availablePathwayEntries(pathways, campuses[0]).map(([id]) => id), ["common"]);
  assert.deepEqual(availablePathwayEntries(pathways, campuses[1]).map(([id]) => id), ["common", "regional"]);
  assert.equal(resolveCampusPathway(pathways, campuses[1], ""), "regional");
  assert.equal(resolveCampusPathway(pathways, campuses[0], "regional"), "common");
});

test("un plan sin sedes conserva su trayectoria y no necesita selector", () => {
  assert.equal(resolveCampusPathway(pathways, undefined, "regional"), "regional");
  assert.deepEqual(availablePathwayEntries({ common: {} }, undefined).map(([id]) => id), ["common"]);
});
