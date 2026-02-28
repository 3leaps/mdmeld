import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { walkDirectory } from "../../src/cli/fs-adapter.js";
import { check, pack, unpack } from "../../src/core/index.js";

const FIXTURES = join(import.meta.dirname, "../fixtures");

describe("CLI pack integration", () => {
	it("walks and packs the simple-text fixture", async () => {
		const files = walkDirectory(join(FIXTURES, "simple-text"));

		expect(files.length).toBe(2);
		expect(files.map((f) => f.path).sort()).toEqual(["hello.txt", "src/index.ts"]);

		const archive = await pack(files);
		const result = await check(archive);
		expect(result.valid).toBe(true);
	});

	it("respects .gitignore patterns", async () => {
		const dir = join(tmpdir(), `mdmeld-test-${Date.now()}`);
		mkdirSync(dir, { recursive: true });

		writeFileSync(join(dir, "keep.txt"), "keep");
		writeFileSync(join(dir, "ignore.log"), "ignore this");
		writeFileSync(join(dir, ".gitignore"), "*.log\n");

		try {
			const files = walkDirectory(dir);
			expect(files.map((f) => f.path)).toEqual(["keep.txt"]);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it("respects .mdmeldignore patterns", async () => {
		const dir = join(tmpdir(), `mdmeld-test-${Date.now()}`);
		mkdirSync(dir, { recursive: true });

		writeFileSync(join(dir, "keep.txt"), "keep");
		writeFileSync(join(dir, "secret.env"), "SECRET=value");
		writeFileSync(join(dir, ".mdmeldignore"), "*.env\n");

		try {
			const files = walkDirectory(dir);
			expect(files.map((f) => f.path)).toEqual(["keep.txt"]);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it("handles the backtick-edge fixture", async () => {
		const files = walkDirectory(join(FIXTURES, "backtick-edge"));
		expect(files.length).toBe(1);

		const archive = await pack(files);
		// Archive must use wider fences (4+ backticks) to wrap 3-backtick content
		expect(archive).toContain("````");

		const result = await unpack(archive);
		expect(result.files.length).toBe(1);
		// Roundtrip preserves original content (which has 3-backtick fences)
		const content = new TextDecoder().decode(result.files[0]!.content);
		expect(content).toContain("```typescript");
	});
});
