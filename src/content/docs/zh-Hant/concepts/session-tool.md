---
summary: "Agent tools for cross-session status, recall, messaging, and sub-agent orchestration"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
  - You want to inspect spawned sub-agent status
title: "Session tools"
---

OpenClaw 為代理提供了跨會話工作、檢查狀態以及編排子代理的工具。

## 可用工具

| 工具               | 作用                                                      |
| ------------------ | --------------------------------------------------------- |
| `sessions_list`    | 使用可選過濾器（類型、標籤、代理、時間、預覽）列出會話    |
| `sessions_history` | 讀取特定會話的紀錄                                        |
| `sessions_send`    | 向另一個會話發送訊息並可選擇等待                          |
| `sessions_spawn`   | 生成一個隔離的子代理會話用於背景工作                      |
| `sessions_yield`   | 結束當前輪次並等待後續子代理結果                          |
| `subagents`        | 列出此會話產生的子代理狀態                                |
| `session_status`   | 顯示 `/status` 風格的卡片，並可選擇設置每個會話的模型覆蓋 |

這些工具仍受活動工具設定檔和允許/拒絕策略的約束。`tools.profile: "coding"` 包含完整的會話編排集合，包括 `sessions_spawn`、`sessions_yield` 和 `subagents`。`tools.profile: "messaging"` 包含跨會話訊息傳遞工具（`sessions_list`、`sessions_history`、`sessions_send`、`session_status`）但不包含子代理生成。若要保持訊息設定檔並仍允許原生委派，請添加：

```json5
{
  tools: {
    profile: "messaging",
    alsoAllow: ["sessions_spawn", "sessions_yield", "subagents"],
  },
}
```

群組、提供者、沙盒和每個代理的策略仍可在設定檔階段之後移除這些工具。請從受影響的會話中使用 `/tools` 來檢查有效的工具列表。

## 列出和讀取會話

`sessions_list` 會傳回含有 key、agentId、kind、channel、model、token 計數和時間戳記的 sessions。可依照 kind（`main`、`group`、`cron`、`hook`、`node`）、精確 `label`、精確 `agentId`、搜尋文字或近程（`activeMinutes`）進行篩選。當您需要信箱式分類時，也可以要求具有可見性範圍的衍生標題、最後一則訊息的預覽片段，或每一列的有限近期訊息。衍生標題與預覽僅會針對呼叫者在已設定的 session tool 可見性原則下原本就能看到的 sessions 產生，因此不相關的 sessions 會保持隱藏狀態。

`sessions_history` 會擷取特定 session 的對話紀錄。根據預設，tool 結果會被排除——請傳入 `includeTools: true` 以檢視它們。傳回的檢視是有意的受限並經過安全性過濾：

- assistant 文字在回溯前會經過標準化：
  - thinking 標籤會被移除
  - `<relevant-memories>` / `<relevant_memories>` scaffolding 區塊會被移除
  - 純文字 tool-call XML payload 區塊（例如 `<tool_call>...</tool_call>`、
    `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和
    `<function_calls>...</function_calls>`）會被移除，包括未乾淨結尾的
    截斷 payload
  - 降級的 tool-call/result scaffolding（例如 `[Tool Call: ...]`、
    `[Tool Result ...]` 和 `[Historical context ...]`）會被移除
  - 外洩的模型控制權杖（例如 `<|assistant|>`、其他 ASCII
    `<|...|>` 權杖，以及全形 `<｜...｜>` 變體）會被移除
  - 格式錯誤的 MiniMax tool-call XML（例如 `<invoke ...>` /
    `</minimax:tool_call>`）會被移除
- 類似憑證/權杖的文字在傳回前會被遮蔽
- 長文字區塊會被截斷
- 極大的紀錄可能會捨棄較舊的列，或以
  `[sessions_history omitted: message too large]` 取代過大的列
- 該工具會回報摘要標誌，例如 `truncated`、`droppedMessages`、
  `contentTruncated`、`contentRedacted` 和 `bytes`

這兩個工具都接受 **session key**（例如 `"main"`）或來自先前 list 呼叫的 **session ID**。

如果您需要逐位元組一致的精確逐字稿，請檢查磁碟上的逐字稿檔案，而不要將 `sessions_history` 視為原始傾印。

## 傳送跨工作階段訊息

`sessions_send` 將訊息傳送至另一個工作階段，並選擇性地等待回應：

- **即發即棄：** 設定 `timeoutSeconds: 0` 以立即加入佇列並返回。
- **等待回覆：** 設定逾時時間並直接取得回應。

執行緒範圍的聊天工作階段，例如以 `:thread:<id>` 結尾的 Slack 或 Discord 金鑰，不是有效的 `sessions_send` 目標。請使用父頻道工作階段金鑰來進行代理之間的協調，以免工具路由的訊息出現在活躍的人類面向執行緒中。

訊息和 A2A 後續回覆會在接收提示（`[Inter-session message ... isUser=false]`）和文字記錄出處中標記為跨工作階段資料。接收代理應將其視為工具路由資料，而非直接的終端使用者撰寫的指令。

目標回應後，OpenClaw 可以運行一個 **reply-back loop**（回覆迴圈），讓代理
輪流發送訊息（最多 `session.agentToAgent.maxPingPongTurns` 次，範圍
0-20，預設 5）。目標代理可以回覆
`REPLY_SKIP` 以提前停止。

## 狀態與編排輔助工具

`session_status` 是目前
或其他可見會話的輕量級 `/status` 等效工具。它會報告使用量、時間、模型/執行時狀態，以及
關聯的背景任務上下文（如果存在）。與 `/status` 類似，它可以在稀疏的 token/cache 計數器中回填最新的逐字稿使用量條目，而
`model=default` 可清除單一會話的覆寫。對於
呼叫者的目前會話，請使用 `sessionKey="current"`；可見的用戶端標籤（例如 `openclaw-tui`）並
不是會話金鑰。

`sessions_yield` 會有意結束目前的輪次，以便下一則訊息可以是
您正在等待的後續事件。在產生子代理後使用它，當
您希望完成結果作為下一則訊息到達，而不是建構
輪詢迴圈時。

`subagents` 是已產生 OpenClaw 子代理的可見性輔助工具。它支援 `action: "list"` 來檢查作用中/最近的執行。

## 產生子代理

`sessions_spawn` 預設會為背景任務建立一個獨立的會話。它總是非阻斷式的——會立即傳回一個 `runId` 和 `childSessionKey`。原生子代理執行會在子會話第一個可見的 `[Subagent Task]` 訊息中收到委派任務，而系統提示僅攜帶子代理執行時期規則和路由上下文。

主要選項：

- `runtime: "subagent"` (預設) 或 `"acp"` 用於外部 harness 代理。
- 子會話的 `model` 和 `thinking` 覆寫值。
- `thread: true` 將產生的子代理綁定到聊天執行緒 (Discord、Slack 等)。
- `sandbox: "require"` 對子代理強制執行沙盒機制。
- 當子代理需要當前請求者的紀錄時，原生子代理使用 `context: "fork"`；若要乾淨的子代理，則省略或使用 `context: "isolated"`。綁定執行緒的原生子代理預設為 `context: "fork"`，除非 `threadBindings.defaultSpawnContext` 另有指示。

預設的葉節點子代理不會獲得會話工具。當 `maxSpawnDepth >= 2` 時，深度為 1 的協調器子代理會額外收到 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便管理其子代理。葉節點執行仍然不會收到遞迴的協調工具。

完成後，公告步驟會將結果發佈到請求者的頻道。完成交付會在可用時保留綁定的執行緒/主題路由，如果完成來源僅識別頻道，OpenClaw 仍可重複使用請求者會話儲存的路由 (`lastChannel` / `lastTo`) 進行直接交付。

關於 ACP 特定的行為，請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

## 可見性

會話工具有作用域限制，以限制代理可以看到的內容：

| 層級    | 範圍                                 |
| ------- | ------------------------------------ |
| `self`  | 僅限當前工作階段                     |
| `tree`  | 當前工作階段 + 產生的子代理程式      |
| `agent` | 此代理程式的所有工作階段             |
| `all`   | 所有工作階段（若已設定則跨代理程式） |

預設為 `tree`。沙箱化工作階段無論設定為何，皆會限制為 `tree`。

## 延伸閱讀

- [工作階段管理](/zh-Hant/concepts/session) -- 路由、生命週期、維護
- [ACP 代理程式](/zh-Hant/tools/acp-agents) -- 外部執行器產生
- [多代理程式](/zh-Hant/concepts/multi-agent) -- 多代理程式架構
- [閘道設定](/zh-Hant/gateway/configuration) -- 工作階段工具設定選項

## 相關

- [工作階段管理](/zh-Hant/concepts/session)
- [工作階段修剪](/zh-Hant/concepts/session-pruning)
