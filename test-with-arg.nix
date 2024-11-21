{
  arg ? null,
}:

with import <nixpkgs> { };

if arg == null then
  abort "arg is not set"
else
  writeText "test-with-arg" ''
    ${toString builtins.currentTime}
    ${arg}
  ''
