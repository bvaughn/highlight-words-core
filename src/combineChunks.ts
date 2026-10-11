import type { FoundChunk } from "./types";

/**
 * Sorts chunks by start index and combines any that overlap into a single chunk.
 * Adjacent (touching but not overlapping) chunks are kept separate.
 *
 * A combined chunk keeps the `searchIndex` of the chunk that starts first
 * (or, if several start at the same index, the longest of them).
 * Empty chunks (and chunks whose end is before their start, or whose indices aren't finite numbers) are omitted.
 * The chunks passed in are not modified; new chunk objects are returned.
 *
 * @param options - The chunks to combine
 * @returns Non-overlapping chunks, sorted by start index
 */
export const combineChunks = ({
  chunks
}: {
  /** Chunks to combine, in any order */
  chunks: Array<FoundChunk>;
}): Array<FoundChunk> => {
  const sorted = chunks
    // Chunks (e.g. from a custom findChunks) may have invalid indices (e.g. NaN or undefined);
    // skip them, since they can't be sorted or compared (and would swallow the chunks after them).
    // Skip empty and inverted chunks too, since they don't highlight anything.
    .filter(
      ({ start, end }) =>
        Number.isFinite(start) && Number.isFinite(end) && end > start
    )
    // Chunks that start at the same index are sorted longest first,
    // so that the combined chunk keeps the searchIndex of the longest one
    .sort(
      (first, second) => first.start - second.start || second.end - first.end
    );

  const combined: Array<FoundChunk> = [];
  let prevChunk: FoundChunk | undefined;
  for (const { start, end, searchIndex } of sorted) {
    if (prevChunk && start < prevChunk.end) {
      // The previous chunk may completely surround this one
      prevChunk.end = Math.max(prevChunk.end, end);
    } else {
      prevChunk = { start, end, searchIndex };
      combined.push(prevChunk);
    }
  }

  return combined;
};
