import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Tail } from 'tail';
import which from 'which';
import semver from 'semver';

// inputs
const name = core.getInput('name', { required: true });
const extraPullNames = core.getInput('extraPullNames');
const signingKey = core.getInput('signingKey');
const authToken = core.getInput('authToken')
const skipPush = core.getInput('skipPush');
const pathsToPush = core.getInput('pathsToPush');
const pushFilter = core.getInput('pushFilter');
const cachixArgs = core.getInput('cachixArgs');
const skipAddingSubstituter = core.getInput('skipAddingSubstituter');
const useDaemon = (core.getInput('useDaemon') === 'true') ? true : false;
const cachixBinInput = core.getInput('cachixBin');
const installCommand =
  core.getInput('installCommand') ||
  "nix-env --quiet -j8 -iA cachix -f https://cachix.org/api/v1/install";

const ENV_CACHIX_DAEMON_DIR = 'CACHIX_DAEMON_DIR';

async function setup() {
  try {
    let cachixBin = cachixBinInput;

    if (cachixBin !== "") {
      core.debug(`Using Cachix executable from input: ${cachixBin}`);
    } else if (useDaemon) {
      // TODO: remove once stable and the daemon has been released
      cachixBin = await execToVariable(
        'nix',
        [
          'build',
          '--show-trace',
          '--print-out-paths',
          '--accept-flake-config',
          '--extra-experimental-features',
          'nix-command flakes',
          'github:cachix/cachix/feature/daemon',
        ],
      ).then((storePath) => `${storePath.trimEnd()}/bin/cachix`);
      core.info(`Daemon mode is enabled. Using the latest Cachix executable from github:cachix/cachix/feature/daemon: ${cachixBin}`);
    } else {
      // Find the Cachix executable in PATH
      let resolvedCachixBin = which.sync('cachix', { nothrow: true });

      if (resolvedCachixBin) {
        core.debug(`Found Cachix executable: ${cachixBin}`);
        cachixBin = resolvedCachixBin;
      } else {
        core.startGroup('Cachix: installing')
        await exec.exec('bash', ['-c', installCommand]);
        cachixBin = which.sync('cachix');
        core.debug(`Installed Cachix executable: ${cachixBin}`);
        core.endGroup()
      }
    }

    core.saveState('cachixBin', cachixBin);

    // Print the executable version.
    // Also verifies that the binary exists and is executable.
    core.startGroup('Cachix: checking version')
    let cachixVersion =
      await execToVariable(cachixBin, ['--version'])
        .then((res) => semver.coerce(res.split(" ")[1]));
    core.endGroup()

    // for managed signing key and private caches
    if (authToken !== "") {
      await exec.exec(cachixBin, ['authtoken', authToken]);
    }

    if (skipAddingSubstituter === 'true') {
      core.info('Not adding Cachix cache to substituters as skipAddingSubstituter is set to true')
    } else {
      core.startGroup(`Cachix: using cache ` + name);
      await exec.exec(cachixBin, ['use', name]);
      core.endGroup();
    }

    if (extraPullNames != "") {
      core.startGroup(`Cachix: using extra caches ` + extraPullNames);
      const extraPullNameList = extraPullNames.split(',');
      for (let itemName of extraPullNameList) {
        const trimmedItemName = itemName.trim();
        await exec.exec(cachixBin, ['use', trimmedItemName]);
      }
      core.endGroup();
    }

    if (signingKey !== "") {
      core.exportVariable('CACHIX_SIGNING_KEY', signingKey);
    }

    // TODO: update the final release bounds
    let daemonSupported = (cachixVersion) ? semver.gte(cachixVersion, '1.6.0') : false;
    core.saveState('daemonSupported', daemonSupported);

    if (useDaemon && !daemonSupported) {
      core.warning(`Cachix Daemon is not supported by this version of Cachix (${cachixVersion}). Ignoring the 'useDaemon' option.`)
    }

    if (useDaemon && daemonSupported) {
      const tmpdir = process.env['RUNNER_TEMP'] ?? os.tmpdir();
      const daemonDir = await fs.mkdtemp(path.join(tmpdir, 'cachix-daemon-'));
      const daemonLog = await fs.open(`${daemonDir}/daemon.log`, 'a');

      const daemon = spawn(
        cachixBin,
        [
          'daemon', 'run',
          '--socket', `${daemonDir}/daemon.sock`,
          name,
        ],
        {
          stdio: ['ignore', daemonLog.fd, daemonLog.fd],
          detached: true,
        }
      );

      daemon.on('error', (err) => {
        core.error(`Cachix Daemon failed: ${err}`);
      });

      if (typeof daemon.pid === 'number') {
        const pid = daemon.pid.toString();
        core.debug(`Spawned Cachix Daemon with PID: ${pid}`);
        await fs.writeFile(pidFilePath(daemonDir), pid);
      } else {
        core.error('Failed to spawn Cachix Daemon');
        return;
      }

      const postBuildHookScriptPath = `${daemonDir}/post-build-hook.sh`;
      await fs.writeFile(postBuildHookScriptPath, `
        #!/bin/sh

        set -eu
        set -x # remove in production
        set -f # disable globbing
        export IFS=''

        exec ${cachixBin} daemon push \
          --socket ${daemonDir}/daemon.sock \
          $OUT_PATHS
        `,
        // Make the post-build-hook executable
        { mode: 0o755 }
      );
      core.debug(`Wrote post-build-hook script to ${postBuildHookScriptPath}`);

      const postBuildHookConfigPath = `${daemonDir}/nix.conf`;
      await fs.writeFile(
        postBuildHookConfigPath,
        `post-build-hook = ${postBuildHookScriptPath}`
      );
      core.debug(`Wrote post-build-hook nix config to ${postBuildHookConfigPath}`);

      // Register the post-build-hook

      // From the nix.conf manual:
      //
      // If NIX_USER_CONF_FILES is set, then each path separated by : will be loaded in  reverse order.
      //
      // Otherwise  it  will  look for nix / nix.conf files in XDG_CONFIG_DIRS and XDG_CONFIG_HOME.If
      // unset, XDG_CONFIG_DIRS defaults to / etc / xdg, and XDG_CONFIG_HOME defaults  to  $HOME /.config
      // as per XDG Base Directory Specification.
      //
      // The system nix.conf ($NIX_CONF_DIR/nix.conf) is always loaded first.
      //
      // If the user has overridden the default nix.conf locations with NIX_USER_CONF_DIR, we reuse it and prepend out own config.
      const existingUserConfEnv = process.env['NIX_USER_CONF_FILES'] ?? '';
      let nixUserConfFilesEnv = '';

      if (existingUserConfEnv) {
        nixUserConfFilesEnv = postBuildHookConfigPath + ':' + existingUserConfEnv;
      } else {
        const userConfigFiles = getUserConfigFiles();
        nixUserConfFilesEnv = [postBuildHookConfigPath, ...userConfigFiles].filter((x) => x !== '').join(':');
      }

      core.exportVariable(
        'NIX_USER_CONF_FILES',
        nixUserConfFilesEnv,
      );
      core.debug(`Registered post-build-hook nix config in NIX_USER_CONF_FILES=${process.env['NIX_USER_CONF_FILES']}`);

      // Expose the daemon directory for the post action hook
      core.exportVariable(ENV_CACHIX_DAEMON_DIR, daemonDir);

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

  const cachixBin = core.getState('cachixBin');
  const daemonSupported = core.getState('daemonSupported');

  try {
    if (skipPush === 'true') {
      core.info('Pushing is disabled as skipPush is set to true');
    } else if (signingKey !== "" || authToken !== "") {
      if (useDaemon && daemonSupported) {
        const daemonDir = process.env[ENV_CACHIX_DAEMON_DIR];

        if (!daemonDir) {
          core.debug('Cachix Daemon not started. Skipping push');
          return;
        }

        const daemonPid = parseInt(await fs.readFile(pidFilePath(daemonDir), { encoding: 'utf8' }));

        if (!daemonPid) {
          core.error('Failed to find PID of Cachix Daemon. Skipping push.');
          return;
        }

        core.debug(`Found Cachix daemon with pid ${daemonPid}`);

        let daemonLog = new Tail(`${daemonDir}/daemon.log`, { fromBeginning: true });
        daemonLog.on('line', (line) => core.info(line));

        try {
          core.debug('Waiting for Cachix daemon to exit...');
          await exec.exec(cachixBin, ["daemon", "stop", "--socket", `${daemonDir}/daemon.sock`]);
        } finally {
          // Wait a bit for the logs to flush through
          await new Promise((resolve) => setTimeout(resolve, 1000));
          daemonLog.unwatch();
        }
      } else {
        await exec.exec(`${__dirname}/push-paths.sh`, [cachixBin, cachixArgs, name, pathsToPush, pushFilter]);
      }
    } else {
      core.info('Pushing is disabled as signingKey nor authToken are set (or are empty?) in your YAML file.');
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
  }

  core.endGroup();
}

function pidFilePath(daemonDir: string): string {
  return path.join(daemonDir, 'daemon.pid');
}

// Exec a command and return the stdout as a string.
async function execToVariable(command: string, args: string[]): Promise<string> {
  let res = '';

  const options = {
    listeners: {
      stdout: (data: Buffer) => {
        res += data.toString();
      },
    },
  };

  return exec.exec(command, args, options).then(() => res);
}

// Get the paths to the user config files.
function getUserConfigFiles(): string[] {
  const userConfigDirs = getUserConfigDirs();
  return userConfigDirs.map((dir) => `${dir}/nix/nix.conf`);
}

// Get the user config directories.
function getUserConfigDirs(): string[] {
  const xdgConfigHome = process.env['XDG_CONFIG_HOME'] ?? `${os.homedir()}/.config`;
  const xdgConfigDirs = (process.env['XDG_CONFIG_DIRS'] ?? '/etc/xdg').split(':');
  return [xdgConfigHome, ...xdgConfigDirs];
}

const isPost = !!core.getState('isPost');

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
