---
summary: "CLI 参考，用于 `openclaw plugins`（list, install, marketplace, uninstall, enable/disable, doctor）"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

管理 Gateway(网关) 插件/扩展及兼容的软件包。

相关内容：

- 插件系统：[插件](/zh/tools/plugin)
- Bundle 兼容性：[插件 bundles](/zh/plugins/bundles)
- 插件清单 + 架构：[插件清单](/zh/plugins/manifest)
- 安全加固：[安全](/zh/gateway/security)

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

原生 OpenClaw 插件必须附带带有内联 JSON
架构（`configSchema`，即使为空）的 `openclaw.plugin.json`。兼容的 bundles 则使用它们自己的 bundle
清单。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细列表/信息
输出还会显示 bundle 子类型（`codex`、`claude` 或 `cursor`）以及检测到的 bundle
功能。

### 安装

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
openclaw plugins install <plugin>@<marketplace>
openclaw plugins install <plugin> --marketplace <marketplace>
```

安全提示：请像运行代码一样对待插件安装。优先使用固定版本。

Npm 规范仅限 **registry-only**（包名称 + 可选的 **确切版本** 或
**dist-tag**）。拒绝 Git/URL/文件规范和 semver 范围。出于安全考虑，依赖
安装时运行 `--ignore-scripts`。

裸规范和 `@latest` 保持在稳定轨道上。如果 npm 将其中任何一个解析为预发布版本，OpenClaw 将停止并要求您明确选择加入，方法是使用预发布标签（例如 `@beta`/`@rc`）或确切的预发布版本（例如
`@1.2.3-beta.4`）。

如果裸安装规范与捆绑插件 ID 匹配（例如 `diffs`），OpenClaw
将直接安装捆绑插件。要安装具有相同
名称的 npm 包，请使用显式作用域规范（例如 `@scope/diffs`）。

支持的归档文件：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支持 Claude marketplace 安装。

当市场名称存在于 `~/.claude/plugins/known_marketplaces.json` 的 Claude 本地注册表缓存中时，使用 `plugin@marketplace` 简写形式：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

当您想要显式传递市场来源时，使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Marketplace 源可以是：

- 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市场名称
- 本地市场根目录或 `marketplace.json` 路径
- GitHub 仓库简写形式，例如 `owner/repo`
- git URL

对于本地路径和存档，OpenClaw 会自动检测：

- 原生 OpenClaw 插件 (`openclaw.plugin.json`)
- Codex 兼容包 (`.codex-plugin/plugin.json`)
- Claude 兼容包 (`.claude-plugin/plugin.json` 或默认的 Claude 组件布局)
- Cursor 兼容包 (`.cursor-plugin/plugin.json`)

兼容的包会安装到常规扩展根目录，并参与相同的列出/信息/启用/禁用流程。目前，支持包技能、Claude 命令技能、Claude `settings.json` 默认值、Cursor 命令技能以及兼容的 Codex 挂钩目录；其他检测到的包功能会在诊断/信息中显示，但尚未连接到运行时执行。

使用 `--link` 避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

在 npm 安装上使用 `--pin` 以将解析的确切规范 (`name@version`) 保存在 `plugins.installs` 中，同时保持默认行为不受固定限制。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 会从 `plugins.entries`、`plugins.installs`、插件允许列表以及适用的链接 `plugins.load.paths` 条目中移除插件记录。对于活动的内存插件，内存插槽会重置为 `memory-core`。

默认情况下，卸载还会移除活动状态目录扩展根目录 (`$OPENCLAW_STATE_DIR/extensions/<id>`) 下的插件安装目录。使用 `--keep-files` 保留磁盘上的文件。

`--keep-config` 作为 `--keep-files` 的已弃用别名受到支持。

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
```

更新适用于 `plugins.installs` 中跟踪的安装，目前为 npm 和市场安装。

当您传递一个插件 ID 时，OpenClaw 会重用该插件的已记录安装规范。这意味着之前存储的 dist-tags（如 `@beta`）和精确固定的版本将在后续 `update <id>` 运行中继续被使用。

对于 npm 安装，您还可以传递带有 dist-tag 或精确版本的显式 npm 包规范。OpenClaw 将该包名称解析回跟踪的插件记录，更新已安装的插件，并记录新的 OpenClaw 规范，以便将来基于 ID 的更新。

当存在存储的完整性哈希值并且获取的工件哈希值发生变化时，OpenClaw 会打印警告并在继续之前请求确认。在 CI/非交互式运行中，使用全局 `--yes` 绕过提示。

### 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

对单个插件进行深度自省。显示身份、加载状态、来源、已注册的能力、钩子、工具、命令、服务、网关方法、HTTP 路由、策略标志、诊断和安装元数据。

每个插件根据其在运行时实际注册的内容进行分类：

- **plain-capability** — 一种能力类型（例如仅提供商插件）
- **hybrid-capability** — 多种能力类型（例如文本 + 语音 + 图像）
- **hook-only** — 仅钩子，没有能力或表面
- **non-capability** — 工具/命令/服务但没有能力

有关能力模型的更多信息，请参阅 [插件形状](/zh/plugins/architecture#plugin-shapes)。

`--json` 标志输出适合脚本编写和审计的机器可读报告。

`info` 是 `inspect` 的别名。

import zh from "/components/footer/zh.mdx";

<zh />
