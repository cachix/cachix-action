#!/usr/bin/env bash
set -euo pipefail

cachix=$1 cachixArgs=${2:--j8} cache=$3 pathsToPush=$4 pushFilter=$5 useFlakes=$6

if [[ $pathsToPush == "" ]]; then
    case useFlakes in
        input)
            pathsToPush=$(nix flake archive --json | jq -r '.path,(.inputs|to_entries[].value.path)')
            ;;
        runtime)
            pathsToPush=$(nix build --json | jq -r '.[].outputs | to_entries[].value')
            ;;
        *)
            pathsToPush=$(comm -13 <(sort /tmp/store-path-pre-build) <("$(dirname "$0")"/list-nix-store.sh))
            ;;
    esac

    if [[ $pushFilter != "" ]]; then
        pathsToPush=$(echo "$pathsToPush" | grep -vEe "$pushFilter")
    fi
fi

echo "$pathsToPush" | "$cachix" push $cachixArgs "$cache"
