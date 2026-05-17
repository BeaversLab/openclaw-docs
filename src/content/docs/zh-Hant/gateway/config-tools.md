---
summary: "工具設定（原則、實驗性切換、提供者支援的工具）及自訂提供者/基礎 URL 設定"
read_when:
  - Configuring `tools.*` policy, allowlists, or experimental features
  - Registering custom providers or overriding base URLs
  - Setting up OpenAI-compatible self-hosted endpoints
title: "設定 — 工具與自訂提供者"
sidebarTitle: "工具與自訂提供者"
---

`tools.*` 設定金鑰及自訂提供者 / 基礎 URL 設定。如需代理程式、通道及其他頂層設定金鑰，請參閱[設定參考](/zh-Hant/gateway/configuration-reference)。

## 工具

### 工具設定檔

`tools.profile` 在 `tools.allow`/`tools.deny` 之前設定一個基礎允許清單：

<Note>本機入門程式會在未設定時將新的本機設定預設為 `tools.profile: "coding"`（保留現有的明確設定檔）。</Note>

| 設定檔      | 包含                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | 僅限 `session_status`                                                                                                           |
| `coding`    | `group:fs`、`group:runtime`、`group:web`、`group:sessions`、`group:memory`、`cron`、`image`、`image_generate`、`video_generate` |
| `messaging` | `group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`                                       |
| `full`      | 無限制（與未設定相同）                                                                                                          |

### 工具群組

| 群組               | 工具                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`、`process`、`code_execution`（接受 `bash` 作為 `exec` 的別名）                                                   |
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

### `tools.allow` / `tools.deny`

全域工具允許/拒絕策略（拒絕優先）。不區分大小寫，支援 `*` 萬用字元。即使關閉 Docker 沙盒也會套用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

`write` 和 `apply_patch` 是分開的工具 ID。`allow: ["write"]` 也會為相容模型啟用 `apply_patch`，但 `deny: ["write"]` 並不會拒絕 `apply_patch`。若要封鎖所有檔案變更，請拒絕 `group:fs` 或明確列出每個變更工具：

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

限制特定請求者身分的工具。這是在通道存取控制之上的深度防禦；發送者值必須來自通道介面卡，而非訊息文字。

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

金鑰使用顯式前綴：`channel:<channelId>:<senderId>`、`id:<senderId>`、`e164:<phone>`、`username:<handle>`、`name:<displayName>` 或 `"*"`。頻道 ID 是標準的 OpenClaw ID；諸如 `teams` 的別名會正規化為 `msteams`。舊版無前綴金鑰僅作為 `id:` 被接受。匹配順序為 channel+id、id、e164、username、name，然後是萬用字元。

當相符時，每個代理程式的 `agents.list[].tools.toolsBySender` 會覆寫全域發送者匹配，即使 `{}` 原則為空也會覆寫。

### `tools.elevated`

控制沙箱之外的提升執行存取權：

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
- `/elevated on|off|ask|full` 會儲存每個階段的狀態；內嵌指令適用於單一訊息。
- 提升的 `exec` 會略過沙箱機制，並使用設定的逸出路徑 (預設為 `gateway`，當執行目標為 `node` 時則為 `node`)。

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

工具迴圈安全性檢查**預設為停用**。設定 `enabled: true` 以啟動偵測。設定可以在 `tools.loopDetection` 中全域定義，並在 `agents.list[].tools.loopDetection` 處針對每個代理程式覆寫。

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
  任何無進度執行的強制停止閾值。
</ParamField>
<ParamField path="detectors.genericRepeat" type="boolean">
  對重複的相同工具/相同引數呼叫發出警告。
</ParamField>
<ParamField path="detectors.knownPollNoProgress" type="boolean">
  對已知輪詢工具 (`process.poll`, `command_status`, 等) 發出警告/阻擋。
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  對交替無進度成對模式發出警告/阻擋。
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

設定輸入媒體理解 (圖片/音訊/影片)：

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
  <Accordion title="Media model entry fields">
    **Provider entry** (`type: "provider"` 或省略):

    - `provider`：API 提供者 id (`openai`、`anthropic`、`google`/`gemini`、`groq` 等)
    - `model`：模型 id 覆蓋
    - `profile` / `preferredProfile`：`auth-profiles.json` 設定檔選擇

    **CLI entry** (`type: "cli"`):

    - `command`：要執行的可執行檔
    - `args`：樣板化參數 (支援 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等；`openclaw doctor --fix` 會將已棄用的 `{input}` 預留位置遷移至 `{{MediaPath}}`)

    **Common fields:**

    - `capabilities`：選用清單 (`image`、`audio`、`video`)。預設值：`openai`/`anthropic`/`minimax` → image，`google` → image+audio+video，`groq` → audio。
    - `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`：個別條目覆蓋。
    - 當代理程式呼叫明確的 `image` 工具時，`tools.media.image.timeoutSeconds` 和相符的影像模型 `timeoutSeconds` 條目也適用。
    - 失敗時會退回至下一個條目。

    提供者驗證遵循標準順序：`auth-profiles.json` → env vars → `models.providers.*.apiKey`。

    **Async completion fields:**

    - `asyncCompletion.directSend`：已棄用的相容性旗標。已完成的非同步媒體工作會保持由請求者工作階段調解，以便代理程式接收結果、決定如何告知使用者，並在來源傳遞需要時使用訊息工具。

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

控制哪些 session 可以成為 session 工具 (`sessions_list`, `sessions_history`, `sessions_send`) 的目標。

預設值：`tree` (目前 session + 由其產生的 session，例如子代理程式)。

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
    - `self`：僅限目前的 session 金鑰。
    - `tree`：目前 session + 由目前 session 產生的 session (子代理程式)。
    - `agent`：屬於目前代理程式 ID 的任何 session (如果您在同一個代理程式 ID 下執行每個發送者的 session，則可能包含其他使用者)。
    - `all`：任何 session。跨代理程式目標仍然需要 `tools.agentToAgent`。
    - 沙箱限制：當目前 session 處於沙箱中且為 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 時，即使 `tools.sessions.visibility="all"`，可見性也會被強制設為 `tree`。

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
  <Accordion title="附件注意事項">
    - 附件僅支援 `runtime: "subagent"`。ACP 執行時會拒絕它們。
    - 檔案會以 `.manifest.json` 實體化到子工作區的 `.openclaw/attachments/<uuid>/` 中。
    - 附件內容會從對話紀錄持久性中自動編修。
    - Base64 輸入會透過嚴格的字母/填填充檢查和解碼前大小防護進行驗證。
    - 檔案權限目錄為 `0700`，檔案為 `0600`。
    - 清理遵循 `cleanup` 原則：`delete` 總是移除附件；`keep` 僅在 `retainOnSessionKeep: true` 時保留它們。

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
- 預設值：`false`，除非針對 OpenAI 或 OpenAI Codex GPT-5 系列的運行將 `agents.defaults.embeddedPi.executionContract`（或個別代理的覆寫）設為 `"strict-agentic"`。在此範圍之外設定 `true` 以強制啟用該工具，或設定 `false` 以在嚴格代理的 GPT-5 運行中也保持關閉。
- 啟用時，系統提示詞也會增加使用指南，使模型僅將其用於實質性工作，並且最多保持一個步驟 `in_progress`。

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
- `allowAgents`：當請求者代理未設定自己的 `subagents.allowAgents` 時，`sessions_spawn` 的目標代理 ID 預設允許清單（`["*"]` = 任意；預設：僅限同一代理）。
- `runTimeoutSeconds`：當工具呼叫省略 `runTimeoutSeconds` 時，`sessions_spawn` 的預設逾時（秒）。`0` 表示無逾時。
- `announceTimeoutMs`：閘道 `agent` 公告傳遞嘗試的每次呼叫逾時（毫秒）。預設值：`120000`。暫時性重試可能會使總公告等待時間超過一個設定的逾時。
- 各子代理工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自訂提供者和基本 URL

OpenClaw 使用內建模型目錄。透過設定中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 新增自訂提供者。

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
    - 使用 `OPENCLAW_AGENT_DIR` 覆寫 agent config root（或 `PI_CODING_AGENT_DIR`，一個舊版環境變數別名）。
    - 符合的提供者 ID 的合併優先順序：
      - 非空的 agent `models.json` `baseUrl` 值優先。
      - 非空的 agent `apiKey` 值僅在該提供者於目前的 config/auth-profile 環境中非由 SecretRef 管理時優先。
      - SecretRef 管理的提供者 `apiKey` 值是從來源標記重新整理（env refs 為 `ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`），而非持續已解析的 secrets。
      - SecretRef 管理的提供者 header 值是從來源標記重新整理（env refs 為 `secretref-env:ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`）。
      - 空值或遺失的 agent `apiKey`/`baseUrl` 會回退至 config 中的 `models.providers`。
      - 符合的 model `contextWindow`/`maxTokens` 使用明確設定與隱含 catalog 值之間較高的數值。
      - 符合的 model `contextTokens` 在存在時會保留明確的 runtime 上限；使用它來限制有效 context 而不改變原生 model metadata。
      - 當您希望 config 完全重寫 `models.json` 時，請使用 `models.mode: "replace"`。
      - 標記持久性是來源權威：標記是從作用中的來源 config 快照（解析前）寫入，而非從已解析的 runtime secret 值。

  </Accordion>
</AccordionGroup>

### Provider field details

<AccordionGroup>
  <Accordion title="頂層目錄">
    - `models.mode`：提供者目錄行為 (`merge` 或 `replace`)。
    - `models.providers`：依提供者 id 索引的自訂提供者映射。
      - 安全編輯：使用 `openclaw config set models.providers.<id> '<json>' --strict-json --merge` 或 `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` 進行新增更新。`config set` 會拒絕破壞性替換，除非您傳入 `--replace`。

  </Accordion>
  <Accordion title="提供者連線與驗證">
    - `models.providers.*.api`：請求配接器（`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等）。對於 MLX、vLLM、SGLang 等自託管 `/v1/chat/completions` 後端，以及大多數相容 OpenAI 的本機伺服器，請使用 `openai-completions`。具有 `baseUrl` 但沒有 `api` 的自訂提供者預設為 `openai-completions`；僅當後端支援 `/v1/responses` 時才設定 `openai-responses`。
    - `models.providers.*.apiKey`：提供者憑證（優先使用 SecretRef/env 替換）。
    - `models.providers.*.auth`：驗證策略（`api-key`、`token`、`oauth`、`aws-sdk`）。
    - `models.providers.*.contextWindow`：當模型項目未設定 `contextWindow` 時，該提供者下模型的預設原生上下文視窗。
    - `models.providers.*.contextTokens`：當模型項目未設定 `contextTokens` 時，該提供者下模型的預設有效執行階段上下文上限。
    - `models.providers.*.maxTokens`：當模型項目未設定 `maxTokens` 時，該提供者下模型的預設輸出 token 上限。
    - `models.providers.*.timeoutSeconds`：選用的個別提供者模型 HTTP 請求逾時時間（秒），包括連線、標頭、內文及總請求中止處理。
    - `models.providers.*.injectNumCtxForOpenAICompat`：對於 Ollama + `openai-completions`，將 `options.num_ctx` 注入請求中（預設：`true`）。
    - `models.providers.*.authHeader`：在需要時，強制在 `Authorization` 標頭中傳輸憑證。
    - `models.providers.*.baseUrl`：上游 API 基礎 URL。
    - `models.providers.*.headers`：用於 Proxy/租用戶路由額外的靜態標頭。

  </Accordion>
  <Accordion title="請求傳輸覆寫">
    `models.providers.*.request`：模型提供者 HTTP 請求的傳輸覆寫。

    - `request.headers`：額外的標頭（與提供者的預設值合併）。數值接受 SecretRef。
    - `request.auth`：驗證策略覆寫。模式：`"provider-default"`（使用提供者的內建驗證）、`"authorization-bearer"`（使用 `token`）、`"header"`（使用 `headerName`、`value`，可選的 `prefix`）。
    - `request.proxy`：HTTP 代理覆寫。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 環境變數）、`"explicit-proxy"`（使用 `url`）。這兩種模式都接受可選的 `tls` 子物件。
    - `request.tls`：直接連線的 TLS 覆寫。欄位：`ca`、`cert`、`key`、`passphrase`（皆接受 SecretRef）、`serverName`、`insecureSkipVerify`。
    - `request.allowPrivateNetwork`：當設為 `true` 時，透過提供者的 HTTP 擷取防護（操作員選擇加入以信任自託管的 OpenAI 相容端點），允許在 DNS 解析為私人、CGNAT 或類似範圍時，對 `baseUrl` 進行 HTTPS 存取。除非明確設為 `false`，否則回環模型提供者串流 URL（如 `localhost`、`127.0.0.1` 和 `[::1]`）會自動允許；區域網路、tailnet 和私人 DNS 主機仍需選擇加入。WebSocket 會使用相同的 `request` 進行標頭/TLS 設定，但不會經過該擷取 SSRF 閘道。預設值為 `false`。

  </Accordion>
  <Accordion title="模型目錄條目">
    - `models.providers.*.models`：明確的提供商模型目錄條目。
    - `models.providers.*.models.*.input`：模型輸入模態。對於僅文字模型使用 `["text"]`，對於原生圖片/視覺模型使用 `["text", "image"]`。只有當選定的模型被標記為支援圖片時，圖片附件才會被注入到代理對話輪次中。
    - `models.providers.*.models.*.contextWindow`：原生模型上下文視窗元數據。這會覆寫該模型的提供商層級 `contextWindow`。
    - `models.providers.*.models.*.contextTokens`：可選的執行時上下文上限。這會覆寫提供商層級 `contextTokens`；當您希望有效上下文預算小於模型的原生 `contextWindow` 時使用它；當這兩個值不同時，`openclaw models list` 會顯示這兩個值。
    - `models.providers.*.models.*.compat.supportsDeveloperRole`：可選的相容性提示。對於具有非空非原生 `baseUrl`（主機不是 `api.openai.com`）的 `api: "openai-completions"`，OpenClaw 會在執行時將其強制設為 `false`。空白/省略的 `baseUrl` 會保持預設的 OpenAI 行為。
    - `models.providers.*.models.*.compat.requiresStringContent`：僅支援字串的 OpenAI 相容聊天端點的可選相容性提示。當 `true` 時，OpenClaw 會在發送請求之前將純文字 `messages[].content` 陣列扁平化為純字串。
    - `models.providers.*.models.*.compat.strictMessageKeys`：嚴格 OpenAI 相容聊天端點的可選相容性提示。當 `true` 時，OpenClaw 會在發送請求之前將傳出的 Chat Completions 訊息物件剝離為僅包含 `role` 和 `content`。
    - `models.providers.*.models.*.compat.thinkingFormat`：可選的思考負載提示。對於頂層 `enable_thinking` 使用 `"qwen"`，或在支援請求層級 chat-template kwargs（如 vLLM）的 Qwen 系列 OpenAI 相容伺服器上對於 `chat_template_kwargs.enable_thinking` 使用 `"qwen-chat-template"`。

  </Accordion>
  <Accordion title="Amazon Bedrock 探索">
    - `plugins.entries.amazon-bedrock.config.discovery`：Bedrock 自動探索設定根目錄。
    - `plugins.entries.amazon-bedrock.config.discovery.enabled`：開啟或關閉隱式探索。
    - `plugins.entries.amazon-bedrock.config.discovery.region`：用於探索的 AWS 區域。
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter`：用於定向探索的選用提供者 ID 篩選器。
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`：探索重新整理的輪詢間隔。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`：探索到之模型的後備內容視窗。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`：探索到之模型的後備最大輸出 token。

  </Accordion>
</AccordionGroup>

互動式自訂提供者入門會推斷常見視覺模型 ID（例如 GPT-4o、Claude、Gemini、Qwen-VL、LLaVA、Pixtral、InternVL、Mllama、MiniCPM-V 和 GLM-4V）的圖像輸入，並對已知僅文字系列跳過額外問題。未知的模型 ID 仍會提示圖像支援。非互動式入門使用相同的推斷；傳遞 `--custom-image-input` 以強制支援圖像的元數據，或傳遞 `--custom-text-input` 以強制僅文字元數據。

### 提供者範例

<AccordionGroup>
  <Accordion title="Cerebras (GLM 4.7 / GPT OSS)">
    內建的 `cerebras` 提供者外掛程式可以透過 `openclaw onboard --auth-choice cerebras-api-key` 進行設定。僅在覆寫預設值時才使用明確的提供者設定。

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

    相容 Anthropic 的內建提供者。捷徑：`openclaw onboard --auth-choice kimi-code-api-key`。

  </Accordion>
  <Accordion title="本機模型 (LM Studio)">
    參閱 [本機模型](/zh-Hant/gateway/local-models)。TL;DR：在強大的硬體上透過 LM Studio Responses API 執行大型本機模型；保留託管模型的合併以作為後備。
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

    設定 `MINIMAX_API_KEY`。捷徑：`openclaw onboard --auth-choice minimax-global-api` 或 `openclaw onboard --auth-choice minimax-cn-api`。模型目錄預設僅限 M2.7。在相容 Anthropic 的串流路徑上，除非您明確設定 `thinking`，否則 OpenClaw 預設會停用 MiniMax 思考功能。`/fast on` 或 `params.fastMode: true` 會將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。

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

    針對中國端點：`baseUrl: "https://api.moonshot.cn/v1"` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`。

    原生 Moonshot 端點會在共用的 `openai-completions` 傳輸上宣佈串流使用相容性，且 OpenClaw 金鑰會根據端點功能而非單獨的內建供應商 ID 來進行處理。

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

    設定 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`)。使用 `opencode/...` 參照代表 Zen 目錄，或使用 `opencode-go/...` 參照代表 Go 目錄。捷徑：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

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

    Base URL 應省略 `/v1` (Anthropic 客戶端會附加它)。捷徑：`openclaw onboard --auth-choice synthetic-api-key`。

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

    設定 `ZAI_API_KEY`。`z.ai/*` 和 `z-ai/*` 是可接受的別名。捷徑：`openclaw onboard --auth-choice zai-api-key`。

    - 通用端點：`https://api.z.ai/api/paas/v4`
    - 程式設計端點（預設）：`https://api.z.ai/api/coding/paas/v4`
    - 對於通用端點，請使用基底 URL 覆寫來定義自訂提供者。

  </Accordion>
</AccordionGroup>

---

## 相關

- [Configuration — agents](/zh-Hant/gateway/config-agents)
- [Configuration — channels](/zh-Hant/gateway/config-channels)
- [Configuration reference](/zh-Hant/gateway/configuration-reference) — other top-level keys
- [Tools and plugins](/zh-Hant/tools)
