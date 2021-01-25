#!/usr/bin/env bash
set -euo pipefail

comm -13 <(sort /tmp/store-path-pre-build) <("$(dirname "$0")"/list-nix-store.sh) | "$1" push -j8 "$2"
