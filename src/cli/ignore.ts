import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ignore from "ignore";

/**
 * Create an ignore filter from .gitignore and .mdmeldignore files in a directory.
 * Returns a function that tests whether a relative path should be ignored.
 */
export function createIgnoreFilter(dir: string): (path: string) => boolean {
	const ig = ignore();

	// Always ignore these
	ig.add([".git", "node_modules", ".DS_Store", ".gitignore", ".mdmeldignore"]);

	// Load .gitignore
	const gitignorePath = join(dir, ".gitignore");
	if (existsSync(gitignorePath)) {
		const content = readFileSync(gitignorePath, "utf-8");
		ig.add(content);
	}

	// Load .mdmeldignore (takes precedence)
	const mdmeldignorePath = join(dir, ".mdmeldignore");
	if (existsSync(mdmeldignorePath)) {
		const content = readFileSync(mdmeldignorePath, "utf-8");
		ig.add(content);
	}

	return (path: string) => ig.ignores(path);
}
