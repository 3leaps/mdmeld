#!/usr/bin/env bash
set -euo pipefail

# Upload ALL release assets (tarballs and provenance) to GitHub.
#
# CAUTION: Only use when a release was built locally and all assets need
# transfer. Each file is a separate API call — uploading many assets in
# rapid succession can trigger GitHub's secondary rate limits (HTTP 429).
#
# For the normal workflow use upload-release-provenance.sh instead — CI
# uploads tarballs, provenance-only upload keeps API calls minimal.
#
# Usage: upload-release-assets.sh <tag> [dir]

TAG=${1:?"usage: upload-release-assets.sh <tag> [dir]"}
DIR=${2:-dist/release}

if ! command -v gh >/dev/null 2>&1; then
    echo "gh CLI is required" >&2
    exit 1
fi

if [ ! -d "$DIR" ]; then
    echo "directory $DIR not found" >&2
    exit 1
fi

# Collect all release assets into a single upload
shopt -s nullglob

assets=()

# Tarballs and checksums
assets+=("$DIR"/*.tgz)
assets+=("$DIR"/SHA256SUMS "$DIR"/SHA512SUMS)

# Signatures
assets+=("$DIR"/SHA256SUMS.* "$DIR"/SHA512SUMS.*)

# Public keys
assets+=("$DIR"/*-minisign.pub "$DIR"/*-signing-key.asc)

# Release notes
assets+=("$DIR"/release-notes-*.md)

# Filter to existing files
final_assets=()
for f in "${assets[@]}"; do
    if [ -f "$f" ]; then
        final_assets+=("$f")
    fi
done

if [ ${#final_assets[@]} -eq 0 ]; then
    echo "no assets found to upload from $DIR" >&2
    exit 1
fi

echo "[..] Uploading ${#final_assets[@]} asset(s) to ${TAG} (clobber)"
gh release upload "$TAG" "${final_assets[@]}" --clobber

# Update release body with notes if present
NOTES_FILE="$DIR/release-notes-${TAG}.md"
if [ -f "$NOTES_FILE" ]; then
    echo "[..] Updating release body from $NOTES_FILE"
    gh release edit "$TAG" --notes-file "$NOTES_FILE"
fi

echo "[ok] Release assets uploaded for $TAG"
