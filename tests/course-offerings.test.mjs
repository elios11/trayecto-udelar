import assert from "node:assert/strict";
import test from "node:test";

import prototype from "../app/data/course-offerings-prototype.json" with { type: "json" };
import faduLdcv from "../app/data/fadu-ldcv-2007.json" with { type: "json" };
import qfInitial from "../app/data/quimico-farmaceutico-2015-fq.json" with { type: "json" };
import qfCatalog from "../app/data/quimico-farmaceutico-2015-electivas.json" with { type: "json" };
import fceaAccounting from "../app/data/bedelias-generated/bedelias-fcea-contador-publico-2024.json" with { type: "json" };
import {
  academicPeriodFromDateRange,
  normalizeCourseOfferings,
  resolveCourseOffering,
  serializeCourseOfferings,
  validateCourseOfferings,
} from "../app/course-offerings.mjs";

const catalog = [
  ...faduLdcv.courses.map(({ id }) => ({ courseId: id, serviceId: "fadu" })),
  ...qfInitial.courses.map(({ id }) => ({ courseId: id, serviceId: "fq" })),
  ...qfCatalog.courses.map(({ id }) => ({ courseId: id, serviceId: "fq" })),
  ...fceaAccounting.courses.map(({ id }) => ({ courseId: id, serviceId: "fcea" })),
];
const period = (year, part) => ({ year, part });
const target = (overrides = {}) => ({
  records: prototype,
  courseId: "fcea-c20-2",
  serviceId: "fcea",
  planId: "bedelias-fcea-contador-publico-2024",
  academicPeriod: period(2026, "second-semester"),
  now: "2026-09-10",
  ...overrides,
});

test("valida acumulativamente el contrato y la muestra contra materias reales de tres servicios", () => {
  assert.deepEqual(validateCourseOfferings(prototype, { catalog }), { ok: true, issues: [] });
  assert.deepEqual([...new Set(prototype.map(({ serviceId }) => serviceId))].sort(), ["fadu", "fcea", "fq"]);
  for (const serviceId of ["fadu", "fcea", "fq"]) {
    assert.ok(new Set(prototype.filter((entry) => entry.serviceId === serviceId).map(({ courseId }) => courseId)).size >= 2);
  }

  const broken = [{
    ...prototype[0],
    id: "",
    courseId: "missing",
    planIds: ["p", "p"],
    campusIds: "montevideo",
    academicPeriod: { year: 2026, part: "invented", startsOn: "2026-15-01", endsOn: "2025-01-01" },
    declaration: "not-offered",
    modality: "telepathy",
    source: { url: "http://example.com", title: "", publisher: "", lastVerifiedAt: "2026-09-10" },
    validThrough: "2025-12-31",
  }];
  const result = validateCourseOfferings(broken, { catalog });
  assert.equal(result.ok, false);
  for (const code of ["invalid_id", "unknown_course", "duplicate_id", "invalid_scope", "invalid_part", "invalid_date", "invalid_modality", "invalid_source_url", "invalid_validity"]) {
    assert.ok(result.issues.some((entry) => entry.code === code), code);
  }
});

test("normaliza y serializa de forma determinista", () => {
  const shuffled = prototype.slice().reverse().map((entry) => ({ ...entry, planIds: entry.planIds.slice().reverse(), campusIds: entry.campusIds.slice().reverse() }));
  assert.deepEqual(normalizeCourseOfferings(shuffled), normalizeCourseOfferings(prototype));
  assert.equal(serializeCourseOfferings(shuffled), serializeCourseOfferings(prototype));
});

test("resuelve confirmada, negativa expresa, habitual y desconocida con fecha inyectada", () => {
  assert.equal(resolveCourseOffering(target()).status, "confirmed");
  assert.equal(resolveCourseOffering(target({ courseId: "734", serviceId: "fq", planId: "qf-2015", academicPeriod: period(2026, "first-semester") })).status, "not-offered");
  assert.equal(resolveCourseOffering(target({ academicPeriod: period(2027, "second-semester") })).status, "habitual");
  assert.equal(resolveCourseOffering(target({ courseId: "sin-evidencia" })).status, "unknown");
  assert.equal(resolveCourseOffering(target({ records: [] })).status, "unknown");
});

test("una declaración anual aplica al semestre, pero un semestre no afirma el año completo", () => {
  assert.equal(resolveCourseOffering(target({
    courseId: "734",
    serviceId: "fq",
    planId: "qf-2015",
    academicPeriod: period(2026, "second-semester"),
  })).status, "not-offered");

  assert.equal(resolveCourseOffering(target({
    courseId: "L112",
    serviceId: "fadu",
    planId: undefined,
    academicPeriod: period(2026, "annual"),
  })).status, "unknown");
});

test("una sola oferta no crea hábito, dos comparables sí y semestres distintos no se mezclan", () => {
  const one = prototype.filter(({ id }) => id === "fcea-c20-2026-2");
  assert.equal(resolveCourseOffering(target({ records: one, academicPeriod: period(2027, "second-semester") })).status, "unknown");
  const comparable = prototype.filter(({ courseId }) => courseId === "fcea-c20-2");
  assert.equal(resolveCourseOffering(target({ records: comparable, academicPeriod: period(2027, "second-semester") })).status, "habitual");
  const mixed = [comparable[0], { ...comparable[1], id: "first-semester", academicPeriod: period(2026, "first-semester") }];
  assert.equal(resolveCourseOffering(target({ records: mixed, academicPeriod: period(2027, "second-semester") })).status, "unknown");
});

test("una confirmación vencida queda histórica sin confirmar y los conflictos requieren revisión", () => {
  const offered = { ...prototype[5], validThrough: "2026-08-31", source: { ...prototype[5].source, lastVerifiedAt: "2026-08-31" } };
  assert.deepEqual(resolveCourseOffering(target({ records: [offered] })), { status: "unknown", evidence: [offered], reason: "expired-evidence" });
  const denied = { ...offered, id: "contradiction", declaration: "not-offered", validThrough: "2026-12-31" };
  assert.equal(resolveCourseOffering(target({ records: [offered, denied] })).status, "needs-review");
  assert.equal(resolveCourseOffering(target({ records: [offered], mappingIssues: [{ id: "m1", courseId: offered.courseId, serviceId: "fcea", academicPeriod: offered.academicPeriod, reason: "ambiguous" }] })).status, "needs-review");
});

test("no expande restricciones por plan o sede ni mezcla servicios con nombres iguales", () => {
  const scoped = { ...prototype[5], campusIds: ["montevideo"] };
  assert.equal(resolveCourseOffering(target({ records: [scoped], campusId: undefined })).status, "needs-review");
  assert.equal(resolveCourseOffering(target({ records: [scoped], campusId: "salto" })).status, "unknown");
  assert.equal(resolveCourseOffering(target({ records: [scoped], campusId: "montevideo", planId: undefined })).status, "needs-review");
  assert.equal(resolveCourseOffering(target({ records: [scoped], campusId: "montevideo", planId: "otro-plan" })).status, "unknown");

  const sameName = [
    { ...prototype[0], id: "same-fadu", courseId: "MISMO", serviceId: "fadu" },
    { ...prototype[0], id: "same-fq", courseId: "MISMO", serviceId: "fq", declaration: "not-offered" },
  ];
  assert.equal(resolveCourseOffering(target({ records: sameName, courseId: "MISMO", serviceId: "fadu", planId: undefined, academicPeriod: period(2026, "first-semester") })).status, "confirmed");
});

test("identifica períodos sólo desde rangos personales inequívocos", () => {
  assert.deepEqual(academicPeriodFromDateRange({ startsOn: "2026-03-01", endsOn: "2026-06-30" }), { year: 2026, part: "first-semester", startsOn: "2026-03-01", endsOn: "2026-06-30" });
  assert.deepEqual(academicPeriodFromDateRange({ startsAt: "2026-03-10T03:00:00.000Z", endsAt: "2026-07-19T03:00:00.000Z" }), { year: 2026, part: "first-semester", startsOn: "2026-03-10", endsOn: "2026-07-19" });
  assert.equal(academicPeriodFromDateRange({ startsOn: "2026-05-01", endsOn: "2026-08-31" }), null);
  assert.equal(academicPeriodFromDateRange({ startsOn: "2026-08-01", endsOn: "2027-01-31" }), null);
});
