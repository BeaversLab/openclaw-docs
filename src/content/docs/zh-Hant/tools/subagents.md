---
summary: "產生獨立的背景代理執行，並將結果宣佈回請求者的聊天"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
sidebarTitle: "子代理"
---

子代理是從現有代理運行中產生的背景代理運行。
它們在自己的會話 (`agent:<agentId>:subagent:<uuid>`) 中運行，並在完成時將結果**公佈** (announce) 回請求者的聊天頻道。每個子代理運行都作為[背景任務](/zh-Hant/automation/tasks) 進行追蹤。

主要目標：

- 在不阻塞主要執行的情況下，平行化「研究 / 長任務 / 慢速工具」工作。
- 預設讓 sub-agents 保持隔離（session 分隔 + 可選的沙箱機制）。
- 讓工具介面難以誤用：sub-agents **不** 會預設取得 session 工具。
- 支援可配置的巢狀深度，以實現編排器模式。

<Note>
  **成本注意：** 預設情況下，每個子代理都有自己的上下文和 Token 使用量。 對於繁重或重複的任務，請為子代理設定較便宜的模型， 並將您的主代理保持在較高品質的模型上。透過 `agents.defaults.subagents.model` 或個別代理覆寫進行設定。當子代理 真的需要請求者的當前記錄時，代理可以在該次生成時請求 `context: "fork"`。線程綁定的子代理會話預設 為 `context: "fork"`，因為它們將當前對話分支到 後續線程中。
</Note>

## 斜線指令

使用 `/subagents` 來檢查或控制 **當前
會話** 的子代理運行：

```text
/subagents list
/subagents kill <id|#|all>
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
/subagents send <id|#> <message>
/subagents steer <id|#> <message>
/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]
```

使用頂層 [`/steer <message>`](/zh-Hant/tools/steer) 來引導當前請求者會話的活動運行。當目標是子運行時，請使用 `/subagents steer <id|#> <message>`。

`/subagents info` 顯示運行元資料（狀態、時間戳、會話 ID、
記錄路徑、清理）。使用 `sessions_history` 來取得受限的、
經過安全過濾的回顧視圖；當您需要原始完整記錄時，請檢查磁碟上的記錄路徑。

### 執行緒綁定控制

這些指令適用於支援持續執行緒綁定的頻道。請參閱下方的[支援執行緒的頻道](#thread-supporting-channels)。

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### 產生行為

`/subagents spawn` 作為使用者指令（而非內部中繼）啟動後台子代理，並在運行完成時將最終的完成更新傳送回請求者聊天。

<AccordionGroup>
  <Accordion title="非阻塞、基於推送的完成">
    - 生成指令是非阻塞的；它會立即返回一個運行 ID。
    - 完成後，子代理會將摘要/結果訊息發送回請求者的聊天頻道。
    - 需要子結果的代理回合應在生成所需工作後呼叫 `sessions_yield`。這將結束當前回合，並讓完成事件作為下一個模型可見的訊息到達。
    - 完成是基於推送的。一旦生成，**切勿**僅為等待其完成而在循環中輪詢 `/subagents list`、`sessions_list` 或 `sessions_history`；僅在需要時檢查狀態以進行除錯或干預。
    - 子輸出是供請求者代理綜合的報告/證據。它不是用戶編寫的指令文本，不能覆蓋系統、開發人員或用戶策略。
    - 完成後，OpenClaw 會盡最大努力在公告清理流程繼續之前，關閉由該子代理會話打開的受追蹤瀏覽器分頁/進程。

  </Accordion>
  <Accordion title="Manual-spawn delivery resilience">
    - OpenClaw 透過具有穩定冪等金鑰 (stable idempotency key) 的 `agent` 輪次，將完成結果交還給請求者會話。
    - 如果請求者運行仍處於活動狀態，OpenClaw 會首先嘗試喚醒/引導該運行，而不是啟動第二個可見的回覆路徑。
    - 如果無法喚醒活動的請求者，OpenClaw 會改為回退到具有相同完成上下文的請求者代理移交，而不是捨棄該公告。
    - 如果請求者代理的完成移交失敗或沒有產生可見的輸出，OpenClaw 會將傳遞視為失敗並回退到佇列路由/重試。它不會將子結果直接發送到外部聊天。
    - 群組和頻道的完成移交遵循與正常群組/頻道輪次相同的僅限訊息工具可見回覆策略，因此請求者代理必須在需要時使用訊息工具。
    - 如果無法使用直接移交，則會回退到佇列路由。
    - 如果佇列路由仍然不可用，則會在徹底放棄前以短指數退避重試該公告。
    - 完成傳遞會保留已解析的請求者路由：當可用時，執行緒綁定或對話綁定的完成路由優先；如果完成來源僅提供頻道，OpenClaw 會從請求者會話的已解析路由 (`lastChannel` / `lastTo` / `lastAccountId`) 中填補缺少的目標/帳戶，以便直接傳遞仍然有效。

  </Accordion>
  <Accordion title="完成移交中繼資料">
    移交給請求者會話的完成內容是執行時產生的內部內容（非使用者撰寫的文字），並包含：

    - `Result` — 最新可見的 `assistant` 回覆文字，否則為經過清理的最新 tool/toolResult 文字。終端機失敗的執行不會重複使用擷取的回覆文字。
    - `Status` — `completed; ready for parent review` / `failed` / `timed out` / `unknown`。
    - 簡潔的執行時/Token 統計資料。
    - 一項檢閱指示，告知請求者代理程式在決定原始任務是否完成前驗證結果。
    - 後續追蹤指引，告知請求者代理程式當子項結果尚有更多行動時繼續任務或記錄後續追蹤。
    - 針對無更多行動路徑的最終更新指示，以一般助理語氣撰寫，不轉發原始內部中繼資料。

  </Accordion>
  <Accordion title="Modes and ACP runtime">
    - `--model` 和 `--thinking` 會覆寫該特定執行的預設值。
    - 使用 `info`/`log` 在完成後檢查詳細資訊和輸出。
    - `/subagents spawn` 是一次性模式 (`mode: "run"`)。對於持久性的執行緒綁定工作階段，請使用 `sessions_spawn` 搭配 `thread: true` 和 `mode: "session"`。
    - 對於 ACP 駕駛工作階段（Claude Code、Gemini CLI、OpenCode 或明確的 Codex ACP/acpx），當工具通告該執行時，請使用 `sessions_spawn` 搭配 `runtime: "acp"`。在調試完成項或 Agent 對 Agent 迴圈時，請參閱 [ACP delivery model](/zh-Hant/tools/acp-agents#delivery-model)。當啟用 `codex` 外掛程式時，除非使用者明確要求 ACP/acpx，否則 Codex 聊天/執行緒控制應優先選擇 `/codex ...` 而非 ACP。
    - OpenClaw 會隱藏 `runtime: "acp"`，直到啟用 ACP、請求者未處於沙盒中，且載入後端外掛程式（例如 `acpx`）為止。`runtime: "acp"` 預期會有外部 ACP 駕駛 ID，或是帶有 `runtime.type="acp"` 的 `agents.list[]` 項目；對於來自 `agents_list` 的標準 OpenClaw 設定 Agent，請使用預設的子 Agent 執行環境。

  </Accordion>
</AccordionGroup>

## 情境模式

除非呼叫者明確要求分岔目前的對話記錄，否則原生子代理會以隔離狀態啟動。

| 模式       | 使用時機                                                                 | 行為                                                              |
| ---------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `isolated` | 全新研究、獨立實作、緩慢的工具工作，或任何可在任務文字中簡要說明的事項   | 建立乾淨的子對話記錄。這是預設選項，且能保持較低的 token 使用量。 |
| `fork`     | 取決於目前對話、先前工具結果，或已存在於請求者對話記錄中的細微指令之工作 | 在子項開始之前，將請求者的對話記錄分岔至子工作階段。              |

請節制使用 `fork`。它是用於情境感知的委派，而非撰寫清晰工作提示的替代方案。

## 工具：`sessions_spawn`

在全域 `subagent` 通道上以 `deliver: false` 啟動子代理執行，然後執行公告步驟並將公告回覆張貼至請求者聊天頻道。

可用性取決於呼叫者的有效工具原則。`coding` 和
`full` 設定檔預設會公開 `sessions_spawn`。`messaging` 設定檔
則不會；請為應該委派工作的 Agent 新增 `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"`。頻道/群組、提供者、沙箱和各別 Agent 的允許/拒絕原則
仍可在設定檔階段之後移除此工具。請使用同一個會話中的 `/tools` 來確認有效的工具清單。

**預設值：**

- **Model：** 繼承呼叫者，除非您設定了 `agents.defaults.subagents.model`（或各別 Agent 的 `agents.list[].subagents.model`）；明確的 `sessions_spawn.model` 仍然優先。
- **Thinking：** 繼承呼叫者，除非您設定了 `agents.defaults.subagents.thinking`（或各別 Agent 的 `agents.list[].subagents.thinking`）；明確的 `sessions_spawn.thinking` 仍然優先。
- **Run timeout：** 如果省略 `sessions_spawn.runTimeoutSeconds`，OpenClaw 會在設定時使用 `agents.defaults.subagents.runTimeoutSeconds`；否則會回退到 `0`（無逾時）。
- **工作傳遞：** 原生子 Agent 會在其第一個可見的 `[Subagent Task]` 訊息中接收委派的工作。子 Agent 系統提示詞攜帶執行時規則和路由上下文，而不是工作的隱藏副本。

### 委派提示模式

`agents.defaults.subagents.delegationMode` 僅控制提示指導；它不會變更工具策略或強制執行委派。

- `suggest` (預設)：保留標準提示推動，以使用子 Agent 進行較大或較緩慢的工作。
- `prefer`：告知主要 Agent 保持回應能力，並透過 `sessions_spawn` 委派任何比直接回覆更複雜的工作。

個別 Agent 的覆寫使用 `agents.list[].subagents.delegationMode`。

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
  可選的穩定代碼，用於後續 `subagents` 定位。必須符合 `[a-z][a-z0-9_]{0,63}` 且不能是保留目標，如 `last` 或 `all`。當協調器需要在產生多個子代理後導引、終止或識別特定子代理時，建議使用此選項。
</ParamField>
<ParamField path="label" type="string">
  可選的人類可讀標籤。
</ParamField>
<ParamField path="agentId" type="string">
  當 `subagents.allowAgents` 允許時，在另一個代理 ID 下產生。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 僅適用於外部 ACP 駝具（`claude`、`droid`、`gemini`、`opencode`，或明確請求的 Codex ACP/acpx），以及 `runtime.type` 為 `acp` 的 `agents.list[]` 項目。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  僅限 ACP。當 `runtime: "acp"` 時，恢復現有的 ACP 駝具階段；對於原生子代理產生則予以忽略。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  僅限 ACP。當 `runtime: "acp"` 時，將 ACP 執行輸出串流至父階段；原生子代理產生則省略。
</ParamField>
<ParamField path="model" type="string">
  覆蓋子代理模型。無效值會被跳過，子代理將在預設模型上執行，並在工具結果中顯示警告。
</ParamField>
<ParamField path="thinking" type="string">
  覆蓋子代理執行的思考等級。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`。設定後，子代理執行將在 N 秒後中止。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  當 `true` 時，請求此子代理階段的頻道執行緒繫結。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  若省略 `thread: true` 和 `mode`，預設值變為 `session`。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 會在公告後立即封存（仍會透過重新命名保留對話紀錄）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 會拒絕產生，除非目標子執行時期為沙盒化狀態。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 會將請求者的目前對話紀錄分支至子階段。僅限原生子代理。執行緒繫結的產生預設為 `fork`；非執行緒產生預設為 `isolated`。
</ParamField>

<Warning>`sessions_spawn` **不** 接受通道傳遞參數（`target`, `channel`, `to`, `threadId`, `replyTo`, `transport`）。若要傳遞，請從產生的執行中使用 `message`/`sessions_send`。</Warning>

### 任務名稱與目標定位

`taskName` 是一個面向模型的編排句柄，而非會話金鑰。
當協調器稍後可能需要引導或終止該子項時，請將其用於穩定的子項名稱，例如 `review_subagents`、
`linux_validation` 或 `docs_update`。

目標解析接受精確的 `taskName` 符合項和明確的
前綴。比對範圍限縮在編號 `/subagents` 目標所使用的相同活躍/近期目標視窗內，
因此過時的已完成子項不會導致重複使用的句柄變得歧義。如果兩個活躍或近期的子項共用相同的
`taskName`，則目標具有歧義；請改用清單索引、會話金鑰或
執行 ID。

保留目標 `last` 和 `all` 不是有效的 `taskName` 值，
因為它們已具有控制含義。

## 工具：`sessions_yield`

結束當前的模型輪次並等待執行時事件（主要是
子代理完成事件）作為下一則訊息抵達。當請求者在這些完成項目抵達前
無法產生最終答案時，請在產生必要的子項工作後使用它。

`sessions_yield` 是等待的基本操作。請勿將其替換為對 `subagents`、
`sessions_list`、`sessions_history`、Shell
`sleep` 或程序輪詢的輪詢迴圈，僅為了偵測子項完成。

僅在該會話的有效工具清單包含 `sessions_yield` 時才使用它。某些最小化或自訂的工具設定檔可能會公開 `sessions_spawn` 和 `subagents` 而不公開 `sessions_yield`；在這種情況下，不要僅為了等待完成而發明一個輪詢循環。

當存在活躍的子項時，OpenClaw 會將一個緊湊的執行時期產生的 `Active Subagents` 提示區塊注入到正常的輪次中，以便請求者可以看到當前的子會話、執行 ID、狀態、標籤、任務和 `taskName` 別名，而無需輪詢。該區塊中的任務和標籤欄位被引用為資料，而非指令，因為它們可能源自使用者/模型提供的產生引數。

## 工具：`subagents`

列出、引導或終止由請求者會話擁有的已產生子代理執行。其範圍僅限於當前的請求者；子項只能查看/控制其自身受控的子項。

使用 `subagents` 進行按需狀態檢查、除錯、引導或終止。使用 `sessions_yield` 等待完成事件。

## 執行緒綁定會話

當為頻道啟用執行緒綁定時，子代理可以保持綁定到執行緒，以便該執行緒中的後續使用者訊息繼續路由到同一個子代理會話。

### 支援執行緒的頻道

**Discord** 目前是唯一支援的頻道。它支援持久的執行緒綁定子代理會話（`sessions_spawn` 搭配 `thread: true`）、手動執行緒控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`），以及配接器金鑰 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSessions`。

### 快速流程

<Steps>
  <Step title="產生">`sessions_spawn` 搭配 `thread: true`（以及可選的 `mode: "session"`）。</Step>
  <Step title="綁定">OpenClaw 在目前頻道中為該 session 目標建立或綁定一個 thread。</Step>
  <Step title="後續路由">該 thread 中的回覆和後續訊息會路由到已綁定的 session。</Step>
  <Step title="檢查逾時">使用 `/session idle` 來檢查/更新閒置自動取消聚焦，並 使用 `/session max-age` 來控制硬性上限。</Step>
  <Step title="分離">使用 `/unfocus` 進行手動分離。</Step>
</Steps>

### 手動控制

| 指令               | 效果                                                       |
| ------------------ | ---------------------------------------------------------- |
| `/focus <target>`  | 將目前的 thread（或建立一個）綁定到子 agent/session 目標   |
| `/unfocus`         | 移除目前已綁定 thread 的綁定                               |
| `/agents`          | 列出正在執行的 run 和綁定狀態 (`thread:<id>` 或 `unbound`) |
| `/session idle`    | 檢查/更新閒置自動取消聚焦（僅限聚焦的已綁定 thread）       |
| `/session max-age` | 檢查/更新硬性上限（僅限聚焦的已綁定 thread）               |

### 組態開關

- **全域預設值：** `session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **頻道覆寫和生成自動綁定金鑰** 取決於配接器。請參閱上方的 [Thread supporting channels](#thread-supporting-channels)。

請參閱 [Configuration reference](/zh-Hant/gateway/configuration-reference) 和
[Slash commands](/zh-Hant/tools/slash-commands) 以了解目前配接器的詳細資訊。

### 允許清單

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可透過顯式 `agentId` 指定的代理程式 ID 列表（`["*"]` 允許任何已設定的目標）。預設值：僅請求者代理程式。如果您設定了列表且仍希望請求者使用 `agentId` 自行生成，請將請求者 ID 包含在列表中。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  當請求者代理程式未設定其自己的 `subagents.allowAgents` 時使用的預設目標代理程式允許清單。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  封鎖遺漏 `agentId` 的 `sessions_spawn` 呼叫（強制顯式選擇設定檔）。個別代理程式覆寫：`agents.list[].subagents.requireAgentId`。
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  閘道 `agent` 公告傳遞嘗試的每次呼叫逾時時間。值為正整數毫秒，並會被限制為平台安全計時器最大值。暫時性重試可能會使總公告等待時間超過一個設定的逾時時間。
</ParamField>

如果請求者會話位於沙箱中，`sessions_spawn` 將拒絕會以非沙箱方式執行的目標。

### 探索

使用 `agents_list` 來查看目前允許用於 `sessions_spawn` 的代理程式 ID。回應包含每個列出代理程式的有效模型和嵌入式執行時期中繼資料，以便呼叫者能夠區分 PI、Codex 應用程式伺服器和其他設定的原生執行時期。

### 自動封存

- 子代理程式會話會在 `agents.defaults.subagents.archiveAfterMinutes`（預設 `60`）後自動封存。
- 封存使用 `sessions.delete` 並將逐字稿重新命名為 `*.deleted.<timestamp>`（相同資料夾）。
- `cleanup: "delete"` 會在公告後立即封存（仍透過重新命名保留逐字稿）。
- 自動封存屬於盡力而為；如果閘道重新啟動，待處理的計時器將會遺失。
- `runTimeoutSeconds` **不會** 自動歸檔；它只會停止運行。該對話將保持直到自動歸檔。
- 自動歸檔同樣適用於深度 1 和深度 2 的對話。
- 瀏覽器清理與歸檔清理是分開的：被追蹤的瀏覽器分頁/程序會在運行結束時盡力關閉，即使對話記錄/會話記錄被保留。

## 巢狀子代理

預設情況下，子代理無法生成它們自己的子代理
(`maxSpawnDepth: 1`)。設定 `maxSpawnDepth: 2` 以啟用一層
巢狀 —— **協調器模式**：主要 → 協調器子代理 →
工作器子子代理。

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
  **操作指引：** 啟動子工作一次並等待完成 事件，而不是圍繞 `sessions_list`、 `sessions_history`、`/subagents list` 或 `exec` 睡眠指令建置輪詢迴圈。 `sessions_list` 和 `/subagents list` 讓子會話關係 專注於活躍工作 —— 活躍的子級保持連線，已結束的子級在短時間內 保持可見，而陳舊的僅存儲子級連結會在其有效期後被忽略。這可防止舊的 `spawnedBy` / `parentSessionKey`
  元數據在重新啟動後復活幽靈子級。如果子完成事件在您已發送 最終答案後才到達，正確的後續處理是使用精確的靜默權杖 `NO_REPLY` / `no_reply`。
</Note>

### 按深度的工具政策

- 角色和控制範圍在生成時會寫入會話元資料中。這可以防止扁平化或還原的會話金鑰意外重新獲得協調器權限。
- **深度 1（協調器，當 `maxSpawnDepth >= 2` 時）：**獲得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便管理其子代。其他會話/系統工具保持拒絕狀態。
- **深度 1（葉節點，當 `maxSpawnDepth == 1` 時）：**沒有會話工具（目前的預設行為）。
- **深度 2（葉節點工作程式）：**沒有會話工具 —— `sessions_spawn` 在深度 2 時總是被拒絕。無法生成更多子代。

### 個別代理程式生成限制

每個代理程式會話（在任何深度）一次最多只能有 `maxChildrenPerAgent`
（預設 `5`）個活躍子代。這可以防止單一協調器出現失控的擴散。

### 級聯停止

停止深度 1 的協調器會自動停止其所有深度 2
的子代：

- 主聊天中的 `/stop` 會停止所有深度 1 的代理程式，並級聯至其深度 2 的子代。
- `/subagents kill <id>` 會停止特定的子代理程式，並級聯至其子代。
- `/subagents kill all` 會停止請求者的所有子代理程式並進行級聯。

## 驗證

子代理程式的驗證是依據 **代理程式 ID** 解析，而非依據會話類型：

- 子代理程式會話金鑰是 `agent:<agentId>:subagent:<uuid>`。
- 驗證儲存庫是從該代理程式的 `agentDir` 載入的。
- 主代理程式的驗證設定檔會作為 **後備** 合併進來；代理程式設定檔會在衝突時覆寫主設定檔。

合併是累加的，因此主設定檔始終可作為後備使用。目前尚不支援每個代理程式完全隔離的驗證。

## 宣布

子代理程式透過宣布步驟回報結果：

- 宣布步驟在子代理程式會話內部執行（而非請求者會話）。
- 如果子代理程式完全回覆 `ANNOUNCE_SKIP`，則不會發布任何內容。
- 如果最新的助理文字確切是靜默權杖 `NO_REPLY` / `no_reply`，即使之前有可見的進度，也會隱藏宣布輸出。

傳遞取決於請求者的深度：

- 頂層請求者會話使用帶有外部傳遞 (`deliver=true`) 的後續 `agent` 呼叫。
- 巢狀請求者子代理會話會接收內部後續注入 (`deliver=false`)，以便編排器能在會話內綜合子項結果。
- 如果巢狀請求者子代理會話已消失，OpenClaw 會在可用時回退至該會話的請求者。

對於頂層請求者會話，完成模式直接傳遞會先解析任何綁定的對話/執行緒路徑和掛鉤覆寫，然後從請求者會話的儲存路徑填入遺漏的頻道目標欄位。即使完成來源僅識別頻道，這也能讓完成內容保留在正確的聊天/主題上。

在建置巢狀完成發現時，子項完成聚合的範圍限定在當前請求者執行，防止過時的前次執行子項輸出洩漏到當前公告中。當在頻道配接器上可用時，公告回覆會保留執行緒/主題路由。

### 公告內容

公告內容會標準化為穩定的內部事件區塊：

| 欄位        | 來源                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------- |
| 來源        | `subagent` 或 `cron`                                                                      |
| Session ids | 子會話金鑰/id                                                                             |
| 類型        | 公告類型 + 任務標籤                                                                       |
| 狀態        | 衍生自執行階段結果 (`success`、`error`、`timeout` 或 `unknown`) — **而非** 從模型文字推斷 |
| 結果內容    | 最新可見的助手文字，否則為經過清理的最新工具/toolResult 文字                              |
| 後續動作    | 描述何時回覆與保持沈默的指示                                                              |

最終失敗的執行會回報失敗狀態，而不會重播擷取的回覆文字。若發生逾時且子項僅完成工具呼叫，公告可將該歷史記錄折疊成簡短的進度摘要，而不是重播原始工具輸出。

### 統計資料行

公告載荷在結尾包含一個統計資料行 (即使經過換行)：

- 執行時間 (例如 `runtime 5m12s`)。
- Token 使用量 (輸入/輸出/總計)。
- 當設定模型定價時的估算成本 (`models.providers.*.models[].cost`)。
- `sessionKey`、`sessionId` 和 transscript 路徑，以便主要代理可以透過 `sessions_history` 獲取歷史記錄或檢查磁碟上的檔案。

內部元數據僅用於編排；面向使用者的回覆應以標準的助手語氣重寫。

### 為什麼優先使用 `sessions_history`

`sessions_history` 是更安全的編排路徑：

- 首先會對 Assistant recall 進行標準化：移除 thinking 標籤；移除 `<relevant-memories>` / `<relevant_memories>` 支架；移除純文字工具呼叫 XML 載荷區塊 (`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`)，包括無法正確結尾的截斷載荷；移除降級的工具呼叫/結果支架和歷史上下文標記；移除洩漏的模型控制權杖 (`<|assistant|>`、其他 ASCII `<|...|>`、全形 `<｜...｜>`)；移除格式錯誤的 MiniMax 工具呼叫 XML。
- 類似憑證/權杖的文字會被編輯。
- 長區塊可能會被截斷。
- 非常大的歷史記錄可能會丟棄較舊的行，或用 `[sessions_history omitted: message too large]` 取代過大的行。
- 當您需要完整的逐位元組逐字元逐行對比的抄本時，檢查原始磁碟抄本是備用方案。

## 工具政策

子代理首先使用與父代理或目標代理相同的設定檔和工具政策管線。之後，OpenClaw 會套用子代理限制層。

如果沒有限制性的 `tools.profile`，子代理將獲得**所有工具，除了
session tools** 和系統工具：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` 在這裡仍然是一個有界的、經過清理的回溯視圖 —— 它
不是原始抄本傾印。

當 `maxSpawnDepth >= 2` 時，深度 1 的編排器子代理還會額外接收
`sessions_spawn`、`subagents`、`sessions_list` 和
`sessions_history`，以便它們可以管理其子代理。

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

`tools.subagents.tools.allow` 是一个最終的僅允許（allow-only）過濾器。它可以縮小
已解析的工具集，但無法將被 `tools.profile` 移除的工具
**加回**。例如，`tools.profile: "coding"` 包含
`web_search`/`web_fetch` 但不包含 `browser` 工具。若要讓
coding-profile 子代理使用瀏覽器自動化，請在 profile 階段新增 browser：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

當只有一個代理應獲得瀏覽器自動化時，請使用每個代理的 `agents.list[].tools.alsoAllow: ["browser"]`。

## 並行性

子代理使用專用的進程內佇列通道：

- **通道名稱：** `subagent`
- **並發數：** `agents.defaults.subagents.maxConcurrent`（預設 `8`）

## 存活與恢復

OpenClaw 不將 `endedAt` 的缺席視為子代理仍然存活的永久證明。陳舊執行視窗之前未結束的執行
將停止在 `/subagents list`、狀態摘要、
子項完成閘道以及每個會話並發檢查中計入活動/待處理狀態。

閘道重啟後，除非子會話被標記為 `abortedLastRun: true`，否則陳舊的未結束還原執行將被修剪。那些
因重啟而中止的子會話仍可透過子代理
孤兒復原流程進行復原，該流程會在清除中止標記之前發送合成恢復訊息。

自動重啟復原對每個子會話都有限制。如果同一個
子代理子項在快速重新嵌入視窗內反覆被接受進行孤兒復原，OpenClaw 將在該會話上保存復原墓碑
並在後續重啟時停止自動恢復它。執行
`openclaw tasks maintenance --apply` 以協調任務記錄，或
`openclaw doctor --fix` 以清除具有墓碑標記會話上陳舊的中止復原標誌。

<Note>
  如果子代理生成因 Gateway `PAIRING_REQUIRED` / `scope-upgrade` 而失敗，請在編輯配對狀態前檢查 RPC 呼叫端。 內部 `sessions_spawn` 協調應透過直接 loopback shared-token/password auth 作為 `client.id: "gateway-client"` 並帶有 `client.mode: "backend"` 進行連接； 該路徑不依賴 CLI 的配對裝置範圍基準。遠端呼叫端、顯式 `deviceIdentity`、顯式裝置權杖路徑，以及瀏覽器/node 客戶端
  在進行範圍升級時仍需要正常的裝置核准。
</Note>

## 停止

- 在請求者聊天中發送 `/stop` 會中止請求者階段並停止所有從中衍生的活躍子代理運作，並連鎖影響至巢狀子項。
- `/subagents kill <id>` 會停止特定的子代理並連鎖影響至其子項。

## 限制

- 子代理公告採用 **best-effort（盡力而為）** 機制。如果 gateway 重新啟動，待處理的「公告回覆」工作將會遺失。
- 子代理仍然共享相同的 gateway 程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 始終是非阻斷的：它會立即回傳 `{ status: "accepted", runId, childSessionKey }`。
- 子代理上下文僅會注入 `AGENTS.md`、`TOOLS.md`、`SOUL.md`、`IDENTITY.md` 和 `USER.md`（不含 `MEMORY.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。大多數使用情況建議使用深度 2。
- `maxChildrenPerAgent` 限制了每個階段的活躍子項數量（預設 `5`，範圍 `1–20`）。

## 相關

- [ACP agents](/zh-Hant/tools/acp-agents)
- [Agent send](/zh-Hant/tools/agent-send)
- [Background tasks](/zh-Hant/automation/tasks)
- [Multi-agent sandbox tools](/zh-Hant/tools/multi-agent-sandbox-tools)
