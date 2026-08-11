/**
 * Resolves an option while academic selectors are moving between plans.
 * React may briefly retain the previous plan's option id, so every consumer
 * needs a valid local fallback instead of assuming a shared id exists.
 *
 * @template T
 * @param {Record<string, T>} options
 * @param {string} requestedId
 * @param {string} preferredId
 * @returns {T | undefined}
 */
export function resolveAcademicOption(options, requestedId, preferredId) {
  return options[requestedId] ?? options[preferredId] ?? Object.values(options)[0];
}
