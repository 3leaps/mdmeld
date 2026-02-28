import { generateBackticks, resolveBacktickCount, scanForMaxBackticks } from "./backticks.js";
import { encodeBase64 } from "./base64.js";
import { ARCHIVE_HEADER, FORMAT_VERSION, HASH_PLACEHOLDER } from "./constants.js";
import { isText } from "./detect.js";
import { computeHash, computeHashBytes } from "./hash.js";
import { getSyntax } from "./syntax.js";
import type { FileEntry, HashAlgorithm, Manifest, PackOptions, VirtualFile } from "./types.js";
import * as yaml from "./yaml.js";

const TEXT_DECODER = new TextDecoder();

/**
 * Pack an array of virtual files into an mdmeld archive string.
 */
export async function pack(files: VirtualFile[], options: PackOptions = {}): Promise<string> {
	const hashAlgorithm: HashAlgorithm = options.hashAlgorithm ?? "xxh64";
	const created = options.created ?? new Date().toISOString();

	// Determine backtick count by scanning all text content
	let maxBackticks = 0;
	const fileInfos: Array<{
		file: VirtualFile;
		isTextFile: boolean;
		textContent: string | null;
		base64Content: string | null;
	}> = [];

	for (const file of files) {
		const textFile = isText(file.content);

		if (textFile) {
			const text = TEXT_DECODER.decode(file.content);
			const found = scanForMaxBackticks(text);
			if (found > maxBackticks) maxBackticks = found;
			fileInfos.push({ file, isTextFile: true, textContent: text, base64Content: null });
		} else {
			const b64 = encodeBase64(file.content);
			fileInfos.push({ file, isTextFile: false, textContent: null, base64Content: b64 });
		}
	}

	const backtickCount = resolveBacktickCount(maxBackticks);
	if (backtickCount === null) {
		throw new Error(
			"Cannot pack: file content contains a backtick run of 8 or more characters, " +
				"which exceeds the maximum allowed fence width. " +
				"Remove the excessive backtick sequences or exclude the file.",
		);
	}
	const fence = generateBackticks(backtickCount);

	// Build content blocks and manifest entries
	const contentBlocks: string[] = [];
	const fileEntries: FileEntry[] = [];

	for (const info of fileInfos) {
		const path = info.file.path;
		let contentStr: string;
		let fenceLang: string;
		let type: "text" | "binary";
		let syntax: string;
		let encoding: "base64" | undefined;

		// File hash is always computed on the original raw bytes (per spec)
		const hash = await computeHashBytes(info.file.content, hashAlgorithm);

		if (info.textContent !== null) {
			// Plain text file
			contentStr = info.textContent;
			type = "text";
			syntax = getSyntax(path);
			fenceLang = syntax;
			encoding = undefined;
		} else {
			// Binary or base64-encoded text
			const b64 = info.base64Content!;
			contentStr = b64;
			type = info.isTextFile ? "text" : "binary";
			syntax = getSyntax(path);
			fenceLang = "base64";
			encoding = "base64";
		}

		const block = `### ${path}\n\n${fence}${fenceLang}\n${contentStr}\n${fence}`;
		contentBlocks.push(block);

		fileEntries.push({
			path,
			type,
			size: info.file.content.length,
			hash,
			syntax,
			...(encoding ? { encoding } : {}),
			position: { start: 0, fence: 0, content: 0, length: 0 }, // placeholder
		});
	}

	const contentSection = contentBlocks.join("\n\n");

	// Multi-pass position calculation
	const manifest: Manifest = {
		mdmeld: {
			version: FORMAT_VERSION,
			created,
			hash_algorithm: hashAlgorithm,
			backtick_count: backtickCount,
			files: fileEntries,
		},
		integrity: {
			manifest_hash: HASH_PLACEHOLDER,
			content_hash: HASH_PLACEHOLDER,
		},
	};

	// Pass 1: Estimate manifest size without position data
	const entriesNoPos = fileEntries.map((f) => {
		const { position: _, ...rest } = f;
		return rest;
	});
	const prelimYaml = yaml.dump({
		...manifest,
		mdmeld: { ...manifest.mdmeld, files: entriesNoPos },
	});
	const prelimFrontmatter = `${ARCHIVE_HEADER}\n---\n${prelimYaml}---\n`;
	const prelimLines = countLines(prelimFrontmatter);

	// Pass 2: Calculate positions with estimated offset
	const positions1 = calculatePositions(contentSection, prelimLines);
	applyPositions(fileEntries, positions1);

	// Pass 3: Re-serialize with real positions, check if line count changed
	const withPosYaml = yaml.dump(manifest);
	const withPosFrontmatter = `${ARCHIVE_HEADER}\n---\n${withPosYaml}---\n`;
	const finalLines = countLines(withPosFrontmatter);

	// Pass 4: If line count changed, recalculate with actual offset
	if (finalLines !== prelimLines) {
		const positions2 = calculatePositions(contentSection, finalLines);
		applyPositions(fileEntries, positions2);
	}

	// Compute integrity hashes
	// Content hash covers everything after closing \n--- delimiter
	// In the output format: ...yaml\n---\n\n{content}, so after \n--- we get \n\n{content}
	const rawContentForHash = `\n\n${contentSection}`;
	const contentHash = await computeHash(rawContentForHash, hashAlgorithm);
	manifest.integrity.content_hash = contentHash;

	// Manifest hash includes the `mdmeld:` key line per spec
	const manifestYamlForHash = yaml.dump({ mdmeld: manifest.mdmeld });
	const manifestHash = await computeHash(manifestYamlForHash, hashAlgorithm);
	manifest.integrity.manifest_hash = manifestHash;

	// Final serialization
	const outputYaml = yaml.dump(manifest);
	return `${ARCHIVE_HEADER}\n---\n${outputYaml}---\n\n${contentSection}`;
}

/**
 * Parse the content section and calculate position metadata for each file block.
 * Returns an array of positions, one per file block found.
 */
function calculatePositions(
	contentSection: string,
	manifestLineCount: number,
): Array<{ start: number; fence: number; content: number; length: number }> {
	const lines = contentSection.split("\n");
	const positions: Array<{ start: number; fence: number; content: number; length: number }> = [];
	// Content starts after manifest + 1 blank line separator
	const offset = manifestLineCount + 1;

	let i = 0;
	while (i < lines.length) {
		const line = lines[i]!;

		if (line.startsWith("### ")) {
			const start = offset + i + 1; // 1-indexed

			// Skip blank line after header
			i++;
			if (i < lines.length && lines[i]!.trim() === "") {
				i++;
			}

			// Expect fence line
			if (i < lines.length && isFenceLine(lines[i]!)) {
				const fenceLine = offset + i + 1;
				i++;
				const contentStart = offset + i + 1;

				// Count content lines until closing fence
				let contentLength = 0;
				while (i < lines.length && !isFenceLine(lines[i]!)) {
					contentLength++;
					i++;
				}
				// Skip closing fence
				if (i < lines.length) i++;

				positions.push({
					start,
					fence: fenceLine,
					content: contentStart,
					length: contentLength,
				});
			}
		} else {
			i++;
		}
	}

	return positions;
}

/** Apply calculated positions to file entries. */
function applyPositions(
	entries: FileEntry[],
	positions: Array<{ start: number; fence: number; content: number; length: number }>,
): void {
	for (let i = 0; i < entries.length; i++) {
		entries[i]!.position = positions[i]!;
	}
}

/** Count the number of lines in a string (trailing newline doesn't add extra). */
function countLines(s: string): number {
	if (s.length === 0) return 0;
	let count = 0;
	for (let i = 0; i < s.length; i++) {
		if (s[i] === "\n") count++;
	}
	// If the string doesn't end with a newline, add 1 for the last line
	if (s[s.length - 1] !== "\n") count++;
	return count;
}

/** Check if a line is a code fence (4+ backticks). */
function isFenceLine(line: string): boolean {
	return /^`{4,}/.test(line.trim());
}
