---
summary: "Heartbeat 輪詢訊息與通知規則"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
sidebarTitle: "Heartbeat"
---

<Note>**Heartbeat 與 cron？** 請參閱 [Automation](/zh-Hant/automation) 以了解使用時機的指引。</Note>

Heartbeat 會在主對話階段中執行**週期性代理輪次**，以便模型能突顯需要注意的事項，而不會對您造成垃圾訊息干擾。

Heartbeat 是一個預定的主會話回合 — 它**不會**建立 [background task](/zh-Hant/automation/tasks) 記錄。任務記錄是用於分離的工作（ACP 執行、子代理、獨立的 cron 工作）。

疑難排解：[Scheduled Tasks](/zh-Hant/automation/cron-jobs#troubleshooting)

## 快速入門（初學者）

<Steps>
  <Step title="選擇頻率">
    保持啟用 heartbeat（預設為 `30m`，若為 Anthropic OAuth/token 驗證模式，包括 Claude CLI 重用，則為 `1h`）或設定您自己的頻率。
  </Step>
  <Step title="新增 HEARTBEAT.md（選用）">
    在代理工作區中建立一個小型的 `HEARTBEAT.md` 檢查清單或 `tasks:` 區塊。
  </Step>
  <Step title="決定 heartbeat 訊息應該送往何處">
    `target: "none"` 是預設值；設定 `target: "last"` 以路由至最後一個聯絡人。
  </Step>
  <Step title="選用性調整">
    - 啟用 heartbeat 推理傳遞以增加透明度。
    - 如果 heartbeat 執行僅需 `HEARTBEAT.md`，請使用輕量級啟動上下文。
    - 啟用獨立會話以避免每次 heartbeat 都傳送完整的對話記錄。
    - 將 heartbeat 限制在活動時間內（當地時間）。

  </Step>
</Steps>

範例配置：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
        directPolicy: "allow", // default: allow direct/DM targets; set "block" to suppress
        lightContext: true, // optional: only inject HEARTBEAT.md from bootstrap files
        isolatedSession: true, // optional: fresh session each run (no conversation history)
        skipWhenBusy: true, // optional: also defer when this agent's subagent or nested lanes are busy
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Reasoning:` message too
      },
    },
  },
}
```

## 預設值

- 間隔：`30m`（若偵測到的驗證模式為 Anthropic OAuth/token 驗證，包括 Claude CLI 重用，則為 `1h`）。設定 `agents.defaults.heartbeat.every` 或每個代理的 `agents.list[].heartbeat.every`；使用 `0m` 來停用。
- 提示詞主體（可透過 `agents.defaults.heartbeat.prompt` 設定）：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 心跳提示詞會作為用戶訊息**逐字**發送。系統提示詞僅在為預設代理啟用心跳時才包含「Heartbeat」部分，且該運行會在內部被標記。
- 當使用 `0m` 停用 heartbeat 時，正常執行也會從啟動上下文中省略 `HEARTBEAT.md`，這樣模型就不會看到僅限 heartbeat 的指示。
- 活動時間 (`heartbeat.activeHours`) 會根據設定的時區進行檢查。在時間視窗之外，心跳會被跳過，直到視窗內的下一次刻度。
- 當 cron 工作正在運作或排入佇列時，Heartbeats 會自動延遲。設定 `heartbeat.skipWhenBusy: true` 也可讓代理程式在其自己的 session-keyed 子代理程式或巢狀指令通道上延遲；同層級的代理程式不會僅因為另一個代理程式有正在進行的子代理程式工作而暫停。

## 心跳提示的用途

預設提示是故意設計得非常廣泛的：

- **背景任務**：「考慮未完成的任務」會提示代理檢查後續事項（收件匣、行事曆、提醒、佇列工作），並提出任何緊急事項。
- **人類確認**：「有時在日間檢查你的人類」會偶爾觸發輕量級的「有什麼需要嗎？」訊息，但透過使用您設定的本地時區來避免夜間騷擾（請參閱 [時區](/zh-Hant/concepts/timezone)）。

心跳可以對已完成的 [背景任務](/zh-Hant/automation/tasks) 做出反應，但心跳執行本身並不會建立任務記錄。

如果您希望心跳執行非常具體的操作（例如「檢查 Gmail PubSub 統計資料」或「驗證閘道健康狀態」），請將 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）設為自訂主體（將逐字發送）。

## 回應合約

- 如果沒有需要注意的事項，請回覆 **`HEARTBEAT_OK`**。
- 具備工具能力的心跳執行可以改為呼叫 `heartbeat_respond` 並搭配 `notify: false` 以表示沒有可見的更新，或是呼叫 `notify: true` 加上 `notificationText` 以發出警示。當存在結構化工具回應時，其優先順序高於文字後備方案。
- 在心跳執行期間，當 `HEARTBEAT_OK` 出現在回覆的**開頭或結尾**時，OpenClaw 會將其視為確認信號。該 token 會被移除，如果剩餘內容**≤ `ackMaxChars`**（預設值：300），則該回覆將被丟棄。
- 如果 `HEARTBEAT_OK` 出現在回覆的**中間**，則不會受到特殊處理。
- 對於警示，**請勿**包含 `HEARTBEAT_OK`；僅回傳警示文字。

在心跳之外，訊息開頭/結尾的零散 `HEARTBEAT_OK` 會被移除並記錄；如果訊息僅包含 `HEARTBEAT_OK`，則該訊息會被丟棄。

## Config

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // default: 30m (0m disables)
        model: "anthropic/claude-opus-4-6",
        includeReasoning: false, // default: false (deliver separate Reasoning: message when available)
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        skipWhenBusy: false, // default: false; true also waits for this agent's subagent/nested lanes
        target: "last", // default: none | options: last | none | <channel id> (core or plugin, e.g. "imessage")
        to: "+15551234567", // optional channel-specific override
        accountId: "ops-bot", // optional multi-account channel id
        prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        ackMaxChars: 300, // max chars allowed after HEARTBEAT_OK
      },
    },
  },
}
```

### Scope and precedence

- `agents.defaults.heartbeat` 設定全域心跳行為。
- `agents.list[].heartbeat` 會在頂部合併；如果有任何代理擁有 `heartbeat` 區塊，**僅這些代理** 會執行心跳。
- `channels.defaults.heartbeat` 為所有頻道設定可見性預設值。
- `channels.<channel>.heartbeat` 會覆寫頻道預設值。
- `channels.<channel>.accounts.<id>.heartbeat`（多帳號頻道）會覆寫個別頻道設定。

### Per-agent heartbeats

如果有任何 `agents.list[]` 項目包含 `heartbeat` 區塊，**僅這些代理** 會執行心跳。個別代理區塊會在 `agents.defaults.heartbeat` 之上合併（因此您可以設定一次共用的預設值，並針對各個代理進行覆寫）。

範例：兩個代理，僅第二個代理執行心跳。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
      },
    },
    list: [
      { id: "main", default: true },
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "whatsapp",
          to: "+15551234567",
          timeoutSeconds: 45,
          prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        },
      },
    ],
  },
}
```

### Active hours example

將心跳限制在特定時區的營業時間內：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
        activeHours: {
          start: "09:00",
          end: "22:00",
          timezone: "America/New_York", // optional; uses your userTimezone if set, otherwise host tz
        },
      },
    },
  },
}
```

在此時間範圍之外（美國東部時間上午 9 點之前或晚上 10 點之後），心跳將會跳過。在此範圍內的下一個排程執行時間將會正常執行。

### 24/7 setup

如果您希望心跳全天候執行，請使用下列其中一種模式：

- 完全省略 `activeHours`（無時間視窗限制；這是預設行為）。
- 設定全天的時間視窗：`activeHours: { start: "00:00", end: "24:00" }`。

<Warning>請勿將 `start` 和 `end` 設定為相同的時間（例如從 `08:00` 到 `08:00`）。這會被視為零寬度視窗，因此心跳將永遠被跳過。</Warning>

### Multi-account example

使用 `accountId` 指定 Telegram 等多帳號頻道上的特定帳號：

```json5
{
  agents: {
    list: [
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "telegram",
          to: "12345678:topic:42", // optional: route to a specific topic/thread
          accountId: "ops-bot",
        },
      },
    ],
  },
  channels: {
    telegram: {
      accounts: {
        "ops-bot": { botToken: "YOUR_TELEGRAM_BOT_TOKEN" },
      },
    },
  },
}
```

### Field notes

<ParamField path="every" type="string">
  Heartbeat 間隔（持續時間字串；預設單位 = 分鐘）。
</ParamField>
<ParamField path="model" type="string">
  Heartbeat 執行的可選模型覆寫 (`provider/model`)。
</ParamField>
<ParamField path="includeReasoning" type="boolean" default="false">
  啟用時，當有可用的獨立 `Reasoning:` 訊息時一併傳送（形狀與 `/reasoning on` 相同）。
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  為 true 時，heartbeat 執行會使用輕量級啟動上下文，並僅保留來自工作區啟動檔案的 `HEARTBEAT.md`。
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  為 true 時，每次 heartbeat 都在沒有先前對話歷史的新工作階段中執行。使用與 cron `sessionTarget: "isolated"` 相同的隔離模式。大幅降低每次 heartbeat 的 token 成本。與 `lightContext: true` 結合以達到最大節省效果。傳送路由仍使用主工作階段上下文。
</ParamField>
<ParamField path="skipWhenBusy" type="boolean" default="false">
  為 true 時，heartbeat 執行會在該代理程式的額外忙碌通道上延遲：其自己的 session-keyed 子代理程式或巢狀指令工作。Cron 通道總是會延遲 heartbeat，即使沒有此旗標也一樣，因此本機模型主機不會同時執行 cron 和 heartbeat 提示。
</ParamField>
<ParamField path="session" type="string">
  Heartbeat 執行的可選工作階段金鑰。

- `main` (預設)：代理主會話。
- 明確的會話金鑰（從 `openclaw sessions --json` 複製或透過 [sessions CLI](/zh-Hant/cli/sessions) 複製）。
- 會話金鑰格式：請參閱 [Sessions](/zh-Hant/concepts/session) 和 [Groups](/zh-Hant/channels/groups)。

</ParamField>
<ParamField path="target" type="string">
- `last`：傳送至最後使用的外部頻道。
- 明確指定頻道：任何已設定的頻道或外掛 ID，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
- `none` (預設)：執行心跳但**不進行外部傳送**。

</ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
  控制直接訊息/DM 的傳送行為。`allow`：允許直接訊息/DM 的心跳傳送。`block`：抑制直接訊息/DM 的傳送 (`reason=dm-blocked`)。

</ParamField>
<ParamField path="to" type="string">
  選用的收件者覆寫 (特定頻道 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID)。對於 Telegram 主題/串列，請使用 `<chatId>:topic:<messageThreadId>`。

</ParamField>
<ParamField path="accountId" type="string">
  多帳號頻道的選用帳號 ID。當為 `target: "last"` 時，若解析出的最後一個頻道支援帳號，則帳號 ID 套用至該頻道；否則將予以忽略。如果帳號 ID 與解析出的頻道之已設定帳號不符，將跳過傳送。

</ParamField>
<ParamField path="prompt" type="string">
  覆寫預設的提示詞主體 (不會合併)。

</ParamField>
<ParamField path="ackMaxChars" type="number" default="300">
  在 `HEARTBEAT_OK` 之後、傳送之前允許的最大字元數。

</ParamField>
<ParamField path="suppressToolErrorWarnings" type="boolean">
  為 true 時，在心跳執行期間抑制工具錯誤警示的負載。

</ParamField>
<ParamField path="activeHours" type="object">
  將心跳執行限制在時間視窗內。包含 `start`（HH:MM，包含；使用 `00:00` 表示一天開始）、`end`（HH:MM 不包含；允許使用 `24:00` 表示一天結束）以及可選的 `timezone` 的物件。

- 省略或 `"user"`：如果設定了則使用您的 `agents.defaults.userTimezone`，否則回退到主機系統時區。
- `"local"`：始終使用主機系統時區。
- 任何 IANA 識別碼（例如 `America/New_York`）：直接使用；如果無效，則回退到上述 `"user"` 的行為。
- 對於有效的視窗，`start` 和 `end` 不得相等；相等的值會被視為零寬度（始終在視窗外）。
- 在有效視窗之外，會跳過心跳，直到視窗內的下一個刻度。

</ParamField>

## 遞送行為

<AccordionGroup>
  <Accordion title="Session and target routing">
    - 預設情況下，Heartbeat 會在代理的主工作階段中執行 (`agent:<id>:<mainKey>`)，或在當 `session.scope = "global"` 時設為 `global`。設定 `session` 可覆蓋為特定的頻道工作階段 (Discord/WhatsApp 等)。
    - `session` 僅影響執行語境；遞送由 `target` 和 `to` 控制。
    - 若要遞送至特定頻道/收件者，請設定 `target` + `to`。若使用 `target: "last"`，遞送會使用該工作階段的最後一個外部頻道。
    - Heartbeat 遞送預設允許直接/DM 目標。設定 `directPolicy: "block"` 可在仍執行 heartbeat 回合的同時，停止直接目標的遞送。
    - 如果主佇列、目標工作階段通道、cron 通道或正在執行的 cron 工作忙碌，則會跳過 heartbeat 並稍後重試。
    - 如果 `skipWhenBusy: true`，此代理的以工作階段為鍵值的子代理和巢狀通道也會延遲 heartbeat 執行。其他代理的忙碌通道不會延遲此代理。
    - 如果 `target` 解析後沒有外部目的地，執行仍會進行，但不會傳送任何外寄訊息。

  </Accordion>
  <Accordion title="Visibility and skip behavior">
    - If `showOk`, `showAlerts`, and `useIndicator` are all disabled, the run is skipped up front as `reason=alerts-disabled`.
    - If only alert delivery is disabled, OpenClaw can still run the heartbeat, update due-task timestamps, restore the session idle timestamp, and suppress the outward alert payload.
    - If the resolved heartbeat target supports typing, OpenClaw shows typing while the heartbeat run is active. This uses the same target the heartbeat would send chat output to, and it is disabled by `typingMode: "never"`.

  </Accordion>
  <Accordion title="Session lifecycle and audit">
    - 僅限 Heartbeat 的回應**不會**讓會話保持活躍。Heartbeat 元資料可能會更新會話記錄，但閒置到期使用的是來自最後一次真實使用者/頻道訊息的 `lastInteractionAt`，而每日到期使用的是 `sessionStartedAt`。
    - Control UI 和 WebChat 歷程記錄會隱藏 heartbeat 提示和僅有 OK 的確認。底層的會話逐字稿仍可包含這些輪次以供審計/重播。
    - 分離的 [background tasks](/zh-Hant/automation/tasks) 可以將系統事件加入佇列，並在主會話應快速注意某些事項時喚醒 heartbeat。該喚醒動作不會讓 heartbeat 執行背景任務。

  </Accordion>
</AccordionGroup>

## 可見性控制

根據預設，傳遞警示內容時會隱藏 `HEARTBEAT_OK` 確認。您可以針對每個頻道或每個帳戶調整此設定：

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false # Hide HEARTBEAT_OK (default)
      showAlerts: true # Show alert messages (default)
      useIndicator: true # Emit indicator events (default)
  telegram:
    heartbeat:
      showOk: true # Show OK acknowledgments on Telegram
  whatsapp:
    accounts:
      work:
        heartbeat:
          showAlerts: false # Suppress alert delivery for this account
```

優先順序：per-account → per-channel → channel defaults → built-in defaults。

### 每個旗標的作用

- `showOk`：當模型返回僅有 OK 的回覆時，發送 `HEARTBEAT_OK` 確認。
- `showAlerts`：當模型返回非 OK 的回覆時，發送警示內容。
- `useIndicator`：為 UI 狀態介面發出指示器事件。

如果這三個**全部**為 false，OpenClaw 將完全跳過此次執行 (不呼叫模型)。

### Per-channel 與 per-account 範例

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false
      showAlerts: true
      useIndicator: true
  slack:
    heartbeat:
      showOk: true # all Slack accounts
    accounts:
      ops:
        heartbeat:
          showAlerts: false # suppress alerts for the ops account only
  telegram:
    heartbeat:
      showOk: true
```

### 常見模式

| 目標                         | 設定                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| 預設行為 (靜默 OK，開啟警示) | _(無需設定)_                                                                             |
| 完全靜默 (無訊息，無指示器)  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 僅指示器 (無訊息)            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 僅在一個頻道顯示 OK          | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (選用)

如果工作區中存在 `HEARTBEAT.md` 檔案，預設提示會告訴代理程式閱讀它。您可以將其視為您的「heartbeat 檢查清單」：小巧、穩定，且每 30 分鐘包含一次是安全的。

在正常執行時，只有在為預設代理啟用了 heartbeat 指導時，才會注入 `HEARTBEAT.md`。使用 `0m` 停用 heartbeat 節奏，或設定 `includeSystemPromptSection: false`，會使其從正常的啟動上下文中省略。

如果 `HEARTBEAT.md` 存在但實際上為空（只有空行和像 `# Heading` 這樣的 markdown 標題），OpenClaw 會跳過 heartbeat 執行以節省 API 呼叫。該跳過會被回報為 `reason=empty-heartbeat-file`。如果檔案不存在，heartbeat 仍會執行，模型將決定要做什麼。

保持簡短（簡短的檢查清單或提醒），以避免提示膨脹。

`HEARTBEAT.md` 範例：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it's daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### `tasks:` 區塊

`HEARTBEAT.md` 也支援一個小型的結構化 `tasks:` 區塊，用於 heartbeat 內部的基於間隔的檢查。

範例：

```md
tasks:

- name: inbox-triage
  interval: 30m
  prompt: "Check for urgent unread emails and flag anything time sensitive."
- name: calendar-scan
  interval: 2h
  prompt: "Check for upcoming meetings that need prep or follow-up."

# Additional instructions

- Keep alerts short.
- If nothing needs attention after all due tasks, reply HEARTBEAT_OK.
```

<AccordionGroup>
  <Accordion title="行為">
    - OpenClaw 會解析 `tasks:` 區塊，並根據其自身的 `interval` 檢查每個任務。
    - 只有 **到期** 的任務會包含在該次週期的 heartbeat 提示中。
    - 如果沒有任務到期，將完全跳過 heartbeat (`reason=no-tasks-due`)，以避免浪費模型的呼叫。
    - `HEARTBEAT.md` 中的非任務內容會被保留，並作為額外上下文附加在到期任務清單之後。
    - 任務的最後執行時間戳記會儲存在會話狀態中 (`heartbeatTaskState`)，因此間隔設定在正常重啟後仍然有效。
    - 任務時間戳記僅在 heartbeat 執行完成其正常回覆路徑後才會前進。跳過的 `empty-heartbeat-file` / `no-tasks-due` 執行不會將任務標記為已完成。

  </Accordion>
</AccordionGroup>

當您希望一個 heartbeat 檔案包含多個定期檢查，而不想在每次週期時為所有檢查付費時，任務模式非常有用。

### 代理可以更新 HEARTBEAT.md 嗎？

可以 — 如果您要求它的話。

`HEARTBEAT.md` 只是代理工作區中的一個普通檔案，因此您可以在（正常聊天中）告訴代理類似這樣的內容：

- 「更新 `HEARTBEAT.md` 以新增每日日曆檢查。」
- 「重寫 `HEARTBEAT.md`，使其更簡短並專注於收件箱的後續追蹤。」

如果您希望這主動發生，您也可以在您的 heartbeat 提示詞中包含一個明確的行：「如果檢查清單變得過時，請用更好的版本更新 HEARTBEAT.md。」

<Warning>請勿將機密資訊（API 金鑰、電話號碼、私人權杖）放入 `HEARTBEAT.md` —— 它將成為提示詞上下文的一部分。</Warning>

## 手喚醒（按需）

您可以將系統事件加入佇列並使用以下方式觸發立即的心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果多個代理配置了 `heartbeat`，手喚醒會立即執行這些代理的每一個心跳。

使用 `--mode next-heartbeat` 以等待下一次排程的刻度。

## 推理傳遞（選用）

預設情況下，心跳僅傳遞最終的「答案」負載。

如果您想要透明度，請啟用：

- `agents.defaults.heartbeat.includeReasoning: true`

啟用後，心跳也會傳遞一條單獨的訊息，前綴為 `Reasoning:`（形狀與 `/reasoning on` 相同）。當代理正在管理多個會話/codex 時，這很有用，因為您可以看到它決定呼叫您的原因 —— 但這也可能洩漏比您想要的更多的內部細節。建議在群組聊天中將其關閉。

## 成本考量

心跳運行完整的代理回合。較短的間隔會消耗更多的 token。若要降低成本：

- 使用 `isolatedSession: true` 以避免發送完整的對話歷史記錄（每次執行從約 100K token 減少到約 2-5K）。
- 使用 `lightContext: true` 將引導檔案限制為僅 `HEARTBEAT.md`。
- 設定一個更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 簡短。
- 如果您只想要內部狀態更新，請使用 `target: "none"`。

## 心跳後的上下文溢出

如果心跳先前將一個現有的會話留在一個較小的本地模型上，例如具有 32k 視窗的 Ollama 模型，並且下一次主會話回合報告上下文溢出，請將會話運行時模型重置為已配置的主要模型。當最後的運行時模型與已配置的 `heartbeat.model` 相符時，OpenClaw 的重置訊息會指出這一點。

目前的 heartbeat 在執行完成後會保留共享會話現有的執行時期模型。您仍然可以使用 `isolatedSession: true` 在新的會話中執行 heartbeat，將其與 `lightContext: true` 結合以使用最精簡的提示，或是選擇一個具有足以容納共享會話之上下文視窗的 heartbeat 模型。

## 相關

- [Automation](/zh-Hant/automation) — 所有自動化機制一覽
- [Background Tasks](/zh-Hant/automation/tasks) — 如何追蹤分離的工作
- [Timezone](/zh-Hant/concepts/timezone) — 時區如何影響 heartbeat 排程
- [Troubleshooting](/zh-Hant/automation/cron-jobs#troubleshooting) — 自動化問題的除錯
