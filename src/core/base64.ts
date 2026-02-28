const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Encode a Uint8Array to a base64 string. Pure JS, no Buffer. */
export function encodeBase64(data: Uint8Array): string {
	let result = "";
	const len = data.length;
	const remainder = len % 3;
	const mainLen = len - remainder;

	for (let i = 0; i < mainLen; i += 3) {
		const a = data[i] as number;
		const b = data[i + 1] as number;
		const c = data[i + 2] as number;
		result += CHARS[a >> 2];
		result += CHARS[((a & 3) << 4) | (b >> 4)];
		result += CHARS[((b & 15) << 2) | (c >> 6)];
		result += CHARS[c & 63];
	}

	if (remainder === 1) {
		const a = data[mainLen] as number;
		result += `${CHARS[a >> 2]}${CHARS[(a & 3) << 4]}==`;
	} else if (remainder === 2) {
		const a = data[mainLen] as number;
		const b = data[mainLen + 1] as number;
		result += `${CHARS[a >> 2]}${CHARS[((a & 3) << 4) | (b >> 4)]}${CHARS[(b & 15) << 2]}=`;
	}

	return result;
}

/** Build a reverse lookup table for decoding */
const DECODE_TABLE = new Uint8Array(128);
for (let i = 0; i < CHARS.length; i++) {
	DECODE_TABLE[CHARS.charCodeAt(i)] = i;
}

/** Decode a base64 string to a Uint8Array. Pure JS, no Buffer. */
export function decodeBase64(base64: string): Uint8Array {
	// Strip whitespace
	const str = base64.replace(/\s/g, "");
	const len = str.length;

	// Count padding
	let padding = 0;
	if (str[len - 1] === "=") padding++;
	if (str[len - 2] === "=") padding++;

	const byteLen = (len * 3) / 4 - padding;
	const result = new Uint8Array(byteLen);

	let j = 0;
	for (let i = 0; i < len; i += 4) {
		const a = DECODE_TABLE[str.charCodeAt(i)] as number;
		const b = DECODE_TABLE[str.charCodeAt(i + 1)] as number;
		const c = DECODE_TABLE[str.charCodeAt(i + 2)] as number;
		const d = DECODE_TABLE[str.charCodeAt(i + 3)] as number;

		result[j++] = (a << 2) | (b >> 4);
		if (j < byteLen) result[j++] = ((b & 15) << 4) | (c >> 2);
		if (j < byteLen) result[j++] = ((c & 3) << 6) | d;
	}

	return result;
}
