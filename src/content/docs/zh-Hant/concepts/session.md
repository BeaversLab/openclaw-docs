---
summary: "OpenClaw 如何管理對話會話"
read_when:
  - You want to understand session routing and isolation
  - You want to configure DM scope for multi-user setups
  - You are debugging daily or idle session resets
title: "Session management"
---

OpenClaw 會將對話組織成 **sessions**。每則訊息會根據其來源——例如私訊、群組聊天、排程任務等——被路由到對應的 session。

## 訊息如何路由

| 來源      | 行為                     |
| --------- | ------------------------ |
| 私訊      | 預設共用 session         |
| 群組聊天  | 每個群組各自獨立         |
| 房間/頻道 | 每個房間各自獨立         |
| 排程任務  | 每次執行建立新的 session |
| Webhooks  | 每個 hook 各自獨立       |

## 私訊隔離

預設情況下，所有私訊共用一個 session 以保持連續性。這對於單一使用者設定來說是可以接受的。

<Warning>如果有多個人可以傳送訊息給您的代理程式，請啟用私訊隔離。否則，所有使用者將共用相同的對話上下文——Alice 的私人訊息將會被 Bob 看見。</Warning>

**解決方案：**

```json5
{
  session: {
    dmScope: "per-channel-peer", // isolate by channel + sender
  },
}
```

其他選項：

- `main` (預設) -- 所有私訊共用一個 session。
- `per-peer` -- 依發送者隔離 (跨頻道)。
- `per-channel-peer` -- 依頻道 + 發送者隔離 (建議)。
- `per-account-channel-peer` -- 依帳號 + 頻道 + 發送者隔離。

<Tip>如果同一個人透過多個頻道與您聯繫，請使用 `session.identityLinks` 連結他們的身分，使其共用一個 session。</Tip>

使用 `openclaw security audit` 驗證您的設定。

## Session 生命週期

Session 會被重複使用，直到過期為止：

- **每日重置** (預設) -- 閘道主機當地時間凌晨 4:00 建立新的 session。每日的新鮮度取決於目前 `sessionId` 何時啟動，而非之後的中繼資料寫入。
- **閒置重置** (選用) -- 經過一段不活動時間後建立新的 session。設定
  `session.reset.idleMinutes`。閒置的新鮮度取決於最後一次真實的
  使用者/頻道互動，因此 heartbeat、cron 和 exec 系統事件不會
  讓 session 保持活躍。
- **手動重置** -- 在聊天中輸入 `/new` 或 `/reset`。`/new <model>` 也
  會切換模型。

當同時設定了每日重置與閒置重置時，以先到期者為準。Heartbeat、cron、exec 及其他系統事件輪次雖然會寫入 Session 元數據，但這些寫入操作並不會延長每日或閒置重置的有效期。當重置操作滾動 Session 時，舊 Session 中排隊的系統事件通知會被丟棄，以免過期的背景更新被加入到新 Session 的第一個提示之前。

具有提供者擁有的活躍 CLI Session 不會被隱含的每日預設值中斷。當這些 Session 應根據計時器過期時，請使用 `/reset` 或明確設定 `session.reset`。

## 狀態的儲存位置

所有會話狀態都由 **閘道** 擁有。UI 用戶端會向閘道查詢會話資料。

- **Store：** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **Transcripts：** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

`sessions.json` 會維護獨立的生命週期時間戳記：

- `sessionStartedAt`：目前 `sessionId` 開始的時間；每日重置會使用此時間戳記。
- `lastInteractionAt`：上次會延長閒置存留時間的使用者/頻道互動時間。
- `updatedAt`：上次 store 資料列變更時間；這對於列出和修剪很有用，但對於每日/閒置重置的有效期來說並非權威依據。

如果較舊的資料列缺少 `sessionStartedAt`，會在可用時從 Transcript JSONL 的 Session 標頭中解析。如果較舊的資料列也缺少 `lastInteractionAt`，閒置有效期會退回到該 Session 的開始時間，而不是之後的記帳寫入時間。

## Session 維護

OpenClaw 會自動隨時間限制 Session 儲存空間。預設情況下，它以 `warn` 模式執行（報告將會清除的內容）。將 `session.maintenance.mode` 設定為 `"enforce"` 以進行自動清除：

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

對於生產環境等級的 `maxEntries` 限制，Gateway 執行時間寫入會使用少量的高水位緩衝區，並分批清理回至設定的上限。這可以避免在每個獨立的 cron Session 上執行完整的 store 清理。`openclaw sessions cleanup --enforce` 會立即套用上限。

使用 `openclaw sessions cleanup --dry-run` 預覽。

## 檢查 Sessions

- `openclaw status` —— Session store 路徑與近期活動。
- `openclaw sessions --json` —— 所有 Sessions（使用 `--active <minutes>` 進行篩選）。
- `/status` in chat -- context usage, model, and toggles.
- `/context list` -- what is in the system prompt.

## 進一步閱讀

- [Session Pruning](/zh-Hant/concepts/session-pruning) -- trimming tool results
- [Compaction](/zh-Hant/concepts/compaction) -- summarizing long conversations
- [Session Tools](/zh-Hant/concepts/session-tool) -- agent tools for cross-session work
- [Session Management Deep Dive](/zh-Hant/reference/session-management-compaction) --
  store schema, transcripts, send policy, origin metadata, and advanced config
- [Multi-Agent](/zh-Hant/concepts/multi-agent) — routing and session isolation across agents
- [Background Tasks](/zh-Hant/automation/tasks) — how detached work creates task records with session references
- [Channel Routing](/zh-Hant/channels/channel-routing) — how inbound messages are routed to sessions

## 相關

- [Session pruning](/zh-Hant/concepts/session-pruning)
- [Session tools](/zh-Hant/concepts/session-tool)
- [Command queue](/zh-Hant/concepts/queue)
