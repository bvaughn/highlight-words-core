/**
 * A range of text (start inclusive, end exclusive), as returned by `findAll` and `fillInChunks`.
 * Together, these chunks cover the entire text.
 *
 * Check `highlight` to narrow a chunk to `HighlightedChunk` (which has a `searchIndex`)
 * or `NonHighlightedChunk`.
 */
export type Chunk = HighlightedChunk | NonHighlightedChunk;

/**
 * A range of text (start inclusive, end exclusive) that matched a search word.
 */
export type HighlightedChunk = {
  /** Whether this range of text matched a search word */
  highlight: true;

  /** Index of the first character in this range */
  start: number;

  /** Index after the last character in this range */
  end: number;

  /** Index (within searchWords) of the search word that matched this range */
  searchIndex: number;
};

/**
 * A range of text (start inclusive, end exclusive) between matches.
 */
export type NonHighlightedChunk = {
  /** Whether this range of text matched a search word */
  highlight: false;

  /** Index of the first character in this range */
  start: number;

  /** Index after the last character in this range */
  end: number;
};

/**
 * A range of text (start inclusive, end exclusive) that matched a search word,
 * as returned by `findChunks` (or a custom findChunks function) and `combineChunks`.
 */
export type FoundChunk = {
  /** Index of the first character in this range */
  start: number;

  /** Index after the last character in this range */
  end: number;

  /** Index (within searchWords) of the search word that matched this range */
  searchIndex: number;
};

/**
 * Options passed to findChunks (including custom findChunks functions).
 */
export type FindChunksOptions = {
  /**
   * Escape characters in string search words that are meaningful in regular expressions,
   * so that they are matched literally; defaults to true.
   *
   * When false, string search words are compiled with the "g" (and, unless `caseSensitive`, "i") flags only,
   * so syntax that requires the "u" or "v" flag (e.g. `\p{L}`) isn't supported; use a RegExp search word for that.
   *
   * ⚠️ Only set this to false for trusted search words;
   * a malicious regular expression (e.g. "(a+)+$") can take an extremely long time to run.
   */
  autoEscape?: boolean | undefined;

  /**
   * Match string search words case sensitively; defaults to false.
   * RegExp search words are case sensitive unless they have the "i" flag.
   */
  caseSensitive?: boolean | undefined;

  /**
   * Process each string search word and the text before comparing them (e.g. to remove accents).
   * Matches always refer to the original text, even if sanitizing changes its length (e.g. "Æ" to "AE").
   *
   * RegExp search words are not sanitized, but they are matched against the sanitized text
   * (e.g. /é/ won't match anything if the sanitize function removes accents).
   *
   * ℹ️ Sanitizing should transform characters independently;
   * if it changes the text, it is applied to each character separately.
   */
  sanitize?: ((string: string) => string) | undefined;

  /**
   * Words to search for.
   * Strings are matched literally unless `autoEscape` is false
   * (in which case they are treated as regular expressions, and strings that aren't valid regular expressions are matched literally).
   * RegExps are used as-is (with their own flags).
   * Empty strings are ignored.
   */
  searchWords: ReadonlyArray<string | RegExp>;

  /** Text to search */
  textToHighlight: string;
};
