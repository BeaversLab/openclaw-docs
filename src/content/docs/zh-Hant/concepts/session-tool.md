---
summary: "Agent session tools for listing sessions, fetching history, and sending cross-session messages"
read_when:
  - Adding or modifying session tools
title: "Session Tools"
---

# Session Tools

目標：一個小型且難以誤用的工具集，讓代理可以列出會話、取得歷史記錄，以及將訊息傳送到其他會話。

## 工具名稱

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

## 金鑰模型

- 主要直接聊天儲存區總是字面金鑰 `"main"`（解析為當前代理的主要金鑰）。
- 群組聊天使用 `agent:<agentId>:<channel>:group:<id>` 或 `agent:<agentId>:<channel>:channel:<id>`（傳遞完整金鑰）。
- Cron 工作使用 `cron:<job.id>`。
- 除非明確設定，否則 Hooks 使用 `hook:<uuid>`。
- 除非明確設定，否則節點會話使用 `node-<nodeId>`。

`global` 和 `unknown` 是保留值，永遠不會被列出。如果是 `session.scope = "global"`，我們會為所有工具將其別名為 `main`，以便呼叫者永遠不會看到 `global`。

## sessions_list

以行陣列的形式列出會話。

參數：

- `kinds?: string[]` filter：任一 `"main" | "group" | "cron" | "hook" | "node" | "other"`
- `limit?: number` 最大行數（預設值：伺服器預設值，限制例如 200）
- `activeMinutes?: number` 僅顯示 N 分鐘內更新的會話
- `messageLimit?: number` 0 = 無訊息（預設值為 0）；> 0 = 包含最後 N 則訊息

行為：

- `messageLimit > 0` 會取得每個會話的 `chat.history` 並包含最後 N 則訊息。
- 工具結果會在清單輸出中被過濾掉；請使用 `sessions_history` 來取得工具訊息。
- 在 **沙盒化** 代理會話中執行時，會話工具預設為 **僅顯示產生的會話**（見下文）。

行結構 (JSON)：

- `key`：會話金鑰 (string)
- `kind`：`main | group | cron | hook | node | other`
- `channel`：`whatsapp | telegram | discord | signal | imessage | webchat | internal | unknown`
- `displayName`（如果有的話，為群組顯示標籤）
- `updatedAt` (ms)
- `sessionId`
- `model`, `contextTokens`, `totalTokens`
- `thinkingLevel`, `verboseLevel`, `systemSent`, `abortedLastRun`
- `sendPolicy` (session override if set)
- `lastChannel`, `lastTo`
- `deliveryContext` (normalized `{ channel, to, accountId }` when available)
- `transcriptPath` (best-effort path derived from store dir + sessionId)
- `messages?` (only when `messageLimit > 0`)

## sessions_history

Fetch transcript for one session.

Parameters:

- `sessionKey` (required; accepts session key or `sessionId` from `sessions_list`)
- `limit?: number` max messages (server clamps)
- `includeTools?: boolean` (default false)

Behavior:

- `includeTools=false` filters `role: "toolResult"` messages.
- Returns messages array in the raw transcript format.
- When given a `sessionId`, OpenClaw resolves it to the corresponding session key (missing ids error).

## Gateway session history and live transcript APIs

Control UI and gateway clients can use the lower level history and live transcript surfaces directly.

HTTP:

- `GET /sessions/{sessionKey}/history`
- Query params: `limit`, `cursor`, `includeTools=1`, `follow=1`
- Unknown sessions return HTTP `404` with `error.type = "not_found"`
- `follow=1` upgrades the response to an SSE stream of transcript updates for that session

WebSocket:

- `sessions.subscribe` subscribes to all session lifecycle and transcript events visible to the client
- `sessions.messages.subscribe { key }` subscribes only to `session.message` events for one session
- `sessions.messages.unsubscribe { key }` removes that targeted transcript subscription
- `session.message` 附帶附加的逐字稿訊息，並在可用時附帶即時使用中繼資料
- `sessions.changed` 針對逐字稿附加發出 `phase: "message"`，以便工作階段列表重新整理計數器和預覽

## sessions_send

將訊息傳送至另一個工作階段。

參數：

- `sessionKey` (必填；接受工作階段金鑰或來自 `sessions_list` 的 `sessionId`)
- `message` (必填)
- `timeoutSeconds?: number` (預設 >0；0 = 即發即棄)

行為：

- `timeoutSeconds = 0`：加入佇列並傳回 `{ runId, status: "accepted" }`。
- `timeoutSeconds > 0`：等待最多 N 秒以完成，然後傳回 `{ runId, status: "ok", reply }`。
- 如果等待逾時：`{ runId, status: "timeout", error }`。執行繼續；稍後呼叫 `sessions_history`。
- 如果執行失敗：`{ runId, status: "error", error }`。
- 主要執行完成後，公告傳遞執行並採盡力而為的原則；`status: "ok"` 不保證公告已傳遞。
- 透過閘道 `agent.wait` (伺服器端) 等待，因此重新連線不會中斷等待。
- 主要執行會插入代理程式對代理程式的訊息內容。
- 跨工作階段訊息會與 `message.provenance.kind = "inter_session"` 一起持續儲存，以便逐字稿讀取器區分路由的代理程式指令與外部使用者輸入。
- 主要執行完成後，OpenClaw 會執行**回覆迴圈**：
  - 第 2 輪以上在請求者和目標代理程式之間交替。
  - 準確回覆 `REPLY_SKIP` 以停止乒乓傳遞。
  - 最大回合數為 `session.agentToAgent.maxPingPongTurns` (0–5，預設 5)。
- 迴圈結束後，OpenClaw 會執行**代理程式對代理程式公告步驟** (僅限目標代理程式)：
  - 準確回覆 `ANNOUNCE_SKIP` 以保持靜默。
  - 任何其他回覆都會傳送至目標頻道。
  - 公告步驟包含原始請求 + 第 1 輪回覆 + 最新的乒乓回覆。

## Channel Field

- 對於群組，`channel` 是記錄在工作階段條目上的頻道。
- 對於直接聊天，`channel` 從 `lastChannel` 對應。
- 對於 cron/hook/node，`channel` 是 `internal`。
- 如果缺失，`channel` 是 `unknown`。

## 安全性 / 傳送原則

基於原則，依據頻道/聊天類型（而非每個 session id）進行封鎖。

```json
{
  "session": {
    "sendPolicy": {
      "rules": [
        {
          "match": { "channel": "discord", "chatType": "group" },
          "action": "deny"
        }
      ],
      "default": "allow"
    }
  }
}
```

執行時期覆寫（每個 session 條目）：

- `sendPolicy: "allow" | "deny"` （未設定 = 繼承設定）
- 可透過 `sessions.patch` 或僅限擁有者的 `/send on|off|inherit` （獨立訊息）進行設定。

執行點：

- `chat.send` / `agent` （閘道）
- 自動回覆傳送邏輯

## sessions_spawn

產生一個隔離的委派 session。

- 預設執行時期：OpenClaw 子代理程式 （`runtime: "subagent"`）。
- ACP 組合 session 使用 `runtime: "acp"` 並遵循 ACP 特定的目標/原則規則。
- 除非另有說明，本節專注於子代理程式行為。關於 ACP 特定行為，請參閱 [ACP Agents](/en/tools/acp-agents)。

參數：

- `task` （必要）
- `runtime?` （`subagent|acp`；預設為 `subagent`）
- `label?` （選用；用於日誌/UI）
- `agentId?` （選用）
  - `runtime: "subagent"`：如果 `subagents.allowAgents` 允許，則以另一個 OpenClaw 代理程式 id 為目標
  - `runtime: "acp"`：如果 `acp.allowedAgents` 允許，則以 ACP 組合 id 為目標
- `model?` （選用；覆寫子代理程式模型；無效值將導致錯誤）
- `thinking?` （選用；覆寫子代理程式執行的思考層級）
- `runTimeoutSeconds?` （設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`；設定時，在 N 秒後中止子代理程式執行）
- `thread?` （預設為 false；當頻道/外掛程式支援時，請求此產生的執行緒繫結路由）
- `mode?` (`run|session`; 預設為 `run`，但在 `thread=true` 時預設為 `session`; `mode="session"` 需要 `thread=true`)
- `cleanup?` (`delete|keep`，預設 `keep`)
- `sandbox?` (`inherit|require`，預設 `inherit`; `require` 拒絕生成，除非目標子執行時期已沙盒化)
- `attachments?` (內聯檔案的可選陣列；僅限子代理執行時期，ACP 拒絕)。每個條目：`{ name, content, encoding?: "utf8" | "base64", mimeType? }`。檔案會在 `.openclaw/attachments/<uuid>/` 實體化到子工作區中。回傳每個檔案附帶 sha256 的收據。
- `attachAs?` (可選; `{ mountPath? }` 提示保留給未來的掛載實作)

允許清單：

- `runtime: "subagent"`：`agents.list[].subagents.allowAgents` 控制透過 `agentId` 允許哪些 OpenClaw 代理 ID (`["*"]` 表示允許任何)。預設：僅限請求者代理。
- `runtime: "acp"`：`acp.allowedAgents` 控制允許哪些 ACP 組件 ID。這是與 `subagents.allowAgents` 分開的政策。
- 沙盒繼承防護：如果請求者會話已沙盒化，`sessions_spawn` 會拒絕將以非沙盒化方式執行的目標。

探索：

- 使用 `agents_list` 來探索 `runtime: "subagent"` 的允許目標。
- 對於 `runtime: "acp"`，請使用設定的 ACP 組件 ID 和 `acp.allowedAgents`；`agents_list` 不會列出 ACP 組件目標。

行為：

- 使用 `deliver: false` 啟動新的 `agent:<agentId>:subagent:<uuid>` 會話。
- 子代理預設使用完整的工具集**減去會話工具** (可透過 `tools.subagents.tools` 設定)。
- 子代理不允許呼叫 `sessions_spawn` (不允許子代理 → 子代理生成)。
- 始終非阻塞：立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 使用 `thread=true`，頻道外掛程式可以將傳送/路由綁定到執行緒目標（Discord 支援由 `session.threadBindings.*` 和 `channels.discord.threadBindings.*` 控制）。
- 完成後，OpenClaw 會執行子代理程式 **announce step** 並將結果張貼到請求者的聊天頻道。
  - 如果助理的最終回覆為空，則子代理程式歷史記錄中最新的 `toolResult` 會被包含為 `Result`。
- 在 announce 步驟期間回覆 `ANNOUNCE_SKIP` 以保持靜默。
- Announce 回覆會被正規化為 `Status`/`Result`/`Notes`；`Status` 來自執行時結果（而非模型文字）。
- 子代理程式工作階段會在 `agents.defaults.subagents.archiveAfterMinutes` 後自動封存（預設值：60）。
- Announce 回覆包含一個統計行（執行時間、Token、sessionKey/sessionId、逐字稿路徑和選用成本）。

## 沙盒工作階段可見性

工作階段工具的範圍可以受限，以減少跨工作階段存取。

預設行為：

- `tools.sessions.visibility` 預設為 `tree`（目前工作階段 + 產生的子代理程式工作階段）。
- 對於沙盒工作階段，`agents.defaults.sandbox.sessionToolsVisibility` 可以強制限制可見性。

設定：

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      // default: "tree"
      visibility: "tree",
    },
  },
  agents: {
    defaults: {
      sandbox: {
        // default: "spawned"
        sessionToolsVisibility: "spawned", // or "all"
      },
    },
  },
}
```

備註：

- `self`：僅限目前的工作階段金鑰。
- `tree`：目前工作階段 + 由目前工作階段產生的工作階段。
- `agent`：屬於目前代理程式 ID 的任何工作階段。
- `all`：任何工作階段（跨代理程式存取仍需 `tools.agentToAgent`）。
- 當工作階段被沙盒化且 `sessionToolsVisibility="spawned"` 時，即使您設定了 `tools.sessions.visibility="all"`，OpenClaw 也會將可見性限制為 `tree`。
