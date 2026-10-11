import { describe, expect, it } from "vitest";
import { combineChunks } from "./combineChunks";
import { findChunks } from "./findChunks";

describe("combineChunks", () => {
  // Positions: 01234567890123456789012345678901234567
  const TEXT = "This is a string with words to search.";

  it("should highlight words that partially overlap", () => {
    const combinedChunks = combineChunks({
      chunks: findChunks({
        searchWords: ["thi", "is"],
        textToHighlight: TEXT
      })
    });
    expect(combinedChunks).toEqual([
      { start: 0, end: 4, searchIndex: 0 },
      { start: 5, end: 7, searchIndex: 1 }
    ]);
  });

  it("should keep the searchIndex of the longest chunk when several start at the same index", () => {
    expect(
      combineChunks({
        chunks: findChunks({
          searchWords: ["a", "abc"],
          textToHighlight: "abc"
        })
      })
    ).toEqual([{ start: 0, end: 3, searchIndex: 1 }]);
  });

  it("should not modify the chunks passed to it", () => {
    const chunks = [
      { start: 5, end: 7, searchIndex: 0 },
      { start: 0, end: 2, searchIndex: 1 }
    ];
    expect(combineChunks({ chunks })).toEqual([
      { start: 0, end: 2, searchIndex: 1 },
      { start: 5, end: 7, searchIndex: 0 }
    ]);
    expect(chunks).toEqual([
      { start: 5, end: 7, searchIndex: 0 },
      { start: 0, end: 2, searchIndex: 1 }
    ]);
  });

  it("should return new chunks without a highlight property", () => {
    const chunks = [
      { start: 0, end: 2, highlight: true, searchIndex: 1 },
      { start: 1, end: 3, highlight: true, searchIndex: 0 },
      { start: 5, end: 6, highlight: true, searchIndex: 2 }
    ];
    const combined = combineChunks({ chunks });
    expect(combined).toEqual([
      { start: 0, end: 3, searchIndex: 1 },
      { start: 5, end: 6, searchIndex: 2 }
    ]);
    expect(combined[1]).not.toBe(chunks[2]);
  });

  it("should skip chunks whose indices aren't finite numbers", () => {
    expect(
      combineChunks({
        chunks: [
          { start: NaN, end: 3, searchIndex: 0 },
          { start: 1, end: 2, searchIndex: 0 },
          // @ts-expect-error Verifies that missing indices are handled at runtime
          { start: undefined, end: 5, searchIndex: 0 },
          { start: 4, end: Infinity, searchIndex: 0 }
        ]
      })
    ).toEqual([{ start: 1, end: 2, searchIndex: 0 }]);
  });

  it("should skip empty and inverted chunks", () => {
    expect(
      combineChunks({
        chunks: [
          { start: 0, end: 2, searchIndex: 0 },
          { start: 2, end: 2, searchIndex: 0 },
          { start: 5, end: 3, searchIndex: 0 }
        ]
      })
    ).toEqual([{ start: 0, end: 2, searchIndex: 0 }]);
  });
});
