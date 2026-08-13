const LOGICAL_KINDS = new Set(["all", "any", "none"]);

export function incompleteLogicalNodes(expression, path = "root", output = []) {
  if (!expression) return output;
  const children = expression.children ?? [];
  const options = expression.options ?? [];
  if (LOGICAL_KINDS.has(expression.kind) && children.length === 0 && options.length === 0) {
    output.push({ path, kind: expression.kind, label: expression.label ?? "" });
  }
  children.forEach((child, index) => incompleteLogicalNodes(child, `${path}.${index}`, output));
  return output;
}

export function hasIncompleteLogicalNode(expression) {
  return incompleteLogicalNodes(expression).length > 0;
}

export function hasRawRequirementNode(expression) {
  if (!expression) return false;
  if (expression.kind === "requirement" && expression.parserStatus === "raw") return true;
  return (expression.children ?? []).some(hasRawRequirementNode);
}

export function isRequirementExpressionEvaluable(expression) {
  return Boolean(expression) && !hasIncompleteLogicalNode(expression) && !hasRawRequirementNode(expression);
}

export function collectRequirementOptions(expression, output = []) {
  if (!expression) return output;
  output.push(...(expression.options ?? []));
  for (const child of expression.children ?? []) collectRequirementOptions(child, output);
  return output;
}

export function removeIncompletePrerequisiteRules(prerequisites = {}) {
  const cleaned = {};
  const removedKeys = [];
  for (const [key, rule] of Object.entries(prerequisites)) {
    if (rule?.expression && hasIncompleteLogicalNode(rule.expression)) {
      removedKeys.push(key);
    } else {
      cleaned[key] = rule;
    }
  }
  return { prerequisites: cleaned, removedKeys };
}
