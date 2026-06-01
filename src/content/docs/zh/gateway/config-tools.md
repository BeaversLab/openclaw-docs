---
summary: "工具配置（策略、实验性切换、提供商支持的工具）和自定义提供商/基础 URL 设置"
read_when:
  - Configuring `tools.*` policy, allowlists, or experimental features
  - Registering custom providers or overriding base URLs
  - Setting up OpenAI-compatible self-hosted endpoints
title: "配置 — 工具和自定义提供商"
sidebarTitle: "工具和自定义提供商"
---

`tools.*` 配置键以及自定义提供商/基础 URL 设置。有关代理、通道和其他顶级配置键，请参阅 [配置参考](/zh/gateway/configuration-reference)。

## 工具

### 工具配置文件

`tools.profile` 在 `tools.allow`/`tools.deny` 之前设置了一个基本允许列表：

<Note>本地新手引导默认将新的本地配置设置为 `tools.profile: "coding"`（如果未设置）（现有的显式配置文件将被保留）。</Note>

| 配置文件    | 包括                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | `session_status` 仅                                                                                                             |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                       |
| `full`      | 无限制（与未设置相同）                                                                                                          |

### 工具组

| 组                 | 工具                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process`, `code_execution` (`bash` 被接受为 `exec` 的别名)                                                     |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                                                                                  |
| `group:sessions`   | `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status` |
| `group:memory`     | `memory_search`, `memory_get`                                                                                           |
| `group:web`        | `web_search`, `x_search`, `web_fetch`                                                                                   |
| `group:ui`         | `browser`, `canvas`                                                                                                     |
| `group:automation` | `heartbeat_respond`, `cron`, `gateway`                                                                                  |
| `group:messaging`  | `message`                                                                                                               |
| `group:nodes`      | `nodes`                                                                                                                 |
| `group:agents`     | `agents_list`, `update_plan`                                                                                            |
| `group:media`      | `image`, `image_generate`, `music_generate`, `video_generate`, `tts`                                                    |
| `group:openclaw`   | 所有内置工具（不包括提供商插件）                                                                                        |
| `group:plugins`    | 已加载插件拥有的工具，包括通过 `bundle-mcp` 公开的已配置 MCP 服务器                                                     |

### 沙箱工具策略内的 MCP 和插件工具

已配置的 MCP 服务器在 `bundle-mcp` 插件 ID 下作为插件拥有的工具公开。普通的工具配置文件可以允许使用它们，但 `tools.sandbox.tools` 是沙箱会话的额外关卡。如果沙箱模式为 `"all"` 或 `"non-main"`，并且 MCP/插件工具应当可见，请在沙箱工具允许列表中包含以下条目之一：

- `bundle-mcp` 用于来自 `mcp.servers` 的由 OpenClaw 管理的 MCP 服务器
- 特定原生插件的插件 ID
- `group:plugins` 用于所有已加载的插件拥有的工具
- 确切的 MCP 服务器工具名称或服务器通配符（例如 `outlook__send_mail` 或 `outlook__*`），当您只需要一个服务器时

Server globs 使用对提供商安全的 MCP server 前缀，不一定是原始的 `mcp.servers` 键。非 `[A-Za-z0-9_-]` 字符会变成 `-`，不以字母开头的名称会加上 `mcp-` 前缀，过长或重复的前缀可能会被截断或添加后缀；例如，`mcp.servers["Outlook Graph"]` 使用类似于 `outlook-graph__*` 的 glob。

```json5
{
  agents: { defaults: { sandbox: { mode: "all" } } },
  mcp: {
    servers: {
      outlook: { command: "node", args: ["./outlook-mcp.js"] },
    },
  },
  tools: {
    sandbox: {
      tools: {
        alsoAllow: ["web_search", "web_fetch", "memory_search", "memory_get", "bundle-mcp"],
      },
    },
  },
}
```

如果没有该沙箱层条目，MCP server 仍然可以成功加载，但其工具会在提供商请求之前被过滤。使用 `openclaw doctor` 来捕获 OpenClaw 托管服务器在 `mcp.servers` 中的这种情况。从捆绑的插件清单或 Claude `.mcp.json` 加载的 MCP server 使用相同的沙箱入口，但此诊断尚未枚举这些来源；如果它们的工具在沙箱隔离轮次中消失，请使用相同的允许列表条目。

### `tools.allow` / `tools.deny`

全局工具允许/拒绝策略（拒绝优先）。不区分大小写，支持 `*` 通配符。即使 Docker 沙箱处于关闭状态也会应用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

`write` 和 `apply_patch` 是单独的工具 ID。`allow: ["write"]` 也会为兼容模型启用 `apply_patch`，但 `deny: ["write"]` 不会拒绝 `apply_patch`。要阻止所有文件变更，请拒绝 `group:fs` 或明确列出每个变更工具：

```json5
{
  tools: { deny: ["write", "edit", "apply_patch"] },
}
```

### `tools.byProvider`

进一步限制特定提供商或模型的工具。顺序：基础配置文件 → 提供商配置文件 → 允许/拒绝。

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
      "openai/gpt-5.4": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

### `tools.toolsBySender`

限制特定请求者身份的工具。这是在渠道访问控制之上的纵深防御；发送者值必须来自渠道适配器，而不是消息文本。

```json5
{
  tools: {
    toolsBySender: {
      "channel:discord:1234567890123": { alsoAllow: ["group:fs"] },
      "id:guest-user-id": { deny: ["group:runtime", "group:fs"] },
      "*": { deny: ["exec", "process", "write", "edit", "apply_patch"] },
    },
  },
}
```

键使用显式前缀：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 或 `"*"`OpenClaw。渠道 ID 是规范的 OpenClaw ID；诸如 `teams` 之类的别名会标准化为 `msteams`。旧的无前缀键仅被接受为 `id:`。匹配顺序为 渠道+id、id、e164、username、name，然后是通配符。

当每个代理的 `agents.list[].tools.toolsBySender` 匹配时，即使具有空的 `{}` 策略，也会覆盖全局发送者匹配。

### `tools.elevated`

控制沙箱外的高级 exec 访问权限：

```json5
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        discord: ["1234567890123", "987654321098765432"],
      },
    },
  },
}
```

- 每个代理的覆盖设置 (`agents.list[].tools.elevated`) 只能进一步限制权限。
- `/elevated on|off|ask|full` 按会话存储状态；内联指令适用于单条消息。
- 高级 `exec` 绕过沙箱隔离，并使用配置的转义路径（默认为 `gateway`，或者当 exec 目标为 `node` 时为 `node`）。

### `tools.exec`

```json5
{
  tools: {
    exec: {
      backgroundMs: 10000,
      timeoutSec: 1800,
      cleanupMs: 1800000,
      notifyOnExit: true,
      notifyOnExitEmptySuccess: false,
      commandHighlighting: false,
      applyPatch: {
        enabled: false,
        allowModels: ["gpt-5.5"],
      },
    },
  },
}
```

### `tools.loopDetection`

工具循环安全检查**默认处于禁用状态**。设置 `enabled: true` 以激活检测。设置可以在 `tools.loopDetection` 中全局定义，并可在 `agents.list[].tools.loopDetection` 处按代理覆盖。

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

<ParamField path="historySize" type="number">
  为循环分析保留的最大工具调用历史记录。
</ParamField>
<ParamField path="warningThreshold" type="number">
  针对警告的重复无进展模式阈值。
</ParamField>
<ParamField path="criticalThreshold" type="number">
  用于阻止关键循环的更高重复阈值。
</ParamField>
<ParamField path="globalCircuitBreakerThreshold" type="number">
  任何无进展运行的硬停止阈值。
</ParamField>
<ParamField path="detectors.genericRepeat" type="boolean">
  对重复的相同工具/相同参数调用发出警告。
</ParamField>
<ParamField path="detectors.knownPollNoProgress" type="boolean">
  对已知轮询工具（`process.poll`、`command_status` 等）发出警告/阻止。
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  对交替的无进展配对模式发出警告/阻止。
</ParamField>

<Warning>
如果 `warningThreshold >= criticalThreshold` 或 `criticalThreshold >= globalCircuitBreakerThreshold`，则验证失败。
</Warning>

### `tools.web`

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "brave_api_key", // or BRAVE_API_KEY env
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
      fetch: {
        enabled: true,
        provider: "firecrawl", // optional; omit for auto-detect
        maxChars: 50000,
        maxCharsCap: 50000,
        maxResponseBytes: 2000000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        readability: true,
        userAgent: "custom-ua",
      },
    },
  },
}
```

### `tools.media`

配置入站媒体理解（图像/音频/视频）：

```json5
{
  tools: {
    media: {
      concurrency: 2,
      asyncCompletion: {
        directSend: false, // deprecated: completions stay agent-mediated
      },
      audio: {
        enabled: true,
        maxBytes: 20971520,
        scope: {
          default: "deny",
          rules: [{ action: "allow", match: { chatType: "direct" } }],
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          { type: "cli", command: "whisper", args: ["--model", "base", "{{MediaPath}}"] },
        ],
      },
      image: {
        enabled: true,
        timeoutSeconds: 180,
        models: [{ provider: "ollama", model: "gemma4:26b", timeoutSeconds: 300 }],
      },
      video: {
        enabled: true,
        maxBytes: 52428800,
        models: [{ provider: "google", model: "gemini-3-flash-preview" }],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Media 模型 entry fields">
    **Provider entry** (`type: "provider"` 或省略):

    - `provider`: API 提供商 id (`openai`, `anthropic`, `google`/`gemini`, `groq`, 等)
    - `model`: 模型 id 覆盖
    - `profile` / `preferredProfile`: `auth-profiles.json` 配置文件选择

    **CLI entry** (`type: "cli"`):

    - `command`: 要运行的可执行文件
    - `args`: 模板化参数 (支持 `{{MediaPath}}`, `{{Prompt}}`, `{{MaxChars}}` 等; `openclaw doctor --fix` 将已弃用的 `{input}` 占位符迁移到 `{{MediaPath}}`)

    **Common fields:**

    - `capabilities`: 可选列表 (`image`, `audio`, `video`)。默认值: `openai`/`anthropic`/`minimax` → image, `google` → image+audio+video, `groq` → audio。
    - `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`: 每个条目的覆盖设置。
    - `tools.media.image.timeoutSeconds` 和匹配的图像模型 `timeoutSeconds` 条目在代理调用显式 `image` 工具时也适用。
    - 失败时会回退到下一个条目。

    Provider auth follows standard order: `auth-profiles.json` → 环境变量 → `models.providers.*.apiKey`.

    **Async completion fields:**

    - `asyncCompletion.directSend`: 已弃用的兼容性标志。完成的异步媒体任务保持请求者会话中介，以便代理接收结果，决定如何告知用户，并在需要源传递时使用消息工具。

  </Accordion>
</AccordionGroup>

### `tools.agentToAgent`

```json5
{
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },
}
```

### `tools.sessions`

控制会话工具（`sessions_list`、`sessions_history`、`sessions_send`）可以定位哪些会话。

默认值：`tree`（当前会话及其产生的会话，例如子代理）。

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      visibility: "tree",
    },
  },
}
```

<AccordionGroup>
  <Accordion title="可见性范围">
    - `self`：仅限当前会话密钥。
    - `tree`：当前会话 + 由当前会话生成的会话（子代理）。
    - `agent`：属于当前代理 ID 的任何会话（如果您在同一代理 ID 下运行按发送方划分的会话，则可能包含其他用户）。
    - `all`：任何会话。跨代理定位仍然需要 `tools.agentToAgent`。
    - 沙箱限制：当当前会话处于沙箱隔离状态且设置了 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 时，即使指定了 `tools.sessions.visibility="all"`，可见性也会被强制为 `tree`。
    - 当未设置为 `all` 时，`sessions_list` 包含一个紧凑的 `visibility` 字段
      用于描述有效模式，并警告某些会话可能会
      在当前范围之外被省略。

  </Accordion>
</AccordionGroup>

### `tools.sessions_spawn`

控制 `sessions_spawn` 的内联附件支持。

```json5
{
  tools: {
    sessions_spawn: {
      attachments: {
        enabled: false, // opt-in: set true to allow inline file attachments
        maxTotalBytes: 5242880, // 5 MB total across all files
        maxFiles: 50,
        maxFileBytes: 1048576, // 1 MB per file
        retainOnSessionKeep: false, // keep attachments when cleanup="keep"
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="附件说明">
    - 附件仅支持 `runtime: "subagent"`。ACP 运行时会拒绝它们。
    - 文件在 `.openclaw/attachments/<uuid>/` 处具体化为子工作区，并带有 `.manifest.json`。
    - 附件内容会从会话记录持久化中自动删除。
    - Base64 输入会通过严格的字母表/填充检查和预解码大小保护进行验证。
    - 文件权限方面，目录为 `0700`，文件为 `0600`。
    - 清理遵循 `cleanup` 策略：`delete` 始终删除附件；`keep` 仅在 `retainOnSessionKeep: true` 时保留它们。

  </Accordion>
</AccordionGroup>

<a id="toolsexperimental"></a>

### `tools.experimental`

实验性内置工具标志。除非应用了严格代理 GPT-5 自动启用规则，否则默认关闭。

```json5
{
  tools: {
    experimental: {
      planTool: true, // enable experimental update_plan
    },
  },
}
```

- `planTool`：为非平凡的多步骤工作跟踪启用了结构化 `update_plan` 工具。
- 默认值：`false`，除非在运行 OpenAI 或 OpenAI Codex GPT-5 系列模型时，将 `agents.defaults.embeddedAgent.executionContract`（或每个代理的覆盖设置）设置为 `"strict-agentic"`。设置 `true` 可在此范围之外强制开启该工具，或设置 `false` 以确保即使在严格代理式 GPT-5 运行中也保持关闭。
- 启用后，系统提示词还会添加使用指南，以确保模型仅将其用于实质性工作，并且最多保持一个步骤 `in_progress`。

### `agents.defaults.subagents`

```json5
{
  agents: {
    defaults: {
      subagents: {
        allowAgents: ["research"],
        model: "minimax/MiniMax-M2.7",
        maxConcurrent: 8,
        runTimeoutSeconds: 900,
        announceTimeoutMs: 120000,
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model`：生成的子代理的默认模型。如果省略，子代理将继承调用者的模型。
- `allowAgents`：当请求代理未设置其自己的 `subagents.allowAgents` 时，`sessions_spawn` 的已配置目标代理 ID 的默认允许列表（`["*"]` = 任何已配置的目标；默认值：仅限同一代理）。其代理配置已删除的陈旧条目将被 `sessions_spawn` 拒绝，并从 `agents_list` 中省略；运行 `openclaw doctor --fix` 以将其清理。
- `runTimeoutSeconds`：当工具调用省略 `runTimeoutSeconds` 时，`sessions_spawn` 的默认超时（秒）。`0` 表示无超时。
- `announceTimeoutMs`：网关 `agent` 公告传递尝试的每次调用超时（毫秒）。默认值：`120000`。瞬态重试可能会导致总公告等待时间长于一个配置的超时时间。
- 每个子代理的工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自定义提供商和基础 URL

提供者插件会发布其自己的模型目录行。可以通过配置中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 添加自定义提供者。

配置自定义/本地提供商 `baseUrl`OpenClaw 也是对模型 HTTP 请求的狭义网络信任决策：OpenClaw 允许该确切的 `scheme://host:port` 源通过受保护的 fetch 路径，而无需添加单独的配置选项或信任其他私有源。

```json5
{
  models: {
    mode: "merge", // merge (default) | replace
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-completions", // openai-completions | openai-responses | anthropic-messages | google-generative-ai
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            contextTokens: 96000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Auth and merge precedence">
    - 使用 `authHeader: true` + `headers` 满足自定义身份验证需求。
    - 使用 `OPENCLAW_AGENT_DIR` 覆盖 agent 配置根节点。
    - 匹配提供商 ID 的合并优先级：
      - 非空的 agent `models.json` `baseUrl` 值优先。
      - 非空的 agent `apiKey` 值仅在该提供商在当前配置/身份验证配置文件上下文中不由 SecretRef 管理时优先。
      - SecretRef 管理的提供商 `apiKey` 值从源标记（环境变量引用为 `ENV_VAR_NAME`，文件/exec 引用为 `secretref-managed`）刷新，而不是持久化已解析的密钥。
      - SecretRef 管理的提供商标头值从源标记（环境变量引用为 `secretref-env:ENV_VAR_NAME`，文件/exec 引用为 `secretref-managed`）刷新。
      - 空值或缺失的 agent `apiKey`/`baseUrl` 回退到配置中的 `models.providers`。
      - 匹配的模型 `contextWindow`/`maxTokens` 使用显式配置和隐式目录值中的较高者。
      - 匹配的模型 `contextTokens` 在存在时保留显式运行时上限；使用它来限制有效上下文，而无需更改原生模型元数据。
      - 提供商插件目录作为生成的插件拥有的目录分片存储在 agent 的插件状态下。
      - 当您希望配置完全重写 `models.json` 和活动插件目录分片时，请使用 `models.mode: "replace"`。
      - 标记持久化以源为权威：标记是从活动源配置快照（解析前）写入的，而不是从解析后的运行时密钥值写入的。

  </Accordion>
</AccordionGroup>

### 提供商字段详细信息

<AccordionGroup>
  <Accordion title="Top-level catalog">
    - `models.mode`: 提供商目录行为（`merge` 或 `replace`）。
    - `models.providers`: 由提供商 ID 键入的自定义提供商映射。
      - 安全编辑：使用 `openclaw config set models.providers.<id> '<json>' --strict-json --merge` 或 `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` 进行增量更新。`config set` 会拒绝破坏性替换，除非您传递 `--replace`。

  </Accordion>
  <Accordion title="Provider connection and auth">
    - `models.providers.*.api`：请求适配器（`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。对于 MLX、vLLM、SGLang 等自托管 `/v1/chat/completions` 后端以及大多数 OpenAI 兼容的本地服务器，请使用 `openai-completions`。具有 `baseUrl` 但没有 `api` 的自定义提供商默认为 `openai-completions`；仅当后端支持 `/v1/responses` 时才设置 `openai-responses`。
    - `models.providers.*.apiKey`：提供商凭据（建议使用 SecretRef/env 替换）。
    - `models.providers.*.auth`：身份验证策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
    - `models.providers.*.contextWindow`：当模型条目未设置 `contextWindow` 时，此提供商下模型的默认原生上下文窗口。
    - `models.providers.*.contextTokens`：当模型条目未设置 `contextTokens` 时，此提供商下模型的默认有效运行时上下文上限。
    - `models.providers.*.maxTokens`：当模型条目未设置 `maxTokens` 时，此提供商下模型的默认输出令牌上限。
    - `models.providers.*.timeoutSeconds`：可选的针对特定提供商模型的 HTTP 请求超时时间（秒），包括连接、标头、正文以及总请求中止处理。
    - `models.providers.*.injectNumCtxForOpenAICompat`：对于 Ollama + `openai-completions`，将 `options.num_ctx` 注入请求中（默认值：`true`）。
    - `models.providers.*.authHeader`：在需要时，强制在 `Authorization` 标头中传输凭据。
    - `models.providers.*.baseUrl`：上游 API 基础 URL。
    - `models.providers.*.headers`：用于代理/租户路由的额外静态标头。

  </Accordion>
  <Accordion title="Request transport overrides">
    `models.providers.*.request`: 模型提供商 HTTP 请求的传输覆盖设置。

    - `request.headers`: 额外的请求头（与提供商默认值合并）。值接受 SecretRef。
    - `request.auth`: 认证策略覆盖。模式：`"provider-default"`（使用提供商内置认证）、`"authorization-bearer"`（带 `token`）、`"header"`（带 `headerName`、`value`、可选的 `prefix`）。
    - `request.proxy`: HTTP 代理覆盖。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 环境变量）、`"explicit-proxy"`（带 `url`）。两种模式都接受可选的 `tls` 子对象。
    - `request.tls`: 直接连接的 TLS 覆盖。字段：`ca`、`cert`、`key`、`passphrase`（均接受 SecretRef）、`serverName`、`insecureSkipVerify`。
    - `request.allowPrivateNetwork`: 当为 `true` 时，允许通过提供商 HTTP 获取守卫向私有、CGNAT 或类似范围发起模型提供商 HTTP 请求。自定义/本地提供商基础 URL 已信任确切配置的源，但元数据/链路本地源除外，后者在没有显式选择加入的情况下仍然受阻。将其设置为 `false` 可选择退出确信源信任。WebSocket 对请求头/TLS 使用相同的 `request`，但不使用该获取 SSRF 守门。默认 `false`。

  </Accordion>
  <Accordion title="模型目录条目">
    - `models.providers.*.models`：显式提供商模型目录条目。
    - `models.providers.*.models.*.input`：模型输入模态。对仅文本模型使用 `["text"]`，对原生图像/视觉模型使用 `["text", "image"]`。仅当选定的模型被标记为支持图像时，图像附件才会被注入到代理轮次中。
    - `models.providers.*.models.*.contextWindow`：原生模型上下文窗口元数据。这会覆盖该模型的提供商级 `contextWindow`。
    - `models.providers.*.models.*.contextTokens`：可选的运行时上下文上限。这会覆盖提供商级 `contextTokens`；当您希望有效的上下文预算小于模型的原生 `contextWindow` 时使用它；当这两个值不同时，`openclaw models list` 会同时显示这两个值。
    - `models.providers.*.models.*.compat.supportsDeveloperRole`：可选的兼容性提示。对于具有非空非原生 `baseUrl`（主机不是 `api.openai.com`）的 `api: "openai-completions"`，OpenClaw 会在运行时强制将其设置为 `false`。空/省略的 `baseUrl` 会保留默认 OpenAI 行为。
    - `models.providers.*.models.*.compat.requiresStringContent`：针对仅字符串 OpenAI 兼容聊天端点的可选兼容性提示。当 `true` 时，OpenClaw 会在发送请求之前将纯文本 `messages[].content` 数组展平为纯字符串。
    - `models.providers.*.models.*.compat.strictMessageKeys`：针对严格 OpenAI 兼容聊天端点的可选兼容性提示。当 `true` 时，OpenClaw 会在发送请求之前将传出的聊天补全消息对象剥离为 `role` 和 `content`。
    - `models.providers.*.models.*.compat.thinkingFormat`：可选的思维负载提示。对 Together 风格的 `reasoning.enabled` 使用 `"together"`，对顶级 `enable_thinking` 使用 `"qwen"`，或者对支持请求级 chat-template kwargs 的 Qwen 系列 OpenAI 兼容服务器（例如 vLLM）上的 `chat_template_kwargs.enable_thinking` 使用 `"qwen-chat-template"`。已配置的 vLLM Qwen 模型会为这些格式暴露二进制 `/think` 选项（`off`、`on`）。

  </Accordion>
  <Accordion title="Amazon Bedrock 发现">
    - `plugins.entries.amazon-bedrock.config.discovery`: Bedrock 自动发现设置的根节点。
    - `plugins.entries.amazon-bedrock.config.discovery.enabled`: 开启或关闭隐式发现。
    - `plugins.entries.amazon-bedrock.config.discovery.region`: 用于发现的 AWS 区域。
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter`: 用于定向发现的可选提供商 ID 过滤器。
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`: 发现刷新的轮询间隔。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`: 已发现模型的备用上下文窗口。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`: 已发现模型的备用最大输出令牌数。

  </Accordion>
</AccordionGroup>

交互式自定义提供商新手引导会为常见的视觉模型 ID 推断图像输入，例如 GPT-4o、Claude、Gemini、Qwen-VL、LLaVA、Pixtral、InternVL、Mllama、MiniCPM-V 和 GLM-4V，并跳过已知纯文本家族的额外问题。未知的模型 ID 仍会提示是否支持图像。非交互式新手引导使用相同的推断；传递 `--custom-image-input` 以强制使用支持图像的元数据，或传递 `--custom-text-input` 以强制使用纯文本元数据。

### 提供商示例

<AccordionGroup>
  <Accordion title="Cerebras (GLM 4.7 / GPT OSS)">
    捆绑的 `cerebras` 提供商插件可以通过 `openclaw onboard --auth-choice cerebras-api-key` 对此进行配置。仅在覆盖默认值时使用显式提供商配置。

    ```json5
    {
      env: { CEREBRAS_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: {
            primary: "cerebras/zai-glm-4.7",
            fallbacks: ["cerebras/gpt-oss-120b"],
          },
          models: {
            "cerebras/zai-glm-4.7": { alias: "GLM 4.7 (Cerebras)" },
            "cerebras/gpt-oss-120b": { alias: "GPT OSS 120B (Cerebras)" },
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          cerebras: {
            baseUrl: "https://api.cerebras.ai/v1",
            apiKey: "${CEREBRAS_API_KEY}",
            api: "openai-completions",
            models: [
              { id: "zai-glm-4.7", name: "GLM 4.7 (Cerebras)" },
              { id: "gpt-oss-120b", name: "GPT OSS 120B (Cerebras)" },
            ],
          },
        },
      },
    }
    ```

    Cerebras 使用 `cerebras/zai-glm-4.7`；Z.AI 直连使用 `zai/glm-4.7`。

  </Accordion>
  <Accordion title="Kimi Coding">
    ```json5
    {
      env: { KIMI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "kimi/kimi-for-coding" },
          models: { "kimi/kimi-for-coding": { alias: "Kimi Code" } },
        },
      },
    }
    ```

    兼容 Anthropic 的内置提供商。快捷方式：`openclaw onboard --auth-choice kimi-code-api-key`。

  </Accordion>
  <Accordion title="Local models (LM Studio)">
    参见 [Local Models](/zh/gateway/local-models)。TL;DR：在强劲的硬件上通过 LM Studio Responses API 运行大型本地模型；保留托管的模型以进行合并作为后备。
  </Accordion>
  <Accordion title="MiniMaxMiniMax M2.7 (direct)">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "Minimax" },
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M2.7",
                name: "MiniMax M2.7",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    设置 `MINIMAX_API_KEY`。快捷方式：`openclaw onboard --auth-choice minimax-global-api` 或 `openclaw onboard --auth-choice minimax-cn-api`AnthropicOpenClawMiniMax。模型目录默认仅为 M2.7。在 Anthropic 兼容的流式传输路径上，除非您显式自行设置 `thinking`，否则 OpenClaw 默认会禁用 MiniMax 思考。`/fast on` 或 `params.fastMode: true` 会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。

  </Accordion>
  <Accordion title="MoonshotMoonshot AI (Kimi)">
    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.6" },
          models: { "moonshot/kimi-k2.6": { alias: "Kimi K2.6" } },
        },
      },
      models: {
        mode: "merge",
        providers: {
          moonshot: {
            baseUrl: "https://api.moonshot.ai/v1",
            apiKey: "${MOONSHOT_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "kimi-k2.6",
                name: "Kimi K2.6",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
            ],
          },
        },
      },
    }
    ```

    对于中国区端点：`baseUrl: "https://api.moonshot.cn/v1"` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`Moonshot。

    原生 Moonshot 端点在共享的 `openai-completions`OpenClaw 传输上通告流式传输使用兼容性，并且 OpenClaw 密钥关闭端点功能，而不仅仅是内置的提供商 ID。

  </Accordion>
  <Accordion title="OpenCode">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "opencode/claude-opus-4-6" },
          models: { "opencode/claude-opus-4-6": { alias: "Opus" } },
        },
      },
    }
    ```

    设置 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。使用 `opencode/...` 引用获取 Zen 目录，或使用 `opencode-go/...` 引用获取 Go 目录。快捷方式：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

  </Accordion>
  <Accordion title="AnthropicSynthetic (Anthropic-compatible)">
    ```json5
    {
      env: { SYNTHETIC_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
          models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" } },
        },
      },
      models: {
        mode: "merge",
        providers: {
          synthetic: {
            baseUrl: "https://api.synthetic.new/anthropic",
            apiKey: "${SYNTHETIC_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "hf:MiniMaxAI/MiniMax-M2.5",
                name: "MiniMax M2.5",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 192000,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```

    Base URL 应省略 `/v1`Anthropic（Anthropic 客户端会附加它）。快捷方式：`openclaw onboard --auth-choice synthetic-api-key`。

  </Accordion>
  <Accordion title="Z.AI (GLM-4.7)">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-4.7" },
          models: { "zai/glm-4.7": {} },
        },
      },
    }
    ```

    设置 `ZAI_API_KEY`。模型引用使用规范的 `zai/*` 提供商 ID。快捷方式：`openclaw onboard --auth-choice zai-api-key`。

    - 通用端点：`https://api.z.ai/api/paas/v4`
    - 编码端点（默认）：`https://api.z.ai/api/coding/paas/v4`
    - 对于通用端点，请通过覆盖基础 URL 来定义自定义提供商。

  </Accordion>
</AccordionGroup>

---

## 相关

- [Configuration — agents](/zh/gateway/config-agents)
- [Configuration — channels](/zh/gateway/config-channels)
- [Configuration reference](/zh/gateway/configuration-reference) — other top-level keys
- [Tools and plugins](/zh/tools)
