import { decodeBase64 } from "./base64.js";
import { FORMAT_VERSION, HASH_PLACEHOLDER } from "./constants.js";
import { computeHash, computeHashBytes } from "./hash.js";
import type { CheckResult, Manifest, UnpackResult, VirtualFile } from "./types.js";
import * as yaml from "./yaml.js";

const TEXT_ENCODER = new TextEncoder();

/**
 * Unpack an mdmeld archive string into virtual files.
 */
export async function unpack(content: string): Promise<UnpackResult> {
	const { manifest, contentSection } = parseArchive(content);
	const files = extractFiles(contentSection, manifest);
	return { files, manifest };
}

/**
 * Validate an mdmeld archive's integrity without extracting files.
 */
export async function check(content: string): Promise<CheckResult> {
	const errors: string[] = [];

	let manifest: Manifest;
	let contentSection: string;
	let rawContentAfterDelimiter: string;
	try {
		const parsed = parseArchive(content);
		manifest = parsed.manifest;
		contentSection = parsed.contentSection;
		rawContentAfterDelimiter = parsed.rawContentAfterDelimiter;
	} catch (e) {
		return { valid: false, errors: [`Parse error: ${(e as Error).message}`] };
	}

	const algorithm = manifest.mdmeld.hash_algorithm;

	// Verify content hash (hashed on raw content after closing ---, per spec)
	if (
		manifest.integrity.content_hash !== HASH_PLACEHOLDER &&
		manifest.integrity.content_hash !== ""
	) {
		const actual = await computeHash(rawContentAfterDelimiter, algorithm);
		if (actual !== manifest.integrity.content_hash) {
			errors.push(
				`Content hash mismatch: expected ${manifest.integrity.content_hash}, got ${actual}`,
			);
		}
	}

	// Verify manifest hash
	if (
		manifest.integrity.manifest_hash !== HASH_PLACEHOLDER &&
		manifest.integrity.manifest_hash !== ""
	) {
		// Manifest hash includes the `mdmeld:` key line per spec
		const manifestYaml = yaml.dump({ mdmeld: manifest.mdmeld });
		const actual = await computeHash(manifestYaml, algorithm);
		if (actual !== manifest.integrity.manifest_hash) {
			errors.push(
				`Manifest hash mismatch: expected ${manifest.integrity.manifest_hash}, got ${actual}`,
			);
		}
	}

	// Verify individual file hashes (hashed on original bytes per spec)
	const files = extractFiles(contentSection, manifest);
	for (let i = 0; i < manifest.mdmeld.files.length; i++) {
		const entry = manifest.mdmeld.files[i]!;
		const file = files[i];

		if (!file) {
			errors.push(`Missing content block for file: ${entry.path}`);
			continue;
		}

		if (entry.hash === HASH_PLACEHOLDER) continue;

		const actual = await computeHashBytes(file.content, algorithm);
		if (actual !== entry.hash) {
			errors.push(`File hash mismatch for ${entry.path}: expected ${entry.hash}, got ${actual}`);
		}
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Parse the archive into its manifest and content section.
 * Returns both the raw content after --- (for hashing) and the normalized
 * content section (leading newlines stripped, for file extraction).
 */
function parseArchive(content: string): {
	manifest: Manifest;
	contentSection: string;
	rawContentAfterDelimiter: string;
} {
	// Strip optional header comment (<!-- ... -->)
	let input = content;
	if (input.startsWith("<!--")) {
		const commentEnd = input.indexOf("-->");
		if (commentEnd !== -1) {
			input = input.slice(commentEnd + 3).trimStart();
		}
	}

	// Find YAML frontmatter
	if (!input.startsWith("---")) {
		throw new Error("Missing YAML frontmatter (expected --- delimiter)");
	}

	const secondDelim = input.indexOf("\n---", 3);
	if (secondDelim === -1) {
		throw new Error("Missing closing --- delimiter for YAML frontmatter");
	}

	const yamlStr = input.slice(4, secondDelim); // skip initial "---\n"
	const rawContentAfterDelimiter = input.slice(secondDelim + 4); // skip "\n---"
	const contentSection = rawContentAfterDelimiter.replace(/^\n+/, "");

	const parsed = yaml.load(yamlStr) as Record<string, unknown>;
	if (!parsed || typeof parsed !== "object" || !("mdmeld" in parsed)) {
		throw new Error("Invalid manifest: missing 'mdmeld' key");
	}

	// Reject unsupported major versions per spec
	const manifest = parsed as unknown as Manifest;
	const archiveMajor = String(manifest.mdmeld.version).split(".")[0];
	const supportedMajor = FORMAT_VERSION.split(".")[0];
	if (archiveMajor !== supportedMajor) {
		throw new Error(
			`Unsupported archive version: ${manifest.mdmeld.version} (this parser supports major version ${supportedMajor})`,
		);
	}

	return { manifest, contentSection, rawContentAfterDelimiter };
}

/**
 * Extract files from the content section using the manifest metadata.
 */
function extractFiles(contentSection: string, manifest: Manifest): VirtualFile[] {
	const backtickCount = manifest.mdmeld.backtick_count;
	const fence = "`".repeat(backtickCount);
	const files: VirtualFile[] = [];

	// Build regex to extract file blocks
	// Format: ### path\n\n````lang\ncontent\n````
	const pattern = new RegExp(
		`### (.+?)\\s*\\n\\s*${fence}([^\\n]*)\\n([\\s\\S]*?)\\n?${fence}(?=\\s|$)`,
		"g",
	);

	for (const match of contentSection.matchAll(pattern)) {
		const path = match[1]!.trim();
		const lang = match[2]!.trim();
		const rawContent = match[3]!;

		// Find the corresponding manifest entry
		const entry = manifest.mdmeld.files.find((f) => f.path === path);
		const isEncoded = lang === "base64" || entry?.encoding === "base64";

		let content: Uint8Array;
		if (isEncoded) {
			content = decodeBase64(rawContent);
		} else {
			content = TEXT_ENCODER.encode(rawContent);
		}

		files.push({ path, content });
	}

	return files;
}
