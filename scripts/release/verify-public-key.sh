#!/usr/bin/env bash
set -euo pipefail

# Verify that an exported GPG key file contains only public key material
#
# Usage: verify-public-key.sh <keyfile>
#
# Safety check before uploading keys to ensure we never
# accidentally publish secret key material.

KEY_FILE=${1:?"usage: verify-public-key.sh <keyfile>"}

if [ ! -f "$KEY_FILE" ]; then
    echo "error: file $KEY_FILE not found" >&2
    exit 1
fi

if ! command -v gpg >/dev/null 2>&1; then
    echo "gpg is required" >&2
    exit 1
fi

# Check if file contains "BEGIN PGP PRIVATE KEY" or similar
if grep -q "PRIVATE KEY" "$KEY_FILE"; then
    echo "[!!] DANGER: $KEY_FILE appears to contain private key material!" >&2
    echo "[!!] DO NOT upload this file!" >&2
    exit 1
fi

# Verify it's a valid public key
if ! gpg --show-keys "$KEY_FILE" >/dev/null 2>&1; then
    echo "[!!] $KEY_FILE is not a valid GPG key file" >&2
    exit 1
fi

# Check that gpg reports it as public only
KEY_INFO=$(gpg --show-keys --with-colons "$KEY_FILE" 2>/dev/null)
if echo "$KEY_INFO" | grep -q "^sec:"; then
    echo "[!!] DANGER: $KEY_FILE contains secret key material!" >&2
    exit 1
fi

if ! echo "$KEY_INFO" | grep -q "^pub:"; then
    echo "[!!] $KEY_FILE does not contain a public key" >&2
    exit 1
fi

echo "[ok] $KEY_FILE is a valid public-only GPG key"
