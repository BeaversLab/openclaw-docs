---
summary: "OpenClaw 的代理工具介面（瀏覽器、畫布、節點、訊息、cron），取代舊版 `openclaw-*` 技能"
read_when:
  - Adding or modifying agent tools
  - Retiring or changing `openclaw-*` skills
title: "工具"
---

# 工具 (OpenClaw)

OpenClaw 為瀏覽器、畫布、節點和 cron 提供了**一等公民的代理工具**。
這些取代了舊的 `openclaw-*` 技能：這些工具具備類型，無需外層命令執行，
且代理應直接依賴它們。

## 停用工具

您可以透過 `tools.allow` / `tools.deny` 在 `openclaw.json` 中全域允許/拒絕工具
（拒絕優先）。這可以防止不允許的工具被傳送到模型提供者。

```json5
{
  tools: { deny: ["browser"] },
}
```

備註：

- 比對不區分大小寫。
- 支援 `*` 萬用字元（`"*"` 表示所有工具）。
- 如果 `tools.allow` 僅參考未知或未載入的外掛工具名稱，OpenClaw 會記錄警告並忽略允許清單，以便核心工具保持可用。

## 工具設定檔 (基本允許清單)

`tools.profile` 在 `tools.allow`/`tools.deny` 之前設定**基本工具允許清單**。
各代理覆寫：`agents.list[].tools.profile`。

設定檔：

- `minimal`：僅 `session_status`
- `coding`：`group:fs`、`group:runtime`、`group:sessions`、`group:memory`、`image`
- `messaging`：`group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`
- `full`：無限制（與未設定相同）

範例（預設僅限訊息傳遞，但也允許 Slack + Discord 工具）：

```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"],
  },
}
```

範例（編碼設定檔，但在所有地方拒絕 exec/process）：

```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"],
  },
}
```

範例（全域編碼設定檔，僅限訊息傳遞的支援代理）：

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

## 提供者特定的工具原則

使用 `tools.byProvider` 針對特定供應商（或單一 `provider/model`）**進一步限制**工具，而無需變更您的全域預設值。
每個 Agent 的覆寫：`agents.list[].tools.byProvider`。

這會在基礎工具設定檔**之後**以及在允許/拒絕清單**之前**套用，因此它只能縮減工具集。
供應商金鑰接受 `provider`（例如 `google-antigravity`）或
`provider/model`（例如 `openai/gpt-5.2`）。

範例（保留全域編碼設定檔，但為 Google Antigravity 提供最精簡的工具）：

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

工具原則（全域、Agent、沙箱）支援 `group:*` 項目，這些項目會擴展為多個工具。
請在 `tools.allow` / `tools.deny` 中使用。

可用的群組：

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:web`：`web_search`、`web_fetch`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:openclaw`：所有內建 OpenClaw 工具（不包括供應商外掛程式）

範例（僅允許檔案工具 + 瀏覽器）：

```json5
{
  tools: {
    allow: ["group:fs", "browser"],
  },
}
```

## 外掛程式 + 工具

外掛程式可以在核心集之外註冊**額外工具**（以及 CLI 指令）。
請參閱[外掛程式](/zh-Hant/tools/plugin)以了解安裝與配置，並參閱[技能](/zh-Hant/tools/skills)以了解
工具使用指引如何被注入到提示詞中。某些外掛程式會隨工具附帶其自身的技能
（例如，語音通話外掛程式）。

選用外掛程式工具：

- [Lobster](/zh-Hant/tools/lobster)：具備可恢復核准的型別化工作流程執行期（需要在 gateway 主機上安裝 Lobster CLI）。
- [LLM Task](/zh-Hant/tools/llm-task)：用於結構化工作流程輸出的純 JSON LLM 步驟（可選的 Schema 驗證）。
- [Diffs](/zh-Hant/tools/diffs)：唯讀差異檢視器和 PNG 或 PDF 檔案渲染器，用於顯示前後文字或統一補丁。

## 工具清單

### `apply_patch`

對一或多個檔案套用結構化補丁。用於多區塊編輯。
實驗性功能：透過 `tools.exec.applyPatch.enabled` 啟用（僅限 OpenAI 模型）。
`tools.exec.applyPatch.workspaceOnly` 預設為 `true`（包含於工作區內）。僅當您有意讓 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設定為 `false`。

### `exec`

在工作區中執行 Shell 指令。

核心參數：

- `command`（必要）
- `yieldMs`（逾時後自動背景執行，預設為 10000）
- `background`（立即背景執行）
- `timeout`（秒數；若超過則終止程序，預設為 1800）
- `elevated`（布林值；如果啟用/允許提昇模式，則在主機上執行；僅在代理程式處於沙箱模式時會變更行為）
- `host` (`sandbox | gateway | node`)
- `security` (`deny | allowlist | full`)
- `ask` (`off | on-miss | always`)
- `node` (`host=node` 的節點 ID/名稱)
- 需要真實的 TTY？請設定 `pty: true`。

備註：

- 背景執行時，會傳回帶有 `sessionId` 的 `status: "running"`。
- 使用 `process` 來輪詢/記錄/寫入/終止/清除背景工作階段。
- 如果 `process` 被禁止，`exec` 會同步執行並忽略 `yieldMs`/`background`。
- `elevated` 受 `tools.elevated` 加上任何 `agents.list[].tools.elevated` 覆寫（兩者都必須允許）的限制，並且是 `host=gateway` + `security=full` 的別名。
- `elevated` 僅在代理程式被沙箱化時才會改變行為（否則它是不執行任何操作）。
- `host=node` 可以指定 macOS 伴隨應用程式或無頭節點主機 (`openclaw node run`)。
- gateway/node 審核與允許清單：[Exec approvals](/zh-Hant/tools/exec-approvals)。

### `process`

管理背景執行工作階段。

核心操作：

- `list`、`poll`、`log`、`write`、`kill`、`clear`、`remove`

備註：

- `poll` 在完成時會傳回新的輸出和退出狀態。
- `log` 支援基於行的 `offset`/`limit`（省略 `offset` 以抓取最後 N 行）。
- `process` 的範圍是每個代理程式；來自其他代理程式的工作階段是不可見的。

### `loop-detection` (tool-call loop guardrails)

OpenClaw 會追蹤最近的工具呼叫歷史記錄，並在偵測到重複且無進展的迴圈時進行封鎖或發出警告。
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

- `genericRepeat`：重複相同的工具 + 相同的參數呼叫模式。
- `knownPollNoProgress`：重複具有相同輸出的輪詢類工具。
- `pingPong`：交替 `A/B/A/B` 無進展模式。
- 每個代理程式的覆寫：`agents.list[].tools.loopDetection`。

### `web_search`

使用 Brave、Firecrawl、Gemini、Grok、Kimi、Perplexity 或 Tavily 搜尋網路。

核心參數：

- `query` (必填)
- `count` (1–10；預設值來自 `tools.web.search.maxResults`)

備註：

- 需要所選供應商的 API 金鑰 (建議：`openclaw configure --section web`)。
- 透過 `tools.web.search.enabled` 啟用。
- 回應會被快取 (預設 15 分鐘)。
- 請參閱 [網路工具](/zh-Hant/tools/web) 以進行設定。

### `web_fetch`

從 URL 擷取並提取可讀內容 (HTML → markdown/text)。

核心參數：

- `url` (必填)
- `extractMode` (`markdown` | `text`)
- `maxChars` (截斷長頁面)

備註：

- 透過 `tools.web.fetch.enabled` 啟用。
- `maxChars` 會受 `tools.web.fetch.maxCharsCap` 限制 (預設 50000)。
- 回應會被快取 (預設 15 分鐘)。
- 對於重度依賴 JS 的網站，建議優先使用瀏覽器工具。
- 請參閱 [網路工具](/zh-Hant/tools/web) 以進行設定。
- 請參閱 [Firecrawl](/zh-Hant/tools/firecrawl) 以了解可選的反機器人備援機制。

### `browser`

控制專屬的 OpenClaw 管理瀏覽器。

核心動作：

- `status`, `start`, `stop`, `tabs`, `open`, `focus`, `close`
- `snapshot` (aria/ai)
- `screenshot` (傳回圖像區塊 + `MEDIA:<path>`)
- `act` (UI 動作：click/type/press/hover/drag/select/fill/resize/wait/evaluate)
- `navigate`, `console`, `pdf`, `upload`, `dialog`

個人資料管理：

- `profiles` — 列出所有瀏覽器個人資料及其狀態
- `create-profile` — 使用自動分配的連接埠建立新個人資料 (或 `cdpUrl`)
- `delete-profile` — 停止瀏覽器，刪除用戶數據，從配置中移除（僅限本地）
- `reset-profile` — 殺死配置文件端口上的孤立進程（僅限本地）

通用參數：

- `profile`（可選；默認為 `browser.defaultProfile`）
- `target`（`sandbox` | `host` | `node`）
- `node`（可選；選擇特定的節點 id/name）
  註意：
- 需要 `browser.enabled=true`（默認為 `true`；設置 `false` 以禁用）。
- 所有動作均接受可選的 `profile` 參數以支持多實例。
- 省略 `profile` 以使用安全默認值：隔離的 OpenClaw 管理瀏覽器（`openclaw`）。
- 當現有的登錄/Cookie 很重要並且用戶在場點擊/批准任何附加提示時，使用 `profile="user"` 針對真實的本地主機瀏覽器。
- `profile="user"` 僅限主機；不要將其與沙盒/節點目標結合使用。
- 當省略 `profile` 時，使用 `browser.defaultProfile`（默認為 `openclaw`）。
- 配置文件名稱：僅限小寫字母數字和連字符（最多 64 個字符）。
- 端口範圍：18800-18899（最多約 100 個配置文件）。
- 遠程配置文件僅限附加（無開始/停止/重置）。
- 如果連接了具備瀏覽器功能的節點，工具可能會自動路由到該節點（除非您固定 `target`）。
- 當安裝了 Playwright 時，`snapshot` 默認為 `ai`；使用 `aria` 獲取無障礙樹。
- `snapshot` 還支持角色快照選項（`interactive`、`compact`、`depth`、`selector`），這些選項返回的引用類似於 `e12`。
- `act` 需要來自 `snapshot` 的 `ref`（來自 AI 快照的數值 `12`，或來自角色快照的 `e12`）；若需罕見的 CSS 選擇器請使用 `evaluate`。
- 預設情況下請避免 `act` → `wait`；僅在例外情況下（沒有可靠的 UI 狀態可供等待）使用。
- `upload` 可以選擇傳遞 `ref` 以在準備後自動點擊。
- `upload` 也支援 `inputRef` (aria ref) 或 `element` (CSS selector) 來直接設定 `<input type="file">`。

### `canvas`

驅動節點 Canvas (present, eval, snapshot, A2UI)。

核心動作：

- `present`、`hide`、`navigate`、`eval`
- `snapshot`（傳回圖像區塊 + `MEDIA:<path>`）
- `a2ui_push`、`a2ui_reset`

備註：

- 底層使用閘道 `node.invoke`。
- 如果未提供 `node`，工具會選擇預設值（單一連線節點或本機 mac 節點）。
- A2UI 僅支援 v0.8（無 `createSurface`）；CLI 會因行錯誤拒絕 v0.9 JSONL。
- 快速測試：`openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"`。

### `nodes`

發現並目標配對節點；發送通知；擷取相機/螢幕畫面。

核心動作：

- `status`、`describe`
- `pending`、`approve`、`reject`（配對）
- `notify` (macOS `system.notify`)
- `run` (macOS `system.run`)
- `camera_list`、`camera_snap`、`camera_clip`、`screen_record`
- `location_get`, `notifications_list`, `notifications_action`
- `device_status`, `device_info`, `device_permissions`, `device_health`

備註：

- 相機/螢幕指令需要將 node 應用程式帶至前景。
- 圖片會傳回圖片區塊 + `MEDIA:<path>`。
- 影片會傳回 `FILE:<path>` (mp4)。
- Location 會傳回 JSON 資料 (lat/lon/accuracy/timestamp)。
- `run` 參數：`command` argv 陣列；可選 `cwd`, `env` (`KEY=VAL`), `commandTimeoutMs`, `invokeTimeoutMs`, `needsScreenRecording`。

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

使用設定的圖片模型分析圖片。

核心參數：

- `image` (必要路徑或 URL)
- `prompt` (可選；預設為 "Describe the image.")
- `model` (可選覆寫)
- `maxBytesMb` (可選大小上限)

備註：

- 僅在設定 `agents.defaults.imageModel` (主要或後備) 時可用，或是可從您的預設模型 + 設定的驗證資訊推斷出隱含圖片模型 (盡力配對) 時。
- 直接使用圖片模型 (獨立於主要聊天模型)。

### `image_generate`

使用設定或推斷的圖片生成模型產生一或多張圖片。

核心參數：

- `action` (可選：`generate` 或 `list`；預設 `generate`)
- `prompt` (必要)
- `image` 或 `images` (可選編輯模式的參考圖片路徑/URL)
- `model` (可選提供者/模型覆寫)
- `size` (可選大小提示)
- `resolution` (可選 `1K|2K|4K` 提示)
- `count`（可選，`1-4`，預設 `1`）

注意：

- 當配置了 `agents.defaults.imageGenerationModel` 時，或當 OpenClaw 可以從您啟用的提供者加上可用的驗證資訊推斷出相容的圖像生成預設值時可用。
- 明確的 `agents.defaults.imageGenerationModel` 仍然優先於任何推斷出的預設值。
- 使用 `action: "list"` 來檢查註冊的提供者、預設模型、支援的模型 ID、尺寸、解析度和編輯支援。
- 返回本機 `MEDIA:<path>` 行，以便頻道可以直接傳遞生成的檔案。
- 直接使用圖像生成模型（獨立於主聊天模型）。
- Google 支援的流程，包括針對原生 Nano Banana 樣式路徑的 `google/gemini-3-pro-image-preview`，支援參考圖像編輯以及明確的 `1K|2K|4K` 解析度提示。
- 當進行編輯並且省略了 `resolution` 時，OpenClaw 會從輸入圖像尺寸推斷草稿/最終解析度。
- 這是舊的 `nano-banana-pro` 技能流程的內建替代品。請使用 `agents.defaults.imageGenerationModel`，而不是 `skills.entries` 來生成庫存圖像。

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

分析一個或多個 PDF 文檔。

有關完整的行為、限制、配置和範例，請參閱 [PDF 工具](/zh-Hant/tools/pdf)。

### `message`

跨 Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/Microsoft Teams 發送訊息和頻道操作。

核心操作：

- `send`（文字 + 可選媒體；Microsoft Teams 也支援用於 Adaptive Cards 的 `card`）
- `poll`（WhatsApp/Discord/Microsoft Teams 投票）
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

- `send` 透過 Gateway 路由 WhatsApp；其他通道直接發送。
- `poll` 對於 WhatsApp 和 Microsoft Teams 使用 Gateway；Discord 投票則直接發送。
- 當訊息工具呼叫綁定到作用中的聊天工作階段時，傳送會限制在該工作階段的目標，以避免跨上下文洩漏。

### `cron`

管理 Gateway cron 工作與喚醒。

核心動作：

- `status`, `list`
- `add`, `update`, `remove`, `run`, `runs`
- `wake` (將系統事件加入佇列 + 可選的即時心跳)

備註：

- `add` 預期一個完整的 cron 工作物件 (與 `cron.add` RPC 具有相同的 schema)。
- `update` 使用 `{ jobId, patch }` (為了相容性，接受 `id`)。

### `gateway`

重新啟動或將更新套用至正在執行的 Gateway 程序 (就地)。

核心動作：

- `restart` (授權 + 發送 `SIGUSR1` 以進行程序內重新啟動；`openclaw gateway` 就地重新啟動)
- `config.schema.lookup` (一次檢查一個設定路徑，而不將完整的 schema 載入到提示詞上下文中)
- `config.get`
- `config.apply` (驗證 + 寫入設定 + 重新啟動 + 喚醒)
- `config.patch` (合併部分更新 + 重新啟動 + 喚醒)
- `update.run` (執行更新 + 重新啟動 + 喚醒)

備註：

- `config.schema.lookup` 預期一個目標設定路徑，例如 `gateway.auth` 或 `agents.list.*.heartbeat`。
- 在定址 `plugins.entries.<id>` 時，路徑可能包含以斜線分隔的外掛 ID，例如 `plugins.entries.pack/one.config`。
- 使用 `delayMs` (預設為 2000) 以避免中斷正在進行的回覆。
- `config.schema` 對內部 Control UI 流程仍然可用，並未透過代理程式 `gateway` 工具公開。
- `restart` 預設為啟用；設定 `commands.restart: false` 以停用它。

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

列出工作階段、檢查對話紀錄，或傳送至另一個工作階段。

核心參數：

- `sessions_list`: `kinds?`, `limit?`, `activeMinutes?`, `messageLimit?` (0 = 無)
- `sessions_history`: `sessionKey` (或 `sessionId`), `limit?`, `includeTools?`
- `sessions_send`: `sessionKey` (或 `sessionId`), `message`, `timeoutSeconds?` (0 = 即發即棄)
- `sessions_spawn`: `task`, `label?`, `runtime?`, `agentId?`, `model?`, `thinking?`, `cwd?`, `runTimeoutSeconds?`, `thread?`, `mode?`, `cleanup?`, `sandbox?`, `streamTo?`, `attachments?`, `attachAs?`
- `session_status`: `sessionKey?` (預設為當前；接受 `sessionId`), `model?` (`default` 清除覆寫)

備註：

- `main` 是標準的直接聊天金鑰；global/unknown 被隱藏。
- `messageLimit > 0` 取得每個會話的最後 N 則訊息（已過濾工具訊息）。
- 會話目標由 `tools.sessions.visibility` 控制（預設 `tree`：目前會話 + 產生的子代理程式會話）。如果您為多個使用者執行共享的代理程式，請考慮設定 `tools.sessions.visibility: "self"` 以防止跨會話瀏覽。
- 當 `timeoutSeconds > 0` 時，`sessions_send` 會等待最終完成。
- 傳遞/公告在完成後發生，並為盡力而為；`status: "ok"` 確認代理程式執行已結束，而非公告已傳遞。
- `sessions_spawn` 支援 `runtime: "subagent" | "acp"` (`subagent` 為預設)。關於 ACP 執行時間行為，請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。
- 對於 ACP 執行時間，`streamTo: "parent"` 將初始執行進度摘要作為系統事件而非直接子項傳遞，路由回請求者會話。
- `sessions_spawn` 啟動子代理程式執行並將公告回覆貼回請求者聊天。
  - 支援單次模式 (`mode: "run"`) 和持久的執行緒繫結模式 (`mode: "session"` 搭配 `thread: true`)。
  - 如果省略了 `thread: true` 和 `mode`，模式預設為 `session`。
  - `mode: "session"` 需要 `thread: true`。
  - 如果省略了 `runTimeoutSeconds`，OpenClaw 會使用設定的 `agents.defaults.subagents.runTimeoutSeconds`；否則逾時預設為 `0`（無逾時）。
  - Discord 執行緒綁定的流程取決於 `session.threadBindings.*` 和 `channels.discord.threadBindings.*`。
  - 回覆格式包含 `Status`、`Result` 和精簡統計。
  - `Result` 是助手完成文字；如果遺失，則使用最新的 `toolResult` 作為後備。
- 手動完成模式會先生成直接發送，並在暫時性失敗時重試並回退到佇列（`status: "ok"` 表示執行完成，而非公告已送達）。
- `sessions_spawn` 僅支援子代理執行時期的內嵌檔案附件（ACP 會拒絕它們）。每個附件具有 `name`、`content` 以及可選的 `encoding`（`utf8` 或 `base64`）和 `mimeType`。檔案會實作於子工作區的 `.openclaw/attachments/<uuid>/` 中，並附帶一個 `.manifest.json` 元資料檔案。該工具會傳回包含 `count`、`totalBytes`、每個檔案的 `sha256` 以及 `relDir` 的收據。附件內容會在文字記錄保存時自動編修。
  - 透過 `tools.sessions_spawn.attachments` 設定限制（`enabled`、`maxTotalBytes`、`maxFiles`、`maxFileBytes`、`retainOnSessionKeep`）。
  - `attachAs.mountPath` 是為未來掛載實作保留的提示。
- `sessions_spawn` 是非阻塞的，並立即傳回 `status: "accepted"`。
- ACP `streamTo: "parent"` 回應可能包含 `streamLogPath`（工作階段範圍的 `*.acp-stream.jsonl`），用於追蹤進度歷史。
- `sessions_send` 執行回覆乒乓（reply `REPLY_SKIP` 以停止；透過 `session.agentToAgent.maxPingPongTurns` 設定最大輪次，0–5）。
- 在乒乓之後，目標代理程式會執行 **公告步驟**；回覆 `ANNOUNCE_SKIP` 以抑制公告。
- 沙箱限制：當目前工作階段處於沙箱中且 `agents.defaults.sandbox.sessionToolsVisibility: "spawned"` 時，OpenClaw 會將 `tools.sessions.visibility` 限制為 `tree`。

### `agents_list`

列出目前工作階段可以 `sessions_spawn` 的目標代理程式 ID。

備註：

- 結果受限於各代理程式的允許清單 (`agents.list[].subagents.allowAgents`)。
- 當設定 `["*"]` 時，該工具會包含所有已設定的代理程式並標記 `allowAny: true`。

## 參數（通用）

Gateway 支援的工具 (`canvas`, `nodes`, `cron`)：

- `gatewayUrl`（預設為 `ws://127.0.0.1:18789`）
- `gatewayToken`（如果啟用驗證）
- `timeoutMs`

注意：當設定 `gatewayUrl` 時，必須明確包含 `gatewayToken`。工具不會繼承設定或環境的覆寫憑證，缺少明確憑證會導致錯誤。

瀏覽器工具：

- `profile`（選用；預設為 `browser.defaultProfile`）
- `target` (`sandbox` | `host` | `node`)
- `node`（選用；指定特定的節點 ID/名稱）
- 疑難排解指南：
  - Linux 啟動/CDP 問題：[瀏覽器疑難排解 (Linux)](/zh-Hant/tools/browser-linux-troubleshooting)
  - WSL2 Gateway + Windows 遠端 Chrome CDP：[WSL2 + Windows + 遠端 Chrome CDP 疑難排解](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

## 推薦的代理程式流程

瀏覽器自動化：

1. `browser` → `status` / `start`
2. `snapshot` (ai 或 aria)
3. `act` (點擊/輸入/按下)
4. 如果您需要視覺確認，請使用 `screenshot`

Canvas 渲染：

1. `canvas` → `present`
2. `a2ui_push` (選用)
3. `snapshot`

節點鎖定：

1. `nodes` → `status`
2. 在選定的節點上執行 `describe`
3. `notify` / `run` / `camera_snap` / `screen_record`

## 安全性

- 避免直接使用 `system.run`；僅在獲得使用者明確同意的情況下使用 `nodes` → `run`。
- 尊重使用者對於相機/螢幕擷取的同意。
- 使用 `status/describe` 在呼叫媒體指令前確保權限。

## 工具如何呈現給代理程式

工具透過兩個並行通道公開：

1. **系統提示文字**：人類可讀取的列表 + 指引。
2. **工具架構**：傳送至模型 API 的結構化函式定義。

這意味著代理程式既可以看到「有哪些工具」，也可以看到「如何呼叫它們」。如果工具未出現在系統提示或架構中，模型就無法呼叫它。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
