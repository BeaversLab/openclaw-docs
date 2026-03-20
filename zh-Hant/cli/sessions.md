---
summary: "`openclaw sessions` 的 CLI 參考（列出已儲存的會話 + 用法）"
read_when:
  - 您想要列出已儲存的會話並查看最近的活動
title: "sessions"
---

# `openclaw sessions`

列出儲存的對話會話。

```bash
openclaw sessions
openclaw sessions --agent work
openclaw sessions --all-agents
openclaw sessions --active 120
openclaw sessions --json
```

範圍選擇：

- default：配置的預設代理程式儲存
- `--agent <id>`：一個已設定的代理程式存放區
- `--all-agents`：匯總所有已設定的代理程式存放區
- `--store <path>`：明確的存放區路徑（無法與 `--agent` 或 `--all-agents` 結合使用）

`openclaw sessions --all-agents` 會讀取已設定的代理程式存放區。Gateway 和 ACP
會話探索的範圍更廣：它們也包括在預設的 `agents/` 根目錄或範本化的 `session.store` 根目錄下找到的僅磁碟存放區。這些探索到的存放區必須解析為代理程式根目錄內的常規 `sessions.json` 檔案；符號連結和根目錄外的路徑會被跳過。

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
  "activeMinutes": null,
  "sessions": [
    { "agentId": "main", "key": "agent:main:main", "model": "gpt-5" },
    { "agentId": "work", "key": "agent:work:main", "model": "claude-opus-4-5" }
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
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` 使用設定中的 `session.maintenance` 設定：

- 範圍說明：`openclaw sessions cleanup` 僅維護會話存放區/逐字稿。它不會修剪 cron 執行記錄 (`cron/runs/<jobId>.jsonl`)，這些記錄是由 [Cron 設定](/zh-Hant/automation/cron-jobs#configuration) 中的 `cron.runLog.maxBytes` 和 `cron.runLog.keepLines` 管理，並在 [Cron 維護](/zh-Hant/automation/cron-jobs#maintenance) 中進行說明。

- `--dry-run`：預覽將會修剪/封存的項目數量，而不進行寫入。
  - 在文字模式下，dry-run 會列印每個會話的動作表 (`Action`、`Key`、`Age`、`Model`、`Flags`)，以便您查看將保留與移除的內容。
- `--enforce`：即使當 `session.maintenance.mode` 為 `warn` 時，也執行維護。
- `--active-key <key>`：保護特定的活動金鑰免於被磁碟預算逐出。
- `--agent <id>`：對一個已設定的代理程式存放區執行清理。
- `--all-agents`：對所有已設定的代理程式存放區執行清理。
- `--store <path>`: 針對特定的 `sessions.json` 檔案執行。
- `--json`: 列印 JSON 摘要。使用 `--all-agents` 時，輸出會包含每個儲存區的摘要。

`openclaw sessions cleanup --all-agents --dry-run --json`:

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
      "pruned": 40,
      "capped": 0
    },
    {
      "agentId": "work",
      "storePath": "/home/user/.openclaw/agents/work/sessions/sessions.json",
      "beforeCount": 18,
      "afterCount": 18,
      "pruned": 0,
      "capped": 0
    }
  ]
}
```

相關：

- Session config：[Configuration reference](/zh-Hant/gateway/configuration-reference#session)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
