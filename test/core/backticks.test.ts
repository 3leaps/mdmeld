import { describe, expect, it } from "vitest";
import {
	generateBackticks,
	resolveBacktickCount,
	scanForMaxBackticks,
} from "../../src/core/backticks.js";

describe("backticks", () => {
	it("finds no backticks in plain text", () => {
		expect(scanForMaxBackticks("hello world")).toBe(0);
	});

	it("finds single backtick", () => {
		expect(scanForMaxBackticks("hello `code` world")).toBe(1);
	});

	it("finds triple backticks", () => {
		expect(scanForMaxBackticks("```\ncode\n```")).toBe(3);
	});

	it("finds the maximum run", () => {
		expect(scanForMaxBackticks("``` `` ```` ``")).toBe(4);
	});

	it("resolves minimum backtick count", () => {
		expect(resolveBacktickCount(0)).toBe(4); // MIN is 4
		expect(resolveBacktickCount(3)).toBe(4); // 3+1=4
		expect(resolveBacktickCount(4)).toBe(5); // 4+1=5
		expect(resolveBacktickCount(7)).toBe(8); // 7+1=8
	});

	it("returns null when backtick count exceeds max", () => {
		expect(resolveBacktickCount(8)).toBeNull(); // 8+1=9 > MAX(8)
	});

	it("generates correct backtick strings", () => {
		expect(generateBackticks(4)).toBe("````");
		expect(generateBackticks(6)).toBe("``````");
	});
});
