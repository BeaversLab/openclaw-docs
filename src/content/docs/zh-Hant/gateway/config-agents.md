---
summary: "Agent defaults, multi-agent routing, session, messages, and talk config"
read_when:
  - Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills)
  - Configuring multi-agent routing and bindings
  - Adjusting session, message delivery, and talk-mode behavior
title: "Configuration — agents"
---

`agents.*`、`multiAgent.*`、`session.*`、
`messages.*` 和 `talk.*` 下的 Agent 作用域配置鍵。有關通道、工具、Gateway 執行時間和其他
頂層鍵，請參閱 [Configuration reference](/zh-Hant/gateway/configuration-reference)。

## Agent defaults

### `agents.defaults.workspace`

預設值：`~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

### `agents.defaults.repoRoot`

顯示在系統提示詞 Runtime 行中的可選儲存庫根目錄。如果未設定，OpenClaw 會透過從工作區向上遍歷自動偵測。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

針對未設定
`agents.list[].skills` 的 Agent 的可選預設技能允許清單。

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

- 省略 `agents.defaults.skills` 以預設允許無限制的技能。
- 省略 `agents.list[].skills` 以繼承預設值。
- 設定 `agents.list[].skills: []` 表示不使用任何技能。
- 非空的 `agents.list[].skills` 列表是該 Agent 的最終集合；
  它不會與預設值合併。

### `agents.defaults.skipBootstrap`

停用工作區引導檔案（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）的自動建立。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.contextInjection`

控制何時將工作區引導檔案注入系統提示詞。預設值：`"always"`。

- `"continuation-skip"`：安全延續回合（在完成助理回應之後）會跳過工作區引導檔案的重新注入，以減少提示詞大小。Heartbeat 執行和壓縮後的重試仍會重建上下文。
- `"never"`: 在每輪對話中停用工作區引導和上下文檔案注入。僅對完全擁有提示生命週期的代理程式使用此設定（自訂上下文引擎、自行建立上下文的原生執行時，或專用的無引導工作流程）。心跳和壓縮恢復輪次也會跳過注入。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

### `agents.defaults.bootstrapMaxChars`

每個工作區引導檔案在截斷前的最大字元數。預設值：`12000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

所有工作區引導檔案中注入的總字元數上限。預設值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

當引導上下文被截斷時，控制代理程式可見的警告文字。
預設值：`"once"`。

- `"off"`: 絕不將警告文字注入到系統提示中。
- `"once"`: 針對每個唯一的截斷簽章注入一次警告（建議）。
- `"always"`: 只要存在截斷，每次執行時都注入警告。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### Context budget ownership map

OpenClaw 擁有多個高容量的提示/上下文預算，它們是
依據子系統進行有意劃分，而不是全部透過一個通用的
旋鈕來控制。

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars`:
  正常的工作區引導注入。
- `agents.defaults.startupContext.*`:
  一次性 `/new` 和 `/reset` 啟動前導，包括最近的每日
  `memory/*.md` 檔案。
- `skills.limits.*`:
  注入到系統提示中的精簡技能列表。
- `agents.defaults.contextLimits.*`:
  有界的執行時摘錄和注入的執行時擁有區塊。
- `memory.qmd.limits.*`:
  索引化的記憶體搜尋片段和注入大小調整。

僅當某個代理程式需要不同的預算時，才使用相符的個別代理程式覆寫：

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

控制注入到純 `/new` 和 `/reset`
執行的首輪啟動前導。

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

有界執行時上下文層面的共用預設值。

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

- `memoryGetMaxChars`：在截斷之前的預設 `memory_get` 摘要上限
  此時會加入元資料和續接通知。
- `memoryGetDefaultLines`：當省略 `lines` 時使用的預設 `memory_get` 行視窗。
- `toolResultMaxChars`：用於持久化結果和溢出恢復的即時工具結果上限。
- `postCompactionMaxChars`：在壓縮後重新整理注入期間使用的 AGENTS.md 摘要上限。

#### `agents.list[].contextLimits`

針對共享 `contextLimits` 設定的個別 Agent 覆寫值。省略的欄位將繼承自 `agents.defaults.contextLimits`。

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

注入至系統提示之精簡技能清單的全域上限。這不影響隨需讀取 `SKILL.md` 檔案。

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

針對技能提示預算的個別 Agent 覆寫值。

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

在提供者呼叫之前，逐字稿/工具圖像區塊中最長圖像邊的最大像素尺寸。
預設值：`1200`。

較低的值通常能減少視覺 Token 的使用量，以及截圖密集執行時的要求承載大小。
較高的值則能保留更多視覺細節。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

系統提示內容的時區（非訊息時間戳記）。若未設定則回退至主機時區。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系統提示中的時間格式。預設值：`auto`（作業系統偏好設定）。

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

- `model`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 字串形式僅設定主要模型。
  - 物件形式設定主要模型以及有序的故障轉移模型。
- `imageModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由 `image` 工具路徑用作其視覺模型設定。
  - 當選取的/預設模型無法接受圖像輸入時，也會用作故障轉移路由。
- `imageGenerationModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由共享的影像生成功能以及任何未來生成影像的工具/插件介面使用。
  - 典型值：`google/gemini-3.1-flash-image-preview` 用於原生的 Gemini 影像生成，`fal/fal-ai/flux/dev` 用於 fal，`openai/gpt-image-2` 用於 OpenAI Images，或 `openai/gpt-image-1.5` 用於透明背景的 OpenAI PNG/WebP 輸出。
  - 如果您直接選擇供應商/模型，請同時設定相符的供應商驗證（例如 `google/*` 的 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，`openai/gpt-image-2` / `openai/gpt-image-1.5` 的 `OPENAI_API_KEY` 或 OpenAI Codex OAuth，`fal/*` 的 `FAL_KEY`）。
  - 如果省略，`image_generate` 仍然可以推斷出支援驗證的供應商預設值。它會先嘗試目前的預設供應商，然後依照供應商 ID 順序嘗試剩餘已註冊的影像生成供應商。
- `musicGenerationModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由共享的音樂生成功能和內建的 `music_generate` 工具使用。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.6`。
  - 如果省略，`music_generate` 仍然可以推斷出支援驗證的供應商預設值。它會先嘗試目前的預設供應商，然後依照供應商 ID 順序嘗試剩餘已註冊的音樂生成供應商。
  - 如果您直接選擇供應商/模型，請同時設定相符的供應商驗證/API 金鑰。
- `videoGenerationModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由共享的影片生成功能和內建的 `video_generate` 工具使用。
  - 常見值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍可推斷出支援驗證的提供者預設值。它會先嘗試當前的預設提供者，然後按照提供者 ID 順序嘗試剩餘的已註冊影片生成提供者。
  - 如果您直接選擇提供者/模型，請同時設定相符的提供者驗證/API 金鑰。
  - 隨附的 Qwen 影片生成提供者最多支援 1 個輸出影片、1 個輸入圖片、4 個輸入影片、10 秒持續時間，以及提供者層級的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 選項。
- `pdfModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 用於模型路由的 `pdf` 工具。
  - 如果省略，PDF 工具會回退到 `imageModel`，然後是已解析的會話/預設模型。
- `pdfMaxBytesMb`：當在呼叫時未傳遞 `maxBytesMb` 時，`pdf` 工具的預設 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中提取回退模式考慮的預設最大頁數。
- `verboseDefault`：代理程式的預設詳細層級。值：`"off"`、`"on"`、`"full"`。預設值：`"off"`。
- `elevatedDefault`：代理程式的預設提升輸出層級。值：`"off"`、`"on"`、`"ask"`、`"full"`。預設值：`"on"`。
- `model.primary`：格式 `provider/model`（例如 `openai/gpt-5.5` 用於 API 金鑰存取，或 `openai-codex/gpt-5.5` 用於 Codex OAuth）。如果您省略提供者，OpenClaw 會先嘗試別名，然後是該確切模型 ID 的唯一已配置提供者匹配項，只有在這之後才回退到已配置的預設提供者（已棄用的相容性行為，因此偏好明確的 `provider/model`）。如果該提供者不再公開已配置的預設模型，OpenClaw 會回退到第一個已配置的提供者/模型，而不是顯示陳舊的已移除提供者預設值。
- `models`：`/model` 的已配置模型目錄和允許清單。每個條目可以包含 `alias`（捷徑）和 `params`（特定於提供者，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`、`responsesServerCompaction`、`responsesCompactThreshold`、`chat_template_kwargs`、`extra_body`/`extraBody`）。
  - 安全編輯：使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 新增條目。`config set` 會拒絕移除現有允許清單條目的替換操作，除非您傳遞 `--replace`。
  - 提供者範圍的配置/入站流程會將選定的提供者模型合併到此對應中，並保留已配置的不相關提供者。
  - 對於直接的 OpenAI Responses 模型，會自動啟用伺服器端壓縮。使用 `params.responsesServerCompaction: false` 停止注入 `context_management`，或使用 `params.responsesCompactThreshold` 覆寫閾值。請參閱 [OpenAI server-side compaction](/zh-Hant/providers/openai#server-side-compaction-responses-api)。
- `params`：套用於所有模型的全域預設提供者參數。在 `agents.defaults.params` 設定（例如 `{ cacheRetention: "long" }`）。
- `params` 合併優先順序（配置）：`agents.defaults.params`（全域基礎）會被 `agents.defaults.models["provider/model"].params`（每個模型）覆寫，然後 `agents.list[].params`（匹配的代理程式 id）會按鍵值覆寫。詳情請參閱[提示詞快取](/zh-Hant/reference/prompt-caching)。
- `params.extra_body`/`params.extraBody`：進階透傳 JSON，會合併至 OpenAI 相容代理程式的 `api: "openai-completions"` 請求主體中。如果與產生的請求鍵發生衝突，額外主體優先；非原生完成路由仍會在之後剝離僅 OpenAI 的 `store`。
- `params.chat_template_kwargs`：合併至頂層 `api: "openai-completions"` 請求主體的 vLLM/OpenAI 相容 chat-template 參數。對於關閉思考的 `vllm/nemotron-3-*`，隨附的 vLLM 外掛程式會自動發送 `enable_thinking: false` 和 `force_nonempty_content: true`；明確指定的 `chat_template_kwargs` 會覆寫產生的預設值，而 `extra_body.chat_template_kwargs` 仍具有最終優先權。對於 vLLM Qwen 思考控制，請將該模型條目上的 `params.qwenThinkingFormat` 設定為 `"chat-template"` 或 `"top-level"`。
- `params.preserveThinking`：僅限 Z.AI 的保留思考選用功能。啟用且思考開啟時，OpenClaw 會發送 `thinking.clear_thinking: false` 並重播先前的 `reasoning_content`；請參閱 [Z.AI 思考與保留思考](/zh-Hant/providers/zai#thinking-and-preserved-thinking)。
- `agentRuntime`：預設的低層級代理執行時原則。省略 ID 時預設為 OpenClaw Pi。使用 `id: "pi"` 強制使用內建的 PI 掛接器，使用 `id: "auto"` 讓已註冊的插件掛接器宣告支援的模型、使用已註冊的掛接器 ID（例如 `id: "codex"`），或使用支援的 CLI 後端別名（例如 `id: "claude-cli"`）。設定 `fallback: "none"` 以停用自動 PI 備援。除非您在同一個覆蓋範圍中設定 `fallback: "pi"`，否則明確的插件執行時（例如 `codex`）預設會失敗關閉。請保持模型參照為 `provider/model` 的標準形式；透過執行時設定來選擇 Codex、Claude CLI、Gemini CLI 和其他執行後端，而不是使用舊的執行時提供者前綴。請參閱 [Agent runtimes](/zh-Hant/concepts/agent-runtimes) 以了解這與提供者/模型選擇的差異。
- 修改這些欄位的配置寫入器（例如 `/models set`、`/models set-image` 和備援新增/移除指令）會儲存標準物件形式，並在可能時保留現有的備援清單。
- `maxConcurrent`：跨工作階段的最大平行代理執行次數（每個工作階段仍為序列化）。預設值：4。

### `agents.defaults.agentRuntime`

`agentRuntime` 控制執行代理輪次的低層級執行器。大多數部署應保持預設的 OpenClaw Pi 執行時。當受信任的插件提供原生掛接器（例如內建的 Codex app-server 掛接器）時，或是當您想要支援的 CLI 後端（例如 Claude CLI）時使用它。若要了解相關概念，請參閱 [Agent runtimes](/zh-Hant/concepts/agent-runtimes)。

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

- `id`：`"auto"`、`"pi"`、已註冊的插件掛接器 ID，或支援的 CLI 後端別名。內建的 Codex 插件會註冊 `codex`；內建的 Anthropic 插件會提供 `claude-cli` CLI 後端。
- `fallback`：`"pi"` 或 `"none"`。在 `id: "auto"` 中，如果省略，預設值會回退到 `"pi"`，以便當沒有 plugin harness 聲明執行時，舊的設定仍能繼續使用 PI。在明確的插件執行階段模式中，例如 `id: "codex"`，省略時的預設回退值為 `"none"`，這樣遺漏的 harness 會導致失敗，而不是無聲地使用 PI。執行階段覆蓋不會從更廣的範圍繼承回退值；當您有意需要該相容性回退時，請在明確執行階段旁邊設定 `fallback: "pi"`。選定的 plugin harness 失敗總是會直接顯示出來。
- 環境變數覆蓋：`OPENCLAW_AGENT_RUNTIME=<id|auto|pi>` 會覆蓋 `id`；`OPENCLAW_AGENT_HARNESS_FALLBACK=pi|none` 會覆蓋該程序的回退值。
- 對於僅使用 Codex 的部署，請設定 `model: "openai/gpt-5.5"` 和 `agentRuntime.id: "codex"`。為了提高可讀性，您也可以明確設定 `agentRuntime.fallback: "none"`，這是明確插件執行階段的預設值。
- 對於 Claude CLI 的部署，建議使用 `model: "anthropic/claude-opus-4-7"` 加上 `agentRuntime.id: "claude-cli"`。舊版 `claude-cli/claude-opus-4-7` 模型參考為了相容性仍然有效，但新設定應保持提供者/模型選擇的規範性，並將執行後端放在 `agentRuntime.id` 中。
- 較舊的執行階段策略金鑰會被 `openclaw doctor --fix` 重寫為 `agentRuntime`。
- 在第一次嵌入式執行後，Harness 選擇會依每個 session id 固定。設定/環境變數的變更會影響新建立的或重設的 session，而不會影響現有的對話記錄。具有對話記錄但沒有記錄釘選的舊版 session 會被視為已釘選到 PI。`/status` 會回報有效的執行階段，例如 `Runtime: OpenClaw Pi Default` 或 `Runtime: OpenAI Codex`。
- 這僅控制文字 agent 輪次的執行。媒體生成、視覺、PDF、音樂、視訊和 TTS 仍使用其提供者/模型設定。

**內建的別名簡寫**（僅在模型位於 `agents.defaults.models` 時適用）：

| 別名                | 模型                                       |
| ------------------- | ------------------------------------------ |
| `opus`              | `anthropic/claude-opus-4-6`                |
| `sonnet`            | `anthropic/claude-sonnet-4-6`              |
| `gpt`               | `openai/gpt-5.5` 或 `openai-codex/gpt-5.5` |
| `gpt-mini`          | `openai/gpt-5.4-mini`                      |
| `gpt-nano`          | `openai/gpt-5.4-nano`                      |
| `gemini`            | `google/gemini-3.1-pro-preview`            |
| `gemini-flash`      | `google/gemini-3-flash-preview`            |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview`     |

您配置的別名優先級始終高於預設值。

除非您設定 `--thinking off` 或自行定義 `agents.defaults.models["zai/<model>"].params.thinking`，否則 Z.AI GLM-4.x 模型會自動啟用思考模式。
Z.AI 模型預設針對工具呼叫串流啟用 `tool_stream`。將 `agents.defaults.models["zai/<model>"].params.tool_stream` 設定為 `false` 即可停用它。
Anthropic Claude 4.6 模型在未設定明確思考層級時，預設使用 `adaptive` 思考。

### `agents.defaults.cliBackends`

用於純文字備援執行（無工具呼叫）的可選 CLI 後端。當 API 提供商失效時，可作為備援使用。

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

- CLI 後端以文字為優先；工具始終停用。
- 當設定 `sessionArg` 時支援 Session。
- 當 `imageArg` 接受檔案路徑時，支援圖像傳遞。

### `agents.defaults.systemPromptOverride`

用固定字串取代整個 OpenClaw 組合的系統提示詞。可在預設層級 (`agents.defaults.systemPromptOverride`) 或各個代理程式 (`agents.list[].systemPromptOverride`) 設定。各個代理程式的值優先採用；空白或僅含空格的值會被忽略。適用於受控的提示詞實驗。

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

依模型系列套用的與供應商無關的提示詞疊加層。GPT-5 系列的模型 ID 會接收跨供應商的共用行為合約；`personality` 僅控制友善的互動風格層。

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

- `"friendly"`（預設）和 `"on"` 會啟用友善的互動風格層。
- `"off"` 僅停用友善層；帶有標籤的 GPT-5 行為合約仍保持啟用狀態。
- 當此共用設定未設定時，仍會讀取舊版的 `plugins.entries.openai.config.personality`。

### `agents.defaults.heartbeat`

週期性心跳執行。

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

- `every`：持續時間字串 (ms/s/m/h)。預設值：`30m` (API 金鑰驗證) 或 `1h` (OAuth 驗證)。設為 `0m` 以停用。
- `includeSystemPromptSection`：當為 false 時，會從系統提示中省略 Heartbeat 區段，並跳過將 `HEARTBEAT.md` 注入至啟動語境中。預設值：`true`。
- `suppressToolErrorWarnings`：當為 true 時，會在心跳執行期間隱藏工具錯誤警示酬載。
- `timeoutSeconds`：心跳代理回合在中止前所允許的最長時間（秒）。若不設定，則使用 `agents.defaults.timeoutSeconds`。
- `directPolicy`：直接/DM 傳遞原則。`allow` (預設) 允許直接目標傳遞。`block` 則抑制直接目標傳遞並發出 `reason=dm-blocked`。
- `lightContext`：當為 true 時，心跳執行會使用輕量級啟動語境，並僅保留工作區啟動檔案中的 `HEARTBEAT.md`。
- `isolatedSession`：當為 true 時，每次心跳都在全新的工作階段中執行，沒有先前的對話歷史。與 cron `sessionTarget: "isolated"` 具有相同的隔離模式。將每次心跳的 token 成本從約 100K 降低至約 2-5K 個 token。
- 每個代理：設定 `agents.list[].heartbeat`。當任何代理定義了 `heartbeat`，**僅有那些代理** 會執行心跳。
- 心跳會執行完整的代理回合 — 較短的間隔會消耗更多 token。

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

- `mode`：`default` 或 `safeguard` (針對長歷史的分塊摘要)。請參閱 [壓縮](/zh-Hant/concepts/compaction)。
- `provider`：已註冊壓縮提供者外掛程式的 ID。設定後，會呼叫提供者的 `summarize()`，而不是內建的 LLM 摘要。失敗時會回退到內建機制。設定提供者會強制執行 `mode: "safeguard"`。請參閱 [壓縮](/zh-Hant/concepts/compaction)。
- `timeoutSeconds`：OpenClaw 中止單一壓縮作業前允許的最大秒數。預設值：`900`。
- `keepRecentTokens`：用於逐字保留最新逐字稿結尾的 Pi 切割點預算。手動 `/compact` 在明確設定時會遵守此設定；否則手動壓縮為硬檢查點。
- `identifierPolicy`：`strict`（預設值）、`off` 或 `custom`。`strict` 會在壓縮摘要期間前置內建的不透明識別碼保留指引。
- `identifierInstructions`：當使用 `identifierPolicy=custom` 時所使用的選用自訂識別碼保留文字。
- `qualityGuard`：檢查安全摘要的輸出格式錯誤重試。在安全模式下預設為啟用；設定 `enabled: false` 以跳過稽核。
- `postCompactionSections`：用於在壓縮後重新注入的選用 AGENTS.md H2/H3 章節名稱。預設值為 `["Session Startup", "Red Lines"]`；設定 `[]` 可停用重新注入。當未設定或明確設為該預設組時，較舊的 `Every Session`/`Safety` 標題也會被接受作為舊版回退。
- `model`：僅用於壓縮摘要的選用 `provider/model-id` 覆寫值。當主工作階段應保留一個模型但壓縮摘要應在另一個模型上執行時使用此設定；當未設定時，壓縮會使用工作階段的主要模型。
- `maxActiveTranscriptBytes`：選用的位元組閾值（`number` 或如 `"20mb"` 的字串），當使用中的 JSONL 超過該閾值時，會在執行前觸發正常的本地壓縮。需要設定 `truncateAfterCompaction`，以便成功的壓縮可以輪換到較小的後續逐字稿。若未設定或設為 `0` 則停用。
- `notifyUser`：當為 `true` 時，會在壓縮開始和完成時向使用者發送簡短通知（例如「Compacting context...」和「Compaction complete」）。預設為停用以保持壓縮為靜音模式。
- `memoryFlush`：在自動壓縮前的靜音代理回合，以儲存持久記憶。當工作區為唯讀時會跳過。

### `agents.defaults.contextPruning`

在發送至 LLM 之前，從記憶體中的內容修剪**舊的工具結果**。**不會**修改磁碟上的工作階段歷史記錄。

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

<Accordion title="cache-ttl 模式行為">

- `mode: "cache-ttl"` 啟用修剪通過。
- `ttl` 控制修剪可以再次執行的頻率（在最後一次快取存取之後）。
- 修剪會先軟修剪超大的工具結果，然後在需要時硬清除較舊的工具結果。

**軟修剪**保留開頭 + 結尾，並在中間插入 `...`。

**硬清除**會將整個工具結果替換為預留位置。

備註：

- 影像區塊絕不會被修剪/清除。
- 比例是基於字元（大約），而非精確的 token 數量。
- 如果存在的助理訊息少於 `keepLastAssistants` 則，則會跳過修剪。

</Accordion>

有關行為的詳細資訊，請參閱[工作階段修剪](/zh-Hant/concepts/session-pruning)。

### 區塊串流

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

- 非 Telegram 頻道需要明確設定 `*.blockStreaming: true` 才能啟用區塊回覆。
- 頻道覆寫：`channels.<channel>.blockStreamingCoalesce`（以及每個帳號的變體）。Signal/Slack/Discord/Google Chat 預設為 `minChars: 1500`。
- `humanDelay`：區塊回覆之間的隨機暫停。`natural` = 800–2500ms。每個代理的覆寫：`agents.list[].humanDelay`。

請參閱 [串流](/zh-Hant/concepts/streaming) 以了解行為 + 分塊的詳細資訊。

### 輸入指示器

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

- 預設值：直接聊天/提及時為 `instant`，未提及的群組聊天時為 `message`。
- 各個工作階段覆寫：`session.typingMode`、`session.typingIntervalSeconds`。

請參閱 [輸入指示器](/zh-Hant/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

嵌入式代理的可選沙箱機制。請參閱 [沙箱機制](/zh-Hant/gateway/sandboxing) 以取得完整指南。

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

<Accordion title="Sandbox 詳情">

**後端：**

- `docker`：本機 Docker 執行階段（預設）
- `ssh`：通用 SSH 支援的遠端執行階段
- `openshell`：OpenShell 執行階段

當選取 `backend: "openshell"` 時，執行階段特定設定會移至
`plugins.entries.openshell.config`。

**SSH 後端設定：**

- `target`：`user@host[:port]` 格式的 SSH 目標
- `command`：SSH 用戶端指令（預設：`ssh`）
- `workspaceRoot`：用於各個範圍工作區的絕對遠端根目錄
- `identityFile` / `certificateFile` / `knownHostsFile`：傳遞給 OpenSSH 的現有本機檔案
- `identityData` / `certificateData` / `knownHostsData`：OpenClaw 在執行階段具現化為暫存檔案的內嵌內容或 SecretRef
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主機金鑰策略控制項

**SSH 認證優先順序：**

- `identityData` 優先於 `identityFile`
- `certificateData` 優先於 `certificateFile`
- `knownHostsData` 優先於 `knownHostsFile`
- SecretRef 支援的 `*Data` 值會在沙盒工作階段開始前，從作用中的 secrets 執行階段快照中解析

**SSH 後端行為：**

- 在建立或重新建立後，種植遠端工作區一次
- 然後保持遠端 SSH 工作區為基準
- 透過 SSH 路由 `exec`、檔案工具和媒體路徑
- 不會自動將遠端變更同步回主機
- 不支援沙盒瀏覽器容器

**工作區存取：**

- `none`：`~/.openclaw/sandboxes` 下的各範圍沙盒工作區
- `ro`：`/workspace` 處的沙盒工作區，代理工作區以唯讀方式掛載於 `/agent`
- `rw`：代理工作區以讀寫方式掛載於 `/workspace`

**範圍：**

- `session`：各工作階段容器 + 工作區
- `agent`：每個代理一個容器 + 工作區（預設）
- `shared`：共享容器和工作區（無跨工作階段隔離）

**OpenShell 外掛程式設定：**

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

- `mirror`：在執行前從本機種植遠端，執行後同步回來；本機工作區保持為基準
- `remote`：在建立沙盒時種植遠端一次，然後保持遠端工作區為基準

在 `remote` 模式下，在 OpenClaw 外部進行的本機主機編輯不會在種植步驟後自動同步到沙盒中。
傳輸是透過 SSH 進入 OpenShell 沙盒，但外掛程式擁有沙盒生命週期和選用鏡像同步。

**`setupCommand`** 會在容器建立後執行一次（透過 `sh -lc`）。需要網路出口、可寫入根目錄、root 使用者。

**容器預設為 `network: "none"`** — 如果代理需要存取權限，請設定為 `"bridge"`（或自訂橋接網路）。
`"host"` 已被封鎖。`"container:<id>"` 預設已被封鎖，除非您明確設定
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（緊急存取）。

**傳入附件** 會暫存至作用中工作區中的 `media/inbound/*`。

**`docker.binds`** 會掛載額外的主機目錄；全域和各代理的綁定會合併。

**沙盒瀏覽器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 會注入到系統提示中。不需要 `browser.enabled` 於 `openclaw.json` 中。
noVNC 觀察者存取預設使用 VNC 認證，且 OpenClaw 會發出短期有效的 token URL（而不是在共享 URL 中暴露密碼）。

- `allowHostControl: false`（預設）會封鎖沙盒工作階段將目標設為主機瀏覽器。
- `network` 預設為 `openclaw-sandbox-browser`（專用橋接網路）。僅在您明確需要全域橋接連線時才設定為 `bridge`。
- `cdpSourceRange` 可選地將容器邊緣的 CDP 連入限制為 CIDR 範圍（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 僅將額外主機目錄掛載至沙盒瀏覽器容器。設定時（包括 `[]`），它會取代瀏覽器容器的 `docker.binds`。
- 啟動預設值定義於 `scripts/sandbox-browser-entrypoint.sh` 中，並針對容器主機進行調整：
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
  - `--disable-extensions`（預設啟用）
  - `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu`
    預設為啟用，且如果 WebGL/3D 使用有需要，可以使用
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 停用。
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 如果您的工作流程
    依賴擴充功能，則會重新啟用它們。
  - `--renderer-process-limit=2` 可以使用
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 變更；設定 `0` 以使用 Chromium 的
    預設程序限制。
  - 加上啟用 `noSandbox` 時的 `--no-sandbox`。
  - 預設值是容器映像檔基準；使用具有自訂進入點的自訂瀏覽器映像檔來變更容器預設值。

</Accordion>

瀏覽器沙箱和 `sandbox.docker.binds` 僅適用於 Docker。

建置映像檔：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

### `agents.list` (每個代理的覆寫)

使用 `agents.list[].tts` 為代理提供其專屬的 TTS 提供者、語音、模型、風格或自動 TTS 模式。代理區塊會與全域 `messages.tts` 進行深度合併，因此共享的憑證可以保留在一個地方，而個別代理僅需覆寫它們需要的語音或提供者欄位。作用中代理的覆寫會套用至自動語音回覆、`/tts audio`、`/tts status` 以及 `tts` 代理工具。請參閱 [文字轉語音](/zh-Hant/tools/tts#per-agent-voice-overrides) 以了解提供者範例和優先順序。

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

- `id`: 穩定的代理 ID (必要)。
- `default`: 當設定了多個時，優先採用第一個 (會記錄警告)。如果皆未設定，清單中的第一個項目為預設值。
- `model`: 字串形式僅覆寫 `primary`；物件形式 `{ primary, fallbacks }` 則覆寫兩者 (`[]` 會停用全域備援)。僅覆寫 `primary` 的 Cron 作業仍會繼承預設備援，除非您設定了 `fallbacks: []`。
- `params`: 每個代理的串流參數，會與 `agents.defaults.models` 中選取的模型項目合併。使用此設定可針對特定代理進行覆寫，例如 `cacheRetention`、`temperature` 或 `maxTokens`，而無需重複整個模型目錄。
- `tts`: 選用的每個代理文字轉語音覆寫。該區塊會與 `messages.tts` 深度合併，因此請將共享的提供者憑證和備援政策保留在 `messages.tts` 中，並在此僅設定與角色相關的數值，例如提供者、語音、模型、風格或自動模式。
- `skills`: 選用的每個代理技能允許清單。如果省略，代理會在設定了 `agents.defaults.skills` 時繼承它；明確的清單會取代預設值而非合併，而 `[]` 表示沒有技能。
- `thinkingDefault`：可選的每個 Agent 預設思考層級 (`off | minimal | low | medium | high | xhigh | adaptive | max`)。當未設定每則訊息或工作階段覆寫時，會覆寫此 Agent 的 `agents.defaults.thinkingDefault`。選取的提供者/模型設定檔會控制哪些值有效；對於 Google Gemini，`adaptive` 會保留提供者擁有的動態思考 (Gemini 3/3.1 上省略 `thinkingLevel`，Gemini 2.5 上省略 `thinkingBudget: -1`)。
- `reasoningDefault`：可選的每個 Agent 預設推理可見性 (`on | off | stream`)。當未設定每則訊息或工作階段推理覆寫時套用。
- `fastModeDefault`：可選的每個 Agent 快速模式預設值 (`true | false`)。當未設定每則訊息或工作階段快速模式覆寫時套用。
- `agentRuntime`：可選的每個 Agent 低層級執行時期策略覆寫。使用 `{ id: "codex" }` 讓其中一個 Agent 僅使用 Codex，而其他 Agent 則在 `auto` 模式下保留預設的 PI 備援。
- `runtime`：可選的每個 Agent 執行時期描述元。當 Agent 應預設為 ACP 駕馭工作階段時，使用 `type: "acp"` 搭配 `runtime.acp` 預設值 (`agent`、`backend`、`mode`、`cwd`)。
- `identity.avatar`：工作區相對路徑、`http(s)` URL 或 `data:` URI。
- `identity` 推導預設值：從 `emoji` 推導 `ackReaction`，從 `name`/`emoji` 推導 `mentionPatterns`。
- `subagents.allowAgents`：用於明確 `sessions_spawn.agentId` 目標的 Agent ID 允許清單 (`["*"]` = 任意；預設值：僅限相同 Agent)。當應允許自我目標的 `agentId` 呼叫時，請包含請求者 ID。
- 沙箱繼承防護：如果請求者的會話處於沙箱模式，`sessions_spawn` 將拒絕會以非沙箱模式執行的目標。
- `subagents.requireAgentId`：當為 true 時，封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確選擇設定檔；預設值：false）。

---

## 多代理程式路由

在一個 Gateway 中執行多個隔離的代理程式。請參閱 [Multi-Agent](/zh-Hant/concepts/multi-agent)。

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

### 綁定匹配欄位

- `type` (可選)：用於一般路由的 `route` (缺少類型時預設為 route)，用於持久化 ACP 對話綁定的 `acp`。
- `match.channel` (必填)
- `match.accountId` (可選；`*` = 任何帳戶；省略 = 預設帳戶)
- `match.peer` (可選；`{ kind: direct|group|channel, id }`)
- `match.guildId` / `match.teamId` (可選；特定於頻道)
- `acp` (可選；僅用於 `type: "acp"`)：`{ mode, label, cwd, backend }`

**確定性匹配順序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` (精確，無 peer/guild/team)
5. `match.accountId: "*"` (頻道範圍)
6. 預設代理程式

在每個層級中，第一個匹配的 `bindings` 項目獲勝。

對於 `type: "acp"` 項目，OpenClaw 會根據精確的對話身分 (`match.channel` + account + `match.peer.id`) 進行解析，並不使用上述路由綁定層級順序。

### 每個代理程式的存取設定檔

<Accordion title="完整存取權 (無沙箱)">

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

<Accordion title="唯讀工具 + 工作區">

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

<Accordion title="無檔案系統存取權 (僅訊息傳遞)">

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

關於優先順序的詳細資訊，請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools)。

---

## 會話

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

<Accordion title="Session field details">

- **`scope`**: 群組聊天語境的基礎會話分組策略。
  - `per-sender` (預設)：每個發送者在頻道語境中獲得一個獨立的會話。
  - `global`：頻道語境中的所有參與者共享單一會話（僅在預期共享語境時使用）。
- **`dmScope`**: DM 如何分組。
  - `main`：所有 DM 共享主會話。
  - `per-peer`：跨頻道按發送者 ID 隔離。
  - `per-channel-peer`：按頻道 + 發送者隔離（建議用於多使用者收件匣）。
  - `per-account-channel-peer`：按帳戶 + 頻道 + 發送者隔離（建議用於多帳戶）。
- **`identityLinks`**: 將規範 ID 映射到提供者前綴的對等點，以實現跨頻道會話共享。
- **`reset`**: 主要重置策略。 `daily` 在 `atHour` 本地時間重置； `idle` 在 `idleMinutes` 後重置。當兩者都配置時，以先過期者為準。每日重置新鮮度使用會話行的 `sessionStartedAt`；閒置重置新鮮度使用 `lastInteractionAt`。背景/系統事件寫入（例如心跳、cron 喚醒、執行通知和網關記帳）可以更新 `updatedAt`，但它們不會保持每日/閒置會話的新鮮度。
- **`resetByType`**: 每類型覆寫 (`direct`, `group`, `thread`)。舊版 `dm` 被接受為 `direct` 的別名。
- **`parentForkMaxTokens`**: 建立分岔執行緒會話時允許的最大父會話 `totalTokens` (預設 `100000`)。
  - 如果父 `totalTokens` 高於此值，OpenClaw 將啟動一個新的執行緒會話，而不是繼承父級記錄歷史。
  - 設定 `0` 以停用此防護並始終允許父級分岔。
- **`mainKey`**: 舊版欄位。執行時對於主要直接聊天儲存桶始終使用 `"main"`。
- **`agentToAgent.maxPingPongTurns`**: Agent 之間交換期間 Agent 之間的最大回覆回合數 (整數，範圍： `0`–`5`)。 `0` 停用乒乓球鏈結。
- **`sendPolicy`**: 按 `channel`、 `chatType` (`direct|group|channel`，帶有舊版 `dm` 別名)、 `keyPrefix` 或 `rawKeyPrefix` 匹配。優先拒絕。
- **`maintenance`**: 會話儲存清理 + 保留控制。
  - `mode`： `warn` 僅發出警告； `enforce` 應用清理。
  - `pruneAfter`：過期條目的年齡截止 (預設 `30d`)。
  - `maxEntries`： `sessions.json` 中的最大條目數 (預設 `500`)。執行時寫入會批量清理，並帶有一個用於生產級上限的小型高水位緩衝區； `openclaw sessions cleanup --enforce` 立即套用上限。
  - `rotateBytes`：當 `sessions.json` 超過此大小時輪換 (預設 `10mb`)。
  - `resetArchiveRetention`： `*.reset.<timestamp>` 記錄封存的保留。預設為 `pruneAfter`；設定 `false` 以停用。
  - `maxDiskBytes`：可選的會話目錄磁碟預算。在 `warn` 模式下，它會記錄警告；在 `enforce` 模式下，它會優先移除最舊的工件/會話。
  - `highWaterBytes`：預算清理後的可選目標。預設為 `maxDiskBytes` 的 `80%`。
- **`threadBindings`**: 執行緒繫結會話功能的全域預設值。
  - `enabled`：主預設開關 (提供者可以覆寫；Discord 使用 `channels.discord.threadBindings.enabled`)
  - `idleHours`：預設的非活動自動取消聚焦小時數 (`0` 停用；提供者可以覆寫)
  - `maxAgeHours`：預設的硬性最大年齡小時數 (`0` 停用；提供者可以覆寫)

</Accordion>

---

## 訊息

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

### 回應前綴

各頻道/帳號覆寫：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析規則（最優先者勝出）：帳號 → 頻道 → 全域。`""` 會停用並停止串聯。`"auto"` 衍生自 `[{identity.name}]`。

**樣板變數：**

| 變數              | 說明           | 範例                        |
| ----------------- | -------------- | --------------------------- |
| `{model}`         | 簡短模型名稱   | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型識別碼 | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供者名稱     | `anthropic`                 |
| `{thinkingLevel}` | 目前的思考層級 | `high`、`low`、`off`        |
| `{identity.name}` | Agent 身分名稱 | （同 `"auto"`）             |

變數不區分大小寫。`{think}` 是 `{thinkingLevel}` 的別名。

### 確認反應

- 預設為啟用代理的 `identity.emoji`，否則為 `"👀"`。設定 `""` 以停用。
- 各頻道覆寫：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析順序：帳號 → 頻道 → `messages.ackReaction` → 身分後援。
- 範圍：`group-mentions`（預設）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在支援反應的頻道（如 Slack、Discord、Telegram、WhatsApp 和 BlueBubbles）上，回覆後移除確認。
- `messages.statusReactions.enabled`：在 Slack、Discord 和 Telegram 上啟用生命週期狀態反應。
  在 Slack 和 Discord 上，若保持未設定，當確認反應啟用時，狀態反應將維持啟用。
  在 Telegram 上，必須明確設定為 `true` 以啟用生命週期狀態反應。

### 輸入去抖動

將來自同一發送者的連續純文字訊息合併為單一代理回合。媒體/附件會立即排清。控制指令會略過去抖動。

### TTS（文字轉語音）

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

- `auto` 控制預設的自動 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可以覆寫本地設定，而 `/tts status` 顯示有效狀態。
- `summaryModel` 會針對自動摘要覆寫 `agents.defaults.model.primary`。
- `modelOverrides` 預設為啟用；`modelOverrides.allowProvider` 預設為 `false`（選用）。
- API 金鑰會回退至 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- 內建的語音提供商由插件擁有。如果設定了 `plugins.allow`，請包含您想使用的每個 TTS 提供商插件，例如用於 Edge TTS 的 `microsoft`。舊版 `edge` 提供商 ID 被接受為 `microsoft` 的別名。
- `providers.openai.baseUrl` 會覆寫 OpenAI TTS 端點。解析順序依次為設定、`OPENAI_TTS_BASE_URL`，然後是 `https://api.openai.com/v1`。
- 當 `providers.openai.baseUrl` 指向非 OpenAI 端點時，OpenClaw 會將其視為 OpenAI 相容的 TTS 伺服器並放寬模型/語音驗證。

---

## 交談

交談模式 的預設值。

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

- 當設定多個 Talk 提供商時，`talk.provider` 必須符合 `talk.providers` 中的其中一個鍵。
- 舊版扁平 Talk 鍵 (`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`) 僅用於相容性，會自動遷移至 `talk.providers.<provider>`。
- 語音 ID 會回退至 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受純文字字串或 SecretRef 物件。
- `ELEVENLABS_API_KEY` 回退僅在未設定 Talk API 金鑰時適用。
- `providers.*.voiceAliases` 允許 Talk 指令使用易記名稱。
- `providers.mlx.modelId` 選擇 macOS 本地 MLX 助手使用的 Hugging Face 儲存庫。如果省略，macOS 會使用 `mlx-community/Soprano-80M-bf16`。
- macOS MLX 播放會透過內建的 `openclaw-mlx-tts` 助手執行（如果存在），或是 `PATH` 上的可執行檔；`OPENCLAW_MLX_TTS_BIN` 會覆寫開發用的助手路徑。
- `speechLocale` 設定 iOS/macOS Talk 語音辨識使用的 BCP 47 地區 ID。保留未設定狀態以使用裝置預設值。
- `silenceTimeoutMs` 控制 Talk 模式在使用者停止說話後等待多久才發送逐字稿。未設定則保留平台預設的暫停時間視窗 (`700 ms on macOS and Android, 900 ms on iOS`)。

---

## 相關

- [Configuration reference](/zh-Hant/gateway/configuration-reference) — 所有其他設定鍵
- [Configuration](/zh-Hant/gateway/configuration) — 常見任務與快速設定
- [Configuration examples](/zh-Hant/gateway/configuration-examples)
