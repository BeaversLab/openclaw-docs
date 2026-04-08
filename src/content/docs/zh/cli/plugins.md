---
summary: "CLI 参考文档，用于 `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

管理 Gateway(网关) 插件/扩展、Hook 包以及兼容的捆绑包。

相关内容：

- 插件系统：[插件](/en/tools/plugin)
- 插件包兼容性：[插件包](/en/plugins/bundles)
- 插件清单 + 架构：[插件清单](/en/plugins/manifest)
- 安全加固：[安全性](/en/gateway/security)

## 命令

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
```

捆绑插件随 OpenClaw 一起提供。部分插件默认启用（例如
捆绑的模型提供商、捆绑的语音提供商以及捆绑的浏览器
插件）；其他插件则需要 `plugins enable`。

原生 OpenClaw 插件必须提供 `openclaw.plugin.json` 并包含内联的 JSON
架构（`configSchema`，即使为空）。兼容的插件包则使用其自己的插件包
清单。

`plugins list` 显示 `Format: openclaw` 或 `Format: bundle`。详细的列表/信息
输出还会显示插件包子类型（`codex`、`claude` 或 `cursor`）以及检测到的插件包
功能。

### 安装

```bash
openclaw plugins install <package>                      # ClawHub first, then npm
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install <package> --force              # overwrite existing install
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

首先会根据 ClawHub 检查裸包名称，然后检查 npm。安全提示：
请像运行代码一样对待插件安装。最好使用固定版本。

如果配置无效，`plugins install` 通常会以安全方式失败，并提示您
先运行 `openclaw doctor --fix`。唯一记录的例外情况是针对明确选择加入
`openclaw.install.allowInvalidConfigRecovery` 的捆绑插件提供的狭窄恢复路径。

`--force` 复用现有的安装目标，并就地覆盖已安装的
插件或 hook 包。当您有意从新的本地路径、归档文件、ClawHub 包或 npm 工件重新安装
同一 ID 时，请使用此命令。

`--pin` 仅适用于 npm 安装。`--marketplace` 不支持此标志，
因为从应用市场安装时会保留应用市场源元数据，而不是 npm
规范。

`--dangerously-force-unsafe-install` 是一个针对内置危险代码扫描器误报的“玻璃破碎”选项。它允许安装继续进行，即使内置扫描器报告 `critical` 发现，但它**不会**绕过插件 `before_install` 挂钩策略阻止，也**不会**绕过扫描失败。

此 CLI 标志适用于插件安装/更新流程。Gateway(网关) 支持的技能依赖安装使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是一个单独的 ClawHub 技能下载/安装流程。

`plugins install` 也是暴露 `openclaw.hooks` 在 `package.json` 中的挂钩包的安装界面。使用 `openclaw hooks` 进行过滤的挂钩可见性和单个挂钩启用，而不是软件包安装。

Npm 规范是**仅限注册表**的（软件包名称 + 可选的**确切版本**或**分发标签**）。拒绝 Git/URL/文件规范和 semver 范围。依赖安装运行 `--ignore-scripts` 以确保安全。

裸规范和 `@latest` 保持在稳定轨道上。如果 npm 将其中任何一个解析为预发布版本，OpenClaw 会停止并要求您使用预发布标签（例如 `@beta`/`@rc`）或确切的预发布版本（例如 `@1.2.3-beta.4`）明确选择加入。

如果裸安装规范匹配捆绑插件 ID（例如 `diffs`），OpenClaw 将直接安装捆绑插件。要安装具有相同名称的 npm 软件包，请使用显式作用域规范（例如 `@scope/diffs`）。

支持的存档：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支持 Claude 市场安装。

ClawHub 安装使用显式的 `clawhub:<package>` 定位符：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw 现在也首选 ClawHub 用于裸 npm 安全插件规范。只有当 ClawHub 没有该软件包或版本时才会回退到 npm：

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw 从 ClawHub 下载软件包归档，检查公布的插件 API / 最低网关兼容性，然后通过正常归档路径进行安装。已记录的安装会保留其 ClawHub 源元数据以便日后更新。

当市场名称存在于 Claude 位于 `~/.claude/plugins/known_marketplaces.json` 的本地注册表缓存中时，请使用 `plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

当您想要显式传递市场源时，请使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

市场源可以是：

- 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知市场名称
- 本地市场根目录或 `marketplace.json` 路径
- GitHub 仓库简写，例如 `owner/repo`
- GitHub 仓库 URL，例如 `https://github.com/owner/repo`
- git URL

对于从 GitHub 或 git 加载的远程市场，插件条目必须保留在克隆的市场仓库内。OpenClaw 接受来自该仓库的相对路径源，并拒绝来自远程清单的 HTTP(S)、绝对路径、git、GitHub 和其他非路径插件源。

对于本地路径和归档，OpenClaw 会自动检测：

- 原生 OpenClaw 插件 (`openclaw.plugin.json`)
- Codex 兼容包 (`.codex-plugin/plugin.json`)
- Claude 兼容包 (`.claude-plugin/plugin.json` 或默认 Claude 组件布局)
- Cursor 兼容包 (`.cursor-plugin/plugin.json`)

兼容的包安装到正常的扩展根目录，并参与相同的列表/信息/启用/禁用流程。目前，支持包技能、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` / 清单声明的 `lspServers` 默认值、Cursor 命令技能以及兼容的 Codex hook 目录；其他检测到的包功能会在诊断/信息中显示，但尚未连接到运行时执行。

### 列表

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

使用 `--enabled` 仅显示已加载的插件。使用 `--verbose` 从表格视图切换到包含源/来源/版本/激活元数据的单个插件详细行。使用 `--json` 获取机器可读的清单以及注册表诊断。

使用 `--link` 以避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

`--force` 不支持与 `--link` 一起使用，因为链接安装会重用
源路径，而不是复制到受管理的安装目标。

在 npm 安装上使用 `--pin`，可以将解析出的确切规范（`name@version`）保存在
`plugins.installs` 中，同时保持默认行为不受限制。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 会从 `plugins.entries`、`plugins.installs`、
插件允许列表以及（如适用）链接的 `plugins.load.paths` 条目中移除插件记录。
对于活动的内存插件，内存插槽会重置为 `memory-core`。

默认情况下，卸载也会移除活动状态目录插件根目录下的插件安装目录。使用
`--keep-files` 以保留磁盘上的文件。

支持将 `--keep-config` 作为 `--keep-files` 的已弃用别名。

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新适用于 `plugins.installs` 中跟踪的安装以及 `hooks.internal.installs` 中跟踪的 hook-pack
安装。

当您传递插件 ID 时，OpenClaw 会重用为该插件记录的安装规范。这意味着之前存储的分发标签（如 `@beta`）和确切固定版本
在后续的 `update <id>` 运行中会继续使用。

对于 npm 安装，您还可以传递带有分发标签
或确切版本的显式 npm 包规范。OpenClaw 会将该包名解析回跟踪的插件
记录，更新该已安装的插件，并记录新的 npm 规范以供未来
基于 ID 的更新使用。

当存在存储的完整性哈希且获取的工件哈希发生变化时，
OpenClaw 会打印警告并在继续之前请求确认。使用
全局 `--yes` 可在 CI/非交互式运行中跳过提示。

`--dangerously-force-unsafe-install` 也可以在 `plugins update` 上使用，作为插件更新期间内置危险代码扫描误报的应急覆盖选项。它仍然不会绕过插件 `before_install` 策略阻止或扫描失败阻止，并且仅适用于插件更新，不适用于 hook-pack 更新。

### 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

对单个插件进行深度检查。显示身份、加载状态、来源、注册的功能、hooks、工具、命令、服务、网关方法、HTTP 路由、策略标志、诊断、安装元数据、bundle 功能以及检测到的任何 MCP 或 LSP 服务器支持。

每个插件根据其在运行时实际注册的内容进行分类：

- **plain-capability** — 一种功能类型（例如仅 提供商 插件）
- **hybrid-capability** — 多种功能类型（例如文本 + 语音 + 图像）
- **hook-only** — 仅 hooks，没有功能或界面
- **non-capability** — 工具/命令/服务但没有功能

有关功能模型 的更多信息，请参阅 [Plugin shapes](/en/plugins/architecture#plugin-shapes)。

`--json` 标志输出适合脚本编写和审计的机器可读报告。

`inspect --all` 会渲染一个包含形状、功能类型、兼容性通知、bundle 功能和 hook 摘要列的全局表格。

`info` 是 `inspect` 的别名。

### 诊断

```bash
openclaw plugins doctor
```

`doctor` 报告插件加载错误、清单/发现诊断以及兼容性通知。当一切正常时，它会打印 `No plugin issues
detected.`。

### 市场

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace list 接受本地市场路径、`marketplace.json` 路径、
GitHub 简写如 `owner/repo`、GitHub 仓库 URL 或 git URL。`--json`
会打印解析出的源标签以及解析后的市场清单和
插件条目。
