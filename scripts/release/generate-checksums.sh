#!/usr/bin/env bash
set -euo pipefail

# Generate SHA256SUMS and SHA512SUMS for release artifacts
#
# Usage: generate-checksums.sh [dir] <package_name>
#
# Checksums npm tarballs and source archives.

DIR=${1:-dist/release}
PACKAGE_NAME=${2:-}

if [ -z "${PACKAGE_NAME}" ]; then
    echo "usage: $0 [dir] <package_name>" >&2
    exit 1
fi

if [ ! -d "${DIR}" ]; then
    echo "error: directory ${DIR} not found" >&2
    exit 1
fi

cd "${DIR}"

rm -f SHA256SUMS SHA256SUMS.* SHA512SUMS SHA512SUMS.*

# Find release artifacts
artifacts=()

# npm tarball pattern
for f in "${PACKAGE_NAME}-"*.tgz; do
    [ -f "$f" ] && artifacts+=("$f")
done

# Source archive patterns
for f in "${PACKAGE_NAME}-"*.tar.gz "${PACKAGE_NAME}-"*.zip; do
    [ -f "$f" ] && artifacts+=("$f")
done

if [ ${#artifacts[@]} -eq 0 ]; then
    echo "error: no artifacts found matching ${PACKAGE_NAME}-* in ${DIR}" >&2
    echo "Expected: npm tarball (*.tgz) or source archive (*.tar.gz, *.zip)" >&2
    exit 1
fi

echo "Generating checksums for ${#artifacts[@]} artifact(s)..."

if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${artifacts[@]}" >SHA256SUMS
else
    shasum -a 256 "${artifacts[@]}" >SHA256SUMS
fi

if command -v sha512sum >/dev/null 2>&1; then
    sha512sum "${artifacts[@]}" >SHA512SUMS
else
    shasum -a 512 "${artifacts[@]}" >SHA512SUMS
fi

echo "Wrote SHA256SUMS and SHA512SUMS"
echo ""
echo "Artifacts checksummed:"
for f in "${artifacts[@]}"; do
    echo "  - $f"
done
