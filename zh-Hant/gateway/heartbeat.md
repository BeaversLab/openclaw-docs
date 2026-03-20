---
summary: "心跳輪訊訊息與通知規則"
read_when:
  - 調整心跳頻率或訊息內容
  - 決定排程任務使用心跳還是 cron
title: "心跳"
---

# 心跳 (閘道)

> **心跳 vs Cron？** 請參閱 [Cron vs Heartbeat](/zh-Hant/automation/cron-vs-heartbeat) 以了解何時使用各項功能。

心跳在主會話中執行**週期性代理回合**，讓模型能夠突顯需要注意的事項，而不會對您造成干擾。

疑難排解：[/automation/troubleshooting](/zh-Hant/automation/troubleshooting)

## 快速入門 (初學者)

1. 保持心跳啟用 (預設為 `30m`，若為 Anthropic OAuth/setup-token 則為 `1h`)，或設定您自己的頻率。
2. 在代理工作區中建立一個小小的 `HEARTBEAT.md` 檢查清單 (可選但建議)。
3. 決定心跳訊息應傳送至何處 (`target: "none"` 為預設值；設定 `target: "last"` 以路由至最近一次聯絡人)。
4. 可選：啟用心跳推理傳輸以提高透明度。
5. 可選：如果心跳執行只需要 `HEARTBEAT.md`，請使用輕量級啟動內容。
6. 可選：啟用獨立會話，以避免每次心跳都發送完整的對話記錄。
7. 可選：將心跳限制在活動時間 (當地時間)。

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

- 間隔：`30m` (若偵測到的驗證模式為 Anthropic OAuth/setup-token 則為 `1h`)。設定 `agents.defaults.heartbeat.every` 或各代理的 `agents.list[].heartbeat.every`；使用 `0m` 予以停用。
- 提示詞主體 (可透過 `agents.defaults.heartbeat.prompt` 設定)：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- 心跳提示詞會**逐字** 作為使用者訊息發送。系統提示詞包含「心跳」章節，且執行會在內部標記。
- 活動時間 (`heartbeat.activeHours`) 會根據設定的時區進行檢查。
  在時間視窗外，心跳會跳過，直到視窗內的下一個刻度。

## 心跳提示詞的用途

預設提示詞刻意設計得較為廣泛：

- **背景任務**：“考慮未完成的任務”會提示代理程式檢視後續事項（收件匣、行事曆、提醒、排隊的工作）並呈現任何緊急事項。
- **人類簽到**：“在白天有時檢查你的人類”會提示偶爾發送輕量的「您有什麼需要嗎？」訊息，但透過使用您設定的本地時區來避免夜間垃圾訊息（請參閱 [/concepts/timezone](/zh-Hant/concepts/timezone)）。

如果您希望心跳執行非常特定的操作（例如「檢查 Gmail PubSub 統計資料」或「驗證閘道健康狀態」），請將 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）設定為自訂內容（原樣發送）。

## 回應約定

- 如果無需注意任何事項，請回覆 **`HEARTBEAT_OK`**。
- 在心跳執行期間，當 `HEARTBEAT_OK` 出現在回覆的**開頭或結尾**時，OpenClaw 會將其視為確認收到（ack）。該權杖會被移除，如果剩餘內容**≤ `ackMaxChars`**（預設：300），則會捨棄該回覆。
- 如果 `HEARTBEAT_OK` 出現在回覆的**中間**，則不會受到特殊處理。
- 對於警示，**請勿**包含 `HEARTBEAT_OK`；僅回傳警示文字。

在心跳之外，訊息開頭/結尾處的零散 `HEARTBEAT_OK` 會被移除並記錄；僅包含 `HEARTBEAT_OK` 的訊息會被捨棄。

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
- `agents.list[].heartbeat` 在之上合併；如果任何代理程式具有 `heartbeat` 區塊，**僅那些代理程式**會執行心跳。
- `channels.defaults.heartbeat` 為所有頻道設定可見性預設值。
- `channels.<channel>.heartbeat` 會覆寫頻道預設值。
- `channels.<channel>.accounts.<id>.heartbeat`（多帳戶頻道）會覆寫各頻道設定。

### 各代理程式心跳

如果任何 `agents.list[]` 項目包含 `heartbeat` 區塊，**僅那些代理程式**會執行心跳。各代理程式區塊會在 `agents.defaults.heartbeat` 之上合併（因此您可以設定一次共用的預設值，然後針對各代理程式進行覆寫）。

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

在此時間窗口之外（美國東部時間上午 9 點之前或晚上 10 點之後），將跳過心跳。時間窗口內的下一個排程執行將正常運作。

### 24/7 設定

如果您希望心跳全天運行，請使用以下其中一種模式：

- 完全省略 `activeHours`（無時間窗口限制；這是預設行為）。
- 設定全天時間窗口：`activeHours: { start: "00:00", end: "24:00" }`。

請勿將 `start` 和 `end` 設定為相同的時間（例如從 `08:00` 到 `08:00`）。
這將被視為零寬度窗口，因此心跳將總是被跳過。

### 多帳號範例

使用 `accountId` 鎖定多帳號通道（如 Telegram）上的特定帳號：

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

### 實地筆記

- `every`：心跳間隔（持續時間字串；預設單位 = 分鐘）。
- `model`：心跳執行的可選模型覆寫 (`provider/model`)。
- `includeReasoning`：啟用後，亦會在可用時傳送獨立的 `Reasoning:` 訊息（結構與 `/reasoning on` 相同）。
- `lightContext`：為 true 時，心跳執行將使用輕量級引導上下文，並且僅保留工作區引導檔案中的 `HEARTBEAT.md`。
- `isolatedSession`：為 true 時，每次心跳都在新的會話中執行，沒有先前的對話歷史記錄。使用與 cron `sessionTarget: "isolated"` 相同的隔離模式。大幅降低每次心跳的 token 成本。與 `lightContext: true` 結合使用以實現最大程度的節省。傳送路由仍然使用主會話上下文。
- `session`：心跳執行的可選會話金鑰。
  - `main` (預設)：代理主會話。
  - 明確的會話金鑰（從 `openclaw sessions --json` 複製，或使用 [sessions CLI](/zh-Hant/cli/sessions)）。
  - 會話金鑰格式：請參閱 [Sessions](/zh-Hant/concepts/session) 和 [Groups](/zh-Hant/channels/groups)。
- `target`：
  - `last`：發送到最後使用的外部通道。
  - 明確通道：`whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`。
  - `none` (預設值)：執行心跳但**不對外發送**。
- `directPolicy`：控制直接/私訊發送行為：
  - `allow` (預設值)：允許直接/私訊心跳發送。
  - `block`：抑制直接/私訊發送 (`reason=dm-blocked`)。
- `to`：可選的收件者覆寫 (通道特定 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID)。對於 Telegram 主題/討論串，請使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`：多帳號通道的可選帳號 ID。當為 `target: "last"` 時，如果解析出的最後一個通道支援帳號，則帳號 ID 適用於該通道；否則將被忽略。如果帳號 ID 與解析通道的已配置帳號不符，則會跳過發送。
- `prompt`：覆寫預設提示詞內容 (不會合併)。
- `ackMaxChars`：在 `HEARTBEAT_OK` 之後、發送之前允許的最大字元數。
- `suppressToolErrorWarnings`：若為 true，則在心跳執行期間抑制工具錯誤警告載荷。
- `activeHours`：將心跳執行限制在時間視窗內。包含 `start` (HH:MM，包含；對於一天開始請使用 `00:00`)、`end` (HH:MM，不包含；一天結束允許使用 `24:00`) 以及可選的 `timezone` 的物件。
  - 省略或 `"user"`：如果已設定，則使用您的 `agents.defaults.userTimezone`，否則回退至主機系統時區。
  - `"local"`：一律使用主機系統時區。
  - 任何 IANA 識別碼（例如 `America/New_York`）：直接使用；如果無效，則回退到上述 `"user"` 行為。
  - 對於啟用的視窗，`start` 和 `end` 不得相等；相等的值會被視為零寬度（即始終在視窗外）。
  - 在啟用的視窗外，心跳會被跳過，直到視窗內的下一個刻度。

## 傳遞行為

- 心跳預設在代理的主要工作階段中執行（`agent:<id>:<mainKey>`），或在 `session.scope = "global"` 時於 `global` 執行。設定 `session` 以覆寫為特定的通道工作階段（Discord/WhatsApp 等）。
- `session` 僅影響執行上下文；傳遞由 `target` 和 `to` 控制。
- 要傳遞到特定通道/接收者，請設定 `target` + `to`。若使用 `target: "last"`，傳遞會使用該工作階段的最後一個外部通道。
- 心跳傳遞預設允許直接/私人訊息目標。設定 `directPolicy: "block"` 以在仍執行心跳回合時抑制直接目標的發送。
- 如果主要佇列忙碌，心跳會被跳過並稍後重試。
- 如果 `target` 解析為沒有外部目的地，執行仍會發生但不會傳送任何外寄訊息。
- 僅心跳的回應**不會**保持工作階段存活；會恢復最後一個 `updatedAt`，以便閒置過期正常運作。

## 可見性控制

預設情況下，會在傳遞警示內容時抑制 `HEARTBEAT_OK` 確認。您可以針對每個通道或每個帳戶進行調整：

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

- `showOk`：當模型回傳僅為 OK 的回應時，傳送 `HEARTBEAT_OK` 確認。
- `showAlerts`：當模型回傳非 OK 的回應時，傳送警示內容。
- `useIndicator`：為 UI 狀態表面發出指示器事件。

如果 **全部三個** 均為 false，OpenClaw 將完全跳過心跳運行（不進行模型調用）。

### 每頻道與每帳號範例

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

| 目標                                     | 設定                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| 預設行為（靜默 OK，開啟警報） | _(無需設定)_                                                                     |
| 完全靜默（無訊息，無指示器） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 僅指示器（無訊息）             | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 僅在一個頻道中顯示 OK                  | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md（選用）

如果工作區中存在 `HEARTBEAT.md` 檔案，預設提示會告知代理
讀取它。可以將其視為您的「心跳檢查清單」：短小、穩定，並且
可以安全地每 30 分鐘包含一次。

如果 `HEARTBEAT.md` 存在但實際上是空的（僅包含空白行和 markdown
標題，如 `# Heading`），OpenClaw 會跳過心跳運行以節省 API 呼叫。
如果檔案遺失，心跳仍會運行，模型會決定要做什麼。

請保持其短小（簡短的檢查清單或提醒），以避免提示膨脹。

`HEARTBEAT.md` 範例：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### 代理可以更新 HEARTBEAT.md 嗎？

可以 — 如果您要求它這樣做的話。

`HEARTBEAT.md` 只是代理工作區中的一個普通檔案，因此您可以在
（正常聊天中）告訴代理類似以下內容：

- 「更新 `HEARTBEAT.md` 以新增每日行事曆檢查。」
- 「重寫 `HEARTBEAT.md` 使其更短，並專注於收件匣後續追蹤。」

如果您希望主動執行此操作，您也可以在心跳提示中包含明確的一行，
例如：「如果檢查清單變得過時，請用更好的清單更新 HEARTBEAT.md」。

安全提示：請勿將機密資訊（API 金鑰、電話號碼、私人權杖）放入
`HEARTBEAT.md` — 它會成為提示語境的一部分。

## 手喚醒（按需）

您可以將系統事件加入佇列並透過以下方式立即觸發心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果多個代理已設定 `heartbeat`，手動喚醒會立即執行每個
代理的心跳。

使用 `--mode next-heartbeat` 等待下一次排程的刻度。

## 推理傳遞（選用）

預設情況下，心跳僅傳遞最終的「答案」承載。

如果您希望透明化，請啟用：

- `agents.defaults.heartbeat.includeReasoning: true`

啟用後，心跳也會傳送一條帶有 `Reasoning:` 前綴的獨立訊息（形狀與 `/reasoning on` 相同）。當代理正在管理多個 session/codex 且您想查看它決定 ping 您的原因時，這會很有用——但它也可能洩漏比您想要的更多的內部細節。建議在群組聊天中保持關閉。

## 成本考量

心跳會執行完整的 agent 週期。較短的間隔會消耗更多 token。若要降低成本：

- 使用 `isolatedSession: true` 以避免傳送完整的對話歷史記錄（每次執行從約 100K tokens 降至約 2-5K）。
- 使用 `lightContext: true` 將引導檔案限制為僅 `HEARTBEAT.md`。
- 設定更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 為小量。
- 如果您只需要內部狀態更新，請使用 `target: "none"`。

import en from "/components/footer/en.mdx";

<en />
