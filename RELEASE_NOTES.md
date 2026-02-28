# mdmeld Release Notes

Latest 3 releases, reverse-chronological. Older notes archived in `docs/releases/`.

---

# mdmeld v0.1.0

**Release date:** 2026-02-28

## What's new

First publishable release of mdmeld — a single npm package providing a programmatic API, CLI, and static web tool for packing directory trees into markdown archives designed for AI assistant consumption.

### Core library

Browser-safe, zero Node.js dependencies. Three functions:

- `pack(files)` — encode files into an mdmeld archive string
- `unpack(content)` — decode an archive back to files with metadata
- `check(content)` — verify integrity hashes

Dual exports (ESM + CJS) with TypeScript declarations. Works identically in Node.js and the browser.

### CLI

```bash
npx mdmeld pack ./my-project -o archive.mdmeld
npx mdmeld unpack archive.mdmeld -o ./output
npx mdmeld finalize archive.mdmeld
```

Supports `.gitignore` and `.mdmeldignore` patterns. The `finalize` command computes real hashes for AI-generated archives using `HASH_PLACEHOLDER` values.

### Web tool

Static single-page app with drag-and-drop folder upload. Pack a directory, copy to clipboard or download as `.mdmeld`. Dark terminal-aesthetic theme.

### Archive format v1.0

Human-readable markdown with YAML frontmatter containing file metadata, position indexes for AI navigation, and integrity hashes (xxh64 or sha256) for verification.

## Breaking changes

None. Initial release.

## Full changelog

See [CHANGELOG.md](CHANGELOG.md) for the complete list.
