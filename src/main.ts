import * as core from '@actions/core'
import * as github from '@actions/github'
import axios from 'axios'
import {readFileSync} from 'fs'

const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')
const url = `https://api.github.com/repos/${owner}/${repo}`

async function run(): Promise<void> {
  try {
    core.debug('Running PR Comment Action...')
    const token = core.getInput('bot-token', {
      required: true
    })
    const bot = core.getInput('bot', {
      required: true
    })
    let message = core.getInput('message', {
      required: true
    });

    if (isFilepath(message)) {
      message = readFileSync(message, 'utf-8');
    }

    const headers = {
      Authorization: `Bearer ${token}`
    }
    const prId = await getPullRequestID(process.env.GITHUB_REF!)

    if (!prId) {
      core.info('Skipping... Not a Pull Request')
      return
    }

    const api = createAPI(headers)
    const existingId = await api.find(prId, bot)

    if (existingId) {
      await api.update(existingId, message)
      core.info('Updated a comment')
    } else {
      await api.create(prId, message)
      core.info('Created a new comment')
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

function createAPI(headers: Record<string, string>) {
  async function find(prId: string, botName: string) {
    const {data} = await axios.get(`${url}/issues/${prId}/comments`, {
      responseType: 'json',
      headers
    })
    const comments = data

    if (comments && Array.isArray(comments)) {
      const found = comments.find(comment => comment.user.login === botName)

      if (found) {
        return found.id
      }
    }
  }

  async function create(prId: string, body: string) {
    await axios.post(
      `${url}/issues/${prId}/comments`,
      {body},
      {
        responseType: 'json',
        headers
      }
    )
  }

  /**
   *
   * @param {string} commentId
   */
  async function update(id: string, body: string) {
    await axios.patch(
      `${url}/issues/comments/${id}`,
      {body},
      {
        responseType: 'json',
        headers
      }
    )
  }

  return {
    update,
    create,
    find
  }
}

async function getPullRequestID(ref: string) {
  core.info(`GitHub Ref: ${ref}`)

  core.info('Looking for Pull Request number in context')
  if (github.context.payload.pull_request?.number) {
    return github.context.payload.pull_request.number
  }

  core.info('Looking for Pull Request in ref')
  const refResult = /refs\/pull\/(\d+)\/merge/g.exec(ref)

  if (refResult) {
    const [, pullRequestId] = refResult
    return pullRequestId
  }

  core.info('Looking for Pull Request number in event')
  const gevent = JSON.parse(
    readFileSync(process.env.GITHUB_EVENT_PATH!, {
      encoding: 'utf8'
    })
  )

  if (gevent?.pull_request?.number) {
    return gevent?.pull_request?.number
  }

  core.info('Looking for Pull Request number in Github API')
  const token = core.getInput('github-token')

  if (!token) {
    core.info('Skipping... github-token input is missing')
    return
  }

  const client = new github.GitHub(token, {})
  const result = await client.repos.listPullRequestsAssociatedWithCommit({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    commit_sha: github.context.sha
  })

  if (result.data.length) {
    return result.data[0]?.number
  }
}

function isFilepath(filepath: string) {
  return /\.[a-z]{2,}$/i.test(filepath);
}

run()
