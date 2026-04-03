---
summary: "子代理：產生獨立的代理執行，並將結果公告回請求者聊天"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
---

# 子代理

Sub-agents 是從現有 agent 執行中產生的背景 agent 執行。它們在自己的 session (`agent:<agentId>:subagent:<uuid>`) 中執行，完成後會將結果**宣佈** (announce) 回傳給請求的聊天頻道。每個 sub-agent 執行都會被追蹤為一個 [background task](/en/automation/tasks)。

## 斜線指令

使用 `/subagents` 來檢查或控制**目前階段**的子代理執行：

- `/subagents list`
- `/subagents kill <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`
- `/subagents steer <id|#> <message>`
- `/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]`

執行緒綁定控制：

這些指令適用於支援持久執行緒綁定的頻道。請參閱下方的**支援執行緒的頻道**。

- `/focus <subagent-label|session-key|session-id|session-label>`
- `/unfocus`
- `/agents`
- `/session idle <duration|off>`
- `/session max-age <duration|off>`

`/subagents info` 顯示執行中繼資料（狀態、時間戳、階段 ID、文字記錄路徑、清理）。

### 產生行為

`/subagents spawn` 作為使用者指令（而非內部中繼）啟動背景子代理，並在執行完成時發送一個最終完成更新回請求者聊天。

- 產生指令是非阻斷式的；它會立即傳回執行 ID。
- 完成時，子代理會將摘要/結果訊息公告回請求者聊天頻道。
- 對於手動產生，傳遞具有恢復力：
  - OpenClaw 首先會嘗試使用穩定的等冪性金鑰直接進行 `agent` 傳遞。
  - 如果直接傳遞失敗，則會退回至佇列路由。
  - 如果佇列路由仍無法使用，則在最終放棄前，會以短暫的指數退避重試公告。
- 移交給請求者階段的完成內容是執行時期產生的內部上下文（非使用者撰寫的文字），並包括：
  - `Result` (`assistant` 回覆文字，或如果助理回覆為空則為最新的 `toolResult`)
  - `Status` (`completed successfully` / `failed` / `timed out` / `unknown`)
  - 精簡的執行時間/Token 統計
  - 一項傳遞指示，告知請求代理以正常的助手語氣重寫（不轉發原始的內部元資料）
- `--model` 和 `--thinking` 會覆寫該特定執行的預設值。
- 使用 `info`/`log` 來檢查完成後的細節與輸出。
- `/subagents spawn` 是單次模式 (`mode: "run"`)。對於持久化的執行緒綁定階段，請搭配 `thread: true` 和 `mode: "session"` 使用 `sessions_spawn`。
- 對於 ACP harness session (Codex, Claude Code, Gemini CLI)，請使用帶有 `runtime: "acp"` 的 `sessions_spawn`，並參閱 [ACP Agents](/en/tools/acp-agents)。

主要目標：

- 「研究/長期任務/緩慢工具」工作的並行化，不會阻擋主執行。
- 預設保持子代理的隔離（階段分離 + 選用沙箱）。
- 讓工具介面難以被誤用：子代理預設**不**會取得階段工具。
- 支援可配置的巢狀深度，以適應協調器模式。

成本注意事項：每個子代理都有其**自己的**語境和 Token 使用量。對於繁重或重複的任務，請為子代理設定較便宜的模型，並將主要代理保持在較高品質的模型上。您可以透過 `agents.defaults.subagents.model` 或各代理的覆寫來設定此項。

## 工具

使用 `sessions_spawn`：

- 啟動子代理執行 (`deliver: false`，全域通道：`subagent`)
- 然後執行宣佈步驟，並將宣佈回覆發佈至請求的聊天頻道
- 預設模型：繼承呼叫者，除非您設定了 `agents.defaults.subagents.model`（或各代理的 `agents.list[].subagents.model`）；明確的 `sessions_spawn.model` 仍然優先。
- 預設思考：繼承呼叫者，除非您設定了 `agents.defaults.subagents.thinking`（或各代理的 `agents.list[].subagents.thinking`）；明確的 `sessions_spawn.thinking` 仍然優先。
- 預設執行逾時：如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 會使用設定的 `agents.defaults.subagents.runTimeoutSeconds`；否則會回退到 `0`（無逾時）。

工具參數：

- `task`（必要）
- `label?`（選用）
- `agentId?`（選用；如果允許，則在另一個代理 ID 下生成）
- `model?`（選用；覆蓋子代理模型；無效值會被跳過，且子代理會在預設模型上執行，並在工具結果中顯示警告）
- `thinking?`（選用；覆寫子代理執行的思考層級）
- `runTimeoutSeconds?`（設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`；設定後，子代理執行將在 N 秒後中止）
- `thread?`（預設 `false`；當為 `true` 時，請求為此子代理工作階段進行頻道執行緒綁定）
- `mode?` (`run|session`)
  - 預設為 `run`
  - 如果省略了 `thread: true` 和 `mode`，預設值會變成 `session`
  - `mode: "session"` 需要 `thread: true`
- `cleanup?` (`delete|keep`，預設 `keep`)
- `sandbox?` (`inherit|require`，預設 `inherit`；`require` 會拒絕生成，除非目標子執行環境是在沙箱中)
- `sessions_spawn` **不** 接受頻道傳遞參數 (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`)。若要進行傳遞，請從生成的執行中使用 `message`/`sessions_send`。

## 執行緒綁定工作階段

當為頻道啟用執行緒綁定時，子代理可以保持綁定到執行緒，以便該執行緒中的後續使用者訊息繼續路由到同一個子代理工作階段。

### 支援執行緒的頻道

- Discord（目前唯一支援的頻道）：支援持久化的執行緒綁定子代理程式會話（`sessions_spawn` 搭配 `thread: true`）、手動執行緒控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`），以及配接器金鑰 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSubagentSessions`。

快速流程：

1. 使用 `thread: true` 透過 `sessions_spawn` 產生（可選搭配 `mode: "session"`）。
2. OpenClaw 會在目前頻道中建立或將執行緒綁定至該會話目標。
3. 該執行緒中的回覆與後續訊息會路由至已綁定的會話。
4. 使用 `/session idle` 檢查/更新閒置自動取消聚焦，並使用 `/session max-age` 控制硬性上限。
5. 使用 `/unfocus` 手動分離。

手動控制：

- `/focus <target>` 將目前執行緒（或建立一個）綁定至子代理程式/會話目標。
- `/unfocus` 移除目前已綁定執行緒的綁定。
- `/agents` 列出活躍執行與綁定狀態（`thread:<id>` 或 `unbound`）。
- `/session idle` 和 `/session max-age` 僅適用於已聚焦的已綁定執行緒。

設定開關：

- 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`
- 頻道覆寫和產生自動綁定金鑰依配接器而定。請參閱上方的 **支援執行緒的頻道**。

請參閱 [Configuration Reference](/en/gateway/configuration-reference) 和 [Slash commands](/en/tools/slash-commands) 以了解目前的 adapter 詳細資訊。

允許清單：

- `agents.list[].subagents.allowAgents`：可透過 `agentId` 鎖定的代理程式 ID 清單（`["*"]` 表示允許任何程式）。預設值：僅限請求者代理程式。
- 沙盒繼承防護：如果請求者的會話位於沙盒中，`sessions_spawn` 會拒絕以非沙盒模式執行的目標。
- `agents.defaults.subagents.requireAgentId` / `agents.list[].subagents.requireAgentId`：當為 true 時，封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確選擇 profile）。預設值：false。

探索：

- 使用 `agents_list` 來查看目前允許用於 `sessions_spawn` 的 agent id。

自動歸檔：

- Sub-agent session 會在 `agents.defaults.subagents.archiveAfterMinutes` 後自動歸檔（預設值：60）。
- 歸檔使用 `sessions.delete` 並將逐字稿重新命名為 `*.deleted.<timestamp>`（相同資料夾）。
- `cleanup: "delete"` 會在宣佈後立即歸檔（仍會透過重新命名保留逐字稿）。
- 自動歸檔僅為盡力而為；如果 gateway 重新啟動，擱置的計時器將會遺失。
- `runTimeoutSeconds` **不會**自動歸檔；它僅停止執行。Session 會一直保留直到自動歸檔。
- 自動歸檔同樣適用於深度 1 和深度 2 的 session。

## 巢狀 Sub-Agents

預設情況下，sub-agents 無法產生自己的 sub-agents (`maxSpawnDepth: 1`)。您可以透過設定 `maxSpawnDepth: 2` 來啟用一層巢狀結構，這允許**協調器模式** (orchestrator pattern)：main → orchestrator sub-agent → worker sub-sub-agents。

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

| 深度 | Session key 形狀                             | 角色                              | 可產生？                  |
| ---- | -------------------------------------------- | --------------------------------- | ------------------------- |
| 0    | `agent:<id>:main`                            | Main agent                        | 總是                      |
| 1    | `agent:<id>:subagent:<uuid>`                 | Sub-agent (允許深度 2 時的協調器) | 僅當 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（葉節點工作器）          | 永不                      |

### 公告鏈

結果沿鏈條向上流動：

1. 深度 2 的工作器完成 → 向其父級（深度 1 編排器）公告
2. 深度 1 的編排器接收公告，綜合結果，完成 → 向主代理公告
3. 主代理接收公告並傳送給使用者

每個層級僅能看到其直接子級的公告。

### 基於深度的工具策略

- 角色和控制範圍在生成時寫入會話元數據。這可防止扁平化或還原的會話金鑰意外重新獲得編排器權限。
- **深度 1（編排器，當 `maxSpawnDepth >= 2` 時）**：獲得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便管理其子級。其他會話/系統工具仍被拒絕。
- **深度 1（葉節點，當 `maxSpawnDepth == 1` 時）**：無會話工具（目前的預設行為）。
- **深度 2（葉節點工作器）**：無會話工具 — `sessions_spawn` 在深度 2 總是被拒絕。無法生成更多子級。

### 每個代理的生成限制

每個代理會話（在任何深度）一次最多只能有 `maxChildrenPerAgent`（預設：5）個活動子級。這可以防止單個編排器出現失控的擴散。

### 級聯停止

停止深度 1 的編排器會自動停止其所有深度 2 的子級：

- 主聊天中的 `/stop` 會停止所有深度 1 的代理，並級聯到其深度 2 的子級。
- `/subagents kill <id>` 會停止特定的子代理，並級聯到其子級。
- `/subagents kill all` 會停止請求者的所有子代理並進行級聯。

## 驗證

子代理驗證由 **代理 ID** 解析，而非由會話類型解析：

- 子代理會話金鑰是 `agent:<agentId>:subagent:<uuid>`。
- 驗證存儲是從該代理的 `agentDir` 載入的。
- 主代理的驗證配置檔案會作為 **後備** 合併進來；衝突時代理配置檔案會覆蓋主配置檔案。

注意：此合併是累加的，因此主配置檔案始終可作為後備使用。尚不支援每個代理的完全隔離驗證。

## 公告

子代理通過公告步驟報回：

- 公告步驟在子代理會話內部執行（而非請求者會話）。
- 如果子代理完全回覆 `ANNOUNCE_SKIP`，則不會發佈任何內容。
- 否則傳遞取決於請求者的深度：
  - 頂層請求者會話使用具有外部傳遞 (`deliver=true`) 的後續 `agent` 呼叫
  - 嵌套請求者子代理會話會接收內部後續注入 (`deliver=false`)，以便協調器可以在會話內合成子結果
  - 如果嵌套請求者子代理會話已消失，OpenClaw 會在可用時回退到該會話的請求者
- 在構建嵌套完成發現時，子完成聚合的範圍限制在當前請求者運行，從而防止過時的先前運行子輸出洩漏到當前公告中。
- 當通道配接器可用時，公告回覆會保留執行緒/主題路由。
- 公告上下文被標準化為穩定的內部事件區塊：
  - 來源 (`subagent` 或 `cron`)
  - 子會話金鑰/ID
  - 公告類型 + 任務標籤
  - 從運行時結果衍生的狀態行 (`success`、`error`、`timeout` 或 `unknown`)
  - 來自公告步驟的結果內容（如果缺失則為 `(no output)`）
  - 描述何時回覆與保持沈默的後續指令
- `Status` 不是從模型輸出推斷出來的；它來自運行時結果信號。

公告負載在末尾包含統計行（即使被包裝）：

- 運行時（例如 `runtime 5m12s`）
- Token 使用量（輸入/輸出/總計）
- 配置模型定價時的預估成本 (`models.providers.*.models[].cost`)
- `sessionKey`、`sessionId` 和文稿路徑（以便主代理可以通過 `sessions_history` 獲取歷史記錄或檢查磁盤上的文件）
- 內部元資料僅用於編排；面向用戶的回覆應以正常的助手語氣重寫。

## 工具策略（子代理工具）

默認情況下，子代理獲得 **除會話工具和系統工具外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

當 `maxSpawnDepth >= 2` 時，深度 1 的編排子代理額外接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它們管理其子代。

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

- 通道名稱：`subagent`
- 並行性：`agents.defaults.subagents.maxConcurrent`（預設 `8`）

## 停止

- 在請求者聊天中發送 `/stop` 會中止請求者會話並停止由其產生的任何作用中的子代理運行，並級聯至巢狀子代。
- `/subagents kill <id>` 停止特定的子代理並級聯至其子代。

## 限制

- 子代理公告採用**盡力而為**（best-effort）機制。如果閘道重新啟動，擱置中的「公告回報」工作將會遺失。
- 子代理仍共享相同的閘道程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 始終是非阻塞的：它會立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文僅注入 `AGENTS.md` + `TOOLS.md`（無 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。大多數使用情況建議使用深度 2。
- `maxChildrenPerAgent` 限制每個會話的作用中子代數量（預設：5，範圍：1–20）。
