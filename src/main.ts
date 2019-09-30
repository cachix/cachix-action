import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import {homedir} from 'os';
import {existsSync} from 'fs';
import {extrasperse} from './utils';

async function run() {
  try {
    // inputs
    const file = core.getInput('file');
    const attributes = core.getInput('attributes');
    const cachixPush = core.getInput('cachixPush', { required: true });
    const signingKey = core.getInput('signingKey', { required: true });

    // rest of the constants
    const home = homedir();
    const PATH = process.env.PATH;  
    const CERTS_PATH = home + '/.nix-profile/etc/ssl/certs/ca-bundle.crt';

    core.startGroup('Installing Nix')
    // TODO: retry due to all the things that go wrong
    const nixInstall = await tc.downloadTool('https://nixos.org/nix/install');
    await exec.exec("sh", [nixInstall]);
    core.exportVariable('PATH', `${PATH}:${home}/.nix-profile/bin`)
    core.endGroup()

    // macOS needs certificates hints
    if (existsSync(CERTS_PATH)) {
      core.exportVariable('NIX_SSL_CERT_FILE', CERTS_PATH);
    }

    core.startGroup('Installing Cachix')
    await exec.exec('nix-env', ['-iA', 'cachix', '-f', 'https://cachix.org/api/v1/install']);
    core.endGroup()

    core.startGroup(`Using Cachix ` + cachixPush);
    await exec.exec('cachix', ['use', cachixPush]);
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
    const args = extrasperse('-A', attributes.split(/\s/)).concat([file || "default.nix"]);
    await exec.exec('nix-build', args, options);
    core.endGroup()

    core.startGroup(`Pushing to Cachix ` + cachixPush);
    await exec.exec('cachix', ['push', cachixPush].concat(paths.split(/\s/).join(' ')));
    core.endGroup()
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
    throw(error);
  } 
}

run();
