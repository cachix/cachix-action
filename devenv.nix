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
    prettier = {
      enable = true;
      files = "(src/.*\.ts|.*\.md|.*\.yml)$";
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
