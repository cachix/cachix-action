"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const os_1 = require("os");
const strings_1 = require("./strings");
function home() {
    if (os_1.type() == "Darwin") {
        return "/Users/runner";
    }
    else {
        return "/home/runner";
    }
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // inputs
            const file = core.getInput('file');
            const skipNixBuild = core.getInput('skipNixBuild');
            const attributes = core.getInput('attributes');
            const name = core.getInput('name', { required: true });
            const signingKey = core.getInput('signingKey');
            const authToken = core.getInput('authToken');
            const cachixExecutable = "/nix/var/nix/profiles/per-user/runner/profile/bin/cachix";
            core.startGroup('Installing Cachix');
            yield exec.exec('nix-env', ['-iA', 'cachix', '-f', 'https://cachix.org/api/v1/install']);
            core.endGroup();
            // for private caches
            if (authToken !== "") {
                yield exec.exec(cachixExecutable, ['authtoken', authToken]);
            }
            core.startGroup(`Cachix: using ` + name);
            yield exec.exec('cachix', ['use', name]);
            core.endGroup();
            if (signingKey !== "") {
                core.startGroup('Cachix: Configuring push');
                // needed to discover auth token
                yield exec.exec("sudo", ["sh", "-c", `echo export HOME=${home()} > /etc/nix/cachix-push.sh`]);
                yield exec.exec("sudo", ["sh", "-c", `echo export CACHIX_SIGNING_KEY=${signingKey} >> /etc/nix/cachix-push.sh`]);
                // needed to for nix-store
                yield exec.exec("sudo", ["sh", "-c", `echo export PATH=\\$PATH:/nix/var/nix/profiles/default/bin:/nix/var/nix/profiles/per-user/runner/profile/bin >> /etc/nix/cachix-push.sh`]);
                yield exec.exec("sudo", ["sh", "-c", `echo ${cachixExecutable} push ${name} \\$OUT_PATHS >> /etc/nix/cachix-push.sh`]);
                yield exec.exec("sudo", ["sh", "-c", `chmod +x /etc/nix/cachix-push.sh`]);
                // enable post-build-hook
                yield exec.exec("sudo", ["sh", "-c", `echo post-build-hook = /etc/nix/cachix-push.sh >> /etc/nix/nix.conf`]);
                core.exportVariable('CACHIX_SIGNING_KEY', signingKey);
                // Ignore reloading failures as Nix might be installed in single-user mode (install-nix-action version 5 or lower)
                const options = { ignoreReturnCode: true };
                // Reload nix-daemon
                if (os_1.type() == "Darwin") {
                    // kickstart awaits nix-daemon to get up again
                    yield exec.exec("sudo", ["launchctl", "kickstart", "-k", "system/org.nixos.nix-daemon"], options);
                }
                else {
                    yield exec.exec("sudo", ["pkill", "-HUP", "nix-daemon"], options);
                }
                core.endGroup();
            }
            if (skipNixBuild !== 'true') {
                core.startGroup(`Invoking nix-build`);
                let paths = '';
                const options = {
                    listeners: {
                        stdout: (data) => {
                            paths += data.toString();
                        },
                    }
                };
                const args = strings_1.prependEach('-A', strings_1.nonEmptySplit(attributes, /\s+/)).concat([file || "default.nix"]);
                yield exec.exec('nix-build', args, options);
                core.endGroup();
            }
        }
        catch (error) {
            core.setFailed(`Action failed with error: ${error}`);
            throw (error);
        }
    });
}
run();
