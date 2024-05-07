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

pathsToPush=""
preBuildPaths=$(sort /tmp/store-path-pre-build)
if [ $? -eq 0 ]; then
  postBuildPaths=$("$(dirname "$0")"/list-nix-store.sh | sort)
  if [ $? -eq 0 ]; then
    pathsToPush=$(comm -13 <(echo "$preBuildPaths") <(echo "$postBuildPaths"))
  else
    echo "::error::Failed to list post-build store paths."
  fi
else
  echo "::error::Failed to find pre-build store paths."
fi

if [[ -n $pushFilter ]]; then
  pathsToPush=$(filterPaths $pushFilter "$pathsToPush")
fi

echo "$pathsToPush" | "$cachix" push $cachixArgs "$cache"
