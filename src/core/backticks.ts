import { MAX_BACKTICK_COUNT, MIN_BACKTICK_COUNT } from "./constants.js";

/**
 * Scan a string and return the maximum run of consecutive backticks found.
 */
export function scanForMaxBackticks(content: string): number {
	let max = 0;
	let current = 0;

	for (let i = 0; i < content.length; i++) {
		if (content[i] === "`") {
			current++;
			if (current > max) max = current;
		} else {
			current = 0;
		}
	}

	return max;
}

/**
 * Determine the backtick count needed to safely fence all file contents.
 * Returns the count, or null if the content cannot be safely fenced
 * (exceeds MAX_BACKTICK_COUNT).
 */
export function resolveBacktickCount(maxFoundInContent: number): number | null {
	const needed = Math.max(maxFoundInContent + 1, MIN_BACKTICK_COUNT);
	if (needed > MAX_BACKTICK_COUNT) return null;
	return needed;
}

/** Generate a string of `count` backticks. */
export function generateBackticks(count: number): string {
	return "`".repeat(count);
}
