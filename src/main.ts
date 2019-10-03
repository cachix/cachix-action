import * as core from '@actions/core';
import * as exec from '@actions/exec';
import {extrasperse, saneSplit} from './strings';

async function run() {
  try {
    // inputs
    const file = core.getInput('file');
    const attributes = core.getInput('attributes');
    const push = core.getInput('push', { required: true });
    const signingKey = core.getInput('signingKey', { required: true });
    const authToken = core.getInput('authToken')

    core.startGroup('Installing Cachix')
    // TODO: use cachix official installation link
    await exec.exec('nix-env', ['-iA', 'cachix', '-f', 'https://github.com/NixOS/nixpkgs/tarball/ab5863afada3c1b50fc43bf774b75ea71b287cde']);
    core.endGroup()

    // for private caches
    if (authToken !== "") {
      await exec.exec('cachix', ['authtoken', authToken]);
    }

    core.startGroup(`Cachix: using ` + push);
    await exec.exec('cachix', ['use', push]);
    core.endGroup()

    core.exportVariable('CACHIX_SIGNING_KEY', signingKey)
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
    const args = extrasperse('-A', saneSplit(attributes, /\s/)).concat([file || "default.nix"]);
    await exec.exec('nix-build', args, options);
    core.endGroup()

    core.startGroup(`Cachix: pushing to ` + push);
    await exec.exec('cachix', ['push', push].concat(saneSplit(paths, /\s/).join(' ')));
    core.endGroup()
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
    throw(error);
  } 
}

run();
