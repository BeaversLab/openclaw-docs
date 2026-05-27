---
summary: "工具設定（原則、實驗性切換、提供者支援的工具）及自訂提供者/基底 URL 設定"
read_when:
  - Configuring `tools.*` policy, allowlists, or experimental features
  - Registering custom providers or overriding base URLs
  - Setting up OpenAI-compatible self-hosted endpoints
title: "設定 — 工具與自訂提供者"
sidebarTitle: "工具與自訂提供者"
---

`tools.*` 設定鍵與自訂提供者 / 基底 URL 設定。如需代理程式、通道與其他頂層設定鍵，請參閱[設定參考](/zh-Hant/gateway/configuration-reference)。

## 工具

### 工具設定檔

`tools.profile` 在 `tools.allow`/`tools.deny` 之前設定一個基礎允許清單：

<Note>本機導入會在未設定時將新的本機設定預設為 `tools.profile: "coding"`（既有的明確設定檔會被保留）。</Note>

| 設定檔      | 包含                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | 僅 `session_status`                                                                                                             |
| `coding`    | `group:fs`、`group:runtime`、`group:web`、`group:sessions`、`group:memory`、`cron`、`image`、`image_generate`、`video_generate` |
| `messaging` | `group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`                                       |
| `full`      | 無限制（與未設定相同）                                                                                                          |

### 工具群組

| 群組               | 工具                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`、`process`、`code_execution`（`bash` 被接受為 `exec` 的別名）                                                    |
| `group:fs`         | `read`、`write`、`edit`、`apply_patch`                                                                                  |
| `group:sessions`   | `sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status` |
| `group:memory`     | `memory_search`、`memory_get`                                                                                           |
| `group:web`        | `web_search`、`x_search`、`web_fetch`                                                                                   |
| `group:ui`         | `browser`、`canvas`                                                                                                     |
| `group:automation` | `heartbeat_respond`、`cron`、`gateway`                                                                                  |
| `group:messaging`  | `message`                                                                                                               |
| `group:nodes`      | `nodes`                                                                                                                 |
| `group:agents`     | `agents_list`、`update_plan`                                                                                            |
| `group:media`      | `image`、`image_generate`、`music_generate`、`video_generate`、`tts`                                                    |
| `group:openclaw`   | 所有內建工具（不包含提供者外掛）                                                                                        |
| `group:plugins`    | 已載入外掛擁有的工具，包括透過 `bundle-mcp` 公開的已設定 MCP 伺服器                                                     |

### 沙箱工具原則中的 MCP 和外掛工具

已設定的 MCP 伺服器會在 `bundle-mcp` 外掛 ID 下以外掛擁有的工具形式公開。一般的工具設定檔可以允許它們，但 `tools.sandbox.tools` 是沙箱工作階段的額外閘門。如果沙箱模式為 `"all"` 或 `"non-main"`，當 MCP/外掛工具應為可見時，請在沙箱工具允許清單中包含下列其中一個項目：

- `bundle-mcp` 代表來自 `mcp.servers` 的 OpenClaw 管理之 MCP 伺服器
- 特定原生外掛的外掛 ID
- `group:plugins` 代表所有已載入的外掛擁有工具
- 精確的 MCP 伺服器工具名稱或伺服器萬用字元，例如當您只想要一個伺服器時使用 `outlook__send_mail` 或 `outlook__*`

Server globs 使用 provider-safe MCP 伺服器前綴，不一定是原始的 `mcp.servers` 金鑰。非 `[A-Za-z0-9_-]` 字元會變成 `-`，不以字母開頭的名稱會加上 `mcp-` 前綴，而過長或重複的前綴可能會被截斷或加上後綴；例如，`mcp.servers["Outlook Graph"]` 使用像 `outlook-graph__*` 這樣的 glob。

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

如果沒有該 sandbox 層級的項目，MCP 伺服器仍然可以成功載入，但其工具會在提供者請求之前被過濾。使用 `openclaw doctor` 來擷取 `mcp.servers` 中 OpenClaw 管理伺服器的此種狀況。從套件組合插件清單或 Claude `.mcp.json` 載入的 MCP 伺服器使用相同的 sandbox 閘道，但此診斷尚未列舉這些來源；如果它們的工具在 sandbox 回合中消失，請使用相同的允許清單項目。

### `tools.allow` / `tools.deny`

全域工具允許/拒絕策略（拒絕優先）。不區分大小寫，支援 `*` 萬用字元。即使關閉 Docker sandbox 也會套用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

`write` 和 `apply_patch` 是分開的工具 ID。`allow: ["write"]` 也會為相容模型啟用 `apply_patch`，但 `deny: ["write"]` 並不拒絕 `apply_patch`。要封鎖所有檔案變更，請拒絕 `group:fs` 或明確列出每個變更工具：

```json5
{
  tools: { deny: ["write", "edit", "apply_patch"] },
}
```

### `tools.byProvider`

進一步限制特定提供者或模型的工具。順序：基本設定檔 → 提供者設定檔 → 允許/拒絕。

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

限制特定請求者身分的工具。這是在頻道存取控制之上的深度防禦；sender 值必須來自頻道介接器，而非訊息文字。

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

金鑰使用明確的前綴：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 或 `"*"`。通道 ID 是標準的 OpenClaw ID；諸如 `teams` 的別名會正規化為 `msteams`。舊版無前綴的金鑰僅被接受為 `id:`。匹配順序為通道+ID、ID、e164、使用者名稱、名稱，然後是萬用字元。

每個代理程式的 `agents.list[].tools.toolsBySender` 會在匹配時覆寫全域發送者匹配，即使是空的 `{}` 原則。

### `tools.elevated`

控制沙箱外部的提升執行存取權：

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

- 每個代理程式的覆寫 (`agents.list[].tools.elevated`) 只能進一步限制。
- `/elevated on|off|ask|full` 依階段儲存狀態；內嵌指令套用於單一訊息。
- 提升的 `exec` 會略過沙箱並使用設定的逃逸路徑 (預設為 `gateway`，當執行目標為 `node` 時則為 `node`)。

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

工具迴圈安全檢查預設為**停用**。設定 `enabled: true` 以啟動偵測。設定可以在 `tools.loopDetection` 中全域定義，並在 `agents.list[].tools.loopDetection` 處針對每個代理程式覆寫。

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
  保留用於迴圈分析的最大工具呼叫歷史記錄。
</ParamField>
<ParamField path="warningThreshold" type="number">
  用於警告的重複無進度模式閾值。
</ParamField>
<ParamField path="criticalThreshold" type="number">
  用於阻擋關鍵迴圈的較高重複閾值。
</ParamField>
<ParamField path="globalCircuitBreakerThreshold" type="number">
  任何無進度運行的強制停止閾值。
</ParamField>
<ParamField path="detectors.genericRepeat" type="boolean">
  對重複的相同工具/相同參數呼叫發出警告。
</ParamField>
<ParamField path="detectors.knownPollNoProgress" type="boolean">
  對已知輪詢工具（`process.poll`、`command_status` 等）發出警告/阻擋。
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  對交替的無進度配對模式發出警告/阻擋。
</ParamField>

<Warning>
如果 `warningThreshold >= criticalThreshold` 或 `criticalThreshold >= globalCircuitBreakerThreshold`，則驗證失敗。
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

設定輸入媒體理解（圖片/音訊/視訊）：

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
  <Accordion title="媒體模型輸入欄位">
    **供應商輸入** (`type: "provider"` 或省略):

    - `provider`: API 供應商 ID (`openai`、`anthropic`、`google`/`gemini`、`groq` 等)
    - `model`: 模型 ID 覆寫
    - `profile` / `preferredProfile`: `auth-profiles.json` 設定檔選擇

    **CLI 輸入** (`type: "cli"`):

    - `command`: 要執行的可執行檔
    - `args`: 樣板化參數 (支援 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等；`openclaw doctor --fix` 會將已棄用的 `{input}` 佔位符遷移至 `{{MediaPath}}`)

    **通用欄位:**

    - `capabilities`: 可選清單 (`image`、`audio`、`video`)。預設值: `openai`/`anthropic`/`minimax` → image、`google` → image+audio+video、`groq` → audio。
    - `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`: 各項目覆寫。
    - 當 Agent 呼叫明確的 `image` 工具時，`tools.media.image.timeoutSeconds` 和對應的圖片模型 `timeoutSeconds` 輸入項也適用。
    - 失敗時會回退至下一個輸入項。

    供應商驗證遵循標準順序: `auth-profiles.json` → 環境變數 → `models.providers.*.apiKey`。

    **非同步完成欄位:**

    - `asyncCompletion.directSend`: 已棄用的相容性標誌。已完成的非同步媒體任務保持請求者會話中介狀態，以便 Agent 接收結果，決定如何通知使用者，並在來源傳遞需要時使用訊息工具。

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

控制哪些會話可以被會話工具（`sessions_list`、`sessions_history`、`sessions_send`）作為目標。

預設值：`tree`（目前會話 + 由其產生的會話，例如子代理程式）。

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
  <Accordion title="可見性範圍">
    - `self`：僅限目前會話金鑰。
    - `tree`：目前會話 + 由目前會話產生的會話（子代理程式）。
    - `agent`：屬於目前代理程式 ID 的任何會話（如果您在相同的代理程式 ID 下執行每個發送者的會話，則可能包含其他使用者）。
    - `all`：任何會話。跨代理程式定位仍需 `tools.agentToAgent`。
    - 沙盒限制：當目前會話位於沙盒中且為 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 時，即使設定為 `tools.sessions.visibility="all"`，可見性也會被強制設為 `tree`。

  </Accordion>
</AccordionGroup>

### `tools.sessions_spawn`

控制 `sessions_spawn` 的內嵌附件支援。

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
  <Accordion title="附件備註">
    - 僅 `runtime: "subagent"` 支援附件。ACP 執行時期會拒絕它們。
    - 檔案會以 `.manifest.json` 在 `.openclaw/attachments/<uuid>/` 處具現化到子工作區。
    - 附件內容會自動從對話紀錄持久性中編輯移除。
    - Base64 輸入會透過嚴格的字母/填充檢查和解碼前大小防護進行驗證。
    - 目錄的檔案權限為 `0700`，檔案則為 `0600`。
    - 清理遵循 `cleanup` 政策：`delete` 總是移除附件；`keep` 僅在 `retainOnSessionKeep: true` 時保留它們。

  </Accordion>
</AccordionGroup>

<a id="toolsexperimental"></a>

### `tools.experimental`

實驗性內建工具旗標。除非套用嚴格代理程式 GPT-5 自動啟用規則，否則預設為關閉。

```json5
{
  tools: {
    experimental: {
      planTool: true, // enable experimental update_plan
    },
  },
}
```

- `planTool`：啟用結構化的 `update_plan` 工具，用於追蹤非平凡的多步驟工作。
- 預設值：`false`，除非針對 OpenAI 或 OpenAI Codex GPT-5 系列的執行，將 `agents.defaults.embeddedPi.executionContract`（或每個 Agent 的覆寫設定）設為 `"strict-agentic"`。設定 `true` 可強制在該範圍外啟用此工具，或設定 `false` 以確保即使在嚴格代理的 GPT-5 執行中也保持停用。
- 啟用後，系統提示詞也會新增使用指南，以便模型僅將其用於重要工作，並且最多保持一個步驟 `in_progress`。

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

- `model`：產生的子代理的預設模型。如果省略，子代理將繼承呼叫者的模型。
- `allowAgents`：當請求者代理未設定其 `subagents.allowAgents` 時，針對 `sessions_spawn` 的已設定目標代理 ID 的預設允許清單（`["*"]` = 任何已設定的目標；預設值：僅限同一個代理）。代理設定已刪除的過時條目將被 `sessions_spawn` 拒絕，並從 `agents_list` 中省略；請執行 `openclaw doctor --fix` 來將其清除。
- `runTimeoutSeconds`：當工具呼叫省略 `runTimeoutSeconds` 時，`sessions_spawn` 的預設逾時時間（秒）。`0` 表示沒有逾時限制。
- `announceTimeoutMs`：閘道 `agent` 公告傳遞嘗試的每次呼叫逾時時間（毫秒）。預設值：`120000`。暫時性重試可能會使總公告等待時間超過一個設定的逾時時間。
- 每個子代理的工具原則：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自訂提供者和基本 URL

OpenClaw 使用內建的模型目錄。透過設定中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 新增自訂提供者。

配置自訂/本機提供者 `baseUrl` 也是針對模型 HTTP 請求的狹隘網路信任決策：OpenClaw 允許該確切的 `scheme://host:port` 來源透過受防護的擷取路徑，無需新增單獨的設定選項或信任其他私人來源。

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
    - 使用 `authHeader: true` + `headers` 進行自訂驗證需求。
    - 使用 `OPENCLAW_AGENT_DIR` 覆寫 agent 設定根目錄（或 `PI_CODING_AGENT_DIR`，一個舊版環境變數別名）。
    - 符合提供者 ID 的合併優先順序：
      - 非空的 agent `models.json` `baseUrl` 值優先。
      - 非空的 agent `apiKey` 值僅在該提供者於當前設定/auth-profile 內容中非由 SecretRef 管理時優先。
      - SecretRef 管理的提供者 `apiKey` 值是從來源標記重新整理（環境變數參照為 `ENV_VAR_NAME`，檔案/exec 參照為 `secretref-managed`），而非持續儲存已解析的秘密。
      - SecretRef 管理的提供者標頭值是從來源標記重新整理（環境變數參照為 `secretref-env:ENV_VAR_NAME`，檔案/exec 參照為 `secretref-managed`）。
      - 空白或遺失的 agent `apiKey`/`baseUrl` 會回退到設定中的 `models.providers`。
      - 符合的模型 `contextWindow`/`maxTokens` 使用明確設定與隱式目錄值之間的較高值。
      - 符合的模型 `contextTokens` 在存在時保留明確的執行時間上限；請使用它來限制有效內容，而不變更原生模型中繼資料。
      - 當您希望設定完全覆寫 `models.json` 時，請使用 `models.mode: "replace"`。
      - 標記持續性是來源權威：標記是從作用中來源設定快照（解析前）寫入，而非從已解析的執行時間秘密值寫入。

  </Accordion>
</AccordionGroup>

### 提供者欄位詳細資訊

<AccordionGroup>
  <Accordion title="Top-level catalog">
    - `models.mode`: 提供者目錄行為（`merge` 或 `replace`）。
    - `models.providers`: 以提供者 ID 為鍵的自訂提供者對應。
      - 安全編輯：請使用 `openclaw config set models.providers.<id> '<json>' --strict-json --merge` 或 `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` 進行新增更新。`config set` 會拒絕破壞性替換，除非您傳遞 `--replace`。

  </Accordion>
  <Accordion title="Provider connection and auth">
    - `models.providers.*.api`：請求配接器 (`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等)。對於 MLX、vLLM、SGLang 等自託管 `/v1/chat/completions` 後端，以及大多數 OpenAI 相容的本機伺服器，請使用 `openai-completions`。具有 `baseUrl` 但沒有 `api` 的自訂提供者預設為 `openai-completions`；僅當後端支援 `/v1/responses` 時，才設定 `openai-responses`。
    - `models.providers.*.apiKey`：提供者憑證 (建議使用 SecretRef/env 取代)。
    - `models.providers.*.auth`：驗證策略 (`api-key`、`token`、`oauth`、`aws-sdk`)。
    - `models.providers.*.contextWindow`：當模型項目未設定 `contextWindow` 時，此提供者下模型的預設原生內容視窗。
    - `models.providers.*.contextTokens`：當模型項目未設定 `contextTokens` 時，此提供者下模型的預設有效執行階段內容上限。
    - `models.providers.*.maxTokens`：當模型項目未設定 `maxTokens` 時，此提供者下模型的預設輸出 token 上限。
    - `models.providers.*.timeoutSeconds`：選用的各提供者模型 HTTP 請求逾時時間 (秒)，包括連線、標頭、主體和總請求中止處理。
    - `models.providers.*.injectNumCtxForOpenAICompat`：針對 Ollama + `openai-completions`，將 `options.num_ctx` 注入請求中 (預設值：`true`)。
    - `models.providers.*.authHeader`：必要時，在 `Authorization` 標頭中強制傳輸憑證。
    - `models.providers.*.baseUrl`：上游 API 基礎 URL。
    - `models.providers.*.headers`：用於 Proxy/租戶路由的額外靜態標頭。

  </Accordion>
  <Accordion title="Request transport overrides">
    `models.providers.*.request`: 模型供應商 HTTP 請求的傳輸覆寫設定。

    - `request.headers`: 額外的標頭（會與供應商預設值合併）。數值接受 SecretRef。
    - `request.auth`: 驗證策略覆寫。模式：`"provider-default"`（使用供應商內建驗證）、`"authorization-bearer"`（使用 `token`）、`"header"`（使用 `headerName`、`value`、可選的 `prefix`）。
    - `request.proxy`: HTTP 代理覆寫。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 環境變數）、`"explicit-proxy"`（使用 `url`）。這兩種模式都接受可選的 `tls` 子物件。
    - `request.tls`: 直接連線的 TLS 覆寫。欄位：`ca`、`cert`、`key`、`passphrase`（皆接受 SecretRef）、`serverName`、`insecureSkipVerify`。
    - `request.allowPrivateNetwork`: 當設為 `true` 時，允許透過供應商 HTTP 擷取防護機制向私有、CGNAT 或類似範圍發出模型供應商 HTTP 請求。自訂/本機供應商基底 URL 已信任確切設定的來源，但中繼資料/連結本機來源除外，這些來源若無明確選用仍會被封鎖。將此設為 `false` 以退出確切來源信任。WebSocket 針對標頭/TLS 使用相同的 `request`，但不使用該擷取 SSRF 閘道。預設值為 `false`。

  </Accordion>
  <Accordion title="模型目錄項目">
    - `models.providers.*.models`：明確的提供者模型目錄項目。
    - `models.providers.*.models.*.input`：模型輸入模態。對於僅文字模型使用 `["text"]`，對於原生圖片/視覺模型使用 `["text", "image"]`。僅當所選模型被標記為支援圖片時，圖片附件才會被注入到 Agent 輪次中。
    - `models.providers.*.models.*.contextWindow`：原生模型內容視窗元數據。這會覆蓋該模型的提供者層級 `contextWindow`。
    - `models.providers.*.models.*.contextTokens`：可選的執行時內容上限。這會覆蓋提供者層級的 `contextTokens`；當您想要比模型原生 `contextWindow` 更小的有效內容預算時使用它；當這兩個值不同時，`openclaw models list` 會顯示這兩個值。
    - `models.providers.*.models.*.compat.supportsDeveloperRole`：可選的相容性提示。對於具有非空且非原生 `baseUrl`（主機不是 `api.openai.com`）的 `api: "openai-completions"`，OpenClaw 會在執行時將其強制設為 `false`。空/省略的 `baseUrl` 保持預設的 OpenAI 行為。
    - `models.providers.*.models.*.compat.requiresStringContent`：僅限字串的 OpenAI 相容聊天端點的可選相容性提示。當 `true` 時，OpenClaw 會在發送請求前將純文字 `messages[].content` 陣列扁平化為純字串。
    - `models.providers.*.models.*.compat.strictMessageKeys`：嚴格 OpenAI 相容聊天端點的可選相容性提示。當 `true` 時，OpenClaw 會在發送請求前將傳出的 Chat Completions 訊息物件剝離為 `role` 和 `content`。
    - `models.providers.*.models.*.compat.thinkingFormat`：可選的思考負載提示。對於 Together 風格的 `reasoning.enabled` 使用 `"together"`，對於頂層 `enable_thinking` 使用 `"qwen"`，或對於支援請求層級 chat-template kwargs 的 Qwen 系列 OpenAI 相容伺服器（如 vLLM）上的 `chat_template_kwargs.enable_thinking` 使用 `"qwen-chat-template"`。

  </Accordion>
  <Accordion title="Amazon Bedrock discovery">
    - `plugins.entries.amazon-bedrock.config.discovery`：Bedrock 自動探索設置根目錄。
    - `plugins.entries.amazon-bedrock.config.discovery.enabled`：開啟或關閉隱式探索。
    - `plugins.entries.amazon-bedrock.config.discovery.region`：用於探索的 AWS 區域。
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter`：用於定向探索的可選 provider-id 過濾器。
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`：探索重新整理的輪詢間隔。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`：已探索模型的後備 context window。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`：已探索模型的後備最大輸出 token 數。

  </Accordion>
</AccordionGroup>

互動式自訂 provider 入門流程會為常見的視覺模型 ID（例如 GPT-4o、Claude、Gemini、Qwen-VL、LLaVA、Pixtral、InternVL、Mllama、MiniCPM-V 和 GLM-4V）推斷圖片輸入，並針對已知的純文字系列跳過額外問題。未知的模型 ID 仍會提示是否支援圖片。非互動式入門使用相同的推斷邏輯；傳入 `--custom-image-input` 以強制使用支援圖片的元數據，或傳入 `--custom-text-input` 以強制使用純文字元數據。

### Provider 範例

<AccordionGroup>
  <Accordion title="Cerebras (GLM 4.7 / GPT OSS)">
    內建的 `cerebras` provider 外掛程式可以透過 `openclaw onboard --auth-choice cerebras-api-key` 進行設定。僅在覆寫預設值時才使用明確的 provider 設定。

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

    針對 Cerebras 使用 `cerebras/zai-glm-4.7`；針對 Z.AI direct 使用 `zai/glm-4.7`。

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

    相容 Anthropic 的內建 provider。快捷方式：`openclaw onboard --auth-choice kimi-code-api-key`。

  </Accordion>
  <Accordion title="Local models (LM Studio)">
    參閱 [Local Models](/zh-Hant/gateway/local-models)。TL;DR：在強大的硬體上透過 LM Studio Responses API 執行大型本地模型；保留託管模型的合併設定以作為後備。
  </Accordion>
  <Accordion title="MiniMax M2.7 (direct)">
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

    設定 `MINIMAX_API_KEY`。捷徑：`openclaw onboard --auth-choice minimax-global-api` 或 `openclaw onboard --auth-choice minimax-cn-api`。模型目錄預設僅包含 M2.7。在 Anthropic 相容的串流路徑上，除非您明確自行設定 `thinking`，否則 OpenClaw 預設會停用 MiniMax 思考功能。`/fast on` 或 `params.fastMode: true` 會將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。

  </Accordion>
  <Accordion title="Moonshot AI (Kimi)">
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

    若要使用中國端點：`baseUrl: "https://api.moonshot.cn/v1"` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`。

    原生 Moonshot 端點在共用的 `openai-completions` 傳輸上宣佈支援串流使用，且 OpenClaw 會根據端點功能（而非僅根據內建提供者 ID）進行金鑰管理。

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

    設定 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。針對 Zen 目錄使用 `opencode/...` refs，或針對 Go 目錄使用 `opencode-go/...` refs。捷徑：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
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

    Base URL 應省略 `/v1`（Anthropic 用戶端會自動附加）。捷徑：`openclaw onboard --auth-choice synthetic-api-key`。

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

    設定 `ZAI_API_KEY`。`z.ai/*` 和 `z-ai/*` 是接受的別名。捷徑：`openclaw onboard --auth-choice zai-api-key`。

    - 一般端點：`https://api.z.ai/api/paas/v4`
    - 編碼端點 (預設)：`https://api.z.ai/api/coding/paas/v4`
    - 若要使用一般端點，請使用基礎 URL 覆寫來定義自訂提供者。

  </Accordion>
</AccordionGroup>

---

## 相關

- [設定 — 代理程式](/zh-Hant/gateway/config-agents)
- [設定 — 頻道](/zh-Hant/gateway/config-channels)
- [設定參考](/zh-Hant/gateway/configuration-reference) — 其他頂層鍵
- [工具和外掛](/zh-Hant/tools)
