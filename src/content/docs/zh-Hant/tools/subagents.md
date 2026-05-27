---
summary: "產生獨立的背景代理執行，並將結果宣佈回請求者的聊天"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
sidebarTitle: "子代理"
---

Sub-agents 是從現有 agent 執行中產生的背景 agent 執行個體。
它們在自己的 session (`agent:<agentId>:subagent:<uuid>`) 中執行，並且
當完成時，會將結果**公告**回請求者的聊天
頻道。每個 sub-agent 執行個體都會被追蹤為
[background task](/zh-Hant/automation/tasks)。

主要目標：

- 在不阻塞主要執行的情況下，平行化「研究 / 長任務 / 慢速工具」工作。
- 預設讓 sub-agents 保持隔離（session 分隔 + 可選的沙箱機制）。
- 讓工具介面難以誤用：sub-agents **不** 會預設取得 session 工具。
- 支援可配置的巢狀深度，以實現編排器模式。

<Note>
  **成本注意：** 預設情況下，每個子代理都有自己的上下文和 Token 使用量。 對於繁重或重複的任務，請為子代理設定較便宜的模型， 並將您的主代理保持在較高品質的模型上。透過 `agents.defaults.subagents.model` 或個別代理覆寫進行設定。當子代理 真的需要請求者的當前記錄時，代理可以在該次生成時請求 `context: "fork"`。線程綁定的子代理會話預設 為 `context: "fork"`，因為它們將當前對話分支到 後續線程中。
</Note>

## 斜線指令

使用 `/subagents` 來檢視**目前 session** 的 sub-agent 執行個體：

```text
/subagents list
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
```

`/subagents info` 顯示執行中繼資料 (狀態、時間戳記、 session id、
transcript 路徑、清理作業)。使用 `sessions_history` 以取得受限的、
經過安全性過濾的回顧檢視；當您需要
原始的完整 transcript 時，請檢視磁碟上的 transcript 路徑。

### Thread binding controls

這些指令在支援持續性 thread 綁定的頻道上運作。
請參閱下方的 [Thread supporting channels](#thread-supporting-channels)。

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### Spawn behavior

Agent 使用 `sessions_spawn` 啟動背景 sub-agent。Sub-agent 完成
會作為內部父 session 事件回傳；父/請求者 agent 決定
是否需要面向使用者的更新。

<AccordionGroup>
  <Accordion title="Non-blocking, push-based completion">
    - `sessions_spawn` 是非封鎖的；它會立即傳回執行 ID。
    - 完成時，sub-agent 會回報給父/請求者 session。
    - 需要子項結果的 agent 回合應在產生所需工作後呼叫 `sessions_yield`。這會結束目前回合，並讓完成事件作為下一個模型可見訊息到達。
    - 完成是基於推送的。一旦產生，請勿**不要**在迴圈中輪詢 `/subagents list`、`sessions_list` 或 `sessions_history` 只為了等待其完成；僅在需要除錯可見性時按需檢視狀態。
    - 子項輸出是供請求者 agent 綜合處理的報告/證據。它不是使用者撰寫的指令文字，且無法覆寫系統、開發者或使用者原則。
    - 完成時，OpenClaw 會盡力在公告清理流程繼續之前，關閉由該 sub-agent session 開啟的已追蹤瀏覽器分頁/程序。

  </Accordion>
  <Accordion title="Completion delivery">
    - OpenClaw 透過帶有穩定冪等金鑰的 `agent` 輪次，將完成結果交還給請求者會話。
    - 如果請求者執行仍在運作中，OpenClaw 會先嘗試喚醒/引導該執行，而不是啟動第二個可見的回覆路徑。
    - 如果無法喚醒活躍的請求者，OpenClaw 會改為退回到具有相同完成語境的請求者代理交給（handoff），而不是捨棄該公告。
    - 成功的父代交給會完成子代理的交付，即使父代決定不需要對用戶進行可見的更新。
    - 原生子代理不會取得訊息工具。它們會將純助理文字傳回給父代/請求者代理；人類可見的回覆是由父代/請求者代理的正常交付策略所擁有。
    - 如果無法使用直接交給，則會退回到佇列路由。
    - 如果佇列路由仍然不可用，該公告會在短暫的指數退避後重試，直到最終放棄。
    - 完成交付會保留已解析的請求者路由：當可用時，執行緒綁定或對話綁定的完成路由優先；如果完成來源僅提供頻道，OpenClaw 會從請求者會話的已解析路由（`lastChannel` / `lastTo` / `lastAccountId`）中填入缺失的目標/帳戶，以便直接交付仍能運作。

  </Accordion>
  <Accordion title="完成交接的元數據">
    傳遞給請求者會話的完成交接內容是在執行時生成的內部上下文（非使用者撰寫的文字），其中包含：

    - `Result` — 來自子代理的最新可見 `assistant` 回覆文字。Tool/toolResult 輸出不會被提升到子結果中。終端失敗的執行不會重複使用已捕獲的回覆文字。
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`。
    - 精簡的執行時間 / token 統計數據。
    - 審查指示，告訴請求者代理在決定原始任務是否完成之前先驗證結果。
    - 後續指導，告訴請求者代理在子結果還有更多待辦事項時繼續任務或記錄後續事項。
    - 針對無更多操作路徑的最終更新指示，以一般助手語氣撰寫，不轉發原始的內部元數據。

  </Accordion>
  <Accordion title="Modes and ACP runtime">
    - `--model` 和 `--thinking` 會覆寫該特定執行的預設值。
    - 使用 `info`/`log` 在完成後檢查詳細資訊和輸出。
    - 對於持久線程綁定會話，請使用 `sessions_spawn` 搭配 `thread: true` 和 `mode: "session"`。
    - 如果請求者通道不支援線程綁定，請使用 `mode: "run"` 而不是重試不可能的線程綁定組合。
    - 對於 ACP harness 會話（Claude Code、Gemini CLI、OpenCode 或明確的 Codex ACP/acpx），當工具宣佈該執行時，使用 `sessions_spawn` 搭配 `runtime: "acp"`。在偵錯完成項或代理程式對代理程式迴圈時，請參閱 [ACP delivery model](/zh-Hant/tools/acp-agents#delivery-model)。當啟用 `codex` 外掛程式時，Codex 聊天/線程控制應優先選擇 `/codex ...` 而非 ACP，除非使用者明確要求 ACP/acpx。
    - OpenClaw 會隱藏 `runtime: "acp"` 直到啟用 ACP、請求者未處於沙箱中，並且載入了後端外掛程式（例如 `acpx`）。`runtime: "acp"` 預期外部的 ACP harness ID，或是具有 `runtime.type="acp"` 的 `agents.list[]` 項目；對於來自 `agents_list` 的普通 OpenClaw 配置代理程式，請使用預設的子代理程式執行環境。

  </Accordion>
</AccordionGroup>

## 上下文模式

原生子代理程式啟動時是隔離的，除非呼叫者明確要求分叉目前對話紀錄。

| 模式       | 使用時機                                                           | 行為                                                                |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `isolated` | 新研究、獨立實作、緩慢的工具工作，或任何可以在任務文字中簡報的事項 | 建立一個乾淨的子對話紀錄。這是預設值，並能保持較低的 token 使用量。 |
| `fork`     | 依賴目前對話、先前工具結果或請求者對話紀錄中已存在的細微指令的工作 | 在子會話開始之前，將請求者對話紀錄分支到子會話中。                  |

請謹慎使用 `fork`。它僅適用於上下文相關的委派，而非替代撰寫清晰的任務提示。

## 工具：`sessions_spawn`

在全域 `subagent` 通道上使用 `deliver: false` 啟動子代理程式執行，然後執行公告步驟並將公告回覆發布至請求者的聊天通道。

可用性取決於呼叫者的有效工具策略。`coding` 和 `full` 設定檔預設會公開 `sessions_spawn`。`messaging` 設定檔則不會；對於應委派工作的代理程式，請新增 `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"`。頻道/群組、提供者、沙箱和個別代理程式的允許/拒絕策略仍可在設定檔階段之後移除該工具。請使用同一個會話中的 `/tools` 來確認有效工具清單。

**預設值：**

- **模型：** 繼承呼叫者，除非您設定了 `agents.defaults.subagents.model` (或每個代理程式的 `agents.list[].subagents.model`)；明確的 `sessions_spawn.model` 仍然優先。
- **思考：** 繼承呼叫者，除非您設定了 `agents.defaults.subagents.thinking` (或每個代理程式的 `agents.list[].subagents.thinking`)；明確的 `sessions_spawn.thinking` 仍然優先。
- **執行逾時：** 如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 會在設定時使用 `agents.defaults.subagents.runTimeoutSeconds`；否則會回退到 `0` (無逾時)。
- **任務傳遞：** 原生子代理程式會在其第一個可見的 `[Subagent Task]` 訊息中接收委派的任務。子代理程式系統提示包含執行時期規則和路由上下文，而非任務的隱藏重複項。

### 委派提示模式

`agents.defaults.subagents.delegationMode` 僅控制提示指引；它不會改變工具策略或強制執行委派。

- `suggest` (預設值)：保留標準提示，以針對較大或較緩慢的工作使用子代理程式。
- `prefer`：指示主代理保持响应，并将任何比直接回复更复杂的任务通过 `sessions_spawn` 进行委派。

逐代理覆盖使用 `agents.list[].subagents.delegationMode`。

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
  可選的穩定識別碼，用於在後續的狀態輸出中識別特定子項。必須符合 `[a-z][a-z0-9_]{0,63}`，且不能是保留的目標，例如 `last` 或 `all`。
</ParamField>
<ParamField path="label" type="string">
  可選的人類可讀標籤。
</ParamField>
<ParamField path="agentId" type="string">
  當 `subagents.allowAgents` 允許時，在另一個已配置的代理 ID 下產生。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 僅適用於外部 ACP 鞍具（`claude`、`droid`、`gemini`、`opencode` 或明確請求的 Codex ACP/acpx），以及 `agents.list[]` 條目中其 `runtime.type` 為 `acp` 的情況。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  僅限 ACP。當 `runtime: "acp"` 時，恢復現有的 ACP 鞍具工作階段；對於原生子代理產生作業則會忽略。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  僅限 ACP。當 `runtime: "acp"` 時，將 ACP 執行輸出串流到父工作階段；對於原生子代理產生作業則省略。
</ParamField>
<ParamField path="model" type="string">
  覆寫子代理模型。無效值將被跳過，子代理將在預設模型上執行，並在工具結果中顯示警告。
</ParamField>
<ParamField path="thinking" type="string">
  覆寫子代理執行的思考等級。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`。設定時，子代理執行將在 N 秒後中止。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  當 `true` 時，請求此子代理工作階段的頻道執行緒綁定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果省略 `thread: true` 和 `mode`，預設值會變成 `session`。`mode: "session"` 需要 `thread: true`。
  如果請求者頻道無法使用執行緒綁定，請改用 `mode: "run"`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 會在發布後立即封存（仍會透過重新命名保留對話紀錄）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  除非目標子項執行環境已沙箱化，否則 `require` 會拒絕產生作業。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 會將請求者的目前對話紀錄分支到子項工作階段。僅限原生子代理。執行緒綁定的產生作業預設為 `fork`；非執行緒的產生作業預設為 `isolated`。
</ParamField>

<Warning>`sessions_spawn` **不**接受通道傳遞參數（`target`、 `channel`、`to`、`threadId`、`replyTo`、`transport`）。原生子代理會將 其最新的助手回合報告回給請求者；外部傳遞則保留在 父代理/請求者代理處。</Warning>

### 任務名稱與目標

`taskName` 是供編排使用的模型端句柄，而非會話金鑰。
當協調器稍後可能需要檢查該子項時，請將其用於穩定的子項名稱，例如 `review_subagents`、
`linux_validation` 或 `docs_update`。

目標解析接受精確的 `taskName` 匹配和明確的
前綴。匹配範圍限定在與編號 `/subagents` 目標所使用的相同有效/近期目標視窗內，
因此陳舊的已完成子項不會導致重複使用的句柄產生歧義。如果兩個有效或近期的子項共用相同的
`taskName`，則目標不明確；請改用列表索引、會話金鑰或
執行 ID。

保留目標 `last` 和 `all` 不是有效的 `taskName` 值，
因為它們已具有控制含義。

## 工具：`sessions_yield`

結束當前模型回合並等待運行時事件（主要是
子代理完成事件）作為下一則訊息到達。在產生
所需的子項工作後使用此工具，當請求者在這些完成到達之前
無法產生最終答案時。

`sessions_yield` 是等待原語。不要為了偵測子項完成而將其替換為
輪詢迴圈，包括對 `subagents`、`sessions_list`、`sessions_history`、shell
`sleep` 或程序進行的輪詢。

僅當會話的有效工具清單包含 `sessions_yield` 時，才使用它。某些最小化或自訂工具設定檔可能會公開 `sessions_spawn` 和
`subagents` 而不公開 `sessions_yield`；在這種情況下，不要僅為了等待完成而發明輪詢迴圈。

當存在活躍的子項時，OpenClaw 會將一個精簡的執行時期產生的
`Active Subagents` 提示區塊注入正常輪次，以便請求者可以在不輪詢的情況下查看當前的子會話、執行 ID、狀態、標籤、任務和
`taskName` 別名。該區塊中的任務和標籤欄位被引用為數據，而不是指令，因為它們可能源自使用者/模型提供的生成引數。

## 工具：`subagents`

列出由請求者會話擁有的已生成子代理執行。其範圍限於當前請求者；子項只能看到其自己受控的子項。

使用 `subagents` 進行按需狀態檢查和除錯。使用 `sessions_yield` 來
等待完成事件。

## 執行緒綁定會話

當為頻道啟用執行緒綁定時，子代理可以保持綁定到執行緒，以便該執行緒中的後續使用者訊息繼續路由到
同一個子代理會話。

### 支援執行緒的頻道

**Discord** 目前是唯一支援的頻道。它支援
持久執行緒綁定的子代理會話 (`sessions_spawn` 與
`thread: true`)、手動執行緒控制 (`/focus`、`/unfocus`、`/agents`、
`/session idle`、`/session max-age`) 以及配接器金鑰
`channels.discord.threadBindings.enabled`、
`channels.discord.threadBindings.idleHours`、
`channels.discord.threadBindings.maxAgeHours` 和
`channels.discord.threadBindings.spawnSessions`。

### 快速流程

<Steps>
  <Step title="生成">`sessions_spawn` 與 `thread: true` (以及選擇性地 `mode: "session"`)。</Step>
  <Step title="綁定">OpenClaw 會在活躍頻道中為該會話目標建立或綁定執行緒。</Step>
  <Step title="路由後續追蹤">該執行緒中的回覆和後續訊息會路由到已綁定的工作階段。</Step>
  <Step title="檢查逾時設定">使用 `/session idle` 檢查/更新閒置自動取消聚焦，並使用 `/session max-age` 控制硬性上限。</Step>
  <Step title="解除綁定">使用 `/unfocus` 手動解除綁定。</Step>
</Steps>

### 手動控制

| 指令               | 效果                                                    |
| ------------------ | ------------------------------------------------------- |
| `/focus <target>`  | 將當前執行緒（或建立一個）綁定到子代理程式/工作階段目標 |
| `/unfocus`         | 移除當前綁定執行緒的綁定                                |
| `/agents`          | 列出活躍執行和綁定狀態 (`thread:<id>` 或 `unbound`)     |
| `/session idle`    | 檢查/更新閒置自動取消聚焦（僅限已聚焦的綁定執行緒）     |
| `/session max-age` | 檢查/更新硬性上限（僅限已聚焦的綁定執行緒）             |

### 設定開關

- **全域預設：** `session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **通道覆寫和生成自動綁定鍵** 取決於配接器。請參閱上方的 [支援執行緒的通道](#thread-supporting-channels)。

如需目前配接器的詳細資訊，請參閱 [設定參考](/zh-Hant/gateway/configuration-reference) 和
[斜線指令](/zh-Hant/tools/slash-commands)。

### 允許清單

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可透過明確 `agentId` 鎖定的已設定代理程式 ID 清單（`["*"]` 允許任何已設定的目標）。預設值：僅請求者代理程式。如果您設定清單且仍希望請求者使用 `agentId` 產生自身，請將請求者 ID 包含在清單中。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  當請求者代理程式未設定自己的 `subagents.allowAgents` 時，使用的預設已設定目標代理程式允許清單。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制進行明確設定檔選擇）。各代理程式覆寫：`agents.list[].subagents.requireAgentId`。
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  閘道 `agent` 公告傳遞嘗試的各次呼叫逾時。值為正整數毫秒，且會被夾限在平台安全的計時器最大值內。暫時性重試可能會使總公告等待時間超過一個設定的逾時時間。
</ParamField>

如果請求者會話已沙盒化，`sessions_spawn` 會拒絕將以非沙盒模式執行的目標。

### 探索

使用 `agents_list` 查看目前允許用於 `sessions_spawn` 的代理程式 ID。回應包含每個列出代理程式的有效模型和嵌入式執行時期中繼資料，以便呼叫者區分 PI、Codex 應用程式伺服器和其他設定的原生執行時期。

`allowAgents` 項目必須指向 `agents.list[]` 中已設定的代理程式 ID。
`["*"]` 表示任何已設定的目標代理程式加上請求者。如果刪除了代理程式設定但其 ID 仍留在 `allowAgents` 中，`sessions_spawn` 會拒絕該 ID
且 `agents_list` 會將其省略。執行 `openclaw doctor --fix` 以清除過時的
允許清單項目，或者在目標應保持可衍生狀態同時繼承預設值時，新增一個最小的 `agents.list[]` 項目。

### 自動封存

- 子代理程式階段會在 `agents.defaults.subagents.archiveAfterMinutes` 後自動封存（預設為 `60`）。
- 封存使用 `sessions.delete` 並將文字紀錄重新命名為 `*.deleted.<timestamp>`（同一個資料夾）。
- `cleanup: "delete"` 會在公告後立即封存（仍透過重新命名保留文字紀錄）。
- 自動封存屬於盡力而為；如果閘道重新啟動，待處理的計時器將會遺失。
- `runTimeoutSeconds` **不會**自動封存；它只會停止執行。該階段會保留直到自動封存。
- 自動歸檔同樣適用於深度 1 和深度 2 的對話。
- 瀏覽器清理與歸檔清理是分開的：被追蹤的瀏覽器分頁/程序會在運行結束時盡力關閉，即使對話記錄/會話記錄被保留。

## 巢狀子代理

根據預設，子代理程式無法衍生自己的子代理程式
(`maxSpawnDepth: 1`)。設定 `maxSpawnDepth: 2` 以啟用一層
巢狀結構 — 即 **協調器模式**：主程式 → 協調器子代理程式 →
工作者子子代理程式。

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

| 深度 | 會話金鑰形狀                                 | 角色                             | 能否生成？                |
| ---- | -------------------------------------------- | -------------------------------- | ------------------------- |
| 0    | `agent:<id>:main`                            | 主要代理                         | 始終                      |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理 (當允許深度 2 時為協調器) | 僅當 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理 (葉節點工作器)          | 從不                      |

### 宣告鏈

結果沿著鏈條向上回傳：

1. 深度 2 工作器完成 → 向其父級 (深度 1 協調器) 宣告。
2. 深度 1 協調器接收宣告，綜合結果，完成 → 向主要代理宣告。
3. 主要代理接收宣告並傳送給使用者。

每個層級只能看到其直接子級的宣告。

<Note>
  **操作指引：** 啟動子工作一次並等待完成事件，而不是圍繞 `sessions_list`、 `sessions_history`、`/subagents list` 或 `exec` sleep 指令構建輪詢迴圈。 `sessions_list` 和 `/subagents list` 使子會話關係專注於進行中的工作——進行中的子會話保持連接，已結束的子會話在短時間內保持可見，而陳舊的僅存儲的子連結在過了其新鮮度視窗後將被忽略。這可以防止舊的 `spawnedBy` / `parentSessionKey`
  元數據在重啟後恢復虛幻的子會議。如果子完成事件在您已發送最終答案之後到達，正確的後續操作是確切的靜默令牌 `NO_REPLY` / `no_reply`。
</Note>

### 按深度的工具政策

- 角色和控制範圍在生成時會寫入會話元資料中。這可以防止扁平化或還原的會話金鑰意外重新獲得協調器權限。
- **深度 1 (協調器，當 `maxSpawnDepth >= 2`)：** 獲得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以產生子會話並檢查其狀態。其他會議/系統工具仍然被拒絕。
- **深度 1 (葉節點，當 `maxSpawnDepth == 1`)：** 沒有會議工具 (目前的預設行為)。
- **深度 2 (葉節點工作程序)：** 沒有會議工具 —— `sessions_spawn` 在深度 2 處總是被拒絕。無法產生進一步的子會話。

### 個別代理程式生成限制

每個代理會議 (在任何深度) 一次最多可以有 `maxChildrenPerAgent`
(預設 `5`) 個活躍的子會議。這可以防止單一協調器出現失控的扇出。

### 級聯停止

停止深度 1 的協調器會自動停止其所有深度 2
的子代：

- 主聊天中的 `/stop` 會停止所有深度 1 的代理，並級聯到它們的深度 2 子會議。

## 身份驗證

子代理的身份驗證由 **代理 id** 解析，而不是由會議類型：

- 子代理會議金鑰是 `agent:<agentId>:subagent:<uuid>`。
- 身份驗證存儲是從該代理的 `agentDir` 加載的。
- 主代理的身份驗證配置檔案作為 **備援** 合併進來；代理配置檔案會在衝突時覆蓋主配置檔案。

合併是相加的，因此主配置檔案始終可作為備援使用。尚不支援每個代理的完全隔離身份驗證。

## 公告

Sub-agents 透過公告步驟回報：

- 公告步驟在 sub-agent 會話內執行（而非請求者會話）。
- 如果 sub-agent 完全回覆 `ANNOUNCE_SKIP`，則不會發布任何內容。
- 如果最新的助手文字是確切的靜默權杖 `NO_REPLY` / `no_reply`，即使先前有可見的進度，公告輸出也會被抑制。

傳遞取決於請求者深度：

- 頂層請求者會話使用外部傳遞的後續 `agent` 呼叫（`deliver=true`）。
- 巢狀請求者 subagent 會話會接收內部後續注入（`deliver=false`），以便編排器能在會話內綜合子項結果。
- 如果巢狀請求者 subagent 會話已消失，OpenClaw 會在可用時回退至該會話的請求者。

對於頂層請求者會話，完成模式直接傳遞會先解析任何綁定的對話/執行緒路由與掛接覆寫，然後從請求者會話的已儲存路由填入遺漏的通道目標欄位。這樣即使完成來源僅識別通道，也能將完成內容保留在正確的聊天/主題上。

在建立巢狀完成發現時，子項完成聚合會限定於目前的請求者執行，防止過時的前次執行子項輸出洩漏至目前的公告中。公告回覆在通道配接器可用時會保留執行緒/主題路由。

### 公告內容

公告內容會正規化為穩定的內部事件區塊：

| 欄位     | 來源                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 來源     | `subagent` 或 `cron`                                                                   |
| 會話 ID  | 子會話金鑰/ID                                                                          |
| 類型     | 公告類型 + 任務標籤                                                                    |
| 狀態     | 衍生自執行時期結果（`success`、`error`、`timeout` 或 `unknown`）——**非**由模型文字推斷 |
| 結果內容 | 來自子項的最新可見助手文字                                                             |
| 後續     | 描述何時回覆或保持靜默的指示                                                           |

終結性失敗的執行會回報失敗狀態，而不重播擷取的回覆文字。Tool/toolResult 輸出不會提升至子項結果文字。

### 統計列

公告內容在最後包含一條統計資訊行（即使被換行）：

- 執行時間（例如 `runtime 5m12s`）。
- Token 使用量（輸入/輸出/總計）。
- 當配置了模型定價時的估算成本（`models.providers.*.models[].cost`）。
- `sessionKey`、`sessionId` 和文字記錄路徑，以便主代理可以透過 `sessions_history` 獲取歷史記錄或檢查磁碟上的檔案。

內部元資料僅用於編排；面向使用者的回覆應以正常的助手語氣重新撰寫。

### 為何優先使用 `sessions_history`

`sessions_history` 是較安全的編排路徑：

- 助手回憶會先進行正規化處理：移除思考標籤；移除 `<relevant-memories>` / `<relevant_memories>` 腳手架；移除純文字工具呼叫 XML 資訊區塊（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`），包括未正確結尾的截斷資訊；移除降級的工具呼叫/結果腳手架和歷史上下文標記；移除洩漏的模型控制權杖（`<|assistant|>`、其他 ASCII `<|...|>`、全形 `<｜...｜>`）；移除格式錯誤的 MiniMax 工具呼叫 XML。
- 類似憑證/token 的文字會被編輯。
- 長區塊可能會被截斷。
- 非常大的歷史記錄可能會丟棄較舊的行，或用 `[sessions_history omitted: message too large]` 替換過大的行。
- 當您需要完整的逐位元組文字記錄時，檢查磁碟上的原始文字記錄是備用方案。

## 工具政策

子代理首先使用與父代理或目標代理相同的設定檔和工具政策管道。之後，OpenClaw 會套用子代理限制層。

如果沒有限制性的 `tools.profile`，子代理將獲得**除訊息工具、工作階段工具和系統工具之外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`
- `message`

`sessions_history` 在這裡也仍然是一個有界限的、經過清理的回憶視圖——它不是原始的文字記錄傾印。

當 `maxSpawnDepth >= 2` 時，深度 1 的協編子代代理會額外接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它們管理其子代。

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

`tools.subagents.tools.allow` 是最終的僅允許篩選器。它可以縮小已解析的工具集，但無法 **加回** 被 `tools.profile` 移除的工具。例如，`tools.profile: "coding"` 包含 `web_search`/`web_fetch` 但不包含 `browser` 工具。若要讓 coding-profile 子代理使用瀏覽器自動化，請在設定檔階段加入瀏覽器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

當只有一個代理應該獲得瀏覽器自動化時，請使用每代理 `agents.list[].tools.alsoAllow: ["browser"]`。

## 並行

子代理使用專用的進程內佇列通道：

- **通道名稱：** `subagent`
- **並行數：** `agents.defaults.subagents.maxConcurrent`（預設 `8`）

## 存活與恢復

OpenClaw 不會將 `endedAt` 的缺席視為子代理仍然存活的永久證明。超過過期執行視窗的未結束執行，將不再被計入 `/subagents list`、狀態摘要、後代完成閘門以及每個會話並行檢查中的有效/待處理項目。

閘道重啟後，除非子會話標記為 `abortedLastRun: true`，否則過期且未結束的還原執行將被清除。這些因重啟而中止的子會話仍可透過子代理孤兒恢復流程進行恢復，該流程會在清除中止標記之前發送合成恢復訊息。

自動重啟恢復是針對每個子會話進行限制的。如果在快速重新阻塞視窗內，同一個子代理子代被反覆接受進行孤兒恢復，OpenClaw 將在該會話上保留恢復墓碑，並停止在後續重啟時自動恢復它。請執行 `openclaw tasks maintenance --apply` 來協調任務記錄，或執行 `openclaw doctor --fix` 以清除已標記墓碑會話上的過期中止恢復標記。

<Note>
  如果子代理生成失敗並出現 Gateway `PAIRING_REQUIRED` / `scope-upgrade`，請在編輯配對狀態之前檢查 RPC 呼叫端。 內部 `sessions_spawn` 協調應透過直接 loopback shared-token/password auth 以 `client.id: "gateway-client"` 身份連線並包含 `client.mode: "backend"`； 該路徑不依賴 CLI 的配對裝置範圍基準。遠端呼叫端、明確的 `deviceIdentity`、明確的 device-token 路徑，以及瀏覽器/node 客戶端
  仍然需要正常的裝置核准以進行範圍升級。
</Note>

## 停止

- 在請求者聊天中發送 `/stop` 會中止請求者工作階段，並停止由其產生的任何作用中子代理運行，連鎖反應至巢狀子項。

## 限制

- 子代理公告採用 **盡力而為 (best-effort)** 機制。如果 Gateway 重新啟動，待處理的「公告回報」工作將會遺失。
- 子代理仍共用相同的 Gateway 處理程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 始終為非阻斷式：它會立即回傳 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文僅注入 `AGENTS.md` 和 `TOOLS.md`（不含 `SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。Codex 原生子代理遵循相同界限：`TOOLS.md` 保留在繼承的 Codex 執行緒指令中，而僅限父項的 persona、identity 和使用者檔案則會以回合範圍的協作指令方式注入，以免子項複製它們。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。對於大多數使用案例，建議使用深度 2。
- `maxChildrenPerAgent` 限制了每個工作階段的作用中子項數量（預設 `5`，範圍 `1–20`）。

## 相關

- [ACP agents](/zh-Hant/tools/acp-agents)
- [Agent send](/zh-Hant/tools/agent-send)
- [Background tasks](/zh-Hant/automation/tasks)
- [Multi-agent sandbox tools](/zh-Hant/tools/multi-agent-sandbox-tools)
