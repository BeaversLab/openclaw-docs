---
summary: "工具配置（策略、實驗性開關、提供者支援的工具）和自訂提供者/基礎 URL 設定"
read_when:
  - Configuring `tools.*` policy, allowlists, or experimental features
  - Registering custom providers or overriding base URLs
  - Setting up OpenAI-compatible self-hosted endpoints
title: "組態 — 工具與自訂提供者"
sidebarTitle: "工具與自訂提供者"
---

`tools.*` 組態金鑰和自訂提供者 / 基礎 URL 設定。如需代理程式、通道和其他頂層組態金鑰，請參閱 [組態參考](/zh-Hant/gateway/configuration-reference)。

## 工具

### 工具設定檔

`tools.profile` 在 `tools.allow`/`tools.deny` 之前設定一個基礎允許清單：

<Note>本機入門會在未設定時將新的本機組態預設為 `tools.profile: "coding"`（會保留現有的明確設定檔）。</Note>

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
| `group:memory`     | `memory_search`、`memory_get`                                                                                           |
| `group:web`        | `web_search`、`x_search`、`web_fetch`                                                                                   |
| `group:ui`         | `browser`、`canvas`                                                                                                     |
| `group:automation` | `heartbeat_respond`、`cron`、`gateway`                                                                                  |
| `group:messaging`  | `message`                                                                                                               |
| `group:nodes`      | `nodes`                                                                                                                 |
| `group:agents`     | `agents_list`、`update_plan`                                                                                            |
| `group:media`      | `image`、`image_generate`、`music_generate`、`video_generate`、`tts`                                                    |
| `group:openclaw`   | 所有內建工具（不包含提供者外掛）                                                                                        |

### `tools.allow` / `tools.deny`

全域工具允許/拒絕原則（拒絕優先）。不區分大小寫，支援 `*` 萬用字元。即使關閉 Docker 沙箱也會套用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

`write` 和 `apply_patch` 是不同的工具 ID。`allow: ["write"]` 也會為相容模型啟用 `apply_patch`，但 `deny: ["write"]` 並不會拒絕 `apply_patch`。若要封鎖所有檔案變更，請拒絕 `group:fs` 或明確列出每個會變更檔案的工具：

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

### `tools.elevated`

控制沙箱之外的提權執行存取權：

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

- 個別 Agent 覆寫（`agents.list[].tools.elevated`）只能進行更進一步的限制。
- `/elevated on|off|ask|full` 依工作階段儲存狀態；內嵌指令則適用於單一訊息。
- 提升權限的 `exec` 會繞過沙盒並使用設定的逃脫路徑（預設為 `gateway`，當執行目標為 `node` 時則為 `node`）。

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
      applyPatch: {
        enabled: false,
        allowModels: ["gpt-5.5"],
      },
    },
  },
}
```

### `tools.loopDetection`

工具循環安全檢查**預設為停用**。設定 `enabled: true` 以啟動偵測。設定可在 `tools.loopDetection` 中全域定義，並在 `agents.list[].tools.loopDetection` 處針對每個代理程式進行覆寫。

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
  用於警告的重複無進展模式閾值。
</ParamField>
<ParamField path="criticalThreshold" type="number">
  用於阻擋關鍵循環的較高重複閾值。
</ParamField>
<ParamField path="globalCircuitBreakerThreshold" type="number">
  任何無進展執行的強制停止閾值。
</ParamField>
<ParamField path="detectors.genericRepeat" type="boolean">
  對重複的相同工具/相同參數呼叫發出警告。
</ParamField>
<ParamField path="detectors.knownPollNoProgress" type="boolean">
  對已知輪詢工具（`process.poll`、`command_status` 等）發出警告/進行阻擋。
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  對交替的無進展配對模式發出警告/進行阻擋。
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

設定傳入媒體理解（影像/音訊/視訊）：

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

    - `provider`: API 提供者 ID (`openai`、`anthropic`、`google`/`gemini`、`groq` 等)
    - `model`: 模型 ID 覆蓋
    - `profile` / `preferredProfile`: `auth-profiles.json` 設定檔選擇

    **CLI entry** (`type: "cli"`):

    - `command`: 要執行的可執行檔
    - `args`: 模板化參數 (支援 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等；`openclaw doctor --fix` 會將已棄用的 `{input}` 預留位置遷移至 `{{MediaPath}}`)

    **Common fields:**

    - `capabilities`: 可選清單 (`image`、`audio`、`video`)。預設值：`openai`/`anthropic`/`minimax` → image，`google` → image+audio+video，`groq` → audio。
    - `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`: 各項目覆蓋設定。
    - 當代理程式呼叫明確的 `image` 工具時，也會套用 `tools.media.image.timeoutSeconds` 和相符的圖片模型 `timeoutSeconds` 項目。
    - 失敗時會退回到下一個項目。

    提供者驗證遵循標準順序：`auth-profiles.json` → env vars → `models.providers.*.apiKey`。

    **Async completion fields:**

    - `asyncCompletion.directSend`: 已棄用的相容性旗標。已完成的非同步媒體工作會保持要求者工作階段的中介狀態，以便代理程式接收結果、決定如何告知使用者，並在來源傳遞需要時使用訊息工具。

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

控制哪些 session 可以成為 session 工具（`sessions_list`、`sessions_history`、`sessions_send`）的目標。

預設值：`tree`（目前 session + 由其產生的 session，例如子代理程式）。

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
    - `self`：僅限目前 session 金鑰。
    - `tree`：目前 session + 由目前 session 產生的 session（子代理程式）。
    - `agent`：屬於目前代理程式 ID 的任何 session（如果您在同一個代理程式 ID 下執行每個發送者的 session，可能會包含其他使用者）。
    - `all`：任何 session。跨代理程式定目標仍需 `tools.agentToAgent`。
    - 沙盒限制：當目前 session 處於沙盒中且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"` 時，即使設定 `tools.sessions.visibility="all"`，可見性也會被強制設為 `tree`。

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
    - 僅支援 `runtime: "subagent"` 的附件。ACP 執行時期會拒絕它們。
    - 檔案會以 `.manifest.json` 具體化到子工作區的 `.openclaw/attachments/<uuid>/`。
    - 附件內容會自動從文字記錄持久性中編輯刪除。
    - Base64 輸入會透過嚴格的字母/填字檢查和解碼前大小防護進行驗證。
    - 檔案權限方面，目錄為 `0700`，檔案為 `0600`。
    - 清理遵循 `cleanup` 政策：`delete` 總是會移除附件；`keep` 僅在 `retainOnSessionKeep: true` 時保留它們。

  </Accordion>
</AccordionGroup>

<a id="toolsexperimental"></a>

### `tools.experimental`

實驗性內建工具旗標。除非適用嚴格代理式 GPT-5 自動啟用規則，否則預設為關閉。

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
- 預設值：`false`，除非針對 OpenAI 或 OpenAI Codex GPT-5 系列的運行將 `agents.defaults.embeddedPi.executionContract`（或每個 Agent 的覆寫值）設定為 `"strict-agentic"`。設定 `true` 可在此範圍之外強制啟用該工具，或設定 `false` 以便即使在嚴格 Agent 的 GPT-5 運行中也保持關閉。
- 啟用時，系統提示詞也會新增使用指南，以便模型僅將其用於實質性工作，並且最多保持一個步驟 `in_progress`。

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
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model`：產生子 Agent 的預設模型。如果省略，子 Agent 將繼承呼叫者的模型。
- `allowAgents`：當請求者 Agent 未設定自己的 `subagents.allowAgents` 時，`sessions_spawn` 的目標 Agent ID 預設允許清單（`["*"]` = 任意；預設值：僅限同一 Agent）。
- `runTimeoutSeconds`：當工具呼叫省略 `runTimeoutSeconds` 時，`sessions_spawn` 的預設逾時時間（秒）。`0` 表示無逾時。
- 每個子 Agent 的工具政策：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自訂提供者和基礎 URL

OpenClaw 使用內建模型目錄。您可以透過設定中的 `models.providers` 或 `~/.openclaw/agents/<agentId>/agent/models.json` 新增自訂提供者。

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
    - 使用 `authHeader: true` + `headers` 進行自訂驗證。
    - 使用 `OPENCLAW_AGENT_DIR` 覆寫 agent config 根目錄（或 `PI_CODING_AGENT_DIR`，這是一個舊版環境變數別名）。
    - 符合 provider ID 的合併優先順序如下：
      - 非空的 agent `models.json` `baseUrl` 值優先採用。
      - 非空的 agent `apiKey` 值僅在該 provider 於當前 config/auth-profile 內容中非由 SecretRef 管理時優先採用。
      - SecretRef 管理的 provider `apiKey` 值會從來源標記（env refs 為 `ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`）重新整理，而非持續解析後的密碼。
      - SecretRef 管理的 provider 標頭值會從來源標記（env refs 為 `secretref-env:ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`）重新整理。
      - 空白或遺失的 agent `apiKey`/`baseUrl` 會回退至 config 中的 `models.providers`。
      - 符合的 model `contextWindow`/`maxTokens` 會採用明確設定與隱含目錄值之間較高者。
      - 符合的 model `contextTokens` 若存在明確的 runtime 上限則會予以保留；請使用它來限制實際內容，而不變更原生 model 元資料。
      - 當您希望設定完全覆寫 `models.json` 時，請使用 `models.mode: "replace"`。
      - 標記持久性以來源為準：標記是從使用中的來源設定快照（解析前）寫入，而非從解析後的 runtime 密碼值寫入。

  </Accordion>
</AccordionGroup>

### Provider 欄位詳情

<AccordionGroup>
  <Accordion title="頂層目錄">
    - `models.mode`: 提供者目錄行為 (`merge` 或 `replace`)。
    - `models.providers`: 依提供者 ID 索引的自訂提供者對應。
      - 安全編輯：使用 `openclaw config set models.providers.<id> '<json>' --strict-json --merge` 或 `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` 進行新增更新。除非您傳遞 `--replace`，否則 `config set` 會拒絕破壞性的替換。

  </Accordion>
  <Accordion title="Provider connection and auth">
    - `models.providers.*.api`：請求適配器 (`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等)。對於自託管的 `/v1/chat/completions` 後端（例如 MLX、vLLM、SGLang 和大多數與 OpenAI 相容的本地伺服器），請使用 `openai-completions`。具有 `baseUrl` 但沒有 `api` 的自訂提供者預設為 `openai-completions`；僅當後端支援 `/v1/responses` 時才設定 `openai-responses`。
    - `models.providers.*.apiKey`：提供者憑證（優先使用 SecretRef/env 替代）。
    - `models.providers.*.auth`：驗證策略 (`api-key`、`token`、`oauth`、`aws-sdk`)。
    - `models.providers.*.contextWindow`：當模型條目未設定 `contextWindow` 時，此提供者下模型的預設原生上下文視窗。
    - `models.providers.*.contextTokens`：當模型條目未設定 `contextTokens` 時，此提供者下模型的預設有效運行時上下文上限。
    - `models.providers.*.maxTokens`：當模型條目未設定 `maxTokens` 時，此提供者下模型的預設輸出 token 上限。
    - `models.providers.*.timeoutSeconds`：可選的針對每個提供者模型的 HTTP 請求逾時（以秒為單位），包括連線、標頭、主體和總請求中止處理。
    - `models.providers.*.injectNumCtxForOpenAICompat`：對於 Ollama + `openai-completions`，將 `options.num_ctx` 注入請求中（預設：`true`）。
    - `models.providers.*.authHeader`：在需要時，強制在 `Authorization` 標頭中傳輸憑證。
    - `models.providers.*.baseUrl`：上游 API 基礎 URL。
    - `models.providers.*.headers`：用於代理/租戶路由的額外靜態標頭。

  </Accordion>
  <Accordion title="請求傳輸覆寫">
    `models.providers.*.request`：模型提供者 HTTP 請求的傳輸覆寫設定。

    - `request.headers`：額外的標頭（與提供者預設值合併）。數值接受 SecretRef。
    - `request.auth`：驗證策略覆寫。模式：`"provider-default"`（使用提供者內建驗證）、`"authorization-bearer"`（搭配 `token`）、`"header"`（搭配 `headerName`、`value`、可選的 `prefix`）。
    - `request.proxy`：HTTP 代理覆寫。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 環境變數）、`"explicit-proxy"`（搭配 `url`）。這兩種模式都接受可選的 `tls` 子物件。
    - `request.tls`：直接連線的 TLS 覆寫。欄位：`ca`、`cert`、`key`、`passphrase`（皆接受 SecretRef）、`serverName`、`insecureSkipVerify`。
    - `request.allowPrivateNetwork`：當設為 `true` 時，透過提供者 HTTP 擷取防護（操作員為受信任的自託管 OpenAI 相容端點選擇加入），允許在 DNS 解析為私人、CGNAT 或類似範圍時，對 `baseUrl` 進行 HTTPS 存取。除非明確設定為 `false`，否則諸如 `localhost`、`127.0.0.1` 和 `[::1]` 等回環模型提供者串流 URL 會自動允許；LAN、tailnet 和私人 DNS 主機仍需選擇加入。WebSocket 對於標頭/TLS 使用相同的 `request`，但不使用該擷取 SSRF 閘道。預設值為 `false`。

  </Accordion>
  <Accordion title="模型目錄條目">
    - `models.providers.*.models`：明確的提供者模型目錄條目。
    - `models.providers.*.models.*.input`：模型輸入模態。對於僅文字模型使用 `["text"]`，對於原生圖片/視覺模型使用 `["text", "image"]`。僅當選定的模型被標記為支援圖片時，圖片附件才會被注入到代理的輪次中。
    - `models.providers.*.models.*.contextWindow`：原生模型上下文視窗元數據。這會覆蓋該模型的提供者層級 `contextWindow`。
    - `models.providers.*.models.*.contextTokens`：可選的執行時上下文上限。這會覆蓋提供者層級的 `contextTokens`；當您想要一個比模型原生 `contextWindow` 更小的有效上下文預算時使用它；當這兩個值不同時，`openclaw models list` 會顯示這兩個值。
    - `models.providers.*.models.*.compat.supportsDeveloperRole`：可選的相容性提示。對於具有非空非原生 `baseUrl`（主機不是 `api.openai.com`）的 `api: "openai-completions"`，OpenClaw 會在執行時強制將其設為 `false`。空/省略的 `baseUrl` 將保持預設的 OpenAI 行為。
    - `models.providers.*.models.*.compat.requiresStringContent`：針對僅字串 OpenAI 相容聊天端點的可選相容性提示。當 `true` 時，OpenClaw 會在發送請求之前將純文字 `messages[].content` 陣列扁平化為純字串。
    - `models.providers.*.models.*.compat.thinkingFormat`：可選的思考 payload 提示。對於頂層 `enable_thinking` 使用 `"qwen"`，或對於支援請求層級 chat-template kwargs 的 Qwen 系列 OpenAI 相容伺服器（如 vLLM）上的 `chat_template_kwargs.enable_thinking` 使用 `"qwen-chat-template"`。

  </Accordion>
  <Accordion title="Amazon Bedrock 探索">
    - `plugins.entries.amazon-bedrock.config.discovery`：Bedrock 自動探索設定根目錄。
    - `plugins.entries.amazon-bedrock.config.discovery.enabled`：開啟或關閉隱式探索。
    - `plugins.entries.amazon-bedrock.config.discovery.region`：用於探索的 AWS 區域。
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter`：用於針對性探索的可選供應商 ID 篩選器。
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`：探索重新整理的輪詢間隔。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`：已探索模型的後備情境視窗。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`：已探索模型的後備最大輸出 Token 數。

  </Accordion>
</AccordionGroup>

互動式自訂供應商上架會推斷常見視覺模型 ID (例如 GPT-4o、Claude、Gemini、Qwen-VL、LLaVA、Pixtral、InternVL、Mllama、MiniCPM-V 和 GLM-4V) 的圖片輸入，並針對已知僅文字系列跳過額外問題。未知的模型 ID 仍會提示圖片支援。非互動式上架使用相同的推斷；傳遞 `--custom-image-input` 以強制啟用圖片功能的元數據，或傳遞 `--custom-text-input` 以強制僅文字的元數據。

### 供應商範例

<AccordionGroup>
  <Accordion title="Cerebras (GLM 4.7 / GPT OSS)">
    內建的 `cerebras` 供應商外掛程式可以透過 `openclaw onboard --auth-choice cerebras-api-key` 來設定此項。僅在覆寫預設值時使用明確的供應商設定。

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

    Anthropic 相容的內建供應商。捷徑：`openclaw onboard --auth-choice kimi-code-api-key`。

  </Accordion>
  <Accordion title="本機模型 (LM Studio)">
    請參閱 [本機模型](/zh-Hant/gateway/local-models)。簡單來說：在強大的硬體上透過 LM Studio Responses API 執行大型本機模型；保留託管模型的合併以作為後援。
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

    設定 `MINIMAX_API_KEY`。快捷方式：`openclaw onboard --auth-choice minimax-global-api` 或 `openclaw onboard --auth-choice minimax-cn-api`。模型目錄預設僅包含 M2.7。在 Anthropic 相容的串流路徑上，除非您明確設定 `thinking`，否則 OpenClaw 預設會停用 MiniMax 思考。`/fast on` 或 `params.fastMode: true` 會將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。

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

    若使用中國端點：`baseUrl: "https://api.moonshot.cn/v1"` 或 `openclaw onboard --auth-choice moonshot-api-key-cn`。

    原生 Moonshot 端點會在共享的 `openai-completions` 傳輸上宣佈串流使用相容性，且 OpenClaw 金鑰會關閉端點功能，而非僅關閉內建供應商 ID。

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

    設定 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`)。針對 Zen 目錄使用 `opencode/...` refs，或針對 Go 目錄使用 `opencode-go/...` refs。快捷方式：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

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

    Base URL 應省略 `/v1` (Anthropic 客戶端會附加它)。快捷方式：`openclaw onboard --auth-choice synthetic-api-key`。

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
    - 編碼端點（預設）：`https://api.z.ai/api/coding/paas/v4`
    - 對於通用端點，請使用基礎 URL 覆寫來定義自訂提供者。

  </Accordion>
</AccordionGroup>

---

## 相關

- [Configuration — agents](/zh-Hant/gateway/config-agents)
- [Configuration — channels](/zh-Hant/gateway/config-channels)
- [Configuration reference](/zh-Hant/gateway/configuration-reference) — 其他頂層金鑰
- [Tools and plugins](/zh-Hant/tools)
