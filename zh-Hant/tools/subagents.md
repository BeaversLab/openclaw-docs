---
summary: "Sub-agents: spawning isolated agent runs that announce results back to the requester chat"
read_when:
  - 您希望透過代理程式進行背景/平行工作
  - 您正在變更 sessions_spawn 或 sub-agent 工具原則
  - 您正在實作或疑難排解執行緒綁定的子代理程式工作階段
title: "Sub-Agents"
---

# 子代理程式

子代理程式是從現有代理程式執行衍生出來的背景代理程式執行。它們在自己的工作階段 (`agent:<agentId>:subagent:<uuid>`) 中執行，並在完成時將結果**公佈**回請求者聊天頻道。

## 斜線指令

使用 `/subagents` 來檢查或控制**目前工作階段**的子代理程式執行：

- `/subagents list`
- `/subagents kill <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`
- `/subagents steer <id|#> <message>`
- `/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]`

執行緒綁定控制：

這些指令適用於支援永久執行緒綁定的頻道。請參閱下方的**支援執行緒的頻道**。

- `/focus <subagent-label|session-key|session-id|session-label>`
- `/unfocus`
- `/agents`
- `/session idle <duration|off>`
- `/session max-age <duration|off>`

`/subagents info` 顯示執行中繼資料（狀態、時間戳記、工作階段 ID、文字記錄路徑、清除作業）。

### 衍生行為

`/subagents spawn` 會以使用者指令（而非內部中繼）的形式啟動背景子代理程式，並在執行完成時傳送一個最終完成更新回請求者聊天。

- 衍生指令是非阻斷式的；它會立即傳回執行 ID。
- 完成時，子代理程式會將摘要/結果訊息公佈回請求者聊天頻道。
- 對於手動衍生，傳送具有復原能力：
  - OpenClaw 會先嘗試使用穩定的冪等金鑰進行直接 `agent` 傳送。
  - 如果直接傳送失敗，它會退回到佇列路由。
  - 如果佇列路由仍然無法使用，系統會在最終放棄前以短暫的指數退避重試公佈。
- 給請求者工作階段的完成移轉是執行階段產生的內部內容（非使用者撰寫的文字），並包含：
  - `Result` (`assistant` 回覆文字，或如果助理回覆為空則為最新的 `toolResult`)
  - `Status` (`completed successfully` / `failed` / `timed out` / `unknown`)
  - 簡潔的執行時間/Token 統計
  - 一個傳送指令，告訴請求者代理以正常的助理語氣重寫（而不是轉發原始的內部元資料）
- `--model` 和 `--thinking` 會覆蓋該特定執行的預設值。
- 使用 `info`/`log` 在完成後檢查詳細資訊和輸出。
- `/subagents spawn` 是一次性模式 (`mode: "run"`)。對於持久化綁定執行緒的對話，請使用 `sessions_spawn` 搭配 `thread: true` 和 `mode: "session"`。
- 對於 ACP 線束對話 (Codex、Claude Code、Gemini CLI)，請使用 `sessions_spawn` 搭配 `runtime: "acp"` 並參閱 [ACP Agents](/zh-Hant/tools/acp-agents)。

主要目標：

- 並行處理「研究 / 長任務 / 緩慢工具」的工作，而不會阻塞主要執行。
- 預設情況下將子代理保持隔離（對話分離 + 可選的沙箱機制）。
- 讓工具介面難以被誤用：子代理預設情況下**不會**獲得對話工具。
- 支援可配置的巢狀深度，以實現編排器模式。

成本提示：每個子代理都有其**獨立**的上下文和 Token 使用量。對於繁重或重複的任務，請為子代理設定較便宜的模型，並將您的主要代理保持在較高品質的模型上。您可以透過 `agents.defaults.subagents.model` 或個別代理覆蓋進行配置。

## 工具

使用 `sessions_spawn`：

- 啟動子代理執行 (`deliver: false`，全域通道：`subagent`)
- 然後執行公告步驟，並將公告回覆發佈到請求者的對話頻道
- 預設模型：繼承呼叫者，除非您設定了 `agents.defaults.subagents.model` (或每個代理的 `agents.list[].subagents.model`)；明確的 `sessions_spawn.model` 仍然優先。
- 預設思考：繼承呼叫者，除非您設定了 `agents.defaults.subagents.thinking` (或是個別代理的 `agents.list[].subagents.thinking`)；明確的 `sessions_spawn.thinking` 仍然優先。
- 預設執行逾時：如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 會在設定時使用 `agents.defaults.subagents.runTimeoutSeconds`；否則會回退到 `0` (無逾時)。

工具參數：

- `task` (必要)
- `label?` (選用)
- `agentId?` (選用；如果允許，在另一個代理 ID 下生成)
- `model?` (選用；覆寫子代理模型；無效值會被跳過，子代理會在預設模型上執行，並在工具結果中顯示警告)
- `thinking?` (選用；覆寫子代理執行的思考層級)
- `runTimeoutSeconds?` (設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`；設定後，子代理執行將在 N 秒後中止)
- `thread?` (預設 `false`；當 `true` 時，請求此子代理工作階段的通道執行緒綁定)
- `mode?` (`run|session`)
  - 預設為 `run`
  - 如果省略了 `thread: true` 和 `mode`，預設值會變成 `session`
  - `mode: "session"` 需要 `thread: true`
- `cleanup?` (`delete|keep`，預設 `keep`)
- `sandbox?` (`inherit|require`，預設 `inherit`；`require` 會拒絕生成，除非目標子執行環境已沙盒化)
- `sessions_spawn` **不**接受頻道傳遞參數（`target`、`channel`、`to`、`threadId`、`replyTo`、`transport`）。若要進行傳遞，請使用產生的執行個體中的 `message`/`sessions_send`。

## 執行緒繫結階段

當為頻道啟用執行緒繫結時，子代理可以保持繫結到執行緒，以便該執行緒中的後續使用者訊息繼續路由至同一個子代理階段。

### 支援執行緒的頻道

- Discord（目前唯一支援的頻道）：支援持久化的執行緒繫結子代理階段（`sessions_spawn` 搭配 `thread: true`）、手動執行緒控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`），以及配接器金鑰 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSubagentSessions`。

快速流程：

1. 使用 `sessions_spawn` 並透過 `thread: true` 產生（可選擇性搭配 `mode: "session"`）。
2. OpenClaw 會在作用中頻道內建立或將執行緒繫結至該階段目標。
3. 該執行緒中的回覆和後續訊息會路由至繫結的階段。
4. 使用 `/session idle` 來檢視/更新非活動自動取消聚焦，並使用 `/session max-age` 來控制硬性上限。
5. 使用 `/unfocus` 手動分離。

手動控制：

- `/focus <target>` 會將目前的執行緒（或建立一個）繫結至子代理/階段目標。
- `/unfocus` 會移除目前繫結執行緒的繫結。
- `/agents` 會列出執行中的個體和繫結狀態（`thread:<id>` 或 `unbound`）。
- `/session idle` 和 `/session max-age` 僅適用於已聚焦的繫結執行緒。

設定開關：

- 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`
- 通道覆寫和生成自動綁定金鑰取決於配接器。請參閱上方的 **支援執行緒的通道**。

請參閱 [Configuration Reference](/zh-Hant/gateway/configuration-reference) 和 [Slash commands](/zh-Hant/tools/slash-commands) 以了解目前配接器的詳細資訊。

允許清單：

- `agents.list[].subagents.allowAgents`：可透過 `agentId` 指定的代理程式 ID 清單（`["*"]` 表示允許任何項目）。預設值：僅限請求者代理程式。
- 沙盒繼承防護：如果請求者會話位於沙盒中，`sessions_spawn` 會拒絕將以非沙盒模式執行的目標。

探索：

- 使用 `agents_list` 來查看目前哪些代理程式 ID 是 `sessions_spawn` 所允許的。

自動封存：

- 子代理程式會話會在 `agents.defaults.subagents.archiveAfterMinutes` 之後自動封存（預設值：60）。
- 封存會使用 `sessions.delete` 並將文字紀錄重新命名為 `*.deleted.<timestamp>`（相同資料夾）。
- `cleanup: "delete"` 會在宣佈之後立即封存（仍然會透過重新命名保留文字紀錄）。
- 自動封存為盡力而為；如果閘道重新啟動，擱置中的計時器將會遺失。
- `runTimeoutSeconds` **不會**自動封存；它只會停止執行。該會話會一直保留直到自動封存為止。
- 自動封存同樣適用於深度 1 和深度 2 的會話。

## 巢狀子代理程式

預設情況下，子代理程式無法生成自己的子代理程式（`maxSpawnDepth: 1`）。您可以透過設定 `maxSpawnDepth: 2` 來啟用一層巢狀結構，這允許 **編排器模式**：主代理程式 → 編排器子代理程式 → 背景子子代理程式。

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

| 深度 | 會話金鑰形狀                                 | 角色                                | 可以生成？                   |
| ---- | -------------------------------------------- | ----------------------------------- | ---------------------------- |
| 0    | `agent:<id>:main`                            | 主代理程式                          | 永遠                         |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理程式（允許深度 2 時的編排器） | 僅限 `maxSpawnDepth >= 2` 時 |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理程式 (葉背景)               | 永不                         |

### 宣佈鏈

結果會沿著鏈條向上傳回：

1. 深度 2 的工作者完成 → 向其父級（深度 1 協調器）宣告
2. 深度 1 的協調器接收宣告，綜合結果，完成 → 向主體宣告
3. 主體代理接收宣告並傳送給使用者

每個層級僅能看到來自其直接子節點的宣告。

### 依深度的工具政策

- 角色和控制範圍在產生時寫入會話元資料。這可防止扁平或還原的會話金鑰意外重新獲得協調器權限。
- **深度 1（協調器，當 `maxSpawnDepth >= 2` 時）**：獲得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history` 以便管理其子節點。其他會話/系統工具仍被拒絕。
- **深度 1（葉節點，當 `maxSpawnDepth == 1` 時）**：無會話工具（目前的預設行為）。
- **深度 2（葉節點工作者）**：無會話工具 — `sessions_spawn` 在深度 2 時總是被拒絕。無法產生更多子節點。

### 每個代理的產生限制

每個代理會話（在任何深度）一次最多只能有 `maxChildrenPerAgent`（預設值：5）個活躍子節點。這可防止單一協調器導致失控的擴散。

### 級聯停止

停止深度 1 的協調器會自動停止所有其深度 2 的子節點：

- 主聊天中的 `/stop` 會停止所有深度 1 的代理並級聯至其深度 2 的子節點。
- `/subagents kill <id>` 會停止特定的子代理並級聯至其子節點。
- `/subagents kill all` 會停止請求者的所有子代理並級聯。

## 驗證

子代理的驗證是由 **代理 id** 解析，而非由會話類型：

- 子代理會話金鑰為 `agent:<agentId>:subagent:<uuid>`。
- 驗證存儲是從該代理的 `agentDir` 載入。
- 主體代理的驗證設定檔會作為 **後備** 合併；代理設定檔會在衝突時覆蓋主體設定檔。

注意：此合併是加法性的，因此主體設定檔始終可作為後備使用。尚未支援每個代理的完全隔離驗證。

## 宣告

子代理透過宣告步驟回報：

- 宣告步驟在子代理會話內運行（而非請求者會話）。
- 如果子代理完全回覆 `ANNOUNCE_SKIP`，則不會張貼任何內容。
- 否則傳遞方式取決於請求者的深度：
  - 頂層請求者會話使用具有外部傳遞（`deliver=true`）的後續 `agent` 呼叫
  - 巢狀請求者子代理會話會收到內部後續注入（`deliver=false`），以便協調器可以在會話內綜合子結果
  - 如果巢狀請求者子代理會話已經消失，OpenClaw 會在可用時回退到該會話的請求者
- 在建構巢狀完成發現時，子完成聚合範圍限於當前請求者執行，以防止過期的先前執行子輸出洩漏到當前公告中。
- 當通道配接器可用時，公告回覆會保留執行緒/主題路由。
- 公告上下文會被正規化為一個穩定的內部事件區塊：
  - 來源（`subagent` 或 `cron`）
  - 子會話金鑰/ID
  - 公告類型 + 任務標籤
  - 從執行時結果衍生的狀態行（`success`、`error`、`timeout` 或 `unknown`）
  - 來自公告步驟的結果內容（如果缺少則為 `(no output)`）
  - 描述何時回覆與保持沈默的後續指示
- `Status` 不是從模型輸出推斷的；它來自執行時結果訊號。

公告載荷在末尾包含一個統計行（即使被包裝）：

- 執行時間（例如 `runtime 5m12s`）
- Token 使用量（輸入/輸出/總計）
- 設定模型定價時的估計成本（`models.providers.*.models[].cost`）
- `sessionKey`、`sessionId` 和文字記錄路徑（以便主代理可以透過 `sessions_history` 獲取歷史記錄或檢查磁碟上的檔案）
- 內部元資料僅供協調使用；面向使用者的回覆應以正常的助理語氣重寫。

## 工具政策（子代理工具）

預設情況下，子代理會獲得**所有工具，但會話工具**和系統工具除外：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

當 `maxSpawnDepth >= 2` 時，深度為 1 的協調器子代理還會接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便管理其子代理。

透過配置覆寫：

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

- 在請求者對話中傳送 `/stop` 會中止請求者工作階段，並停止由其產生的所有作用中子代理執行，並級聯至巢狀子代理。
- `/subagents kill <id>` 會停止特定的子代理並級聯至其子代理。

## 限制

- 子代理公告採用**盡力而為 (best-effort)** 機制。如果閘道重新啟動，待處理的「公告回報」工作將會遺失。
- 子代理仍然共用相同的閘道程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 始終是非阻塞的：它會立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文僅注入 `AGENTS.md` + `TOOLS.md`（不包含 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。對於大多數使用案例，建議使用深度 2。
- `maxChildrenPerAgent` 限制了每個工作階段的作用中子代理數量（預設值：5，範圍：1–20）。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
