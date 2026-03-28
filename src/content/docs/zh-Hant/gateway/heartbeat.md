---
summary: "心跳輪詢訊息與通知規則"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "心跳"
---

# 心跳 (Gateway)

> **心跳 vs Cron？** 請參閱 [Cron vs Heartbeat](/zh-Hant/automation/cron-vs-heartbeat) 以獲得關於何時使用各項的指引。

心跳在主會話中執行**週期性代理輪次**，以便模型能夠
呈現任何需要注意的事項，而不會對您造成騷擾。

疑難排解：[/automation/troubleshooting](/zh-Hant/automation/troubleshooting)

## 快速入門 (初學者)

1. 保持啟用心跳（預設為 `30m`，若為 Anthropic OAuth/setup-token 則為 `1h`）或設定您自己的頻率。
2. 在代理工作區中建立一個小型的 `HEARTBEAT.md` 檢查清單（可選但建議）。
3. 決定心跳訊息應發往何處（`target: "none"` 為預設值；設定 `target: "last"` 以路由至最後一個聯絡人）。
4. 選用：啟用心跳推理傳遞以提高透明度。
5. 選用：如果心跳執行只需要 `HEARTBEAT.md`，則使用輕量級啟動上下文。
6. 選用：啟用獨立工作階段以避免在每次心跳時發送完整的對話記錄。
7. 選用：將心跳限制在活動時間內（當地時間）。

範例設定：

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

- 間隔：`30m`（或當偵測到 Anthropic OAuth/setup-token 為驗證模式時為 `1h`）。設定 `agents.defaults.heartbeat.every` 或個別代理的 `agents.list[].heartbeat.every`；使用 `0m` 以停用。
- 提示詞主體（可透過 `agents.defaults.heartbeat.prompt` 設定）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 心跳提示會作為使用者訊息**逐字**發送。系統提示包含「Heartbeat」部分，且該次執行會在內部被標記。
- 會在設定的時區中檢查啟用時段 (`heartbeat.activeHours`)。在時段之外，心跳會被跳過，直到時段內的下一個檢查點。

## 心跳提示的用途

預設提示是刻意設計得很廣泛的：

- **背景任務**：「考慮未完成的任務」會推動代理檢查後續事項（收件匣、行事曆、提醒、佇列中的工作），並提出任何緊急事項。
- **人類確認**：「白天有時檢查一下你的人類」會推動偶爾發送輕量的「你有什麼需要的嗎？」訊息，但透過使用您設定的本地時區來避免夜間垃圾訊息（請參閱 [/concepts/timezone](/zh-Hant/concepts/timezone)）。

如果您希望心跳執行非常具體的任務（例如「檢查 Gmail PubSub 統計資料」或「驗證 Gateway 健康狀況」），請將 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）設為自訂內容（將逐字發送）。

## 回應合約

- 如果無需關注，請回覆 **`HEARTBEAT_OK`**。
- 在心跳執行期間，當 `HEARTBEAT_OK` 出現在回覆的**開頭或結尾**時，OpenClaw 會將其視為 ack（確認）。該標記會被移除，如果剩餘內容**≤ `ackMaxChars`**（預設值：300），則該回覆將被丟棄。
- 如果 `HEARTBEAT_OK` 出現在回覆的**中間**，則不會對其進行特殊處理。
- 對於警報，**請勿**包含 `HEARTBEAT_OK`；僅回傳警報文字。

在心跳之外，訊息開頭/結尾的零散 `HEARTBEAT_OK` 會被剝除並記錄；若訊息僅包含 `HEARTBEAT_OK`，則會被丟棄。

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
- `agents.list[].heartbeat` 會在頂層合併；如果有任何代理程式擁有 `heartbeat` 區塊，**僅有那些代理程式** 會執行心跳。
- `channels.defaults.heartbeat` 設定所有通道的預設可見性。
- `channels.<channel>.heartbeat` 會覆寫通道預設值。
- `channels.<channel>.accounts.<id>.heartbeat`（多帳號通道）會覆寫各通道設定。

### Per-agent heartbeats

如果任何 `agents.list[]` 條目包含 `heartbeat` 區塊，**僅有這些代理程式**
會執行心跳。個別代理程式的區塊會合併在 `agents.defaults.heartbeat` 之上
（因此您可以設定一次共用的預設值，然後針對每個代理程式進行覆寫）。

範例：兩個代理程式，僅第二個代理程式執行心跳。

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

在此時段之外（美國東部時間上午 9 點之前或晚上 10 點之後），將會跳過心跳。時段內下一個排定的執行會正常運作。

### 24/7 設定

如果您希望心跳整天執行，請使用下列其中一種模式：

- 完全省略 `activeHours`（沒有時間視窗限制；這是預設行為）。
- 設定全天時段：`activeHours: { start: "00:00", end: "24:00" }`。

請不要設定相同的 `start` 和 `end` 時間（例如 `08:00` 到 `08:00`）。
這會被視為零寬度視窗，因此將總是跳過心跳。

### 多帳號範例

使用 `accountId` 來指定多帳號頻道（如 Telegram）上的特定帳號：

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

- `every`：心跳間隔（持續時間字串；預設單位 = 分鐘）。
- `model`：心跳執行的選用模型覆寫（`provider/model`）。
- `includeReasoning`：啟用時，一併傳送獨立的 `Reasoning:` 訊息（如有）（結構與 `/reasoning on` 相同）。
- `lightContext`：為 true 時，心跳執行會使用輕量級引導上下文，並且僅保留工作區引導檔案中的 `HEARTBEAT.md`。
- `isolatedSession`：為 true 時，每次心跳都在沒有先前對話歷史的新工作階段中執行。使用與 cron `sessionTarget: "isolated"` 相同的隔離模式。大幅降低每次心跳的 token 成本。結合 `lightContext: true` 以實現最大節省。傳送路由仍使用主工作階段上下文。
- `session`：心跳執行的選用工作階段金鑰。
  - `main`（預設值）：代理主工作階段。
  - 明確的工作階段金鑰（從 `openclaw sessions --json` 或 [sessions CLI](/zh-Hant/cli/sessions) 複製）。
  - 會話金鑰格式：請參閱 [Sessions](/zh-Hant/concepts/session) 和 [Groups](/zh-Hant/channels/groups)。
- `target`：
  - `last`：傳送至上次使用的外部頻道。
  - 指定頻道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`。
  - `none` (預設值)：執行心跳但 **不對外傳送**。
- `directPolicy`：控制直接/私訊傳送行為：
  - `allow`（預設）：允許直接/私訊心跳傳送。
  - `block`：抑制直接/私訊傳送 (`reason=dm-blocked`)。
- `to`：可選的收件者覆寫（頻道特定 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID）。對於 Telegram 主題/串，請使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`: 多帳戶通道的選用帳戶 ID。當 `target: "last"` 時，如果解析的最後一個通道支援帳戶，帳戶 ID 會套用於該通道；否則會被忽略。如果帳戶 ID 與解析通道的設定帳戶不符，將會跳過傳遞。
- `prompt`: 覆寫預設提示詞主體（不進行合併）。
- `ackMaxChars`：在 `HEARTBEAT_OK` 之後傳送前所允許的最大字元數。
- `suppressToolErrorWarnings`：若為 true，則在心跳運行期間抑制工具錯誤警告負載。
- `activeHours`：將心跳執行限制在時間視窗內。物件包含 `start` (HH:MM，包含；使用 `00:00` 表示一天開始)、`end` (HH:MM，不包含；允許使用 `24:00` 表示一天結束) 以及選用的 `timezone`。
  - 省略或 `"user"`：如果設置了 `agents.defaults.userTimezone`，則使用它，否則回退到主機系統時區。
  - `"local"`：始終使用主機系統時區。
  - 任何 IANA 標識符（例如 `America/New_York`）：直接使用；如果無效，則回退到上述 `"user"` 的行為。
  - `start` 和 `end` 在有效視窗內不得相等；相等的值會被視為零寬度（永遠在視窗外）。
  - 在有效視窗外，心跳會被跳過，直到視窗內的下一個 tick。

## 傳遞行為

- 預設情況下，心跳運作於代理的主工作階段中 (`agent:<id>:<mainKey>`)，
  或在 `session.scope = "global"` 時於 `global` 運作。請設定 `session` 以覆寫為
  特定的通道工作階段 (Discord/WhatsApp/等)。
- `session` 僅影響執行環境；遞送是由 `target` 和 `to` 所控制。
- 若要傳送至特定頻道/接收者，請設定 `target` + `to`。使用
  `target: "last"` 時，傳送會使用該會話的最後一個外部頻道。
- Heartbeat deliveries allow direct/DM targets by default. Set `directPolicy: "block"` to suppress direct-target sends while still running the heartbeat turn.
- If the main queue is busy, the heartbeat is skipped and retried later.
- If `target` resolves to no external destination, the run still happens but no
  outbound message is sent.
- Heartbeat-only replies do **not** keep the session alive; the last `updatedAt`
  is restored so idle expiry behaves normally.

## Visibility controls

By default, `HEARTBEAT_OK` acknowledgments are suppressed while alert content is
delivered. You can adjust this per channel or per account:

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

Precedence: per-account → per-channel → channel defaults → built-in defaults.

### What each flag does

- `showOk`：當模型回傳僅包含 OK 的回覆時，傳送 `HEARTBEAT_OK` 確認。
- `showAlerts`：當模型回傳非 OK 的回覆時，傳送警示內容。
- `useIndicator`：發出用於 UI 狀態表面的指示器事件。

如果 **這三個** 都為 false，OpenClaw 會完全跳過心跳執行（不進行模型呼叫）。

### 每個頻道與每個帳號的範例

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
| 僅在一個頻道中顯示 OK         | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（選用）

如果工作區中存在 `HEARTBEAT.md` 檔案，預設提示會告知
代理程式閱讀它。您可以將其視為您的「心跳檢查清單」：內容短小、穩定，
並且每 30 分鐘包含一次是安全的。

如果 `HEARTBEAT.md` 存在但實際上是空的（僅包含空行和像 `# Heading` 這樣的 markdown 標題），OpenClaw 會跳過心跳執行以節省 API 呼叫。
如果檔案不存在，心跳仍會執行，由模型決定要做什麼。

保持其精簡（簡短的檢查清單或提醒）以避免提示膨脹。

`HEARTBEAT.md` 範例：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### 代理程式可以更新 HEARTBEAT.md 嗎？

可以 — 如果您要求它的話。

`HEARTBEAT.md` 只是代理工作區中的一個普通檔案，因此您可以在（普通聊天中）告訴
代理程式類似以下的內容：

- 「更新 `HEARTBEAT.md` 以新增每日日曆檢查。」
- 「重寫 `HEARTBEAT.md` 使其更簡短並專注於收件箱後續追蹤。」

如果您希望主動進行此操作，也可以在心跳提示中包含一行明確的說明，例如：「如果檢查清單過時，請用更好的內容更新 HEARTBEAT.md。」

安全提示：請勿將機密（API 金鑰、電話號碼、私有 Token）放入 `HEARTBEAT.md` —— 因為它會成為提示詞上下文的一部分。

## 手動喚醒（按需）

您可以將系統事件加入佇列並使用以下方式立即觸發心跳：

```exec
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果有多個代理程式設定了 `heartbeat`，手動喚醒會立即執行這些代理程式中的每一個心跳。

使用 `--mode next-heartbeat` 等待下一次排程的週期。

## 推理傳遞（選用）

根據預設，心跳只會傳遞最終的「回答」內容。

如果您希望保持透明度，請啟用：

- `agents.defaults.heartbeat.includeReasoning: true`

啟用後，心跳也會傳送一則前綴為
`Reasoning:` 的獨立訊息（格式與 `/reasoning on` 相同）。當代理程式
正在管理多個會話/codexes，而您想了解它為何決定通知您時，這會很有用
——但這也可能洩漏比您預期更多的內部細節。建議在群組聊天中保持關閉。

## 成本考量

心跳執行完整的代理程式週期。較短的間隔會消耗更多 token。若要降低成本：

- 使用 `isolatedSession: true` 以避免傳送完整的對話紀錄（每次執行從約 100K token 降至約 2-5K token）。
- 使用 `lightContext: true` 將引導檔案限制僅為 `HEARTBEAT.md`。
- 設定較便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 為小量。
- 如果您僅想要內部狀態更新，請使用 `target: "none"`。
