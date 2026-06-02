---
summary: "Agent defaults, multi-agent routing, session, messages, and talk config"
read_when:
  - Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills)
  - Configuring multi-agent routing and bindings
  - Adjusting session, message delivery, and talk-mode behavior
title: "Configuration — agents"
---

`agents.*`、`multiAgent.*`、`session.*`、
`messages.*` 和 `talk.*` 下的代理作用域配置鍵。有關通道、工具、網關運行時和其他頂層鍵，請參閱 [Configuration reference](/zh-Hant/gateway/configuration-reference)。

## Agent defaults

### `agents.defaults.workspace`

預設值：若設定則為 `OPENCLAW_WORKSPACE_DIR`，否則為 `~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

明確的 `agents.defaults.workspace` 值優先於
`OPENCLAW_WORKSPACE_DIR`。當您不想將路徑寫入配置時，請使用環境變數將預設 agent 指向已掛載的工作區。

### `agents.defaults.repoRoot`

顯示在系統提示詞 Runtime 行中的選用存放庫根目錄。若未設定，OpenClaw 會透過從工作區向上巡覽自動偵測。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

針對未設定
`agents.list[].skills` 的 agent，其選用的預設技能允許清單。

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
- 設定 `agents.list[].skills: []` 表示無技能。
- 非空的 `agents.list[].skills` 列表即為該 agent 的最終集合；它
  不會與預設值合併。

### `agents.defaults.skipBootstrap`

停用工作區引導檔案（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）的自動建立。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.skipOptionalBootstrapFiles`

跳過建立選用的選定工作區檔案，同時仍寫入必要的引導檔案。有效值為：`SOUL.md`、`USER.md`、`HEARTBEAT.md` 和 `IDENTITY.md`。

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

控制何時將工作區啟動檔案注入到系統提示詞中。預設值：`"always"`。

- `"continuation-skip"`：安全的延續輪次（在完成的助手回應之後）會跳過工作區啟動檔案的重新注入，以減少提示詞大小。心跳執行和壓縮後重試仍然會重建上下文。
- `"never"`：在每一輪都停用工作區啟動檔案和上下文檔案注入。僅對完全擁有其提示詞生命週期的代理程式使用此選項（自訂上下文引擎、自行建構上下文的原生執行時，或專用的無啟動檔案工作流程）。心跳和壓縮恢復輪次也會跳過注入。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

個別代理程式覆寫：`agents.list[].contextInjection`。省略的值會繼承
`agents.defaults.contextInjection`。

### `agents.defaults.bootstrapMaxChars`

每個工作區啟動檔案在截斷前的最大字元數。預設值：`12000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

個別代理程式覆寫：`agents.list[].bootstrapMaxChars`。省略的值會繼承
`agents.defaults.bootstrapMaxChars`。

### `agents.defaults.bootstrapTotalMaxChars`

跨所有工作區啟動檔案注入的最大總字元數。預設值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

個別代理程式覆寫：`agents.list[].bootstrapTotalMaxChars`。省略的值
會繼承 `agents.defaults.bootstrapTotalMaxChars`。

### 個別代理程式啟動設定檔覆寫

當某個代理程式需要與共用預設值不同的提示詞注入行為時，請使用個別代理程式啟動設定檔覆寫。省略的欄位會繼承自
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

控制當啟動上下文被截斷時，代理程式可見的系統提示詞通知。
預設值：`"always"`。

- `"off"`：絕不將截斷通知文字注入到系統提示詞中。
- `"once"`：每個唯一的截斷簽章注入一次簡潔通知。
- `"always"`：當存在截斷時，每次執行都注入一個簡潔通知（建議）。

詳細的原始/注入計數和配置調整欄位保留在診斷資訊中（例如上下文/狀態報告和日誌）；常規的 WebChat 使用者/執行時上下文僅
會收到簡潔的恢復通知。

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "always" } }, // off | once | always
}
```

### 上下文預算所有權對應

OpenClaw 擁有多個高吞吐量的提示詞/上下文預算，並且它們是按照子系統有意拆分的，而不是全部透過一個通用旋鈕流動。

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars`：
  正常的工作區引導注入。
- `agents.defaults.startupContext.*`：
  一次性重置/啟動模型運行前奏，包括最近的每日
  `memory/*.md` 檔案。純聊天 `/new` 和 `/reset` 指令會
  被確認，而不調用模型。
- `skills.limits.*`：
  注入到系統提示詞中的精簡技能列表。
- `agents.defaults.contextLimits.*`：
  有界的執行時摘錄和注入的執行時擁有的區塊。
- `memory.qmd.limits.*`：
  已索引的記憶體搜尋摘錄和注入大小調整。

僅當某個 Agent 需要不同的預算時，才使用匹配的個別 Agent 覆蓋：

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextInjection`
- `agents.list[].bootstrapMaxChars`
- `agents.list[].bootstrapTotalMaxChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

控制在重置/啟動模型運行時注入的首輪啟動前奏。
純聊天 `/new` 和 `/reset` 指令會確認重置而不調用
模型，因此它們不會加載此前奏。

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

有界執行時上下文層面的共享預設值。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        memoryGetDefaultLines: 120,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars`：在添加截斷元資料和續行通知之前的預設 `memory_get` 摘錄上限。
- `memoryGetDefaultLines`：當省略 `lines` 時的預設 `memory_get` 行視窗。
- `toolResultMaxChars`：用於持久化結果和溢出恢復的進階即時工具結果上限。留空則使用模型上下文自動上限：低於 100K tokens 時為 `16000` 個字元，100K+ tokens 時為 `32000` 個字元，200K+ tokens 時為 `64000`
  個字元。實際上限仍受限於模型上下文視窗的約 30%%。`openclaw doctor --deep` 會列印實際上限，而
  僅當顯式覆寫過時或無效時，醫生才會發出警告。
- `postCompactionMaxChars`：在壓縮後重新整理注入期間使用的 AGENTS.md 摘錄上限。

#### `agents.list[].contextLimits`

共享 `contextLimits` 設定的每個代理覆寫。省略的欄位繼承自
`agents.defaults.contextLimits`。

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
      },
    },
    list: [
      {
        id: "tiny-local",
        contextLimits: {
          memoryGetMaxChars: 6000,
          toolResultMaxChars: 8000, // advanced ceiling for this agent
        },
      },
    ],
  },
}
```

#### `skills.limits.maxSkillsPromptChars`

注入系統提示詞中的壓縮技能清單的總體上限。這不影響按需讀取
`SKILL.md` 檔案。

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

針對每個 Agent 的技能提示詞預算覆寫。

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

在呼叫提供者之前，文字記錄/工具圖像區塊中最長圖像邊的最大像素尺寸。
預設值：`1200`。

較低的值通常會減少視覺 token 的使用量，以及針對截圖密集執行的請求負載大小。
較高的值則保留更多視覺細節。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.imageQuality`

從檔案路徑、URL 和媒體引用載入的圖像的圖像工具壓縮/細節偏好。
預設值：`auto`。

OpenClaw 會將調整尺寸階梯調整為選定的圖像模型。例如，Claude Opus 4.8、OpenAI GPT-5.5、Qwen VL 和託管的 Llama 4 視覺模型可以使用比舊版/預設高細節視覺路徑更大的圖像，而在 `auto` 模式下，多圖像輪次會被更激進地壓縮，以控制 token 和延遲成本。

數值：

- `auto`：適應模型限制和圖像數量。
- `efficient`：偏好較小的圖像以降低 token 和位元組使用量。
- `balanced`：使用標準的中階梯隊。
- `high`：為截圖、圖表和文件圖像保留更多細節。

```json5
{
  agents: { defaults: { imageQuality: "auto" } },
}
```

### `agents.defaults.userTimezone`

系統提示詞內容的時區（非訊息時間戳記）。若未設定，則回退至主機時區。

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

- `model`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 字串形式僅設定主要模型。
  - 物件形式設定主要模型及有序的故障轉移模型。
- `imageModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 被 `image` 工具路徑用作其視覺模型配置。
  - 當選定/預設模型無法接受圖像輸入時，也用作故障轉移路由。
  - 優先使用明確的 `provider/model` 參照。為了相容性，接受純 ID；如果純 ID 唯一匹配 `models.providers.*.models` 中已配置的支援圖像的條目，OpenClaw 會將其限定為該提供者。有歧義的配置匹配需要明確的提供者前綴。
- `imageGenerationModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由共享的圖像生成功能以及任何未來生成圖像的工具/插件介面使用。
  - 典型值：`google/gemini-3.1-flash-image-preview` 用於原生 Gemini 圖像生成，`fal/fal-ai/flux/dev` 用於 fal，`openai/gpt-image-2` 用於 OpenAI Images，或 `openai/gpt-image-1.5` 用於透明背景的 OpenAI PNG/WebP 輸出。
  - 如果您直接選擇提供者/模型，請同時配置匹配的提供者驗證（例如，對於 `google/*` 為 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，對於 `openai/gpt-image-2` / `openai/gpt-image-1.5` 為 `OPENAI_API_KEY` 或 OpenAI Codex OAuth，對於 `fal/*` 為 `FAL_KEY`）。
  - 如果省略，`image_generate` 仍然可以推斷一個經過驗證的提供者預設值。它首先嘗試當前的預設提供者，然後按照提供者 ID 順序嘗試剩餘的已註冊圖像生成提供者。
- `musicGenerationModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由共享的音樂生成功能和內建的 `music_generate` 工具使用。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.6`。
  - 如果省略，`music_generate` 仍然可以推斷出支援驗證的供應商預設值。它會先嘗試當前的預設供應商，然後依照供應商 ID 的順序嘗試其餘已註冊的音樂生成供應商。
  - 如果您直接選擇了供應商/模型，請同時設定相符的供應商驗證/API 金鑰。
- `videoGenerationModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 由共享的影片生成功能和內建的 `video_generate` 工具使用。
  - 典型值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍然可以推斷出支援驗證的供應商預設值。它會先嘗試當前的預設供應商，然後依照供應商 ID 的順序嘗試其餘已註冊的影片生成供應商。
  - 如果您直接選擇提供商/模型，請同時配置匹配的提供商驗證/API 金鑰。
  - 內建的 Qwen 影片生成供應商支援最多 1 個輸出影片、1 個輸入圖片、4 個輸入影片、10 秒持續時間，以及供應商層級的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 選項。
- `pdfModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 由 `pdf` 工具用於模型路由。
  - 如果省略，PDF 工具會回退到 `imageModel`，然後再回退到解析後的 session/default 模型。
- `pdfMaxBytesMb`：當呼叫時未傳遞 `maxBytesMb` 時，`pdf` 工具的預設 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中提取回退模式考慮的預設最大頁數。
- `verboseDefault`：代理的預設詳細等級。數值：`"off"`、`"on"`、`"full"`。預設值：`"off"`。
- `toolProgressDetail`：`/verbose` 工具摘要和進度草稿工具行的詳細模式。數值：`"explain"`（預設，精簡的人類可讀標籤）或 `"raw"`（在可用時附加原始指令/細節）。個別代理的 `agents.list[].toolProgressDetail` 會覆蓋此預設值。
- `reasoningDefault`：代理的預設推理可見性。數值：`"off"`、`"on"`、`"stream"`。個別代理的 `agents.list[].reasoningDefault` 會覆蓋此預設值。配置的推理預設值僅在未設定每條訊息或會話推理覆蓋時，套用於擁有者、授權發送者或操作員管理員的閘道上下文。
- `elevatedDefault`：代理的預設提升輸出等級。數值：`"off"`、`"on"`、`"ask"`、`"full"`。預設值：`"on"`。
- `model.primary`：格式 `provider/model`（例如，對於 OpenAI API 金鑰或 Codex OAuth 存取權使用 `openai/gpt-5.5`）。如果您省略提供者，OpenClaw 會先嘗試別名，然後是該特定模型 ID 的唯一配置提供者匹配，之後才回退到配置的預設提供者（已棄用的相容性行為，因此建議使用明確的 `provider/model`）。如果該提供者不再公開配置的預設模型，OpenClaw 會回退到第一個配置的提供者/模型，而不是顯示陳舊的已移除提供者預設值。
- `models`：針對 `/model` 配置的模型目錄與允許清單。每個條目可以包含 `alias`（快捷方式）和 `params`（供應商特定，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`、`responsesServerCompaction`、`responsesCompactThreshold`、OpenRouter `provider` 路由、`chat_template_kwargs`、`extra_body`/`extraBody`）。
  - 使用 `provider/*` 條目（例如 `"openai/*": {}` 或 `"vllm/*": {}`）來顯示所選提供者的所有已發現模型，而無需手動列出每個模型 ID。
  - 當某個供應商的所有動態探索模型都應使用相同的執行階段時，請將 `agentRuntime` 新增至 `provider/*` 條目中。精確的 `provider/model` 執行階段政策仍優先於萬用字元。
  - 安全編輯：使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 新增條目。除非您傳遞 `--replace`，否則 `config set` 會拒絕移除現有允許清單條目的替換操作。
  - 供應商範圍的配置/導入流程會將選取的供應商模型合併到此映射中，並保留已配置的無關供應商。
  - 對於直接的 OpenAI Responses 模型，會自動啟用伺服器端壓縮。使用 `params.responsesServerCompaction: false` 停止注入 `context_management`，或使用 `params.responsesCompactThreshold` 覆寫閾值。請參閱 [OpenAI server-side compaction](/zh-Hant/providers/openai#server-side-compaction-responses-api)。
- `params`：套用至所有模型的全域預設供應商參數。設定於 `agents.defaults.params`（例如 `{ cacheRetention: "long" }`）。
- `params` 合併優先順序（配置）：`agents.defaults.params`（全域基底）會被 `agents.defaults.models["provider/model"].params`（個別模型）覆寫，然後 `agents.list[].params`（符合的代理程式 ID）依鍵進行覆寫。詳情請參閱 [Prompt Caching](/zh-Hant/reference/prompt-caching)。
- `models.providers.openrouter.params.provider`：OpenRouter 全域預設提供者路由策略。OpenClaw 將其轉發至 OpenRouter 的請求 `provider` 物件；個別模型的 `agents.defaults.models["openrouter/<model>"].params.provider` 和代理參數會按鍵進行覆寫。請參閱 [OpenRouter 提供者路由](/zh-Hant/providers/openrouter#advanced-configuration)。
- `params.extra_body`/`params.extraBody`：合併至 OpenAI 相容代理程式 `api: "openai-completions"` 請求主體的高階傳遞 JSON。若與產生的請求鍵發生衝突，額外主體將優先；非原生完成路由仍會在之後移除 OpenAI 專用的 `store`。
- `params.chat_template_kwargs`：合併至頂層 `api: "openai-completions"` 請求主體的 vLLM/OpenAI 相容聊天範本參數。對於關閉思考功能的 `vllm/nemotron-3-*`，隨附的 vLLM 外掛會自動發送 `enable_thinking: false` 和 `force_nonempty_content: true`；明確指定的 `chat_template_kwargs` 會覆寫產生的預設值，而 `extra_body.chat_template_kwargs` 仍擁有最終優先權。已配置的 vLLM Qwen 和 Nemotron 思考模型會公開二元 `/think` 選項（`off`、`on`），而不是多級努力階梯。
- `compat.thinkingFormat`：OpenAI 相容的思考承載樣式。對於 Together 風格的 `reasoning.enabled`，請使用 `"together"`；對於 Qwen 風格的頂層 `enable_thinking`，請使用 `"qwen"`；若要在支援請求層級 chat-template kwargs 的 Qwen 系列後端（如 vLLM）上進行 `chat_template_kwargs.enable_thinking`，請使用 `"qwen-chat-template"`。OpenClaw 會將停用的思考對應至 `false`，將啟用的思考對應至 `true`，而已配置的 vLLM Qwen 模型會針對這些格式公開二元 `/think` 選項。
- `compat.supportedReasoningEfforts`：針對每個模型的 OpenAI 相容推理努力清單。針對真正接受它的自訂端點包含 `"xhigh"`；接著 OpenClaw 會在指令選單、Gateway 工作階段列、工作階段修補驗證、Agent CLI 驗證，以及該設定供應商/模型的 `llm-task` 驗證中公開 `/think xhigh`。當後端需要針對標準層級使用供應商特定值時，請使用 `compat.reasoningEffortMap`。
- `params.preserveThinking`：僅限 Z.AI 的保留思考選擇加入功能。當啟用且思考開啟時，OpenClaw 會發送 `thinking.clear_thinking: false` 並重播先前的 `reasoning_content`；請參閱 [Z.AI thinking and preserved thinking](/zh-Hant/providers/zai#thinking-and-preserved-thinking)。
- `localService`：適用於本機/自託管模型伺服器的選用供應商層級進程管理員。當選取的模型屬於該供應商時，OpenClaw 會探測 `healthUrl` (或 `baseUrl + "/models"`)，如果端點已關閉則使用 `args` 啟動 `command`，等待最多 `readyTimeoutMs`，然後發送模型請求。`command` 必須是絕對路徑。`idleStopMs: 0` 會讓進程保持運作直到 OpenClaw 結束；正數值會在該毫秒數的閒置時間後停止 OpenClaw 產生的進程。請參閱 [Local model services](/zh-Hant/gateway/local-model-services)。
- 執行時期政策屬於供應商或模型，而非 `agents.defaults`。請使用 `models.providers.<provider>.agentRuntime` 來制定供應商範圍的規則，或使用 `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime` 來制定模型特定的規則。官方 OpenAI 供應商上的 OpenAI Agent 模型預設會選擇 Codex。
- 變更這些欄位的設定寫入器 (例如 `/models set`、`/models set-image`，以及回退新增/移除指令) 會儲存標準物件格式，並在可能時保留現有的回退清單。
- `maxConcurrent`：跨工作階段的最大並行 Agent 執行數 (每個工作階段仍為序列化)。預設值：4。

### 執行時期政策

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
        "anthropic/claude-opus-4-8": {
          agentRuntime: { id: "claude-cli" },
        },
        "vllm/*": {
          agentRuntime: { id: "openclaw" },
        },
      },
    },
  },
}
```

- `id`：`"auto"`、`"openclaw"`、已註冊的 plugin harness ID，或支援的 CLI 後端別名。內建的 Codex 插件會註冊 `codex`；內建的 Anthropic 插件則提供 `claude-cli` CLI 後端。
- `id: "auto"` 允許已註冊的 plugin harness 宣告其支援的輪次，並在沒有匹配的 harness 時使用 OpenClaw。明確指定的 plugin runtime（例如 `id: "codex"`）則會要求必須有該 harness，若其不可用或失敗，則會失敗並封閉（fail closed）。
- `id: "pi"` 僅作為 `openclaw` 的已棄用別名被接受，以保留來自 v2026.5.22 及更早版本的已交付配置。新配置應使用 `openclaw`。
- Runtime 優先順序為：首先是精確的模型策略（`agents.list[].models["provider/model"]`、`agents.defaults.models["provider/model"]` 或 `models.providers.<provider>.models[]`），然後是 `agents.list[]` / `agents.defaults.models["provider/*"]`，接著是 `models.providers.<provider>.agentRuntime` 處的供應商範圍策略。
- Whole-agent runtime 金鑰已屬舊版。`agents.defaults.agentRuntime`、`agents.list[].agentRuntime`、session runtime 固定值以及 `OPENCLAW_AGENT_RUNTIME` 會在 runtime 選取時被忽略。請執行 `openclaw doctor --fix` 以移除過時的數值。
- OpenAI agent 模型預設使用 Codex harness；當您想要明確指定時，provider/model `agentRuntime.id: "codex"` 仍然有效。
- 對於 Claude CLI 部署，建議優先使用 `model: "anthropic/claude-opus-4-8"` 加上模型範圍的 `agentRuntime.id: "claude-cli"`。舊版的 `claude-cli/claude-opus-4-7` 模型參照為了相容性仍然可以使用，但新配置應保持 provider/model 選取的標準性，並將執行後端置於 provider/model runtime 策略中。
- 這僅控制文字 agent-turn 的執行。媒體生成、視覺、PDF、音樂、影片和 TTS 仍會使用其 provider/model 設定。

**內建別名簡寫**（僅在模型位於 `agents.defaults.models` 時適用）：

| 別名                | 模型                            |
| ------------------- | ------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`     |
| `sonnet`            | `anthropic/claude-sonnet-4-6`   |
| `gpt`               | `openai/gpt-5.5`                |
| `gpt-mini`          | `openai/gpt-5.4-mini`           |
| `gpt-nano`          | `openai/gpt-5.4-nano`           |
| `gemini`            | `google/gemini-3.1-pro-preview` |
| `gemini-flash`      | `google/gemini-3-flash-preview` |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite`  |

您設定的別名始終優先於預設值。

Z.AI GLM-4.x 模型會自動啟用思考模式，除非您設定了 `--thinking off` 或自行定義 `agents.defaults.models["zai/<model>"].params.thinking`。
Z.AI 模型預設針對工具呼叫串流啟用 `tool_stream`。將 `agents.defaults.models["zai/<model>"].params.tool_stream` 設定為 `false` 以停用它。
Anthropic Claude Opus 4.8 在 OpenClaw 中預設保持關閉思考；當明確啟用自適應思考時，Anthropic 提供者擁有的預設努力值是 `high`。當未設定明確的思考等級時，Claude 4.6 模型預設為 `adaptive`。

### `agents.defaults.cliBackends`

僅文字後備執行（無工具呼叫）的可選 CLI 後端。當 API 提供者失敗時，可作為備份使用。

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

- CLI 後端以文字為優先；工具始終被停用。
- 當設定 `sessionArg` 時支援 Sessions。
- 當 `imageArg` 接受檔案路徑時，支援圖像直通。
- `reseedFromRawTranscriptWhenUncompacted: true` 允許後端在第一個壓縮摘要存在之前，從有限的原始 OpenClaw 轉錄尾部恢復安全的失效會話。身份設定檔或憑證時代的變更仍然從不進行原始重新播種。

### `agents.defaults.promptOverlays`

由模型系列套用於 OpenClaw 組裝提示表面的獨立於提供者的提示覆蓋層。GPT-5 系列 ID 在跨 OpenClaw/提供者路由接收共享行為約定；`personality` 僅控制友好的互動樣式層。原生 Codex 應用伺服器路由保留 Codex 擁有的基礎/模型指令，而不是此 OpenClaw GPT-5 覆蓋層，且 OpenClaw 會停用原生執行緒的 Codex 內建個性。

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

- `"friendly"`（預設值）和 `"on"` 可啟用友善的互動樣式層級。
- `"off"` 僅停用友善層級；已標記的 GPT-5 行為約定保持啟用狀態。
- 當此共用設定未設定時，仍會讀取傳統的 `plugins.entries.openai.config.personality`。

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

- `every`：持續時間字串 (ms/s/m/h)。預設值：`30m` (API 金鑰驗證) 或 `1h` (OAuth 驗證)。設為 `0m` 以停用。
- `includeSystemPromptSection`：若為 false，則從系統提示詞中省略 Heartbeat 區段，並跳過將 `HEARTBEAT.md` 注入至啟動內容中。預設值：`true`。
- `suppressToolErrorWarnings`：若為 true，則在心跳執行期間隱藏工具錯誤警告載荷。
- `timeoutSeconds`：心跳代理輪次在終止前允許的最大時間（秒）。若未設定，則在已設定時使用 `agents.defaults.timeoutSeconds`，否則心跳間隔上限為 600 秒。
- `directPolicy`：直接/DM 傳遞原則。`allow`（預設值）允許直接目標傳遞。`block` 抑制直接目標傳遞並發出 `reason=dm-blocked`。
- `lightContext`：若為 true，心跳執行會使用輕量級啟動內容，且僅保留工作區啟動檔案中的 `HEARTBEAT.md`。
- `isolatedSession`：若為 true，每次心跳執行都在沒有先前對話紀錄的新工作階段中執行。與 cron `sessionTarget: "isolated"` 的隔離模式相同。將每次心跳的 token 成本從 ~100K 降低至 ~2-5K token。
- `skipWhenBusy`：若為 true，心跳執行會在該代理的額外忙碌通道上延遲：其本身的金鑰工作階段子代理或巢狀指令工作。Cron 通道總是會延遲心跳，即使沒有此旗標。
- 各代理：設定 `agents.list[].heartbeat`。當任何代理定義了 `heartbeat` 時，**僅那些代理** 會執行心跳。
- 心跳會執行完整的代理輪次 — 較短的間隔會消耗更多 token。

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
        midTurnPrecheck: { enabled: false }, // optional tool-loop pressure check
        postCompactionSections: ["Session Startup", "Red Lines"], // opt in to AGENTS.md section reinjection
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

- `mode`：`default` 或 `safeguard`（針對長歷史記錄的分塊摘要）。請參閱 [壓縮](/zh-Hant/concepts/compaction)。
- `provider`：已註冊壓縮提供者外掛程式的 ID。設定後，會呼叫提供者的 `summarize()` 而非內建的 LLM 摘要。失敗時會回退至內建機制。設定提供者會強制啟用 `mode: "safeguard"`。請參閱 [壓縮](/zh-Hant/concepts/compaction)。
- `timeoutSeconds`：OpenClaw 在中止單一壓縮操作之前允許的最大秒數。預設值：`900`。
- `keepRecentTokens`：用於逐字保留最新對話紀錄尾端的代理切點預算。若明確設定，手動 `/compact` 會遵守此設定；否則手動壓縮為硬式檢查點。
- `identifierPolicy`：`strict`（預設）、`off` 或 `custom`。`strict` 會在壓縮摘要期間前置內建的不透明識別碼保留指引。
- `identifierInstructions`：當使用 `identifierPolicy=custom` 時所使用的選用自訂識別碼保留文字。
- `qualityGuard`：檢查格式錯誤輸出時的重試保護摘要檢查。在保護模式下預設啟用；設定 `enabled: false` 以跳過稽核。
- `midTurnPrecheck`：選用的工具迴圈壓力檢查。當 `enabled: true` 時，OpenClaw 會在附加工具結果之後以及下一次模型呼叫之前檢查上下文壓力。如果上下文不再適合，它會在提交提示之前中止當前嘗試，並重複使用現有的預檢復原路徑來截斷工具結果或壓縮並重試。適用於 `default` 和 `safeguard` 壓縮模式。預設值：停用。
- `postCompactionSections`：可選的 AGENTS.md H2/H3 章節名稱，用於在壓縮後重新注入。當未設定或設定為 `[]` 時，會停用重新注入。明確設定 `["Session Startup", "Red Lines"]` 會啟用該配對並保留舊有的 `Every Session`/`Safety` 後備機制。僅當額外上下文值得冒重複已記錄在壓縮摘要中的專案指導方針之風險時，才啟用此功能。
- `model`：可選的 `provider/model-id` 覆寫，僅用於壓縮摘要。當主要會話應保留一個模型但壓縮摘要應在另一個模型上執行時，請使用此選項；當未設定時，壓縮會使用會話的主要模型。
- `maxActiveTranscriptBytes`：可選的位元組閾值（`number` 或字串如 `"20mb"`），當作用中的 JSONL 超過閾值時，會在執行前觸發正常的本機壓縮。需要 `truncateAfterCompaction`，以便成功的壓縮能輪替至較小的後續逐字稿。當未設定或為 `0` 時停用。
- `notifyUser`：當設為 `true` 時，會在壓縮開始和完成時向使用者發送簡短通知（例如，「正在壓縮上下文...」和「壓縮完成」）。預設停用以保持壓縮靜默。
- `memoryFlush`：自動壓縮前的靜默代理回合，用於儲存持久記憶。當此維護回合應停留在本機模型時，將 `model` 設定為特定的提供者/模型（例如 `ollama/qwen3:8b`）；此覆寫不會繼承作用中會話的後備鏈。當工作區為唯讀時會跳過。

### `agents.defaults.runRetries`

嵌入式代理執行時間的外部執行迴圈重試迭代邊界，以防止失敗復原期間出現無限執行迴圈。請注意，此設定目前僅適用於嵌入式代理執行時間，不適用於 ACP 或 CLI 執行時間。

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

- `base`：外部執行迴圈的執行重試迭代次數。預設值：`24`。
- `perProfile`：每個候選備用設定檔獲得的額外執行重試次數。預設值：`8`。
- `min`：執行重試次數的絕對下限。預設值：`32`。
- `max`：執行重試次數的絕對上限，以防止無限制執行。預設值：`160`。

### `agents.defaults.contextPruning`

在發送給 LLM 之前，從記憶體內容中修剪**舊的工具結果**。**不會**修改磁碟上的工作階段歷史記錄。

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

- `mode: "cache-ttl"` 啟用修剪傳遞。
- `ttl` 控制修剪可以再次執行的頻率（在最後一次快取觸碰之後）。
- 修剪會先軟修剪過大的工具結果，然後在需要時硬清除較舊的工具結果。
- `softTrimRatio` 和 `hardClearRatio` 接受從 `0.0` 到 `1.0` 的值；設定驗證會拒絕超出該範圍的值。

**軟修剪**會保留開頭和結尾，並在中間插入 `...`。

**硬清除**會用預留位置取代整個工具結果。

備註：

- 影像區塊從不會被修剪/清除。
- 比例是基於字元（大約），而不是精確的 token 數量。
- 如果存在的助理訊息少於 `keepLastAssistants` 則會跳過修剪。

</Accordion>

請參閱 [工作階段修剪](/zh-Hant/concepts/session-pruning) 以了解行為詳情。

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
- 頻道覆寫：`channels.<channel>.blockStreamingCoalesce`（以及每個帳戶的變體）。Signal/Slack/Discord/Google Chat 預設為 `minChars: 1500`。
- `humanDelay`：區塊回覆之間的隨機暫停時間。`natural` = 800–2500ms。每個代理的覆寫：`agents.list[].humanDelay`。

請參閱 [串流](/zh-Hant/concepts/streaming) 以了解行為和分塊詳情。

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
- 每個會話的覆寫：`session.typingMode`、`session.typingIntervalSeconds`。

請參閱 [輸入指示器](/zh-Hant/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

嵌入式代理的可選沙箱機制。完整指南請參閱 [沙箱機制](/zh-Hant/gateway/sandboxing)。

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

- `docker`：本機 Docker 執行時（預設）
- `ssh`：通用 SSH 支援的遠端執行時
- `openshell`：OpenShell 執行時

當選取 `backend: "openshell"` 時，執行時特定設定會移至
`plugins.entries.openshell.config`。

**SSH 後端設定：**

- `target`：`user@host[:port]` 格式的 SSH 目標
- `command`：SSH 用戶端指令（預設：`ssh`）
- `workspaceRoot`：用於各範圍工作區的絕對遠端根目錄
- `identityFile` / `certificateFile` / `knownHostsFile`：傳遞給 OpenSSH 的現有本機檔案
- `identityData` / `certificateData` / `knownHostsData`：OpenClaw 在執行時具體化為暫存檔案的內嵌內容或 SecretRef
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主機金鑰策略控制項

**SSH 認證優先順序：**

- `identityData` 優先於 `identityFile`
- `certificateData` 優先於 `certificateFile`
- `knownHostsData` 優先於 `knownHostsFile`
- SecretRef 支援的 `*Data` 值會在沙箱工作階段開始前，從作用中的 secrets 執行時快照中解析

**SSH 後端行為：**

- 在建立或重新建立後，將遠端工作區初始化一次
- 然後保持遠端 SSH 工作區為標準
- 透過 SSH 路由 `exec`、檔案工具和媒體路徑
- 不會自動將遠端變更同步回主機
- 不支援沙箱瀏覽器容器

**工作區存取：**

- `none`：`~/.openclaw/sandboxes` 下的各範圍沙箱工作區
- `ro`：位於 `/workspace` 的沙箱工作區，代理程式工作區以唯讀方式掛載於 `/agent`
- `rw`：代理程式工作區以讀寫方式掛載於 `/workspace`

**範圍 (Scope)：**

- `session`：各工作階段容器 + 工作區
- `agent`：每個代理程式一個容器 + 工作區（預設）
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

- `mirror`：在執行前從本機初始化遠端，在執行後同步回來；本機工作區保持為標準
- `remote`：在建立沙箱時初始化遠端一次，然後保持遠端工作區為標準

在 `remote` 模式下，在 OpenClaw 外部進行的本機主機編輯不會在初始化步驟後自動同步到沙箱中。
傳輸方式是 SSH 進入 OpenShell 沙箱，但外掛程式擁有沙箱生命週期和選用的鏡像同步。

**`setupCommand`** 在容器建立後執行一次（透過 `sh -lc`）。需要網路出口、可寫入根目錄、root 使用者。

**容器預設為 `network: "none"`** — 如果代理程式需要對外存取，請設定為 `"bridge"`（或自訂橋接網路）。
`"host"` 已被封鎖。除非您明確設定
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（緊急手段），否則 `"container:<id>"` 預設已封鎖。
在作用中的 OpenClaw 沙箱中轉換的 Codex 應用程式伺服器會對其原生程式碼模式網路存取使用相同的出口設定。

**傳入附件** 會暫存至作用中工作區的 `media/inbound/*` 中。

**`docker.binds`** 會掛載其他主機目錄；全域和各代理程式的綁定會合併。

**沙箱瀏覽器** (`sandbox.browser.enabled`)：容器中的 Chromium + CDP。noVNC URL 會注入至系統提示詞。不需要 `openclaw.json` 中的 `browser.enabled`。
noVNC 觀察者存取預設使用 VNC 認證，且 OpenClaw 會發出一個短期有效的 Token URL（而不是在共用 URL 中暴露密碼）。

- `allowHostControl: false`（預設）會封鎖沙箱工作階段以目標指向主機瀏覽器。
- `network` 預設為 `openclaw-sandbox-browser`（專用橋接網路）。僅當您明確需要全域橋接連線時，才設定為 `bridge`。
- `cdpSourceRange` 可選擇性地將容器邊緣的 CDP 進入限制為 CIDR 範圍（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 僅將其他主機目錄掛載至沙箱瀏覽器容器中。當設定時（包括 `[]`），它會取代瀏覽器容器的 `docker.binds`。
- 啟動預設值定義於 `scripts/sandbox-browser-entrypoint.sh` 中，並針對容器主機進行了調整：
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
  - `--disable-3d-apis`、`--disable-software-rasterizer` 和 `--disable-gpu` 預設
    已啟用，如果 WebGL/3D 使用需要，可以使用
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 來停用它們。
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 會在您的工作流程
    依賴擴充功能時重新啟用它們。
  - `--renderer-process-limit=2` 可以使用
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 變更；設定 `0` 以使用 Chromium 的
    預設程序限制。
  - 當啟用 `noSandbox` 時，加上 `--no-sandbox`。
  - 預設值是容器映像檔基準；使用具有自訂進入點的自訂瀏覽器映像檔來變更容器預設值。

</Accordion>

瀏覽器沙盒和 `sandbox.docker.binds` 僅支援 Docker。

建置映像檔（從原始碼檢出）：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

若透過 npm 安裝而未取得原始碼檔案，請參閱 [Sandboxing § Images and setup](/zh-Hant/gateway/sandboxing#images-and-setup) 以取得內聯 `docker build` 指令。

### `agents.list` (個別代理程式覆寫)

使用 `agents.list[].tts` 為代理程式指定其專屬的 TTS 提供者、語音、模型、風格或自動 TTS 模式。代理程式區塊會與全域 `messages.tts` 進行深度合併，因此共用憑證可保留在同一位置，而個別代理程式僅覆寫其所需的語音或提供者欄位。目前使用中的代理程式覆寫會套用至自動口語回覆、`/tts audio`、`/tts status` 以及 `tts` 代理程式工具。請參閱 [Text-to-speech](/zh-Hant/tools/tts#per-agent-voice-overrides) 以了解提供者範例與優先順序。

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
            elevenlabs: { speakerVoiceId: "EXAVITQu4vr4xnSDxMaL" },
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
- `default`：當設有多個時，第一個優先（會記錄警告）。若未設定，則清單中的第一個項目為預設值。
- `model`：字串形式會設定嚴格的個別代理程式主要模型，不具模型備援；物件形式 `{ primary }` 同樣是嚴格的，除非您加入 `fallbacks`。使用 `{ primary, fallbacks: [...] }` 讓該代理程式啟用備援，或使用 `{ primary, fallbacks: [] }` 將嚴格行為設為明確。若僅覆寫 `primary` 的 Cron 排程工作，除非您設定 `fallbacks: []`，否則仍會繼承預設的備援設定。
- `params`：個別代理程式的串流參數，會與 `agents.defaults.models` 中選取的模型項目進行合併。使用此項可針對特定代理程式進行覆寫（例如 `cacheRetention`、`temperature` 或 `maxTokens`），無需重複整個模型目錄。
- `tts`：可選的個別代理文字轉語音覆寫。此區塊會與 `messages.tts` 進行深度合併，因此請將共用的提供者憑證與後援策略保留在 `messages.tts` 中，並在此處僅設定特定於角色的值，例如提供者、語音、模型、風格或自動模式。
- `skills`：可選的個別代理技能允許清單。若省略，代理會在設定時繼承 `agents.defaults.skills`；明確的清單會取代預設值而非合併，而 `[]` 表示不使用任何技能。
- `thinkingDefault`：可選的個別代理預設思考層級 (`off | minimal | low | medium | high | xhigh | adaptive | max`)。當未設定個別訊息或工作階段覆寫時，會覆寫此代理的 `agents.defaults.thinkingDefault`。選取的提供者/模型設定檔會控制哪些值有效；對於 Google Gemini，`adaptive` 會保留提供者擁有的動態思考 (`thinkingLevel` 在 Gemini 3/3.1 上省略，在 Gemini 2.5 上則為 `thinkingBudget: -1`)。
- `reasoningDefault`：可選的個別代理預設推理可見性 (`on | off | stream`)。當未設定個別訊息或工作階段推理覆寫時，會覆寫此代理的 `agents.defaults.reasoningDefault`。
- `fastModeDefault`：可選的個別代理快速模式預設值 (`true | false`)。當未設定個別訊息或工作階段快速模式覆寫時套用。
- `models`：可選的個別代理模型目錄/執行階段覆寫，以完整的 `provider/model` ID 作為鍵值。請使用 `models["provider/model"].agentRuntime` 來處理個別代理的執行階段例外。
- `runtime`：可選的個別代理執行階段描述項。當代理應預設為 ACP harness 工作階段時，請使用帶有 `runtime.acp` 預設值 (`agent`、`backend`、`mode`、`cwd`) 的 `type: "acp"`。
- `identity.avatar`：工作區相對路徑、`http(s)` URL 或 `data:` URI。
- `identity` 衍生預設值：從 `emoji` 衍生 `ackReaction`，從 `name`/`emoji` 衍生 `mentionPatterns`。
- `subagents.allowAgents`：針對明確 `sessions_spawn.agentId` 目標的已配置代理程式 ID 允許清單（`["*"]` = 任何已配置的目標；預設值：僅限相同代理程式）。當應允許針對自身的 `agentId` 呼叫時，請包含請求者 ID。已刪除代理程式設定的過時條目會被 `sessions_spawn` 拒絕，並從 `agents_list` 中省略；執行 `openclaw doctor --fix` 來清理它們，或者如果該目標應在繼承預設值的同時保持可生成，則新增一個最少的 `agents.list[]` 條目。
- Sandbox 繼承防護：如果請求者會話處於 sandbox 環境中，`sessions_spawn` 會拒絕將以非 sandbox 方式執行的目標。
- `subagents.requireAgentId`：當為 true 時，封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確選擇設定檔；預設值：false）。

---

## 多代理程式路由

在一個 Gateway 內執行多個隔離的代理程式。請參閱 [Multi-Agent](/zh-Hant/concepts/multi-agent)。

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

- `type` (選用)：用於正常路由的 `route` (缺少類型預設為 route)，用於持續性 ACP 對話綁定的 `acp`。
- `match.channel` (必填)
- `match.accountId` (選用；`*` = 任何帳戶；省略 = 預設帳戶)
- `match.peer` (選用；`{ kind: direct|group|channel, id }`)
- `match.guildId` / `match.teamId` (選用；通道特定)
- `acp` (選用；僅用於 `type: "acp"`)：`{ mode, label, cwd, backend }`

**確定性比對順序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` (精確，無 peer/guild/team)
5. `match.accountId: "*"` (整個頻道)
6. 預設代理程式

在每一層中，第一個符合的 `bindings` 項目優先。

對於 `type: "acp"` 項目，OpenClaw 會根據精確的對話身分 (`match.channel` + account + `match.peer.id`) 進行解析，並不使用上述的路由綁定層級順序。

### 各代理程式的存取設定檔

<Accordion title="完整存取 (無沙箱)">

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

<Accordion title="無檔案系統存取 (僅傳訊)">

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

詳見 [多代理程式沙箱與工具](/zh-Hant/tools/multi-agent-sandbox-tools) 以了解優先順序細節。

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

<Accordion title="Session 欄位詳情">

- **`scope`**: 群組聊天內容的基礎會話分組策略。
  - `per-sender` (預設值): 每個傳送者在頻道內容中會獲得一個獨立的會話。
  - `global`: 頻道內容中的所有參與者共用單一會話 (僅在預期共用內容時使用)。
- **`dmScope`**: 如何分組私訊 (DM)。
  - `main`: 所有私訊共用主會話。
  - `per-peer`: 跨頻道依據傳送者 ID 隔離。
  - `per-channel-peer`: 依據頻道 + 傳送者隔離 (建議用於多使用者收件匣)。
  - `per-account-channel-peer`: 依據帳戶 + 頻道 + 傳送者隔離 (建議用於多帳戶)。
- **`identityLinks`**: 將規範 ID 對應至提供者前置字元的對等物件，以便跨頻道共用會話。諸如 `/dock_discord` 等 Dock 指令會使用相同的對應表，將使用中會話的回覆路由切換至另一個連結的頻道對等物件；請參閱 [Channel docking](/zh-Hant/concepts/channel-docking)。
- **`reset`**: 主要重設策略。`daily` 會在 `atHour` 當地時間重設；`idle` 會在 `idleMinutes` 之後重設。當兩者皆有設定時，以較早過期者為準。每日重設新鮮度會使用會話列的 `sessionStartedAt`；閒置重設新鮮度則使用 `lastInteractionAt`。背景/系統事件寫入 (例如心跳、喚醒 cron、執行通知與 Gateway 簿記作業) 可以更新 `updatedAt`，但它們不會保持每日/閒置會話的新鮮度。
- **`resetByType`**: 依類型覆寫 (`direct`、`group`、`thread`)。舊版 `dm` 被接受為 `direct` 的別名。
- **`mainKey`**: 舊版欄位。執行階段對於主要的直接聊天貯體，總是使用 `"main"`。
- **`agentToAgent.maxPingPongTurns`**: Agent 對 Agent 交換期間，Agent 之間的最大回覆輪數 (整數，範圍：`0`-`20`，預設值：`5`)。`0` 會停用乒乓連鎖。
- **`sendPolicy`**: 依據 `channel`、`chatType` (`direct|group|channel`，並附有舊版 `dm` 別名)、`keyPrefix` 或 `rawKeyPrefix` 比對。優先採用首次拒絕。
- **`maintenance`**: 會話儲存庫清理 + 保留控制項。
  - `mode`: `warn` 僅發出警告；`enforce` 會套用清理。
  - `pruneAfter`: 陳舊項目的年限截止 (預設 `30d`)。
  - `maxEntries`: `sessions.json` 中的項目數量上限 (預設 `500`)。執行階段寫入會以少量高水位緩衝區批次清理，以因應生產環境大小的上限；`openclaw sessions cleanup --enforce` 會立即套用上限。
  - `rotateBytes`: 已棄用且已忽略；`openclaw doctor --fix` 會將其從較舊的設定中移除。
  - `resetArchiveRetention`: `*.reset.<timestamp>` 逐字稿封存的保留設定。預設為 `pruneAfter`；設定 `false` 即可停用。
  - `maxDiskBytes`: 選用的會話目錄磁碟預算。在 `warn` 模式下，它會記錄警告；在 `enforce` 模式下，它會先移除最舊的構件/會話。
  - `highWaterBytes`: 預算清理後的選用目標。預設為 `maxDiskBytes` 的 `80%`。
- **`threadBindings`**: 執行緒繫結會話功能的全域預設值。
  - `enabled`: 主要預設開關 (提供者可以覆寫；Discord 使用 `channels.discord.threadBindings.enabled`)
  - `idleHours`: 預設的非活動自動取消聚焦 (小時) (`0` 表示停用；提供者可以覆寫)
  - `maxAgeHours`: 預設的強制最大年限 (小時) (`0` 表示停用；提供者可以覆寫)
  - `spawnSessions`: 從 `sessions_spawn` 和 ACP 執行緒繁衍建立執行緒繫結工作會話的預設閘道。啟用執行緒繫結時，預設為 `true`；提供者/帳戶可以覆寫。
  - `defaultSpawnContext`: 執行緒繫結繁衍的預設原生子 Agent 內容 (`"fork"` 或 `"isolated"`)。預設為 `"fork"`。

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

### 回應前綴

各頻道/帳號覆寫：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析順序（最優先者勝出）：帳號 → 頻道 → 全域。`""` 會停用並停止層疊。`"auto"` 會衍生 `[{identity.name}]`。

**範本變數：**

| 變數              | 說明             | 範例                        |
| ----------------- | ---------------- | --------------------------- |
| `{model}`         | 短模型名稱       | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型識別碼   | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供者名稱       | `anthropic`                 |
| `{thinkingLevel}` | 當前思考等級     | `high`、`low`、`off`        |
| `{identity.name}` | 代理程式身分名稱 | （與 `"auto"` 相同）        |

變數不區分大小寫。`{think}` 是 `{thinkingLevel}` 的別名。

### Ack 回應

- 預設為使用中代理程式的 `identity.emoji`，否則為 `"👀"`。設定 `""` 可停用。
- 各頻道覆寫：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析順序：帳號 → 頻道 → `messages.ackReaction` → 身分後備。
- 範圍：`group-mentions`（預設）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在支援回應的頻道（如 Slack、Discord、Telegram、WhatsApp 和 iMessage）上，回覆後移除 ack。
- `messages.statusReactions.enabled`：在 Slack、Discord、Telegram 和 WhatsApp 上啟用生命週期狀態回應。
  在 Slack 和 Discord 上，若未設定，當 ack 回應啟用時會保持狀態回應開啟。
  在 Telegram 和 WhatsApp 上，需明確設定為 `true` 才能啟用生命週期狀態回應。
- `messages.statusReactions.emojis`: 覆蓋生命週期表情符號鍵：
  `queued`、`thinking`、`compacting`、`tool`、`coding`、`web`、`deploy`、`build`、
  `concierge`、`done`、`error`、`stallSoft` 和 `stallHard`。
  Telegram 僅允許固定的反應集合，因此不支援的已配置表情符號會回退至該聊天最接近的支援狀態變體。

### 輸入防抖

將來自同一發送者的快速純文字訊息批次處理為單一 Agent 週期。媒體/附件會立即排清。控制指令會略過防抖。

### TTS (文字轉語音)

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
          speakerVoiceId: "voice_id",
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
          speakerVoice: "en-US-AvaMultilingualNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
        openai: {
          apiKey: "openai_api_key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini-tts",
          speakerVoice: "alloy",
        },
      },
    },
  },
}
```

- `auto` 控制預設的自動 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可以覆蓋本地偏好設定，而 `/tts status` 顯示有效狀態。
- `summaryModel` 會覆蓋自動摘要的 `agents.defaults.model.primary`。
- `modelOverrides` 預設為啟用；`modelOverrides.allowProvider` 預設為 `false` (選用)。
- API 金鑰會回退至 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- 內建的語音提供者屬於外掛程式。如果設定了 `plugins.allow`，請包含您要使用的每個 TTS 提供者外掛程式，例如 `microsoft` 用於 Edge TTS。舊版的 `edge` 提供者 ID 被接受為 `microsoft` 的別名。
- `providers.openai.baseUrl` 會覆蓋 OpenAI TTS 端點。解析順序為設定，然後是 `OPENAI_TTS_BASE_URL`，接著是 `https://api.openai.com/v1`。
- 當 `providers.openai.baseUrl` 指向非 OpenAI 端點時，OpenClaw 會將其視為 OpenAI 相容的 TTS 伺服器並放寬模型/語音驗證。

---

## 對話

交談模式的預設值。

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        speakerVoiceId: "elevenlabs_voice_id",
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
          speakerVoice: "cedar",
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

- 當設定了多個 Talk 提供者時，`talk.provider` 必須符合 `talk.providers` 中的一個鍵。
- 舊版扁平 Talk 鍵 (`talk.voiceId`, `talk.voiceAliases`, `talk.modelId`, `talk.outputFormat`, `talk.apiKey`) 僅供相容性使用。請執行 `openclaw doctor --fix` 將保存的設定重寫為 `talk.providers.<provider>`。
- 語音 ID 會回退至 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受純文字字串或 SecretRef 物件。
- `ELEVENLABS_API_KEY` 回退僅在未設定 Talk API 金鑰時套用。
- `providers.*.voiceAliases` 讓 Talk 指令可以使用易記名稱。
- `providers.mlx.modelId` 選擇 macOS 本機 MLX 助手使用的 Hugging Face repo。如果省略，macOS 會使用 `mlx-community/Soprano-80M-bf16`。
- macOS MLX 播放在存在時會透過內建的 `openclaw-mlx-tts` 助手執行，或執行 `PATH` 上的可執行檔；`OPENCLAW_MLX_TTS_BIN` 會覆寫開發用途的助手路徑。
- `consultThinkingLevel` 控制在 Control UI Talk 即時 `openclaw_agent_consult` 呼叫後方執行的完整 OpenClaw 代理程式的思考等級。保持未設定以保留正常的會話/模型行為。
- `consultFastMode` 為 Control UI Talk 即時諮詢設定一次性快速模式覆寫，而不會變更會話的正常快速模式設定。
- `speechLocale` 設定 iOS/macOS Talk 語音辨識所使用的 BCP 47 地區 ID。保持未設定以使用裝置預設值。
- `silenceTimeoutMs` 控制 Talk 模式在使用者靜音後傳送文字記錄前的等待時間。未設定則保持平台預設的暫停視窗 (`700 ms on macOS and Android, 900 ms on iOS`)。
- `realtime.instructions` 將提供者導向的系統指令附加至 OpenClaw 內建的即時提示，以便在不失去預設 `openclaw_agent_consult` 指導的情況下設定語音風格。
- `realtime.consultRouting` 控制當即時提供者產生不包含 `openclaw_agent_consult` 的最終使用者逐字稿時的 Gateway 中繼後備機制：`provider-direct` 會保留直接提供者的回覆，而 `force-agent-consult` 則會將最終請求透過 OpenClaw 進行路由。

---

## 相關

- [Configuration reference](/zh-Hant/gateway/configuration-reference) — 所有其他配置鍵
- [Configuration](/zh-Hant/gateway/configuration) — 常見任務與快速設定
- [Configuration examples](/zh-Hant/gateway/configuration-examples)
