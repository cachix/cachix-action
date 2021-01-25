import * as core from '@actions/core';
import { execFileSync } from 'child_process';
import * as coreCommand from '@actions/core/lib/command'
import * as exec from '@actions/exec';

export const IsPost = !!process.env['STATE_isPost']

// inputs
const name = core.getInput('name', { required: true });
const extraPullNames = core.getInput('extraPullNames');
const signingKey = core.getInput('signingKey');
const authToken = core.getInput('authToken')
const skipPush = core.getInput('skipPush');
const cachixExecutable = process.env.HOME + '/.nix-profile/bin/cachix';
const installCommand =
  core.getInput('installCommand') ||
  "nix-env --quiet -j8 -iA cachix -f https://cachix.org/api/v1/install";

async function setup() {
  try {
    core.startGroup('Cachix: installing')
    await exec.exec('bash', ['-c', installCommand]);
    core.endGroup()

    // for managed signing key and private caches
    if (authToken !== "") {
      await exec.exec(cachixExecutable, ['authtoken', authToken]);
    }

    core.startGroup(`Cachix: using cache ` + name);
    await exec.exec('cachix', ['use', name]);
    core.endGroup();

    if (extraPullNames != "") {
      core.startGroup(`Cachix: using extra caches ` + extraPullNames);
      const extraPullNameList = extraPullNames.split(',');
      for (let itemName of extraPullNameList) {
        const trimmedItemName = itemName.trim();
        await exec.exec('cachix', ['use', trimmedItemName]);
      }
      core.endGroup();
    }

    if (signingKey !== "") {
      core.exportVariable('CACHIX_SIGNING_KEY', signingKey);
    }
    // Remember existing store paths
    await exec.exec("sh", ["-c", `${__dirname}/list-nix-store.sh > /tmp/store-path-pre-build`]);
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
    throw (error);
  }
}

async function upload() {
  try {
    if (skipPush === 'true') {
      core.info('Pushing is disabled as skipPush is set to true');
    } else if (signingKey !== "" || authToken !== "") {
      core.startGroup('Cachix: pushing paths');
      execFileSync(`${__dirname}/push-paths.sh`, [cachixExecutable, name], { stdio: 'inherit' });
      core.endGroup();
    } else {
      core.info('Pushing is disabled as signing key nor auth token are set.');
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
    throw (error);
  }
}

// Main
if (!IsPost) {
  // Publish a variable so that when the POST action runs, it can determine it should run the cleanup logic.
  // This is necessary since we don't have a separate entry point.
  coreCommand.issueCommand('save-state', {name: 'isPost'}, 'true')
  setup()
} else {
  // Post
  upload()
}
