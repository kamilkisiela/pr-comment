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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const axios_1 = __importDefault(require("axios"));
const fs_1 = require("fs");
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
const url = `https://api.github.com/repos/${owner}/${repo}`;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            core.debug('Running PR Comment Action...');
            const token = core.getInput('bot-token', {
                required: true
            });
            const bot = core.getInput('bot', {
                required: true
            });
            const message = core.getInput('message', {
                required: true
            });
            const headers = {
                Authorization: `Bearer ${token}`
            };
            const prId = yield getPullRequestID(process.env.GITHUB_REF);
            if (!prId) {
                core.info('Skipping... Not a Pull Request');
                return;
            }
            const api = createAPI(headers);
            const existingId = yield api.find(prId, bot);
            if (existingId) {
                yield api.update(existingId, message);
                core.info('Updated a comment');
            }
            else {
                yield api.create(prId, message);
                core.info('Created a new comment');
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function createAPI(headers) {
    function find(prId, botName) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield axios_1.default.get(`${url}/issues/${prId}/comments`, {
                responseType: 'json',
                headers
            });
            const comments = data;
            if (comments && Array.isArray(comments)) {
                const found = comments.find(comment => comment.user.login === botName);
                if (found) {
                    return found.id;
                }
            }
        });
    }
    function create(prId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            yield axios_1.default.post(`${url}/issues/${prId}/comments`, { body }, {
                responseType: 'json',
                headers
            });
        });
    }
    /**
     *
     * @param {string} commentId
     */
    function update(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            yield axios_1.default.patch(`${url}/issues/comments/${id}`, { body }, {
                responseType: 'json',
                headers
            });
        });
    }
    return {
        update,
        create,
        find
    };
}
function getPullRequestID(ref) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        core.info(`GitHub Ref: ${ref}`);
        core.info('Looking for Pull Request number in context');
        if ((_a = github.context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.number) {
            return github.context.payload.pull_request.number;
        }
        core.info('Looking for Pull Request in ref');
        const refResult = /refs\/pull\/(\d+)\/merge/g.exec(ref);
        if (refResult) {
            const [, pullRequestId] = refResult;
            return pullRequestId;
        }
        core.info('Looking for Pull Request number in event');
        const gevent = JSON.parse(fs_1.readFileSync(process.env.GITHUB_EVENT_PATH, {
            encoding: 'utf8'
        }));
        if ((_b = gevent === null || gevent === void 0 ? void 0 : gevent.pull_request) === null || _b === void 0 ? void 0 : _b.number) {
            return (_c = gevent === null || gevent === void 0 ? void 0 : gevent.pull_request) === null || _c === void 0 ? void 0 : _c.number;
        }
        core.info('Looking for Pull Request number in Github API');
        const token = core.getInput('github-token');
        if (!token) {
            core.info('Skipping... github-token input is missing');
            return;
        }
        const client = new github.GitHub(token, {});
        const result = yield client.repos.listPullRequestsAssociatedWithCommit({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            commit_sha: github.context.sha
        });
        if (result.data.length) {
            return (_d = result.data[0]) === null || _d === void 0 ? void 0 : _d.number;
        }
    });
}
run();
