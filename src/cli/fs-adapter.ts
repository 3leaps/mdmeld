import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { VirtualFile } from "../core/types.js";
import { createIgnoreFilter } from "./ignore.js";

/**
 * Walk a directory and return all files as VirtualFile[].
 * Respects .gitignore and .mdmeldignore patterns.
 */
export function walkDirectory(dir: string): VirtualFile[] {
	const isIgnored = createIgnoreFilter(dir);
	const files: VirtualFile[] = [];

	function walk(currentDir: string) {
		const entries = readdirSync(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name);
			const relPath = relative(dir, fullPath);
			// Convert to POSIX path for ignore matching and storage
			const posixPath = relPath.split("\\").join("/");

			if (isIgnored(posixPath)) continue;

			if (entry.isDirectory()) {
				walk(fullPath);
			} else if (entry.isFile()) {
				const content = readFileSync(fullPath);
				files.push({
					path: posixPath,
					content: new Uint8Array(content),
				});
			}
		}
	}

	walk(dir);

	// Sort by path for deterministic output
	files.sort((a, b) => a.path.localeCompare(b.path));
	return files;
}
