import latinize from "latinize";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { findChunks } from "./findChunks";

describe("findChunks", () => {
  // Positions: 01234567890123456789012345678901234567
  const TEXT = "This is a string with words to search.";

  it("should highlight all occurrences of a word, regardless of capitalization", () => {
    const rawChunks = findChunks({
      searchWords: ["th"],
      textToHighlight: TEXT
    });
    expect(rawChunks).toEqual([
      { start: 0, end: 2, searchIndex: 0 },
      { start: 19, end: 21, searchIndex: 0 }
    ]);
  });

  it("should match string search words literally by default", () => {
    expect(
      findChunks({
        searchWords: ["a.c", "(a+)+$"],
        textToHighlight: "abc a.c (a+)+$"
      })
    ).toEqual([
      { start: 4, end: 7, searchIndex: 0 },
      { start: 8, end: 14, searchIndex: 1 }
    ]);
  });

  it("should treat string search words as regular expressions when autoEscape is false", () => {
    expect(
      findChunks({
        autoEscape: false,
        searchWords: ["a.c"],
        textToHighlight: "abc a.c"
      })
    ).toEqual([
      { start: 0, end: 3, searchIndex: 0 },
      { start: 4, end: 7, searchIndex: 0 }
    ]);
  });

  it("should handle unclosed parentheses when autoEscape option is truthy", () => {
    const rawChunks = findChunks({
      autoEscape: true,
      searchWords: ["text)"],
      textToHighlight: "(This is text)"
    });
    expect(rawChunks).toEqual([{ start: 9, end: 14, searchIndex: 0 }]);
  });

  it("should match terms without accents against text with accents", () => {
    const rawChunks = findChunks({
      sanitize: latinize,
      searchWords: ["example"],
      textToHighlight: "ỆᶍǍᶆṔƚÉ"
    });
    expect(rawChunks).toEqual([{ start: 0, end: 7, searchIndex: 0 }]);
  });

  it("should support case sensitive matches", () => {
    let rawChunks = findChunks({
      caseSensitive: true,
      searchWords: ["t"],
      textToHighlight: TEXT
    });
    expect(rawChunks).toEqual([
      { start: 11, end: 12, searchIndex: 0 },
      { start: 19, end: 20, searchIndex: 0 },
      { start: 28, end: 29, searchIndex: 0 }
    ]);

    rawChunks = findChunks({
      caseSensitive: true,
      searchWords: ["T"],
      textToHighlight: TEXT
    });
    expect(rawChunks).toEqual([{ start: 0, end: 1, searchIndex: 0 }]);
  });

  it("should handle zero-length matches correctly", () => {
    let rawChunks = findChunks({
      caseSensitive: true,
      autoEscape: false,
      searchWords: [".*"],
      textToHighlight: TEXT
    });
    expect(rawChunks).toEqual([{ start: 0, end: 38, searchIndex: 0 }]);

    rawChunks = findChunks({
      caseSensitive: true,
      autoEscape: false,
      searchWords: ["w?"],
      textToHighlight: TEXT
    });
    expect(rawChunks).toEqual([
      { start: 17, end: 18, searchIndex: 0 },
      { start: 22, end: 23, searchIndex: 0 }
    ]);
  });

  it("should not escape or sanitize RegExp search words", () => {
    const rawChunks = findChunks({
      autoEscape: true,
      sanitize: latinize,
      searchWords: [/wi.h/, "a."],
      textToHighlight: "This is a. string with words"
    });
    expect(rawChunks).toEqual([
      { start: 18, end: 22, searchIndex: 0 },
      { start: 8, end: 10, searchIndex: 1 }
    ]);
  });

  it("should preserve RegExp search word flags other than g and y", () => {
    const rawChunks = findChunks({
      searchWords: [/^b/my, /\u{62}c/u],
      textToHighlight: "a\nbc"
    });
    expect(rawChunks).toEqual([
      { start: 2, end: 3, searchIndex: 0 },
      { start: 2, end: 4, searchIndex: 1 }
    ]);
  });

  it("should use the case sensitivity of RegExp search words", () => {
    expect(
      findChunks({
        searchWords: [/Foo/],
        textToHighlight: "foo"
      })
    ).toEqual([]);

    expect(
      findChunks({
        caseSensitive: true,
        searchWords: [/foo/i],
        textToHighlight: "FOO"
      })
    ).toEqual([{ start: 0, end: 3, searchIndex: 0 }]);
  });

  it("should map matches back to the original text when sanitizing changes its length", () => {
    // latinize("Æ") is "AE"
    const text = "Æon flux";
    expect(
      findChunks({
        sanitize: latinize,
        searchWords: ["flux", "ae", "E"],
        textToHighlight: text
      })
    ).toEqual([
      { start: 4, end: 8, searchIndex: 0 },
      { start: 0, end: 1, searchIndex: 1 },
      // Partial matches of a sanitized character include the entire original character
      { start: 0, end: 1, searchIndex: 2 }
    ]);

    // Characters removed by sanitizing (e.g. combining accents) are included in matches that span them
    expect(
      findChunks({
        sanitize: (string) => string.replace(/\u0301/g, ""),
        searchWords: ["e b"],
        textToHighlight: "cafe\u0301 bar"
      })
    ).toEqual([{ start: 3, end: 7, searchIndex: 0 }]);
  });

  it("should include characters removed by sanitizing at the end of a match", () => {
    const text = "cafe\u0301 bar";
    const chunks = findChunks({
      sanitize: (string) => string.replace(/\u0301/g, ""),
      searchWords: ["cafe"],
      textToHighlight: text
    });
    expect(chunks).toEqual([{ start: 0, end: 5, searchIndex: 0 }]);
  });

  it("should call sanitize once per unique character", () => {
    const characters: Array<string> = [];
    findChunks({
      sanitize: (string) => {
        if (string.length === 1) {
          characters.push(string);
        }
        return latinize(string);
      },
      searchWords: ["ea"],
      textToHighlight: "éééaaa"
    });
    expect(characters).toEqual(["é", "a"]);
  });

  it("should map matches back to the original text when sanitizing changes characters but not the overall length", () => {
    // "Æ" gets longer ("AE") and the combining accent is removed, so the lengths cancel out
    const text = "Æ cafe\u0301 bar";
    const chunks = findChunks({
      sanitize: (string) => latinize(string).replace(/\u0301/g, ""),
      searchWords: ["caf"],
      textToHighlight: text
    });
    expect(chunks.map(({ start, end }) => text.substring(start, end))).toEqual([
      "caf"
    ]);
  });

  it("should match RegExp search words against the sanitized text", () => {
    expect(
      findChunks({
        sanitize: latinize,
        searchWords: [/é/, /e/],
        textToHighlight: "café"
      })
    ).toEqual([{ start: 3, end: 4, searchIndex: 1 }]);
  });

  it("should not split surrogate pairs when sanitizing changes the length of the text", () => {
    const text = "😀 Æ 😀";
    const chunks = findChunks({
      sanitize: latinize,
      searchWords: ["😀"],
      textToHighlight: text
    });
    expect(chunks.map(({ start, end }) => text.substring(start, end))).toEqual([
      "😀",
      "😀"
    ]);
  });

  it("should not hang on zero-length matches next to surrogate pairs in Unicode-aware RegExps", () => {
    expect(
      findChunks({
        searchWords: [/x*/u, new RegExp("x*", "v")],
        textToHighlight: "😀x"
      })
    ).toEqual([
      { start: 2, end: 3, searchIndex: 0 },
      { start: 2, end: 3, searchIndex: 1 }
    ]);
  });

  it("should not split surrogate pairs when matching", () => {
    const text = "a😀";
    const chunks = findChunks({
      autoEscape: false,
      searchWords: ["."],
      textToHighlight: text
    });
    expect(chunks.map(({ start, end }) => text.substring(start, end))).toEqual([
      "a",
      "😀",
      "😀"
    ]);
  });

  it("should match invalid regular expressions literally", () => {
    const rawChunks = findChunks({
      autoEscape: false,
      searchWords: ["***x", "(a"],
      textToHighlight: "***x and (a"
    });
    expect(rawChunks).toEqual([
      { start: 0, end: 4, searchIndex: 0 },
      { start: 9, end: 11, searchIndex: 1 }
    ]);
  });

  it("should not hang on word boundaries", () => {
    const rawChunks = findChunks({
      autoEscape: false,
      searchWords: ["\\b"],
      textToHighlight: "m"
    });
    expect(rawChunks).toEqual([]);
  });

  it("should match non-string search words from untyped callers as strings", () => {
    expect(
      findChunks({
        // @ts-expect-error Verifies that numbers and missing values are handled at runtime
        searchWords: [123, null, undefined, 0],
        textToHighlight: "a1230"
      })
    ).toEqual([
      { start: 1, end: 4, searchIndex: 0 },
      { start: 4, end: 5, searchIndex: 3 }
    ]);
  });

  it("should handle missing or null searchWords", () => {
    // @ts-expect-error Verifies that missing searchWords are handled at runtime
    expect(findChunks({ textToHighlight: "abc" })).toEqual([]);
    expect(
      // @ts-expect-error Verifies that null searchWords are handled at runtime
      findChunks({ searchWords: null, textToHighlight: "abc" })
    ).toEqual([]);
  });

  it("should match a non-string textToHighlight from untyped callers as a string", () => {
    expect(
      findChunks({
        searchWords: ["2"],
        // @ts-expect-error Verifies that numbers are handled at runtime
        textToHighlight: 123
      })
    ).toEqual([{ start: 1, end: 2, searchIndex: 0 }]);
  });

  it("should use RegExp search words from other realms (e.g. iframes) as-is", () => {
    const regex = runInNewContext("/a.c/i");
    expect(regex instanceof RegExp).toBe(false);
    expect(
      findChunks({
        searchWords: [regex],
        textToHighlight: "xAbc"
      })
    ).toEqual([{ start: 1, end: 4, searchIndex: 0 }]);
  });

  it("should skip search words that sanitizing removes entirely", () => {
    const regexExec = vi.spyOn(RegExp.prototype, "exec");
    try {
      expect(
        findChunks({
          // Doesn't use a RegExp, which would call exec
          sanitize: (string) => string.split("\u0301").join(""),
          searchWords: ["\u0301"],
          textToHighlight: "cafe\u0301"
        })
      ).toEqual([]);
      // An empty RegExp would be run (and match) at every index
      expect(regexExec).not.toHaveBeenCalled();
    } finally {
      regexExec.mockRestore();
    }
  });

  it("should only treat search words as regular expressions when autoEscape is explicitly false", () => {
    expect(
      findChunks({
        // @ts-expect-error Verifies that null is handled at runtime
        autoEscape: null,
        searchWords: ["a.c"],
        textToHighlight: "abc a.c"
      })
    ).toEqual([{ start: 4, end: 7, searchIndex: 0 }]);
  });
});
