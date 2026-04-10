# Upload Image CLI

Upload local images to GitHub repo and get CDN links.

## Features

- Auto compress images (scale down when density >= 100)
- Convert to specified format (default `webp`, quality `80`)
- Upload to GitHub via Contents API
- Output jsDelivr CDN links

## Install

```bash
npm i -g @lipengzhou/upload-image-cli
```

## Config

Config file: `~/.upload-image-cli.json`

```bash
upload-image init
```

Config example:

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

**Token permissions:**
- Fine-grained: `Contents: Read and write`
- Classic: `repo` (or `public_repo` for public repos)

**Note:**
- Repo should be public for jsDelivr access
- Upload path: `image/YYYYMMDDHHmmssSSS.<format>`

## Usage

```bash
# View help
upload-image --help

# Upload images
upload-image --files ./a.png ./b.jpg

# Specify output format (default: webp)
upload-image --files ./a.png -f jpeg
```

**Options:**

- `--files <files...>` - Image file paths
- `-f, --format <format>` - Image format (default: `webp`, supports `webp`/`jpeg`/`png`/`avif`)
- `-o, --output <format>` - Output format: `markdown`|`html`|`url`|`raw` (default: `raw`)

**Output examples:**

```bash
# raw (default)
upload success:
https://cdn.jsdelivr.net/gh/your-name/your-repo@master/image/...

# markdown
![image](https://cdn.jsdelivr.net/gh/your-name/your-repo@master/image/...)

# html
<img src="https://cdn.jsdelivr.net/gh/your-name/your-repo@master/image/..." alt="image">

# url
https://cdn.jsdelivr.net/gh/your-name/your-repo@master/image/...
```

## FAQ

- **Config file error** → Run `upload-image init`
- **401/403** → Check token permissions
- **404** → Check username/repo/branch config
- **URL not accessible** → Wait for jsDelivr sync (usually < 1min)
