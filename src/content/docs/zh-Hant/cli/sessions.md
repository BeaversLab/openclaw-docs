---
summary: "CLI reference for `openclaw sessions` (list stored sessions + usage)"
read_when:
  - You want to list stored sessions and see recent activity
title: "Sessions"
---

# `openclaw sessions`

列出已儲存的對話會話。

Session lists are not channel/provider liveness checks. They show persisted
conversation rows from session stores. A quiet Discord, Slack, Telegram, or
other channel can reconnect successfully without creating a new session row
until a message is processed. Use `openclaw channels status --probe`,
`openclaw status --deep`, or `openclaw health --verbose` when you need live
channel connectivity.

`openclaw sessions` and Gateway `sessions.list` responses are bounded by
default so large long-lived stores cannot monopolize the CLI process or Gateway
event loop. The CLI returns the newest 100 sessions by default; pass
`--limit <n>` for a smaller/larger window or `--limit all` when you intentionally
need the full store. JSON responses include `totalCount`, `limitApplied`, and
`hasMore` when callers need to show that more rows exist.

RPC clients can pass `configuredAgentsOnly: true` to keep the broad combined
discovery source but return only rows for agents currently present in config.
Control UI uses that mode by default so deleted or disk-only agent stores do
not reappear in the Sessions view.

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
- `--verbose`: verbose logging
- `--agent <id>`: one configured agent store
- `--all-agents`: aggregate all configured agent stores
- `--store <path>`: explicit store path (cannot be combined with `--agent` or `--all-agents`)
- `--limit <n|all>`: max rows to output (default `100`; `all` restores full output)

Tail human-readable trajectory progress for stored sessions:

```bash
openclaw sessions tail
openclaw sessions tail --follow
openclaw sessions tail --session-key "agent:main:telegram:direct:123" --tail 25
openclaw sessions --agent work tail --follow
openclaw sessions --all-agents tail --follow
```

`openclaw sessions tail` 會將最近的軌跡 JSONL 事件渲染為簡潔的進度列。如果沒有 `--session-key`，它會首先監看正在執行的會話，然後是最新儲存的會話。`--tail <count>` 控制在進入跟隨模式之前列印多少現有事件；預設值是 `80`，而 `0` 從目前的結尾開始。`--follow` 會持續監看選定的軌跡檔案，包括由 `<session>.trajectory-path.json` 引用的已重新定位檔案。

進度檢視被刻意設計得較為保守：不會列印提示詞文字、工具引數和工具結果主體。工具呼叫會顯示帶有 `{...redacted...}` 的工具名稱；工具結果會顯示諸如 `ok`、`error` 或 `done` 的狀態；模型完成列會顯示供應商/模型和最終狀態。

匯出已儲存會話的軌跡套件：

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --output bug-123 --json
```

這是所有者批准執行請求後，`/export-trajectory` 斜線指令所使用的指令路徑。輸出目錄始終在所選工作區內的 `.openclaw/trajectory-exports/` 中解析。

`openclaw sessions --all-agents` 會讀取已設定的代理程式存放區。Gateway 和 ACP 會話探索的範圍更廣：它們也包括在預設 `agents/` 根目錄或範本化 `session.store` 根目錄下找到的僅磁碟存放區。這些探索到的存放區必須解析為代理程式根目錄內的常規 `sessions.json` 檔案；符號連結和根目錄外的路徑會被跳過。

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

立即執行維護（而不是等待下一個寫入週期）：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --agent work --dry-run
openclaw sessions cleanup --all-agents --dry-run
openclaw sessions cleanup --enforce
openclaw sessions cleanup --enforce --active-key "agent:main:telegram:direct:123"
openclaw sessions cleanup --dry-run --fix-dm-scope
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` 使用組態中的 `session.maintenance` 設定：

- 範圍說明：`openclaw sessions cleanup` 會維護會話存放區、逐字稿和軌跡附屬檔案。它不會修剪 cron 執行記錄，該記錄是由 [Cron 組態](/zh-Hant/automation/cron-jobs#configuration) 中的 `cron.runLog.keepLines` 管理，並在 [Cron 維護](/zh-Hant/automation/cron-jobs#maintenance) 中說明。
- 清理也會修剪未被引用的主要文字記錄、壓縮檢查點以及早於 `session.maintenance.pruneAfter` 的軌跡副檔案；仍被 `sessions.json` 引用的檔案將會被保留。

- `--dry-run`：預覽將修剪/封頂多少條目，而不進行寫入。
  - 在文字模式下，dry-run 會列印每個會話的操作表（`Action`、`Key`、`Age`、`Model`、`Flags`），以便您查看將保留或移除的內容。
- `--enforce`：即使 `session.maintenance.mode` 為 `warn`，也套用維護。
- `--fix-missing`：移除文字記錄檔案遺失或僅有標頭/空白檔案的條目，即使它們尚未達到正常的老化/計數淘汰標準。
- `--fix-dm-scope`：當 `session.dmScope` 為 `main` 時，淘汰較早 `per-peer`、`per-channel-peer` 或 `per-account-channel-peer` 路由留下的過時對方金鑰 direct-DM 列。請先使用 `--dry-run`；套用清理會將這些列從 `sessions.json` 中移除，並將其文字記錄作為已刪除的檔案保留。
- `--active-key <key>`：保護特定的作用中金鑰不被磁碟預算驅逐。持久的對外公交談指標，例如群組會話和執行緒範圍的聊天會話，也會透過老化/計數/磁碟預算維護予以保留。
- `--agent <id>`：對一個已設定的代理儲存庫執行清理。
- `--all-agents`：對所有已設定的代理儲存庫執行清理。
- `--store <path>`：針對特定的 `sessions.json` 檔案執行。
- `--json`：列印 JSON 摘要。使用 `--all-agents` 時，輸出包含每個儲存庫的摘要。

當可連線到 Gateway 時，對已設定代理儲存庫的非 dry-run 清理會透過 Gateway 傳送，以便其與執行時期流量共用相同的會話儲存庫寫入器。請使用 `--store <path>` 進行儲存庫檔案的明確離線修復。

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

- Session 配置：[Configuration reference](/zh-Hant/gateway/config-agents#session)

## 相關

- [CLI reference](/zh-Hant/cli)
- [Session management](/zh-Hant/concepts/session)
