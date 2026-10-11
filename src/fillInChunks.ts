import type { Chunk, FoundChunk } from "./types";

/**
 * Given the chunks to highlight, creates additional (non-highlighted) chunks
 * for the text between them, so that together they cover the entire text.
 * Chunks are clamped to the bounds of the text, and empty chunks
 * (and chunks whose indices aren't finite numbers) are omitted.
 *
 * @param options - The chunks to highlight and the length of the text
 * @returns Highlighted and non-highlighted chunks, in order, covering `0` to `totalLength`
 */
export function fillInChunks({
  chunksToHighlight,
  totalLength
}: {
  /**
   * Chunks to highlight; these must be sorted and non-overlapping (see `combineChunks`).
   * Any part of a chunk that starts before the end of the previous chunk is dropped.
   */
  chunksToHighlight: Array<FoundChunk>;

  /** Length of the text being highlighted */
  totalLength: number;
}): Array<Chunk> {
  const allChunks: Array<Chunk> = [];
  const append = (chunk: Chunk) => {
    if (chunk.end > chunk.start) {
      allChunks.push(chunk);
    }
  };

  // Chunks (e.g. from a custom findChunks) may extend outside of the text
  const clamp = (index: number) => Math.max(0, Math.min(index, totalLength));

  let lastIndex = 0;
  for (const chunk of chunksToHighlight) {
    // Chunks (e.g. from a custom findChunks) may have invalid indices (e.g. NaN or undefined);
    // skip them, rather than letting them break the chunks that follow
    if (!Number.isFinite(chunk.start) || !Number.isFinite(chunk.end)) {
      continue;
    }
    // Never move backwards (e.g. for an inverted chunk whose end is before its start),
    // so that the returned chunks don't overlap
    const start = Math.max(lastIndex, clamp(chunk.start));
    const end = Math.max(start, clamp(chunk.end));
    append({ start: lastIndex, end: start, highlight: false });
    append({ start, end, highlight: true, searchIndex: chunk.searchIndex });
    lastIndex = end;
  }
  append({ start: lastIndex, end: totalLength, highlight: false });

  return allChunks;
}
