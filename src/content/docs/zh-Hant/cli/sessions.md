---
summary: "CLI 參考手冊，用於 `openclaw sessions`（列出已儲存的會話 + 用法）"
read_when:
  - You want to list stored sessions and see recent activity
title: "Sessions"
---

# `openclaw sessions`

列出已儲存的對話會話。

會話列表並非通道/提供者的存活性檢查。它們顯示的是來自會話儲存的持久化對話記錄。一個安靜的 Discord、Slack、Telegram 或其他通道可以在不建立新會話記錄的情況下成功重新連線，直到處理訊息為止。當您需要即時通道連線時，請使用 `openclaw channels status --probe`、`openclaw status --deep` 或 `openclaw health --verbose`。

`openclaw sessions` 和 Gateway `sessions.list` 回應預設是有界的，因此大型長期儲存無法壟斷 CLI 程序或 Gateway 事件迴圈。CLI 預設會傳回最新的 100 個會話；若需更小/更大的視窗，請傳遞 `--limit <n>`；當您有意需要完整儲存時，則傳遞 `--limit all`。當呼叫者需要顯示還有更多記錄時，JSON 回應會包含 `totalCount`、`limitApplied` 和 `hasMore`。

RPC 用戶端可以傳遞 `configuredAgentsOnly: true` 以保留廣泛的合併探索來源，但僅傳回目前設定中存在的代理程式記錄。Control UI 預設使用該模式，因此已刪除或僅在磁碟上的代理程式儲存不會再次出現在 Sessions 視圖中。

```bash
openclaw sessions
openclaw sessions --agent work
openclaw sessions --all-agents
openclaw sessions --active 120
openclaw sessions --limit 25
openclaw sessions --verbose
openclaw sessions --json
```

範圍選擇：

- 預設值：設定的預設代理程式儲存
- `--verbose`：詳細記錄
- `--agent <id>`：一個設定的代理程式儲存
- `--all-agents`：聚合所有設定的代理程式儲存
- `--store <path>`：明確的儲存路徑（無法與 `--agent` 或 `--all-agents` 結合使用）
- `--limit <n|all>`：要輸出的最大記錄數（預設為 `100`；`all` 可恢復完整輸出）

匯出已儲存會話的軌跡套件：

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --output bug-123 --json
```

這是擁有者批准執行請求後，`/export-trajectory` 斜線指令使用的指令路徑。輸出目錄總是在所選工作區內的 `.openclaw/trajectory-exports/` 中解析。

`openclaw sessions --all-agents` 會讀取已設定的 agent stores。Gateway 和 ACP session 探索範圍更廣：它們也包含在預設 `agents/` 根目錄或樣板化 `session.store` 根目錄下找到的僅磁碟 stores。這些探索到的 stores 必須解析為 agent 根目錄內的常規 `sessions.json` 檔案；符號連結和根目錄外的路徑會被跳過。

JSON 範例：

`openclaw sessions --all-agents --json`：

```json
{
  "path": null,
  "stores": [
    { "agentId": "main", "path": "/home/user/.openclaw/agents/main/sessions/sessions.json" },
    { "agentId": "work", "path": "/home/user/.openclaw/agents/work/sessions/sessions.json" }
  ],
  "allAgents": true,
  "count": 2,
  "totalCount": 2,
  "limitApplied": 100,
  "hasMore": false,
  "activeMinutes": null,
  "sessions": [
    { "agentId": "main", "key": "agent:main:main", "model": "gpt-5" },
    { "agentId": "work", "key": "agent:work:main", "model": "claude-opus-4-6" }
  ]
}
```

## 清理維護

立即執行維護（而非等待下一個寫入週期）：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --agent work --dry-run
openclaw sessions cleanup --all-agents --dry-run
openclaw sessions cleanup --enforce
openclaw sessions cleanup --enforce --active-key "agent:main:telegram:direct:123"
openclaw sessions cleanup --dry-run --fix-dm-scope
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` 使用來自設定的 `session.maintenance` 設定：

- 範圍說明：`openclaw sessions cleanup` 維護 session stores、文字紀錄和 trajectory sidecars。它不會修剪 cron 執行日誌 (`cron/runs/<jobId>.jsonl`)，這些日誌是由 [Cron 設定](/zh-Hant/automation/cron-jobs#configuration) 中的 `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 管理的，並在 [Cron 維護](/zh-Hant/automation/cron-jobs#maintenance) 中說明。
- 清理也會修剪未被參照的主要文字紀錄、壓縮檢查點以及比 `session.maintenance.pruneAfter` 更舊的 trajectory sidecars；仍被 `sessions.json` 參照的檔案會被保留。

- `--dry-run`：預覽有多少項目會被修剪/上限限制，而不進行寫入。
  - 在文字模式下，dry-run 會列印每個 session 的動作表 (`Action`, `Key`, `Age`, `Model`, `Flags`)，以便您查看會保留什麼與移除什麼。
- `--enforce`：即使 `session.maintenance.mode` 為 `warn`，仍執行維護。
- `--fix-missing`：移除文字紀錄檔案遺失的項目，即使它們通常尚不會因為時間/計數而過期。
- `--fix-dm-scope`：當 `session.dmScope` 為 `main` 時，淘汰先前 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 路由留下的過時對方鍵值直接 DM 資料列。請先使用 `--dry-run`；套用清理會從 `sessions.json` 中移除這些資料列，並將其文字記錄保留為已刪除的封存。
- `--active-key <key>`：保護特定的啟用金鑰免於磁碟預算驅逐。耐久的外部對話指標，例如群組工作階段和執行緒範圍的聊天工作階段，也會依據年齡/計數/磁碟預算維護而保留。
- `--agent <id>`：對單一設定的代理程式存放區執行清理。
- `--all-agents`：對所有設定的代理程式存放區執行清理。
- `--store <path>`：針對特定的 `sessions.json` 檔案執行。
- `--json`：列印 JSON 摘要。配合 `--all-agents` 使用時，輸出包含每個存放區的摘要。

當 Gateway 可連線時，對設定之代理程式存放區的非試執行清理會透過 Gateway 傳送，使其與執行時期流量共用相同的工作階段存放區寫入器。請使用 `--store <path>` 進行存放區檔案的明確離線修復。

`openclaw sessions cleanup --all-agents --dry-run --json`：

```json
{
  "allAgents": true,
  "mode": "warn",
  "dryRun": true,
  "stores": [
    {
      "agentId": "main",
      "storePath": "/home/user/.openclaw/agents/main/sessions/sessions.json",
      "beforeCount": 120,
      "afterCount": 80,
      "missing": 0,
      "dmScopeRetired": 0,
      "pruned": 40,
      "capped": 0
    },
    {
      "agentId": "work",
      "storePath": "/home/user/.openclaw/agents/work/sessions/sessions.json",
      "beforeCount": 18,
      "afterCount": 18,
      "missing": 0,
      "dmScopeRetired": 0,
      "pruned": 0,
      "capped": 0
    }
  ]
}
```

相關：

- 工作階段設定：[設定參考](/zh-Hant/gateway/config-agents#session)

## 相關

- [CLI 參考](/zh-Hant/cli)
- [工作階段管理](/zh-Hant/concepts/session)
