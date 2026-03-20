---
summary: "CLI 参考，适用于 `openclaw plugins`（list、install、marketplace、uninstall、enable/disable、doctor）"
read_when:
  - 您想要安装或管理 Gateway(网关) 插件或兼容的插件包
  - 您想要调试插件加载失败
title: "plugins"
---

# `openclaw plugins`

管理 Gateway(网关) 插件/扩展和兼容的插件包。

相关内容：

- 插件系统：[Plugins](/zh/tools/plugin)
- 插件包兼容性：[Plugin bundles](/zh/plugins/bundles)
- 插件清单 + 模式：[Plugin manifest](/zh/plugins/manifest)
- 安全加固：[Security](/zh/gateway/security)

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

打包的插件随 OpenClaw 一起提供，但默认处于禁用状态。请使用 `plugins enable` 来
激活它们。

原生 OpenClaw 插件必须提供带有内联 JSON
模式 (`configSchema`，即使为空) 的 `openclaw.plugin.json`。兼容的插件包则使用它们自己的插件包
清单。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细列表/信息
输出还会显示插件包子类型 (`codex`、`claude` 或 `cursor`) 以及检测到的插件包
功能。

### 安装

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
openclaw plugins install <plugin>@<marketplace>
openclaw plugins install <plugin> --marketplace <marketplace>
```

安全提示：请像运行代码一样对待插件安装。优先使用固定的版本。

Npm 规范仅限于 **registry-only**（包名称 + 可选的 **精确版本** 或
**dist-tag**）。Git/URL/文件规范和 semver 范围将被拒绝。依赖项
安装会以 `--ignore-scripts` 运行以确保安全。

裸规范和 `@latest` 会停留在稳定轨道上。如果 npm 将其中任何一个解析为预发布版本，
OpenClaw 将停止并要求您使用预发布标签（例如 `@beta`/`@rc`）或精确的预发布版本（例如
`@1.2.3-beta.4`）明确选择加入。

如果裸安装规范与打包的插件 ID 匹配（例如 `diffs`），OpenClaw
将直接安装该打包插件。要安装具有相同
名称的 npm 包，请使用显式的作用域规范（例如 `@scope/diffs`）。

支持的归档：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支持从 Claude 市场（Claude marketplace）安装。

当市场名称存在于 `~/.claude/plugins/known_marketplaces.json` 的 Claude 本地注册表缓存中时，使用 `plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

当您想要显式传递市场源时，使用 `--marketplace`：

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

对于本地路径和归档，OpenClaw 会自动检测：

- 原生 OpenClaw 插件 (`openclaw.plugin.json`)
- Codex 兼容包 (`.codex-plugin/plugin.json`)
- Claude 兼容包 (`.claude-plugin/plugin.json` 或默认 Claude 组件布局)
- Cursor 兼容包 (`.cursor-plugin/plugin.json`)

兼容的包会安装到常规扩展根目录，并参与相同的列表/信息/启用/禁用流程。目前，支持包技能、Claude 命令技能（command-skills）、Claude `settings.json` 默认值、Cursor 命令技能以及兼容的 Codex hook 目录；其他检测到的包功能会在诊断/信息中显示，但尚未连接到运行时执行。

使用 `--link` 以避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

在 npm 安装时使用 `--pin`，将解析的确切规范 (`name@version`) 保存在 `plugins.installs` 中，同时保持默认行为不受版本限制。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 会从 `plugins.entries`、`plugins.installs`、插件允许列表（如适用）以及关联的 `plugins.load.paths` 条目中移除插件记录。对于活动内存插件，内存插槽会重置为 `memory-core`。

默认情况下，卸载也会删除活动状态目录扩展根目录（`$OPENCLAW_STATE_DIR/extensions/<id>`）下的插件安装目录。使用 `--keep-files` 在磁盘上保留文件。

`--keep-config` 作为 `--keep-files` 的已弃用别名受支持。

### 更新

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

更新适用于 `plugins.installs` 中跟踪的安装，目前包括 npm 和 marketplace 安装。

当存在存储的完整性哈希且获取的构件哈希发生变化时，OpenClaw 会打印警告并在继续前请求确认。在 CI/非交互式运行中，使用全局 `--yes` 绕过提示。

### 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

对单个插件进行深度自省。显示身份、加载状态、来源、已注册的功能、hooks、工具、命令、服务、网关方法、HTTP 路由、策略标志、诊断和安装元数据。

每个插件根据其在运行时实际注册的内容进行分类：

- **plain-capability** — 单种功能类型（例如仅提供商插件）
- **hybrid-capability** — 多种功能类型（例如文本 + 语音 + 图像）
- **hook-only** — 仅 hooks，没有功能或表面
- **non-capability** — 工具/命令/服务但没有功能

有关功能模型的更多信息，请参阅 [Plugins](/zh/tools/plugin#plugin-shapes)。

`--json` 标志输出适合脚本编写和审计的机器可读报告。

`info` 是 `inspect` 的别名。

import zh from "/components/footer/zh.mdx";

<zh />
