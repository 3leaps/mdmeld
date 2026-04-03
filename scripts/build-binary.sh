#!/usr/bin/env bash
# Build a standalone mdmeld binary using bun build --compile.
#
# Usage:
#   scripts/build-binary.sh [--target <bun-target>] [--outdir <dir>]
#
# Native build:  outputs <outdir>/mdmeld
# Cross build:   outputs <outdir>/mdmeld-<os>-<arch>[.exe]
#
# Supported bun targets: bun-linux-x64, bun-linux-arm64,
#   bun-darwin-x64, bun-darwin-arm64, bun-windows-x64
#
# Output names use Go-style arch (amd64 not x64) for homebrew/scoop compatibility.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENTRY="$REPO_ROOT/src/cli/index.ts"
OUT_DIR="$REPO_ROOT/dist/bin"

# Parse flags
TARGET=""
while [[ $# -gt 0 ]]; do
    case "$1" in
    --target)
        TARGET="$2"
        shift 2
        ;;
    --outdir)
        OUT_DIR="$2"
        shift 2
        ;;
    *)
        echo "Unknown option: $1" >&2
        exit 1
        ;;
    esac
done

# Ensure bun is available
if ! command -v bun >/dev/null 2>&1; then
    echo "error: bun is required for binary builds. Install from https://bun.sh" >&2
    exit 1
fi

mkdir -p "$OUT_DIR"

# Map bun target to homebrew/scoop-friendly output name
# bun-linux-x64 → mdmeld-linux-amd64
# bun-darwin-arm64 → mdmeld-darwin-arm64
# bun-windows-x64 → mdmeld-windows-amd64.exe
map_output_name() {
    local target="$1"
    local suffix="${target#bun-}" # linux-x64, darwin-arm64, etc.
    local os="${suffix%%-*}"      # linux, darwin, windows
    local arch="${suffix##*-}"    # x64, arm64

    # Remap x64 → amd64 for homebrew/scoop convention
    if [ "$arch" = "x64" ]; then
        arch="amd64"
    fi

    local name="mdmeld-${os}-${arch}"
    if [ "$os" = "windows" ]; then
        name="${name}.exe"
    fi
    echo "$name"
}

# Determine output filename
if [ -z "$TARGET" ]; then
    OUT_FILE="$OUT_DIR/mdmeld"
else
    OUT_FILE="$OUT_DIR/$(map_output_name "$TARGET")"
fi

echo "Building mdmeld binary..."
echo "  entry:  $ENTRY"
echo "  output: $OUT_FILE"
if [ -n "$TARGET" ]; then
    echo "  target: $TARGET"
fi

BUILD_ARGS=(
    build
    "$ENTRY"
    --compile
    --outfile "$OUT_FILE"
)

if [ -n "$TARGET" ]; then
    BUILD_ARGS+=(--target "$TARGET")
fi

bun "${BUILD_ARGS[@]}"

echo "Binary built: $OUT_FILE"
ls -lh "$OUT_FILE"*
