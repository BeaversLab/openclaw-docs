---
summary: "產生獨立的背景代理執行，並將結果宣佈回請求者的聊天"
read_when:
  - You want background or parallel work via the agent
  - You are changing sessions_spawn or sub-agent tool policy
  - You are implementing or troubleshooting thread-bound subagent sessions
title: "子代理"
sidebarTitle: "子代理"
---

子代理是從現有代理運行衍生出的背景代理運行。
它們在自己的會話 (`agent:<agentId>:subagent:<uuid>`) 中運行，並在完成時將結果**通知**（announce）
回請求者的聊天頻道。每個子代理運行都作為
[背景任務](/zh-Hant/automation/tasks) 進行追蹤。

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

這些指令適用於支援持續執行緒綁定的頻道。
請參閱下方的[支援執行緒的頻道](#thread-supporting-channels)。

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
  <Accordion title="模式和 ACP 運行時">
    - `--model` 和 `--thinking` 會覆寫該特定運行的預設值。
    - 使用 `info`/`log` 在完成後檢查詳細資訊和輸出。
    - 對於持久化的執行緒綁定會話，請搭配 `thread: true` 和 `mode: "session"` 使用 `sessions_spawn`。
    - 如果請求者頻道不支援執行緒綁定，請使用 `mode: "run"`，而不是重試不可能的執行緒綁定組合。
    - 對於 ACP 駝具會話（Claude Code、Gemini CLI、OpenCode 或明確的 Codex ACP/acpx），當工具宣佈支援該執行時，請搭配 `runtime: "acp"` 使用 `sessions_spawn`。在調試完成或代理到代理迴圈時，請參閱 [ACP 傳遞模型](/zh-Hant/tools/acp-agents#delivery-model)。當啟用 `codex` 外掛程式時，除非使用者明確要求 ACP/acpx，否則 Codex 聊天/執行緒控制應優先使用 `/codex ...` 而非 ACP。
    - OpenClaw 會隱藏 `runtime: "acp"`，直到啟用 ACP、請求者未處於沙箱模式，並且載入了後端外掛程式（例如 `acpx`）為止。`runtime: "acp"` 預期外部 ACP 駝具 ID，或是帶有 `runtime.type="acp"` 的 `agents.list[]` 條目；對於來自 `agents_list` 的標準 OpenClaw 配置代理，請使用預設的子代理運行時。

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

### 委派提示模式

`agents.defaults.subagents.delegationMode` 僅控制提示詞指導；它不會改變工具政策或強制執行委派。

- `suggest` (預設值)：保留標準提示詞提示，針對較大或較慢的工作使用子代理程式。
- `prefer`：指示主要代理程式保持回應能力，並透過 `sessions_spawn` 將比直接回覆更複雜的工作進行委派。

每個代理程式的覆寫使用 `agents.list[].subagents.delegationMode`。

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
  子代理的工作描述。
</ParamField>
<ParamField path="taskName" type="string">
  可選的穩定標識，用於在後續狀態輸出中識別特定子項。必須符合 `[a-z][a-z0-9_-]{0,63}` 且不能是保留目標，例如 `last` 或 `all`。
</ParamField>
<ParamField path="label" type="string">
  可選的人類可讀標籤。
</ParamField>
<ParamField path="agentId" type="string">
  當 `subagents.allowAgents` 允許時，在另一個已配置的代理 ID 下生成。
</ParamField>
<ParamField path="cwd" type="string">
  子執行的可選工作目錄。原生子代理仍從目標代理工作區加載引導文件；`cwd` 僅更改執行時工具和 CLI 進行委派工作的位置。
</ParamField>
<ParamField path="runtime" type='"subagent" | "acp"' default="subagent">
  `acp` 僅適用於外部 ACP 進程（`claude`、`droid`、`gemini`、`opencode` 或明確請求的 Codex ACP/acpx）以及 `runtime.type` 為 `acp` 的 `agents.list[]` 條目。
</ParamField>
<ParamField path="resumeSessionId" type="string">
  僅限 ACP。當 `runtime: "acp"` 時恢復現有的 ACP 進程會話；對於原生子代理生成則忽略。
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  僅限 ACP。當 `runtime: "acp"` 時將 ACP 執行輸出流式傳輸到父會話；對於原生子代理生成則省略。
</ParamField>
<ParamField path="model" type="string">
  覆蓋子代理模型。無效值將被跳過，子代理將在預設模型上執行，並在工具結果中顯示警告。
</ParamField>
<ParamField path="thinking" type="string">
  覆蓋子代理執行的思維層級。
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  設定後預設為 `agents.defaults.subagents.runTimeoutSeconds`，否則為 `0`。設定後，子代理執行將在 N 秒後中止。
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  當 `true` 時，請求此子代理會話的通道執行緒綁定。
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  如果省略 `thread: true` 和 `mode`，預設值變為 `session`。`mode: "session"` 需要 `thread: true`。
  如果請求通道無法使用執行緒綁定，請改用 `mode: "run"`。
</ParamField>
<ParamField path="cleanup" type='"delete" | "keep"' default="keep">
  `"delete"` 在宣告後立即歸檔（仍透過重新命名保留逐字稿）。
</ParamField>
<ParamField path="sandbox" type='"inherit" | "require"' default="inherit">
  `require` 拒絕生成，除非目標子執行時已沙箱化。
</ParamField>
<ParamField path="context" type='"isolated" | "fork"' default="isolated">
  `fork` 將請求者的當前逐字稿分支到子會話中。僅限原生子代理。執行緒綁定的生成預設為 `fork`；非執行緒生成預設為 `isolated`。
</ParamField>

<Warning>`sessions_spawn` **不** 接受通道傳遞參數（`target`、 `channel`、`to`、`threadId`、`replyTo`、`transport`）。原生子代理會將 其最新的助理回合回報給請求者；外部傳遞則保留給 父代理/請求者代理。</Warning>

### 任務名稱與目標

`taskName` 是一個面向模型的編排控制代碼（handle），而非會話金鑰。
當協調器稍後可能需要檢查該子項時，請將其用於穩定的子項名稱，例如 `review_subagents`、
`linux_validation` 或 `docs_update`。

目標解析接受精確的 `taskName` 匹配和明確的
前綴。匹配範圍限定於與編號 `/subagents` 目標使用的相同作用中/近期目標視窗，
因此陳舊的已完成的子項不會導致重複使用的控制代碼產生歧義。如果兩個作用中或近期的子項共享相同的
`taskName`，則該目標具有歧義；請改用清單索引、會話金鑰或
執行 ID。

保留目標 `last` 和 `all` 不是有效的 `taskName` 值，
因為它們已具有控制含義。

## 工具：`sessions_yield`

結束當前模型回合並等待運行時事件（主要是
子代理完成事件）作為下一則訊息到達。在產生
所需的子項工作後使用此工具，當請求者在這些完成到達之前
無法產生最終答案時。

`sessions_yield` 是等待原語。請勿將其替換為針對 `subagents`、`sessions_list`、`sessions_history`、Shell
`sleep` 或程序輪詢的輪詢迴圈，僅為了偵測子項完成狀態。

僅當會話的有效工具清單包含 `sessions_yield` 時才使用它。某些精簡或自訂工具設定檔可能會公開 `sessions_spawn` 和
`subagents` 而不公開 `sessions_yield`；在這種情況下，請勿僅為了等待完成而
發明輪詢迴圈。

當存在活躍的子程序時，OpenClaw 會將一個緊湊的執行時產生的 `Active Subagents` 提示區塊注入到正常輪次中，以便請求者無需輪詢即可查看當前的子程序會話、執行 ID、狀態、標籤、任務和 `taskName` 別名。該區塊中的任務和標籤欄位被引用為數據，而非指令，因為它們可能源自使用者/模型提供的生成參數。

## 工具： `subagents`

列出由請求者會話擁有的已生成子代理執行。其範圍限於當前請求者；子項只能看到其自己受控的子項。

使用 `subagents` 進行按需狀態檢查和除錯。使用 `sessions_yield` 等待完成事件。

## 執行緒綁定會話

當為頻道啟用執行緒綁定時，子代理可以保持綁定到執行緒，以便該執行緒中的後續使用者訊息繼續路由到
同一個子代理會話。

### 支援執行緒的頻道

**Discord** 目前是唯一支援的頻道。它支援持久線程繫結的子代理會話（帶有 `thread: true` 的 `sessions_spawn`）、手動線程控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）以及配接器金鑰 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSessions`。

### 快速流程

<Steps>
  <Step title="產生">使用 `thread: true` 進行 `sessions_spawn`（可選搭配 `mode: "session"`）。</Step>
  <Step title="繫結">OpenClaw 會在現用頻道中建立或繫結一個線程至該會話目標。</Step>
  <Step title="路由後續訊息">該線程中的回覆和後續訊息會路由至已繫結的會話。</Step>
  <Step title="檢查逾時">使用 `/session idle` 檢查/更新非活動自動失去焦點，並使用 `/session max-age` 控制硬性上限。</Step>
  <Step title="分離">使用 `/unfocus` 手動分離。</Step>
</Steps>

### 手動控制

| 指令               | 效果                                                    |
| ------------------ | ------------------------------------------------------- |
| `/focus <target>`  | 將當前執行緒（或建立一個）綁定到子代理程式/工作階段目標 |
| `/unfocus`         | 移除當前綁定執行緒的綁定                                |
| `/agents`          | 列出活躍執行和綁定狀態（`thread:<id>` 或 `unbound`）    |
| `/session idle`    | 檢查/更新閒置自動取消聚焦（僅限已聚焦的綁定執行緒）     |
| `/session max-age` | 檢查/更新硬性上限（僅限已聚焦的綁定執行緒）             |

### 設定開關

- **全域預設值：** `session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
- **頻道覆寫和產生自動綁定金鑰** 取決於配接器。請參閱上方的[支援執行緒的頻道](#thread-supporting-channels)。

有關目前配接器的詳細資訊，請參閱[組態參考](/zh-Hant/gateway/configuration-reference)和[斜線指令](/zh-Hant/tools/slash-commands)。

### 允許清單

<ParamField path="agents.list[].subagents.allowAgents" type="string[]">
  可透過明確 `agentId` 鎖定的已設定代理程式 ID 清單（`["*"]` 允許任何已設定的目標）。預設值：僅請求者代理程式。如果您設定了清單，但仍希望請求者使用 `agentId` 產生自身，請將請求者 ID 包含在清單中。
</ParamField>
<ParamField path="agents.defaults.subagents.allowAgents" type="string[]">
  當請求者代理程式未設定其自己的 `subagents.allowAgents` 時，使用的預設已設定目標代理程式允許清單。
</ParamField>
<ParamField path="agents.defaults.subagents.requireAgentId" type="boolean" default="false">
  封鎖省略 `agentId` 的 `sessions_spawn` 呼叫（強制明確設定檔選擇）。每個代理程式的覆寫：`agents.list[].subagents.requireAgentId`。
</ParamField>
<ParamField path="agents.defaults.subagents.announceTimeoutMs" type="number" default="120000">
  閘道 `agent` 公告傳遞嘗試的每次呼叫逾時。值為正整數毫秒，並會被限制為平台安全的計時器最大值。暫時性重試可能會使總公告等待時間長於一個設定的逾時時間。
</ParamField>

如果請求者工作階段已沙盒化，`sessions_spawn` 將拒絕會以非沙盒方式執行的目標。

### 探索

使用 `agents_list` 查看目前允許用於 `sessions_spawn` 的代理 ID。回應包含每個列出代理的有效模型和內嵌執行時期元數據，以便呼叫者區分 OpenClaw、Codex app-server 和其他設定的原生執行時期。

`allowAgents` 項目必須指向 `agents.list[]` 中設定的代理 ID。`["*"]` 表示任何設定的目標代理加上請求者。如果刪除了代理設定但其 ID 仍保留在 `allowAgents` 中，`sessions_spawn` 將拒絕該 ID 且 `agents_list` 會省略它。執行 `openclaw doctor --fix` 以清理過時的允許清單項目，或者當目標應在繼承預設值的同時保持可生成時，新增一個最少的 `agents.list[]` 項目。

### 自動封存

- 子代理會話會在 `agents.defaults.subagents.archiveAfterMinutes` 後自動封存（預設為 `60`）。
- 封存使用 `sessions.delete` 並將對話紀錄重新命名為 `*.deleted.<timestamp>`（相同資料夾）。
- `cleanup: "delete"` 會在宣佈後立即封存（仍透過重新命名保留對話紀錄）。
- 自動封存屬於盡力而為；如果閘道重新啟動，待處理的計時器將會遺失。
- `runTimeoutSeconds` **不會**自動封存；它只會停止執行。該會話會保留直到自動封存。
- 自動歸檔同樣適用於深度 1 和深度 2 的對話。
- 瀏覽器清理與歸檔清理是分開的：被追蹤的瀏覽器分頁/程序會在運行結束時盡力關閉，即使對話記錄/會話記錄被保留。

## 巢狀子代理

根據預設，子代理無法生成自己的子代理（`maxSpawnDepth: 1`）。設定 `maxSpawnDepth: 2` 以啟用一層巢狀結構——**編排器模式**：主程式 → 編排器子代理 → 工作者子子代理。

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

| 深度 | 會話金鑰形狀                                 | 角色                             | 能否生成？                  |
| ---- | -------------------------------------------- | -------------------------------- | --------------------------- |
| 0    | `agent:<id>:main`                            | 主要代理                         | 始終                        |
| 1    | `agent:<id>:subagent:<uuid>`                 | 子代理 (當允許深度 2 時為協調器) | 僅限於 `maxSpawnDepth >= 2` |
| 2    | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子子代理 (葉節點工作器)          | 從不                        |

### 宣告鏈

結果沿著鏈條向上回傳：

1. 深度 2 工作器完成 → 向其父級 (深度 1 協調器) 宣告。
2. 深度 1 協調器接收宣告，綜合結果，完成 → 向主要代理宣告。
3. 主要代理接收宣告並傳送給使用者。

每個層級只能看到其直接子級的宣告。

<Note>
  **操作指導：** 啟動子工作一次並等待完成事件，而不是圍繞 `sessions_list`、 `sessions_history`、`/subagents list` 或 `exec` sleep 指令建置輪詢迴圈。 `sessions_list` 和 `/subagents list` 保持子會話關係 專注於即時工作 — 即時子項保持附加，已結束的子項在短暫的最近視窗中保持可見，而過時的僅儲存子項連結會在其新鮮度視窗後被忽略。這可以防止舊的 `spawnedBy` / `parentSessionKey`
  元數據在重啟後復活幽灵子項。如果子項完成事件在您已發送最終答案之後到達，正確的後續處理是確切的無聲令牌 `NO_REPLY` / `no_reply`。
</Note>

### 按深度的工具政策

- 角色和控制範圍在生成時會寫入會話元資料中。這可以防止扁平化或還原的會話金鑰意外重新獲得協調器權限。
- **深度 1 (協調器，當 `maxSpawnDepth >= 2` 時)：** 獲得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以生成子項並檢查其狀態。其他會話/系統工具仍然被拒絕。
- **深度 1 (葉節點，當 `maxSpawnDepth == 1` 時)：** 無會話工具 (目前的預設行為)。
- **深度 2 (葉節點工作程式)：** 無會話工具 — `sessions_spawn` 在深度 2 時總是被拒絕。無法生成進一步的子項。

### 個別代理程式生成限制

每個代理會話 (在任何深度) 一次最多可以有 `maxChildrenPerAgent`
(預設 `5`) 個活躍子項。這可以防止單一協調器出現失控的扇出。

### 級聯停止

停止深度 1 的協調器會自動停止其所有深度 2
的子代：

- 主聊天中的 `/stop` 會停止所有深度 1 的代理，並級聯到其深度 2 的子項。

## 身份驗證

子代理的身份驗證由 **代理 id** 解析，而不是由會議類型：

- 子代理會話金鑰是 `agent:<agentId>:subagent:<uuid>`。
- 授權儲存是從該代理的 `agentDir` 載入的。
- 主代理的身份驗證配置檔案作為 **備援** 合併進來；代理配置檔案會在衝突時覆蓋主配置檔案。

合併是相加的，因此主配置檔案始終可作為備援使用。尚不支援每個代理的完全隔離身份驗證。

## 公告

Sub-agents 透過公告步驟回報：

- 公告步驟在 sub-agent 會話內執行（而非請求者會話）。
- 如果子代理確切回覆 `ANNOUNCE_SKIP`，則不會發布任何內容。
- 如果最新的助手文字是確切的無聲令牌 `NO_REPLY` / `no_reply`，即使之前存在可見的進度，也會隱藏公告輸出。

傳遞取決於請求者深度：

- 頂層請求者會話使用帶有外部交付 (`deliver=true`) 的後續 `agent` 呼叫。
- 巢狀請求者子代理會話接收內部後續注入 (`deliver=false`)，以便協調器可以在會話內綜合子結果。
- 如果巢狀請求者 subagent 會話已消失，OpenClaw 會在可用時回退至該會話的請求者。

對於頂層請求者會話，完成模式直接傳遞會先解析任何綁定的對話/執行緒路由與掛接覆寫，然後從請求者會話的已儲存路由填入遺漏的通道目標欄位。這樣即使完成來源僅識別通道，也能將完成內容保留在正確的聊天/主題上。

在建立巢狀完成發現時，子項完成聚合會限定於目前的請求者執行，防止過時的前次執行子項輸出洩漏至目前的公告中。公告回覆在通道配接器可用時會保留執行緒/主題路由。

### 公告內容

公告內容會正規化為穩定的內部事件區塊：

| 欄位     | 來源                                                                                    |
| -------- | --------------------------------------------------------------------------------------- |
| 來源     | `subagent` 或 `cron`                                                                    |
| 會話 ID  | 子會話金鑰/ID                                                                           |
| 類型     | 公告類型 + 任務標籤                                                                     |
| 狀態     | 源自執行時期結果 (`success`、`error`、`timeout` 或 `unknown`) — **而非** 從模型文字推斷 |
| 結果內容 | 來自子項的最新可見助手文字                                                              |
| 後續     | 描述何時回覆或保持靜默的指示                                                            |

終結性失敗的執行會回報失敗狀態，而不重播擷取的回覆文字。Tool/toolResult 輸出不會提升至子項結果文字。

### 統計列

公告內容在最後包含一條統計資訊行（即使被換行）：

- 執行時期 (例如 `runtime 5m12s`)。
- Token 使用量（輸入/輸出/總計）。
- 設定模型定價時的預估成本 (`models.providers.*.models[].cost`)。
- `sessionKey`、`sessionId` 和文字紀錄路徑，以便主要代理可以透過 `sessions_history` 取得歷史紀錄，或在磁碟上檢查檔案。

內部元資料僅用於編排；面向使用者的回覆應以正常的助手語氣重新撰寫。

### 為何偏好 `sessions_history`

`sessions_history` 是較安全的協調路徑：

- 助手回憶會先進行正規化處理：移除思考標籤；移除 `<relevant-memories>` / `<relevant_memories>` 鷹架；移除純文字工具呼叫 XML 載荷區塊 (`<tool_call>`、`<function_call>`、`<tool_calls>`、`<function_calls>`)，包括未乾淨結尾的被截斷載荷；移除降級的工具呼叫/結果鷹架和歷史紀錄內容標記；移除外洩的模型控制權杖 (`<|assistant|>`、其他 ASCII `<|...|>`、全形 `<｜...｜>`)；移除格式錯誤的 MiniMax 工具呼叫 XML。
- 類似憑證/token 的文字會被編輯。
- 長區塊可能會被截斷。
- 非常大的歷史紀錄可能會捨棄較舊的列，或用 `[sessions_history omitted: message too large]` 取代過大的列。
- 當您需要完整的逐位元組文字記錄時，檢查磁碟上的原始文字記錄是備用方案。

## 工具政策

子代理首先使用與父代理或目標代理相同的設定檔和工具政策管道。之後，OpenClaw 會套用子代理限制層。

在沒有限制性 `tools.profile` 的情況下，子代理會獲得**訊息工具、會話工具和系統工具以外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`
- `message`

`sessions_history` 在這裡仍然是一個有界的、經過清理的回溯視圖——
它並非原始文字記錄的傾印。

當 `maxSpawnDepth >= 2` 時，深度 1 的協調子代理還會額外接收
`sessions_spawn`、`subagents`、`sessions_list` 和
`sessions_history`，以便它們管理其子代理。

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
已解析的工具集，但無法將被 `tools.profile` 移除的工具
**重新加回**。例如，`tools.profile: "coding"` 包含
`web_search`/`web_fetch` 但不包含 `browser` 工具。若要讓
coding-profile 子代理使用瀏覽器自動化，請在 profile 階段新增瀏覽器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

當只有一個代理應該獲得瀏覽器自動化時，請使用針對每個代理的
`agents.list[].tools.alsoAllow: ["browser"]`。

## 並行

子代理使用專用的進程內佇列通道：

- **通道名稱：** `subagent`
- **並行性：** `agents.defaults.subagents.maxConcurrent`（預設 `8`）

## 存活與恢復

OpenClaw 不會將 `endedAt` 的缺失視為子代理仍然存活的永久證明。
過期執行視窗內未結束的舊執行，在 `/subagents list`、狀態摘要、
後代完成閘門和每個會話並行檢查中將停止計算為作用中/待處理。

在閘道重新啟動後，除非子會話被標記為 `abortedLastRun: true`，否則\過期且未結束的已還原執行將被修剪。那些因重新啟動而中止的子會話仍可透過
子代理孤兒復原流程進行復原，該流程會在清除中止標記之前發送合成恢復訊息。

自動重新啟動復原對每個子會話都有上限。如果同一個
子代理子在快速重新嵌入視窗內反覆被接受進行孤兒復原，OpenClaw 將
在該會話上保存一個復原墓碑，並在之後的重新啟動時停止自動恢復它。
執行 `openclaw tasks maintenance --apply` 以協調任務記錄，或
執行 `openclaw doctor --fix` 以清除
具有墓標會話上陳舊的中止復原標記。

<Note>
  如果子代理生成因 Gateway `PAIRING_REQUIRED` / `scope-upgrade` 而失敗，請在編輯配對狀態前檢查 RPC 呼叫端。 內部 `sessions_spawn` 協調應透過直接 loopback 共用 token/密碼驗證以 `client.id: "gateway-client"` 身份連線至 `client.mode: "backend"`；該路徑不依賴 CLI 的配對裝置範圍基準。遠端呼叫端、明確的 `deviceIdentity`、明確的裝置 token 路徑，以及瀏覽器/node 客戶端
  仍然需要正常的裝置核准才能進行範圍升級。
</Note>

## 停止

- 在請求者聊天中發送 `/stop` 會中止請求者階段，並停止由其產生的任何作用中子代理執行，並串聯至巢狀子項。

## 限制

- 子代理公告採用 **盡力而為 (best-effort)** 機制。如果 Gateway 重新啟動，待處理的「公告回報」工作將會遺失。
- 子代理仍然共用相同的 gateway 程序資源；請將 `maxConcurrent` 視為安全閥。
- `sessions_spawn` 始終為非阻塞：它會立即回傳 `{ status: "accepted", runId, childSessionKey }`。
- 子代理內容僅會注入 `AGENTS.md` 和 `TOOLS.md`（不包含 `SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。Codex 原生子代理遵循相同的邊界：`TOOLS.md` 保留在繼承的 Codex 執行緒指令中，而僅限父項的 persona、身分識別和使用者檔案則會被注入為輪次範圍的協作指令，因此子項不會複製這些內容。
- 最大巢狀深度為 5（`maxSpawnDepth` 範圍：1–5）。對於大多數使用案例，建議深度為 2。
- `maxChildrenPerAgent` 限制了每個階段的作用中子項數量（預設 `5`，範圍 `1–20`）。

## 相關

- [ACP agents](/zh-Hant/tools/acp-agents)
- [Agent send](/zh-Hant/tools/agent-send)
- [Background tasks](/zh-Hant/automation/tasks)
- [Multi-agent sandbox tools](/zh-Hant/tools/multi-agent-sandbox-tools)
