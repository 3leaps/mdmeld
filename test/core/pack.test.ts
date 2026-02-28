import { describe, expect, it } from "vitest";
import { pack } from "../../src/core/pack.js";
import type { VirtualFile } from "../../src/core/types.js";

const encode = (s: string) => new TextEncoder().encode(s);

describe("pack", () => {
	it("produces valid YAML frontmatter", async () => {
		const files: VirtualFile[] = [{ path: "test.txt", content: encode("hello") }];
		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });

		// Should have frontmatter between --- delimiters
		expect(archive).toContain("---\n");
		expect(archive).toContain("version: 1.0.0");
		expect(archive).toContain("hash_algorithm: xxh64");
	});

	it("encodes binary files as base64", async () => {
		const binary = new Uint8Array([0, 1, 2, 3, 255]);
		const files: VirtualFile[] = [{ path: "data.bin", content: binary }];
		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });

		expect(archive).toContain("type: binary");
		expect(archive).toContain("encoding: base64");
		expect(archive).toContain("````base64");
	});

	it("handles empty file list", async () => {
		const archive = await pack([], { created: "2026-01-01T00:00:00Z" });
		expect(archive).toContain("files: []");
	});

	it("uses sha256 when specified", async () => {
		const files: VirtualFile[] = [{ path: "test.txt", content: encode("hello") }];
		const archive = await pack(files, {
			created: "2026-01-01T00:00:00Z",
			hashAlgorithm: "sha256",
		});

		expect(archive).toContain("hash_algorithm: sha256");
	});

	it("increases backtick count for content with backtick runs", async () => {
		// Content with 5 consecutive backticks needs backtick_count > 5
		const content = "Look: `````this has 5 backticks`````";
		const files: VirtualFile[] = [{ path: "tricky.md", content: encode(content) }];
		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });

		const parsed = archive.match(/backtick_count: (\d+)/);
		expect(parsed).toBeTruthy();
		const backtickCount = Number.parseInt(parsed![1]!, 10);
		expect(backtickCount).toBe(6); // one more than the longest run
	});

	it("rejects files with backtick runs of 8 or more", async () => {
		const content = "Extreme: ````````too many backticks````````";
		const files: VirtualFile[] = [{ path: "bad.md", content: encode(content) }];

		await expect(pack(files, { created: "2026-01-01T00:00:00Z" })).rejects.toThrow(
			"backtick run of 8 or more",
		);
	});
});
