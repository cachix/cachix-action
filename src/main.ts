import * as core from '@actions/core';
import * as exec from '@actions/exec';
import {homedir} from 'os';
import {extrasperse} from './utils';

async function run() {
  try {
    const file = core.getInput('file');
    const attributes = core.getInput('attributes');
    const cachixPush = core.getInput('cachixPush', { required: true });

    // required for macos
    core.exportVariable('NIX_SSL_CERT_FILE', '/nix/var/nix/profiles/default/etc/ssl/certs/ca-bundle.crt');

    console.log(`Installing Cachix ...`);
    await exec.exec(homedir() + '/.nix-profile/bin/nix-env', ['-iA', 'cachix', '-f', 'https://cachix.org/api/v1/install']);

    // TODO: cachix use --watch-store

    console.log(`Setting up cache ` + cachixPush + `...`);
    await exec.exec(homedir() + '/.nix-profile/bin/cachix', ['use', cachixPush]);

    console.log(`Invoking nix-build...`);
    let paths = '';
    const options = {
      listeners: {
        stdout: (data: Buffer) => {
          paths += data.toString();
        },
      }
    };
    const args = ['-f', file || "default.nix"].concat(extrasperse('-A', attributes.split(/\s/)));
    await exec.exec(homedir() + '/.nix-profile/bin/nix-build', args, options);

    console.log(`Pushing to cache ` + cachixPush + `...`);
    await exec.exec(homedir() + '/.nix-profile/bin/cachix', ['push', cachixPush].concat(paths.split(/\s/).join(' ')));
  } catch (error) {
    core.setFailed(`Action faield with error: ${error}`);
    throw(error);
  } 
}

run();
