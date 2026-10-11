import { combineChunks } from "./combineChunks";
import { fillInChunks } from "./fillInChunks";
import { findChunks as defaultFindChunks } from "./findChunks";
import { sanitize as defaultSanitize } from "./sanitize";
import type { Chunk, FindChunksOptions, FoundChunk } from "./types";

/**
 * Searches text for a set of search words and splits it into chunks,
 * covering the entire text in order, each of which is either highlighted (a match) or not.
 *
 * Overlapping matches are combined into a single highlighted chunk.
 *
 * @param options - Search options, plus an optional custom `findChunks` function
 * @returns Chunks covering `textToHighlight` from start to end
 *
 * @example
 * ```ts
 * findAll({ searchWords: ["is"], textToHighlight: "This is" });
 * // [
 * //   { start: 0, end: 2, highlight: false },
 * //   { start: 2, end: 4, highlight: true, searchIndex: 0 },
 * //   { start: 4, end: 5, highlight: false },
 * //   { start: 5, end: 7, highlight: true, searchIndex: 0 }
 * // ]
 * ```
 */
export function findAll({
  autoEscape,
  caseSensitive = false,
  findChunks = defaultFindChunks,
  sanitize = defaultSanitize,
  searchWords,
  textToHighlight
}: FindChunksOptions & {
  /**
   * Custom function to search for matches; defaults to `findChunks`.
   * It receives the other options (with defaults applied),
   * and returns one chunk (including the `searchIndex` of the search word that matched) per range to highlight.
   * Its results don't need to be sorted and may overlap or extend outside of the text.
   */
  findChunks?:
    | ((options: Required<FindChunksOptions>) => Array<FoundChunk>)
    | undefined;
}): Array<Chunk> {
  // Untyped callers may pass e.g. a number, or a missing value (which should not be searched as the string "undefined")
  textToHighlight = String(textToHighlight ?? "");
  // Untyped callers may also omit searchWords (or pass null); nothing can match then
  searchWords = searchWords ?? [];

  return fillInChunks({
    chunksToHighlight: combineChunks({
      chunks: findChunks({
        // Only an explicit false disables escaping (untyped callers may pass e.g. null)
        autoEscape: autoEscape !== false,
        caseSensitive,
        sanitize,
        searchWords,
        textToHighlight
      })
    }),
    totalLength: textToHighlight.length
  });
}
