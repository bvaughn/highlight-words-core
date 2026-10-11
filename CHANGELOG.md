# Changelog

## 2.0.0 (2026-10-11)

### Breaking changes

- **String search words are matched literally by default** (`autoEscape` now defaults to `true`). To match patterns, pass `RegExp` search words, or set `autoEscape: false` for trusted input only.
- `findChunks` and `combineChunks` no longer include a `highlight` property in the chunks they return; `findAll` and `fillInChunks` (which return the final chunks) still do. Custom `findChunks` functions return `{ start, end, searchIndex }`.
- **Custom `findChunks` functions must include a `searchIndex`** (the index within `searchWords` of the search word that matched) in each chunk they return.
- Custom `findChunks` functions receive `searchWords` as a `ReadonlyArray`; TypeScript functions that declare it as a mutable array (e.g. `string[]`) must update their parameter type.
- `Chunk` is now a union of `HighlightedChunk` (`highlight: true`, with a required `searchIndex`) and `NonHighlightedChunk` (`highlight: false`, with no `searchIndex`). TypeScript code must check `chunk.highlight` before reading `chunk.searchIndex`, and code that builds chunks with a `highlight` value typed as `boolean` must use a literal `true` or `false` instead.
- `combineChunks` no longer sorts the array passed to it in place, and always returns new chunk objects.
- The published code uses modern JavaScript syntax (ES2020, e.g. `??` and object spread) instead of being compiled to ES5. Older environments and bundlers that can't parse it (e.g. webpack 4) need to transpile the package.
- The package is now written in TypeScript and ships TypeScript declarations; Flow types are no longer included.
- The package now ships CommonJS and ES module builds and defines `exports`, so only the package root (`highlight-words-core`) can be imported. Deep imports (e.g. `highlight-words-core/dist/index.js`) and the previously published `src/*.js` files are no longer available.
- When `autoEscape` is `false`, string search words that aren't valid regular expressions (e.g. `"(a"`) are matched literally instead of throwing an error.
- When a `sanitize` function changes the text, it is applied to each character separately (so that matches can be mapped back to the original text). Sanitizers that depend on context will give different results; for example, `toLowerCase()` turns a final `"Σ"` into `"ς"` when applied to a whole word, but into `"σ"` when applied to the character alone.

### New features

- `searchWords` can include `RegExp` objects, which are used as-is (with their own flags).
- `searchWords` can be a readonly array (e.g. `["a", "b"] as const`).
- Highlighted chunks include a `searchIndex` property: the index (within `searchWords`) of the search word that matched.
- The `HighlightedChunk` and `NonHighlightedChunk` types are exported.

### Bug fixes

- Matches map back to the original text when the `sanitize` function changes its length (e.g. `latinize("Æ")` is `"AE"`).
- Surrogate pairs (e.g. emoji) are no longer split between chunks.
- Chunks from a custom `findChunks` that extend outside of the text (or whose end is before their start) no longer produce invalid or overlapping chunks.
- A missing (`null` or `undefined`) `textToHighlight` is no longer searched as e.g. the string `"undefined"`.
- Missing (`null` or `undefined`) `searchWords` no longer throw an error; nothing is highlighted.
- Non-string search words from untyped callers (e.g. the number `0`) are matched as strings, rather than being skipped if falsy.

## 1.2.3 (2024-09-28)

- `combineChunks` (and therefore `findAll`) no longer joins adjacent chunks; only chunks that overlap are combined. (#27)

## 1.2.2 (2018-11-12)

- Moved `babel-preset-flow` from `dependencies` to `devDependencies`. (#12)

## 1.2.1 (2018-11-11)

- Added Flow types to the published package.

## 1.2.0 (2018-02-19)

- Added a `findChunks` option to `findAll` for providing custom search logic. (#8)

## 1.1.2 (2017-12-12)

- Zero-length regular expression matches (e.g. `"w?"` with `autoEscape` disabled) are ignored, rather than causing an infinite loop in some browsers. (#6)
- Removed the unused `babel-runtime` dependency. (#5)

## 1.1.1 (2017-12-12)

- `findAll` handles a `null` or missing `textToHighlight`. (#7)

## 1.1.0 (2017-10-15)

- Added a `caseSensitive` option.

## 1.0.3 (2016-09-21)

- Excluded `.babelrc` from the published package.

## 1.0.2 (2016-09-21)

- Fixed the prepublish script so that the package is built before publishing.

## 1.0.1 (2016-09-21)

- Renamed the `sanitizer` option to `sanitize`.

## 1.0.0 (2016-09-21)

- Initial release, with `findAll`, `findChunks`, `combineChunks`, and `fillInChunks`, and the `autoEscape` and `sanitizer` options.
