/**
 * Detect whether a Uint8Array likely contains text or binary data.
 * Uses byte distribution analysis — no filesystem or MIME dependencies.
 */
export function isText(data: Uint8Array): boolean {
	if (data.length === 0) return true;

	// Sample up to 8KB for analysis
	const sample = data.length > 8192 ? data.subarray(0, 8192) : data;
	const len = sample.length;

	let nullBytes = 0;
	let controlChars = 0;
	let printableOrWhitespace = 0;

	for (let i = 0; i < len; i++) {
		const byte = sample[i]!;

		if (byte === 0x00) {
			nullBytes++;
		} else if (byte === 0x09 || byte === 0x0a || byte === 0x0d) {
			// Common whitespace (tab, LF, CR)
			printableOrWhitespace++;
		} else if (byte < 0x20) {
			// Non-whitespace control char
			controlChars++;
		} else if (byte <= 0x7e) {
			// Printable ASCII (0x20–0x7E, includes space)
			printableOrWhitespace++;
		}
		// High bytes (0x80-0xFF) are allowed — could be UTF-8 continuation
	}

	// Any null bytes → binary
	if (nullBytes > 0) return false;

	// More than 5% control characters → binary
	if (controlChars / len > 0.05) return false;

	// At least 80% printable ASCII or common whitespace (per spec)
	if (len > 32 && printableOrWhitespace / len < 0.8) return false;

	return true;
}
