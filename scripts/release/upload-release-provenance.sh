#!/usr/bin/env bash
set -euo pipefail

# Upload provenance assets (checksums, signatures, keys, notes) to a
# GitHub release. Does NOT upload tarballs — those come from npm pack.
#
# Usage: upload-release-provenance.sh <tag> [dir]

TAG="${1:?"usage: upload-release-provenance.sh <tag> [dir]"}"
DIR="${2:-dist/release}"

if ! command -v gh >/dev/null 2>&1; then
    echo "gh CLI is required" >&2
    exit 1
fi

if [ ! -d "$DIR" ]; then
    echo "directory $DIR not found" >&2
    exit 1
fi

shopt -s nullglob

assets=()
assets+=("$DIR"/SHA256SUMS "$DIR"/SHA512SUMS)
assets+=("$DIR"/SHA256SUMS.* "$DIR"/SHA512SUMS.*)
assets+=("$DIR"/*-minisign.pub "$DIR"/*-signing-key.asc)
assets+=("$DIR"/release-notes-*.md)

final_assets=()
for f in "${assets[@]}"; do
    if [ -f "$f" ]; then
        final_assets+=("$f")
    fi
done

if [ ${#final_assets[@]} -eq 0 ]; then
    echo "no provenance assets found to upload from $DIR" >&2
    exit 1
fi

echo "[..] Uploading ${#final_assets[@]} provenance asset(s) to ${TAG} (clobber)"
gh release upload "$TAG" "${final_assets[@]}" --clobber

# Update release body with notes if present
NOTES_FILE="$DIR/release-notes-${TAG}.md"
if [ -f "$NOTES_FILE" ]; then
    echo "[..] Updating release body from $NOTES_FILE"
    gh release edit "$TAG" --notes-file "$NOTES_FILE"
fi

echo "[ok] Provenance assets uploaded for $TAG"
