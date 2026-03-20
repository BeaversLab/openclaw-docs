---
summary: "OpenClaw 的代理工具介面 (browser, canvas, nodes, message, cron)，取代舊版 `openclaw-*` 技能"
read_when:
  - 新增或修改代理工具
  - 停用或變更 `openclaw-*` 技能
title: "Tools"
---

# 工具

OpenClaw 提供用於 browser、canvas、nodes 與 cron 的**一級代理工具**。
這些工具取代了舊的 `openclaw-*` 技能：這些工具具備類型、無需 shelling，
且代理應直接依賴它們。

## 停用工具

您可以透過 `tools.allow` / `tools.deny` 在 `openclaw.json` 中全域允許/拒絕工具
(拒絕優先)。這可防止不允許的工具被傳送至模型供應商。

```json5
{
  tools: { deny: ["browser"] },
}
```

備註：

- 比對不區分大小寫。
- 支援 `*` 萬用字元 (`"*"` 表示所有工具)。
- 若 `tools.allow` 僅參照未知或未載入的外掛工具名稱，OpenClaw 將記錄警告並忽略允許清單，使核心工具保持可用。

## 工具設定檔 (基底允許清單)

`tools.profile` 在 `tools.allow`/`tools.deny` 之前設定**基底工具允許清單**。
個別代理覆寫：`agents.list[].tools.profile`。

設定檔：

- `minimal`：僅限 `session_status`
- `coding`：`group:fs`、`group:runtime`、`group:sessions`、`group:memory`、`image`
- `messaging`：`group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`
- `full`：無限制 (與未設定相同)

範例 (預設僅限訊息傳送，同時也允許 Slack + Discord 工具)：

```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"],
  },
}
```

範例 (coding 設定檔，但到處拒絕 exec/process)：

```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"],
  },
}
```

範例 (全域 coding 設定檔，僅限訊息傳送的支援代理)：

```json5
{
  tools: { profile: "coding" },
  agents: {
    list: [
      {
        id: "support",
        tools: { profile: "messaging", allow: ["slack"] },
      },
    ],
  },
}
```

## 供應商特定工具政策

使用 `tools.byProvider` 針對特定供應商**進一步限制**工具
（或單一 `provider/model`），而無需更改您的全域預設值。
每個 Agent 的覆寫設定：`agents.list[].tools.byProvider`。

這會在基礎工具設定檔**之後**以及允許/拒絕清單**之前**套用，
因此它只能縮小工具集。
供應商金鑰接受 `provider`（例如 `google-antigravity`）或
`provider/model`（例如 `openai/gpt-5.2`）。

範例（保留全域程式設計設定檔，但對 Google Antigravity 使用最少工具）：

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```

範例（針對不穩定端點的供應商/模型特定允許清單）：

```json5
{
  tools: {
    allow: ["group:fs", "group:runtime", "sessions_list"],
    byProvider: {
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

範例（針對單一供應商的特定 Agent 覆寫）：

```json5
{
  agents: {
    list: [
      {
        id: "support",
        tools: {
          byProvider: {
            "google-antigravity": { allow: ["message", "sessions_list"] },
          },
        },
      },
    ],
  },
}
```

## 工具群組（簡寫）

工具原則（全域、agent、沙盒）支援擴展為多個工具的 `group:*` 項目。
請在 `tools.allow` / `tools.deny` 中使用這些項目。

可用群組：

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:web`：`web_search`、`web_fetch`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:openclaw`：所有內建的 OpenClaw 工具（不包括供應商外掛）

範例（僅允許檔案工具 + 瀏覽器）：

```json5
{
  tools: {
    allow: ["group:fs", "browser"],
  },
}
```

## 外掛 + 工具

外掛程式可以在核心集合之外註冊**額外工具**（以及 CLI 指令）。
請參閱 [Plugins](/zh-Hant/tools/plugin) 以了解安裝與設定，並參閱 [Skills](/zh-Hant/tools/skills) 以了解工具使用指引如何注入至提示詞中。某些外掛程式會隨工具附帶其專屬的技能（例如語音通話外掛程式）。

選用外掛程式工具：

- [Lobster](/zh-Hant/tools/lobster)：具備可恢復審核功能的型別化工作流程執行階段（需要閘道主機上安裝 Lobster CLI）。
- [LLM Task](/zh-Hant/tools/llm-task)：用於結構化工作流程輸出的純 JSON LLM 步驟（可選的綱要驗證）。
- [Diffs](/zh-Hant/tools/diffs)：唯讀差異檢視器，以及用於文字前後對比或統一差異的 PNG 或 PDF 檔案轉譯器。

## 工具庫存

### `apply_patch`

對一或多個檔案套用結構化補丁。用於多區塊編輯。
實驗性功能：透過 `tools.exec.applyPatch.enabled` 啟用（僅限 OpenAI 模型）。
`tools.exec.applyPatch.workspaceOnly` 預設為 `true`（工作區限制）。僅當您有意讓 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設定為 `false`。

### `exec`

在工作區中執行 shell 指令。

核心參數：

- `command`（必要）
- `yieldMs`（逾時後自動背景執行，預設為 10000）
- `background`（立即背景執行）
- `timeout`（秒數；若超過則終止程序，預設為 1800）
- `elevated`（布林值；若啟用/允許提權模式則在主機上執行；僅在代理程式位於沙箱中時會改變行為）
- `host` (`sandbox | gateway | node`)
- `security` (`deny | allowlist | full`)
- `ask` (`off | on-miss | always`)
- `node` (`host=node` 的節點 ID/名稱)
- 需要真實的 TTY 嗎？請設定 `pty: true`。

備註：

- 當在背景執行時，回傳帶有 `sessionId` 的 `status: "running"`。
- 使用 `process` 來輪詢/記錄/寫入/終止/清除背景工作階段。
- 如果停用 `process`，`exec` 會同步執行並忽略 `yieldMs`/`background`。
- `elevated` 受 `tools.elevated` 以及任何 `agents.list[].tools.elevated` 覆寫設定的限制（兩者皆須允許），並且是 `host=gateway` + `security=full` 的別名。
- `elevated` 僅在代理程式處於沙盒環境時會改變行為（否則為無操作）。
- `host=node` 可指定 macOS 伴隨程式或無介面節點主機 (`openclaw node run`)。
- gateway/node 核准與允許清單：[Exec 核准](/zh-Hant/tools/exec-approvals)。

### `process`

管理背景執行工作階段。

核心操作：

- `list`, `poll`, `log`, `write`, `kill`, `clear`, `remove`

備註：

- `poll` 會在完成時傳回新的輸出與退出狀態。
- `log` 支援基於行的 `offset`/`limit`（省略 `offset` 以取得最後 N 行）。
- `process` 的範圍以每個代理程式為單位；來自其他代理程式的工作階段為不可見。

### `loop-detection` (工具呼叫迴圈防護機制)

OpenClaw 會追蹤最近的工具呼叫歷史，並在偵測到重複且無進展的迴圈時進行封鎖或發出警告。
使用 `tools.loopDetection.enabled: true` 啟用（預設為 `false`）。

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      historySize: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

- `genericRepeat`：重複相同的工具 + 相同參數的呼叫模式。
- `knownPollNoProgress`：重複輪詢類的工具且輸出相同。
- `pingPong`：交替的 `A/B/A/B` 無進展模式。
- 各代理程式的覆寫設定：`agents.list[].tools.loopDetection`。

### `web_search`

使用 Brave、Firecrawl、Gemini、Grok、Kimi 或 Perplexity 搜尋網路。

核心參數：

- `query`（必需）
- `count`（1–10；預設來自 `tools.web.search.maxResults`）

備註：

- 需要所選提供者的 API 金鑰（建議：`openclaw configure --section web`）。
- 透過 `tools.web.search.enabled` 啟用。
- 回應會被快取（預設 15 分鐘）。
- 請參閱 [Web tools](/zh-Hant/tools/web) 以進行設定。

### `web_fetch`

從 URL 擷取並提取可讀內容（HTML → markdown/text）。

核心參數：

- `url`（必需）
- `extractMode`（`markdown` | `text`）
- `maxChars`（截斷長頁面）

備註：

- 透過 `tools.web.fetch.enabled` 啟用。
- `maxChars` 受 `tools.web.fetch.maxCharsCap` 限制（預設 50000）。
- 回應會被快取（預設 15 分鐘）。
- 對於大量使用 JS 的網站，建議使用瀏覽器工具。
- 請參閱 [Web tools](/zh-Hant/tools/web) 以進行設定。
- 關於選用的反機器人備援方案，請參閱 [Firecrawl](/zh-Hant/tools/firecrawl)。

### `browser`

控制專屬的 OpenClaw 管理瀏覽器。

核心操作：

- `status`、`start`、`stop`、`tabs`、`open`、`focus`、`close`
- `snapshot`（aria/ai）
- `screenshot`（傳回圖像區塊 + `MEDIA:<path>`）
- `act`（UI 操作：click/type/press/hover/drag/select/fill/resize/wait/evaluate）
- `navigate`、`console`、`pdf`、`upload`、`dialog`

設定檔管理：

- `profiles` — 列出所有瀏覽器設定檔及其狀態
- `create-profile` — 建立具有自動分配連接埠的新設定檔（或 `cdpUrl`）
- `delete-profile` — 停止瀏覽器、刪除使用者資料、從設定中移除（僅限本地）
- `reset-profile` — 終止設定檔連接埠上的孤兒程序（僅限本地）

通用參數：

- `profile`（可選；預設為 `browser.defaultProfile`）
- `target`（`sandbox` | `host` | `node`）
- `node`（可選；選擇特定的節點 ID/名稱）
  註記：
- 需要 `browser.enabled=true`（預設為 `true`；設定 `false` 以停用）。
- 所有動作均接受可選的 `profile` 參數以支援多實例。
- 省略 `profile` 以使用安全的預設值：隔離的 OpenClaw 管理瀏覽器（`openclaw`）。
- 當現有的登入/Cookie 很重要且使用者在場可點擊/核准任何附加提示時，請使用 `profile="user"` 作為真實的本地主機瀏覽器。
- `profile="user"` 僅限主機；請勿將其與沙盒/節點目標結合使用。
- 當省略 `profile` 時，使用 `browser.defaultProfile`（預設為 `openclaw`）。
- 設定檔名稱：僅限小寫英數字元與連字號（最多 64 個字元）。
- 連接埠範圍：18800-18899（最多約 100 個設定檔）。
- 遠端設定檔僅限附加（無法啟動/停止/重設）。
- 如果已連接具備瀏覽器功能的節點，工具可能會自動路由至該節點（除非您固定 `target`）。
- `snapshot` 在安裝 Playwright 時預設為 `ai`；請使用 `aria` 取得無障礙樹。
- `snapshot` 也支援角色快照選項（`interactive`、`compact`、`depth`、`selector`），這些選項會傳回如 `e12` 的參照。
- `act` 需要 `snapshot` 中的 `ref`（來自 AI 快照的數值 `12`，或來自角色快照的 `e12`）；如需罕見的 CSS 選擇器需求，請使用 `evaluate`。
- 預設情況下避免使用 `act` → `wait`；僅在例外情況（沒有可靠的 UI 狀態可供等待）下使用。
- `upload` 可以選擇性地傳遞 `ref`，以便在啟動後自動點擊。
- `upload` 也支援 `inputRef` (aria 參照) 或 `element` (CSS 選擇器) 來直接設定 `<input type="file">`。

### `canvas`

驅動節點畫布 (呈現、評估、快照、A2UI)。

核心動作：

- `present`、`hide`、`navigate`、`eval`
- `snapshot` (傳回圖像區塊 + `MEDIA:<path>`)
- `a2ui_push`、`a2ui_reset`

備註：

- 底層使用閘道 `node.invoke`。
- 如果未提供 `node`，工具會選取預設值（單一連接節點或本地 mac 節點）。
- A2UI 僅支援 v0.8（無 `createSurface`）；CLI 會以錯誤行拒絕 v0.9 JSONL。
- 快速測試：`openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"`。

### `nodes`

發現並指定配對的節點；傳送通知；擷取相機/螢幕畫面。

核心動作：

- `status`、`describe`
- `pending`、`approve`、`reject` (配對)
- `notify` (macOS `system.notify`)
- `run` (macOS `system.run`)
- `camera_list`、`camera_snap`、`camera_clip`、`screen_record`
- `location_get`, `notifications_list`, `notifications_action`
- `device_status`, `device_info`, `device_permissions`, `device_health`

備註：

- 相機/螢幕指令需要節點應用程式處於前景。
- 影像返回影像區塊 + `MEDIA:<path>`。
- 影片返回 `FILE:<path>` (mp4)。
- 位置返回 JSON 資料載荷 (lat/lon/accuracy/timestamp)。
- `run` 參數：`command` argv 陣列；選用 `cwd`, `env` (`KEY=VAL`), `commandTimeoutMs`, `invokeTimeoutMs`, `needsScreenRecording`。

範例 (`run`)：

```json
{
  "action": "run",
  "node": "office-mac",
  "command": ["echo", "Hello"],
  "env": ["FOO=bar"],
  "commandTimeoutMs": 12000,
  "invokeTimeoutMs": 45000,
  "needsScreenRecording": false
}
```

### `image`

使用已設定的影像模型分析影像。

核心參數：

- `image` (必要路徑或 URL)
- `prompt` (選用；預設為「Describe the image.")
- `model` (選用覆寫)
- `maxBytesMb` (選用大小上限)

備註：

- 僅在已設定 `agents.defaults.imageModel` (主要或備援) 時可用，或可從您的預設模型 + 已設定的 auth 推斷出隱含的影像模型 (盡力配對)。
- 直接使用影像模型 (獨立於主要聊天模型)。

### `image_generate`

使用已設定或推斷的影像生成模型產生一或多個影像。

核心參數：

- `action` (選用：`generate` 或 `list`；預設 `generate`)
- `prompt` (必要)
- `image` 或 `images` (編輯模式的選用參考影像路徑/URL)
- `model` (選用提供者/模型覆寫)
- `size` (選用大小提示)
- `resolution` (選用 `1K|2K|4K` 提示)
- `count`（選用，`1-4`，預設 `1`）

註記：

- 當已設定 `agents.defaults.imageGenerationModel`，或當 OpenClaw 可根據您啟用的提供者及可用驗證資訊推斷相容的影像生成預設值時可用。
- 明確指定的 `agents.defaults.imageGenerationModel` 優先於任何推斷出的預設值。
- 使用 `action: "list"` 來檢查已註冊的提供者、預設模型、支援的模型 ID、尺寸、解析度及編輯支援。
- 傳回本機 `MEDIA:<path>` 行，以便通道能直接傳送生成的檔案。
- 直接使用影像生成模型（獨立於主聊天模型）。
- Google 支援的流程，包括用於原生 Nano Banana 風格路徑的 `google/gemini-3-pro-image-preview`，支援參考影像編輯以及明確的 `1K|2K|4K` 解析度提示。
- 編輯時若省略 `resolution`，OpenClaw 會根據輸入影像大小推斷草稿/最終解析度。
- 這是舊版 `nano-banana-pro` 技能工作流程的內建替代品。請使用 `agents.defaults.imageGenerationModel`，而非 `skills.entries`，來進行庫存影像生成。

原生範例：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3-pro-image-preview", // native Nano Banana path
        fallbacks: ["fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### `pdf`

分析一或多個 PDF 文件。

如需完整行為、限制、設定及範例，請參閱 [PDF 工具](/zh-Hant/tools/pdf)。

### `message`

跨 Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams 傳送訊息和通道動作。

核心動作：

- `send`（文字 + 選用媒體；MS Teams 亦支援 `card` 以使用 Adaptive Cards）
- `poll`（WhatsApp/Discord/MS Teams 投票）
- `react` / `reactions` / `read` / `edit` / `delete`
- `pin` / `unpin` / `list-pins`
- `permissions`
- `thread-create` / `thread-list` / `thread-reply`
- `search`
- `sticker`
- `member-info` / `role-info`
- `emoji-list` / `emoji-upload` / `sticker-upload`
- `role-add` / `role-remove`
- `channel-info` / `channel-list`
- `voice-status`
- `event-list` / `event-create`
- `timeout` / `kick` / `ban`

備註：

- `send` 透過 Gateway 路由 WhatsApp；其他通道則直連。
- `poll` 對 WhatsApp 和 MS Teams 使用 Gateway；Discord 投票則直連。
- 當訊息工具呼叫綁定到作用中的聊天工作階段時，傳送會限制在該工作階段的目標，以避免跨上下文洩漏。

### `cron`

管理 Gateway cron 排程工作和喚醒。

核心操作：

- `status`, `list`
- `add`, `update`, `remove`, `run`, `runs`
- `wake` (將系統事件加入佇列 + 可選的立即心跳)

備註：

- `add` 期望完整的 cron 工作物件 (schema 與 `cron.add` RPC 相同)。
- `update` 使用 `{ jobId, patch }` (`id` 為相容性而被接受)。

### `gateway`

重新啟動或將更新套用到執行中的 Gateway 程序 (原地)。

核心操作：

- `restart` (授權 + 傳送 `SIGUSR1` 以進行原地重啟；`openclaw gateway` 原地重啟)
- `config.schema.lookup` (一次檢查一個設定路徑，而不將完整 schema 載入到提示詞上下文中)
- `config.get`
- `config.apply` (驗證 + 寫入設定 + 重啟 + 喚醒)
- `config.patch` (合併部分更新 + 重啟 + 喚醒)
- `update.run` (run update + restart + wake)

備註：

- `config.schema.lookup` 預期指定的配置路徑，例如 `gateway.auth` 或 `agents.list.*.heartbeat`。
- 在定址 `plugins.entries.<id>` 時，路徑可能包含以斜線分隔的外掛程式 ID，例如 `plugins.entries.pack/one.config`。
- 使用 `delayMs` (預設為 2000) 以避免中斷進行中的回覆。
- `config.schema` 仍可供內部 Control UI 流程使用，且不透過代理程式 `gateway` 工具公開。
- `restart` 預設為啟用；請設定 `commands.restart: false` 來停用它。

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

列出工作階段、檢查對話紀錄，或傳送至另一個工作階段。

核心參數：

- `sessions_list`：`kinds?`、`limit?`、`activeMinutes?`、`messageLimit?` (0 = 無)
- `sessions_history`：`sessionKey` (或 `sessionId`)、`limit?`、`includeTools?`
- `sessions_send`：`sessionKey` (或 `sessionId`)、`message`、`timeoutSeconds?` (0 = 即發即棄)
- `sessions_spawn`：`task`、`label?`、`runtime?`、`agentId?`、`model?`、`thinking?`、`cwd?`、`runTimeoutSeconds?`、`thread?`、`mode?`、`cleanup?`、`sandbox?`、`streamTo?`、`attachments?`、`attachAs?`
- `session_status`: `sessionKey?` (默認為當前；接受 `sessionId`)，`model?` (`default` 清除覆蓋設置)

備註：

- `main` 是標準的直接聊天金鑰；全域/未知金鑰被隱藏。
- `messageLimit > 0` 獲取每個會話的最後 N 條訊息 (已過濾工具訊息)。
- 會話目標設定由 `tools.sessions.visibility` 控制 (默認 `tree`: 當前會話 + 產生的子代理會話)。如果您為多個用戶運行共享代理，請考慮設定 `tools.sessions.visibility: "self"` 以防止跨會話瀏覽。
- 當 `timeoutSeconds > 0` 時，`sessions_send` 會等待最終完成。
- 傳遞/公告在完成後進行且為盡力而為；`status: "ok"` 確認代理運行已完成，而非公告已傳遞。
- `sessions_spawn` 支持 `runtime: "subagent" | "acp"` (默認 `subagent`)。有關 ACP 運行時行為，請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。
- 對於 ACP 運行時，`streamTo: "parent"` 將初始運行進度摘要作為系統事件路由回請求者會話，而不是直接子項傳遞。
- `sessions_spawn` 啟動子代理運行並將公告回覆發布回請求者聊天。
  - 支援單次模式 (`mode: "run"`) 和持久線程綁定模式 (帶有 `thread: true` 的 `mode: "session"`)。
  - 如果省略 `thread: true` 和 `mode`，模式默認為 `session`。
  - `mode: "session"` 需要 `thread: true`。
  - 如果省略 `runTimeoutSeconds`，OpenClaw 在設定時使用 `agents.defaults.subagents.runTimeoutSeconds`；否則逾時默認為 `0` (無逾時)。
  - Discord 線程綁定流程依賴於 `session.threadBindings.*` 和 `channels.discord.threadBindings.*`。
  - 回覆格式包括 `Status`、`Result` 和簡明統計資料。
  - `Result` 是助理完成文字；如果缺失，則使用最新的 `toolResult` 作為後備。
- 手動完成模式優先直接生成發送，並隊列後備，在暫時性失敗時重試（`status: "ok"` 表示執行完成，而非公告已送達）。
- `sessions_spawn` 僅支援子代理執行時期的內聯檔案附件（ACP 會拒絕它們）。每個附件具有 `name`、`content` 和可選的 `encoding`（`utf8` 或 `base64`）以及 `mimeType`。檔案會在 `.openclaw/attachments/<uuid>/` 處具體化到子工作區，並帶有 `.manifest.json` 元數據檔案。該工具返回一個包含 `count`、`totalBytes`、每個檔案的 `sha256` 和 `relDir` 的收據。附件內容會從轉錄持久性中自動編輯。
  - 透過 `tools.sessions_spawn.attachments` 設定限制（`enabled`、`maxTotalBytes`、`maxFiles`、`maxFileBytes`、`retainOnSessionKeep`）。
  - `attachAs.mountPath` 是為未來掛載實作保留的提示。
- `sessions_spawn` 為非阻塞，並立即返回 `status: "accepted"`。
- ACP `streamTo: "parent"` 回應可能包含 `streamLogPath`（會話範圍的 `*.acp-stream.jsonl`），用於追蹤進度歷史。
- `sessions_send` 執行回覆來回的乒乓（回覆 `REPLY_SKIP` 以停止；最大回合數透過 `session.agentToAgent.maxPingPongTurns`，0–5）。
- 乒乓之後，目標代理執行 **公告步驟**；回覆 `ANNOUNCE_SKIP` 以抑制公告。
- 沙箱限制：當目前工作階段受到沙箱保護且為 `agents.defaults.sandbox.sessionToolsVisibility: "spawned"` 時，OpenClaw 會將 `tools.sessions.visibility` 限制為 `tree`。

### `agents_list`

列出目前工作階段可以使用 `sessions_spawn` 目標的代理程式 ID。

備註：

- 結果受限於各個代理程式的允許清單 (`agents.list[].subagents.allowAgents`)。
- 當設定 `["*"]` 時，該工具會包含所有已設定的代理程式並標記 `allowAny: true`。

## 參數 (通用)

閘道支援的工具 (`canvas`、`nodes`、`cron`)：

- `gatewayUrl` (預設為 `ws://127.0.0.1:18789`)
- `gatewayToken` (若已啟用驗證)
- `timeoutMs`

注意：當設定 `gatewayUrl` 時，必須明確包含 `gatewayToken`。工具不會繼承設定或環境憑證作為覆寫，且缺少明確憑證會導致錯誤。

瀏覽器工具：

- `profile` (選用；預設為 `browser.defaultProfile`)
- `target` (`sandbox` | `host` | `node`)
- `node` (選用；指定特定節點 ID/名稱)
- 疑難排解指南：
  - Linux 啟動/CDP 問題：[瀏覽器疑難排解 (Linux)](/zh-Hant/tools/browser-linux-troubleshooting)
  - WSL2 閘道 + Windows 遠端 Chrome CDP：[WSL2 + Windows + 遠端 Chrome CDP 疑難排解](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

## 建議的代理程式流程

瀏覽器自動化：

1. `browser` → `status` / `start`
2. `snapshot` (ai 或 aria)
3. `act` (點擊/輸入/按下)
4. 如果您需要視覺確認，請使用 `screenshot`

Canvas 算繪：

1. `canvas` → `present`
2. `a2ui_push` (選用)
3. `snapshot`

節點目標：

1. `nodes` → `status`
2. 在選定節點上執行 `describe`
3. `notify` / `run` / `camera_snap` / `screen_record`

## 安全性

- 避免直接 `system.run`；僅在獲得明確用戶同意時才使用 `nodes` → `run`。
- 尊重用戶對於相機/螢幕錄製的同意。
- 使用 `status/describe` 來確保在呼叫媒體指令前已獲得權限。

## 工具如何呈現給代理

工具透過兩個並行管道公開：

1. **系統提示文字**：人類可讀的列表 + 指引。
2. **工具架構**：發送至模型 API 的結構化函數定義。

這意味著代理既能看到「有哪些工具」，也能看到「如何呼叫它們」。如果工具未出現在系統提示或架構中，模型便無法呼叫它。

import en from "/components/footer/en.mdx";

<en />
