import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import {homedir, userInfo} from 'os';
import {existsSync} from 'fs';
import {extrasperse, saneSplit} from './utils';

async function run() {
  try {
    // inputs
    const file = core.getInput('file');
    const attributes = core.getInput('attributes');
    const cachixPush = core.getInput('cachixPush', { required: true });
    const signingKey = core.getInput('signingKey', { required: true });

    // rest of the constants
    const home = homedir();
    const {username} = userInfo();
    const PATH = process.env.PATH;  
    const CERTS_PATH = home + '/.nix-profile/etc/ssl/certs/ca-bundle.crt';

    core.startGroup('Installing Nix')
    // TODO: retry due to all the things that go wrong
    const nixInstall = await tc.downloadTool('https://nixos.org/nix/install');
    await exec.exec("sh", [nixInstall]);
    core.exportVariable('PATH', `${PATH}:${home}/.nix-profile/bin`)
    core.exportVariable('NIX_PATH', `/nix/var/nix/profiles/per-user/${username}/channels`)
    core.endGroup()

    // macOS needs certificates hints
    if (existsSync(CERTS_PATH)) {
      core.exportVariable('NIX_SSL_CERT_FILE', CERTS_PATH);
    }

    core.startGroup('Installing Cachix')
    // TODO: use cachix 0.3.4 once released
    //await exec.exec('nix-env', ['-iA', 'cachix', '-f', 'https://cachix.org/api/v1/install']);
    await exec.exec(
      'nix-env',
      [ '-if'
      , 'https://github.com/cachix/cachix/tarball/empty-stdin'
      , '--substituters'
      , 'https://cachix.cachix.org'
      , '--trusted-public-keys'
      , 'cachix.cachix.org-1:eWNHQldwUO7G2VkjpnjDbWwy4KQ/HNxht7H4SSoMckM='
      ])
    core.endGroup()

    core.startGroup(`Cachix: using ` + cachixPush);
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
    const args = extrasperse('-A', saneSplit(attributes, /\s/)).concat([file || "default.nix"]);
    await exec.exec('nix-build', args, options);
    core.endGroup()

    core.startGroup(`Cachix: pushing to ` + cachixPush);
    await exec.exec('cachix', ['push', cachixPush].concat(saneSplit(paths, /\s/).join(' ')));
    core.endGroup()
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
    throw(error);
  } 
}

run();
