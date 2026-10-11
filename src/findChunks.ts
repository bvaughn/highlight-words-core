import { sanitize as defaultSanitize } from "./sanitize";
import type { FindChunksOptions, FoundChunk } from "./types";

/**
 * Finds every match of each search word within the text.
 * This is the default search function used by `findAll`.
 *
 * String search words are matched literally, unless `autoEscape` is false
 * (in which case they are treated as regular expressions, and strings that aren't valid regular expressions are matched literally).
 * RegExp search words are used as-is, with their own flags; they are not sanitized, but they are matched against the sanitized text.
 * Empty search words (including words that sanitizing removes entirely) and zero-length matches are ignored.
 *
 * @param options - Search options
 * @returns One chunk per match, grouped by search word (not sorted, and possibly overlapping);
 * each includes the `searchIndex` of the search word that matched
 */
export function findChunks({
  autoEscape,
  caseSensitive,
  sanitize = defaultSanitize,
  searchWords,
  textToHighlight
}: FindChunksOptions): Array<FoundChunk> {
  // Untyped callers may pass e.g. a number, or a missing value (which should not be searched as the string "undefined")
  const originalText = String(textToHighlight ?? "");
  const { offsets, text } = sanitizeText(originalText, sanitize);

  const flags = caseSensitive ? "g" : "gi";

  const chunks: Array<FoundChunk> = [];
  // Untyped callers may omit searchWords (or pass null); nothing can match then
  (searchWords ?? []).forEach((searchWord, searchIndex) => {
    // Only an explicit false disables escaping (untyped callers may pass e.g. null)
    const regex = searchWordToRegExp(
      searchWord,
      autoEscape !== false,
      flags,
      sanitize
    );
    if (regex === null) {
      return; // Skip empty words
    }

    const isUnicode = regex.unicode || regex.flags.includes("v");

    let match;
    while ((match = regex.exec(text))) {
      const start = match.index;
      const end = regex.lastIndex;
      // We do not return zero-length matches
      if (end > start) {
        chunks.push(
          offsets
            ? {
                start: offsets.start[start],
                end: offsets.end[end - 1],
                searchIndex
              }
            : {
                // Don't split surrogate pairs (e.g. emoji) between chunks
                start: isSurrogatePair(originalText, start - 1)
                  ? start - 1
                  : start,
                end: isSurrogatePair(originalText, end - 1) ? end + 1 : end,
                searchIndex
              }
        );
      }

      // A zero-length match doesn't advance lastIndex, so the same match would be found again (forever)
      // See http://www.regexguru.com/2008/04/watch-out-for-zero-length-matches/
      // Unicode-aware RegExps must advance by code point;
      // otherwise lastIndex would land inside a surrogate pair and the same match would be found again (forever).
      if (match.index === regex.lastIndex) {
        regex.lastIndex +=
          isUnicode && isSurrogatePair(text, regex.lastIndex) ? 2 : 1;
      }
    }
  });

  return chunks;
}

/**
 * Sanitizes the text to search.
 *
 * Match indices must refer to the original (unsanitized) text.
 * If sanitizing doesn't change the text, indices line up.
 * Otherwise (e.g. latinize("Æ") is "AE") each character is sanitized separately,
 * and offsets map each index in the sanitized text back to the range of the original character it came from.
 * (Comparing lengths isn't enough; a longer and a shorter character would cancel out, misaligning everything between them.)
 */
function sanitizeText(
  textToHighlight: string,
  sanitize: (string: string) => string
): {
  offsets: { end: Array<number>; start: Array<number> } | null;
  text: string;
} {
  const sanitized = sanitize(textToHighlight);
  if (sanitized === textToHighlight) {
    return { offsets: null, text: sanitized };
  }

  const offsets = { end: [] as Array<number>, start: [] as Array<number> };
  // Text usually repeats a small set of characters, so cache their sanitized values
  const cache = new Map<string, string>();
  let text = "";
  let index = 0;

  // Iterate by code point (rather than code unit) so that surrogate pairs aren't split
  for (const character of textToHighlight) {
    const end = index + character.length;
    let sanitizedCharacter = cache.get(character);
    if (sanitizedCharacter === undefined) {
      sanitizedCharacter = sanitize(character);
      cache.set(character, sanitizedCharacter);
    }
    if (sanitizedCharacter.length === 0) {
      // Attach removed characters (e.g. combining accents) to the preceding character,
      // so that matches ending with that character include them
      for (
        let i = offsets.end.length - 1;
        i >= 0 && offsets.end[i] === index;
        i--
      ) {
        offsets.end[i] = end;
      }
    }
    for (let i = 0; i < sanitizedCharacter.length; i++) {
      offsets.start.push(index);
      offsets.end.push(end);
    }
    text += sanitizedCharacter;
    index = end;
  }

  return { offsets, text };
}

function searchWordToRegExp(
  searchWord: string | RegExp,
  autoEscape: boolean,
  flags: string,
  sanitize: (string: string) => string
): RegExp | null {
  // RegExps are used as-is; escaping or sanitizing their source would change what they match.
  // Their own flags (e.g. "i", "u", "m", "s") are preserved, except for "y" (which would stop the search after the first non-adjacent match).
  // The "g" flag is required to find every match.
  if (isRegExp(searchWord)) {
    return new RegExp(
      searchWord.source,
      "g" + searchWord.flags.replace(/[gy]/g, "")
    );
  }

  // Untyped callers may pass e.g. a number or null
  if (searchWord == null) {
    return null;
  }
  const source = sanitize(String(searchWord));
  if (source === "") {
    // An empty RegExp would match (zero-length) at every index without finding anything
    return null;
  }
  if (autoEscape) {
    return new RegExp(escapeRegExp(source), flags);
  }

  try {
    return new RegExp(source, flags);
  } catch {
    // Strings that aren't valid regular expressions (e.g. "***x") are matched literally
    return new RegExp(escapeRegExp(source), flags);
  }
}

/**
 * Unlike `instanceof RegExp`, this also recognizes RegExps from other realms (e.g. iframes).
 */
function isRegExp(value: unknown): value is RegExp {
  return Object.prototype.toString.call(value) === "[object RegExp]";
}

/**
 * Whether the characters at index and index + 1 form a surrogate pair (e.g. an emoji).
 */
function isSurrogatePair(text: string, index: number): boolean {
  const high = text.charCodeAt(index);
  const low = text.charCodeAt(index + 1);
  return high >= 0xd800 && high <= 0xdbff && low >= 0xdc00 && low <= 0xdfff;
}

function escapeRegExp(string: string): string {
  return string.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
}
