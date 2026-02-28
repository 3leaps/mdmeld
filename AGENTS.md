# mdmeld - AI Agent Guide

## Read First

**mdmeld is a single-purpose tool.** Before making any changes, internalize this:

> Pack files into markdown. Unpack them back. Verify integrity. That's it.

The core library is browser-safe with zero Node.js dependencies. The CLI adds filesystem access. The web tool adds drag-and-drop. Both call core.

If `AGENTS.local.md` exists in the repo root, read it for session-specific guidance.

## Identity

**Name:** mdmeld = md (markdown) + meld (merge together)

**Tagline:** "Pack Once. Share Anywhere."

**What it does:** Encodes directory trees into a single human-readable markdown archive with YAML metadata, position indexing for AI navigation, and integrity hashes for verification.

**Key attributes:**
| Attribute | Expression |
|-----------|------------|
| Simplicity | 3 runtime deps, single package |
| Portability | Core runs in browser and Node identically |
| Integrity | xxh64/sha256 hashes for every file and the manifest |
| AI-native | Position metadata for random-access navigation |
| Deterministic | Same input always produces same output |

## Architecture

```
mdmeld/
├── src/
│   ├── core/           # Pure library (browser-safe, zero Node deps)
│   │   ├── index.ts    # Public API: pack, unpack, check
│   │   ├── pack.ts     # Archive encoding pipeline
│   │   ├── unpack.ts   # Archive decoding + integrity check
│   │   ├── types.ts    # All TypeScript interfaces
│   │   ├── constants.ts # Format version, limits, placeholders
│   │   ├── hash.ts     # xxh64 + sha256 hashing
│   │   ├── backticks.ts # Fence width resolution
│   │   ├── detect.ts   # Text vs binary classification
│   │   ├── syntax.ts   # Extension → fence language mapping
│   │   ├── base64.ts   # Pure-JS base64 (no Buffer)
│   │   └── yaml.ts     # js-yaml thin wrapper
│   └── cli/            # Node.js CLI (ESM, adds fs access)
│       ├── index.ts    # Entry point, arg parsing
│       ├── fs-adapter.ts  # Directory walking
│       ├── ignore.ts   # .gitignore/.mdmeldignore filtering
│       └── commands/   # pack, unpack, finalize handlers
├── test/
│   ├── core/           # 29 unit tests
│   ├── cli/            # 6 integration tests
│   └── fixtures/       # Test data (simple-text, backtick-edge)
├── web/                # Static SPA (Vite, imports core directly)
│   ├── index.html
│   ├── app.ts          # UI logic
│   ├── folder-reader.ts # File System Access API + fallback
│   ├── style.css       # Dark terminal theme
│   └── vite.config.ts  # Aliases @core → ../src/core
├── docs/
│   └── SPECIFICATION.md # MDMeld format spec v1.0
├── scripts/
│   └── version-sync.mjs # VERSION → package.json sync
├── .goneat/             # goneat DX config
│   ├── tools.yaml       # Foundation tool definitions
│   ├── dependencies.yaml # License + supply chain policy
│   └── assess.yaml      # Lint/format assessment config
├── Makefile             # Primary task runner (wraps npm + goneat)
├── VERSION              # Version SSOT (synced to package.json)
└── .github/workflows/ci.yml
```

**Boundary rules:**

- `src/core/` must NEVER import from `node:*` or any Node.js built-in
- `src/cli/` may import from `node:*` and from `src/core/`
- `web/` imports from `src/core/` via Vite alias, never from `src/cli/`
- Tests mirror source structure: `test/core/` tests `src/core/`, `test/cli/` tests `src/cli/`

## Dependencies

3 runtime, all intentional:

| Dep           | Why                                       | Used In  |
| ------------- | ----------------------------------------- | -------- |
| `js-yaml`     | YAML serialize/deserialize for manifest   | core     |
| `xxhash-wasm` | Fast non-cryptographic xxh64 hashing      | core     |
| `ignore`      | .gitignore/.mdmeldignore pattern matching | cli only |

**Do not add runtime dependencies without explicit approval.** Core must stay browser-safe.

## Quick Reference

The Makefile is the primary task runner. It wraps npm scripts and layers goneat on top for non-TS concerns (YAML formatting, GHA linting, Makefile linting, dependency policy).

| Task             | Command                    |
| ---------------- | -------------------------- |
| Bootstrap env    | `make bootstrap`           |
| All checks       | `make check-all`           |
| Run tests        | `make test`                |
| Watch tests      | `make test-watch`          |
| Format code      | `make fmt`                 |
| Lint             | `make lint`                |
| Type check       | `make typecheck`           |
| Build lib + CLI  | `make build`               |
| Build web        | `make build-web`           |
| Dev server (web) | `make dev`                 |
| Clean artifacts  | `make clean`               |
| Print version    | `make version`             |
| Sync version     | `make version-sync`        |
| Set version      | `make version-set V=x.y.z` |
| SBOM             | `make sbom`                |
| Vuln scan        | `make vuln-scan`           |
| Public readiness | `make public-readiness`    |
| Verify tools     | `make tools`               |

**Version management:** The `VERSION` file is the single source of truth. Run `make version-sync` to propagate to `package.json`.

## Code Style

- **Formatter:** Biome — tabs, indent width 2, line width 100
- **Quotes:** Double quotes, always semicolons
- **Linter:** Biome recommended rules, `noNonNullAssertion` off
- **Scope:** Biome only covers `src/**/*.ts` and `test/**/*.ts` (not `web/`)
- **Types:** Strict mode + `noUncheckedIndexedAccess` — use `!` assertions deliberately
- **Build:** tsup — core gets ESM + CJS + `.d.ts`; CLI gets ESM with shebang banner

Run `npm run lint:fix` before committing.

## Roles

See [`config/agentic/roles/README.md`](config/agentic/roles/README.md) for the full role catalog.

| Role                 | Slug      | Use When                                 |
| -------------------- | --------- | ---------------------------------------- |
| Development Lead     | `devlead` | Building features, fixing bugs (default) |
| Development Reviewer | `devrev`  | Code review, four-eyes audit             |
| Quality Assurance    | `qa`      | Test design, coverage analysis           |
| UX Developer         | `uxdev`   | Web tool UI, frontend, accessibility     |

**Default to `devlead`** for most implementation work.

## Session Protocol

### Before Starting

1. **Read this file** — understand the constraints
2. **Check `.plans/`** — review active plans and briefs
3. **Run `make check-all`** — see the current state
4. **Understand the boundary**: core is browser-safe, no Node imports

### Before Committing

1. **Run `make fmt`** — format all files (Biome + goneat)
2. **Run `make check-all`** — lint + types + tests + build
3. **Verify test count** — don't reduce coverage without justification

## Commit Attribution

```
<type>(<scope>): <subject>

<body - what and why>

Generated by <Model> via <Interface> under supervision of @3leapsdave

Co-Authored-By: <Model> <noreply@3leaps.net>
Role: <role>
Committer-of-Record: Dave Thompson <dave.thompson@3leaps.net> [@3leapsdave]
```

**Scopes:** `core`, `cli`, `web`, `ci`, `docs`, `repo`

**Example:**

```
feat(core): add streaming pack for large directories

Support incremental packing via async generator to avoid
loading entire directory trees into memory.

Generated by Claude Opus 4.6 via Claude Code under supervision of @3leapsdave

Co-Authored-By: Claude Opus 4.6 <noreply@3leaps.net>
Role: devlead
Committer-of-Record: Dave Thompson <dave.thompson@3leaps.net> [@3leapsdave]
```

## Guidelines

### DO

- **Keep core browser-safe** — no `node:*` imports, no `Buffer`, no `process`
- **Test what you change** — match the existing test style in `test/`
- **Use the type system** — interfaces live in `types.ts`, export from `index.ts`
- **Respect the format spec** — `docs/SPECIFICATION.md` is the source of truth
- **Keep it deterministic** — same input must produce byte-identical output
- **Run `make check-all` before finishing** — lint, types, tests, build must all pass

### DO NOT

- **Add runtime deps to core** — unless absolutely unavoidable with justification
- **Import Node built-ins in core** — this breaks the browser
- **Break the format spec** — version changes require explicit discussion
- **Skip integrity hashing** — every file gets a hash, always
- **Commit `.plans/`** — planning directory is permanently gitignored
- **Modify `web/` without checking Vite build** — `npm run build:web`

## Format Spec Quick Facts

- Archive version: `1.0.0` (see `docs/SPECIFICATION.md`)
- Fence width: min 4, max 8 backticks (files with >=8 backtick runs get base64)
- Hash algorithms: xxh64 (default, 16-char hex) or sha256 (64-char hex)
- `HASH_PLACEHOLDER` (`"0000000000000000"`) is valid for AI-authored archives awaiting `finalize`
- Position metadata is 1-based line numbers: `start`, `fence`, `content`, `length`
- Integrity section: `content_hash` + `manifest_hash` for full archive verification

## Contact

- **Maintainer:** @3leapsdave
- **Repository:** https://github.com/3leaps/mdmeld
- **Organization:** https://3leaps.net

---

_Pack Once. Share Anywhere._
