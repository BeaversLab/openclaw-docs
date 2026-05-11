---
summary: "產生會將結果宣佈回請求者對話的獨立背景代理執行"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "Sub-agents"
sidebarTitle: "Sub-agents"
---

Sub-agents 是從現有代理執行產生的背景代理執行。
它們在自己的 session (`agent:<agentId>:subagent:<uuid>`) 中運行，並在完成時將結果**宣佈**
回請求者對話頻道。每個 sub-agent 執行都會被追蹤為
[background task](/zh-Hant/automation/tasks)。

主要目標：

- 在不阻塞主要執行的情況下，平行化「研究 / 長任務 / 慢速工具」工作。
- 預設讓 sub-agents 保持隔離（session 分隔 + 可選的沙箱機制）。
- 讓工具介面難以誤用：sub-agents **不** 會預設取得 session 工具。
- 支援可配置的巢狀深度，以實現編排器模式。

<Note>**成本注意：** 每個 sub-agent 預設都有自己的內容和 token 使用量。 對於繁重或重複性的任務，請為 sub-agents 設定更便宜的模型，並將您的主要代理保留在更高品質的模型上。 透過 `agents.defaults.subagents.model` 或個別代理的覆寫進行配置。 當子代理真正需要請求者的當前逐字稿時，代理可以在該次產生時請求 `context: "fork"`。</Note>

## 斜線指令

使用 `/subagents` 來檢查或控制 **目前 session** 的 sub-agent 執行：

```text
/subagents list
/subagents kill <id|#|all>
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
/subagents send <id|#> <message>
/subagents steer <id|#> <message>
/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]
```

`/subagents info` 顯示執行中繼資料（狀態、時間戳記、 session id、
逐字稿路徑、清理作業）。使用 `sessions_history` 取得有限制的、
經過安全過濾的回顧檢視；當您需要原始的完整逐字稿時，請檢查磁碟上的逐字稿路徑。

### 執行緒綁定控制

這些指令適用於支援持續性執行緒綁定的頻道。
請參閱下方的 [Thread supporting channels](#thread-supporting-channels)。

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### 產生行為

`/subagents spawn` 會作為使用者指令（而非內部中繼）啟動背景 sub-agent，
並在執行完成時將最終的完成更新傳送回請求者對話。

<AccordionGroup>
  <Accordion title="非阻塞、推送式完成">
    - 生成指令是非阻塞的；它會立即返回一個運行 ID。
    - 完成時，子代理會向請求者的聊天頻道發送摘要/結果訊息。
    - 完成是基於推送的。一旦生成，**切勿**僅為了等待其完成而在循環中輪詢 `/subagents list`、`sessions_list` 或 `sessions_history`；僅在需要調試或干預時按需檢查狀態。
    - 完成時，在繼續公告清理流程之前，OpenClaw 會盡最大努力關閉該子代理會話打開的被追蹤的分頁/行程。
  </Accordion>
  <Accordion title="手動生成的傳遞恢復能力">
    - OpenClaw 首先嘗試使用穩定的冪等鍵進行直接 `agent` 傳遞。
    - 如果直接傳遞失敗，它會回退到佇列路由。
    - 如果佇列路由仍然不可用，則在最終放棄之前，會使用短指數退避重試公告。
    - 完成傳遞保留已解析的請求者路由：當可用時，線程綁定或會話綁定的完成路由優先；如果完成來源僅提供頻道，OpenClaw 會從請求者會話的已解析路由（`lastChannel` / `lastTo` / `lastAccountId`）中填補缺失的目標/帳戶，以便直接傳遞仍然有效。
  </Accordion>
  <Accordion title="完成交集中繼資料">
    傳遞給請求者會話的完成交集是運行時生成的
    內部上下文（而非用戶撰寫的文本），包括：

    - `Result` — 最新的可見 `assistant` 回覆文本，否則為經過清理的最新 tool/toolResult 文本。最終失敗的運行不會重用捕獲的回覆文本。
    - `Status` — `completed successfully` / `failed` / `timed out` / `unknown`。
    - 緊湊的運行時/Token 統計數據。
    - 一條傳遞指令，指示請求者代理以正常的助手語氣重寫（而非轉發原始內部中繼資料）。

  </Accordion>
  <Accordion title="模式和 ACP 執行時環境">
    - `--model` 和 `--thinking` 會覆寫該特定執行的預設值。
    - 使用 `info`/`log` 在完成後檢查詳細資訊和輸出。
    - `/subagents spawn` 是一次性模式（`mode: "run"`）。對於持久化的綁定執行緒會話，請搭配 `thread: true` 和 `mode: "session"` 使用 `sessions_spawn`。
    - 對於 ACP 線束會話（Claude Code、Gemini CLI、OpenCode 或明確的 Codex ACP/acpx），當工具廣告該執行時環境時，請使用 `sessions_spawn` 搭配 `runtime: "acp"`。在除錯完成項或代理程式對代理程式迴圈時，請參閱 [ACP 傳遞模型](/zh-Hant/tools/acp-agents#delivery-model)。當啟用 `codex` 外掛程式時，除非使用者明確要求 ACP/acpx，否則 Codex 聊天/執行緒控制應優先選擇 `/codex ...` 而非 ACP。
    - OpenClaw 會隱藏 `runtime: "acp"`，直到啟用 ACP、請求者未被沙箱化，並載入後端外掛程式（例如 `acpx`）為止。`runtime: "acp"` 預期外部 ACP 線束 ID，或是具有 `runtime.type="acp"` 的 `agents.list[]` 項目；對於來自 `agents_list` 的正常 OpenClaw 設定代理程式，請使用預設的子代理程式執行時環境。
  </Accordion>
</AccordionGroup>

## 內容模式

原生子代理程式會以隔離方式啟動，除非呼叫者明確要求分支當前的逐字稿。

| 模式       | 使用時機                                                               | 行為                                                          |
| ---------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `isolated` | 全新研究、獨立實作、緩慢工具工作，或是任何可在任務文字中簡述的事項     | 建立乾淨的子逐字稿。這是預設值，且能保持較低的 Token 使用量。 |
| `fork`     | 取決於目前對話、先前工具結果，或是請求者逐字稿中已存在的細微指示的工作 | 在子項開始之前，將請求者的逐字稿分支到子會話中。              |

請謹慎使用 `fork`。它適用於情境相關的委派，而非用來取代撰寫清楚的工作提示。

## 工具：`sessions_spawn`

使用 `deliver: false` 在全域 `subagent` 通道上啟動子代理程式執行，然後執行公告步驟並將公告回覆發送至請求者的聊天頻道。

可用性取決於呼叫者的有效工具政策。`coding` 和 `full` 設定檔預設會公開 `sessions_spawn`。`messaging` 設定檔則不會；對於應該委派工作的代理程式，請新增 `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"`。頻道/群組、供應商、沙箱和個別代理程式的允許/拒絕政策仍可在設定檔階段之後移除該工具。請使用來自同一個工作階段的 `/tools` 以確認有效的工具清單。

**預設值：**

- **模型：** 繼承呼叫者，除非您設定了 `agents.defaults.subagents.model` （或個別代理程式的 `agents.list[].subagents.model`）；明確的 `sessions_spawn.model` 仍會優先。
- **思考：** 繼承呼叫者，除非您設定了 `agents.defaults.subagents.thinking` （或個別代理程式的 `agents.list[].subagents.thinking`）；明確的 `sessions_spawn.thinking` 仍會優先。
- **執行逾時：** 如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 會在設定時使用 `agents.defaults.subagents.runTimeoutSeconds`；否則會回退到 `0` （無逾時）。

### 工具參數

<ParamField path="task" type="string" required>
  子代理的任務描述。
</ParamField>
<ParamField path="label" type="string">
  可選的人類可讀標籤。
</ParamField>
<ParamField path="agentId" type="string">
  當 `subagents.allowAgents` 允許時，在另一個代理 ID 下產生。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 僅適用於外部 ACP 駝具（`claude`、`droid`、`gemini`、`opencode`，或明確要求的 Codex ACP/acpx）以及 `runtime.type` 為 `acp` 的 `agents.list[]` 條目。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  僅限 ACP。當 `runtime: "acp"` 時，恢復現有的 ACP 駝具會話；對於原生子代理產生則會被忽略。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  僅限 ACP。當 `runtime: "acp"` 時，將 ACP 執行輸出流式傳輸到父會話；對於原生子代理產生則省略。
</ParamField>
<ParamField path="model" type="string">
  覆寫子代理模型。無效值將被跳過，子代理將在預設模型上運行，並在工具結果中顯示警告。
</ParamField>
<ParamField path="thinking" type="string">
  覆寫子代理執行的思考等級。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`。設定後，子代理執行將在 N 秒後中止。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  當 `true` 時，請求此子代理會話的頻道執行緒綁定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果省略了 `thread: true` 和 `mode`，預設值會變成 `session`。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 會在公告後立即封存（仍會透過重新命名保留文字紀錄）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 會拒絕產生，除非目標子執行環境受到沙盒保護。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 會將請求者的目前文字紀錄分支到子會話中。僅限原生子代理。僅當子代需要目前文字紀錄時才使用 `fork`。
</ParamField>

<Warning>`sessions_spawn` **不**接受通道傳遞參數 (`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`)。如需傳遞，請從產生的執行中使用 `message`/`sessions_send`。</Warning>

## 綁定執行緒的會話

當啟用通道的執行緒綁定時，子代理程式可以保持綁定到執行緒，以便該執行緒中的後續使用者訊息持續路由至同一個子代理程式會話。

### 支援執行緒的通道

**Discord** 目前是唯一支援的通道。它支援持久化的綁定執行緒子代理會話 (`sessions_spawn` 搭配
`thread: true`)、手動執行緒控制 (`/focus`, `/unfocus`, `/agents`,
`/session idle`, `/session max-age`)，以及配接器金鑰
`channels.discord.threadBindings.enabled`,
`channels.discord.threadBindings.idleHours`,
`channels.discord.threadBindings.maxAgeHours` 和
`channels.discord.threadBindings.spawnSubagentSessions`。

### 快速流程

<Steps>
  <Step title="產生">使用 `thread: true` (以及選用的 `mode: "session"`) 執行 `sessions_spawn`。</Step>
  <Step title="綁定">OpenClaw 會在作用中的通道中建立或綁定一個執行緒至該會話目標。</Step>
  <Step title="路由後續內容">該執行緒中的回覆和後續訊息會路由至已綁定的會話。</Step>
  <Step title="檢查逾時">使用 `/session idle` 來檢查/更新非活動自動取消焦點，並 使用 `/session max-age` 來控制硬性上限。</Step>
  <Step title="中斷連結">使用 `/unfocus` 進行手動中斷連結。</Step>
</Steps>

### 手動控制

| 指令               | 效果                                                  |
| ------------------ | ----------------------------------------------------- |
| `/focus <target>`  | 將目前的執行緒 (或建立一個) 綁定至子代理程式/會話目標 |
| `/unfocus`         | 移除目前綁定執行緒的綁定                              |
| `/agents`          | 列出活躍執行和綁定狀態（`thread:<id>` 或 `unbound`）  |
| `/session idle`    | 檢查/更新閒置自動取消聚焦（僅限已聚焦的綁定執行緒）   |
| `/session max-age` | 檢查/更新硬性上限（僅限已聚焦的綁定執行緒）           |

### 配置開關

- **全域預設值：** `session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **頻道覆寫和生成自動綁定鍵**因配接器而異。請參閱上方的[支援執行緒的頻道](#thread-supporting-channels)。

請參閱[配置參考](/zh-Hant/gateway/configuration-reference)與
[斜線指令](/zh-Hant/tools/slash-commands)以了解目前配接器的詳細資訊。

### 允許清單

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可透過明確 `agentId` 鎖定的代理程式 ID 清單（`["*"]` 表示允許任何代理程式）。預設值：僅限請求者代理程式。如果您設定清單後仍希望請求者使用 `agentId` 生成自身，請將請求者 ID 包含在清單中。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  當請求者代理程式未設定其自己的 `subagents.allowAgents` 時，所使用的預設目標代理程式允許清單。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確選擇設定檔）。各代理程式的覆寫：`agents.list[].subagents.requireAgentId`。
</ParamField>

如果請求者工作階段是在沙盒中執行，`sessions_spawn` 將拒絕會以非沙盒模式執行的目標。

### 探索

使用 `agents_list` 查看目前允許用於 `sessions_spawn` 的代理程式 ID。回應包含每個列出的代理程式其有效模型和內嵌執行階段元資料，以便呼叫者區分 PI、Codex 應用程式伺服器和其他設定的原生執行階段。

### 自動封存

- 子代理會話會在 `agents.defaults.subagents.archiveAfterMinutes` 後自動歸檔（預設為 `60`）。
- 歸檔會使用 `sessions.delete` 並將對話記錄重新命名為 `*.deleted.<timestamp>`（位於同一資料夾）。
- `cleanup: "delete"` 會在宣告後立即歸檔（仍會透過重新命名保留對話記錄）。
- 自動歸檔屬於盡力而為；如果閘道重新啟動，擱置中的計時器將會遺失。
- `runTimeoutSeconds` **不會**自動歸檔；它只會停止執行。該會話將保持不變，直到自動歸檔。
- 自動歸檔同樣適用於深度 1 和深度 2 的會話。
- 瀏覽器清理與歸檔清理是分開的：當執行完成時，受追蹤的瀏覽器分頁/程序會盡力關閉，即使對話記錄/會話記錄被保留。

## 巢狀子代理

預設情況下，子代理無法生成自己的子代理
(`maxSpawnDepth: 1`)。設定 `maxSpawnDepth: 2` 以啟用一層
巢狀 — 即 **編排器模式**：主 → 編排器子代理 →
工作者子子代理。

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

| 深度 | 會話金鑰形狀                                 | 角色                            | 可生成？                     |
| ---- | -------------------------------------------- | ------------------------------- | ---------------------------- |
| 0    | `agent:<id>:main`                            | 主代理                          | 始終                         |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理（允許深度 2 時為編排器） | 僅當 `maxSpawnDepth >= 2` 時 |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（葉工作者）            | 從不                         |

### 宣告鏈

結果會沿著鏈回傳：

1. 深度 2 工作者完成 → 向其父層（深度 1 編排器）宣告。
2. 深度 1 編排器接收宣告，綜合結果，完成 → 向主代理宣告。
3. 主代理接收宣告並傳送給使用者。

每個層級只能看到來自其直接子層級的宣告。

<Note>
  **操作指引：** 啟動子工作一次並等待完成事件，而不是圍繞 `sessions_list`、 `sessions_history`、`/subagents list` 或 `exec` sleep 指令建置輪詢迴圈。 `sessions_list` 和 `/subagents list` 保持子工作階段關係專注於進行中的工作 — 進行中的子工作保持連接，已結束的子工作在短暫的近期視窗內保持可見，而過時僅存的子工作連結在其新鮮度視窗過後會被忽略。這可防止舊的 `spawnedBy` / `parentSessionKey`
  元資料在重啟後復原幽靈子工作。如果子工作完成事件在您已經發送最終答案之後才到達，正確的後續處理是確切的靜默權杖 `NO_REPLY` / `no_reply`。
</Note>

### 依深度的工具政策

- 角色和控制範圍在產生時會寫入工作階段元資料。這可防止扁平化或還原的工作階段金鑰意外重新取得協調器權限。
- **深度 1（協調器，當 `maxSpawnDepth >= 2`）：** 取得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history` 以便管理其子工作。其他工作階段/系統工具仍被拒絕。
- **深度 1（葉節點，當 `maxSpawnDepth == 1`）：** 無工作階段工具（目前的預設行為）。
- **深度 2（葉節點工作程式）：** 無工作階段工具 — `sessions_spawn` 在深度 2 時一律被拒絕。無法產生進一步的子工作。

### 每個代理程式的產生限制

每個代理程式工作階段（在任何深度）一次最多可以有 `maxChildrenPerAgent`
（預設 `5`）個進行中的子工作。這可防止單一協調器失控擴散。

### 層疊停止

停止深度 1 的協調器會自動停止其所有深度 2 的
子工作：

- 主聊天中的 `/stop` 會停止所有深度 1 的代理程式，並層疊至其深度 2 的子工作。
- `/subagents kill <id>` 會停止特定的子代理程式，並層疊至其子工作。
- `/subagents kill all` 會停止請求者的所有子代理程式，並進行層疊。

## 驗證

子代理的身份驗證由 **代理 id** 解析，而非由會話類型：

- 子代理會話金鑰是 `agent:<agentId>:subagent:<uuid>`。
- 身份驗證存儲是從該代理的 `agentDir` 載入的。
- 主代理的身份驗證配置文件作為 **後備** 合併；當發生衝突時，代理配置文件會覆蓋主配置文件。

合併是累加的，因此主配置文件始終可作為後備使用。目前尚不支持每個代理的完全隔離身份驗證。

## 公告

子代理通過公告步驟進行報告：

- 公告步驟在子代理會話內運行（而非請求者會話）。
- 如果子代理完全回覆 `ANNOUNCE_SKIP`，則不會發布任何內容。
- 如果最新的助理文本正是靜默令牌 `NO_REPLY` / `no_reply`，即使之前存在可見的進度，公告輸出也會被抑制。

傳遞取決於請求者深度：

- 頂層請求者會話使用後續 `agent` 調用進行外部傳遞 (`deliver=true`)。
- 嵌套請求者子代理會話接收內部後續注入 (`deliver=false`)，以便協調器可以在會話內合成子結果。
- 如果嵌套請求者子代理會話已消失，OpenClaw 會在可用時回退到該會話的請求者。

對於頂層請求者會話，完成模式的直接傳遞首先解析任何綁定的對話/線程路由和掛鈎覆蓋，然後從請求者會話的存儲路由中填充缺失的通道目標字段。這確保即使完成來源僅識別通道，完成內容也會保留在正確的聊天/主題上。

構建嵌套完成發現時，子完成聚合僅限於當前請求者運行，以防止陳舊的先前運行子輸出洩漏到當前公告中。公告回覆會在通道適配器可用時保留線程/主題路由。

### 公告上下文

公告上下文被正規化為穩定的內部事件塊：

| 欄位     | 來源                                                                                     |
| -------- | ---------------------------------------------------------------------------------------- |
| 來源     | `subagent` 或 `cron`                                                                     |
| 會話 ID  | 子會話金鑰/ID                                                                            |
| 類型     | 公告類型 + 任務標籤                                                                      |
| 狀態     | 衍生自運行時結果（`success`、`error`、`timeout` 或 `unknown`）——而非**非**從模型文字推斷 |
| 結果內容 | 最新可見的助理文字，否則為經過清理的最新工具/工具結果文字                                |
| 後續跟進 | 描述何時回覆與何時保持沈默的指示                                                         |

終端失敗的執行會報告失敗狀態，而不會重播已捕獲的回覆文字。若發生逾時，且子代理僅完成了工具呼叫，公告可以將該歷史記錄折疊為簡短的進度摘要，而不是重播原始工具輸出。

### 統計行

公告酬載在結尾包含一個統計行（即使被換行包裝）：

- 執行時間（例如 `runtime 5m12s`）。
- Token 使用量（輸入/輸出/總計）。
- 當設定模型定價時的預估成本（`models.providers.*.models[].cost`）。
- `sessionKey`、`sessionId` 和文字記錄路徑，以便主代理可以透過 `sessions_history` 取得歷史記錄或檢查磁碟上的檔案。

內部中繼資料僅供編排使用；面向使用者的回覆應以正常的助理語氣重寫。

### 為何偏好 `sessions_history`

`sessions_history` 是更安全的編排路徑：

- 助理的回憶會先進行標準化：移除思考標籤；移除 `<relevant-memories>` / `<relevant_memories>` 鷹架；移除純文字工具呼叫 XML 酬載區塊（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`），包括未正確結尾的被截斷酬載；移除降級的工具呼叫/結果鷹架和歷史記錄上下文標記；移除洩漏的模型控制 token（`<|assistant|>`、其他 ASCII `<|...|>`、全形 `<｜...｜>`）；移除格式錯誤的 MiniMax 工具呼叫 XML。
- 類似憑證/token 的文字會被編輯。
- 長區塊可以被截斷。
- 非常大的歷史記錄可以捨棄較舊的列，或用 `[sessions_history omitted: message too large]` 替換過大的列。
- 當您需要逐位元組的完整逐字稿時，原始磁碟逐字稿檢查是備用方案。

## 工具政策

子代理首先使用與父代理或目標代理相同的設定檔和工具政策管道。之後，OpenClaw 會套用子代理限制層。

如果沒有限制性的 `tools.profile`，子代理將獲得**除會話工具**和系統工具以外的所有工具：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` 在這裡仍然是一個有界且經過清理的回檢視圖——它不是原始逐字稿傾印。

當 `maxSpawnDepth >= 2` 時，深度 1 的協調器子代理還會收到 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它們管理其子代理。

### 透過設定覆寫

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

`tools.subagents.tools.allow` 是最終的僅允許過濾器。它可以縮小已解析的工具集，但無法**恢復** 被 `tools.profile` 移除的工具。例如，`tools.profile: "coding"` 包含 `web_search`/`web_fetch` 但不包含 `browser` 工具。若要讓編碼設定檔子代理使用瀏覽器自動化，請在設定檔階段新增瀏覽器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

當只有一個代理應獲得瀏覽器自動化時，請使用每代理 `agents.list[].tools.alsoAllow: ["browser"]`。

## 並行處理

子代理使用專用的進程內佇列通道：

- **通道名稱：** `subagent`
- **並行度：** `agents.defaults.subagents.maxConcurrent` (預設 `8`)

## 存活性和復原

OpenClaw 不將 `endedAt` 的缺失視為子代理仍然存活的永久證明。超過過時執行視窗的未結束執行將不再計入 `/subagents list`、狀態摘要、後代完成閘門和每會話並行檢查中的作用中/待處理項目。

在網關重啟後，陳舊且未結束的還原執行會被清除，除非它們的子工作階段被標記為 `abortedLastRun: true`。這些因重啟而中止的子工作階段仍可透過子代理程式孤兒還原流程來還原，該流程會在清除中止標記之前發送合成還原訊息。

<Note>
  如果子代理程式衍生失敗並出現 Gateway `PAIRING_REQUIRED` / `scope-upgrade`，請在編輯配對狀態前檢查 RPC 呼叫端。 內部 `sessions_spawn` 協調應透過直接 loopback 共用權杖/密碼驗證，以 `client.id: "gateway-client"` 身分連線並搭配 `client.mode: "backend"`；該路徑不依賴 CLI 的配對裝置範圍基準。遠端呼叫端、明確的 `deviceIdentity`、明確的裝置權杖路徑，以及瀏覽器/節點客戶端
  仍需要正常的裝置核准來進行範圍升級。
</Note>

## 停止

- 在請求者聊天中傳送 `/stop` 會中止請求者工作階段，並停止從中衍生的任何作用中子代理程式執行，並級聯至巢狀子項。
- `/subagents kill <id>` 會停止特定的子代理程式，並級聯至其子項。

## 限制

- 子代理程式公告採取 **最佳努力** 原則。如果網關重啟，待處理的「公告回來」工作將會遺失。
- 子代理程式仍共用相同的網關程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 一律為非封鎖式：它會立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理程式內文僅會注入 `AGENTS.md` + `TOOLS.md`（無 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。對於大多數使用案例，建議深度為 2。
- `maxChildrenPerAgent` 限制了每個工作階段的作用中子項數量（預設 `5`，範圍 `1–20`）。

## 相關

- [ACP agents](/zh-Hant/tools/acp-agents)
- [Agent send](/zh-Hant/tools/agent-send)
- [背景任務](/zh-Hant/automation/tasks)
- [多代理沙箱工具](/zh-Hant/tools/multi-agent-sandbox-tools)
