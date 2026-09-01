{ pkgs, ... }:

let
  nodejs = pkgs.nodejs_24;
in
{
  packages = [
    pkgs.act
  ];

  languages.typescript = {
    enable = true;
    lsp.enable = true;
  };

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
      entry = "pnpm build";
    };
    nixfmt.enable = true;
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
