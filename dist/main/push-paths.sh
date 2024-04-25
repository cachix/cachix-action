#!/usr/bin/env bash
set -euo pipefail

cachix=$1 cachixArgs=${2:--j8} cache=$3 pushFilter=$4

filterPaths() {
  local regex=$1
  local paths=$2

  for path in $paths; do
    echo $path | grep -vEe $regex
  done | xargs
}

pathsToPush=$(comm -13 <(sort /tmp/store-path-pre-build) <("$(dirname "$0")"/list-nix-store.sh))

if [[ -n $pushFilter ]]; then
    pathsToPush=$(filterPaths $pushFilter "$pathsToPush")
fi

echo "$pathsToPush" | "$cachix" push $cachixArgs "$cache"
