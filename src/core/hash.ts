import xxhashInit from "xxhash-wasm";
import type { HashAlgorithm } from "./types.js";

/**
 * SHA-256 digest via Web Crypto.
 * Node 19+ exposes globalThis.crypto; Node 18 requires explicit import.
 * In browsers, globalThis.crypto is always available.
 */
async function sha256(data: Uint8Array): Promise<ArrayBuffer> {
	if (typeof globalThis.crypto?.subtle !== "undefined") {
		return globalThis.crypto.subtle.digest("SHA-256", data);
	}
	// Node 18 fallback
	const { webcrypto } = await import("node:crypto");
	return (webcrypto as typeof globalThis.crypto).subtle.digest("SHA-256", data);
}

let xxhashInstance: Awaited<ReturnType<typeof xxhashInit>> | null = null;

async function getXxhash() {
	if (!xxhashInstance) {
		xxhashInstance = await xxhashInit();
	}
	return xxhashInstance;
}

/** Compute a hash of the given string using the specified algorithm. */
export async function computeHash(content: string, algorithm: HashAlgorithm): Promise<string> {
	if (algorithm === "xxh64") {
		const xxhash = await getXxhash();
		return xxhash.h64ToString(content);
	}

	// sha256 via Web Crypto (works in browser + Node 18+)
	const encoder = new TextEncoder();
	const data = encoder.encode(content);
	const hashBuffer = await sha256(data);
	const hashArray = new Uint8Array(hashBuffer);
	return Array.from(hashArray)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** Compute a hash of raw bytes. */
export async function computeHashBytes(
	data: Uint8Array,
	algorithm: HashAlgorithm,
): Promise<string> {
	if (algorithm === "xxh64") {
		const xxhash = await getXxhash();
		const raw = xxhash.h64Raw(data);
		return raw.toString(16).padStart(16, "0");
	}

	const hashBuffer = await sha256(data);
	const hashArray = new Uint8Array(hashBuffer);
	return Array.from(hashArray)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
