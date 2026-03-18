---
summary: "Heartbeat 輪詢訊息與通知規則"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
---

# Heartbeat (閘道)

> **Heartbeat vs Cron？** 請參閱 [Cron vs Heartbeat](/zh-Hant/automation/cron-vs-heartbeat) 以獲得關於何時使用各項功能的指引。

Heartbeat 在主會話中執行**定期代理程式輪次**，以便模型能夠
提示需要注意的事項，而不會對您造成騷擾。

疑難排解：[/automation/troubleshooting](/zh-Hant/automation/troubleshooting)

## 快速入門（初學者）

1. 保持啟用 heartbeat（預設為 `30m`，若是 Anthropic OAuth/setup-token 則為 `1h`），或設定您自己的頻率。
2. 在代理程式工作區中建立一個小型 `HEARTBEAT.md` 檢查清單（可選但建議）。
3. 決定 heartbeat 訊息應傳送至何處（`target: "none"` 為預設值；設定 `target: "last"` 以路由至最後一個聯絡人）。
4. 可選：啟用 heartbeat 推理傳遞以提高透明度。
5. 可選：如果 heartbeat 執行只需要 `HEARTBEAT.md`，則使用輕量級啟動上下文。
6. 可選：啟用獨立會話，以避免每次 heartbeat 都發送完整的對話歷史記錄。
7. 可選：將 heartbeat 限制在啟用時段（本地時間）內。

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

- 間隔：`30m`（若偵測到的驗證模式為 Anthropic OAuth/setup-token，則為 `1h`）。設定 `agents.defaults.heartbeat.every` 或各代理程式的 `agents.list[].heartbeat.every`；使用 `0m` 以停用。
- 提示詞主體（可透過 `agents.defaults.heartbeat.prompt` 設定）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Heartbeat 提示詞會**逐字**作為使用者訊息發送。系統
  提示詞包含「Heartbeat」部分，且該執行會在內部被標記。
- 啟用時段（`heartbeat.activeHours`）會在設定的時區中進行檢查。
  在時段之外，heartbeat 將會被跳過，直到時段內的下一個刻度。

## Heartbeat 提示詞的用途

預設提示詞刻意設計得涵蓋範圍廣泛：

- **背景任務**：「考慮未完成的任務」會提示 agent 檢視
  後續工作（收件匣、日曆、提醒、佇列中的工作），並提出任何緊急事項。
- **人員確認**：「有時在白天查看你的人類」會提示偶爾發送輕量級的「你需要什麼嗎？」訊息，但透過使用您設定的本地時區，避免夜間騷擾（請參閱 [/concepts/timezone](/zh-Hant/concepts/timezone)）。

如果您希望心跳執行非常具體的操作（例如「檢查 Gmail PubSub 統計數據」或「驗證 Gateway 健康狀況」），請將 `agents.defaults.heartbeat.prompt`（或
`agents.list[].heartbeat.prompt`）設為自訂內容（原樣發送）。

## 回應契約

- 如果無需關注，請回覆 **`HEARTBEAT_OK`**。
- 在心跳執行期間，當 `HEARTBEAT_OK` 出現在回覆的 **開頭或結尾** 時，OpenClaw 會將其視為確認（ack）。此 token 將被移除，如果剩餘內容 **≤ `ackMaxChars`**（預設值：300），則回覆將被丟棄。
- 如果 `HEARTBEAT_OK` 出現在回覆的 **中間**，則不會受到特殊處理。
- 對於警報，**請勿**包含 `HEARTBEAT_OK`；僅回傳警報文字。

在心跳之外，訊息開頭/結尾處多餘的 `HEARTBEAT_OK` 將被移除並記錄；如果訊息僅包含 `HEARTBEAT_OK`，則將該訊息丟棄。

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
- `agents.list[].heartbeat` 在其上進行合併；如果任何 agent 擁有 `heartbeat` 區塊，**則僅那些 agent** 會執行心跳。
- `channels.defaults.heartbeat` 為所有頻道設定可見性預設值。
- `channels.<channel>.heartbeat` 會覆蓋頻道預設值。
- `channels.<channel>.accounts.<id>.heartbeat`（多帳號頻道）會覆寫各頻道設定。

### 各 Agent 心跳

如果任何 `agents.list[]` 項目包含 `heartbeat` 區塊，**則僅那些 agents**
會執行心跳。各 agent 區塊會在 `agents.defaults.heartbeat` 之上合併
（因此您可以設定一次共用的預設值，並針對各 agent 進行覆寫）。

範例：兩個 agents，僅第二個 agent 執行心跳。

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

在此時間範圍之外（東部時間上午 9 點之前或晚上 10 點之後），將跳過心跳。在該時間範圍內的下一個排定刻度將正常運行。

### 24/7 設定

如果您希望心跳全天運行，請使用以下模式之一：

- 完全省略 `activeHours`（無時間視窗限制；這是預設行為）。
- 設定全天視窗：`activeHours: { start: "00:00", end: "24:00" }`。

請勿設定相同的 `start` 和 `end` 時間（例如從 `08:00` 到 `08:00`）。
這將被視為零寬度視窗，因此心跳將始終被跳過。

### 多帳號範例

使用 `accountId` 來鎖定多帳號通道（如 Telegram）上的特定帳號：

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

### 實務備註

- `every`：心跳間隔（持續時間字串；預設單位 = 分鐘）。
- `model`：心跳執行的可選模型覆寫（`provider/model`）。
- `includeReasoning`：啟用後，當有提供時，也會傳送單獨的 `Reasoning:` 訊息（形狀與 `/reasoning on` 相同）。
- `lightContext`：設為 true 時，心跳執行會使用輕量級啟動上下文，並僅保留工作區啟動檔案中的 `HEARTBEAT.md`。
- `isolatedSession`：設為 true 時，每次心跳都在新的會話中運行，沒有先前的對話歷史記錄。使用與 cron `sessionTarget: "isolated"` 相同的隔離模式。大幅降低每次心跳的 token 成本。結合 `lightContext: true` 以實現最大程度的節省。傳遞路由仍使用主會話上下文。
- `session`：心跳執行的可選會話金鑰。
  - `main`（預設值）：代理主會話。
  - 明確的會話金鑰（從 `openclaw sessions --json` 複製，或透過 [sessions CLI](/zh-Hant/cli/sessions)）。
  - 會話金鑰格式：請參閱 [Sessions](/zh-Hant/concepts/session) 和 [Groups](/zh-Hant/channels/groups)。
- `target`：
  - `last`：傳送至最後使用的外部頻道。
  - 明確頻道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`。
  - `none`（預設）：執行心跳但**不進行外部傳送**。
- `directPolicy`：控制直接/DM 傳送行為：
  - `allow`（預設）：允許直接/DM 心跳傳送。
  - `block`：抑制直接/DM 傳送（`reason=dm-blocked`）。
- `to`：可選的收件者覆寫（頻道特定 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID）。對於 Telegram 主題/串，請使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`：多帳號頻道的可選帳號 ID。當 `target: "last"` 時，帳號 ID 會套用至解析出的最後一個頻道（如果它支援帳號）；否則會被忽略。如果帳號 ID 與解析頻道的設定帳號不符，將會跳過傳送。
- `prompt`：覆寫預設提示詞主體（不會合併）。
- `ackMaxChars`：在 `HEARTBEAT_OK` 之後傳送前允許的最大字元數。
- `suppressToolErrorWarnings`：設為 true 時，會在心跳執行期間抑制工具錯誤警告載荷。
- `activeHours`：將心跳執行限制在時間視窗內。物件包含 `start`（HH:MM，包含；使用 `00:00` 代表一天開始）、`end`（HH:MM，不包含；`24:00` 代表一天結束），以及可選的 `timezone`。
  - 省略或 `"user"`：如果已設定，則使用您的 `agents.defaults.userTimezone`，否則回退至主機系統時區。
  - `"local"`：一律使用主機系統時區。
  - 任何 IANA 識別碼（例如 `America/New_York`）：直接使用；如果無效，則回退到上述 `"user"` 的行為。
  - 對於活動視窗，`start` 和 `end` 不得相等；相等的值被視為零寬度（始終在視窗外）。
  - 在活動視窗之外，心跳會被跳過，直到視窗內的下一個刻度。

## 遞送行為

- 預設情況下，心跳在代理的主要會話中執行（`agent:<id>:<mainKey>`），
  或在 `session.scope = "global"` 時於 `global` 中執行。設定 `session` 以覆蓋至
  特定的通道會話（Discord/WhatsApp 等）。
- `session` 僅影響執行上下文；遞送由 `target` 和 `to` 控制。
- 若要遞送至特定通道/接收者，請設定 `target` + `to`。使用
  `target: "last"` 時，遞送使用該會話的最後一個外部通道。
- 預設情況下，心跳遞送允許直接/私訊目標。設定 `directPolicy: "block"` 以在仍執行心跳週期時抑制直接目標傳送。
- 如果主佇列忙碌，心跳會被跳過並稍後重試。
- 如果 `target` 解析為無外部目的地，執行仍會發生，但不會
  傳送外寄訊息。
- 僅限心跳的回應**不**會保持會話活躍；會恢復最後一個 `updatedAt`
  以使閒置過期正常運作。

## 可見度控制

預設情況下，在傳遞警示內容時會抑制 `HEARTBEAT_OK` 確認。您可以針對每個通道或每個帳戶進行調整：

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

優先順序：每個帳戶 → 每個通道 → 通道預設值 → 內建預設值。

### 每個旗標的作用

- `showOk`：當模型返回僅 OK 的回應時，傳送 `HEARTBEAT_OK` 確認。
- `showAlerts`：當模型返回非 OK 的回應時，傳送警示內容。
- `useIndicator`：為 UI 狀態表面發出指示器事件。

如果這三個**全部**為 false，OpenClaw 將完全跳過心跳執行（不呼叫模型）。

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

| 目標                          | 設定                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| 預設行為（靜默 OK，開啟警示） | （無需設定）                                                                             |
| 完全靜默（無訊息，無指示器）  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 僅指示器（無訊息）            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 僅在一個頻道顯示 OK           | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（選用）

如果工作區中存在 `HEARTBEAT.md` 檔案，預設提示會告訴
agent 閱讀它。可以將其視為您的「心跳檢查清單」：短小、穩定，
且每 30 分鐘包含一次都很安全。

如果 `HEARTBEAT.md` 存在但實際上是空的（僅包含空白行和 markdown
標題，如 `# Heading`），OpenClaw 將跳過心跳執行以節省 API 呼叫。
如果檔案不存在，心跳仍會執行，由模型決定要做什麼。

保持它短小（簡短的檢查清單或提醒），以避免提示膨脹。

`HEARTBEAT.md` 範例：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### Agent 可以更新 HEARTBEAT.md 嗎？

可以 — 如果您要求它這樣做。

`HEARTBEAT.md` 只是 agent 工作區中的一個普通檔案，因此您可以透過
（在一般聊天中）告訴 agent 類似以下的內容：

- 「更新 `HEARTBEAT.md` 以新增每日日曆檢查。」
- 「重寫 `HEARTBEAT.md`，使其更簡短並專注於收件匣後續追蹤。」

如果您希望主動發生這種情況，您也可以在您的心跳提示中包含一個明確的行，
例如：「如果檢查清單變得過時，請用更好的內容更新 HEARTBEAT.md。」

安全提示：請勿將機密（API 金鑰、電話號碼、私人權杖）放入
`HEARTBEAT.md` — 它將成為提示語境的一部分。

## 手喚醒（按需）

您可以將系統事件加入佇列並透過以下方式觸發立即心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果有多個 agent 設定了 `heartbeat`，手動喚醒會立即執行每個
agent 的心跳。

使用 `--mode next-heartbeat` 等待下一次排程的週期。

## 推理傳遞（選用）

根據預設，心跳僅傳遞最終的「回答」內容。

如果您希望透明化，請啟用：

- `agents.defaults.heartbeat.includeReasoning: true`

啟用後，心跳也會傳送一則額外的訊息，前綴為
`Reasoning:` （形狀與 `/reasoning on` 相同）。當代理程式
正在管理多個 session/codex，而您想了解它為何決定傳送通知給您時，這會很有用 —
但它也可能洩漏比您預期更多的內部細節。建議在群組聊天中將其關閉。

## 成本考量

心跳會執行完整的代理程式輪次。較短的間隔會消耗更多的 token。若要降低成本：

- 使用 `isolatedSession: true` 以避免傳送完整的對話記錄（大約從每次執行 100K token 降至 2-5K）。
- 使用 `lightContext: true` 將 bootstrap 檔案限制為僅 `HEARTBEAT.md`。
- 設定較便宜的 `model` （例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 為小型。
- 如果您只需要內部狀態更新，請使用 `target: "none"`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
