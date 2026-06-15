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

`sessions_list` 傳回具有其 key、agentId、kind、channel、model、token 計數和時間戳記的 sessions。可依 kind (`main`、`group`、`cron`、`hook`、`node`)、精確 `label`、精確 `agentId`、搜尋文字或近期性 (`activeMinutes`) 進行篩選。當您需要收件匣風格的分類時，它也可以要求每列具有可見性範圍的衍生標題、最後一則訊息預覽片段，或有限的近期訊息。衍生標題和預覽僅針對呼叫者在已設定的 session 工具可見性原則下已可查看的 sessions 產生，因此不相關的 sessions 會保持隱藏。當可見性受到限制時，`sessions_list` 會傳回選用的 `visibility` 元資料，顯示有效模式和結果可能受限於範圍的警告。

`sessions_history` 會擷取特定 session 的對話記錄。根據預設，工具結果會被排除 -- 請傳遞 `includeTools: true` 以查看它們。傳回的檢視刻意設為有限並經過安全過濾：

- assistant 文字在回溯前會經過標準化：
  - thinking 標籤會被移除
  - `<relevant-memories>` / `<relevant_memories>` 支援區塊會被剝除
  - 純文字工具呼叫 XML 載荷區塊（例如 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和 `<function_calls>...</function_calls>`）會被剝除，包括無法乾淨結束的截斷載荷
  - 降級的工具呼叫/結果支援（例如 `[Tool Call: ...]`、`[Tool Result ...]` 和 `[Historical context ...]`）會被剝除
  - 外洩的模型控制權杖（例如 `<|assistant|>`、其他 ASCII `<|...|>` 權杖，以及全形 `<｜...｜>` 變體）會被剝除
  - 格式錯誤的 MiniMax 工具呼叫 XML（例如 `<invoke ...>` / `</minimax:tool_call>`）會被剝除
- 類似憑證/權杖的文字在傳回前會被遮蔽
- 長文字區塊會被截斷
- 非常大的歷史記錄可能會捨棄較舊的列，或用 `[sessions_history omitted: message too large]` 取代過大的列
- 該工具會回報摘要標誌，例如 `truncated`、`droppedMessages`、
  `contentTruncated`、`contentRedacted` 和 `bytes`

這兩個工具都接受 **session key**（例如 `"main"`）或 **session ID**
作為參數，可取自先前的列表呼叫。

如果您需要精確的逐位元組逐字紀錄，請檢查磁碟上的紀錄檔，而不要將 `sessions_history` 視為原始傾印資料。

## 傳送跨工作階段訊息

`sessions_send` 將訊息傳送至另一個會話，並選擇性等待
回應：

- **即發即棄：** 設定 `timeoutSeconds: 0` 以加入佇列並
  立即返回。
- **等待回覆：** 設定逾時時間並直接取得回應。

執行緒範圍的聊天會話（例如以 `:thread:<id>` 結尾的 Slack 或 Discord 金鑰）並非有效的 `sessions_send` 目標。請使用父頻道會話金鑰來進行代理之間的協調，以免透過工具路由的訊息出現在活躍的人機互動執行緒中。

訊息與 A2A 後續回覆會在接收端的提示詞（`[Inter-session message ... isUser=false]`）與紀錄來源中標記為跨會話資料。接收端的代理應將其視為透過工具路由的資料，而非直接由終端使用者撰寫的指令。

在目標回應後，OpenClaw 可以執行 **reply-back loop**，讓
代理輪流傳送訊息（最多 `session.agentToAgent.maxPingPongTurns` 次，範圍
為 0-20，預設為 5）。目標代理可以回覆
`REPLY_SKIP` 以提前停止。

## 狀態與編排輔助工具

`session_status` 是用於目前或其他可見會話的輕量級 `/status` 同等工具。它會回報使用量、時間、模型/執行階段狀態，以及存在的連結背景任務內容。與 `/status` 類似，它可以從最新的紀錄使用量項目中回填稀疏的 token/cache 計數器，而
`model=default` 則會清除每個會話的覆寫設定。請使用 `sessionKey="current"` 來代表
呼叫者的目前會話；可見的用戶端標籤（例如 `openclaw-tui`）則
不是會話金鑰。

當路由元數據可用時，`session_status` 也會包含一個可見的
`Route context` JSON 區塊以及匹配的結構化 `details` 欄位。這些
欄位將 session 金鑰與當前處理即時運行的路由區分開來：

- `origin` 是 session 建立的位置，或是當較舊的狀態缺少儲存的來源元數據時，從可交付的 session-key 前綴推斷出的提供者。
- `active` 是當前的即時運行路由。它僅針對現在正在處理的即時或當前 session 回報。
- `deliveryContext` 是儲存在 session 上的持久化傳遞路由，
  即使當前介面不同，OpenClaw 仍可在後續傳遞中重複使用它。

`sessions_yield` 會有意結束當前回合，以便下一則訊息可以成為
您正在等待的後續事件。在生成子代理之後使用它，當
您希望完成結果作為下一則訊息到達，而不是建立
輪詢迴圈時。

`subagents` 是已生成之 OpenClaw
子代理的可見性輔助工具。它支援 `action: "list"` 來檢查作用中/最近的運行。

## 生成子代理

`sessions_spawn` 預設會為背景任務建立一個隔離的 session。
它始終是非阻斷式的 —— 它會立即返回 `runId` 和
`childSessionKey`。原生子代理運行會在子 session 的第一個可見
`[Subagent Task]` 訊息中接收委派任務，而系統提示
僅攜帶子代理運行時規則和路由上下文。

主要選項：

- `runtime: "subagent"` (預設) 或 `"acp"` 用於外部驅動代理。
- 子 session 的 `model` 和 `thinking` 覆蓋。
- `thread: true` 用於將生成綁定到聊天執行緒 (Discord, Slack 等)。
- `sandbox: "require"` 用於對子項強制執行沙箱機制。
- `context: "fork"` 用於原生子代理，當子代理需要目前的請求者對話紀錄時；省略它或使用 `context: "isolated"` 以獲得乾淨的子代理。綁定執行緒的原生子代理預設為 `context: "fork"`，除非 `threadBindings.defaultSpawnContext` 另有規定。

預設的葉子子代理無法取得會話工具。當 `maxSpawnDepth >= 2` 時，深度 1 的協調器子代理會額外收到 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它們管理自己的子代。葉子執行仍然無法取得遞迴協調工具。

完成後，公告步驟會將結果發布到請求者的頻道。完成傳遞會在可用時保留綁定的執行緒/主題路由，如果完成來源僅識別頻道，OpenClaw 仍可重複使用請求者會話的儲存路由 (`lastChannel` / `lastTo`) 進行直接傳遞。

如需 ACP 特定行為，請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

## 可見性

會話工具的範圍受到限制，以控制代理可以看到的內容：

| 層級    | 範圍                           |
| ------- | ------------------------------ |
| `self`  | 僅限目前會話                   |
| `tree`  | 目前會話 + 產生的子代理        |
| `agent` | 此代理的所有會話               |
| `all`   | 所有會話（若已設定則含跨代理） |

預設值為 `tree`。沙盒化會話會被限制為 `tree`，無論設定為何。

## 延伸閱讀

- [Session Management](/zh-Hant/concepts/session) -- 路由、生命週期、維護
- [ACP Agents](/zh-Hant/tools/acp-agents) -- 外部駕具產生
- [Multi-agent](/zh-Hant/concepts/multi-agent) -- 多代理架構
- [Gateway Configuration](/zh-Hant/gateway/configuration) -- 會話工具設定選項

## 相關

- [Session management](/zh-Hant/concepts/session)
- [Session pruning](/zh-Hant/concepts/session-pruning)
