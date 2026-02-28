#!/usr/bin/env bash
set -euo pipefail

# Export PGP public key for release signing verification
#
# Usage: export-release-key.sh <key-id> [dest_dir]
#
# Environment variables:
#   MDMELD_GPG_HOMEDIR - Custom GPG homedir (optional, defaults to ~/.gnupg)

KEY_ID=${1:?"usage: export-release-key.sh <key-id> [dest_dir]"}
DIR=${2:-dist/release}
MDMELD_GPG_HOMEDIR=${MDMELD_GPG_HOMEDIR:-}

if ! command -v gpg >/dev/null 2>&1; then
    echo "gpg is required" >&2
    exit 1
fi
mkdir -p "$DIR"
OUTPUT="$DIR/mdmeld-release-signing-key.asc"

if [ -n "$MDMELD_GPG_HOMEDIR" ]; then
    env GNUPGHOME="$MDMELD_GPG_HOMEDIR" gpg --armor --export "$KEY_ID" >"$OUTPUT"
else
    gpg --armor --export "$KEY_ID" >"$OUTPUT"
fi

echo "[ok] Exported $KEY_ID to $OUTPUT"
