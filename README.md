# cachix-action

![github actions badge](https://github.com/cachix/cachix-action/workflows/cachix-action%20test/badge.svg)

One nice benefit of Nix is that CI can build and cache developer environments for every project on every branch using binary caches.

Another important aspect of CI is the feedback loop of how many minutes does the build take to finish.

With a simple configuration using Cachix, you’ll never have to build any derivation twice and share them with all your developers.

After each job, just built derivations are pushed to your binary cache.

Before each job, derivations to be built are first substituted (if they exist) from your binary cache.

## Getting started

Follow [Continuous Integration with GitHub Actions](https://nix.dev/tutorials/nixos/continuous-integration-github-actions) tutorial.

See [action.yml](action.yml) for all options.

## Security

Cachix auth token and signing key need special care as they give read and write access to your caches.

[As per GitHub Actions' security model](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions#accessing-your-secrets):

> You can use and read secrets in a workflow file if you have access to edit the file.

Which means all developers with write/push access can read your secrets and write to your cache.

Pull requests from forks do not have access to secrets so read access to a public binary cache will work,
but pushing will be disabled since there is no signing key.

Note that malicious code submitted via forked pull request can, once merged into `master`, reveal tokens.

## Hacking

Install the dependencies

```bash
$ pnpm install
```

Build the typescript

```bash
$ pnpm build
```
