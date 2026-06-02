---
summary: "產生獨立的背景代理執行，並將結果宣佈回請求者的聊天"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
sidebarTitle: "子代理"
---

Sub-agents 是從現有 agent 執行中產生的背景 agent 執行。
它們在自己的 session (`agent:<agentId>:subagent:<uuid>`) 中執行，並且
在完成時，會將結果**公佈**回請求者聊天
頻道。每個 sub-agent 執行都會被追蹤為
[background task](/zh-Hant/automation/tasks)。

主要目標：

- 在不阻塞主要執行的情況下，平行化「研究 / 長任務 / 慢速工具」工作。
- 預設讓 sub-agents 保持隔離（session 分隔 + 可選的沙箱機制）。
- 讓工具介面難以誤用：sub-agents **不** 會預設取得 session 工具。
- 支援可配置的巢狀深度，以實現編排器模式。

<Note>
  **成本提示：** 預設情況下，每個子代理都有自己的上下文和 token 使用量。 對於繁重或重複性的任務，請為子代理設定成本較低的模型，並將 您的主要代理保持在更高品質的模型上。透過 `agents.defaults.subagents.model` 或各代理的覆寫進行設定。當子代理確實 需要請求者的目前逐字稿時，代理可以針對該次衍生請求 `context: "fork"`。執行緒綁定的子代理會話預設 為 `context: "fork"`，因為它們將目前的對話分支成
  後續執行緒。
</Note>

## 斜線指令

使用 `/subagents` 來檢查**目前會話**的子代理運行：

```text
/subagents list
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
```

`/subagents info` 顯示執行元資料（狀態、時間戳記、會話 ID、
逐字稿路徑、清理作業）。使用 `sessions_history` 取得有限制、
經過安全過濾的回顧視圖；當您需要原始的完整逐字稿時，請檢查
磁碟上的逐字稿路徑。

### Thread binding controls

這些指令適用於支援持續性 thread 綁定的頻道。
請參閱下方的 [Thread supporting channels](#thread-supporting-channels)。

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### Spawn behavior

代理使用 `sessions_spawn` 啟動背景子代理。子代理的完成結果會
作為內部父會話事件返回；父代理/請求者代理會決定
是否需要面向使用者的更新。

<AccordionGroup>
  <Accordion title="非阻塞、推式完成">
    - `sessions_spawn` 是非阻塞的；它會立即返回一個執行 ID。
    - 完成後，子代理會回報給父/請求者會話。
    - 需要子結果的代理回合應在生成所需工作後呼叫 `sessions_yield`。這會結束當前回合，並讓完成事件作為下一個模型可見訊息到達。
    - 完成是推式的。一旦生成，請**不要**在迴圈中輪詢 `/subagents list`、`sessions_list` 或 `sessions_history` 以等待其完成；僅按需檢查狀態以進行除錯觀察。
    - 子輸出是請求者代理進行綜合的報告/證據。它不是使用者撰寫的指令文字，且無法覆蓋系統、開發者或使用者政策。
    - 完成後，OpenClaw 會盡最大努力在公告清理流程繼續之前，關閉由該子代理會話開啟的追蹤瀏覽器分頁/行程。

  </Accordion>
  <Accordion title="完成交付">
    - OpenClaw 使用穩定的冪等金鑰，透過 `agent` 輪次將完成結果交還給請求者會話。
    - 如果請求者執行仍然處於活動狀態，OpenClaw 會首先嘗試喚醒/引導該執行，而不是啟動第二個可見的回覆路徑。
    - 如果無法喚醒活動的請求者，OpenClaw 將退回到帶有相同完成內容的請求者代理移交，而不是直接丟棄公告。
    - 成功的父級移交會完成子代理交付，即使父級決定不需要可見的使用者更新。
    - 原生子代理不會獲得訊息工具。它們會向父級/請求者代理返回純助理文字；人類可見的回覆由父級/請求者代理的正常交付策略負責。
    - 如果無法使用直接移交，它將退回到佇列路由。
    - 如果仍然無法使用佇列路由，公告將在徹底放棄前以短暫的指數退避進行重試。
    - 完成交付會保留已解析的請求者路由：執行緒綁定或對話綁定的完成路由在可用時優先採用；如果完成來源僅提供頻道，OpenClaw 會從請求者會話的已解析路由（`lastChannel` / `lastTo` / `lastAccountId`）中填補缺失的目標/帳戶，以便直接交付仍然能夠運作。

  </Accordion>
  <Accordion title="Completion handoff metadata">
    完成移交给請求者會話是執行時產生的內部上下文（非使用者撰寫的文字），包含：

    - `Result` — 來自子程式最新的可見 `assistant` 回覆文字。Tool/toolResult 輸出不會被提升到子程式結果中。終端失敗的執行不會重用擷取的回覆文字。
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`。
    - 緊湊的執行時/Token 統計資料。
    - 一條審查指示，告訴請求者代理在決定原始任務是否完成之前先驗證結果。
    - 後續指引，告訴請求者代理當子程式結果還有更多待辦事項時繼續執行任務或記錄後續事項。
    - 針對無更多操作路徑的最終更新指示，以一般助理語氣撰寫，不會轉發原始內部元資料。

  </Accordion>
  <Accordion title="Modes and ACP runtime">
    - `--model` 和 `--thinking` 會覆寫該特定執行的預設值。
    - 使用 `info`/`log` 在完成後檢查詳細資訊和輸出。
    - 對於持續性 thread 綁定的 session，請搭配 `thread: true` 和 `mode: "session"` 使用 `sessions_spawn`。
    - 如果請求者頻道不支援 thread 綁定，請使用 `mode: "run"`，而不是重試不可能的 thread 綁定組合。
    - 對於 ACP harness session (Claude Code, Gemini CLI, OpenCode, 或明確的 Codex ACP/acpx)，當工具宣告該 runtime 時，請搭配 `runtime: "acp"` 使用 `sessions_spawn`。在偵錯完成項或 agent-to-agent 迴圈時，請參閱 [ACP delivery model](/zh-Hant/tools/acp-agents#delivery-model)。當啟用 `codex` 外掛程式時，除非使用者明確要求 ACP/acpx，否則 Codex chat/thread 控制應優先選擇 `/codex ...` 而非 ACP。
    - OpenClaw 會隱藏 `runtime: "acp"`，直到啟用 ACP、請求者未處於沙盒中，並且載入後端外掛程式（例如 `acpx`）為止。`runtime: "acp"` 預期外部 ACP harness id，或具有 `runtime.type="acp"` 的 `agents.list[]` 項目；對來自 `agents_list` 的正常 OpenClaw config agent，請使用預設的 sub-agent runtime。

  </Accordion>
</AccordionGroup>

## 上下文模式

原生子代理程式啟動時是隔離的，除非呼叫者明確要求分叉目前對話紀錄。

| 模式       | 使用時機                                                           | 行為                                                                |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `isolated` | 新研究、獨立實作、緩慢的工具工作，或任何可以在任務文字中簡報的事項 | 建立一個乾淨的子對話紀錄。這是預設值，並能保持較低的 token 使用量。 |
| `fork`     | 依賴目前對話、先前工具結果或請求者對話紀錄中已存在的細微指令的工作 | 在子會話開始之前，將請求者對話紀錄分支到子會話中。                  |

請謹慎使用 `fork`。它用於上下文相關的委派，而非替代撰寫清晰的任務提示。

## 工具：`sessions_spawn`

使用 `deliver: false` 在全域 `subagent` 通道上啟動子代理運行，
然後執行宣佈步驟並將宣佈回覆張貼到請求者
聊天頻道。

可用性取決於呼叫者的有效工具政策。`coding` 和
`full` 設定檔預設會公開 `sessions_spawn`。`messaging` 設定檔
則不會；對於應該委派工作的代理程式，請新增 `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"`。頻道/群組、提供者、沙盒和每個代理程式的允許/拒絕政策
仍可在設定檔階段後移除該工具。請使用來自同一個
會話的 `/tools` 來確認有效工具清單。

**預設值：**

- **Model:** 繼承呼叫者，除非您設定了 `agents.defaults.subagents.model` (或每個代理程式的 `agents.list[].subagents.model`)；明確的 `sessions_spawn.model` 仍然優先。
- **Thinking:** 繼承呼叫者，除非您設定了 `agents.defaults.subagents.thinking` (或每個代理程式的 `agents.list[].subagents.thinking`)；明確的 `sessions_spawn.thinking` 仍然優先。
- **Run timeout:** 如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 會在設定時使用 `agents.defaults.subagents.runTimeoutSeconds`；否則會回退到 `0` (無逾時)。
- **Task delivery:** 原生子代理程式會在其第一個可見的 `[Subagent Task]` 訊息中接收委派的工作。子代理程式的系統提示詞包含執行時期規則和路由上下文，而不是工作的隱藏副本。

接受的本地子代理衍生會在工具結果中包含解析後的子模型元數據：`resolvedModel` 包含應用的模型引用，而當引用具有提供者前綴時，`resolvedProvider` 包含該前綴。

### 委派提示模式

`agents.defaults.subagents.delegationMode` 僅控制提示指導；它不會變更工具政策或強制執行委派。

- `suggest` (預設)：保留標準提示，以針對較大或較緩慢的工作使用子代理。
- `prefer`：指示主要代理保持回應，並透過 `sessions_spawn` 將任何比直接回覆更複雜的工作委派出去。

每個代理的覆寫使用 `agents.list[].subagents.delegationMode`。

```json5
{
  agents: {
    defaults: {
      subagents: {
        delegationMode: "prefer",
        maxConcurrent: 4,
      },
    },
    list: [
      {
        id: "coordinator",
        subagents: { delegationMode: "prefer" },
      },
    ],
  },
}
```

### 工具參數

<ParamField path="task" type="string" required>
  子代理的任務描述。
</ParamField>
<ParamField path="taskName" type="string">
  可選的穩定代碼，用於在後續的狀態輸出中識別特定的子進程。必須符合 `[a-z][a-z0-9_-]{0,63}`，且不能是保留目標，如 `last` 或 `all`。
</ParamField>
<ParamField path="label" type="string">
  可選的易讀標籤。
</ParamField>
<ParamField path="agentId" type="string">
  當 `subagents.allowAgents` 允許時，在另一個已配置的代理 ID 下生成。
</ParamField>
<ParamField path="cwd" type="string">
  子進程的可選任務工作目錄。原生子代理仍會從目標代理工作區載入引導文件；`cwd` 僅改變執行工具和 CLI harness 進行委派工作的位置。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 僅適用於外部 ACP harness（`claude`、`droid`、`gemini`、`opencode`，或明確請求的 Codex ACP/acpx），以及 `runtime.type` 為 `acp` 的 `agents.list[]` 條目。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  僅限 ACP。當 `runtime: "acp"` 時，恢復現有的 ACP harness 會話；原生子代理生成時將忽略此項。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  僅限 ACP。當 `runtime: "acp"` 時，將 ACP 執行輸出串流到父階會話；原生子代理生成時省略此項。
</ParamField>
<ParamField path="model" type="string">
  覆蓋子代理的模型。無效值將被跳過，子代理將在預設模型上執行，並在工具結果中顯示警告。
</ParamField>
<ParamField path="thinking" type="string">
  覆蓋子代理執行的思維等級。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`。設定時，子代理執行將在 N 秒後中止。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  當為 `true` 時，請求此子代理會話的頻道執行緒綁定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  若省略 `thread: true` 和 `mode`，預設值變為 `session`。`mode: "session"` 需要 `thread: true`。
  若請求頻道無法使用執行緒綁定，請改用 `mode: "run"`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 會在公告後立即歸檔（仍透過重新命名保留對話紀錄）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 會拒絕生成，除非目標子進程執行環境已沙盒化。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 會將請求者的當前對話紀錄分支到子會話中。僅限原生子代理。執行緒綁定的生成預設為 `fork`；非執行緒生成預設為 `isolated`。
</ParamField>

<Warning>`sessions_spawn` **不** 接受通道傳遞參數（`target`, `channel`、`to`、`threadId`、`replyTo`、`transport`）。原生子代理會將 其最新的助手回合回報給請求者；外部傳遞則保留在 父代理/請求者代理處。</Warning>

### 任務名稱與目標定位

`taskName` 是面向模型的協調處理程式（handle），而非會話金鑰。
當協調器稍後可能需要檢查該子程式時，請將其用於穩定的子名稱，例如 `review_subagents`、
`linux_validation` 或 `docs_update`。

目標解析接受精確的 `taskName` 符合項與明確的
前置字串。比對範圍限縮在與編號 `/subagents` 目標相同的
作用中/近期目標視窗內，因此過期的已完成子程式不會使
重複使用的處理程式變得歧義。如果有兩個作用中或近期的子程式共用相同的
`taskName`，則該目標具備歧義性；請改用列表索引、會話金鑰或
執行 ID。

保留目標 `last` 和 `all` 不是有效的 `taskName` 值，
因為它們已具有控制含義。

## 工具：`sessions_yield`

結束目前的模型回合並等待執行時期事件，主要是
子代理完成事件，以作為下一則訊息到來。當請求者
在這些完成項到達前無法產生最終答案時，請在
產生必要的子工作後使用此工具。

`sessions_yield` 是等待的原語。請勿將其取代為輪詢
迴圈，以監測 `subagents`、`sessions_list`、`sessions_history`、Shell
`sleep` 或程序輪詢僅為了偵測子完成狀態。

僅在會話的有效工具清單包含 `sessions_yield` 時才使用它。某些最小化或自訂工具設定檔可能會公開 `sessions_spawn` 和
`subagents` 而不公開 `sessions_yield`；在這種情況下，請勿僅為了等待完成而發明一個輪詢迴圈。

當存在活躍的子會話時，OpenClaw 會將一個精簡的執行時生成的
`Active Subagents` 提示區塊注入到一般回合中，以便請求者可以在不進行輪詢的情況下查看當前的子會話、執行 ID、狀態、標籤、任務和
`taskName` 別名。該區塊中的任務和標籤欄位被引述為資料，而非指令，因為它們可能源自使用者/模型提供的衍生參數。

## 工具：`subagents`

列出由請求者會話所擁有的已衍生子代理執行。其範圍限定於當前請求者；子代理只能看到其自身控制的子代理。

使用 `subagents` 進行按需狀態檢查和除錯。使用 `sessions_yield` 來
等待完成事件。

## 執行緒綁定會話

當為頻道啟用執行緒綁定時，子代理可以保持綁定到某個執行緒，以便該執行緒中的後續使用者訊息繼續路由到同一個子代理會話。

### 支援執行緒的頻道

任何具有會話綁定配接器的頻道都可以支援持久化的執行緒綁定子代理會話（`sessions_spawn` 搭配 `thread: true`）。
內建配接器目前包括 Discord 執行緒、Matrix 執行緒、
Telegram 論壇主題，以及飛書的目前對話綁定。
請使用各頻道的 `threadBindings` 設定金鑰來進行啟用、
逾時設定和 `spawnSessions`。

### 快速流程

<Steps>
  <Step title="衍生">`sessions_spawn` 搭配 `thread: true`（並選擇性地搭配 `mode: "session"`）。</Step>
  <Step title="綁定">OpenClaw 在活躍頻道中建立或綁定一個執行緒至該會話目標。</Step>
  <Step title="Route follow-ups">該執行緒中的回覆和後續訊息會路由至綁定的工作階段。</Step>
  <Step title="Inspect timeouts">使用 `/session idle` 來檢查/更新非活動自動取消聚焦， 並使用 `/session max-age` 來控制硬性上限。</Step>
  <Step title="Detach">使用 `/unfocus` 進行手動分離。</Step>
</Steps>

### 手動控制

| 指令               | 效果                                                |
| ------------------ | --------------------------------------------------- |
| `/focus <target>`  | 將當前執行緒（或建立一個）綁定到子代理/工作階段目標 |
| `/unfocus`         | 移除當前綁定執行緒的綁定                            |
| `/agents`          | 列出活動執行和綁定狀態 (`thread:<id>` 或 `unbound`) |
| `/session idle`    | 檢查/更新閒置自動取消聚焦（僅限已聚焦的綁定執行緒） |
| `/session max-age` | 檢查/更新硬性上限（僅限已聚焦的綁定執行緒）         |

### 設定開關

- **全域預設值：** `session.threadBindings.enabled`，`session.threadBindings.idleHours`，`session.threadBindings.maxAgeHours`。
- **頻道覆寫和生成自動綁定金鑰** 因配接器而異。請參閱上方的 [Thread supporting channels](#thread-supporting-channels)。

請參閱 [Configuration reference](/zh-Hant/gateway/configuration-reference) 和
[Slash commands](/zh-Hant/tools/slash-commands) 以了解目前配接器的詳細資訊。

### 允許清單

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可透過明確的 `agentId` 指定的已設定代理程式 ID 列表（`["*"]` 允許任何已設定的目標）。預設值：僅請求者代理程式。如果您設定了一個列表，但仍希望請求者使用 `agentId` 生成自身，請在列表中包含請求者 ID。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  當請求者代理程式未設定其自己的 `subagents.allowAgents` 時使用的預設已設定目標代理程式允許列表。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確選擇設定檔）。個別代理程式覆寫：`agents.list[].subagents.requireAgentId`。
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  閘道 `agent` 公告傳遞嘗試的每次呼叫逾時。值為正整數毫秒，並會夾限在平台安全的計時器最大值內。暫時性重試可能會使總公告等待時間長於一個設定的逾時時間。
</ParamField>

如果請求者會話是在沙盒中執行，`sessions_spawn` 將拒絕
會以非沙盒方式執行的目標。

### 探索

使用 `agents_list` 查看目前允許用於
`sessions_spawn` 的代理程式 ID。回應包含每個列出代理程式的有效
模型和嵌入式執行時期元數據，以便呼叫者能夠區分 OpenClaw、Codex
app-server 和其他已設定的原生執行時期。

`allowAgents` 條目必須指向 `agents.list[]` 中已設定的代理程式 ID。`["*"]` 表示任何已設定的目標代理程式加上請求者。如果刪除了代理程式設定但其 ID 仍保留在 `allowAgents` 中，`sessions_spawn` 會拒絕該 ID，且 `agents_list` 會將其省略。執行 `openclaw doctor --fix` 以清理過時的允許清單條目，或者當目標應在繼承預設值的同時保持可產生時，新增一個最小的 `agents.list[]` 條目。

### 自動封存

- 子代理程式工作階段會在 `agents.defaults.subagents.archiveAfterMinutes`（預設 `60`）後自動封存。
- 封存使用 `sessions.delete` 並將對話記錄重新命名為 `*.deleted.<timestamp>`（相同資料夾）。
- `cleanup: "delete"` 會在宣告後立即封存（仍透過重新命名保留對話記錄）。
- 自動封存為盡力而為；如果閘道重新啟動，擱置中的計時器將會遺失。
- `runTimeoutSeconds` **不會**自動封存；它僅停止執行。工作階段會保留直到自動封存。
- 自動封存同樣適用於深度 1 和深度 2 的工作階段。
- 瀏覽器清理與封存清理分開進行：即使保留對話記錄/工作階段記錄，追蹤的瀏覽器分頁/程序也會在執行結束時盡力關閉。

## 巢狀子代理程式

預設情況下，子代理程式無法產生自己的子代理程式（`maxSpawnDepth: 1`）。設定 `maxSpawnDepth: 2` 以啟用一層巢狀結構 —— **編排器模式**：主代理程式 → 編排器子代理程式 → 工作者子子代理程式。

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn when omitted (0 = no timeout)
        announceTimeoutMs: 120000, // per-call gateway announce timeout
      },
    },
  },
}
```

### 深度層級

| 深度 | 工作階段金鑰形狀                             | 角色                                | 可產生？                     |
| ---- | -------------------------------------------- | ----------------------------------- | ---------------------------- |
| 0    | `agent:<id>:main`                            | 主代理程式                          | 始終                         |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理程式（允許深度 2 時為編排器） | 僅當 `maxSpawnDepth >= 2` 時 |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理程式（葉節點工作者）        | 從不                         |

### 宣告鏈

結果會沿鏈向上回流：

1. 深度 2 工作者完成 → 向其父層（深度 1 編排器）宣告。
2. 深度 1 編排器接收宣告，綜合結果，完成 → 向主代理程式宣告。
3. 主要代理接收公告並交付給使用者。

每個層級只能看到其直接子級的公告。

<Note>
  **操作指引：** 啟動子工作一次並等待完成事件，而不是圍繞 `sessions_list`、 `sessions_history`、`/subagents list` 或 `exec` sleep 指令建置輪詢迴圈。 `sessions_list` 和 `/subagents list` 使子會話關係專注於實時工作 — 實時子級保持附加，已結束的子級在短暫的近期視窗內保持可見，而陳舊的僅儲存子級連結在過了其新鮮度視窗後會被忽略。這可以防止舊的 `spawnedBy` / `parentSessionKey`
  元數據在重啟後復活虛擬子級。如果子完成事件在您已經發送最終答案之後到達，正確的後續操作是確切的靜默令牌 `NO_REPLY` / `no_reply`。
</Note>

### 依深度區分的工具政策

- 角色和控制範圍在生成時寫入會話元數據。這可以防止扁平化或還原的會話金鑰意外重新獲得協調器權限。
- **深度 1（協調器，當 `maxSpawnDepth >= 2` 時）：** 獲得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以生成子級並檢查其狀態。其他會話/系統工具仍然被拒絕。
- **深度 1（葉節點，當 `maxSpawnDepth == 1` 時）：** 無會話工具（目前的預設行為）。
- **深度 2（葉節點工作者）：** 無會話工具 — `sessions_spawn` 在深度 2 處總是被拒絕。無法生成進一步的子級。

### 每個代理的生成限制

每個代理會話（在任何深度）一次最多可以有 `maxChildrenPerAgent`
（預設 `5`）個活躍子級。這可以防止單一協調器出現失控的擴散。

### 級聯停止

停止深度 1 協調器會自動停止其所有深度 2
子級：

- 主聊天中的 `/stop` 會停止所有深度 1 代理並級聯至其深度 2 子級。

## 驗證

子代理認證是透過 **代理 ID** 解析的，而不是透過會話類型：

- 子代理會話金鑰是 `agent:<agentId>:subagent:<uuid>`。
- 認證儲存是從該代理的 `agentDir` 載入的。
- 主代理的認證設定檔會作為 **後備** 合併進來；發生衝突時，代理設定檔會覆蓋主設定檔。

此合併是累加的，因此主設定檔始終可作為後備使用。每個代理的完全隔離認證尚不支援。

## 宣佈

子代理透過宣佈步驟回報：

- 宣佈步驟在子代理會話內執行（而非請求者會話）。
- 如果子代理完全回覆 `ANNOUNCE_SKIP`，則不會發布任何內容。
- 如果最新的助理文字是完全的靜默權杖 `NO_REPLY` / `no_reply`，即使先前有可見的進度，也會隱藏宣佈輸出。

傳遞方式取決於請求者深度：

- 頂層請求者會話使用帶有外部傳遞（`deliver=true`）的後續 `agent` 呼叫。
- 巢狀請求者子代理會話會接收內部後續注入（`deliver=false`），以便協調器可以在會話內綜合子項結果。
- 如果巢狀請求者子代理會話已消失，OpenClaw 會在可用時回退至該會話的請求者。

對於頂層請求者會話，完成模式的直接傳遞會先解析任何綁定的對話/執行緒路由和掛鉤覆寫，然後從請求者會話的儲存路由中填入遺漏的目標欄位。這確保即使完成來源僅識別頻道，完成結果仍會保留在正確的聊天/主題上。

在建立巢狀完成發現時，子項完成聚合會限定範圍在當前的請求者執行，防止陳舊的先前執行子項輸出滲漏到當前的宣佈中。當頻道配接器支援時，宣佈回覆會保留執行緒/主題路由。

### 宣佈情境

宣佈情境會被正規化為一個穩定的內部事件區塊：

| 欄位     | 來源                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| 來源     | `subagent` 或 `cron`                                                                 |
| 會話 ID  | 子會話金鑰/ID                                                                        |
| 類型     | 宣佈類型 + 任務標籤                                                                  |
| 狀態     | 源自執行時結果 (`success`, `error`, `timeout`, 或 `unknown`) — **非** 從模型文字推斷 |
| 結果內容 | 來自子項的最新可見助手文字                                                           |
| 後續處理 | 描述何時回覆與何時保持沈默的指令                                                     |

終止失敗的執行會回報失敗狀態，而不會重播擷取的回覆文字。Tool/toolResult 輸出不會提升至子項結果文字中。

### 統計資訊行

Announce 載荷在最後會包含一個統計資訊行（即使被換行包覆）：

- 執行時間（例如 `runtime 5m12s`）。
- Token 使用量（輸入/輸出/總計）。
- 當設定模型定價時的預估成本 (`models.providers.*.models[].cost`)。
- `sessionKey`, `sessionId`, 和文字記錄路徑，以便主代理可以透過 `sessions_history` 擷取歷史紀錄或檢查磁碟上的檔案。

內部中繼資料僅供協調使用；面向使用者的回覆應以一般助手語氣重寫。

### 為何偏好使用 `sessions_history`

`sessions_history` 是較安全的協調路徑：

- 助手召回會先進行正規化：移除思考標籤；移除 `<relevant-memories>` / `<relevant_memories>` 鷹架；移除純文字工具呼叫 XML 載荷區塊 (`<tool_call>`, `<function_call>`, `<tool_calls>`, `<function_calls>`)，包含無法乾淨結束的截斷載荷；移除降級的工具呼叫/結果鷹架和歷史紀錄內容標記；移除洩漏的模型控制權杖 (`<|assistant|>`, 其他 ASCII `<|...|>`, 全形 `<｜...｜>`)；移除格式錯誤的 MiniMax 工具呼叫 XML。
- 類似憑證/權杖的文字會被編修。
- 長區塊可能會被截斷。
- 非常大的歷史紀錄可能會捨棄較舊的列或以 `[sessions_history omitted: message too large]` 取代過大的列。
- 當您需要完整的逐位元組文字記錄時，檢查原始磁碟文字記錄是備用方案。

## 工具原則

子代理首先使用與父代理或目標代理相同的設定檔和工具策略管道。之後，OpenClaw 會套用子代理限制層。

如果沒有限制性的 `tools.profile`，子代理將獲得**除訊息工具、會話工具和系統工具以外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`
- `message`

`sessions_history` 在此處也是一個有界、經過清理的回溯視圖 — 它不是原始的逐字稿傾倒。

當 `maxSpawnDepth >= 2` 時，深度 1 編排器子代理還會獲得 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它們可以管理其子項。

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

`tools.subagents.tools.allow` 是一個最終的僅允許過濾器。它可以縮小已解析的工具集，但無法**加回**被 `tools.profile` 移除的工具。例如，`tools.profile: "coding"` 包含 `web_search`/`web_fetch` 但不包含 `browser` 工具。若要讓編碼設定檔子代理使用瀏覽器自動化，請在設定檔階段加入瀏覽器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

當只有一個代理應該獲得瀏覽器自動化時，請使用每個代理的 `agents.list[].tools.alsoAllow: ["browser"]`。

## 並行性

子代理使用專用的進程內佇列通道：

- **通道名稱：** `subagent`
- **並行性：** `agents.defaults.subagents.maxConcurrent` (預設 `8`)

## 活躍度與復原

OpenClaw 不會將 `endedAt` 的缺席視為子代理仍然活著的永久證明。早於過期執行視窗的未結束執行，會在 `/subagents list`、狀態摘要、後代完成閘道和每個會話的並行性檢查中停止計算為有效/待處理。

在閘道重新啟動後，除非其子會話被標記為 `abortedLastRun: true`，否則陳舊未結束的還原執行會被清除。這些因重新啟動而中止的子會話仍可透過子代理程式孤兒還原流程進行還原，該流程會在清除中止標記之前發送一個合成的還原訊息。

自動重新啟動還原是以每個子會話為界限。如果在快速重新楔入視窗內，同一個子代理程式子系被重複接受進行孤兒還原，OpenClaw 會在該會話上保留還原墓碑，並在後續重新啟動時停止自動還原它。請執行 `openclaw tasks maintenance --apply` 以調和工作記錄，或執行 `openclaw doctor --fix` 以清除具有墓碑標記之會務上的陳舊中止還原旗標。

<Note>
  如果子代理程式衍生因 Gateway `PAIRING_REQUIRED` / `scope-upgrade` 而失敗，請在編輯配對狀態前檢查 RPC 呼叫者。內部 `sessions_spawn` 協調應使用直接迴路共用記號/密碼驗證，以 `client.id: "gateway-client"` 連線並帶有 `client.mode: "backend"`；該路徑不依賴 CLI 的配對裝置範圍基準。遠端呼叫者、顯式 `deviceIdentity`、顯式裝置記號路徑，以及瀏覽器/node 客戶端仍然需要正常的裝置核准才能進行範圍升級。
</Note>

## 停止

- 在請求者聊天中發送 `/stop` 會中止請求者會話並停止由其衍生的任何作用中子代理程式執行，並層級式影響至巢狀子項。

## 限制

- 子代理程式公告屬於 **最佳努力**。如果閘道重新啟動，待處理的「公告回覆」工作將會遺失。
- 子代理程式仍然共用相同的閘道程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 始終為非阻斷式：它會立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文僅注入 `AGENTS.md` 和 `TOOLS.md`（不包含 `SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。Codex 原生子代理遵循相同的邊界：`TOOLS.md` 保留在繼承的 Codex 執行緒指令中，而僅限父代的人格、身份和使用者檔案則被注入為回合範圍的協作指令，因此子代不會複製它們。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。對於大多數使用情況，建議使用深度 2。
- `maxChildrenPerAgent` 限制每個階段的活躍子代數量（預設 `5`，範圍 `1–20`）。

## 相關

- [ACP agents](/zh-Hant/tools/acp-agents)
- [Agent send](/zh-Hant/tools/agent-send)
- [Background tasks](/zh-Hant/automation/tasks)
- [Multi-agent sandbox tools](/zh-Hant/tools/multi-agent-sandbox-tools)
