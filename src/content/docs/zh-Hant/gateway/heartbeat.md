---
summary: "Heartbeat 輪詢訊息與通知規則"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
---

# Heartbeat (Gateway)

> **Heartbeat vs Cron?** 請參閱 [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat) 以取得關於何時使用各自的指引。

Heartbeat 在主會話中執行 **週期性代理輪次**，以便模型能夠
呈現需要注意的事項，而不會對您造成干擾。

疑難排解：[/automation/troubleshooting](/en/automation/troubleshooting)

## 快速入門 (初學者)

1. 保持啟用 heartbeat (預設為 `30m`，或是針對 Anthropic OAuth/setup-token 的 `1h`)，或設定您自己的頻率。
2. 在代理工作區中建立一個微小的 `HEARTBEAT.md` 檢查清單 (可選但建議)。
3. 決定 heartbeat 訊息應傳送至何處 (`target: "none"` 為預設值；設定 `target: "last"` 以路由至最後一位聯絡人)。
4. 可選：啟用 heartbeat 推理傳送以提高透明度。
5. 可選：如果 heartbeat 執行只需要 `HEARTBEAT.md`，請使用輕量級引導上下文。
6. 可選：啟用獨立會話，以避免每次 heartbeat 都傳送完整的對話歷史記錄。
7. 可選：將 heartbeat 限制在活動時間內 (當地時間)。

組態範例：

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

- 間隔：`30m` (當偵測到 Anthropic OAuth/setup-token 為驗證模式時則為 `1h`)。設定 `agents.defaults.heartbeat.every` 或每個代理的 `agents.list[].heartbeat.every`；使用 `0m` 停用。
- 提示詞內容 (可透過 `agents.defaults.heartbeat.prompt` 設定)：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Heartbeat 提示詞會作為使用者訊息 **逐字** 傳送。系統
  提示詞包含「Heartbeat」區段，且執行作業會在內部標示。
- 活動時間 (`heartbeat.activeHours`) 會在設定的時區中檢查。
  在視窗之外，將跳過 heartbeat 直到視窗內的下一個刻度。

## Heartbeat 提示詞的用途

預設提示詞特意設定得廣泛：

- **Background tasks**：「Consider outstanding tasks」會提醒代理程式檢視後續追蹤事項（收件匣、日曆、提醒、佇列工作）並呈現任何緊急事項。
- **Human check-in**：「Checkup sometimes on your human during day time」會促使代理程式偶爾輕量地傳送「anything you need?」（您有什麼需要的嗎？）訊息，但透過使用您設定的本地時區來避免夜間騷擾（請參閱 [/concepts/timezone](/en/concepts/timezone)）。

如果您希望心跳執行非常特定的動作（例如「check Gmail PubSub stats」或「verify gateway health」），請將 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）設為自訂主體（原樣傳送）。

## Response contract

- 如果沒有需要留意的事項，請回覆 **`HEARTBEAT_OK`**。
- 在心跳執行期間，當 `HEARTBEAT_OK` 出現在回覆的 **開頭或結尾** 時，OpenClaw 會將其視為確認訊號。該 token 會被移除，如果剩餘內容 **≤ `ackMaxChars`**（預設值：300），則該回覆會被捨棄。
- 如果 `HEARTBEAT_OK` 出現在回覆的 **中間**，則不會受到特殊處理。
- 對於警報，請 **不要** 包含 `HEARTBEAT_OK`；僅傳回警報文字。

在心跳之外，訊息開頭/結尾處的孤立的 `HEARTBEAT_OK` 會被移除並記錄；如果訊息僅包含 `HEARTBEAT_OK`，則該訊息會被捨棄。

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
- `agents.list[].heartbeat` 在之上合併；如果有任何代理程式擁有 `heartbeat` 區塊，則 **只有那些代理程式** 會執行心跳。
- `channels.defaults.heartbeat` 為所有頻道設定可見性預設值。
- `channels.<channel>.heartbeat` 會覆寫頻道預設值。
- `channels.<channel>.accounts.<id>.heartbeat`（多帳號頻道）會覆寫各頻道設定。

### Per-agent heartbeats

如果有任何 `agents.list[]` 項目包含 `heartbeat` 區塊，則 **只有那些代理程式**
會執行心跳。個別代理程式區塊會在 `agents.defaults.heartbeat` 之上合併
（因此您可以設定一次共享預設值，並針對各個代理程式進行覆寫）。

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

在此時間範圍之外（美東時間上午 9 點之前或晚上 10 點之後），將跳過心跳。時間範圍內的下一個計劃刻度將正常執行。

### 24/7 設定

如果您希望心跳全天候執行，請使用以下其中一種模式：

- 完全省略 `activeHours`（無時間視窗限制；這是預設行為）。
- 設定全天時間視窗：`activeHours: { start: "00:00", end: "24:00" }`。

請勿設定相同的 `start` 和 `end` 時間（例如 `08:00` 到 `08:00`）。
這會被視為零寬度的時間視窗，因此將總是跳過心跳。

### 多重帳戶範例

使用 `accountId` 來針對多重帳戶頻道（如 Telegram）上的特定帳戶：

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

- `every`：心跳間隔（持續時間字串；預設單位 = 分鐘）。
- `model`：心跳執行的選用模型覆寫（`provider/model`）。
- `includeReasoning`：啟用時，一併傳送獨立的 `Reasoning:` 訊息（若有）（形態與 `/reasoning on` 相同）。
- `lightContext`：若為 true，心跳執行會使用輕量級啟動語境，並僅保留工作區啟動檔案中的 `HEARTBEAT.md`。
- `isolatedSession`：若為 true，每次心跳都會在沒有先前對話紀錄的新工作階段中執行。使用與 cron `sessionTarget: "isolated"` 相同的隔離模式。大幅降低每次心跳的 token 成本。結合 `lightContext: true` 可最大化節省。傳送路由仍使用主工作階段語境。
- `session`：心跳執行的選用工作階段金鑰。
  - `main`（預設值）：Agent 主工作階段。
  - 明確的工作階段金鑰（從 `openclaw sessions --json` 複製或來自 [sessions CLI](/en/cli/sessions)）。
  - 工作階段金鑰格式：請參閱 [工作階段](/en/concepts/session) 和 [群組](/en/channels/groups)。
- `target`：
  - `last`：傳送至最後使用的外部頻道。
  - 明確頻道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`。
  - `none` (預設)：執行心跳但**不要**外部傳送。
- `directPolicy`：控制直接/DM 傳送行為：
  - `allow` (預設)：允許直接/DM 心跳傳送。
  - `block`：抑制直接/DM 傳送 (`reason=dm-blocked`)。
- `to`：選用的收件者覆寫 (頻道特定 id，例如 WhatsApp 的 E.164 或 Telegram 聊天 id)。對於 Telegram 主題/討論串，請使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`：多帳號頻道的選用帳號 id。當 `target: "last"` 時，若解析的最後頻道支援帳號，則帳號 id 套用至該頻道；否則會被忽略。若帳號 id 不符合解析頻道的已設定帳號，則會跳過傳送。
- `prompt`：覆寫預設提示詞內容 (不會合併)。
- `ackMaxChars`：在 `HEARTBEAT_OK` 之後、傳送前允許的最大字元數。
- `suppressToolErrorWarnings`：若為 true，則在心跳執行期間抑制工具錯誤警告的 Payload。
- `activeHours`：將心跳執行限制在時間視窗內。物件包含 `start` (HH:MM，包含；使用 `00:00` 表示一天開始)、`end` (HH:MM，不包含；`24:00` 允許用於一天結束)，以及選用的 `timezone`。
  - 省略或 `"user"`：若設定了則使用您的 `agents.defaults.userTimezone`，否則回退至主機系統時區。
  - `"local"`：一律使用主機系統時區。
  - 任何 IANA 識別碼（例如 `America/New_York`）：直接使用；如果無效，則回退到上述 `"user"` 的行為。
  - `start` 和 `end` 不能相等以形成有效視窗；相等的值會被視為零寬度（永遠在視窗外）。
  - 在有效視窗外，心跳會被跳過，直到視窗內的下一個刻度。

## 傳遞行為

- 心跳預設在代理的主工作階段中執行（`agent:<id>:<mainKey>`），
  或在 `session.scope = "global"` 時於 `global` 執行。設定 `session` 以覆蓋為
  特定的頻道工作階段（Discord/WhatsApp 等）。
- `session` 僅影響執行上下文；傳遞由 `target` 和 `to` 控制。
- 若要傳遞到特定頻道/收件人，請設定 `target` + `to`。若使用
  `target: "last"`，傳遞會使用該工作階段的最後一個外部頻道。
- 心跳傳遞預設允許直接/私人訊息目標。設定 `directPolicy: "block"` 以在仍執行心跳回合時，抑制傳送給直接目標。
- 如果主佇列忙碌，心跳會被跳過並稍後重試。
- 如果 `target` 解析為沒有外部目的地，執行仍會發生但不會
  傳送外寄訊息。
- 僅限心跳的回覆**不會**保持工作階段存活；會恢復最後的 `updatedAt`
  以使閒置過期正常運作。

## 可見度控制

預設情況下，`HEARTBEAT_OK` 確認訊息會在傳遞警示內容時被
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

優先順序：per-account → per-channel → channel defaults → built-in defaults。

### 每個旗標的作用

- `showOk`：當模型僅回傳 OK 回覆時，發送 `HEARTBEAT_OK` 確認訊息。
- `showAlerts`：當模型回傳非 OK 回覆時，發送警示內容。
- `useIndicator`：為 UI 狀態表面發出指示器事件。

如果**這三個**都為 false，OpenClaw 會完全跳過此次心跳執行（不呼叫模型）。

### Per-channel vs per-account 範例

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

| 目標                          | 配置                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| 預設行為（靜默 OK，開啟警示） | _（無需配置）_                                                                           |
| 完全靜默（無訊息，無指示器）  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 僅指示器（無訊息）            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 僅在一個頻道顯示 OK           | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (選用)

如果工作區中存在 `HEARTBEAT.md` 檔案，預設提示會指示
agent 閱讀它。您可以將其視為您的「心跳檢查清單」：內容短小、穩定，
且每 30 分鐘包含一次都很安全。

如果 `HEARTBEAT.md` 存在但實際上是空的（只有空白行和 markdown
標題如 `# Heading`），OpenClaw 會跳過此次心跳執行以節省 API 呼叫。
如果檔案不存在，心跳仍會執行，由模型決定要做什麼。

保持簡短（簡短的檢查清單或提醒），以避免提示膨脹。

`HEARTBEAT.md` 範例：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### Agent 可以更新 HEARTBEAT.md 嗎？

可以 — 如果您要求它的話。

`HEARTBEAT.md` 只是 agent 工作區中的一個普通檔案，所以您可以告訴
agent（在一般聊天中）類似以下的內容：

- 「更新 `HEARTBEAT.md` 以加入每日日曆檢查。」
- 「重寫 `HEARTBEAT.md`，讓它更短並專注於收件匣後續追蹤。」

如果您希望主動進行這項操作，您也可以在心跳提示中包含明確的一行，
例如：「如果檢查清單過時，請用更好的版本更新 HEARTBEAT.md。」

安全提示：請勿將機密（API 金鑰、電話號碼、私人權杖）放入
`HEARTBEAT.md` — 它會成為提示內容的一部分。

## 手喚醒（按需）

您可以將系統事件加入佇列並使用以下方式立即觸發心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果有多個 agent 已配置 `heartbeat`，手動喚醒會立即執行
每個 agent 的心跳。

使用 `--mode next-heartbeat` 等待下一次計劃的執行。

## 推理傳遞（選用）

預設情況下，心跳僅傳遞最終的「答案」負載。

如果您想要透明度，請啟用：

- `agents.defaults.heartbeat.includeReasoning: true`

啟用後，心跳也會傳送一條帶有 `Reasoning:` 前綴的獨立訊息（形狀與 `/reasoning on` 相同）。當代理正在管理多個會話/codex 且您想查看其決定呼叫您的原因時，這會很有用——但也可能會洩露比您預期更多的內部細節。建議在群組聊天中將其保持關閉。

## 成本考量

心跳會執行完整的代理輪次。較短的間隔會消耗更多 token。若要降低成本：

- 使用 `isolatedSession: true` 以避免傳送完整的對話記錄（每次執行從約 100K token 降至約 2-5K）。
- 使用 `lightContext: true` 將引導檔案限制為僅 `HEARTBEAT.md`。
- 設定較便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 為小量。
- 如果您只需要內部狀態更新，請使用 `target: "none"`。
