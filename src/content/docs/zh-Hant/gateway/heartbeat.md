---
summary: "Heartbeat 輪詢訊息與通知規則"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
---

# Heartbeat (Gateway)

> **Heartbeat 與 Cron？** 請參閱 [Automation & Tasks](/en/automation) 以獲得關於何時使用何者的指導。

Heartbeat 在主會話中執行 **週期性代理輪次**，以便模型能夠
呈現需要注意的事項，而不會對您造成干擾。

Heartbeat 是一個排程的主會話輪次 — 它並**不**會建立 [background task](/en/automation/tasks) 記錄。
Task 記錄是用於分離的工作（ACP 執行、子代理、獨立的 cron 工作）。

疑難排解：[Scheduled Tasks](/en/automation/cron-jobs#troubleshooting)

## 快速入門（初學者）

1. 保持啟用 heartbeat（預設為 `30m`，或者若是 Anthropic OAuth/token 驗證（包括重複使用 Claude CLI）則為 `1h`）或設定您自己的頻率。
2. 在代理工作區中建立一個小小的 `HEARTBEAT.md` 檢查清單或 `tasks:` 區塊（可選但建議）。
3. 決定 heartbeat 訊息應該傳送到哪裡（`target: "none"` 是預設值；設定 `target: "last"` 以路由到最後的聯絡人）。
4. 可選：啟用 heartbeat 推理傳遞以增加透明度。
5. 可選：如果 heartbeat 執行只需要 `HEARTBEAT.md`，請使用輕量級的啟動語境。
6. 可選：啟用獨立會話，以避免每次 heartbeat 都傳送完整的對話歷史。
7. 可選：將 heartbeat 限制在啟用時段（本地時間）。

設定範例：

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

- 間隔：`30m`（或者在偵測到的驗證模式為 Anthropic OAuth/token 驗證時為 `1h`，包括重複使用 Claude CLI）。設定 `agents.defaults.heartbeat.every` 或每個代理的 `agents.list[].heartbeat.every`；使用 `0m` 來停用。
- 提示主體（可透過 `agents.defaults.heartbeat.prompt` 設定）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Heartbeat 提示詞會作為使用者訊息**逐字**發送。系統提示詞包含「Heartbeat」部分，且執行會在內部被標記。
- 啟用時段（`heartbeat.activeHours`）會在設定的時區中進行檢查。
  在時段之外，會跳過 heartbeat 直到視窗內的下一個刻度。

## Heartbeat 提示詞的用途

預設提示詞是有意設計得廣泛的：

- **背景任務**：「考慮未完成的任務」會促使代理檢視後續事項（收件匣、日曆、提醒、佇列中的工作）並提出任何緊急事項。
- **人員簽到**：「Checkup sometimes on your human during day time」會推動
  偶爾輕量級的「anything you need?」訊息，但透過使用您設定的本地時區來避免夜間垃圾訊息
  （請參閱 [/concepts/timezone](/en/concepts/timezone)）。

Heartbeat 可以對已完成的 [background tasks](/en/automation/tasks) 做出反應，但 heartbeat 執行本身並不會建立 task 記錄。

如果您希望心跳執行非常具體的操作（例如「檢查 Gmail PubSub 統計資料」或「驗證閘道健全狀態」），請將 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）設定為自訂內容（將逐字傳送）。

## 回應協定

- 如果無需注意任何事項，請回覆 **`HEARTBEAT_OK`**。
- 在心跳執行期間，當 `HEARTBEAT_OK` 出現在回覆的 **開頭或結尾** 時，OpenClaw 會將其視為確認（ack）。該權杖會被移除，如果剩餘內容 **≤ `ackMaxChars`**（預設值：300），則會捨棄該回覆。
- 如果 `HEARTBEAT_OK` 出現在回覆的 **中間**，則不會受到特殊處理。
- 對於警報，**請勿**包含 `HEARTBEAT_OK`；僅回傳警報文字。

在心跳之外，訊息開頭/結尾處的孤立 `HEARTBEAT_OK` 會被移除並記錄；僅包含 `HEARTBEAT_OK` 的訊息會被捨棄。

## 設定

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

### 範圍與優先順序

- `agents.defaults.heartbeat` 設定全域心跳行為。
- `agents.list[].heartbeat` 會在頂部合併；如果有任何代理具有 `heartbeat` 區塊，**僅這些代理** 會執行心跳。
- `channels.defaults.heartbeat` 為所有頻道設定可見性預設值。
- `channels.<channel>.heartbeat` 會覆寫頻道預設值。
- `channels.<channel>.accounts.<id>.heartbeat`（多帳號頻道）會覆寫各頻道設定。

### 各 Agent 的 Heartbeat

如果任何 `agents.list[]` 項目包含 `heartbeat` 區塊，**僅這些代理** 會執行心跳。各代理區塊會在 `agents.defaults.heartbeat` 之上合併（因此您可以設定一次共用的預設值，並針對各代理進行覆寫）。

範例：兩個 agents，只有第二個 agent 執行 heartbeat。

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
          prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        },
      },
    ],
  },
}
```

### 啟用時段範例

將 heartbeat 限制在特定時區的上班時間內：

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

在此時間視窗之外（美國東部時間上午 9 點之前或晚上 10 點之後），將跳過心跳。在時間視窗內的下一個預定週期將正常運作。

### 24/7 設定

如果您希望心跳全天運作，請使用以下其中一種模式：

- 完全省略 `activeHours`（無時間視窗限制；這是預設行為）。
- 設定全天視窗：`activeHours: { start: "00:00", end: "24:00" }`。

請勿將 `start` 和 `end` 設定為相同的時間（例如從 `08:00` 到 `08:00`）。
這會被視為零寬度視窗，因此心跳將永遠被跳過。

### 多帳號範例

使用 `accountId` 以針對 Telegram 等多帳號頻道上的特定帳號：

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

### 備註

- `every`：心跳間隔（持續時間字串；預設單位 = 分鐘）。
- `model`：心跳執行的可選模型覆寫 (`provider/model`)。
- `includeReasoning`：啟用時，也會在可用時傳送獨立的 `Reasoning:` 訊息（形狀與 `/reasoning on` 相同）。
- `lightContext`：為 true 時，心跳執行會使用輕量級引導上下文，並且僅保留工作區引導檔案中的 `HEARTBEAT.md`。
- `isolatedSession`：為 true 時，每次心跳都會在沒有先前對話記錄的新工作階段中執行。使用與 cron `sessionTarget: "isolated"` 相同的隔離模式。大幅降低每次心跳的 token 成本。與 `lightContext: true` 結合使用以實現最大節省。傳遞路由仍使用主工作階段上下文。
- `session`：心跳執行的可選工作階段金鑰。
  - `main` (預設)：代理主工作階段。
  - 明確的工作階段金鑰（從 `openclaw sessions --json` 複製或使用 [sessions CLI](/en/cli/sessions)）。
  - 工作階段金鑰格式：請參閱 [Sessions](/en/concepts/session) 和 [Groups](/en/channels/groups)。
- `target`：
  - `last`：傳送到上次使用的外部頻道。
  - 明確頻道：任何已設定的頻道或外掛 id，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
  - `none` (預設)：執行心跳但**不要對外傳送**。
- `directPolicy`：控制直接/DM 傳送行為：
  - `allow` (預設)：允許直接/DM 心跳傳送。
  - `block`：抑制直接/DM 傳送 (`reason=dm-blocked`)。
- `to`：可選的收件者覆寫（頻道特定 id，例如 WhatsApp 的 E.164 或 Telegram 聊天 id）。對於 Telegram 主題/串列，請使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`：多帳號通道的可選帳號 ID。當為 `target: "last"` 時，如果解析出的最後一個通道支援帳號，帳號 ID 則套用於該通道；否則將被忽略。如果帳號 ID 與解析通道的已配置帳號不符，則跳過傳送。
- `prompt`：覆寫預設的提示詞主體（不會合併）。
- `ackMaxChars`：在 `HEARTBEAT_OK` 之後傳送前所允許的最大字元數。
- `suppressToolErrorWarnings`：設為 true 時，在心跳執行期間抑制工具錯誤警告的 payload。
- `activeHours`：將心跳執行限制在時間視窗內。此物件包含 `start` (HH:MM，包含；使用 `00:00` 表示一天開始)、`end` (HH:MM，不包含；允許使用 `24:00` 表示一天結束)，以及可選的 `timezone`。
  - 省略或設為 `"user"`：如果設定了 `agents.defaults.userTimezone` 則使用之，否則回退為主機系統時區。
  - `"local"`：始終使用主機系統時區。
  - 任何 IANA 識別碼 (例如 `America/New_York`)：直接使用；若無效，則回退至上述 `"user"` 的行為。
  - `start` 和 `end` 在啟用視窗內不得相等；相等的值會被視為零寬度（始終在視窗外）。
  - 在活動視窗外，心跳會被跳過，直到視窗內的下一個刻度。

## 傳遞行為

- 心跳預設在代理的主要工作階段中執行 (`agent:<id>:<mainKey>`)，
  或是在 `session.scope = "global"` 時在 `global` 執行。設定 `session` 以覆寫為
  特定的通道工作階段 (Discord/WhatsApp 等)。
- `session` 僅影響執行上下文；傳送是由 `target` 和 `to` 控制。
- 若要傳送至特定通道/接收者，請設定 `target` + `to`。使用
  `target: "last"` 時，傳送會使用該工作階段的最後一個外部通道。
- Heartbeat 傳遞預設允許直接/私訊目標。設定 `directPolicy: "block"` 以在仍執行 heartbeat 週期時，抑制傳送至直接目標的訊息。
- 如果主佇列忙碌，心跳會被跳過並稍後重試。
- 如果 `target` 解析為沒有外部目標，執行仍會發生，但不會傳送
  外寄訊息。
- 如果 `showOk`、`showAlerts` 和 `useIndicator` 全部停用，執行會在開頭被跳過，視為 `reason=alerts-disabled`。
- 如果僅停用警示傳遞，OpenClaw 仍可執行 heartbeat、更新到期任務的時間戳記、還原會話閒置時間戳記，並抑制外發警示內容。
- 僅 heartbeat 的回應**不會**保持會話存活；會還原最後的 `updatedAt`
  以使閒置到期行為正常。
- 分離的[背景任務](/en/automation/tasks)可以將系統事件加入佇列，並在主會話應快速注意某事時喚醒 heartbeat。該喚醒不會使 heartbeat 執行背景任務。

## 可見度控制

預設情況下，`HEARTBEAT_OK` 確認會在傳遞警示內容時被
抑制。您可以針對每個頻道或每個帳戶進行調整：

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

優先順序：每個帳戶 → 每個頻道 → 頻道預設值 → 內建預設值。

### 每個旗標的作用

- `showOk`：當模型傳回僅 OK 的回應時，傳送 `HEARTBEAT_OK` 確認。
- `showAlerts`：當模型傳回非 OK 的回應時，傳送警示內容。
- `useIndicator`：為 UI 狀態介面發出指示器事件。

如果**三者全部**為 false，OpenClaw 將完全跳過 heartbeat 執行（不呼叫模型）。

### 每個頻道與每個帳戶的範例

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
| 預設行為（靜音 OK，開啟警示） | _(無需設定)_                                                                             |
| 完全靜音（無訊息，無指示器）  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 僅指示器（無訊息）            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 僅在一個頻道顯示 OK           | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (選用)

如果工作區中存在 `HEARTBEAT.md` 檔案，預設提示會指示
代理讀取它。您可以將其視為您的「心跳檢查清單」：內容短小、穩定，
並且可以安全地每 30 分鐘包含一次。

如果 `HEARTBEAT.md` 存在但實際上是空的（只有空行和像是 `# Heading` 的 Markdown 標題），OpenClaw 會跳過心跳執行以節省 API 呼叫。
該跳過會被回報為 `reason=empty-heartbeat-file`。
如果檔案不存在，心跳仍會執行，由模型決定要執行什麼操作。

保持內容短小（簡短的檢查清單或提醒）以避免提示詞膨脹。

`HEARTBEAT.md` 範例：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### `tasks:` 區塊

`HEARTBEAT.md` 也支援一個小型的結構化 `tasks:` 區塊，用於心跳內部基於間隔的
檢查。

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

行為：

- OpenClaw 會解析 `tasks:` 區塊，並根據其自身的 `interval` 檢查每個任務。
- 只有**到期**的任務會被包含在該週期的心跳提示詞中。
- 如果沒有任務到期，心跳將被完全跳過 (`reason=no-tasks-due`)，以避免浪費的模型呼叫。
- `HEARTBEAT.md` 中的非任務內容會被保留，並作為額外上下文附加在到期任務清單之後。
- 任務最後執行的時間戳記會儲存在工作階段狀態中 (`heartbeatTaskState`)，因此間隔設定在一般重啟後會持續有效。
- 只有在心跳執行完成其正常回覆路徑後，任務時間戳記才會向前推進。跳過的 `empty-heartbeat-file` / `no-tasks-due` 執行不會將任務標記為已完成。

當您希望一個心跳檔案包含多個週期性檢查，而不想為每次執行支付所有檢查的費用時，任務模式非常有用。

### 代理可以更新 HEARTBEAT.md 嗎？

可以 — 如果您要求它這麼做的話。

`HEARTBEAT.md` 只是代理工作區中的一個普通檔案，因此您可以（在一般聊天中）
告訴代理類似以下的內容：

- 「更新 `HEARTBEAT.md` 以新增每日行事曆檢查。」
- 「重寫 `HEARTBEAT.md`，使其更簡短並專注於收件箱的後續追蹤。」

如果您希望主動進行此操作，您也可以在心跳提示詞中包含一個明確的行，例如：「如果檢查清單過期，請用更好的版本更新 HEARTBEAT.md。」

安全注意：請勿將機密（API 金鑰、電話號碼、私人權杖）放入 `HEARTBEAT.md` —— 它會成為提示詞上下文的一部分。

## 手動喚醒（隨需）

您可以將系統事件加入佇列並透過以下方式觸發立即心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果多個代理程式已配置 `heartbeat`，手動喚醒會立即執行每個代理程式的心跳。

使用 `--mode next-heartbeat` 以等待下一次排程的刻度。

## 推理傳遞（選用）

預設情況下，心跳僅傳遞最終的「答案」載荷。

如果您希望提高透明度，請啟用：

- `agents.defaults.heartbeat.includeReasoning: true`

啟用後，心跳也會傳遞一條單獨的訊息，前綴為 `Reasoning:`（形狀與 `/reasoning on` 相同）。當代理程式正在管理多個會話/codexes，且您希望查看它決定 ping 您的原因時，這會很有用 —— 但這也可能洩漏比您預期更多的內部細節。建議在群組聊天中將其關閉。

## 成本意識

心跳執行完整的代理程式輪次。較短的間隔會消耗更多 token。要降低成本：

- 使用 `isolatedSession: true` 以避免傳送完整的對話歷史（每次執行從約 100K token 減少到約 2-5K）。
- 使用 `lightContext: true` 將啟動檔案限制為僅 `HEARTBEAT.md`。
- 設定更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 為小量。
- 如果您只需要內部狀態更新，請使用 `target: "none"`。

## 相關

- [Automation & Tasks](/en/automation) — 一覽所有自動化機制
- [Background Tasks](/en/automation/tasks) — 追蹤分離工作的方式
- [Timezone](/en/concepts/timezone) — 時區如何影響心跳排程
- [Troubleshooting](/en/automation/cron-jobs#troubleshooting) — 除錯自動化問題
