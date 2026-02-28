import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
	root: resolve(__dirname),
	resolve: {
		alias: {
			"@core": resolve(__dirname, "../src/core"),
		},
	},
	build: {
		outDir: resolve(__dirname, "dist"),
		emptyOutDir: true,
	},
});
