# Upload Image CLI

这是一个命令行工具，用于将本地图片压缩/转码后上传到 GitHub 仓库，并输出可直接访问的图片 URL。

## 功能

- 读取本地图片并进行压缩处理：当图片 `density >= 100` 时，会将宽度缩小到原来的 1/2
- 按指定格式转码（默认 `webp`，质量 `80`）
- 通过 GitHub Contents API 上传到仓库的 `image/` 目录
- 输出基于 jsDelivr 的 CDN 链接

## 安装

```bash
npm i -g @lipengzhou/upload-image-cli
```

安装后会得到命令：`upload-image`。

## 配置

工具会从当前用户的 Home 目录读取配置文件：`~/.upload-image-cli.json`（Windows 下也是用户目录）。

也可以通过交互式命令生成配置文件：

```bash
upload-image init
```

配置示例：

```json
{
  "hosts": {
    "github": {
      "username": "your-github-name",
      "repo": "your-repo",
      "branch": "master",
      "token": "ghp_xxx"
    }
  }
}
```

字段说明：

- `username`：GitHub 用户名或组织名
- `repo`：用于存放图片的仓库名
- `branch`：仓库分支名（用于拼接最终访问 URL）
- `token`：GitHub Token
  - Fine-grained token：需要对目标仓库授予 `Contents: Read and write`
  - Classic token：通常需要 `repo`（或仅公共仓库时可用 `public_repo`）

注意：

- 默认生成的 URL 形如 `https://cdn.jsdelivr.net/gh/<username>/<repo>@<branch>/image/...`，因此仓库一般需要是公开仓库（jsDelivr 才能访问）。
- 上传路径固定为仓库根目录下的 `image/`，文件名为时间戳：`YYYYMMDDHHmmssSSS.<format>`。

## 使用

查看帮助：

```bash
upload-image --help
```

上传单张或多张图片：

```bash
upload-image --files ./a.png ./b.jpg
```

指定输出格式（默认 `webp`）：

```bash
upload-image --files ./a.png -f webp
```

参数说明：

- `--files <files...>`：图片文件路径列表（支持多个）
- `-f, --format <format>`：输出格式（默认 `webp`；由 `sharp` 支持，常用如 `webp` / `jpeg` / `png` / `avif`）

输出示例：

```text
upload success:
https://cdn.jsdelivr.net/gh/your-github-name/your-repo@master/image/20260410123456789.webp
```

## 日志

每次执行结束会追加写入日志文件 `log.txt`（位于本包的安装目录下），记录输入文件与输出 URL。

## 常见问题

- 提示“配置文件读取失败”
  - 先执行 `upload-image init` 生成 `~/.upload-image-cli.json`，或按“配置”章节手动创建
- 返回 `401/403`
  - Token 权限不足、过期或未授权目标仓库；检查 token 权限与仓库访问范围
- 返回 `404`
  - `username/repo/branch` 配置错误，或 token 无权访问该仓库
- 输出 URL 打不开
  - jsDelivr 有缓存与同步延迟；也请确认仓库为公开仓库且分支名正确
