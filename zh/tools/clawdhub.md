---
title: "ClawdHub"
summary: "ClawdHub 指南：公共技能注册表 + CLI 工作流"
read_when:
  - 向新用户介绍 ClawdHub
  - 安装、搜索或发布技能
  - 解释 ClawdHub CLI 参数与同步行为
---

# ClawdHub

ClawdHub 是 **OpenClaw 的公共技能注册表**。它是一个免费服务：所有技能都是公开、开放且对所有人可见，便于分享与复用。一个技能只是一个包含 `SKILL.md` 文件（以及辅助文本文件）的文件夹。你可以在 Web 应用中浏览技能，也可以用 CLI 搜索、安装、更新和发布技能。

站点：[clawdhub.com](https://clawdhub.com)

## 适用人群（新手友好）

如果你想为 OpenClaw agent 增加新能力，ClawdHub 是最简单的技能发现与安装方式。无需了解后端细节。你可以：

- 用自然语言搜索技能。
- 将技能安装到你的工作区。
- 使用一条命令更新技能。
- 通过发布来备份你自己的技能。

## 快速开始（非技术）

1) 安装 CLI（见下一节）。
2) 搜索你需要的内容：
   - `clawdhub search "calendar"`
3) 安装技能：
   - `clawdhub install <skill-slug>`
4) 启动新的 OpenClaw 会话，以加载新技能。

## 安装 CLI

任选其一：

```bash
npm i -g clawdhub
```

```bash
pnpm add -g clawdhub
```

## 与 OpenClaw 的关系

默认情况下，CLI 会把技能安装到当前工作目录下的 `./skills`。如果配置了 OpenClaw 工作区，`clawdhub` 会回退到该工作区，除非你用 `--workdir`（或 `CLAWDHUB_WORKDIR`）覆盖。OpenClaw 从 `<workspace>/skills` 加载工作区技能，并会在 **下一次** 会话中生效。如果你已经使用 `~/.openclaw/skills` 或内置技能，工作区技能优先级更高。

关于技能加载、共享与门控的更多细节，请参见
[技能](/zh/tools/skills)。

## 服务提供的功能

- **公开浏览** 技能及其 `SKILL.md` 内容。
- **搜索** 使用向量嵌入，而不仅仅是关键词。
- **版本管理**（semver）、更新日志与标签（包含 `latest`）。
- **按版本下载**（zip）。
- **星标与评论** 用于社区反馈。
- **审核** 钩子用于审批与审计。
- **CLI 友好 API** 用于自动化与脚本。

## CLI 命令与参数

全局选项（适用于所有命令）：

- `--workdir <dir>`：工作目录（默认当前目录；回退到 OpenClaw 工作区）。
- `--dir <dir>`：技能目录，相对 workdir（默认 `skills`）。
- `--site <url>`：站点基址（浏览器登录）。
- `--registry <url>`：注册表 API 基址。
- `--no-input`：禁用提示（非交互）。
- `-V, --cli-version`：打印 CLI 版本。

认证：

- `clawdhub login`（浏览器流程）或 `clawdhub login --token <token>`
- `clawdhub logout`
- `clawdhub whoami`

选项：

- `--token <token>`：粘贴 API token。
- `--label <label>`：浏览器登录 token 的标签（默认：`CLI token`）。
- `--no-browser`：不打开浏览器（需要 `--token`）。

搜索：

- `clawdhub search "query"`
- `--limit <n>`：最大结果数。

安装：

- `clawdhub install <slug>`
- `--version <version>`：安装指定版本。
- `--force`：若文件夹已存在则覆盖。

更新：

- `clawdhub update <slug>`
- `clawdhub update --all`
- `--version <version>`：更新到指定版本（仅单个 slug）。
- `--force`：当本地文件不匹配任何已发布版本时覆盖。

列表：

- `clawdhub list`（读取 `.clawdhub/lock.json`）

发布：

- `clawdhub publish <path>`
- `--slug <slug>`：技能 slug。
- `--name <name>`：显示名称。
- `--version <version>`：semver 版本。
- `--changelog <text>`：更新日志（可为空）。
- `--tags <tags>`：以逗号分隔的标签（默认：`latest`）。

删除/恢复（仅 owner/admin）：

- `clawdhub delete <slug> --yes`
- `clawdhub undelete <slug> --yes`

同步（扫描本地技能 + 发布新增/更新）：

- `clawdhub sync`
- `--root <dir...>`：额外扫描根目录。
- `--all`：不提示地上传全部。
- `--dry-run`：仅展示将要上传的内容。
- `--bump <type>`：`patch|minor|major` 用于更新（默认：`patch`）。
- `--changelog <text>`：非交互更新的更新日志。
- `--tags <tags>`：以逗号分隔的标签（默认：`latest`）。
- `--concurrency <n>`：注册表检查并发（默认：4）。

## 面向 agent 的常见流程

### 搜索技能

```bash
clawdhub search "postgres backups"
```

### 下载新技能

```bash
clawdhub install my-skill-pack
```

### 更新已安装技能

```bash
clawdhub update --all
```

### 备份你的技能（发布或同步）

单个技能文件夹：

```bash
clawdhub publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

批量扫描并备份：

```bash
clawdhub sync --all
```

## 进阶细节（技术）

### 版本与标签

- 每次发布都会创建一个新的 **semver** `SkillVersion`。
- 标签（如 `latest`）指向某个版本；移动标签可回滚。
- 更新日志附着在每个版本上，同步或发布更新时可为空。

### 本地变更 vs 注册表版本

更新会使用内容哈希比较本地技能与注册表版本。如果本地文件不匹配任何已发布版本，CLI 会在覆盖前询问（非交互模式需 `--force`）。

### 同步扫描与回退根目录

`clawdhub sync` 会先扫描当前 workdir。如果未找到技能，则回退到已知的旧位置（例如 `~/openclaw/skills` 与 `~/.openclaw/skills`）。这一设计用于在无需额外参数的情况下找到旧技能安装。

### 存储与锁文件

- 已安装的技能记录在 workdir 下的 `.clawdhub/lock.json`。
- 认证 token 存储在 ClawdHub CLI 配置文件中（可用 `CLAWDHUB_CONFIG_PATH` 覆盖）。

### 统计（安装量）

当你登录后运行 `clawdhub sync`，CLI 会发送最小化快照用于统计安装量。你可以完全禁用：

```bash
export CLAWDHUB_DISABLE_TELEMETRY=1
```

## 环境变量

- `CLAWDHUB_SITE`：覆盖站点 URL。
- `CLAWDHUB_REGISTRY`：覆盖注册表 API URL。
- `CLAWDHUB_CONFIG_PATH`：覆盖 CLI 存储 token/config 的位置。
- `CLAWDHUB_WORKDIR`：覆盖默认 workdir。
- `CLAWDHUB_DISABLE_TELEMETRY=1`：在 `sync` 中禁用 telemetry。
