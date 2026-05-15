---
summary: "產生獨立的背景代理執行，並將結果宣佈回請求者的聊天"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
sidebarTitle: "子代理"
---

子代理是從現有代理執行中產生的背景代理執行。
它們在自己的會話 (`agent:<agentId>:subagent:<uuid>`) 中執行，並在完成時將結果
**宣佈** 回請求者的聊天頻道。每個子代理執行都會被追蹤為
[背景任務](/zh-Hant/automation/tasks)。

主要目標：

- 在不阻塞主要執行的情況下，平行化「研究 / 長任務 / 慢速工具」工作。
- 預設讓 sub-agents 保持隔離（session 分隔 + 可選的沙箱機制）。
- 讓工具介面難以誤用：sub-agents **不** 會預設取得 session 工具。
- 支援可配置的巢狀深度，以實現編排器模式。

<Note>
  **成本注意：** 預設情況下，每個子代理都有自己的上下文和 Token 使用量。 對於繁重或重複性任務，請為子代理設定更便宜的模型， 並將您的主代理保持在更高品質的模型上。透過 `agents.defaults.subagents.model` 或個別代理的覆寫進行設定。當子執行個體 真正需要請求者的當前文字記錄時，代理可以針對該次產生請求 `context: "fork"`。綁定執行緒的子代理會話預設 使用 `context: "fork"`，因為它們將當前對話分支到
  後續執行緒中。
</Note>

## 斜線指令

使用 `/subagents` 來檢查或控制 **當前
會話** 的子代理執行：

```text
/subagents list
/subagents kill <id|#|all>
/subagents log <id|#> [limit] [tools]
/subagents info <id|#>
/subagents send <id|#> <message>
/subagents steer <id|#> <message>
/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]
```

使用頂層 [`/steer <message>`](/zh-Hant/tools/steer) 來引導當前請求者會話的作用中執行。當目標是子執行時，請使用 `/subagents steer <id|#> <message>`。

`/subagents info` 顯示執行元資料（狀態、時間戳記、會話 ID、
文字記錄路徑、清理作業）。使用 `sessions_history` 進行有限制的、
經過安全過濾的回顧檢視；當您需要原始完整文字記錄時，
請檢查磁碟上的文字記錄路徑。

### 執行緒綁定控制

這些指令適用於支援持續性執行緒綁定的頻道。
請參閱下方的 [支援執行緒的頻道](#thread-supporting-channels)。

```text
/focus <subagent-label|session-key|session-id|session-label>
/unfocus
/agents
/session idle <duration|off>
/session max-age <duration|off>
```

### 產生行為

`/subagents spawn` 作為使用者指令（而非內部中繼）啟動背景子代理，
並在執行完成時將最終完成更新傳送回
請求者聊天。

<AccordionGroup>
  <Accordion title="非阻塞、基於推送的完成">
    - 生成指令是非阻塞的；它會立即返回一個執行 ID。
    - 完成後，子代理會將摘要/結果訊息發布回請求者的聊天頻道。
    - 需要子結果的代理回合應在生成所需工作後呼叫 `sessions_yield`。這會結束當前回合，並讓完成事件作為下一個模型可見的訊息到達。
    - 完成是基於推送的。一旦生成，請**勿**僅為等待其完成而循環輪詢 `/subagents list`、`sessions_list` 或 `sessions_history`；僅在除錯或介入時按需檢查狀態。
    - 子輸出是供請求者代理綜合的報告/證據。它不是使用者撰寫的指令文字，且不能覆蓋系統、開發者或使用者原則。
    - 完成後，OpenClaw 會在繼續公告清理流程之前，盡最大努力關閉該子代理會話開啟的追蹤瀏覽器分頁/處理程序。

  </Accordion>
  <Accordion title="手動生成的傳遞恢復能力">
    - OpenClaw 透過具有穩定冪等金鑰的 `agent` 回合，將完成結果交還給請求者會話。
    - 如果請求者執行仍處於活動狀態，OpenClaw 會首先嘗試喚醒/引導該執行，而不是啟動第二個可見的回覆路徑。
    - 如果請求者代理的完成交接失敗或未產生可見輸出，OpenClaw 會將傳遞視為失敗並回退至佇列路由/重試。它不會將子結果直接原始發送到外部聊天。
    - 如果無法使用直接交接，它會回退至佇列路由。
    - 如果佇列路由仍然不可用，則會在最終放棄前使用短指數退避重試公告。
    - 完成傳遞保留已解析的請求者路由：繫結執行緒或繫結對話的完成路由在可用時優先；如果完成來源僅提供頻道，OpenClaw 會從請求者會話的已解析路由 (`lastChannel` / `lastTo` / `lastAccountId`) 填補缺失的目標/帳戶，以便直接傳遞仍然有效。

  </Accordion>
  <Accordion title="Completion handoff metadata">
    傳遞給請求者會話的完成交接內容是執行時生成的
    內部上下文（非使用者撰寫的文字），包含：

    - `Result` — 最新的可見 `assistant` 回覆文字，否則為經過清理的最新工具/toolResult 文字。終端失敗的執行不會重複使用擷取的回覆文字。
    - `Status` — `completed successfully` / `failed` / `timed out` / `unknown`。
    - 緊湊的執行時/Token 統計資料。
    - 一條傳送指令，告知請求者代理以正常的助理語氣重寫（而不是轉發原始內部中繼資料）。

  </Accordion>
  <Accordion title="模式和 ACP 運行時">
    - `--model` 和 `--thinking` 會覆寫該特定執行的預設值。
    - 使用 `info`/`log` 在完成後檢查詳細資訊和輸出。
    - `/subagents spawn` 是一次性模式 (`mode: "run"`)。對於持續的執行緒綁定工作階段，請使用 `sessions_spawn` 搭配 `thread: true` 和 `mode: "session"`。
    - 對於 ACP harness 工作階段 (Claude Code, Gemini CLI, OpenCode, 或明確的 Codex ACP/acpx)，當工具宣佈支援該運行時時，請使用 `sessions_spawn` 搭配 `runtime: "acp"`。在除錯完成或代理對代理迴圈時，請參閱 [ACP delivery model](/zh-Hant/tools/acp-agents#delivery-model)。當啟用 `codex` 外掛程式時，除非使用者明確要求 ACP/acpx，否則 Codex 聊天/執行緒控制應優先使用 `/codex ...` 而非 ACP。
    - OpenClaw 會隱藏 `runtime: "acp"`，直到啟用 ACP、請求者未處於沙盒中，並載入後端外掛程式 (例如 `acpx`) 為止。`runtime: "acp"` 預期會有外部 ACP harness id，或是帶有 `runtime.type="acp"` 的 `agents.list[]` 項目；對於來自 `agents_list` 的標準 OpenClaw 設定代理，請使用預設的子代理運行時。

  </Accordion>
</AccordionGroup>

## 情境模式

除非呼叫者明確要求分岔目前的對話記錄，否則原生子代理會以隔離狀態啟動。

| 模式       | 使用時機                                                                 | 行為                                                              |
| ---------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `isolated` | 全新研究、獨立實作、緩慢的工具工作，或任何可在任務文字中簡要說明的事項   | 建立乾淨的子對話記錄。這是預設選項，且能保持較低的 token 使用量。 |
| `fork`     | 取決於目前對話、先前工具結果，或已存在於請求者對話記錄中的細微指令之工作 | 在子項開始之前，將請求者的對話記錄分岔至子工作階段。              |

請節慎使用 `fork`。它是用於上下文相關的委派，而非用於撰寫清晰任務提示的替代方案。

## 工具：`sessions_spawn`

使用 `deliver: false` 在全域 `subagent` 通道上啟動子代理程式執行，然後執行公告步驟並將公告回覆發布至請求者聊天頻道。

可用性取決於呼叫者的有效工具原則。`coding` 和 `full` 設定檔預設會公開 `sessions_spawn`。`messaging` 設定檔則不會；對於應委派工作的代理程式，請新增 `tools.alsoAllow: ["sessions_spawn", "sessions_yield",
"subagents"]` or use `tools.profile: "coding"`。頻道/群組、提供者、沙箱以及個別代理程式的允許/拒絕原則仍可在設定檔階段之後移除該工具。請從同一個工作階段使用 `/tools` 以確認有效的工具清單。

**預設值：**

- **模型：** 繼承呼叫者，除非您設定了 `agents.defaults.subagents.model`（或個別代理程式的 `agents.list[].subagents.model`）；明確的 `sessions_spawn.model` 仍會優先。
- **思考：** 繼承呼叫者，除非您設定了 `agents.defaults.subagents.thinking`（或個別代理程式的 `agents.list[].subagents.thinking`）；明確的 `sessions_spawn.thinking` 仍會優先。
- **執行逾時：** 如果省略了 `sessions_spawn.runTimeoutSeconds`，OpenClaw 會在設定時使用 `agents.defaults.subagents.runTimeoutSeconds`；否則會回退到 `0`（無逾時）。

### 委派提示模式

`agents.defaults.subagents.delegationMode` 僅控制提示指引；它不會變更工具原則或強制執行委派。

- `suggest`（預設）：保留標準提示，以針對較大或較緩慢的工作使用子代理程式。
- `prefer`：指示主要代理程式保持回應能力，並透過 `sessions_spawn` 委派任何比直接回覆更複雜的工作。

個別代理程式的覆寫使用 `agents.list[].subagents.delegationMode`。

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
  用於後續 `subagents` 定向的可選穩定控制代碼。必須符合 `[a-z][a-z0-9_]{0,63}`，且不能是保留目標（如 `last` 或 `all`）。當協調器在生成多個子項後可能需要引導、終止或識別特定子項時，建議使用此選項。
</ParamField>
<ParamField path="label" type="string">
  可選的人類可讀標籤。
</ParamField>
<ParamField path="agentId" type="string">
  當 `subagents.allowAgents` 允許時，在另一個代理 ID 下生成。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 僅適用於外部 ACP 駝具（`claude`、`droid`、`gemini`、`opencode` 或明確請求的 Codex ACP/acpx）以及 `runtime.type` 為 `acp` 的 `agents.list[]` 條目。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  僅限 ACP。當 `runtime: "acp"` 時，恢復現有的 ACP 駝具會話；對於原生子代理生成則忽略。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  僅限 ACP。當 `runtime: "acp"` 時，將 ACP 執行輸出串流到父會話；對於原生子代理生成則省略。
</ParamField>
<ParamField path="model" type="string">
  覆蓋子代理模型。無效值將被跳過，子代理將在預設模型上執行，並在工具結果中顯示警告。
</ParamField>
<ParamField path="thinking" type="string">
  覆蓋子代理執行的思考等級。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  設定時預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`。設定後，子代理執行將在 N 秒後中止。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  當設為 `true` 時，請求此子代理會話的頻道執行緒綁定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果省略 `thread: true` 和 `mode`，預設值變為 `session`。`mode: "session"` 需要 `thread: true`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 會在公告後立即歸檔（仍透過重新命名保留對話紀錄）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 會拒絕生成，除非目標子項執行時期已進入沙盒模式。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 會將請求者的當前對話紀錄分支到子會話中。僅限原生子代理。執行緒綁定的生成預設為 `fork`；非執行緒生成預設為 `isolated`。
</ParamField>

<Warning>`sessions_spawn` **不** 接受通道傳遞參數（`target`、 `channel`、`to`、`threadId`、`replyTo`、`transport`）。若要進行傳遞，請從產生的執行中使用 `message`/`sessions_send`。</Warning>

### 任務名稱與目標定位

`taskName` 是一個供編排使用的模型層級處理程式，而非會話金鑰。
當協調器稍後可能需要引導或終止該子項時，請將其用於穩定的子項名稱，例如 `review_subagents`、
`linux_validation` 或 `docs_update`。

目標解析接受完全符合的 `taskName` 和明確的
前綴。比對範圍限縮在與編號 `/subagents` 目標所使用的相同作用中/近期目標視窗內，因此過時的已完成子項不會導致重複使用的處理程式變得不明確。如果兩個作用中或近期的子項共用相同的
`taskName`，則該目標不明確；請改用列表索引、會話金鑰或
執行 ID。

保留目標 `last` 和 `all` 不是有效的 `taskName` 值，
因為它們已具有控制意義。

## 工具：`sessions_yield`

結束當前的模型輪次並等待執行階段事件（主要是
子代理完成事件）作為下一則訊息到達。請在產生必要的子項工作後使用此工具，
當請求者在這些完成事項到達之前無法產生最終
答案時。

`sessions_yield` 是等待的基本單元。請勿將其替換為對
`subagents`、`sessions_list`、`sessions_history`、shell
`sleep` 或程序輪詢的輪詢迴圈，僅為了偵測子項完成狀態。

僅當會話的有效工具清單包含 `sessions_yield` 時，才使用它。某些最小化或自訂的工具設定檔可能會公開 `sessions_spawn` 和 `subagents` 而不公開 `sessions_yield`；在這種情況下，不要僅為了等待完成而發明一個輪詢迴圈。

當存在活躍的子會話時，OpenClaw 會將一個精簡的執行時產生的 `Active Subagents` 提示區塊注入到一般的輪次中，以便請求者可以在不輪詢的情況下看到當前的子會話、執行 ID、狀態、標籤、任務和 `taskName` 別名。該區塊中的任務和標籤欄位被引用為數據，而不是指令，因為它們可能源自使用者/模型提供的產生引數。

## 工具：`subagents`

列出、引導或終止請求者會話擁有的已產生子代理執行。其範圍限於當前請求者；子代只能看到/控制其自身受控的子代。

使用 `subagents` 進行按需狀態查詢、除錯、引導或終止。使用 `sessions_yield` 等待完成事件。

## 執行緒綁定會話

當為頻道啟用執行緒綁定時，子代理可以保持綁定到某個執行緒，以便該執行緒中的後續使用者訊息持續路由到同一個子代理會話。

### 支援執行緒的頻道

**Discord** 目前是唯一支援的頻道。它支援持久的執行緒綁定子代理會話（帶有 `thread: true` 的 `sessions_spawn`）、手動執行緒控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`），以及適配器金鑰 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSessions`。

### 快速流程

<Steps>
  <Step title="產生">帶有 `thread: true` 的 `sessions_spawn`（可選帶有 `mode: "session"`）。</Step>
  <Step title="Bind">OpenClaw 在目前頻道中為該 session 目標建立或綁定執行緒。</Step>
  <Step title="Route follow-ups">該執行緒中的回覆與後續訊息會路由到已綁定的 session。</Step>
  <Step title="Inspect timeouts">使用 `/session idle` 來檢查/更新閒置自動取消聚焦， 並使用 `/session max-age` 來控制硬性上限。</Step>
  <Step title="Detach">使用 `/unfocus` 進行手動解除綁定。</Step>
</Steps>

### 手動控制

| 指令               | 效果                                                       |
| ------------------ | ---------------------------------------------------------- |
| `/focus <target>`  | 將目前執行緒（或建立一個）綁定到子 agent/session 目標      |
| `/unfocus`         | 移除目前已綁定執行緒的綁定                                 |
| `/agents`          | 列出正在執行的 run 與綁定狀態 (`thread:<id>` 或 `unbound`) |
| `/session idle`    | 檢查/更新閒置自動取消聚焦（僅限聚焦的已綁定執行緒）        |
| `/session max-age` | 檢查/更新硬性上限（僅限聚焦的已綁定執行緒）                |

### 組態開關

- **全域預設：** `session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **頻道覆寫與 spawn 自動綁定鍵** 因 adapter 而異。請參閱上方的 [支援執行緒的頻道](#thread-supporting-channels)。

請參閱 [組態參考](/zh-Hant/gateway/configuration-reference) 與
[斜線指令](/zh-Hant/tools/slash-commands) 以了解目前 adapter 的詳細資訊。

### 允許清單

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可透過明確的 `agentId` 指定的代理程式 ID 列表（`["*"]` 允許任何值）。預設值：僅限請求者代理程式。如果您設定了列表並且仍希望請求者使用 `agentId` 產生自身，請將請求者 ID 包含在列表中。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  當請求者代理程式未設定自己的 `subagents.allowAgents` 時使用的預設目標代理程式允許列表。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確選擇設定檔）。每個代理程式的覆寫：`agents.list[].subagents.requireAgentId`。
</ParamField>

如果請求者會話位於沙箱中，`sessions_spawn` 會拒絕將以非沙箱方式執行的目標。

### 探索

使用 `agents_list` 查看目前允許用於 `sessions_spawn` 的代理程式 ID。回應包含每個列出代理程式的有效模型和內嵌執行時間元數據，以便呼叫者能夠區分 PI、Codex 應用程式伺服器和其他設定的原生執行時間。

### 自動封存

- 子代理程式會話會在 `agents.defaults.subagents.archiveAfterMinutes` 後自動封存（預設 `60`）。
- 封存使用 `sessions.delete` 並將文字紀錄重新命名為 `*.deleted.<timestamp>`（同一個資料夾）。
- `cleanup: "delete"` 會在發布後立即封存（仍透過重新命名保留文字紀錄）。
- 自動封存為盡力而為；如果閘道重新啟動，擱置中的計時器將會遺失。
- `runTimeoutSeconds` **不會** 自動封存；它僅停止執行。該會話會保留直到自動封存。
- 自動封存同樣適用於深度 1 和深度 2 的會話。
- 瀏覽器清理與封存清理分開：當執行完成時，追蹤的瀏覽器分頁/行程會盡力關閉，即使文字紀錄/會話記錄被保留。

## 巢狀子代理程式

預設情況下，子代理無法產生自己的子代理
(`maxSpawnDepth: 1`)。設定 `maxSpawnDepth: 2` 以啟用一層
巢狀結構——即「編排者模式」：主代理 → 編排者子代理 →
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
  **操作指引：** 啟動子工作一次並等待完成 事件，而不是圍繞 `sessions_list`、 `sessions_history`、`/subagents list` 或 `exec` sleep 指令 建構輪詢迴圈。 `sessions_list` 和 `/subagents list` 讓子工作階段關係 專注於即時工作——即時子代保持附加，已結束的子代在 短暫的近期視窗內保持可見，而過時的僅存儲子連結 會在 freshness 視窗結束後被忽略。這可防止舊的 `spawnedBy` / `parentSessionKey`
  元數據在重啟後復活幽靈子代。如果 子代完成事件在您已發送最終答案之後才到達，正確的 後續回應是確切的無聲權杖 `NO_REPLY` / `no_reply`。
</Note>

### 依深度區分的工具政策

- 角色與控制範圍會在產生時寫入工作階段元數據。這能防止扁平化或還原的 session keys 意外重新獲得編排者權限。
- **深度 1（編排者，當 `maxSpawnDepth >= 2` 時）：** 會取得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便管理其子代理。其他會話/系統工具仍被拒絕。
- **深度 1（葉節點，當 `maxSpawnDepth == 1` 時）：** 沒有會話工具（目前的預設行為）。
- **深度 2（葉節點工作器）：** 沒有會話工具 — `sessions_spawn` 在深度 2 時總是被拒絕。無法產生更多子代。

### 每個代理的產生限制

每個代理會話（在任何深度）一次最多只能有 `maxChildrenPerAgent`
（預設為 `5`）個活躍的子代理。這可以防止單一編排者出現失控的擴散。

### 級聯停止

停止深度 1 的編排者會自動停止其所有深度 2
的子代理：

- 主聊天中的 `/stop` 會停止所有深度 1 的代理，並級聯至其深度 2 的子代理。
- `/subagents kill <id>` 會停止特定的子代理，並級聯至其子代理。
- `/subagents kill all` 會停止請求者的所有子代理，並進行級聯。

## 驗證

子代理的驗證是依據 **代理 ID** 解析，而非會話類型：

- 子代理會話金鑰為 `agent:<agentId>:subagent:<uuid>`。
- 驗證儲存是從該代理的 `agentDir` 載入。
- 主代理的驗證設定檔會作為 **後備** 合併進來；如果發生衝突，代理設定檔會覆寫主設定檔。

此合併是累加的，因此主設定檔始終可作為後備使用。目前尚未支援每個代理完全隔離的驗證。

## 公告

子代理透過公告步驟回報：

- 公告步驟是在子代理會話內執行（而非請求者會話）。
- 如果子代理確切回覆 `ANNOUNCE_SKIP`，則不會發布任何內容。
- 如果最新的助理文字確切為無聲權杖 `NO_REPLY` / `no_reply`，即使先前有可見的進度，也會抑制公告輸出。

傳遞取決於請求者的深度：

- 頂層請求者會話會使用具有外部傳遞（`deliver=true`）的後續 `agent` 呼叫。
- 巢狀請求者子代理會話會收到一個內部後續注入 (`deliver=false`)，以便編排器可以在會話內綜合子結果。
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
| 狀態     | 衍生自執行時結果 (`success`、`error`、`timeout` 或 `unknown`) — **不是**從模型文字推斷 |
| 結果內容 | 最新的可見助手文字，否則為經過清理的最新工具/toolResult 文字                           |
| 後續操作 | 描述何時回覆與保持沈默的指令                                                           |

終端失敗的運行會報告失敗狀態，而不重播捕獲的回覆文字。如果發生超時，且子項僅完成工具呼叫，公告可以將該歷史記錄折疊為簡短的部份進度摘要，而不是重播原始工具輸出。

### 統計行

公告承載在結尾包含一個統計行（即使被包裝）：

- 執行時間 (例如 `runtime 5m12s`)。
- Token 使用量 (輸入/輸出/總計)。
- 當配置了模型定價時的估算成本 (`models.providers.*.models[].cost`)。
- `sessionKey`、`sessionId` 和文字記錄路徑，以便主要代理可以透過 `sessions_history` 獲取歷史記錄或檢查磁碟上的檔案。

內部元資料僅供編排使用；面向使用者的回覆應以一般助理語氣重新撰寫。

### 為何偏好 `sessions_history`

`sessions_history` 是較安全的編排路徑：

- 助理回憶會先進行正規化處理：移除思考標籤；移除 `<relevant-memories>` / `<relevant_memories>` 腳手架；移除純文字工具呼叫 XML 區塊（`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`），包括未正常結尾的被截斷內容；移除降級的工具呼叫/結果腳手架與歷史內容標記；移除外洩的模型控制權杖（`<|assistant|>`、其他 ASCII `<|...|>`、全形 `<｜...｜>`）；移除格式錯誤的 MiniMax 工具呼叫 XML。
- 類似憑證/權杖的文字會被編輯隱藏。
- 過長的區塊可能會被截斷。
- 非常龐大的歷史記錄可能會捨棄較舊的列，或用 `[sessions_history omitted: message too large]` 取代過大的列。
- 當您需要完整的逐位元組逐字記錄時，檢查原始磁碟記錄是備用方案。

## 工具政策

子代理優先使用與父代理或目標代理相同的設定檔和工具政策管道。之後，OpenClaw 會套用子代理限制層。

若無限制性的 `tools.profile`，子代理將獲得 **所有工具，除了
會話工具** 與系統工具：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

`sessions_history` 在此仍維持受限且經過清理的回憶檢視 — 它
並非原始記錄的傾倒。

當 `maxSpawnDepth >= 2` 時，深度 1 的編排器子代理還會
收到 `sessions_spawn`、`subagents`、`sessions_list` 與
`sessions_history`，以便其管理子項。

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
已解析的工具集，但無法**加回** 被
`tools.profile` 移除的工具。例如，`tools.profile: "coding"` 包含
`web_search`/`web_fetch` 但不包含 `browser` 工具。若要讓
coding-profile 子代理使用瀏覽器自動化，請在 profile 階段加入瀏覽器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

當只有一個代理應該獲得瀏覽器自動化時，請使用個別代理的 `agents.list[].tools.alsoAllow: ["browser"]`。

## 並行性

子代理使用專用的程序內佇列通道：

- **通道名稱：** `subagent`
- **並行性：** `agents.defaults.subagents.maxConcurrent`（預設 `8`）

## 存活與復原

OpenClaw 不將 `endedAt` 的缺席視為子代理
仍然存活的永久證明。超過陳舊執行視窗且未結束的執行
將停止被計入 `/subagents list`、狀態摘要、
子代完成閘門以及各別會話並行性檢查中的有效/待處理項目。

在閘道重啟後，除非其子會話被標記為 `abortedLastRun: true`，否則陳舊且未結束的已還原執行將被修剪。這些
因重啟而中止的子會話仍可透過子代理孤兒復原流程進行復原，該流程會在清除
中止標記之前發送一個合成恢復訊息。

自動重啟恢復是每個子會話受限的。如果在快速重新楔入窗口內，同一個子代理子項重複被接受進行孤兒恢復，OpenClaw 會在該會話上保留一個恢復墓碑，並在之後的重啟中停止自動恢復它。執行 `openclaw tasks maintenance --apply` 以協調任務記錄，或執行 `openclaw doctor --fix` 以清除已標記為墓碑的會話上的過時中止恢復標誌。

<Note>
  如果子代理生成失敗並出現 Gateway `PAIRING_REQUIRED` / `scope-upgrade`，請在編輯配對狀態前檢查 RPC 呼叫端。 內部 `sessions_spawn` 協調應透過直接 loopback shared-token/password auth 以 `client.id: "gateway-client"` 身分並使用 `client.mode: "backend"` 進行連接； 該路徑不依賴 CLI 的已配對裝置範圍基準。遠端呼叫端、明確的 `deviceIdentity`、明確的 device-token 路徑以及瀏覽器/node 用戶端
  仍然需要正常的裝置核准才能進行範圍升級。
</Note>

## 停止

- 在請求者聊天中發送 `/stop` 會中止請求者工作階段，並停止由其產生的任何作用中子代理執行，且會級聯至巢狀子項。
- `/subagents kill <id>` 會停止特定的子代理，並級聯至其子項。

## 限制

- 子代理公告屬於**盡力而為 (best-effort)**。如果閘道重新啟動，擱置中的「公告回報」工作將會遺失。
- 子代理仍然共用相同的閘道程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 始終為非阻塞：它會立即傳回 `{ status: "accepted", runId, childSessionKey }`。
- 子代理內容僅注入 `AGENTS.md`、`TOOLS.md`、`SOUL.md`、`IDENTITY.md` 和 `USER.md`（無 `MEMORY.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。對於大多數使用案例，建議使用深度 2。
- `maxChildrenPerAgent` 限制了每個工作階段的作用中子項數量（預設 `5`，範圍 `1–20`）。

## 相關

- [ACP agents](/zh-Hant/tools/acp-agents)
- [Agent send](/zh-Hant/tools/agent-send)
- [Background tasks](/zh-Hant/automation/tasks)
- [Multi-agent sandbox tools](/zh-Hant/tools/multi-agent-sandbox-tools)
