---
summary: "Agent defaults, multi-agent routing, 会话, messages, and talk config"
read_when:
  - Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills)
  - Configuring multi-agent routing and bindings
  - Adjusting session, message delivery, and talk-mode behavior
title: "Configuration — agents"
---

位于 `agents.*`、`multiAgent.*`、`session.*`、
`messages.*` 和 `talk.*` 下的 Agent 作用域配置键。有关 channels、tools、gateway runtime 和其他
顶级键，请参阅 [Configuration reference](/zh/gateway/configuration-reference)。

## Agent defaults

### `agents.defaults.workspace`

默认值：如果设置了 `OPENCLAW_WORKSPACE_DIR` 则为该值，否则为 `~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

显式的 `agents.defaults.workspace` 值优先于
`OPENCLAW_WORKSPACE_DIR`。当您不想将该路径写入配置时，请使用环境变量将默认 Agent
指向挂载的工作区。

### `agents.defaults.repoRoot`

显示在系统提示 Runtime 行中的可选仓库根目录。如果未设置，OpenClaw 将通过从工作区向上遍历来自动检测。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

针对未设置
`agents.list[].skills` 的 Agent 的可选默认技能允许列表。

```json5
{
  agents: {
    defaults: { skills: ["github", "weather"] },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

- 省略 `agents.defaults.skills` 以默认允许无限制的技能。
- 省略 `agents.list[].skills` 以继承默认值。
- 设置 `agents.list[].skills: []` 表示无技能。
- 非空的 `agents.list[].skills` 列表是该 Agent 的最终集合；它
  不会与默认值合并。

### `agents.defaults.skipBootstrap`

禁用工作区引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）的自动创建。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.skipOptionalBootstrapFiles`

跳过创建选定的可选工作区文件，同时仍写入必需的引导文件。有效值：`SOUL.md`、`USER.md`、`HEARTBEAT.md` 和 `IDENTITY.md`。

```json5
{
  agents: {
    defaults: {
      skipOptionalBootstrapFiles: ["SOUL.md", "USER.md"],
    },
  },
}
```

### `agents.defaults.contextInjection`

控制何时将工作区引导文件注入到系统提示中。默认值：`"always"`。

- `"continuation-skip"`：安全继续轮次（在完成助手响应后）跳过工作区引导重新注入，从而减少提示词大小。心跳运行和压缩后重试仍会重建上下文。
- `"never"`：在每一轮都禁用工作区引导和上下文文件注入。仅当代理完全拥有其提示词生命周期（自定义上下文引擎、构建自己上下文的本地运行时或专门的免引导工作流）时才使用此项。心跳和压缩恢复轮次也会跳过注入。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

Per-agent override: `agents.list[].contextInjection`. Omitted values inherit
`agents.defaults.contextInjection`.

### `agents.defaults.bootstrapMaxChars`

每个工作区引导文件截断前的最大字符数。默认值：`12000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

Per-agent override: `agents.list[].bootstrapMaxChars`. Omitted values inherit
`agents.defaults.bootstrapMaxChars`.

### `agents.defaults.bootstrapTotalMaxChars`

所有工作区引导文件中注入的最大总字符数。默认值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

Per-agent override: `agents.list[].bootstrapTotalMaxChars`. Omitted values
inherit `agents.defaults.bootstrapTotalMaxChars`.

### 每个代理的引导配置文件覆盖

当一个代理需要与共享默认值不同的提示词注入行为时，请使用 Per-agent bootstrap profile overrides。省略的字段继承自
`agents.defaults`。

```json5
{
  agents: {
    defaults: {
      contextInjection: "continuation-skip",
      bootstrapMaxChars: 12000,
      bootstrapTotalMaxChars: 60000,
    },
    list: [
      {
        id: "strict-worker",
        contextInjection: "always",
        bootstrapMaxChars: 50000,
        bootstrapTotalMaxChars: 300000,
      },
    ],
  },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

当引导上下文被截断时，控制代理可见的系统提示词通知。默认值：`"always"`。

- `"off"`：绝不将截断通知文本注入到系统提示词中。
- `"once"`：针对每个唯一的截断签名注入一次简洁通知。
- `"always"`：当存在截断时，在每次运行中注入一次简洁通知（推荐）。

详细的原始/注入计数和配置调整字段保留在诊断信息（如上下文/状态报告和日志）中；常规的 WebChat 用户/运行时上下文仅会收到简明的恢复通知。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "always" } }, // off | once | always
}
```

### 上下文预算所有权映射

OpenClaw 拥有多个高吞吐量的提示词/上下文预算，并且它们是按子系统有意拆分的，而不是全部通过一个通用旋钮。

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars`:
  normal workspace bootstrap injection.
- `agents.defaults.startupContext.*`:
  one-shot reset/startup 模型-run prelude, including recent daily
  `memory/*.md` files. Bare chat `/new` and `/reset` commands are
  acknowledged without invoking the 模型.
- `skills.limits.*`:
  注入到系统提示词中的紧凑技能列表。
- `agents.defaults.contextLimits.*`:
  受限的运行时摘录和注入的运行时拥有块。
- `memory.qmd.limits.*`:
  索引的记忆搜索片段和注入大小调整。

仅当一个代理需要不同的预算时，才使用匹配的特定于代理的覆盖：

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextInjection`
- `agents.list[].bootstrapMaxChars`
- `agents.list[].bootstrapTotalMaxChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

控制在重置/启动模型运行时注入的首轮启动前导内容。
纯聊天 `/new` 和 `/reset` 命令确认重置而不调用
模型，因此它们不会加载此前导内容。

```json5
{
  agents: {
    defaults: {
      startupContext: {
        enabled: true,
        applyOn: ["new", "reset"],
        dailyMemoryDays: 2,
        maxFileBytes: 16384,
        maxFileChars: 1200,
        maxTotalChars: 2800,
      },
    },
  },
}
```

#### `agents.defaults.contextLimits`

有界运行时上下文表面的共享默认值。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        memoryGetDefaultLines: 120,
        toolResultMaxChars: 16000,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars`: 添加截断元数据和继续通知之前的默认 `memory_get` 摘录上限。
- `memoryGetDefaultLines`: 当省略 `lines` 时的默认 `memory_get` 行窗口。
- `toolResultMaxChars`: 用于持久化结果和
  溢出恢复的实时工具结果上限。
- `postCompactionMaxChars`: 在压缩后刷新注入期间使用的 AGENTS.md 摘录上限。

#### `agents.list[].contextLimits`

共享 `contextLimits` 旋钮的每代理覆盖。省略的字段继承自 `agents.defaults.contextLimits`。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        toolResultMaxChars: 16000,
      },
    },
    list: [
      {
        id: "tiny-local",
        contextLimits: {
          memoryGetMaxChars: 6000,
          toolResultMaxChars: 8000,
        },
      },
    ],
  },
}
```

#### `skills.limits.maxSkillsPromptChars`

注入到系统提示词中的紧凑技能列表的全局上限。这
不影响按需读取 `SKILL.md` 文件。

```json5
{
  skills: {
    limits: {
      maxSkillsPromptChars: 18000,
    },
  },
}
```

#### `agents.list[].skillsLimits.maxSkillsPromptChars`

针对每个代理的技能提示预算覆盖设置。

```json5
{
  agents: {
    list: [
      {
        id: "tiny-local",
        skillsLimits: {
          maxSkillsPromptChars: 6000,
        },
      },
    ],
  },
}
```

### `agents.defaults.imageMaxDimensionPx`

在调用提供商之前，脚本/工具图像块中最长图像边的最大像素大小。
默认值：`1200`。

较低的值通常会减少视觉令牌的使用量以及大量截图运行时的请求负载大小。较高的值可以保留更多视觉细节。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.imageQuality`

从文件路径、URL 和媒体引用加载的图像的图像工具压缩/细节首选项。
默认值：`auto`。

OpenClaw 会根据所选图像模型调整缩放梯级。例如，Claude Opus 4.7、OpenAI GPT-5.5、Qwen VL 和托管的 Llama 4 视觉模型可以比旧版/默认的高细节视觉路径使用更大的图像，而在 OpenClawOpenAIQwen`auto` 模式下，多图像轮次的压缩会更激进，以控制 token 和延迟成本。

值：

- `auto`：适应模型限制和图像数量。
- `efficient`：优先使用较小的图像以降低 token 和字节使用量。
- `balanced`：使用标准的中庸梯级。
- `high`：为屏幕截图、图表和文档图像保留更多细节。

```json5
{
  agents: { defaults: { imageQuality: "auto" } },
}
```

### `agents.defaults.userTimezone`

系统提示上下文的时区（非消息时间戳）。回退到主机时区。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系统提示中的时间格式。默认值：`auto`（操作系统偏好）。

```json5
{
  agents: { defaults: { timeFormat: "auto" } }, // auto | 12 | 24
}
```

### `agents.defaults.model`

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        fallbacks: ["google/gemini-3.1-flash-image-preview"],
      },
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-i2v"],
      },
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      params: { cacheRetention: "long" }, // global default provider params
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      verboseDefault: "off",
      toolProgressDetail: "explain",
      reasoningDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      contextTokens: 200000,
      maxConcurrent: 3,
    },
  },
}
```

- `model`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 字符串形式仅设置主要模型。
  - 对象形式设置主要模型及有序的故障转移模型。
- `imageModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `image` 工具路径用作其视觉模型配置。
  - 当所选/默认模型无法接受图像输入时，也用作回退路由。
  - 优先使用显式的 `provider/model` 引用。为兼容起见接受裸 ID；如果裸 ID 唯一匹配 `models.providers.*.models`OpenClaw 中配置的具备图像能力的条目，OpenClaw 会将其限定为该提供商。有歧义的配置匹配需要显式提供商前缀。
- `imageGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的图像生成功能以及任何未来生成图像的工具/插件界面使用。
  - 典型值：原生 Gemini 图像生成使用 `google/gemini-3.1-flash-image-preview`，fal 使用 `fal/fal-ai/flux/dev`，OpenAI 图像使用 `openai/gpt-image-2`OpenAI，或透明背景 OpenAI PNG/WebP 输出使用 `openai/gpt-image-1.5`OpenAI。
  - 如果您直接选择提供商/模型，请也配置匹配的提供商身份验证（例如，对于 `google/*` 使用 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，对于 `openai/gpt-image-2` / `openai/gpt-image-1.5` 使用 `OPENAI_API_KEY`OpenAIOAuth 或 OpenAI Codex OAuth，对于 `fal/*` 使用 `FAL_KEY`）。
  - 如果省略，`image_generate` 仍然可以推断支持身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试剩余的注册图像生成提供商。
- `musicGenerationModel`：接受字符串 (`"provider/model"`) 或对象 (`{ primary, fallbacks }`)。
  - 由共享音乐生成功能和内置的 `music_generate` 工具使用。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.6`。
  - 如果省略，`music_generate` 仍然可以推断支持身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试剩余的注册音乐生成提供商。
  - 如果您直接选择提供商/模型，请也配置匹配的提供商身份验证/API 密钥。
- `videoGenerationModel`：接受字符串 (`"provider/model"`) 或对象 (`{ primary, fallbacks }`)。
  - 由共享视频生成功能和内置的 `video_generate` 工具使用。
  - 典型值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍然可以推断出支持身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试剩余的已注册视频生成提供商。
  - 如果您直接选择提供商/模型，请同时配置匹配的提供商身份验证/API 密钥。
  - 内置的 Qwen 视频生成提供商最多支持 1 个输出视频、1 个输入图像、4 个输入视频、10 秒时长，以及提供商级别的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 选项。
- `pdfModel`：接受字符串 (`"provider/model"`) 或对象 (`{ primary, fallbacks }`)。
  - 由 `pdf` 工具用于模型路由。
  - 如果省略，PDF 工具将回退到 `imageModel`，然后再回退到解析出的会话/默认模型。
- `pdfMaxBytesMb`：当调用时未传递 `maxBytesMb` 时，`pdf` 工具的默认 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中提取回退模式考虑的默认最大页数。
- `verboseDefault`：代理的默认详细级别。值：`"off"`、`"on"`、`"full"`。默认值：`"off"`。
- `toolProgressDetail`：`/verbose` 工具摘要和进度草稿工具行的详细模式。值：`"explain"`（默认，紧凑的人类可读标签）或 `"raw"`（在可用时附加原始命令/详细信息）。每个代理的 `agents.list[].toolProgressDetail` 会覆盖此默认值。
- `reasoningDefault`：代理的默认推理可见性。取值：`"off"`、`"on"`、`"stream"`。每个代理的 `agents.list[].reasoningDefault` 会覆盖此默认值。配置的推理默认值仅在未设置逐条消息或会话推理覆盖的情况下，应用于所有者、授权发送方或操作员管理员网关上下文。
- `elevatedDefault`：代理的默认提升输出级别。取值：`"off"`、`"on"`、`"ask"`、`"full"`。默认值：`"on"`。
- `model.primary`：格式 `provider/model`（例如，对于 OpenAI API 或 Codex OAuth 访问，使用 `openai/gpt-5.5`）。如果您省略提供商，OpenClaw 会首先尝试别名，然后尝试该确切模型 ID 的唯一配置提供商匹配，最后才回退到配置的默认提供商（已弃用的兼容性行为，因此首选显式的 `provider/model`）。如果该提供商不再暴露配置的默认模型，OpenClaw 将回退到第一个配置的提供商/模型，而不是显示陈旧的已删除提供商默认值。
- `models`：为 `/model` 配置的模型目录和允许列表。每个条目可以包含 `alias`（快捷方式）和 `params`（特定于提供商，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`、`responsesServerCompaction`、`responsesCompactThreshold`、OpenRouter `provider` 路由、`chat_template_kwargs`、`extra_body`/`extraBody`）。
  - 使用 `provider/*` 条目（如 `"openai-codex/*": {}` 或 `"vllm/*": {}`）来显示所选提供商的所有已发现的模型，而无需手动列出每个模型 ID。
  - 当该提供商的每个动态发现的模型都应使用相同的运行时时，将 `agentRuntime` 添加到 `provider/*` 条目中。精确的 `provider/model` 运行时策略仍然优先于通配符。
  - 安全编辑：使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 添加条目。除非您传递 `--replace`，否则 `config set` 将拒绝会删除现有允许列表条目的替换操作。
  - 提供商范围的 configure/新手引导 流程会将所选提供商模型合并到此映射中，并保留已配置的不相关的提供商。
  - 对于直接 OpenAI Responses 模型，服务器端压缩会自动启用。使用 `params.responsesServerCompaction: false` 停止注入 `context_management`，或使用 `params.responsesCompactThreshold` 覆盖阈值。请参阅 [OpenAI 服务器端压缩](/zh/providers/openai#server-side-compaction-responses-api)。
- `params`：应用于所有模型的全局默认提供商参数。在 `agents.defaults.params` 处设置（例如 `{ cacheRetention: "long" }`）。
- `params` 合并优先级（配置）：`agents.defaults.params`（全局基础）被 `agents.defaults.models["provider/model"].params`（每个模型）覆盖，然后 `agents.list[].params`（匹配的代理 ID）按键覆盖。有关详细信息，请参阅 [提示词缓存](/zh/reference/prompt-caching)。
- `models.providers.openrouter.params.provider`：OpenRouter 范围的默认提供商路由策略。OpenClaw 将此转发给 OpenRouter 的请求 `provider` 对象；每个模型的 `agents.defaults.models["openrouter/<model>"].params.provider` 和代理参数按键覆盖。请参阅 [OpenRouter 提供商路由](/zh/providers/openrouter#advanced-configuration)。
- `params.extra_body`/`params.extraBody`：合并到 `api: "openai-completions"` 请求体中的高级透传 JSON，用于 OpenAI 兼容代理。如果它与生成的请求键冲突，则额外的请求体优先；非原生补全路由仍会在之后剥离仅 OpenAI 的 `store`。
- `params.chat_template_kwargs`：合并到顶层 `api: "openai-completions"` 请求体中的 vLLM/OpenAI 兼容聊天模板参数。对于关闭了思考功能的 `vllm/nemotron-3-*`，捆绑的 vLLM 插件会自动发送 `enable_thinking: false` 和 `force_nonempty_content: true`；显式的 `chat_template_kwargs` 会覆盖生成的默认值，而 `extra_body.chat_template_kwargs` 仍具有最高优先级。对于 vLLM Qwen 思考控制，请在该模型条目上将 `params.qwenThinkingFormat` 设置为 `"chat-template"` 或 `"top-level"`。
- `compat.thinkingFormat`：OpenAI 兼容的思考负载风格。使用 `"together"` 表示 Together 风格的 `reasoning.enabled`，使用 `"qwen"` 表示 Qwen 风格的顶层 `enable_thinking`，或者对于支持请求级聊天模板 kwargs（例如 vLLM）的 Qwen 系列后端，使用 `"qwen-chat-template"` 表示 `chat_template_kwargs.enable_thinking`。OpenClaw 将禁用的思考映射为 `false`，将启用的思考映射为 `true`。
- `compat.supportedReasoningEfforts`：每个模型的兼容 OpenAI 推理强度列表。为真正接受它的自定义端点包含 `"xhigh"`；然后 OpenClaw 在命令菜单、Gateway(网关) 会话行、会话修补验证、agent CLI 验证以及该配置的提供商/模型的 `llm-task` 验证中暴露 `/think xhigh`。当后端想要规范级别的提供商特定值时，使用 `compat.reasoningEffortMap`。
- `params.preserveThinking`：Z.AI 独有的保留思考的启用选项。当启用且思考开启时，OpenClaw 发送 `thinking.clear_thinking: false` 并重播先前的 `reasoning_content`；参见 [Z.AI thinking and preserved thinking](/zh/providers/zai#thinking-and-preserved-thinking)。
- `localService`：用于本地/自托管模型服务器的可选提供商级别进程管理器。当所选模型属于该提供商时，OpenClaw 探测 `healthUrl`（或 `baseUrl + "/models"`），如果端点关闭则使用 `args` 启动 `command`，等待最多 `readyTimeoutMs`，然后发送模型请求。`command` 必须是绝对路径。`idleStopMs: 0` 保持进程存活，直到 OpenClaw 退出；正值则在空闲这么多毫秒后停止由 OpenClaw 产生的进程。参见 [Local 模型 services](/zh/gateway/local-model-services)。
- 运行时策略属于提供商或模型，不属于 `agents.defaults`。对提供商范围的规则使用 `models.providers.<provider>.agentRuntime`，对模型特定的规则使用 `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime`。官方 OpenAI 提供商上的 OpenAI agent 模型默认选择 Codex。
- 修改这些字段的配置写入器（例如 `/models set`、`/models set-image` 以及 fallback add/remove 命令）会保存规范的对象形式，并尽可能保留现有的 fallback 列表。
- `maxConcurrent`：跨会话的最大并行代理运行数（每个会话仍然串行处理）。默认值：4。

### 运行时策略

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: { id: "codex" },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      models: {
        "anthropic/claude-opus-4-7": {
          agentRuntime: { id: "claude-cli" },
        },
        "vllm/*": {
          agentRuntime: { id: "pi" },
        },
      },
    },
  },
}
```

- `id`：`"auto"`、`"pi"`CLI、已注册的插件 harness ID 或受支持的 CLI 后端别名。内置的 Codex 插件注册了 `codex`Anthropic；内置的 Anthropic 插件提供了 `claude-cli`CLI CLI 后端。
- `id: "auto"` 允许已注册的插件 harness 声明支持的轮次，当没有 harness 匹配时使用 PI。明确的插件运行时（如 `id: "codex"`）需要该 harness，如果它不可用或失败则会失败关闭。
- 运行时优先级首先是精确模型策略（`agents.list[].models["provider/model"]`、`agents.defaults.models["provider/model"]` 或 `models.providers.<provider>.models[]`），然后是 `agents.list[]` / `agents.defaults.models["provider/*"]`，最后是 `models.providers.<provider>.agentRuntime` 处的提供商级策略。
- 全代理运行时键已过时。`agents.defaults.agentRuntime`、`agents.list[].agentRuntime`、会话运行时固定和 `OPENCLAW_AGENT_RUNTIME` 会被运行时选择忽略。运行 `openclaw doctor --fix` 以移除陈旧值。
- OpenAI 代理模型默认使用 Codex harness；当您想要明确指定时，提供商/模型 OpenAI`agentRuntime.id: "codex"` 仍然有效。
- 对于 Claude CLI 部署，首选 CLI`model: "anthropic/claude-opus-4-7"` 加上模型范围的 `agentRuntime.id: "claude-cli"`。传统的 `claude-cli/claude-opus-4-7` 模型引用为了兼容性仍然有效，但新配置应保持 提供商/模型 选择的规范性，并将执行后端放在 提供商/模型 运行时策略中。
- 这仅控制文本代理轮次执行。媒体生成、视觉、PDF、音乐、视频和 TTS 仍使用其提供商/模型设置。

**内置别名简写**（仅在模型处于 `agents.defaults.models` 时适用）：

| 别名                | 模型                                   |
| ------------------- | -------------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`            |
| `sonnet`            | `anthropic/claude-sonnet-4-6`          |
| `gpt`               | `openai/gpt-5.5`                       |
| `gpt-mini`          | `openai/gpt-5.4-mini`                  |
| `gpt-nano`          | `openai/gpt-5.4-nano`                  |
| `gemini`            | `google/gemini-3.1-pro-preview`        |
| `gemini-flash`      | `google/gemini-3-flash-preview`        |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview` |

您配置的别名始终优先于默认设置。

除非您设置 GLM`--thinking off` 或自行定义 `agents.defaults.models["zai/<model>"].params.thinking`，否则 Z.AI GLM-4.x 模型会自动启用思考模式。
Z.AI 模型默认为工具调用流式传输启用 `tool_stream`。将 `agents.defaults.models["zai/<model>"].params.tool_stream` 设置为 `false`Anthropic 可将其禁用。
当未设置明确的思考级别时，Anthropic Claude 4.6 模型默认为 `adaptive` 思考。

### `agents.defaults.cliBackends`

用于仅文本后备运行（无工具调用）的可选 CLI 后端。当 API 提供商失败时，作为备份非常有用。

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          systemPromptArg: "--system",
          // Or use systemPromptFileArg when the CLI accepts a prompt file flag.
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
        },
      },
    },
  },
}
```

- CLI 后端以文本为主；工具始终处于禁用状态。
- 当设置了 `sessionArg` 时，支持会话。
- 当 `imageArg` 接受文件路径时，支持图像透传。
- `reseedFromRawTranscriptWhenUncompacted: true`OpenClaw 允许后端在存在首个压缩摘要之前，从有界的原始 OpenClaw 记录尾部恢复安全的失效会话。身份验证配置文件或凭证纪元变更仍然永远不会进行原始重新播种。

### `agents.defaults.systemPromptOverride`

用固定字符串替换整个由 OpenClaw 组装的系统提示词。在默认级别 (OpenClaw`agents.defaults.systemPromptOverride`) 或每个代理 (`agents.list[].systemPromptOverride`) 设置。每个代理的值优先；空值或仅包含空白字符的值将被忽略。适用于受控提示词实验。

```json5
{
  agents: {
    defaults: {
      systemPromptOverride: "You are a helpful assistant.",
    },
  },
}
```

### `agents.defaults.promptOverlays`

由模型系列应用于 OpenClaw 组装提示词表面的独立于提供商的提示词覆盖。GPT-5 系列模型 ID 在 PI/提供商路由之间接收共享的行为合约；OpenClaw`personality`OpenClaw 仅控制友好的交互样式层。原生 Codex 应用服务器路由保留 Codex 拥有的基础/模型/个性化指令，而不是此 OpenClaw GPT-5 覆盖层。

```json5
{
  agents: {
    defaults: {
      promptOverlays: {
        gpt5: {
          personality: "friendly", // friendly | on | off
        },
      },
    },
  },
}
```

- `"friendly"`（默认）和 `"on"` 启用友好的交互样式层。
- `"off"` 仅禁用友好层；标记的 GPT-5 行为合约保持启用状态。
- 当未设置此共享设置时，仍会读取旧版 `plugins.entries.openai.config.personality`。

### `agents.defaults.heartbeat`

定期心跳运行。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 0m disables
        model: "openai/gpt-5.4-mini",
        includeReasoning: false,
        includeSystemPromptSection: true, // default: true; false omits the Heartbeat section from the system prompt
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        skipWhenBusy: false, // default: false; true also waits for this agent's subagent/nested lanes
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow (default) | block
        target: "none", // default: none | options: last | whatsapp | telegram | discord | ...
        prompt: "Read HEARTBEAT.md if it exists...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
        timeoutSeconds: 45,
      },
    },
  },
}
```

- `every`：持续时间字符串 (ms/s/m/h)。默认值：`30m`API (API 密钥身份验证) 或 `1h`OAuth (OAuth 身份验证)。设置为 `0m` 以禁用。
- `includeSystemPromptSection`：当为 false 时，从系统提示词中省略 Heartbeat 部分，并跳过将 `HEARTBEAT.md` 注入到引导上下文中。默认值：`true`。
- `suppressToolErrorWarnings`：当为 true 时，在心跳运行期间抑制工具错误警告载荷。
- `timeoutSeconds`：中止心跳代理轮次之前允许的最大秒数。保持不设置以使用 `agents.defaults.timeoutSeconds`。
- `directPolicy`：直接/私信 投递策略。`allow`（默认）允许直接目标投递。`block` 抑制直接目标投递并发出 `reason=dm-blocked`。
- `lightContext`：如果为 true，心跳运行使用轻量级引导上下文，并且仅保留工作区引导文件中的 `HEARTBEAT.md`。
- `isolatedSession`：如果为 true，每次心跳都在没有先前对话历史记录的新会话中运行。与 cron `sessionTarget: "isolated"` 具有相同的隔离模式。将每次心跳的 token 成本从约 100K 降低到约 2-5K token。
- `skipWhenBusy`：如果为 true，心跳运行会在该代理的额外繁忙通道上延迟：其自身的会话键控子代理或嵌套命令工作。Cron 通道总是延迟心跳，即使没有此标志。
- 每个代理：设置 `agents.list[].heartbeat`。当任何代理定义了 `heartbeat` 时，**只有那些代理**运行心跳。
- 心跳运行完整的代理回合——间隔越短消耗的 token 越多。

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
        provider: "my-provider", // id of a registered compaction provider plugin (optional)
        timeoutSeconds: 900,
        reserveTokensFloor: 24000,
        keepRecentTokens: 50000,
        identifierPolicy: "strict", // strict | off | custom
        identifierInstructions: "Preserve deployment IDs, ticket IDs, and host:port pairs exactly.", // used when identifierPolicy=custom
        qualityGuard: { enabled: true, maxRetries: 1 },
        midTurnPrecheck: { enabled: false }, // optional Pi tool-loop pressure check
        postCompactionSections: ["Session Startup", "Red Lines"], // [] disables reinjection
        model: "openrouter/anthropic/claude-sonnet-4-6", // optional compaction-only model override
        truncateAfterCompaction: true, // rotate to a smaller successor JSONL after compaction
        maxActiveTranscriptBytes: "20mb", // optional preflight local compaction trigger
        notifyUser: true, // send brief notices when compaction starts and completes (default: false)
        memoryFlush: {
          enabled: true,
          model: "ollama/qwen3:8b", // optional memory-flush-only model override
          softThresholdTokens: 6000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with the exact silent token NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

- `mode`：`default` 或 `safeguard`（针对长历史的分块摘要）。请参阅 [压缩](/zh/concepts/compaction)。
- `provider`：已注册压缩提供商插件 的 id。设置后，将调用提供商的 `summarize()`LLM 而不是内置的 LLM 摘要。失败时回退到内置方式。设置提供商会强制启用 `mode: "safeguard"`。请参阅 [压缩](/zh/concepts/compaction)。
- `timeoutSeconds`OpenClaw：OpenClaw 中止单次压缩操作前允许的最大秒数。默认值：`900`。
- `keepRecentTokens`：用于逐字保留最新记录尾部的 Pi 切割点预算。手动 `/compact` 在显式设置时会遵守此设置；否则手动压缩是一个硬检查点。
- `identifierPolicy`：`strict`（默认）、`off` 或 `custom`。`strict` 在压缩摘要期间会在前面添加内置的不透明标识符保留指南。
- `identifierInstructions`：在 `identifierPolicy=custom` 时使用的可选自定义标识符保留文本。
- `qualityGuard`：针对格式错误输出重试机制会检查防护摘要。在防护模式下默认启用；设置 `enabled: false` 可跳过审核。
- `midTurnPrecheck`：可选的 Pi 工具循环压力检查。当 `enabled: true`OpenClaw 时，OpenClaw 会在追加工具结果之后、下一次模型调用之前检查上下文压力。如果上下文不再适用，它会在提交提示词之前中止当前尝试，并重用现有的预检查恢复路径来截断工具结果或压缩并重试。适用于 `default` 和 `safeguard` 压缩模式。默认：禁用。
- `postCompactionSections`：可选的 AGENTS.md H2/H3 章节名称，用于在压缩后重新注入。默认为 `["Session Startup", "Red Lines"]`；设置 `[]` 可禁用重新注入。当未设置或显式设置为该默认对时，较旧的 `Every Session`/`Safety` 标题也将作为传统回退方案被接受。
- `model`：用于压缩摘要的可选 `provider/model-id` 覆盖。当主会话应保留一个模型但压缩摘要应在另一个模型上运行时，请使用此选项；未设置时，压缩使用会话的主要模型。
- `maxActiveTranscriptBytes`：可选的字节阈值（`number` 或类似 `"20mb"` 的字符串），当活动 JSONL 增长超过该阈值时，在运行前触发常规本地压缩。需要 `truncateAfterCompaction`，以便成功的压缩可以轮换到更小的后续记录。未设置或为 `0` 时禁用。
- `notifyUser`：当 `true` 时，在压缩开始和完成时向用户发送简短通知（例如，“正在压缩上下文...”和“压缩完成”）。默认禁用以保持压缩静默。
- `memoryFlush`：在自动压缩以存储持久化记忆之前的静默代理轮次。当此维护轮次应保留在本地模型上时，将 `model` 设置为确切的提供商/模型，例如 `ollama/qwen3:8b`；此覆盖不会继承活动会话的回退链。当工作区为只读时跳过。

### `agents.defaults.runRetries`

嵌入式 Pi 运行器的外部运行循环重试迭代边界，用于在故障恢复期间防止无限执行循环。请注意，此设置目前仅适用于嵌入式代理运行时，而不适用于 ACP 或 CLI 运行时。

```json5
{
  agents: {
    defaults: {
      runRetries: {
        base: 24,
        perProfile: 8,
        min: 32,
        max: 160,
      },
    },
    list: [
      {
        id: "main",
        runRetries: { max: 50 }, // optional per-agent overrides
      },
    ],
  },
}
```

- `base`：外部运行循环的运行重试迭代基数。默认值：`24`。
- `perProfile`：根据每个回退配置文件候选授予的额外运行重试迭代次数。默认值：`8`。
- `min`：运行重试迭代的最小绝对限制。默认值：`32`。
- `max`：运行重试迭代的最大绝对限制，以防止失控执行。默认值：`160`。

### `agents.defaults.contextPruning`

在发送到 LLM 之前，从内存上下文中修剪 **旧的工具结果**。**不会** 修改磁盘上的会话历史记录。

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // off | cache-ttl
        ttl: "1h", // duration (ms/s/m/h), default unit: minutes
        keepLastAssistants: 3,
        softTrimRatio: 0.3,
        hardClearRatio: 0.5,
        minPrunableToolChars: 50000,
        softTrim: { maxChars: 4000, headChars: 1500, tailChars: 1500 },
        hardClear: { enabled: true, placeholder: "[Old tool result content cleared]" },
        tools: { deny: ["browser", "canvas"] },
      },
    },
  },
}
```

<Accordion title="cache-ttl 模式行为">

- `mode: "cache-ttl"` 启用修剪过程。
- `ttl` 控制修剪可以再次运行的频率（在上一次缓存接触之后）。
- 修剪首先软修剪过大的工具结果，然后在需要时硬清除旧的工具结果。
- `softTrimRatio` 和 `hardClearRatio` 接受从 `0.0` 到 `1.0` 的值；配置验证会拒绝超出该范围的值。

**软修剪 (Soft-trim)** 保留开头 + 结尾，并在中间插入 `...`。

**硬清除 (Hard-clear)** 用占位符替换整个工具结果。

注意：

- 图像块永远不会被修剪/清除。
- 比率是基于字符的（近似值），而不是精确的 token 计数。
- 如果存在的助手消息少于 `keepLastAssistants` 条，则跳过修剪。

</Accordion>

有关行为详情，请参阅 [会话修剪 (Session Pruning)](/zh/concepts/session-pruning)。

### 分块流式传输

```json5
{
  agents: {
    defaults: {
      blockStreamingDefault: "off", // on | off
      blockStreamingBreak: "text_end", // text_end | message_end
      blockStreamingChunk: { minChars: 800, maxChars: 1200 },
      blockStreamingCoalesce: { idleMs: 1000 },
      humanDelay: { mode: "natural" }, // off | natural | custom (use minMs/maxMs)
    },
  },
}
```

- 非 Telegram 渠道需要明确的 `*.blockStreaming: true` 才能启用块回复。
- 渠道覆盖：`channels.<channel>.blockStreamingCoalesce`（以及每个账户的变体）。Signal/Slack/Discord/Google Chat 默认为 `minChars: 1500`。
- `humanDelay`：块回复之间的随机暂停。`natural` = 800–2500ms。每个代理的覆盖：`agents.list[].humanDelay`。

有关行为和分块详情，请参阅 [流式传输 (Streaming)](/zh/concepts/streaming)。

### 正在输入指示器

```json5
{
  agents: {
    defaults: {
      typingMode: "instant", // never | instant | thinking | message
      typingIntervalSeconds: 6,
    },
  },
}
```

- 默认值：`instant` 用于直接聊天/提及，`message` 用于未提及的群组聊天。
- 每个会话的覆盖：`session.typingMode`，`session.typingIntervalSeconds`。

请参阅 [正在输入指示器 (Typing Indicators)](/zh/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

嵌入式代理的可选沙箱隔离。有关完整指南，请参阅 [沙箱隔离 (沙箱隔离)](/zh/gateway/sandboxing)。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        backend: "docker", // docker | ssh | openshell
        scope: "agent", // session | agent | shared
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          containerPrefix: "openclaw-sbx-",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
          binds: ["/home/user/source:/source:rw"],
        },
        ssh: {
          target: "user@gateway-host:22",
          command: "ssh",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // SecretRefs / inline contents also supported:
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
        browser: {
          enabled: false,
          image: "openclaw-sandbox-browser:bookworm-slim",
          network: "openclaw-sandbox-browser",
          cdpPort: 9222,
          cdpSourceRange: "172.21.0.1/32",
          vncPort: 5900,
          noVncPort: 6080,
          headless: false,
          enableNoVnc: true,
          allowHostControl: false,
          autoStart: true,
          autoStartTimeoutMs: 12000,
        },
        prune: {
          idleHours: 24,
          maxAgeDays: 7,
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: ["exec", "process", "read", "write", "edit", "apply_patch", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

<Accordion title="沙箱详情">

**后端：**

- `docker`：本地 Docker 运行时（默认）
- `ssh`：通用 SSH 支持的远程运行时
- `openshell`：OpenShell 运行时

当选择 `backend: "openshell"` 时，特定于运行时的设置会移动到
`plugins.entries.openshell.config`。

**SSH 后端配置：**

- `target`：`user@host[:port]` 格式的 SSH 目标
- `command`：SSH 客户端命令（默认：`ssh`）
- `workspaceRoot`：用于每个作用域工作区的绝对远程根目录
- `identityFile` / `certificateFile` / `knownHostsFile`：传递给 OpenSSH 的现有本地文件
- `identityData` / `certificateData` / `knownHostsData`：OpenClaw 在运行时具体化为临时文件的内联内容或 SecretRef
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主机密钥策略控制

**SSH 认证优先级：**

- `identityData` 优先于 `identityFile`
- `certificateData` 优先于 `certificateFile`
- `knownHostsData` 优先于 `knownHostsFile`
- 由 SecretRef 支持的 `*Data` 值在沙箱会话开始之前从当前机密运行时快照中解析

**SSH 后端行为：**

- 在创建或重新创建后，向远程工作区播种一次
- 然后保持远程 SSH 工作区为权威副本
- 通过 SSH 路由 `exec`、文件工具和媒体路径
- 不会自动将远程更改同步回主机
- 不支持沙箱浏览器容器

**工作区访问：**

- `none`：`~/.openclaw/sandboxes` 下的每个作用域沙箱工作区
- `ro`：`/workspace` 处的沙箱工作区，代理工作区以只读方式挂载于 `/agent`
- `rw`：代理工作区以读/写方式挂载于 `/workspace`

**作用域：**

- `session`：每个会话的容器 + 工作区
- `agent`：每个代理一个容器 + 工作区（默认）
- `shared`：共享容器和工作区（无跨会话隔离）

**OpenShell 插件配置：**

```json5
{
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          mode: "mirror", // mirror | remote
          from: "openclaw",
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
          gateway: "lab", // optional
          gatewayEndpoint: "https://lab.example", // optional
          policy: "strict", // optional OpenShell policy id
          providers: ["openai"], // optional
          autoProviders: true,
          timeoutSeconds: 120,
        },
      },
    },
  },
}
```

**OpenShell 模式：**

- `mirror`：在执行前从本地向远程播种，执行后同步回；本地工作区保持权威副本
- `remote`：在创建沙箱时向远程播种一次，然后保持远程工作区为权威副本

在 `remote` 模式下，在 OpenClaw 之外进行的主机本地编辑在播种步骤之后不会自动同步到沙箱中。
传输方式是 SSH 进入 OpenShell 沙箱，但插件拥有沙箱生命周期和可选的镜像同步。

**`setupCommand`** 在容器创建后运行一次（通过 `sh -lc`）。需要网络出站、可写根目录、root 用户。

**容器默认为 `network: "none"`** — 如果代理需要出站访问，请设置为 `"bridge"`（或自定义桥接网络）。
`"host"` 被阻止。`"container:<id>"` 默认被阻止，除非您显式设置
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（应急手段）。
Codex 应用服务器在活动的 OpenClaw 沙箱中使用的原生代码模式网络访问也使用此出站设置。

**入站附件** 被暂存到活动工作区的 `media/inbound/*` 中。

**`docker.binds`** 挂载其他主机目录；全局和每个代理的绑定会合并。

**沙箱隔离浏览器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 被注入系统提示词。不需要 `browser.enabled` 位于 `openclaw.json` 中。
noVNC 观察者访问默认使用 VNC 认证，并且 OpenClaw 发出一个短令牌 URL（而不是在共享 URL 中暴露密码）。

- `allowHostControl: false`（默认）阻止沙箱隔离会话定位主机浏览器。
- `network` 默认为 `openclaw-sandbox-browser`（专用桥接网络）。仅当您明确需要全局桥接连接时才设置为 `bridge`。
- `cdpSourceRange` 可选择将容器边缘的 CDP 入站限制为 CIDR 范围（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 仅将其他主机目录挂载到沙箱浏览器容器中。设置后（包括 `[]`），它将替换浏览器容器的 `docker.binds`。
- 启动默认值在 `scripts/sandbox-browser-entrypoint.sh` 中定义，并针对容器主机进行了调整：
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-3d-apis`
  - `--disable-gpu`
  - `--disable-software-rasterizer`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-features=TranslateUI`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--renderer-process-limit=2`
  - `--no-zygote`
  - `--metrics-recording-only`
  - `--disable-extensions`（默认启用）
  - `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu`
    默认启用，如果 WebGL/3D 使用需要，可以使用
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 禁用。
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 在您的工作流依赖扩展时重新启用扩展。
  - `--renderer-process-limit=2` 可以通过
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 更改；设置 `0` 以使用 Chromium 的
    默认进程限制。
  - 当启用 `noSandbox` 时，加上 `--no-sandbox`。
  - 默认值是容器镜像的基线；使用带有自定义入口点的自定义浏览器镜像来更改容器默认值。

</Accordion>

浏览器沙箱隔离和 `sandbox.docker.binds`Docker 仅支持 Docker。

构建镜像（从源代码检出）：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

对于没有源代码检出的 npm 安装，请参阅 [沙箱隔离 § Images and setup](npm/en/gateway/sandboxing#images-and-setup) 获取内联 `docker build` 命令。

### `agents.list`（每个代理的覆盖设置）

使用 `agents.list[].tts` 为代理指定其自己的 TTS 提供商、语音、模型、风格或自动 TTS 模式。代理块会与全局 `messages.tts` 进行深度合并，因此共享凭证可以保留在一个位置，而各个代理只需覆盖它们需要的语音或提供商字段。活动代理的覆盖设置适用于自动语音回复、`/tts audio`、`/tts status` 以及 `tts` 代理工具。有关提供商示例和优先级，请参阅 [Text-to-speech](/zh/tools/tts#per-agent-voice-overrides)。

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        name: "Main Agent",
        workspace: "~/.openclaw/workspace",
        agentDir: "~/.openclaw/agents/main/agent",
        model: "anthropic/claude-opus-4-6", // or { primary, fallbacks }
        thinkingDefault: "high", // per-agent thinking level override
        reasoningDefault: "on", // per-agent reasoning visibility override
        fastModeDefault: false, // per-agent fast mode override
        params: { cacheRetention: "none" }, // overrides matching defaults.models params by key
        tts: {
          providers: {
            elevenlabs: { voiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
        skills: ["docs-search"], // replaces agents.defaults.skills when set
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png",
        },
        groupChat: { mentionPatterns: ["@openclaw"] },
        sandbox: { mode: "off" },
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
        subagents: { allowAgents: ["*"] },
        tools: {
          profile: "coding",
          allow: ["browser"],
          deny: ["canvas"],
          elevated: { enabled: true },
        },
      },
    ],
  },
}
```

- `id`：稳定的代理 ID（必需）。
- `default`：当设置了多个时，第一个生效（记录警告）。如果未设置，第一个列表条目为默认值。
- `model`：字符串形式设置严格的代理专用主要模型，无模型回退；对象形式 `{ primary }` 也是严格的，除非您添加 `fallbacks`。使用 `{ primary, fallbacks: [...] }` 使该代理选择回退，或使用 `{ primary, fallbacks: [] }` 使严格行为显式化。仅覆盖 `primary` 的 Cron 任务仍会继承默认回退，除非您设置 `fallbacks: []`。
- `params`：合并到 `agents.defaults.models` 中所选模型条目的代理专用流参数。使用此项进行代理特定的覆盖，例如 `cacheRetention`、`temperature` 或 `maxTokens`，而无需复制整个模型目录。
- `tts`：可选的每个代理的文本转语音覆盖。该块对 `messages.tts` 进行深度合并，因此请将共享的提供商凭据和回退策略保留在 `messages.tts` 中，并在此处仅设置特定于角色的值，如提供商、声音、模型、风格或自动模式。
- `skills`：可选的每个代理的技能允许列表。如果省略，则代理在设置时继承 `agents.defaults.skills`；显式列表将替换默认值而不是合并，而 `[]` 表示没有技能。
- `thinkingDefault`：可选的每个代理的默认思考级别 (`off | minimal | low | medium | high | xhigh | adaptive | max`)。当未设置每条消息或会话覆盖时，覆盖此代理的 `agents.defaults.thinkingDefault`。所选的提供商/模型配置文件控制哪些值有效；对于 Google Gemini，`adaptive` 保留提供商拥有的动态思考 (Gemini 3/3.1 上省略 `thinkingLevel`，Gemini 2.5 上为 `thinkingBudget: -1`)。
- `reasoningDefault`：可选的每个代理的默认推理可见性 (`on | off | stream`)。当未设置每条消息或会话推理覆盖时，覆盖此代理的 `agents.defaults.reasoningDefault`。
- `fastModeDefault`：可选的每个代理的快速模式默认值 (`true | false`)。当未设置每条消息或会话快速模式覆盖时应用。
- `models`：可选的每个代理的模型目录/运行时覆盖，按完整的 `provider/model` ID 键入。对每个代理的运行时异常使用 `models["provider/model"].agentRuntime`。
- `runtime`：可选的每个代理的运行时描述符。当代理应默认为 ACP 约束会话时，将 `type: "acp"` 与 `runtime.acp` 默认值 (`agent`、`backend`、`mode`、`cwd`) 一起使用。
- `identity.avatar`：相对于工作区的路径、`http(s)` URL 或 `data:` URI。
- `identity` 派生默认值：从 `emoji` 派生 `ackReaction`，从 `name`/`emoji` 派生 `mentionPatterns`。
- `subagents.allowAgents`：针对显式 `sessions_spawn.agentId` 目标配置的代理 ID 白名单（`["*"]` = 任何已配置的目标；默认值：仅限同一代理）。当应允许自我定向的 `agentId` 调用时，包含请求者 ID。代理配置已删除的陈旧条目将被 `sessions_spawn` 拒绝并从 `agents_list` 中省略；运行 `openclaw doctor --fix` 来清理它们，或者如果该目标在继承默认值的同时仍应保持可生成状态，则添加一个最小的 `agents.list[]` 条目。
- 沙箱继承保护：如果请求者会话是沙箱隔离的，`sessions_spawn` 将拒绝以非沙箱隔离方式运行的目标。
- `subagents.requireAgentId`：当为 true 时，阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式配置文件选择；默认值：false）。

---

## 多代理路由

在一个 Gateway(网关) 内运行多个隔离的代理。请参阅 [Multi-Agent](<Gateway(网关)/en/concepts/multi-agent>)。

```json5
{
  agents: {
    list: [
      { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" },
    ],
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
}
```

### 绑定匹配字段

- `type`（可选）：`route` 用于常规路由（缺少类型时默认为 route），`acp` 用于持久化 ACP 会话绑定。
- `match.channel`（必需）
- `match.accountId`（可选；`*` = 任何账户；省略 = 默认账户）
- `match.peer`（可选；`{ kind: direct|group|channel, id }`）
- `match.guildId` / `match.teamId`（可选；渠道特定）
- `acp`（可选；仅适用于 `type: "acp"`）：`{ mode, label, cwd, backend }`

**确定性匹配顺序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId`（精确，无 peer/guild/team）
5. `match.accountId: "*"`（渠道范围）
6. 默认代理

在每个层级中，第一个匹配的 `bindings` 条目胜出。

对于 `type: "acp"`OpenClaw 条目，OpenClaw 根据精确的对话身份（`match.channel` + 账户 + `match.peer.id`）进行解析，并且不使用上述路由绑定层级顺序。

### 每个代理的访问配置文件

<Accordion title="完全访问（无沙箱）">

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="只读工具 + 工作区">

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "ro" },
        tools: {
          allow: ["read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="无文件系统访问（仅消息传递）">

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        tools: {
          allow: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status", "whatsapp", "telegram", "slack", "discord", "gateway"],
          deny: ["read", "write", "edit", "apply_patch", "exec", "process", "browser", "canvas", "nodes", "cron", "gateway", "image"],
        },
      },
    ],
  },
}
```

</Accordion>

有关优先级的详细信息，请参阅 [多代理沙箱与工具](/zh/tools/multi-agent-sandbox-tools)。

---

## 会话

```json5
{
  session: {
    scope: "per-sender",
    dmScope: "main", // main | per-peer | per-channel-peer | per-account-channel-peer
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      mode: "daily", // daily | idle
      atHour: 4,
      idleMinutes: 60,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    maintenance: {
      mode: "warn", // warn | enforce
      pruneAfter: "30d",
      maxEntries: 500,
      resetArchiveRetention: "30d", // duration or false
      maxDiskBytes: "500mb", // optional hard budget
      highWaterBytes: "400mb", // optional cleanup target
    },
    threadBindings: {
      enabled: true,
      idleHours: 24, // default inactivity auto-unfocus in hours (`0` disables)
      maxAgeHours: 0, // default hard max age in hours (`0` disables)
    },
    mainKey: "main", // legacy (runtime always uses "main")
    agentToAgent: { maxPingPongTurns: 5 },
    sendPolicy: {
      rules: [{ action: "deny", match: { channel: "discord", chatType: "group" } }],
      default: "allow",
    },
  },
}
```

<Accordion title="Session 字段详细信息">

- **`scope`**: 群聊语境的基础会话分组策略。
  - `per-sender` (默认): 在渠道语境中，每个发送者获得一个隔离的会话。
  - `global`: 渠道语境中的所有参与者共享一个会话（仅在旨在共享语境时使用）。
- **`dmScope`**: 私信的分组方式。
  - `main`: 所有私信共享主会话。
  - `per-peer`: 跨渠道按发送者 ID 隔离。
  - `per-channel-peer`: 按渠道 + 发送者隔离（推荐用于多用户收件箱）。
  - `per-account-channel-peer`: 按账户 + 渠道 + 发送者隔离（推荐用于多账户）。
- **`identityLinks`**: 将规范 ID 映射到提供商前缀的对等端，以实现跨渠道会话共享。诸如 `/dock_discord` 之类的 Dock 命令使用相同的映射将活动会话的回复路由切换到另一个链接的渠道对等端；请参阅 [渠道对接](/zh/concepts/channel-docking)。
- **`reset`**: 主要重置策略。`daily` 在 `atHour` 本地时间重置；`idle` 在 `idleMinutes` 之后重置。当两者都配置时，以先过期的为准。每日重置新鲜度使用会话行的 `sessionStartedAt`；空闲重置新鲜度使用 `lastInteractionAt`。后台/系统事件写入（如心跳、cron 唤醒、exec 通知和网管记账）可以更新 `updatedAt`，但它们不会保持每日/空闲会话的新鲜度。
- **`resetByType`**: 按类型覆盖 (`direct`, `group`, `thread`)。旧的 `dm` 被接受为 `direct` 的别名。
- **`mainKey`**: 旧字段。运行时始终对主直接聊天存储桶使用 `"main"`。
- **`agentToAgent.maxPingPongTurns`**: 代理间交换期间代理之间的最大回复轮次（整数，范围：`0`-`20`，默认值：`5`）。`0` 禁用乒乓链接。
- \*\*`sendPolicy`: 按 `channel`、`chatType` (`direct|group|channel`，带有旧的 `dm` 别名)、`keyPrefix` 或 `rawKeyPrefix` 匹配。拒绝优先。
- **`maintenance`**: 会话存储清理 + 保留控制。
  - `mode`: `warn` 仅发出警告；`enforce` 应用清理。
  - `pruneAfter`: 陈旧条目的年龄截止（默认 `30d`）。
  - `maxEntries`: `sessions.json` 中的最大条目数（默认 `500`）。运行时写入会批量清理，并为生产级上限提供少量高水位缓冲；`openclaw sessions cleanup --enforce` 立即应用上限。
  - `rotateBytes`: 已弃用并被忽略；`openclaw doctor --fix` 会将其从旧配置中移除。
  - `resetArchiveRetention`: `*.reset.<timestamp>` 副本档案的保留期。默认为 `pruneAfter`；设置 `false` 可禁用。
  - `maxDiskBytes`: 可选的会话目录磁盘预算。在 `warn` 模式下，它会记录警告；在 `enforce` 模式下，它会首先移除最旧的工件/会话。
  - `highWaterBytes`: 预算清理后的可选目标。默认为 `80%` 的 `maxDiskBytes`。
- **`threadBindings`**: 线程绑定会话功能的全局默认值。
  - `enabled`: 主默认开关（提供商可以覆盖；Discord 使用 `channels.discord.threadBindings.enabled`）
  - `idleHours`: 默认的非活动自动取消聚焦时间（小时）（`0` 禁用；提供商可以覆盖）
  - `maxAgeHours`: 默认的硬性最大期限（小时）（`0` 禁用；提供商可以覆盖）
  - `spawnSessions`: 从 `sessions_spawn` 和 ACP 线程生成创建线程绑定工作会话的默认门槛。当启用线程绑定时，默认为 `true`；提供商/账户可以覆盖。
  - `defaultSpawnContext`: 线程绑定生成的默认原生子代理上下文 (`"fork"` 或 `"isolated"`)。默认为 `"fork"`。

</Accordion>

---

## 消息

```json5
{
  messages: {
    responsePrefix: "🦞", // or "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // group-mentions | group-all | direct | all
    removeAckAfterReply: false,
    queue: {
      mode: "followup", // steer | followup | collect | interrupt
      debounceMs: 500,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "followup",
        telegram: "followup",
      },
    },
    inbound: {
      debounceMs: 2000, // 0 disables
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
      },
    },
  },
}
```

### 响应前缀

按渠道/账户覆盖：`channels.<channel>.responsePrefix`，`channels.<channel>.accounts.<id>.responsePrefix`。

解析（最优先者胜）：account → 渠道 → global。`""` 禁用并停止级联。`"auto"` 派生 `[{identity.name}]`。

**模板变量：**

| 变量              | 描述           | 示例                        |
| ----------------- | -------------- | --------------------------- |
| `{model}`         | 模型简称       | `claude-opus-4-6`           |
| `{modelFull}`     | 模型完整标识符 | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供商名称     | `anthropic`                 |
| `{thinkingLevel}` | 当前思考层级   | `high`，`low`，`off`        |
| `{identity.name}` | Agent 身份名称 | （与 `"auto"` 相同）        |

变量不区分大小写。`{think}` 是 `{thinkingLevel}` 的别名。

### 确认反应

- 默认为当前 Agent 的 `identity.emoji`，否则为 `"👀"`。设置 `""` 可禁用。
- 按渠道覆盖：`channels.<channel>.ackReaction`，`channels.<channel>.accounts.<id>.ackReaction`。
- 解析顺序：account → 渠道 → `messages.ackReaction` → identity fallback。
- 作用域：`group-mentions`（默认）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在支持反应的渠道（如 Slack、Discord、Telegram、WhatsApp 和 iMessage）上回复后移除确认。
- `messages.statusReactions.enabled`SlackDiscordTelegramWhatsAppSlackDiscordTelegramWhatsApp：在 Slack、Discord、Telegram 和 WhatsApp 上启用生命周期状态反应。
  在 Slack 和 Discord 上，当确认反应处于活动状态时，未设置此项可保持状态反应启用。
  在 Telegram 和 WhatsApp 上，将其显式设置为 `true` 以启用生命周期状态反应。
- `messages.statusReactions.emojis`：覆盖生命周期表情符号键：
  `queued`、`thinking`、`compacting`、`tool`、`coding`、`web`、`deploy`、`build`、
  `concierge`、`done`、`error`、`stallSoft` 和 `stallHard`Telegram。
  Telegram 仅允许固定的反应集，因此不支持已配置的表情符号将回退到该聊天最接近的支持状态变体。

### 入站防抖

将来自同一发送者的快速纯文本消息批处理为单个代理轮次。媒体/附件立即刷新。控制命令绕过防抖。

### TTS（文本转语音）

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all
      provider: "elevenlabs",
      summaryModel: "openai/gpt-5.4-mini",
      modelOverrides: { enabled: true },
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
      providers: {
        elevenlabs: {
          apiKey: "elevenlabs_api_key",
          baseUrl: "https://api.elevenlabs.io",
          voiceId: "voice_id",
          modelId: "eleven_multilingual_v2",
          seed: 42,
          applyTextNormalization: "auto",
          languageCode: "en",
          voiceSettings: {
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.0,
            useSpeakerBoost: true,
            speed: 1.0,
          },
        },
        microsoft: {
          voice: "en-US-AvaMultilingualNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
        openai: {
          apiKey: "openai_api_key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini-tts",
          voice: "alloy",
        },
      },
    },
  },
}
```

- `auto` 控制默认自动 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可以覆盖本地首选项，`/tts status` 显示有效状态。
- `summaryModel` 覆盖 `agents.defaults.model.primary` 用于自动摘要。
- `modelOverrides` 默认启用；`modelOverrides.allowProvider` 默认为 `false`（选择加入）。
- API 密钥回退到 API`ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- 捆绑的语音提供商由插件拥有。如果设置了 `plugins.allow`，请包含您想要使用的每个 TTS 提供商插件，例如用于 Edge TTS 的 `microsoft`。传统的 `edge` 提供商 ID 被接受为 `microsoft` 的别名。
- `providers.openai.baseUrl`OpenAI 覆盖 OpenAI TTS 端点。解析顺序为配置、`OPENAI_TTS_BASE_URL`，然后 `https://api.openai.com/v1`。
- 当 `providers.openai.baseUrl`OpenAIOpenClawOpenAI 指向非 OpenAI 端点时，OpenClaw 会将其视为兼容 OpenAI 的 TTS 服务器，并放宽模型/语音验证。

---

## Talk

Talk 模式（macOS/iOS/Android）的默认值。

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "elevenlabs_voice_id",
        voiceAliases: {
          Clawd: "EXAVITQu4vr4xnSDxMaL",
          Roger: "CwhRBWXzGAHq8TQ4Fs17",
        },
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
      },
      system: {},
    },
    consultThinkingLevel: "low",
    consultFastMode: true,
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
    realtime: {
      provider: "openai",
      providers: {
        openai: {
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
      instructions: "Speak warmly and keep answers brief.",
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

- 当配置了多个 Talk 提供商时，`talk.provider` 必须与 `talk.providers` 中的键匹配。
- 传统的扁平 Talk 键（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）仅用于兼容性。运行 `openclaw doctor --fix` 以将持久化配置重写为 `talk.providers.<provider>`。
- 语音 ID 会回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受纯文本字符串或 SecretRef 对象。
- `ELEVENLABS_API_KEY`API 回退仅在未配置 Talk API 密钥时应用。
- `providers.*.voiceAliases` 允许 Talk 指令使用友好名称。
- `providers.mlx.modelId`macOSmacOS 选择 macOS 本地 MLX 辅助程序使用的 Hugging Face 仓库。如果省略，macOS 使用 `mlx-community/Soprano-80M-bf16`。
- macOS MLX 播放在存在时通过捆绑的 macOS`openclaw-mlx-tts` 辅助程序运行，或者在 `PATH` 上运行可执行文件；`OPENCLAW_MLX_TTS_BIN` 覆盖开发用的辅助程序路径。
- `consultThinkingLevel`OpenClaw 控制在 Control UI Talk 实时 `openclaw_agent_consult` 调用背后运行的完整 OpenClaw 代理的思考级别。保持未设置以保留正常的会话/模型行为。
- `consultFastMode` 为 Control UI Talk 实时咨询设置一次性快速模式覆盖，而无需更改会话的正常快速模式设置。
- `speechLocale`iOSmacOS 设置 iOS/macOS Talk 语音识别使用的 BCP 47 区域设置 ID。保持未设置以使用设备默认值。
- `silenceTimeoutMs` 控制 Talk 模式在用户静音后发送文本之前等待的时间。未设置则保留平台默认的暂停窗口 (`700 ms on macOS and Android, 900 ms on iOS`)。
- `realtime.instructions`OpenClaw 将面向提供商的系统指令附加到 OpenClaw 内置的实时提示中，以便在不丢失默认 `openclaw_agent_consult` 指导的情况下配置语音风格。
- `realtime.consultRouting`Gateway(网关) 控制当实时提供商生成最终用户文本且没有 `openclaw_agent_consult` 时的 Gateway 中继回退：`provider-direct` 保留直接的提供商回复，而 `force-agent-consult`OpenClaw 将最终请求通过 OpenClaw 路由。

---

## 相关

- [配置参考](/zh/gateway/configuration-reference) — 所有其他配置键
- [配置](/zh/gateway/configuration) — 常见任务和快速设置
- [配置示例](/zh/gateway/configuration-examples)
