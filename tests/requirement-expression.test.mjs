import assert from "node:assert/strict";
import test from "node:test";
import {
  collectRequirementOptions,
  hasIncompleteLogicalNode,
  incompleteLogicalNodes,
  isRequirementExpressionEvaluable,
  removeIncompletePrerequisiteRules,
} from "../lib/requirement-expression.mjs";
import { normalizeExpressionNode } from "../scripts/scrape-bedelias.mjs";

const requirement = (code) => ({
  kind: "requirement",
  label: code,
  minimum: 1,
  options: [{ assessment: "course", serviceCode: null, code, name: code }],
  children: [],
  parserStatus: "parsed",
});

test("detecta grupos lógicos vacíos aunque estén anidados", () => {
  const expression = {
    kind: "all",
    options: [],
    children: [requirement("A"), { kind: "any", label: "debe tener alguna", options: [], children: [], parserStatus: "parsed" }],
  };
  assert.equal(hasIncompleteLogicalNode(expression), true);
  assert.deepEqual(incompleteLogicalNodes(expression).map((node) => node.path), ["root.1"]);
  assert.equal(isRequirementExpressionEvaluable(expression), false);
});

test("acepta exclusiones completas y reúne sus opciones para redactarlas", () => {
  const expression = { kind: "none", label: "no debe tener", options: [], children: [requirement("OLD")], parserStatus: "parsed" };
  assert.equal(isRequirementExpressionEvaluable(expression), true);
  assert.deepEqual(collectRequirementOptions(expression).map((option) => option.code), ["OLD"]);
});

test("una condición textual sin interpretar tampoco es evaluable", () => {
  const expression = { ...requirement("RAW"), parserStatus: "raw" };
  assert.equal(isRequirementExpressionEvaluable(expression), false);
});

test("el normalizador etiqueta un operador vacío como incompleto", () => {
  const normalized = normalizeExpressionNode({ kind: "any", sourceType: "o", label: "debe tener alguna", options: [], children: [] });
  assert.equal(normalized.parserStatus, "incomplete");
  assert.equal(isRequirementExpressionEvaluable(normalized), false);
});

test("la reanudación descarta solo reglas incompletas del checkpoint", () => {
  const incomplete = { expression: { kind: "any", options: [], children: [] } };
  const complete = { expression: requirement("OK") };
  const absent = { noPublishedRule: true };
  const cleaned = removeIncompletePrerequisiteRules({ "BAD:course": incomplete, "OK:course": complete, "NONE:none": absent });
  assert.deepEqual(cleaned.removedKeys, ["BAD:course"]);
  assert.deepEqual(Object.keys(cleaned.prerequisites), ["OK:course", "NONE:none"]);
});
