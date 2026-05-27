---
summary: "代理預設值、多代理路由、工作階段、訊息和交談設定"
read_when:
  - Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills)
  - Configuring multi-agent routing and bindings
  - Adjusting session, message delivery, and talk-mode behavior
title: "設定 — 代理"
---

在 `agents.*`、`multiAgent.*`、`session.*`、
`messages.*` 和 `talk.*` 下的代理範圍配置鍵。如需通道、工具、Gateway 執行時和其他頂層鍵，請參閱[設定參考](/zh-Hant/gateway/configuration-reference)。

## Agent defaults

### `agents.defaults.workspace`

預設值：設定時為 `OPENCLAW_WORKSPACE_DIR`，否則為 `~/.openclaw/workspace`。

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

明確的 `agents.defaults.workspace` 值優先於
`OPENCLAW_WORKSPACE_DIR`。當您不想將該路徑寫入設定時，請使用環境變數將預設代理指向已掛載的工作區。

### `agents.defaults.repoRoot`

顯示在系統提示詞 Runtime 行中的選用存放庫根目錄。若未設定，OpenClaw 會透過從工作區向上巡覽自動偵測。

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

針對未設定
`agents.list[].skills` 的代理的可選預設技能允許清單。

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
- 非空白的 `agents.list[].skills` 清單是該代理的最終集合；它
  不會與預設值合併。

### `agents.defaults.skipBootstrap`

停用工作區引導檔案（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`）的自動建立。

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.skipOptionalBootstrapFiles`

跳過建立選定的可選工作區檔案，同時仍寫入必要的引導檔案。有效值為：`SOUL.md`、`USER.md`、`HEARTBEAT.md` 和 `IDENTITY.md`。

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

控制何時將工作區引導檔案注入系統提示詞。預設值：`"always"`。

- `"continuation-skip"`：安全續輪（在完成助手回應後）會跳過工作區啟動重新注入，以減少提示大小。心跳執行和壓縮後重試仍會重建上下文。
- `"never"`：在每輪中停用工作區啟動和上下文檔案注入。僅對完全擁有其提示生命週期的代理使用此選項（自定義上下文引擎、構建自己上下文的原生運行時或專用的無啟動工作流程）。心跳和壓縮恢復輪也會跳過注入。

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

每代理覆寫：`agents.list[].contextInjection`。省略的值繼承
`agents.defaults.contextInjection`。

### `agents.defaults.bootstrapMaxChars`

截斷前每個工作區啟動檔案的最大字元數。預設值：`12000`。

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

每代理覆寫：`agents.list[].bootstrapMaxChars`。省略的值繼承
`agents.defaults.bootstrapMaxChars`。

### `agents.defaults.bootstrapTotalMaxChars`

跨所有工作區啟動檔案注入的最大總字元數。預設值：`60000`。

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

每代理覆寫：`agents.list[].bootstrapTotalMaxChars`。省略的值
繼承 `agents.defaults.bootstrapTotalMaxChars`。

### 個別代理程式啟動設定檔覆寫

當某個代理需要與共享預設值不同的提示注入行為時，使用每代理啟動設定檔覆寫。省略的欄位繼承自
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

控制當啟動上下文被截斷時，代理可見的系統提示通知。
預設值：`"always"`。

- `"off"`：從不將截斷通知文字注入系統提示中。
- `"once"`：對每個唯一的截斷簽名注入一次簡潔的通知。
- `"always"`：當存在截斷時，在每次執行時注入簡潔的通知（建議）。

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
  正常的工作區啟動注入。
- `agents.defaults.startupContext.*`：
  一次性重置/啟動模型運行前奏，包括最近的每日
  `memory/*.md` 檔案。純聊天 `/new` 和 `/reset` 指令
  將被確認而不調用模型。
- `skills.limits.*`:
  插入到系統提示詞中的精簡技能列表。
- `agents.defaults.contextLimits.*`:
  有界的執行時摘要與已插入的執行時擁有區塊。
- `memory.qmd.limits.*`:
  已編索引的記憶體搜尋片段與插入大小調整。

僅當某個 Agent 需要不同的預算時，才使用匹配的個別 Agent 覆蓋：

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextInjection`
- `agents.list[].bootstrapMaxChars`
- `agents.list[].bootstrapTotalMaxChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

控制在重置/啟動模型執行時插入的初始啟動前奏。
純聊天 `/new` 和 `/reset` 指令會確認重置而不調用
模型，因此不會載入此前奏。

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
        toolResultMaxChars: 16000,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars`: 加入截斷
  元資料與續行通知前，預設 `memory_get` 摘要上限。
- `memoryGetDefaultLines`: 當省略 `lines` 時，預設 `memory_get` 行視窗。
- `toolResultMaxChars`: 用於持久化結果與
  溢位恢復的即時工具結果上限。
- `postCompactionMaxChars`: 在壓縮後
  重新整理插入期間使用的 AGENTS.md 摘要上限。

#### `agents.list[].contextLimits`

共用 `contextLimits` 控制的個別代理覆寫。省略欄位將繼承自 `agents.defaults.contextLimits`。

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

插入到系統提示詞之精簡技能列表的全域上限。這
不影響隨需讀取 `SKILL.md` 檔案。

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

在呼叫提供者前，逐字稿/工具圖片區塊中圖片最長邊的像素大小上限。
預設值：`1200`。

較低的值通常會減少視覺 token 的使用量，以及針對截圖密集執行的請求負載大小。
較高的值則保留更多視覺細節。

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.imageQuality`

從檔案路徑、URL 和媒體參照載入的圖片，其圖片工具的壓縮/細節偏好設定。
預設值：`auto`。

OpenClaw 會根據選定的圖像模型調整縮放階梯。例如，Claude Opus 4.7、OpenAI GPT-5.5、Qwen VL 和代管式 Llama 4 視覺模型可以使用比較舊/預設的高細節視覺路徑更大的圖像，而在 `auto` 模式下，多圖像輪次會更積極地壓縮，以控制 token 和延遲成本。

數值：

- `auto`：適應模型限制和圖像數量。
- `efficient`：偏好較小的圖像以減少 token 和位元組使用量。
- `balanced`：使用標準的中間階梯。
- `high`：為螢幕截圖、圖表和文件圖像保留更多細節。

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

- `model`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 字串形式僅設定主要模型。
  - 物件形式設定主要模型及有序的故障轉移模型。
- `imageModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由 `image` 工具路徑用作其視覺模型配置。
  - 當選定/預設模型無法接受圖像輸入時，也用作故障轉移路由。
  - 偏好明確的 `provider/model` 引用。為了相容性接受純 ID；如果純 ID 唯一符合 `models.providers.*.models` 中設定的圖像處理條目，OpenClaw 會將其限定為該提供者。模糊的設定符合項需要明確的提供者前綴。
- `imageGenerationModel`：接受字串（`"provider/model"`）或物件（`{ primary, fallbacks }`）。
  - 由共享的圖像生成功能以及任何未來生成圖像的工具/插件介面使用。
  - 典型值：`google/gemini-3.1-flash-image-preview` 用於原生 Gemini 影像生成，`fal/fal-ai/flux/dev` 用於 fal，`openai/gpt-image-2` 用於 OpenAI Images，或 `openai/gpt-image-1.5` 用於透明背景的 OpenAI PNG/WebP 輸出。
  - 如果您直接選擇了供應商/模型，請同時設定相符的供應商驗證（例如 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY` 用於 `google/*`，`OPENAI_API_KEY` 或 OpenAI Codex OAuth 用於 `openai/gpt-image-2` / `openai/gpt-image-1.5`，`FAL_KEY` 用於 `fal/*`）。
  - 如果省略，`image_generate` 仍可推斷具有驗證支援的預設供應商。它會先嘗試目前的預設供應商，然後依照供應商 ID 的順序嘗試其餘已註冊的影像生成供應商。
- `musicGenerationModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 由共享的音樂生成功能和內建 `music_generate` 工具使用。
  - 典型值：`google/lyria-3-clip-preview`、`google/lyria-3-pro-preview` 或 `minimax/music-2.6`。
  - 如果省略，`music_generate` 仍可推斷具有驗證支援的預設供應商。它會先嘗試目前的預設供應商，然後依照供應商 ID 的順序嘗試其餘已註冊的音樂生成供應商。
  - 如果您直接選擇了供應商/模型，請同時設定相符的供應商驗證/API 金鑰。
- `videoGenerationModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 由共享的影片生成功能和內建 `video_generate` 工具使用。
  - 典型值：`qwen/wan2.6-t2v`、`qwen/wan2.6-i2v`、`qwen/wan2.6-r2v`、`qwen/wan2.6-r2v-flash` 或 `qwen/wan2.7-r2v`。
  - 如果省略，`video_generate` 仍可推斷具有驗證支援的預設供應商。它會先嘗試目前的預設供應商，然後依照供應商 ID 的順序嘗試其餘已註冊的影片生成供應商。
  - 如果您直接選擇提供商/模型，請同時配置匹配的提供商驗證/API 金鑰。
  - 內建的 Qwen 影片生成提供商支援最多 1 個輸出影片、1 個輸入影像、4 個輸入影片、10 秒持續時間，以及提供商層級的 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark` 選項。
- `pdfModel`：接受字串 (`"provider/model"`) 或物件 (`{ primary, fallbacks }`)。
  - 用於模型路由的 `pdf` 工具。
  - 如果省略，PDF 工具會回退至 `imageModel`，然後再回退至解析的會話/預設模型。
- `pdfMaxBytesMb`：當呼叫時未傳遞 `maxBytesMb` 時，`pdf` 工具的預設 PDF 大小限制。
- `pdfMaxPages`：`pdf` 工具中擷取回退模式考慮的預設最大頁數。
- `verboseDefault`：代理的預設詳細輸出等級。值：`"off"`、`"on"`、`"full"`。預設：`"off"`。
- `toolProgressDetail`：`/verbose` 工具摘要和 progress-draft 工具列的詳細模式。值：`"explain"` (預設，緊湊的人類標籤) 或 `"raw"` (在可用時附加原始指令/詳細資訊)。個別代理的 `agents.list[].toolProgressDetail` 會覆寫此預設值。
- `reasoningDefault`：代理的預設推理可見性。值：`"off"`、`"on"`、`"stream"`。個別代理的 `agents.list[].reasoningDefault` 會覆寫此預設值。配置的推理預設值僅在未設定每則訊息或會話推理覆寫時，針對擁有者、授權發送者或操作員管理員閘道上下文套用。
- `elevatedDefault`：代理的預設提升輸出級別。數值：`"off"`、`"on"`、`"ask"`、`"full"`。預設值：`"on"`。
- `model.primary`：格式 `provider/model`（例如 `openai/gpt-5.5` 代表 OpenAI API 金鑰或 Codex OAuth 存取權）。如果您省略提供者，OpenClaw 會先嘗試別名，然後是該確切模型 ID 的唯一已配置提供者匹配，最後才回退到已配置的預設提供者（已棄用的相容性行為，因此偏好明確的 `provider/model`）。如果該提供者不再公開已配置的預設模型，OpenClaw 將回退到第一個已配置的提供者/模型，而不會顯示陳舊的已移除提供者預設值。
- `models`：`/model` 的已配置模型目錄與允許清單。每個條目可以包含 `alias`（捷徑）和 `params`（提供者特定，例如 `temperature`、`maxTokens`、`cacheRetention`、`context1m`、`responsesServerCompaction`、`responsesCompactThreshold`、OpenRouter `provider` 路由、`chat_template_kwargs`、`extra_body`/`extraBody`）。
  - 使用 `provider/*` 條目（例如 `"openai-codex/*": {}` 或 `"vllm/*": {}`）來顯示所選提供者的所有已探索模型，而無需手動列出每個模型 ID。
  - 當該提供者的每個動態探索模型都應使用相同的執行時期時，請將 `agentRuntime` 新增至 `provider/*` 條目中。確切的 `provider/model` 執行時期政策仍優先於萬用字元。
  - 安全編輯：使用 `openclaw config set agents.defaults.models '<json>' --strict-json --merge` 新增條目。`config set` 會拒絕移除現有允許清單條目的替換，除非您傳遞 `--replace`。
  - 供應商範圍的配置/導入流程會將選取的供應商模型合併到此映射中，並保留已配置的無關供應商。
  - 對於直接的 OpenAI Responses 模型，會自動啟用伺服器端壓縮。請使用 `params.responsesServerCompaction: false` 停止注入 `context_management`，或使用 `params.responsesCompactThreshold` 覆寫閾值。請參閱 [OpenAI server-side compaction](/zh-Hant/providers/openai#server-side-compaction-responses-api)。
- `params`：套用至所有模型的全域預設供應商參數。設定於 `agents.defaults.params`（例如 `{ cacheRetention: "long" }`）。
- `params` 合併優先順序（配置）：`agents.defaults.params`（全域基底）會被 `agents.defaults.models["provider/model"].params`（個別模型）覆寫，然後 `agents.list[].params`（符合的代理程式 ID）會依鍵值覆寫。詳情請參閱 [Prompt Caching](/zh-Hant/reference/prompt-caching)。
- `models.providers.openrouter.params.provider`：OpenRouter 範圍的預設供應商路由原則。OpenClaw 會將此轉發至 OpenRouter 的請求 `provider` 物件；個別模型的 `agents.defaults.models["openrouter/<model>"].params.provider` 和代理程式參數會依鍵值覆寫。請參閱 [OpenRouter provider routing](/zh-Hant/providers/openrouter#advanced-configuration)。
- `params.extra_body`/`params.extraBody`：進階傳遞 JSON，會合併至 OpenAI 相容代理程式的 `api: "openai-completions"` 請求主體中。若與產生的請求鍵衝突，額外主體優先；非原生的完成路由仍會在之後移除僅限 OpenAI 的 `store`。
- `params.chat_template_kwargs`：合併到頂層 `api: "openai-completions"` 請求主體中的 vLLM/OpenAI 相容聊天範本引數。對於關閉思考的 `vllm/nemotron-3-*`，隨附的 vLLM 外掛會自動發送 `enable_thinking: false` 和 `force_nonempty_content: true`；明確的 `chat_template_kwargs` 會覆寫產生的預設值，而 `extra_body.chat_template_kwargs` 仍具有最終優先權。對於 vLLM Qwen 思考控制，請在該模型項目上將 `params.qwenThinkingFormat` 設定為 `"chat-template"` 或 `"top-level"`。
- `compat.thinkingFormat`：OpenAI 相容的思考 Payload 樣式。對於 Together 風格的 `reasoning.enabled` 使用 `"together"`，對於 Qwen 風格的頂層 `enable_thinking` 使用 `"qwen"`，或對於支援請求層級 chat-template kwargs 的 Qwen 系列後端（例如 vLLM）上的 `chat_template_kwargs.enable_thinking` 使用 `"qwen-chat-template"`。OpenClaw 會將停用的思考對應到 `false`，將啟用的思考對應到 `true`。
- `compat.supportedReasoningEfforts`：逐模型的 OpenAI 相容推理努力清單。針對真正接受它的自訂端點包含 `"xhigh"`；OpenClaw 接著會在指令選單、Gateway 會话列、會話修補驗證、Agent CLI 驗證，以及該設定供應商/模型的 `llm-task` 驗證中公開 `/think xhigh`。當後端希望針對標準層級使用供應商特定的值時，請使用 `compat.reasoningEffortMap`。
- `params.preserveThinking`：僅限 Z.AI 的保留思考選擇加入功能。啟用且思考開啟時，OpenClaw 會發送 `thinking.clear_thinking: false` 並重播先前的 `reasoning_content`；請參閱 [Z.AI thinking and preserved thinking](/zh-Hant/providers/zai#thinking-and-preserved-thinking)。
- `localService`：選用層級的行程管理器，適用於本機/自託管的模型伺服器。當選取的模型屬於該提供者時，OpenClaw 會探測 `healthUrl`（或 `baseUrl + "/models"`），如果端點未回應則使用 `args` 啟動 `command`，等待最多 `readyTimeoutMs`，然後發送模型請求。`command` 必須是絕對路徑。`idleStopMs: 0` 會保持行程運作直到 OpenClaw 結束；正值則會在閒置該毫秒數後停止 OpenClaw 產生的行程。請參閱 [本機模型服務](/zh-Hant/gateway/local-model-services)。
- 執行時期政策屬於提供者或模型，而非 `agents.defaults`。請使用 `models.providers.<provider>.agentRuntime` 設定提供者範圍的規則，或使用 `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime` 設定模型特定規則。官方 OpenAI 提供者上的 OpenAI 模型預設選擇 Codex。
- 變更這些欄位的配置寫入器（例如 `/models set`、`/models set-image` 以及後備新增/移除指令）會儲存標準物件格式，並在可能時保留現有的後備清單。
- `maxConcurrent`：跨階段的最大並行代理執行數量（每個階段仍為序列化）。預設值：4。

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

- `id`：`"auto"`、`"pi"`、已註冊的外掛程式組件 id，或支援的 CLI 後端別名。內建的 Codex 外掛程式註冊 `codex`；內建的 Anthropic 外掛程式提供 `claude-cli` CLI 後端。
- `id: "auto"` 允許已註冊的外掛程式組件宣稱支援的輪次，並在沒有匹配的組件時使用 PI。明確指定外掛程式執行時期（例如 `id: "codex"`）需要該組件，如果無法使用或失敗則會封閉式失敗。
- 執行時優先順序首先是精確模型策略 (`agents.list[].models["provider/model"]`、`agents.defaults.models["provider/model"]` 或 `models.providers.<provider>.models[]`)，然後是 `agents.list[]` / `agents.defaults.models["provider/*"]`，接著是 `models.providers.<provider>.agentRuntime` 的提供者範圍策略。
- 整個 Agent 的執行時鍵值已過時。`agents.defaults.agentRuntime`、`agents.list[].agentRuntime`、會話執行時針腳以及 `OPENCLAW_AGENT_RUNTIME` 會被執行時選擇忽略。請執行 `openclaw doctor --fix` 來移除過時的數值。
- OpenAI Agent 模型預設使用 Codex harness；當您想要明確指定時，提供者/模型 `agentRuntime.id: "codex"` 仍然有效。
- 對於 Claude CLI 部署，建議優先使用 `model: "anthropic/claude-opus-4-7"` 加上模型範圍的 `agentRuntime.id: "claude-cli"`。舊版的 `claude-cli/claude-opus-4-7` 模型參照為了相容性仍然有效，但新配置應保持提供者/模型選擇的規範性，並將執行後端放在提供者/模型執行時策略中。
- 這僅控制文字 Agent 週期的執行。媒體生成、視覺、PDF、音樂、視訊和 TTS 仍然使用它們的提供者/模型設定。

**內建別名簡寫**（僅當模型位於 `agents.defaults.models` 時才套用）：

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
Z.AI 模型預設針對工具呼叫串流啟用 `tool_stream`。將 `agents.defaults.models["zai/<model>"].params.tool_stream` 設定為 `false` 即可停用它。
當未設定明確的思考層級時，Anthropic Claude 4.6 模型預設為 `adaptive` 思考。

### `agents.defaults.cliBackends`

用於純文字後援執行（無工具呼叫）的選用 CLI 後端。當 API 提供商失敗時，可作為備援使用。

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

- CLI 後端以文字為優先；工具會一律停用。
- 當設定 `sessionArg` 時支援工作階段。
- 當 `imageArg` 接受檔案路徑時，支援圖像直通。
- `reseedFromRawTranscriptWhenUncompacted: true` 允許後端在存在第一個壓縮摘要之前，從有限的原始 OpenClaw 逐字稿尾部還原安全的失效工作階段。認證設定檔或憑證週期的變更仍永遠不會進行原始重新植入。

### `agents.defaults.systemPromptOverride`

以固定字串取代整個由 OpenClaw 組裝的系統提示詞。在預設層級 (`agents.defaults.systemPromptOverride`) 或各個代理程式 (`agents.list[].systemPromptOverride`) 進行設定。各個代理程式的值優先；空白或僅含空白的值會被忽略。適用於受控的提示詞實驗。

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

由模型系列在 OpenClaw 組裝的提示詞表面套用的獨立於提供者的提示詞疊加層。GPT-5 系列模型 ID 會跨 PI/提供者路由接收共用的行為合約；`personality` 僅控制友善的互動樣式層。原生 Codex 應用伺服器路由會保留 Codex 擁有的基底/模型/個性指令，而不是此 OpenClaw GPT-5 疊加層。

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

- `"friendly"` (預設) 和 `"on"` 會啟用友善的互動樣式層。
- `"off"` 僅會停用友善層；已標記的 GPT-5 行為合約仍保持啟用狀態。
- 當未設定此共用設定時，仍會讀取舊版的 `plugins.entries.openai.config.personality`。

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

- `every`：持續時間字串 (ms/s/m/h)。預設值：`30m` (API 金鑰驗證) 或 `1h` (OAuth 驗證)。設定為 `0m` 以停用。
- `includeSystemPromptSection`：當為 false 時，從系統提示詞中省略 Heartbeat 區段，並跳過將 `HEARTBEAT.md` 注入至 bootstrap 語境。預設值：`true`。
- `suppressToolErrorWarnings`：當為 true 時，在 heartbeat 執行期間抑制工具錯誤警示酬載。
- `timeoutSeconds`：heartbeat agent 輪次在終止前允許的最大時間（秒）。保留未設定以使用 `agents.defaults.timeoutSeconds`。
- `directPolicy`：直接/DM 傳遞原則。`allow` (預設) 允許直接目標傳遞。`block` 抑制直接目標傳遞並發出 `reason=dm-blocked`。
- `lightContext`：當為 true 時，heartbeat 執行會使用輕量級 bootstrap 語境，並僅保留來自工作區 bootstrap 檔案的 `HEARTBEAT.md`。
- `isolatedSession`：當為 true 時，每個 heartbeat 都在沒有先前對話歷史的新工作階段中執行。與 cron `sessionTarget: "isolated"` 的隔離模式相同。將每次 heartbeat 的 token 成本從約 100K 降低到約 2-5K 個 token。
- `skipWhenBusy`：當為 true 時，heartbeat 執行會在該 agent 額外忙碌的通道上延遲：其自己的以 session 為鍵的 subagent 或巢狀指令工作。即使沒有此標誌，Cron 通道也總是會延遲 heartbeat。
- 個別 agent：設定 `agents.list[].heartbeat`。當任何 agent 定義了 `heartbeat` 時，**只有那些 agents** 會執行 heartbeat。
- Heartbeats 會執行完整的 agent 輪次 — 較短的間隔會消耗更多 token。

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

- `mode`：`default` 或 `safeguard` (針對長歷史的區塊摘要)。請參閱 [Compaction](/zh-Hant/concepts/compaction)。
- `provider`：已註冊的壓縮提供者外掛程式的 ID。設定後，會呼叫提供者的 `summarize()` 而非內建的 LLM 摘要。失敗時會回退至內建機制。設定提供者會強制啟用 `mode: "safeguard"`。請參閱[壓縮](/zh-Hant/concepts/compaction)。
- `timeoutSeconds`：OpenClaw 中止單一壓縮作業前允許的最大秒數。預設值：`900`。
- `keepRecentTokens`：用於逐字保留最新轉錄尾部內容的 Pi 切點預算。手動 `/compact` 在明確設定時會遵守此設定；否則手動壓縮為一個強制檢查點。
- `identifierPolicy`：`strict`（預設值）、`off` 或 `custom`。`strict` 會在壓縮摘要期間預先加入內建的不透明識別碼保留指引。
- `identifierInstructions`：使用 `identifierPolicy=custom` 時的選用自訂識別碼保留文字。
- `qualityGuard`：針對格式錯誤輸出的重試會檢查安全摘要。在安全模式下預設啟用；設定 `enabled: false` 可跳過稽核。
- `midTurnPrecheck`：選用的 Pi 工具迴圈壓力檢查。當設為 `enabled: true` 時，OpenClaw 會在附加工具結果之後、下一次模型呼叫之前檢查內容壓力。如果內容不再適用，它會在提交提示之前中止目前的嘗試，並重複使用現有的預檢復原路徑來截斷工具結果或壓縮並重試。這適用於 `default` 和 `safeguard` 壓縮模式。預設值：停用。
- `postCompactionSections`：壓縮後要重新注入的選用 AGENTS.md H2/H3 區段名稱。預設值為 `["Session Startup", "Red Lines"]`；設定 `[]` 可停用重新注入。當未設定或明確設定為該預設組合時，較舊的 `Every Session`/`Safety` 標題也會被接受作為舊版回退選項。
- `model`：僅用於壓縮摘要的可選 `provider/model-id` 覆蓋。當主會話應保持一個模型，但壓縮摘要應在另一個模型上運行時使用；未設定時，壓縮會使用會話的主要模型。
- `maxActiveTranscriptBytes`：可選的位元組閾值（`number` 或像 `"20mb"` 這樣的字串），當作用中的 JSONL 超過閾值時，會在執行前觸發正常的本機壓縮。需要 `truncateAfterCompaction`，以便成功的壓縮能輪替至較小的後續逐字稿。未設定或設為 `0` 時停用。
- `notifyUser`：當設為 `true` 時，會在壓縮開始和完成時向使用者發送簡短通知（例如，「正在壓縮內容...」和「壓縮完成」）。預設停用以保持壓縮靜默。
- `memoryFlush`：自動壓縮前的靜默代理回合，用於儲存持久記憶。當此維護回合應保持在本地模型上時，將 `model` 設為確切的提供者/模型，例如 `ollama/qwen3:8b`；該覆蓋設定不會繼承作用中會話的後備鏈。當工作區為唯讀時跳過。

### `agents.defaults.runRetries`

內嵌 Pi 執行器的外層執行迴圈重試迭代邊界，用於防止故障恢復期間的無限執行迴圈。請注意，此設定目前僅適用於內嵌代理執行時，不適用於 ACP 或 CLI 執行時。

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

- `base`：外層執行迴圈的基本執行重試迭代次數。預設值：`24`。
- `perProfile`：每個後備設定檔候選者獲得的額外執行重試迭代次數。預設值：`8`。
- `min`：執行重試迭代的最小絕對限制。預設值：`32`。
- `max`：執行重試迭代的最大絕對限制，以防止失控執行。預設值：`160`。

### `agents.defaults.contextPruning`

在發送給 LLM 之前，從記憶體上下文中修剪**舊的工具結果**。**不**會修改磁碟上的會話歷史記錄。

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
- `ttl` 控制修剪再次執行的頻率（在最後一次快取接觸之後）。
- 修剪首先軟修剪超大的工具結果，然後在需要時硬清除較舊的工具結果。
- `softTrimRatio` 和 `hardClearRatio` 接受從 `0.0` 到 `1.0` 的值；組態驗證會拒絕超出該範圍的值。

**軟修剪**保留開頭和結尾，並在中間插入 `...`。

**硬清除**會用預留位置替換整個工具結果。

注意事項：

- 影像區塊從不會被修剪/清除。
- 比例是基於字元（近似值），而非精確的 token 計數。
- 如果存在的助理訊息少於 `keepLastAssistants` 則跳過修剪。

</Accordion>

關於行為的詳細資訊，請參閱[會話修剪](/zh-Hant/concepts/session-pruning)。

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
- 頻道覆寫：`channels.<channel>.blockStreamingCoalesce` (以及每個帳戶的變體)。Signal/Slack/Discord/Google Chat 預設 `minChars: 1500`。
- `humanDelay`：區塊回覆之間的隨機暫停。`natural` = 800–2500ms。個別 Agent 覆寫：`agents.list[].humanDelay`。

關於行為和分塊的詳細資訊，請參閱[串流](/zh-Hant/concepts/streaming)。

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

- 預設值：直接聊天/提及為 `instant`，未提及的群組聊天為 `message`。
- 每個會話的覆寫：`session.typingMode`、`session.typingIntervalSeconds`。

請參閱[輸入指示器](/zh-Hant/concepts/typing-indicators)。

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

嵌入式 Agent 的可選沙盒。完整指南請參閱[沙盒](/zh-Hant/gateway/sandboxing)。

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

<Accordion title="沙箱詳情">

**後端：**

- `docker`：本機 Docker 執行時（預設）
- `ssh`：通用的 SSH 支援遠端執行時
- `openshell`：OpenShell 執行時

當選取 `backend: "openshell"` 時，執行時特定的設定會移至
`plugins.entries.openshell.config`。

**SSH 後端設定：**

- `target`：`user@host[:port]` 格式的 SSH 目標
- `command`：SSH 客戶端指令（預設：`ssh`）
- `workspaceRoot`：用於各範圍工作區的絕對遠端根目錄
- `identityFile` / `certificateFile` / `knownHostsFile`：傳遞給 OpenSSH 的現有本機檔案
- `identityData` / `certificateData` / `knownHostsData`：OpenClaw 在執行時具象化為暫存檔案的內聯內容或 SecretRef
- `strictHostKeyChecking` / `updateHostKeys`：OpenSSH 主機金鑰原則控制項

**SSH 認證優先順序：**

- `identityData` 優於 `identityFile`
- `certificateData` 優於 `certificateFile`
- `knownHostsData` 優於 `knownHostsFile`
- SecretRef 支援的 `*Data` 值會在沙箱工作階段開始前，從作用中的 secrets 執行時快照中解析

**SSH 後端行為：**

- 在建立或重建後將遠端工作區植入一次
- 然後保持遠端 SSH 工作區為標準
- 透過 SSH 路由 `exec`、檔案工具和媒體路徑
- 不會自動將遠端變更同步回主機
- 不支援沙箱瀏覽器容器

**工作區存取：**

- `none`：`~/.openclaw/sandboxes` 下的各範圍沙箱工作區
- `ro`：`/workspace` 處的沙箱工作區，Agent 工作區以唯讀方式掛載於 `/agent`
- `rw`：Agent 工作區以讀寫方式掛載於 `/workspace`

**範圍：**

- `session`：各工作階段容器 + 工作區
- `agent`：每個 Agent 一個容器 + 工作區（預設）
- `shared`：共用容器和工作區（無跨工作階段隔離）

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

- `mirror`：在執行前從本機植入遠端，執行後同步回來；本機工作區保持為標準
- `remote`：在建立沙箱時植入遠端一次，然後保持遠端工作區為標準

在 `remote` 模式下，在 OpenClaw 之外進行的本機編輯不會在植入步驟後自動同步到沙箱中。
傳輸方式是 SSH 進入 OpenShell 沙箱，但外掛程式擁有沙箱生命週期和選用的鏡像同步。

**`setupCommand`** 會在容器建立後執行一次（透過 `sh -lc`）。需要網路出口、可寫入的根目錄、root 使用者。

**容器預設為 `network: "none"`** — 如果 Agent 需要出站存取，請設定為 `"bridge"`（或自訂橋接網路）。
`"host"` 已被封鎖。`"container:<id>"` 預設已被封鎖，除非您明確設定
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`（緊急開啟）。
Codex 應用程式伺服器在作用中的 OpenClaw 沙箱中，使用相同的出口設定進行其原生程式碼模式的網路存取。

**傳入附件** 會暫存到作用中工作區的 `media/inbound/*` 中。

**`docker.binds`** 會掛載額外的主機目錄；全域和各 Agent 的繫結會合併。

**沙箱瀏覽器**（`sandbox.browser.enabled`）：容器中的 Chromium + CDP。noVNC URL 會注入到系統提示中。不需要 `openclaw.json` 中的 `browser.enabled`。
noVNC 觀察者存取預設使用 VNC 認證，且 OpenClaw 會發出短期有效的 Token URL（而不是在共用的 URL 中公開密碼）。

- `allowHostControl: false`（預設）會阻擋沙箱工作階段以主機瀏覽器為目標。
- `network` 預設為 `openclaw-sandbox-browser`（專用橋接網路）。僅當您明確想要全域橋接連線時，才設定為 `bridge`。
- `cdpSourceRange` 可選地在容器邊緣將 CDP 進站限制為 CIDR 範圍（例如 `172.21.0.1/32`）。
- `sandbox.browser.binds` 僅將額外的主機目錄掛載到沙箱瀏覽器容器中。設定時（包括 `[]`），它會取代瀏覽器容器的 `docker.binds`。
- 啟動預設定義在 `scripts/sandbox-browser-entrypoint.sh` 中，並針對容器主機進行了調整：
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
    為啟用狀態，如果 WebGL/3D 使用需要，可以使用
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` 停用。
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 如果您的工作流程
    依賴擴充功能，則會重新啟用。
  - `--renderer-process-limit=2` 可以使用
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 變更；設定 `0` 以使用 Chromium 的
    預設程序限制。
  - 當啟用 `noSandbox` 時，加上 `--no-sandbox`。
  - 預設值是容器映像檔基準；使用具有自訂進入點的自訂瀏覽器映像檔來變更容器預設值。

</Accordion>

瀏覽器沙箱與 `sandbox.docker.binds` 僅適用於 Docker。

建置映像檔（從原始碼檢出）：

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

若未從原始碼檢出而透過 npm 安裝，請參閱 [Sandboxing § Images and setup](/zh-Hant/gateway/sandboxing#images-and-setup) 以取得內聯 `docker build` 指令。

### `agents.list` (每個代理程式的覆寫)

使用 `agents.list[].tts` 為代理程式指定專屬的 TTS 提供者、語音、模型、樣式或自動 TTS 模式。代理程式區塊會與全域 `messages.tts` 進行深度合併，因此共享憑證可保留在同一位置，而個別代理程式僅需覆寫其所需的語音或提供者欄位。使用中代理程式的覆寫會套用至自動口語回覆、`/tts audio`、`/tts status` 以及 `tts` 代理程式工具。請參閱 [Text-to-speech](/zh-Hant/tools/tts#per-agent-voice-overrides) 以了解提供者範例與優先順序。

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

- `id`：穩定的代理程式 ID（必要）。
- `default`：當設定多個時，第一個優先（會記錄警告）。若未設定任何項目，則清單中的第一個項目為預設值。
- `model`：字串形式會設定嚴格的每個代理程式主要選項，不包含模型備援；物件形式 `{ primary }` 同樣為嚴格，除非您加入 `fallbacks`。使用 `{ primary, fallbacks: [...] }` 讓該代理程式加入備援，或使用 `{ primary, fallbacks: [] }` 明確指定嚴格行為。僅覆寫 `primary` 的排程工作仍會繼承預設備援，除非您設定了 `fallbacks: []`。
- `params`：每個代理程式的串流參數，會與 `agents.defaults.models` 中選取的模型項目合併。使用此項目可針對特定代理程式覆寫參數，例如 `cacheRetention`、`temperature` 或 `maxTokens`，而不需重複整個模型目錄。
- `tts`：可選的個別代理程式文字轉語音覆寫。此區塊會對 `messages.tts` 進行深度合併，因此請將共用的提供者憑證和後援原則保留在 `messages.tts` 中，並在此處僅設定特定角色的值，例如提供者、語音、模型、樣式或自動模式。
- `skills`：可選的個別代理程式技能允許清單。如果省略，代理程式會在設定時繼承 `agents.defaults.skills`；明確的清單會取代預設值而非進行合併，而 `[]` 表示無技能。
- `thinkingDefault`：可選的個別代理程式預設思考層級 (`off | minimal | low | medium | high | xhigh | adaptive | max`)。當未設定每則訊息或工作階段覆寫時，會覆寫此代理程式的 `agents.defaults.thinkingDefault`。選取的提供者/模型設定檔會控制哪些值有效；對於 Google Gemini，`adaptive` 會保留提供者擁有的動態思考 (在 Gemini 3/3.1 上省略 `thinkingLevel`，在 Gemini 2.5 上則為 `thinkingBudget: -1`)。
- `reasoningDefault`：可選的個別代理程式預設推理可見性 (`on | off | stream`)。當未設定每則訊息或工作階段推理覆寫時，會覆寫此代理程式的 `agents.defaults.reasoningDefault`。
- `fastModeDefault`：可選的個別代理程式快速模式預設值 (`true | false`)。當未設定每則訊息或工作階段快速模式覆寫時套用。
- `models`：可選的個別代理程式模型目錄/執行階段覆寫，以完整的 `provider/model` ID 為鍵值。使用 `models["provider/model"].agentRuntime` 進行個別代理程式的執行階段例外處理。
- `runtime`：可選的個別代理程式執行階段描述元。當代理程式應預設為 ACP 線束工作階段時，請使用帶有 `runtime.acp` 預設值 (`agent`、`backend`、`mode`、`cwd`) 的 `type: "acp"`。
- `identity.avatar`：工作區相對路徑、`http(s)` URL 或 `data:` URI。
- `identity` 推導預設值：來自 `emoji` 的 `ackReaction`，來自 `name`/`emoji` 的 `mentionPatterns`。
- `subagents.allowAgents`：針對明確 `sessions_spawn.agentId` 目標的已配置代理程式 ID 允許清單（`["*"]` = 任何已配置的目標；預設值：僅限相同的代理程式）。當應允許以自身為目標的 `agentId` 呼叫時，請包含請求者 ID。代理程式配置已被刪除的過時條目會被 `sessions_spawn` 拒絕，並從 `agents_list` 中省略；執行 `openclaw doctor --fix` 來清除它們，或者如果該目標應在繼承預設值的同時保持可產生，則新增一個最小的 `agents.list[]` 條目。
- 沙箱繼承防護：如果請求者會話位於沙箱中，`sessions_spawn` 會拒絕將以非沙箱方式執行的目標。
- `subagents.requireAgentId`：當設為 true 時，封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確選擇設定檔；預設值：false）。

---

## 多重代理程式路由

在單一 Gateway 中執行多個隔離的代理程式。請參閱 [多重代理程式](/zh-Hant/concepts/multi-agent)。

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

- `type` (選用)：`route` 用於正常路由（缺少類型預設為 route），`acp` 用於持續性 ACP 對話綁定。
- `match.channel` (必要)
- `match.accountId` (選用；`*` = 任何帳戶；省略 = 預設帳戶)
- `match.peer` (選用；`{ kind: direct|group|channel, id }`)
- `match.guildId` / `match.teamId` (選用；通道特定)
- `acp` (選用；僅適用於 `type: "acp"`)：`{ mode, label, cwd, backend }`

**決定性比對順序：**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` (精確，無 peer/guild/team)
5. `match.accountId: "*"` (全頻道)
6. 預設代理程式

在每個層級中，第一個符合的 `bindings` 項目會獲勝。

對於 `type: "acp"` 項目，OpenClaw 會根據精確的對話身分 (`match.channel` + account + `match.peer.id`) 進行解析，並且不使用上述的路由綁定層級順序。

### 個別代理程式存取設定檔

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

<Accordion title="無檔案系統存取 (僅訊息傳遞)">

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

請參閱 [Multi-Agent Sandbox & Tools](/zh-Hant/tools/multi-agent-sandbox-tools) 以了解優先順序細節。

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

- **`scope`**: 用於群組聊天語境的基礎會話分組策略。
  - `per-sender` (預設): 每個發送者在頻道語境內獲得一個獨立的會話。
  - `global`: 頻道語境中的所有參與者共享單一會話 (僅在意圖共享語境時使用)。
- **`dmScope`**: 私訊 (DM) 的分組方式。
  - `main`: 所有私訊共享主會話。
  - `per-peer`: 跨頻道依發送者 ID 隔離。
  - `per-channel-peer`: 依頻道 + 發送者隔離 (推薦用於多使用者收件匣)。
  - `per-account-channel-peer`: 依帳戶 + 頻道 + 發送者隔離 (推薦用於多帳戶)。
- **`identityLinks`**: 將 canonical ID 對應到供應商前綴的 peer 以實現跨頻道會話共享。Dock 指令 (例如 `/dock_discord`) 使用相同的映射來切換活動會話的回覆路由至另一個連結的頻道 peer；詳見 [Channel docking](/zh-Hant/concepts/channel-docking)。
- **`reset`**: 主要重設策略。 `daily` 在 `atHour` 本地時間重設； `idle` 在 `idleMinutes` 後重設。當兩者皆配置時，以先過期者為準。每日重設的新鮮度使用會話記錄的 `sessionStartedAt`；閒置重設的新鮮度使用 `lastInteractionAt`。背景/系統事件寫入 (如 heartbeat、cron 喚醒、exec 通知和 gateway 維護) 可以更新 `updatedAt`，但它們不會保持每日/閒置會話的新鮮度。
- **`resetByType`**: 依類型覆寫 (`direct`, `group`, `thread`)。舊版的 `dm` 被接受為 `direct` 的別名。
- **`mainKey`**: 舊版欄位。執行時期 (Runtime) 總是對主要的直接聊天 bucket 使用 `"main"`。
- **`agentToAgent.maxPingPongTurns`**: agent 對 agent 交換期間的最大回傳回合數 (整數，範圍： `0`-`20`，預設： `5`)。 `0` 會停用乒乓鏈結。
- \*\*`sendPolicy`: 依 `channel`, `chatType` (`direct|group|channel`，附帶舊版 `dm` 別名), `keyPrefix`, 或 `rawKeyPrefix` 進行匹配。優先套用拒絕規則。
- **`maintenance`**: 會話儲存 清理與保留控制。
  - `mode`: `warn` 僅發出警告； `enforce` 執行清理。
  - `pruneAfter`: 陳旧條目的年限截斷點 (預設 `30d`)。
  - `maxEntries`: `sessions.json` 中的最大條目數 (預設 `500`)。執行時期寫入會批次清理，並為生產級上限提供少量高水位緩衝； `openclaw sessions cleanup --enforce` 會立即套用上限。
  - `rotateBytes`: 已棄用並忽略； `openclaw doctor --fix` 會將其從舊版設定中移除。
  - `resetArchiveRetention`: `*.reset.<timestamp>` 聊天記錄封存的保留時間。預設為 `pruneAfter`；設為 `false` 以停用。
  - `maxDiskBytes`: 可選的 sessions-directory 磁碟預算。在 `warn` 模式下它會記錄警告；在 `enforce` 模式下它會先移除最舊的構件/會話。
  - `highWaterBytes`: 預算清理後的目標 (可選)。預設為 `80%` 的 `maxDiskBytes`。
- \*\*`threadBindings`: 線程綁定會話功能的全域預設值。
  - `enabled`: 主預設開關 (供應商可覆寫； Discord 使用 `channels.discord.threadBindings.enabled`)
  - `idleHours`: 預設的非活動自動取消焦點時間，以小時為單位 (`0` 表示停用；供應商可覆寫)
  - `maxAgeHours`: 預設的硬性最大時間，以小時為單位 (`0` 表示停用；供應商可覆寫)
  - `spawnSessions`: 從 `sessions_spawn` 和 ACP 線程生成建立線程綁定工作會話的預設閘道。當啟用線程綁定時預設為 `true`；供應商/帳戶可覆寫。
  - `defaultSpawnContext`: 線程綁定生成的預設原生子 agent 語境 (`"fork"` 或 `"isolated"`)。預設為 `"fork"`。

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

各通道/帳號覆寫：`channels.<channel>.responsePrefix`、`channels.<channel>.accounts.<id>.responsePrefix`。

解析順序（最優先者勝出）：帳號 → 通道 → 全域。`""` 會停用並停止串聯。`"auto"` 會衍生 `[{identity.name}]`。

**樣板變數：**

| 變數              | 描述           | 範例                        |
| ----------------- | -------------- | --------------------------- |
| `{model}`         | 簡短模型名稱   | `claude-opus-4-6`           |
| `{modelFull}`     | 完整模型識別碼 | `anthropic/claude-opus-4-6` |
| `{provider}`      | 提供者名稱     | `anthropic`                 |
| `{thinkingLevel}` | 當前思考層級   | `high`、`low`、`off`        |
| `{identity.name}` | Agent 身分名稱 | （與 `"auto"` 相同）        |

變數不區分大小寫。`{think}` 是 `{thinkingLevel}` 的別名。

### Ack 回應

- 預設為 active agent 的 `identity.emoji`，否則為 `"👀"`。設定 `""` 以停用。
- 各通道覆寫：`channels.<channel>.ackReaction`、`channels.<channel>.accounts.<id>.ackReaction`。
- 解析順序：帳號 → 通道 → `messages.ackReaction` → 身分後備。
- 範圍：`group-mentions`（預設）、`group-all`、`direct`、`all`。
- `removeAckAfterReply`：在支援回應的通道（如 Slack、Discord、Telegram、WhatsApp 和 iMessage）上回覆後移除 ack。
- `messages.statusReactions.enabled`：在 Slack、Discord、Telegram 和 WhatsApp 上啟用生命週期狀態回應。
  在 Slack 和 Discord 上，若未設定，當 ack 回應啟用時會保持狀態回應啟用。
  在 Telegram 和 WhatsApp 上，請明確設定為 `true` 以啟用生命週期狀態回應。
- `messages.statusReactions.emojis`：覆寫生命週期表情符號鍵：
  `queued`、`thinking`、`compacting`、`tool`、`coding`、`web`、`deploy`、`build`、
  `concierge`、`done`、`error`、`stallSoft` 和 `stallHard`。
  Telegram 僅允許固定的反應集，因此不支援的已設定表情符號將會回退為該聊天最接近的支援狀態變體。

### 輸入去抖

將來自同一發送者的快速純文字訊息批次處理為單一代理輪次。媒體/附件會立即刷新。控制指令會略過去抖。

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

- `auto` 控制預設的自動 TTS 模式：`off`、`always`、`inbound` 或 `tagged`。`/tts on|off` 可以覆寫本機偏好設定，而 `/tts status` 會顯示有效狀態。
- `summaryModel` 會覆寫 `agents.defaults.model.primary` 以進行自動摘要。
- `modelOverrides` 預設為啟用；`modelOverrides.allowProvider` 預設為 `false` (選用)。
- API 金鑰會回退至 `ELEVENLABS_API_KEY`/`XI_API_KEY` 和 `OPENAI_API_KEY`。
- 內建的語音提供者由外掛程式擁有。如果設定了 `plugins.allow`，請包含您想使用的每個 TTS 提供者外掛程式，例如 `microsoft` 用於 Edge TTS。舊版的 `edge` 提供者 ID 被接受為 `microsoft` 的別名。
- `providers.openai.baseUrl` 會覆寫 OpenAI TTS 端點。解析順序為組態、然後是 `OPENAI_TTS_BASE_URL`、再來是 `https://api.openai.com/v1`。
- 當 `providers.openai.baseUrl` 指向非 OpenAI 端點時，OpenClaw 會將其視為相容 OpenAI 的 TTS 伺服器，並放寬模型/語音驗證。

---

## 交談

交談模式的預設值。

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

- 當設定多個 Talk 提供者時，`talk.provider` 必須符合 `talk.providers` 中的鍵。
- 舊版扁平化 Talk 鍵（`talk.voiceId`、`talk.voiceAliases`、`talk.modelId`、`talk.outputFormat`、`talk.apiKey`）僅供相容性使用。執行 `openclaw doctor --fix` 可將保存的設定重寫為 `talk.providers.<provider>`。
- 語音 ID 會回退到 `ELEVENLABS_VOICE_ID` 或 `SAG_VOICE_ID`。
- `providers.*.apiKey` 接受純文字字串或 SecretRef 物件。
- `ELEVENLABS_API_KEY` 回退僅在未設定 Talk API 金鑰時適用。
- `providers.*.voiceAliases` 允許 Talk 指令使用易讀名稱。
- `providers.mlx.modelId` 選擇 macOS 本機 MLX 助手使用的 Hugging Face 存儲庫。如果省略，macOS 會使用 `mlx-community/Soprano-80M-bf16`。
- macOS MLX 播放會透過隨附的 `openclaw-mlx-tts` 助手執行（如果存在），或是 `PATH` 上的可執行檔；`OPENCLAW_MLX_TTS_BIN` 會覆寫開發用的助手路徑。
- `consultThinkingLevel` 控制在 Control UI Talk 即時 `openclaw_agent_consult` 呼叫背後運行的完整 OpenClaw 代理程式之思考層級。保留未設定以維持正常的會話/模型行為。
- `consultFastMode` 為 Control UI Talk 即時諮詢設定一次性快速模式覆寫，而不會變更會話的正常快速模式設定。
- `speechLocale` 設定 iOS/macOS Talk 語音辨識使用的 BCP 47 地區設定 ID。保留未設定以使用裝置預設值。
- `silenceTimeoutMs` 控制 Talk 模式在使用者靜音後傳送逐字稿前的等待時間。未設定則保持平台預設暫停視窗（`700 ms on macOS and Android, 900 ms on iOS`）。
- `realtime.instructions` 將面向提供者的系統指令附加至 OpenClaw 內建的即時提示，以便在不失去預設 `openclaw_agent_consult` 指導的情況下設定語音風格。
- `realtime.consultRouting` 控制當即時提供者在沒有 `openclaw_agent_consult` 的情況下產生最終使用者文字記錄時的 Gateway 中繼回退行為：`provider-direct` 會保留直接來自提供者的回覆，而 `force-agent-consult` 則會將最終請求透過 OpenClaw 進行路由。

---

## 相關

- [Configuration reference](/zh-Hant/gateway/configuration-reference) — 所有其他設定鍵
- [Configuration](/zh-Hant/gateway/configuration) — 常見任務與快速設定
- [Configuration examples](/zh-Hant/gateway/configuration-examples)
