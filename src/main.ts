import * as core from '@actions/core';
import * as coreCommand from '@actions/core/lib/command'
import * as exec from '@actions/exec';

export const IsPost = !!process.env['STATE_isPost']

// inputs
const name = core.getInput('name', { required: true });
const signingKey = core.getInput('signingKey');
const authToken = core.getInput('authToken')
const skipPush = core.getInput('skipPush');
const cachixExecutable = '/nix/var/nix/profiles/per-user/runner/profile/bin/cachix';

async function setup() {
  try {
    core.startGroup('Cachix: installing')
    await exec.exec('nix-env', ['--quiet', '-iA', 'cachix', '-f', 'https://cachix.org/api/v1/install']);
    core.endGroup()

    // for private caches
    if (authToken !== "") {
      await exec.exec(cachixExecutable, ['authtoken', authToken]);
    }

    core.startGroup(`Cachix: using cache ` + name);
    await exec.exec('cachix', ['use', name]);
    core.endGroup();

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
      await exec.exec("sh", ["-c", `nix path-info --all | grep -v '\.drv$' | cat - /tmp/store-path-pre-build | sort | uniq -u  | ${cachixExecutable} push ${name}`]);
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
