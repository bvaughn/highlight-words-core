import { copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: "highlight-words-core",
      formats: ["cjs", "es"]
    },
    sourcemap: true,
    // Keep in sync with the syntax level promised in CHANGELOG.md
    target: "es2020"
  },
  plugins: [
    dts({
      exclude: ["**/*.test.ts"],
      rollupTypes: true,
      // CommonJS consumers need their own declaration file;
      // in a "type": "module" package, a .d.ts file describes an ES module
      afterBuild: () =>
        copyFileSync(
          resolve(__dirname, "dist/highlight-words-core.d.ts"),
          resolve(__dirname, "dist/highlight-words-core.d.cts")
        )
    })
  ],
  publicDir: false
});
