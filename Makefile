# mdmeld Makefile
# Compliant with FulmenHQ Makefile Standard
# Quick Start Commands:
#   make help           - Show all available commands
#   make bootstrap      - Install dependencies and external tools
#   make check-all      - Full quality check (lint, typecheck, test, build)

# Variables
VERSION := $(shell cat VERSION 2>/dev/null || echo "0.1.0")

# External tooling (bootstrap)
BINDIR ?= $(HOME)/.local/bin
GONEAT_VERSION ?= v0.5.3
SFETCH_INSTALL_URL ?= https://github.com/3leaps/sfetch/releases/latest/download/install-sfetch.sh

.PHONY: all help bootstrap bootstrap-force tools
.PHONY: dev build build-web clean
.PHONY: fmt lint typecheck test test-watch check-all quality precommit prepush
.PHONY: license-check vuln-scan sbom public-readiness
.PHONY: version version-set version-sync version-check
.PHONY: release-guard-tag-version release-clean release-download release-checksums release-verify-checksums release-sign
.PHONY: release-verify-signatures release-export-minisign-key release-export-gpg-key release-export-keys
.PHONY: release-verify-gpg-key release-verify-minisign-key release-verify-keys release-verify
.PHONY: release-notes release-upload release-upload-all release-undraft release-all

# Default target
all: check-all

# Help target
help: ## Show this help message
	@echo "mdmeld v$(VERSION) - Pack Once. Share Anywhere."
	@echo ""
	@echo "Quick start:"
	@echo "  make bootstrap      - Install dependencies and external tools"
	@echo "  make dev            - Start web tool dev server"
	@echo "  make build          - Build library and CLI"
	@echo "  make check-all      - Run all quality checks"
	@echo ""
	@echo "Quality:"
	@echo "  make fmt            - Format code (Biome for TS, goneat for YAML/MD/shell)"
	@echo "  make lint           - Run linting checks"
	@echo "  make typecheck      - Run TypeScript type checking"
	@echo "  make test           - Run tests"
	@echo ""
	@echo "Compliance & Security:"
	@echo "  make license-check  - Check dependency licenses for toxic licenses"
	@echo "  make vuln-scan      - Scan for vulnerabilities (SBOM + grype)"
	@echo "  make sbom           - Generate Software Bill of Materials"
	@echo "  make public-readiness - Full public readiness check (quality + compliance)"
	@echo ""
	@echo "Version:"
	@echo "  make version        - Print current version"
	@echo "  make version-sync   - Sync VERSION file to package.json"
	@echo "  make version-set V=x.y.z - Update VERSION and sync"
	@echo ""
	@echo "Release signing (see devsecops/vars/3leaps-mdmeld-cicd.sh for env vars):"
	@echo "  make release-all               - Full signing workflow"
	@echo "  make release-clean             - Clean release directory"
	@echo "  make release-download          - Download tarball from GitHub draft release"
	@echo "  make release-checksums         - Generate SHA256/SHA512 checksums"
	@echo "  make release-verify-checksums  - Verify checksums before signing"
	@echo "  make release-sign              - Sign checksums with minisign + GPG"
	@echo "  make release-verify-signatures - Verify signatures after signing"
	@echo "  make release-export-keys       - Export both public keys to release dir"
	@echo "  make release-verify-keys       - Verify all exported public keys"
	@echo "  make release-verify            - Verify all (checksums + signatures + keys)"
	@echo "  make release-notes             - Copy release notes to release dir"
	@echo "  make release-upload            - Upload provenance (sigs, keys, notes)"
	@echo "  make release-upload-all        - Upload ALL assets (manual rebuild only)"
	@echo "  make release-undraft           - Mark release as published"
	@echo ""
	@echo "Other:"
	@echo "  make tools          - Verify external tools are available"
	@echo "  make clean          - Remove build artifacts"
	@echo ""

# Goneat resolution (finds goneat in BINDIR or PATH, including .exe on Windows)
GONEAT_RESOLVE = \
	GONEAT=""; \
	if [ -x "$(BINDIR)/goneat" ]; then GONEAT="$(BINDIR)/goneat"; \
	elif [ -x "$(BINDIR)/goneat.exe" ]; then GONEAT="$(BINDIR)/goneat.exe"; fi; \
	if [ -z "$$GONEAT" ]; then GONEAT="$$(command -v goneat 2>/dev/null || true)"; fi; \
	if [ -z "$$GONEAT" ]; then echo "goneat not found. Run 'make bootstrap' first."; exit 1; fi

# Sfetch resolution (finds sfetch in BINDIR or PATH, including .exe on Windows)
SFETCH_RESOLVE = \
	SFETCH=""; \
	if [ -x "$(BINDIR)/sfetch" ]; then SFETCH="$(BINDIR)/sfetch"; \
	elif [ -x "$(BINDIR)/sfetch.exe" ]; then SFETCH="$(BINDIR)/sfetch.exe"; fi; \
	if [ -z "$$SFETCH" ]; then SFETCH="$$(command -v sfetch 2>/dev/null || true)"; fi

# -----------------------------------------------------------------------------
# Bootstrap - Trust Anchor Chain (sfetch -> goneat)
# -----------------------------------------------------------------------------
bootstrap: ## Install external tools (sfetch, goneat + foundation tools)
	@echo "Bootstrapping mdmeld development environment..."
	@mkdir -p "$(BINDIR)"
	@echo ""
	@echo "Step 1: Installing sfetch (trust anchor)..."
	@if ! command -v sfetch >/dev/null 2>&1 && [ ! -x "$(BINDIR)/sfetch" ] && [ ! -x "$(BINDIR)/sfetch.exe" ]; then \
		echo "-> Installing sfetch into $(BINDIR)..."; \
		if [ -n "$$GITHUB_TOKEN" ]; then \
			echo "   (using GITHUB_TOKEN for authenticated request)"; \
			curl -H "Authorization: token $$GITHUB_TOKEN" -sSfL "$(SFETCH_INSTALL_URL)" -o /tmp/install-sfetch.sh && bash /tmp/install-sfetch.sh --dir "$(BINDIR)" --yes; \
		elif command -v curl >/dev/null 2>&1; then \
			curl -sSfL "$(SFETCH_INSTALL_URL)" -o /tmp/install-sfetch.sh && bash /tmp/install-sfetch.sh --dir "$(BINDIR)" --yes; \
		else \
			echo "curl required to bootstrap sfetch" >&2; \
			exit 1; \
		fi; \
		if ! command -v sfetch >/dev/null 2>&1 && [ ! -x "$(BINDIR)/sfetch" ] && [ ! -x "$(BINDIR)/sfetch.exe" ]; then \
			echo "error: sfetch installation failed (binary not found in $(BINDIR))" >&2; \
			exit 1; \
		fi; \
	else \
		echo "-> sfetch already installed"; \
	fi
	@echo ""
	@echo "Step 2: Installing goneat via sfetch..."
	@SFETCH_BIN="$$(command -v sfetch 2>/dev/null || true)"; \
	if [ -z "$$SFETCH_BIN" ] && [ -x "$(BINDIR)/sfetch" ]; then SFETCH_BIN="$(BINDIR)/sfetch"; fi; \
	if [ -z "$$SFETCH_BIN" ] && [ -x "$(BINDIR)/sfetch.exe" ]; then SFETCH_BIN="$(BINDIR)/sfetch.exe"; fi; \
	if [ -z "$$SFETCH_BIN" ]; then echo "sfetch not found after bootstrap" >&2; exit 1; fi; \
	if [ "$(FORCE)" = "1" ] || [ "$(FORCE)" = "true" ]; then \
		echo "-> Force installing goneat $(GONEAT_VERSION) into $(BINDIR)..."; \
		"$$SFETCH_BIN" -repo fulmenhq/goneat -tag "$(GONEAT_VERSION)" -dest-dir "$(BINDIR)"; \
	else \
		if ! command -v goneat >/dev/null 2>&1 && [ ! -x "$(BINDIR)/goneat" ] && [ ! -x "$(BINDIR)/goneat.exe" ]; then \
			echo "-> Installing goneat $(GONEAT_VERSION) into $(BINDIR)..."; \
			"$$SFETCH_BIN" -repo fulmenhq/goneat -tag "$(GONEAT_VERSION)" -dest-dir "$(BINDIR)"; \
		else \
			echo "-> goneat already installed: $$(goneat version 2>&1 | head -1 || $(BINDIR)/goneat version 2>&1 | head -1)"; \
		fi; \
	fi
	@echo ""
	@echo "Step 3: Installing foundation tools via goneat..."
	@GONEAT_BIN="$$(command -v goneat 2>/dev/null || true)"; \
	if [ -z "$$GONEAT_BIN" ] && [ -x "$(BINDIR)/goneat" ]; then GONEAT_BIN="$(BINDIR)/goneat"; fi; \
	if [ -z "$$GONEAT_BIN" ] && [ -x "$(BINDIR)/goneat.exe" ]; then GONEAT_BIN="$(BINDIR)/goneat.exe"; fi; \
	if [ -n "$$GONEAT_BIN" ]; then \
		"$$GONEAT_BIN" doctor tools --scope foundation --install --yes --no-cooling 2>/dev/null || \
		echo "-> Some foundation tools may need manual installation"; \
	fi
	@echo ""
	@echo "Step 4: Installing npm dependencies..."
	@npm ci
	@echo "-> npm dependencies installed"
	@echo ""
	@echo "Bootstrap complete."
	@echo "Ensure '$(BINDIR)' is on PATH: export PATH=\"$(BINDIR):\$$PATH\""

bootstrap-force: ## Force reinstall external tools
	@$(MAKE) bootstrap FORCE=1

tools: ## Verify external tools are available
	@echo "Verifying external tools..."
	@$(SFETCH_RESOLVE); if [ -n "$$SFETCH" ]; then echo "sfetch: $$("$$SFETCH" -version 2>&1 | head -n1)"; else echo "sfetch not found (optional for day-to-day)"; fi
	@$(GONEAT_RESOLVE); echo "goneat: $$($$GONEAT --version 2>&1 | head -n1 || true)"
	@node --version > /dev/null && echo "node: $$(node --version)" || (echo "node not found" && exit 1)
	@echo "All required tools verified"

# -----------------------------------------------------------------------------
# Development
# -----------------------------------------------------------------------------
dev: ## Start web tool dev server
	@npm run dev

build: ## Build library and CLI
	@npm run build

build-web: ## Build web tool
	@npm run build:web

clean: ## Remove build artifacts
	@rm -rf dist/ web/dist/ coverage/ sbom/
	@echo "Clean complete"

# -----------------------------------------------------------------------------
# Quality Targets
# -----------------------------------------------------------------------------
fmt: ## Format code (Biome for TS, goneat for YAML/MD/shell)
	@echo "Formatting TypeScript..."
	@npx biome check --write src/ test/
	@echo "Formatting docs and config (goneat)..."
	@$(GONEAT_RESOLVE); $$GONEAT format --types yaml,json,markdown --folders . --finalize-eof --quiet 2>&1 | grep -v "encountered the following formatting errors" || true
	@echo "Fixing shell and config issues (goneat assess)..."
	@$(GONEAT_RESOLVE); $$GONEAT assess --categories format --fix 2>&1 || true
	@echo "All files formatted"

lint: ## Run linting checks
	@echo "Linting TypeScript (Biome)..."
	@npx biome check --no-errors-on-unmatched src/ test/
	@echo "Assessing YAML/JSON/Markdown (goneat)..."
	@# goneat assess can fail on Windows due to upstream glob/path issues.
	@uname_s="$$(uname -s 2>/dev/null || echo unknown)"; \
	if [ "$$OS" = "Windows_NT" ] || echo "$$uname_s" | grep -qiE 'mingw|msys|cygwin'; then \
		echo "-> Windows detected ($$uname_s): skipping goneat assess (upstream glob issue)"; \
	else \
		$(GONEAT_RESOLVE); $$GONEAT assess --categories format,lint --check; \
	fi
	@echo "All linting passed"

typecheck: ## Run TypeScript type checking
	@echo "Type checking with tsc..."
	@npx tsc --noEmit
	@echo "Type checking passed"

test: ## Run tests
	@echo "Running test suite..."
	@npx vitest run

test-watch: ## Run tests in watch mode
	@npx vitest

check-all: lint typecheck test build ## Run all quality checks
	@echo "All quality checks passed"

quality: check-all ## Alias for check-all

# -----------------------------------------------------------------------------
# Compliance & Security
# -----------------------------------------------------------------------------
license-check: ## Check dependency licenses for toxic licenses
	@echo "Checking dependency licenses..."
	@mkdir -p dist/reports
	@npx license-checker --csv --out dist/reports/license-inventory.csv 2>/dev/null || \
		(npm install -D license-checker && npx license-checker --csv --out dist/reports/license-inventory.csv)
	@forbidden='GPL-[23]|LGPL|AGPL|MPL|CDDL'; \
	if grep -E "$$forbidden" dist/reports/license-inventory.csv >/dev/null 2>&1; then \
		echo "[!!] Forbidden license detected. See dist/reports/license-inventory.csv"; \
		grep -E "$$forbidden" dist/reports/license-inventory.csv; \
		exit 1; \
	else \
		echo "[ok] No forbidden licenses detected"; \
	fi

vuln-scan: ## Scan for vulnerabilities (generates SBOM + grype report)
	@echo "Scanning for vulnerabilities..."
	@mkdir -p sbom
	@$(GONEAT_RESOLVE); $$GONEAT dependencies --vuln --fail-on high --sbom --sbom-output sbom/mdmeld.cdx.json

sbom: ## Generate Software Bill of Materials (CycloneDX)
	@echo "Generating SBOM..."
	@mkdir -p sbom
	@$(GONEAT_RESOLVE); $$GONEAT dependencies --sbom --sbom-output sbom/mdmeld.cdx.json
	@echo "SBOM generated at sbom/mdmeld.cdx.json"

public-readiness: check-all license-check vuln-scan ## Full public readiness check
	@echo ""
	@echo "============================================"
	@echo "Public readiness checks passed"
	@echo "============================================"

# -----------------------------------------------------------------------------
# Pre-commit / Pre-push Hooks
# -----------------------------------------------------------------------------
precommit: fmt lint typecheck ## Run pre-commit checks
	@echo "Pre-commit checks passed"

prepush: public-readiness ## Run pre-push checks (includes public-readiness)
	@echo "Pre-push checks passed"

# -----------------------------------------------------------------------------
# Version Management
# -----------------------------------------------------------------------------
version: ## Print current version
	@echo "$(VERSION)"

version-sync: ## Sync VERSION file to package.json
	@node scripts/version-sync.mjs

version-set: ## Update VERSION and sync (usage: make version-set V=x.y.z)
	@test -n "$(V)" || (echo "V not set. Use: make version-set V=x.y.z" && exit 1)
	@node scripts/version-sync.mjs --set $(V)

version-check: ## Verify VERSION matches package.json (CI)
	@node scripts/version-sync.mjs --check

# -----------------------------------------------------------------------------
# Release Signing (Manual Local Workflow)
# -----------------------------------------------------------------------------
# Environment variables:
#   MDMELD_RELEASE_TAG=v0.1.0
#   MDMELD_MINISIGN_KEY=/path/to/minisign.key
#   MDMELD_MINISIGN_PUB=/path/to/minisign.pub
#   MDMELD_PGP_KEY_ID=<gpg-key-id>
#   MDMELD_GPG_HOMEDIR=/path/to/gpg/homedir (optional)

RELEASE_DIR := dist/release
PUBLIC_KEY_NAME := mdmeld-release-signing-key.asc
MINISIGN_PUB_NAME := mdmeld-minisign.pub

release-guard-tag-version: ## Guard: ensure tag matches VERSION (CI-friendly)
	@./scripts/release/release-guard-tag-version.sh

release-clean: ## Clean release artifacts
	rm -rf $(RELEASE_DIR)
	mkdir -p $(RELEASE_DIR)

release-download: ## Download release artifacts from GitHub (tarball)
	@test -n "$(MDMELD_RELEASE_TAG)" || (echo "MDMELD_RELEASE_TAG required (e.g. MDMELD_RELEASE_TAG=v0.1.0)" && exit 1)
	gh release download $(MDMELD_RELEASE_TAG) --dir $(RELEASE_DIR) \
		--pattern "mdmeld-*" --pattern "SHA256SUMS" --pattern "SHA512SUMS"

release-checksums: ## Generate SHA256 and SHA512 checksums
	./scripts/release/generate-checksums.sh $(RELEASE_DIR) mdmeld

release-verify-checksums: ## Verify checksums in release directory (pre-sign)
	@if [ ! -d "$(RELEASE_DIR)" ]; then echo "error: $(RELEASE_DIR) not found (run make release-download first)" >&2; exit 1; fi
	@echo "Verifying checksums in $(RELEASE_DIR)..."
	@cd $(RELEASE_DIR) && \
	if [ -f SHA256SUMS ]; then \
		echo "=== SHA256SUMS ===" && \
		shasum -a 256 -c SHA256SUMS 2>&1 | grep -v ': OK$$' || echo "All SHA256 checksums OK"; \
	fi && \
	if [ -f SHA512SUMS ]; then \
		echo "=== SHA512SUMS ===" && \
		shasum -a 512 -c SHA512SUMS 2>&1 | grep -v ': OK$$' || echo "All SHA512 checksums OK"; \
	fi
	@echo "[ok] Checksum verification complete"

release-sign: ## Sign checksums with minisign + GPG (dual-format)
	MDMELD_MINISIGN_KEY=$(MDMELD_MINISIGN_KEY) \
	MDMELD_PGP_KEY_ID=$(MDMELD_PGP_KEY_ID) \
	MDMELD_GPG_HOMEDIR=$(MDMELD_GPG_HOMEDIR) \
	./scripts/release/sign-release-assets.sh $(MDMELD_RELEASE_TAG) $(RELEASE_DIR)

release-verify-signatures: ## Verify minisign + GPG signatures on checksum manifests
	MDMELD_MINISIGN_PUB=$(MDMELD_MINISIGN_PUB) \
	MDMELD_GPG_HOMEDIR=$(MDMELD_GPG_HOMEDIR) \
	./scripts/release/verify-signatures.sh $(RELEASE_DIR)

release-export-minisign-key: ## Copy minisign public key to release directory
	@test -n "$(MDMELD_MINISIGN_PUB)" || (echo "MDMELD_MINISIGN_PUB required" && exit 1)
	@if [ ! -f "$(MDMELD_MINISIGN_PUB)" ]; then echo "error: $(MDMELD_MINISIGN_PUB) not found" >&2; exit 1; fi
	cp $(MDMELD_MINISIGN_PUB) $(RELEASE_DIR)/$(MINISIGN_PUB_NAME)
	@echo "[ok] Copied minisign public key to $(RELEASE_DIR)/$(MINISIGN_PUB_NAME)"

release-export-gpg-key: ## Export GPG public key to release directory
	@test -n "$(MDMELD_PGP_KEY_ID)" || (echo "MDMELD_PGP_KEY_ID required" && exit 1)
	MDMELD_GPG_HOMEDIR=$(MDMELD_GPG_HOMEDIR) \
	./scripts/release/export-release-key.sh $(MDMELD_PGP_KEY_ID) $(RELEASE_DIR)

release-export-keys: release-export-minisign-key release-export-gpg-key ## Export both signing keys

release-verify-gpg-key: ## Verify GPG key is public-only (safety check)
	@if [ ! -f "$(RELEASE_DIR)/$(PUBLIC_KEY_NAME)" ]; then \
		echo "[--] $(PUBLIC_KEY_NAME) not found (run make release-export-keys first, skipping)"; \
	else \
		./scripts/release/verify-public-key.sh $(RELEASE_DIR)/$(PUBLIC_KEY_NAME); \
	fi

release-verify-minisign-key: ## Verify minisign public key format
	@if [ ! -f "$(RELEASE_DIR)/$(MINISIGN_PUB_NAME)" ]; then \
		echo "[--] $(MINISIGN_PUB_NAME) not found (run make release-export-keys first, skipping)"; \
	elif ! head -1 "$(RELEASE_DIR)/$(MINISIGN_PUB_NAME)" | grep -q "^untrusted comment:"; then \
		echo "error: $(RELEASE_DIR)/$(MINISIGN_PUB_NAME) does not appear to be a valid minisign public key" >&2; exit 1; \
	else \
		echo "[ok] $(RELEASE_DIR)/$(MINISIGN_PUB_NAME) is a valid minisign public key"; \
	fi

release-verify-keys: release-verify-gpg-key release-verify-minisign-key ## Verify all exported public keys

release-verify: release-verify-checksums release-verify-signatures release-verify-keys ## Verify all (checksums + signatures + keys)
	@echo "[ok] All verifications passed"

release-notes: ## Copy release notes to release directory
	@test -n "$(MDMELD_RELEASE_TAG)" || (echo "MDMELD_RELEASE_TAG required" && exit 1)
	@tag="$(MDMELD_RELEASE_TAG)"; \
	notag="$${tag#v}"; \
	vtag="v$$notag"; \
	src=""; \
	for f in "docs/releases/$$tag.md" "docs/releases/$$vtag.md" "docs/releases/$$notag.md"; do \
		if [ -f "$$f" ]; then src="$$f"; break; fi; \
	done; \
	if [ -z "$$src" ]; then \
		echo "error: release notes not found (tried docs/releases/$$tag.md, docs/releases/$$vtag.md, docs/releases/$$notag.md)" >&2; \
		exit 1; \
	fi; \
	mkdir -p "$(RELEASE_DIR)"; \
	cp "$$src" "$(RELEASE_DIR)/release-notes-$$tag.md"; \
	echo "[ok] Copied $$src to $(RELEASE_DIR)/release-notes-$$tag.md"

release-upload: ## Upload provenance assets to GitHub release (default)
	@test -n "$(MDMELD_RELEASE_TAG)" || (echo "MDMELD_RELEASE_TAG required" && exit 1)
	./scripts/release/upload-release-provenance.sh $(MDMELD_RELEASE_TAG) $(RELEASE_DIR)

release-upload-all: ## Upload ALL assets including tarballs (manual rebuild only)
	@test -n "$(MDMELD_RELEASE_TAG)" || (echo "MDMELD_RELEASE_TAG required" && exit 1)
	./scripts/release/upload-release-assets.sh $(MDMELD_RELEASE_TAG) $(RELEASE_DIR)

release-undraft: ## Mark release as published (no longer draft)
	@test -n "$(MDMELD_RELEASE_TAG)" || (echo "MDMELD_RELEASE_TAG required" && exit 1)
	gh release edit $(MDMELD_RELEASE_TAG) --draft=false

release-all: release-guard-tag-version release-clean release-download release-checksums release-verify-checksums release-sign release-verify-signatures release-export-keys release-verify-keys release-notes release-upload release-undraft ## Full signing workflow
	@echo "[ok] Release $(MDMELD_RELEASE_TAG) signed and published"
