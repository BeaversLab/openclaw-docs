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

| 工具               | 功能                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| `sessions_list`    | 列出會話，並可選擇使用篩選器（kind、label、agent、recency、preview） |
| `sessions_history` | 讀取特定會話的逐字稿                                                 |
| `sessions_send`    | 向另一個會話發送訊息並可選擇等待                                     |
| `sessions_spawn`   | 為背景工作產生一個獨立的子 Agent 會話                                |
| `sessions_yield`   | 結束當前輪次並等待後續子代理結果                                     |
| `subagents`        | 列出、引導或終止為此會話產生的子代理                                 |
| `session_status`   | 顯示 `/status` 樣式的卡片，並可選擇設定每個會話的模型覆寫            |

## 列出和讀取會話

`sessions_list` 會傳回會話及其 key、agentId、kind、channel、model、
token 計數和時間戳記。可以根據 kind（`main`、`group`、`cron`、`hook`、
`node`）、精確的 `label`、精確的 `agentId`、搜尋文字或最近性
（`activeMinutes`）進行篩選。當您需要信箱式分類時，它也可以要求提供
限定範圍的衍生標題、最後一則訊息的預覽片段，或每列有界的
最近訊息。衍生標題和預覽僅針對呼叫者根據設定的會話工具
可見性原則已可看見的會話產生，因此不相關的會話保持隱藏。

`sessions_history` 會擷取特定會話的對話記錄。
預設情況下，工具結果會被排除 —— 請傳入 `includeTools: true` 以查看它們。
傳回的視圖經刻意限制並經過安全過濾：

- 助理文字在回憶前會經過標準化：
  - 思考標籤會被移除
  - `<relevant-memories>` / `<relevant_memories>` 腳手架區塊會被移除
  - 純文字工具呼叫 XML 載荷區塊，例如 `<tool_call>...</tool_call>`、
    `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和
    `<function_calls>...</function_calls>` 會被移除，包括從未整潔關閉的
    截斷載荷
  - 降級的工具呼叫/結果腳手架，例如 `[Tool Call: ...]`、
    `[Tool Result ...]` 和 `[Historical context ...]` 會被移除
  - 洩漏的模型控制權杖，例如 `<|assistant|>`、其他 ASCII
    `<|...|>` 權杖，以及全形 `<｜...｜>` 變體會被移除
  - 格式錯誤的 MiniMax 工具呼叫 XML，例如 `<invoke ...>` /
    `</minimax:tool_call>` 會被移除
- 類似憑證/token 的文字會在傳回前被編輯
- 長文字區塊會被截斷
- 非常大的歷史記錄可能會捨棄較舊的列，或用
  `[sessions_history omitted: message too large]` 取代過大的列
- 此工具會回報摘要標誌，例如 `truncated`、`droppedMessages`、
  `contentTruncated`、`contentRedacted` 和 `bytes`

這兩個工具都接受 **工作階段金鑰** (session key，類似 `"main"`) 或先前列表呼叫中的 **工作階段 ID** (session ID)。

如果您需要逐位元組精確的逐字稿，請檢查磁碟上的逐字稿檔案，而不是將 `sessions_history` 視為原始傾印。

## 發送跨會話訊息

`sessions_send` 將訊息傳遞給另一個工作階段，並選擇性地等待
回應：

- **即發即棄 (Fire-and-forget)：** 設定 `timeoutSeconds: 0` 以立即將其加入佇列並
  傳回。
- **等待回覆：** 設定逾時時間並即時取得回應。

在目標回應後，OpenClaw 可以執行 **回覆迴圈 (reply-back loop)**，讓
代理交替交換訊息 (最多 5 個回合)。目標代理可以回覆
`REPLY_SKIP` 以提早停止。

## 狀態與協助程式

`session_status` 是用於目前
或其他可見工作階段的輕量級 `/status` 等效工具。它會回報使用量、時間、模型/執行時間狀態，以及
連結的背景工作內容 (如有)。與 `/status` 一樣，它可以從最新的逐字稿使用量項目中
反向填補稀疏的 token/cache 計數器，且
`model=default` 會清除單一工作階段的覆寫。

`sessions_yield` 會故意結束目前回合，以便下則訊息可以是
您正在等待的後續事件。在產生子代理後使用它，當
您希望完成結果作為下則訊息到達，而不是建置
輪詢迴圈時。

`subagents` 是已產生的 OpenClaw
子代理的控制平面輔助工具。它支援：

- `action: "list"` 以檢查作用中/最近的執行
- `action: "steer"` 以將後續指引傳送給正在執行的子項
- `action: "kill"` 以停止單一子項或 `all`

## 產生子代理

`sessions_spawn` 會為背景工作建立一個獨立的工作階段。它總是
非阻斷的——它會立即傳回 `runId` 和 `childSessionKey`。

關鍵選項：

- `runtime: "subagent"` (預設) 或 `"acp"` 用於外部駁動代理。
- `model` 和 `thinking` 覆寫子會話的設定。
- `thread: true` 將產生繫結至聊天執行緒（Discord、Slack 等）。
- `sandbox: "require"` 強制對子項執行沙箱機制。

預設的葉子子代理程式（leaf sub-agents）不會取得會話工具。當
`maxSpawnDepth >= 2` 時，深度 1 的協調器子代理程式會額外接收
`sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它們
管理自己的子項。葉子執行仍然不會取得遞迴
協調工具。

完成後，一個公告步驟會將結果發佈至請求者的頻道。
完成交付會在可用時保留繫結的執行緒/主題路由，且如果
完成來源僅識別頻道，OpenClaw 仍然可以重複使用
請求者會話的儲存路由（`lastChannel` / `lastTo`）進行直接
交付。

關於 ACP 特定的行為，請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

## 可見性

Session tools 的範圍受到限制，以控制 agent 能看到的內容：

| 層級    | 範圍                                 |
| ------- | ------------------------------------ |
| `self`  | 僅限當前 session                     |
| `tree`  | 當前 session + 生成的 sub-agents     |
| `agent` | 此 agent 的所有 session              |
| `all`   | 所有 session（若已設定，則跨 agent） |

預設值為 `tree`。沙箱會話會被強制限制為 `tree`，無論設定為何。

## 延伸閱讀

- [Session Management](/zh-Hant/concepts/session) -- 路由、生命週期、維護
- [ACP Agents](/zh-Hant/tools/acp-agents) -- 外部機架產生
- [Multi-agent](/zh-Hant/concepts/multi-agent) -- 多代理程式架構
- [Gateway Configuration](/zh-Hant/gateway/configuration) -- 會話工具設定調整
