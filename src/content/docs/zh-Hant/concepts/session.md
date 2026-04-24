---
summary: "OpenClaw 如何管理對話會話"
read_when:
  - You want to understand session routing and isolation
  - You want to configure DM scope for multi-user setups
title: "會話管理"
---

# Session Management

OpenClaw 將對話組織成 **會話**。每則訊息會根據其來源——私訊、群組聊天、排程任務等——路由到對應的會話。

## 訊息如何路由

| 來源                 | 行為                 |
| -------------------- | -------------------- |
| 私訊 (DM)            | 預設共用同一個會話   |
| 群組聊天             | 每個群組獨立         |
| 房間/頻道            | 每個房間獨立         |
| 排程任務 (Cron jobs) | 每次執行使用新的會話 |
| 網絡鉤子 (Webhooks)  | 每個鉤子獨立         |

## 私訊隔離

預設情況下，所有私訊共用一個會話以保持連續性。這對於單一使用者設定來說沒有問題。

<Warning>如果有多人可以傳訊息給您的代理程式，請啟用私訊隔離。若未啟用，所有使用者將共用同一個對話上下文 —— Alice 的私人訊息將會被 Bob 看見。</Warning>

**解決方案：**

```json5
{
  session: {
    dmScope: "per-channel-peer", // isolate by channel + sender
  },
}
```

其他選項：

- `main` (預設) -- 所有私訊共用一個會話。
- `per-peer` -- 依傳送者隔離 (跨頻道)。
- `per-channel-peer` -- 依頻道 + 傳送者隔離 (建議)。
- `per-account-channel-peer` -- 依帳戶 + 頻道 + 傳送者隔離。

<Tip>如果同一個人透過多個頻道聯絡您，請使用 `session.identityLinks` 連結他們的身分，以便他們共用同一個會話。</Tip>

使用 `openclaw security audit` 驗證您的設定。

## 會話生命週期

會話會重複使用，直到過期為止：

- **每日重置** (預設) -- 在閘道主機當地時間凌晨 4:00 建立新會話。
- **閒置重置** (選用) -- 經過一段不活動的時間後建立新會話。設定
  `session.reset.idleMinutes`。
- **手動重置** -- 在聊天中輸入 `/new` 或 `/reset`。`/new <model>` 也會
  切換模型。

當同時設定了每日重置和閒置重置時，以先到期者為準。

具有擁有有效提供者擁有的 CLI 會話不會被隱含的每日預設值切斷。當這些會話應該依計時器過期時，請使用 `/reset` 或明確設定 `session.reset`。

## 狀態存在位置

所有會話狀態都由 **gateway** 擁有。UI 客戶端向 gateway 查詢會話資料。

- **Store（儲存）：** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **Transcripts（對話記錄）：** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

## 會話維護

OpenClaw 會隨時間自動限制會話儲存。預設情況下，它以 `warn` 模式執行（報告將被清理的內容）。將 `session.maintenance.mode` 設定為 `"enforce"` 以進行自動清理：

```json5
{
  session: {
    maintenance: {
      mode: "enforce",
      pruneAfter: "30d",
      maxEntries: 500,
    },
  },
}
```

使用 `openclaw sessions cleanup --dry-run` 預覽。

## 檢查會話

- `openclaw status` —— 會話儲存路徑和近期活動。
- `openclaw sessions --json` —— 所有會話（使用 `--active <minutes>` 進行篩選）。
- 聊天中的 `/status` —— 內容使用量、模型和切換開關。
- `/context list` —— 系統提示詞中的內容。

## 延伸閱讀

- [Session Pruning](/zh-Hant/concepts/session-pruning) —— 修剪工具結果
- [Compaction](/zh-Hant/concepts/compaction) —— 總結長對話
- [Session Tools](/zh-Hant/concepts/session-tool) —— 用於跨會話工作的代理程式工具
- [Session Management Deep Dive](/zh-Hant/reference/session-management-compaction) ——
  store schema、對話記錄、傳送策略、來源中繼資料和進階設定
- [Multi-Agent](/zh-Hant/concepts/multi-agent) —— 跨代理程式的路由和會話隔離
- [Background Tasks](/zh-Hant/automation/tasks) —— 分離工作如何建立包含會話參照的工作記錄
- [Channel Routing](/zh-Hant/channels/channel-routing) —— 傳入訊息如何路由至會話
