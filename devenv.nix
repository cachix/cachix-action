{ config, pkgs, ... }:

let
  nodejs = pkgs.nodejs_20;
in
{
  packages = [
    pkgs.act
    nodejs.pkgs.typescript-language-server
  ];

  languages.typescript.enable = true;

  languages.javascript = {
    enable = true;
    package = nodejs;
    pnpm.enable = true;
    pnpm.install.enable = true;
  };

  git-hooks.hooks = {
    build-dist = {
      enable = true;
      files = "src/.*$";
      pass_filenames = false;
      entry = "devenv shell -- pnpm build";
    };
    nixfmt-rfc-style.enable = true;
    prettier = {
      enable = true;
      files = "(src/.*\.ts|.*\.md|.*\.yml)$";
    };
    shellcheck = {
      enable = true;
      excludes = [ "\\.envrc" ];
    };
  };
}
