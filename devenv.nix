{ config, pkgs, ... }:

let
  nodejs = pkgs.nodejs_20;
in
{
  packages =
    let
      nodePackages = config.languages.javascript.package.pkgs;
    in
    [
      pkgs.act
      nodePackages.typescript-language-server
    ];

  languages.typescript.enable = true;

  languages.javascript = {
    enable = true;
    package = nodejs;
    yarn.enable = true;
    yarn.install.enable = true;
  };
}
