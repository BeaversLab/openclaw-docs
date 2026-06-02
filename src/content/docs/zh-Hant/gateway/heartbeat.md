---
summary: "Heartbeat 輪詢訊息與通知規則"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
sidebarTitle: "Heartbeat"
---

<Note>**Heartbeat vs cron？** 請參閱 [Automation](/zh-Hant/automation) 以了解使用時機的指引。</Note>

Heartbeat 會在主對話階段中執行**週期性代理輪次**，以便模型能突顯需要注意的事項，而不會對您造成垃圾訊息干擾。

Heartbeat 是一個預定的主工作階段回合——它**不會**建立 [background task](/zh-Hant/automation/tasks) 記錄。任務記錄是用於分離的工作（ACP 執行、子代理、獨立的 cron 工作）。

疑難排解：[Scheduled Tasks](/zh-Hant/automation/cron-jobs#troubleshooting)

## 快速入門（初學者）

<Steps>
  <Step title="選擇頻率">
    保持啟用 heartbeat（預設為 `30m`，若使用 Anthropic OAuth/token auth（包括 Claude CLI 重用）則為 `1h`）或設定您自己的頻率。
  </Step>
  <Step title="新增 HEARTBEAT.md（選用）">
    在代理工作區中建立一個微小的 `HEARTBEAT.md` 檢查清單或 `tasks:` 區塊。
  </Step>
  <Step title="決定 heartbeat 訊息的傳送位置">
    `target: "none"` 為預設值；設定 `target: "last"` 以路由至最後一次的聯絡人。
  </Step>
  <Step title="選用性調整">
    - 啟用 heartbeat 推理傳遞以提高透明度。
    - 如果 heartbeat 執行只需要 `HEARTBEAT.md`，請使用輕量級啟動上下文。
    - 啟用獨立工作階段以避免每次 heartbeat 都發送完整的對話歷史。
    - 將 heartbeat 限制在活動時間（本地時間）。

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
        // includeReasoning: true, // optional: send separate `Thinking` message too
      },
    },
  },
}
```

## 預設值

- 間隔：`30m`（若偵測到的驗證模式為 Anthropic OAuth/token auth，包括 Claude CLI 重用，則為 `1h`）。設定 `agents.defaults.heartbeat.every` 或各代理的 `agents.list[].heartbeat.every`；使用 `0m` 以停用。
- 提示主體（可透過 `agents.defaults.heartbeat.prompt` 設定）：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 逾時：未設定的 heartbeat 回合若已設定則使用 `agents.defaults.timeoutSeconds`。否則，它們使用上限為 600 秒的 heartbeat 頻率。設定 `agents.defaults.heartbeat.timeoutSeconds` 或各代理的 `agents.list[].heartbeat.timeoutSeconds` 以進行較長的 heartbeat 工作。
- 心跳提示詞會**逐字**作為使用者訊息發送。系統提示詞僅在為預設代理程式啟用心跳時才包含「Heartbeat」章節，並且該運行會在內部被標記。
- 當使用 `0m` 停用心跳時，正常運行也會從啟動上下文中省略 `HEARTBEAT.md`，因此模型不會看到僅限心跳的指令。
- 會在設定的時區中檢查活動時間 (`heartbeat.activeHours`)。在時間視窗之外，心跳將被跳過，直到視窗內的下一個檢查點。
- 當 cron 工作處於作用中或已排隊狀態時，心跳會自動延遲。設定 `heartbeat.skipWhenBusy: true` 也可以讓代理程式在其自己的工作階段金鑰子代理程式或巢狀指令通道上延遲；同層級代理程式不會僅因為另一個代理程式有正在進行的子代理程式工作而暫停。

## 心跳提示詞的用途

預設提示詞刻意保持廣泛：

- **背景工作**：「Consider outstanding tasks」（考慮未完成的工作）會提示代理程式檢查後續事項（收件匣、行事曆、提醒、已排隊的工作）並提出任何緊急事項。
- **人員確認**：「Checkup sometimes on your human during day time」（有時在白天檢查你的人类）會提示偶爾發送輕量級的「有什麼需要嗎？」訊息，但透過使用您設定的本地時區來避免夜間垃圾訊息（請參閱 [Timezone](/zh-Hant/concepts/timezone)）。

心跳可以對已完成的 [background tasks](/zh-Hant/automation/tasks) 做出反應，但心跳運行本身不會建立工作記錄。

如果您希望心跳執行非常特定的操作（例如「檢查 Gmail PubSub 統計資料」或「驗證閘道健康狀況」），請將 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）設為自訂主體（將逐字發送）。

## 回應合約

- 如果沒有事項需要注意，請回覆 **`HEARTBEAT_OK`**。
- 具備工具功能的心跳運行可以改為呼叫 `heartbeat_respond` 並搭配 `notify: false` 以表示沒有可見更新，或是呼叫 `notify: true` 加上 `notificationText` 以發出警示。當存在時，結構化工具回應優先於文字後援。
- 在心跳運行期間，當 `HEARTBEAT_OK` 出現在回覆的**開頭或結尾**時，OpenClaw 會將其視為確認（ack）。該 token 會被移除，如果剩餘內容**≤ `ackMaxChars`**（預設值：300），則會捨棄該回覆。
- 如果 `HEARTBEAT_OK` 出現在回覆的**中間**，則不會對其進行特殊處理。
- 對於警報，**請勿**包含 `HEARTBEAT_OK`；僅傳回警報文字。

在心跳之外，訊息開頭/結尾處的零散 `HEARTBEAT_OK` 將被移除並記錄；如果訊息僅包含 `HEARTBEAT_OK`，則會將其捨棄。

## 設定

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // default: 30m (0m disables)
        model: "anthropic/claude-opus-4-6",
        includeReasoning: false, // default: false (deliver separate Thinking message when available)
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

### 範圍與優先順序

- `agents.defaults.heartbeat` 設定全域心跳行為。
- `agents.list[].heartbeat` 會在上方合併；如果任何代理擁有 `heartbeat` 區塊，則**僅這些代理**會執行心跳。
- `channels.defaults.heartbeat` 為所有頻道設定可見性預設值。
- `channels.<channel>.heartbeat` 會覆寫頻道預設值。
- `channels.<channel>.accounts.<id>.heartbeat`（多帳號頻道）會覆寫各頻道設定。

### 各別代理心跳

如果任何 `agents.list[]` 項目包含 `heartbeat` 區塊，則**僅這些代理**會執行心跳。各別代理區塊會在 `agents.defaults.heartbeat` 之上合併（因此您可以設定一次共用的預設值，然後針對各個代理進行覆寫）。

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

### 活動時間範例

將心跳限制在特定時區的工作時間內：

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

在此視窗之外（東部時間上午 9 點之前或晚上 10 點之後），將跳過心跳。視窗內下一次排定的執行將會正常執行。

### 24/7 設定

如果您希望心跳全天執行，請使用以下其中一種模式：

- 完全省略 `activeHours`（無時間視窗限制；這是預設行為）。
- 設定全天視窗：`activeHours: { start: "00:00", end: "24:00" }`。

<Warning>請勿將 `start` 和 `end` 設定為相同的時間（例如從 `08:00` 到 `08:00`）。這將被視為零寬度視窗，因此心跳將會被永遠跳過。</Warning>

### 多帳號範例

使用 `accountId` 來指定 Telegram 等多帳號管道上的特定帳號：

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

### 欄位說明

<ParamField path="every" type="string">
  Heartbeat 間隔（持續時間字串；預設單位 = 分鐘）。
</ParamField>
<ParamField path="model" type="string">
  Heartbeat 執行的選用模型覆寫（`provider/model`）。
</ParamField>
<ParamField path="includeReasoning" type="boolean" default="false">
  啟用時，也會在可用時傳送獨立的 `Thinking` 訊息（格式與 `/reasoning on` 相同）。
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  為 true 時，heartbeat 執行會使用輕量級啟動程序內容，並僅保留工作區啟動程序檔案中的 `HEARTBEAT.md`。
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  為 true 時，每次 heartbeat 會在全新工作階段中執行，沒有先前的對話紀錄。使用與 cron `sessionTarget: "isolated"` 相同的隔離模式。大幅降低每次 heartbeat 的 token 成本。結合 `lightContext: true` 以達到最大節省效果。傳送路由仍使用主工作階段內容。
</ParamField>
<ParamField path="skipWhenBusy" type="boolean" default="false">
  為 true 時，heartbeat 執行會在該代理程式的額外忙碌通道上延遲：其自身以工作階段索引鍵設定的子代理程式或巢狀指令工作。Cron 通道總是會延遲 heartbeat，即使沒有此旗標也一樣，因此本機模型主機不會同時執行 cron 和 heartbeat 提示。
</ParamField>
<ParamField path="session" type="string">
  Heartbeat 執行的選用工作階段索引鍵。

- `main`（預設）：代理程式主工作階段。
- 明確的工作階段索引鍵（從 `openclaw sessions --json` 或 [sessions CLI](/zh-Hant/cli/sessions) 複製）。
- 工作階段索引鍵格式：請參閱 [Sessions](/zh-Hant/concepts/session) 和 [Groups](/zh-Hant/channels/groups)。

</ParamField>
<ParamField path="target" type="string">
- `last`：傳送至最後使用的外部頻道。
- 明確頻道：任何已設定的頻道或外掛程式 ID，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
- `none` (預設)：執行心跳但**不對外**傳送。

</ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
  控制直接訊息/DM 的傳送行為。`allow`：允許直接訊息/DM 心跳傳送。`block`：抑制直接訊息/DM 傳送 (`reason=dm-blocked`)。

</ParamField>
<ParamField path="to" type="string">
  選用的收件者覆寫 (頻道特定 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID)。針對 Telegram 主題/執行緒，請使用 `<chatId>:topic:<messageThreadId>`。

</ParamField>
<ParamField path="accountId" type="string">
  多帳號頻道的選用帳號 ID。當為 `target: "last"` 時，如果解析出的最後頻道支援帳號，則帳號 ID 套用於該頻道；否則將予以忽略。如果帳號 ID 與解析頻道的已設定帳號不符，將會跳過傳送。

</ParamField>
<ParamField path="prompt" type="string">
  覆寫預設的提示詞主體 (不會合併)。

</ParamField>
<ParamField path="ackMaxChars" type="number" default="300">
  在 `HEARTBEAT_OK` 之後、傳送之前允許的最大字元數。

</ParamField>
<ParamField path="suppressToolErrorWarnings" type="boolean">
  當為 true 時，會在心跳執行期間抑制工具錯誤警示載荷。

</ParamField>
<ParamField path="timeoutSeconds" type="number" default="global timeout or min(every, 600)">
  心跳代理輪次在中止前允許的最大秒數。保持未設定以在設定時使用 `agents.defaults.timeoutSeconds`，否則心跳頻率上限為 600 秒。

</ParamField>
<ParamField path="activeHours" type="object">
  將心跳執行限制在時間視窗內。包含 `start`（HH:MM，包含；使用 `00:00` 表示一天開始）、`end`（HH:MM，不包含；允許使用 `24:00` 表示一天結束）和可選的 `timezone` 的物件。

- 省略或設為 `"user"`：如果已設定則使用您的 `agents.defaults.userTimezone`，否則回退至主機系統時區。
- `"local"`：一律使用主機系統時區。
- 任何 IANA 識別碼（例如 `America/New_York`）：直接使用；如果無效，則回退至上述 `"user"` 的行為。
- 對於有效的視窗，`start` 和 `end` 不得相等；相等的值會被視為零寬度（永遠在視窗之外）。
- 在有效視窗之外，會跳過心跳直到視窗內的下一個 tick。

</ParamField>

## 傳遞行為

<AccordionGroup>
  <Accordion title="Session and target routing">
    - 心跳預設在代理的主工作階段中執行 (`agent:<id>:<mainKey>`)，或在 `session.scope = "global"` 時於 `global` 執行。設定 `session` 以覆寫至特定頻道工作階段 (Discord/WhatsApp/等)。
    - `session` 僅影響執行環境；傳遞由 `target` 和 `to` 控制。
    - 若要傳遞至特定頻道/接收者，請設定 `target` + `to`。若使用 `target: "last"`，傳遞將使用該工作階段的最後一個外部頻道。
    - 心跳傳遞預設允許直接/DM 目標。設定 `directPolicy: "block"` 以在仍執行心跳回合的同時，抑制直接目標的發送。
    - 如果主佇列、目標工作階段通道、cron 通道或使用中的 cron 工作忙碌，將會跳過心跳並稍後重試。
    - 如果 `skipWhenBusy: true`，此代理的工作階段金鑰子代理和巢狀通道也會延遲心跳執行。其他代理的忙碌通道不會延遲此代理。
    - 如果 `target` 解析為無外部目標，執行仍會進行，但不會傳送任何訊息。

  </Accordion>
  <Accordion title="Visibility and skip behavior">
    - 如果 `showOk`、`showAlerts` 和 `useIndicator` 皆停用，該執行將會一開始就跳過並視為 `reason=alerts-disabled`。
    - 如果僅停用警報傳遞，OpenClaw 仍可執行心跳、更新到期工作時間戳記、還原工作階段閒置時間戳記，並抑制對外的警報內容。
    - 如果解析後的心跳目標支援輸入狀態，OpenClaw 會在心跳執行期間顯示輸入狀態。這會使用心跳傳送聊天輸出的相同目標，並且會被 `typingMode: "never"` 停用。

  </Accordion>
  <Accordion title="Session lifecycle and audit">
    - 僅有心跳的回覆**不會**保持會話存活。心跳中繼資料可能會更新會話列，但閒置過期使用的是來自最後一個真實使用者/頻道訊息的 `lastInteractionAt`，而每日過期使用的是 `sessionStartedAt`。
    - Control UI 和 WebChat 歷史記錄會隱藏心跳提示以及僅包含 OK 的確認訊息。底層的會話逐字稿仍然可以包含這些輪次以供稽核/重播。
    - 分離的 [background tasks](/zh-Hant/automation/tasks) 可以將系統事件加入佇列，並在主會話應該快速注意到某些事情時喚醒心跳。該喚醒動作不會讓心跳執行背景工作。

  </Accordion>
</AccordionGroup>

## 可見度控制

預設情況下，當傳送警示內容時，會隱藏 `HEARTBEAT_OK` 確認訊息。您可以針對每個頻道或每個帳戶進行調整：

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

### 各旗標的作用

- `showOk`：當模型傳回僅包含 OK 的回覆時，發送 `HEARTBEAT_OK` 確認訊息。
- `showAlerts`：當模型傳回非 OK 的回覆時，發送警示內容。
- `useIndicator`：針對 UI 狀態介面發出指示器事件。

如果**這三個**全部為 false，OpenClaw 將完全跳過心跳執行（不進行模型呼叫）。

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

| 目標                          | 設定                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| 預設行為（靜默 OK，開啟警示） | （無需設定）                                                                             |
| 完全靜默（無訊息，無指示器）  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 僅指示器（無訊息）            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 僅在一個頻道顯示 OK           | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (選用)

如果工作區中存在 `HEARTBEAT.md` 檔案，預設提示會告訴代理程式閱讀它。您可以將其視為您的「心跳檢查清單」：小巧、穩定，並且可以安全地每 30 分鐘考慮一次。

在正常運行時，只有在為預設代理啟用心跳指引時，才會注入 `HEARTBEAT.md`。使用 `0m` 停用心跳頻率或設定 `includeSystemPromptSection: false` 會將其從正常啟動上下文中省略。

在原生 Codex harness 上，`HEARTBEAT.md` 內容不會注入到回合中。如果檔案存在且包含非空白字符，心跳協作模式指令會指引 Codex 讀取該檔案並告訴它在繼續之前閱讀。

如果 `HEARTBEAT.md` 存在但實際上為空（僅包含空白行和類似 `# Heading` 的 markdown 標題），OpenClaw 會跳過心跳運行以節省 API 呼叫。該跳過會被回報為 `reason=empty-heartbeat-file`。如果檔案遺失，心跳仍會運行，模型會決定該做什麼。

保持簡短（簡短的檢查清單或提醒）以避免提示膨脹。

`HEARTBEAT.md` 範例：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it's daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### `tasks:` 區塊

`HEARTBEAT.md` 也支援一個小型的結構化 `tasks:` 區塊，用於心跳內部的基於間隔的檢查。

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
  <Accordion title="Behavior">
    - OpenClaw 會解析 `tasks:` 區塊，並根據其自身的 `interval` 檢查每個任務。
    - 只有 **到期** 的任務會包含在該 tick 的心跳提示中。
    - 如果沒有任務到期，心跳將完全跳過（`reason=no-tasks-due`）以避免浪費模型呼叫。
    - `HEARTBEAT.md` 中的非任務內容會被保留，並作為額外上下文附加在到期任務清單之後。
    - 任務的最後執行時間戳記儲存在會話狀態（`heartbeatTaskState`）中，因此間隔在正常重啟後仍然有效。
    - 任務時間戳記僅在心跳運行完成其正常回覆路徑後才會前進。跳過的 `empty-heartbeat-file` / `no-tasks-due` 運行不會將任務標記為已完成。

  </Accordion>
</AccordionGroup>

當您希望一個心跳檔案包含多個定期檢查，但不想每次 tick 都為所有檢查付費時，任務模式非常有用。

### 代理可以更新 HEARTBEAT.md 嗎？

可以——如果您要求它的話。

`HEARTBEAT.md` 只是代理工作區中的一個普通檔案，因此您可以（在一般聊天中）告訴代理類似這樣的內容：

- 「更新 `HEARTBEAT.md` 以加入每日日曆檢查。」
- 「重寫 `HEARTBEAT.md`，使其更簡短並專注於收件匣的後續追蹤。」

如果您希望主動執行此操作，您也可以在心跳提示中包含一個明確的行：「如果檢查清單過時，請用更好的版本更新 HEARTBEAT.md。」

<Warning>請勿將祕密（API 金鑰、電話號碼、私人權杖）放入 `HEARTBEAT.md` — 它會成為提示上下文的一部分。</Warning>

## 手喚醒（隨選）

您可以將系統事件加入佇列並透過以下方式觸發立即心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果有多個代理已配置 `heartbeat`，手喚醒會立即執行每個代理的心跳。

使用 `--mode next-heartbeat` 以等待下一次排程的刻度。

## 推理傳遞（選用）

根據預設，心跳僅傳遞最終的「answer」酬載。

如果您希望透明化，請啟用：

- `agents.defaults.heartbeat.includeReasoning: true`

啟用後，心跳也會傳遞一則單獨的前綴為 `Thinking` 的訊息（形狀與 `/reasoning on` 相同）。當代理正在管理多個會話/codex，且您想查看它決定 ping 您的原因時，這會很有用 — 但這也可能洩漏超出您預期的內部細節。建議在群組聊天中保持關閉。

## 成本意識

心跳會執行完整的代理回合。較短的間隔會消耗更多 token。若要降低成本：

- 使用 `isolatedSession: true` 以避免傳送完整的對話記錄（每次執行約從 10 萬個 token 降至 2-5 千個）。
- 使用 `lightContext: true` 將啟動檔案限制為僅 `HEARTBEAT.md`。
- 設定較便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 較小。
- 如果您只需要內部狀態更新，請使用 `target: "none"`。

## 心跳之後的上下文溢位

如果心跳先前的某次執行在較小的本地模型（例如視窗大小為 32k 的 Ollama 模型）上結束了現有的會話，且下一次主會話轉次回報了內容溢位，請將會話執行時模型重設回已設定的主要模型。當最後的執行時模型符合設定的 `heartbeat.model` 時，OpenClaw 的重設訊息會指出這一點。

目前的心跳在執行完成後會保留共享會話的現有執行時模型。您仍然可以使用 `isolatedSession: true` 在全新的會話中執行心跳，將其與 `lightContext: true` 結合以獲得最小的提示，或選擇一個具有足夠大型內容視窗的心跳模型以適應共享會話。

## 相關

- [Automation](/zh-Hant/automation) — 快速瀏覽所有自動化機制
- [Background Tasks](/zh-Hant/automation/tasks) — 如何追蹤分離的工作
- [Timezone](/zh-Hant/concepts/timezone) — 時區如何影響心跳排程
- [Troubleshooting](/zh-Hant/automation/cron-jobs#troubleshooting) — 除錯自動化問題
