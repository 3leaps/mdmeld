/** A file represented as a path and raw bytes — the universal exchange type. */
export interface VirtualFile {
	/** POSIX relative path, e.g. "src/index.ts" */
	path: string;
	/** Raw file bytes */
	content: Uint8Array;
}

export type HashAlgorithm = "xxh64" | "sha256";

export interface FileEntry {
	path: string;
	type: "text" | "binary";
	size: number;
	hash: string;
	syntax: string;
	/** Only present for binary/encoded files */
	encoding?: "base64";
	position: PositionMetadata;
}

export interface PositionMetadata {
	/** Line where the file section header (### path) starts (1-indexed) */
	start: number;
	/** Line where the code fence begins */
	fence: number;
	/** Line where the actual content begins */
	content: number;
	/** Number of lines of content */
	length: number;
}

export interface Manifest {
	mdmeld: {
		version: string;
		created: string;
		hash_algorithm: HashAlgorithm;
		backtick_count: number;
		files: FileEntry[];
	};
	integrity: {
		manifest_hash: string;
		content_hash: string;
	};
}

export interface PackOptions {
	/** Hash algorithm to use. Default: "xxh64" */
	hashAlgorithm?: HashAlgorithm;
	/** ISO timestamp override (for deterministic output in tests) */
	created?: string;
}

export interface UnpackResult {
	files: VirtualFile[];
	manifest: Manifest;
}

export interface CheckResult {
	valid: boolean;
	errors: string[];
}
