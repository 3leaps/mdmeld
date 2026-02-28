import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { "core/index": "src/core/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    outDir: "dist",
  },
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm"],
    outDir: "dist",
    banner: { js: "#!/usr/bin/env node" },
    sourcemap: true,
  },
]);
