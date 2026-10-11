import { describe, expect, it } from "vitest";
import { fillInChunks } from "./fillInChunks";

describe("fillInChunks", () => {
  it("should fill in the text between highlighted chunks", () => {
    expect(
      fillInChunks({
        chunksToHighlight: [
          { start: 0, end: 2, searchIndex: 0 },
          { start: 4, end: 6, searchIndex: 1 }
        ],
        totalLength: 8
      })
    ).toEqual([
      { start: 0, end: 2, highlight: true, searchIndex: 0 },
      { start: 2, end: 4, highlight: false },
      { start: 4, end: 6, highlight: true, searchIndex: 1 },
      { start: 6, end: 8, highlight: false }
    ]);
  });

  it("should return a single chunk if there is nothing to highlight", () => {
    expect(fillInChunks({ chunksToHighlight: [], totalLength: 5 })).toEqual([
      { start: 0, end: 5, highlight: false }
    ]);
    expect(fillInChunks({ chunksToHighlight: [], totalLength: 0 })).toEqual([]);
  });

  it("should clamp chunks to the bounds of the text", () => {
    expect(
      fillInChunks({
        chunksToHighlight: [
          { start: -2, end: 1, searchIndex: 0 },
          { start: 2, end: 10, searchIndex: 0 },
          { start: 12, end: 15, searchIndex: 0 }
        ],
        totalLength: 3
      })
    ).toEqual([
      { start: 0, end: 1, highlight: true, searchIndex: 0 },
      { start: 1, end: 2, highlight: false },
      { start: 2, end: 3, highlight: true, searchIndex: 0 }
    ]);
  });

  it("should not return overlapping chunks for inverted or overlapping input", () => {
    expect(
      fillInChunks({
        chunksToHighlight: [
          { start: 5, end: 2, searchIndex: 0 },
          { start: 4, end: 7, searchIndex: 0 }
        ],
        totalLength: 8
      })
    ).toEqual([
      { start: 0, end: 5, highlight: false },
      { start: 5, end: 7, highlight: true, searchIndex: 0 },
      { start: 7, end: 8, highlight: false }
    ]);
  });

  it("should skip chunks whose indices aren't finite numbers", () => {
    expect(
      fillInChunks({
        chunksToHighlight: [
          { start: NaN, end: 3, searchIndex: 0 },
          // @ts-expect-error Verifies that missing indices are handled at runtime
          { start: 1, end: undefined, searchIndex: 0 },
          { start: 2, end: 4, searchIndex: 0 }
        ],
        totalLength: 6
      })
    ).toEqual([
      { start: 0, end: 2, highlight: false },
      { start: 2, end: 4, highlight: true, searchIndex: 0 },
      { start: 4, end: 6, highlight: false }
    ]);
  });
});
