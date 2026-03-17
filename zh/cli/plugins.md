---
summary: "用于 `openclaw plugins` 的 CLI 参考（list、install、marketplace、uninstall、enable/disable、doctor）"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

管理 Gateway(网关) 插件/扩展及兼容的软件包。

相关内容：

- 插件系统：[插件](/zh/tools/plugin)
- 软件包兼容性：[插件软件包](/zh/plugins/bundles)
- 插件清单 + 架构：[插件清单](/zh/plugins/manifest)
- 安全加固：[安全性](/zh/gateway/security)

## 命令

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
```

捆绑的插件随 OpenClaw 一起提供，但默认处于禁用状态。使用 `plugins enable` 来
激活它们。

原生 OpenClaw 插件必须附带 `openclaw.plugin.json` 及内联的 JSON
架构（`configSchema`，即使为空）。兼容的软件包则使用其自己的软件包
清单。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细的列表/信息
输出还会显示软件包子类型（`codex`、`claude` 或 `cursor`）以及检测到的软件包
功能。

### 安装

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
openclaw plugins install <plugin>@<marketplace>
openclaw plugins install <plugin> --marketplace <marketplace>
```

安全提示：请像运行代码一样对待插件安装。优先使用固定版本。

Npm 规范仅限于 **registry-only**（包名称 + 可选的 **精确版本** 或
**dist-tag**）。会拒绝 Git/URL/文件规范和 semver 范围。依赖项
安装运行时带有 `--ignore-scripts` 以确保安全。

裸规范和 `@latest` 保持在稳定轨道上。如果 npm 将其中任何一个
解析为预发布版本，OpenClaw 会停止并要求您使用预发布标签（例如 `@beta`/`@rc`）或精确的预发布版本（例如
`@1.2.3-beta.4`）显式选择加入。

如果裸安装规范与捆绑的插件 ID 匹配（例如 `diffs`），OpenClaw
将直接安装该捆绑插件。要安装同名的 npm 包，请使用显式的作用域规范（例如 `@scope/diffs`）。

支持的存档格式：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支持 Claude marketplace 安装。

当 marketplace 名称存在于 Claude 的
本地注册表缓存 `~/.claude/plugins/known_marketplaces.json` 中时，请使用 `plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

当您想要显式传递 marketplace 源时，请使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Marketplace 源可以是：

- 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名称
- 本地 marketplace 根目录或 `marketplace.json` 路径
- GitHub 仓库简写，例如 `owner/repo`
- git URL

对于本地路径和存档，OpenClaw 会自动检测：

- 原生 OpenClaw 插件 (`openclaw.plugin.json`)
- Codex 兼容包 (`.codex-plugin/plugin.json`)
- Claude 兼容包 (`.claude-plugin/plugin.json` 或默认的 Claude
  组件布局)
- Cursor 兼容包 (`.cursor-plugin/plugin.json`)

兼容的包会安装到常规扩展根目录，并参与
相同的 list/info/enable/disable 流程。目前，支持包技能、Claude
command-skills、Claude `settings.json` 默认值、Cursor command-skills 以及兼容的 Codex hook
目录；其他检测到的包功能会在诊断/信息中显示，但尚未接入运行时执行。

使用 `--link` 避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

在 npm 安装时使用 `--pin`，将解析出的确切规范 (`name@version`) 保存到
`plugins.installs` 中，同时保持默认行为不受限制。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 会从 `plugins.entries`、`plugins.installs`、
插件允许列表中删除插件记录，并在适用时删除链接的 `plugins.load.paths` 条目。
对于活动的内存插件，内存插槽会重置为 `memory-core`。

默认情况下，卸载也会移除活动状态目录扩展根目录（`$OPENCLAW_STATE_DIR/extensions/<id>`）下的插件安装目录。使用 `--keep-files` 可保留磁盘上的文件。

支持将 `--keep-config` 作为 `--keep-files` 的已弃用别名。

### 更新

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

更新适用于 `plugins.installs` 中的已跟踪安装，目前包括 npm 和 marketplace 安装。

当存在存储的完整性哈希且获取的构件哈希发生变化时，OpenClaw 会打印警告并在继续之前请求确认。使用全局 `--yes` 可在 CI/非交互式运行中跳过提示。

import zh from "/components/footer/zh.mdx";

<zh />
