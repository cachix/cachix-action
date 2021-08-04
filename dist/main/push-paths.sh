#!/usr/bin/env bash
set -euo pipefail

PATHS=$(comm -13 <(sort /tmp/store-path-pre-build) <("$(dirname "$0")"/list-nix-store.sh))

if [[ $3 != "" ]]; then
    PATHS=$(echo "$PATHS" | grep -vEe "$3")
fi

echo "$PATHS" | "$1" push -j8 "$2"
