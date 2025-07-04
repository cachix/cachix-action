# cachix-action

![github actions badge](https://github.com/cachix/cachix-action/workflows/cachix-action%20test/badge.svg)

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

| Input                   | Description                                                                                                         | Required                                                                                                                                                       | Default |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- |
| `name`                  | Name of a cachix cache to push and pull/substitute                                                                  | ✓                                                                                                                                                              |         |
| `extraPullNames`        | Comma-separated list of names for extra cachix caches to pull/substitute                                            |                                                                                                                                                                |         |
| `authToken`             | Authentication token for Cachix, needed for private cache access or to push using an Auth Token                     |                                                                                                                                                                |         |
| `signingKey`            | Signing key secret retrieved after creating binary cache on https://cachix.org                                      |                                                                                                                                                                |         |
| `skipPush`              | Set to true to disable pushing build results to the cache                                                           |                                                                                                                                                                | `false` |
| `pathsToPush`           | Whitespace-separated list of paths to push. Leave empty to push every build result.                                 |                                                                                                                                                                |         |
| `pushFilter`            | Ignored if pathsToPush is set. Regular expression to exclude derivations for the cache push, for example "(-source$ | nixpkgs\.tar\.gz$)". Warning: this filter does not guarantee it will not get pushed in case the path is part of the closure of something that will get pushed. |         |     |
| `cachixArgs`            | Extra command-line arguments to pass to cachix. If empty, defaults to -j8                                           |                                                                                                                                                                |         |
| `skipAddingSubstituter` | Set to true to skip adding cachix cache as a substitute                                                             |                                                                                                                                                                | `false` |
| `useDaemon`             | Push store paths to the cache as they're built with the Cachix Daemon                                               |                                                                                                                                                                | `true`  |
| `cachixBin`             | Provide a custom path to the cachix binary                                                                          |                                                                                                                                                                |         |
| `installCommand`        | Override the default cachix installation method                                                                     |                                                                                                                                                                |         |

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

Install the dependencies

```bash
$ pnpm install
```

Build action

```bash
$ pnpm build
```
