# cachix-action

![github actions badge](https://github.com/cachix/cachix-action/workflows/cachix-action%20test/badge.svg)

Build software only once using [Nix](https://nixos.org/nix/) with the help of [Cachix](https://cachix.org).

This action will configure Cachix and invoke `nix-build`.

## Why do I need this

Because you'd like for your CI to be fast. Let me explain.

Caching on a typical CI doesn't work in favor of Nix.

`/nix/store` is a global storage of everything Nix operates on. These are
your sources, patches, tarballs, packages, configuration.

Caching `/nix/store` is time consuming as Nix only appends store paths to it.
As you invoke new builds, those will contain all your sources throughout the whole history of your build.

Garbage collecting is also suboptimal, as caching is hard to invalidate correctly
between different changes and branches.

Cachix avoids this by keeping your `/nix/store` hosted and only downloads the bits you
need for the given build (in parallel) using Nix substituters.

## Usage

1. [Login to Cachix](https://cachix.org/api/v1/login) and create a new cache.
    1. Follow getting started to create your signing key
    2. Backup the signing key in the process.

2. As an admin of your github repository:
    1. Click on Settings
    2. Click on Secrets ([If missing, you need to sign up first for actions beta](https://github.com/features/actions))
    3. Add your signing key value under name `CACHIX_SIGNING_KEY`.

3. Create `.github/workflows/test.yml` in your repo with the following contents:

```yaml
name: "Test"
on:
  pull_request:
  push:
jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - uses: cachix/install-nix-action@v6
    - uses: cachix/cachix-action@v2
      with:
        name: mycache
        signingKey: '${{ secrets.CACHIX_SIGNING_KEY }}'
        # Only needed for private caches
        authToken: '${{ secrets.CACHIX_AUTH_TOKEN }}'
```

See [action.yml](action.yml) for all options.

---

## Hacking

Install the dependencies  
```bash
$ yarn install
```

Build the typescript
```bash
$ yarn build
```

Run the tests :heavy_check_mark:  
```bash
$ yarn test
```
