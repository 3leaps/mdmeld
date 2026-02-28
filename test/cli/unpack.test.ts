import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { walkDirectory } from "../../src/cli/fs-adapter.js";
import { pack, unpack } from "../../src/core/index.js";

const FIXTURES = join(import.meta.dirname, "../fixtures");

describe("CLI unpack integration", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = join(tmpdir(), `mdmeld-unpack-${Date.now()}`);
		mkdirSync(tmpDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true });
	});

	it("round-trips the simple-text fixture through pack/unpack", async () => {
		const files = walkDirectory(join(FIXTURES, "simple-text"));
		const archive = await pack(files);

		// Unpack
		const result = await unpack(archive);

		// Write to disk
		for (const file of result.files) {
			const outPath = join(tmpDir, file.path);
			mkdirSync(join(tmpDir, file.path, ".."), { recursive: true });
			writeFileSync(outPath, file.content);
		}

		// Compare
		for (const file of files) {
			const original = file.content;
			const roundtripped = new Uint8Array(readFileSync(join(tmpDir, file.path)));
			expect(roundtripped).toEqual(original);
		}
	});

	it("preserves file content exactly", async () => {
		const files = walkDirectory(join(FIXTURES, "simple-text"));
		const archive = await pack(files);
		const result = await unpack(archive);

		for (let i = 0; i < files.length; i++) {
			expect(result.files[i]!.path).toBe(files[i]!.path);
			expect(result.files[i]!.content).toEqual(files[i]!.content);
		}
	});
});
