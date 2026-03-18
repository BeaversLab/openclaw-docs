---
summary: "用於列出工作階段、擷取歷史記錄以及發送跨工作階段訊息的 Agent 工作階段工具"
read_when:
  - Adding or modifying session tools
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

- 主要直接聊天貯體永遠是字面金鑰 `"main"`（解析為目前 Agent 的主要金鑰）。
- 群組聊天使用 `agent:<agentId>:<channel>:group:<id>` 或 `agent:<agentId>:<channel>:channel:<id>`（傳遞完整金鑰）。
- Cron 作業使用 `cron:<job.id>`。
- Hook 使用 `hook:<uuid>`，除非另有明確設定。
- 節點工作階段使用 `node-<nodeId>`，除非另有明確設定。

`global` 和 `unknown` 是保留值，永遠不會被列出。如果 `session.scope = "global"`，我們會將其別名為所有工具的 `main`，讓呼叫者永遠不會看到 `global`。

## sessions_list

將工作階段以列陣列形式列出。

參數：

- `kinds?: string[]` 篩選：`"main" | "group" | "cron" | "hook" | "node" | "other"` 中的任何一個
- `limit?: number` 最大列數（預設：伺服器預設值，限制例如 200）
- `activeMinutes?: number` 僅限在 N 分鐘內更新的工作階段
- `messageLimit?: number` 0 = 無訊息（預設 0）；>0 = 包含最後 N 則訊息

行為：

- `messageLimit > 0` 會擷取每個工作階段的 `chat.history` 並包含最後 N 則訊息。
- 工具結果會在清單輸出中被過濾掉；請使用 `sessions_history` 來取得工具訊息。
- 在 **沙盒化 (sandboxed)** Agent 工作階段中執行時，工作階段工具預設為 **僅顯示衍生的工作階段**（見下文）。

列的形狀 (JSON)：

- `key`：工作階段金鑰 (字串)
- `kind`：`main | group | cron | hook | node | other`
- `channel`：`whatsapp | telegram | discord | signal | imessage | webchat | internal | unknown`
- `displayName`（如果有的話，為群組顯示標籤）
- `updatedAt` (毫秒)
- `sessionId`
- `model`、`contextTokens`、`totalTokens`
- `thinkingLevel`、`verboseLevel`、`systemSent`、`abortedLastRun`
- `sendPolicy` (若已設定則覆蓋工作階段)
- `lastChannel`、`lastTo`
- `deliveryContext` (可用時標準化 `{ channel, to, accountId }`)
- `transcriptPath` (從儲存目錄 + sessionId 導出的最佳路徑)
- `messages?` (僅當 `messageLimit > 0`)

## sessions_history

擷取單一工作階段的對話紀錄。

參數：

- `sessionKey` (必填；接受工作階段金鑰或來自 `sessions_list` 的 `sessionId`)
- `limit?: number` 最多訊息數 (伺服器夾具限制)
- `includeTools?: boolean` (預設為 false)

行為：

- `includeTools=false` 會過濾 `role: "toolResult"` 訊息。
- 以原始對話紀錄格式傳回訊息陣列。
- 當給定 `sessionId` 時，OpenClaw 會將其解析為對應的工作階段金鑰 (缺少 id 則報錯)。

## sessions_send

傳送訊息至另一個工作階段。

參數：

- `sessionKey` (必填；接受工作階段金鑰或來自 `sessions_list` 的 `sessionId`)
- `message` (必填)
- `timeoutSeconds?: number` (預設 >0；0 = 即發即棄)

行為：

- `timeoutSeconds = 0`：加入佇列並傳回 `{ runId, status: "accepted" }`。
- `timeoutSeconds > 0`：最多等待 N 秒以完成，然後傳回 `{ runId, status: "ok", reply }`。
- 如果等待逾時：`{ runId, status: "timeout", error }`。執行會繼續；稍後呼叫 `sessions_history`。
- 如果執行失敗：`{ runId, status: "error", error }`。
- 公告傳遞執行在主要執行完成後進行，且為最佳努力；`status: "ok"` 不保證公告已傳遞。
- 透過閘道 `agent.wait` （伺服器端）等待，因此重新連線不會導致等待中斷。
- 主要執行階段會注入 Agent 對 Agent 的訊息上下文。
- 跨會話訊息會隨 `message.provenance.kind = "inter_session"` 持久化保存，以便文字記錄讀者區分路由的 Agent 指令與外部使用者輸入。
- 主要執行完成後，OpenClaw 會執行**回覆循環 (reply-back loop)**：
  - 第 2 輪及之後在請求者與目標 Agent 之間交替進行。
  - 請準確回覆 `REPLY_SKIP` 以停止乒乓來回。
  - 最大輪次為 `session.agentToAgent.maxPingPongTurns` (0–5，預設為 5)。
- 循環結束後，OpenClaw 會執行 **Agent 對 Agent 通告步驟 (agent‑to‑agent announce step)**（僅限目標 Agent）：
  - 請準確回覆 `ANNOUNCE_SKIP` 以保持靜默。
  - 任何其他回覆都會傳送至目標頻道。
  - 通告步驟包含原始請求 + 第 1 輪回覆 + 最新的乒乓回覆。

## 頻道欄位

- 對於群組，`channel` 是記錄在會話條目上的頻道。
- 對於直接聊天，`channel` 是從 `lastChannel` 對應的。
- 對於 cron/hook/node，`channel` 是 `internal`。
- 如果缺少，`channel` 則為 `unknown`。

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

- `sendPolicy: "allow" | "deny"` (未設定 = 繼承設定)
- 可透過 `sessions.patch` 或僅限擁有者的 `/send on|off|inherit` (獨立訊息) 進行設定。

執行點：

- `chat.send` / `agent` (閘道)
- 自動回覆傳遞邏輯

## sessions_spawn

在隔離的會話中產生子 Agent 執行，並將結果通告回請求者的聊天頻道。

參數：

- `task` (必要)
- `label?` (選用；用於記錄/UI)
- `agentId?` (選用；如果允許，在另一個 agent id 下產生)
- `model?` (選用；覆寫子 Agent 模型；無效值會報錯)
- `thinking?` (選用；覆寫子 Agent 執行的思考等級)
- `runTimeoutSeconds?` (設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`；設定時，在 N 秒後中止子代理運行)
- `thread?` (預設為 false；當通道/外掛支援時，請求此產生的執行緒綁定路由)
- `mode?` (`run|session`；預設為 `run`，但當 `thread=true` 時預設為 `session`；`mode="session"` 需要 `thread=true`)
- `cleanup?` (`delete|keep`，預設 `keep`)
- `sandbox?` (`inherit|require`，預設 `inherit`；`require` 拒絕產生，除非目標子執行時環境位於沙箱內)
- `attachments?` (選用的內聯檔案陣列；僅限子代理執行時，ACP 拒絕)。每個項目：`{ name, content, encoding?: "utf8" | "base64", mimeType? }`。檔案會被具現化到子工作區的 `.openclaw/attachments/<uuid>/`。傳回每個檔案帶有 sha256 的收據。
- `attachAs?` (選用；`{ mountPath? }` 提示保留給未來的掛載實作)

允許清單：

- `agents.list[].subagents.allowAgents`：允許透過 `agentId` 的代理 ID 清單 (`["*"]` 表示允許任何代理)。預設值：僅限請求者代理。
- 沙箱繼承防護：如果請求者會話位於沙箱中，`sessions_spawn` 會拒絕將以非沙箱方式執行的目標。

探索：

- 使用 `agents_list` 探索允許用於 `sessions_spawn` 的代理 ID。

行為：

- 使用 `deliver: false` 啟動新的 `agent:<agentId>:subagent:<uuid>` 會話。
- 子代理預設使用完整工具集 **減去會話工具** (可透過 `tools.subagents.tools` 設定)。
- 子代理不允許呼叫 `sessions_spawn` (無子代理 → 子代理產生)。
- 始終非阻塞性：立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- 使用 `thread=true`，頻道外掛程式可以將傳遞/路由綁定到執行緒目標（Discord 支援由 `session.threadBindings.*` 和 `channels.discord.threadBindings.*` 控制）。
- 完成後，OpenClaw 會執行子代理程式的 **announce step**，並將結果張貼到請求者的聊天頻道。
  - 如果助手的最終回覆為空，則子代理程式歷史記錄中最新的 `toolResult` 會被包含為 `Result`。
- 在 announce 步驟期間回覆 `ANNOUNCE_SKIP` 以保持靜默。
- Announce 回覆會被正規化為 `Status`/`Result`/`Notes`；`Status` 來自執行時結果（而非模型文字）。
- 子代理程式工作階段會在 `agents.defaults.subagents.archiveAfterMinutes` 後自動封存（預設值：60）。
- Announce 回覆包含一個統計行（執行時間、Token、sessionKey/sessionId、文字記錄路徑和可選的成本）。

## 沙箱工作階段可見性

工作階段工具可以被設定範圍以減少跨工作階段的存取。

預設行為：

- `tools.sessions.visibility` 預設為 `tree`（目前的工作階段 + 產生的子代理程式工作階段）。
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

註記：

- `self`：僅限目前的工作階段金鑰。
- `tree`：目前的工作階段 + 由目前工作階段產生的工作階段。
- `agent`：屬於目前代理程式 ID 的任何工作階段。
- `all`：任何工作階段（跨代理程式存取仍需 `tools.agentToAgent`）。
- 當工作階段被沙箱化並且 `sessionToolsVisibility="spawned"` 時，OpenClaw 會將可見性限制為 `tree`，即使您設定了 `tools.sessions.visibility="all"`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
