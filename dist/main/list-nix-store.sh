#!/usr/bin/env bash
# Small utility to replace `nix path-info --all`
set -euo pipefail

for file in /nix/store/*; do
  case "$file" in
  *.drv)
    # Avoid .drv as they are not generally useful
    continue
    ;;
  *.drv.chroot)
    # Avoid .drv.chroot as they are not generally useful
    continue
    ;;
  *.check)
    # Skip .check file produced by --keep-failed
    continue
    ;;
  *.lock)
    # Skip .lock files
    continue
    ;;
  *)
    echo "$file"
    ;;
  esac
done
