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

### 停靠連結頻道

停靠指令讓使用者將目前的直接聊天會話的回覆路由移動到另一個連結頻道，而無需啟動新會話。請參閱[頻道停靠](/zh-Hant/concepts/channel-docking)以了解範例、設定與疑難排解。

使用 `openclaw security audit` 驗證您的設定。

## 會話生命週期

會話會被重複使用，直到過期為止：

- **每日重置**（預設）——在閘道主機的當地時間凌晨 4:00 建立新會話。每日的新鮮度取決於目前的 `sessionId` 何時啟動，而非取決於後續的中繼資料寫入。
- **閒置重置**（選用）——在一段不活動的時間後建立新會話。設定 `session.reset.idleMinutes`。閒置新鮮度基於最後一次真實的使用者/頻道互動，因此心跳、cron 與 exec 系統事件不會讓會話保持存活。
- **手動重置**——在聊天中輸入 `/new` 或 `/reset`。`/new <model>` 也會切換模型。

當同時設定了每日重置與閒置重置時，以先過期者為準。心跳、cron、exec 與其他系統事件輪次可能會寫入會話中繼資料，但這些寫入不會延長每日或閒置重置的新鮮度。當重置輪轉會話時，舊會話佇列中的系統事件通知將被捨棄，以免陳舊的背景更新被加入到新會話的第一個提示之前。

具有供應商擁有之作用中 CLI 會話的會話，不會受到隱含的預設每日重置影響而中斷。當這些會話應該依計時器過期時，請使用 `/reset` 或明確設定 `session.reset`。

## 狀態儲存位置

所有會話狀態皆由 **gateway**（閘道）擁有。UI 用戶端會向閘道查詢會話資料。

- **儲存庫：** `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- **逐字稿：** `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

`sessions.json` 會保留個別的生命週期時間戳記：

- `sessionStartedAt`：目前的 `sessionId` 何時開始；每日重置使用此時間戳記。
- `lastInteractionAt`：延長閒置存留時間的最後一次使用者/頻道互動。
- `updatedAt`：最後一次儲存庫列變更；適用於列出與清理，但對於每日/閒置重置的新鮮度不具決定性。

如果沒有 `sessionStartedAt` 的較舊行，在可用時會從逐字稿 JSONL 會話標頭中解析。如果較舊的行也缺少 `lastInteractionAt`，閒置新鮮度會回退到該會話開始時間，而不是後續的簿記寫入。

## 會話維護

OpenClaw 會隨著時間自動限制會話儲存。預設情況下，它以 `warn` 模式執行（報告將清理的內容）。將 `session.maintenance.mode` 設定為 `"enforce"` 以進行自動清理：

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

對於生產級別的 `maxEntries` 限制，Gateway 執行時寫入使用一個小型高水位緩衝區，並分批清理回已配置的上限。會話儲存讀取不會在 Gateway 啟動期間修剪或限制條目。這避免了在每次啟動或獨立的 cron 會話中執行完整的儲存清理。`openclaw sessions cleanup --enforce` 會立即套用上限。

維護會保留持久的對外對話指標，包括群組會話和執行緒範圍的聊天會話，同時仍允許合成的 cron、hook、heartbeat、ACP 和子代理條目老化過期。

如果您之前使用了直接訊息隔離，後來將 `session.dmScope` 返回 `main`，請使用 `openclaw sessions cleanup --dry-run --fix-dm-scope` 預覽過時的對方金鑰 DM 行。套用相同的標誌會淘汰那些舊的直接 DM 行，並將其逐字稿保留為已刪除的存檔。

使用 `openclaw sessions cleanup --dry-run` 預覽。

## 檢查會話

- `openclaw status` -- 會話儲存路徑和近期活動。
- `openclaw sessions --json` -- 所有會話（使用 `--active <minutes>` 篩選）。
- 聊天中的 `/status` -- 上下文使用量、模型和切換開關。
- `/context list` -- 系統提示詞中的內容。

## 延伸閱讀

- [會話修剪](/zh-Hant/concepts/session-pruning) -- 修剪工具結果
- [壓縮](/zh-Hant/concepts/compaction) -- 總結長對話
- [會話工具](/zh-Hant/concepts/session-tool) -- 用於跨會話工作的代理工具
- [會話管理深度剖析](/zh-Hant/reference/session-management-compaction) --
  儲存架構、逐字稿、發送策略、來源元數據和進階配置
- [Multi-Agent](/zh-Hant/concepts/multi-agent) — 跨代理的訊息路由與會話隔離
- [Background Tasks](/zh-Hant/automation/tasks) — 分離式工作如何建立帶有會話引用的任務記錄
- [Channel Routing](/zh-Hant/channels/channel-routing) — 傳入訊息如何路由至會話

## 相關

- [Session pruning](/zh-Hant/concepts/session-pruning)
- [Session tools](/zh-Hant/concepts/session-tool)
- [Command queue](/zh-Hant/concepts/queue)
