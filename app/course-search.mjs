const SEARCH_STOP_WORDS = new Set([
  "a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "los",
  "o", "para", "por", "u", "un", "una", "unas", "unos", "y",
]);

const ROMAN_SUFFIXES = new Map([
  ["i", "1"], ["ii", "2"], ["iii", "3"], ["iv", "4"], ["v", "5"],
  ["vi", "6"], ["vii", "7"], ["viii", "8"], ["ix", "9"], ["x", "10"],
]);

export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-UY")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function significantTokens(value) {
  return normalizeSearchText(value)
    .split(" ")
    .filter((token) => token && !SEARCH_STOP_WORDS.has(token));
}

function numberedToken(token) {
  return /^\d+$/.test(token) ? token : ROMAN_SUFFIXES.get(token) ?? null;
}

function aliasesFor(value) {
  const tokens = significantTokens(value);
  if (tokens.length === 0) return [];

  const lastNumber = numberedToken(tokens.at(-1));
  const baseTokens = lastNumber ? tokens.slice(0, -1) : tokens;
  const acronym = tokens
    .map((token, index) => index === tokens.length - 1 && lastNumber ? lastNumber : token[0])
    .join("");
  const aliases = new Set([acronym]);

  if (lastNumber) {
    for (const token of baseTokens) {
      for (let length = 1; length <= Math.min(4, token.length); length += 1) {
        aliases.add(`${token.slice(0, length)}${lastNumber}`);
      }
    }
  }

  return [...aliases];
}

export function matchesCourseSearch(course, areaLabel, rawQuery) {
  const query = normalizeSearchText(rawQuery);
  if (!query) return true;

  const fields = [course.id, course.name, areaLabel].map(normalizeSearchText);
  const compactQuery = query.replaceAll(" ", "");
  if (fields.some((field) => field.replaceAll(" ", "") === compactQuery)) return true;

  const searchableTokens = fields.flatMap((field) => field.split(" ").filter(Boolean));
  const queryTokens = query.split(" ");
  if (queryTokens.every((queryToken) => searchableTokens.some((token) => token.startsWith(queryToken)))) return true;

  const aliases = [...aliasesFor(course.name), ...aliasesFor(areaLabel)];
  return /\d/.test(compactQuery)
    ? aliases.some((alias) => alias === compactQuery)
    : aliases.some((alias) => alias.startsWith(compactQuery));
}
