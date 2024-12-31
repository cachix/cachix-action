# Realizes <num>> of derivations with size of <size>MB
{
  size ? 1, # MB
  num ? 10, # count
  currentTime ? builtins.currentTime,
}:

with (import (fetchTarball "https://github.com/NixOS/nixpkgs/tarball/nixos-24.11") { });

let
  drv =
    i:
    runCommand "${toString currentTime}-${toString i}" { } ''
      dd if=/dev/zero of=$out bs=${toString size}MB count=1
    '';
in
lib.listToAttrs (builtins.map (i: lib.nameValuePair "drv${toString i}" (drv i)) (lib.range 1 num))
