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
const axios_1 = __importDefault(require("axios"));
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
const url = `https://api.github.com/repos/${owner}/${repo}`;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            core.debug('Running PR Comment Action...');
            const headers = {
                Authorization: `Bearer ${core.getInput('bot-token')}`
            };
            const prId = getPullRequestID(process.env.GITHUB_REF);
            const api = createAPI(headers);
            const existingId = yield api.find(prId, core.getInput('bot'));
            const message = core.getInput('message');
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
    const result = /refs\/pull\/(\d+)\/merge/g.exec(ref);
    if (!result) {
        throw new Error('Github reference not found.');
    }
    const [, pullRequestId] = result;
    return pullRequestId;
}
run();
