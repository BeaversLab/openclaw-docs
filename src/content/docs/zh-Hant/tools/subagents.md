---
summary: "產生獨立的背景代理執行，並將結果宣佈回請求者的聊天"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
sidebarTitle: "子代理"
---

子代理是由現有代理運行產生的後台代理運行。
它們在自己的會話 (`agent:<agentId>:subagent:<uuid>`) 中運行，並在完成時將結果**通知**
回請求者聊天頻道。每個子代理運行都會被追蹤為
[背景任務](/zh-Hant/automation/tasks)。

主要目標：

- 在不阻塞主要執行的情況下，平行化「研究 / 長任務 / 慢速工具」工作。
- 預設讓 sub-agents 保持隔離（session 分隔 + 可選的沙箱機制）。
- 讓工具介面難以誤用：sub-agents **不** 會預設取得 session 工具。
- 支援可配置的巢狀深度，以實現編排器模式。

<Note>
  **成本注意：** 預設情況下，每個子代理都有自己的上下文和 token 使用量。 對於繁重或重複性任務，請為子代理設定更便宜的模型，並將您的主代理 保持在較高品質的模型上。透過 `agents.defaults.subagents.model` 或各代理的覆寫進行設定。 當子代理確實需要請求者的當前紀錄時，代理可以在該次生成時請求 `context: "fork"`。綁定執行緒的子代理會話預設為 `context: "fork"`，因為它們將當前對話分支為後續執行緒。
</Note>

## 斜線指令

使用 `/subagents` 來檢查**目前會話**的子代理運行：

```text
/subagents list
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
```

`/subagents info` 顯示運行元資料（狀態、時間戳、會話 ID、
紀錄路徑、清理作業）。使用 `sessions_history` 來獲得受限的、
經過安全過濾的回顧視圖；當您需要原始的完整紀錄時，請檢查磁碟上的紀錄路徑。

### Thread binding controls

這些指令在支援持久執行緒綁定的頻道上運作。
請參閱下方的 [支援執行緒的頻道](#thread-supporting-channels)。

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### Spawn behavior

代理使用 `sessions_spawn` 啟動後台子代理。子代理完成
後會作為內部父會話事件返回；父代理/請求者代理會決定
是否需要面向使用者的更新。

<AccordionGroup>
  <Accordion title="Non-blocking, push-based completion">
    - `sessions_spawn` 為非阻斷式；它會立即傳回一個執行 ID。
    - 完成後，子代理程式會向父代/請求者階段回報。
    - 需要子結果的代理程式回合應在產生所需工作後呼叫 `sessions_yield`。這會結束當前回合，並讓完成事件以下一個模型可見訊息的形式抵達。
    - 完成採用推送式。一旦產生，請**勿**僅為了等待其完成而在迴圈中輪詢 `/subagents list`、`sessions_list` 或 `sessions_history`；僅在按需檢查狀態以進行除錯。
    - 子輸出是供請求者代理程式綜合的報告/證據。它不是使用者撰寫的指令文字，無法覆寫系統、開發者或使用者原則。
    - 完成後，OpenClaw 會盡最大努力在宣告清理流程繼續之前，關閉由該子代理程式階段開啟的受追蹤瀏覽器分頁/處理程序。

  </Accordion>
  <Accordion title="Completion delivery">
    - OpenClaw 透過具有穩定冪等金鑰的 `agent` 輪次，將完成結果交還給請求者會話。
    - 如果請求者執行仍然活躍，OpenClaw 會先嘗試喚醒/引導該執行，而不是啟動第二個可見的回覆路徑。
    - 如果無法喚醒活躍的請求者，OpenClaw 會回退到具有相同完成內容的請求者代理移交，而不是捨棄公告。
    - 成功的父移交會完成子代理交付，即使父決定不需要可見的使用者更新。
    - 原生子代理不會獲得訊息工具。它們會將純文字助理文字返回給父/請求者代理；人類可見的回覆由父/請求者代理的正常交付策略擁有。
    - 如果無法使用直接移交，它會回退到佇列路由。
    - 如果佇列路由仍然不可用，公告會在最終放棄之前以短指數退避進行重試。
    - 完成交付會保留已解析的請求者路由：綁定執行緒或綁定對話的完成路由在可用時獲勝；如果完成來源僅提供頻道，OpenClaw 會從請求者會話的已解析路由（`lastChannel` / `lastTo` / `lastAccountId`）中填補缺少的目標/帳戶，以便直接交付仍然有效。

  </Accordion>
  <Accordion title="完成移交元數據">
    移交給請求者會話的完成上下文是運行時生成的
    內部上下文（非使用者撰寫的文字），包含：

    - `Result` — 來自子項的最新可見 `assistant` 回覆文字。工具/工具結果輸出不會被提升至子項結果中。終端失敗的運行不會重用已捕獲的回覆文字。
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`。
    - 簡潔的運行時/Token 統計。
    - 審查指令，指示請求者代理在決定原始任務是否完成之前驗證結果。
    - 後續指導，指示請求者代理在子項結果還有更多操作時繼續任務或記錄後續事項。
    - 無更多操作路徑的最終更新指令，以普通助手語氣撰寫，不轉發原始內部元數據。

  </Accordion>
  <Accordion title="Modes and ACP runtime">
    - `--model` 和 `--thinking` 會覆寫該次特定執行的預設值。
    - 使用 `info`/`log` 來檢查完成後的細節和輸出。
    - 對於持續性的執行緒綁定工作階段，請將 `sessions_spawn` 搭配 `thread: true` 和 `mode: "session"` 使用。
    - 如果請求者頻道不支援執行緒綁定，請使用 `mode: "run"`，而不是重試不可能的執行緒綁定組合。
    - 對於 ACP harness 工作階段（Claude Code、Gemini CLI、OpenCode 或明確的 Codex ACP/acpx），當工具通告該執行環境時，請將 `sessions_spawn` 搭配 `runtime: "acp"` 使用。除錯完成項目或代理對代理迴圈時，請參閱 [ACP delivery model](/zh-Hant/tools/acp-agents#delivery-model)。當啟用 `codex` 外掛程式時，除非使用者明確要求 ACP/acpx，否則 Codex 聊天/執行緒控制應優先選擇 `/codex ...` 而非 ACP。
    - OpenClaw 會隱藏 `runtime: "acp"`，直到啟用 ACP、請求者未沙盒化，並載入後端外掛程式（例如 `acpx`）為止。`runtime: "acp"` 預期會有外部 ACP harness id，或是帶有 `runtime.type="acp"` 的 `agents.list[]` 項目；對於來自 `agents_list` 的正常 OpenClaw 設定代理，請使用預設的子代理執行環境。

  </Accordion>
</AccordionGroup>

## 上下文模式

原生子代理程式啟動時是隔離的，除非呼叫者明確要求分叉目前對話紀錄。

| 模式       | 使用時機                                                           | 行為                                                                |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `isolated` | 新研究、獨立實作、緩慢的工具工作，或任何可以在任務文字中簡報的事項 | 建立一個乾淨的子對話紀錄。這是預設值，並能保持較低的 token 使用量。 |
| `fork`     | 依賴目前對話、先前工具結果或請求者對話紀錄中已存在的細微指令的工作 | 在子會話開始之前，將請求者對話紀錄分支到子會話中。                  |

請節制使用 `fork`。它是用於上下文相關的委派，而非撰寫清晰任務提示詞的替代方案。

## 工具：`sessions_spawn`

在全局 `subagent` 通道上使用 `deliver: false` 啟動子代理執行，然後執行公告步驟並將公告回覆發佈至請求者聊天頻道。

可用性取決於呼叫者的有效工具原則。`coding` 和
`full` 設定檔預設會顯示 `sessions_spawn`。`messaging` 設定檔
則不會；對於應該委派工作的代理，請新增 `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"`。頻道/群組、提供者、沙箱和每個代理的允許/拒絕原則
仍然可以在設定檔階段之後移除該工具。使用來自相同
會話的 `/tools` 來確認有效的工具清單。

**預設值：**

- **模型：** 原生子代理繼承呼叫者，除非您設定 `agents.defaults.subagents.model` (或每個代理的 `agents.list[].subagents.model`)。ACP 執行環境產生的子代理會使用已設定的相同子代理模型（如果有的話）；否則 ACP 驅動程式會保留自己的預設值。明確的 `sessions_spawn.model` 仍然優先。
- **思考：** 原生子代理繼承呼叫者，除非您設定 `agents.defaults.subagents.thinking` (或每個代理的 `agents.list[].subagents.thinking`)。ACP 執行環境產生的子代理也會對選定的模型套用 `agents.defaults.models["provider/model"].params.thinking`。明確的 `sessions_spawn.thinking` 仍然優先。
- **執行逾時：** OpenClaw 在設定時會使用 `agents.defaults.subagents.runTimeoutSeconds`；否則會回退到 `0` (無逾時)。`sessions_spawn` 不接受每次呼叫的逾時覆蓋。
- **任務交付：** 原生子代理會在其第一個可見的 `[Subagent Task]` 訊息中接收委派的任務。子代理系統提示攜帶執行時期規則和路由上下文，而不是隱藏的任務重複副本。

已接受的原生子代理產生會在工具結果中包含解析後的子模型元數據：
`resolvedModel` 包含已套用的模型參照，當參照具有提供者前綴時，
`resolvedProvider` 包含提供者前綴。

### 委派提示模式

`agents.defaults.subagents.delegationMode` 僅控制提示指導；它不會變更工具原則或強制執行委派。

- `suggest` (預設)：保留標準提示以針對較大或較慢的工作使用子代理。
- `prefer`：指示主代理保持響應，並將任何超出直接回復範圍的複雜事項透過 `sessions_spawn` 進行委派。

針對各個代理的覆寫使用 `agents.list[].subagents.delegationMode`。

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
  可選的穩定標識符，用於在後續狀態輸出中識別特定子項。必須符合 `[a-z][a-z0-9_-]{0,63}` 且不能是保留的目標，如 `last` 或 `all`。
</ParamField>
<ParamField path="label" type="string">
  可選的人類可讀標籤。
</ParamField>
<ParamField path="agentId" type="string">
  當 `subagents.allowAgents` 允許時，在另一個已配置的代理 ID 下生成。
</ParamField>
<ParamField path="cwd" type="string">
  子運行的可選任務工作目錄。原生子代理仍然從目標代理工作區載入引導檔案；`cwd` 僅更改運行時工具和 CLI 執行器執行委派工作的位置。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 僅適用於外部 ACP 執行器（`claude`、`droid`、`gemini`、`opencode` 或明確請求的 Codex ACP/acpx），以及對於 `runtime.type` 為 `acp` 的 `agents.list[]` 條目。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  僅限 ACP。當 `runtime: "acp"` 時，恢復現有的 ACP 執行器會話；對於原生子代理生成則會被忽略。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  僅限 ACP。當 `runtime: "acp"` 時，將 ACP 運行輸出串流到父會話；對於原生子代理生成請省略。
</ParamField>
<ParamField path="model" type="string">
  覆蓋子代理模型。無效值將被跳過，子代理將在預設模型上運行，並在工具結果中顯示警告。
</ParamField>
<ParamField path="thinking" type="string">
  覆蓋子代理運行的思考層級。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  當 `true` 時，請求此子代理會話的頻道執行緒綁定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果省略 `thread: true` 和 `mode`，預設值會變為 `session`。`mode: "session"` 需要 `thread: true`。
  如果請求頻道無法使用執行緒綁定，請改用 `mode: "run"`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 在公告後立即歸檔（仍透過重新命名保留對話記錄）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 會拒絕生成，除非目標子運行時是沙盒化的。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 將請求者的當前對話記錄分支出子會話。僅限原生子代理。執行緒綁定的生成預設為 `fork`；非執行緒生成預設為 `isolated`。
</ParamField>

<Warning>`sessions_spawn` **不** 接受通道傳遞參數（`target`、 `channel`、`to`、`threadId`、`replyTo`、`transport`）。原生子代理會將 其最新的助理輪次報告給請求者；外部傳遞則保留在 父級/請求者代理處。</Warning>

### 任務名稱與目標定位

`taskName` 是一個供編排使用的模型級別句柄，而非會話金鑰。
當協調器稍後可能需要檢查該子項時，請將其用於穩定的子項名稱，例如 `review_subagents`、
`linux_validation` 或 `docs_update`。

目標解析接受完全匹配的 `taskName` 和無歧義的
前綴。匹配範圍僅限於編號 `/subagents` 目標所使用的同一個作用中/近期目標視窗，因此已過時的已完成子項不會導致
重複使用的句柄產生歧義。如果有兩個作用中或近期的子項共用相同的
`taskName`，則該目標具有歧義；請改用列表索引、會話金鑰或
執行 ID。

保留目標 `last` 和 `all` 不是有效的 `taskName` 值，
因為它們已具有控制含義。

## 工具：`sessions_yield`

結束目前的模型回合並等待執行時期事件，主要是
子代理完成事件，以作為下一則訊息到來。當請求者
在這些完成項到達前無法產生最終答案時，請在
產生必要的子工作後使用此工具。

`sessions_yield` 是等待基本指令。切勿將其替換為僅為偵測子項完成而對
`subagents`、`sessions_list`、`sessions_history`、Shell
`sleep` 或程序進行的輪詢迴圈。

僅當會話的有效工具清單包含 `sessions_yield` 時才使用它。某些最小化或自訂工具設定檔可能會公開
`sessions_spawn` 和
`subagents` 而不公開 `sessions_yield`；在這種情況下，請勿僅為了等待完成而
發明輪詢迴圈。

當存在活動的子項時，OpenClaw 會將一個緊湊的執行時生成的
`Active Subagents` 提示區塊注入到一般輪次中，以便請求者可以查看
目前的子項會話、執行 ID、狀態、標籤、任務和
`taskName` 別名，而無需輪詢。該區塊中的任務和標籤欄位被引用為數據，而非指令，因為它們可能源自
用戶/模型提供的產生引數。

## 工具：`subagents`

列出由請求者會話所擁有的已衍生子代理執行。其範圍限定於當前請求者；子代理只能看到其自身控制的子代理。

使用 `subagents` 取得隨需狀態和進行偵錯。使用 `sessions_yield`
等待完成事件。

## 執行緒綁定會話

當為頻道啟用執行緒綁定時，子代理可以保持綁定到某個執行緒，以便該執行緒中的後續使用者訊息繼續路由到同一個子代理會話。

### 支援執行緒的頻道

任何具有會話綁定配接器的頻道都可以支援持續的
執行緒綁定子代理會話（`sessions_spawn` 與 `thread: true`）。
內建的配接器目前包括 Discord 執行緒、Matrix 執行緒、
Telegram 論壇主題，以及飛書（Feishu）的目前對話綁定。
使用各頻道的 `threadBindings` 設定鍵來進行啟用、
逾時設定和 `spawnSessions`。

### 快速流程

<Steps>
  <Step title="產生">使用 `sessions_spawn` 和 `thread: true`（並可選擇性地使用 `mode: "session"`）。</Step>
  <Step title="綁定">OpenClaw 會在活動頻道中為該會話目標建立或綁定執行緒。</Step>
  <Step title="路由後續訊息">該執行緒中的回覆和後續訊息會路由至已綁定的會話。</Step>
  <Step title="檢查逾時">使用 `/session idle` 來檢查/更新非活動自動取消焦點設定，並使用 `/session max-age` 來控制硬性上限。</Step>
  <Step title="分離">使用 `/unfocus` 手動分離。</Step>
</Steps>

### 手動控制

| 指令               | 效果                                                 |
| ------------------ | ---------------------------------------------------- |
| `/focus <target>`  | 將當前執行緒（或建立一個）綁定到子代理/工作階段目標  |
| `/unfocus`         | 移除當前綁定執行緒的綁定                             |
| `/agents`          | 列出活動執行和綁定狀態（`thread:<id>` 或 `unbound`） |
| `/session idle`    | 檢查/更新閒置自動取消聚焦（僅限已聚焦的綁定執行緒）  |
| `/session max-age` | 檢查/更新硬性上限（僅限已聚焦的綁定執行緒）          |

### 設定開關

- **全域預設：** `session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **頻道覆寫與生成自動綁定金鑰** 因介面卡而異。請參閱上方的[支援執行緒的頻道](#thread-supporting-channels)。

關於目前介面卡的詳細資訊，請參閱[設定參考](/zh-Hant/gateway/configuration-reference)與[斜線指令](/zh-Hant/tools/slash-commands)。

### 允許清單

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可透過明確 `agentId` 指定的已配置代理程式 ID 清單（`["*"]` 允許任何已配置的目標）。預設值：僅限請求者代理程式。如果您設定清單但仍希望請求者使用 `agentId` 自行生成，請在清單中包含請求者 ID。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  當請求者代理程式未設定其自己的 `subagents.allowAgents` 時，使用的預設已配置目標代理程式允許清單。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確選取設定檔）。單一代理程式覆寫：`agents.list[].subagents.requireAgentId`。
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  閘道 `agent` 公告傳遞嘗試的每次呼叫逾時時間。值為正整數毫秒，並會限制為平台安全的計時器最大值。暫時性重試可能會使總公告等待時間超過一個設定的逾時時間。
</ParamField>

如果請求者工作階段處於沙箱中，`sessions_spawn` 將拒絕會以非沙箱方式執行的目標。

### 探索

使用 `agents_list` 查看目前允許 `sessions_spawn` 使用的代理程式 ID。回應包含每個列出的代理程式之有效模型和內嵌執行時期元數據，以便呼叫者區分 OpenClaw、Codex 應用程式伺服器及其他已配置的原生執行時期。

`allowAgents` 條目必須指向 `agents.list[]` 中已設定的代理程式 ID。`["*"]` 表示任何已設定的目標代理程式加上請求者。如果刪除了代理程式設定但其 ID 仍保留在 `allowAgents` 中，`sessions_spawn` 會拒絕該 ID，而 `agents_list` 則會將其省略。執行 `openclaw doctor --fix` 以清除過時的允許列表條目，或者在目標應在繼承預設值的同時保持可產生狀態時，新增一個最少的 `agents.list[]` 條目。

### 自動封存

- 子代理程式會話會在 `agents.defaults.subagents.archiveAfterMinutes`（預設為 `60`）後自動封存。
- 封存使用 `sessions.delete` 並將對話記錄重新命名為 `*.deleted.<timestamp>`（同一資料夾）。
- `cleanup: "delete"` 會在公布後立即封存（仍透過重新命名保留對話記錄）。
- 自動封存為盡力而為；如果閘道重新啟動，擱置中的計時器將會遺失。
- 已設定的執行逾時**不會**自動封存；它們僅停止執行。會話會保留直到自動封存為止。
- 自動封存同樣適用於深度 1 和深度 2 的工作階段。
- 瀏覽器清理與封存清理分開進行：即使保留對話記錄/工作階段記錄，追蹤的瀏覽器分頁/程序也會在執行結束時盡力關閉。

## 巢狀子代理程式

預設情況下，子代理程式無法產生自己的子代理程式（`maxSpawnDepth: 1`）。設定 `maxSpawnDepth: 2` 以啟用一層巢狀結構 —— **編排器模式**：main → orchestrator sub-agent → worker sub-sub-agents。

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn (0 = no timeout)
        announceTimeoutMs: 120000, // per-call gateway announce timeout
      },
    },
  },
}
```

### 深度層級

| 深度 | 工作階段金鑰形狀                             | 角色                                | 可產生？                  |
| ---- | -------------------------------------------- | ----------------------------------- | ------------------------- |
| 0    | `agent:<id>:main`                            | 主代理程式                          | 始終                      |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理程式（允許深度 2 時為編排器） | 僅當 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理程式（葉節點工作者）        | 從不                      |

### 宣告鏈

結果會沿鏈向上回流：

1. 深度 2 工作者完成 → 向其父層（深度 1 編排器）宣告。
2. 深度 1 編排器接收宣告，綜合結果，完成 → 向主代理程式宣告。
3. 主要代理接收公告並交付給使用者。

每個層級只能看到其直接子級的公告。

<Note>
  **操作指南：** 啟動子工作一次，然後等待完成事件，而不是圍繞 `sessions_list`、 `sessions_history`、`/subagents list` 或 `exec` sleep 指令建立輪詢迴圈。 `sessions_list` 和 `/subagents list` 保持子會話關係 專注於進行中的工作 — 進行中的子工作保持連接，已結束的子工作在 短時間內保持可見，而陳舊的僅存儲子連結會在 其新鮮度視窗過後被忽略。這可以防止舊的 `spawnedBy` / `parentSessionKey` 元數據在重啟後
  恢復過時的子工作。如果子工作完成事件在您已經發送 最終答案後才到達，正確的後續處理是使用精確的靜默令牌 `NO_REPLY` / `no_reply`。
</Note>

### 依深度區分的工具政策

- 角色和控制範圍在生成時寫入會話元數據。這可以防止扁平化或還原的會話金鑰意外重新獲得協調器權限。
- **深度 1 (協調器，當 `maxSpawnDepth >= 2` 時)：** 獲得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以生成子工作並檢查其狀態。其他會話/系統工具仍然被拒絕。
- **深度 1 (葉節點，當 `maxSpawnDepth == 1` 時)：** 沒有會話工具（目前的預設行為）。
- **深度 2 (葉節點工作器)：** 沒有會話工具 — `sessions_spawn` 在深度 2 時總是被拒絕。無法生成進一步的子工作。

### 每個代理的生成限制

每個代理會話（在任何深度）一次最多可以有 `maxChildrenPerAgent`
（預設 `5`）個活躍的子工作。這可以防止來自單個協調器的失控擴散。

### 級聯停止

停止深度 1 協調器會自動停止其所有深度 2
子級：

- 主聊天中的 `/stop` 會停止所有深度 1 的代理並級聯到其深度 2 的子工作。

## 驗證

子代理認證是透過 **代理 ID** 解析的，而不是透過會話類型：

- 子代理會話金鑰是 `agent:<agentId>:subagent:<uuid>`。
- 授權存儲是從該代理的 `agentDir` 載入的。
- 主代理的認證設定檔會作為 **後備** 合併進來；發生衝突時，代理設定檔會覆蓋主設定檔。

此合併是累加的，因此主設定檔始終可作為後備使用。每個代理的完全隔離認證尚不支援。

## 宣佈

子代理透過宣佈步驟回報：

- 宣佈步驟在子代理會話內執行（而非請求者會話）。
- 如果子代理確切回覆 `ANNOUNCE_SKIP`，則不會發布任何內容。
- 如果最新的助理文本是確切的靜默令牌 `NO_REPLY` / `no_reply`，即使之前存在可見的進度，也會抑制公告輸出。

傳遞方式取決於請求者深度：

- 頂層請求者會話使用外部傳遞 (`deliver=true`) 的後續 `agent` 呼叫。
- 巢狀請求者子代理會話會接收內部後續注入 (`deliver=false`)，以便協調器能在會話內綜合子項結果。
- 如果巢狀請求者子代理會話已消失，OpenClaw 會在可用時回退至該會話的請求者。

對於頂層請求者會話，完成模式的直接傳遞會先解析任何綁定的對話/執行緒路由和掛鉤覆寫，然後從請求者會話的儲存路由中填入遺漏的目標欄位。這確保即使完成來源僅識別頻道，完成結果仍會保留在正確的聊天/主題上。

在建立巢狀完成發現時，子項完成聚合會限定範圍在當前的請求者執行，防止陳舊的先前執行子項輸出滲漏到當前的宣佈中。當頻道配接器支援時，宣佈回覆會保留執行緒/主題路由。

### 宣佈情境

宣佈情境會被正規化為一個穩定的內部事件區塊：

| 欄位     | 來源                                                                                      |
| -------- | ----------------------------------------------------------------------------------------- |
| 來源     | `subagent` 或 `cron`                                                                      |
| 會話 ID  | 子會話金鑰/ID                                                                             |
| 類型     | 宣佈類型 + 任務標籤                                                                       |
| 狀態     | 衍生自執行時期結果 (`success`、`error`、`timeout` 或 `unknown`) — **而非** 從模型文字推斷 |
| 結果內容 | 來自子項的最新可見助手文字                                                                |
| 後續處理 | 描述何時回覆與何時保持沈默的指令                                                          |

終止失敗的執行會回報失敗狀態，而不會重播擷取的回覆文字。Tool/toolResult 輸出不會提升至子項結果文字中。

### 統計資訊行

Announce 載荷在最後會包含一個統計資訊行（即使被換行包覆）：

- 執行時期 (例如 `runtime 5m12s`)。
- Token 使用量（輸入/輸出/總計）。
- 當已設定模型價格時的估計成本 (`models.providers.*.models[].cost`)。
- `sessionKey`、`sessionId` 和文字記錄路徑，以便主代理能透過 `sessions_history` 取得歷史記錄或檢查磁碟上的檔案。

內部中繼資料僅供協調使用；面向使用者的回覆應以一般助手語氣重寫。

### 為何偏好 `sessions_history`

`sessions_history` 是較安全的協調路徑：

- 助理回憶會先進行正規化：移除思考標籤；移除 `<relevant-memories>` / `<relevant_memories>` 腳手架；移除純文字工具呼叫 XML 承載區塊 (`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`)，包括未正確結尾的截斷承載；移除降級的工具呼叫/結果腳手架及歷史內容標記；移除洩漏的模型控制權杖 (`<|assistant|>`、其他 ASCII `<|...|>`、全形 `<｜...｜>`)；移除格式錯誤的 MiniMax 工具呼叫 XML。
- 類似憑證/權杖的文字會被編修。
- 長區塊可能會被截斷。
- 非常龐大的歷史記錄可能會捨棄較舊的列，或以 `[sessions_history omitted: message too large]` 取代過大的列。
- 當您需要完整的逐位元組文字記錄時，檢查原始磁碟文字記錄是備用方案。

## 工具原則

子代理首先使用與父代理或目標代理相同的設定檔和工具策略管道。之後，OpenClaw 會套用子代理限制層。

若沒有限制性的 `tools.profile`，子代理將獲得 **除了訊息工具、會話工具和系統工具之外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`
- `message`

`sessions_history` 在此處仍然是一個受限制的、經過清理的回顧視圖——它
並非原始的文字記錄傾倒。

當 `maxSpawnDepth >= 2` 時，深度 1 的協編器子代理還會
收到 `sessions_spawn`、`subagents`、`sessions_list` 和
`sessions_history`，以便它們能夠管理其子進程。

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

`tools.subagents.tools.allow` 是一個最終的僅允許過濾器。它可以縮小
已解析的工具集，但無法**重新加回**被
`tools.profile` 移除的工具。例如，`tools.profile: "coding"` 包含
`web_search`/`web_fetch` 但不包含 `browser` 工具。若要讓
coding-profile 子代理使用瀏覽器自動化，請在配置檔案階段新增瀏覽器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

當只有一個代理應該取得瀏覽器自動化權限時，請使用每個代理的 `agents.list[].tools.alsoAllow: ["browser"]`。

## 並行性

子代理使用專用的進程內佇列通道：

- **通道名稱：** `subagent`
- **並行性：** `agents.defaults.subagents.maxConcurrent`（預設 `8`）

## 活躍度與復原

OpenClaw 不會將 `endedAt` 的缺失視為子代理仍然活著的永久證明。超過陳舊執行視窗的未結束執行，將停止在
`/subagents list`、狀態摘要、
後代完成閘門以及每個會話並行性檢查中計算為作用中/待處理狀態。

在閘道重啟後，除非其子會話被標記為 `abortedLastRun: true`，否則陳舊且未結束的已還原執行將被修剪。那些
因重啟而中止的子會話仍可透過子代理
孤兒復原流程進行還原，該流程會在清除中止標記之前發送一個合成恢復訊息。

自動重啟復原對每個子會話都有上限。如果在
快速重新楔入視窗內，同一個子代理子進程重複被接受進行孤兒復原，OpenClaw 將在該
會話上保存一個復原墓碑，並在後續重啟時停止自動恢復它。請執行
`openclaw tasks maintenance --apply` 以協調任務記錄，或
執行 `openclaw doctor --fix` 以清除已設墓碑會話上
陳舊的中止復原標誌。

<Note>
  如果子代理啟動失敗並出現 Gateway `PAIRING_REQUIRED` / `scope-upgrade`，請在編輯配對狀態前檢查 RPC 呼叫端。 內部 `sessions_spawn` 協調應透過直接 loopback 共用 token/密碼驗證，以 `client.id: "gateway-client"` 身分連線並使用 `client.mode: "backend"`；該路徑不依賴 CLI 的配對裝置範圍基準。遠端呼叫端、顯式 `deviceIdentity`、顯式裝置 token 路徑，以及瀏覽器/Node 客戶端
  仍然需要正常的裝置核准以進行範圍升級。
</Note>

## 停止

- 在請求者聊天中傳送 `/stop` 會中止請求者工作階段，並停止由其產生的任何作用中子代理執行，這會串連至巢狀子層。

## 限制

- 子代理程式公告屬於 **最佳努力**。如果閘道重新啟動，待處理的「公告回覆」工作將會遺失。
- 子代理仍然共用相同的 gateway 處理程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 始終為非阻斷式：它會立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理情境只會注入 `AGENTS.md` 和 `TOOLS.md`（不含 `SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。Codex 原生子代理遵循相同的邊界：`TOOLS.md` 保留在繼承的 Codex 執行緒指令中，而僅限父代的人格、身分和使用者檔案則會被注入為回合範圍的協作指令，因此子層不會複製它們。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。對於大多數使用情境，建議使用深度 2。
- `maxChildrenPerAgent` 限制每個工作階段的作用中子層數量（預設 `5`，範圍 `1–20`）。

## 相關

- [ACP 代理](/zh-Hant/tools/acp-agents)
- [代理傳送](/zh-Hant/tools/agent-send)
- [背景工作](/zh-Hant/automation/tasks)
- [多代理沙箱工具](/zh-Hant/tools/multi-agent-sandbox-tools)
