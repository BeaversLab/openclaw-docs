---
summary: "Gateway(网关)OpenClaw核心 OpenClaw 键、默认值以及指向专用子系统参考链接的 Gateway(网关) 配置参考"
title: "配置参考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

`~/.openclaw/openclaw.json` 的核心配置参考。如需面向任务的概览，请参阅[配置](/zh/gateway/configuration)。

涵盖主要的 OpenClaw 配置层，当子系统拥有其更深入的参考文档时提供链接。渠道和插件拥有的命令目录以及深度内存/QMD 调节项位于其各自的页面，而非本页面。

代码事实：

- `openclaw config schema` 打印用于验证和控制 UI 的实时 JSON 架构，并在可用时合并捆绑/插件/渠道元数据
- `config.schema.lookup` 返回一个路径范围的架构节点，用于深入挖掘工具
- `pnpm config:docs:check` / `pnpm config:docs:gen` 针对当前架构表面验证配置文档基准哈希

Agent 查找路径：在编辑之前，请使用 `gateway` 工具操作 `config.schema.lookup` 查看精确的字段级文档和约束。请使用[配置](/zh/gateway/configuration)获取面向任务的指导，并参阅本页面以了解更广泛的字段映射、默认值以及子系统参考的链接。

专用深入参考：

- `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 的[内存配置参考](/zh/reference/memory-config)以及 `plugins.entries.memory-core.config.dreaming` 下的 dreaming 配置
- 当前内置 + 捆绑命令目录的[斜杠命令](/zh/tools/slash-commands)
- 渠道特定命令层面的所属渠道/插件页面

配置格式为 **JSON5**（允许注释和尾随逗号）。所有字段都是可选的 - 如果省略，OpenClaw 会使用安全的默认值。

---

## 渠道

特定渠道的配置键已移至专门页面 - 请参阅[配置 - 渠道](/zh/gateway/config-channels)查看 `channels.*`，包括 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 以及其他捆绑渠道（身份验证、访问控制、多账户、提及门控）。

## Agent 默认值、多代理、会话和消息

已移至专门页面 - 请参阅[配置 - 代理](/zh/gateway/config-agents)了解：

- `agents.defaults.*` (工作区、模型、思考、心跳、内存、媒体、技能、沙盒)
- `multiAgent.*` (多智能体路由和绑定)
- `session.*` (会话生命周期、压缩、修剪)
- `messages.*` (消息传递、TTS、Markdown 渲染)
- `talk.*` (Talk 模式)
  - `talk.consultThinkingLevel`OpenClaw：针对 Control UI Talk 实时咨询背后的完整 OpenClaw 智能体运行的思考级别覆盖
  - `talk.consultFastMode`：针对 Control UI Talk 实时咨询的一次性快速模式覆盖
  - `talk.speechLocale`iOSmacOS：用于 iOS/macOS 上 Talk 语音识别的可选 BCP 47 区域设置 ID
  - `talk.silenceTimeoutMs`：未设置时，Talk 在发送转录文本之前保持平台默认的暂停窗口 (`700 ms on macOS and Android, 900 ms on iOS`)
  - `talk.realtime.consultRouting`：针对跳过 `openclaw_agent_consult` 的已定稿实时 Talk 转录的 Gateway(网关) 中继回退

## 工具和自定义提供商

工具策略、实验性开关、提供商支持的工具配置以及自定义提供商/基础 URL 设置已移至专门页面 - 请参阅[配置 - 工具和自定义提供商](/zh/gateway/config-tools)。

## 模型

提供商定义、模型允许列表以及自定义提供商设置位于[配置 - 工具和自定义提供商](/zh/gateway/config-tools#custom-providers-and-base-urls)中。`models` 根节点还拥有全局模型目录行为。

```json5
{
  models: {
    // Optional. Default: true. Requires a Gateway restart when changed.
    pricing: { enabled: false },
  },
}
```

- `models.mode`：提供商目录行为（`merge` 或 `replace`）。
- `models.providers`：按提供商 ID 键入的自定义提供商映射。
- `models.providers.*.localService`：本地模型服务器的可选按需进程管理器。OpenClaw 会探测配置的健康端点，在需要时启动绝对的 `command`，等待就绪，然后发送模型请求。请参阅[本地模型服务](/zh/gateway/local-model-services)。
- `models.pricing.enabled`Gateway(网关): 控制在 sidecar 和通道达到 Gateway(网关) 就绪路径后启动的后台定价引导。当 `false`Gateway(网关)OpenRouter 时，Gateway(网关) 会跳过 OpenRouter 和 LiteLLM 的定价目录获取；配置的 `models.providers.*.models[].cost` 值仍可用于本地成本估算。

## MCP

OpenClaw 管理的 MCP 服务器定义位于 OpenClaw`mcp.servers`OpenClaw 下，并被嵌入式 OpenClaw 和其他运行时适配器使用。`openclaw mcp list`、`show`、`set` 和 `unset` 命令管理此块，而在配置编辑期间无需连接到目标服务器。

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
        timeout: 20,
        connectTimeout: 5,
        supportsParallelToolCalls: true,
        headers: {
          Authorization: "Bearer ${MCP_REMOTE_TOKEN}",
        },
        auth: "oauth",
        oauth: {
          scope: "docs.read",
        },
        sslVerify: true,
        clientCert: "/path/to/client.crt",
        clientKey: "/path/to/client.key",
        toolFilter: {
          include: ["search_*"],
          exclude: ["admin_*"],
        },
        // Optional Codex app-server projection controls.
        codex: {
          agents: ["main"],
          defaultToolsApprovalMode: "approve", // auto | prompt | approve
        },
      },
    },
  },
}
```

- `mcp.servers`: 为暴露已配置 MCP 工具的运行时命名的 stdio 或远程 MCP 服务器定义。
  远程条目使用 `transport: "streamable-http"` 或 `transport: "sse"`；
  `type: "http"`CLI 是一个 CLI 原生别名，`openclaw mcp set` 和
  `openclaw doctor --fix` 会将其规范化为规范的 `transport` 字段。
- `mcp.servers.<name>.enabled`：设置 `false`OpenClaw 以保留已保存的服务器定义，
  同时将其从嵌入式 OpenClaw MCP 发现和工具投影中排除。
- `mcp.servers.<name>.timeout` / `requestTimeoutMs`：每个服务器的 MCP 请求
  超时时间（以秒或毫秒为单位）。
- `mcp.servers.<name>.connectTimeout` / `connectionTimeoutMs`：每个服务器的
  连接超时时间（以秒或毫秒为单位）。
- `mcp.servers.<name>.supportsParallelToolCalls`：可选的并发提示，
  适用于可以选择是否发出并行 MCP 工具调用的适配器。
- `mcp.servers.<name>.auth`：为需要 OAuth 的 HTTP MCP 服务器
  设置 `"oauth"`OAuth。运行 `openclaw mcp login <name>`OpenClaw 以将令牌存储在 OpenClaw 状态下。
- `mcp.servers.<name>.oauth`OAuth：可选的 OAuth 范围、重定向 URL 和客户端
  元数据 URL 覆盖。
- `mcp.servers.<name>.sslVerify`、`clientCert`、`clientKey`：用于私有端点
  和双向 TLS 的 HTTP TLS 控制。
- `mcp.servers.<name>.toolFilter`：可选的每服务器工具选择。`include`
  将发现的 MCP 工具限制为匹配的名称；`exclude` 隐藏匹配
  的名称。条目是精确的 MCP 工具名称或简单的 `*` 通配符。具有
  资源或提示的服务器也会生成实用工具名称（`resources_list`、
  `resources_read`、`prompts_list`、`prompts_get`），这些名称使用
  相同的过滤器。
- `mcp.servers.<name>.codex`：可选的 Codex 应用服务器投影控制。
  此块仅为 Codex 应用服务器线程的 OpenClaw 元数据；它不影响
  ACP 会话、通用 Codex harness 配置或其他运行时适配器。
  非空的 `codex.agents` 将服务器限制为列出的 OpenClaw 代理 ID。
  空白、空或无效的作用域代理列表将被配置验证拒绝，
  并且会被运行时投影路径忽略，而不会变为全局。
  `codex.defaultToolsApprovalMode` 发出该服务器的
  Codex 原生 `default_tools_approval_mode`。OpenClaw 会剥离 `codex`
  块，然后再将原生 `mcp_servers` 配置传递给 Codex。省略该块
  以使服务器对每个 Codex 应用服务器代理都保持投影，并使用 Codex 的
  默认 MCP 批准行为。
- `mcp.sessionIdleTtlMs`：会话作用域捆绑 MCP 运行时的空闲 TTL。
  一次性嵌入式运行请求运行结束清理；此 TTL 是
  长期会话和未来调用者的防线。
- `mcp.*` 下的更改通过释放缓存的会话 MCP 运行时进行热应用。
  下一次工具发现/使用会根据新配置重新创建它们，因此移除的
  `mcp.servers` 条目会立即被回收，而无需等待空闲 TTL。
- 运行时发现还会通过丢弃该会话的缓存目录来尊重 MCP 工具列表更改通知。
  宣布资源或提示的服务器会获得用于列出/读取资源和列出/获取
  提示的实用工具。重复的工具调用失败会在尝试下一次调用之前
  短暂停用受影响的服务器。

有关运行时行为，请参阅 [MCP](/zh/cli/mcp#openclaw-as-an-mcp-client-registry) 和
[CLI 后端](/zh/gateway/cli-backends#bundle-mcp-overlays)。

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

- `allowBundled`：仅适用于捆绑 Skills 的可选允许列表（托管/工作区 Skills 不受影响）。
- `load.extraDirs`：额外的共享 Skills 根目录（优先级最低）。
- `load.allowSymlinkTargets`：受信任的真实目标根目录，当 Skills 符号链接位于其配置的源根目录之外时，
  可以解析到这些目录。
- `install.preferBrew`: 如果为 true，则在 `brew` 可用时优先使用 Homebrew 安装程序，然后再回退到其他类型的安装程序。
- `install.nodeManager`: `metadata.openclaw.install` 规范的节点安装程序首选项（`npm` | `pnpm` | `yarn` | `bun`）。
- `install.allowUploadedArchives`: 允许受信任的 `operator.admin`Gateway(网关) Gateway(网关) 客户端安装通过 `skills.upload.*`ClawHub 暂存的私有 zip 归档文件（默认：false）。这仅启用已上传归档路径；正常的 ClawHub 安装不需要它。
- `entries.<skillKey>.enabled: false` 即使已捆绑/安装，也会禁用某个技能。
- `entries.<skillKey>.apiKey`: 为主技能声明主要环境变量（纯文本字符串或 SecretRef 对象）提供的便利设置。

---

## 插件

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
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

- 从 `~/.openclaw/extensions` 和 `<workspace>/.openclaw/extensions` 下的包或捆绑目录加载，以及 `plugins.load.paths` 中列出的文件或目录。
- 将独立的插件文件放在 `plugins.load.paths` 中；自动发现的扩展根目录会忽略顶层的 `.js`、`.mjs` 和 `.ts` 文件，因此这些根目录中的辅助脚本不会阻止启动。
- 设备发现接受原生 OpenClaw 插件以及兼容的 Codex 捆绑包和 Claude 捆绑包，包括无清单的 Claude 默认布局捆绑包。
- **配置更改需要重启网关。**
- `allow`: 可选允许列表（仅加载列出的插件）。`deny` 优先。
- `plugins.entries.<id>.apiKey`API: 插件级别的 API 密钥便利字段（当插件支持时）。
- `plugins.entries.<id>.env`: 插件作用域的环境变量映射。
- `plugins.entries.<id>.hooks.allowPromptInjection`：当 `false` 时，核心会阻止 `before_prompt_build` 并忽略来自旧版 `before_agent_start` 的提示符修改字段，同时保留旧版 `modelOverride` 和 `providerOverride`。适用于原生插件钩子和受支持的包提供的钩子目录。
- `plugins.entries.<id>.hooks.allowConversationAccess`：当 `true` 时，受信任的非打包插件可以从类型化钩子（例如 `llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize` 和 `agent_end`）读取原始对话内容。
- `plugins.entries.<id>.subagent.allowModelOverride`：明确信任此插件为后台子代理运行请求每次运行的 `provider` 和 `model` 覆盖。
- `plugins.entries.<id>.subagent.allowedModels`：受信任子代理覆盖的规范 `provider/model` 目标的可选允许列表。仅当您有意允许任何模型时才使用 `"*"`。
- `plugins.entries.<id>.llm.allowModelOverride`：明确信任此插件为 `api.runtime.llm.complete` 请求模型覆盖。
- `plugins.entries.<id>.llm.allowedModels`：受信任插件 LLM 完成覆盖的规范 `provider/model`LLM 目标的可选允许列表。仅当您有意允许任何模型时才使用 `"*"`。
- `plugins.entries.<id>.llm.allowAgentIdOverride`：明确信任此插件针对非默认代理 ID 运行 `api.runtime.llm.complete`。
- `plugins.entries.<id>.config`OpenClaw：插件定义的配置对象（如果可用，由原生 OpenClaw 插件架构验证）。
- 通道插件账户/运行时设置位于 `channels.<id>` 下，应由所有者插件的清单 `channelConfigs`OpenClaw 元数据描述，而不是由中央 OpenClaw 选项注册表描述。

### Codex harness 插件配置

捆绑的 `codex` 插件拥有 `plugins.entries.codex.config` 下的原生 Codex 应用服务器适配器设置。有关完整的配置层面，请参阅 [Codex harness reference](/zh/plugins/codex-harness-reference)；有关运行时模型，请参阅 [Codex harness](/zh/plugins/codex-harness)。

`codexPlugins` 仅适用于选择原生 Codex 适配器的会话。它不为 OpenClaw 提供商运行、ACP 对话绑定或任何非 Codex 适配器启用 Codex 插件。

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

- `plugins.entries.codex.config.codexPlugins.enabled`：为 Codex 适配器启用原生 Codex
  插件/应用支持。默认值：`false`。
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions`：
  迁移的插件应用引导的默认破坏性操作策略。
  默认值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled`：当全局 `codexPlugins.enabled` 也为 true 时，
  启用迁移的插件条目。对于显式条目，默认值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`：
  稳定的市场标识。V1 仅支持 `"openai-curated"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`：来自迁移的
  稳定 Codex 插件标识，例如 `"google-calendar"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`：
  每个插件的破坏性操作覆盖设置。如果省略，则使用全局
  `allow_destructive_actions` 值。

`codexPlugins.enabled` 是全局启用指令。由迁移写入的显式插件条目是持久的安装和修复资格集。不支持 `plugins["*"]`，没有 `install` 开关，并且本地 `marketplacePath` 值故意不作为配置字段，因为它们是特定于主机的。

`app/list` 就绪检查会缓存一小时，并在过期时异步刷新。Codex 线程应用配置是在 Codex 适配器会话建立时计算的，而不是在每次轮次中；更改原生插件配置后，请使用 `/new`、`/reset` 或重启网关。

- `plugins.entries.firecrawl.config.webFetch`Firecrawl: Firecrawl web-fetch 提供商设置。
  - `apiKey`FirecrawlAPI: Firecrawl API 密钥（接受 SecretRef）。回退到 `plugins.entries.firecrawl.config.webSearch.apiKey`、旧版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 环境变量。
  - `baseUrl`FirecrawlAPI: Firecrawl API 基础 URL（默认：`https://api.firecrawl.dev`；自托管覆盖必须指向私有/内部端点）。
  - `onlyMainContent`: 仅从页面中提取主要内容（默认：`true`）。
  - `maxAgeMs`: 最大缓存时间（毫秒）（默认：`172800000` / 2 天）。
  - `timeoutSeconds`: 抓取请求超时时间（秒）（默认：`60`）。
- `plugins.entries.xai.config.xSearch`: xAI X Search (Grok 网络搜索) 设置。
  - `enabled`: 启用 X Search 提供商。
  - `model`: 用于搜索的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`: 记忆梦想设置。有关阶段和阈值，请参阅 [Dreaming](/zh/concepts/dreaming)。
  - `enabled`: 梦想主开关（默认 `false`）。
  - `frequency`: 每次完整梦想扫描的 cron 频率（默认为 `"0 3 * * *"`）。
  - `model`: 可选的 Dream Diary 子代理模型覆盖。需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`；与 `allowedModels` 配对以限制目标。模型不可用错误会使用会话默认模型重试一次；信任或允许列表失败不会静默回退。
  - 阶段策略和阈值是实现细节（非面向用户的配置键）。
- 完整的记忆配置位于 [Memory configuration reference](/zh/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已启用的 Claude 捆绑插件还可以从 OpenClaw`settings.json`OpenClawOpenClaw 贡献嵌入的 OpenClaw 默认值；OpenClaw 会将这些作为经过清理的代理设置应用，而不是作为原始的 OpenClaw 配置补丁。
- `plugins.slots.memory`：选择活动的内存插件 id，或设置为 `"none"` 以禁用内存插件。
- `plugins.slots.contextEngine`：选择活动的上下文引擎插件 id；除非您安装并选择了其他引擎，否则默认为 `"legacy"`。

请参阅 [插件](/zh/tools/plugin)。

---

## 承诺

`commitments`OpenClaw 控制推断的后续记忆：OpenClaw 可以从对话轮次中检测签到，并通过心跳运行交付它们。

- `commitments.enabled`LLM：启用对推断的后续承诺进行隐藏的 LLM 提取、存储和心跳交付。默认值：`false`。
- `commitments.maxPerDay`：在滚动的一天中，每个代理会话交付的最大推断后续承诺数。默认值：`3`。

请参阅 [推断承诺](/zh/concepts/commitments)。

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

- `evaluateEnabled: false` 会禁用 `act:evaluate` 和 `wait --fn`。
- `tabCleanup` 会在空闲时间或当会话超过其上限时回收被跟踪的主代理标签页。设置 `idleMinutes: 0` 或 `maxTabsPerSession: 0` 可禁用这些单独的清理模式。
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` 在未设置时被禁用，因此默认情况下浏览器导航保持严格模式。
- 仅当您有意信任私有网络浏览器导航时，才设置 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在严格模式下，远程 CDP 配置文件端点 (`profiles.*.cdpUrl`) 在可达性/发现检查期间会受到相同的私有网络阻止限制。
- `ssrfPolicy.allowPrivateNetwork` 作为旧版别名仍受支持。
- 在严格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 进行显式例外处理。
- 远程配置文件仅支持附加模式（禁用 start/stop/reset）。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。
  当您希望 OpenClaw 发现 `/json/version` 时，请使用 HTTP(S)；当您的提供商为您提供了直接的 DevTools WebSocket URL 时，请使用 WS(S)。
- `remoteCdpTimeoutMs` 和 `remoteCdpHandshakeTimeoutMs` 适用于远程和
  `attachOnly` CDP 可达性以及打开标签页的请求。托管环回
  配置文件保留本地 CDP 默认值。
- 如果通过环回可以访问外部托管的 CDP 服务，请设置该
  配置文件的 `attachOnly: true`；否则 OpenClaw 会将环回端口视为
  本地托管浏览器配置文件，并可能会报告本地端口所有权错误。
- `existing-session` 配置文件使用 Chrome MCP 而不是 CDP，并且可以附加到
  所选主机或通过连接的浏览器节点进行附加。
- `existing-session` 配置文件可以设置 `userDataDir` 来定位特定的
  基于 Chromium 的浏览器配置文件，例如 Brave 或 Edge。
- `existing-session` 配置文件保留当前的 Chrome MCP 路由限制：
  基于快照/引用的操作而不是 CSS 选择器定位，单文件上传
  钩子，没有对话框超时覆盖，没有 `wait --load networkidle`，也没有
  `responsebody`、PDF 导出、下载拦截或批量操作。
- 本地托管的 `openclaw` 配置文件会自动分配 `cdpPort` 和 `cdpUrl`；仅
  为远程 CDP 显式设置 `cdpUrl`。
- 本地托管配置文件可以设置 `executablePath` 以覆盖该配置文件的全局
  `browser.executablePath`。使用此功能可以在 Chrome 中运行一个配置文件，而在 Brave 中运行另一个配置文件。
- 本地托管配置文件在进程启动后使用 `browser.localLaunchTimeoutMs` 进行 Chrome CDP HTTP 发现，并在启动后使用 `browser.localCdpReadyTimeoutMs` 进行 CDP websocket 就绪检查。在 Chrome 成功启动但就绪检查与启动速度冲突的较慢主机上，请提高这些值。这两个值都必须是最大为 `120000` ms 的正整数；无效的配置值将被拒绝。
- 自动检测顺序：如果是基于 Chromium 的默认浏览器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- `browser.executablePath` 和 `browser.profiles.<name>.executablePath` 都接受 `~` 和 `~/...` 作为 Chromium 启动前的操作系统主目录。`existing-session` 配置文件上每个配置文件的 `userDataDir` 也会进行波浪号扩展。
- 控制服务：仅限回环（端口源自 `gateway.port`，默认为 `18791`）。
- `extraArgs` 会将额外的启动标志追加到本地 Chromium 启动参数中（例如 `--disable-gpu`、窗口大小或调试标志）。

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

- `seamColor`：本机应用 UI 铬层的强调色（对话模式气泡色调等）。
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
      url: "ws://127.0.0.1:18789",
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

- `mode`：`local`（运行网关）或 `remote`Gateway(网关)（连接到远程网关）。除非 `local`，否则 Gateway(网关) 拒绝启动。
- `port`：用于 WS + HTTP 的单一多路复用端口。优先级：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`：`auto`、`loopback`（默认）、`lan`（`0.0.0.0`）、`tailnet`Tailscale（仅 Tailscale IP）或 `custom`。
- **传统绑定别名**：在 `gateway.bind` 中使用绑定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），而不是主机别名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`Docker）。
- **Docker 注意事项**：默认的 `loopback` 绑定监听容器内部的 `127.0.0.1`Docker。使用 Docker 桥接网络（`-p 18789:18789`）时，流量到达 `eth0`，因此网关无法访问。请使用 `--network host`，或设置 `bind: "lan"`（或带有 `customBindHost: "0.0.0.0"` 的 `bind: "custom"`）以监听所有接口。
- **身份验证 (Auth)**：默认情况下需要。非 local loopback 绑定需要网关身份验证。实际上，这意味着共享令牌/密码或具有 `gateway.auth.mode: "trusted-proxy"` 的支持身份感知的反向代理。新手引导向导默认生成令牌。
- 如果配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs），请将 `gateway.auth.mode` 显式设置为 `token` 或 `password`。当两者都已配置但未设置模式时，启动和服务安装/修复流程将失败。
- `gateway.auth.mode: "none"`：显式的无身份验证模式。仅用于受信任的本地 local loopback 设置；新手引导提示故意不提供此选项。
- `gateway.auth.mode: "trusted-proxy"`：将浏览器/用户身份验证委托给支持身份感知的反向代理，并信任来自 `gateway.trustedProxies` 的身份标头（请参阅 [Trusted Proxy Auth](/zh/gateway/trusted-proxy-auth)）。此模式默认期望 **非 local loopback** 代理源；同主机 local loopback 反向代理需要显式 `gateway.auth.trustedProxy.allowLoopback = true`。内部同主机调用者可以将 `gateway.auth.password` 用作本地直接回退；`gateway.auth.token` 与 trusted-proxy 模式仍然互斥。
- `gateway.auth.allowTailscale`：当 `true`Tailscale 时，Tailscale Serve 身份标头可以满足控制 UI/WebSocket 身份验证（通过 `tailscale whois`APITailscale 验证）。HTTP API 端点 **不** 使用该 Tailscale 标头身份验证；它们遵循网关的正常 HTTP 身份验证模式。此无令牌流程假定网关主机是受信任的。当 `tailscale.mode = "serve"` 时，默认为 `true`。
- `gateway.auth.rateLimit`：可选的身份验证失败限制器。适用于每个客户端 IP 和每个身份验证范围（共享密钥和设备令牌独立跟踪）。被阻止的尝试返回 `429` + `Retry-After`Tailscale。
  - 在异步 Tailscale Serve 控制 UI 路径上，同一 `{scope, clientIp}` 的失败尝试在失败写入之前被序列化。因此，来自同一客户端的并发错误尝试可能会在第二次请求时触发限制器，而不是两者都作为简单的不匹配竞争通过。
  - `gateway.auth.rateLimit.exemptLoopback` 默认为 `true`；当您有意想要也对 localhost 流量进行速率限制时（对于测试设置或严格的代理部署），请设置 `false`。
- 浏览器源 WS 身份验证尝试始终会受到限制，并且禁用 local loopback 豁免（针对基于浏览器的 localhost 暴力破解的深度防御）。
- 在 local loopback 上，这些浏览器源锁定是按标准化的 `Origin` 值隔离的，因此来自一个 localhost 源的重复失败不会自动锁定不同的源。
- `tailscale.mode`：`serve`（仅 tailnet，local loopback 绑定）或 `funnel`（公开，需要身份验证）。
- `tailscale.preserveFunnel`：当 `true` 且 `tailscale.mode = "serve"`OpenClaw 时，OpenClaw 在启动时重新应用 Serve 之前检查 `tailscale funnel status`，如果外部配置的 Funnel 路由已覆盖网关端口，则跳过它。默认 `false`。
- `controlUi.allowedOrigins`Gateway(网关)：Gateway(网关) WebSocket 连接的显式浏览器源允许列表。对于公开的非 local loopback 浏览器源是必需的。来自 local loopback、RFC1918/link-local、`.local`、`.ts.net`Tailscale 或 Tailscale CGNAT 主机的私有同源 LAN/Tailnet UI 加载无需启用 Host-header 回退即可接受。
- `controlUi.chatMessageMaxWidth`：分组的控制 UI 聊天消息的可选最大宽度。接受受限制的 CSS 宽度值，例如 `960px`、`82%`、`min(1280px, 82%)` 和 `calc(100% - 2rem)`。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危险模式，为故意依赖 Host-header 源策略的部署启用 Host-header 源回退。
- `remote.transport`：`ssh`（默认）或 `direct`（ws/wss）。对于 `direct`，对于公开主机，`remote.url` 必须是 `wss://`；仅接受 local loopback、LAN、link-local、`.local`、`.ts.net`Tailscale 和 Tailscale CGNAT 主机的纯文本 `ws://`。
- `remote.remotePort`：远程 SSH 主机上的网关端口。默认为 `18789`；当本地隧道端口与远程网关端口不同时使用此项。
- `gateway.remote.token` / `.password` 是远程客户端凭据字段。它们本身不配置网关身份验证。
- `gateway.push.apns.relay.baseUrl`iOSiOS：官方/TestFlight iOS 版本在将基于中继的注册发布到网关后使用的外部 APNs 中继的基本 HTTPS URL。此 URL 必须与编译到 iOS 版本中的中继 URL 匹配。
- `gateway.push.apns.relay.timeoutMs`：网关到中继的发送超时（以毫秒为单位）。默认为 `10000`iOS。
- 基于中继的注册被委托给特定的网关身份。配对的 iOS 应用获取 `gateway.identity.get`，将该身份包含在中继注册中，并将注册范围的发送授予转发给网关。另一个网关无法重用该存储的注册。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述中继配置的临时环境覆盖。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：仅用于开发的 local loopback HTTP 中继 URL 的应急手段。生产中继 URL 应保留在 HTTPS 上。
- `gateway.handshakeTimeoutMs`Gateway(网关)：预身份验证 Gateway(网关) WebSocket 握手超时（以毫秒为单位）。默认值：`15000`。设置 `OPENCLAW_HANDSHAKE_TIMEOUT_MS` 时优先。在本地客户端可以在启动预热仍在进行时连接的负载较高或主机性能较低的情况下，请增加此值。
- `gateway.channelHealthCheckMinutes`：渠道健康监控间隔（以分钟为单位）。设置 `0` 以全局禁用健康监控重启。默认值：`5`。
- `gateway.channelStaleEventThresholdMinutes`：陈旧套接字阈值（以分钟为单位）。保持此值大于或等于 `gateway.channelHealthCheckMinutes`。默认值：`30`。
- `gateway.channelMaxRestartsPerHour`：每个渠道/账户在滚动小时内的最大健康监控重启次数。默认值：`10`。
- `channels.<provider>.healthMonitor.enabled`：每个渠道选择退出健康监控重启，同时保持全局监控处于启用状态。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户渠道的每个账户覆盖。设置后，它优先于渠道级别的覆盖。
- 本地网关调用路径仅当未设置 `gateway.auth.*` 时才能使用 `gateway.remote.*` 作为回退。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置且未解析，解析将以失败关闭（无远程回退掩码）。
- `trustedProxies`Tailscale：终止 TLS 或注入转发客户端标头的反向代理 IP。仅列出您控制的代理。Local loopback 条目对于同主机代理/本地检测设置（例如 Tailscale Serve 或本地反向代理）仍然有效，但它们 **不** 使 local loopback 请求符合 `gateway.auth.mode: "trusted-proxy"` 的条件。
- `allowRealIpFallback`：当 `true` 时，如果 `X-Forwarded-For` 缺失，网关将接受 `X-Real-IP`。默认 `false` 以实现失败关闭行为。
- `gateway.nodes.pairing.autoApproveCidrs`WebChat：用于自动批准首次节点设备配对（无请求范围）的可选 CIDR/IP 允许列表。未设置时禁用。这不会自动批准操作员/浏览器/控制 UI/WebChat 配对，也不会自动批准角色、范围、元数据或公钥升级。
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`：配对和平台允许列表评估后，针对已声明节点命令的全局允许/拒绝塑造。使用 `allowCommands` 选择加入危险的节点命令，例如 `camera.snap`、`camera.clip` 和 `screen.record`；`denyCommands` 移除命令，即使平台默认或显式允许否则会包含它。节点更改其声明的命令列表后，请拒绝并重新批准该设备配对，以便网关存储更新的命令快照。
- `gateway.tools.deny`：为 HTTP `POST /tools/invoke` 阻止的额外工具名称（扩展默认拒绝列表）。
- `gateway.tools.allow`：从默认 HTTP 拒绝列表中移除工具名称。

</Accordion>

### OpenAI 兼容端点

- Admin HTTP RPC：默认作为 `admin-http-rpc` 插件关闭。启用该插件以注册 `POST /api/v1/admin/rpc`。参见 [Admin HTTP RPC](/zh/plugins/admin-http-rpc)。
- Chat Completions：默认禁用。通过 `gateway.http.endpoints.chatCompletions.enabled: true` 启用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 输入硬化：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空的允许列表被视为未设置；使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 来禁用 URL 获取。
- 可选响应硬化标头：
  - `gateway.http.securityHeaders.strictTransportSecurity`（仅为您控制的 HTTPS 源设置；参见 [Trusted Proxy Auth](/zh/gateway/trusted-proxy-auth#tls-termination-and-hsts)）

### 多实例隔离

在一台主机上运行多个网关，并使用唯一的端口和状态目录：

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

- `enabled`：在网关监听器处启用 TLS 终止（HTTPS/WSS）（默认：`false`）。
- `autoGenerate`：当未配置显式文件时，自动生成本地自签名证书/密钥对；仅用于本地/开发环境。
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
  - `"hot"`: 在进程内应用更改而无需重启。
  - `"hybrid"` (默认): 首先尝试热重载; 如果需要，则回退到重启。
- `debounceMs`: 应用配置更改前的防抖窗口(毫秒)(非负整数)。
- `deferralTimeoutMs`: 在强制重启或渠道热重载之前，等待进行中操作的可选最长时间(毫秒)。省略此项以使用默认的有界等待(`300000`); 设置 `0` 以无限期等待并记录定期的待处理警告。

---

## Hooks

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

Auth: `Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。
Query-string hook tokens are rejected.

验证和安全注意事项:

- `hooks.enabled=true` 需要一个非空的 `hooks.token`。
- `hooks.token` 必须不同于 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN`; 重用 Gateway(网关) token 将导致启动验证失败。
- `openclaw security audit` 还会将对活动 Gateway(网关) 密码认证(`gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`, 或 `--auth password --password <password>`)的 `hooks.token` 重用标记为关键发现; 密码模式重用保持启动兼容，应通过轮换其中一个密钥来修复。
- `hooks.path` 不能是 `/`; 使用专用的子路径，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，则限制 `hooks.allowedSessionKeyPrefixes` (例如 `["hook:"]`)。
- 如果映射或预设使用了模板化的 `sessionKey`，请设置 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。静态映射键不需要该选择加入。

**端点:**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 来自请求负载的 `sessionKey` 仅在 `hooks.allowRequestSessionKey=true` 时被接受 (默认: `false`)。
- `POST /hooks/<name>` → 通过 `hooks.mappings` 解析
  - 模板渲染的映射 `sessionKey` 值被视为外部提供的，并且也需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="映射详情">

- `match.path` 匹配 `/hooks` 之后的子路径（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 匹配通用路径的 payload 字段。
- 诸如 `{{messages[0].subject}}` 之类的模板从 payload 中读取。
- `transform` 可以指向返回 hook 操作的 JS/TS 模块。
  - `transform.module` 必须是相对路径，并且必须位于 `hooks.transformsDir` 之内（拒绝绝对路径和路径遍历）。
  - 将 `hooks.transformsDir` 保留在 `~/.openclaw/hooks/transforms` 下；拒绝工作区技能目录。如果 `openclaw doctor` 报告此路径无效，请将转换模块移动到 hooks transforms 目录中，或删除 `hooks.transformsDir`。
- `agentId` 路由到特定代理；未知 ID 回退到默认代理。
- `allowedAgentIds`：限制有效的代理路由，包括省略 `agentId` 时的默认代理路径（`*` 或省略 = 允许所有，`[]` = 拒绝所有）。
- `defaultSessionKey`：用于没有显式 `sessionKey` 的 hook 代理运行的可选固定会话密钥。
- `allowRequestSessionKey`：允许 `/hooks/agent` 调用者和模板驱动的映射会话密钥设置 `sessionKey`（默认值：`false`）。
- `allowedSessionKeyPrefixes`：显式 `sessionKey` 值（请求 + 映射）的可选前缀允许列表，例如 `["hook:"]`。当任何映射或预设使用模板化的 `sessionKey` 时，它将变为必需项。
- `deliver: true` 将最终回复发送到渠道；`channel` 默认为 `last`。
- `model`LLM 为此 hook 运行覆盖 LLM（如果设置了模型目录，则必须允许）。

</Accordion>

### Gmail 集成

- 内置的 Gmail 预设使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果您保留该每条消息路由，请设置 `hooks.allowRequestSessionKey: true` 并限制 `hooks.allowedSessionKeyPrefixes` 以匹配 Gmail 命名空间，例如 `["hook:", "hook:gmail:"]`。
- 如果您需要 `hooks.allowRequestSessionKey: false`，请使用静态 `sessionKey` 覆盖预设，而不是使用默认的模板。

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

- Gateway(网关) 在配置后会在启动时自动启动 Gateway(网关)`gog gmail watch serve`。设置 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以禁用。
- 不要在 Gateway(网关) 旁边运行单独的 `gog gmail watch serve`Gateway(网关)。

---

## Canvas 插件主机

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

- 通过 HTTP 在 Gateway(网关) 端口下提供可由代理编辑的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 仅限本地：保留 `gateway.bind: "loopback"`（默认）。
- 非环回绑定：canvas 路由需要 Gateway(网关) 认证（令牌/密码/受信任代理），与其他 Gateway(网关) HTTP 表面相同。
- Node WebViews 通常不发送认证头；在节点配对并连接后，Gateway(网关) 会公布用于 canvas/A2UI 访问的节点范围能力 URL。
- 能力 URL 绑定到活动节点 WS 会话并很快过期。不使用基于 IP 的回退。
- 将实时重新加载客户端注入到提供的 HTML 中。
- 为空时自动创建起始 `index.html`。
- 同时也提供位于 `/__openclaw__/a2ui/` 的 A2UI。
- 更改需要重启网关。
- 对于大型目录或 `EMFILE` 错误，请禁用实时重新加载。

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

- `minimal`（当启用捆绑的 `bonjour` 插件时的默认值）：从 TXT 记录中省略 `cliPath` + `sshPort`。
- `full`：包括 `cliPath` + `sshPort`；LAN 组播广播仍然需要启用捆绑的 `bonjour` 插件。
- `off`：在不更改插件启用状态的情况下抑制 LAN 组播通告。
- 捆绑的 `bonjour` 插件在 macOS 主机上自动启动，在 Linux、Windows 和容器化的 Gateway(网关) 部署中默认不启用。
- 当主机名是有效的 DNS 标签时，主机名默认为系统主机名，否则回退到 `openclaw`。使用 `OPENCLAW_MDNS_HOSTNAME` 覆盖。

### 广域网 (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下写入单播 DNS-SD 区域。为了跨网络发现，需配合 DNS 服务器（推荐 CoreDNS）+ Tailscale 分离 DNS 使用。

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
- `shellEnv`：从您的登录 Shell 配置文件中导入缺失的预期键名。
- 有关完整的优先级，请参阅 [Environment](/zh/help/environment)。

### 环境变量替换

使用 `${VAR_NAME}` 在任何配置字符串中引用环境变量：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`。
- 缺失/空变量会在加载配置时引发错误。
- 使用 `$${VAR}` 进行转义以获取字面量 `${VAR}`。
- 适用于 `$include`。

---

## 密钥

密钥引用是累加的：纯文本值仍然有效。

### `SecretRef`

使用一种对象形式：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

验证：

- `provider` 模式：`^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` id 模式：`^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id：绝对 JSON 指针（例如 `"/providers/openai/apiKey"`）
- `source: "exec"` id 模式：`^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$`（支持 AWS 风格的 `secret#json_key` 选择器）
- `source: "exec"` id 不得包含 `.` 或 `..` 斜杠分隔的路径段（例如 `a/../b` 会被拒绝）

### 支持的凭据界面

- 标准矩阵：[SecretRef 凭据界面](/zh/reference/secretref-credential-surface)
- `secrets apply` 目标支持 `openclaw.json` 凭据路径。
- `auth-profiles.json` 引用包含在运行时解析和审计覆盖范围内。

### 密钥提供商配置

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

注意事项：

- `file` 提供商支持 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下 `id` 必须是 `"value"`）。
- 当 Windows ACL 验证不可用时，File 和 exec 提供商路径将以失败关闭（fail closed）方式处理。仅对无法验证的受信任路径设置 `allowInsecurePath: true`。
- `exec` 提供商需要绝对 `command` 路径，并在 stdin/stdout 上使用协议有效载荷。
- 默认情况下，符号链接命令路径会被拒绝。设置 `allowSymlinkCommand: true` 以在验证解析后的目标路径时允许符号链接路径。
- 如果配置了 `trustedDirs`，受信任目录检查将应用于解析后的目标路径。
- `exec` 子环境默认情况下是最小的；使用 `passEnv` 显式传递所需的变量。
- 密钥引用在激活时解析为内存快照，然后请求路径仅读取该快照。
- 活动界面过滤在激活期间应用：已启用界面上的未解析引用会导致启动/重新加载失败，而未激活的界面将被跳过并输出诊断信息。

---

## 身份验证存储

```json5
{
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai:personal": { provider: "openai", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      openai: ["openai:personal"],
    },
  },
}
```

- 每个代理的配置文件存储在 `<agentDir>/auth-profiles.json`。
- `auth-profiles.json` 支持静态凭据模式的值级引用（`api_key` 的 `keyRef`，`token` 的 `tokenRef`）。
- 传统的扁平 `auth-profiles.json` 映射（如 `{ "provider": { "apiKey": "..." } }`）不是运行时格式；`openclaw doctor --fix` 会将它们重写为带有 `.legacy-flat.*.bak` 备份的规范 `provider:default`API API 密钥配置文件。
- OAuth 模式配置文件（OAuth`auth.profiles.<id>.mode = "oauth"`）不支持 SecretRef 支持的身份验证配置文件凭据。
- 静态运行时凭据来自内存中解析的快照；当发现传统的静态 `auth.json` 条目时，它们会被清除。
- 从 OAuth`~/.openclaw/credentials/oauth.json` 导入的传统 OAuth。
- 参见 [OAuth](OAuth/en/concepts/oauth)。
- Secrets 运行时行为和 `audit/configure/apply` 工具：[Secrets 管理](/zh/gateway/secrets)。

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

- `billingBackoffHours`：当配置文件因真实的计费/余额不足错误而失败时的基础退避时间（小时）（默认：`5`）。即使在 `401`/`403`OpenRouter 响应上，明确的计费文本仍可能出现在此处，但提供商特定的文本匹配器仍限定于拥有它们的提供商（例如 OpenRouter `Key limit exceeded`）。可重试的 HTTP `402` 使用量窗口或组织/工作区支出限制消息会保留在 `rate_limit` 路径中。
- `billingBackoffHoursByProvider`：针对计费退避小时数的可选各提供商覆盖项。
- `billingMaxHours`：计费退避指数增长的上限（小时）（默认：`24`）。
- `authPermanentBackoffMinutes`：高置信度 `auth_permanent` 失败的基础退避时间（分钟）（默认：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增长的上限（分钟）（默认：`60`）。
- `failureWindowHours`：用于退避计数器的滚动窗口（小时）（默认：`24`）。
- `overloadedProfileRotations`：在切换到模型回退之前，针对过载错误进行的同一提供商身份验证配置文件轮换的最大次数（默认值：`1`）。诸如 `ModelNotReadyException` 之类的提供商繁忙形状归入此处。
- `overloadedBackoffMs`：重试过载的提供商/配置文件轮换之前的固定延迟（默认值：`0`）。
- `rateLimitedProfileRotations`：在切换到模型回退之前，针对速率限制错误进行的同一提供商身份验证配置文件轮换的最大次数（默认值：`1`）。该速率限制存储桶包括提供商形状的文本，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

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
- 设置 `logging.file` 以获得稳定的路径。
- 当 `--verbose` 时，`consoleLevel` 会升级为 `debug`。
- `maxFileBytes`：轮换前活动日志文件的最大大小（以字节为单位，正整数；默认值：`104857600`OpenClaw = 100 MB）。OpenClaw 在活动文件旁边最多保留五个编号的存档。
- `redactSensitive` / `redactPatterns`：对控制台输出、文件日志、OTLP 日志记录和持久化会话文本记录的最佳屏蔽尝试。`redactSensitive: "off"` 仅禁用此常规日志/文本记录策略；UI/工具/诊断安全表面在发出之前仍会对机密信息进行编辑。

---

## 诊断

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],
    stuckSessionWarnMs: 30000,
    stuckSessionAbortMs: 300000,
    memoryPressureSnapshot: false,

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
        toolDefinitions: false,
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

- `enabled`：检测输出的主开关（默认值：`true`）。
- `flags`：用于启用定向日志输出的标志字符串数组（支持通配符，如 `"telegram.*"` 或 `"*"`）。
- `stuckSessionWarnMs`：用于将长时间运行的会话归类为 `session.long_running`、`session.stalled` 或 `session.stuck` 的无进展时间阈值（毫秒）。回复、工具、状态、模块和 ACP 进展会重置计时器；重复的 `session.stuck` 诊断会在未更改时退避。
- `stuckSessionAbortMs`OpenClaw：符合中止排空以进行恢复的停滞活跃工作所允许的无进展时间阈值（毫秒）。未设置时，OpenClaw 使用更安全的扩展嵌入式运行窗口，即至少 5 分钟且为 `stuckSessionWarnMs` 的 3 倍。
- `memoryPressureSnapshot`：当内存压力达到 `critical`（默认：`false`）时，捕获经过编辑的 OOM 前稳定性快照。设置为 `true` 以添加稳定性包文件扫描/写入，同时保持正常的内存压力事件。
- `otel.enabled`：启用 OpenTelemetry 导出管道（默认：`false`）。有关完整配置、信号目录和隐私模型，请参阅 [OpenTelemetry export](/zh/gateway/opentelemetry)。
- `otel.endpoint`：OTel 导出的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`：可选的特定信号 OTLP 端点。设置后，它们将仅针对该信号覆盖 `otel.endpoint`。
- `otel.protocol`：`"http/protobuf"`（默认）或 `"grpc"`。
- `otel.headers`：随 OTel 导出请求一起发送的额外 HTTP/gRPC 元数据标头。
- `otel.serviceName`：资源属性的服务名称。
- `otel.traces` / `otel.metrics` / `otel.logs`：启用链路追踪、指标或日志导出。
- `otel.sampleRate`：链路追踪采样率 `0`-`1`。
- `otel.flushIntervalMs`：定期遥测刷新间隔（毫秒）。
- `otel.captureContent`：用于 OTEL span 属性的可选原始内容捕获。默认为关闭。布尔值 `true` 捕获非系统消息/工具内容；对象形式允许您显式启用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs`、`systemPrompt` 和 `toolDefinitions`。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：最新的实验性 GenAI 推断 span 形状的环境切换，包括 `{gen_ai.operation.name} {gen_ai.request.model}` span 名称、`CLIENT` span 种类以及 `gen_ai.provider.name`，而非传统的 `gen_ai.system`。默认情况下，为了兼容性，span 保留 `openclaw.model.call` 和 `gen_ai.system`；GenAI 指标使用有界的语义属性。
- `OPENCLAW_OTEL_PRELOADED=1`：针对已注册全局 OpenTelemetry SDK 的主机的环境切换。OpenClaw 随后会跳过插件拥有的 SDK 启动/关闭，同时保持诊断侦听器处于活动状态。
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`、`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` 和 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`：当未设置匹配的配置键时使用的特定信号端点环境变量。
- `cacheTrace.enabled`：记录嵌入式运行的缓存跟踪快照（默认：`false`）。
- `cacheTrace.filePath`：缓存跟踪 JSONL 的输出路径（默认：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制缓存跟踪输出中包含的内容（均默认为：`true`）。

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

- `channel`：用于 npm/git 安装的发布渠道 - `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：在网关启动时检查 npm 更新（默认：`true`）。
- `auto.enabled`：启用包安装的后台自动更新（默认：`false`）。
- `auto.stableDelayHours`：稳定渠道自动应用前的最小延迟小时数（默认：`6`；最大：`168`）。
- `auto.stableJitterHours`：额外的稳定渠道发布扩散窗口小时数（默认：`12`；最大：`168`）。
- `auto.betaCheckIntervalHours`：Beta 渠道检查的运行频率小时数（默认：`1`；最大：`24`）。

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

- `enabled`：全局 ACP 功能开关（默认：`true`；设置为 `false` 以隐藏 ACP 分派和生成工具）。
- `dispatch.enabled`：ACP 会话轮次分派的独立开关（默认：`true`）。设置为 `false` 可在阻止执行的同时保持 ACP 命令可用。
- `backend`：默认 ACP 运行时后端 ID（必须匹配已注册的 ACP 运行时插件）。
  请先安装后端插件，并且如果设置了 `plugins.allow`，请包含后端插件 ID（例如 `acpx`），否则 ACP 后端将无法加载。
- `defaultAgent`：当生成未指定明确目标时的回退 ACP 目标代理 ID。
- `allowedAgents`：允许用于 ACP 运行时会话的代理 ID 白名单；为空表示没有额外限制。
- `maxConcurrentSessions`：最大并发活动 ACP 会话数。
- `stream.coalesceIdleMs`：流式文本的空闲刷新窗口（毫秒）。
- `stream.maxChunkChars`：分割流式块投影前的最大块大小。
- `stream.repeatSuppression`：抑制每轮重复的状态/工具行（默认：`true`）。
- `stream.deliveryMode`：`"live"` 逐流式传输；`"final_only"` 缓冲直到轮次终止事件。
- `stream.hiddenBoundarySeparator`：隐藏工具事件后可见文本之前的分隔符（默认：`"paragraph"`）。
- `stream.maxOutputChars`：每个 ACP 回合预计的助手输出最大字符数。
- `stream.maxSessionUpdateChars`：预计 ACP 状态/更新行的最大字符数。
- `stream.tagVisibility`：用于覆盖流式事件可见性的标签名称到布尔值的记录。
- `runtime.ttlMinutes`：ACP 会话工作器在符合清理条件前的空闲 TTL（分钟）。
- `runtime.installCommand`：引导 ACP 运行时环境时运行的可选安装命令。

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
  - `"random"`（默认）：轮换展示有趣/季节性标语。
  - `"default"`：固定中性标语（`All your chats, one OpenClaw.`）。
  - `"off"`：无标语文本（仍显示横幅标题/版本）。
- 要隐藏整个横幅（不仅仅是标语），请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

---

## Wizard

由 CLI 引导设置流程写入的元数据（`onboard`、`configure`、`doctor`）：

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

## Identity

请参阅 [Agent defaults](/zh/gateway/config-agents#agent-defaults) 下的 `agents.list` 身份字段。

---

## Bridge (legacy, removed)

当前版本不再包含 TCP 桥接。节点通过 Gateway(网关) WebSocket 连接。`bridge.*` 键不再属于配置架构的一部分（验证失败直至移除；`openclaw doctor --fix` 可以剥离未知键）。

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
    maxConcurrentRuns: 8, // default; cron dispatch + isolated cron agent-turn execution
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

- `sessionRetention`：在从 `sessions.json` 修剪之前保留已完成隔离 cron 运行会话的时长。同时也控制已归档的已删除 cron 副本的清理。默认值：`24h`；设置为 `false` 以禁用。
- `runLog.maxBytes`：为与旧版基于文件的 cron 运行日志兼容而接受。默认值：`2_000_000` 字节。
- `runLog.keepLines`：每个作业保留的最新 SQLite 运行历史记录行数。默认值：`2000`。
- `webhookToken`：用于 cron webhook POST 传递（`delivery.mode = "webhook"`）的持有者令牌，如果省略则不发送认证标头。
- `webhook`：已弃用的旧版后备 webhook URL (http/https)，仅用于仍有 `notify: true` 的已存储作业。

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

- `maxAttempts`：Cron 作业在瞬态错误上的最大重试次数（默认值：`3`；范围：`0`-`10`）。
- `backoffMs`：每次重试尝试的退避延迟（毫秒）数组（默认值：`[30000, 60000, 300000]`；1-10 个条目）。
- `retryOn`：触发重试的错误类型 - `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略以重试所有瞬态类型。

单次作业在重试次数用尽之前保持启用状态，然后在禁用时保留最终的错误状态。周期性作业使用相同的瞬态重试策略，在退避后于其下一个计划时段之前再次运行；永久错误或已耗尽的瞬态重试将回退到带有错误退避的正常周期性计划。

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

- `enabled`：启用 cron 作业的失败警报（默认值：`false`）。
- `after`：触发警报前的连续失败次数（正整数，最小值：`1`）。
- `cooldownMs`：针对同一作业的重复警报之间的最小毫秒数（非负整数）。
- `includeSkipped`：将连续跳过的运行计入警报阈值（默认值：`false`）。跳过的运行被单独跟踪，并且不影响执行错误退避。
- `mode`: 投递模式 - `"announce"` 通过渠道消息发送；`"webhook"` 发布到已配置的 webhook。
- `accountId`: 用于限定警报投递的可选账号或渠道 ID。

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

- 所有作业的 cron 失败通知的默认目标。
- `mode`: `"announce"` 或 `"webhook"`；当存在足够的目标数据时，默认为 `"announce"`。
- `channel`: 公告投递的渠道覆盖。`"last"` 重用最后已知的投递渠道。
- `to`: 显式的公告目标或 webhook URL。Webhook 模式必需。
- `accountId`: 用于投递的可选账号覆盖。
- 每个作业的 `delivery.failureDestination` 覆盖此全局默认值。
- 当既未设置全局也未设置单作业的失败目标时，已经通过 `announce` 投递的作业在失败时会回退到该主要公告目标。
- `delivery.failureDestination` 仅受 `sessionTarget="isolated"` 作业支持，除非该作业的主要 `delivery.mode` 为 `"webhook"`。

参见 [Cron 作业](/zh/automation/cron-jobs)。独立的 cron 执行被作为 [后台任务](/zh/automation/tasks) 进行跟踪。

---

## 媒体模型模板变量

在 `tools.media.models[].args` 中展开的模板占位符：

| 变量               | 描述                                           |
| ------------------ | ---------------------------------------------- |
| `{{Body}}`         | 完整的入站消息正文                             |
| `{{RawBody}}`      | 原始正文（无历史记录/发送者包装器）            |
| `{{BodyStripped}}` | 去除了群组提及的正文                           |
| `{{From}}`         | 发送者标识符                                   |
| `{{To}}`           | 目标标识符                                     |
| `{{MessageSid}}`   | 渠道消息 ID                                    |
| `{{SessionId}}`    | 当前会话 UUID                                  |
| `{{IsNewSession}}` | 创建新会话时的 `"true"`                        |
| `{{MediaUrl}}`     | 入站媒体伪 URL                                 |
| `{{MediaPath}}`    | 本地媒体路径                                   |
| `{{MediaType}}`    | 媒体类型（图像/音频/文档/…）                   |
| `{{Transcript}}`   | 音频转录                                       |
| `{{Prompt}}`       | 为 CLI 条目解析的媒体提示                      |
| `{{MaxChars}}`     | 为 CLI 条目解析的最大输出字符数                |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                        |
| `{{GroupSubject}}` | 群组主题（尽力而为）                           |
| `{{GroupMembers}}` | 群组成员预览（尽力而为）                       |
| `{{SenderName}}`   | 发送者显示名称（尽力而为）                     |
| `{{SenderE164}}`   | 发送者电话号码（尽力而为）                     |
| `{{Provider}}`     | 提供程序提示（whatsapp、telegram、discord 等） |

---

## 配置包含（`$include`）

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

- 单个文件：替换包含的对象。
- 文件数组：按顺序深度合并（后面的覆盖前面的）。
- 同级键：在包含之后合并（覆盖包含的值）。
- 嵌套包含：最多 10 层深度。
- 路径：相对于包含文件进行解析，但必须保持在顶级配置目录（`openclaw.json` 的 `dirname`）内。仅当解析结果仍在该边界内时，才允许使用绝对/`../` 形式。路径不得包含空字节，并且在解析前和解析后必须严格少于 4096 个字符。
- OpenClaw 拥有的写入操作（如果仅更改由单文件包含支持的一个顶级部分）将直接写入该包含的文件。例如，`plugins install` 更新 `plugins.json5` 中的 `plugins: { $include: "./plugins.json5" }`，并保持 `openclaw.json` 不变。
- 对于 OpenClaw 拥有的写入操作，根包含、包含数组和具有同级覆盖的包含是只读的；这些写入操作将失败关闭，而不是扁平化配置。
- 错误：针对文件缺失、解析错误、循环包含、无效路径格式和长度过大的清晰消息。

---

_相关：[配置](/zh/gateway/configuration) · [配置示例](/zh/gateway/configuration-examples) · [诊断工具](/zh/gateway/doctor)_

## 相关

- [配置](/zh/gateway/configuration)
- [配置示例](/zh/gateway/configuration-examples)
