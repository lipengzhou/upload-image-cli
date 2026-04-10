#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const dayjs = require('dayjs')
const axios = require('axios')
const { program } = require('commander')
const { compress } = require('./compress')
const os = require('os')
const readline = require('readline')

const configPath = path.join(os.homedir(), '.upload-image-cli.json')

const readConfig = () => {
  const content = fs.readFileSync(configPath, 'utf8')
  return JSON.parse(content)
}

const getGithubConfig = () => {
  let config
  try {
    config = readConfig()
  } catch (err) {
    console.log(
      `配置文件读取失败：${configPath}\n请先执行：upload-image init\n\n${err?.message ?? err}`
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
      `配置文件内容不完整：${configPath}\n请先执行：upload-image init`
    )
    process.exit(1)
  }

  return ghConfig
}

const ask = async (rl, question) => {
  return await new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer))
  })
}

const askRequired = async (rl, question) => {
  while (true) {
    const answer = (await ask(rl, question)).trim()
    if (answer) return answer
  }
}

const initConfig = async () => {
  if (!process.stdin.isTTY) {
    if (fs.existsSync(configPath)) {
      console.log(
        `配置文件已存在：${configPath}\n请在交互模式下执行以确认覆盖：upload-image init`
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
        '非交互模式下需要依次提供：username、repo、branch(可选)、token'
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
    console.log(`配置文件已生成：${configPath}`)
    return
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    if (fs.existsSync(configPath)) {
      const overwrite = (
        await ask(rl, `配置文件已存在：${configPath}\n是否覆盖？(y/N) `)
      )
        .trim()
        .toLowerCase()
      if (overwrite !== 'y' && overwrite !== 'yes') {
        console.log('已取消')
        return
      }
    }

    const username = await askRequired(rl, 'GitHub 用户名/组织名：')
    const repo = await askRequired(rl, '仓库名 repo：')
    const branchInput = (await ask(rl, '分支名 branch（默认 master）：')).trim()
    const branch = branchInput || 'master'
    const token = await askRequired(rl, 'GitHub Token：')

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
    console.log(`配置文件已生成：${configPath}`)
  } finally {
    rl.close()
  }
}

program
  .command('init')
  .description('交互式生成配置文件到用户目录')
  .action(async () => {
    await initConfig()
  })

program
  .option('--files <files...>', '文件列表')
  .option('-f, --format <format>', '图片格式', 'webp')

const upload = async (file, ghConfig, format) => {
  const buffer = await compress(file, { format })
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

const uploadFiles = async (files, format) => {
  const ghConfig = getGithubConfig()
  const urls = []
  for (const file of files) {
    try {
      const url = await upload(file, ghConfig, format)
      urls.push(url)
    } catch (err) {
      console.log('upload failed', err)
    }
  }
  console.log(`upload success:\n${urls.join('\n')}`)
}

program.action(async () => {
  const { files = [], format } = program.opts()
  if (!files.length) {
    program.help({ error: true })
  }
  await uploadFiles(files, format)
})

program.parse(process.argv)
