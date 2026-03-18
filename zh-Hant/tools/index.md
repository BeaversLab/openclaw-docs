---
summary: "OpenClaw 的代理工具介面（browser、canvas、nodes、message、cron），取代了舊版 `openclaw-*` 技能"
read_when:
  - Adding or modifying agent tools
  - Retiring or changing `openclaw-*` skills
title: "工具"
---

# 工具

OpenClaw 為 browser、canvas、nodes 和 cron 公開了**一級代理工具**。
這些取代了舊的 `openclaw-*` 技能：這些工具具有型別，不需要 shell 操作，
並且代理應該直接依賴它們。

## 停用工具

您可以透過 `openclaw.json` 中的 `tools.allow` / `tools.deny` 全域允許/拒絕工具
（拒絕優先）。這可防止不允許的工具被傳送至模型提供者。

```json5
{
  tools: { deny: ["browser"] },
}
```

備註：

- 比對不區分大小寫。
- 支援 `*` 萬用字元（`"*"` 表示所有工具）。
- 如果 `tools.allow` 僅參考未知或未載入的外掛工具名稱，OpenClaw 會記錄警告並忽略允許清單，以便核心工具保持可用。

## 工具設定檔（基本允許清單）

`tools.profile` 在 `tools.allow`/`tools.deny` 之前設定**基本工具允許清單**。
個別代理覆寫：`agents.list[].tools.profile`。

設定檔：

- `minimal`：僅限 `session_status`
- `coding`：`group:fs`、`group:runtime`、`group:sessions`、`group:memory`、`image`
- `messaging`：`group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`
- `full`：無限制（與未設定相同）

範例（預設僅限訊息傳遞，也允許 Slack + Discord 工具）：

```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"],
  },
}
```

範例（程式碼設定檔，但在任何地方拒絕 exec/process）：

```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"],
  },
}
```

範例（全域程式碼設定檔，僅限訊息傳遞的支援代理）：

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

## 特定提供者的工具原則

使用 `tools.byProvider` 針對特定供應商（或單一 `provider/model`）**進一步限制**工具，而不變更您的全域預設值。
每個 Agent 的覆寫：`agents.list[].tools.byProvider`。

這會在基礎工具設定檔**之後**以及允許/拒絕清單**之前**套用，因此它只能縮小工具範圍。
供應商金鑰接受 `provider`（例如 `google-antigravity`）或
`provider/model`（例如 `openai/gpt-5.2`）。

範例（保留全域程式碼設定檔，但針對 Google Antigravity 使用最小化工具）：

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

## 工具群組（簡稱）

工具原則（全域、Agent、沙盒）支援可擴充為多個工具的 `group:*` 項目。
請在 `tools.allow` / `tools.deny` 中使用這些項目。

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
- `group:openclaw`：所有內建 OpenClaw 工具（不包含供應商外掛程式）

範例（僅允許檔案工具 + 瀏覽器）：

```json5
{
  tools: {
    allow: ["group:fs", "browser"],
  },
}
```

## 外掛程式 + 工具

外掛程式可以註冊核心集合之外的**其他工具**（以及 CLI 指令）。請參閱 [Plugins](/zh-Hant/tools/plugin) 以了解安裝與配置，並參閱 [Skills](/zh-Hant/tools/skills) 以了解如何將工具使用指引注入提示詞中。某些外掛程式會隨工具一併提供其自身的技能（例如，語音通話外掛程式）。

選用的外掛程式工具：

- [Lobster](/zh-Hant/tools/lobster)：具有可恢復批准機制的型別化工作流程執行階段（需要在閘道主機上安裝 Lobster CLI）。
- [LLM Task](/zh-Hant/tools/llm-task)：僅限 JSON 的 LLM 步驟，用於結構化工作流程輸出（選用的架構驗證）。
- [Diffs](/zh-Hant/tools/diffs)：唯讀差異檢視器以及 PNG 或 PDF 檔案渲染器，用於顯示變更前/後的文字或統一差異。

## 工具清單

### `apply_patch`

對一或多個檔案套用結構化差異。用於多區塊編輯。
實驗性功能：透過 `tools.exec.applyPatch.enabled` 啟用（僅限 OpenAI 模型）。
`tools.exec.applyPatch.workspaceOnly` 預設為 `true`（限於工作區內）。僅當您有意讓 `apply_patch` 在工作區目錄之外寫入/刪除時，才將其設為 `false`。

### `exec`

在工作區中執行 shell 指令。

核心參數：

- `command`（必填）
- `yieldMs`（逾時後自動背景執行，預設 10000）
- `background`（立即背景執行）
- `timeout`（秒；若超過則終止程序，預設 1800）
- `elevated`（布林值；如果已啟用/允許提權模式，則在主機上執行；僅在代理程式位於沙箱中時會變更行為）
- `host` (`sandbox | gateway | node`)
- `security` (`deny | allowlist | full`)
- `ask` (`off | on-miss | always`)
- `node` (`host=node` 的節點 ID/名稱)
- 需要真正的 TTY？請設定 `pty: true`。

備註：

- 背景執行時，傳回帶有 `sessionId` 的 `status: "running"`。
- 使用 `process` 來輪詢/記錄/寫入/終止/清除背景工作階段。
- 如果 `process` 被禁止，`exec` 會同步執行並忽略 `yieldMs`/`background`。
- `elevated` 受 `tools.elevated` 加上任何 `agents.list[].tools.elevated` 覆寫（兩者皆須允許）所限制，且是 `host=gateway` + `security=full` 的別名。
- `elevated` 僅在代理程式處於沙箱環境時會改變行為（否則為無操作）。
- `host=node` 可針對 macOS 伴隨應用程式或無介面節點主機 (`openclaw node run`)。
- gateway/node 核准與允許清單：[Exec approvals](/zh-Hant/tools/exec-approvals)。

### `process`

管理背景執行工作階段。

核心操作：

- `list`, `poll`, `log`, `write`, `kill`, `clear`, `remove`

注意事項：

- `poll` 會在完成時回傳新的輸出與結束狀態。
- `log` 支援基於行數的 `offset`/`limit`（省略 `offset` 以抓取最後 N 行）。
- `process` 的範圍是依據代理程式；來自其他代理程式的工作階段不可見。

### `loop-detection` (工具呼叫迴圈防護)

OpenClaw 會追蹤最近的工具呼叫歷史記錄，並在偵測到重複且無進展的迴圈時封鎖或發出警告。
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
- `knownPollNoProgress`：重複執行輪詢類工具且輸出完全相同。
- `pingPong`：交替出現 `A/B/A/B` 無進展模式。
- 每個代理程式的覆寫：`agents.list[].tools.loopDetection`。

### `web_search`

使用 Brave、Firecrawl、Gemini、Grok、Kimi 或 Perplexity 搜尋網路。

核心參數：

- `query` (必填)
- `count` (1–10；預設來自 `tools.web.search.maxResults`)

備註：

- 需要所選供應商的 API 金鑰（建議使用 `openclaw configure --section web`）。
- 透過 `tools.web.search.enabled` 啟用。
- 回應會被快取（預設 15 分鐘）。
- 請參閱 [Web tools](/zh-Hant/tools/web) 以進行設定。

### `web_fetch`

從 URL 擷取並提取可閱讀的內容 (HTML → markdown/text)。

核心參數：

- `url` (必填)
- `extractMode` (`markdown` | `text`)
- `maxChars` (截斷長頁面)

備註：

- 透過 `tools.web.fetch.enabled` 啟用。
- `maxChars` 會受 `tools.web.fetch.maxCharsCap` 限制 (預設 50000)。
- 回應會被快取（預設 15 分鐘）。
- 對於重度依賴 JS 的網站，建議優先使用瀏覽器工具。
- 請參閱 [Web tools](/zh-Hant/tools/web) 以進行設定。
- 請參閱 [Firecrawl](/zh-Hant/tools/firecrawl) 以了解選用的反爬蟲後援機制。

### `browser`

控制專屬的 OpenClaw 管理瀏覽器。

核心動作：

- `status`、`start`、`stop`、`tabs`、`open`、`focus`、`close`
- `snapshot` (aria/ai)
- `screenshot` (傳回圖片區塊 + `MEDIA:<path>`)
- `act` (UI 動作：click/type/press/hover/drag/select/fill/resize/wait/evaluate)
- `navigate`、`console`、`pdf`、`upload`、`dialog`

設定檔管理：

- `profiles` — 列出所有瀏覽器設定檔及其狀態
- `create-profile` — 使用自動分配的連接埠建立新設定檔 (或 `cdpUrl`)
- `delete-profile` — 停止瀏覽器，刪除使用者資料，從配置中移除（僅限本地）
- `reset-profile` — 在配置檔的連接埠上終止孤立程序（僅限本地）

通用參數：

- `profile`（可選；預設為 `browser.defaultProfile`）
- `target` (`sandbox` | `host` | `node`)
- `node`（可選；選擇特定的節點 ID/名稱）
  備註：
- 需要 `browser.enabled=true`（預設為 `true`；設定 `false` 以停用）。
- 所有操作都接受可選的 `profile` 參數以支援多執行個體。
- 省略 `profile` 以使用安全的預設值：隔離的 OpenClaw 管理瀏覽器（`openclaw`）。
- 當現有的登入/Cookie 很重要且使用者在場可以點擊/批准任何附加提示時，請使用 `profile="user"` 來連接真實的本地主機瀏覽器。
- `profile="user"` 僅限主機；請勿將其與沙盒/節點目標結合使用。
- 當省略 `profile` 時，使用 `browser.defaultProfile`（預設為 `openclaw`）。
- 配置檔名稱：僅限小寫字母數字和連字號（最多 64 個字元）。
- 連接埠範圍：18800-18899（最多約 100 個配置檔）。
- 遠端配置檔僅支援附加（無法啟動/停止/重設）。
- 如果連接了具備瀏覽器功能的節點，工具可能會自動路由到該節點（除非您固定 `target`）。
- 當安裝了 Playwright 時，`snapshot` 預設為 `ai`；請使用 `aria` 來存取無障礙樹。
- `snapshot` 也支援角色快照選項（`interactive`、`compact`、`depth`、`selector`），它們會傳回像 `e12` 這樣的引用。
- `act` 需要 `ref` 來自 `snapshot`（來自 AI 快照的數值 `12`，或來自角色快照的 `e12`）；對於罕見的 CSS 選擇器需求，請使用 `evaluate`。
- 預設情況下避免使用 `act` → `wait`；僅在特殊情況下使用（沒有可靠的 UI 狀態可等待）。
- `upload` 可以選擇性傳遞 `ref` 以在準備後自動點擊。
- `upload` 也支援 `inputRef` (aria ref) 或 `element` (CSS 選擇器) 以直接設定 `<input type="file">`。

### `canvas`

驅動節點 Canvas (呈現、評估、快照、A2UI)。

核心動作：

- `present`、`hide`、`navigate`、`eval`
- `snapshot` (返回圖像區塊 + `MEDIA:<path>`)
- `a2ui_push`、`a2ui_reset`

備註：

- 底層使用閘道 `node.invoke`。
- 如果未提供 `node`，工具會選擇預設值（單一連接節點或本機 mac 節點）。
- A2UI 僅支援 v0.8（無 `createSurface`）；CLI 會拒絕帶有行錯誤的 v0.9 JSONL。
- 快速測試：`openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"`。

### `nodes`

探索並目標配對的節點；傳送通知；擷取相機/螢幕。

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
- 圖片會傳回圖片區塊 + `MEDIA:<path>`。
- 影片會傳回 `FILE:<path>` (mp4)。
- 位置會傳回 JSON 資料載荷 (lat/lon/accuracy/timestamp)。
- `run` 參數：`command` argv 陣列；選用的 `cwd`、`env` (`KEY=VAL`)、`commandTimeoutMs`、`invokeTimeoutMs`、`needsScreenRecording`。

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

- `image` (必要的路徑或 URL)
- `prompt` (選用；預設為 "Describe the image.")
- `model` (選用的覆寫值)
- `maxBytesMb` (選用的大小上限)

備註：

- 僅在設定 `agents.defaults.imageModel` 時可用 (主要或後備)，或是當可以從您的預設模型 + 設定的驗證資訊推斷出隱含的圖片模型時 (盡力配對)。
- 直接使用圖片模型 (獨立於主要的聊天模型)。

### `pdf`

分析一或多個 PDF 文件。

如需完整行為、限制、設定和範例，請參閱 [PDF 工具](/zh-Hant/tools/pdf)。

### `message`

跨 Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams 傳送訊息和頻道動作。

核心動作：

- `send` (文字 + 選用媒體；MS Teams 也支援 Adaptive Cards 的 `card`)
- `poll` (WhatsApp/Discord/MS Teams 投票)
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

註記：

- `send` 透過 Gateway 路由 WhatsApp；其他通道則直接連線。
- `poll` 對 WhatsApp 和 MS Teams 使用 Gateway；Discord 民調則直接進行。
- 當訊息工具呼叫綁定到有效的聊天工作階段時，發送會限制在該工作階段的目標，以避免跨上下洩漏。

### `cron`

管理 Gateway cron 工作和喚醒。

核心動作：

- `status`、`list`
- `add`、`update`、`remove`、`run`、`runs`
- `wake` (將系統事件加入佇列 + 可選的立即心跳)

註記：

- `add` 預期一個完整的 cron 工作物件 (schema 與 `cron.add` RPC 相同)。
- `update` 使用 `{ jobId, patch }` (為相容性接受 `id`)。

### `gateway`

重新啟動或將更新套用至執行中的 Gateway 處理程序 (就地)。

核心動作：

- `restart` (授權並傳送 `SIGUSR1` 以進行處理程序內重新啟動；`openclaw gateway` 就地重新啟動)
- `config.schema.lookup`（一次檢查一個組態路徑，而不將完整架構載入到提示詞上下文中）
- `config.get`
- `config.apply`（驗證 + 寫入組態 + 重新啟動 + 喚醒）
- `config.patch`（合併部分更新 + 重新啟動 + 喚醒）
- `update.run`（執行更新 + 重新啟動 + 喚醒）

備註：

- `config.schema.lookup` 預期一個目標組態路徑，例如 `gateway.auth` 或 `agents.list.*.heartbeat`。
- 當對定 `plugins.entries.<id>` 時，路徑可能包含以斜線分隔的外掛程式 ID，例如 `plugins.entries.pack/one.config`。
- 使用 `delayMs`（預設為 2000）以避免中斷正在進行的回覆。
- `config.schema` 仍可供內部控制 UI 流程使用，且不透過代理程式 `gateway` 工具公開。
- `restart` 預設為啟用；設定 `commands.restart: false` 以停用它。

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

列出工作階段、檢查對話記錄，或傳送至另一個工作階段。

核心參數：

- `sessions_list`：`kinds?`、`limit?`、`activeMinutes?`、`messageLimit?`（0 = 無）
- `sessions_history`：`sessionKey`（或 `sessionId`）、`limit?`、`includeTools?`
- `sessions_send`：`sessionKey`（或 `sessionId`）、`message`、`timeoutSeconds?`（0 = 即發即棄）
- `sessions_spawn`: `task`, `label?`, `runtime?`, `agentId?`, `model?`, `thinking?`, `cwd?`, `runTimeoutSeconds?`, `thread?`, `mode?`, `cleanup?`, `sandbox?`, `streamTo?`, `attachments?`, `attachAs?`
- `session_status`: `sessionKey?` (預設為 current; 接受 `sessionId`), `model?` (`default` 清除覆蓋)

備註：

- `main` 是標準的直接聊天金鑰；global/unknown 是隱藏的。
- `messageLimit > 0` 取得每個會話的最後 N 則訊息 (已篩選工具訊息)。
- 會話目標由 `tools.sessions.visibility` 控制 (預設 `tree`: 目前會話 + 產生的子代理程式會話)。如果您為多個使用者執行共享的代理程式，請考慮設定 `tools.sessions.visibility: "self"` 以防止跨會話瀏覽。
- 當 `timeoutSeconds > 0` 時，`sessions_send` 會等待最終完成。
- 傳遞/公告在完成後發生並為盡力而為；`status: "ok"` 確認代理程式執行已結束，而非公告已傳遞。
- `sessions_spawn` 支援 `runtime: "subagent" | "acp"` (`subagent` 預設)。有關 ACP 執行時期行為，請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。
- 對於 ACP 執行時期，`streamTo: "parent"` 會將初始執行進度摘要以系統事件而非直接子項傳遞的方式路由回請求者會話。
- `sessions_spawn` 啟動子代理程式執行並將公告回覆貼回請求者聊天。
  - 支援單次模式 (`mode: "run"`) 和持久執行緒繫結模式 (`mode: "session"` 搭配 `thread: true`)。
  - 如果省略了 `thread: true` 和 `mode`，模式預設為 `session`。
  - `mode: "session"` 需要 `thread: true`。
  - 如果省略了 `runTimeoutSeconds`，OpenClaw 在設置時會使用 `agents.defaults.subagents.runTimeoutSeconds`；否則，逾時預設為 `0`（無逾時）。
  - Discord 執行緒綁定的流程依賴 `session.threadBindings.*` 和 `channels.discord.threadBindings.*`。
  - 回覆格式包括 `Status`、`Result` 和精簡統計資料。
  - `Result` 是助理完成文本；如果缺失，則使用最新的 `toolResult` 作為後備。
- 手動完成模式會先生成直接發送，並在暫時性故障時進行佇列後備和重試（`status: "ok"` 表示執行完成，而非公告已發送）。
- `sessions_spawn` 僅支援子代理程式執行時期的內聯檔案附件（ACP 會拒絕它們）。每個附件都有 `name`、`content` 和可選的 `encoding`（`utf8` 或 `base64`）以及 `mimeType`。檔案會在 `.openclaw/attachments/<uuid>/` 處具現化到子工作區，並附帶 `.manifest.json` 元資料檔案。該工具會返回一個包含 `count`、`totalBytes`、每個檔案的 `sha256` 和 `relDir` 的收據。附件內容會自動從文字記錄持久化中編輯掉。
  - 透過 `tools.sessions_spawn.attachments` 配置限制（`enabled`、`maxTotalBytes`、`maxFiles`、`maxFileBytes`、`retainOnSessionKeep`）。
  - `attachAs.mountPath` 是保留給未來掛載實作使用的提示。
- `sessions_spawn` 是非阻塞的，並立即返回 `status: "accepted"`。
- ACP `streamTo: "parent"` 回應可能包含 `streamLogPath` (session-scoped `*.acp-stream.jsonl`)，用於追蹤進度歷史。
- `sessions_send` 執行回應乒乓 (reply `REPLY_SKIP` 停止; 透過 `session.agentToAgent.maxPingPongTurns` 設定最大回合數，0–5)。
- 乒乓之後，目標代理程式會執行 **announce step**；回覆 `ANNOUNCE_SKIP` 以隱藏公告。
- Sandbox clamp：當目前 session 處於沙箱模式且 `agents.defaults.sandbox.sessionToolsVisibility: "spawned"` 時，OpenClaw 會將 `tools.sessions.visibility` 限制為 `tree`。

### `agents_list`

列出目前 session 可以使用 `sessions_spawn` 作為目標的 agent id。

備註：

- 結果受限於各個 agent 的允許清單 (`agents.list[].subagents.allowAgents`)。
- 當配置了 `["*"]` 時，此工具會包含所有已配置的代理程式並標記 `allowAny: true`。

## 參數 (通用)

Gateway 支援的工具 (`canvas`、`nodes`、`cron`)：

- `gatewayUrl` (預設 `ws://127.0.0.1:18789`)
- `gatewayToken` (如果啟用驗證)
- `timeoutMs`

注意：當設定 `gatewayUrl` 時，必須明確包含 `gatewayToken`。工具不會繼承設定或環境的覆寫憑證，且缺少明確憑證會導致錯誤。

Browser 工具：

- `profile` (選用; 預設為 `browser.defaultProfile`)
- `target` (`sandbox` | `host` | `node`)
- `node` (選用; 指定特定的節點 id/name)
- 疑難排解指南：
  - Linux 啟動/CDP 問題：[Browser troubleshooting (Linux)](/zh-Hant/tools/browser-linux-troubleshooting)
  - WSL2 Gateway + Windows 遠端 Chrome CDP：[WSL2 + Windows + remote Chrome CDP troubleshooting](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

## 建議的 agent 流程

瀏覽器自動化：

1. `browser` → `status` / `start`
2. `snapshot` (ai 或 aria)
3. `act` (click/type/press)
4. `screenshot` 如果您需要視覺確認

Canvas 渲染：

1. `canvas` → `present`
2. `a2ui_push` (可選)
3. `snapshot`

節點定位：

1. `nodes` → `status`
2. 對選定節點執行 `describe`
3. `notify` / `run` / `camera_snap` / `screen_record`

## 安全性

- 避免直接使用 `system.run`；僅在獲得明確使用者同意時才使用 `nodes` → `run`。
- 尊重使用者對於相機/螢幕擷取的同意。
- 使用 `status/describe` 在呼叫媒體指令前確保權限。

## 工具如何呈現給代理程式

工具透過兩個並行通道公開：

1. **系統提示文字**：人類可讀的列表 + 指引。
2. **工具架構**：發送到模型 API 的結構化函數定義。

這意味著代理程式既能看到「有哪些工具」，也能看到「如何呼叫它們」。如果工具未出現在系統提示或架構中，模型就無法呼叫它。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
