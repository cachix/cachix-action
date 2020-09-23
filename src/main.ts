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
const cachixExecutable = '/nix/var/nix/profiles/per-user/runner/profile/bin/cachix';
const installCommand =
  core.getInput('installCommand') ||
  "nix-env --quiet -j8 -iA cachix -f https://cachix.org/api/v1/install";

async function setup() {
  try {
    core.startGroup('Cachix: installing')
    await exec.exec('bash', ['-c', installCommand]);
    core.endGroup()

    // for private caches
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
      // Remember existing store paths
      await exec.exec("sh", ["-c", `nix path-info --all | grep -v '\.drv$' > /tmp/store-path-pre-build`]);
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
    throw (error);
  }
}

async function upload() {
  try {
    if (signingKey !== "" && skipPush !== 'true') {
      core.startGroup('Cachix: pushing paths');
      execFileSync(`${__dirname}/push-paths.sh`, [cachixExecutable, name], { stdio: 'inherit' });
      core.endGroup();
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
