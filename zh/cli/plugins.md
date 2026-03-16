---
summary: "`openclaw plugins` 的 CLI 参考（列表、安装、卸载、启用/禁用、诊断）"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

管理 Gateway(网关) 插件/扩展和兼容的软件包。

相关内容：

- 插件系统：[插件](/en/tools/plugin)
- 软件包兼容性：[插件软件包](/en/plugins/bundles)
- 插件清单 + 架构：[插件清单](/en/plugins/manifest)
- 安全加固：[安全](/en/gateway/security)

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
```

捆绑插件随 OpenClaw 一起提供，但默认处于禁用状态。请使用 `plugins enable` 来
激活它们。

原生 OpenClaw 插件必须附带 `openclaw.plugin.json` 并包含内联 JSON
架构（`configSchema`，即使为空）。兼容软件包则使用自己的软件包
清单。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细的列表/信息
输出还会显示软件包子类型（`codex`、`claude` 或 `cursor`）以及检测到的软件包
功能。

### 安装

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
```

安全提示：请像运行代码一样对待插件安装。优先使用固定版本。

Npm 规范仅限于**注册表**（包名称 + 可选的**确切版本**或
**分发标签**）。会拒绝 Git/URL/文件规范和 semver 范围。为了安全起见，
依赖安装会使用 `--ignore-scripts` 运行。

裸规范和 `@latest` 会保持在稳定轨道上。如果 npm 将其中任何一个
解析为预发布版本，OpenClaw 会停止并要求您选择加入，方法是使用预发布标签（例如 `@beta`/`@rc`）或
确切的预发布版本（例如 `@1.2.3-beta.4`）。

如果裸安装规范与捆绑插件 ID 匹配（例如 `diffs`），OpenClaw
将直接安装该捆绑插件。要安装同名的 npm 包，请使用显式的作用域规范
（例如 `@scope/diffs`）。

支持的档案：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

对于本地路径和档案，OpenClaw 会自动检测：

- 原生 OpenClaw 插件（`openclaw.plugin.json`）
- Codex 兼容软件包（`.codex-plugin/plugin.json`）
- Claude 兼容的捆绑包（`.claude-plugin/plugin.json` 或默认的 Claude
  组件布局）
- Cursor 兼容的捆绑包（`.cursor-plugin/plugin.json`）

兼容的捆绑包安装到常规扩展根目录，并参与相同的
列出/信息/启用/禁用流程。目前，支持捆绑包技能、Claude
命令技能、Claude `settings.json` 默认值、Cursor 命令技能和兼容的 Codex 挂钩
directories；其他检测到的捆绑包功能会在
诊断/信息中显示，但尚未连接到运行时执行。

使用 `--link` 以避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

在 npm 安装上使用 `--pin`，以便在
`plugins.installs` 中保存解析的确切规范（`name@version`），同时保持默认行为未固定。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 会从 `plugins.entries`、`plugins.installs`、
插件允许列表以及适用的链接 `plugins.load.paths` 条目中删除插件记录。
对于活动的内存插件，内存插槽会重置为 `memory-core`。

默认情况下，卸载还会删除活动状态目录扩展根目录（`$OPENCLAW_STATE_DIR/extensions/<id>`）下的插件安装目录。使用
`--keep-files` 可保留磁盘上的文件。

支持将 `--keep-config` 作为 `--keep-files` 的已弃用别名。

### 更新

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

更新仅适用于从 npm 安装的插件（在 `plugins.installs` 中跟踪）。

当存在存储的完整性哈希且获取的工件哈希发生变化时，
OpenClaw 会打印警告并在继续前请求确认。使用
global `--yes` 可在 CI/非交互式运行中绕过提示。

import zh from "/components/footer/zh.mdx";

<zh />
