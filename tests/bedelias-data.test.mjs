import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile(new URL("../app/data/computacion-1997-bedelias.json", import.meta.url), "utf8"));

function walk(node, output = []) {
  if (!node) return output;
  output.push(node);
  for (const child of node.children ?? []) walk(child, output);
  return output;
}

function satisfies(node, statuses, credits = 0) {
  if (node.kind === "all") return node.children.every((child) => satisfies(child, statuses, credits));
  if (node.kind === "any") return node.children.some((child) => satisfies(child, statuses, credits));
  if (node.kind === "none") return !node.children.some((child) => satisfies(child, statuses, credits));
  if (node.creditRequirement) return credits >= node.creditRequirement.minimum;
  const completed = node.options.filter((option) => {
    const status = statuses[option.code] ?? "pending";
    if (option.assessment === "course") return status === "approved" || status === "exonerated";
    if (option.assessment === "exam") return status === "exonerated";
    return false;
  }).length;
  return completed >= (node.minimum ?? 1);
}

test("la proyección conserva procedencia institucional", () => {
  assert.equal(data.source.system, "SGAE Bedelías");
  assert.equal(data.plan.serviceCode, "FING");
  assert.equal(data.plan.year, "1997");
  assert.equal(data.plan.minCredits, 450);
  assert.match(data.source.contentHash, /^[a-f0-9]{64}$/);
});

test("todos los cursos de la aplicación tienen regla oficial para cursar", () => {
  for (const course of data.courses) {
    assert.ok(data.rules.some((rule) => rule.target.code === course.code && rule.target.assessment === "course"), course.code);
  }
});

test("Arquitectura 1466 no se reduce a Programación 1", () => {
  const rule = data.rules.find((item) => item.target.code === "1466" && item.target.assessment === "course");
  assert.ok(rule);
  const nodes = walk(rule.expression);
  const requiredCodes = new Set(nodes.flatMap((node) => node.options ?? []).map((option) => option.code));
  assert.ok(requiredCodes.has("1023"), "incluye Matemática Discreta 1");
  assert.ok(requiredCodes.has("1373"), "incluye Programación 1");
  assert.ok(requiredCodes.has("1027"), "incluye Lógica");
  assert.ok(requiredCodes.has("1321"), "incluye Programación 2");
  assert.ok(nodes.some((node) => node.kind === "none"), "conserva exclusiones");
});

test("Arquitectura exige examen de P1 y los otros tres grupos", () => {
  const rule = data.rules.find((item) => item.target.code === "1466" && item.target.assessment === "course");
  assert.equal(satisfies(rule.expression, { 1023: "approved", 1373: "approved", 1027: "approved", 1321: "approved" }), false);
  assert.equal(satisfies(rule.expression, { 1023: "approved", 1373: "exonerated", 1027: "approved", 1321: "approved" }), true);
  assert.equal(satisfies(rule.expression, { 1023: "approved", 1373: "exonerated", 1027: "pending", 1321: "approved" }), false);
});

test("ningún requisito normalizado quedó como texto sin interpretar", () => {
  for (const rule of data.rules) {
    for (const node of walk(rule.expression)) {
      if (node.kind === "requirement") assert.equal(node.parserStatus, "parsed", `${rule.target.code}: ${node.label}`);
    }
  }
});
