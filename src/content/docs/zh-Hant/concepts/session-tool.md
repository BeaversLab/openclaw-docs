---
summary: "用於跨會話狀態、回憶、訊息傳遞和子代理編排的代理工具"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
  - You want to inspect status or control spawned sub-agents
title: "Session Tools"
---

# Session Tools

OpenClaw 提供工具讓代理能夠跨會運作、檢查狀態以及編排子代理。

## 可用工具

| 工具               | 功能                                                      |
| ------------------ | --------------------------------------------------------- |
| `sessions_list`    | 使用可選過濾器（類型、時間）列出會話                      |
| `sessions_history` | 讀取特定會話的逐字稿                                      |
| `sessions_send`    | 向另一個會話發送訊息並可選擇等待                          |
| `sessions_spawn`   | 為背景工作產生一個獨立的子 Agent 會話                     |
| `sessions_yield`   | 結束當前輪次並等待後續子代理結果                          |
| `subagents`        | 列出、引導或終止為此會話產生的子代理                      |
| `session_status`   | 顯示 `/status` 樣式的卡片，並可選擇設定每個會話的模型覆寫 |

## 列出和讀取會話

`sessions_list` 回傳包含其金鑰、類型、頻道、模型、
token 計數和時間戳記的會話。可依類型（`main`、`group`、`cron`、`hook`、
`node`）或時間近遠（`activeMinutes`）進行篩選。

`sessions_history` 取得特定會話的對話紀錄。
預設情況下，工具結果會被排除——請傳入 `includeTools: true` 以查看它們。
傳回的檢視經過刻意限制和安全性過濾：

- 助理文字在回憶前會經過標準化：
  - 思考標籤會被移除
  - `<relevant-memories>` / `<relevant_memories>` 腳手架區塊會被移除
  - 純文字工具呼叫 XML 載荷區塊，例如 `<tool_call>...</tool_call>`、
    `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和
    `<function_calls>...</function_calls>` 會被移除，包括未乾淨
    關閉的截斷載荷
  - 降級的工具呼叫/結果腳手架，例如 `[Tool Call: ...]`、
    `[Tool Result ...]` 和 `[Historical context ...]` 會被移除
  - 洩漏的模型控制權杖，例如 `<|assistant|>`、其他 ASCII
    `<|...|>` 權杖和全形 `<｜...｜>` 變體會被移除
  - 格式錯誤的 MiniMax 工具呼叫 XML，例如 `<invoke ...>` /
    `</minimax:tool_call>` 會被移除
- 類似憑證/token 的文字會在傳回前被編輯
- 長文字區塊會被截斷
- 非常大的歷史記錄可以刪除較舊的行，或用
  `[sessions_history omitted: message too large]` 替換過大的行
- 該工具會回報摘要標誌，例如 `truncated`、`droppedMessages`、
  `contentTruncated`、`contentRedacted` 和 `bytes`

這兩個工具都接受 **session key**（例如 `"main"`）或來自先前列表呼叫的 **session ID**。

如果您需要逐字節完全一致的逐字稿，請檢查磁碟上的逐字稿檔案，而不要將 `sessions_history` 視為原始傾印。

## 發送跨會話訊息

`sessions_send` 將訊息傳遞給另一個會話，並可選擇等待
回應：

- **即發即棄：** 設定 `timeoutSeconds: 0` 以加入佇列並立即
  回傳。
- **等待回覆：** 設定逾時時間並即時取得回應。

在目標回應後，OpenClaw 可以執行 **reply-back loop**（回覆迴圈），讓代理
交替發送訊息（最多 5 個回合）。目標代理可以回覆
`REPLY_SKIP` 以提早停止。

## 狀態與協助程式

`session_status` 是適用於目前或另一個可見會話的輕量級 `/status` 等效工具。它會回報使用量、時間、模型/運行時狀態，以及
連結的背景任務上下文（如果存在）。與 `/status` 一樣，它可以從最新的逐字稿使用量條目中反向填補稀疏的 token/cache 計數器，而
`model=default` 則會清除每個會話的覆寫。

`sessions_yield` 會刻意結束目前的回合，以便下一則訊息可以是您正在等待的後續事件。在產生子代理後使用它，當
您希望完成結果作為下一則訊息到達，而不是建立
輪詢迴圈時。

`subagents` 是針對已產生的 OpenClaw
子代理的控制平面協助程式。它支援：

- `action: "list"` 以檢查作用中/最近執行的作業
- `action: "steer"` 以將後續指引傳送給正在執行的子程序
- `action: "kill"` 以停止單一子程序或 `all`

## 產生子代理

`sessions_spawn` 為背景工作建立一個獨立的 session。它始終是非阻斷式的——會立即返回 `runId` 和 `childSessionKey`。

關鍵選項：

- `runtime: "subagent"`（預設）或 `"acp"` 用於外部 harness agents。
- `model` 和 `thinking` 覆蓋子 session 的設定。
- `thread: true` 用於將生成的 session 綁定到聊天執行緒（Discord、Slack 等）。
- `sandbox: "require"` 用於對子 session 強制執行沙盒限制。

預設的 leaf sub-agents 不會取得 session tools。當 `maxSpawnDepth >= 2` 時，深度為 1 的 orchestrator sub-agents 會額外收到 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它們能管理自己的子項。Leaf runs 仍然不會取得遞迴的 orchestration tools。

完成後，一個公告步驟會將結果發布到請求者的頻道。完成交付會在可用時保留綁定的執行緒/主題路由，如果完成來源僅識別頻道，OpenClaw 仍然可以重複使用請求者 session 儲存的路由（`lastChannel` / `lastTo`）進行直接交付。

關於 ACP 特定的行為，請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

## 可見性

Session tools 的範圍受到限制，以控制 agent 能看到的內容：

| 層級    | 範圍                                 |
| ------- | ------------------------------------ |
| `self`  | 僅限當前 session                     |
| `tree`  | 當前 session + 生成的 sub-agents     |
| `agent` | 此 agent 的所有 session              |
| `all`   | 所有 session（若已設定，則跨 agent） |

預設為 `tree`。沙盒化的 session 無論設定為何，都會被限制在 `tree`。

## 延伸閱讀

- [Session Management](/zh-Hant/concepts/session) -- 路由、生命週期、維護
- [ACP Agents](/zh-Hant/tools/acp-agents) -- 外部 harness 生成
- [Multi-agent](/zh-Hant/concepts/multi-agent) -- 多 agent 架構
- [Gateway Configuration](/zh-Hant/gateway/configuration) -- session tool config knobs
