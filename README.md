# cachix-action

![github actions badge](https://github.com/cachix/cachix-action/workflows/cachix-action%20test/badge.svg)

Build software only once using [Nix](https://nixos.org/nix/) with the help of [Cachix](https://cachix.org).

## Usage

1. [Login to Cachix](https://cachix.org/api/v1/login) and create a new cache. Backup the signing key in the process.

2. As an admin of your github repository:
    1. Click on Settings
    2. Secrets
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
    - uses: cachix/install-nix-action@v2
    - uses: cachix/cachix-action@v1
      with:
        push: cachix-action
        signingKey: '${{ secrets.CACHIX_SIGNING_KEY }}'
        # Only needed for private caches
        authToken: '${{ secrets.CACHIX_AUTH_TOKEN }}'
```

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
