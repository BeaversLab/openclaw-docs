---
summary: "代理預設值、多代理路由、工作階段、訊息和交談配置"
read_when:
  - Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills)
  - Configuring multi-agent routing and bindings
  - Adjusting session, message delivery, and talk-mode behavior
title: "配置 — 代理"
---

在 `agents.*`、`multiAgent.*`、`session.*`、
`messages.*` 和 `talk.*` 下的代理範圍配置鍵。有關通道、工具、閘道執行時和其他頂層鍵，請參閱 [配置參考](/zh-Hant/gateway/configuration-reference)。

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
`agents.list[].skills` 的代理，可選用的預設技能允許清單。

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
- 將 `agents.list[].skills: []` 設定為空以表示無技能。
- 非空的 `agents.list[].skills` 清單是該代理的最終集合；它
  不會與預設值合併。

### `agents.defaults.skipBootstrap`

停用工作區引導檔案（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）的自動建立。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.skipOptionalBootstrapFiles`

在仍寫入必要引導檔案的同時，跳過建立選定的選用工作區檔案。有效值為：`SOUL.md`、`USER.md`、`HEARTBEAT.md` 和 `IDENTITY.md`。

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

控制何時將工作區引導檔案注入到系統提示詞中。預設值：`"always"`。

- `"continuation-skip"`：安全延續回合（在完成的助理回應之後）會跳過工作區引導的重新注入，以減少提示詞大小。心跳執行和壓縮後重試仍會重建上下文。
- `"never"`：停用工作區引導程序以及每輪的上下文檔案注入。僅對完全擁有提示詞生命週期的代理使用此設定（自訂上下文引擎、自行建構上下文的原生執行時，或專用的無引導程序工作流程）。心跳與壓縮恢復輪次也會略過注入。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

### `agents.defaults.bootstrapMaxChars`

單個工作區引導檔案在截斷前的最大字元數。預設值：`12000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

所有工作區引導檔案中注入的最大總字元數。預設值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

控制當引導上下文被截斷時，對代理可見的系統提示詞通知。
預設值：`"once"`。

- `"off"`：絕不將截斷通知文字注入系統提示詞。
- `"once"`：針對每個唯一的截斷特徵碼注入一次簡潔通知（建議）。
- `"always"`：當存在截斷時，每次執行都注入簡潔通知。

詳細的原始/注入計數與配置調整欄位保留在診斷資訊中（例如上下文/狀態報告與日誌）；常規 WebChat 使用者/執行時上下文僅會收到簡潔的恢復通知。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### Context 預算所有權對應表

OpenClaw 擁有多個高吞吐量的提示詞/Context 預算，且它們是依照子系統有意進行拆分，而非全部流經一個通用的控制項。

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars`：
  正常的工作區引導注入。
- `agents.defaults.startupContext.*`：
  一次性重置/啟動的模型執行前導，包含最近的每日
  `memory/*.md` 檔案。純聊天 `/new` 與 `/reset` 指令會
  在不調用模型的情況下被確認。
- `skills.limits.*`：
  注入系統提示詞中的精簡技能列表。
- `agents.defaults.contextLimits.*`：
  有界的執行時摘錄與注入的執行時擁有區塊。
- `memory.qmd.limits.*`：
  已索引的記憶體搜尋摘要與注入大小。

僅當某個代理需要不同的預算時，才使用相符的個別代理覆寫：

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

控制重置/啟動模型執行時注入的首輪啟動前導詞。純聊天 `/new` 和 `/reset` 指令會確認重置而不調用模型，因此不會載入此前導詞。

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

有界執行時上下文表面的共用預設值。

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

- `memoryGetMaxChars`：預設 `memory_get` 摘錄上限，之後會加入
  截斷元資料和續行通知。
- `memoryGetDefaultLines`：當省略 `lines` 時的預設 `memory_get` 行
  視窗。
- `toolResultMaxChars`：用於持久化結果和溢出復原的即時工具結果上限。
- `postCompactionMaxChars`：用於壓縮後重新整理注入的 AGENTS.md 摘錄
  上限。

#### `agents.list[].contextLimits`

針對共用 `contextLimits` 設定的各個代理覆寫。省略的欄位會繼承自
`agents.defaults.contextLimits`。

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

注入系統提示詞的壓縮技能清單的全域上限。這不影響按需讀取 `SKILL.md` 檔案。

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

技能提示詞預算的各個代理覆寫。

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

在提供者呼叫之前，轉錄/工具圖像區塊中最長圖像邊的最大像素大小。
預設值：`1200`。

較低的值通常會減少視覺權杖的使用量和截圖密集執行的請求承載大小。較高的值會保留更多視覺細節。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

系統提示詞內容的時區（非訊息時間戳記）。預設為主機時區。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

系統提示詞中的時間格式。預設值：`auto`（作業系統偏好設定）。

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

- `model`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 字串形式僅設定主要模型。
  - 物件形式設定主要模型加上有序的故障轉移模型。
- `imageModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 被 `image` 工具路徑作為其視覺模型配置使用。
  - 當所選/預設模型無法接受圖片輸入時，也會用作後備路由。
  - 建議使用明確的 `provider/model` 參照。為了相容性也接受純 ID；如果純 ID 唯一符合 `models.providers.*.models` 中已設定的圖片處理項目，OpenClaw 會將其限定為該供應商。若有歧義的設定符合項，則需要明確的供應商前綴。
- `imageGenerationModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 供共享圖片生成功能以及任何未來會生成圖片的工具/外掛介面使用。
  - 典型值：原生 Gemini 圖片生成使用 `google/gemini-3.1-flash-image-preview`，fal 使用 `fal/fal-ai/flux/dev`，OpenAI Images 使用 `openai/gpt-image-2`，或透明背景的 OpenAI PNG/WebP 輸出使用 `openai/gpt-image-1.5`。
  - 如果您直接選擇供應商/模型，也請設定相符的供應商驗證（例如針對 `google/*` 使用 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，針對 `openai/gpt-image-2` / `openai/gpt-image-1.5` 使用 `OPENAI_API_KEY` 或 OpenAI Codex OAuth，針對 `fal/*` 使用 `FAL_KEY`）。
  - 如果省略，`image_generate` 仍可推斷出具有驗證支援的預設供應商。它會先嘗試目前的預設供應商，然後依照供應商 ID 順序嘗試剩餘的已註冊圖片生成供應商。
- `musicGenerationModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 供共享音樂生成功能及內建的 `music_generate` 工具使用。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.6`。
  - 如果省略，`music_generate` 仍然可以推斷出支援驗證的供應商預設值。它會先嘗試當前的預設供應商，然後依照供應商 ID 的順序嘗試其餘已註冊的音樂生成供應商。
  - 如果您直接選擇供應商/模型，請同時設定相符的供應商驗證/API 金鑰。
- `videoGenerationModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 由共享的影片生成功能以及內建的 `video_generate` 工具使用。
  - 典型值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍然可以推斷出支援驗證的供應商預設值。它會先嘗試當前的預設供應商，然後依照供應商 ID 的順序嘗試其餘已註冊的影片生成供應商。
  - 如果您直接選擇供應商/模型，請同時設定相符的供應商驗證/API 金鑰。
  - 隨附的 Qwen 影片生成供應商支援最多 1 個輸出影片、1 個輸入影像、4 個輸入影片、10 秒持續時間，以及供應商層級的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 選項。
- `pdfModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 由 `pdf` 工具用於模型路由。
  - 如果省略，PDF 工具會回退至 `imageModel`，然後再回退至解析出的工作階段/預設模型。
- `pdfMaxBytesMb`：當呼叫時未傳遞 `maxBytesMb` 時，`pdf` 工具的預設 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中擷取回退模式所考慮的預設最大頁數。
- `verboseDefault`：代理的預設詳細程度層級。數值：`"off"`、`"on"`、`"full"`。預設值：`"off"`。
- `toolProgressDetail`：`/verbose` 工具摘要和進度草稿工具行的詳細模式。數值：`"explain"`（預設，精簡人類可讀標籤）或 `"raw"`（可用時附加原始指令/細節）。個別代理的 `agents.list[].toolProgressDetail` 會覆寫此預設值。
- `reasoningDefault`：代理的預設推論可見性。數值：`"off"`、`"on"`、`"stream"`。個別代理的 `agents.list[].reasoningDefault` 會覆寫此預設值。已設定的推論預設值僅在未設定個別訊息或工作階段推論覆寫時，套用於擁有者、授權發送者或操作員管理員的 Gateway 內容。
- `elevatedDefault`：代理的預設提升輸出層級。數值：`"off"`、`"on"`、`"ask"`、`"full"`。預設值：`"on"`。
- `model.primary`：格式 `provider/model`（例如 `openai/gpt-5.5` 代表 OpenAI API 金鑰或 Codex OAuth 存取）。如果您省略供應商，OpenClaw 會先嘗試別名，然後是該特定模型 ID 的唯一設定供應商匹配，最後才回退到設定的預設供應商（此為已棄用的相容性行為，因此建議明確指定 `provider/model`）。如果該供應商不再公開設定的預設模型，OpenClaw 會回退到第一個設定的供應商/模型，而不會顯示陳舊的已移除供應商預設值。
- `models`：針對 `/model` 設定的模型目錄與允許清單。每個條目可以包含 `alias`（快捷方式）和 `params`（供應商特定，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`、`responsesServerCompaction`、`responsesCompactThreshold`、`chat_template_kwargs`、`extra_body`/`extraBody`）。
  - 使用諸如 `"openai-codex/*": {}` 或 `"vllm/*": {}` 等 `provider/*` 條目，即可顯示所選供應商的所有已探索模型，無需手動列出每個模型 ID。
  - 安全編輯：使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 來新增條目。除非您傳遞 `--replace`，否則 `config set` 將拒絕會移除現有允許清單條目的替換操作。
  - 供應商範圍的設定/入門流程會將所選供應商模型合併至此對應，並保留已設定的無關供應商。
  - 對於直接 OpenAI Responses 模型，伺服器端壓縮會自動啟用。使用 `params.responsesServerCompaction: false` 停止注入 `context_management`，或使用 `params.responsesCompactThreshold` 覆寫臨界值。請參閱 [OpenAI server-side compaction](/zh-Hant/providers/openai#server-side-compaction-responses-api)。
- `params`：套用至所有模型的全域預設供應商參數。設定於 `agents.defaults.params`（例如 `{ cacheRetention: "long" }`）。
- `params` 合併優先順序（設定）：`agents.defaults.params`（全域基底）會被 `agents.defaults.models["provider/model"].params`（各模型）覆寫，然後 `agents.list[].params`（相符的代理程式 ID）會依鍵值進行覆寫。詳情請參閱 [Prompt Caching](/zh-Hant/reference/prompt-caching)。
- `params.extra_body`/`params.extraBody`：合併至 `api: "openai-completions"` 請求主體的高階穿透式 JSON，用於 OpenAI 相容代理。若與產生的請求鍵衝突，額外主體優先；非原生完成路由仍會隨後剝離僅限 OpenAI 的 `store`。
- `params.chat_template_kwargs`：合併至頂層 `api: "openai-completions"` 請求主體的 vLLM/OpenAI 相容聊天範本引數。對於關閉思考的 `vllm/nemotron-3-*`，內建的 vLLM 外掛會自動發送 `enable_thinking: false` 和 `force_nonempty_content: true`；明確的 `chat_template_kwargs` 會覆寫產生的預設值，而 `extra_body.chat_template_kwargs` 仍具有最終優先權。若要控制 vLLM Qwen 思考，請在該模型項目上將 `params.qwenThinkingFormat` 設定為 `"chat-template"` 或 `"top-level"`。
- `compat.thinkingFormat`：OpenAI 相容的思考負載樣式。對 Qwen 樣式的頂層 `enable_thinking` 請使用 `"qwen"`；若要在支援請求層級 chat-template kwargs 的 Qwen 系列後端（如 vLLM）上使用 `chat_template_kwargs.enable_thinking`，則使用 `"qwen-chat-template"`。OpenClaw 會將停用的思考對應到 `false`，將啟用的思考對應到 `true`。
- `compat.supportedReasoningEfforts`：依模型區分的 OpenAI 相容推理努力清單。包含 `"xhigh"` 以供真正接受該參數的自訂端點使用；OpenClaw 隨後會在指令選單、Gateway 工作階段列、工作階段修補驗證、代理 CLI 驗證，以及該設定提供者/模型的 `llm-task` 驗證中公開 `/think xhigh`。當後端想要針對標準層級使用提供者特定值時，請使用 `compat.reasoningEffortMap`。
- `params.preserveThinking`：僅限 Z.AI 的保留思考選用功能。啟用且思考開啟時，OpenClaw 會發送 `thinking.clear_thinking: false` 並重放先前的 `reasoning_content`；請參閱 [Z.AI thinking and preserved thinking](/zh-Hant/providers/zai#thinking-and-preserved-thinking)。
- 執行時期策略屬於提供者或模型，而不屬於 `agents.defaults`。請使用 `models.providers.<provider>.agentRuntime` 設定提供者層級的規則，或使用 `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime` 設定模型層級的規則。官方 OpenAI 提供者上的 OpenAI agent 模型預設選擇 Codex。
- 變更這些欄位的配置寫入器（例如 `/models set`、`/models set-image` 和後備新增/移除指令）會儲存標準物件形式，並在可能時保留現有的後備清單。
- `maxConcurrent`：跨會話的最大並行 agent 執行數（每個會話仍為序列化）。預設值：4。

### 執行時期策略

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
      },
    },
  },
}
```

- `id`：`"auto"`、`"pi"`、已註冊的 plugin harness id，或支援的 CLI 後端別名。內建的 Codex 外掛註冊了 `codex`；內建的 Anthropic 外掛提供了 `claude-cli` CLI 後端。
- `id: "auto"` 允許已註冊的 plugin harness 宣告支援的回合，並在沒有 harness 匹配時使用 PI。明確指定的外掛執行時期（例如 `id: "codex"`）需要該 harness，如果它不可用或失敗，則會封閉式失敗。
- 全 agent 執行時期金鑰已過時。`agents.defaults.agentRuntime`、`agents.list[].agentRuntime`、會話執行時期釘選，以及 `OPENCLAW_AGENT_RUNTIME` 會被執行時期選擇所忽略。執行 `openclaw doctor --fix` 以移除過時的值。
- OpenAI agent 模型預設使用 Codex harness；當您想要明確指定時，提供者/模型 `agentRuntime.id: "codex"` 仍然有效。
- 對於 Claude CLI 部署，建議優先使用 `model: "anthropic/claude-opus-4-7"` 加上模型範圍的 `agentRuntime.id: "claude-cli"`。舊式的 `claude-cli/claude-opus-4-7` 模型參照為了相容性仍然有效，但新設定應將提供者/模型選擇標準化，並將執行後端置於提供者/模型執行時期策略中。
- 這僅控制文字代理回合的執行。媒體生成、視覺、PDF、音樂、視訊和 TTS 仍使用其提供者/模型設定。

**內建別名簡寫**（僅在模型位於 `agents.defaults.models` 時適用）：

| 別名                | 模型                                   |
| ------------------- | -------------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`            |
| `sonnet`            | `anthropic/claude-sonnet-4-6`          |
| `gpt`               | `openai/gpt-5.5`                       |
| `gpt-mini`          | `openai/gpt-5.4-mini`                  |
| `gpt-nano`          | `openai/gpt-5.4-nano`                  |
| `gemini`            | `google/gemini-3.1-pro-preview`        |
| `gemini-flash`      | `google/gemini-3-flash-preview`        |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview` |

您設定的別名始終優先於預設值。

Z.AI GLM-4.x 模型會自動啟用思考模式，除非您設定了 `--thinking off` 或自行定義了 `agents.defaults.models["zai/<model>"].params.thinking`。
Z.AI 模型預設為工具呼叫串流啟用 `tool_stream`。將 `agents.defaults.models["zai/<model>"].params.tool_stream` 設定為 `false` 即可停用。
Anthropic Claude 4.6 模型在未設定明確思考層級時，預設為 `adaptive` 思考。

### `agents.defaults.cliBackends`

僅限文字後援執行（無工具呼叫）的選用 CLI 後端。當 API 提供者失敗時，可作為備份使用。

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

- CLI 後端以文字為優先；工具一律停用。
- 當設定 `sessionArg` 時支援會話。
- 當 `imageArg` 接受檔案路徑時，支援圖像傳遞。
- `reseedFromRawTranscriptWhenUncompacted: true` 讓後端能在第一個壓縮摘要存在之前，從有界的原始 OpenClaw 逐字稿尾部復原安全的
  無效會話。驗證設定檔或憑證 epoch 變更
  仍絕不會進行原始重新植入。

### `agents.defaults.systemPromptOverride`

以固定字串替換整個 OpenClaw 組合的系統提示詞。可在預設層級 (`agents.defaults.systemPromptOverride`) 或個別代理程式 (`agents.list[].systemPromptOverride`) 設定。個別代理程式的值優先；空值或僅含空白的值會被忽略。適用於受控的提示詞實驗。

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

根據模型系列套用的供應商無關提示詞疊加層。GPT-5 系列的模型 ID 會跨供應商接收共享的行為契約；`personality` 僅控制友善的互動風格層。

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

- `"friendly"` (預設) 和 `"on"` 會啟用友善的互動風格層。
- `"off"` 僅停用友善層；已標記的 GPT-5 行為契約則保持啟用。
- 當此共享設定未設定時，仍會讀取舊版 `plugins.entries.openai.config.personality`。

### `agents.defaults.heartbeat`

定期心跳執行。

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
        skipWhenBusy: false, // default: false; true also waits for subagent/nested lanes
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
- `includeSystemPromptSection`：當為 false 時，會從系統提示詞中省略 Heartbeat 區段，並跳過將 `HEARTBEAT.md` 注入至啟動程序內容。預設值：`true`。
- `suppressToolErrorWarnings`：當為 true 時，會在心跳執行期間隱藏工具錯誤警告負載。
- `timeoutSeconds`：心跳代理程式回合在終止前所允許的最長時間 (秒)。保留未設定以使用 `agents.defaults.timeoutSeconds`。
- `directPolicy`：直接/DM 傳遞原則。`allow` (預設) 允許直接目標傳遞。`block` 會隱藏直接目標傳遞並發出 `reason=dm-blocked`。
- `lightContext`：當為 true 時，心跳執行會使用輕量級啟動程序內容，並僅保留工作區啟動程序檔案中的 `HEARTBEAT.md`。
- `isolatedSession`: 當為 true 時，每次心跳都在一個沒有先前對話歷史的新工作階段中執行。與 cron `sessionTarget: "isolated"` 使用相同的隔離模式。將每次心跳的 token 成本從約 100K 降低到約 2-5K tokens。
- `skipWhenBusy`: 當為 true 時，心跳執行會在額外忙碌的通道上延遲：子代理或嵌套指令工作。Cron 通道總是會延遲心跳，即使沒有此旗標也一樣。
- 個別代理：設定 `agents.list[].heartbeat`。當任何代理定義了 `heartbeat` 時，**只有那些代理** 會執行心跳。
- 心跳執行完整的代理回合 —— 較短的間隔會消耗更多 tokens。

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

- `mode`: `default` 或 `safeguard` (針對長歷史的區塊摘要)。參閱 [壓縮](/zh-Hant/concepts/compaction)。
- `provider`: 已註冊壓縮提供者外掛程式的 ID。設定後，會呼叫提供者的 `summarize()` 而非內建 LLM 摘要。失敗時會回退至內建功能。設定提供者會強制啟用 `mode: "safeguard"`。參閱 [壓縮](/zh-Hant/concepts/compaction)。
- `timeoutSeconds`: 在 OpenClaw 中止單一壓縮操作之前允許的最大秒數。預設值：`900`。
- `keepRecentTokens`: 用於逐字保留最新逐字稿尾部的 Pi 切點預算。手動 `/compact` 在明確設定時會遵守此設定；否則手動壓縮是一個硬式檢查點。
- `identifierPolicy`: `strict` (預設)、`off` 或 `custom`。`strict` 會在壓縮摘要期間預先加入內建的不透明識別碼保留指引。
- `identifierInstructions`: 當 `identifierPolicy=custom` 時使用的選用自訂識別碼保留文字。
- `qualityGuard`: retry-on-malformed-output 會檢查安全摘要。在安全模式中預設為啟用；設定 `enabled: false` 以跳過稽核。
- `midTurnPrecheck`：可選的 Pi 工具循環壓力檢查。當設為 `enabled: true` 時，OpenClaw 會在工具結果附加之後、下次模型呼叫之前檢查上下文壓力。如果上下文無法容納，它會在提交提示詞之前中止當前嘗試，並重用現有的預檢恢復路徑來截斷工具結果或進行壓縮並重試。適用於 `default` 和 `safeguard` 兩種壓縮模式。預設值：停用。
- `postCompactionSections`：可選的 AGENTS.md H2/H3 區塊名稱，用於在壓縮後重新注入。預設為 `["Session Startup", "Red Lines"]`；設定 `[]` 可停用重新注入。當未設定或明確設為該預設值時，較舊的 `Every Session`/`Safety` 標題也會被接受作為舊版回退方案。
- `model`：可選的 `provider/model-id` 覆寫設定，僅用於壓縮摘要。當主對話應保持使用一個模型，但壓縮摘要應在另一個模型上執行時使用；未設定時，壓縮會使用對話的主要模型。
- `maxActiveTranscriptBytes`：可選的位元組閾值（`number` 或像 `"20mb"` 這樣的字串），當作用中的 JSONL 超過閾值時，會在執行前觸發正常的本機壓縮。需要 `truncateAfterCompaction`，以便成功的壓縮可以輪替到較小的後續紀錄。當未設定或設為 `0` 時停用。
- `notifyUser`：當設為 `true` 時，會在壓縮開始和完成時向用戶發送簡短通知（例如，「Compacting context...」和「Compaction complete」）。預設停用以保持壓縮過程靜音。
- `memoryFlush`：自動壓縮前的靜音代理回合，用於儲存持久記憶。當此維護回合應保持在本地模型時，將 `model` 設定為特定的提供者/模型（例如 `ollama/qwen3:8b`）；此覆寫設定不繼承作用中對話的回退鏈。當工作區為唯讀時會跳過。

### `agents.defaults.contextPruning`

在發送至 LLM 之前，從記憶體內容中修剪**舊的工具結果**。**不**會修改磁碟上的會話歷史記錄。

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

- `mode: "cache-ttl"` 啟用修剪流程。
- `ttl` 控制修剪可以再次執行的頻率（在最後一次快取接觸之後）。
- 修剪會先軟修剪超大的工具結果，然後如有需要則硬清除較舊的工具結果。

**軟修剪** 保留開頭 + 結尾，並在中間插入 `...`。

**硬清除** 會用預留位置取代整個工具結果。

備註：

- 圖像區塊從不會被修剪/清除。
- 比率是基於字元（近似值），而非確切的 token 數量。
- 如果助理訊息少於 `keepLastAssistants` 則，將跳過修剪。

</Accordion>

有關行為的詳細資訊，請參閱 [會話修剪](/zh-Hant/concepts/session-pruning)。

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

- 非 Telegram 頻道需要明確的 `*.blockStreaming: true` 才能啟用區塊回覆。
- 頻道覆寫：`channels.<channel>.blockStreamingCoalesce` (以及每個帳戶的變體)。Signal/Slack/Discord/Google Chat 預設 `minChars: 1500`。
- `humanDelay`：區塊回覆之間的隨機暫停。`natural` = 800–2500ms。每個代理的覆寫：`agents.list[].humanDelay`。

有關行為 + 分塊的詳細資訊，請參閱 [串流](/zh-Hant/concepts/streaming)。

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

- 預設值：`instant` 用於直接聊天/提及，`message` 用於未提及的群組聊天。
- 每個會話的覆寫：`session.typingMode`, `session.typingIntervalSeconds`。

請參閱 [輸入指示器](/zh-Hant/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

嵌入式代理的可選沙箱。有關完整指南，請參閱 [沙箱](/zh-Hant/gateway/sandboxing)。

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

<Accordion title="沙箱詳細資訊">

**後端 (Backend)：**

- `docker`：本機 Docker 執行環境（預設）
- `ssh`：泛型 SSH 支援的遠端執行環境
- `openshell`：OpenShell 執行環境

當選取 `backend: "openshell"` 時，執行環境特定設定會移至
`plugins.entries.openshell.config`。

**SSH 後端設定：**

- `target`：`user@host[:port]` 格式的 SSH 目標
- `command`：SSH 用戶端指令（預設：`ssh`）
- `workspaceRoot`：用於各範圍工作區的絕對遠端根目錄
- `identityFile` / `certificateFile` / `knownHostsFile`：傳遞給 OpenSSH 的現有本機檔案
- `identityData` / `certificateData` / `knownHostsData`：OpenClaw 在執行時具現化為暫存檔案的內嵌內容或 SecretRef
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主機金鑰策略控制項

**SSH 認證優先順序：**

- `identityData` 優先於 `identityFile`
- `certificateData` 優先於 `certificateFile`
- `knownHostsData` 優先於 `knownHostsFile`
- SecretRef 支援的 `*Data` 值會在沙箱階段啟動前，從作用中的 secrets 執行環境快照中解析

**SSH 後端行為：**

- 在建立或重建後僅植入遠端工作區一次
- 然後維持遠端 SSH 工作區為基準
- 透過 SSH 路由 `exec`、檔案工具和媒體路徑
- 不會自動將遠端變更同步回主機
- 不支援沙箱瀏覽器容器

**工作區存取：**

- `none`：`~/.openclaw/sandboxes` 下的各範圍沙箱工作區
- `ro`：位於 `/workspace` 的沙箱工作區，代理程式工作區以唯讀方式掛載於 `/agent`
- `rw`：代理程式工作區以讀寫方式掛載於 `/workspace`

**範圍 (Scope)：**

- `session`：每個階段的容器 + 工作區
- `agent`：每個代理程式一個容器 + 工作區（預設）
- `shared`：共用的容器和工作區（無跨階段隔離）

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

- `mirror`：執行前從本機植入遠端，執行後同步回來；本機工作區維持為基準
- `remote`：建立沙箱時僅植入遠端一次，然後維持遠端工作區為基準

在 `remote` 模式下，在 OpenClaw 外部進行的本機主機編輯不會在植入步驟後自動同步到沙箱中。
傳輸方式是 SSH 進入 OpenShell 沙箱，但外掛程式擁有沙箱生命週期和可選的鏡像同步。

**`setupCommand`** 在容器建立後執行一次（透過 `sh -lc`）。需要網路出口、可寫入根目錄、root 使用者。

**容器預設為 `network: "none"`** — 如果代理程式需要出站存取，請設定為 `"bridge"`（或自訂橋接網路）。
`"host"` 被封鎖。`"container:<id>"` 預設被封鎖，除非您明確設定
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（緊急應變）。

**傳入附件** 會暫存至作用中工作區的 `media/inbound/*` 中。

**`docker.binds`** 掛載額外的主機目錄；全域和各代理程式的綁定會合併。

**沙箱瀏覽器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 已注入系統提示。不需要在 `openclaw.json` 中設定 `browser.enabled`。
noVNC 觀察者存取預設使用 VNC 認證，且 OpenClaw 會發出短期權杖 URL（而不是在共用 URL 中公開密碼）。

- `allowHostControl: false`（預設）會封鎖沙箱階段以主機瀏覽器為目標。
- `network` 預設為 `openclaw-sandbox-browser`（專用橋接網路）。僅當您明確需要全域橋接連線時，才設定為 `bridge`。
- `cdpSourceRange` 可選地將容器邊緣的 CDP 進站限制為 CIDR 範圍（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 僅將額外的主機目錄掛載至沙箱瀏覽器容器。當設定時（包括 `[]`），它會取代瀏覽器容器的 `docker.binds`。
- 啟動預設定義於 `scripts/sandbox-browser-entrypoint.sh` 中，並針對容器主機進行了調整：
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
    預設為啟用，如果 WebGL/3D 使用有需要，可以使用
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 停用。
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 如果您的工作流程
    依賴擴充功能，會重新啟用它們。
  - `--renderer-process-limit=2` 可以使用
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 變更；設定 `0` 以使用 Chromium 的
    預設程序限制。
  - 加上 `--no-sandbox` 當啟用 `noSandbox` 時。
  - 預設值是容器映像檔基準；使用具有自訂
    進入點的自訂瀏覽器映像檔來變更容器預設值。

</Accordion>

瀏覽器沙盒和 `sandbox.docker.binds` 僅適用於 Docker。

建置映像檔（從原始碼檢出）：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

對於沒有原始碼檢出的 npm 安裝，請參閱 [Sandboxing § Images and setup](/zh-Hant/gateway/sandboxing#images-and-setup) 以取得內聯 `docker build` 指令。

### `agents.list`（個別代理程式覆寫）

使用 `agents.list[].tts` 為代理程式指定其專屬的 TTS 提供者、語音、模型、樣式或自動 TTS 模式。代理程式區塊會對全域 `messages.tts` 進行深度合併，因此共享的憑證可以保留在一處，而個別代理程式僅需覆寫其所需的語音或提供者欄位。目前使用中代理程式的覆寫設定適用於自動口語回覆、`/tts audio`、`/tts status` 以及 `tts` 代理程式工具。請參閱 [Text-to-speech](/zh-Hant/tools/tts#per-agent-voice-overrides) 以了解提供者範例與優先順序。

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

- `id`：穩定的代理程式 ID（必填）。
- `default`：當設定了多個時，第一個生效（會記錄警告）。如果未設定任何值，清單中的第一個項目即為預設值。
- `model`：字串形式會設定嚴格的個別代理程式主要模型，且沒有模型後備；物件形式 `{ primary }` 也是嚴格的，除非您新增 `fallbacks`。使用 `{ primary, fallbacks: [...] }` 讓該代理程式加入後備機制，或使用 `{ primary, fallbacks: [] }` 明確指定嚴格行為。僅覆寫 `primary` 的 Cron 工作仍會繼承預設的後備選項，除非您設定了 `fallbacks: []`。
- `params`：個別代理程式的串流參數，會與 `agents.defaults.models` 中選定的模型項目合併。請使用此設定來針對特定代理程式進行覆寫，例如 `cacheRetention`、`temperature` 或 `maxTokens`，而無需複製整個模型目錄。
- `tts`：可選的每個代理文字轉語音覆寫。該區塊會與 `messages.tts` 進行深度合併，因此請將共用的提供商憑證和後援策略保留在 `messages.tts` 中，並在此處僅設定特定角色的值，例如提供商、語音、模型、樣式或自動模式。
- `skills`：可選的每個代理技能允許清單。如果省略，代理會在設定時繼承 `agents.defaults.skills`；明確的列表會取代預設值而不是合併，而 `[]` 表示沒有技能。
- `thinkingDefault`：可選的每個代理預設思考等級 (`off | minimal | low | medium | high | xhigh | adaptive | max`)。當未設定每則訊息或工作階段覆寫時，會覆寫此代理的 `agents.defaults.thinkingDefault`。選取的提供商/模型設定檔會控制哪些值是有效的；對於 Google Gemini，`adaptive` 會保留提供商擁有的動態思考 (Gemini 3/3.1 上省略 `thinkingLevel`，Gemini 2.5 上為 `thinkingBudget: -1`)。
- `reasoningDefault`：可選的每個代理預設推理可見性 (`on | off | stream`)。當未設定每則訊息或工作階段推理覆寫時，會覆寫此代理的 `agents.defaults.reasoningDefault`。
- `fastModeDefault`：可選的每個代理快速模式預設值 (`true | false`)。當未設定每則訊息或工作階段快速模式覆寫時套用。
- `models`：可選的每個代理模型目錄/執行時期覆寫，以完整的 `provider/model` id 為鍵值。請使用 `models["provider/model"].agentRuntime` 來處理每個代理的執行時期例外。
- `runtime`：可選的每個代理執行時期描述符。當代理應預設為 ACP harness 工作階段時，請使用帶有 `runtime.acp` 預設值 (`agent`、`backend`、`mode`、`cwd`) 的 `type: "acp"`。
- `identity.avatar`：相對於工作區的路徑、`http(s)` URL 或 `data:` URI。
- `identity` 推導預設值：從 `emoji` 推導 `ackReaction`，從 `name`/`emoji` 推導 `mentionPatterns`。
- `subagents.allowAgents`：針對明確 `sessions_spawn.agentId` 目標的代理 ID 白名單（`["*"]` = 任意；預設：僅限同一代理）。當允許自我目標 `agentId` 呼叫時，請包含請求者 ID。
- 沙盒繼承防護：如果請求者會話處於沙盒中，`sessions_spawn` 會拒絕將以非沙盒模式執行的目標。
- `subagents.requireAgentId`：當設為 true 時，封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確選擇設定檔；預設：false）。

---

## 多重代理路由

在單一 Gateway 內執行多個隔離的代理。請參閱 [Multi-Agent](/zh-Hant/concepts/multi-agent)。

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

### 綁定比對欄位

- `type`（選用）：一般路由使用 `route`（缺少類型預設為 route），持續性 ACP 對話綁定使用 `acp`。
- `match.channel`（必填）
- `match.accountId`（選用；`*` = 任意帳戶；省略 = 預設帳戶）
- `match.peer`（選用；`{ kind: direct|group|channel, id }`）
- `match.guildId` / `match.teamId`（選用；特定頻道）
- `acp`（選用；僅限 `type: "acp"`）：`{ mode, label, cwd, backend }`

**確定性比對順序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId`（精確，無 peer/guild/team）
5. `match.accountId: "*"`（全頻道）
6. 預設代理

在每一層級中，第一個比對的 `bindings` 項目獲勝。

對於 `type: "acp"` 項目，OpenClaw 會根據確切的對話身分（`match.channel` + 帳戶 + `match.peer.id`）進行解析，並不使用上述的路由綁定層級順序。

### 各個代理程式的存取設定檔

<Accordion title="完全存取（無沙箱）">

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

<Accordion title="無檔案系統存取權限（僅訊息傳遞）">

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

請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以了解優先順序的詳細資訊。

---

## 工作階段

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

<Accordion title="Session 欄位詳細資訊">

- **`scope`**：群組聊天環境的基礎會話分組策略。
  - `per-sender`（預設）：每個傳送者在頻道環境中會獲得獨立的會話。
  - `global`：頻道環境中的所有參與者共享單一會話（僅在預期共享環境時使用）。
- **`dmScope`**：私人訊息（DM）的分組方式。
  - `main`：所有私人訊息共享主會話。
  - `per-peer`：跨頻道依傳送者 ID 隔離。
  - `per-channel-peer`：依頻道 + 傳送者隔離（建議用於多用戶收件匣）。
  - `per-account-channel-peer`：依帳戶 + 頻道 + 傳送者隔離（建議用於多帳戶）。
- **`identityLinks`**：將標準 ID 對應到供應商前綴的對等節點，以實現跨頻道會話共享。Dock 指令（例如 `/dock_discord`）使用相同的對應表，將活動會話的回覆路徑切換到另一個連結的頻道對等節點；請參閱[頻道對接](/zh-Hant/concepts/channel-docking)。
- **`reset`**：主要重設策略。`daily` 在 `atHour` 本地時間重設；`idle` 在 `idleMinutes` 之後重設。當兩者皆設定時，以先過期者為準。每日重設的新鮮度使用會話列的 `sessionStartedAt`；閒置重設的新鮮度使用 `lastInteractionAt`。背景/系統事件寫入（如心跳、喚醒 cron、執行通知和網關簿記）可以更新 `updatedAt`，但它們不會保持每日/閒置會話的新鮮度。
- **`resetByType`**：各類型的覆寫（`direct`、`group`、`thread`）。舊版 `dm` 被接受為 `direct` 的別名。
- **`mainKey`**：舊版欄位。執行時期對於主要直接聊天儲存區總是使用 `"main"`。
- **`agentToAgent.maxPingPongTurns`**：代理之間交換期間，代理之間的最大回覆回合數（整數，範圍：`0`–`5`）。`0` 會停用乒乓鏈結。
- **`sendPolicy`**：依 `channel`、`chatType`（`direct|group|channel`，含舊版 `dm` 別名）、`keyPrefix` 或 `rawKeyPrefix` 進行比對。優先採用第一個拒絕規則。
- **`maintenance`**：會話儲存區清理 + 保留控制。
  - `mode`：`warn` 僅發出警告；`enforce` 套用清理。
  - `pruneAfter`：過期項目的年齡截斷值（預設 `30d`）。
  - `maxEntries`：`sessions.json` 中的最大項目數（預設 `500`）。執行時期寫入會以小量的高水位緩衝區批次清理，以符合生產環境大小的上限；`openclaw sessions cleanup --enforce` 會立即套用上限。
  - `rotateBytes`：已棄用且已忽略；`openclaw doctor --fix` 會將其從較舊的設定中移除。
  - `resetArchiveRetention`：`*.reset.<timestamp>` 逐字稿存檔的保留時間。預設為 `pruneAfter`；設定 `false` 以停用。
  - `maxDiskBytes`：選用的會話目錄磁碟預算。在 `warn` 模式下，它會記錄警告；在 `enforce` 模式下，它會先移除最舊的成品/會話。
  - `highWaterBytes`：預算清理後的選用目標。預設為 `80%` 的 `maxDiskBytes`。
- **`threadBindings`**：執行緒綁定會話功能的全域預設值。
  - `enabled`：主預設開關（供應商可以覆寫；Discord 使用 `channels.discord.threadBindings.enabled`）
  - `idleHours`：預設的非活動自動取消焦點，以小時為單位（`0` 表示停用；供應商可以覆寫）
  - `maxAgeHours`：預設的硬性最大年限，以小時為單位（`0` 表示停用；供應商可以覆寫）
  - `spawnSessions`：從 `sessions_spawn` 和 ACP 執行緒產生建立執行緒綁定工作會話的預設閘道。當啟用執行緒綁定時，預設為 `true`；供應商/帳戶可以覆寫。
  - `defaultSpawnContext`：執行緒綁定產生的預設原生子代理環境（`"fork"` 或 `"isolated"`）。預設為 `"fork"`。

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
      mode: "steer", // steer | queue (legacy one-at-a-time) | followup | collect | steer-backlog | steer+backlog | interrupt
      debounceMs: 500,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "steer",
        telegram: "steer",
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

每個頻道/帳號的覆寫：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析順序（最優先者勝）：帳號 → 頻道 → 全域。`""` 會停用並停止層級傳遞。`"auto"` 會衍生 `[{identity.name}]`。

**範本變數：**

| 變數              | 說明           | 範例                        |
| ----------------- | -------------- | --------------------------- |
| `{model}`         | 簡短模型名稱   | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型識別碼 | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供者名稱     | `anthropic`                 |
| `{thinkingLevel}` | 目前思考層級   | `high`、`low`、`off`        |
| `{identity.name}` | Agent 身分名稱 | （同 `"auto"`）             |

變數不區分大小寫。`{think}` 是 `{thinkingLevel}` 的別名。

### Ack 回應

- 預設為使用中 Agent 的 `identity.emoji`，否則為 `"👀"`。設為 `""` 以停用。
- 每個頻道的覆寫：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析順序：帳號 → 頻道 → `messages.ackReaction` → 身分後備。
- 範圍：`group-mentions`（預設）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在支援回應的頻道（如 Slack、Discord、Telegram、WhatsApp 和 iMessage）上，於回覆後移除 ack。
- `messages.statusReactions.enabled`：在 Slack、Discord 和 Telegram 上啟用生命週期狀態回應。
  在 Slack 和 Discord 上，未設定時會在 ack 回應啟用時保持狀態回應為啟用。
  在 Telegram 上，需明確設為 `true` 以啟用生命週期狀態回應。

### 輸入防抖

將來自同一發送者的快速純文字訊息批次處理為單一 Agent 輪次。媒體/附件會立即排清。控制指令會略過防抖。

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

- `auto` 控制預設的自動 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可以覆寫本機偏好設定，而 `/tts status` 則顯示有效狀態。
- `summaryModel` 會覆寫自動摘要的 `agents.defaults.model.primary`。
- `modelOverrides` 預設為啟用；`modelOverrides.allowProvider` 預設為 `false` (選擇加入)。
- API 金鑰會依序回退至 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- 內建的語音供應商由外掛程式擁有。如果設定了 `plugins.allow`，請包含您想要使用的每個 TTS 供應商外掛程式，例如 Edge TTS 的 `microsoft`。舊版的 `edge` 供應商 ID 會被接受為 `microsoft` 的別名。
- `providers.openai.baseUrl` 會覆寫 OpenAI TTS 端點。解析順序依次為設定、`OPENAI_TTS_BASE_URL`，然後是 `https://api.openai.com/v1`。
- 當 `providers.openai.baseUrl` 指向非 OpenAI 端點時，OpenClaw 會將其視為相容 OpenAI 的 TTS 伺服器，並放寬模型/語音驗證。

---

## Talk

Talk 模式 (macOS/iOS/Android) 的預設值。

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

- 當設定了多個 Talk 供應商時，`talk.provider` 必須符合 `talk.providers` 中的某個鍵。
- 舊版的平面 Talk 鍵 (`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`) 僅供相容性使用。請執行 `openclaw doctor --fix` 將持續性設定重寫為 `talk.providers.<provider>`。
- 語音 ID 會回退至 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受純文字字串或 SecretRef 物件。
- `ELEVENLABS_API_KEY` 回退機制僅在未設定 Talk API 金鑰時適用。
- `providers.*.voiceAliases` 允許 Talk 指令使用易記名稱。
- `providers.mlx.modelId` 選擇 macOS 本機 MLX 助手使用的 Hugging Face 存儲庫。如果省略，macOS 將使用 `mlx-community/Soprano-80M-bf16`。
- macOS MLX 播放會透過內建的 `openclaw-mlx-tts` 助手（如果存在）或 `PATH` 上的可執行檔來執行；`OPENCLAW_MLX_TTS_BIN` 會覆寫助手路徑以便進行開發。
- `consultThinkingLevel` 控制在 Control UI Talk 即時 `openclaw_agent_consult` 呼叫後執行的完整 OpenClaw Agent 的思考層級。保持未設定以維持正常的會話/模型行為。
- `consultFastMode` 為 Control UI Talk 即時諮詢設定一次性快速模式覆寫，而不會改變會話的正常快速模式設定。
- `speechLocale` 設定 iOS/macOS Talk 語音辨識使用的 BCP 47 地區 ID。保持未設定以使用裝置預設值。
- `silenceTimeoutMs` 控制 Talk 模式在使用者停止說話後多久才會發送文字記錄。未設定則保持平台預設的暫停視窗（`700 ms on macOS and Android, 900 ms on iOS`）。
- `realtime.instructions` 將提供者導向的系統指令附加到 OpenClaw 內建的即時提示中，以便在不失去預設 `openclaw_agent_consult` 指引的情況下設定語音風格。

---

## 相關

- [Configuration reference](/zh-Hant/gateway/configuration-reference) — 所有其他配置鍵
- [Configuration](/zh-Hant/gateway/configuration) — 常見任務與快速設定
- [Configuration examples](/zh-Hant/gateway/configuration-examples)
