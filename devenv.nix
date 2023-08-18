{ pkgs, ... }:

let
  node = pkgs.nodejs_16;
in
{
  packages = [
    pkgs.act
    pkgs.yarn
    node
    node.pkgs.typescript-language-server
  ];

  languages.typescript.enable = true;
}
