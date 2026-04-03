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

## 狀態的儲存位置

所有會話狀態都由 **閘道** 擁有。UI 用戶端會向閘道查詢會話資料。

- **儲存：** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **對話記錄：** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

## 會話維護

OpenClaw 會自動在時間上限制會話存儲。預設情況下，它運行在 `warn` 模式（報告將被清理的內容）。將 `session.maintenance.mode` 設置為 `"enforce"` 以進行自動清理：

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

- `openclaw status` -- 會話存儲路徑和近期活動。
- `openclaw sessions --json` -- 所有會話（使用 `--active <minutes>` 過濾）。
- 聊天中的 `/status` -- 上下文使用量、模型和切換開關。
- `/context list` -- 系統提示詞中的內容。

## 延伸閱讀

- [會話修剪](/en/concepts/session-pruning) -- 裁剪工具結果
- [壓縮](/en/concepts/compaction) -- 總結長對話
- [會話工具](/en/concepts/session-tool) -- 用於跨會話工作的代理工具
- [會話管理深度解析](/en/reference/session-management-compaction) --
  存儲架構、文字記錄、發送策略、來源元數據和高級配置
- [多代理](/en/concepts/multi-agent) — 跨代理的路由和會話隔離
- [後台任務](/en/automation/tasks) — 分離工作如何創建帶有會話引用的任務記錄
- [通道路由](/en/channels/channel-routing) — 傳入消息如何路由到會話
