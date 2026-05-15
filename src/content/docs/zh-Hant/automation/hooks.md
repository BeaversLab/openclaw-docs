---
summary: "Hooks: event-driven automation for commands and lifecycle events"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

Hooks 是在 Gateway 內部發生某些事情時執行的小型腳本。它們可以從目錄中發現，並使用 `openclaw hooks` 進行檢查。只有在您啟用 hooks 或設定至少一個 hook 項目、hook 套件、舊版處理程序或額外的 hook 目錄後，Gateway 才會載入內部 hooks。

OpenClaw 中有兩種 hook：

- **內部 hooks**（本頁）：當代理事件觸發時在 Gateway 內部執行，例如 `/new`、`/reset`、`/stop` 或生命週期事件。
- **Webhooks**：外部 HTTP 端點，讓其他系統可以在 OpenClaw 中觸發工作。請參閱 [Webhooks](/zh-Hant/automation/cron-jobs#webhooks)。

Hooks 也可以打包在外掛內。`openclaw hooks list` 會顯示獨立 hooks 和外掛管理的 hooks。

## 快速開始

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

## 事件類型

| 事件                     | 觸發時機                      |
| ------------------------ | ----------------------------- |
| `command:new`            | `/new` 指令已發出             |
| `command:reset`          | `/reset` 指令已發出           |
| `command:stop`           | `/stop` 指令已發出            |
| `command`                | 任何指令事件（通用監聽器）    |
| `session:compact:before` | 壓縮摘要歷史記錄之前          |
| `session:compact:after`  | 壓縮完成後                    |
| `session:patch`          | 修改會話屬性時                |
| `agent:bootstrap`        | 注入工作區引導檔案之前        |
| `gateway:startup`        | 頻道啟動並載入 hook 後        |
| `gateway:shutdown`       | 當 Gateway 開始關機時         |
| `gateway:pre-restart`    | 在預期的 Gateway 重新啟動之前 |
| `message:received`       | 來自任何頻道的傳入訊息        |
| `message:transcribed`    | 音訊轉錄完成後                |
| `message:preprocessed`   | 媒體和連結預處理完成或跳過後  |
| `message:sent`           | 已送出傳出訊息                |

## 撰寫 Hook

### Hook 結構

每個 Hook 是一個包含兩個檔案的目錄：

```
my-hook/
├── HOOK.md          # Metadata + documentation
└── handler.ts       # Handler implementation
```

### HOOK.md 格式

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

| 欄位       | 描述                                             |
| ---------- | ------------------------------------------------ |
| `emoji`    | 用於 CLI 的顯示表情符號                          |
| `events`   | 要監聽的事件陣列                                 |
| `export`   | 要使用的命名匯出（預設為 `"default"`）           |
| `os`       | 所需的平台（例如，`["darwin", "linux"]`）        |
| `requires` | 所需的 `bins`、`anyBins`、`env` 或 `config` 路徑 |
| `always`   | 繞過資格檢查（布林值）                           |
| `install`  | 安裝方法                                         |

### 處理程序實作

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

每個事件包含：`type`、`action`、`sessionKey`、`timestamp`、`messages`（推送以發送給使用者）以及 `context`（事件特定資料）。Agent 和工具外掛 hook 上下文也可以包含 `trace`，這是一個唯讀的 W3C 相容診斷追蹤上下文，外掛可以將其傳遞到結構化日誌中以進行 OTEL 關聯。

### 事件上下文重點

**指令事件**（`command:new`、`command:reset`）：`context.sessionEntry`、`context.previousSessionEntry`、`context.commandSource`、`context.workspaceDir`、`context.cfg`。

**訊息事件**（`message:received`）：`context.from`、`context.content`、`context.channelId`、`context.metadata`（供應商特定資料，包括 `senderId`、`senderName`、`guildId`）。對於類似指令的訊息，`context.content` 優先選擇非空白的指令主體，然後回退到原始輸入主體和一般主體；它不包含僅限 agent 的增強內容，例如執行緒歷史或連結摘要。

**訊息事件**（`message:sent`）：`context.to`、`context.content`、`context.success`、`context.channelId`。

**訊息事件**（`message:transcribed`）：`context.transcript`、`context.from`、`context.channelId`、`context.mediaPath`。

**訊息事件**（`message:preprocessed`）：`context.bodyForAgent`（最終增強主體）、`context.from`、`context.channelId`。

**Bootstrap 事件**（`agent:bootstrap`）：`context.bootstrapFiles`（可變陣列）、`context.agentId`。

**工作階段修補事件** (`session:patch`): `context.sessionEntry`, `context.patch` (僅變更欄位), `context.cfg`。僅特權用戶端可以觸發修補事件。

**壓縮事件**: `session:compact:before` 包含 `messageCount`, `tokenCount`。`session:compact:after` 新增 `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`。

`command:stop` 觀察使用者發出 `/stop`；它是取消/指令生命週期，而非代理程式完成的閘道。需要檢查自然最終答案並要求代理程式再進行一次處理的外掛程式，應改用類型化外掛程式 Hook `before_agent_finalize`。請參閱 [外掛程式 Hook](/zh-Hant/plugins/hooks)。

**閘道生命週期事件**: `gateway:shutdown` 包含 `reason` 和 `restartExpectedMs`，並在閘道關機開始時觸發。`gateway:pre-restart` 包含相同的上下文，但僅在關機是預期重新啟動的一部分且提供了有限的 `restartExpectedMs` 值時觸發。關機期間，每個生命週期 Hook 的等待都是盡力而為且有界的，因此如果處理程序停滯，關機仍會繼續。

## 探索 Hook

Hook 是從這些目錄中探索出來的，依照覆蓋優先順序遞增排列：

1. **內建 Hooks**: 隨 OpenClaw 附帶
2. **外掛 Hooks**: 隨已安裝的外掛程式打包的 Hooks
3. **受控 Hook**: `~/.openclaw/hooks/` (使用者安裝，跨工作區共享)。來自 `hooks.internal.load.extraDirs` 的額外目錄共享此優先順序。
4. **工作區 Hook**: `<workspace>/hooks/` (每個代理程式，預設停用，直到明確啟用)

工作區 Hook 可以新增新的 Hook 名稱，但無法覆寫具有相同名稱的內建、受管或外掛提供的 Hook。

閘道在啟動時會跳過內部 Hook 探索，直到設定內部 Hook 為止。使用 `openclaw hooks enable <name>` 啟用隨附或受控 Hook，安裝 Hook 套件，或設定 `hooks.internal.enabled=true` 以選擇加入。當您啟用一個命名 Hook 時，閘道僅載入該 Hook 的處理程序；`hooks.internal.enabled=true`、額外 Hook 目錄和舊版處理程序則選擇加入廣泛探索。

### Hook 套件

Hook 套件是透過 `package.json` 中的 `openclaw.hooks` 匯出 Hook 的 npm 套件。安裝方式：

```bash
openclaw plugins install <path-or-spec>
```

Npm 規格僅限於註冊表（套件名稱 + 可選的確切版本或發行標籤）。不接受 Git/URL/檔案規格和 semver 範圍。

## 內建 Hook

| Hook                  | 事件                                              | 功能                                             |
| --------------------- | ------------------------------------------------- | ------------------------------------------------ |
| session-memory        | `command:new`, `command:reset`                    | 將會話上下文儲存至 `<workspace>/memory/`         |
| bootstrap-extra-files | `agent:bootstrap`                                 | 從 glob 模式注入額外的啟動檔案                   |
| command-logger        | `command`                                         | 將所有指令記錄到 `~/.openclaw/logs/commands.log` |
| compaction-notifier   | `session:compact:before`, `session:compact:after` | 當會話壓縮開始/結束時，發送可見的聊天通知        |
| boot-md               | `gateway:startup`                                 | 當閘道啟動時執行 `BOOT.md`                       |

啟用任何內建的 Hook：

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### session-memory 詳情

擷取最後 15 則使用者/助手訊息，並使用主機本地日期儲存至 `<workspace>/memory/YYYY-MM-DD-HHMM.md`。記憶體擷取在背景執行，因此 `/new` 和 `/reset` 確認不會因為讀取文字紀錄或可選的 slug 產生而延遲。設定 `hooks.internal.entries.session-memory.llmSlug: true` 以使用設定的模型產生描述性檔案名稱 slug。需要設定 `workspace.dir`。

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

路徑相對於工作區解析。僅載入認可的 bootstrap 基本名稱 (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`)。

<a id="command-logger"></a>

### command-logger 詳情

將每個斜線指令記錄到 `~/.openclaw/logs/commands.log`。

<a id="compaction-notifier"></a>

### compaction-notifier 詳情

當 OpenClaw 開始和完成壓縮會話文字紀錄時，將簡短狀態訊息傳送到目前的對話中。這使得在聊天介面上長時間的回合較不令人困惑，因為使用者可以看到助手正在總結上下文，並且會在壓縮後繼續。

<a id="boot-md"></a>

### boot-md 詳情

當閘道啟動時，從現用工作區執行 `BOOT.md`。

## 外掛程式 Hooks

外掛程式可以透過外掛 SDK 註冊類型化的 Hook 以實現更深層的整合：攔截工具呼叫、修改提示、控制訊息流程等等。當您需要 `before_tool_call`、`before_agent_reply`、`before_install` 或其他處理程序內的生命週期 Hook 時，請使用外掛 Hook。

如需完整的外掛 Hook 參考資料，請參閱 [Plugin hooks](/zh-Hant/plugins/hooks)。

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

各別 Hook 的環境變數：

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

<Note>舊版 `hooks.internal.handlers` 陣列設定格式為了向後相容性仍然支援，但新的 Hook 應使用基於探索的系統。</Note>

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

## 最佳實務

- **保持處理器快速。** Hook 在命令處理期間執行。請使用 `void processInBackground(event)` 進行 fire-and-forget 式的繁重工作。
- **優雅地處理錯誤。** 將有風險的操作包裝在 try/catch 中；請勿拋出錯誤，以便其他處理器可以繼續執行。
- **儘早過濾事件。** 如果事件類型/動作不相關，請立即返回。
- **使用特定的事件鍵。** 為了降低開銷，優先使用 `"events": ["command:new"]` 而非 `"events": ["command"]`。

## 疑難排解

### 未探索到 Hook

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

檢查是否缺少二進位檔案 (PATH)、環境變數、設定值或作業系統相容性問題。

### Hook 未執行

1. 驗證 Hook 已啟用：`openclaw hooks list`
2. 重新啟動您的 gateway 程序以重新載入 Hook。
3. 檢查 gateway 日誌：`./scripts/clawlog.sh | grep hook`

## 相關

- [CLI 參考：hooks](/zh-Hant/cli/hooks)
- [Webhooks](/zh-Hant/automation/cron-jobs#webhooks)
- [外掛 Hook](/zh-Hant/plugins/hooks) — 處理程序內的外掛生命週期 Hook
- [設定](/zh-Hant/gateway/configuration-reference#hooks)
