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
    pnpm.enable = true;
    pnpm.install.enable = true;
  };

  git-hooks.hooks = {
    prettier = {
      enable = true;
      files = "src/.*$";
    };
    nixfmt-rfc-style.enable = true;
    build-dist = {
      enable = true;
      files = "src/.*$";
      pass_filenames = false;
      entry = "devenv shell -- pnpm build";
    };
  };
}
