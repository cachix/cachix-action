#!/usr/bin/env bash
set -euo pipefail

comm -13 <(sort /tmp/store-path-pre-build) <(nix path-info --all | grep -v '\.drv$') | $1 push $2