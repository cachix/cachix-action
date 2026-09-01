# Realizes `num` derivations of `size` MB each.
{
  pkgs ? import ./nixpkgs.nix,
  size ? 1,
  num ? 10,
  currentTime ? builtins.currentTime,
}:

let
  drv =
    i:
    pkgs.runCommand "${toString currentTime}-${toString i}" { } ''
      dd if=/dev/zero of=$out bs=${toString size}MB count=1
    '';
in
pkgs.lib.listToAttrs (
  builtins.map (i: pkgs.lib.nameValuePair "drv${toString i}" (drv i)) (pkgs.lib.range 1 num)
)
