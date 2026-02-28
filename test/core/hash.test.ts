import { describe, expect, it } from "vitest";
import { computeHash, computeHashBytes } from "../../src/core/hash.js";

describe("hash", () => {
	it("computes xxh64 hash of a string", async () => {
		const hash = await computeHash("hello world", "xxh64");
		expect(hash).toBeTruthy();
		expect(typeof hash).toBe("string");
		// Should be consistent
		const hash2 = await computeHash("hello world", "xxh64");
		expect(hash).toBe(hash2);
	});

	it("computes sha256 hash of a string", async () => {
		const hash = await computeHash("hello world", "sha256");
		expect(hash).toBeTruthy();
		expect(hash.length).toBe(64); // 32 bytes as hex
		// Known SHA-256 of "hello world"
		expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
	});

	it("different inputs produce different hashes", async () => {
		const hash1 = await computeHash("hello", "xxh64");
		const hash2 = await computeHash("world", "xxh64");
		expect(hash1).not.toBe(hash2);
	});

	it("computes hash of Uint8Array", async () => {
		const data = new TextEncoder().encode("hello world");
		const hashBytes = await computeHashBytes(data, "sha256");
		const hashStr = await computeHash("hello world", "sha256");
		expect(hashBytes).toBe(hashStr);
	});
});
