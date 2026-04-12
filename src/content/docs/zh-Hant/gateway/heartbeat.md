---
summary: "Heartbeat 輪詢訊息與通知規則"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
---

# Heartbeat (Gateway)

> **心跳 vs Cron？** 請參閱 [自動化與任務](/en/automation) 以獲取關於何時使用何者的指南。

Heartbeat 在主會話中執行 **週期性代理輪次**，以便模型能夠
呈現需要注意的事項，而不會對您造成干擾。

心跳是排定的主工作階段輪次——它並**不**會建立 [背景任務](/en/automation/tasks) 記錄。
任務記錄是用於分離的工作（ACP 執行、子代理、獨立的 cron 工作）。

疑難排解：[排定任務](/en/automation/cron-jobs#troubleshooting)

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
- 心跳提示會**逐字**作為使用者訊息發送。當預設代理啟用心跳，且該執行在內部被標記時，
  系統提示僅會包含「Heartbeat」章節。
- 當使用 `0m` 停用心跳時，正常執行也會從啟動環境中省略 `HEARTBEAT.md`，
  以便模型不會看到僅限心跳的指令。
- 活動時間 (`heartbeat.activeHours`) 會在設定的時區中檢查。
  在時間範圍之外，心跳將會被跳過，直到範圍內的下一個刻度。

## 心跳提示的用途

預設提示是刻意廣泛的：

- **背景任務**：「Consider outstanding tasks」（考慮未完成的任務）會敦促代理檢閱
  後續追蹤項目（收件匣、行事曆、提醒、佇列工作）並提出任何緊急事項。
- **人員簽到**：「Checkup sometimes on your human during day time」（有時在白天檢查您的人類）會敦促
  偶爾輕量的「您需要什麼嗎？」訊息，但透過使用您設定的本地時區來避免夜間干擾
  （請參閱 [/concepts/timezone](/en/concepts/timezone)）。

心跳可以對已完成的 [背景任務](/en/automation/tasks) 做出反應，但心跳執行本身並不會建立任務記錄。

如果您希望心跳執行非常特定的工作（例如「檢查 Gmail PubSub
統計資料」或「驗證閘道健全狀態」），請將 `agents.defaults.heartbeat.prompt` （或
`agents.list[].heartbeat.prompt`） 設定為自訂內容（將會逐字發送）。

## 回應合約

- 如果沒有需要留意的事項，請回覆 **`HEARTBEAT_OK`**。
- 在心跳執行期間，當 `HEARTBEAT_OK` 出現在回覆的
  **開頭或結尾** 時，OpenClaw 會將其視為確認。該權杖會被移除，如果剩餘內容 **≤ `ackMaxChars`** （預設值：300），回覆將會被捨棄。
- 如果 `HEARTBEAT_OK` 出現在回覆的**中間**，則不會對其進行特殊處理。
- 對於警報，**請勿**包含 `HEARTBEAT_OK`；僅傳回警報文字。

在心跳之外，訊息開頭/結尾的遊離 `HEARTBEAT_OK` 會被剝離並記錄；僅包含 `HEARTBEAT_OK` 的訊息會被丟棄。

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
- `agents.list[].heartbeat` 在其上進行合併；如果任何代理擁有 `heartbeat` 區塊，**僅這些代理**會執行心跳。
- `channels.defaults.heartbeat` 為所有頻道設定可見性預設值。
- `channels.<channel>.heartbeat` 會覆寫頻道預設值。
- `channels.<channel>.accounts.<id>.heartbeat` (多重帳號頻道) 會覆寫個別頻道設定。

### 個別代理心跳

如果任何 `agents.list[]` 項目包含 `heartbeat` 區塊，**僅這些代理**
會執行心跳。個別代理區塊會在 `agents.defaults.heartbeat` 之上合併
(因此您可以設定一次共享預設值，並針對每個代理進行覆寫)。

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

### 啟用時數範例

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

在此時間範圍之外 (美東時間上午 9 點之前或晚上 10 點之後)，會跳過心跳。時間範圍內下一個預定的執行將會正常運作。

### 24/7 設定

如果您希望心跳全天運作，請使用下列其中一種模式：

- 完全省略 `activeHours` (沒有時間視窗限制；這是預設行為)。
- 設定全天時間視窗：`activeHours: { start: "00:00", end: "24:00" }`。

請勿設定相同的 `start` 和 `end` 時間 (例如 `08:00` 到 `08:00`)。
這會被視為零寬度視窗，因此會永遠跳過心跳。

### 多重帳號範例

使用 `accountId` 以針對多重帳號頻道 (例如 Telegram) 上的特定帳號：

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

### 欄位備註

- `every`：心跳間隔 (持續時間字串；預設單位 = 分鐘)。
- `model`：心跳執行的可選模型覆寫 (`provider/model`)。
- `includeReasoning`：啟用後，當有額外的 `Reasoning:` 訊息可用時也一併傳送 (形狀與 `/reasoning on` 相同)。
- `lightContext`：若為 true，心跳執行會使用輕量級啟動上下文，並且僅保留工作區啟動檔案中的 `HEARTBEAT.md`。
- `isolatedSession`：若為 true，每次心跳會在沒有先前對話歷史的新會話中執行。使用與 cron `sessionTarget: "isolated"` 相同的隔離模式。大幅降低每次心跳的 token 成本。與 `lightContext: true` 結合以實現最大程度的節省。傳送路由仍使用主會話上下文。
- `session`：心跳執行的可選會話金鑰。
  - `main` (預設)：代理的主會話。
  - 明確的會話金鑰 (從 `openclaw sessions --json` 複製或來自 [sessions CLI](/en/cli/sessions))。
  - 會話金鑰格式：請參閱 [Sessions](/en/concepts/session) 和 [Groups](/en/channels/groups)。
- `target`：
  - `last`：傳送到最後使用的外部頻道。
  - 明確頻道：任何已設定的頻道或外掛 ID，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
  - `none` (預設)：執行心跳但**不要對外傳送**。
- `directPolicy`：控制直接/DM 傳送行為：
  - `allow` (預設)：允許直接/DM 心跳傳送。
  - `block`：抑制直接/DM 傳送 (`reason=dm-blocked`)。
- `to`：可選的收件者覆寫 (頻道特定 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID)。對於 Telegram 主題/串，請使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`：多帳號通道的選用帳號 ID。當 `target: "last"` 時，如果解析出的最終通道支援帳號，帳號 ID 套用於該通道；否則將被忽略。如果帳號 ID 不符合解析通道的已設定帳號，將跳過傳送。
- `prompt`：覆寫預設提示內容（不會合併）。
- `ackMaxChars`：在 `HEARTBEAT_OK` 之後、傳送前允許的最大字元數。
- `suppressToolErrorWarnings`：當為 true 時，在心跳執行期間隱藏工具錯誤警告的 payload。
- `activeHours`：將心跳執行限制在特定時間視窗內。包含 `start` (HH:MM，包含；請使用 `00:00` 表示一天開始)、`end` (HH:MM，不包含；允許使用 `24:00` 表示一天結束) 以及選用的 `timezone` 的物件。
  - 省略或設為 `"user"`：若已設定則使用您的 `agents.defaults.userTimezone`，否則回退至主機系統時區。
  - `"local"`：一律使用主機系統時區。
  - 任何 IANA 識別碼 (例如 `America/New_York`)：直接使用；若無效，則回退至上述 `"user"` 的行為。
  - `start` 和 `end` 在有效視窗內不得相等；若相等則視為零寬度（即永遠在視窗外）。
  - 在有效視窗外，心跳將被跳過，直到視窗內的下一個刻度。

## 傳送行為

- 心跳預設於代理的主工作階段中執行 (`agent:<id>:<mainKey>`)，
  或當 `session.scope = "global"` 時在 `global` 中執行。設定 `session` 以覆寫為
  特定通道工作階段 (Discord/WhatsApp/等)。
- `session` 僅影響執行語境；傳送由 `target` 和 `to` 控制。
- 若要傳送至特定頻道/收件人，請設定 `target` + `to`。使用
  `target: "last"` 時，傳送會使用該工作階段的最後一個外部頻道。
- 心跳傳送預設允許直接/DM 目標。設定 `directPolicy: "block"` 可在仍執行心跳週期的同時，抑制直接目標的傳送。
- 如果主佇列忙碌，心跳將被跳過並稍後重試。
- 如果 `target` 解析結果沒有外部目的地，仍會執行執行但不會
  傳送任何外寄訊息。
- 如果 `showOk`、`showAlerts` 和 `useIndicator` 全部停用，執行會一開始就跳過並視為 `reason=alerts-disabled`。
- 如果僅停用警示傳送，OpenClaw 仍可執行心跳、更新到期任務的時間戳記、還原工作階段閒置時間戳記，並抑制外寄警示內容。
- 僅限心跳的回覆**不會**保持工作階段活躍；會還原最後一個 `updatedAt`
  以使閒置到期正常運作。
- 分離的[背景任務](/en/automation/tasks)可以將系統事件加入佇列，並在主工作階段應快速注意某事時喚醒心跳。該喚醒動作不會讓心跳執行背景任務。

## 可見性控制

預設情況下，在傳遞警示內容時會隱藏 `HEARTBEAT_OK` 確認訊息。您可以針對每個頻道或每個帳戶進行調整：

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

- `showOk`：當模型僅傳回 OK 回覆時，傳送 `HEARTBEAT_OK` 確認訊息。
- `showAlerts`：當模型傳回非 OK 回覆時，傳送警示內容。
- `useIndicator`：為 UI 狀態介面發出指示器事件。

如果**全部三個**皆為 false，OpenClaw 將完全跳過心跳執行（不進行模型呼叫）。

### 每個頻道與每個帳戶的範例比較

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
| 預設行為（靜默 OK，開啟警示） | _(無需設定)_                                                                             |
| 完全靜默（無訊息、無指示器）  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 僅指示器（無訊息）            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 僅在一個頻道中確認            | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（選用）

如果工作區中存在 `HEARTBEAT.md` 檔案，預設提示會告訴代理程式閱讀它。將其視為您的「心跳檢查清單」：短小、穩定，且每 30 分鐘包含一次都很安全。

在正常執行時，只有在為預設代理程式啟用心跳指引時，才會注入 `HEARTBEAT.md`。使用 `0m` 停用心跳週期或設定 `includeSystemPromptSection: false` 會將其從正常啟動上下文中排除。

如果 `HEARTBEAT.md` 存在但實際上是空的（僅有空白行和像 `# Heading` 這樣的 markdown 標題），OpenClaw 會跳過心跳執行以節省 API 呼叫。該跳過會被回報為 `reason=empty-heartbeat-file`。如果檔案不存在，心跳仍會執行，由模型決定做什麼。

保持微小（簡短的檢查清單或提醒）以避免提示膨脹。

`HEARTBEAT.md` 範例：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
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

行為：

- OpenClaw 會解析 `tasks:` 區塊，並根據其自己的 `interval` 檢查每個任務。
- 只有**到期**的任務會包含在該次心跳的提示中。
- 如果沒有任務到期，心跳將會完全跳過（`reason=no-tasks-due`），以避免浪費模型呼叫。
- `HEARTBEAT.md` 中的非任務內容會被保留，並作為額外上下文附加在到期任務清單之後。
- 任務最後執行的時間戳記會儲存在工作階段狀態（`heartbeatTaskState`）中，因此間隔設定在正常重啟後仍然有效。
- 只有在心跳執行完成其正常回覆路徑後，任務時間戳記才會前進。跳過的 `empty-heartbeat-file` / `no-tasks-due` 執行不會將任務標記為已完成。

當您希望一個心跳檔案包含多個定期檢查，而不想每次都為所有檢查付費時，任務模式非常有用。

### 代理程式可以更新 HEARTBEAT.md 嗎？

可以 —— 如果您要求它這樣做。

`HEARTBEAT.md` 只是代理工作區中的一個普通檔案，因此您可以在（正常聊天中）告訴代理類似以下的內容：

- “更新 `HEARTBEAT.md` 以加入每日日曆檢查。”
- “重寫 `HEARTBEAT.md` 使其更簡短，並專注於收件箱後續追蹤。”

如果您希望主動進行此操作，您也可以在心跳提示中包含一個明確的行，例如：“如果檢查清單過時，請用更好的版本更新 HEARTBEAT.md。”

安全提示：請勿將機密（API 金鑰、電話號碼、私人令牌）放入 `HEARTBEAT.md` — 它會成為提示上下文的一部分。

## 手動喚醒（按需）

您可以將系統事件加入佇列並透過以下方式觸發立即的心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果多個代理配置了 `heartbeat`，手動喚醒會立即執行每個代理的心跳。

使用 `--mode next-heartbeat` 以等待下一個排定的刻度。

## 推論交付（選用）

根據預設，心跳僅交付最終的「答案」載荷。

如果您希望透明化，請啟用：

- `agents.defaults.heartbeat.includeReasoning: true`

啟用後，心跳也會交付一則單獨的前綴為 `Reasoning:` 的訊息（形狀與 `/reasoning on` 相同）。當代理管理多個工作階段/codex 時，這很有用，因為您可能想了解它決定通知您的原因 — 但這也可能洩漏比您預期更多的內部細節。在群組聊天中建議將其關閉。

## 成本考量

心跳執行完整的代理回合。較短的間隔會消耗更多的權杖。若要降低成本：

- 使用 `isolatedSession: true` 以避免發送完整的對話記錄（從約 100K 權杖減少至每次執行約 2-5K）。
- 使用 `lightContext: true` 將引導檔案限制僅為 `HEARTBEAT.md`。
- 設定較便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 簡短。
- 如果您只想要內部狀態更新，請使用 `target: "none"`。

## 相關

- [Automation & Tasks](/en/automation) — 所有自動化機制一覽
- [Background Tasks](/en/automation/tasks) — 如何追蹤分離的工作
- [時區](/en/concepts/timezone) — 時區如何影響心跳排程
- [疑難排解](/en/automation/cron-jobs#troubleshooting) — 自動化問題的偵錯
