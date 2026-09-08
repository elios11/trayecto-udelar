export const MAX_UNDO_STEPS = 20;

const clone = (value) => structuredClone(value);

export function createUndoEntry(description, state, recovery) {
  return { description, state: clone(state), recovery: clone(recovery) };
}

export function pushUndoEntry(stack, entry) {
  return [...stack, entry].slice(-MAX_UNDO_STEPS);
}

export function takeUndoEntry(stack) {
  if (!Array.isArray(stack) || stack.length === 0) return { entry: null, stack: [] };
  return { entry: stack.at(-1), stack: stack.slice(0, -1) };
}

export function isUndoShortcut(event) {
  if (!event || String(event.key ?? "").toLowerCase() !== "z" || !(event.ctrlKey || event.metaKey) || event.modalOpen) return false;
  return !event.target?.isContentEditable && !["INPUT", "TEXTAREA", "SELECT"].includes(String(event.target?.tagName ?? "").toUpperCase());
}
