---
summary: "Agent tools for cross-session status, recall, messaging, and sub-agent orchestration"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
  - You want to inspect status or control spawned sub-agents
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
| `subagents`        | 列出、引導或終止此會話已生成的子代理                      |
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

在目標回應後，OpenClaw 可以執行 **reply-back loop**，讓代理程式輪流傳送訊息（最多 5 回合）。目標代理程式可以回覆 `REPLY_SKIP` 以提早停止。

## 狀態與編排輔助工具

`session_status` 是目前或其他可見工作階段的輕量級 `/status` 等效工具。它會回報使用量、時間、模型/執行階段狀態，以及連結的背景任務內容（如果有的話）。就像 `/status`，它可以從最新的逐字稿使用量項目回填稀疏的 token/cache 計數器，而 `model=default` 會清除每個工作階段的覆寫。對於呼叫者的目前工作階段，請使用 `sessionKey="current"`；可見的用戶端標籤（例如 `openclaw-tui`）並非工作階段金鑰。

`sessions_yield` 會有意結束目前的回合，讓下一則訊息可以成為您正在等待的後續事件。在產生子代理程式後使用它，當您希望完成結果作為下一則訊息到達，而不是建立輪詢迴圈時。

`subagents` 是已產生之 OpenClaw 子代理程式的控制平面輔助工具。它支援：

- `action: "list"` 以檢查作用中/最近執行的項目
- `action: "steer"` 以傳送後續指引給執行中的子項
- `action: "kill"` 以停止一個子項或 `all`

## 產生子代理程式

`sessions_spawn` 預設會為背景任務建立一個獨立的 session。它總是非阻塞的——它會立即傳回 `runId` 和 `childSessionKey`。

主要選項：

- `runtime: "subagent"`（預設）或 `"acp"` 用於外部 harness agents。
- `model` 和 `thinking` 覆寫值給子 session。
- `thread: true` 用於將產生的子 agent 繫結至聊天執行緒（Discord、Slack 等）。
- `sandbox: "require"` 用於對子 agent 強制執行沙箱機制。
- 當子 agent 需要當前的請求者記錄時，原生子 agent 使用 `context: "fork"`；若要建立乾淨的子 agent，請省略或使用 `context: "isolated"`。

預設的葉子節點子 agent 不會獲得 session 工具。當設定 `maxSpawnDepth >= 2` 時，深度為 1 的協調器子 agent 將額外接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它們管理自己的子節點。葉子節點執行仍然不會獲得遞迴協調工具。

完成後，一個公告步驟會將結果發佈至請求者的頻道。完成交付會在可用時保留繫結的執行緒/主題路由，且如果完成來源僅識別一個頻道，OpenClaw 仍然可以重複使用請求者 session 的儲存路由（`lastChannel` / `lastTo`）進行直接交付。

關於 ACP 特定的行為，請參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

## 可見性

Session 工具有範圍限制，以控制 agent 能看到的內容：

| 層級    | 範圍                                   |
| ------- | -------------------------------------- |
| `self`  | 僅限當前 session                       |
| `tree`  | 當前 session + 產生的子 agent          |
| `agent` | 此 agent 的所有 session                |
| `all`   | 所有 session（若已設定則包含跨 agent） |

預設為 `tree`。沙箱 session 無論設定為何，都會被限制為 `tree`。

## 延伸閱讀

- [Session Management](/zh-Hant/concepts/session) -- 路由、生命週期、維護
- [ACP Agents](/zh-Hant/tools/acp-agents) -- 外部佈建生成（external harness spawning）
- [Multi-agent](/zh-Hant/concepts/multi-agent) -- 多代理架構
- [Gateway Configuration](/zh-Hant/gateway/configuration) -- 工作階段工具設定調整

## 相關

- [工作階段管理](/zh-Hant/concepts/session)
- [工作階段修剪](/zh-Hant/concepts/session-pruning)
