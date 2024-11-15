{ config, pkgs, ... }:

let
  nodePackages = config.languages.javascript.package.pkgs;
in
{
  packages = [
    pkgs.act
    nodePackages.typescript-language-server
  ];

  languages.typescript.enable = true;

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_20;
    yarn.enable = true;
    yarn.install.enable = true;
  };
}
