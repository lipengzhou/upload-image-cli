#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import readline from 'node:readline'

import dayjs from 'dayjs'
import axios from 'axios'
import { program } from 'commander'
import Clipboard from '@mariozechner/clipboard'

import { compress } from './compress'

import pkg from '../package.json'

const configPath = path.join(os.homedir(), '.upload-image-cli.json')

const readConfig = () => {
  const content = fs.readFileSync(configPath, 'utf8')
  return JSON.parse(content) as {
    hosts?: {
      github?: {
        username?: string
        repo?: string
        branch?: string
        token?: string
      }
    }
  }
}

const getGithubConfig = (): {
  username: string
  repo: string
  branch: string
  token: string
} => {
  let config: ReturnType<typeof readConfig>
  try {
    config = readConfig()
  } catch (err) {
    console.log(
      `Failed to read config file: ${configPath}\nPlease run first: upload-image init\n\n${err instanceof Error ? err.message : err}`
    )
    process.exit(1)
  }

  const ghConfig = config?.hosts?.github
  if (
    !ghConfig?.username ||
    !ghConfig?.repo ||
    !ghConfig?.branch ||
    !ghConfig?.token
  ) {
    console.log(
      `Incomplete config file: ${configPath}\nPlease run first: upload-image init`
    )
    process.exit(1)
  }

  return ghConfig as {
    username: string
    repo: string
    branch: string
    token: string
  }
}

const ask = async (
  rl: readline.Interface,
  question: string
): Promise<string> => {
  return await new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer))
  })
}

const askRequired = async (
  rl: readline.Interface,
  question: string
): Promise<string> => {
  while (true) {
    const answer = (await ask(rl, question)).trim()
    if (answer) return answer
  }
}

const initConfig = async () => {
  if (!process.stdin.isTTY) {
    if (fs.existsSync(configPath)) {
      console.log(
        `Config file already exists: ${configPath}\nPlease run in interactive mode to confirm overwrite: upload-image init`
      )
      process.exit(1)
    }

    const lines = fs.readFileSync(0, 'utf8').split(/\r?\n/)
    const username = (lines[0] ?? '').trim()
    const repo = (lines[1] ?? '').trim()
    const branch = ((lines[2] ?? '').trim() || 'master').trim()
    const token = (lines[3] ?? '').trim()

    if (!username || !repo || !token) {
      console.log(
        'In non-interactive mode, please provide sequentially: username, repo, branch(optional), token'
      )
      process.exit(1)
    }

    const config = {
      hosts: {
        github: {
          username,
          repo,
          branch,
          token,
        },
      },
    }

    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, {
      mode: 0o600,
    })
    console.log(`Config file generated: ${configPath}`)
    return
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    if (fs.existsSync(configPath)) {
      const overwrite = (
        await ask(
          rl,
          `Config file already exists: ${configPath}\nOverwrite? (y/N) `
        )
      )
        .trim()
        .toLowerCase()
      if (overwrite !== 'y' && overwrite !== 'yes') {
        console.log('Cancelled')
        return
      }
    }

    const username = await askRequired(rl, 'GitHub username/organization: ')
    const repo = await askRequired(rl, 'Repo name: ')
    const branchInput = (
      await ask(rl, 'Branch name (default: master): ')
    ).trim()
    const branch = branchInput || 'master'
    const token = await askRequired(rl, 'GitHub Token: ')

    const config = {
      hosts: {
        github: {
          username,
          repo,
          branch,
          token,
        },
      },
    }

    fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, {
      mode: 0o600,
    })
    console.log(`Config file generated: ${configPath}`)
  } finally {
    rl.close()
  }
}

program
  .version(pkg.version)
  .command('init')
  .description('Generate config file interactively in user directory')
  .action(async () => {
    await initConfig()
  })

program
  .option('--files <files...>', 'File list')
  .option('-f, --format <format>', 'Image format', 'webp')
  .option('-o, --output <format>', 'Output format: markdown|html|url|raw')

const upload = async (
  file: string,
  ghConfig: ReturnType<typeof getGithubConfig>,
  format: string
): Promise<string> => {
  const validFormats = [
    'jpeg',
    'png',
    'webp',
    'gif',
    'svg',
    'tiff',
    'avif',
    'heif',
    'jp2',
  ] as const
  type ValidFormat = (typeof validFormats)[number]
  const buffer = await compress(file, { format: format as ValidFormat })
  const filepath = `image/${dayjs().format('YYYYMMDDHHmmssSSS')}.${format}`
  await axios({
    method: 'PUT',
    url: `https://api.github.com/repos/${ghConfig.username}/${ghConfig.repo}/contents/${filepath}`,
    data: {
      message: '⬆ Uploaded by lpz',
      content: buffer.toString('base64'),
    },
    headers: {
      Authorization: `Bearer ${ghConfig.token}`,
    },
  })
  return `https://cdn.jsdelivr.net/gh/${ghConfig.username}/${ghConfig.repo}@${ghConfig.branch}/${filepath}`
}

const uploadFiles = async (
  files: string[],
  format: string,
  output: string
): Promise<void> => {
  const ghConfig = getGithubConfig()
  const urls: string[] = []
  for (const file of files) {
    try {
      const url = await upload(file, ghConfig, format)
      urls.push(url)
    } catch (err) {
      console.log('upload failed', err)
    }
  }

  if (output === 'markdown') {
    console.log(
      urls
        .map(
          (url) => `
![image](${url})`
        )
        .join('\n')
    )
  } else if (output === 'html') {
    console.log(
      urls
        .map(
          (url) => `
<img src="${url}" alt="image">`
        )
        .join('\n')
    )
  } else if (output === 'url') {
    console.log(urls.join('\n'))
  } else {
    // raw 或未指定，保持默认行为
    console.log(`upload success:\n${urls.join('\n')}`)
  }
}

const getClipboardImage = async () => {
  const tempDir = os.tmpdir()
  const tempFile = path.join(tempDir, `clipboard-image-${Date.now()}.png`)

  try {
    if (await Clipboard.hasImage()) {
      const base64Image = await Clipboard.getImageBase64()
      const buffer = Buffer.from(base64Image, 'base64')
      fs.writeFileSync(tempFile, buffer)
      return tempFile
    } else {
      throw new Error('No image found in clipboard')
    }
  } catch (err) {
    console.error(
      'Failed to read image from clipboard:',
      err instanceof Error ? err.message : err
    )
    throw err
  }
}

program.action(async () => {
  const { files = [], format, output } = program.opts()
  if (!files.length) {
    console.log('No files specified, reading from clipboard...')
    const clipboardFile = await getClipboardImage()
    await uploadFiles([clipboardFile], format, output)
    fs.unlinkSync(clipboardFile)
  } else {
    await uploadFiles(files, format, output)
  }
})

program.parse(process.argv)
