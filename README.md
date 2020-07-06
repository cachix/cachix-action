# cachix-action

![github actions badge](https://github.com/cachix/cachix-action/workflows/cachix-action%20test/badge.svg)

One nice benefit of Nix is that CI can build and cache developer environments for every project on every branch using binary caches.

Another important aspect of CI is the feedback loop of how many minutes does the build take to finish.

With a simple configuration using Cachix, you’ll never have to build any derivation twice and share them with all your developers.

After each job, just built derivations are pushed to your binary cache.

Before each job, derivations to be built are first substituted (if they exist) from your binary cache.

## Usage

### 1. [Login to Cachix](https://cachix.org/api/v1/login) and create a new cache.
    1. Follow getting started to create your signing key
    2. Backup the signing key in the process.

### 2. As an admin of your github repository:
    1. Click on Settings
    2. Click on Secrets ([If missing, you need to sign up first for actions beta](https://github.com/features/actions))
    3. Add your signing key value under name `CACHIX_SIGNING_KEY`.

### 3. Create `.github/workflows/test.yml` in your repo with the following contents:

```yaml
name: "Test"
on:
  pull_request:
  push:
jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2.3.1
    - uses: cachix/install-nix-action@v10
    - uses: cachix/cachix-action@v6
      with:
        name: mycache
        signingKey: '${{ secrets.CACHIX_SIGNING_KEY }}'
        # Only needed for private caches
        authToken: '${{ secrets.CACHIX_AUTH_TOKEN }}'
    - run: nix-build
```

See [action.yml](action.yml) for all options.

## Security

Cachix auth token and signing key need special care as they give read and write access to your caches.

[As per GitHub Actions' security model](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets#using-encrypted-secrets-in-a-workflow):

> Anyone with write access to a repository can create, read, and use secrets.

Which means all developers with push access can read your secrets and write to your cache. Furthermore, malicious code submitted via a pull request can, once merged into `master`, reveal the tokens.


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
