import { describe, expect, it } from "vitest";
import { computeHashBytes } from "../../src/core/hash.js";
import { check, pack, unpack } from "../../src/core/index.js";
import type { VirtualFile } from "../../src/core/types.js";

const encode = (s: string) => new TextEncoder().encode(s);
const decode = (b: Uint8Array) => new TextDecoder().decode(b);

describe("roundtrip", () => {
	it("packs and unpacks a single text file", async () => {
		const files: VirtualFile[] = [{ path: "hello.txt", content: encode("Hello, world!") }];

		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });
		const result = await unpack(archive);

		expect(result.files).toHaveLength(1);
		expect(result.files[0]!.path).toBe("hello.txt");
		expect(decode(result.files[0]!.content)).toBe("Hello, world!");
	});

	it("packs and unpacks multiple files", async () => {
		const files: VirtualFile[] = [
			{ path: "a.txt", content: encode("File A") },
			{ path: "src/b.ts", content: encode("export const b = 1;") },
			{ path: "src/c.json", content: encode('{"key": "value"}') },
		];

		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });
		const result = await unpack(archive);

		expect(result.files).toHaveLength(3);
		expect(result.files[0]!.path).toBe("a.txt");
		expect(result.files[1]!.path).toBe("src/b.ts");
		expect(result.files[2]!.path).toBe("src/c.json");
		expect(decode(result.files[0]!.content)).toBe("File A");
		expect(decode(result.files[1]!.content)).toBe("export const b = 1;");
		expect(decode(result.files[2]!.content)).toBe('{"key": "value"}');
	});

	it("preserves binary data through base64 encoding", async () => {
		// Create some binary data with null bytes
		const binary = new Uint8Array([0, 1, 2, 3, 255, 254, 253, 0, 128, 64]);
		const files: VirtualFile[] = [{ path: "data.bin", content: binary }];

		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });
		const result = await unpack(archive);

		expect(result.files).toHaveLength(1);
		expect(result.files[0]!.path).toBe("data.bin");
		expect(result.files[0]!.content).toEqual(binary);
	});

	it("roundtrips mixed text and binary", async () => {
		const binary = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
		const files: VirtualFile[] = [
			{ path: "readme.md", content: encode("# Hello") },
			{ path: "image.jpg", content: binary },
			{ path: "src/app.ts", content: encode("console.log('hi');") },
		];

		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });
		const result = await unpack(archive);

		expect(result.files).toHaveLength(3);
		expect(decode(result.files[0]!.content)).toBe("# Hello");
		expect(result.files[1]!.content).toEqual(binary);
		expect(decode(result.files[2]!.content)).toBe("console.log('hi');");
	});

	it("check() validates a well-formed archive", async () => {
		const files: VirtualFile[] = [{ path: "test.txt", content: encode("test content") }];

		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });
		const result = await check(archive);

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("check() detects tampered content", async () => {
		const files: VirtualFile[] = [{ path: "test.txt", content: encode("original") }];

		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });
		// Tamper with the content
		const tampered = archive.replace("original", "modified");
		const result = await check(tampered);

		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("generates correct position metadata", async () => {
		const files: VirtualFile[] = [
			{ path: "first.txt", content: encode("line 1\nline 2\nline 3") },
			{ path: "second.txt", content: encode("single line") },
		];

		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });
		const result = await unpack(archive);

		// Verify positions are set and reasonable
		const firstEntry = result.manifest.mdmeld.files[0]!;
		const secondEntry = result.manifest.mdmeld.files[1]!;

		expect(firstEntry.position.start).toBeGreaterThan(0);
		expect(firstEntry.position.fence).toBeGreaterThan(firstEntry.position.start);
		expect(firstEntry.position.content).toBe(firstEntry.position.fence + 1);
		expect(firstEntry.position.length).toBe(3); // 3 lines

		expect(secondEntry.position.start).toBeGreaterThan(firstEntry.position.start);
		expect(secondEntry.position.length).toBe(1); // 1 line

		// Verify positions actually match the archive content
		const archiveLines = archive.split("\n");
		const firstHeader = archiveLines[firstEntry.position.start - 1];
		expect(firstHeader).toBe("### first.txt");

		const secondHeader = archiveLines[secondEntry.position.start - 1];
		expect(secondHeader).toBe("### second.txt");
	});

	it("includes self-describing header comment", async () => {
		const files: VirtualFile[] = [{ path: "test.txt", content: encode("hello") }];

		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });
		expect(archive.startsWith("<!-- MDMeld v1.0 archive")).toBe(true);
	});

	it("sets correct manifest fields", async () => {
		const files: VirtualFile[] = [{ path: "test.ts", content: encode("const x = 1;") }];

		const archive = await pack(files, {
			created: "2026-01-01T00:00:00Z",
			hashAlgorithm: "xxh64",
		});
		const result = await unpack(archive);

		expect(result.manifest.mdmeld.version).toBe("1.0.0");
		expect(result.manifest.mdmeld.created).toBe("2026-01-01T00:00:00Z");
		expect(result.manifest.mdmeld.hash_algorithm).toBe("xxh64");
		expect(result.manifest.mdmeld.backtick_count).toBeGreaterThanOrEqual(4);

		const entry = result.manifest.mdmeld.files[0]!;
		expect(entry.path).toBe("test.ts");
		expect(entry.type).toBe("text");
		expect(entry.size).toBe(12);
		expect(entry.syntax).toBe("typescript");
		expect(entry.hash).toBeTruthy();
	});
});

describe("spec conformance", () => {
	it("file hash is computed from raw bytes, not archive representation", async () => {
		const content = encode("Hello, world!");
		const files: VirtualFile[] = [{ path: "test.txt", content }];

		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });
		const result = await unpack(archive);
		const entry = result.manifest.mdmeld.files[0]!;

		// Hash should match raw bytes, not text string
		const expectedHash = await computeHashBytes(content, "xxh64");
		expect(entry.hash).toBe(expectedHash);
	});

	it("binary file hash is computed from original bytes, not base64", async () => {
		const binary = new Uint8Array([0, 1, 2, 3, 255, 254, 253]);
		const files: VirtualFile[] = [{ path: "data.bin", content: binary }];

		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });
		const result = await unpack(archive);
		const entry = result.manifest.mdmeld.files[0]!;

		const expectedHash = await computeHashBytes(binary, "xxh64");
		expect(entry.hash).toBe(expectedHash);

		// Verify check() also validates correctly
		const checkResult = await check(archive);
		expect(checkResult.valid).toBe(true);
	});

	it("manifest hash includes the mdmeld: key line", async () => {
		const files: VirtualFile[] = [{ path: "test.txt", content: encode("hello") }];
		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });

		// The manifest hash should be verifiable via check()
		const result = await check(archive);
		expect(result.valid).toBe(true);

		// Verify the archive YAML contains mdmeld: key
		expect(archive).toContain("\nmdmeld:\n");
	});

	it("rejects unsupported major versions", async () => {
		const archive = `---
mdmeld:
  version: "2.0.0"
  hash_algorithm: xxh64
  backtick_count: 4
  files: []
integrity:
  manifest_hash: HASH_PLACEHOLDER
  content_hash: HASH_PLACEHOLDER
---
`;
		await expect(unpack(archive)).rejects.toThrow("Unsupported archive version");
	});

	it("defaults syntax to text for unknown extensions", async () => {
		const files: VirtualFile[] = [{ path: "README", content: encode("hello") }];
		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });
		const result = await unpack(archive);

		expect(result.manifest.mdmeld.files[0]!.syntax).toBe("text");
	});

	it("handles markdown docs with nested code fences", async () => {
		const mdContent = "# Guide\n\n```typescript\nconst x = 1;\n```\n\n````ts\nconst y = 2;\n````";
		const files: VirtualFile[] = [
			{ path: "docs/guide.md", content: encode(mdContent) },
			{ path: "src/index.ts", content: encode("export const a = 1;") },
		];

		const archive = await pack(files, { created: "2026-01-01T00:00:00Z" });

		// backtick_count should be 5 (one more than the 4-backtick run in guide.md)
		expect(archive).toMatch(/backtick_count: 5/);

		const result = await unpack(archive);
		expect(decode(result.files[0]!.content)).toBe(mdContent);

		const checkResult = await check(archive);
		expect(checkResult.valid).toBe(true);
	});
});
