let
  # Keep the integration fixture on the same Nixpkgs revision as the dev shell.
  lock = builtins.fromJSON (builtins.readFile ../devenv.lock);
  nixpkgs = lock.nodes.${lock.nodes.root.inputs.nixpkgs}.locked;
in
import (builtins.fetchTarball {
  name = "nixpkgs-${nixpkgs.rev}";
  url = "https://github.com/${nixpkgs.owner}/${nixpkgs.repo}/archive/${nixpkgs.rev}.tar.gz";
  sha256 = nixpkgs.narHash;
}) { }
