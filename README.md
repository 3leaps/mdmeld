# mdmeld

**Pack Once. Share Anywhere.** — The markdown-based file archive format designed for seamless collaboration between humans and AI assistants.

MDMeld encodes files into a human-readable markdown archive with YAML metadata, position indexing for efficient AI navigation, and integrity hashes for verification.

## Install

```bash
npm install mdmeld
```

## CLI

```bash
# Pack a directory into an archive
npx mdmeld pack ./my-project -o archive.mdmeld

# Unpack an archive
npx mdmeld unpack archive.mdmeld -o ./output

# Finalize hashes in an AI-generated archive
npx mdmeld finalize archive.mdmeld
```

## API

```typescript
import { pack, unpack, check } from "mdmeld";

// Pack files into an archive string
const archive = await pack([
  {
    path: "src/index.ts",
    content: new TextEncoder().encode("export const x = 1;"),
  },
  { path: "README.md", content: new TextEncoder().encode("# Hello") },
]);

// Unpack an archive
const { files, manifest } = await unpack(archive);

// Validate integrity
const { valid, errors } = await check(archive);
```

## Web

A static web tool for packing folders via drag-and-drop is included in `web/`. Run locally:

```bash
npm run dev
```

## Format

An MDMeld archive is a markdown file with:

1. A self-describing HTML comment header
2. YAML frontmatter with file metadata and position indexes
3. File contents in fenced code blocks

````markdown
## <!-- MDMeld v1.0 archive -->

mdmeld:
version: "1.0.0"
hash_algorithm: xxh64
backtick_count: 4
files: - path: src/index.ts
type: text
size: 42
hash: "abc123"
syntax: typescript
position:
start: 20
fence: 22
content: 23
length: 3
integrity:
manifest_hash: "..."
content_hash: "..."

---

### src/index.ts

```typescript
export const x = 1;
```
````

```

Position metadata enables AI assistants to navigate directly to specific files without reading the entire archive.

## License

MIT
```
