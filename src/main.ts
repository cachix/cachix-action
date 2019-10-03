import * as core from '@actions/core';
import * as exec from '@actions/exec';
import {prependEach, nonEmptySplit} from './strings';

async function run() {
  try {
    // inputs
    const file = core.getInput('file');
    const attributes = core.getInput('attributes');
    const name = core.getInput('name', { required: true });
    const signingKey = core.getInput('signingKey');
    const authToken = core.getInput('authToken')

    core.startGroup('Installing Cachix')
    // TODO: use cachix official installation link
    await exec.exec('nix-env', ['-iA', 'cachix', '-f', 'https://github.com/NixOS/nixpkgs/tarball/ab5863afada3c1b50fc43bf774b75ea71b287cde']);
    core.endGroup()

    // for private caches
    if (authToken !== "") {
      await exec.exec('cachix', ['authtoken', authToken]);
    }

    core.startGroup(`Cachix: using ` + name);
    await exec.exec('cachix', ['use', name]);
    core.endGroup()

    if (signingKey !== "") {
      core.exportVariable('CACHIX_SIGNING_KEY', signingKey);
    }
    // TODO: cachix use --watch-store

    core.startGroup(`Invoking nix-build`);
    let paths = '';
    const options = {
      listeners: {
        stdout: (data: Buffer) => {
          paths += data.toString();
        },
      }
    };
    const args = prependEach('-A', nonEmptySplit(attributes, /\s+/)).concat([file || "default.nix"]);
    await exec.exec('nix-build', args, options);
    core.endGroup()

    // Needed for PRs
    if (signingKey !== "") {
      core.startGroup(`Cachix: pushing to ` + name);
      await exec.exec('cachix', ['push', name].concat(nonEmptySplit(paths, /\s+/)));
      core.endGroup()
    } else {
      console.log("No signing key. Assuming it's a pull request, nothing will be pushed.");
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
    throw(error);
  } 
}

run();
