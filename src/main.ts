import * as core from '@actions/core'
import * as github from '@actions/github'
import axios from 'axios'
import {readFileSync} from 'fs'

const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')
const url = `https://api.github.com/repos/${owner}/${repo}`

async function run(): Promise<void> {
  try {
    core.debug('Running PR Comment Action...')

    const headers = {
      Authorization: `Bearer ${core.getInput('bot-token')}`
    }
    const prId = getPullRequestID(process.env.GITHUB_REF!)

    if (!prId) {
      core.info('Skipping... Not a Pull Request')
      return
    }

    const api = createAPI(headers)
    const existingId = await api.find(prId, core.getInput('bot'))

    const message = core.getInput('message')

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

function getPullRequestID(ref: string) {
  core.info(`GitHub Ref: ${ref}`)

  if (github.context.payload.pull_request?.number) {
    return github.context.payload.pull_request.number
  }

  const result = /refs\/pull\/(\d+)\/merge/g.exec(ref)

  if (!result) {
    const gevent = JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH!, {
        encoding: 'utf8'
      })
    )

    return gevent?.pull_request?.number
  }

  const [, pullRequestId] = result
  return pullRequestId
}

run()
