import { describe, expect, it } from "vitest";
import { unpack } from "../../src/core/unpack.js";

describe("unpack", () => {
	it("throws on missing frontmatter", async () => {
		await expect(unpack("no frontmatter here")).rejects.toThrow("Missing YAML frontmatter");
	});

	it("throws on missing closing delimiter", async () => {
		await expect(unpack("---\nmdmeld:\n  version: 1.0.0\n")).rejects.toThrow("Missing closing ---");
	});

	it("throws on missing mdmeld key", async () => {
		await expect(unpack("---\nfoo: bar\n---\n")).rejects.toThrow("missing 'mdmeld' key");
	});

	it("handles archive with header comment", async () => {
		const archive = `<!-- MDMeld v1.0 archive -->
---
mdmeld:
  version: 1.0.0
  created: "2026-01-01T00:00:00Z"
  hash_algorithm: xxh64
  backtick_count: 4
  files:
    - path: test.txt
      type: text
      size: 5
      hash: HASH_PLACEHOLDER
      syntax: text
      position:
        start: 1
        fence: 1
        content: 1
        length: 1
integrity:
  manifest_hash: HASH_PLACEHOLDER
  content_hash: HASH_PLACEHOLDER
---

### test.txt

\`\`\`\`text
hello
\`\`\`\`
`;
		const result = await unpack(archive);
		expect(result.files).toHaveLength(1);
		expect(new TextDecoder().decode(result.files[0]!.content)).toBe("hello");
	});
});
