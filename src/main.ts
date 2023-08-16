import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Tail } from 'tail';
import which from 'which';

// inputs
const name = core.getInput('name', { required: true });
const extraPullNames = core.getInput('extraPullNames');
const signingKey = core.getInput('signingKey');
const authToken = core.getInput('authToken')
const skipPush = core.getInput('skipPush');
const pathsToPush = core.getInput('pathsToPush');
const pushFilter = core.getInput('pushFilter');
const cachixArgs = core.getInput('cachixArgs');
const installCommand =
  core.getInput('installCommand') ||
  "nix-env --quiet -j8 -iA cachix -f https://cachix.org/api/v1/install";
const skipAddingSubstituter = core.getInput('skipAddingSubstituter');
const useDaemon = (core.getInput('useDaemon') === 'true') ? true : false;

const ENV_CACHIX_DAEMON_DIR = 'CACHIX_DAEMON_DIR';

async function setup() {
  try {
    if (!which.sync('cachix', { nothrow: true })) {
      core.startGroup('Cachix: installing')
      await exec.exec('bash', ['-c', installCommand]);
      core.endGroup()
    }

    core.startGroup('Cachix: checking version')
    await exec.exec('cachix', ['--version']);
    core.endGroup()

    // for managed signing key and private caches
    if (authToken !== "") {
      await exec.exec('cachix', ['authtoken', authToken]);
    }

    if (skipAddingSubstituter === 'true') {
      core.info('Not adding Cachix cache to substituters as skipAddingSubstituter is set to true')
    } else {
      core.startGroup(`Cachix: using cache ` + name);
      await exec.exec('cachix', ['use', name]);
      core.endGroup();
    }

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

    if (useDaemon) {
      const tmpdir = process.env['RUNNER_TEMP'] || os.tmpdir();
      const daemonDir = await fs.mkdtemp(path.join(tmpdir, 'cachix-daemon-'));
      const daemonLog = await fs.open(`${daemonDir}/daemon.log`, 'a');

      const daemon = spawn(
        'cachix',
        [
          'daemon', 'run',
          '--socket', `${daemonDir}/daemon.sock`,
        ],
        {
          stdio: ['ignore', daemonLog.fd, daemonLog.fd],
          detached: true,
        }
      );

      if (daemon.pid !== undefined) {
        await fs.writeFile(`${daemonDir}/daemon.pid`, daemon.pid.toString());
      }

      const cachix = which.sync('cachix');
      core.debug(`Found cachix executable: ${cachix}`);

      const postBuildHookPath = `${daemonDir}/cachix-post-build-hook.sh`;
      await fs.writeFile(postBuildHookPath, `
      #!/bin/sh

      set -eu
      set -x # remove in production
      set -f # disable globbing
      export IFS=''

      exec ${cachix} daemon push \
        --socket ${daemonDir}/daemon.sock \
        ${name} $OUT_PATHS
     `);

      // Make the post-build-hook executable
      fs.chmod(postBuildHookPath, 0o755);

      // Register the post-build-hook
      await fs.mkdir(`${process.env['HOME']}/.config/nix`, { recursive: true });
      const nixConf = await fs.open(`${process.env['HOME']}/.config/nix/nix.conf`, 'a');
      fs.writeFile(nixConf, `
      post-build-hook = ${postBuildHookPath}
      `);
      await nixConf.close();

      core.exportVariable(ENV_CACHIX_DAEMON_DIR, daemonDir);

      core.debug(`Cachix daemon started with pid ${daemon.pid}`)

      // Detach the daemon process from the current process
      daemon.unref();
    } else {
      // Remember existing store paths
      await exec.exec("sh", ["-c", `${__dirname}/list-nix-store.sh > /tmp/store-path-pre-build`]);
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
  }
}

async function upload() {
  core.startGroup('Cachix: push');

  try {
    if (skipPush === 'true') {
      core.info('Pushing is disabled as skipPush is set to true');
    } else if (signingKey !== "" || authToken !== "") {
      if (useDaemon) {
        const daemonDir = process.env[ENV_CACHIX_DAEMON_DIR];
        const daemonPid = parseInt(await fs.readFile(`${daemonDir}/daemon.pid`, 'utf8'));
        core.debug(`Found Cachix daemon with pid ${daemonPid}`);

        let daemonLog = new Tail(`${daemonDir}/daemon.log`, { fromBeginning: true });
        daemonLog.on('line', (line) => core.info(line));

        // Can't use the socket because we currently close it before the daemon exits
        core.debug('Waiting for Cachix daemon to exit...');
        await exec.exec("cachix", ["daemon", "stop", "--socket", `${daemonDir}/daemon.sock`]);

        // Wait a bit for the logs to flush through
        await new Promise((resolve) => setTimeout(resolve, 1000));

        daemonLog.unwatch();
      } else {
        await exec.exec(`${__dirname}/push-paths.sh`, ['cachix', cachixArgs, name, pathsToPush, pushFilter]);
      }
    } else {
      core.info('Pushing is disabled as signingKey nor authToken are set (or are empty?) in your YAML file.');
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
  }

  core.endGroup();
}

const isPost = !!process.env['STATE_isPost']

// Main
if (!isPost) {
  // Publish a variable so that when the POST action runs, it can determine it should run the cleanup logic.
  // This is necessary since we don't have a separate entry point.
  core.saveState('isPost', 'true');
  setup()
  core.debug('Setup done');
} else {
  // Post
  upload()
}
