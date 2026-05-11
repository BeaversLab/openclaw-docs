---
summary: "Tools 配置（政策、實驗性切換、供應商支援的工具）及自訂供應商/基礎 URL 設定"
read_when:
  - Configuring `tools.*` policy, allowlists, or experimental features
  - Registering custom providers or overriding base URLs
  - Setting up OpenAI-compatible self-hosted endpoints
title: "設定 — 工具與自訂供應商"
sidebarTitle: "工具與自訂供應商"
---

`tools.*` 設定鍵以及自訂供應商 / 基礎 URL 設定。有關代理人、通道和其他頂層設定鍵，請參閱[設定參考](/zh-Hant/gateway/configuration-reference)。

## 工具

### 工具設定檔

`tools.profile` 在 `tools.allow`/`tools.deny` 之前設定了一個基本允許清單：

<Note>本機入門設定會在未設定時將新的本機設定預設為 `tools.profile: "coding"`（保留現有的明確設定檔）。</Note>

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
| `group:memory`     | `memory_search`、`memory_get`                                                                                           |
| `group:web`        | `web_search`、`x_search`、`web_fetch`                                                                                   |
| `group:ui`         | `browser`、`canvas`                                                                                                     |
| `group:automation` | `cron`、`gateway`                                                                                                       |
| `group:messaging`  | `message`                                                                                                               |
| `group:nodes`      | `nodes`                                                                                                                 |
| `group:agents`     | `agents_list`                                                                                                           |
| `group:media`      | `image`、`image_generate`、`video_generate`、`tts`                                                                      |
| `group:openclaw`   | 所有內建工具（不包含提供者外掛）                                                                                        |

### `tools.allow` / `tools.deny`

全域工具允許/拒絕原則（拒絕優先）。不區分大小寫，支援 `*` 萬用字元。即使關閉 Docker 沙箱也會套用。

```json5
{
  tools: { deny: ["browser", "canvas"] },
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

### `tools.elevated`

控制沙箱外部的提權執行存取：

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

- 各代理的覆寫（`agents.list[].tools.elevated`）僅能進一步限制。
- `/elevated on|off|ask|full` 會依工作階段儲存狀態；內嵌指令則套用於單一訊息。
- 提權 `exec` 會繞過沙箱並使用設定的逸出路徑（預設為 `gateway`，當執行目標為 `node` 時則為 `node`）。

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

工具循環安全檢查**預設為停用**。設定 `enabled: true` 以啟用偵測。設定可在 `tools.loopDetection` 中全域定義，並在 `agents.list[].tools.loopDetection` 中針對各個代理程式進行覆寫。

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
  用於發出警告的重複無進度模式閾值。
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
  對已知輪詢工具（`process.poll`、`command_status` 等）發出警告/封鎖。
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  對交替無進度配對模式發出警告/封鎖。
</ParamField>

<Warning>
如果 `warningThreshold >= criticalThreshold` 或 `criticalThreshold >= globalCircuitBreakerThreshold`，則驗證會失敗。
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

設定傳入媒體理解（圖片/音訊/視訊）：

```json5
{
  tools: {
    media: {
      concurrency: 2,
      asyncCompletion: {
        directSend: false, // opt-in: send finished async music/video directly to the channel
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
    **Provider entry** (`type: "provider"` 或省略)：

    - `provider`：API 供應商 ID（`openai`、`anthropic`、`google`/`gemini`、`groq` 等）
    - `model`：模型 ID 覆蓋
    - `profile` / `preferredProfile`：`auth-profiles.json` 設定檔選擇

    **CLI entry** (`type: "cli"`)：

    - `command`：要執行的可執行檔
    - `args`：樣板參數（支援 `{{MediaPath}}`、`{{Prompt}}`、`{{MaxChars}}` 等；`openclaw doctor --fix` 會將已棄用的 `{input}` 佔位符遷移至 `{{MediaPath}}`）

    **Common fields：**

    - `capabilities`：選用清單（`image`、`audio`、`video`）。預設值：`openai`/`anthropic`/`minimax` → 圖片，`google` → 圖片+音訊+影片，`groq` → 音訊。
    - `prompt`、`maxChars`、`maxBytes`、`timeoutSeconds`、`language`：個別條目覆蓋。
    - 當 Agent 呼叫明確的 `image` 工具時，`tools.media.image.timeoutSeconds` 和對應的圖片模型 `timeoutSeconds` 條目也會套用。
    - 失敗會回退至下一個條目。

    Provider auth 遵循標準順序：`auth-profiles.json` → 環境變數 → `models.providers.*.apiKey`。

    **Async completion fields：**

    - `asyncCompletion.directSend`：當 `true` 時，已完成的非同步 `music_generate` 和 `video_generate` 任務會先嘗試直接通道傳遞。預設值：`false`（舊版 requester-session wake/model-delivery 路徑）。

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

控制哪些工作階段可以成為工作階段工具的目標 (`sessions_list`, `sessions_history`, `sessions_send`)。

預設值：`tree` (當前工作階段 + 由其產生的工作階段，例如子代理程式)。

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
    - `self`: 僅限當前工作階段金鑰。 - `tree`: 當前工作階段 + 由當前工作階段產生的工作階段 (子代理程式)。 - `agent`: 屬於當前代理程式 ID 的任何工作階段 (如果您在同一代理程式 ID 下執行每個發送者的工作階段，可能包含其他使用者)。 - `all`: 任何工作階段。跨代理程式定位仍需 `tools.agentToAgent`。 - 沙箱限制：當當前工作階段處於沙箱狀態且為 `agents.defaults.sandbox.sessionToolsVisibility="spawned"`
    時，即使設為 `tools.sessions.visibility="all"`，可見性也會被強制設為 `tree`。
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
    - 僅 `runtime: "subagent"` 支援附件。ACP 運行時會拒絕它們。
    - 檔案會以 `.manifest.json` 實體化到子工作區的 `.openclaw/attachments/<uuid>/` 中。
    - 附件內容會從對話紀錄的持久化中自動編輯移除。
    - Base64 輸入會透過嚴格的字母/填充檢查和解碼前大小防護進行驗證。
    - 檔案權限方面，目錄為 `0700`，檔案為 `0600`。
    - 清理遵循 `cleanup` 策略：`delete` 總是會移除附件；`keep` 僅在 `retainOnSessionKeep: true` 時會保留它們。
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
- 預設值：`false`，除非針對 OpenAI 或 OpenAI Codex GPT-5 系列的執行，將 `agents.defaults.embeddedPi.executionContract`（或每個代理程式的覆寫設定）設為 `"strict-agentic"`。請設定 `true` 以強制在該範圍之外啟用該工具，或設定 `false` 以確保即使在嚴格代理模式的 GPT-5 執行中也關閉該工具。
- 啟用後，系統提示詞也會加入使用指引，確保模型僅將其用於實質性工作，並且最多保持一個步驟 `in_progress`。

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

- `model`：生成子代理程式的預設模型。如果省略，子代理程式將繼承呼叫者的模型。
- `allowAgents`：當請求代理程式未設定自己的 `subagents.allowAgents` 時，`sessions_spawn` 的目標代理程式 ID 預設允許清單（`["*"]` = 任意；預設值：僅限同一代理程式）。
- `runTimeoutSeconds`：當工具呼叫省略 `runTimeoutSeconds` 時，`sessions_spawn` 的預設逾時時間（秒）。`0` 表示無逾時。
- 各子代理程式的工具政策：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

---

## 自訂提供者與基本 URL

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
    - 使用 `authHeader: true` + `headers` 進行自訂驗證需求。 - 使用 `OPENCLAW_AGENT_DIR` 覆寫 Agent 配置根目錄（或 `PI_CODING_AGENT_DIR`，一個舊版環境變數別名）。 - 符合提供者 ID 的合併優先順序： - 非空的 Agent `models.json` `baseUrl` 值優先。 - 非空的 Agent `apiKey` 值僅在該提供者於當前配置/驗證設定檔 (auth-profile) 語境中非由 SecretRef 管理時優先。 - SecretRef 管理的提供者 `apiKey`
    值會從來源標記 (env refs 為 `ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`) 重新整理，而非持續化已解析的密碼。 - SecretRef 管理的提供者標頭值會從來源標記 (env refs 為 `secretref-env:ENV_VAR_NAME`，file/exec refs 為 `secretref-managed`) 重新整理。 - 空值或遺失的 Agent `apiKey`/`baseUrl` 會退回至配置中的 `models.providers`。 - 符合的模型 `contextWindow`/`maxTokens`
    會使用明確配置與隱含目錄值之間較高的值。 - 符合的模型 `contextTokens` 會在存在時保留明確的執行時間上限；使用它來限制有效上下文，而不變更原生模型元資料。 - 當您希望配置完全重寫 `models.json` 時，請使用 `models.mode: "replace"`。 - 標記持續性是以來源為授權：標記是從作用中的來源配置快照 (解析前) 寫入，而非從已解析的執行時間密碼值。
  </Accordion>
</AccordionGroup>

### 提供者欄位詳細資訊

<AccordionGroup>
  <Accordion title="頂層目錄">
    - `models.mode`: 提供者目錄行為（`merge` 或 `replace`）。
    - `models.providers`: 依提供者 id 索引的自訂提供者對應。
      - 安全編輯：使用 `openclaw config set models.providers.<id> '<json>' --strict-json --merge` 或 `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` 進行加法更新。`config set` 會拒絕破壞性替換，除非您傳遞 `--replace`。
  </Accordion>
  <Accordion title="提供者連線與驗證">
    - `models.providers.*.api`：請求配接器 (`openai-completions`、`openai-responses`、`anthropic-messages`、`google-generative-ai` 等)。對於自託管的 `/v1/chat/completions` 後端（例如 MLX、vLLM、SGLang 以及大多數 OpenAI 相容的本地伺服器），請使用 `openai-completions`。具有 `baseUrl` 但沒有 `api` 的自訂提供者預設為 `openai-completions`；僅當後端支援 `/v1/responses` 時才設定 `openai-responses`。
    - `models.providers.*.apiKey`：提供者憑證（建議使用 SecretRef/env 置換）。
    - `models.providers.*.auth`：驗證策略 (`api-key`、`token`、`oauth`、`aws-sdk`)。
    - `models.providers.*.contextWindow`：當模型條目未設定 `contextWindow` 時，此提供者下模型的預設原生上下文視窗。
    - `models.providers.*.contextTokens`：當模型條目未設定 `contextTokens` 時，此提供者下模型的預設有效執行時期上下文上限。
    - `models.providers.*.maxTokens`：當模型條目未設定 `maxTokens` 時，此提供者下模型的預設輸出 token 上限。
    - `models.providers.*.timeoutSeconds`：可選的針對每個提供者模型的 HTTP 請求逾時時間（秒），包括連線、標頭、主體和總請求中止處理。
    - `models.providers.*.injectNumCtxForOpenAICompat`：針對 Ollama + `openai-completions`，將 `options.num_ctx` 注入請求中（預設：`true`）。
    - `models.providers.*.authHeader`：在需要時，強制在 `Authorization` 標頭中傳輸憑證。
    - `models.providers.*.baseUrl`：上游 API 基礎 URL。
    - `models.providers.*.headers`：用於代理/租戶路由的額外靜態標頭。
  </Accordion>
  <Accordion title="Request transport overrides">
    `models.providers.*.request`：模型提供者 HTTP 請求的傳輸覆寫設定。

    - `request.headers`：額外的標頭（與提供者預設值合併）。數值接受 SecretRef。
    - `request.auth`：認證策略覆寫。模式：`"provider-default"`（使用提供者內建的認證）、`"authorization-bearer"`（搭配 `token`）、`"header"`（搭配 `headerName`、`value`、選用的 `prefix`）。
    - `request.proxy`：HTTP 代理覆寫。模式：`"env-proxy"`（使用 `HTTP_PROXY`/`HTTPS_PROXY` 環境變數）、`"explicit-proxy"`（搭配 `url`）。這兩種模式都接受選用的 `tls` 子物件。
    - `request.tls`：直接連線的 TLS 覆寫。欄位：`ca`、`cert`、`key`、`passphrase`（皆接受 SecretRef）、`serverName`、`insecureSkipVerify`。
    - `request.allowPrivateNetwork`：當 `true` 時，透過提供者 HTTP 抓取防護機制（操作員選擇加入以信任自託管的 OpenAI 相容端點），允許在 DNS 解析為私有、CGNAT 或類似範圍時，對 `baseUrl` 進行 HTTPS 連線。迴路模型提供者串流 URL（例如 `localhost`、`127.0.0.1` 和 `[::1]`）會自動被允許，除非明確設定為 `false`；LAN、tailnet 和私有 DNS 主機仍需要選擇加入。WebSocket 對標頭/TLS 使用相同的 `request`，但不使用該抓取 SSRF 閘道。預設值為 `false`。

  </Accordion>
  <Accordion title="模型目錄條目">
    - `models.providers.*.models`：明確的提供者模型目錄條目。
    - `models.providers.*.models.*.contextWindow`：原生模型上下文視窗元數據。這會覆蓋該模型層級的提供者 `contextWindow`。
    - `models.providers.*.models.*.contextTokens`：可選的執行時上下文上限。這會覆蓋提供者層級的 `contextTokens`；當您想要比模型原生 `contextWindow` 更小的有效上下文預算時使用它；當這兩個值不同時，`openclaw models list` 會顯示這兩個值。
    - `models.providers.*.models.*.compat.supportsDeveloperRole`：可選的相容性提示。對於具有非空且非原生 `baseUrl`（主機不是 `api.openai.com`）的 `api: "openai-completions"`，OpenClaw 會在執行時將其強制設為 `false`。空/省略的 `baseUrl` 將保留預設的 OpenAI 行為。
    - `models.providers.*.models.*.compat.requiresStringContent`：僅適用於字串的 OpenAI 相容聊天端點的可選相容性提示。當 `true` 時，OpenClaw 會在發送請求之前將純文字 `messages[].content` 陣列扁平化為純字串。
  </Accordion>
  <Accordion title="Amazon Bedrock 探索">
    - `plugins.entries.amazon-bedrock.config.discovery`：Bedrock 自動探索設定根目錄。
    - `plugins.entries.amazon-bedrock.config.discovery.enabled`：開啟/關閉隱式探索。
    - `plugins.entries.amazon-bedrock.config.discovery.region`：用於探索的 AWS 區域。
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter`：用於定向探索的可選提供者 ID 過濾器。
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval`：探索重新整理的輪詢間隔。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow`：已探索模型的後備上下文視窗。
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens`：已探索模型的後備最大輸出 token 數。
  </Accordion>
</AccordionGroup>

### 提供者範例

<AccordionGroup>
  <Accordion title="Cerebras (GLM 4.7 / GPT OSS)">
    內建的 `cerebras` 提供者外掛程式可以透過 `openclaw onboard --auth-choice cerebras-api-key` 來設定此項。僅在覆寫預設值時使用明確的提供者設定。

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
          model: { primary: "kimi/kimi-code" },
          models: { "kimi/kimi-code": { alias: "Kimi Code" } },
        },
      },
    }
    ```

    相容 Anthropic 的內建提供者。捷徑：`openclaw onboard --auth-choice kimi-code-api-key`。

  </Accordion>
  <Accordion title="Local models (LM Studio)">
    參閱 [Local Models](/zh-Hant/gateway/local-models)。TL;DR：在硬體性能足夠的機器上透過 LM Studio Responses API 執行大型本地模型；保留合併的託管模型以作為後備。
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

    設定 `MINIMAX_API_KEY`。捷徑：`openclaw onboard --auth-choice minimax-global-api` 或 `openclaw onboard --auth-choice minimax-cn-api`。模型目錄預設僅包含 M2.7。在相容 Anthropic 的串流路徑上，除非您明確設定 `thinking`，否則 OpenClaw 預設會停用 MiniMax 思考功能。`/fast on` 或 `params.fastMode: true` 會將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。

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

    原生 Moonshot 端點在共享的 `openai-completions` 傳輸上宣稱串流使用相容性，且 OpenClaw 金鑰會依據端點功能，而非僅依據內建提供者 id 來辨識。

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

    設定 `OPENCODE_API_KEY` (或 `OPENCODE_ZEN_API_KEY`)。對於 Zen 目錄使用 `opencode/...` 引用，對於 Go 目錄使用 `opencode-go/...` 引用。捷徑：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

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
    - 編碼端點 (預設)：`https://api.z.ai/api/coding/paas/v4`
    - 對於通用端點，請使用覆寫 base URL 的自訂提供商。

  </Accordion>
</AccordionGroup>

---

## 相關

- [Configuration — agents](/zh-Hant/gateway/config-agents)
- [Configuration — channels](/zh-Hant/gateway/config-channels)
- [Configuration reference](/zh-Hant/gateway/configuration-reference) — 其他頂層金鑰
- [Tools and plugins](/zh-Hant/tools)
