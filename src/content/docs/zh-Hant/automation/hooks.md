---
summary: "Hooks: event-driven automation for commands and lifecycle events"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

Hook 是在 Gateway 內部發生某些事情時執行的小型腳本。它們可以從目錄中發現，並使用 `openclaw hooks` 進行檢查。只有在您啟用 hook 或配置至少一個 hook 條目、hook 包、傳統處理程序或額外 hook 目錄後，Gateway 才會載入內部 hook。

OpenClaw 中有兩種 hook：

- **內部 hook**（本頁）：當代理事件觸發時在 Gateway 內部執行，例如 `/new`、`/reset`、`/stop` 或生命週期事件。
- **Webhook**：讓其他系統在 OpenClaw 中觸發工作的外部 HTTP 端點。請參閱 [Webhooks](/zh-Hant/automation/cron-jobs#webhooks)。

Hook 也可以打包在插件內。`openclaw hooks list` 顯示了獨立 hook 和插件管理的 hook。

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
| `command:new`            | 發出 `/new` 指令              |
| `command:reset`          | 發出 `/reset` 指令            |
| `command:stop`           | 發出 `/stop` 指令             |
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
| `export`   | 要使用的具名匯出（預設為 `"default"`）           |
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

每個事件包含：`type`、`action`、`sessionKey`、`timestamp`、`messages`（推送以發送給使用者）和 `context`（事件特定資料）。代理程式和工具外掛掛鈎上下文也可以包含 `trace`，這是一個唯讀的 W3C 相容診斷追蹤上下文，外掛可以將其傳遞給結構化日誌以進行 OTEL 關聯。

### 事件上下文重點

**指令事件**（`command:new`、`command:reset`）：`context.sessionEntry`、`context.previousSessionEntry`、`context.commandSource`、`context.workspaceDir`、`context.cfg`。

**訊息事件**（`message:received`）：`context.from`、`context.content`、`context.channelId`、`context.metadata`（提供者特定資料，包括 `senderId`、`senderName`、`guildId`）。

**訊息事件**（`message:sent`）：`context.to`、`context.content`、`context.success`、`context.channelId`。

**訊息事件**（`message:transcribed`）：`context.transcript`、`context.from`、`context.channelId`、`context.mediaPath`。

**訊息事件** (`message:preprocessed`): `context.bodyForAgent` (最終豐富內容), `context.from`, `context.channelId`。

**Bootstrap 事件** (`agent:bootstrap`): `context.bootstrapFiles` (可變陣列), `context.agentId`。

**Session 修補事件** (`session:patch`): `context.sessionEntry`, `context.patch` (僅變更欄位), `context.cfg`。僅具權限的用戶端可以觸發修補事件。

**壓縮事件**: `session:compact:before` 包含 `messageCount`, `tokenCount`。`session:compact:after` 新增 `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`。

`command:stop` 觀察用戶發出 `/stop`；這是取消/指令生命週期，而不是代理完成閘道。需要檢查自然最終答案並要求代理再通過一次的外掛程式應改用類型化外掛 Hook `before_agent_finalize`。請參閱 [外掛 Hooks](/zh-Hant/plugins/hooks)。

**Gateway 生命週期事件**: `gateway:shutdown` 包含 `reason` 和 `restartExpectedMs` 並在 Gateway 關機開始時觸發。`gateway:pre-restart` 包含相同的上下文，但僅當關機是預期重新啟動的一部分且提供了有限的 `restartExpectedMs` 值時才會觸發。在關機期間，每個生命週期 Hook 等待都是盡力而為且有界的，因此如果處理程式停頓，關機仍會繼續。

## 探索 Hook

Hook 是從這些目錄中探索出來的，依照覆蓋優先順序遞增排列：

1. **內建 Hooks**: 隨 OpenClaw 附帶
2. **外掛 Hooks**: 隨已安裝的外掛程式打包的 Hooks
3. **受控 Hooks**: `~/.openclaw/hooks/` (用戶安裝，跨工作區共享)。來自 `hooks.internal.load.extraDirs` 的額外目錄共享此優先順序。
4. **工作區 Hooks**: `<workspace>/hooks/` (每個代理，預設停用直到明確啟用)

工作區 Hook 可以新增新的 Hook 名稱，但無法覆寫具有相同名稱的內建、受管或外掛提供的 Hook。

在設定內部 Hook 之前，Gateway 在啟動時會跳過內部 Hook 的探索。使用 `openclaw hooks enable <name>` 啟用內建或受管的 Hook，安裝 Hook 套件，或設定 `hooks.internal.enabled=true` 以選擇加入。當您啟用一個具名 Hook 時，Gateway 僅載入該 Hook 的處理程式；`hooks.internal.enabled=true`、額外的 Hook 目錄和舊版處理程式則會選擇加入廣泛探索。

### Hook 套件

Hook 套件是透過 `openclaw.hooks` 在 `package.json` 中匯出 Hook 的 npm 套件。使用以下指令安裝：

```bash
openclaw plugins install <path-or-spec>
```

Npm 規格僅限於註冊表（套件名稱 + 可選的確切版本或發行標籤）。不接受 Git/URL/檔案規格和 semver 範圍。

## 內建 Hook

| Hook                  | 事件                           | 功能                                             |
| --------------------- | ------------------------------ | ------------------------------------------------ |
| session-memory        | `command:new`, `command:reset` | 將會話上下文儲存到 `<workspace>/memory/`         |
| bootstrap-extra-files | `agent:bootstrap`              | 從 glob 模式注入額外的啟動檔案                   |
| command-logger        | `command`                      | 將所有指令記錄到 `~/.openclaw/logs/commands.log` |
| boot-md               | `gateway:startup`              | 當 Gateway 啟動時執行 `BOOT.md`                  |

啟用任何內建 Hook：

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### session-memory 詳情

提取最後 15 條使用者/助理訊息，透過 LLM 生成描述性檔案名稱 slug，並使用主機本地日期儲存到 `<workspace>/memory/YYYY-MM-DD-slug.md`。需要設定 `workspace.dir`。

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

路徑相對於工作區解析。僅載入認可的啟動基本名稱（`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`）。

<a id="command-logger"></a>

### command-logger 詳情

將每個斜線指令記錄到 `~/.openclaw/logs/commands.log`。

<a id="boot-md"></a>

### boot-md 詳情

當閘道啟動時，從啟用的工作區執行 `BOOT.md`。

## 外掛程式 Hooks

外掛程式可以透過外掛程式 SDK 註冊類型化的 Hooks 以實現更深入的整合：
攔截工具呼叫、修改提示、控制訊息流程等等。
當您需要 `before_tool_call`、`before_agent_reply`、
`before_install` 或其他行程內生命週期 Hooks 時，請使用外掛程式 Hooks。

如需完整的外掛程式 Hook 參考資料，請參閱 [外掛程式 Hooks](/zh-Hant/plugins/hooks)。

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

<Note>舊版的 `hooks.internal.handlers` 陣列組態格式為了向後相容性仍受支援，但新的 Hook 應使用基於探索的系統。</Note>

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

- **保持處理程式快速。** Hook 在命令處理期間執行。使用 `void processInBackground(event)` 以即發即棄 的方式處理繁重工作。
- **優雅地處理錯誤。** 將有風險的操作包裝在 try/catch 中；不要拋出錯誤，以便其他處理程式可以執行。
- **儘早篩選事件。** 如果事件類型/動作不相關，請立即返回。
- **使用特定的事件鍵。** 為了降低開銷，優先使用 `"events": ["command:new"]` 而非 `"events": ["command"]`。

## 疑難排解

### 找不到 Hook

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

檢查是否有遺漏的二元檔 (PATH)、環境變數、組態值或作業系統相容性問題。

### Hook 未執行

1. 驗證 Hook 已啟用：`openclaw hooks list`
2. 重新啟動您的閘道程序以重新載入 Hooks。
3. 檢查閘道日誌：`./scripts/clawlog.sh | grep hook`

## 相關

- [CLI 參考：hooks](/zh-Hant/cli/hooks)
- [Webhooks](/zh-Hant/automation/cron-jobs#webhooks)
- [外掛程式 Hooks](/zh-Hant/plugins/hooks) — 行程內外掛程式生命週期 Hooks
- [組態](/zh-Hant/gateway/configuration-reference#hooks)
