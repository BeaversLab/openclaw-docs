---
summary: "CLI 参考文档，适用于 `openclaw plugins`（列表、安装、市场、卸载、启用/禁用、诊断）"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

管理 Gateway(网关) 插件/扩展、Hook 包以及兼容的捆绑包。

相关内容：

- 插件系统：[插件](/en/tools/plugin)
- 捆绑包兼容性：[插件捆绑包](/en/plugins/bundles)
- 插件清单 + 架构：[插件清单](/en/plugins/manifest)
- 安全加固：[安全性](/en/gateway/security)

## 命令

```bash
openclaw plugins list
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
```

捆绑插件随 OpenClaw 一起提供，但默认处于禁用状态。使用 `plugins enable` 来
激活它们。

原生 OpenClaw 插件必须随附 `openclaw.plugin.json`，其中包含内联 JSON
架构（`configSchema`，即使为空）。兼容的捆绑包则使用自己的捆绑包
清单。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细的列表/信息
输出还会显示捆绑包子类型（`codex`、`claude` 或 `cursor`）以及检测到的捆绑包
功能。

### 安装

```bash
openclaw plugins install <package>                      # ClawHub first, then npm
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
```

首先会根据 ClawHub 检查裸包名称，然后检查 npm。安全提示：
请像运行代码一样对待插件安装。最好使用固定版本。

`plugins install` 也是 Hook 包的安装界面，这些包在
`package.json` 中暴露 `openclaw.hooks`。使用 `openclaw hooks` 进行过滤的 Hook
可见性和单个 Hook 启用，而不是用于包安装。

npm 规范是**仅限注册表**（包名称 + 可选的**确切版本**或
**dist-tag**）。拒绝 Git/URL/文件规范和 semver 范围。依赖项
安装运行 `--ignore-scripts` 以确保安全。

裸规范和 `@latest` 保持在稳定轨道上。如果 npm 将其中任何一个
解析为预发布版本，OpenClaw 会停止并要求您使用
预发布标签（例如 `@beta`/`@rc`）或确切的预发布版本（例如
`@1.2.3-beta.4`）明确选择加入。

如果裸安装规范与捆绑插件 ID 匹配（例如 `diffs`），OpenClaw
将直接安装该捆绑插件。若要安装同名的 npm 包，
请使用显式的作用域规范（例如 `@scope/diffs`）。

支持的归档文件：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支持从 Claude 市场安装。

ClawHub 安装使用显式的 `clawhub:<package>` 定位符：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

对于裸 npm 安全插件规范，OpenClaw 现在也优先使用 ClawHub。仅当
ClawHub 没有该软件包或版本时，才会回退到 npm：

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw 从 ClawHub 下载软件包归档，检查声明的
插件 API / 最低网关兼容性，然后通过常规
归档路径进行安装。记录的安装会保留其 ClawHub 源元数据以便稍后
更新。

当市场名称存在于 `~/.claude/plugins/known_marketplaces.json` 处的 Claude
本地注册表缓存中时，请使用 `plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

当您想要显式传递市场源时，请使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

市场源可以是：

- 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市场名称
- 本地市场根目录或 `marketplace.json` 路径
- GitHub 仓库简写，例如 `owner/repo`
- git URL

对于从 GitHub 或 git 加载的远程市场，插件条目必须保留
在克隆的市场仓库内。OpenClaw 接受来自
该仓库的相对路径源，并拒绝来自远程清单的外部 git、GitHub、URL/归档和绝对路径
插件源。

对于本地路径和归档，OpenClaw 会自动检测：

- 原生 OpenClaw 插件（`openclaw.plugin.json`）
- Codex 兼容的捆绑包（`.codex-plugin/plugin.json`）
- Claude 兼容的捆绑包（`.claude-plugin/plugin.json` 或默认的 Claude
  组件布局）
- Cursor 兼容的捆绑包（`.cursor-plugin/plugin.json`）

兼容的 Bundle 安装到常规扩展根目录，并参与相同的列表/信息/启用/禁用流程。目前，支持 Bundle 技能、Claude 命令技能、Claude `settings.json` 默认值、Cursor 命令技能以及兼容的 Codex hook 目录；其他检测到的 Bundle 功能会在诊断/信息中显示，但尚未连接到运行时执行中。

使用 `--link` 以避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

在 npm 安装时使用 `--pin`，可以将解析出的确切规范 (`name@version`) 保存在 `plugins.installs` 中，同时保持默认行为未被锁定。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 会从 `plugins.entries`、`plugins.installs`、插件允许列表以及适用的链接 `plugins.load.paths` 条目中移除插件记录。对于活动的内存插件，内存插槽会重置为 `memory-core`。

默认情况下，卸载也会移除活动状态目录扩展根目录 (`$OPENCLAW_STATE_DIR/extensions/<id>`) 下的插件安装目录。使用 `--keep-files` 可以保留磁盘上的文件。

`--keep-config` 作为 `--keep-files` 的已弃用别名受到支持。

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
```

更新适用于 `plugins.installs` 中已跟踪的安装以及 `hooks.internal.installs` 中已跟踪的 hook-pack 安装。

当您传递插件 ID 时，OpenClaw 会复用该插件的记录安装规范。这意味着以前存储的 dist-tags（例如 `@beta`）和精确固定的版本将在后续的 `update <id>` 运行中继续被使用。

对于 npm 安装，您还可以传递带有 dist-tag 或确切版本的显式 npm 包规范。OpenClaw 会将该包名称解析回已跟踪的插件记录，更新该已安装的插件，并记录新的 npm 规范以供将来基于 ID 的更新使用。

当存储的完整性哈希存在且获取的工件哈希发生变化时，OpenClaw 会打印警告并要求确认才能继续。使用全局 `--yes` 可以在 CI/非交互式运行中绕过提示。

### 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

对单个插件进行深度检查。显示身份、加载状态、来源、
已注册的功能、hooks、工具、命令、服务、网关方法、
HTTP 路由、策略标志、诊断信息和安装元数据。

每个插件根据其在运行时实际注册的内容进行分类：

- **plain-capability** — 一种功能类型（例如仅提供商的插件）
- **hybrid-capability** — 多种功能类型（例如文本 + 语音 + 图像）
- **hook-only** — 仅包含 hooks，没有功能或表面
- **non-capability** — 包含工具/命令/服务但没有功能

有关功能模型的详细信息，请参阅 [Plugin shapes](/en/plugins/architecture#plugin-shapes)。

`--json` 标志输出适合脚本编写和
审计的机器可读报告。

`info` 是 `inspect` 的别名。
