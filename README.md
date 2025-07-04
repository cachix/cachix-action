# cachix-action

[![CI](https://github.com/cachix/cachix-action/workflows/cachix-action%20test/badge.svg)](https://github.com/cachix/cachix-action/actions)

Nix enables Continuous Integration (CI) to build and cache developer environments for every project and branch using binary caches.
With [Cachix](https://cachix.org), you can significantly reduce build times by ensuring packages are built only once and shared across all developers and CI runs.

After each job, newly built packages are pushed to your binary cache.
Before each job, packages to be built are first downloaded (if they exist) from your binary cache.

## Tutorial

Follow the long-form tutorial on [Continuous Integration with GitHub Actions](https://nix.dev/tutorials/nixos/continuous-integration-github-actions) from [nix.dev](https://nix.dev/).

## Examples

### Read-only cache

```yaml
- uses: cachix/cachix-action@v15
  with:
    name: mycache
```

### Write cache with auth token

```yaml
- uses: cachix/cachix-action@v15
  with:
    name: mycache
    authToken: "${{ secrets.CACHIX_AUTH_TOKEN }}"
```

### Write cache with signing key

```yaml
- uses: cachix/cachix-action@v15
  with:
    name: mycache
    authToken: "${{ secrets.CACHIX_AUTH_TOKEN }}"
    signingKey: "${{ secrets.CACHIX_SIGNING_KEY }}"
```

## Options

### Cache Configuration

| Input            | Description                                                                     | Required | Default |
| ---------------- | ------------------------------------------------------------------------------- | -------- | ------- |
| `name`           | Name of the Cachix cache to pull (substitute) from and optionally push to       | ✓        |         |
| `extraPullNames` | Comma-separated list of additional Cachix cache names to pull (substitute) from |          |         |

### Authentication

| Input        | Description                                                                                        | Required | Default |
| ------------ | -------------------------------------------------------------------------------------------------- | -------- | ------- |
| `authToken`  | Authentication token for Cachix, required for private cache access or to push to any cache         |          |         |
| `signingKey` | Private signing key for self-signed caches, used in addition to the auth token to sign store paths |          |         |

### Push Configuration

| Input         | Description                                                                                                                                                                                                                  | Required | Default |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| `skipPush`    | Set to `true` to only pull from the cache without pushing any build results                                                                                                                                                  |          | `false` |
| `useDaemon`   | Use Cachix daemon mode to push store paths as they're built via post-build hooks. See [Push modes](#push-modes) for more information                                                                                         |          | `true`  |
| `pathsToPush` | Whitespace-separated list of specific store paths to push. Leave empty to push all build results                                                                                                                             |          |         |
| `pushFilter`  | Regular expression to exclude derivations from being pushed, for example `"(-source$ \| nixpkgs\.tar\.gz$)"`. Ignored if `pathsToPush` is set. Warning: paths may still be pushed if they are part of another path's closure |          |

### Advanced Options

| Input                   | Description                                                                                             | Required | Default |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | -------- | ------- |
| `skipAddingSubstituter` | Set to `true` to skip adding the cache as a Nix substituter                                             |          | `false` |
| `cachixArgs`            | Additional command-line arguments to pass to Cachix commands. Defaults to `-j8` for parallel processing |          |         |
| `cachixBin`             | Custom path to the Cachix binary if not using the default installation                                  |          |         |
| `installCommand`        | Custom command to install Cachix instead of the default installation method                             |          |         |

## Push modes

The action can push in two modes: daemon mode with post-build hooks and store scan.
This can be controlled with the `useDaemon` option.

### Daemon mode (default)

The daemon registers a [post-build hook](https://nixos.org/manual/nix/stable/command-ref/conf-file.html#conf-post-build-hook) with Nix.
Newly built store paths are pushed to the cache as they're built.
The limitation is that Nix does not trigger the hook for substituted paths.

> [!NOTE]
> Post-build hooks may be run as root if the nix-daemon is root.
> This can lead to unexpected privilege escalation if you run untrusted code.
> For common CI scenarios (hosted GitHub Actions), this is typically not an issue, but you should evaluate the risks for your infrastructure.
>
> Follow https://github.com/NixOS/nix/issues/5208 for updates on non-root nix-daemon support.

### Store scan mode

The store scan method looks for differences in the store at the file system level.
It will capture all store paths, including those substituted.

> [!NOTE]
> This is not a safe method for multi-user stores.
> You can inadvertently upload and leak store paths built by other users.
> Prefer the daemon mode in such cases.

## Security

Cachix tokens and signing keys provide full read and/or write access to your caches.

[GitHub Actions allows](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions#accessing-your-secrets) anyone who can edit workflow files to read secrets.

This means developers with write access can read your secrets and access your cache.

Forked pull requests cannot access secrets, so they can only read from public caches.

Malicious code merged from forks can reveal your tokens.

## Development

Enter the development shell with [devenv](https://devenv.sh).

```console
devenv shell
```

Install the dependencies.

```console
pnpm install
```

Build the action.

```console
pnpm build
```

The devenv shell will install git-hooks that must be run before each commit.
