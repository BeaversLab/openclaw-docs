---
summary: "Hooks: event-driven automation for commands and lifecycle events"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

# Hooks

Hooks 是在 Gateway 內部發生某些情況時執行的小型腳本。它們會從目錄中自動發現，並且可以使用 `openclaw hooks` 進行檢查。

OpenClaw 中有兩種 Hooks：

- **內部 hooks**（本頁面）：當代理程式 事件觸發時在 Gateway 內部執行，例如 `/new`、`/reset`、`/stop` 或生命週期事件。
- **Webhooks**：外部 HTTP 端點，允許其他系統在 OpenClaw 中觸發工作。請參閱 [Webhooks](/en/automation/cron-jobs#webhooks)。

Hooks 也可以打包在插件內。`openclaw hooks list` 會顯示獨立 hooks 和插件管理的 hooks。

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
| `command:new`            | 發出 `/new` 指令                                 |
| `command:reset`          | 發出 `/reset` 指令                               |
| `command:stop`           | 發出 `/stop` 指令                                |
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

**中繼資料欄位** (`metadata.openclaw`)：

| Field      | Description                                      |
| ---------- | ------------------------------------------------ |
| `emoji`    | Display emoji for CLI                            |
| `events`   | Array of events to listen for                    |
| `export`   | 要使用的命名匯出（預設為 `"default"`）           |
| `os`       | 所需的平台（例如 `["darwin", "linux"]`）         |
| `requires` | 所需的 `bins`、`anyBins`、`env` 或 `config` 路徑 |
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

每個事件包含：`type`、`action`、`sessionKey`、`timestamp`、`messages`（推播以傳送給使用者）以及 `context`（事件特定資料）。

### 事件上下文重點

**指令事件** (`command:new`, `command:reset`): `context.sessionEntry`, `context.previousSessionEntry`, `context.commandSource`, `context.workspaceDir`, `context.cfg`。

**訊息事件** (`message:received`): `context.from`, `context.content`, `context.channelId`, `context.metadata` (供應商特定資料，包括 `senderId`, `senderName`, `guildId`)。

**訊息事件** (`message:sent`): `context.to`, `context.content`, `context.success`, `context.channelId`。

**訊息事件** (`message:transcribed`): `context.transcript`, `context.from`, `context.channelId`, `context.mediaPath`。

**訊息事件** (`message:preprocessed`): `context.bodyForAgent` (最終充實內容), `context.from`, `context.channelId`。

**啟動事件** (`agent:bootstrap`): `context.bootstrapFiles` (可變動陣列), `context.agentId`。

**階段修補事件** (`session:patch`): `context.sessionEntry`, `context.patch` (僅變更欄位), `context.cfg`。僅有特權用戶端可以觸發修補事件。

**壓縮事件**: `session:compact:before` 包含 `messageCount`, `tokenCount`。`session:compact:after` 新增 `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`。

## Hook 探索

Hooks 會依照覆蓋優先級從低到高的順序，從以下目錄中探索：

1. **Bundled hooks**: 隨 OpenClaw 附帶的 hooks
2. **Plugin hooks**: 打包在已安裝外掛中的 hooks
3. **受管理 Hooks**: `~/.openclaw/hooks/` (使用者安裝，跨工作區共享)。來自 `hooks.internal.load.extraDirs` 的額外目錄共享此優先順序。
4. **工作區 Hooks**: `<workspace>/hooks/` (個別代理，預設停用，直到明確啟用)

Workspace hooks 可以新增新的 hook 名稱，但不能覆蓋同名的 bundled、managed 或 plugin 提供的 hooks。

### Hook 套件

Hook pack 是透過 `package.json` 中的 `openclaw.hooks` 匯出 hooks 的 npm 套件。安裝方式：

```bash
openclaw plugins install <path-or-spec>
```

Npm specs 僅限 registry (套件名稱 + 可選的確切版本或 dist-tag)。不支援 Git/URL/file specs 和 semver 範圍。

## 內建 Hooks

| Hook                  | 事件                           | 作用                                             |
| --------------------- | ------------------------------ | ------------------------------------------------ |
| session-memory        | `command:new`, `command:reset` | 將 session context 儲存至 `<workspace>/memory/`  |
| bootstrap-extra-files | `agent:bootstrap`              | 根據 glob 模式注入額外的啟動檔案                 |
| command-logger        | `command`                      | 將所有指令記錄到 `~/.openclaw/logs/commands.log` |
| boot-md               | `gateway:startup`              | 當 gateway 啟動時執行 `BOOT.md`                  |

啟用任何內建 hook：

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### session-memory 詳細資訊

擷取最後 15 個使用者/助理訊息，透過 LLM 產生描述性檔名 slug，並儲存至 `<workspace>/memory/YYYY-MM-DD-slug.md`。需要設定 `workspace.dir`。

<a id="bootstrap-extra-files"></a>

### bootstrap-extra-files 設定

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

路徑會相對於 workspace 解析。僅會載入可識別的 bootstrap 基礎檔名 (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`)。

<a id="command-logger"></a>

### command-logger 詳細資訊

將每個斜線指令記錄到 `~/.openclaw/logs/commands.log`。

<a id="boot-md"></a>

### boot-md 詳細資訊

當 gateway 啟動時，從 active workspace 執行 `BOOT.md`。

## Plugin hooks

Plugins 可以透過 Plugin SDK 註冊 hooks 以進行更深層的整合：攔截工具呼叫、修改提示、控制訊息流等等。Plugin SDK 公開了 28 個 hooks，涵蓋模型解析、agent 生命週期、訊息流、工具執行、subagent 協調以及 gateway 生命週期。

若要查看包含 `before_tool_call`、`before_agent_reply`、`before_install` 以及所有其他 plugin hooks 的完整 plugin hook 參考資料，請參閱 [Plugin Architecture](/en/plugins/architecture#provider-runtime-hooks)。

## 設定

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

個別 hook 環境變數：

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

額外的 hook 目錄：

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

<Note>傳統的 `hooks.internal.handlers` 陣列配置格式為了向後相容仍然支援，但新的 Hook 應該使用基於發現的系統。</Note>

## CLI 參考資料

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

- **保持處理程序的快速。** Hook 在命令處理期間執行。使用 `void processInBackground(event)` 以發後即忘（fire-and-forget）的方式處理繁重的工作。
- **優雅地處理錯誤。** 將有風險的操作包裝在 try/catch 中；不要拋出錯誤，以便其他處理程序可以執行。
- **儘早過濾事件。** 如果事件類型/動作不相關，請立即返回。
- **使用特定的事件鍵。** 為了減少開銷，優先使用 `"events": ["command:new"]` 而不是 `"events": ["command"]`。

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

檢查是否缺少二進位檔案 (PATH)、環境變數、配置值或作業系統相容性。

### Hook 未執行

1. 驗證 Hook 是否已啟用：`openclaw hooks list`
2. 重新啟動您的 gateway 程序以重新載入 Hook。
3. 檢查 gateway 日誌：`./scripts/clawlog.sh | grep hook`

## 相關內容

- [CLI 參考資料：hooks](/en/cli/hooks)
- [Webhooks](/en/automation/cron-jobs#webhooks)
- [插件架構](/en/plugins/architecture#provider-runtime-hooks) — 完整的插件 hook 參考資料
- [配置](/en/gateway/configuration-reference#hooks)
