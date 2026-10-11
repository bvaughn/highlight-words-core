Utility functions shared by [`react-highlight-words`](https://github.com/bvaughn/react-highlight-words) and [`react-native-highlight-words`](https://github.com/clauderic/react-native-highlight-words).

---
### 🎉 [Become a sponsor](https://github.com/sponsors/bvaughn/) or ☕ [Buy me a coffee](http://givebrian.coffee/)
---

## Installation

```sh
npm install highlight-words-core
```

Upgrading from 1.x? See the [changelog](./CHANGELOG.md) for breaking changes.

## API

The primary API for this package is a function exported as `findAll`. This method searches a string of text for a set of search terms and returns an array of "chunks" that describe the matches found.

Each "chunk" is an object consisting of a pair of indices (`chunk.start` and `chunk.end`) and a boolean specifying whether the chunk is a match (`chunk.highlight`). Highlighted chunks also include the index of the search word that matched them (`chunk.searchIndex`). For example:

```js
import { findAll } from "highlight-words-core";

const textToHighlight = "This is some text to highlight.";
const searchWords = ["This", "i"];

const chunks = findAll({
  searchWords,
  textToHighlight
});

// ⚠️ Escape the text before inserting it into HTML
const escapeHTML = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const highlightedHTML = chunks
  .map(({ end, highlight, start }) => {
    const text = escapeHTML(textToHighlight.substring(start, end));
    return highlight ? `<mark>${text}</mark>` : text;
  })
  .join("");
```

### `findAll`

Searches text for a set of search words and splits it into chunks, covering the entire text in order, each of which is either highlighted (a match) or not. Overlapping matches are combined into a single highlighted chunk; adjacent matches are kept separate.

Only the `searchWords` array and `textToHighlight` string are required.

| Parameter | Required? | Type | Description |
| --- | :---: | --- | --- |
| autoEscape |  | `boolean` | Match string search words literally (defaults to `true`); set to `false` to treat them as regular expressions (see [Regular expressions](#regular-expressions)) |
| caseSensitive |  | `boolean` | Match string search words case sensitively (defaults to `false`); RegExp search words use their own `i` flag |
| findChunks |  | `Function` | Custom search function (see [Custom `findChunks`](#custom-findchunks)) |
| sanitize |  | `Function` | Process the text and string search words before comparing them, e.g. to remove accents (see [Sanitizing](#sanitizing)) |
| searchWords | ✅ | `ReadonlyArray<string \| RegExp>` | Words to search for; empty strings are ignored |
| textToHighlight | ✅ | `string` | Text to search and highlight |

It returns an array of `Chunk` objects:

```ts
type Chunk = HighlightedChunk | NonHighlightedChunk;

type HighlightedChunk = {
  highlight: true; // This chunk matched a search word
  start: number; // Index of the first character (inclusive)
  end: number; // Index after the last character (exclusive)
  searchIndex: number; // Index (within searchWords) of the matching word
};

type NonHighlightedChunk = {
  highlight: false; // This chunk is text between matches
  start: number;
  end: number;
};
```

In TypeScript, check `chunk.highlight` before reading `chunk.searchIndex`.

When overlapping matches are combined, the chunk keeps the `searchIndex` of the match that starts first (or, if several start at the same index, the longest of them).

#### Regular expressions

By default, string search words are matched literally. To match a pattern, pass a `RegExp` search word (which is used as-is, with its own flags), or set `autoEscape` to `false` to treat every string search word as a regular expression. Strings that aren't valid regular expressions are then matched literally.

String search words are compiled with the `g` flag (plus `i`, unless `caseSensitive` is set), never `u` or `v`, so syntax that requires those flags (such as `\p{L}`) only works in `RegExp` search words.

> [!WARNING]
> Only set `autoEscape` to `false` for trusted search words. A malicious regular expression, such as `(a+)+$`, can take an extremely long time to run ([ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)), so text typed by users should be matched literally.

#### Sanitizing

A `sanitize` function (e.g. [`latinize`](https://www.npmjs.com/package/latinize)) can be used to ignore differences such as accents. It is applied to the text and to each string search word. Matches always refer to the original text, even if sanitizing changes its length (e.g. `"Æ"` to `"AE"`).

- Sanitizing should transform characters independently; if it changes the text, it is applied to each character separately.
- RegExp search words are not sanitized, but they are matched against the sanitized text (e.g. `/é/` won't match anything if the sanitize function removes accents).

#### Custom `findChunks`

The `findChunks` parameter replaces the default search logic. It receives the other parameters (with defaults applied) and returns an array of `{ start, end, searchIndex }` objects for the ranges to highlight, where `searchIndex` is the index (within `searchWords`) of the search word that matched. These may be in any order, may overlap, and may extend outside of the text; `findAll` sorts, combines, and clamps them.

A custom function replaces all of the default matching behavior, so it is responsible for respecting the `autoEscape`, `caseSensitive`, and `sanitize` options (and any RegExp search words) if it needs to. The example below ignores them.

```js
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Only highlight whole words (assumes string search words)
const findWholeWords = ({ searchWords, textToHighlight }) =>
  searchWords.flatMap((searchWord, searchIndex) => {
    const chunks = [];
    if (!searchWord) {
      return chunks;
    }
    const regex = new RegExp(`\\b${escapeRegExp(searchWord)}\\b`, "gi");
    let match;
    while ((match = regex.exec(textToHighlight))) {
      chunks.push({ start: match.index, end: regex.lastIndex, searchIndex });
    }
    return chunks;
  });

findAll({ findChunks: findWholeWords, searchWords, textToHighlight });
```

### Lower-level functions

`findAll` is built from the following functions, which are also exported:

| Function | Description |
| --- | --- |
| `findChunks(options)` | The default search function; returns one `{ start, end, searchIndex }` object per match (unsorted, and possibly overlapping). Accepts the same options as `findAll`, except for `findChunks`. |
| `combineChunks({ chunks })` | Sorts chunks and combines any that overlap. Returns new objects; the chunks passed in are not modified. |
| `fillInChunks({ chunksToHighlight, totalLength })` | Given sorted, non-overlapping chunks to highlight, adds non-highlighted chunks between them so that together they cover the entire text. |

The `Chunk`, `HighlightedChunk`, `NonHighlightedChunk`, `FoundChunk`, and `FindChunksOptions` TypeScript types are also exported.

## Development

```sh
pnpm install
pnpm test      # Run tests (Vitest)
pnpm tsc       # Type check
pnpm lint      # ESLint
pnpm prettier  # Format code (Prettier)
pnpm build     # Build CJS and ESM bundles (with TypeScript declarations) to dist/
```

## License
MIT License - fork, modify and use however you want.
