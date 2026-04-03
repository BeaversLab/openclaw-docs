---
summary: "ClawHub 指南：公共注册表、原生 OpenClaw 安装流程以及 ClawHub CLI 工作流"
read_when:
  - Introducing ClawHub to new users
  - Installing, searching, or publishing skills or plugins
  - Explaining ClawHub CLI flags and sync behavior
title: "ClawHub"
---

# ClawHub

ClawHub 是 **OpenClaw Skills 和插件** 的公共注册表。

- 使用原生 `openclaw` 命令从 ClawHub 搜索/安装/更新 Skills 并安装插件。
- 当您需要注册表身份验证、发布、删除、取消删除或同步工作流时，请使用独立的 `clawhub` CLI。

网站：[clawhub.ai](https://clawhub.ai)

## 原生 OpenClaw 流程

Skills：

```bash
openclaw skills search "calendar"
openclaw skills install <skill-slug>
openclaw skills update --all
```

插件：

```bash
openclaw plugins install clawhub:<package>
openclaw plugins update --all
```

在尝试 npm 之前，也会针对 ClawHub 尝试裸 npm 安全插件规范：

```bash
openclaw plugins install openclaw-codex-app-server
```

原生 `openclaw` 命令会安装到您的活动工作区，并持久化源元数据，以便后续的 `update` 调用可以保持在 ClawHub 上。

## 什么是 ClawHub

- OpenClaw Skills 和插件的公共注册表。
- Skill 包和元数据的版本化存储。
- 用于搜索、标签和使用信号发现的界面。

## 工作原理

1. 用户发布一个 Skill 包（文件 + 元数据）。
2. ClawHub 存储该包，解析元数据，并分配一个版本。
3. 注册表会对 Skill 进行索引以便搜索和发现。
4. 用户可以在 OpenClaw 中浏览、下载和安装 Skills。

## 您可以做什么

- 发布新的 Skills 和现有 Skills 的新版本。
- 通过名称、标签或搜索来发现 Skills。
- 下载 Skill 包并检查其文件。
- 举报滥用或不安全的 Skills。
- 如果您是管理员，可以隐藏、取消隐藏、删除或封禁。

## 适用对象（适合初学者）

如果您想为您的 OpenClaw 代理添加新功能，ClawHub 是查找和安装 Skills 最简单的方法。您不需要了解后端是如何工作的。您可以：

- 使用自然语言搜索 Skills。
- 将 Skill 安装到您的工作区中。
- 稍后使用一个命令更新 Skills。
- 通过发布您自己的 Skills 来进行备份。

## 快速开始（非技术性）

1. 搜索您需要的内容：
   - `openclaw skills search "calendar"`
2. 安装一个 Skill：
   - `openclaw skills install <skill-slug>`
3. 启动一个新的 OpenClaw 会话，以便它获取新的 Skill。
4. 如果您想要发布或管理注册表身份验证，请也安装独立的
   `clawhub` CLI。

## 安装 ClawHub CLI

对于需要注册表身份验证的工作流（如发布/同步），您仅需此功能：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## 它如何融入 OpenClaw

原生 `openclaw skills install` 会安装到活动工作区的 `skills/`
目录中。`openclaw plugins install clawhub:...` 会记录正常的受管
插件安装以及用于更新的 ClawHub 源元数据。

独立的 `clawhub` CLI 也会将 Skills 安装到当前工作目录下的 `./skills` 中。如果配置了 OpenClaw 工作区，`clawhub`
将回退到该工作区，除非您覆盖 `--workdir`（或
`CLAWHUB_WORKDIR`）。OpenClaw 从 `<workspace>/skills`
加载工作区 Skills，并将在**下一次**会话中选取它们。如果您已使用
`~/.openclaw/skills` 或捆绑的 Skills，则工作区 Skills 优先。

有关 Skills 如何加载、共享和控制的更多详细信息，请参阅
[Skills](/en/tools/skills)。

## Skill 系统概述

Skill 是一个版本化的文件包，用于教 OpenClaw 如何执行
特定任务。每次发布都会创建一个新版本，注册表会保留
版本历史记录，以便用户审核更改。

典型的 skill 包括：

- 包含主要描述和用法的 `SKILL.md` 文件。
- Skill 使用的可选配置、脚本或支持文件。
- 元数据，如标签、摘要和安装要求。

ClawHub 使用元数据来支持发现并安全地公开 skill 功能。
注册表还会跟踪使用信号（例如 stars 和 downloads）以提高
排名和可见性。

## 服务提供的内容（功能）

- Skills 及其 `SKILL.md` 内容的**公开浏览**。
- **搜索**由嵌入（向量搜索）驱动，而不仅仅是关键词。
- 使用 semver、changelogs 和标签（包括 `latest`）进行的**版本控制**。
- **下载**，每个版本为一个 zip 包。
- **Stars 和评论**，用于社区反馈。
- **审核**挂钩，用于批准和审计。
- 适用于自动化和脚本的 **CLI 友好 API**。

## 安全性和审核

ClawHub 默认是开放的。任何人都可以上传 skills，但 GitHub 账户必须注册至少一周才能发布。这有助于减缓滥用，同时不阻止真正的贡献者。

举报和审核：

- 任何已登录用户都可以举报 skill。
- 必须提供并记录举报原因。
- 每个用户同时最多可以拥有 20 个有效的举报。
- 超过 3 个独立举报的 skills 默认会被自动隐藏。
- 审核人员可以查看被隐藏的 skills，将其取消隐藏、删除或封禁用户。
- 滥用举报功能可能会导致账户被封禁。

有兴趣成为审核人员吗？请在 OpenClaw Discord 中询问，并联系审核人员或维护者。

## CLI 命令和参数

全局选项（适用于所有命令）：

- `--workdir <dir>`：工作目录（默认：当前目录；回退到 OpenClaw 工作区）。
- `--dir <dir>`：Skills 目录，相对于 workdir（默认：`skills`）。
- `--site <url>`：站点基础 URL（浏览器登录）。
- `--registry <url>`：Registry API 基础 URL。
- `--no-input`：禁用提示（非交互式）。
- `-V, --cli-version`：打印 CLI 版本。

身份验证：

- `clawhub login`（浏览器流程）或 `clawhub login --token <token>`
- `clawhub logout`
- `clawhub whoami`

选项：

- `--token <token>`：粘贴 API 令牌。
- `--label <label>`：为浏览器登录令牌存储的标签（默认：`CLI token`）。
- `--no-browser`：不打开浏览器（需要 `--token`）。

搜索：

- `clawhub search "query"`
- `--limit <n>`：最大结果数。

安装：

- `clawhub install <slug>`
- `--version <version>`：安装特定版本。
- `--force`：如果文件夹已存在则覆盖。

更新：

- `clawhub update <slug>`
- `clawhub update --all`
- `--version <version>`：更新到特定版本（仅限单个 slug）。
- `--force`：当本地文件与任何已发布版本不匹配时覆盖。

列表：

- `clawhub list`（读取 `.clawhub/lock.json`）

发布 Skills：

- `clawhub skill publish <path>`
- `--slug <slug>`：Skill slug。
- `--name <name>`：显示名称。
- `--version <version>`：Semver 版本。
- `--changelog <text>`：变更日志文本（可以为空）。
- `--tags <tags>`：逗号分隔的标签（默认：`latest`）。

发布插件：

- `clawhub package publish <source>`
- `<source>` 可以是本地文件夹、`owner/repo`、`owner/repo@ref` 或 GitHub URL。
- `--dry-run`：构建确切的发布计划而不上传任何内容。
- `--json`：输出机器可读的内容供 CI 使用。
- `--source-repo`, `--source-commit`, `--source-ref`：当自动检测不足时的可选覆盖选项。

删除/恢复删除（仅所有者/管理员）：

- `clawhub delete <slug> --yes`
- `clawhub undelete <slug> --yes`

同步（扫描本地技能 + 发布新的/更新的）：

- `clawhub sync`
- `--root <dir...>`：额外的扫描根目录。
- `--all`：上传所有内容而无需提示。
- `--dry-run`：显示将要上传的内容。
- `--bump <type>`：`patch|minor|major` 以进行更新（默认：`patch`）。
- `--changelog <text>`：用于非交互式更新的变更日志。
- `--tags <tags>`：逗号分隔的标签（默认：`latest`）。
- `--concurrency <n>`：注册表检查（默认为 4）。

## 代理的常见工作流

### 搜索技能

```bash
clawhub search "postgres backups"
```

### 下载新技能

```bash
clawhub install my-skill-pack
```

### 更新已安装的技能

```bash
clawhub update --all
```

### 备份您的技能（发布或同步）

对于单个技能文件夹：

```bash
clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

要一次扫描和备份多个技能：

```bash
clawhub sync --all
```

### 从 GitHub 发布插件

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
clawhub package publish https://github.com/your-org/your-plugin
```

代码插件必须在 `package.json` 中包含必需的 OpenClaw 元数据：

```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "compat": {
      "pluginApi": ">=2026.3.24-beta.2",
      "minGatewayVersion": "2026.3.24-beta.2"
    },
    "build": {
      "openclawVersion": "2026.3.24-beta.2",
      "pluginSdkVersion": "2026.3.24-beta.2"
    }
  }
}
```

## 高级详情（技术）

### 版本控制和标签

- 每次发布都会创建一个新的 **semver** `SkillVersion`。
- 标签（如 `latest`）指向某个版本；移动标签允许您回滚。
- 变更日志附加到每个版本，在同步或发布更新时可以为空。

### 本地更改与注册表版本

更新使用内容哈希将本地技能内容与注册表版本进行比较。如果本地文件与任何已发布的版本不匹配，CLI 会在覆盖之前询问（或者在非交互式运行中需要 `--force`）。

### 同步扫描和回退根目录

`clawhub sync` 首先扫描您当前的工作目录。如果未找到技能，它会回退到已知的旧版位置（例如 `~/openclaw/skills` 和 `~/.openclaw/skills`）。这旨在无需额外标志即可找到较旧的技能安装。

### 存储和锁定文件

- 已安装的技能记录在工作目录下的 `.clawhub/lock.json` 中。
- Auth tokens 存储在 ClawHub CLI 配置文件中（可通过 `CLAWHUB_CONFIG_PATH` 覆盖）。

### 遥测（安装计数）

当您在登录状态下运行 `clawhub sync` 时，CLI 会发送一个最小的快照以计算安装计数。您可以完全禁用此功能：

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## 环境变量

- `CLAWHUB_SITE`：覆盖站点 URL。
- `CLAWHUB_REGISTRY`：覆盖注册表 API URL。
- `CLAWHUB_CONFIG_PATH`：覆盖 CLI 存储 token/配置的位置。
- `CLAWHUB_WORKDIR`：覆盖默认工作目录。
- `CLAWHUB_DISABLE_TELEMETRY=1`：在 `sync` 上禁用遥测。
