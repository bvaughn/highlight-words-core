import { describe, expect, it, vi } from "vitest";
import { findAll } from "./findAll";

describe("findAll", () => {
  // Positions: 01234567890123456789012345678901234567
  const TEXT = "This is a string with words to search.";

  it("should handle empty or null textToHighlight", () => {
    let result = findAll({
      searchWords: ["search"],
      textToHighlight: ""
    });
    expect(result.length).toBe(0);

    // Missing values should not be searched as e.g. the string "undefined"
    // @ts-expect-error Verifies that a missing textToHighlight is handled at runtime
    result = findAll({
      searchWords: ["und"]
    });
    expect(result.length).toBe(0);

    result = findAll({
      searchWords: ["null"],
      // @ts-expect-error Verifies that a null textToHighlight is handled at runtime
      textToHighlight: null
    });
    expect(result.length).toBe(0);
  });

  it("should handle missing or null searchWords", () => {
    // @ts-expect-error Verifies that missing searchWords are handled at runtime
    expect(findAll({ textToHighlight: "abc" })).toEqual([
      { start: 0, end: 3, highlight: false }
    ]);

    expect(
      // @ts-expect-error Verifies that null searchWords are handled at runtime
      findAll({ searchWords: null, textToHighlight: "abc" })
    ).toEqual([{ start: 0, end: 3, highlight: false }]);

    // Custom findChunks functions receive an empty array
    const findChunks = vi.fn(() => []);
    // @ts-expect-error Verifies that missing searchWords are handled at runtime
    findAll({ findChunks, textToHighlight: "abc" });
    expect(findChunks).toHaveBeenCalledWith(
      expect.objectContaining({ searchWords: [] })
    );
  });

  it("should combine into the minimum number of marked and unmarked chunks", () => {
    const filledInChunks = findAll({
      searchWords: ["thi", "is"],
      textToHighlight: TEXT
    });
    expect(filledInChunks).toEqual([
      { start: 0, end: 4, highlight: true, searchIndex: 0 },
      { start: 4, end: 5, highlight: false },
      { start: 5, end: 7, highlight: true, searchIndex: 1 },
      { start: 7, end: 38, highlight: false }
    ]);
  });

  it("should include the index of the matching search word, ignoring empty words", () => {
    const filledInChunks = findAll({
      searchWords: ["", "string", "is"],
      textToHighlight: TEXT
    });
    expect(filledInChunks).toEqual([
      { start: 0, end: 2, highlight: false },
      { start: 2, end: 4, highlight: true, searchIndex: 2 },
      { start: 4, end: 5, highlight: false },
      { start: 5, end: 7, highlight: true, searchIndex: 2 },
      { start: 7, end: 10, highlight: false },
      { start: 10, end: 16, highlight: true, searchIndex: 1 },
      { start: 16, end: 38, highlight: false }
    ]);
  });

  it("should highlight surrogate pairs (e.g. emoji) as a whole", () => {
    expect(
      findAll({
        autoEscape: false,
        searchWords: ["."],
        textToHighlight: "a😀"
      })
    ).toEqual([
      { start: 0, end: 1, highlight: true, searchIndex: 0 },
      { start: 1, end: 3, highlight: true, searchIndex: 0 }
    ]);
  });

  it("should not combine adjacent chunks", () => {
    const filledInChunks = findAll({
      searchWords: ["e"],
      textToHighlight: "sleep"
    });
    expect(filledInChunks).toEqual([
      { start: 0, end: 2, highlight: false },
      { start: 2, end: 3, highlight: true, searchIndex: 0 },
      { start: 3, end: 4, highlight: true, searchIndex: 0 },
      { start: 4, end: 5, highlight: false }
    ]);
  });

  it("should use custom findChunks", () => {
    let filledInChunks = findAll({
      findChunks: () => [{ start: 1, end: 3, searchIndex: 0 }],
      searchWords: ["xxx"],
      textToHighlight: TEXT
    });
    expect(filledInChunks).toEqual([
      { start: 0, end: 1, highlight: false },
      { start: 1, end: 3, highlight: true, searchIndex: 0 },
      { start: 3, end: 38, highlight: false }
    ]);

    filledInChunks = findAll({
      findChunks: () => [],
      searchWords: ["This"],
      textToHighlight: TEXT
    });
    expect(filledInChunks).toEqual([{ start: 0, end: 38, highlight: false }]);
  });

  it("should not split non-highlighted text around inverted chunks from custom findChunks", () => {
    expect(
      findAll({
        findChunks: () => [
          { start: 6, end: 2, searchIndex: 0 },
          { start: 3, end: 5, searchIndex: 0 }
        ],
        searchWords: [],
        textToHighlight: "abcdefghij"
      })
    ).toEqual([
      { start: 0, end: 3, highlight: false },
      { start: 3, end: 5, highlight: true, searchIndex: 0 },
      { start: 5, end: 10, highlight: false }
    ]);
  });

  it("should pass options with defaults applied to custom findChunks", () => {
    const findChunks = vi.fn(() => []);
    findAll({ findChunks, searchWords: ["x"], textToHighlight: TEXT });
    expect(findChunks).toHaveBeenCalledWith({
      autoEscape: true,
      caseSensitive: false,
      sanitize: expect.any(Function),
      searchWords: ["x"],
      textToHighlight: TEXT
    });
  });

  it("should pass autoEscape to custom findChunks as a boolean", () => {
    const findChunks = vi.fn(() => []);
    findAll({
      // @ts-expect-error Verifies that null is handled at runtime
      autoEscape: null,
      findChunks,
      searchWords: ["x"],
      textToHighlight: TEXT
    });
    expect(findChunks).toHaveBeenCalledWith(
      expect.objectContaining({ autoEscape: true })
    );
  });

  it("should accept readonly searchWords", () => {
    // Also a type check; this would not compile if searchWords had to be a mutable array
    const searchWords = ["is"] as const;
    expect(findAll({ searchWords, textToHighlight: "This" })).toEqual([
      { start: 0, end: 2, highlight: false },
      { start: 2, end: 4, highlight: true, searchIndex: 0 }
    ]);
  });
});
