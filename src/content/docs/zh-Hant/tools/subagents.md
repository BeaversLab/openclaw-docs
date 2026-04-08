---
summary: "子代理：產生獨立的代理執行，並將結果公告回請求者聊天"
read_when:
  - You want background/parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
---

# 子代理

Sub-agents 是從現有 agent 執行中衍生出的背景 agent 執行。它們在自己的 session (`agent:<agentId>:subagent:<uuid>`) 中運行，並在完成時將結果**公告**（announce）回傳給請求者的聊天頻道。每個 sub-agent 執行都會被追蹤為 [背景任務](/en/automation/tasks)。

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

`/subagents info` 顯示執行中繼資料（狀態、時間戳、session ID、逐字稿路徑、清理資訊）。
當您需要受限且經過安全過濾的回顧檢視時，請使用 `sessions_history`；當您需要原始完整逐字稿時，請檢查磁碟上的逐字稿路徑。

### 產生行為

`/subagents spawn` 作為使用者指令（而非內部中繼）啟動背景 sub-agent，並在執行完成時傳送一個最終的完成更新回請求者聊天。

- 產生指令是非阻斷式的；它會立即傳回執行 ID。
- 完成時，子代理會將摘要/結果訊息公告回請求者聊天頻道。
- 完成採用推播機制。一旦衍生後，請勿在迴圈中輪詢 `/subagents list`、
  `sessions_list` 或 `sessions_history` 只為等待其
  完成；僅在需要除錯或干預時按需檢查狀態。
- 完成時，OpenClaw 會在公告清理流程繼續之前，盡力關閉該 sub-agent session 所開啟的受追蹤瀏覽器分頁/程序。
- 對於手動衍生，傳遞具有韌性：
  - OpenClaw 會先嘗試使用穩定的冪等金鑰進行直接的 `agent` 傳遞。
  - 如果直接傳遞失敗，則會退回到佇列路由。
  - 如果佇列路由仍不可用，公告會在短暫的指數退避後重試，直到最終放棄。
- 完成傳遞會保留已解析的請求者路由：
  - 當可用時，thread-bound 或 conversation-bound 的完成路由優先
  - 如果完成來源僅提供頻道，OpenClaw 會從請求者 session 的已解析路由 (`lastChannel` / `lastTo` / `lastAccountId`) 填入缺失的目標/帳戶，以便直接傳遞仍然有效
- 移交給請求者 session 的完成資訊是執行階段產生的內部內容（非使用者撰寫的文字），並包含：
  - `Result` (最新可見的 `assistant` 回覆文字，否則為經過清理的最新 tool/toolResult 文字)
  - `Status` (`completed successfully` / `failed` / `timed out` / `unknown`)
  - 簡潔的執行時間/Token 統計
  - 傳遞指令，告知請求者代理以正常助理語氣重寫（而非轉發原始內部元資料）
- `--model` 和 `--thinking` 會覆寫該特定執行的預設值。
- 使用 `info`/`log` 檢查完成後的詳細資訊和輸出。
- `/subagents spawn` 是單次模式 (`mode: "run"`)。對於持久的執行緒綁定會話，請使用帶有 `thread: true` 和 `mode: "session"` 的 `sessions_spawn`。
- 對於 ACP 駕駛程式會話（Codex、Claude Code、Gemini CLI），請使用帶有 `runtime: "acp"` 的 `sessions_spawn`，並參閱 [ACP Agents](/en/tools/acp-agents)。

主要目標：

- 並行處理「研究/長任務/緩慢工具」工作，而不阻塞主要執行。
- 預設保持子代理隔離（會話隔離 + 可選沙盒）。
- 確保工具介面難以被誤用：子代理預設**不**會獲得會話工具。
- 支援可配置的巢狀深度以實現協調器模式。

成本提示：每個子代理都有其**自己的**上下文和 Token 使用量。對於繁重或重複的任務，請為子代理設定較便宜的模型，並將主要代理保持在較高品質的模型上。您可以透過 `agents.defaults.subagents.model` 或個別代理覆寫來設定此項。

## 工具

使用 `sessions_spawn`：

- 啟動子代理執行 (`deliver: false`，全域通道：`subagent`)
- 然後執行宣告步驟並將宣告回覆發布至請求者聊天頻道
- 預設模型：繼承呼叫者，除非您設定 `agents.defaults.subagents.model`（或個別代理 `agents.list[].subagents.model`）；明確指定的 `sessions_spawn.model` 仍優先。
- 預設思考：繼承呼叫者，除非您設定 `agents.defaults.subagents.thinking`（或個別代理 `agents.list[].subagents.thinking`）；明確指定的 `sessions_spawn.thinking` 仍優先。
- 預設執行逾時：如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 會在設定時使用 `agents.defaults.subagents.runTimeoutSeconds`；否則會回退到 `0`（無逾時）。

工具參數：

- `task`（必要）
- `label?`（選用）
- `agentId?`（選用；如果允許，則在另一個代理 ID 下產生）
- `model?`（選用；覆寫子代理模型；無效值會被跳過，並且子代理會在預設模型上執行，同時在工具結果中顯示警告）
- `thinking?`（選用；覆寫子代理執行的思考等級）
- `runTimeoutSeconds?`（設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`；設定後，子代理執行將在 N 秒後中止）
- `thread?`（預設 `false`；當為 `true` 時，請求此子代理工作階段的通道執行緒綁定）
- `mode?`（`run|session`）
  - 預設為 `run`
  - 如果省略了 `thread: true` 和 `mode`，預設值會變為 `session`
  - `mode: "session"` 需要 `thread: true`
- `cleanup?`（`delete|keep`，預設 `keep`）
- `sandbox?`（`inherit|require`，預設 `inherit`；`require` 會拒絕產生，除非目標子執行環境已沙盒化）
- `sessions_spawn` **不**接受通道傳遞參數（`target`、`channel`、`to`、`threadId`、`replyTo`、`transport`）。若要進行傳遞，請從產生的執行中使用 `message`/`sessions_send`。

## 執行緒綁定工作階段

當為通道啟用執行緒綁定時，子代理可以保持綁定到某個執行緒，以便該執行緒中的後續使用者訊息繼續路由到同一個子代理工作階段。

### 支援執行緒的頻道

- Discord（目前唯一支援的頻道）：支援持久的執行緒繫結子代理程式會話（`sessions_spawn` 搭配 `thread: true`）、手動執行緒控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`），以及配接器金鑰 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSubagentSessions`。

快速流程：

1. 使用 `sessions_spawn` 透過 `thread: true` 產生（並可選擇性地搭配 `mode: "session"`）。
2. OpenClaw 會在目前頻道中建立或將執行緒繫結至該會話目標。
3. 該執行緒中的回覆和後續訊息會路由至已繫結的會話。
4. 使用 `/session idle` 來檢查/更新非活動自動取消聚焦，並使用 `/session max-age` 來控制硬性上限。
5. 使用 `/unfocus` 手動分離。

手動控制：

- `/focus <target>` 將目前執行緒（或建立一個）繫結至子代理程式/會話目標。
- `/unfocus` 移除目前已繫結執行緒的繫結。
- `/agents` 列出執行中工作和繫結狀態（`thread:<id>` 或 `unbound`）。
- `/session idle` 和 `/session max-age` 僅適用於已聚焦的已繫結執行緒。

組態開關：

- 全域預設值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`
- 頻道覆寫和產生自動繫結金鑰是特定於配接器的。請參閱上方的 **支援執行緒的頻道**。

請參閱 [組態參考](/en/gateway/configuration-reference) 和 [斜線指令](/en/tools/slash-commands) 以了解目前的配接器詳細資訊。

允許清單：

- `agents.list[].subagents.allowAgents`：可透過 `agentId` 鎖定的代理程式 ID 清單（`["*"]` 以允許任何代理程式）。預設值：僅限請求者代理程式。
- `agents.defaults.subagents.allowAgents`：當請求者代理未設定其自己的 `subagents.allowAgents` 時所使用的預設目標代理允許清單。
- 沙箱繼承防護：如果請求者會話在沙箱中執行，`sessions_spawn` 將拒絕以非沙箱方式執行的目標。
- `agents.defaults.subagents.requireAgentId` / `agents.list[].subagents.requireAgentId`：當為 true 時，封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確選擇設定檔）。預設值：false。

探索：

- 使用 `agents_list` 查看目前允許 `sessions_spawn` 使用的代理 ID。

自動封存：

- 子代理會話會在 `agents.defaults.subagents.archiveAfterMinutes` 後自動封存（預設值：60）。
- 封存使用 `sessions.delete` 並將對話記錄重新命名為 `*.deleted.<timestamp>`（同一個資料夾）。
- `cleanup: "delete"` 會在公告後立即封存（仍透過重新命名保留對話記錄）。
- 自動封存為盡力而為；如果閘道重新啟動，擱置中的計時器將會遺失。
- `runTimeoutSeconds` **不會**自動封存；它只會停止執行。會話會一直保留直到自動封存。
- 自動封存同樣適用於深度 1 和深度 2 的會話。
- 瀏覽器清理與封存清理分開進行：當執行完成時，追蹤的瀏覽器分頁/程序會盡力關閉，即使對話記錄/會話記錄被保留。

## 巢狀子代理

預設情況下，子代理無法產生自己的子代理（`maxSpawnDepth: 1`）。您可以透過設定 `maxSpawnDepth: 2` 來啟用一層巢狀結構，這允許**協調器模式**：主程式 → 協調器子代理 → 工作者子子代理。

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

| 深度 | 會話金鑰形狀                                 | 角色                            | 可否產生？                   |
| ---- | -------------------------------------------- | ------------------------------- | ---------------------------- |
| 0    | `agent:<id>:main`                            | 主代理                          | 總是                         |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理（允許深度 2 時為協調器） | 僅當 `maxSpawnDepth >= 2` 時 |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（葉節點工作者）        | 從不                         |

### 公告鏈

結果沿鏈條向上流動：

1. 深度 2 工作者完成 → 公告給其父層（深度 1 協調器）
2. Depth-1 編排器接收公告，綜合結果，完成 → 向主體公告
3. 主體代理接收公告並傳遞給使用者

每個層級只能看到其直接子級的公告。

操作指引：

- 啟動子工作一次並等待完成事件，而不是圍繞 `sessions_list`、`sessions_history`、`/subagents list` 或
  `exec` sleep 指令建立輪詢迴圈。
- 如果子完成事件在您已經發送最終答案後到達，正確的後續操作是確切的無聲權杖 `NO_REPLY` / `no_reply`。

### 依深度區分的工具政策

- 角色和控制範圍在產生時寫入會詮元資料。這可防止扁平化或還原的會詮金鑰意外重新取得編排器權限。
- **Depth 1 (編排器，當 `maxSpawnDepth >= 2`)**：取得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history` 以便管理其子級。其他會詮/系統工具仍然被拒絕。
- **Depth 1 (葉節點，當 `maxSpawnDepth == 1`)**：無會詮工具 (目前的預設行為)。
- **Depth 2 (葉節點工作程式)**：無會詮工具 — `sessions_spawn` 在深度 2 時總是被拒絕。無法產生更多子級。

### 每個代理的產生限制

每個代理會詮 (在任何深度) 一次最多可以有 `maxChildrenPerAgent` (預設：5) 個活動子級。這可防止單一編排器出現失控的擴散。

### 層聯停止

停止 depth-1 編排器會自動停止其所有 depth-2 子級：

- 主聊天中的 `/stop` 會停止所有 depth-1 代理，並層聯至其 depth-2 子級。
- `/subagents kill <id>` 會停止特定的子代理並層聯至其子級。
- `/subagents kill all` 會停止請求者的所有子代理並層聯。

## 驗證

子代理驗證是透過 **代理 ID** 解析，而非透過會詮類型：

- 子代理會詮金鑰是 `agent:<agentId>:subagent:<uuid>`。
- 驗證儲存是從該代理的 `agentDir` 載入的。
- 主要代理的設定檔會作為**後備**合併；衝突時，代理設定檔會覆寫主要設定檔。

注意：合併是累加的，因此主要設定檔始終可作為後備使用。目前尚不支援每個代理完全隔離的驗證。

## 宣告

子代理透過宣告步驟回報：

- 宣告步驟在子代理會話內執行（而非請求者會話）。
- 如果子代理確切回覆 `ANNOUNCE_SKIP`，則不會張貼任何內容。
- 如果最新的助理文字是確切的靜音標記 `NO_REPLY` / `no_reply`，
  即使先前有可見的進度，也會隱藏宣告輸出。
- 否則傳遞取決於請求者深度：
  - 頂層請求者會話使用後續 `agent` 呼叫搭配外部傳遞（`deliver=true`）
  - 巢狀請求者子代理會話會接收內部後續注入（`deliver=false`），以便協調器能在會話內綜合子結果
  - 如果巢狀請求者子代理會話已消失，OpenClaw 會在可用時回退至該會話的請求者
- 對於頂層請求者會話，完成模式直接傳遞會先解析任何綁定的對話/執行緒路由和掛鉤覆寫，然後從請求者會話的儲存路由中填入缺少的頻道目標欄位。這能確保即使完成來源僅識別頻道，完成內容仍保留在正確的聊天/主題上。
- 在建置巢狀完成發現時，子完成聚合的範圍限制在目前的請求者執行，防止陳舊的先前執行子輸出洩漏至目前的宣告中。
- 當頻道配接器可用時，宣告回覆會保留執行緒/主題路由。
- 宣告內容會正規化為穩定的內部事件區塊：
  - 來源（`subagent` 或 `cron`）
  - 子會話金鑰/ID
  - 宣告類型 + 任務標籤
  - 狀態列衍生自執行階段結果（`success`、`error`、`timeout` 或 `unknown`）
  - 結果內容選自最新的可見助理文字，否則為清理後的最新工具/toolResult 文字
  - 描述何時回覆與保持沈默的後續指令
- `Status` 並非從模型輸出推斷；它來自執行時結果訊號。
- 發生逾時時，如果子項僅完成工具呼叫，announce 可以將該歷程壓縮為簡短的進度摘要，而不是重播原始工具輸出。

Announce 載荷在末尾包含一個統計行（即使被換行包裹）：

- 執行時間（例如 `runtime 5m12s`）
- Token 使用量（輸入/輸出/總計）
- 當模型定價已設定時的預估成本（`models.providers.*.models[].cost`）
- `sessionKey`、`sessionId` 和逐字稿路徑（以便主要代理可以透過 `sessions_history` 取得歷程或檢查磁碟上的檔案）
- 內部中繼資料僅供編排使用；面向使用者的回覆應以正常助理語氣重寫。

`sessions_history` 是較安全的編排路徑：

- 助理回顧會先經過標準化：
  - thinking 標籤會被剝除
  - `<relevant-memories>` / `<relevant_memories>` 支架區塊會被剝除
  - 純文字工具呼叫 XML 載荷區塊（例如 `<tool_call>...</tool_call>`、
    `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和
    `<function_calls>...</function_calls>`）會被剝除，包括未正確閉合的截斷
    載荷
  - 降級的工具呼叫/結果支架與歷史背景標記會被剝除
  - 洩漏的模型控制權杖（例如 `<|assistant|>`）、其他 ASCII
    `<|...|>` 權杖和全形 `<｜...｜>` 變體會被剝除
  - 格式錯誤的 MiniMax 工具呼叫 XML 會被剝除
- 類似憑證/權杖的文字會被編輯
- 長區塊可能會被截斷
- 非常大的歷程可能會捨棄較舊的列或將過大的列替換為
  `[sessions_history omitted: message too large]`
- 當您需要完整的逐位元組逐字稿時，原始磁碟逐字稿檢查是備用方案

## 工具原則（子代理工具）

根據預設，子代理會取得**所有工具（工作階段工具除外）**和系統工具：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` 在這裡仍然是一個有界的、經過清理的檢索視圖；它不是
原始逐字稿的轉儲。

當 `maxSpawnDepth >= 2` 時，深度為 1 的協調器子代理還會收到 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它們管理其子級。

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

子代理使用專用的進程內佇列通道：

- 通道名稱：`subagent`
- 並行性：`agents.defaults.subagents.maxConcurrent`（預設 `8`）

## 停止

- 在請求者聊天中傳送 `/stop` 會中止請求者會話並停止從其產生的任何活動子代理執行，並連鎖反應到巢狀子級。
- `/subagents kill <id>` 停止特定的子代理並連鎖反應到其子級。

## 限制

- 子代理宣告是 **盡力而為** 的。如果閘道重啟，待處理的「宣告回來」工作將會遺失。
- 子代理仍然共享相同的閘道進程資源；將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 總是非阻斷的：它會立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文僅注入 `AGENTS.md` + `TOOLS.md`（無 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。對於大多數使用情況，建議深度為 2。
- `maxChildrenPerAgent` 限制每個會話的活動子級數量（預設：5，範圍：1–20）。
