---
summary: "產生獨立的背景代理執行，並將結果宣佈回請求者的聊天"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
sidebarTitle: "子代理"
---

子代理是從現有代理運行中生成的後台代理運行。
它們在自己的會話 (`agent:<agentId>:subagent:<uuid>`) 中運行，並且
在完成時，會將結果**通知**回請求者聊天
頻道。每個子代理運行都會被追蹤為
[背景任務](/zh-Hant/automation/tasks)。

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

使用頂層的 [`/steer <message>`](/zh-Hant/tools/steer) 來引導當前請求者會話的活動運行。當目標是子運行時，請使用 `/subagents steer <id|#> <message>`。

`/subagents info` 顯示運行元資料（狀態、時間戳、會話 ID、
記錄路徑、清理）。使用 `sessions_history` 來取得受限的、
經過安全過濾的回顧視圖；當您需要原始完整記錄時，請檢查磁碟上的記錄路徑。

### 執行緒綁定控制

這些指令適用於支援持久線程綁定的頻道。
請參閱下方的 [支援線程的頻道](#thread-supporting-channels)。

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
  <Accordion title="手動生成的遞送韌性">
    - OpenClaw 通過帶有穩定冪等鍵的 `agent` 回合，將完成結果交還給請求者會話。
    - 如果請求者運行仍處於活動狀態，OpenClaw 會首先嘗試喚醒/引導該運行，而不是啟動第二個可見的回覆路徑。
    - 如果請求者代理的完成交接失敗或沒有產生可見輸出，OpenClaw 會將遞送視為失敗並回退到佇列路由/重試。它不會將子結果直接發送到外部聊天。
    - 如果無法使用直接交接，它會回退到佇列路由。
    - 如果佇列路由仍然不可用，則在最終放棄之前，會使用指數退避重試公告。
    - 完成遞送會保留已解析的請求者路由：執行緒綁定或會話綁定的完成路由在可用時優先；如果完成來源僅提供頻道，OpenClaw 會從請求者會話的已解析路由 (`lastChannel` / `lastTo` / `lastAccountId`) 填充缺失的目標/帳戶，以便直接遞送仍然有效。

  </Accordion>
  <Accordion title="Completion handoff metadata">
    完成交接給請求者會話是運行時生成的內部上下文（非使用者撰寫的文字），並包含：

    - `Result` — 最新的可見 `assistant` 回覆文字，否則為經過清理的最新 tool/toolResult 文字。終端失敗的運行不會重複使用捕獲的回覆文字。
    - `Status` — `completed successfully` / `failed` / `timed out` / `unknown`。
    - 緊湊的運行時 / token 統計。
    - 一項傳送指令，告知請求者代理以正常的助手語氣重寫（而不是轉發原始的內部元資料）。

  </Accordion>
  <Accordion title="Modes and ACP runtime">
    - `--model` 和 `--thinking` 會覆寫該特定執行的預設值。
    - 使用 `info`/`log` 在完成後檢視詳細資訊和輸出。
    - `/subagents spawn` 是一次性模式 (`mode: "run"`)。對於持久化的執行緒綁定工作階段，請搭配 `thread: true` 和 `mode: "session"` 使用 `sessions_spawn`。
    - 對於 ACP 駝具工作階段 (Claude Code、Gemini CLI、OpenCode 或明確的 Codex ACP/acpx)，當工具宣告支援該執行環境時，請使用 `sessions_spawn` 搭配 `runtime: "acp"`。在除錯完成或代理對代理迴圈時，請參閱 [ACP 遞送模型](/zh-Hant/tools/acp-agents#delivery-model)。當啟用 `codex` 外掛程式時，除非使用者明確要求 ACP/acpx，否則 Codex 聊天/執行緒控制應優先選擇 `/codex ...` 而非 ACP。
    - OpenClaw 會隱藏 `runtime: "acp"`，直到啟用 ACP、請求者未處於沙箱中，且載入諸如 `acpx` 等後端外掛程式為止。`runtime: "acp"` 預期外部 ACP 駝具 ID，或是帶有 `runtime.type="acp"` 的 `agents.list[]` 項目；對於來自 `agents_list` 的正常 OpenClaw 設定代理，請使用預設的子代理執行環境。

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

### 委派提示模式

`agents.defaults.subagents.delegationMode` 僅控制提示詞指導；它不會改變工具原則或強制執行委派。

- `suggest` （預設值）：保留標準的提示詞推動，針對較大或較緩慢的工作使用子 Agent。
- `prefer`：告訴主要 Agent 保持回應，並透過 `sessions_spawn` 將比直接回應更複雜的工作進行委派。

各別 Agent 的覆寫使用 `agents.list[].subagents.delegationMode`。

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
  用於稍後 `subagents` 定向的可選穩定句柄。必須符合 `[a-z][a-z0-9_]{0,63}` 且不能是保留目標，例如 `last` 或 `all`。當協調器在生成多個子項後可能需要引導、終止或識別特定子項時，建議使用。
</ParamField>
<ParamField path="label" type="string">
  可選的人類可讀標籤。
</ParamField>
<ParamField path="agentId" type="string">
  當 `subagents.allowAgents` 允許時，在另一個代理 ID 下生成。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 僅適用於外部 ACP 駝具（`claude`、`droid`、`gemini`、`opencode` 或明確請求的 Codex ACP/acpx）以及 `agents.list[]` 條目，其 `runtime.type` 為 `acp`。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  僅限 ACP。當 `runtime: "acp"` 時，恢復現有的 ACP 駝具會話；對於原生子代理生成則忽略。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  僅限 ACP。當 `runtime: "acp"` 時，將 ACP 執行輸出串流到父會話；對於原生子代理生成則省略。
</ParamField>
<ParamField path="model" type="string">
  覆蓋子代理模型。無效值將被跳過，子代理將在預設模型上運行，並在工具結果中顯示警告。
</ParamField>
<ParamField path="thinking" type="string">
  覆蓋子代理執行的思考等級。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`。設定後，子代理執行將在 N 秒後中止。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  當 `true` 時，請求此子代理會話的頻道執行緒綁定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果省略 `thread: true` 和 `mode`，預設值變為 `session`。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 會在公告後立即歸檔（仍透過重新命名保留對話紀錄）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  除非目標子項執行時期是在沙箱中，否則 `require` 將拒絕生成。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 將請求者的當前對話紀錄分支到子會話中。僅限原生子代理。執行緒綁定的生成預設為 `fork`；非執行緒生成預設為 `isolated`。
</ParamField>

<Warning>`sessions_spawn` **不**接受通道傳遞參數（`target`、 `channel`、`to`、`threadId`、`replyTo`、`transport`）。若要傳遞結果，請使用 生成執行中的 `message`/`sessions_send`。</Warning>

### 任務名稱與目標定位

`taskName` 是供編排使用的模型端句柄，而非會話金鑰。
當協調器之後可能需要引導或終止子代理時，請將其用於穩定的子代理名稱，例如 `review_subagents`、
`linux_validation` 或 `docs_update`。

目標解析接受精確的 `taskName` 匹配和無歧義的前綴。匹配範圍限定在與編號 `/subagents` 目標使用的相同活躍/近期目標視窗內，因此過時的已完成子代理不會導致重複使用的句柄產生歧義。如果兩個活躍或近期的子代理共用相同的
`taskName`，則該目標具有歧義；請改用清單索引、會話金鑰或執行 ID。

保留目標 `last` 和 `all` 不是有效的 `taskName` 值，
因為它們已具有控制含義。

## 工具：`sessions_yield`

結束當前的模型輪次並等待執行階段事件（主要是
子代理完成事件）作為下一則訊息到達。請在產生必要的子項工作後使用此工具，
當請求者在這些完成事項到達之前無法產生最終
答案時。

`sessions_yield` 是等待的基本操作。請勿僅為了偵測子代理完成，而將其替換為對
`subagents`、`sessions_list`、`sessions_history`、Shell
`sleep` 或程序輪詢的輪詢迴圈。

僅當會話的有效工具清單包含 `sessions_yield` 時才使用它。某些最小或自訂工具設定檔可能會公開 `sessions_spawn` 和
`subagents` 而不公開 `sessions_yield`；在這種情況下，請勿僅為了等待完成而
發明輪詢迴圈。

當存在活躍的子代理時，OpenClaw 會將一個緊湊的執行時生成的
`Active Subagents` 提示塊注入到正常輪次中，以便請求者可以在不輪詢的情況下查看
當前的子代理會話、執行 ID、狀態、標籤、任務和
`taskName` 別名。該塊中的任務和標籤字段被引用為數據，而非指令，因為它們可能源自
用戶/模型提供的生成引數。

## 工具：`subagents`

列出、引導或終止請求者會話擁有的已產生子代理執行。其範圍限於當前請求者；子代只能看到/控制其自身受控的子代。

使用 `subagents` 獲取按需狀態、進行偵錯、引導或終止。
使用 `sessions_yield` 等待完成事件。

## 執行緒綁定會話

當為頻道啟用執行緒綁定時，子代理可以保持綁定到某個執行緒，以便該執行緒中的後續使用者訊息持續路由到同一個子代理會話。

### 支援執行緒的頻道

**Discord** 目前是唯一支援的頻道。它支援
持久化線程綁定的子代理會話（`sessions_spawn` 搭配
`thread: true`）、手動線程控制（`/focus`、`/unfocus`、`/agents`、
`/session idle`、`/session max-age`）以及適配器鍵
`channels.discord.threadBindings.enabled`、
`channels.discord.threadBindings.idleHours`、
`channels.discord.threadBindings.maxAgeHours` 和
`channels.discord.threadBindings.spawnSessions`。

### 快速流程

<Steps>
  <Step title="生成">使用 `sessions_spawn` 搭配 `thread: true`（可選擇性地搭配 `mode: "session"`）。</Step>
  <Step title="Bind">OpenClaw 在目前頻道中為該 session 目標建立或綁定執行緒。</Step>
  <Step title="Route follow-ups">該執行緒中的回覆與後續訊息會路由到已綁定的 session。</Step>
  <Step title="檢查逾時">使用 `/session idle` 檢查/更新非活動自動失去焦點並 使用 `/session max-age` 控制硬性上限。</Step>
  <Step title="分離">使用 `/unfocus` 手動分離。</Step>
</Steps>

### 手動控制

| 指令               | 效果                                                  |
| ------------------ | ----------------------------------------------------- |
| `/focus <target>`  | 將目前執行緒（或建立一個）綁定到子 agent/session 目標 |
| `/unfocus`         | 移除目前已綁定執行緒的綁定                            |
| `/agents`          | 列出活躍執行和綁定狀態（`thread:<id>` 或 `unbound`）  |
| `/session idle`    | 檢查/更新閒置自動取消聚焦（僅限聚焦的已綁定執行緒）   |
| `/session max-age` | 檢查/更新硬性上限（僅限聚焦的已綁定執行緒）           |

### 組態開關

- **全域預設：** `session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **頻道覆寫和生成自動綁定金鑰** 取決於配接器。請參閱上方的 [支援執行緒的頻道](#thread-supporting-channels)。

請參閱 [組態參考](/zh-Hant/gateway/configuration-reference) 和
[斜線指令](/zh-Hant/tools/slash-commands) 以了解目前配接器的詳細資訊。

### 允許清單

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可透過明確的 `agentId` 鎖定的代理程式 ID 清單（`["*"]` 允許任何代理程式）。預設值：僅限請求者代理程式。如果您設定了清單，但仍希望請求者使用 `agentId` 生成自身，請將請求者 ID 包含在清單中。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  當請求者代理程式未設定自己的 `subagents.allowAgents` 時，使用的預設目標代理程式允許清單。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確設定檔選擇）。各代理程式覆寫：`agents.list[].subagents.requireAgentId`。
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  閘道 `agent` 公告傳遞嘗試的每次呼叫逾時。值為正整數毫秒，並會被限制為平台安全的計時器最大值。暫時性重試可能會使總公告等待時間超過一個設定的逾時值。
</ParamField>

如果請求者會話是在沙箱中執行，`sessions_spawn` 將會拒絕以非沙箱方式執行的目標。

### 探索

使用 `agents_list` 查看目前允許用於 `sessions_spawn` 的代理程式 ID。回應包含每個列出代理程式的有效模型和內嵌執行階段中繼資料，以便呼叫者區分 PI、Codex 應用程式伺服器和其他設定的原生執行階段。

### 自動封存

- 子代理程式會話會在 `agents.defaults.subagents.archiveAfterMinutes` 之後自動封存（預設 `60`）。
- 封存作業使用 `sessions.delete` 並將對話記錄重新命名為 `*.deleted.<timestamp>`（相同資料夾）。
- `cleanup: "delete"` 會在通知後立即封存（仍透過重新命名保留對話紀錄）。
- 自動封存為盡力而為；如果閘道重新啟動，擱置中的計時器將會遺失。
- `runTimeoutSeconds` **不會**自動封存；它只會停止執行。該工作階段會保留直到自動封存。
- 自動封存同樣適用於深度 1 和深度 2 的會話。
- 瀏覽器清理與封存清理分開：當執行完成時，追蹤的瀏覽器分頁/行程會盡力關閉，即使文字紀錄/會話記錄被保留。

## 巢狀子代理程式

根據預設，子代理無法生成自己的子代理
(`maxSpawnDepth: 1`)。設定 `maxSpawnDepth: 2` 以啟用一層
巢狀結構 — 即 **協調器模式 (orchestrator pattern)**：主程式 → 協調器子代理 →
工作子子代理。

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

| 深度 | Session key 形狀                             | 角色                              | 可產生？                  |
| ---- | -------------------------------------------- | --------------------------------- | ------------------------- |
| 0    | `agent:<id>:main`                            | 主代理                            | 總是                      |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理（若允許深度 2 則為編排者） | 僅當 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理（葉節點工作器）          | 從不                      |

### 宣告鏈

結果沿鏈向上流回：

1. 深度 2 的工作器完成 → 向其父代（深度 1 的編排者）宣告。
2. 深度 1 的編排者接收宣告，綜合結果，完成 → 向主代理宣告。
3. 主代理接收宣告並傳遞給使用者。

每個層級僅能看到其直接子代的宣告。

<Note>
  **操作指南：** 啟動子工作一次並等待完成 事件，而不是圍繞 `sessions_list`、 `sessions_history`、`/subagents list` 或 `exec` 睡眠指令建立輪詢迴圈。 `sessions_list` 和 `/subagents list` 使子工作階段關係 專注於即時工作 — 即時子項保持連結，已結束的子項在短時間內 保持可見，而過時的僅存儲連結會在有效期後被忽略。這可防止舊的 `spawnedBy` / `parentSessionKey`
  元資料在重新啟動後還原舛誤的子項。如果子項完成事件在您已發送 最終答案後才到達，正確的後續操作是使用確切的無聲權杖 `NO_REPLY` / `no_reply`。
</Note>

### 依深度區分的工具政策

- 角色與控制範圍會在產生時寫入工作階段元數據。這能防止扁平化或還原的 session keys 意外重新獲得編排者權限。
- **深度 1 (協調器，當 `maxSpawnDepth >= 2` 時)：** 獲得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history` 以便管理其子項。其他工作階段/系統工具仍被拒絕。
- **深度 1 (葉節點，當 `maxSpawnDepth == 1` 時)：** 無工作階段工具（目前的預設行為）。
- **深度 2 (葉節點工作程式)：** 無工作階段工具 — `sessions_spawn` 在深度 2 總是被拒絕。無法生成更多子項。

### 每個代理的產生限制

每個代理會話（任何深度）一次最多只能有 `maxChildrenPerAgent`（預設 `5`）個活躍子節點。這可以防止單一編排器的無限制擴散。

### 級聯停止

停止深度 1 的編排者會自動停止其所有深度 2
的子代理：

- 主聊天中的 `/stop` 會停止所有深度為 1 的代理，並級聯到其深度為 2 的子節點。
- `/subagents kill <id>` 會停止特定的子代理，並級聯到其子節點。
- `/subagents kill all` 會停止請求者的所有子代理並進行級聯。

## 驗證

子代理的驗證是依據 **代理 ID** 解析，而非會話類型：

- 子代理會話金鑰是 `agent:<agentId>:subagent:<uuid>`。
- Auth store 是從該代理的 `agentDir` 載入的。
- 主代理的驗證設定檔會作為 **後備** 合併進來；如果發生衝突，代理設定檔會覆寫主設定檔。

此合併是累加的，因此主設定檔始終可作為後備使用。目前尚未支援每個代理完全隔離的驗證。

## 公告

子代理透過公告步驟回報：

- 公告步驟是在子代理會話內執行（而非請求者會話）。
- 如果子代理完全回覆 `ANNOUNCE_SKIP`，則不會發布任何內容。
- 如果最新的助手文字是完全的靜默權杖 `NO_REPLY` / `no_reply`，即使之前存在可見的進度，也會抑制公告輸出。

傳遞取決於請求者的深度：

- 頂層請求者會話使用後續的 `agent` 呼叫，並進行外部傳遞（`deliver=true`）。
- 巢狀請求者子代理會話會收到內部後續注入（`deliver=false`），以便編排器可以在會話內綜合子節點結果。
- 如果巢狀請求者子代理會話已經消失，OpenClaw 會在可用時回退到該會話的請求者。

對於頂層請求者會話，完成模式直接傳遞首先解析任何綁定的對話/執行緒路徑和掛鉤覆蓋，然後從請求者會話的儲存路徑填寫缺失的頻道目標欄位。這樣即使完成來源僅識別頻道，也能將完成內容保持在正確的聊天/主題上。

子完成聚合在構建巢狀完成發現時限定於當前請求者運行，防止陳舊的先前運行子輸出洩漏到當前的公告中。當在頻道配接器上可用時，公告回覆會保留執行緒/主題路由。

### 公告上下文

公告上下文被正規化為一個穩定的內部事件區塊：

| 欄位     | 來源                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 來源     | `subagent` 或 `cron`                                                                   |
| 會話 ID  | 子會話金鑰/ID                                                                          |
| 類型     | 公告類型 + 任務標籤                                                                    |
| 狀態     | 衍生自執行時結果（`success`、`error`、`timeout` 或 `unknown`）——**並非**從模型文字推斷 |
| 結果內容 | 最新的可見助手文字，否則為經過清理的最新工具/toolResult 文字                           |
| 後續操作 | 描述何時回覆與保持沈默的指令                                                           |

終端失敗的運行會報告失敗狀態，而不重播捕獲的回覆文字。如果發生超時，且子項僅完成工具呼叫，公告可以將該歷史記錄折疊為簡短的部份進度摘要，而不是重播原始工具輸出。

### 統計行

公告承載在結尾包含一個統計行（即使被包裝）：

- 執行時間（例如 `runtime 5m12s`）。
- Token 使用量 (輸入/輸出/總計)。
- 當配置模型定價時的預估成本（`models.providers.*.models[].cost`）。
- `sessionKey`、`sessionId` 和文字記錄路徑，以便主代理可以透過 `sessions_history` 取得歷史記錄或在磁碟上檢查檔案。

內部元資料僅供編排使用；面向使用者的回覆應以一般助理語氣重新撰寫。

### 為何偏好 `sessions_history`

`sessions_history` 是更安全的編排路徑：

- 助理回憶首先會進行標準化處理：移除思考標籤；移除 `<relevant-memories>` / `<relevant_memories>` 支架；移除純文字工具呼叫 XML 載荷區塊（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`），包括從未乾淨結束的被截斷載荷；移除降級的工具呼叫/結果支架和歷史記錄上下文標記；移除洩漏的模型控制權杖（`<|assistant|>`、其他 ASCII `<|...|>`、全形 `<｜...｜>`）；移除格式錯誤的 MiniMax 工具呼叫 XML。
- 類似憑證/權杖的文字會被編輯隱藏。
- 過長的區塊可能會被截斷。
- 非常大的歷史記錄可能會捨棄較舊的行，或用 `[sessions_history omitted: message too large]` 替換過大的行。
- 當您需要完整的逐位元組逐字記錄時，檢查原始磁碟記錄是備用方案。

## 工具政策

子代理優先使用與父代理或目標代理相同的設定檔和工具政策管道。之後，OpenClaw 會套用子代理限制層。

如果沒有限制性的 `tools.profile`，子代理將獲得**除會話工具和系統工具以外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` 在此也保持為一個有界的、經過清理的回憶視圖——它並非原始的文字記錄傾印。

當 `maxSpawnDepth >= 2` 時，深度為 1 的協調器子代理還會接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它們管理其子項。

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

`tools.subagents.tools.allow` 是一個最終的僅允許過濾器。它可以縮小已解析的工具集，但無法**恢復**被 `tools.profile` 移除的工具。例如，`tools.profile: "coding"` 包含 `web_search`/`web_fetch` 但不包含 `browser` 工具。若要讓編碼設定檔的子代理使用瀏覽器自動化，請在設定檔階段新增瀏覽器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

當只有一個代理應該取得瀏覽器自動化功能時，請使用個別代理的 `agents.list[].tools.alsoAllow: ["browser"]`。

## 並行性

子代理使用專用的程序內佇列通道：

- **通道名稱：** `subagent`
- **並行性：** `agents.defaults.subagents.maxConcurrent`（預設為 `8`）

## 存活與復原

OpenClaw 不將 `endedAt` 的缺席視為子代理程式仍存活的永久證明。早於過期執行視窗且未結束的執行，在 `/subagents list`、狀態摘要、後代完成閘門以及每個會併發檢查中，將不再被計為作用中/待處理。

在閘道重啟後，過時且未結束的已還原執行將被修剪，除非其子會話被標記為 `abortedLastRun: true`。這些因重啟而中止的子會話仍可透過子代理程式孤兒修復流程來還原，該流程會在清除中止標記之前發送合成恢復訊息。

自動重啟修復是依每個子會話設限的。如果同一個子代理程式子程式在快速重新嵌入視窗內被反覆接受進行孤兒修復，OpenClaw 將在該會話上持久化修復墓碑，並在後續重啟時停止自動還原。請執行 `openclaw tasks maintenance --apply` 以協調任務記錄，或執行 `openclaw doctor --fix` 以清除標有墓碑的會話上過時的中止修復標誌。

<Note>
  如果子代理程式生成失敗並出現 Gateway `PAIRING_REQUIRED` / `scope-upgrade`，請在編輯配對狀態之前檢查 RPC 呼叫端。內部 `sessions_spawn` 協調應透過直接回環共享權杖/密碼驗證，以 `client.id: "gateway-client"` 身分並帶有 `client.mode: "backend"` 進行連線；該路徑不依賴 CLI 的配對裝置範圍基線。遠端呼叫端、顯式
  `deviceIdentity`、顯式裝置權杖路徑，以及瀏覽器/節點客戶端，仍需要正常的裝置核准才能進行範圍升級。
</Note>

## 停止

- 在請求者聊天中傳送 `/stop` 會中止請求者會話，並停止由其衍生的任何作用中子代理程式執行，並串聯至巢狀子項。
- `/subagents kill <id>` 會停止特定的子代理程式，並串聯至其子項。

## 限制

- 子代理公告屬於**盡力而為 (best-effort)**。如果閘道重新啟動，擱置中的「公告回報」工作將會遺失。
- 子代理程式仍然共用相同的閘道處理程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 始終為非阻塞性：它會立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- Sub-agent 上下文僅注入 `AGENTS.md`、`TOOLS.md`、`SOUL.md`、`IDENTITY.md` 和 `USER.md`（不包含 `MEMORY.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大巢套深度為 5（`maxSpawnDepth` 範圍：1–5）。對於大多數使用情況，建議使用深度 2。
- `maxChildrenPerAgent` 限制每個 session 的活躍子進程數量（預設 `5`，範圍 `1–20`）。

## 相關

- [ACP agents](/zh-Hant/tools/acp-agents)
- [Agent send](/zh-Hant/tools/agent-send)
- [Background tasks](/zh-Hant/automation/tasks)
- [Multi-agent sandbox tools](/zh-Hant/tools/multi-agent-sandbox-tools)
