# mdmeld Release Notes

Latest 3 releases, reverse-chronological. Older notes archived in `docs/releases/`.

---

# mdmeld v0.2.0

**Release date:** 2026-04-03

## What's new

Standalone binary distribution — mdmeld is now available as a single executable for all major platforms, installable via Homebrew, Scoop, or direct download.

### Binary builds

Standalone executables compiled via Bun for 6 platforms:

- `mdmeld-linux-amd64`, `mdmeld-linux-arm64`
- `mdmeld-darwin-amd64`, `mdmeld-darwin-arm64`
- `mdmeld-windows-amd64.exe`, `mdmeld-windows-arm64.exe`

Install locally with `make install` (builds for current platform and copies to `~/.local/bin`).

### Package manager support

- **Homebrew:** `brew install 3leaps/tap/mdmeld`
- **Scoop:** `scoop install 3leaps/mdmeld`
- **npm:** `npm install -g mdmeld` (unchanged)

### Release infrastructure

- CI builds 5 platform binaries + npm tarball on tag push (draft release)
- Windows ARM64 built natively on self-hosted runner via manual dispatch
- Checksums (SHA256 + SHA512) generated and attached automatically
- Local signing workflow unchanged (minisign + GPG dual-format)

## Breaking changes

None.

## Full changelog

See [CHANGELOG.md](CHANGELOG.md) for the complete list.

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
