import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { prependEach, nonEmptySplit } from './strings';
import { exit } from 'process';


async function run() {
  try {
    // inputs
    const name = core.getInput('name', { required: true });
    const file = core.getInput('file');
    const skipNixBuild = core.getInput('skipNixBuild');
    const attributes = core.getInput('attributes');
    const nixBuildArgs = core.getInput('nixBuildArgs');
    const signingKey = core.getInput('signingKey');
    const authToken = core.getInput('authToken')
    const cachixExecutable = "/nix/var/nix/profiles/per-user/runner/profile/bin/cachix";

    core.startGroup('Installing Cachix')
    await exec.exec('nix-env', ['-iA', 'cachix', '-f', 'https://cachix.org/api/v1/install']);
    core.endGroup()

    // for private caches
    if (authToken !== "") {
      await exec.exec(cachixExecutable, ['authtoken', authToken]);
    }

    core.startGroup(`Cachix: using ` + name);
    await exec.exec('cachix', ['use', name]);
    core.endGroup();

    if (signingKey !== "") {
      core.exportVariable('CACHIX_SIGNING_KEY', signingKey);
   
      if (skipNixBuild !== 'true') {
        core.startGroup(`Invoking nix-build`);

        // Remember existing store paths
        await exec.exec("sh", ["-c", `nix path-info --all | grep -v '\.drv$' > store-path-pre-build`]);

        let paths = '';
        const options = {
          listeners: {
            stdout: (data: Buffer) => {
              paths += data.toString();
            },
          }
        };
        const args = prependEach('-A', nonEmptySplit(attributes, /\s+/)).concat([file || "default.nix"]);
        const additionalArgs = nonEmptySplit(nixBuildArgs, /\s+/);
        await exec.exec('nix-build', additionalArgs.concat(args), options);
        core.endGroup()

        core.startGroup('Cachix: Pushing paths');
        await exec.exec("sh", ["-c", `nix path-info --all | grep -v '\.drv$' | cat - store-path-pre-build | sort | uniq -u  | ${cachixExecutable} push ${name}`]);
        core.endGroup();
      }
    }
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
    throw (error);
  }
}

run();
