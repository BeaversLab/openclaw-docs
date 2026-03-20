---
summary: "用於列出工作階段、擷取歷史記錄以及傳送跨工作階段訊息的 Agent 工作階段工具"
read_when:
  - 新增或修改工作階段工具
title: "Session Tools"
---

# Session Tools

目標：提供一個小巧、難以誤用的工具集，讓 Agent 可以列出工作階段、擷取歷史記錄，並發送訊息至另一個工作階段。

## 工具名稱

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

## 金鑰模型

- 主要直接聊天值區始終是字面鍵 `"main"`（解析為目前 agent 的主要鍵）。
- 群組聊天使用 `agent:<agentId>:<channel>:group:<id>` 或 `agent:<agentId>:<channel>:channel:<id>`（傳遞完整鍵）。
- Cron 作業使用 `cron:<job.id>`。
- Hook 使用 `hook:<uuid>`，除非另有明確設定。
- 節點工作階段使用 `node-<nodeId>`，除非另有明確設定。

`global` 和 `unknown` 是保留值，永遠不會被列出。如果 `session.scope = "global"`，我們會將其別名為 `main` 以適用於所有工具，因此呼叫者永遠不會看到 `global`。

## sessions_list

將工作階段以列陣列形式列出。

參數：

- `kinds?: string[]` 篩選：`"main" | "group" | "cron" | "hook" | "node" | "other"` 中的任一項
- `limit?: number` 最大行數（預設：伺服器預設值，限制例如 200）
- `activeMinutes?: number` 僅包含在 N 分鐘內更新的工作階段
- `messageLimit?: number` 0 = 無訊息（預設為 0）；>0 = 包含最後 N 則訊息

行為：

- `messageLimit > 0` 會擷取每個工作階段的 `chat.history` 並包含最後 N 則訊息。
- 工具結果會在列表輸出中被過濾掉；請使用 `sessions_history` 取得工具訊息。
- 在 **沙盒化 (sandboxed)** Agent 工作階段中執行時，工作階段工具預設為 **僅顯示衍生的工作階段**（見下文）。

列的形狀 (JSON)：

- `key`：工作階段鍵 (string)
- `kind`：`main | group | cron | hook | node | other`
- `channel`：`whatsapp | telegram | discord | signal | imessage | webchat | internal | unknown`
- `displayName`（群組顯示標籤，如果有的話）
- `updatedAt` (ms)
- `sessionId`
- `model`、`contextTokens`、`totalTokens`
- `thinkingLevel`、`verboseLevel`、`systemSent`、`abortedLastRun`
- `sendPolicy`（如果已設定工作階段覆寫）
- `lastChannel`、`lastTo`
- `deliveryContext`（可用時標準化為 `{ channel, to, accountId }`）
- `transcriptPath`（根據儲存目錄 + sessionId 導出的最佳路徑）
- `messages?`（僅當 `messageLimit > 0` 時）

## sessions_history

擷取單一工作階段的對話紀錄。

參數：

- `sessionKey`（必填；接受來自 `sessions_list` 的 session key 或 `sessionId`）
- `limit?: number` 則最多幾則訊息（伺服器端限制）
- `includeTools?: boolean`（預設為 false）

行為：

- `includeTools=false` 會過濾 `role: "toolResult"` 訊息。
- 以原始對話紀錄格式傳回訊息陣列。
- 當給定 `sessionId` 時，OpenClaw 會將其解析為對應的 session key（缺少 id 則報錯）。

## sessions_send

傳送訊息至另一個工作階段。

參數：

- `sessionKey`（必填；接受來自 `sessions_list` 的 session key 或 `sessionId`）
- `message`（必填）
- `timeoutSeconds?: number`（預設 >0；0 = 發後即忘）

行為：

- `timeoutSeconds = 0`：加入佇列並返回 `{ runId, status: "accepted" }`。
- `timeoutSeconds > 0`：最多等待 N 秒以完成，然後返回 `{ runId, status: "ok", reply }`。
- 如果等待逾時：`{ runId, status: "timeout", error }`。執行繼續；稍後呼叫 `sessions_history`。
- 如果執行失敗：`{ runId, status: "error", error }`。
- 公告的傳遞執行在主要執行完成後進行且為最佳努力；`status: "ok"` 不保證公告已傳遞。
- 透過閘道 `agent.wait`（伺服器端）等待，因此重新連線不會導致等待中斷。
- 主要執行階段會注入 Agent 對 Agent 的訊息上下文。
- 跨會話訊息會使用 `message.provenance.kind = "inter_session"` 持久化，以便文字記錄讀取器可以區分路由的代理指令與外部使用者輸入。
- 主要執行完成後，OpenClaw 會執行**回覆循環 (reply-back loop)**：
  - 第 2 輪及之後在請求者與目標 Agent 之間交替進行。
  - 請準確回覆 `REPLY_SKIP` 以停止乒乓迴圈。
  - 最大回合數為 `session.agentToAgent.maxPingPongTurns`（0–5，預設為 5）。
- 循環結束後，OpenClaw 會執行 **Agent 對 Agent 通告步驟 (agent‑to‑agent announce step)**（僅限目標 Agent）：
  - 請準確回覆 `ANNOUNCE_SKIP` 以保持靜默。
  - 任何其他回覆都會傳送至目標頻道。
  - 通告步驟包含原始請求 + 第 1 輪回覆 + 最新的乒乓回覆。

## 頻道欄位

- 對於群組，`channel` 是記錄在會話條目上的頻道。
- 對於直接聊天，`channel` 是從 `lastChannel` 映射而來。
- 對於 cron/hook/node，`channel` 是 `internal`。
- 如果缺失，`channel` 為 `unknown`。

## 安全性 / 傳送原則

基於原則的封鎖，依據頻道/聊天類型（而非每個會話 ID）。

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

執行時期覆寫（每個會話條目）：

- `sendPolicy: "allow" | "deny"`（未設定 = 繼承設定）
- 可透過 `sessions.patch` 或僅限擁有者的 `/send on|off|inherit`（獨立訊息）進行設定。

執行點：

- `chat.send` / `agent`（閘道）
- 自動回覆傳遞邏輯

## sessions_spawn

在隔離的會話中產生子 Agent 執行，並將結果通告回請求者的聊天頻道。

參數：

- `task`（必填）
- `label?`（選填；用於日誌/UI）
- `agentId?`（選填；如果允許，在另一個 agent id 下生成）
- `model?`（選填；覆寫子代理模型；無效值會報錯）
- `thinking?`（選填；為子代理執行覆寫思考層級）
- `runTimeoutSeconds?`（設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`；設定後，會在 N 秒後中止子代理執行）
- `thread?`（預設為 false；當通道/外掛支援時，請求此生成過程的執行緒繫結路由）
- `mode?`（`run|session`；預設為 `run`，但在 `thread=true` 時預設為 `session`；`mode="session"` 需要 `thread=true`）
- `cleanup?`（`delete|keep`，預設 `keep`）
- `sandbox?`（`inherit|require`，預設 `inherit`；`require` 會拒絕生成，除非目標子執行環境為沙盒）
- `attachments?`（選填的內聯檔案陣列；僅限子代理執行環境，ACP 會拒絕）。每個項目：`{ name, content, encoding?: "utf8" | "base64", mimeType? }`。檔案會實體化到子工作區的 `.openclaw/attachments/<uuid>/`。返回包含每個檔案 sha256 的回執。
- `attachAs?`（選填；`{ mountPath? }` 提示保留給未來的掛載實作）

允許清單：

- `agents.list[].subagents.allowAgents`：允許透過 `agentId` 的代理 ID 列表（使用 `["*"]` 允許任何 ID）。預設值：僅請求者代理。
- 沙箱繼承保護：如果請求者會話位於沙箱中，`sessions_spawn` 將拒絕以非沙箱模式執行的目標。

探索：

- 使用 `agents_list` 來發現允許用於 `sessions_spawn` 的代理 ID。

行為：

- 使用 `deliver: false` 啟動新的 `agent:<agentId>:subagent:<uuid>` 會話。
- 子代理預設使用完整工具組**減去會話工具**（可透過 `tools.subagents.tools` 配置）。
- 子代理不允許呼叫 `sessions_spawn`（不允許子代理 → 子代理衍生）。
- 始終為非阻塞：立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- 使用 `thread=true` 時，頻道外掛可以將傳送/路由綁定到執行緒目標（Discord 支援由 `session.threadBindings.*` 和 `channels.discord.threadBindings.*` 控制）。
- 完成後，OpenClaw 會執行子代理程式的 **announce step**，並將結果張貼到請求者的聊天頻道。
  - 如果助手的最終回覆為空，則來自子代理歷史記錄的最新 `toolResult` 將包含為 `Result`。
- 在公告步驟期間回覆準確的 `ANNOUNCE_SKIP` 以保持靜默。
- 公告回覆被標準化為 `Status`/`Result`/`Notes`；`Status` 來自執行時結果（而非模型文字）。
- 子代理會話將在 `agents.defaults.subagents.archiveAfterMinutes` 後自動封存（預設值：60）。
- Announce 回覆包含一個統計行（執行時間、Token、sessionKey/sessionId、文字記錄路徑和可選的成本）。

## 沙箱工作階段可見性

工作階段工具可以被設定範圍以減少跨工作階段的存取。

預設行為：

- `tools.sessions.visibility` 預設為 `tree`（目前會話 + 衍生的子代理會話）。
- 對於沙箱會話，`agents.defaults.sandbox.sessionToolsVisibility` 可以硬性限制可見性。

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

註記：

- `self`：僅限目前會話金鑰。
- `tree`：目前會話 + 由目前會話衍生的會話。
- `agent`：屬於目前代理 ID 的任何會話。
- `all`：任何會話（跨代理存取仍需 `tools.agentToAgent`）。
- 當會話處於沙盒模式且為 `sessionToolsVisibility="spawned"` 時，OpenClaw 會將可見性限制為 `tree`，即使您設定了 `tools.sessions.visibility="all"`。

import en from "/components/footer/en.mdx";

<en />
