---
summary: "Sub-agents：產生獨立的代理執行，並將結果公布回請求者聊天"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sub-Agents"
---

# Sub-agents

Sub-agents 是由現有代理執行產生的背景代理執行。它們在自己的 session (`agent:<agentId>:subagent:<uuid>`) 中執行，並在完成時將結果**公布**回請求者聊天頻道。

## Slash command

使用 `/subagents` 來檢查或控制**目前 session** 的 sub-agent 執行：

- `/subagents list`
- `/subagents kill <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`
- `/subagents steer <id|#> <message>`
- `/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]`

Thread 綁定控制：

這些指令適用於支援持續性 thread 綁定的頻道。請參閱下方的 **Thread supporting channels**。

- `/focus <subagent-label|session-key|session-id|session-label>`
- `/unfocus`
- `/agents`
- `/session idle <duration|off>`
- `/session max-age <duration|off>`

`/subagents info` 顯示執行元資料（狀態、時間戳記、session ID、紀錄路徑、清理）。

### Spawn 行為

`/subagents spawn` 啟動背景 sub-agent 作為使用者指令，而非內部中繼，並在執行完成時傳送一個最終完成更新回請求者聊天。

- spawn 指令是非阻斷的；它會立即傳回執行 ID。
- 完成時，sub-agent 會將摘要/結果訊息公布回請求者聊天頻道。
- 對於手動 spawn，傳遞具有韌性：
  - OpenClaw 會先嘗試直接的 `agent` 傳遞，並使用穩定的冪等金鑰。
  - 如果直接傳遞失敗，它會退回至佇列路由。
  - 如果佇列路由仍然無法使用，公布會在短暫的指數退避後重試，直到最終放棄。
- 傳遞至請求者 session 的完成交接是執行時期產生的內部內容（非使用者撰寫的文字），並包含：
  - `Result` (`assistant` 回覆文字，或如果助理回覆為空則為最新的 `toolResult`)
  - `Status` (`completed successfully` / `failed` / `timed out` / `unknown`)
  - 精簡的執行時間/Token 統計
  - 告知請求者代理以正常助理語氣重寫的傳送指令（而非轉發原始的內部元資料）
- `--model` 和 `--thinking` 會覆蓋該特定執行的預設值。
- 使用 `info`/`log` 在完成後檢視詳細資訊和輸出。
- `/subagents spawn` 是一次性模式 (`mode: "run"`)。對於持續性的綁定執行緒會話，請搭配 `thread: true` 和 `mode: "session"` 使用 `sessions_spawn`。
- 對於 ACP 擴展會話（Codex、Claude Code、Gemini CLI），請搭配 `runtime: "acp"` 使用 `sessions_spawn`，並參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

主要目標：

- 將「研究/長期任務/緩慢工具」的工作並行化，而不阻塞主要執行。
- 預設保持子代理隔離（會話隔離 + 可選沙盒）。
- 保持工具介面難以被誤用：子代理預設**不會**獲得會話工具。
- 支援可配置的巢狀深度以實現編排器模式。

成本提示：每個子代理都有其**獨立**的上下文和 Token 使用量。對於繁重或重複性的
任務，請為子代理設定較便宜的模型，並將主要代理保持在較高品質的模型上。
您可以透過 `agents.defaults.subagents.model` 或個別代理覆蓋來進行設定。

## 工具

使用 `sessions_spawn`：

- 啟動子代理執行 (`deliver: false`，全域通道： `subagent`)
- 然後執行公告步驟並將公告回覆發布至請求者聊天通道
- 預設模型：繼承呼叫者，除非您設定 `agents.defaults.subagents.model` (或每個代理 `agents.list[].subagents.model`)；明確的 `sessions_spawn.model` 仍然優先。
- 預設思考：繼承呼叫者，除非您設定 `agents.defaults.subagents.thinking` (或每個代理 `agents.list[].subagents.thinking`)；明確的 `sessions_spawn.thinking` 仍然優先。
- 預設執行逾時：如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 會在設定時使用 `agents.defaults.subagents.runTimeoutSeconds`；否則會退回至 `0`（無逾時）。

工具參數：

- `task`（必要）
- `label?`（選用）
- `agentId?`（選用；如果允許，則在另一個代理 ID 下產生）
- `model?`（選用；覆寫子代理模型；無效值會被跳過，且子代理會在預設模型上執行，並在工具結果中顯示警告）
- `thinking?`（選用；覆寫子代理執行的思考等級）
- `runTimeoutSeconds?`（設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`；設定時，子代理執行將在 N 秒後中止）
- `thread?`（預設 `false`；當 `true` 時，請求此子代理對話的通道執行緒綁定）
- `mode?`（`run|session`）
  - 預設為 `run`
  - 如果省略了 `thread: true` 和 `mode`，預設值會變成 `session`
  - `mode: "session"` 需要 `thread: true`
- `cleanup?`（`delete|keep`，預設 `keep`）
- `sandbox?`（`inherit|require`，預設 `inherit`；`require` 會拒絕產生，除非目標子執行環境是在沙盒中）
- `sessions_spawn` **不** 接受通道傳遞參數（`target`、`channel`、`to`、`threadId`、`replyTo`、`transport`）。若要進行傳遞，請從產生的執行中使用 `message`/`sessions_send`。

## 執行緒綁定對話

當為通道啟用執行緒綁定時，子代理可以保持綁定到某個執行緒，以便該執行緒中的後續使用者訊息繼續路由到同一個子代理對話。

### 支援執行緒的頻道

- Discord（目前唯一支援的頻道）：支援持久化的執行緒綁定子代理會議（`sessions_spawn` 搭配 `thread: true`）、手動執行緒控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`），以及適配器金鑰 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSubagentSessions`。

快速流程：

1. 使用 `thread: true` 透過 `sessions_spawn` 生成（可選擇搭配 `mode: "session"`）。
2. OpenClaw 會在作用中的頻道內建立或將執行緒綁定至該會議目標。
3. 該執行緒中的回覆與後續訊息會路由至已綁定的會議。
4. 使用 `/session idle` 來檢視/更新非自動聚焦設定，並使用 `/session max-age` 來控制硬性上限。
5. 使用 `/unfocus` 進行手動分離。

手動控制：

- `/focus <target>` 將目前的執行緒（或建立一個新的）綁定至子代理/會議目標。
- `/unfocus` 移除目前已綁定執行緒的綁定。
- `/agents` 列出正在執行的工作與綁定狀態（`thread:<id>` 或 `unbound`）。
- `/session idle` 和 `/session max-age` 僅適用於已聚焦的已綁定執行緒。

設定開關：

- 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`
- 頻道覆寫與生成自動綁定金鑰因適配器而異。請參閱上方的 **支援執行緒的頻道**。

請參閱 [Configuration Reference](/zh-Hant/gateway/configuration-reference) 和 [Slash commands](/zh-Hant/tools/slash-commands) 以了解目前的適配器詳細資訊。

允許清單：

- `agents.list[].subagents.allowAgents`：可透過 `agentId` 指定的代理 ID 列表（設為 `["*"]` 以允許任何代理）。預設值：僅限請求者代理。
- 沙箱繼承防護：如果請求者會話處於沙箱中，`sessions_spawn` 將拒絕會以非沙箱方式執行的目標。

探索：

- 使用 `agents_list` 查看目前允許 `sessions_spawn` 使用的代理程式 ID。

自動歸檔：

- 子代理程式會話會在 `agents.defaults.subagents.archiveAfterMinutes` 後自動歸檔（預設：60）。
- 歸檔會使用 `sessions.delete` 並將對話記錄重新命名為 `*.deleted.<timestamp>`（相同資料夾）。
- `cleanup: "delete"` 會在公告後立即歸檔（仍透過重新命名保留對話記錄）。
- 自動歸檔是盡力而為的；如果閘道重新啟動，擱置的計時器將會遺失。
- `runTimeoutSeconds` **不會**自動歸檔；它只會停止執行。會話會保留直到自動歸檔。
- 自動歸檔同樣適用於深度 1 和深度 2 的會話。

## 巢狀子代理程式

預設情況下，子代理程式無法產生自己的子代理程式 (`maxSpawnDepth: 1`)。您可以透過設定 `maxSpawnDepth: 2` 啟用一層巢狀結構，這允許 **協調器模式**：主程式 → 協調器子代理程式 → 工作者子子代理程式。

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

| 深度 | 會話金鑰形狀                                 | 角色                                | 可產生？                  |
| ---- | -------------------------------------------- | ----------------------------------- | ------------------------- |
| 0    | `agent:<id>:main`                            | 主代理程式                          | 始終                      |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理程式（允許深度 2 時為協調器） | 僅當 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理程式（葉節點工作者）        | 永不                      |

### 公告鏈

結果會沿鏈向上傳回：

1. 深度 2 工作者完成 → 向其父項（深度 1 協調器）公告
2. 深度 1 協調器接收公告，綜合結果，完成 → 向主程式公告
3. 主代理程式接收公告並傳遞給使用者

每個層級僅能查看來自其直接子項的公告。

### 依深度的工具政策

- 角色和控制範圍會在產生時寫入會該元資料中。這可防止扁平化或還原的會話金鑰意外重新獲得協調器權限。
- **深度 1（協調器，當 `maxSpawnDepth >= 2` 時）**：獲得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便管理其子級。其他會話/系統工具仍被拒絕。
- **深度 1（葉節點，當 `maxSpawnDepth == 1` 時）**：無會話工具（目前的預設行為）。
- **深度 2（葉節點工作器）**：無會話工具 —— `sessions_spawn` 在深度 2 處總是被拒絕。無法產生更多子級。

### 每個代理的產生限制

每個代理會話（在任何深度）一次最多可以有 `maxChildrenPerAgent`（預設：5）個活躍子級。這可以防止單一協調器出現失控的扇出。

### 層聯停止

停止深度 1 的協調器會自動停止其所有深度 2 的子級：

- 主聊天中的 `/stop` 會停止所有深度 1 的代理並層聯到其深度 2 的子級。
- `/subagents kill <id>` 會停止特定的子代理並層聯到其子級。
- `/subagents kill all` 會停止請求者的所有子代理並進行層聯。

## 驗證

子代理驗證是根據 **代理 ID** 解析的，而不是根據會話類型：

- 子代理會話金鑰是 `agent:<agentId>:subagent:<uuid>`。
- 驗證儲存庫是從該代理的 `agentDir` 載入的。
- 主代理的驗證設定檔會作為 **備用** 合併進來；發生衝突時，代理設定檔會覆寫主設定檔。

注意：此合併是累加的，因此主設定檔始終可作為備用。目前尚未支援每個代理完全獨立的驗證。

## 公告

子代理通過公告步驟回報：

- 公告步驟在子代理會話內執行（而不是在請求者會話內）。
- 如果子代理確切回覆 `ANNOUNCE_SKIP`，則不會發布任何內容。
- 否則傳遞取決於請求者深度：
  - 頂層請求者會話使用具有外部傳遞（`deliver=true`）的後續 `agent` 呼叫
  - 巢狀請求者子代理會話會接收內部後續注入（`deliver=false`），以便協調器可以在會話內綜合子級結果
  - 如果巢狀請求者子代理會話已消失，OpenClaw 會在可用時回退到該會話的請求者
- 在建置巢狀完成結果時，子完成聚合僅限於當前請求者執行，以防止過時的先前執行子輸出洩漏到當前公告中。
- 當通道配接器可用時，公告回覆會保留執行緒/主題路由。
- 公告上下文會標準化為穩定的內部事件區塊：
  - 來源 (`subagent` 或 `cron`)
  - 子會話金鑰/ID
  - 公告類型 + 任務標籤
  - 從執行時結果衍生的狀態列 (`success`, `error`, `timeout`, 或 `unknown`)
  - 來自公告步驟的結果內容（如果缺失則為 `(no output)`）
  - 描述何時回覆與保持靜默的後續指令
- `Status` 並非從模型輸出推斷；它來自執行時結果訊號。

公告載荷在結尾包含一個統計資訊列（即使被換行包裝）：

- 執行時間（例如 `runtime 5m12s`）
- Token 使用量（輸入/輸出/總計）
- 當設定模型定價時的預估成本 (`models.providers.*.models[].cost`)
- `sessionKey`, `sessionId`, 和文字記錄路徑（以便主代理可以透過 `sessions_history` 取得歷史記錄或檢查磁碟上的檔案）
- 內部中繼資料僅供協調使用；面向使用者的回覆應以正常的助手語氣重寫。

## 工具政策 (子代理工具)

預設情況下，子代理會獲得 **除會話工具以外的所有工具** 和系統工具：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

當 `maxSpawnDepth >= 2` 時，深度 1 的協調器子代理還會額外接收 `sessions_spawn`, `subagents`, `sessions_list`, 和 `sessions_history`，以便它們可以管理其子代理。

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

## 並行性

子代理使用專用的程序內佇列通道：

- 通道名稱： `subagent`
- 並發性：`agents.defaults.subagents.maxConcurrent`（預設 `8`）

## 停止

- 在請求者聊天中發送 `/stop` 會中止請求者工作階段，並停止由其產生的任何作用中子代理程式執行，這會串聯影響到巢狀子項。
- `/subagents kill <id>` 會停止特定的子代理程式，並串聯影響到其子項。

## 限制

- 子代理程式公告屬於**盡力而為**（best-effort）。如果閘道重新啟動，待處理的「回傳公告」工作將會遺失。
- 子代理程式仍然共用相同的閘道程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 始終為非封鎖式：它會立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理程式內容僅會注入 `AGENTS.md` + `TOOLS.md`（不包含 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。對於大多數使用案例，建議深度為 2。
- `maxChildrenPerAgent` 限制了每個工作階段的作用中子項數量（預設值：5，範圍：1–20）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
