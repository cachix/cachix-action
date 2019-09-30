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
const tc = __importStar(require("@actions/tool-cache"));
const os_1 = require("os");
const utils_1 = require("./utils");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const file = core.getInput('file');
            const attributes = core.getInput('attributes');
            const cachixPush = core.getInput('cachixPush', { required: true });
            console.log(`Installing Nix ...`);
            const nixInstall = yield tc.downloadTool('https://nixos.org/nix/install');
            yield exec.exec(nixInstall);
            // required for macos
            core.exportVariable('NIX_SSL_CERT_FILE', '/nix/var/nix/profiles/default/etc/ssl/certs/ca-bundle.crt');
            console.log(`Installing Cachix ...`);
            yield exec.exec(os_1.homedir() + '/.nix-profile/bin/nix-env', ['-iA', 'cachix', '-f', 'https://cachix.org/api/v1/install']);
            // TODO: cachix use --watch-store
            console.log(`Setting up cache ` + cachixPush + `...`);
            yield exec.exec(os_1.homedir() + '/.nix-profile/bin/cachix', ['use', cachixPush]);
            console.log(`Invoking nix-build...`);
            let paths = '';
            const options = {
                listeners: {
                    stdout: (data) => {
                        paths += data.toString();
                    },
                }
            };
            const args = ['-f', file || "default.nix"].concat(utils_1.extrasperse('-A', attributes.split(/\s/)));
            yield exec.exec(os_1.homedir() + '/.nix-profile/bin/nix-build', args, options);
            console.log(`Pushing to cache ` + cachixPush + `...`);
            yield exec.exec(os_1.homedir() + '/.nix-profile/bin/cachix', ['push', cachixPush].concat(paths.split(/\s/).join(' ')));
        }
        catch (error) {
            core.setFailed(`Action failed with error: ${error}`);
            throw (error);
        }
    });
}
run();
