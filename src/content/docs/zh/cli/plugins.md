---
summary: "CLI 参考文档，用于 `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

管理 Gateway(网关) 插件、挂钩包和兼容的包。

相关内容：

- 插件系统：[插件](/zh/tools/plugin)
- 包兼容性：[插件包](/zh/plugins/bundles)
- 插件清单 + 架构：[插件清单](/zh/plugins/manifest)
- 安全加固：[安全](/zh/gateway/security)

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
openclaw plugins update <id-or-npm-spec>
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

如果您的 `plugins` 部分由单个文件 `$include` 支撑，则 `plugins install`、
`plugins update`、`plugins enable`、`plugins disable` 和 `plugins uninstall`
将直接写入该包含的文件，并保持 `openclaw.json` 不变。根包含、包含数组以及带有同级覆盖的包含会以失败关闭（fail closed）
的方式进行处理，而不是进行扁平化。请参阅 [Config includes](/zh/gateway/configuration) 了解
支持的形状。

如果配置无效，`plugins install` 通常会失败关闭并提示您
先运行 `openclaw doctor --fix`。唯一记录在案的例外情况是针对明确选择加入
`openclaw.install.allowInvalidConfigRecovery` 的插件的特定打包插件恢复路径。

`--force` 重用现有的安装目标，就地覆盖已安装的插件或挂钩包。当您有意从新的本地路径、存档、ClawHub 包或 npm 工件重新安装相同的 ID 时，请使用此命令。对于已跟踪的 npm 插件的常规升级，建议使用 `openclaw plugins update <id-or-npm-spec>`。

如果您对已安装的插件 ID 运行 `plugins install`，OpenClaw 会停止并提示您使用 `plugins update <id-or-npm-spec>` 进行常规升级，或者在您确实想从不同的源覆盖当前安装时使用 `plugins install <package> --force`。

`--pin` 仅适用于 npm 安装。它不支持与 `--marketplace` 一起使用，因为市场安装会保留市场源元数据，而不是 npm 规范。

`--dangerously-force-unsafe-install` 是内置危险代码扫描器中误报的“应急”选项。即使内置扫描器报告 `critical` 发现，它也允许继续安装，但它**不**会绕过插件 `before_install` 钩子策略阻止，也**不**会绕过扫描失败。

此 CLI 标志适用于插件安装/更新流程。Gateway(网关) 支持的技能依赖项安装使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是单独的 ClawHub 技能下载/安装流程。

`plugins install` 也是在 `package.json` 中暴露 `openclaw.hooks` 的钩子包的安装界面。使用 `openclaw hooks` 进行筛选的钩子可见性和单个钩子启用，而不是软件包安装。

Npm 规范仅限于**仅注册表**（包名称 + 可选的**确切版本**或
**dist-tag**）。Git/URL/文件规范和 semver 范围会被拒绝。依赖项
安装使用 `--ignore-scripts` 运行以确保安全。

裸规范和 `@latest` 保持在稳定轨道上。如果 npm 将其中任何一个解析为预发布版本，OpenClaw 会停止并要求您使用预发布标记（例如 `@beta`/`@rc`）或确切的预发布版本（例如 `@1.2.3-beta.4`）明确选择加入。

如果裸安装规范与捆绑插件 ID 匹配（例如 `diffs`），OpenClaw
将直接安装捆绑的插件。要安装同名
的 npm 包，请使用显式的作用域规范（例如 `@scope/diffs`）。

支持的归档文件：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支持从 Claude marketplace 进行安装。

ClawHub 安装使用显式的 `clawhub:<package>` 定位符：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw 现在也更倾向于对裸 ClawHub 安全插件规范使用 npm。仅当 npm 没有该软件包或版本时才会回退到 ClawHub：

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw 从 ClawHub 下载软件包归档，检查声明的插件 API / 最低网关兼容性，然后通过正常归档路径进行安装。已记录的安装会保留其 ClawHub 源元数据以便日后更新。

当市场名称存在于 Claude 的本地注册表缓存 `~/.claude/plugins/known_marketplaces.json` 中时，使用 `plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

当您想要显式传递市场来源时，请使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Marketplace 来源可以是：

- 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 Marketplace 名称
- 本地 Marketplace 根目录或 `marketplace.json` 路径
- GitHub 仓库简写，例如 `owner/repo`
- GitHub 仓库 URL，例如 `https://github.com/owner/repo`
- 一个 git URL

对于从 GitHub 或 git 加载的远程 Marketplace，插件条目必须保留在克隆的 Marketplace 仓库内。OpenClaw 接受来自该仓库的相对路径来源，并拒绝来自远程清单的 HTTP(S)、绝对路径、git、GitHub 和其他非路径插件来源。

对于本地路径和归档，OpenClaw 会自动检测：

- 原生 OpenClaw 插件 (`openclaw.plugin.json`)
- Codex 兼容的捆绑包 (`.codex-plugin/plugin.json`)
- Claude 兼容的捆绑包 (`.claude-plugin/plugin.json` 或默认的 Claude 组件布局)
- Cursor 兼容的包 (`.cursor-plugin/plugin.json`)

兼容的包会安装到常规插件根目录，并参与相同的 list/info/enable/disable 流程。目前，支持包技能、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` / 清单声明的 `lspServers` 默认值、Cursor 命令技能以及兼容的 Codex hook 目录；其他检测到的包功能会显示在诊断/信息中，但尚未接入运行时执行。

### 列表

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

使用 `--enabled` 仅显示已加载的插件。使用 `--verbose` 从表格视图切换到包含源/来源/版本/激活元数据的每个插件详细行视图。使用 `--json` 获取机器可读的清单以及注册表诊断信息。

使用 `--link` 以避免复制本地目录（添加到 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

`--force` 不支持 `--link`，因为链接安装重用源路径，而不是复制到受管安装目标。

在 npm 安装上使用 `--pin`，以便将已解析的确切规范 (`name@version`) 保存在 `plugins.installs` 中，同时保持默认行为未固定。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 从 `plugins.entries`、`plugins.installs`、插件允许列表以及适用的链接 `plugins.load.paths` 条目中移除插件记录。对于活动内存插件，内存插槽重置为 `memory-core`。

默认情况下，卸载也会删除活动 state-dir 插件根目录下的插件安装目录。使用 `--keep-files` 可保留磁盘上的文件。

`--keep-config` 作为 `--keep-files` 的已弃用别名受支持。

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新适用于 `plugins.installs` 中已跟踪的安装以及 `hooks.internal.installs` 中已跟踪的 hook-pack 安装。

当您传递插件 ID 时，OpenClaw 会重用该插件的记录安装规范。这意味着先前存储的 dist-tags（如 `@beta`）和精确固定的版本将在以后的 `update <id>` 运行中继续被使用。

对于 npm 安装，您还可以传递带有 dist-tag 或确切版本的显式 npm 包规范。OpenClaw 将该包名称解析回跟踪的插件记录，更新已安装的插件，并记录新的 npm 规范以供将来基于 ID 的更新使用。

传递不带版本或标签的 npm 包名称也会解析回跟踪的插件记录。当插件被固定到特定版本而您希望将其移回注册表的默认发布行时，请使用此方法。

在进行实际的 npm 更新之前，OpenClaw 会对照 npm 注册表元数据检查已安装的包版本。如果已安装的版本和记录的工件标识已与解析的目标匹配，则跳过更新，而不进行下载、重新安装或重写 `openclaw.json`。

当存储的完整性哈希存在且获取的构件哈希发生变化时，
OpenClaw 会将其视为 npm 构件漂移。交互式
`openclaw plugins update` 命令会打印预期和实际哈希，并在继续之前请求
确认。非交互式更新助手会以失败关闭（fail closed），
除非调用者提供明确的继续策略。

`--dangerously-force-unsafe-install` 也可以在 `plugins update` 上作为
一种应急覆盖手段，用于插件更新期间内置危险代码扫描的误报。
它仍然不会绕过插件 `before_install` 策略阻止
或扫描失败阻止，并且仅适用于插件更新，不适用于 hook-pack
更新。

### 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

对单个插件进行深度自省。显示身份、加载状态、来源、
已注册的能力、钩子、工具、命令、服务、网关方法、
HTTP 路由、策略标志、诊断信息、安装元数据、
捆绑包能力以及检测到的任何 MCP 或 LSP 服务器支持。

每个插件根据其在运行时实际注册的内容进行分类：

- **plain-capability** — 一种能力类型（例如仅提供商的插件）
- **hybrid-capability** — 多种能力类型（例如文本 + 语音 + 图像）
- **hook-only** — 仅包含钩子，不包含能力或界面
- **non-capability** — 包含工具/命令/服务但不包含能力

有关能力模型的更多信息，请参阅 [Plugin shapes](/zh/plugins/architecture#plugin-shapes)。

`--json` 标志输出适合脚本编写和
审计的机器可读报告。

`inspect --all` 会渲染一个包含 shape、capability kinds、
兼容性通知、bundle capabilities 和 hook summary 列的
fleet-wide 表格。

`info` 是 `inspect` 的别名。

### Doctor

```bash
openclaw plugins doctor
```

`doctor` 报告插件加载错误、manifest/discovery 诊断信息和
兼容性通知。当一切正常时，它会打印 `No plugin issues
detected.`。

对于缺少 `register`/`activate` 导出等 module-shape 失败，
请使用 `OPENCLAW_PLUGIN_LOAD_DEBUG=1` 重新运行，以在诊断输出中包含
紧凑的导出 shape 摘要。

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace 列表接受本地 marketplace 路径、`marketplace.json` 路径、
类似于 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL 或 git URL。`--json`
会打印解析后的源标签以及解析后的 marketplace 清单和插件条目。
