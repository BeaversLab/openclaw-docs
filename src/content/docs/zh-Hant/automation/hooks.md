---
summary: "Hooks: event-driven automation for commands and lifecycle events"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Hooks 是在 Gateway 內部發生某些事情時執行的小型腳本。它們會從目錄中自動被發現，並可以使用 `openclaw hooks` 進行檢查。

OpenClaw 中有兩種 Hooks：

- **Internal hooks** (本頁)：在 Gateway 內部於觸發代理程式事件時執行，例如 `/new`、`/reset`、`/stop` 或生命週期事件。
- **Webhooks**：讓其他系統在 OpenClaw 中觸發工作的外部 HTTP 端點。請參閱 [Webhooks](/en/automation/cron-jobs#webhooks)。

Hooks 也可以打包在插件內。`openclaw hooks list` 會顯示獨立 Hooks 和外掛程式管理的 Hooks。

## Quick start

```bash
# List available hooks
openclaw hooks list

# Enable a hook
openclaw hooks enable session-memory

# Check hook status
openclaw hooks check

# Get detailed information
openclaw hooks info session-memory
```

## Event types

| Event                    | When it fires                                    |
| ------------------------ | ------------------------------------------------ |
| `command:new`            | `/new` command issued                            |
| `command:reset`          | `/reset` command issued                          |
| `command:stop`           | `/stop` command issued                           |
| `command`                | Any command event (general listener)             |
| `session:compact:before` | Before compaction summarizes history             |
| `session:compact:after`  | After compaction completes                       |
| `session:patch`          | When session properties are modified             |
| `agent:bootstrap`        | Before workspace bootstrap files are injected    |
| `gateway:startup`        | After channels start and hooks are loaded        |
| `message:received`       | Inbound message from any channel                 |
| `message:transcribed`    | After audio transcription completes              |
| `message:preprocessed`   | After all media and link understanding completes |
| `message:sent`           | Outbound message delivered                       |

## Writing hooks

### Hook structure

Each hook is a directory containing two files:

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

### HOOK.md format

```markdown
---
name: my-hook
description: "Short description of what this hook does"
metadata: { "openclaw": { "emoji": "🔗", "events": ["command:new"], "requires": { "bins": ["node"] } } }
---

# My Hook

Detailed documentation goes here.
```

**Metadata fields** (`metadata.openclaw`):

| Field      | Description                                      |
| ---------- | ------------------------------------------------ |
| `emoji`    | Display emoji for CLI                            |
| `events`   | Array of events to listen for                    |
| `export`   | 要使用的具名匯出（預設為 `"default"`）           |
| `os`       | 必要的平台（例如 `["darwin", "linux"]`）         |
| `requires` | 必要的 `bins`、`anyBins`、`env` 或 `config` 路徑 |
| `always`   | 略過資格檢查（布林值）                           |
| `install`  | 安裝方法                                         |

### 處理函式實作

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] New command triggered`);
  // Your logic here

  // Optionally send message to user
  event.messages.push("Hook executed!");
};

export default handler;
```

每個事件包含：`type`、`action`、`sessionKey`、`timestamp`、`messages`（推送以傳送給使用者）以及 `context`（事件特定資料）。

### 事件上下文重點

**指令事件**（`command:new`、`command:reset`）：`context.sessionEntry`、`context.previousSessionEntry`、`context.commandSource`、`context.workspaceDir`、`context.cfg`。

**訊息事件**（`message:received`）：`context.from`、`context.content`、`context.channelId`、`context.metadata`（供應商特定資料，包括 `senderId`、`senderName`、`guildId`）。

**訊息事件**（`message:sent`）：`context.to`、`context.content`、`context.success`、`context.channelId`。

**訊息事件**（`message:transcribed`）：`context.transcript`、`context.from`、`context.channelId`、`context.mediaPath`。

**訊息事件**（`message:preprocessed`）：`context.bodyForAgent`（最終豐富內容）、`context.from`、`context.channelId`。

**引導事件**（`agent:bootstrap`）：`context.bootstrapFiles`（可變陣列）、`context.agentId`。

**Session patch events** (`session:patch`): `context.sessionEntry`, `context.patch` (僅包含變更的欄位), `context.cfg`. 只有特權用戶端可以觸發 patch 事件。

**Compaction events**: `session:compact:before` 包含 `messageCount`, `tokenCount`. `session:compact:after` 新增 `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`.

## Hook 探索

Hooks 會依照覆蓋優先級從低到高的順序，從以下目錄中探索：

1. **Bundled hooks**: 隨 OpenClaw 附帶的 hooks
2. **Plugin hooks**: 打包在已安裝外掛中的 hooks
3. **Managed hooks**: `~/.openclaw/hooks/` (由用戶安裝，在所有工作區之間共享)。來自 `hooks.internal.load.extraDirs` 的額外目錄也共享此優先級。
4. **Workspace hooks**: `<workspace>/hooks/` (針對每個 agent，預設為停用，直到明確啟用)

Workspace hooks 可以新增新的 hook 名稱，但不能覆蓋同名的 bundled、managed 或 plugin 提供的 hooks。

### Hook 套件

Hook 套件是透過 `package.json` 中的 `openclaw.hooks` 匯出 hooks 的 npm 套件。安裝方式：

```bash
openclaw plugins install <path-or-spec>
```

Npm specs 僅限 registry (套件名稱 + 可選的確切版本或 dist-tag)。不支援 Git/URL/file specs 和 semver 範圍。

## 內建 Hooks

| Hook                  | 事件                           | 作用                                             |
| --------------------- | ------------------------------ | ------------------------------------------------ |
| session-memory        | `command:new`, `command:reset` | 將 session 上下文儲存到 `<workspace>/memory/`    |
| bootstrap-extra-files | `agent:bootstrap`              | 根據 glob 模式注入額外的啟動檔案                 |
| command-logger        | `command`                      | 將所有命令記錄到 `~/.openclaw/logs/commands.log` |
| boot-md               | `gateway:startup`              | 在 gateway 啟動時執行 `BOOT.md`                  |

啟用任何內建 hook：

```bash
openclaw hooks enable <hook-name>
```

### session-memory 詳情

提取最後 15 個 user/assistant 訊息，透過 LLM 生成描述性檔名 slug，並儲存到 `<workspace>/memory/YYYY-MM-DD-slug.md`。需要設定 `workspace.dir`。

### bootstrap-extra-files 配置

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "bootstrap-extra-files": {
          "enabled": true,
          "paths": ["packages/*/AGENTS.md", "packages/*/TOOLS.md"]
        }
      }
    }
  }
}
```

路徑相對於工作區解析。僅載入已識別的啟動基礎名稱（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md`、`MEMORY.md`）。

## 外掛程式 Hook

外掛程式可以透過外掛 SDK 註冊 hook 以實現更深入的整合：攔截工具呼叫、修改提示、控制訊息流程等。外掛 SDK 公開了 28 個 hook，涵蓋模型解析、代理程式生命週期、訊息流程、工具執行、子代理程式協調和閘道生命週期。

有關完整的外掛程式 hook 參考，包括 `before_tool_call`、`before_agent_reply`、`before_install` 以及所有其他外掛程式 hook，請參閱 [外掛程式架構](/en/plugins/architecture#provider-runtime-hooks)。

## 組態

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "session-memory": { "enabled": true },
        "command-logger": { "enabled": false }
      }
    }
  }
}
```

各 Hook 的環境變數：

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "my-hook": {
          "enabled": true,
          "env": { "MY_CUSTOM_VAR": "value" }
        }
      }
    }
  }
}
```

額外的 Hook 目錄：

```json
{
  "hooks": {
    "internal": {
      "load": {
        "extraDirs": ["/path/to/more/hooks"]
      }
    }
  }
}
```

<Note>舊版 `hooks.internal.handlers` 陣列組態格式仍受支援以保持向後相容性，但新的 hook 應使用基於探索的系統。</Note>

## CLI 參考

```bash
# List all hooks (add --eligible, --verbose, or --json)
openclaw hooks list

# Show detailed info about a hook
openclaw hooks info <hook-name>

# Show eligibility summary
openclaw hooks check

# Enable/disable
openclaw hooks enable <hook-name>
openclaw hooks disable <hook-name>
```

## 最佳實踐

- **保持處理程序快速。** Hook 在命令處理期間執行。使用 `void processInBackground(event)` 以發後即忘的方式處理繁重工作。
- **優雅地處理錯誤。** 將冒險的操作包裝在 try/catch 中；不要拋出錯誤，以便其他處理程序能夠執行。
- **提前過濾事件。** 如果事件類型/動作不相關，請立即返回。
- **使用特定的事件鍵。** 為了減少開銷，優先使用 `"events": ["command:new"]` 而非 `"events": ["command"]`。

## 疑難排解

### 未發現 Hook

```bash
# Verify directory structure
ls -la ~/.openclaw/hooks/my-hook/
# Should show: HOOK.md, handler.ts

# List all discovered hooks
openclaw hooks list
```

### Hook 不符合資格

```bash
openclaw hooks info my-hook
```

檢查是否有遺漏的二元檔案 (PATH)、環境變數、組態值或作業系統相容性問題。

### Hook 未執行

1. 驗證 hook 是否已啟用：`openclaw hooks list`
2. 重新啟動您的閘道程序，以便重新載入 hook。
3. 檢查閘道日誌：`./scripts/clawlog.sh | grep hook`

## 相關

- [CLI 參考：hooks](/en/cli/hooks)
- [Webhooks](/en/automation/cron-jobs#webhooks)
- [外掛程式架構](/en/plugins/architecture#provider-runtime-hooks) — 完整的外掛程式 Hook 參考
- [設定](/en/gateway/configuration-reference#hooks)
