---
summary: "用於列出會話、讀取歷史記錄以及跨會話通訊的 Agent 工具"
read_when:
  - You want to understand what session tools the agent has
  - You want to configure cross-session access or sub-agent spawning
title: "Session Tools"
---

# Session Tools

OpenClaw 為 Agent 提供了跨會話工作的工具——列出對話、讀取歷史記錄、向其他會話發送訊息以及產生子 Agent。

## 可用工具

| 工具               | 功能                                  |
| ------------------ | ------------------------------------- |
| `sessions_list`    | 使用可選過濾器（類型、時間）列出會話  |
| `sessions_history` | 讀取特定會話的逐字稿                  |
| `sessions_send`    | 向另一個會話發送訊息並可選擇等待      |
| `sessions_spawn`   | 為背景工作產生一個獨立的子 Agent 會話 |

## 列出和讀取會話

`sessions_list` 會返回包含金鑰、類型、頻道、模型、 token 計數和時間戳記的會話。可以按類型（`main`、`group`、`cron`、`hook`、
`node`）或時間（`activeMinutes`）進行過濾。

`sessions_history` 會擷取特定會話的對話逐字稿。預設情況下，工具結果會被排除在外——請傳遞 `includeTools: true` 以查看它們。

這兩個工具都接受 **會話金鑰**（如 `"main"`）或來自先前列表呼叫的 **會話 ID**。

## 發送跨會話訊息

`sessions_send` 會將訊息傳遞給另一個會話，並可選擇等待回應：

- **即發即棄**：設定 `timeoutSeconds: 0` 以加入佇列並立即返回。
- **等待回覆**：設定逾時時間並直接取得回應。

在目標回應後，OpenClaw 可以執行 **回覆迴圈**，讓 Agent 交替傳送訊息（最多 5 個回合）。目標 Agent 可以回覆 `REPLY_SKIP` 以提前停止。

## 產生子 Agent

`sessions_spawn` 會為背景任務建立一個獨立的會話。它總是非阻塞的——它會立即返回 `runId` 和 `childSessionKey`。

主要選項：

- `runtime: "subagent"`（預設）或 `"acp"` 用於外部控制代理。
- `model` 和 `thinking` 子會話的覆寫設定。
- `thread: true` 將生成的代理綁定到聊天執行緒（Discord、Slack 等）。
- `sandbox: "require"` 強制對子代理執行沙盒機制。

子代理獲得完整的工具集，但不含會話工具（無遞迴生成）。
完成後，公告步驟會將結果發布到請求者的頻道。

關於 ACP 特定行為，請參閱 [ACP Agents](/en/tools/acp-agents)。

## 可見性

會話工具具有範圍限制，以限制代理所能看到的內容：

| 層級    | 範圍                             |
| ------- | -------------------------------- |
| `self`  | 僅限目前會話                     |
| `tree`  | 目前會話 + 生成的子代理          |
| `agent` | 此代理的所有會話                 |
| `all`   | 所有會話（若已設定則包含跨代理） |

預設為 `tree`。無論設定為何，沙盒會話都會被限制為 `tree`。

## 延伸閱讀

- [會話管理](/en/concepts/session) -- 路由、生命週期、維護
- [ACP Agents](/en/tools/acp-agents) -- 外部控制生成
- [Multi-agent](/en/concepts/multi-agent) -- 多代理架構
- [Gateway Configuration](/en/gateway/configuration) -- 會話工具設定選項
