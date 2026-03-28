---
summary: "用於列出工作階段、擷取歷史記錄以及傳送跨工作階段訊息的 Agent 工作階段工具"
read_when:
  - Adding or modifying session tools
title: "Session Tools"
---

# Session Tools

目標：提供一套小巧且難以誤用的工具集，讓 Agent 能夠列出工作階段、擷取歷史記錄，並傳送訊息至其他工作階段。

## 工具名稱

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

## 金鑰模型

- 主要的直接聊天貯體永遠是字面金鑰 `"main"`（解析為目前 Agent 的主要金鑰）。
- 群組聊天使用 `agent:<agentId>:<channel>:group:<id>` 或 `agent:<agentId>:<channel>:channel:<id>`（傳遞完整金鑰）。
- Cron 作業使用 `cron:<job.id>`。
- 除非另有明確設定，否則 Hook 使用 `hook:<uuid>`。
- 節點會話使用 `node-<nodeId>`，除非另有明確設定。

`global` 和 `unknown` 是保留值，從不列出。如果是 `session.scope = "global"`，我們會為所有工具將其別名為 `main`，以便呼叫者永遠不會看到 `global`。

## sessions_list

將會話列為行的陣列。

參數：

- `kinds?: string[]` 篩選器：`"main" | "group" | "cron" | "hook" | "node" | "other"` 中的任何一個
- `limit?: number` 最大行數（預設：伺服器預設，限制例如 200）
- `activeMinutes?: number` 僅包含在 N 分鐘內更新的會話
- `messageLimit?: number` 0 = 無訊息（預設 0）；>0 = 包含最後 N 則訊息

行為：

- `messageLimit > 0` 擷取每個會話的 `chat.history` 並包含最後 N 則訊息。
- 工具結果會在列表輸出中被過濾掉；請使用 `sessions_history` 來處理工具訊息。
- 當在 **沙盒化** 的代理程式工作階段中執行時，工作階段工具預設為 **僅衍生可見性** (spawned-only visibility) (見下文)。

列形狀 (JSON)：

- `key`：工作階段金鑰 (字串)
- `kind`： `main | group | cron | hook | node | other`
- `channel`： `whatsapp | telegram | discord | signal | imessage | webchat | internal | unknown`
- `displayName` (群組顯示標籤，如果有的話)
- `updatedAt` (毫秒)
- `sessionId`
- `model`, `contextTokens`, `totalTokens`
- `thinkingLevel`, `verboseLevel`, `systemSent`, `abortedLastRun`
- `sendPolicy` (工作階段覆寫，如果已設定)
- `lastChannel`, `lastTo`
- `deliveryContext` （如有可用，則為標準化的 `{ channel, to, accountId }`）
- `transcriptPath` （從儲存目錄 + sessionId 推導出的最合適路徑）
- `messages?` （僅當 `messageLimit > 0` 時）

## sessions_history

取得單一會話的文字記錄。

參數：

- `sessionKey` （必填；接受來自 `sessions_list` 的會話金鑰或 `sessionId`）
- `limit?: number` 則訊息數上限（伺服器會限制）
- `includeTools?: boolean` （預設為 false）

行為：

- `includeTools=false` 會過濾 `role: "toolResult"` 訊息。
- 以原始文字記錄格式傳回訊息陣列。
- 當給定一個 `sessionId` 時，OpenClaw 會將其解析為對應的 session 金鑰（缺少 ids 會報錯）。

## Gateway session 歷史記錄和即時逐字稿 API

控制 UI 和 gateway 客戶端可以直接使用底層的歷史記錄和即時逐字稿介面。

HTTP：

- `GET /sessions/{sessionKey}/history`
- 查詢參數：`limit`、`cursor`、`includeTools=1`、`follow=1`
- 未知的 session 會傳回 HTTP `404` 並帶有 `error.type = "not_found"`
- `follow=1` 會將回應升級為該 session 逐字稿更新的 SSE 串流

WebSocket：

- `sessions.subscribe` 會訂閱客戶端可見的所有 session 生命週期和逐字稿事件
- `sessions.messages.subscribe { key }` 僅訂閱一個會話的 `session.message` 事件
- `sessions.messages.unsubscribe { key }` 移除該目標逐字稿訂閱
- `session.message` 載有附加的逐字稿訊息以及可用時的即時使用量元資料
- `sessions.changed` 針對逐字稿附加發出 `phase: "message"`，以便會話列表能重新整理計數器和預覽

## sessions_send

傳送訊息至另一個會話。

參數：

- `sessionKey` （必要；接受來自 `sessions_list` 的會話金鑰或 `sessionId`）
- `message` （必要）
- `timeoutSeconds?: number` （預設值 >0；0 = 即發即棄）

行為：

- `timeoutSeconds = 0`：加入佇列並傳回 `{ runId, status: "accepted" }`。
- `timeoutSeconds > 0`：等待最多 N 秒以完成，然後返回 `{ runId, status: "ok", reply }`。
- 如果等待超時：`{ runId, status: "timeout", error }`。運行繼續；稍後呼叫 `sessions_history`。
- 如果運行失敗：`{ runId, status: "error", error }`。
- 公告傳送在主運行完成後執行並屬於盡力而為；`status: "ok"` 不保證公告已傳送。
- 透過閘道 `agent.wait`（伺服器端）等待，因此重新連線不會導致等待中斷。
- 代理程式之間的訊息上下文會為主運行注入。
- 跨工作階段訊息會與 `message.provenance.kind = "inter_session"` 一起保存，以便逐字稿讀者可以區分路由的代理程式指令與外部使用者輸入。
- 主運行完成後，OpenClaw 會執行 **reply-back loop**（回覆迴圈）：
  - 第 2 輪及之後的輪次在請求者和目標代理程式之間交替。
  - 準確回覆 `REPLY_SKIP` 以停止 ping‑pong。
  - 最大輪次為 `session.agentToAgent.maxPingPongTurns`（0–5，預設為 5）。
- 迴圈結束後，OpenClaw 會執行 **agent‑to‑agent announce step**（僅限目標代理程式）：
  - 準確回覆 `ANNOUNCE_SKIP` 以保持靜默。
  - 任何其他回覆都會傳送到目標頻道。
  - 公告步驟包括原始請求 + 第一輪回覆 + 最新的 ping‑pong 回覆。

## 頻道欄位

- 對於群組，`channel` 是記錄在會話項目上的頻道。
- 對於直接聊天，`channel` 是從 `lastChannel` 對應而來。
- 對於 cron/hook/node，`channel` 是 `internal`。
- 如果缺少，`channel` 是 `unknown`。

## 安全性 / 傳送原則

依據頻道/聊天類型的封鎖原則（而非根據每個會話 ID）。

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

運行時覆寫（每個會話項）：

- `sendPolicy: "allow" | "deny"` （未設定 = 繼承設定）
- 可透過 `sessions.patch` 或僅限擁有者的 `/send on|off|inherit` （獨立訊息）設定。

執行點：

- `chat.send` / `agent` （閘道）
- 自動回覆傳遞邏輯

## sessions_spawn

在獨立會話中生成子代理執行，並將結果宣佈回請求者聊天頻道。

參數：

- `task` （必填）
- `label?` （選填；用於日誌/UI）
- `agentId?` （選填；如果允許，在另一個代理 ID 下生成）
- `model?` （選填；覆寫子代理模型；無效值會報錯）
- `thinking?` （選填；覆寫子代理執行的思考層級）
- `runTimeoutSeconds?` (設置時默認為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`；設置後，在 N 秒後中止子代理運行)
- `thread?` (默認為 false；當通道/插件支援時，請求此生成的執行緒繫結路由)
- `mode?` (`run|session`；默認為 `run`，但當 `thread=true` 時默認為 `session`；`mode="session"` 需要 `thread=true`)
- `cleanup?` (`delete|keep`，默認 `keep`)
- `sandbox?` (`inherit|require`，預設 `inherit`；`require` 拒絕產生，除非目標子執行環境已沙箱化)
- `attachments?` (選用的內聯檔案陣列；僅限 subagent 執行環境，ACP 拒絕)。每個項目：`{ name, content, encoding?: "utf8" | "base64", mimeType? }`。檔案會具象化至子工作區的 `.openclaw/attachments/<uuid>/`。傳回包含每個檔案 sha256 的收據。
- `attachAs?` (選用；`{ mountPath? }` 提示保留給未來的掛載實作)

允許清單：

- `agents.list[].subagents.allowAgents`：允許透過 `agentId` 存取的代理程式 ID 清單 (`["*"]` 表示允許任何)。預設：僅限請求者代理程式。
- 沙盒繼承保護：如果請求者的會話處於沙盒中，`sessions_spawn` 會拒絕將以非沙盒方式運行的目標。

探索：

- 使用 `agents_list` 來探索哪些代理 ID 允許用於 `sessions_spawn`。

行為：

- 使用 `deliver: false` 啟動新的 `agent:<agentId>:subagent:<uuid>` 會話。
- 子代理預設使用完整的工具集**減去**會話工具（可透過 `tools.subagents.tools` 進行設定）。
- 子代理不允許呼叫 `sessions_spawn`（不允許子代理 → 子代理生成）。
- 始終為非阻斷式：立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 透過 `thread=true`，頻道外掛可以將傳送/路由綁定到執行緒目標（Discord 支援由 `session.threadBindings.*` 和 `channels.discord.threadBindings.*` 控制）。
- 完成後，OpenClaw 執行子代理**公告步驟**並將結果發佈到請求者的聊天頻道。
  - 如果助理的最終回覆為空，則會包含子代理歷史記錄中最新的 `toolResult` 作為 `Result`。
- 在公告步驟期間回覆 `ANNOUNCE_SKIP` 以保持靜默。
- 公告回覆會被正規化為 `Status`/`Result`/`Notes`；`Status` 來自執行時結果（而非模型文本）。
- 子代理會話會在 `agents.defaults.subagents.archiveAfterMinutes` 後自動封存（預設值：60）。
- 公告回覆包含統計資訊行（執行時間、Token 數、sessionKey/sessionId、逐字稿路徑及可選的成本）。

## 沙箱會話可見性

會話工具可以設定範圍以減少跨會話存取。

預設行為：

- `tools.sessions.visibility` 預設為 `tree`（目前工作階段 + 產生的子代理工作階段）。
- 對於沙箱化的工作階段，`agents.defaults.sandbox.sessionToolsVisibility` 可以強制限制可見性。

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
- `agent`：屬於目前代理 ID 的任何工作階段。
- `all`：任何工作階段（跨代理存取仍需 `tools.agentToAgent`）。
- 當工作階段被沙箱化且 `sessionToolsVisibility="spawned"` 時，OpenClaw 會將可見性限制為 `tree`，即使您設定了 `tools.sessions.visibility="all"` 也是如此。
