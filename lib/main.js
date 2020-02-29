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
const strings_1 = require("./strings");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // inputs
            const name = core.getInput('name', { required: true });
            const file = core.getInput('file');
            const skipNixBuild = core.getInput('skipNixBuild');
            const attributes = core.getInput('attributes');
            const nixBuildArgs = core.getInput('nixBuildArgs');
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
                core.exportVariable('CACHIX_SIGNING_KEY', signingKey);
            }
            if (skipNixBuild !== 'true') {
                core.startGroup(`Invoking nix-build`);
                if (signingKey !== "") {
                    // Remember existing store paths
                    yield exec.exec("sh", ["-c", `nix path-info --all | grep -v '\.drv$' > store-path-pre-build`]);
                }
                let paths = '';
                const options = {
                    listeners: {
                        stdout: (data) => {
                            paths += data.toString();
                        },
                    }
                };
                const args = strings_1.prependEach('-A', strings_1.nonEmptySplit(attributes, /\s+/)).concat([file || "default.nix"]);
                const additionalArgs = strings_1.nonEmptySplit(nixBuildArgs, /\s+/);
                yield exec.exec('nix-build', additionalArgs.concat(args), options);
                core.endGroup();
                if (signingKey !== "") {
                    core.startGroup('Cachix: Pushing paths');
                    yield exec.exec("sh", ["-c", `nix path-info --all | grep -v '\.drv$' | cat - store-path-pre-build | sort | uniq -u  | ${cachixExecutable} push ${name}`]);
                    core.endGroup();
                }
            }
        }
        catch (error) {
            core.setFailed(`Action failed with error: ${error}`);
            throw (error);
        }
    });
}
run();
