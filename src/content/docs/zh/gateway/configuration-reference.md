---
summary: "Gateway(网关)OpenClaw核心 OpenClaw 键、默认值以及指向专用子系统参考链接的 Gateway(网关) 配置参考"
title: "配置参考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

`~/.openclaw/openclaw.json` 的核心配置参考。有关面向任务的概述，请参阅 [配置](/zh/gateway/configuration)。

涵盖主要的 OpenClaw 配置层，当子系统拥有其更深入的参考文档时提供链接。渠道和插件拥有的命令目录以及深度内存/QMD 调节项位于其各自的页面，而非本页面。

代码事实：

- `openclaw config schema` 打印用于验证和控制 UI 的实时 JSON 架构，并在可用时合并捆绑/插件/渠道元数据
- `config.schema.lookup` 返回一个路径范围的架构节点，用于深入挖掘工具
- `pnpm config:docs:check` / `pnpm config:docs:gen` 针对当前架构表面验证配置文档基准哈希

Agent 查找路径：在编辑之前，请使用 `gateway` 工具操作 `config.schema.lookup` 获取确切的字段级文档和约束。请参阅 [Configuration](/zh/gateway/configuration) 获取面向任务的指导，并参阅本页面了解更广泛的字段映射、默认值以及子系统参考的链接。

专用深入参考：

- `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 以及 `plugins.entries.memory-core.config.dreaming` 下的 dreaming 配置的 [Memory configuration reference](/zh/reference/memory-config)
- 当前内置 + 捆绑命令目录的 [Slash commands](/zh/tools/slash-commands)
- 渠道特定命令层面的所属渠道/插件页面

配置格式为 **JSON5**（允许注释和尾随逗号）。所有字段都是可选的 - 如果省略，OpenClaw 会使用安全的默认值。

---

## 渠道

Per-渠道 config keys moved to a dedicated page - see
[Configuration - channels](/zh/gateway/config-channels) for `channels.*`,
including Slack, Discord, Telegram, WhatsApp, Matrix, iMessage, and other
bundled channels (auth, access control, multi-account, mention gating).

## Agent 默认值、多代理、会话和消息

已移至专门的页面 - 请参阅
[Configuration - agents](/zh/gateway/config-agents) 以了解：

- `agents.defaults.*` (工作区、模型、思考、心跳、内存、媒体、技能、沙盒)
- `multiAgent.*` (多智能体路由和绑定)
- `session.*` (会话生命周期、压缩、修剪)
- `messages.*` (消息传递、TTS、Markdown 渲染)
- `talk.*` (Talk 模式)
  - `talk.consultThinkingLevel`OpenClaw：针对 Control UI Talk 实时咨询背后的完整 OpenClaw 智能体运行的思考级别覆盖
  - `talk.consultFastMode`：针对 Control UI Talk 实时咨询的一次性快速模式覆盖
  - `talk.speechLocale`iOSmacOS：用于 iOS/macOS 上 Talk 语音识别的可选 BCP 47 区域设置 ID
  - `talk.silenceTimeoutMs`：未设置时，Talk 在发送转录文本之前保持平台默认的暂停窗口 (`700 ms on macOS and Android, 900 ms on iOS`)

## 工具和自定义提供商

工具策略、实验性开关、提供商支持的工具配置以及自定义
提供商/基础 URL 设置已移至专门的页面 - 请参阅
[Configuration - tools and custom providers](/zh/gateway/config-tools)。

## 模型

提供商定义、模型允许列表以及自定义提供商设置位于
[Configuration - tools and custom providers](/zh/gateway/config-tools#custom-providers-and-base-urls) 中。
`models` 根节点也拥有全局模型目录行为。

```json5
{
  models: {
    // Optional. Default: true. Requires a Gateway restart when changed.
    pricing: { enabled: false },
  },
}
```

- `models.mode`：提供商目录行为 (`merge` 或 `replace`)。
- `models.providers`：按提供商 ID 键入的自定义提供商映射。
- `models.providers.*.localService`OpenClaw: 用于本地模型服务器的可选按需进程管理器。当需要时，OpenClaw 会探测配置的健康检查端点，启动绝对 `command`，等待就绪，然后发送模型请求。请参阅 [Local 模型 services](/zh/gateway/local-model-services)。
- `models.pricing.enabled`：控制在 sidecar 和 channel 达到 Gateway(网关) 就绪路径后启动的后台定价引导。当 `false` 时，Gateway(网关) 会跳过 OpenRouter 和 LiteLLM 定价目录的获取；配置的 `models.providers.*.models[].cost` 值仍可用于本地成本估算。

## MCP

由 OpenClaw 管理的 MCP 服务器定义位于 `mcp.servers` 之下，并被嵌入式 Pi 和其他运行时适配器使用。`openclaw mcp list`、`show`、`set` 和 `unset` 命令可管理此块内容，而在配置编辑期间无需连接到目标服务器。

```json5
{
  mcp: {
    // Optional. Default: 600000 ms (10 minutes). Set 0 to disable idle eviction.
    sessionIdleTtlMs: 600000,
    servers: {
      docs: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-fetch"],
      },
      remote: {
        url: "https://example.com/mcp",
        transport: "streamable-http", // streamable-http | sse
        headers: {
          Authorization: "Bearer ${MCP_REMOTE_TOKEN}",
        },
      },
    },
  },
}
```

- `mcp.servers`：用于公开已配置 MCP 工具的运行时的命名 stdio 或远程 MCP 服务器定义。
  远程条目使用 `transport: "streamable-http"` 或 `transport: "sse"`；
  `type: "http"` 是一个 CLI 原生别名，`openclaw mcp set` 和
  `openclaw doctor --fix` 会将其标准化为规范的 `transport` 字段。
- `mcp.sessionIdleTtlMs`：会话作用域的捆绑 MCP 运行时的空闲 TTL。一次性嵌入式运行请求运行结束清理；此 TTL 是长期会话和未来调用者的保障。
- `mcp.*` 下的更改通过释放缓存的会话 MCP 运行时进行热应用。
  下一次工具发现/使用会根据新配置重新创建它们，因此被移除的
  `mcp.servers` 条目会立即被回收，而无需等待空闲 TTL。

有关运行时行为，请参阅 [MCP](/zh/cli/mcp#openclaw-as-an-mcp-client-registry) 和
[CLI backends](/zh/gateway/cli-backends#bundle-mcp-overlays)。

## Skills

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun
      allowUploadedArchives: false,
    },
    entries: {
      "image-lab": {
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

- `allowBundled`：仅限捆绑技能的可选允许列表（托管/工作区技能不受影响）。
- `load.extraDirs`：额外的共享技能根目录（优先级最低）。
- `load.allowSymlinkTargets`：技能符号链接在链接位于其配置的源根目录之外时可以解析到的受信任真实目标根目录。
- `install.preferBrew`: 当为 true 时，如果 `brew` 可用，则在回退到其他类型的安装程序之前优先使用 Homebrew 安装程序。
- `install.nodeManager`: `metadata.openclaw.install` 规范的节点安装程序首选项 (`npm` | `pnpm` | `yarn` | `bun`)。
- `install.allowUploadedArchives`：允许受信任的 `operator.admin`Gateway(网关) Gateway(网关)
  客户端安装通过 `skills.upload.*`ClawHub 暂存的私有 zip 压缩包
  （默认值：false）。这仅启用上传压缩包路径；正常的 ClawHub
  安装不需要它。
- `entries.<skillKey>.enabled: false` 禁用某个技能，即使该技能已被捆绑/安装。
- `entries.<skillKey>.apiKey`：为声明主环境变量（纯文本字符串或 SecretRef 对象）的技能提供的便捷方式。

---

## 插件

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    bundledDiscovery: "allowlist",
    deny: [],
    load: {
      paths: ["~/Projects/oss/voice-call-plugin"],
    },
    entries: {
      "voice-call": {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
        config: { provider: "twilio" },
      },
    },
  },
}
```

- 从 `~/.openclaw/extensions`、`<workspace>/.openclaw/extensions` 以及 `plugins.load.paths` 加载。
- 设备发现接受原生 OpenClaw 插件以及兼容的 Codex 包和 Claude 包，包括无清单的 Claude 默认布局包。
- **配置更改需要重启网关。**
- `allow`：可选允许列表（仅加载列出的插件）。`deny` 优先。
- `bundledDiscovery`：对于新配置默认为 `"allowlist"`，因此非空的
  `plugins.allow` 也会限制捆绑的提供商插件，包括 web-search
  运行时提供商。Doctor 会为迁移的旧版允许列表
  配置写入 `"compat"`，以保留现有的捆绑提供商行为，直到您选择加入。
- `plugins.entries.<id>.apiKey`：插件级 API 密钥便捷字段（当插件支持时）。
- `plugins.entries.<id>.env`：插件作用域环境变量映射。
- `plugins.entries.<id>.hooks.allowPromptInjection`：当 `false` 时，核心模块会拦截 `before_prompt_build` 并忽略旧版 `before_agent_start` 中修改提示词的字段，同时保留旧版 `modelOverride` 和 `providerOverride`。适用于原生插件挂钩和受支持的软件包提供的挂钩目录。
- `plugins.entries.<id>.hooks.allowConversationAccess`：当 `true` 时，受信任的非捆绑插件可以从类型化钩子（例如 `llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize` 和 `agent_end`）读取原始对话内容。
- `plugins.entries.<id>.subagent.allowModelOverride`：显式信任此插件，以便为后台子代理运行请求每次运行的 `provider` 和 `model` 覆盖。
- `plugins.entries.<id>.subagent.allowedModels`：用于受信任子代理覆盖的规范 `provider/model` 目标的可选允许列表。仅当您有意允许任何模型时，才使用 `"*"`。
- `plugins.entries.<id>.llm.allowModelOverride`：明确信任此插件为 `api.runtime.llm.complete` 请求模型覆盖。
- `plugins.entries.<id>.llm.allowedModels`：受信任插件 LLM 完成覆盖的可选规范 `provider/model`LLM 目标允许列表。仅当您有意允许任何模型时才使用 `"*"`。
- `plugins.entries.<id>.llm.allowAgentIdOverride`：显式信任此插件，针对非默认代理 ID 运行 `api.runtime.llm.complete`。
- `plugins.entries.<id>.config`OpenClaw：插件定义的配置对象（如果可用，由原生 OpenClaw 插件架构验证）。
- Channel 插件账户/运行时设置位于 `channels.<id>` 之下，应由所属插件的 manifest `channelConfigs` 元数据进行描述，而不是由中央 OpenClaw 选项注册表描述。

### Codex harness 插件配置

捆绑的 `codex` 插件拥有 `plugins.entries.codex.config` 下的原生 Codex 应用服务器 harness 设置。有关完整的配置界面，请参阅 [Codex harness 参考](/zh/plugins/codex-harness-reference)；有关运行时模型，请参阅 [Codex harness](/zh/plugins/codex-harness)。

`codexPlugins` 仅适用于选择原生 Codex 绑定器的会话。
它不会为 Pi、普通的 OpenAI 提供商运行、ACP
对话绑定或任何非 Codex 绑定器启用 Codex 插件。

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
                allow_destructive_actions: false,
              },
            },
          },
        },
      },
    },
  },
}
```

- `plugins.entries.codex.config.codexPlugins.enabled`：为 Codex 绑定器启用原生 Codex
  插件/应用程序支持。默认值：`false`。
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions`：
  迁移插件应用程序提示的默认破坏性操作策略。
  默认值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled`：当全局 `codexPlugins.enabled` 也为 true 时，
  启用迁移的插件条目。
  对于显式条目，默认值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`:
  稳定的市场标识。V1 仅支持 `"openai-curated"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`: 稳定
  迁移后的 Codex 插件标识，例如 `"google-calendar"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`:
  每个插件的破坏性操作覆盖设置。如果省略，则使用全局
  `allow_destructive_actions` 值。

`codexPlugins.enabled` 是全局启用指令。由迁移写入的显式插件条目是持久化的安装和修复资格集。不支持 `plugins["*"]`，没有 `install` 开关，并且本地 `marketplacePath` 值有意不作为配置字段，因为它们是特定于主机的。

`app/list` 就绪检查会缓存一小时，并在过期时异步刷新。Codex 线程应用配置在 Codex harness 会话建立时计算，而不是每一轮；在更改原生插件配置后，请使用 `/new`、`/reset` 或重启网关。

- `plugins.entries.firecrawl.config.webFetch`Firecrawl：Firecrawl web-fetch 提供商设置。
  - `apiKey`FirecrawlAPI: Firecrawl API 密钥（接受 SecretRef）。回退到 `plugins.entries.firecrawl.config.webSearch.apiKey`、旧版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 环境变量。
  - `baseUrl`FirecrawlAPI: Firecrawl API 基础 URL（默认: `https://api.firecrawl.dev`; 自托管覆盖必须指向私有/内部端点）。
  - `onlyMainContent`: 仅从页面提取主要内容（默认: `true`）。
  - `maxAgeMs`：最大缓存时长，以毫秒为单位（默认：`172800000` / 2 天）。
  - `timeoutSeconds`：抓取请求超时时间，以秒为单位（默认：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search (Grok 网络搜索) 设置。
  - `enabled`：启用 X Search 提供商。
  - `model`：用于搜索的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：记忆梦想设置。有关阶段和阈值，请参阅 [Dreaming](/zh/concepts/dreaming)。
  - `enabled`：主梦想开关（默认 `false`）。
  - `frequency`: 每次完整梦境扫描的 cron 频率（默认为 `"0 3 * * *"`）。
  - `model`: 可选的 Dream Diary 子代理模型覆盖。需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`；与 `allowedModels` 配对以限制目标。模型不可用错误会使用会话默认模型重试一次；信任或允许列表失败不会静默回退。
  - 阶段策略和阈值是实现细节（不是面向用户的配置键）。
- 完整的内存配置位于 [内存配置参考](/zh/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 启用的 Claude bundle 插件还可以从 `settings.json`OpenClawOpenClaw 贡献嵌入式 Pi 默认值；OpenClaw 将这些作为经过清理的代理设置应用，而不是作为原始的 OpenClaw 配置补丁。
- `plugins.slots.memory`：选择活动的内存插件 id，或使用 `"none"` 禁用内存插件。
- `plugins.slots.contextEngine`：选择活动的上下文引擎插件 ID；除非你安装并选择了其他引擎，否则默认为 `"legacy"`。

请参阅 [插件](/zh/tools/plugin)。

---

## 承诺

`commitments` 控制推断的跟进记忆：OpenClaw 可以从对话轮次中检测报到，并通过心跳运行传递它们。

- `commitments.enabled`：为推断的后续承诺启用隐藏 LLM 提取、存储和心跳传递。默认值：`false`。
- `commitments.maxPerDay`：在每个滚动日内，每个代理会话传递的最大推断后续承诺数。默认值：`3`。

请参阅[推断的承诺](/zh/concepts/commitments)。

---

## 浏览器

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "user",
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // opt in only for trusted private-network access
      // allowPrivateNetwork: true, // legacy alias
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    tabCleanup: {
      enabled: true,
      idleMinutes: 120,
      maxTabsPerSession: 8,
      sweepMinutes: 5,
    },
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: {
        cdpPort: 18801,
        color: "#0066CC",
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      user: { driver: "existing-session", attachOnly: true, color: "#00AA00" },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
    color: "#FF4500",
    // headless: false,
    // noSandbox: false,
    // extraArgs: [],
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false,
  },
}
```

- `evaluateEnabled: false` 禁用 `act:evaluate` 和 `wait --fn`。
- `tabCleanup` 在空闲时间过后或当会话超过其上限时，回收已跟踪的主代理标签页。设置 `idleMinutes: 0` 或 `maxTabsPerSession: 0` 可禁用这些单独的清理模式。
- 如果未设置，`ssrfPolicy.dangerouslyAllowPrivateNetwork` 将被禁用，因此默认情况下浏览器导航将保持严格模式。
- 仅当您有意信任私有网络浏览器导航时，才设置 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在严格模式下，远程 CDP 配置文件端点（`profiles.*.cdpUrl`）在可达性/发现检查期间也会受到相同的私有网络阻止限制。
- `ssrfPolicy.allowPrivateNetwork` 仍作为传统别名受到支持。
- 在严格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 进行显式例外处理。
- 远程配置文件仅支持附加（禁用 start/stop/reset）。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。
  当您希望 OpenClaw 发现 `/json/version` 时，请使用 HTTP(S)；当您的提供商为您提供直接的 DevTools WebSocket URL 时，请使用 WS(S)。
- `remoteCdpTimeoutMs` 和 `remoteCdpHandshakeTimeoutMs` 适用于远程和
  `attachOnly` CDP 可达性以及打开标签页的请求。托管回环
  配置文件保留本地 CDP 默认值。
- 如果可通过环回访问外部管理的 CDP 服务，请设置该配置文件的 `attachOnly: true`；否则 OpenClaw 会将环回端口视为本地管理的浏览器配置文件，并可能会报告本地端口所有权错误。
- `existing-session` 配置文件使用 Chrome MCP 而非 CDP，可以附加到选定主机或通过连接的浏览器节点进行附加。
- `existing-session` 配置文件可以设置 `userDataDir` 以定位特定的
  基于 Chromium 的浏览器配置文件，例如 Brave 或 Edge。
- `existing-session` 配置文件保留当前的 Chrome MCP 路由限制：
  使用快照/引用驱动的操作而非 CSS 选择器定位，单文件上传
  钩子，不覆盖对话框超时，不使用 `wait --load networkidle`，也不使用
  `responsebody`、PDF 导出、下载拦截或批量操作。
- 本地托管的 `openclaw` 配置文件会自动分配 `cdpPort` 和 `cdpUrl`；仅
  针对远程 CDP 显式设置 `cdpUrl`。
- 本地托管的配置文件可以设置 `executablePath` 来覆盖该配置文件的
  全局 `browser.executablePath`。使用此功能可以在 Chrome 中运行一个配置文件，而在 Brave 中运行另一个。
- 本地托管配置文件在进程启动后使用 `browser.localLaunchTimeoutMs` 进行 Chrome CDP HTTP
  发现，并使用 `browser.localCdpReadyTimeoutMs` 检测
  启动后 CDP websocket 的就绪状态。在 Chrome 启动成功但就绪检查与启动竞争的较慢主机上，请增加这些值。这两个值必须是
  不超过 `120000` 毫秒的正整数；无效的配置值将被拒绝。
- 自动检测顺序：如果基于 Chromium，则为默认浏览器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- `browser.executablePath` 和 `browser.profiles.<name>.executablePath` 都接受 `~` 和 `~/...` 作为 Chromium 启动前的操作系统主目录。针对 `existing-session` 配置文件的按配置文件 `userDataDir` 也会进行波浪号扩展。
- 控制服务：仅限回环（端口派生自 `gateway.port`，默认为 `18791`）。
- `extraArgs` 将额外的启动标志追加到本地 Chromium 启动中（例如 `--disable-gpu`、窗口大小调整或调试标志）。

---

## UI

```json5
{
  ui: {
    seamColor: "#FF4500",
    assistant: {
      name: "OpenClaw",
      avatar: "CB", // emoji, short text, image URL, or data URI
    },
  },
}
```

- `seamColor`：原生应用 UI 装饰的强调色（对话模式气泡色调等）。
- `assistant`：控制 UI 身份覆盖。回退到活动代理身份。

---

## Gateway(网关)

```json5
{
  gateway: {
    mode: "local", // local | remote
    port: 18789,
    bind: "loopback",
    auth: {
      mode: "token", // none | token | password | trusted-proxy
      token: "your-token",
      // password: "your-password", // or OPENCLAW_GATEWAY_PASSWORD
      // trustedProxy: { userHeader: "x-forwarded-user" }, // for mode=trusted-proxy; see /gateway/trusted-proxy-auth
      allowTailscale: true,
      rateLimit: {
        maxAttempts: 10,
        windowMs: 60000,
        lockoutMs: 300000,
        exemptLoopback: true,
      },
    },
    tailscale: {
      mode: "off", // off | serve | funnel
      resetOnExit: false,
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      // root: "dist/control-ui",
      // embedSandbox: "scripts", // strict | scripts | trusted
      // allowExternalEmbedUrls: false, // dangerous: allow absolute external http(s) embed URLs
      // chatMessageMaxWidth: "min(1280px, 82%)", // optional grouped chat message max-width
      // allowedOrigins: ["https://control.example.com"], // required for non-loopback Control UI
      // dangerouslyAllowHostHeaderOriginFallback: false, // dangerous Host-header origin fallback mode
      // allowInsecureAuth: false,
      // dangerouslyDisableDeviceAuth: false,
    },
    remote: {
      url: "ws://gateway.tailnet:18789",
      transport: "ssh", // ssh | direct
      token: "your-token",
      // password: "your-password",
    },
    trustedProxies: ["10.0.0.1"],
    // Optional. Default false.
    allowRealIpFallback: false,
    nodes: {
      pairing: {
        // Optional. Default unset/disabled.
        autoApproveCidrs: ["192.168.1.0/24", "fd00:1234:5678::/64"],
      },
      allowCommands: ["canvas.navigate"],
      denyCommands: ["system.run"],
    },
    tools: {
      // Additional /tools/invoke HTTP denies
      deny: ["browser"],
      // Remove tools from the default HTTP deny list
      allow: ["gateway"],
    },
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
          timeoutMs: 10000,
        },
      },
    },
  },
}
```

<Accordion title="Gateway(网关)Gateway(网关) 字段详情">

- `mode`: `local` (运行 gateway) 或 `remote`Gateway(网关) (连接到远程 gateway)。除非 `local`，否则 Gateway(网关) 拒绝启动。
- `port`: 用于 WS + HTTP 的单个多路复用端口。优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`: `auto`、`loopback`（默认）、`lan`（`0.0.0.0`）、`tailnet`Tailscale（仅限 Tailscale IP）或 `custom`。
- **旧版绑定别名**：在 `gateway.bind` 中使用绑定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），而不是主机别名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`Docker）。
- **Docker 注意事项**：默认的 `loopback` 绑定在容器内的 `127.0.0.1`Docker 上进行监听。使用 Docker 桥接网络（`-p 18789:18789`）时，流量到达 `eth0`，因此无法访问 gateway。使用 `--network host`，或设置 `bind: "lan"`（或带有 `customBindHost: "0.0.0.0"` 的 `bind: "custom"`）以在所有接口上监听。
- **身份验证**：默认情况下是必需的。非 local loopback 绑定需要 gateway 认证。实际上，这意味着共享令牌/密码或带有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。新手引导向导默认会生成一个令牌。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs），则必须将 `gateway.auth.mode` 显式设置为 `token` 或 `password`。如果同时配置了两者但未设置模式，则启动和服务安装/修复流程将失败。
- `gateway.auth.mode: "none"`: 显式无认证模式。仅用于受信任的 local loopback 设置；新手引导提示有意不提供此选项。
- `gateway.auth.mode: "trusted-proxy"`: 将浏览器/用户身份验证委托给身份感知反向代理，并信任来自 `gateway.trustedProxies` 的身份标头（请参阅 [Trusted Proxy Auth](/zh/gateway/trusted-proxy-auth)）。此模式默认期望**非 local loopback** 代理源；同主机 local loopback 反向代理需要显式的 `gateway.auth.trustedProxy.allowLoopback = true`。内部同主机调用者可以将 `gateway.auth.password` 用作本地直接回退；`gateway.auth.token` 与 trusted-proxy 模式仍然互斥。
- `gateway.auth.allowTailscale`: 当 `true`Tailscale 时，Tailscale Serve 身份标头可以满足 Control UI/WebSocket 认证（通过 `tailscale whois`APITailscale 验证）。HTTP API 端点**不**使用该 Tailscale 标头认证；它们遵循 gateway 的正常 HTTP 认证模式。此无令牌流程假定 gateway 主机是受信任的。当 `tailscale.mode = "serve"` 时，默认为 `true`。
- `gateway.auth.rateLimit`: 可选的失败认证限制器。适用于每个客户端 IP 和每个认证范围（共享密钥和设备令牌独立跟踪）。被阻止的尝试返回 `429` + `Retry-After`Tailscale。
  - 在异步 Tailscale Serve Control UI 路径上，相同 `{scope, clientIp}` 的失败尝试在失败写入之前被序列化。因此，来自同一客户端的并发不良尝试可能会在第二个请求时触发限制器，而不是两者都作为普通不匹配通过竞争。
  - `gateway.auth.rateLimit.exemptLoopback` 默认为 `true`；如果您有意希望也对 localhost 流量进行速率限制（对于测试设置或严格的代理部署），请设置 `false`。
- 浏览器源 WS 认证尝试始终受到限制，并禁用 local loopback 豁免（针对基于浏览器的 localhost 暴力破解的深度防御）。
- 在 local loopback 上，那些浏览器源锁定是按规范化的 `Origin` 值隔离的，因此来自一个 localhost 源的重复失败不会自动锁定不同的源。
- `tailscale.mode`: `serve`（仅限 tailnet，local loopback 绑定）或 `funnel`（公开，需要认证）。
- `tailscale.preserveFunnel`: 当 `true` 且 `tailscale.mode = "serve"`OpenClaw 时，OpenClaw 会在启动时重新应用 Serve 之前检查 `tailscale funnel status`，如果外部配置的 Funnel 路由已覆盖 gateway 端口，则跳过它。默认为 `false`。
- `controlUi.allowedOrigins`Gateway(网关): Gateway WebSocket 连接的显式浏览器源允许列表。当预期来自非 local loopback 源的浏览器客户端时，这是必需的。
- `controlUi.chatMessageMaxWidth`: 分组的 Control UI 聊天消息的可选最大宽度。接受受约束的 CSS 宽度值，例如 `960px`、`82%`、`min(1280px, 82%)` 和 `calc(100% - 2rem)`。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`: 危险模式，为故意依赖 Host-header 源策略的部署启用 Host-header 源回退。
- `remote.transport`: `ssh`（默认）或 `direct` (ws/wss)。对于 `direct`，`remote.url` 必须为 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`: 客户端进程环境应急覆盖，允许纯文本 `ws://` 连接到受信任的专用网络 IP；纯文本默认仍限于 local loopback。没有 `openclaw.json` 等效项，并且浏览器专用网络配置（例如 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`Gateway(网关)）不影响 Gateway WebSocket 客户端。
- `gateway.remote.token` / `.password` 是远程客户端凭据字段。它们本身不配置 gateway 认证。
- `gateway.push.apns.relay.baseUrl`iOSiOS: 官方/TestFlight iOS 版本在将基于中继的注册发布到 gateway 后使用的外部 APNs 中继的基本 HTTPS URL。此 URL 必须与编译到 iOS 版本中的中继 URL 匹配。
- `gateway.push.apns.relay.timeoutMs`: gateway 到中继的发送超时（毫秒）。默认为 `10000`iOS。
- 基于中继的注册被委托给特定的 gateway 身份。配对的 iOS 应用获取 `gateway.identity.get`，将该身份包含在中继注册中，并将注册范围的发送授权转发给 gateway。另一个 gateway 无法重用该存储的注册。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`: 上述中继配置的临时环境覆盖。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`: 仅用于 local loopback HTTP 中继 URL 的开发应急逃生门。生产中继 URL 应保持使用 HTTPS。
- `gateway.handshakeTimeoutMs`Gateway(网关): 预认证 Gateway WebSocket 握手超时（毫秒）。默认：`15000`。如果设置，`OPENCLAW_HANDSHAKE_TIMEOUT_MS` 优先。在负载过重或低功耗主机上增加此值，因为当启动预热仍在进行时，本地客户端可以连接。
- `gateway.channelHealthCheckMinutes`: 渠道健康监控间隔（分钟）。设置 `0` 以全局禁用健康监控重启。默认：`5`。
- `gateway.channelStaleEventThresholdMinutes`: 陈旧套接字阈值（分钟）。保持此值大于或等于 `gateway.channelHealthCheckMinutes`。默认：`30`。
- `gateway.channelMaxRestartsPerHour`: 每个渠道/帐户在滚动小时内最大健康监控重启次数。默认：`10`。
- `channels.<provider>.healthMonitor.enabled`: 每个渠道选择退出健康监控重启，同时保持全局监控启用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: 多帐户渠道的每个帐户覆盖。设置后，它优先于渠道级别覆盖。
- 本地 gateway 调用路径仅当 `gateway.auth.*` 未设置时才能将 `gateway.remote.*` 用作回退。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置但未解析，则解析失败关闭（没有远程回退掩蔽）。
- `trustedProxies`Tailscale: 终止 TLS 或注入转发客户端标头的反向代理 IP。仅列出您控制的代理。对于同主机代理/本地检测设置（例如 Tailscale Serve 或本地反向代理），Local loopback 条目仍然有效，但它们**不会**使 local loopback 请求符合 `gateway.auth.mode: "trusted-proxy"` 的条件。
- `allowRealIpFallback`: 当 `true` 时，如果缺少 `X-Forwarded-For`，gateway 接受 `X-Real-IP`。默认 `false` 用于失败关闭行为。
- `gateway.nodes.pairing.autoApproveCidrs`WebChat: 可选的 CIDR/IP 允许列表，用于自动批准首次节点设备配对且无请求范围。未设置时禁用。这不会自动批准操作员/浏览器/Control UI/WebChat 配对，也不会自动批准角色、范围、元数据或公钥升级。
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`: 在配对和平台允许列表评估后，针对声明的节点命令的全局允许/拒绝塑造。使用 `allowCommands` 以选择加入危险的节点命令，例如 `camera.snap`、`camera.clip` 和 `screen.record`；`denyCommands` 移除命令，即使平台默认值或显式允许将包含它。节点更改其声明的命令列表后，拒绝并重新批准该设备配对，以便 gateway 存储更新的命令快照。
- `gateway.tools.deny`: 为 HTTP `POST /tools/invoke` 阻止的额外工具名称（扩展默认拒绝列表）。
- `gateway.tools.allow`: 从默认 HTTP 拒绝列表中移除工具名称。

</Accordion>

### OpenAI 兼容端点

- 聊天补全：默认禁用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 启用。
- 响应 API：`gateway.http.endpoints.responses.enabled`。
- 响应 URL 输入加固：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空的允许列表被视为未设置；请使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 来禁用 URL 获取。
- 可选的响应加固标头：
  - `gateway.http.securityHeaders.strictTransportSecurity`（仅为您控制的 HTTPS 源设置；请参阅[受信任的代理认证](/zh/gateway/trusted-proxy-auth#tls-termination-and-hsts)）

### 多实例隔离

在一个主机上运行多个网关，使用唯一的端口和状态目录：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便捷标志：`--dev`（使用 `~/.openclaw-dev` + 端口 `19001`），`--profile <name>`（使用 `~/.openclaw-<name>`）。

参见 [多个网关](/zh/gateway/multiple-gateways)。

### `gateway.tls`

```json5
{
  gateway: {
    tls: {
      enabled: false,
      autoGenerate: false,
      certPath: "/etc/openclaw/tls/server.crt",
      keyPath: "/etc/openclaw/tls/server.key",
      caPath: "/etc/openclaw/tls/ca-bundle.crt",
    },
  },
}
```

- `enabled`：在网关监听器（HTTPS/WSS）处启用 TLS 终止（默认：`false`）。
- `autoGenerate`：在未配置显式文件时自动生成本地自签名证书/密钥对；仅限本地/开发使用。
- `certPath`：TLS 证书文件的文件系统路径。
- `keyPath`：TLS 私钥文件的文件系统路径；请保持权限受限。
- `caPath`：用于客户端验证或自定义信任链的可选 CA 包路径。

### `gateway.reload`

```json5
{
  gateway: {
    reload: {
      mode: "hybrid", // off | restart | hot | hybrid
      debounceMs: 500,
      deferralTimeoutMs: 300000,
    },
  },
}
```

- `mode`：控制如何在运行时应用配置编辑。
  - `"off"`：忽略实时编辑；更改需要显式重启。
  - `"restart"`：配置更改时始终重启网关进程。
  - `"hot"`：在不重启的情况下在进程中应用更改。
  - `"hybrid"`（默认）：首先尝试热重载；如果需要则回退到重启。
- `debounceMs`：应用配置更改前的防抖窗口，以毫秒为单位（非负整数）。
- `deferralTimeoutMs`：在强制重启或渠道热重载之前，等待进行中操作的可选最大时间（以毫秒为单位）。省略此项以使用默认的有界等待（`300000`）；设置为 `0` 以无限期等待并记录定期的待处理警告。

---

## 钩子

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    maxBodyBytes: 262144,
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:", "hook:gmail:"],
    allowedAgentIds: ["hooks", "main"],
    presets: ["gmail"],
    transformsDir: "~/.openclaw/hooks/transforms",
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        agentId: "hooks",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "From: {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        model: "openai/gpt-5.4-mini",
      },
    ],
  },
}
```

身份验证：`Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。
查询字符串钩子令牌会被拒绝。

验证和安全说明：

- `hooks.enabled=true` 需要一个非空的 `hooks.token`。
- `hooks.token` 必须与 `gateway.auth.token` **不同**；重用 Gateway(网关) 令牌会被拒绝。
- `hooks.path` 不能是 `/`；请使用专用的子路径，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，则限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果映射或预设使用模板化的 `sessionKey`，请设置 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。静态映射键不需要该选择加入。

**端点：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 仅当 `hooks.allowRequestSessionKey=true`（默认值：`false`）时，才会接受请求负载中的 `sessionKey`。
- `POST /hooks/<name>` → 通过 `hooks.mappings` 解析
  - 模板渲染的映射 `sessionKey` 值被视为外部提供，并且也需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="Mapping details">

- `match.path` 匹配 `/hooks` 之后的子路径（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 匹配通用路径的负载字段。
- 像 `{{messages[0].subject}}` 这样的模板从负载中读取。
- `transform` 可以指向返回 hook 操作的 JS/TS 模块。
  - `transform.module` 必须是相对路径，且必须保持在 `hooks.transformsDir` 内部（拒绝绝对路径和路径遍历）。
  - 将 `hooks.transformsDir` 保持在 `~/.openclaw/hooks/transforms` 之下；拒绝工作区技能目录。如果 `openclaw doctor` 报告此路径无效，请将转换模块移动到 hooks transforms 目录中，或删除 `hooks.transformsDir`。
- `agentId` 路由到特定的 agent；未知的 ID 将回退到默认值。
- `allowedAgentIds`：限制显式路由（`*` 或省略 = 允许所有，`[]` = 拒绝所有）。
- `defaultSessionKey`：用于没有显式 `sessionKey` 的 hook agent 运行的可选固定会话密钥。
- `allowRequestSessionKey`：允许 `/hooks/agent` 调用方和模板驱动的映射会话密钥设置 `sessionKey`（默认值：`false`）。
- `allowedSessionKeyPrefixes`：显式 `sessionKey` 值（请求 + 映射）的可选前缀允许列表，例如 `["hook:"]`。当任何映射或预设使用模板化的 `sessionKey` 时，它将成为必填项。
- `deliver: true` 将最终回复发送到渠道；`channel` 默认为 `last`。
- `model` 覆盖此 hook 运行的 LLM（如果设置了模型目录，则必须被允许）。

</Accordion>

### Gmail 集成

- 内置的 Gmail 预设使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果您保留该逐消息路由，请设置 `hooks.allowRequestSessionKey: true` 并限制 `hooks.allowedSessionKeyPrefixes` 以匹配 Gmail 命名空间，例如 `["hook:", "hook:gmail:"]`。
- 如果您需要 `hooks.allowRequestSessionKey: false`，请使用静态 `sessionKey` 覆盖预设，而不是使用默认的模板化值。

```json5
{
  hooks: {
    gmail: {
      account: "openclaw@gmail.com",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "shared-push-token",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" },
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

- 配置后，Gateway(网关)会在启动时自动启动 Gateway(网关)`gog gmail watch serve`。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以禁用此功能。
- 请勿在 Gateway(网关) 旁边运行单独的 `gog gmail watch serve`Gateway(网关)。

---

## Canvas 插件宿主

```json5
{
  plugins: {
    entries: {
      canvas: {
        config: {
          host: {
            root: "~/.openclaw/workspace/canvas",
            liveReload: true,
            // enabled: false, // or OPENCLAW_SKIP_CANVAS_HOST=1
          },
        },
      },
    },
  },
}
```

- 在 Gateway(网关) 端口下通过 HTTP 提供代理可编辑的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 仅限本地：保持 `gateway.bind: "loopback"`（默认值）。
- 非环回绑定：canvas 路由需要 Gateway(网关) 认证（令牌/密码/受信任代理），与其他 Gateway(网关) HTTP 表面相同。
- 节点 WebViews 通常不发送认证头；在节点配对并连接后，Gateway(网关) 会公布节点范围的能力 URL 用于 canvas/A2UI 访问。
- 功能 URL 绑定到活动节点 WS 会话并快速过期。不使用基于 IP 的回退。
- 将实时重新加载客户端注入到提供的 HTML 中。
- 如果为空，则自动创建初始 `index.html`。
- 还在 `/__openclaw__/a2ui/` 处提供 A2UI。
- 更改需要重启网关。
- 对于大型目录或 `EMFILE` 错误，禁用实时重新加载。

---

## 设备发现

### mDNS (Bonjour)

```json5
{
  discovery: {
    mdns: {
      mode: "minimal", // minimal | full | off
    },
  },
}
```

- `minimal`（当启用内置 `bonjour` 插件时的默认值）：从 TXT 记录中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`；局域网组播广播仍然需要启用内置 `bonjour` 插件。
- `off`：在不更改插件启用状态的情况下抑制 LAN 组播通告。
- 捆绑的 `bonjour` 插件在 macOS 主机上自动启动，在 Linux、Windows 和容器化的 Gateway(网关) 部署中为可选加入。
- 当主机名是有效的 DNS 标签时，默认使用系统主机名，否则回退到 `openclaw`。可以使用 `OPENCLAW_MDNS_HOSTNAME` 覆盖。

### 广域 (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下写入单播 DNS-SD 区域。为了进行跨网络发现，请搭配 DNS 服务器（推荐 CoreDNS）和 Tailscale 分割 DNS。

设置：`openclaw dns setup --apply`。

---

## 环境

### `env`（内联环境变量）

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

- 仅当进程环境中缺少该键时，才会应用内联环境变量。
- `.env` 文件：当前工作目录 `.env` + `~/.openclaw/.env`（两者都不会覆盖现有的变量）。
- `shellEnv`：从你的登录 shell 配置文件中导入缺失的预期键名。
- 有关完整的优先级顺序，请参阅[环境](/zh/help/environment)。

### 环境变量替换

可以在任何配置字符串中使用 `${VAR_NAME}` 引用环境变量：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`。
- 缺失或为空的变量会在配置加载时抛出错误。
- 使用 `$${VAR}` 进行转义，以表示字面量 `${VAR}`。
- 适用于 `$include`。

---

## 机密

机密引用是累加的：明文值仍然有效。

### `SecretRef`

使用一种对象形状：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

验证：

- `provider` 模式： `^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` id 模式： `^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id：绝对 JSON 指针（例如 `"/providers/openai/apiKey"`）
- `source: "exec"` id 模式： `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `source: "exec"` id 不得包含 `.` 或 `..` 以斜杠分隔的路径段（例如 `a/../b` 会被拒绝）

### 支持的凭据表面

- 规范矩阵：[SecretRef Credential Surface](/zh/reference/secretref-credential-surface)
- `secrets apply` 目标支持 `openclaw.json` 凭据路径。
- `auth-profiles.json` 引用包含在运行时解析和审计范围中。

### Secret providers 配置

```json5
{
  secrets: {
    providers: {
      default: { source: "env" }, // optional explicit env provider
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json",
        timeoutMs: 5000,
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        passEnv: ["PATH", "VAULT_ADDR"],
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
  },
}
```

注意：

- `file` 提供商支持 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下 `id` 必须为 `"value"`）。
- 当 Windows ACL 验证不可用时，文件和执行提供商路径以失败关闭方式处理。仅针对无法验证的受信任路径设置 `allowInsecurePath: true`。
- `exec` 提供商需要绝对的 `command` 路径，并在 stdin/stdout 上使用协议载荷。
- 默认情况下，符号链接命令路径会被拒绝。设置 `allowSymlinkCommand: true` 以允许符号链接路径，同时验证解析后的目标路径。
- 如果配置了 `trustedDirs`，则受信任目录检查将应用于解析后的目标路径。
- `exec` 子进程环境默认是最小的；请使用 `passEnv` 显式传递所需的变量。
- Secret 引用在激活时解析为内存快照，随后请求路径仅读取该快照。
- 激活期间应用激活表面过滤：已启用表面上的未解析引用会导致启动/重新加载失败，而未激活表面将被跳过并输出诊断信息。

---

## 认证存储

```json5
{
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai-codex:personal": { provider: "openai-codex", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      "openai-codex": ["openai-codex:personal"],
    },
  },
}
```

- 按代理划分的配置文件存储在 `<agentDir>/auth-profiles.json` 中。
- `auth-profiles.json` 支持静态凭证模式的值级引用（`api_key` 的 `keyRef`，`token` 的 `tokenRef`）。
- 旧的扁平 `auth-profiles.json` 映射（如 `{ "provider": { "apiKey": "..." } }`）并非运行时格式；`openclaw doctor --fix` 会将其重写为规范的 `provider:default` API 密钥配置文件，并附带 `.legacy-flat.*.bak` 备份。
- OAuth 模式配置文件（`auth.profiles.<id>.mode = "oauth"`）不支持由 SecretRef 支持的身份验证配置文件凭据。
- 静态运行时凭据来自内存解析的快照；一旦发现，旧的静态 `auth.json` 条目将被清除。
- 从 `~/.openclaw/credentials/oauth.json` 导入的旧版 OAuth。
- 参见 [OAuth](/zh/concepts/oauth)。
- 机密运行时行为和 `audit/configure/apply` 工具：[机密管理](/zh/gateway/secrets)。

### `auth.cooldowns`

```json5
{
  auth: {
    cooldowns: {
      billingBackoffHours: 5,
      billingBackoffHoursByProvider: { anthropic: 3, openai: 8 },
      billingMaxHours: 24,
      authPermanentBackoffMinutes: 10,
      authPermanentMaxMinutes: 60,
      failureWindowHours: 24,
      overloadedProfileRotations: 1,
      overloadedBackoffMs: 0,
      rateLimitedProfileRotations: 1,
    },
  },
}
```

- `billingBackoffHours`：当配置文件因真实的计费/余额不足错误而失败时，以小时为单位的基本退避时间（默认值：`5`）。即使是在 `401`/`403`OpenRouter 响应中，明确的计费文本仍可能归入此处，但特定提供商的文本匹配器仍限定于拥有它们的提供商（例如 OpenRouter `Key limit exceeded`）。可重试的 HTTP `402` 使用量窗口或组织/工作区支出限制消息则改为保留在 `rate_limit` 路径中。
- `billingBackoffHoursByProvider`：针对每个提供商的可选计费退避小时数覆盖设置。
- `billingMaxHours`：计费退避指数增长的小时数上限（默认值：`24`）。
- `authPermanentBackoffMinutes`：针对高置信度 `auth_permanent` 失败的基础退避时间（分钟）（默认值：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增长的上限，以分钟为单位（默认：`60`）。
- `failureWindowHours`：用于退避计数器的滚动窗口，以小时为单位（默认：`24`）。
- `overloadedProfileRotations`：在切换到模型回退之前，针对过载错误进行同一提供商身份配置文件轮换的最大次数（默认值：`1`）。提供商繁忙等情形（如 `ModelNotReadyException`）归类于此。
- `overloadedBackoffMs`：在重试过载的提供商/配置文件轮换之前的固定延迟（默认值：`0`）。
- `rateLimitedProfileRotations`：在切换到模型回退之前，针对速率限制错误的最大同提供商身份验证配置文件轮换次数（默认：`1`）。该速率限制存储桶包括提供商格式的文本，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

---

## 日志记录

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty", // pretty | compact | json
    redactSensitive: "tools", // off | tools
    redactPatterns: ["\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1"],
  },
}
```

- 默认日志文件：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`。
- 设置 `logging.file` 以获得稳定路径。
- 当 `--verbose` 时，`consoleLevel` 会增加到 `debug`。
- `maxFileBytes`: 轮换前的最大活动日志文件大小（以字节为单位，正整数；默认值：`104857600` = 100 MB）。OpenClaw 会在活动文件旁边保留最多 5 个编号的归档文件。
- `redactSensitive` / `redactPatterns`：针对控制台输出、文件日志、OTLP 日志记录和持久化会话记录文本的尽力屏蔽。`redactSensitive: "off"` 仅禁用此通用日志/记录策略；UI/工具/诊断安全界面在输出前仍会编辑敏感信息。

---

## 诊断

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],
    stuckSessionWarnMs: 30000,
    stuckSessionAbortMs: 600000,

    otel: {
      enabled: false,
      endpoint: "https://otel-collector.example.com:4318",
      tracesEndpoint: "https://traces.example.com/v1/traces",
      metricsEndpoint: "https://metrics.example.com/v1/metrics",
      logsEndpoint: "https://logs.example.com/v1/logs",
      protocol: "http/protobuf", // http/protobuf | grpc
      headers: { "x-tenant-id": "my-org" },
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: false,
      sampleRate: 1.0,
      flushIntervalMs: 5000,
      captureContent: {
        enabled: false,
        inputMessages: false,
        outputMessages: false,
        toolInputs: false,
        toolOutputs: false,
        systemPrompt: false,
      },
    },

    cacheTrace: {
      enabled: false,
      filePath: "~/.openclaw/logs/cache-trace.jsonl",
      includeMessages: true,
      includePrompt: true,
      includeSystem: true,
    },
  },
}
```

- `enabled`：检测输出的主开关（默认：`true`）。
- `flags`：用于启用特定日志输出的标志字符串数组（支持 `"telegram.*"` 或 `"*"` 等通配符）。
- `stuckSessionWarnMs`：用于将长时间运行的会话分类为 `session.long_running`、`session.stalled` 或 `session.stuck` 的无进展时间阈值（毫秒）。回复、工具、状态、阻止和 ACP 进度会重置计时器；如果 `session.stuck` 诊断信息未发生变化，则会逐渐减少重复输出。
- `stuckSessionAbortMs`OpenClaw：在进行恢复时，符合条件且停滞的活动工作可能会被中止排空之前的无进展时间阈值（毫秒）。如果未设置，OpenClaw 将使用更安全的扩展嵌入式运行窗口，该窗口至少为 10 分钟且为 `stuckSessionWarnMs` 的 5 倍。
- `otel.enabled`：启用 OpenTelemetry 导出管道（默认值：`false`）。有关完整配置、信号目录和隐私模型，请参阅 [OpenTelemetry export](/zh/gateway/opentelemetry)。
- `otel.endpoint`：用于 OTel 导出的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`: 可选的特定信号 OTLP 端点。设置后，它们将仅针对该信号覆盖 `otel.endpoint`。
- `otel.protocol`: `"http/protobuf"` (默认) 或 `"grpc"`。
- `otel.headers`: 随 OTel 导出请求一起发送的额外 HTTP/gRPC 元数据标头。
- `otel.serviceName`: 资源属性的服务名称。
- `otel.traces` / `otel.metrics` / `otel.logs`: 启用链路追踪、指标或日志导出。
- `otel.sampleRate`: 链路追踪采样率 `0`-`1`。
- `otel.flushIntervalMs`: 定期遥测刷新间隔（毫秒）。
- `otel.captureContent`：用于 OTEL 跨度属性的 opt-in 原始内容捕获。默认为关闭。布尔值 `true` 捕获非系统消息/工具内容；对象形式允许你显式启用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs` 和 `systemPrompt`。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：用于启用最新的实验性 GenAI 跨度提供商属性的环境切换开关。默认情况下，为了兼容性，跨度保留传统的 `gen_ai.system` 属性；GenAI 指标使用有界的语义属性。
- `OPENCLAW_OTEL_PRELOADED=1`OpenClaw：针对已注册全局 OpenTelemetry SDK 的主机的环境切换开关。OpenClaw 将跳过插件拥有的 SDK 启动/关闭，同时保持诊断侦听器处于活动状态。
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`、`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` 和 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`：当未设置匹配的配置键时使用的特定于信号的端点环境变量。
- `cacheTrace.enabled`：记录嵌入式运行的缓存跟踪快照（默认值：`false`）。
- `cacheTrace.filePath`：缓存跟踪 JSONL 的输出路径（默认值：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制缓存跟踪输出中包含的内容（全部默认值：`true`）。

---

## 更新

```json5
{
  update: {
    channel: "stable", // stable | beta | dev
    checkOnStart: true,

    auto: {
      enabled: false,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

- `channel`：npm/npm 安装的发布渠道 - `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：网关启动时检查 npm 更新（默认：`true`）。
- `auto.enabled`: 为软件包安装启用后台自动更新（默认：`false`）。
- `auto.stableDelayHours`: 稳定渠道自动应用前的最小延迟小时数（默认：`6`；最大值：`168`）。
- `auto.stableJitterHours`：稳定版渠道的额外发布分发窗口（单位：小时，默认值：`12`；最大值：`168`）。
- `auto.betaCheckIntervalHours`：测试版渠道检查的运行频率（单位：小时，默认值：`1`；最大值：`24`）。

---

## ACP

```json5
{
  acp: {
    enabled: true,
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "main",
    allowedAgents: ["main", "ops"],
    maxConcurrentSessions: 10,

    stream: {
      coalesceIdleMs: 50,
      maxChunkChars: 1000,
      repeatSuppression: true,
      deliveryMode: "live", // live | final_only
      hiddenBoundarySeparator: "paragraph", // none | space | newline | paragraph
      maxOutputChars: 50000,
      maxSessionUpdateChars: 500,
    },

    runtime: {
      ttlMinutes: 30,
    },
  },
}
```

- `enabled`：全局 ACP 功能开关（默认值：`true`；设置 `false` 以隐藏 ACP 调度和生成功能）。
- `dispatch.enabled`：ACP 会话轮次调度的独立开关（默认值：`true`）。设置 `false` 可在阻止执行的同时保持 ACP 命令可用。
- `backend`：默认的 ACP 运行时后端 ID（必须匹配已注册的 ACP 运行时插件）。
  请先安装后端插件，并且如果设置了 `plugins.allow`，请包含后端插件 ID（例如 `acpx`），否则 ACP 后端将无法加载。
- `defaultAgent`：当衍生未指定显式目标时的回退 ACP 目标代理 ID。
- `allowedAgents`: 允许用于 ACP 运行时会话的代理 ID 白名单；留空表示没有额外限制。
- `maxConcurrentSessions`: 最大并发活动 ACP 会话数。
- `stream.coalesceIdleMs`: 流式文本的空闲刷新窗口（毫秒）。
- `stream.maxChunkChars`: 分割流式块投影前的最大块大小。
- `stream.repeatSuppression`：抑制每个回合重复的状态/工具行（默认：`true`）。
- `stream.deliveryMode`：`"live"` 逐步流式传输；`"final_only"` 缓冲直到回合结束事件。
- `stream.hiddenBoundarySeparator`：隐藏工具事件后可见文本之前的分隔符（默认：`"paragraph"`）。
- `stream.maxOutputChars`：每个 ACP 轮次预计的最大助手输出字符数。
- `stream.maxSessionUpdateChars`：预计的 ACP 状态/更新行的最大字符数。
- `stream.tagVisibility`：标签名称到布尔可见性覆盖值的记录，用于流式事件。
- `runtime.ttlMinutes`：ACP 会话工作程序在符合清理条件之前的空闲 TTL（分钟）。
- `runtime.installCommand`：在引导 ACP 运行时环境时运行的可选安装命令。

---

## CLI

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
    },
  },
}
```

- `cli.banner.taglineMode` 控制横幅标语样式：
  - `"random"`（默认）：轮换的有趣/季节性标语。
  - `"default"`：固定的中性标语（`All your chats, one OpenClaw.`）。
  - `"off"`：无标语文本（横幅标题/版本仍显示）。
- 要隐藏整个横幅（不仅仅是标语），请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

---

## 向导

由 CLI 引导式设置流程（`onboard`、`configure`、`doctor`）写入的元数据：

```json5
{
  wizard: {
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local",
  },
}
```

---

## 身份

参见 [Agent defaults](/zh/gateway/config-agents#agent-defaults) 下的 `agents.list` 身份字段。

---

## Bridge（已弃用，已移除）

当前版本不再包含 TCP bridge。节点通过 Gateway(网关) WebSocket 连接。`bridge.*` 键不再属于配置架构的一部分（除非移除否则验证会失败；`openclaw doctor --fix` 可以剥离未知键）。

<Accordion title="Legacy bridge config (historical reference)">

```json
{
  "bridge": {
    "enabled": true,
    "port": 18790,
    "bind": "tailnet",
    "tls": {
      "enabled": true,
      "autoGenerate": true
    }
  }
}
```

</Accordion>

---

## Cron

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 2, // cron dispatch + isolated cron agent-turn execution
    webhook: "https://example.invalid/legacy", // deprecated fallback for stored notify:true jobs
    webhookToken: "replace-with-dedicated-token", // optional bearer token for outbound webhook auth
    sessionRetention: "24h", // duration string or false
    runLog: {
      maxBytes: "2mb", // default 2_000_000 bytes
      keepLines: 2000, // default 2000
    },
  },
}
```

- `sessionRetention`：在从 `sessions.json` 中清除之前保留已完成的独立 cron 运行会话的时间。此外，还控制已删除的 cron 转录存档的清理。默认值：`24h`；设置为 `false` 以禁用。
- `runLog.maxBytes`：每次运行日志文件在清理前的最大大小（`cron/runs/<jobId>.jsonl`）。默认值：`2_000_000` 字节。
- `runLog.keepLines`：触发运行日志清理时保留的最新行数。默认值：`2000`。
- `webhookToken`：用于 cron webhook POST 传递的 bearer 令牌（`delivery.mode = "webhook"`），如果省略，则不发送认证头。
- `webhook`：已弃用的旧版回退 webhook URL (http/https)，仅用于仍然具有 `notify: true` 的已存储作业。

### `cron.retry`

```json5
{
  cron: {
    retry: {
      maxAttempts: 3,
      backoffMs: [30000, 60000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "timeout", "server_error"],
    },
  },
}
```

- `maxAttempts`：一次性作业在遇到瞬时错误时的最大重试次数（默认：`3`；范围：`0`-`10`）。
- `backoffMs`：每次重试尝试的退避延迟数组（单位：毫秒）（默认：`[30000, 60000, 300000]`；1-10 个条目）。
- `retryOn`：触发重试的错误类型 - `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略此项以重试所有瞬态类型。

仅适用于一次性 cron 作业。周期性作业使用单独的失败处理机制。

### `cron.failureAlert`

```json5
{
  cron: {
    failureAlert: {
      enabled: false,
      after: 3,
      cooldownMs: 3600000,
      includeSkipped: false,
      mode: "announce",
      accountId: "main",
    },
  },
}
```

- `enabled`：为 cron 任务启用失败告警（默认：`false`）。
- `after`：触发告警前的连续失败次数（正整数，最小值：`1`）。
- `cooldownMs`：针对同一任务的重复告警之间的最小毫秒数（非负整数）。
- `includeSkipped`：计算向告警阈值累计的连续跳过运行次数（默认值：`false`）。跳过的运行会被单独跟踪，且不会影响执行错误退避。
- `mode`：交付模式 - `"announce"` 通过渠道消息发送；`"webhook"` 发送到已配置的 Webhook。
- `accountId`：可选的账户或渠道 ID，用于限定警报传送范围。

### `cron.failureDestination`

```json5
{
  cron: {
    failureDestination: {
      mode: "announce",
      channel: "last",
      to: "channel:C1234567890",
      accountId: "main",
    },
  },
}
```

- 所有作业的 Cron 失败通知的默认目标。
- `mode`：`"announce"` 或 `"webhook"`；当存在足够的目标数据时，默认为 `"announce"`。
- `channel`：用于公告传递的渠道覆盖。`"last"` 重用上次已知的传递渠道。
- `to`：明确的公告目标或 webhook URL。Webhook 模式下必填。
- `accountId`：用于传递的可选账号覆盖。
- 每个作业的 `delivery.failureDestination` 会覆盖此全局默认值。
- 当既未设置全局也未设置每个任务的失败目标时，已经通过 `announce` 投递的任务在失败时会回退到该主目标。
- 除非任务的主 `delivery.mode` 是 `"webhook"`，否则 `delivery.failureDestination` 仅支持 `sessionTarget="isolated"` 任务。

请参阅 [Cron Jobs](/zh/automation/cron-jobs)。独立的 cron 执行会被作为 [background tasks](/zh/automation/tasks) 进行跟踪。

---

## 媒体模型模板变量

在 `tools.media.models[].args` 中展开的模板占位符：

| 变量               | 描述                                         |
| ------------------ | -------------------------------------------- |
| `{{Body}}`         | 完整的入站消息正文                           |
| `{{RawBody}}`      | 原始正文（无历史记录/发送者包装器）          |
| `{{BodyStripped}}` | Body with group mentions stripped            |
| `{{From}}`         | Sender identifier                            |
| `{{To}}`           | Destination identifier                       |
| `{{MessageSid}}`   | Channel message id                           |
| `{{SessionId}}`    | Current 会话 UUID                            |
| `{{IsNewSession}}` | `"true"` when new 会话 created               |
| `{{MediaUrl}}`     | Inbound media pseudo-URL                     |
| `{{MediaPath}}`    | 本地媒体路径                                 |
| `{{MediaType}}`    | 媒体类型（图像/音频/文档/...）               |
| `{{Transcript}}`   | 音频转录                                     |
| `{{Prompt}}`       | 已解析的 CLI 条目的媒体提示                  |
| `{{MaxChars}}`     | 已解析的 CLI 条目的最大输出字符数            |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                      |
| `{{GroupSubject}}` | 群组主题（尽力而为）                         |
| `{{GroupMembers}}` | 群组成员预览（尽力而为）                     |
| `{{SenderName}}`   | 发送者显示名称（尽力而为）                   |
| `{{SenderE164}}`   | 发送者电话号码（尽力而为）                   |
| `{{Provider}}`     | 提供商提示（whatsapp、telegram、discord 等） |

---

## Config includes (`$include`)

将配置拆分为多个文件：

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },
  agents: { $include: "./agents.json5" },
  broadcast: {
    $include: ["./clients/mueller.json5", "./clients/schmidt.json5"],
  },
}
```

**合并行为：**

- 单个文件：替换包含它的对象。
- 文件数组：按顺序深度合并（后面的覆盖前面的）。
- 同级键：在包含之后合并（覆盖包含的值）。
- 嵌套包含：最多 10 层深度。
- 路径：相对于包含该文件的文件进行解析，但必须保持在顶级配置目录（`dirname` of `openclaw.json`）内。仅当绝对路径/`../` 形式仍在该边界内解析时才允许使用。
- 由 OpenClaw 拥有且仅更改由单文件包含支持的一个顶级部分的写入操作会直接写入到该被包含的文件中。例如，`plugins install` 会更新 `plugins.json5` 中的 `plugins: { $include: "./plugins.json5" }`，并保持 `openclaw.json` 不变。
- 根包含、包含数组以及带有同级覆盖的包含对于 OpenClaw 拥有的写入是只读的；这些写入将失败关闭，而不是扁平化配置。
- 错误：针对文件丢失、解析错误和循环包含提供明确的信息。

---

_相关：[配置](/zh/gateway/configuration) · [配置示例](/zh/gateway/configuration-examples) · [诊断工具](/zh/gateway/doctor)_

## 相关

- [配置](/zh/gateway/configuration)
- [配置示例](/zh/gateway/configuration-examples)
