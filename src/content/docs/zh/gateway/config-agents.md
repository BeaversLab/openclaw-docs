---
summary: "Agent defaults, multi-agent routing, 会话, messages, and talk config"
read_when:
  - Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills)
  - Configuring multi-agent routing and bindings
  - Adjusting session, message delivery, and talk-mode behavior
title: "Configuration — agents"
---

位于 `agents.*`、`multiAgent.*`、`session.*`、
`messages.*` 和 `talk.*` 下的 Agent 作用域配置键。有关通道、工具、网关运行时和其他顶级键，请参阅 [Configuration reference](/zh/gateway/configuration-reference)。

## Agent defaults

### `agents.defaults.workspace`

默认值：`~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

### `agents.defaults.repoRoot`

系统提示词 Runtime 行中显示的可选仓库根目录。如果未设置，OpenClaw 会通过从工作区向上遍历来自动检测。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

适用于未设置 `agents.list[].skills` 的 Agent 的可选默认技能允许列表。

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
- 设置 `agents.list[].skills: []` 以禁用所有技能。
- 非空的 `agents.list[].skills` 列表是该 Agent 的最终集合；它不会与默认值合并。

### `agents.defaults.skipBootstrap`

禁用工作区引导文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）的自动创建。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.contextInjection`

控制何时将工作区引导文件注入系统提示词。默认值：`"always"`。

- `"continuation-skip"`：安全的继续轮次（在完成的助手响应之后）跳过工作区引导的重新注入，从而减少提示词大小。心跳运行和压缩后重试仍会重建上下文。
- `"never"`：禁用每次轮次的工作区引导和上下文文件注入。仅适用于完全拥有其提示生命周期的代理（自定义上下文引擎、自行构建上下文的本地运行时或专用的无引导工作流）。心跳和压缩恢复轮次也会跳过注入。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

### `agents.defaults.bootstrapMaxChars`

单个工作区引导文件截断前的最大字符数。默认值：`12000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

所有工作区引导文件中注入的最大总字符数。默认值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

当引导上下文被截断时，控制代理可见的警告文本。
默认值：`"once"`。

- `"off"`：从不将警告文本注入到系统提示中。
- `"once"`：针对每个唯一的截断签名注入一次警告（推荐）。
- `"always"`：当存在截断时，每次运行都注入警告。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### 上下文预算所有权映射

OpenClaw 拥有多个高吞吐量的提示/上下文预算，它们是按子系统有意拆分的，而不是全部通过一个通用旋钮。

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars`：
  正常的工作区引导注入。
- `agents.defaults.startupContext.*`：
  一次性 `/new` 和 `/reset` 启动前奏，包括最近的每日
  `memory/*.md` 文件。
- `skills.limits.*`：
  注入到系统提示中的精简技能列表。
- `agents.defaults.contextLimits.*`：
  有界的运行时摘录和注入的运行时自有块。
- `memory.qmd.limits.*`：
  索引的内存搜索片段和注入大小调整。

仅当一个代理需要不同的预算时，才使用匹配的特定代理覆盖设置：

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

控制在裸 `/new` 和 `/reset`
运行时注入的首次轮次启动前奏。

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

- `memoryGetMaxChars`：在截断并添加
  元数据和继续提示之前的默认 `memory_get` 摘录上限。
- `memoryGetDefaultLines`：省略 `lines` 时的默认 `memory_get` 行窗口。
- `toolResultMaxChars`：用于持久化结果和
  溢出恢复的实时工具结果上限。
- `postCompactionMaxChars`：在压缩后刷新注入期间使用的 AGENTS.md 摘录上限。

#### `agents.list[].contextLimits`

共享 `contextLimits` 配置项的每 Agent 覆盖设置。省略的字段将从 `agents.defaults.contextLimits` 继承。

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

注入到系统提示中的精简技能列表的全局上限。这不会影响按需读取 `SKILL.md` 文件。

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

技能提示预算的每 Agent 覆盖设置。

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

在调用提供商之前，转录/工具图像块中最长图像边的最大像素尺寸。
默认值：`1200`。

较低的值通常会减少在包含大量截图的运行中的视觉令牌使用量和请求负载大小。
较高的值可以保留更多视觉细节。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

系统提示上下文的时区（而非消息时间戳）。回退到主机时区。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系统提示中的时间格式。默认值：`auto`（操作系统首选项）。

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
      agentRuntime: {
        id: "pi", // pi | auto | registered harness id, e.g. codex
        fallback: "pi", // pi | none
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      verboseDefault: "off",
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
  - 对象形式设置主要模型以及有序的故障转移模型。
- `imageModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由 `image` 工具路径用作其视觉模型配置。
  - 当选定/默认模型无法接受图像输入时，也用作故障转移路由。
- `imageGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的图像生成功能和任何其他生成图像的未来工具/插件界面使用。
  - 典型值：`google/gemini-3.1-flash-image-preview` 用于原生 Gemini 图像生成，`fal/fal-ai/flux/dev` 用于 fal，`openai/gpt-image-2` 用于 OpenAI 图像，或 `openai/gpt-image-1.5` 用于透明背景的 OpenAI PNG/WebP 输出。
  - 如果您直接选择提供商/模型，请同时配置匹配的提供商身份验证（例如 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY` 用于 `google/*`，`OPENAI_API_KEY` 或 OpenAI Codex OAuth 用于 `openai/gpt-image-2` / `openai/gpt-image-1.5`，`FAL_KEY` 用于 `fal/*`）。
  - 如果省略，`image_generate` 仍然可以推断出支持身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试其余已注册的图像生成提供商。
- `musicGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的音乐生成功能和内置的 `music_generate` 工具使用。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.6`。
  - 如果省略，`music_generate` 仍然可以推断出支持身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试其余已注册的音乐生成提供商。
  - 如果您直接选择提供商/模型，请同时配置匹配的提供商身份验证/API 密钥。
- `videoGenerationModel`：接受字符串（`"provider/model"`）或对象（`{ primary, fallbacks }`）。
  - 由共享的视频生成功能和内置的 `video_generate` 工具使用。
  - 典型值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍可以推断出支持身份验证的提供商默认值。它首先尝试当前的默认提供商，然后按提供商 ID 顺序尝试其余已注册的视频生成提供商。
  - 如果直接选择提供商/模型，请同时配置匹配的提供商身份验证/API 密钥。
  - 捆绑的 Qwen 视频生成提供商最多支持 1 个输出视频、1 个输入图像、4 个输入视频、10 秒时长，以及提供商级别的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 选项。
- `pdfModel`：接受字符串 (`"provider/model"`) 或对象 (`{ primary, fallbacks }`)。
  - 由 `pdf` 工具用于模型路由。
  - 如果省略，PDF 工具将回退到 `imageModel`，然后再回退到已解析的会话/默认模型。
- `pdfMaxBytesMb`：当调用时未传递 `maxBytesMb` 时，`pdf` 工具的默认 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中提取回退模式考虑的默认最大页数。
- `verboseDefault`：代理的默认详细级别。值：`"off"`、`"on"`、`"full"`。默认值：`"off"`。
- `elevatedDefault`：代理的默认提升输出级别。值：`"off"`、`"on"`、`"ask"`、`"full"`。默认值：`"on"`。
- `model.primary`：格式 `provider/model`（例如 `openai/gpt-5.5` 用于 API 密钥访问，或 `openai-codex/gpt-5.5` 用于 Codex OAuth）。如果您省略提供商，OpenClaw 会先尝试别名，然后尝试该确切模型 ID 的唯一配置提供商匹配，只有在那时才会回退到配置的默认提供商（已弃用的兼容性行为，因此首选显式的 `provider/model`）。如果该提供商不再公开配置的默认模型，OpenClaw 将回退到第一个配置的提供商/模型，而不是显示过时的已移除提供商的默认值。
- `models`：为 `/model` 配置的模型目录和允许列表。每个条目可以包含 `alias`（快捷方式）和 `params`（特定于提供商，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`、`responsesServerCompaction`、`responsesCompactThreshold`、`chat_template_kwargs`、`extra_body`/`extraBody`）。
  - 安全编辑：使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 添加条目。`config set` 会拒绝删除现有允许列表条目的替换操作，除非您传递 `--replace`。
  - 提供商范围的配置/新手引导流程会将选定的提供商模型合并到此映射中，并保留已配置的不相关提供商。
  - 对于直接 OpenAI Responses 模型，会自动启用服务端压缩。使用 `params.responsesServerCompaction: false` 停止注入 `context_management`，或使用 `params.responsesCompactThreshold` 覆盖阈值。请参阅 [OpenAI 服务端压缩](/zh/providers/openai#server-side-compaction-responses-api)。
- `params`：应用于所有模型的全局默认提供商参数。在 `agents.defaults.params` 处设置（例如 `{ cacheRetention: "long" }`）。
- `params` 合并优先级（配置）：`agents.defaults.params`（全局基础）被 `agents.defaults.models["provider/model"].params`（按模型）覆盖，然后 `agents.list[].params`（匹配的 agent id）按键覆盖。详情请参阅 [提示词缓存](/zh/reference/prompt-caching)。
- `params.extra_body`/`params.extraBody`：合并到 `api: "openai-completions"` 请求体中的高级透传 JSON，用于兼容 OpenAI 的代理。如果它与生成的请求键冲突，则额外的请求体优先；非原生补全路由仍会在之后剥离仅 OpenAI 的 `store`。
- `params.chat_template_kwargs`：合并到顶级 `api: "openai-completions"` 请求体中的 vLLM/OpenAI 兼容聊天模板参数。对于关闭思考功能的 `vllm/nemotron-3-*`，捆绑的 vLLM 插件会自动发送 `enable_thinking: false` 和 `force_nonempty_content: true`；显式的 `chat_template_kwargs` 会覆盖生成的默认值，而 `extra_body.chat_template_kwargs` 仍具有最终优先级。对于 vLLM Qwen 思考控制，请在该模型条目上将 `params.qwenThinkingFormat` 设置为 `"chat-template"` 或 `"top-level"`。
- `params.preserveThinking`：Z.AI 仅用于保留思考的选项。启用并开启思考后，OpenClaw 会发送 `thinking.clear_thinking: false` 并重放先前的 `reasoning_content`；请参阅 [Z.AI 思考与保留思考](/zh/providers/zai#thinking-and-preserved-thinking)。
- `agentRuntime`：默认的低级代理运行时策略。省略 id 则默认为 OpenClaw Pi。使用 `id: "pi"` 强制使用内置 PI 驱动，`id: "auto"` 让注册的插件驱动声明支持的模型，已注册的驱动 id 如 `id: "codex"`，或受支持的 CLI 后端别名如 `id: "claude-cli"`。设置 `fallback: "none"` 以禁用自动 PI 回退。显式插件运行时（如 `codex`）默认采用故障封闭策略，除非在同一覆盖范围内设置 `fallback: "pi"`。保持模型引用为 `provider/model` 的规范格式；通过运行时配置而不是遗留的运行时提供商前缀来选择 Codex、Claude CLI、Gemini CLI 和其他执行后端。有关其与提供商/模型选择的区别，请参阅 [Agent runtimes](/zh/concepts/agent-runtimes)。
- 修改这些字段的配置编写器（例如 `/models set`、`/models set-image` 和回退添加/删除命令）会保存规范的对象形式，并尽可能保留现有的回退列表。
- `maxConcurrent`：跨会话的最大并行代理运行数（每个会话仍为串行）。默认值：4。

### `agents.defaults.agentRuntime`

`agentRuntime` 控制哪个低级执行器运行代理轮次。大多数部署应保留默认的 OpenClaw Pi 运行时。当受信任的插件提供原生驱动（例如捆绑的 Codex app-server 驱动）或当您想要受支持的 CLI 后端（例如 Claude CLI）时，请使用它。有关心智模型，请参阅 [Agent runtimes](/zh/concepts/agent-runtimes)。

```json5
{
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      agentRuntime: {
        id: "codex",
        fallback: "none",
      },
    },
  },
}
```

- `id`：`"auto"`、`"pi"`、已注册的插件驱动 id 或受支持的 CLI 后端别名。捆绑的 Codex 插件注册了 `codex`；捆绑的 Anthropic 插件提供了 `claude-cli` CLI 后端。
- `fallback`：`"pi"` 或 `"none"`。在 `id: "auto"` 中，省略的回退默认为 `"pi"`，以便旧配置可以在没有插件工具声明运行时继续使用 PI。在显式插件运行时模式（例如 `id: "codex"`）中，省略的回退默认为 `"none"`，以便缺失的工具声明失败，而不是静默使用 PI。运行时覆盖不会从更广泛的作用域继承回退；当您有意需要该兼容性回退时，请与显式运行时一起设置 `fallback: "pi"`。所选插件工具的失败始终直接显示。
- 环境覆盖：`OPENCLAW_AGENT_RUNTIME=<id|auto|pi>` 覆盖 `id`；`OPENCLAW_AGENT_HARNESS_FALLBACK=pi|none` 覆盖该进程的回退。
- 对于仅 Codex 的部署，请设置 `model: "openai/gpt-5.5"` 和 `agentRuntime.id: "codex"`。您也可以为了可读性显式设置 `agentRuntime.fallback: "none"`；这是显式插件运行时的默认值。
- 对于 Claude CLI 部署，首选 `model: "anthropic/claude-opus-4-7"` 加上 `agentRuntime.id: "claude-cli"`。传统的 `claude-cli/claude-opus-4-7` 模型引用仍然可用于兼容，但新配置应保持提供商/模型选择的规范性，并将执行后端放在 `agentRuntime.id` 中。
- 较旧的运行时策略键会被 `openclaw doctor --fix` 重写为 `agentRuntime`。
- 工具声明的选择在第一次嵌入式运行后按会话 ID 固定。配置/环境更改会影响新会话或重置的会话，而不影响现有的记录。具有记录历史但没有记录固定的旧会话被视为 PI 固定。`/status` 报告有效的运行时，例如 `Runtime: OpenClaw Pi Default` 或 `Runtime: OpenAI Codex`。
- 这仅控制文本代理轮次执行。媒体生成、视觉、PDF、音乐、视频和 TTS 仍使用其提供商/模型设置。

**内置别名简写**（仅当模型在 `agents.defaults.models` 中时适用）：

| 别名                | 模型                                       |
| ------------------- | ------------------------------------------ |
| `opus`              | `anthropic/claude-opus-4-6`                |
| `sonnet`            | `anthropic/claude-sonnet-4-6`              |
| `gpt`               | `openai/gpt-5.5` 或 `openai-codex/gpt-5.5` |
| `gpt-mini`          | `openai/gpt-5.4-mini`                      |
| `gpt-nano`          | `openai/gpt-5.4-nano`                      |
| `gemini`            | `google/gemini-3.1-pro-preview`            |
| `gemini-flash`      | `google/gemini-3-flash-preview`            |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview`     |

您配置的别名始终优先于默认值。

除非您设置了 `--thinking off` 或自行定义了 `agents.defaults.models["zai/<model>"].params.thinking`，否则 Z.AI GLM-4.x 模型会自动启用思考模式。
对于工具调用流式传输，Z.AI 模型默认启用 `tool_stream`。将 `agents.defaults.models["zai/<model>"].params.tool_stream` 设置为 `false` 即可将其禁用。
当未设置显式的思考级别时，Anthropic Claude 4.6 模型默认为 `adaptive` 思考。

### `agents.defaults.cliBackends`

用于纯文本回退运行（无工具调用）的可选 CLI 后端。当 API 提供商发生故障时，可用作备份。

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
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

- CLI 后端以文本为主；工具始终被禁用。
- 当设置了 `sessionArg` 时支持会话。
- 当 `imageArg` 接受文件路径时支持图像透传。

### `agents.defaults.systemPromptOverride`

使用固定字符串替换整个 OpenClaw 组装的系统提示词。在默认级别（`agents.defaults.systemPromptOverride`）或每个代理（`agents.list[].systemPromptOverride`）设置。每个代理的值优先；空值或仅包含空格的值将被忽略。适用于受控的提示词实验。

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

按模型族应用的与提供商无关的提示词覆盖层。GPT-5 系列模型 ID 接收跨提供商的共享行为契约；`personality` 仅控制友好的交互风格层。

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

- `"friendly"`（默认）和 `"on"` 启用友好的交互风格层。
- `"off"` 仅禁用友好层；带标签的 GPT-5 行为契约保持启用状态。
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

- `every`：持续时间字符串（ms/s/m/h）。默认值：`30m`（API 密钥身份验证）或 `1h`（OAuth 身份验证）。设置为 `0m` 可禁用。
- `includeSystemPromptSection`：如果为 false，则从系统提示词中省略 Heartbeat 部分，并跳过将 `HEARTBEAT.md` 注入到引导上下文中。默认值：`true`。
- `suppressToolErrorWarnings`：如果为 true，则会在心跳运行期间抑制工具错误警告负载。
- `timeoutSeconds`：心跳代理轮次在被中止前允许的最长时间（以秒为单位）。保持不设置以使用 `agents.defaults.timeoutSeconds`。
- `directPolicy`：直接/私信传送策略。`allow`（默认）允许直接目标传送。`block` 禁止直接目标传送并发出 `reason=dm-blocked`。
- `lightContext`：如果为 true，心跳运行使用轻量级引导上下文，并且仅保留工作区引导文件中的 `HEARTBEAT.md`。
- `isolatedSession`：如果为 true，每次心跳都在没有先前对话历史记录的新会话中运行。与 cron `sessionTarget: "isolated"` 使用相同的隔离模式。将每次心跳的 token 成本从 ~100K 降低到 ~2-5K token。
- 每个代理：设置 `agents.list[].heartbeat`。当任何代理定义了 `heartbeat` 时，**仅这些代理** 运行心跳。
- 心跳运行完整的代理轮次 —— 较短的间隔会消耗更多 token。

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
        postCompactionSections: ["Session Startup", "Red Lines"], // [] disables reinjection
        model: "openrouter/anthropic/claude-sonnet-4-6", // optional compaction-only model override
        truncateAfterCompaction: true, // rotate to a smaller successor JSONL after compaction
        maxActiveTranscriptBytes: "20mb", // optional preflight local compaction trigger
        notifyUser: true, // send brief notices when compaction starts and completes (default: false)
        memoryFlush: {
          enabled: true,
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
- `provider`：已注册压缩提供商插件的 ID。设置后，将调用提供商的 `summarize()`，而不是内置的 LLM 摘要。失败时回退到内置方式。设置提供商会强制执行 `mode: "safeguard"`。请参阅 [压缩](/zh/concepts/compaction)。
- `timeoutSeconds`：OpenClaw 中止单次压缩操作前允许的最大秒数。默认值：`900`。
- `keepRecentTokens`：用于逐字保留最新转录尾部内容的 Pi 切点预算。如果显式设置，手动 `/compact` 会遵守此预算；否则手动压缩是一个硬检查点。
- `identifierPolicy`：`strict`（默认）、`off` 或 `custom`。`strict` 在压缩摘要期间会在前面添加内置的不透明标识符保留指南。
- `identifierInstructions`：当 `identifierPolicy=custom` 时使用的可选自定义标识符保留文本。
- `qualityGuard`：retry-on-malformed-output 检查以确保摘要安全。在保护模式下默认启用；设置 `enabled: false` 可跳过审核。
- `postCompactionSections`：压缩后重新注入的可选 AGENTS.md H2/H3 节名称。默认为 `["Session Startup", "Red Lines"]`；设置 `[]` 可禁用重新注入。如果未设置或显式设置为该默认对，则较旧的 `Every Session`/`Safety` 标题也将作为传统回退被接受。
- `model`：专用于压缩摘要的可选 `provider/model-id` 覆盖。当主会话应保留一个模型但压缩摘要应在另一个模型上运行时使用此选项；如果未设置，压缩使用会话的主模型。
- `maxActiveTranscriptBytes`：可选的字节阈值（`number` 或如 `"20mb"` 的字符串），当活动的 JSONL 超过该阈值时，在运行前触发常规本地压缩。需要 `truncateAfterCompaction` 以便成功的压缩可以轮换到更小的后续记录。未设置或设置为 `0` 时禁用。
- `notifyUser`：当 `true` 时，在压缩开始和完成时向用户发送简短通知（例如，“正在压缩上下文...” 和“压缩完成”）。默认情况下禁用以保持压缩静默。
- `memoryFlush`：自动压缩前的静默代理轮次，用于存储持久化记忆。当工作区为只读时跳过。

### `agents.defaults.contextPruning`

在发送到 LLM 之前，从内存上下文中修剪**旧工具结果**。**不会**修改磁盘上的会话历史记录。

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

<Accordion title="缓存 TTL 模式行为">

- `mode: "cache-ttl"` 启用修剪传递。
- `ttl` 控制修剪可以再次运行的频率（在最后一次缓存接触之后）。
- 修剪首先软修剪过大的工具结果，然后在需要时硬清除较旧的工具结果。

**软修剪**保留开头 + 结尾并在中间插入 `...`。

**硬清除**将整个工具结果替换为占位符。

注意：

- 图像块从不被修剪/清除。
- 比率是基于字符的（近似值），而不是确切的 Token 计数。
- 如果存在的助理消息少于 `keepLastAssistants` 条，则跳过修剪。

</Accordion>

有关行为详细信息，请参阅 [会话修剪](/zh/concepts/session-pruning)。

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

- 非 Telegram 渠道需要显式的 `*.blockStreaming: true` 来启用块回复。
- 渠道覆盖：`channels.<channel>.blockStreamingCoalesce`（以及每个账户的变体）。Signal/Slack/Discord/Google Chat 默认 `minChars: 1500`。
- `humanDelay`：块回复之间的随机暂停。`natural` = 800–2500ms。每个代理的覆盖：`agents.list[].humanDelay`。

有关行为 + 分块的详细信息，请参阅[流式传输](/zh/concepts/streaming)。

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

- 默认值：直接聊天/提及时为 `instant`，未提及的群组聊天时为 `message`。
- 每次会话覆盖：`session.typingMode`、`session.typingIntervalSeconds`。

请参阅[正在输入指示器](/zh/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

嵌入式代理的可选沙箱隔离。有关完整指南，请参阅[沙箱隔离](/zh/gateway/sandboxing)。

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

<Accordion title="沙箱详细信息">

**后端：**

- `docker`：本地 Docker 运行时（默认）
- `ssh`：通用的基于 SSH 的远程运行时
- `openshell`：OpenShell 运行时

当选择 `backend: "openshell"` 时，特定于运行时的设置会移至
`plugins.entries.openshell.config`。

**SSH 后端配置：**

- `target`：`user@host[:port]` 格式的 SSH 目标
- `command`：SSH 客户端命令（默认：`ssh`）
- `workspaceRoot`：用于每个作用域工作区的绝对远程根目录
- `identityFile` / `certificateFile` / `knownHostsFile`：传递给 OpenSSH 的现有本地文件
- `identityData` / `certificateData` / `knownHostsData`：内联内容或 SecretRef，OpenClaw 会在运行时将其具象化为临时文件
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主机密钥策略控制

**SSH 认证优先级：**

- `identityData` 优先于 `identityFile`
- `certificateData` 优先于 `certificateFile`
- `knownHostsData` 优先于 `knownHostsFile`
- 由 SecretRef 支持的 `*Data` 值会在沙箱会话开始之前从活动密钥运行时快照中解析

**SSH 后端行为：**

- 在创建或重新创建后播种一次远程工作区
- 然后保持远程 SSH 工作区为权威
- 通过 SSH 路由 `exec`、文件工具和媒体路径
- 不会自动将远程更改同步回主机
- 不支持沙箱浏览器容器

**工作区访问：**

- `none`：位于 `~/.openclaw/sandboxes` 下的每个作用域的沙箱工作区
- `ro`：位于 `/workspace` 的沙箱工作区，代理工作区以只读方式挂载于 `/agent`
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

- `mirror`：执行前从本地播种远程，执行后同步回本地；本地工作区保持权威
- `remote`：创建沙箱时播种一次远程，然后保持远程工作区为权威

在 `remote` 模式下，在 OpenClaw 之外进行的本地主机编辑在播种步骤之后不会自动同步到沙箱中。
传输是通过 SSH 进入 OpenShell 沙箱，但插件拥有沙箱生命周期和可选的镜像同步。

**`setupCommand`** 在容器创建后（通过 `sh -lc`）运行一次。需要网络出口、可写根目录、root 用户。

**容器默认为 `network: "none"`** — 如果代理需要出站访问，请设置为 `"bridge"`（或自定义桥接网络）。
`"host"` 被阻止。除非您明确设置
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（break-glass），否则 `"container:<id>"` 默认被阻止。

**入站附件** 被暂存到活动工作区中的 `media/inbound/*` 中。

**`docker.binds`** 挂载其他主机目录；全局和每个代理的绑定会被合并。

**沙箱隔离浏览器** (`sandbox.browser.enabled`)：容器中的 Chromium + CDP。noVNC URL 被注入到系统提示中。不需要 `openclaw.json` 中的 `browser.enabled`。
noVNC 观察者访问默认使用 VNC 认证，并且 OpenClaw 会发出一个短期令牌 URL（而不是在共享 URL 中暴露密码）。

- `allowHostControl: false`（默认）阻止沙箱隔离会话定位主机浏览器。
- `network` 默认为 `openclaw-sandbox-browser`（专用桥接网络）。仅当您明确需要全局桥接连接时才设置为 `bridge`。
- `cdpSourceRange` 可选地将容器边缘的 CDP 入站限制为 CIDR 范围（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 仅将其他主机目录挂载到沙箱浏览器容器中。设置时（包括 `[]`），它将替换浏览器容器的 `docker.binds`。
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
  - `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu` 默认
    已启用，如果 WebGL/3D 使用需要，可以使用
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 禁用它们。
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 如果您的工作流程
    依赖扩展，则重新启用扩展。
  - `--renderer-process-limit=2` 可以使用
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 进行更改；设置 `0` 以使用 Chromium 的
    默认进程限制。
  - 当启用 `noSandbox` 时加上 `--no-sandbox`。
  - 默认值是容器镜像基线；使用具有自定义入口点的自定义浏览器镜像来更改容器默认值。

</Accordion>

浏览器沙箱隔离和 `sandbox.docker.binds` 仅支持 Docker。

构建镜像：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

### `agents.list`（每个代理的覆盖设置）

使用 `agents.list[].tts` 为代理指定其自己的 TTS 提供商、语音、模型、风格或自动 TTS 模式。代理块会对全局 `messages.tts` 进行深度合并，因此共享凭证可以保留在一个位置，而各个代理仅覆盖它们需要的语音或提供商字段。活动代理的覆盖设置适用于自动语音回复、`/tts audio`、`/tts status` 以及 `tts` 代理工具。有关提供商示例和优先级，请参阅[文本转语音](/zh/tools/tts#per-agent-voice-overrides)。

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
        agentRuntime: { id: "auto", fallback: "pi" },
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
- `default`：当设置了多个时，第一个生效（记录警告）。如果未设置，则第一个列表项为默认值。
- `model`：字符串形式仅覆盖 `primary`；对象形式 `{ primary, fallbacks }` 同时覆盖两者（`[]` 禁用全局回退）。仅覆盖 `primary` 的定时任务仍会继承默认回退，除非您设置了 `fallbacks: []`。
- `params`：合并到 `agents.defaults.models` 中所选模型条目的每个代理流参数。使用它来进行特定于代理的覆盖（如 `cacheRetention`、`temperature` 或 `maxTokens`），而无需复制整个模型目录。
- `tts`：可选的每个代理文本转语音覆盖设置。该块会对 `messages.tts` 进行深度合并，因此请将共享的提供商凭证和回退策略保留在 `messages.tts` 中，并在此处仅设置特定于角色的值，例如提供商、语音、模型、风格或自动模式。
- `skills`：可选的每个代理技能允许列表。如果省略，代理在设置了 `agents.defaults.skills` 时会继承它；显式列表将替换默认值而不是合并，而 `[]` 表示没有技能。
- `thinkingDefault`：可选的每个 Agent 默认思考级别 (`off | minimal | low | medium | high | xhigh | adaptive | max`)。当未设置每条消息或会话覆盖时，覆盖此 Agent 的 `agents.defaults.thinkingDefault`。选定的提供商/模型配置控制哪些值有效；对于 Google Gemini，`adaptive` 保持提供商拥有的动态思考（在 Gemini 3/3.1 上省略 `thinkingLevel`，在 Gemini 2.5 上省略 `thinkingBudget: -1`）。
- `reasoningDefault`：可选的每个 Agent 默认推理可见性 (`on | off | stream`)。在未设置每条消息或会话推理覆盖时应用。
- `fastModeDefault`：可选的每个 Agent 默认快速模式 (`true | false`)。在未设置每条消息或会话快速模式覆盖时应用。
- `agentRuntime`：可选的每个 Agent 低级运行时策略覆盖。使用 `{ id: "codex" }` 使一个 Agent 仅限 Codex，而其他 Agent 在 `auto` 模式下保持默认的 PI 回退。
- `runtime`：可选的每个 Agent 运行时描述符。当 Agent 默认使用 ACP 驱动会话时，使用带有 `runtime.acp` 默认值 (`agent`, `backend`, `mode`, `cwd`) 的 `type: "acp"`。
- `identity.avatar`：工作区相对路径、`http(s)` URL 或 `data:` URI。
- `identity` 推导默认值：从 `emoji` 推导 `ackReaction`，从 `name`/`emoji` 推导 `mentionPatterns`。
- `subagents.allowAgents`：显式 `sessions_spawn.agentId` 目标的 Agent ID 允许列表（`["*"]` = 任意；默认值：仅限同一 Agent）。当应允许自定目标 `agentId` 调用时，请包含请求者 ID。
- 沙箱继承保护：如果请求方会话处于沙箱隔离状态，`sessions_spawn` 将拒绝以非沙箱隔离方式运行的目标。
- `subagents.requireAgentId`：当为 true 时，阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式选择配置文件；默认值：false）。

---

## 多代理路由

在一个 Gateway(网关) 内运行多个隔离的代理。请参阅 [Multi-Agent](/zh/concepts/multi-agent)。

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

- `type` (可选)：`route` 用于普通路由（缺少类型时默认为 route），`acp` 用于持久化 ACP 会话绑定。
- `match.channel` (必需)
- `match.accountId` (可选；`*` = 任意账户；省略 = 默认账户)
- `match.peer` (可选；`{ kind: direct|group|channel, id }`)
- `match.guildId` / `match.teamId` (可选；特定于渠道)
- `acp` (可选；仅限 `type: "acp"`)：`{ mode, label, cwd, backend }`

**确定性匹配顺序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` (精确，无 peer/guild/team)
5. `match.accountId: "*"` (渠道范围)
6. 默认代理

在每个层级中，第一个匹配的 `bindings` 条目获胜。

对于 `type: "acp"` 条目，OpenClaw 根据确切的会话身份 (`match.channel` + account + `match.peer.id`) 进行解析，并且不使用上述路由绑定层级顺序。

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

<Accordion title="无文件系统访问权限（仅消息传递）">

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

有关优先级详细信息，请参阅 [Multi-Agent 沙箱 & Tools](/zh/tools/multi-agent-sandbox-tools)。

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
    parentForkMaxTokens: 100000, // skip parent-thread fork above this token count (0 disables)
    maintenance: {
      mode: "warn", // warn | enforce
      pruneAfter: "30d",
      maxEntries: 500,
      rotateBytes: "10mb",
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

<Accordion title="会话字段详情">

- **`scope`**: 群聊上下文的基础会话分组策略。
  - `per-sender` (默认): 每个发送者在渠道上下文中获得一个独立的会话。
  - `global`: 渠道上下文中的所有参与者共享一个会话（仅在旨在共享上下文时使用）。
- **`dmScope`**: 私信的分组方式。
  - `main`: 所有私信共享主会话。
  - `per-peer`: 跨渠道按发送者 ID 隔离。
  - `per-channel-peer`: 按渠道 + 发送者隔离（推荐用于多用户收件箱）。
  - `per-account-channel-peer`: 按账户 + 渠道 + 发送者隔离（推荐用于多账户）。
- **`identityLinks`**: 将规范 ID 映射到提供商前缀的对等端，以实现跨渠道会话共享。
- **`reset`**: 主重置策略。`daily` 在 `atHour` 本地时间重置；`idle` 在 `idleMinutes` 后重置。当两者都配置时，以先过期的为准。每日重置的新鲜度使用会话行的 `sessionStartedAt`；空闲重置的新鲜度使用 `lastInteractionAt`。后台/系统事件写入（如心跳、cron 唤醒、执行通知和网关记录）可以更新 `updatedAt`，但它们不会使每日/空闲会话保持新鲜。
- **`resetByType`**: 按类型覆盖 (`direct`, `group`, `thread`)。旧版 `dm` 被接受为 `direct` 的别名。
- **`parentForkMaxTokens`**: 创建分叉线程会话时允许的最大父会话 `totalTokens` (默认 `100000`)。
  - 如果父 `totalTokens` 高于此值，OpenClaw 将启动一个新的线程会话，而不是继承父级记录历史。
  - 设置 `0` 以禁用此保护并始终允许父级分叉。
- **`mainKey`**: 旧字段。运行时始终对主直接聊天存储桶使用 `"main"`。
- **`agentToAgent.maxPingPongTurns`**: 代理之间在代理对代理交换期间的最大回复轮次（整数，范围：`0`–`5`)。`0` 禁用乒乓链接。
- **`sendPolicy`**: 按 `channel`、`chatType` (`direct|group|channel`，带有旧版 `dm` 别名)、`keyPrefix` 或 `rawKeyPrefix` 匹配。先拒绝者胜。
- **`maintenance`**: 会话存储清理 + 保留控制。
  - `mode`: `warn` 仅发出警告；`enforce` 应用清理。
  - `pruneAfter`: 陈旧条目的年龄截止值（默认 `30d`）。
  - `maxEntries`: `sessions.json` 中的最大条目数（默认 `500`）。运行时写入会批量清理，并为生产级上限设置一个小的高位缓冲区；`openclaw sessions cleanup --enforce` 会立即应用上限。
  - `rotateBytes`: 当 `sessions.json` 超过此大小时轮换它（默认 `10mb`）。
  - `resetArchiveRetention`: `*.reset.<timestamp>` 记录存档的保留期。默认为 `pruneAfter`；设置 `false` 以禁用。
  - `maxDiskBytes`: 可选的会话目录磁盘预算。在 `warn` 模式下，它记录警告；在 `enforce` 模式下，它首先删除最旧的人工制品/会话。
  - `highWaterBytes`: 预算清理后的可选目标。默认为 `maxDiskBytes` 的 `80%`。
- **`threadBindings`**: 线程绑定会话功能的全局默认值。
  - `enabled`: 主默认开关（提供商可以覆盖；Discord 使用 `channels.discord.threadBindings.enabled`）
  - `idleHours`: 默认的非活动自动失去焦点时间，以小时为单位（`0` 禁用；提供商可以覆盖）
  - `maxAgeHours`: 默认的硬性最大年龄，以小时为单位（`0` 禁用；提供商可以覆盖）

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
      mode: "collect", // steer | followup | collect | steer-backlog | steer+backlog | queue | interrupt
      debounceMs: 1000,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "collect",
        telegram: "collect",
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

按渠道/账户覆盖：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析顺序（最具体的优先）：account → 渠道 → global。`""` 将禁用并停止级联。`"auto"` 派生 `[{identity.name}]`。

**模板变量：**

| 变量              | 描述           | 示例                        |
| ----------------- | -------------- | --------------------------- |
| `{model}`         | 短模型名称     | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型标识符 | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供商名称     | `anthropic`                 |
| `{thinkingLevel}` | 当前思考级别   | `high`、`low`、`off`        |
| `{identity.name}` | Agent 身份名称 | （同 `"auto"`）             |

变量不区分大小写。`{think}` 是 `{thinkingLevel}` 的别名。

### 确认反应

- 默认为活动 agent 的 `identity.emoji`，否则为 `"👀"`。设置 `""` 以禁用。
- 按渠道覆盖：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析顺序：account → 渠道 → `messages.ackReaction` → identity fallback。
- 范围：`group-mentions`（默认）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在支持反应的渠道（如 Slack、Discord、Telegram、WhatsApp 和 BlueBubbles）上，回复后移除确认反应。
- `messages.statusReactions.enabled`：在 Slack、Discord 和 Telegram 上启用生命周期状态反应。
  在 Slack 和 Discord 上，未设置时会在确认反应活动时保持启用状态反应。
  在 Telegram 上，将其显式设置为 `true` 以启用生命周期状态反应。

### 入站防抖

将同一发送者发送的快速纯文本消息合并为单个 agent 回合。媒体/附件会立即刷新。控制命令绕过防抖。

### TTS（文本转语音）

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all
      provider: "elevenlabs",
      summaryModel: "openai/gpt-4.1-mini",
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

- `auto` 控制默认的自动 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可以覆盖本地首选项，`/tts status` 显示有效状态。
- `summaryModel` 覆盖 `agents.defaults.model.primary` 用于自动摘要。
- `modelOverrides` 默认启用；`modelOverrides.allowProvider` 默认为 `false`（选择性加入）。
- API 密钥回退到 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- 捆绑的语音提供商归插件所有。如果设置了 `plugins.allow`，请包含每个您想使用的 TTS 提供商插件，例如用于 Edge TTS 的 `microsoft`。传统的 `edge` 提供商 ID 被接受为 `microsoft` 的别名。
- `providers.openai.baseUrl` 覆盖 OpenAI TTS 端点。解析顺序为配置，然后是 `OPENAI_TTS_BASE_URL`，接着是 `https://api.openai.com/v1`。
- 当 `providers.openai.baseUrl` 指向非 OpenAI 端点时，OpenClaw 将其视为 OpenAI 兼容的 TTS 服务器，并放宽模型/语音验证。

---

## Talk

Talk 模式的默认值（macOS/iOS/Android）。

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
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

- 当配置了多个 Talk 提供商时，`talk.provider` 必须匹配 `talk.providers` 中的一个键。
- 传统的扁平 Talk 键（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）仅用于兼容性，并会自动迁移到 `talk.providers.<provider>` 中。
- 语音 ID 回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受纯文本字符串或 SecretRef 对象。
- `ELEVENLABS_API_KEY` 回退仅在未配置 Talk API 密钥时应用。
- `providers.*.voiceAliases` 允许 Talk 指令使用友好名称。
- `providers.mlx.modelId` 选择 macOS 本地 MLX 助手使用的 Hugging Face 仓库。如果省略，macOS 将使用 `mlx-community/Soprano-80M-bf16`。
- macOS MLX 播放在存在时通过捆绑的 `openclaw-mlx-tts` 助手运行，或者在 `PATH` 上运行可执行文件；`OPENCLAW_MLX_TTS_BIN` 覆盖开发时的助手路径。
- `speechLocale` 设置 iOS/macOS Talk 语音识别使用的 BCP 47 区域设置 ID。保持未设置以使用设备默认值。
- `silenceTimeoutMs` 控制 Talk 模式在用户停止说话后发送转录文本之前等待的时长。未设置将保留平台默认的暂停窗口 (`700 ms on macOS and Android, 900 ms on iOS`)。

---

## 相关

- [配置参考](/zh/gateway/configuration-reference) — 所有其他配置键
- [配置](/zh/gateway/configuration) — 常见任务和快速设置
- [配置示例](/zh/gateway/configuration-examples)
