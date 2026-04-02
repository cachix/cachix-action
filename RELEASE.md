# Release

1. Create and push a new tag:

   ```console
   git tag v17
   git push origin v17
   ```

2. Wait for CI to pass.

3. [Create a release](https://github.com/cachix/cachix-action/releases/new) for the new tag.

4. Move the major version tag to the latest release:

   ```console
   git tag -fa v17
   git push origin v17 --force
   ```
