---
summary: "安装、配置和管理 OpenClaw 插件"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "插件"
sidebarTitle: "安装与配置"
---

插件为 OpenClaw 扩展了新功能：渠道、模型提供商、
代理 harness、工具、技能、语音、实时转录、实时
语音、媒体理解、图像生成、视频生成、Web 获取、Web
搜索等等。有些插件是**核心**插件（随 OpenClaw 附带），其他
则是**外部**插件（由社区发布到 npm 上）。

## 快速开始

<Steps>
  <Step title="查看已加载的内容">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="安装插件">
    ```bash
    # From npm
    openclaw plugins install @openclaw/voice-call

    # From a local directory or archive
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="重启网关">
    ```bash
    openclaw gateway restart
    ```

    然后在配置文件的 `plugins.entries.\<id\>.config` 下进行配置。

  </Step>
</Steps>

如果您更喜欢聊天原生控制，请启用 `commands.plugins: true` 并使用：

```text
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

安装路径使用与 CLI 相同的解析器：本地路径/归档、显式
`clawhub:<pkg>`、显式 `npm:<pkg>` 或裸包规范（优先 ClawHub，然后
npm 回退）。

如果配置无效，安装通常会失败并指向 `openclaw doctor --fix`。唯一的恢复例外是针对选择加入 `openclaw.install.allowInvalidConfigRecovery` 的插件的一条狭窄的捆绑插件重新安装路径。
在 Gateway(网关) 启动期间，一个插件的无效配置会被隔离到该插件：启动过程会记录 `plugins.entries.<id>.config` 问题，在加载期间跳过该插件，并使其他插件和渠道保持在线。运行 `openclaw doctor --fix`，通过禁用该插件条目并移除其无效配置负载来隔离错误的插件配置；正常的配置备份会保留以前的值。
当渠道配置引用了一个不再可发现的插件，但相同的陈旧插件 ID 仍保留在插件配置或安装记录中时，Gateway(网关) 启动会记录警告并跳过该渠道，而不是阻塞其他所有渠道。运行 `openclaw doctor --fix` 以移除陈旧的渠道/插件条目；没有陈旧插件证据的未知渠道密钥仍然无法通过验证，因此拼写错误仍然可见。

打包的 OpenClaw 安装不会急切地安装每个捆绑插件的运行时依赖树。当 OpenClaw 拥有的捆绑插件通过插件配置、旧版渠道配置或默认启用的清单处于活动状态时，启动过程仅会在导入该插件之前修复其声明的运行时依赖项。仅持久的渠道身份验证状态不会激活捆绑渠道以进行 Gateway(网关) 启动运行时依赖修复。
显式禁用仍然优先：`plugins.entries.<id>.enabled: false`、`plugins.deny`、`plugins.enabled: false` 和 `channels.<id>.enabled: false` 会阻止针对该插件/渠道的自动捆绑运行时依赖修复。非空的 `plugins.allow` 也会限制默认启用的捆绑运行时依赖修复；显式的捆绑渠道启用（`channels.<id>.enabled: true`）仍然可以修复该渠道的插件依赖项。
外部插件和自定义加载路径仍必须通过 `openclaw plugins install` 安装。

## 插件类型

OpenClaw 识别两种插件格式：

| 格式       | 工作原理                                           | 示例                                                   |
| ---------- | -------------------------------------------------- | ------------------------------------------------------ |
| **原生**   | `openclaw.plugin.json` + 运行时模块；在进程内执行  | 官方插件，社区 npm 包                                  |
| **Bundle** | Codex/Claude/Cursor 兼容布局；映射到 OpenClaw 功能 | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

两者都显示在 `openclaw plugins list` 下。有关捆绑包的详细信息，请参阅[插件捆绑包](/zh/plugins/bundles)。

如果您正在编写原生插件，请从[构建插件](/zh/plugins/building-plugins)
和[插件 SDK 概述](/zh/plugins/sdk-overview)开始。

## 包入口点

原生插件 npm 包必须在 `package.json` 中声明 `openclaw.extensions`。
每个条目必须保留在包目录内，并解析为可读的
运行时文件，或解析为具有推断生成的 JavaScript
对等文件（例如从 `src/index.ts` 到 `dist/index.js`）的 TypeScript 源文件。

当发布的运行时文件与源条目不在同一路径时，请使用 `openclaw.runtimeExtensions`。如果存在，`runtimeExtensions` 必须为
每个 `extensions` 条目包含恰好一个条目。列表不匹配将导致安装和
插件发现失败，而不是静默回退到源路径。

```json
{
  "name": "@acme/openclaw-plugin",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"]
  }
}
```

## 官方插件

### 可安装 (npm)

| 插件            | 包                     | 文档                                    |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/zh/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/zh/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/zh/channels/nostr)             |
| 语音通话        | `@openclaw/voice-call` | [语音通话](/zh/plugins/voice-call)      |
| Zalo            | `@openclaw/zalo`       | [Zalo](/zh/channels/zalo)               |
| Zalo 个人版     | `@openclaw/zalouser`   | [Zalo 个人版](/zh/plugins/zalouser)     |

### 核心（随 OpenClaw 一起提供）

<AccordionGroup>
  <Accordion title="Model providers (enabled by default)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="Memory plugins">- `memory-core` — 捆绑的内存搜索（默认通过 `plugins.slots.memory`） - `memory-lancedb` — 按需安装的长期内存，具有自动召回/捕获功能（设置 `plugins.slots.memory = "memory-lancedb"`）</Accordion>

<Accordion title="Speech providers (enabled by default)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Other">
    - `browser` — 浏览器工具的捆绑浏览器插件，`openclaw browser` CLI，`browser.request` 网关方法，浏览器运行时以及默认的浏览器控制服务（默认启用；替换前请禁用）
    - `copilot-proxy` — VS Code Copilot 代理桥（默认禁用）
  </Accordion>
</AccordionGroup>

寻找第三方插件？请参阅[社区插件](/zh/plugins/community)。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

| 字段             | 描述                                             |
| ---------------- | ------------------------------------------------ |
| `enabled`        | 主开关（默认：`true`）                           |
| `allow`          | 插件允许列表（可选）                             |
| `deny`           | 插件拒绝列表（可选；拒绝优先）                   |
| `load.paths`     | 额外的插件文件/目录                              |
| `slots`          | 独占插槽选择器（例如 `memory`，`contextEngine`） |
| `entries.\<id\>` | 单个插件开关 + 配置                              |

配置更改**需要重启 Gateway(网关)**。如果 Gateway(网关) 在启用了配置监视 + 进程内重启的情况下运行（默认 `openclaw gateway` 路径），该重启通常在配置写入完成后片刻自动执行。对于原生插件运行时代码或生命周期挂钩，不支持热重载；在期望更新后的 `register(api)` 代码、`api.on(...)` 挂钩、工具、服务或提供商/运行时挂钩运行之前，请重启服务于实时渠道的 Gateway(网关) 进程。

`openclaw plugins list` 是一个本地插件注册表/配置快照。那里的 `enabled` 插件意味着持久化的注册表和当前配置允许该插件参与。这并不能证明已经运行的远程 Gateway(网关) 子进程已经重启到了相同的插件代码中。在带有包装进程的 VPS/容器设置中，请将重启信号发送到实际的 `openclaw gateway run` 进程，或者对正在运行的 Gateway(网关) 使用 `openclaw gateway restart`。

<Accordion title="Plugin states: disabled vs missing vs invalid">- **Disabled**（已禁用）：插件存在，但启用规则将其关闭。配置被保留。 - **Missing**（缺失）：配置引用了设备发现未找到的插件 ID。 - **Invalid**（无效）：插件存在，但其配置与声明的架构不匹配。Gateway(网关) 启动时仅跳过该插件；`openclaw doctor --fix` 可以通过禁用并移除其配置负载来隔离无效条目。</Accordion>

## 设备发现和优先级

OpenClaw 按以下顺序扫描插件（首次匹配优先）：

<Steps>
  <Step title="配置路径">
    `plugins.load.paths` — 显式的文件或目录路径。指向 OpenClaw
    自带打包捆绑插件目录的路径将被忽略；运行
    `openclaw doctor --fix` 可移除那些失效的别名。
  </Step>

  <Step title="工作区插件">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="全局插件">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="捆绑插件">
    随 OpenClaw 一起交付。许多插件默认启用（模型提供商，语音）。
    其他插件需要显式启用。
  </Step>
</Steps>

包安装和 Docker 镜像通常从已编译的
`dist/extensions` 树中解析捆绑插件。如果将捆绑插件源目录
绑定挂载到匹配的打包源路径上，例如
`/app/extensions/synology-chat`，OpenClaw 会将该挂载的源目录
视为捆绑源覆盖层，并在打包的
`/app/dist/extensions/synology-chat` 捆绑包之前发现它。这使得维护者容器
循环能够正常工作，而无需将每个捆绑插件都切换回 TypeScript 源码。
设置 `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1` 可强制使用打包的 dist 捆绑包，
即使存在源覆盖层挂载也是如此。

### 启用规则

- `plugins.enabled: false` 禁用所有插件
- `plugins.deny` 始终覆盖 allow
- `plugins.entries.\<id\>.enabled: false` 禁用该插件
- 工作区来源的插件**默认禁用**（必须显式启用）
- 捆绑插件遵循内置的默认开启集合，除非被覆盖
- 排他性插槽可以强制启用该插槽选定的插件
- 当配置命名了插件拥有的界面（例如提供商模型引用、渠道配置或工具
  运行时）时，某些捆绑的可选插件会自动启用
- OpenAI 系列的 Codex 路由保持独立的插件边界：`openai-codex/*` 属于 OpenAI 插件，而捆绑的 Codex 应用服务器插件由 `agentRuntime.id: "codex"` 或传统的 `codex/*` 模型引用选择。

## 运行时钩子故障排除

如果某个插件出现在 `plugins list` 中，但 `register(api)` 副作用或钩子未在实时聊天流量中运行，请首先检查以下内容：

- 运行 `openclaw gateway status --deep --require-rpc` 并确认活动的 Gateway(网关) URL、配置文件、配置路径和进程是您正在编辑的那些。
- 在插件安装/配置/代码更改后，重启活动的 Gateway(网关)。在包装容器中，PID 1 可能只是一个监管程序；重启或向子 `openclaw gateway run` 进程发送信号。
- 使用 `openclaw plugins inspect <id> --json` 确认钩子注册和诊断信息。非捆绑的对话钩子（例如 `llm_input`、`llm_output`、`before_agent_finalize` 和 `agent_end`）需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。
- 对于模型切换，首选 `before_model_resolve`。它在代理轮次的模型解析之前运行；`llm_output` 仅在模型尝试生成助手输出之后运行。
- 若要验证有效的会话模型，请使用 `openclaw sessions` 或 Gateway(网关) 会话/status 接口；在调试提供商负载时，请使用 `--raw-stream --raw-stream-path <path>` 启动 Gateway(网关)。

### 重复的渠道或工具所有权

症状：

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

这些意味着多个已启用的插件试图拥有同一个渠道、设置流程或工具名称。最常见的原因是，在某个现在提供相同渠道 ID 的捆绑插件旁边安装了一个外部渠道插件。

调试步骤：

- 运行 `openclaw plugins list --enabled --verbose` 以查看每个已启用的插件及其来源。
- 对每个可疑的插件运行 `openclaw plugins inspect <id> --json`，并比较 `channels`、`channelConfigs`、`tools` 和诊断信息。
- 在安装或移除插件包后运行 `openclaw plugins registry --refresh`，以便持久化的元数据反映当前的安装情况。
- 在安装、注册表或配置更改后重启 Gateway(网关)。

修复选项：

- 如果一个插件有意替换另一个插件以用于相同的渠道 ID，首选插件应使用优先级较低的插件 ID 声明 `channelConfigs.<channel-id>.preferOver`。请参阅 [/plugins/manifest#replacing-another-渠道-plugin](/zh/plugins/manifest#replacing-another-channel-plugin)。
- 如果是意外重复，请使用 `plugins.entries.<plugin-id>.enabled: false` 禁用其中一方，或移除过时的插件安装。
- 如果您显式启用了这两个插件，OpenClaw 将保留该请求并报告冲突。为该渠道选择一个所有者，或重命名插件拥有的工具，以使运行时界面明确无误。

## 插件插槽（独占类别）

某些类别是独占的（一次只能有一个处于活动状态）：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable
      contextEngine: "legacy", // or a plugin id
    },
  },
}
```

| 插槽            | 控制内容       | 默认值           |
| --------------- | -------------- | ---------------- |
| `memory`        | 活动内存插件   | `memory-core`    |
| `contextEngine` | 活动上下文引擎 | `legacy`（内置） |

## CLI 参考

```bash
openclaw plugins list                       # compact inventory
openclaw plugins list --enabled            # only enabled plugins
openclaw plugins list --verbose            # per-plugin detail lines
openclaw plugins list --json               # machine-readable inventory
openclaw plugins inspect <id>              # deep detail
openclaw plugins inspect <id> --json       # machine-readable
openclaw plugins inspect --all             # fleet-wide table
openclaw plugins info <id>                 # inspect alias
openclaw plugins doctor                    # diagnostics
openclaw plugins registry                  # inspect persisted registry state
openclaw plugins registry --refresh        # rebuild persisted registry
openclaw doctor --fix                      # repair plugin registry state

openclaw plugins install <package>         # install (ClawHub first, then npm)
openclaw plugins install clawhub:<pkg>     # install from ClawHub only
openclaw plugins install npm:<pkg>         # install from npm only
openclaw plugins install <spec> --force    # overwrite existing install
openclaw plugins install <path>            # install from local path
openclaw plugins install -l <path>         # link (no copy) for dev
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # record exact resolved npm spec
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id-or-npm-spec> # update one plugin
openclaw plugins update <id-or-npm-spec> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config and plugin index records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

openclaw plugins enable <id>
openclaw plugins disable <id>
```

捆绑插件随 OpenClaw 一起提供。许多默认已启用（例如捆绑的模型提供商、捆绑的语音提供商和捆绑的浏览器插件）。其他捆绑插件仍需要 `openclaw plugins enable <id>`。

`--force` 会就地覆盖现有的已安装插件或挂钩包。使用 `openclaw plugins update <id-or-npm-spec>` 对已跟踪的 npm 插件进行常规升级。不支持 `--link`，它会重用源路径而不是复制到受管理的安装目标。

当 `plugins.allow` 已设置时，`openclaw plugins install` 会在启用插件之前将已安装的插件 ID 添加到该允许列表中。如果 `plugins.deny` 中存在相同的插件 ID，安装会删除该过时的拒绝条目，以便在重启后立即可加载显式安装的插件。

OpenClaw 维护一个持久化的本地插件注册表，作为插件清单、贡献所有权和启动规划的冷读取模型。安装、更新、卸载、启用和禁用流程会在更改插件状态后刷新该注册表。同一个 `plugins/installs.json` 文件在顶层的 `installRecords` 中保存持久的安装元数据，并在 `plugins` 中保存可重建的清单元数据。如果注册表丢失、过期或无效，`openclaw plugins registry
--refresh` 会从安装记录、配置策略和清单/包元数据重建其清单视图，而无需加载插件运行时模块。
`openclaw plugins update <id-or-npm-spec>` 适用于已跟踪的安装。传递带有分发标签或确切版本的 npm 包规范会将包名解析回已跟踪的插件记录，并记录新规范以供将来更新。传递不带版本的包名会将精确固定的安装移回注册表的默认发布线。如果已安装的 npm 插件已匹配解析的版本和记录的工件标识，OpenClaw 将跳过更新，而不会下载、重新安装或重写配置。

`--pin` 仅适用于 npm。它不支持与 `--marketplace` 一起使用，因为市场安装会持久化市场源元数据而不是 npm 规范。

`--dangerously-force-unsafe-install` 是针对内置危险代码扫描器误报的应急覆盖选项。它允许插件安装和插件更新继续进行，忽略内置 `critical` 的发现，但它仍然无法绕过插件 `before_install` 策略阻止或扫描失败阻止。安装扫描会忽略常见的测试文件和目录，例如 `tests/`、
`__tests__/`、`*.test.*` 和 `*.spec.*`，以避免阻止打包的测试模拟；声明的插件运行时入口点即使使用其中之一，仍会被扫描。

此 CLI 标志仅适用于插件安装/更新流程。Gateway(网关) 支持的技能依赖安装使用匹配的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是单独的 ClawHub 技能下载/安装流程。

兼容的捆绑包参与相同的插件列表/检查/启用/禁用流程。当前的运行时支持包括捆绑包技能、Claude 命令技能、Claude `settings.json` 默认值、Claude `.lsp.json` 和清单声明的 `lspServers` 默认值、Cursor 命令技能以及兼容的 Codex hook 目录。

`openclaw plugins inspect <id>` 还会报告检测到的捆绑包功能，以及支持或不支持的捆绑包支持插件的 MCP 和 LSP 服务器条目。

Marketplace 源可以是来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude known-marketplace 名称、本地 marketplace 根目录或 `marketplace.json` 路径、类似于 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL 或 git URL。对于远程 marketplace，插件条目必须保留在克隆的 marketplace 仓库中，并且仅使用相对路径源。

有关完整的详细信息，请参阅 [`openclaw plugins` CLI 参考](/zh/cli/plugins)。

## 插件 API 概述

原生插件导出一个暴露 `register(api)` 的入口对象。较旧的插件可能仍将 `activate(api)` 用作遗留别名，但新插件应使用 `register`。

```typescript
export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
    api.registerChannel({
      /* ... */
    });
  },
});
```

OpenClaw 加载入口对象并在插件激活期间调用 `register(api)`。加载器仍然会对较旧的插件回退到 `activate(api)`，但捆绑的插件和新的外部插件应将 `register` 视为公共契约。

`api.registrationMode` 告诉插件为什么要加载其入口：

| 模式            | 含义                                                                                   |
| --------------- | -------------------------------------------------------------------------------------- |
| `full`          | 运行时激活。注册工具、hooks、服务、命令、路由和其他实时副作用。                        |
| `discovery`     | 只读功能发现。注册提供程序和元数据；受信任的插件入口代码可能会加载，但跳过实时副作用。 |
| `setup-only`    | 通过轻量级设置入口加载渠道设置元数据。                                                 |
| `setup-runtime` | 同时需要运行时入口的渠道设置加载。                                                     |
| `cli-metadata`  | 仅 CLI 命令元数据收集。                                                                |

打开套接字、数据库、后台工作程序或长期客户端的插件条目应使用 `api.registrationMode === "full"` 来保护这些副作用。设备发现加载与激活加载分别缓存，并且不会替换正在运行的 Gateway(网关) 注册表。设备发现是非激活的，但并非免导入：OpenClaw 可能会评估受信任的插件条目或渠道插件模块以构建快照。保持模块顶层轻量级且无副作用，并将网络客户端、子进程、侦听器、凭证读取和服务启动移至完整运行时路径之后。

常用注册方法：

| 方法                                    | 注册内容            |
| --------------------------------------- | ------------------- |
| `registerProvider`                      | 模型提供商 (LLM)    |
| `registerChannel`                       | 聊天渠道            |
| `registerTool`                          | 代理工具            |
| `registerHook` / `on(...)`              | 生命周期钩子        |
| `registerSpeechProvider`                | 文本转语音 / STT    |
| `registerRealtimeTranscriptionProvider` | 流式 STT            |
| `registerRealtimeVoiceProvider`         | 双工实时语音        |
| `registerMediaUnderstandingProvider`    | 图像/音频分析       |
| `registerImageGenerationProvider`       | 图像生成            |
| `registerMusicGenerationProvider`       | 音乐生成            |
| `registerVideoGenerationProvider`       | 视频生成            |
| `registerWebFetchProvider`              | Web 获取/抓取提供商 |
| `registerWebSearchProvider`             | Web 搜索            |
| `registerHttpRoute`                     | HTTP 端点           |
| `registerCommand` / `registerCli`       | CLI 命令            |
| `registerContextEngine`                 | 上下文引擎          |
| `registerService`                       | 后台服务            |

类型化生命周期钩子的 Hook 保护行为：

- `before_tool_call`：`{ block: true }` 是终端的；将跳过低优先级处理程序。
- `before_tool_call`：`{ block: false }` 是空操作，并且不会清除先前的阻止。
- `before_install`：`{ block: true }` 是终止的；较低优先级的处理程序将被跳过。
- `before_install`：`{ block: false }` 是无操作，不会清除之前的阻止。
- `message_sending`：`{ cancel: true }` 是终止的；较低优先级的处理程序将被跳过。
- `message_sending` `{ cancel: false }` 是无操作，不会清除之前的取消。

原生 Codex 应用服务器运行桥接，将 Codex 原生工具事件传回此钩子表面。插件可以通过 `before_tool_call` 阻止原生 Codex 工具，通过 `after_tool_call` 观察结果，并参与 Codex `PermissionRequest` 批准。桥接尚不重写 Codex 原生工具参数。确切的 Codex 运行时支持边界位于 [Codex harness v1 支持合约](/zh/plugins/codex-harness#v1-support-contract)。

有关完整的类型化钩子行为，请参阅 [SDK 概述](/zh/plugins/sdk-overview#hook-decision-semantics)。

## 相关

- [构建插件](/zh/plugins/building-plugins) — 创建你自己的插件
- [插件包](/zh/plugins/bundles) — Codex/Claude/Cursor 包兼容性
- [插件清单](/zh/plugins/manifest) — 清单架构
- [注册工具](/zh/plugins/building-plugins#registering-agent-tools) — 在插件中添加代理工具
- [插件内部机制](/zh/plugins/architecture) — 功能模型和加载管道
- [社区插件](/zh/plugins/community) — 第三方列表
