# Changelog

All notable changes to mdmeld are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/). Latest 10 entries, reverse-chronological.

## [0.2.0] - 2026-04-03

### Added

- Standalone binary builds via `bun build --compile` for 5 platforms
- Makefile targets: `build-binary`, `build-all`, `release-build`, `install`
- `scripts/build-binary.sh` — cross-compile wrapper with homebrew/scoop-friendly naming
- Release workflow builds platform binaries and attaches to draft GitHub release
- Separate `release-windows-arm64.yml` for native Windows ARM64 builds
- Homebrew tap support (`3leaps/tap/mdmeld`)
- Scoop bucket support (`3leaps/mdmeld`)
- Binary install to `~/.local/bin` via `make install`

### Changed

- `release.yml` reworked: matrix build for 4 platform binaries + npm tarball + checksums
- `RELEASE_CHECKLIST.md` updated with binary, homebrew, and scoop sections

## [0.1.0] - 2026-02-28

### Added

- Core library: `pack()`, `unpack()`, `check()` — browser-safe, zero Node deps
- CLI: `mdmeld pack`, `mdmeld unpack`, `mdmeld finalize`
- Web tool: drag-and-drop folder packing (Vite SPA, dark terminal theme)
- MDMeld archive format v1.0 with YAML frontmatter and position metadata
- Dual hash support: xxh64 (default) and sha256
- Text vs binary detection with automatic base64 encoding
- Backtick fence width auto-resolution (4-8 backticks)
- `.gitignore` and `.mdmeldignore` support in CLI
- `HASH_PLACEHOLDER` support for AI-generated archives with `finalize` command
- Position metadata for AI random-access navigation
- Integrity verification: per-file hashes, content hash, manifest hash
- Dual exports: ESM + CJS with TypeScript declarations
- 35 tests (29 core unit + 6 CLI integration)
- CI: Node 18/20/22 matrix, package size audit, web build verification
- Format specification: `docs/SPECIFICATION.md`
