#!/usr/bin/env bash
set -euo pipefail

# Dual-format release signing: minisign (.minisig) + PGP (.asc)
#
# Usage: sign-release-assets.sh <tag> [dir]
#
# Environment variables:
#   MDMELD_MINISIGN_KEY - Path to minisign secret key file. Primary format.
#   MDMELD_PGP_KEY_ID   - GPG key ID for PGP signing. Optional secondary format.
#   MDMELD_GPG_HOMEDIR  - Custom GPG homedir (optional, defaults to ~/.gnupg)
#
# Only SHA256SUMS and SHA512SUMS are signed (not individual files).
# Verify signature on checksum file, then verify file checksums against that.

TAG=${1:?"usage: sign-release-assets.sh <tag> [dir]"}
DIR=${2:-dist/release}

MDMELD_MINISIGN_KEY=${MDMELD_MINISIGN_KEY:-}
MDMELD_PGP_KEY_ID=${MDMELD_PGP_KEY_ID:-}
MDMELD_GPG_HOMEDIR=${MDMELD_GPG_HOMEDIR:-}

if [ ! -d "$DIR" ]; then
    echo "error: directory $DIR not found" >&2
    exit 1
fi

checksum_files=()
for file in SHA256SUMS SHA512SUMS; do
    if [ -f "$DIR/$file" ]; then
        checksum_files+=("$file")
    fi
done

if [ ${#checksum_files[@]} -eq 0 ]; then
    echo "error: no checksum files found (run make release-checksums first)" >&2
    exit 1
fi

has_minisign=false
has_pgp=false

if [ -n "$MDMELD_MINISIGN_KEY" ]; then
    if [ ! -f "$MDMELD_MINISIGN_KEY" ]; then
        echo "error: MDMELD_MINISIGN_KEY=$MDMELD_MINISIGN_KEY not found" >&2
        exit 1
    fi
    if ! command -v minisign >/dev/null 2>&1; then
        echo "error: minisign not found in PATH" >&2
        echo "  Install: brew install minisign (macOS) or see https://jedisct1.github.io/minisign/" >&2
        exit 1
    fi
    has_minisign=true
    echo "minisign signing enabled (key: $MDMELD_MINISIGN_KEY)"
fi

if [ -n "$MDMELD_PGP_KEY_ID" ]; then
    if ! command -v gpg >/dev/null 2>&1; then
        echo "error: MDMELD_PGP_KEY_ID set but gpg not found in PATH" >&2
        exit 1
    fi
    has_pgp=true
    echo "PGP signing enabled (key: $MDMELD_PGP_KEY_ID)"
    if [ -n "$MDMELD_GPG_HOMEDIR" ]; then
        echo "GPG homedir: $MDMELD_GPG_HOMEDIR"
    fi
fi

if [ "$has_minisign" = false ] && [ "$has_pgp" = false ]; then
    echo "error: no signing method available" >&2
    echo "  Set MDMELD_MINISIGN_KEY for minisign signing" >&2
    echo "  Set MDMELD_PGP_KEY_ID for PGP signing" >&2
    exit 1
fi

# Sign checksum manifests
# Grouped by tool to minimize password prompt switching.

if [ "$has_minisign" = true ]; then
    echo ""
    echo "=== Minisign signatures ==="
    for file in "${checksum_files[@]}"; do
        echo "[minisign] Signing $file"
        rm -f "$DIR/$file.minisig"
        minisign -S -s "$MDMELD_MINISIGN_KEY" -t "mdmeld $TAG $(date -u +%Y-%m-%dT%H:%M:%SZ)" -m "$DIR/$file"
    done
fi

if [ "$has_pgp" = true ]; then
    echo ""
    echo "=== PGP signatures ==="
    for file in "${checksum_files[@]}"; do
        echo "[PGP] Signing $file"
        if [ -n "$MDMELD_GPG_HOMEDIR" ]; then
            env GNUPGHOME="$MDMELD_GPG_HOMEDIR" gpg --batch --yes --armor --local-user "$MDMELD_PGP_KEY_ID" --detach-sign -o "$DIR/$file.asc" "$DIR/$file"
        else
            gpg --batch --yes --armor --local-user "$MDMELD_PGP_KEY_ID" --detach-sign -o "$DIR/$file.asc" "$DIR/$file"
        fi
    done
fi

echo ""
echo "[ok] Signing complete for $TAG"
for file in "${checksum_files[@]}"; do
    if [ "$has_minisign" = true ]; then
        echo "   $file.minisig"
    fi
    if [ "$has_pgp" = true ]; then
        echo "   $file.asc"
    fi
done
