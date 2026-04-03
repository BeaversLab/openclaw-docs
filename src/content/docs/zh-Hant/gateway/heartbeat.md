---
summary: "Heartbeat 輪詢訊息與通知規則"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
---

# Heartbeat (Gateway)

> **Heartbeat vs Cron？** 如需關於何時使用各自的指導，請參閱 [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat)。

Heartbeat 在主會話中執行 **週期性代理輪次**，以便模型能夠
呈現需要注意的事項，而不會對您造成干擾。

Heartbeat 是一個排定的主會話輪次——它**不會**建立 [background task](/en/automation/tasks) 記錄。
任務記錄是用於分離的工作（ACP 執行、子代理、獨立的 cron 工作）。

疑難排解：[/automation/troubleshooting](/en/automation/troubleshooting)

## 快速入門（初學者）

1. 保持啟用 heartbeat（預設為 `30m`，若是 Anthropic OAuth/setup-token 則為 `1h`）或設定您自己的頻率。
2. 在代理工作區中建立一個小型 `HEARTBEAT.md` 檢查清單（可選但建議）。
3. 決定 heartbeat 訊息應該送往何處（預設為 `target: "none"`；設定 `target: "last"` 以路由至最後一次聯絡）。
4. 可選：啟用 heartbeat 推理傳遞以增加透明度。
5. 可選：如果 heartbeat 執行僅需要 `HEARTBEAT.md`，請使用輕量級引導上下文。
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

- 間隔：`30m`（若偵測到的驗證模式為 Anthropic OAuth/setup-token 則為 `1h`）。設定 `agents.defaults.heartbeat.every` 或各代理的 `agents.list[].heartbeat.every`；使用 `0m` 以停用。
- 提示詞內容（可透過 `agents.defaults.heartbeat.prompt` 設定）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Heartbeat 提示詞會作為使用者訊息**逐字**發送。系統提示詞包含「Heartbeat」部分，且執行會在內部被標記。
- 啟用時段（`heartbeat.activeHours`）會在設定的時區中檢查。
  在時段之外，heartbeat 將會被跳過，直到時段內的下一個刻度。

## Heartbeat 提示詞的用途

預設提示詞是有意設計得廣泛的：

- **背景任務**：「考慮未完成的任務」會促使代理檢視後續事項（收件匣、日曆、提醒、佇列中的工作）並提出任何緊急事項。
- **人工檢查**：「在白天偶爾檢查一下你的人類」會促使偶爾發送一則輕量的「有什麼需要的嗎？」訊息，並透過您設定的本地時區來避免夜間干擾（請參閱 [/concepts/timezone](/en/concepts/timezone)）。

Heartbeat 可以回應已完成的 [背景任務](/en/automation/tasks)，但 heartbeat 執行本身並不會建立任務記錄。

如果您希望 heartbeat 執行非常特定的操作（例如「檢查 Gmail PubSub 統計數據」或「驗證 gateway 健康狀況」），請將 `agents.defaults.heartbeat.prompt`（或 `agents.list[].heartbeat.prompt`）設為自訂主體（會逐字發送）。

## 回應協定

- 如果沒有任何事需要注意，請回覆 **`HEARTBEAT_OK`**。
- 在 heartbeat 執行期間，當 `HEARTBEAT_OK` 出現在回覆的**開頭或結尾**時，OpenClaw 會將其視為一個確認訊號。該 token 會被移除，且如果剩餘內容**≤ `ackMaxChars`**（預設值：300），該回覆將被丟棄。
- 如果 `HEARTBEAT_OK` 出現在回覆的**中間**，則不會受到特殊處理。
- 對於警報，**請勿**包含 `HEARTBEAT_OK`；僅回傳警報文字。

在 heartbeat 之外，訊息開頭/結尾處單獨出現的 `HEARTBEAT_OK` 會被移除並記錄；如果訊息僅包含 `HEARTBEAT_OK`，則該訊息會被丟棄。

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

- `agents.defaults.heartbeat` 設定全域的 heartbeat 行為。
- `agents.list[].heartbeat` 會在頂部合併；如果任何 agent 有 `heartbeat` 區塊，**只有那些 agents** 會執行 heartbeat。
- `channels.defaults.heartbeat` 為所有頻道設定可見性預設值。
- `channels.<channel>.heartbeat` 會覆寫頻道預設值。
- `channels.<channel>.accounts.<id>.heartbeat` （多帳號頻道）會覆寫各頻道的設定。

### 各 Agent 的 Heartbeat

如果任何 `agents.list[]` 項目包含 `heartbeat` 區塊，**只有那些 agents** 會執行 heartbeat。各 agent 的區塊會在 `agents.defaults.heartbeat` 之上合併（因此您可以設定一次共用的預設值，然後針對各個 agent 進行覆寫）。

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

- 完全省略 `activeHours`（沒有時間視窗限制；這是預設行為）。
- 設定全天時間視窗：`activeHours: { start: "00:00", end: "24:00" }`。

不要將 `start` 和 `end` 設定為相同的時間（例如 `08:00` 到 `08:00`）。
這會被視為零寬度時間視窗，因此將會一直跳過心跳。

### 多帳號範例

使用 `accountId` 來定位 Telegram 等多帳號管道上的特定帳號：

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
- `model`：心跳執行的可選模型覆寫（`provider/model`）。
- `includeReasoning`：啟用時，當有獨立的 `Reasoning:` 訊息可用時也一併傳送（形態與 `/reasoning on` 相同）。
- `lightContext`：當為 true 時，心跳執行會使用輕量級啟動上下文，並且只保留工作區啟動檔案中的 `HEARTBEAT.md`。
- `isolatedSession`：當為 true 時，每次心跳都在沒有先前對話歷史記錄的新會話中執行。使用與 cron `sessionTarget: "isolated"` 相同的隔離模式。大幅減少每次心跳的 token 成本。與 `lightContext: true` 結合使用以達到最大節省。傳送路由仍使用主會話上下文。
- `session`：心跳執行的可選會話金鑰。
  - `main`（預設）：代理主會話。
  - 明確的會話金鑰（從 `openclaw sessions --json` 複製或從 [sessions CLI](/en/cli/sessions) 複製）。
  - 會話金鑰格式：請參閱 [Sessions](/en/concepts/session) 和 [Groups](/en/channels/groups)。
- `target`：
  - `last`：傳送到最後使用的外部管道。
  - 明確通道：任何已配置的通道或外掛 ID，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
  - `none`（預設）：運行心跳但**不進行外部傳送**。
- `directPolicy`：控制直接/DM 傳送行為：
  - `allow`（預設）：允許直接/DM 心跳傳送。
  - `block`：抑制直接/DM 傳送 (`reason=dm-blocked`)。
- `to`：可選的收件者覆寫（通道特定 ID，例如 WhatsApp 的 E.164 或 Telegram 聊天 ID）。對於 Telegram 主題/執行緒，請使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`：多帳戶通道的可選帳戶 ID。當設定為 `target: "last"` 時，如果解析出的最後一個通道支援帳戶，則帳戶 ID 應用於該通道；否則將被忽略。如果帳戶 ID 與解析通道的已配置帳戶不匹配，則將跳過傳送。
- `prompt`：覆寫預設的提示主體（不會合併）。
- `ackMaxChars`：在 `HEARTBEAT_OK` 之後但在傳送之前允許的最大字元數。
- `suppressToolErrorWarnings`：設為 true 時，在心跳運行期間抑制工具錯誤警告載荷。
- `activeHours`：將心跳運行限制在時間視窗內。具有 `start` (HH:MM, 包含；使用 `00:00` 表示一天開始)、`end` (HH:MM 不包含；`24:00` 表示一天結束) 和可選的 `timezone` 的物件。
  - 省略或 `"user"`：如果設定了則使用您的 `agents.defaults.userTimezone`，否則回退到主機系統時區。
  - `"local"`：始終使用主機系統時區。
  - 任何 IANA 識別碼（例如 `America/New_York`）：直接使用；如果無效，則回退到上述 `"user"` 的行為。
  - `start` 和 `end` 不得相等以啟用活動視窗；相等的值被視為零寬度（永遠在視窗外）。
  - 在活動視窗外，心跳會被跳過，直到視窗內的下一個刻度。

## 傳遞行為

- 心跳預設在代理的主會話中執行 (`agent:<id>:<mainKey>`)，
  或當 `session.scope = "global"` 時執行 `global`。設定 `session` 以覆寫為
  特定的通道會話 (Discord/WhatsApp/等)。
- `session` 僅影響執行內容；傳遞由 `target` 和 `to` 控制。
- 若要傳遞至特定通道/接收者，請設定 `target` + `to`。若使用
  `target: "last"`，傳遞將使用該會話的最後一個外部通道。
- 心跳傳遞預設允許直接/私訊目標。設定 `directPolicy: "block"` 以在仍執行心跳輪次時抑制直接目標傳送。
- 如果主佇列忙碌，心跳會被跳過並稍後重試。
- 如果 `target` 解析為沒有外部目的地，執行仍會發生但不會
  傳送出站訊息。
- 僅限心跳的回覆**不會**保持會話存活；會恢復最後的 `updatedAt`
  以使閒置過期正常運作。
- 分離的[背景任務](/en/automation/tasks)可以將系統事件加入佇列並在主會話應快速注意到某些事情時喚醒心跳。該喚醒不會使心跳執行背景任務。

## 可見性控制

預設情況下，`HEARTBEAT_OK` 確認會在傳遞警示內容時被
抑制。您可以針對每個通道或每個帳戶調整此設定：

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

- `showOk`：當模型僅傳回 OK 回覆時發送 `HEARTBEAT_OK` 確認。
- `showAlerts`：當模型傳回非 OK 回覆時發送警示內容。
- `useIndicator`：針對 UI 狀態表面發出指示器事件。

如果**這三個**全為 false，OpenClaw 將完全跳過心跳執行（不呼叫模型）。

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

| 目標                          | 設定                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| 預設行為（靜默 OK，開啟警報） | _(無需設定)_                                                                             |
| 完全靜默（無訊息、無指示器）  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 僅指示器（無訊息）            | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| 僅在一個頻道顯示 OK           | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (可選)

如果工作區中存在 `HEARTBEAT.md` 檔案，預設提示會告知
代理程式讀取它。將其視為您的「心跳檢查清單」：小巧、穩定，
且每 30 分鐘包含一次都很安全。

如果 `HEARTBEAT.md` 存在但實際上是空的（只有空白行和 markdown
標題如 `# Heading`），OpenClaw 將跳過心跳執行以節省 API 呼叫。
如果檔案不存在，心跳仍會執行，模型會決定要採取什麼行動。

保持其極小（簡短的檢查清單或提醒），以避免提示膨脹。

`HEARTBEAT.md` 範例：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### 代理程式可以更新 HEARTBEAT.md 嗎？

可以 — 如果您要求它這樣做。

`HEARTBEAT.md` 只是代理程式工作區中的一個普通檔案，因此您可以
（在一般聊天中）告訴代理程式類似這樣的內容：

- 「更新 `HEARTBEAT.md` 以新增每日日曆檢查。」
- 「重寫 `HEARTBEAT.md` 使其更短並專注於收件匣後續追蹤。」

如果您希望主動進行此操作，您也可以在心跳提示中包含明確的一行，
例如：「如果檢查清單過時，請用更好的版本更新 HEARTBEAT.md」。

安全提示：請勿將機密資訊（API 金鑰、電話號碼、私人權杖）放入
`HEARTBEAT.md` — 它將成為提示內文的一部分。

## 手喚醒 (隨需)

您可以將系統事件加入佇列並使用以下方式立即觸發心跳：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果有多個代理程式設定了 `heartbeat`，手動喚醒會立即執行
每個代理程式的心跳。

使用 `--mode next-heartbeat` 以等待下一次排程的計時。

## 推論傳遞 (可選)

預設情況下，心跳僅傳遞最終的「回答」內容。

如果您需要透明度，請啟用：

- `agents.defaults.heartbeat.includeReasoning: true`

啟用後，心跳還會發送一條帶有 `Reasoning:` 前綴的單獨訊息（形狀與 `/reasoning on` 相同）。當代理正在管理多個會話/codex 且您想了解它決定 ping 您的原因時，這會很有用——但它也可能洩漏比您預期更多的內部細節。建議在群組聊天中將其關閉。

## 成本意識

心跳會運行完整的代理回合。較短的間隔會消耗更多的 token。為了降低成本：

- 使用 `isolatedSession: true` 以避免發送完整的對話歷史記錄（每次運行從約 100K token 減少到約 2-5K token）。
- 使用 `lightContext: true` 將啟動檔案限制為僅 `HEARTBEAT.md`。
- 設定更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 很小。
- 如果您只需要內部狀態更新，請使用 `target: "none"`。

## 相關

- [Automation Overview](/en/automation) — 所有自動化機制一覽
- [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat) — 何時使用哪一個
- [Background Tasks](/en/automation/tasks) — 如何追蹤分離的工作
- [Timezone](/en/concepts/timezone) — 時區如何影響心跳排程
- [Troubleshooting](/en/automation/troubleshooting) — 自動化問題的除錯
