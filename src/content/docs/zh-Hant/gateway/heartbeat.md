---
summary: "Heartbeat 輪詢訊息與通知規則"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
sidebarTitle: "Heartbeat"
---

<Note>**Heartbeat vs cron?** See [Automation & Tasks](/zh-Hant/automation) for guidance on when to use each.</Note>

Heartbeat 會在主對話階段中執行**週期性代理輪次**，以便模型能突顯需要注意的事項，而不會對您造成垃圾訊息干擾。

Heartbeat 是一個排程的主對話階段輪次 — 它並**不**會建立 [background task](/zh-Hant/automation/tasks) 記錄。任務記錄是用於分離的工作（ACP 執行、子代理、獨立的 cron 工作）。

疑難排解：[Scheduled Tasks](/zh-Hant/automation/cron-jobs#troubleshooting)

## 快速入門（初學者）

<Steps>
  <Step title="選擇頻率">保持啟用心跳 (預設為 `30m`，若是 Anthropic OAuth/token 驗證 (包括 Claude CLI 重用) 則為 `1h`)，或設定您自己的頻率。</Step>
  <Step title="新增 HEARTBEAT.md (選用)">在代理工作區中建立一個微小的 `HEARTBEAT.md` 檢查清單或 `tasks:` 區塊。</Step>
  <Step title="決定心跳訊息應傳送至何處">預設為 `target: "none"`；設定 `target: "last"` 以傳送至最後一個聯絡人。</Step>
  <Step title="選用的微調">- 啟用心跳推理傳遞以提高透明度。 - 如果心跳執行只需要 `HEARTBEAT.md`，請使用輕量級啟動內容。 - 啟用獨立對話以避免每次心跳都傳送完整的對話記錄。 - 將心跳限制在活動時間內 (當地時間)。</Step>
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
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Reasoning:` message too
      },
    },
  },
}
```

## 預設值

- 間隔：`30m` (當偵測到的驗證模式為 Anthropic OAuth/token 驗證 (包括 Claude CLI 重用) 時則為 `1h`)。設定 `agents.defaults.heartbeat.every` 或各代理的 `agents.list[].heartbeat.every`；使用 `0m` 來停用。
- 提示主體 (可透過 `agents.defaults.heartbeat.prompt` 設定)：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 心跳提示詞會作為用戶訊息**逐字**發送。系統提示詞僅在為預設代理啟用心跳時才包含「Heartbeat」部分，且該運行會在內部被標記。
- 當使用 `0m` 停用心跳時，正常運行也會從引導上下文中省略 `HEARTBEAT.md`，以便模型不會看到僅限心跳的指令。
- 活動時間 (`heartbeat.activeHours`) 會在設定的時區中進行檢查。在時間窗外，心跳將被跳過，直到時間窗內的下一個刻度。

## 心跳提示詞的用途

預設提示詞的設計意圖是廣泛的：

- **背景任務**：「考慮未完成的任務」會促使代理檢查後續事項（收件匣、日曆、提醒、排隊的工作），並提出任何緊急事項。
- **人類確認**：「有時在白天檢查一下你的人類」會促使偶爾發送輕量級的「您需要什麼嗎？」訊息，但透過使用您設定的本地時區來避免夜間騷擾（請參閱 [Timezone](/zh-Hant/concepts/timezone)）。

心跳可以對已完成的 [background tasks](/zh-Hant/automation/tasks) 做出反應，但心跳運行本身不會建立任務記錄。

如果您希望心跳執行非常具體的操作（例如「檢查 Gmail PubSub 統計數據」或「驗證閘道健康狀況」），請將 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）設定為自訂內容（將逐字發送）。

## 回應契約

- 如果不需要注意任何事情，請以 **`HEARTBEAT_OK`** 回覆。
- 在心跳運行期間，當 `HEARTBEAT_OK` 出現在回覆的**開頭或結尾**時，OpenClaw 會將其視為確認信號。該標記會被移除，如果剩餘內容**≤ `ackMaxChars`**（預設值：300），則回覆會被丟棄。
- 如果 `HEARTBEAT_OK` 出現在回覆的**中間**，則不會受到特殊處理。
- 對於警報，**請勿**包含 `HEARTBEAT_OK`；僅傳回警報文字。

在心跳之外，訊息開頭/結尾處的零散 `HEARTBEAT_OK` 將被移除並記錄；僅包含 `HEARTBEAT_OK` 的訊息將被丟棄。

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
        target: "last", // default: none | options: last | none | <channel id> (core or plugin, e.g. "bluebubbles")
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
- `agents.list[].heartbeat` 會合併在最上層；如果任何代理擁有 `heartbeat` 區塊，**僅有這些代理**會執行心跳。
- `channels.defaults.heartbeat` 設定所有頻道的可見性預設值。
- `channels.<channel>.heartbeat` 會覆寫頻道預設值。
- `channels.<channel>.accounts.<id>.heartbeat`（多帳號頻道）會覆寫個別頻道設定。

### 個別代理心跳

如果任何 `agents.list[]` 項目包含 `heartbeat` 區塊，**僅有這些代理**會執行心跳。個別代理區塊會合併在 `agents.defaults.heartbeat` 之上（因此您可以設定一次共享預設值，並針對各個代理進行覆寫）。

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

### 啟用時段範例

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

在此時間範圍之外（美國東部時間上午 9 點之前或晚上 10 點之後），將會跳過心跳。在範圍內的下一個排定刻度將會正常執行。

### 24/7 設定

如果您希望心跳整天運作，請使用以下其中一種模式：

- 完全省略 `activeHours`（沒有時間視窗限制；這是預設行為）。
- 設定全天時間視窗：`activeHours: { start: "00:00", end: "24:00" }`。

<Warning>請勿將 `start` 和 `end` 設定為相同的時間（例如 `08:00` 到 `08:00`）。這將被視為零寬度視窗，因此心跳將會永遠被跳過。</Warning>

### 多帳號範例

使用 `accountId` 來鎖定 Telegram 這類多帳號頻道上的特定帳號：

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

### 實作筆記

<ParamField path="every" type="string">
  心跳間隔（持續時間字串；預設單位 = 分鐘）。
</ParamField>
<ParamField path="model" type="string">
  心跳執行的選用模型覆寫 (`provider/model`)。
</ParamField>
<ParamField path="includeReasoning" type="boolean" default="false">
  啟用時，也會在可用時傳送獨立的 `Reasoning:` 訊息（形狀與 `/reasoning on` 相同）。
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  當為 true 時，心跳執行會使用輕量級啟動上下文，並且僅保留來自工作區啟動檔案的 `HEARTBEAT.md`。
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  當為 true 時，每次心跳都在沒有先前對話記錄的新工作階段中執行。使用與 cron `sessionTarget: "isolated"` 相同的隔離模式。大幅降低每次心跳的 token 成本。與 `lightContext: true` 結合使用以實現最大節省。傳送路由仍使用主工作階段上下文。
</ParamField>
<ParamField path="session" type="string">
  心跳執行的選用工作階段金鑰。

- `main` (預設): agent 主工作階段。
- 明確的工作階段金鑰 (從 `openclaw sessions --json` 複製，或是來自 [sessions CLI](/zh-Hant/cli/sessions))。
- 工作階段金鑰格式：請參閱 [Sessions](/zh-Hant/concepts/session) 和 [Groups](/zh-Hant/channels/groups)。
  </ParamField>
<ParamField path="target" type="string">
- `last`: 傳送至上次使用的外部頻道。
- 明確頻道：任何已設定的頻道或 plugin id，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
- `none` (預設): 執行心跳但**不對外發送**。

  </ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
控制直接訊息/DM 發送行為。`allow`: 允許直接訊息/DM 心跳發送。`block`: 抑制直接訊息/DM 發送 (`reason=dm-blocked`)。
</ParamField>
<ParamField path="to" type="string">
可選的收件者覆蓋 (通道特定 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID)。對於 Telegram 主題/討論串，請使用 `<chatId>:topic:<messageThreadId>`。
</ParamField>
<ParamField path="accountId" type="string">
多帳號通道的可選帳號 ID。當為 `target: "last"` 時，帳號 ID 應用於解析到的最後一個通道（如果該通道支援帳號）；否則將被忽略。如果帳號 ID 與解析通道的已配置帳號不匹配，則跳過發送。
</ParamField>
<ParamField path="prompt" type="string">
覆蓋預設提示詞內容 (不會合併)。
</ParamField>
<ParamField path="ackMaxChars" type="number" default="300">
在 `HEARTBEAT_OK` 之後、發送之前允許的最大字元數。
</ParamField>
<ParamField path="suppressToolErrorWarnings" type="boolean">
當為 true 時，在心跳執行期間抑制工具錯誤警告負載。
</ParamField>
<ParamField path="activeHours" type="object">
將心跳執行限制在時間視窗內。具有 `start` (HH:MM，包含；使用 `00:00` 表示一天開始)、`end` (HH:MM，不包含；`24:00` 允許用於一天結束) 和可選的 `timezone` 的物件。

- 省略或設定為 `"user"`: 如果已設定則使用您的 `agents.defaults.userTimezone`，否則回退到主機系統時區。
- `"local"`: 始終使用主機系統時區。
- 任何 IANA 識別碼（例如 `America/New_York`）：直接使用；如果無效，則回退到上述 `"user"` 的行為。
- `start` 和 `end` 對於活動視窗不得相等；相等的值被視為零寬度（始終在視窗之外）。
- 在活動視窗之外，跳過心跳直到視窗內的下一個刻度。
  </ParamField>

## 傳遞行為

<AccordionGroup>
  <Accordion title="Session and target routing">
    - 心跳預設在代理的主會話中運行（`agent:<id>:<mainKey>`），或者在 `session.scope = "global"` 時為 `global`。設定 `session` 以覆蓋為特定的頻道會話（Discord/WhatsApp 等）。
    - `session` 僅影響運行上下文；傳遞由 `target` 和 `to` 控制。
    - 若要傳遞到特定的頻道/接收者，請設定 `target` + `to`。使用 `target: "last"` 時，傳遞使用該會話的最後一個外部頻道。
    - 心跳傳遞預設允許直接/DM 目標。設定 `directPolicy: "block"` 以在仍執行心跳輪次時抑制直接目標傳送。
    - 如果主佇列忙碌，則跳過心跳並稍後重試。
    - 如果 `target` 解析為無外部目的地，運行仍會發生，但不會傳送出站訊息。
  </Accordion>
  <Accordion title="可見性和跳過行為">
    - 如果 `showOk`、`showAlerts` 和 `useIndicator` 均被停用，則該執行會在開頭被跳過並標記為 `reason=alerts-disabled`。
    - 如果僅停用了警報傳遞，OpenClaw 仍然可以執行心跳、更新到期任務的時間戳、恢復會話閒置時間戳，並抑制外發警報負載。
    - 如果解析後的心跳目標支援輸入狀態指示，OpenClaw 會在心跳執行期間顯示輸入狀態。這使用與心跳發送聊天輸出相同的目標，並且被 `typingMode: "never"` 停用。
  </Accordion>
  <Accordion title="會話生命週期與稽核">
    - 僅有心跳的回覆**不會**保持會話存活。心跳元數據可能會更新會話行，但閒置過期使用最後一次真實用戶/頻道訊息的 `lastInteractionAt`，而每日過期使用 `sessionStartedAt`。
    - 控制介面 和 WebChat 歷史記錄會隱藏心跳提示和僅包含 OK 的確認回覆。底層的會話逐字稿仍可包含這些輪次以供稽核/重播。
    - 分離的 [背景任務](/zh-Hant/automation/tasks) 可以將系統事件加入佇列，並在主會話需要快速注意某些事情時喚醒心跳。該喚醒操作不會使心跳執行變成背景任務。
  </Accordion>
</AccordionGroup>

## 可見性控制

預設情況下，當傳遞警報內容時，會隱藏 `HEARTBEAT_OK` 確認回覆。您可以針對每個頻道或每個帳戶調整此設定：

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

### 每個標誌的作用

- `showOk`：當模型僅傳回 OK 回覆時，發送 `HEARTBEAT_OK` 確認。
- `showAlerts`：當模型傳回非 OK 回覆時，發送警報內容。
- `useIndicator`：針對 UI 狀態介面發出指示器事件。

如果**全部三個**皆為 false，OpenClaw 將完全跳過心跳執行（不呼叫模型）。

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
| 預設行為（靜默 OK，開啟警報） | （無需設定）                                                                             |
| 完全靜默（無訊息，無指示器）  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 僅指示器（無訊息）            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 僅在一個頻道中顯示 OK         | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（可選）

如果工作區中存在 `HEARTBEAT.md` 檔案，預設提示會指示代理讀取它。您可以將其視為您的「心跳檢查清單」：小巧、穩定，且每 30 分鐘包含一次是安全的。

在正常執行時，只有當預設代理啟用了心跳指引時，才會注入 `HEARTBEAT.md`。使用 `0m` 停用心跳頻率或設定 `includeSystemPromptSection: false` 將會將其從正常啟動上下文中省略。

如果 `HEARTBEAT.md` 存在但實際上是空的（只有空白行和像 `# Heading` 這樣的 markdown 標題），OpenClaw 會跳過心跳執行以節省 API 呼叫。該跳過會被回報為 `reason=empty-heartbeat-file`。如果檔案不存在，心跳仍會執行，模型會決定要做什麼。

保持極小（短檢查清單或提醒），以避免提示膨脹。

`HEARTBEAT.md` 範例：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it's daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### `tasks:` 區塊

`HEARTBEAT.md` 也支援一個小型結構化的 `tasks:` 區塊，用於心跳內部基於間隔的檢查。

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
    - OpenClaw 解析 `tasks:` 區塊，並根據其自身的 `interval` 檢查每個任務。 - 只有**到期**的任務會包含在該次心跳的提示中。 - 如果沒有任務到期，心跳將被完全跳過（`reason=no-tasks-due`），以避免浪費模型呼叫。 - `HEARTBEAT.md` 中的非任務內容將被保留，並作為額外上下文附加在到期任務列表之後。 - 任務上次執行的時間戳記存儲在會話狀態中（`heartbeatTaskState`），因此間隔設定在正常重啟後仍然有效。 -
    只有在心跳執行完成其正常回覆路徑後，任務時間戳記才會前進。跳過的 `empty-heartbeat-file` / `no-tasks-due` 執行不會將任務標記為已完成。
  </Accordion>
</AccordionGroup>

當您希望一個 heartbeat 檔案包含多個定期檢查而不想每次心跳都為所有檢查付費時，Task 模式非常有用。

### 代理程式可以更新 HEARTBEAT.md 嗎？

可以 —— 如果您要求它這樣做的話。

`HEARTBEAT.md` 只是代理程式工作區中的一個普通檔案，因此您可以在一般聊天中告訴代理程式類似這樣的話：

- "更新 `HEARTBEAT.md` 以新增每日日曆檢查。"
- "重寫 `HEARTBEAT.md` 使其更簡短，並專注於收件箱後續追蹤。"

如果您希望這主動發生，您也可以在 heartbeat 提示中包含明確的一行，例如：「如果檢查清單變得過時，請用更好的版本更新 HEARTBEAT.md。」

<Warning>不要將祕密（API 金鑰、電話號碼、私人權杖）放入 `HEARTBEAT.md` —— 它會成為提示內容的一部分。</Warning>

## 手喚醒（按需）

您可以將系統事件加入佇列並透過以下方式觸發立即心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果有多個代理程式設定 `heartbeat`，手喚醒會立即執行每個代理程式的心跳。

使用 `--mode next-heartbeat` 等待下一次排程的刻度。

## 推理交付（可選）

預設情況下，心跳僅交付最終的「答案」承載。

如果您希望提高透明度，請啟用：

- `agents.defaults.heartbeat.includeReasoning: true`

啟用後，心跳還將交付一條單獨的前綴為 `Reasoning:` 的訊息（形狀與 `/reasoning on` 相同）。當代理程式管理多個工作階段/codexes 且您希望查看其決定通知您的原因時，這很有用 —— 但這也可能洩露比您想要的更多內部細節。建議在群組聊天中將其關閉。

## 成本意識

心跳執行完整的代理程式回合。較短的間隔會消耗更多權杖。為了降低成本：

- 使用 `isolatedSession: true` 避免發送完整的對話歷史記錄（從每次執行約 10萬 權杖降至約 2-5千 權杖）。
- 使用 `lightContext: true` 將啟動檔案限制為僅 `HEARTBEAT.md`。
- 設定較便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 簡短。
- 如果您只想要內部狀態更新，請使用 `target: "none"`。

## 相關

- [自動化與任務](/zh-Hant/automation) — 所有自動化機制概覽
- [背景任務](/zh-Hant/automation/tasks) — 如何追蹤分離的工作
- [時區](/zh-Hant/concepts/timezone) — 時區如何影響心跳排程
- [疑難排解](/zh-Hant/automation/cron-jobs#troubleshooting) — 自動化問題的除錯
