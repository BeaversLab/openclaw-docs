---
summary: "Sub-agents：產生獨立的代理執行，並將結果回報給請求的聊天"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sub-Agents"
---

# Sub-agents

Sub-agents 是由現有代理執行產生的背景代理執行。它們在自己的會話 (`agent:<agentId>:subagent:<uuid>`) 中執行，並在完成時將結果**回報** (announce) 給請求的聊天頻道。

## Slash command

使用 `/subagents` 來檢查或控制**目前會話** (current session) 的 sub-agent 執行：

- `/subagents list`
- `/subagents kill <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`
- `/subagents steer <id|#> <message>`
- `/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]`

Thread 綁定控制：

這些指令適用於支援持續性 Thread 綁定的頻道。請參見下方的 **Thread 支援頻道**。

- `/focus <subagent-label|session-key|session-id|session-label>`
- `/unfocus`
- `/agents`
- `/session idle <duration|off>`
- `/session max-age <duration|off>`

`/subagents info` 顯示執行中繼資料 (狀態、時間戳記、會話 ID、文字記錄路徑、清理)。

### 產生行為

`/subagents spawn` 會以使用者指令 (而非內部中繼) 的方式啟動背景 sub-agent，並在執行完成時傳送最終完成更新回請求聊天。

- 產生指令是非阻斷的；它會立即傳回執行 ID。
- 完成時，sub-agent 會將摘要/結果訊息回報給請求的聊天頻道。
- 對於手動產生的執行，傳遞具備復原力：
  - OpenClaw 會先嘗試使用穩定的等冪金鑰進行直接 `agent` 傳遞。
  - 如果直接傳遞失敗，則會退回到佇列路由。
  - 如果佇列路由仍無法使用，則會在短暫的指數退避後重試回報，直到最終放棄。
- 移交給請求會端的完成內容是執行時期產生的內部內容 (並非使用者撰寫的文字)，並包含：
  - `Result` (`assistant` 回覆文字，若助理回覆為空則為最新的 `toolResult`)
  - `Status` (`completed successfully` / `failed` / `timed out` / `unknown`)
  - 精簡的執行時間/Token 統計資料
  - 傳遞指示，告知請求者代理以一般助手語氣重寫（不轉發原始的內部元資料）
- `--model` 和 `--thinking` 會覆寫該次特定執行的預設值。
- 使用 `info`/`log` 來檢查完成後的詳細資料和輸出。
- `/subagents spawn` 是一次性模式（`mode: "run"`）。對於持久化的執行緒繫結工作階段，請使用帶有 `thread: true` 和 `mode: "session"` 的 `sessions_spawn`。
- 對於 ACP 繫束工作階段（Codex、Claude Code、Gemini CLI），請使用帶有 `runtime: "acp"` 的 `sessions_spawn`，並參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

主要目標：

- 並行處理「研究 / 長期任務 / 緩慢工具」的工作，而不阻塞主要執行。
- 預設保持子代理的隔離（工作階段分離 + 可選的沙箱機制）。
- 使工具介面難以被誤用：子代理預設**不會**獲得工作階段工具。
- 支援可配置的巢狀深度，以實現協調器模式。

成本注意事項：每個子代理都有自己的語境和 Token 使用量。對於繁重或重複性的
任務，請為子代理設定較便宜的模型，並將主要代理保持在更高品質的模型上。
您可以透過 `agents.defaults.subagents.model` 或個別代理的覆寫設定來進行配置。

## 工具

使用 `sessions_spawn`：

- 啟動子代理執行（`deliver: false`，全域通道：`subagent`）
- 然後執行公告步驟，並將公告回覆發布至請求者聊天頻道
- 預設模型：繼承呼叫者，除非您設定了 `agents.defaults.subagents.model`（或個別代理的 `agents.list[].subagents.model`）；明確指定的 `sessions_spawn.model` 仍然優先。
- 預設思考：繼承呼叫者，除非您設定了 `agents.defaults.subagents.thinking`（或個別代理的 `agents.list[].subagents.thinking`）；明確指定的 `sessions_spawn.thinking` 仍然優先。
- 預設執行逾時：如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 會使用已設定的 `agents.defaults.subagents.runTimeoutSeconds`；否則會回退至 `0`（無逾時）。

工具參數：

- `task` (必要)
- `label?` (選用)
- `agentId?` (選用；如果允許，則在其他代理 ID 下產生)
- `model?` (選用；覆寫子代理模型；無效值會被跳過，子代理將在預設模型上執行，並在工具結果中顯示警告)
- `thinking?` (選用；覆寫子代理執行的思考等級)
- `runTimeoutSeconds?` (如果設定，預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`；如果設定，子代理執行將在 N 秒後中止)
- `thread?` (預設 `false`；當 `true` 時，請求此子代理工作階段的頻道執行緒綁定)
- `mode?` (`run|session`)
  - 預設為 `run`
  - 如果省略了 `thread: true` 和 `mode`，預設會變為 `session`
  - `mode: "session"` 需要 `thread: true`
- `cleanup?` (`delete|keep`，預設 `keep`)
- `sandbox?` (`inherit|require`，預設 `inherit`；`require` 會拒絕產生，除非目標子執行環境已沙盒化)
- `sessions_spawn` **不** 接受頻道傳遞參數 (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`)。若要進行傳遞，請從產生的執行中使用 `message`/`sessions_send`。

## 執行緒綁定工作階段

當為頻道啟用執行緒綁定時，子代理可以保持綁定到某個執行緒，以便該執行緒中的後續使用者訊息繼續路由到同一個子代理工作階段。

### 支援執行緒的頻道

- Discord（目前唯一支援的頻道）：支援持續的執行緒綁定子代理程式工作階段（使用 `sessions_spawn` 搭配 `thread: true`）、手動執行緒控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`），以及配接器金鑰 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSubagentSessions`。

快速流程：

1. 使用 `sessions_spawn` 搭配 `thread: true` 來產生（可選搭配 `mode: "session"`）。
2. OpenClaw 會在現用頻道中建立或綁定執行緒至該工作階段目標。
3. 該執行緒中的回覆和後續訊息會路由至已綁定的工作階段。
4. 使用 `/session idle` 檢查/更新非活動自動取消聚焦，並使用 `/session max-age` 控制硬性上限。
5. 使用 `/unfocus` 手動分離。

手動控制：

- `/focus <target>` 將目前的執行緒（或建立一個）綁定至子代理程式/工作階段目標。
- `/unfocus` 移除目前已綁定執行緒的綁定。
- `/agents` 列出執行中的工作階段和綁定狀態（`thread:<id>` 或 `unbound`）。
- `/session idle` 和 `/session max-age` 僅適用於已聚焦的已綁定執行緒。

設定開關：

- 全域預設：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`
- 頻道覆寫和產生自動綁定金鑰因配接器而異。請參閱上方的**支援執行緒的頻道**。

請參閱 [Configuration Reference](/zh-Hant/gateway/configuration-reference) 和 [Slash commands](/zh-Hant/tools/slash-commands) 以了解目前配接器的詳細資訊。

允許清單：

- `agents.list[].subagents.allowAgents`：可透過 `agentId` 鎖定的代理程式 ID 清單（`["*"]` 表示允許任何項目）。預設值：僅限請求者代理程式。
- Sandbox 繼承防護：如果請求者會話處於沙盒模式，`sessions_spawn` 將拒絕以非沙盒模式運行的目標。

探索：

- 使用 `agents_list` 查看目前允許 `sessions_spawn` 使用哪些代理 ID。

自動封存：

- 子代理會話會在 `agents.defaults.subagents.archiveAfterMinutes` 後自動封存（預設：60）。
- 封存使用 `sessions.delete` 並將對話紀錄重新命名為 `*.deleted.<timestamp>`（同一資料夾）。
- `cleanup: "delete"` 會在宣佈後立即封存（仍透過重新命名保留對話紀錄）。
- 自動封存為盡力而為；如果閘道重新啟動，暫止的計時器將會遺失。
- `runTimeoutSeconds` **不會**自動封存；它只會停止執行。會話將保留直到自動封存。
- 自動封存同樣適用於深度 1 和深度 2 的會話。

## 巢狀子代理

預設情況下，子代理無法生成自己的子代理 (`maxSpawnDepth: 1`)。您可以透過設定 `maxSpawnDepth: 2` 來啟用一層巢狀結構，這允許 **協調器模式**：主代理 → 協調器子代理 → 工作者子子代理。

### 如何啟用

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn when omitted (0 = no timeout)
      },
    },
  },
}
```

### 深度層級

| 深度 | 會話金鑰形狀                                 | 角色                            | 可生成？                  |
| ---- | -------------------------------------------- | ------------------------------- | ------------------------- |
| 0    | `agent:<id>:main`                            | 主代理                          | 總是                      |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理（深度 2 允許時為協調器） | 僅當 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（葉節點工作者）        | 從不                      |

### 宣佈鏈

結果沿鏈向上流動：

1. 深度 2 工作者完成 → 向其父級（深度 1 協調器）宣佈
2. 深度 1 協調器接收宣佈，綜合結果，完成 → 向主代理宣佈
3. 主代理接收宣佈並傳送給使用者

每個層級僅能看到其直接子代的宣佈。

### 依深度區分的工具政策

- 角色和控制範圍在生成時寫入會詮元資料中。這可防止扁平化或還原的會話金鑰意外重新獲得協調器權限。
- **深度 1（協調器，當 `maxSpawnDepth >= 2` 時）**：獲得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以管理其子代理。其他會話/系統工具仍被拒絕。
- **深度 1（葉節點，當 `maxSpawnDepth == 1` 時）**：無會話工具（當前默認行為）。
- **深度 2（葉節點工作器）**：無會話工具 —— `sessions_spawn` 在深度 2 處總是被拒絕。無法產生更多子代。

### 每個代理的產生限制

每個代理會話（在任何深度）一次最多可以有 `maxChildrenPerAgent`（默認：5）個活動子代。這可以防止單個協調器出現失控的扇出。

### 級聯停止

停止深度 1 協調器會自動停止其所有深度 2 子代：

- 主聊天中的 `/stop` 會停止所有深度 1 代理，並級聯至其深度 2 子代。
- `/subagents kill <id>` 會停止特定子代理並級聯至其子代。
- `/subagents kill all` 會停止請求者的所有子代理並進行級聯。

## 身份驗證

子代理的身分驗證是通過 **代理 ID** 解析的，而不是通過會話類型：

- 子代理會話金鑰是 `agent:<agentId>:subagent:<uuid>`。
- 身分驗證存儲是從該代理的 `agentDir` 加載的。
- 主代理的身分驗證設定檔作為 **後備** 合併；發生衝突時，代理設定檔會覆蓋主設定檔。

注意：合併是相加的，因此主設定檔始終可作為後備使用。目前尚不支持每個代理完全隔離的身分驗證。

## 公告

子代理通過公告步驟回報：

- 公告步驟在子代理會話內部執行（而不是請求者會話）。
- 如果子代理完全回覆 `ANNOUNCE_SKIP`，則不會發布任何內容。
- 否則，交付取決於請求者的深度：
  - 頂層請求者會話使用帶有外部交付（`deliver=true`）的後續 `agent` 呼叫
  - 嵌套請求者子代理會話接收內部後續注入（`deliver=false`），以便協調器可以在會話內合成子代理結果
  - 如果巢狀請求者子代理階段已經消失，OpenClaw 會在可用時回退至該階段的請求者
- 在建立巢狀完成結果時，子完成聚合的範圍限制在當前請求者執行，以防止過時的先前執行子輸出洩漏到當前的公告中。
- 當通道配接器可用時，公告回覆會保留執行緒/主題路由。
- 公告內容會被正規化為一個穩定的內部事件區塊：
  - 來源 (`subagent` 或 `cron`)
  - 子階段金鑰/ID
  - 公告類型 + 任務標籤
  - 從執行時結果衍生的狀態行 (`success`、`error`、`timeout` 或 `unknown`)
  - 來自公告步驟的結果內容 (如果缺失則為 `(no output)`)
  - 描述何時回覆與保持沈默的後續指令
- `Status` 不是從模型輸出推斷而來；它來自執行時結果訊號。

公告載荷在末尾包含一個統計行 (即使被包裝時也一樣)：

- 執行時間 (例如 `runtime 5m12s`)
- Token 使用量 (輸入/輸出/總計)
- 當模型定價已設定時的估計成本 (`models.providers.*.models[].cost`)
- `sessionKey`、`sessionId` 和文字記錄路徑 (以便主要代理可以透過 `sessions_history` 取得歷史記錄或在磁碟上檢查檔案)
- 內部中繼資料僅供編排使用；面向使用者的回覆應以正常的助理語氣重寫。

## 工具原則 (子代理工具)

預設情況下，子代理會獲得**除階段工具以外的所有工具**和系統工具：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

當 `maxSpawnDepth >= 2` 時，深度 1 編排器子代理還會收到 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它們管理其子代理。

透過設定覆寫：

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1,
      },
    },
  },
  tools: {
    subagents: {
      tools: {
        // deny wins
        deny: ["gateway", "cron"],
        // if allow is set, it becomes allow-only (deny still wins)
        // allow: ["read", "exec", "process"]
      },
    },
  },
}
```

## 並行處理

子代理使用專用的處理程序內佇列通道：

- 通道名稱：`subagent`
- 併發性：`agents.defaults.subagents.maxConcurrent`（預設 `8`）

## 停止

- 在請求者聊天中傳送 `/stop` 會中止請求者階段並停止由其產生的任何現有子代理執行，並級聯至巢狀子項。
- `/subagents kill <id>` 會停止特定的子代理並級聯至其子項。

## 限制

- 子代理公告為**盡力而為**。如果閘道重新啟動，待處理的「公告回來」工作將會遺失。
- 子代理仍然共享相同的閘道程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 總是非阻塞的：它會立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文僅注入 `AGENTS.md` + `TOOLS.md`（沒有 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。對於大多數使用案例，建議深度為 2。
- `maxChildrenPerAgent` 限制了每個階段的現有子項數量（預設：5，範圍：1–20）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
