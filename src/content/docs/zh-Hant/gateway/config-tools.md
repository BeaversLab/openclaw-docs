---
summary: "工具配置（原則、實驗性切換開關、提供者支援的工具）和自訂提供者/基本 URL 設定"
read_when:
  - Configuring `tools.*` policy, allowlists, or experimental features
  - Registering custom providers or overriding base URLs
  - Setting up OpenAI-compatible self-hosted endpoints
title: "設定 — 工具和自訂提供者"
sidebarTitle: "工具和自訂提供者"
---

`tools.*` 設定鍵和自訂提供者 / 基本 URL 設定。如需代理程式、通道和其他頂層設定鍵，請參閱[設定參考](/zh-Hant/gateway/configuration-reference)。

## 工具

### 工具設定檔

`tools.profile` 在 `tools.allow`/`tools.deny` 之前設定基本允許清單：

<Note>本機上線流程會在未設定時將新的本機設定預設為 `tools.profile: "coding"`（現有的明確設定檔會予以保留）。</Note>

| 設定檔      | 包含                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | 僅限 `session_status`                                                                                                           |
| `coding`    | `group:fs`、`group:runtime`、`group:web`、`group:sessions`、`group:memory`、`cron`、`image`、`image_generate`、`video_generate` |
| `messaging` | `group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`                                       |
| `full`      | 無限制（與未設定相同）                                                                                                          |

### 工具群組

| 群組               | 工具                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`、`process`、`code_execution`（`bash` 被接受為 `exec` 的別名）                                                    |
| `group:fs`         | `read`、`write`、`edit`、`apply_patch`                                                                                  |
| `group:sessions`   | `sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status` |
| `group:memory`     | `memory_search`, `memory_get`                                                                                           |
| `group:web`        | `web_search`, `x_search`, `web_fetch`                                                                                   |
| `group:ui`         | `browser`, `canvas`                                                                                                     |
| `group:automation` | `heartbeat_respond`, `cron`, `gateway`                                                                                  |
| `group:messaging`  | `message`                                                                                                               |
| `group:nodes`      | `nodes`                                                                                                                 |
| `group:agents`     | `agents_list`, `update_plan`                                                                                            |
| `group:media`      | `image`, `image_generate`, `music_generate`, `video_generate`, `tts`                                                    |
| `group:openclaw`   | 所有內建工具（不包含提供者外掛）                                                                                        |
| `group:plugins`    | 載入外掛所擁有的工具，包括透過 `bundle-mcp` 暴露的已設定 MCP 伺服器                                                     |

### 沙箱工具原則中的 MCP 和外掛工具

已設定的 MCP 伺服器會以 `bundle-mcp` 外掛 ID 下的外掛擁有工具形式公開。一般的工具設定檔可以允許使用它們，但 `tools.sandbox.tools` 是沙箱工作階段的額外閘道。如果沙箱模式為 `"all"` 或 `"non-main"`，當 MCP/外掛工具應為可見時，請在沙箱工具允許清單中包含以下其中一個項目：

- 來自 `mcp.servers` 的 OpenClaw 管理之 MCP 伺服器的 `bundle-mcp`
- 特定原生外掛的外掛 ID
- 所有已載入之外掛擁有工具的 `group:plugins`
- 精確的 MCP 伺服器工具名稱或伺服器萬用字元，例如當您只需要一個伺服器時使用 `outlook__send_mail` 或 `outlook__*`

Server glob 使用對 provider 安全的 MCP server 前綴，不一定是原始的 `mcp.servers` 鍵。非 `[A-Za-z0-9_-]` 字元會變成 `-`，不以字母開頭的名稱會獲得 `mcp-` 前綴，且過長或重複的前綴可能會被截斷或加上後綴；例如，`mcp.servers["Outlook Graph"]` 會使用像 `outlook-graph__*` 這樣的 glob。

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

如果沒有該 sandbox 層級的項目，MCP server 仍然可以成功載入，但其工具會在 provider 請求之前被過濾掉。請使用 `openclaw doctor` 來擷取 `mcp.servers` 中 OpenClaw 管理的伺服器的此類型態。從套件 plugin manifest 或 Claude `.mcp.json` 載入的 MCP server 使用相同的 sandbox 閘道，但此診斷尚未列舉這些來源；如果它們的工具在 sandbox 週期中消失，請使用相同的允許清單項目。

### `tools.codeMode`

`tools.codeMode` 啟用通用的 OpenClaw 程式碼模式介面。當在執行工具時啟用，模型只能看到 `exec` 和 `wait`；一般的 OpenClaw 工具會移至 sandbox 內的 `tools.*` catalog bridge 之後，而 MCP 工具則透過生成的 `MCP` 命名空間提供。

```json5
{
  tools: {
    codeMode: {
      enabled: true,
    },
  },
}
```

也接受簡寫形式：

```json5
{
  tools: { codeMode: true },
}
```

MCP 宣告在程式碼模式中透過唯讀虛擬 API 檔案介面公開。客體程式碼可以呼叫 `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")`，以便在呼叫 `MCP.<server>.<tool>()` 之前檢查 TypeScript 風格的簽章。請參閱 [Code mode](/zh-Hant/reference/code-mode) 以了解執行時期合約、限制和偵錯步驟。

### `tools.allow` / `tools.deny`

全域工具允許/拒絕原則（拒絕優先）。不區分大小寫，支援 `*` 萬用字元。即使關閉 Docker sandbox 也會套用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

`write` 和 `apply_patch` 是分開的工具 id。`allow: ["write"]` 也會針對相容模型啟用 `apply_patch`，但 `deny: ["write"]` 並不會拒絕 `apply_patch`。若要封鎖所有檔案變更，請拒絕 `group:fs` 或明確列出每個變更工具：

```json5
{
  tools: { deny: ["write", "edit", "apply_patch"] },
}
```

### `tools.byProvider`

針對特定供應商或模型進一步限制工具。順序：基本設定檔 → 供應商設定檔 → 允許/拒絕。

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

針對特定請求者身分限制工具。這是建立在通道存取控制之上的縱深防禦；發送者值必須來自通道適配器，而非訊息文字。

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

金鑰使用明確的前綴：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 或 `"*"`。通道 ID 是標準的 OpenClaw ID；別名如 `teams` 會正規化為 `msteams`。舊版無前綴的金鑰僅作為 `id:` 被接受。比對順序為 channel+id、id、e164、username、name，然後是萬用字元。

每個代理的 `agents.list[].tools.toolsBySender` 在比對時會覆寫全域發送者比對，即使使用空的 `{}` 政策也是如此。

### `tools.elevated`

控制沙箱之外的提權 exec 存取：

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

- 每個代理的覆寫 (`agents.list[].tools.elevated`) 只能進一步限制。
- `/elevated on|off|ask|full` 依會話儲存狀態；內聯指令則套用於單一訊息。
- 提權的 `exec` 會繞過沙箱並使用設定的逃逸路徑 (預設為 `gateway`，或當 exec 目標為 `node` 時使用 `node`)。

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

工具循環安全檢查**預設為停用**。設定 `enabled: true` 以啟用偵測。設定可以在 `tools.loopDetection` 中全域定義，並在 `agents.list[].tools.loopDetection` 中為每個代理程式覆寫。

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
  保留用於循環分析的最大工具呼叫歷史記錄。
</ParamField>
<ParamField path="warningThreshold" type="number">
  重複無進度模式警告的閾值。
</ParamField>
<ParamField path="criticalThreshold" type="number">
  用於封鎖關鍵循環的較高重複閾值。
</ParamField>
<ParamField path="globalCircuitBreakerThreshold" type="number">
  任何無進度執行的硬式停止閾值。
</ParamField>
<ParamField path="detectors.genericRepeat" type="boolean">
  在重複相同工具/相同引數呼叫時發出警告。
</ParamField>
<ParamField path="detectors.knownPollNoProgress" type="boolean">
  對已知的輪詢工具 (`process.poll`, `command_status` 等) 發出警告/封鎖。
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  對交替的無進度配對模式發出警告/封鎖。
</ParamField>

<Warning>
如果 `warningThreshold >= criticalThreshold` 或 `criticalThreshold >= globalCircuitBreakerThreshold`，驗證將會失敗。
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

設定傳入媒體理解 (圖片/音訊/影片)：

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
  <Accordion title="媒體模型條目欄位">
    **供應商條目** (`type: "provider"` 或省略):

    - `provider`: API 供應商 ID (`openai`、`anthropic`、`google`/`gemini`、`groq` 等)
    - `model`: 模型 ID 覆寫
    - `profile` / `preferredProfile`: `auth-profiles.json` 設定檔選擇

    **CLI 條目** (`type: "cli"`):

    - `command`: 要執行的可執行檔
    - `args`: 模板化參數 (支援 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等；`openclaw doctor --fix` 會將已棄用的 `{input}` 預留位置遷移至 `{{MediaPath}}`)

    **通用欄位:**

    - `capabilities`: 可選清單 (`image`、`audio`、`video`)。預設值: `openai`/`anthropic`/`minimax` → 圖片，`google` → 圖片+音訊+視訊，`groq` → 音訊。
    - `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`: 各條目覆寫。
    - `tools.media.image.timeoutSeconds` 和相符的圖片模型 `timeoutSeconds` 條目也會在代理程式呼叫明確的 `image` 工具時套用。
    - 失敗時會回退至下一個條目。

    供應商驗證遵循標準順序: `auth-profiles.json` → 環境變數 → `models.providers.*.apiKey`。

    **非同步完成欄位:**

    - `asyncCompletion.directSend`: 已棄用的相容性旗標。已完成的非同步媒體任務會保持請求者會話協調，以便代理程式接收結果、決定如何通知使用者，並在需要來源傳遞時使用訊息工具。

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

控制哪些會話可以成為會話工具 (`sessions_list`、`sessions_history`、`sessions_send`) 的目標。

預設值：`tree` (目前會話 + 由其產生的會話，例如子代理程式)。

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
    - `self`：僅限目前的會話金鑰。
    - `tree`：目前會話 + 由目前會話產生的會話 (子代理程式)。
    - `agent`：屬於目前代理程式 ID 的任何會話 (如果您在相同的代理程式 ID 下執行每個發送者的會話，可能包含其他使用者)。
    - `all`：任何會話。跨代理程式目標仍然需要 `tools.agentToAgent`。
    - 沙盒限制：當目前會話在沙盒中且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 時，即使設定為 `tools.sessions.visibility="all"`，可見性也會被強制設為 `tree`。
    - 當未設定為 `all` 時，`sessions_list` 會包含一個簡潔的 `visibility` 欄位，
      用來描述有效模式，並警告可能會省略目前範圍之外的某些會話。

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
  <Accordion title="附件說明">
    - 附件需要 `enabled: true`。
    - 子代理附件會以 `.manifest.json` 具體化到子工作區的 `.openclaw/attachments/<uuid>/`。
    - ACP 附件僅限圖像，並在通過相同的檔案計數、單檔位元組和總位元組限制後，以行內方式轉發至 ACP 執行時。
    - 附件內容會從逐字稿持久化中自動編輯。
    - Base64 輸入會經過嚴格的字母表/填充檢查和解碼前大小防護驗證。
    - 子代理附件檔案權限，目錄為 `0700`，檔案為 `0600`。
    - 子代理清理遵循 `cleanup` 策略：`delete` 總是移除附件；`keep` 僅在 `retainOnSessionKeep: true` 時保留它們。

  </Accordion>
</AccordionGroup>

<a id="toolsexperimental"></a>

### `tools.experimental`

實驗性內建工具旗標。除非套用嚴格代理 GPT-5 自動啟用規則，否則預設為關閉。

```json5
{
  tools: {
    experimental: {
      planTool: true, // enable experimental update_plan
    },
  },
}
```

- `planTool`：啟用結構化 `update_plan` 工具，用於非平凡的多步驟工作追蹤。
- 預設值：`false`，除非在 OpenAI 或 OpenAI Codex GPT-5 系列執行中，將 `agents.defaults.embeddedAgent.executionContract`（或每個代理的覆寫值）設為 `"strict-agentic"`。設定 `true` 可在該範圍之外強制啟用此工具，或設定 `false` 以在嚴格代理 GPT-5 執行時也保持關閉。
- 啟用時，系統提示詞也會新增使用指南，使模型僅將其用於實質性工作，並最多保持一個步驟 `in_progress`。

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

- `model`：產生子代理的預設模型。如果省略，子代理會繼承呼叫者的模型。
- `allowAgents`：當請求代理未設定其自身的 `subagents.allowAgents` 時，針對 `sessions_spawn` 的已設定目標代理 ID 的預設允許清單（`["*"]` = 任何已設定的目標；預設值：僅限同一個代理）。若其代理組態已被刪除，過時的項目將會被 `sessions_spawn` 拒絕，並且會從 `agents_list` 中省略；請執行 `openclaw doctor --fix` 來加以清除。
- `runTimeoutSeconds`：`sessions_spawn` 的預設逾時（秒）。`0` 表示沒有逾時限制。
- `announceTimeoutMs`：閘道 `agent` 公告傳遞嘗試的單次呼叫逾時（毫秒）。預設值：`120000`。暫時性重試可能會導致總公告等待時間超過一個設定的逾時時間。
- 個別子代理工具原則：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自訂提供者和基礎 URL

提供者外掛會發布其自己的模型目錄列。請透過組態中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 新增自訂提供者。

設定自訂/本機提供者 `baseUrl` 也是針對模型 HTTP 請求的嚴格網路信任決策：OpenClaw 會透過受防護的擷取路徑允許該特定的 `scheme://host:port` 來源，而無需新增個別的組態選項或信任其他私有來源。

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
  <Accordion title="驗證與合併優先順序">
    - 使用 `authHeader: true` + `headers` 進行自訂驗證需求。
    - 使用 `OPENCLAW_AGENT_DIR` 覆寫 agent config 根目錄。
    - 符合條件的提供者 ID 之合併優先順序：
      - 非空白的 agent `models.json` `baseUrl` 值優先採用。
      - 非空白的 agent `apiKey` 值僅在該提供者於當前 config/auth-profile 內容中非由 SecretRef 管理時優先採用。
      - 由 SecretRef 管理的提供者 `apiKey` 值會來源標記重新整理（env refs 為 `ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`），而非持續保存已解析的 secrets。
      - 由 SecretRef 管理的提供者標頭值會來源標記重新整理（env refs 為 `secretref-env:ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`）。
      - 空白或遺失的 agent `apiKey`/`baseUrl` 會回退至 config 中的 `models.providers`。
      - 符合條件的 model `contextWindow`/`maxTokens` 會採用明確配置與隱含目錄值之間較高的數值。
      - 符合條件的 model `contextTokens` 若存在明確的 runtime 上限則予以保留；可用來限制有效內容而不變更原生 model 中繼資料。
      - 提供者外掛目錄是以產生的外掛擁有目錄分片形式儲存在 agent 的外掛狀態下。
      - 當您希望 config 完全重寫 `models.json` 和作用中的外掛目錄分片時，請使用 `models.mode: "replace"`。
      - 標記持久化以來源為準：標記是寫自作用中的來源 config 快照（解析前），而非來自已解析的 runtime secret 值。

  </Accordion>
</AccordionGroup>

### 提供者欄位詳細資訊

<AccordionGroup>
  <Accordion title="頂層目錄">
    - `models.mode`: 提供者目錄行為（`merge` 或 `replace`）。
    - `models.providers`: 以提供者 ID 為鍵的自訂提供者對應。
      - 安全編輯：使用 `openclaw config set models.providers.<id> '<json>' --strict-json --merge` 或 `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` 進行累加更新。`config set` 會拒絕破壞性替換，除非您傳遞 `--replace`。

  </Accordion>
  <Accordion title="供應商連線與認證">
    - `models.providers.*.api`：請求配接器（`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。對於 MLX、vLLM、SGLang 等自託管 `/v1/chat/completions` 後端，以及大多數與 OpenAI 相容的本機伺服器，請使用 `openai-completions`。具有 `baseUrl` 但沒有 `api` 的自訂供應商預設為 `openai-completions`；僅當後端支援 `/v1/responses` 時才設定 `openai-responses`。
    - `models.providers.*.apiKey`：供應商憑證（建議使用 SecretRef/env 替代）。
    - `models.providers.*.auth`：認證策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
    - `models.providers.*.contextWindow`：當模型項目未設定 `contextWindow` 時，此供應商下模型的預設原生內容視窗。
    - `models.providers.*.contextTokens`：當模型項目未設定 `contextTokens` 時，此供應商下模型的預設有效執行時間內容上限。
    - `models.providers.*.maxTokens`：當模型項目未設定 `maxTokens` 時，此供應商下模型的預設輸出 Token 上限。
    - `models.providers.*.timeoutSeconds`：可選的個別供應商模型 HTTP 請求逾時間（秒），包括連線、標頭、主體以及總請求中止處理。
    - `models.providers.*.injectNumCtxForOpenAICompat`：針對 Ollama + `openai-completions`，將 `options.num_ctx` 注入請求中（預設：`true`）。
    - `models.providers.*.authHeader`：在需要時，強制在 `Authorization` 標頭中傳輸憑證。
    - `models.providers.*.baseUrl`：上游 API 基礎 URL。
    - `models.providers.*.headers`：用於代理/租戶路由的額外靜態標頭。

  </Accordion>
  <Accordion title="請求傳輸覆寫">
    `models.providers.*.request`: 模型供應商 HTTP 請求的傳輸覆寫設定。

    - `request.headers`: 額外的標頭 (與供應商預設值合併)。數值接受 SecretRef。
    - `request.auth`: 驗證策略覆寫。模式：`"provider-default"` (使用供應商的內建驗證)、`"authorization-bearer"` (搭配 `token`)、`"header"` (搭配 `headerName`、`value`，選擇性的 `prefix`)。
    - `request.proxy`: HTTP 代理伺服器覆寫。模式：`"env-proxy"` (使用 `HTTP_PROXY`/`HTTPS_PROXY` 環境變數)、`"explicit-proxy"` (搭配 `url`)。這兩種模式都接受選擇性的 `tls` 子物件。
    - `request.tls`: 直接連線的 TLS 覆寫。欄位：`ca`、`cert`、`key`、`passphrase` (皆接受 SecretRef)、`serverName`、`insecureSkipVerify`。
    - `request.allowPrivateNetwork`: 當設為 `true` 時，透過供應商 HTTP 擷取防護機制，允許對私有、CGNAT 或類似範圍發出模型供應商 HTTP 請求。自訂/本機供應商基礎 URL 已信任確切設定的來源，但中繼資料/連結本機來源除外，除非明確加入，否則仍會被封鎖。將此設為 `false` 以退出確切來源信任。WebSocket 使用相同的 `request` 處理標頭/TLS，但不包含該擷取 SSRF 閘道。預設值為 `false`。

  </Accordion>
  <Accordion title="模型目錄條目">
    - `models.providers.*.models`：明確的提供者模型目錄條目。
    - `models.providers.*.models.*.input`：模型輸入模態。對於僅文字模型使用 `["text"]`，對於原生圖片/視覺模型使用 `["text", "image"]`。僅當所選模型標記為支援圖片時，圖片附件才會被注入到 Agent 輪次中。
    - `models.providers.*.models.*.contextWindow`：原生模型上下文視窗元數據。這會覆寫該模型提供者層級的 `contextWindow`。
    - `models.providers.*.models.*.contextTokens`：可選的執行時上下文上限。這會覆寫提供者層級的 `contextTokens`；當您希望有效的上下文預算小於模型原生的 `contextWindow` 時使用此選項；當這兩個值不同時，`openclaw models list` 會顯示這兩個值。
    - `models.providers.*.models.*.compat.supportsDeveloperRole`：可選的相容性提示。對於具有非空且非原生 `baseUrl`（主機不是 `api.openai.com`）的 `api: "openai-completions"`，OpenClaw 會在執行時將其強制設為 `false`。空/省略的 `baseUrl` 將保持預設的 OpenAI 行為。
    - `models.providers.*.models.*.compat.requiresStringContent`：僅限字串的 OpenAI 相容聊天端點的可選相容性提示。當 `true` 時，OpenClaw 會在發送請求之前將純文字 `messages[].content` 陣列扁平化為純字串。
    - `models.providers.*.models.*.compat.strictMessageKeys`：嚴格 OpenAI 相容聊天端點的可選相容性提示。當 `true` 時，OpenClaw 會在發送請求之前將傳出的 Chat Completions 訊息物件剝離為 `role` 和 `content`。
    - `models.providers.*.models.*.compat.thinkingFormat`：可選的思考 payload 提示。對於 Together 風格的 `reasoning.enabled` 使用 `"together"`，對於頂層 `enable_thinking` 使用 `"qwen"`，或對於支援請求層級 chat-template kwargs（例如 vLLM）的 Qwen 系列 OpenAI 相容伺服器上的 `chat_template_kwargs.enable_thinking` 使用 `"qwen-chat-template"`。已配置的 vLLM Qwen 模型會針對這些格式公開二進位 `/think` 選擇（`off`、`on`）。

  </Accordion>
  <Accordion title="Amazon Bedrock 探索">
    - `plugins.entries.amazon-bedrock.config.discovery`：Bedrock 自動探索設定的根目錄。
    - `plugins.entries.amazon-bedrock.config.discovery.enabled`：開啟或關閉隱式探索。
    - `plugins.entries.amazon-bedrock.config.discovery.region`：用於探索的 AWS 區域。
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter`：用於目標探索的選用 provider-id 篩選器。
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`：探索重新整理的輪詢間隔。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`：已探索模型的備用上下文視窗。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`：已探索模型的備用最大輸出 token。

  </Accordion>
</AccordionGroup>

互動式自訂供應商導入流程會為常見的視覺模型 ID（例如 GPT-4o、Claude、Gemini、Qwen-VL、LLaVA、Pixtral、InternVL、Mllama、MiniCPM-V 和 GLM-4V）推斷圖片輸入，並跳過已知僅文字系列的多餘問題。未知的模型 ID 仍會提示是否支援圖片。非互動式導入使用相同的推斷邏輯；請傳入 `--custom-image-input` 以強制使用支援圖片的元數據，或傳入 `--custom-text-input` 以強制使用僅文字的元數據。

### 供應商範例

<AccordionGroup>
  <Accordion title="Cerebras (GLM 4.7 / GPT OSS)">
    內建的 `cerebras` 供應商外掛可以透過 `openclaw onboard --auth-choice cerebras-api-key` 來設定此項。僅在覆寫預設值時才使用明確的供應商設定。

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

    相容 Anthropic 的內建供應商。捷徑：`openclaw onboard --auth-choice kimi-code-api-key`。

  </Accordion>
  <Accordion title="本地模型 (LM Studio)">
    請參閱[本地模型](/zh-Hant/gateway/local-models)。TL;DR：在強硬體上透過 LM Studio Responses API 執行大型本地模型；保留合併的託管模型作為備援。
  </Accordion>
  <Accordion title="MiniMax M3 (直接)">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M3" },
          models: {
            "minimax/MiniMax-M3": { alias: "Minimax" },
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
                id: "MiniMax-M3",
                name: "MiniMax M3",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.12, cacheWrite: 0 },
                contextWindow: 1000000,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    設定 `MINIMAX_API_KEY`。捷徑：`openclaw onboard --auth-choice minimax-global-api` 或 `openclaw onboard --auth-choice minimax-cn-api`。模型目錄預設為 M3，並包含 M2.7 變體。在 Anthropic 相容串流路徑上，OpenClaw 預設會停用 MiniMax 思考，除非您明確設定 `thinking`。`/fast on` 或 `params.fastMode: true` 會將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。

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

    對於中國端點：`baseUrl: "https://api.moonshot.cn/v1"` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`。

    原生 Moonshot 端點宣稱在共享的 `openai-completions` 傳輸上相容串流使用，並且 OpenClaw 金鑰依賴端點功能，而不僅僅是內建提供者 ID。

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

    設定 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`)。對於 Zen 目錄使用 `opencode/...` 參照，對於 Go 目錄使用 `opencode-go/...` 參照。捷徑：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

  </Accordion>
  <Accordion title="Synthetic (Anthropic 相容)">
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

    基礎 URL 應省略 `/v1` (Anthropic 客戶端會附加它)。捷徑：`openclaw onboard --auth-choice synthetic-api-key`。

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

    設定 `ZAI_API_KEY`。模型引用使用正式的 `zai/*` 提供者 ID。捷徑：`openclaw onboard --auth-choice zai-api-key`。

    - 通用端點：`https://api.z.ai/api/paas/v4`
    - 程式設計端點（預設）：`https://api.z.ai/api/coding/paas/v4`
    - 若使用通用端點，請定義一個自訂提供者並覆寫基礎 URL。

  </Accordion>
</AccordionGroup>

---

## 相關

- [組態 — 代理程式](/zh-Hant/gateway/config-agents)
- [組態 — 頻道](/zh-Hant/gateway/config-channels)
- [組態參考](/zh-Hant/gateway/configuration-reference) — 其他頂層金鑰
- [工具與外掛程式](/zh-Hant/tools)
