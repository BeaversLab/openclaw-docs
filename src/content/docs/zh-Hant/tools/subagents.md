---
summary: "子代理：產生獨立的代理執行，並將結果公告回請求者聊天"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
---

# 子代理

子代理是從現有代理執行產生的背景代理執行。它們在自己的階段 (`agent:<agentId>:subagent:<uuid>`) 中執行，並在完成時將結果**公告**回請求者聊天頻道。

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
- 對於 ACP 指令碼階段（Codex、Claude Code、Gemini CLI），請搭配 `runtime: "acp"` 使用 `sessions_spawn`，並參閱 [ACP Agents](/en/tools/acp-agents)。

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

請參閱[設定參考](/en/gateway/configuration-reference)和 [斜線指令](/en/tools/slash-commands)以了解目前的配接器詳細資訊。

允許清單：

- `agents.list[].subagents.allowAgents`：可透過 `agentId` 鎖定的代理程式 ID 清單（`["*"]` 表示允許任何程式）。預設值：僅限請求者代理程式。
- 沙盒繼承防護：如果請求者的會話位於沙盒中，`sessions_spawn` 會拒絕以非沙盒模式執行的目標。

探索：

- 使用 `agents_list` 來查看目前哪些 agent ID 被 `sessions_spawn` 允許。

自動歸檔：

- 子代理會話會在 `agents.defaults.subagents.archiveAfterMinutes` 之後自動歸檔（預設：60）。
- 歸檔使用 `sessions.delete` 並將對話紀錄重新命名為 `*.deleted.<timestamp>`（同一資料夾）。
- `cleanup: "delete"` 會在宣佈後立即歸檔（仍然透過重新命名保留對話紀錄）。
- 自動歸檔為盡力而為；如果閘道重新啟動，待處理的計時器將會遺失。
- `runTimeoutSeconds` **不會** 自動歸檔；它只會停止執行。會話會保留直到自動歸檔。
- 自動歸檔同樣適用於深度 1 和深度 2 的會話。

## 巢狀子代理

預設情況下，子代理無法生成自己的子代理（`maxSpawnDepth: 1`）。您可以透過設定 `maxSpawnDepth: 2` 來啟用一層巢狀，這允許 **編排器模式**：主代理 → 編排器子代理 → 工作者子子代理。

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

| 深度 | 會話金鑰形狀                                 | 角色                              | 可生成？                  |
| ---- | -------------------------------------------- | --------------------------------- | ------------------------- |
| 0    | `agent:<id>:main`                            | 主代理                            | 始終                      |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理（當允許深度 2 時為編排器） | 僅限 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（葉工作者）              | 永不                      |

### 宣佈鏈

結果會沿著鏈向上回傳：

1. 深度 2 工作者完成 → 向其父層（深度 1 編排器）宣佈
2. 深度 1 編排器接收宣佈，綜合結果，完成 → 向主代理宣佈
3. 主代理接收宣佈並交付給使用者

每個層級只能看到其直屬子層級的宣佈。

### 依深度的工具政策

- 角色和控制範圍會在生成時寫入會詐詮詮中。這可以防止扁平化還原的會詐金鑰意外重新獲得編排器權限。
- **深度 1 (協調器，當 `maxSpawnDepth >= 2` 時)**：獲得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history` 以便管理其子代理。其他會話/系統工具仍被拒絕。
- **深度 1 (葉節點，當 `maxSpawnDepth == 1` 時)**：沒有會話工具 (目前為預設行為)。
- **深度 2 (葉節點工作器)**：沒有會話工具 — `sessions_spawn` 在深度 2 總是被拒絕。無法產生更多子代理。

### 每個代理的產生限制

每個代理會話 (在任何深度) 一次最多只能有 `maxChildrenPerAgent` (預設：5) 個活躍子代理。這可防止單一協調器失控擴散。

### 級聯停止

停止深度 1 的協調器會自動停止其所有深度 2 的子代理：

- 在主聊天中的 `/stop` 會停止所有深度 1 的代理，並級聯停止其深度 2 的子代理。
- `/subagents kill <id>` 會停止特定的子代理，並級聯停止其子代理。
- `/subagents kill all` 會停止請求者的所有子代理，並進行級聯。

## 身份驗證

子代理的身份驗證是根據 **代理 ID** 解析，而非根據會話類型：

- 子代理會話金鑰為 `agent:<agentId>:subagent:<uuid>`。
- 身份驗證存儲是從該代理的 `agentDir` 載入的。
- 主代理的身份驗證配置檔會作為 **備用** 合併進來；發生衝突時，代理配置檔會覆蓋主配置檔。

注意：此合併是累加的，因此主配置檔始終可作為備用使用。目前尚未支援每個代理的完全隔離身份驗證。

## 公告

子代理透過公告步驟回報：

- 公告步驟在子代理會話內執行 (而非請求者會話)。
- 如果子代理完全回覆 `ANNOUNCE_SKIP`，則不會發布任何內容。
- 否則傳遞取決於請求者深度：
  - 頂層請求者會話使用具有外部傳遞 的後續 `agent` 呼叫 (`deliver=true`)
  - 巢狀請求者子代理會話會接收內部後續注入 (`deliver=false`)，以便協調器可以在會話內綜合子代理結果
  - 如果巢狀請求者子代理工作階段已消失，OpenClaw 會在可用時回退至該工作階段的請求者
- 在建立巢狀完成發現時，子完成聚合的範圍僅限於當前的請求者執行，以防止陳舊的先前執行子輸出洩漏到當前的公告中。
- 當通道配接器可用時，公告回覆會保留執行緒/主題路由。
- 公告上下文被正規化為一個穩定的內部事件區塊：
  - 來源 (`subagent` 或 `cron`)
  - 子工作階段金鑰/ID
  - 公告類型 + 任務標籤
  - 衍生自執行時結果的狀態行 (`success`、`error`、`timeout` 或 `unknown`)
  - 來自公告步驟的結果內容（如果缺失則為 `(no output)`）
  - 描述何時回覆與保持沈默的後續指令
- `Status` 不是從模型輸出推斷而來的；它來自執行時結果訊號。

公告承載在最後包含一個統計行（即使被包裝）：

- 執行時間（例如 `runtime 5m12s`）
- Token 使用量（輸入/輸出/總計）
- 當配置模型定價時的估計成本 (`models.providers.*.models[].cost`)
- `sessionKey`、`sessionId` 和文字記錄路徑（以便主代理可以透過 `sessions_history` 獲取歷史記錄或在磁碟上檢查檔案）
- 內部中繼資料僅用於編排；面向使用者的回覆應以一般助理語氣重寫。

## 工具政策 (子代理工具)

根據預設，子代理會獲得 **除工作階段工具外的所有工具** 和系統工具：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

當 `maxSpawnDepth >= 2` 時，深度 1 編排器子代理還會接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它們管理其子代理。

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

- 在請求者聊天中發送 `/stop` 會中止請求者階段並停止由其產生的任何作用中子代理執行，並級聯至巢狀子項。
- `/subagents kill <id>` 會停止特定子代理並級聯至其子項。

## 限制

- 子代理公告採用 **盡力而為** 機制。如果閘道重新啟動，待處理的「回傳公告」工作將會遺失。
- 子代理仍然共用相同的閘道處理程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 始終為非阻斷式：它會立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理內容僅注入 `AGENTS.md` + `TOOLS.md`（無 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。對於大多數使用情況，建議使用深度 2。
- `maxChildrenPerAgent` 限制每個階段的作用中子項數量（預設：5，範圍：1–20）。
