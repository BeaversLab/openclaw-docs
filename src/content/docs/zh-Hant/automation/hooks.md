---
summary: "Hooks: event-driven automation for commands and lifecycle events"
read_when:
  - You want event-driven automation for /new, /reset, /stop, and agent lifecycle events
  - You want to build, install, or debug hooks
title: "Hooks"
---

Hooks 是在 Gateway 內部發生某些情況時執行的小型腳本。它們可以從目錄中發現，並使用 `openclaw hooks` 進行檢查。只有在您啟用 hooks 或配置至少一個 hook 條目、hook pack、legacy handler 或額外的 hook 目錄後，Gateway 才會載入內部 hooks。

OpenClaw 中有兩種 hook：

- **內部 hooks** (本頁)：當代理事件觸發時在 Gateway 內部運行，例如 `/new`、`/reset`、`/stop` 或生命週期事件。
- **Webhooks**：外部 HTTP 端點，允許其他系統在 OpenClaw 中觸發工作。請參閱 [Webhooks](/zh-Hant/automation/cron-jobs#webhooks)。

Hooks 也可以捆綁在插件內部。`openclaw hooks list` 顯示了獨立的 hooks 和由插件管理的 hooks。

## 選擇正確的表面

OpenClaw 有幾個看起來相似但解決不同問題的擴展表面：

| 如果您想要...                                                                                   | 使用...                             | 原因                                                          |
| ----------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| 在 `/new` 時儲存快照，記錄 `/reset`，在 `message:sent` 後呼叫外部 API，或新增粗略的操作員自動化 | 內部掛鉤（`HOOK.md`，本頁）         | 基於檔案的掛鉤旨在供操作員管理的副作用和指令/生命週期自動化   |
| 重寫提示，封鎖工具，取消傳出訊息，或新增有序的中介軟體/政策                                     | 透過 `api.on(...)` 的類型化外掛掛鉤 | 類型化掛鉤具有明確的契約、優先順序、合併規則以及封鎖/取消語意 |
| 新增僅遙測匯出或可觀測性                                                                        | 診斷事件                            | 可觀測性是一個獨立的事件匯流排，而非政策掛鉤表面              |

當您需要類似小型已安裝整合的自動化時，請使用內部掛鉤。當您需要執行時間生命週期控制時，請使用類型化外掛掛鉤。

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

| 事件                     | 觸發時機                           |
| ------------------------ | ---------------------------------- |
| `command:new`            | `/new` 指令已發出                  |
| `command:reset`          | `/reset` 指令已發出                |
| `command:stop`           | `/stop` 指令已發出                 |
| `command`                | 任何指令事件（一般監聽器）         |
| `session:compact:before` | 在壓縮摘要歷史記錄之前             |
| `session:compact:after`  | 在壓縮完成之後                     |
| `session:patch`          | 當工作階段屬性被修改時             |
| `agent:bootstrap`        | 在工作區引導檔案注入之前           |
| `gateway:startup`        | 在頻道啟動並載入掛鉤之後           |
| `gateway:shutdown`       | 當閘道開始關閉時                   |
| `gateway:pre-restart`    | 在預期的閘道重新啟動之前           |
| `message:received`       | 來自任何頻道的傳入訊息             |
| `message:transcribed`    | 在音訊轉錄完成之後                 |
| `message:preprocessed`   | 在媒體和連結預處理完成或被跳過之後 |
| `message:sent`           | 外寄訊息已送達                     |

## 撰寫 Hooks

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

| 欄位       | 說明                                             |
| ---------- | ------------------------------------------------ |
| `emoji`    | CLI 的顯示用 emoji                               |
| `events`   | 要監聽的事件陣列                                 |
| `export`   | 要使用的具名匯出（預設為 `"default"`）           |
| `os`       | 所需的平台（例如 `["darwin", "linux"]`）         |
| `requires` | 所需的 `bins`、`anyBins`、`env` 或 `config` 路徑 |
| `always`   | 繞過資格檢查（布林值）                           |
| `install`  | 安裝方法                                         |

### 處理器實作

```typescript
const handler = async (event) => {
  if (event.type !== "command" || event.action !== "new") {
    return;
  }

  console.log(`[my-hook] New command triggered`);
  // Your logic here

  // Optionally send a reply on replyable surfaces
  event.messages.push("Hook executed!");
};

export default handler;
```

每個事件包含：`type`、`action`、`sessionKey`、`timestamp`、`messages`（僅在可回覆介面上將回覆推送到此處），以及 `context`（事件特定資料）。Agent 和工具外掛 Hook 語境也可能包含 `trace`，這是一個唯讀的 W3C 相容診斷追蹤語境，外掛可以將其傳遞到結構化日誌中以便進行 OTEL 相關聯。

`event.messages` 僅會自動在可回覆的介面上傳遞，例如 `command:*` 和 `message:received`。僅生命週期的事件（如 `agent:bootstrap`、`session:*`、`gateway:*` 或 `message:sent`）沒有回覆頻道，並且會忽略推送的訊息。

### 事件語境重點

**指令事件** (`command:new`、`command:reset`)：`context.sessionEntry`、`context.previousSessionEntry`、`context.commandSource`、`context.workspaceDir`、`context.cfg`。

**訊息事件** (`message:received`): `context.from`, `context.content`, `context.channelId`, `context.metadata` (供應商特定資料，包括 `senderId`, `senderName`, `guildId`)。`context.content` 針對類似指令的訊息優先使用非空白指令主體，然後回退至原始傳入主體和通用主體；它不包含僅限代理程式的擴充內容，例如執行緒歷程或連結摘要。

**訊息事件** (`message:sent`): `context.to`, `context.content`, `context.success`, `context.channelId`。

**訊息事件** (`message:transcribed`): `context.transcript`, `context.from`, `context.channelId`, `context.mediaPath`。

**訊息事件** (`message:preprocessed`): `context.bodyForAgent` (最終擴充主體), `context.from`, `context.channelId`。

**啟動事件** (`agent:bootstrap`): `context.bootstrapFiles` (可變陣列), `context.agentId`。

**工作階段修補事件** (`session:patch`): `context.sessionEntry`, `context.patch` (僅限變更欄位), `context.cfg`。只有特權用戶端可以觸發修補事件。

**壓縮事件**: `session:compact:before` 包括 `messageCount`, `tokenCount`。`session:compact:after` 新增 `compactedCount`, `summaryLength`, `tokensBefore`, `tokensAfter`。

`command:stop` 觀察使用者發出 `/stop`；這是取消/指令生命週期，而不是代理程式最終化閘道。需要檢查自然最終答案並要求代理程式再通過一次的外掛程式應該改用類型化的外掛程式 Hook `before_agent_finalize`。請參閱 [外掛程式 Hooks](/zh-Hant/plugins/hooks)。

**Gateway 生命週期事件**：`gateway:shutdown` 包含 `reason` 和 `restartExpectedMs`，並在 Gateway 開始關閉時觸發。`gateway:pre-restart` 包含相同的上下文，但僅在關閉是預期重啟的一部分且提供了有限的 `restartExpectedMs` 值時觸發。在關閉期間，每個生命週期 Hook 的等待都是盡力而為且有限的，因此如果處理程序停滯，關閉仍會繼續。`gateway:shutdown` 的預設等待時間為 5 秒，`gateway:pre-restart` 的預設等待時間為 10 秒。

在通道仍可用時，請使用 `gateway:pre-restart` 發送簡短的重啟通知：

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default async function handler(event) {
  if (event.type !== "gateway" || event.action !== "pre-restart") {
    return;
  }

  const restartInSeconds = Math.ceil(event.context.restartExpectedMs / 1000);
  await execFileAsync("openclaw", ["system", "event", "--mode", "now", "--text", `Gateway restarting in ~${restartInSeconds}s (${event.context.reason}). Checkpoint now.`]);
}
```

在 `gateway:shutdown` (或 `gateway:pre-restart`) 事件與其餘關閉順序之間，Gateway 還會針對進程停止時仍處於活動狀態的每個會話，觸發一個類型化的 `session_end` plugin hook。該事件的 `reason` 對於普通的 SIGTERM/SIGINT 停止為 `shutdown`，而當關閉被安排為預期重啟的一部分時則為 `restart`。此排空過程是受限的，因此緩慢的 `session_end` 處理程序無法阻止進程退出，並且將跳過已透過 replace / reset / delete / compaction 完成的會話，以避免重複觸發。

## Hook 探索

Hook 按覆蓋優先級從低到高的順序從以下目錄中探索：

1. **內建 Hook**：隨 OpenClaw 附帶
2. **外掛 Hook**：打包在已安裝外掛內的 Hook
3. **受管 Hook**：`~/.openclaw/hooks/` (使用者安裝，在工作區之間共享)。來自 `hooks.internal.load.extraDirs` 的額外目錄共享此優先級。
4. **工作區 Hook**：`<workspace>/hooks/` (每個代理程式，預設停用，直到明確啟用)

工作區 Hook 可以新增新的 Hook 名稱，但無法覆蓋具有相同名稱的內建、受管或外掛提供的 Hook。

Gateway 在啟動時會跳過內部 Hook 探索，直到設定內部 Hooks。使用 `openclaw hooks enable <name>` 啟用捆綁或受管理的 Hook，安裝 Hook 套件，或設定 `hooks.internal.enabled=true` 以加入。當您啟用一個命名的 Hook 時，Gateway 僅載入該 Hook 的處理程式；`hooks.internal.enabled=true`、額外的 Hook 目錄和舊版處理程式則會加入廣泛探索。

### Hook 套件

Hook 套件是透過 `openclaw.hooks` 在 `package.json` 中匯出 hooks 的 npm 套件。使用以下方式安裝：

```bash
openclaw plugins install <path-or-spec>
```

Npm 規格僅限於 registry（套件名稱 + 選用的確切版本或 dist-tag）。Git/URL/file 規格和 semver 範圍會被拒絕。

## 捆綁的 Hooks

| Hook                  | 事件                                              | 用途                                             |
| --------------------- | ------------------------------------------------- | ------------------------------------------------ |
| session-memory        | `command:new`, `command:reset`                    | 將會話上下文儲存至 `<workspace>/memory/`         |
| bootstrap-extra-files | `agent:bootstrap`                                 | 從 glob 模式注入額外的啟動檔案                   |
| command-logger        | `command`                                         | 將所有指令記錄到 `~/.openclaw/logs/commands.log` |
| compaction-notifier   | `session:compact:before`, `session:compact:after` | 當會話壓縮開始/結束時發送可見的聊天通知          |
| boot-md               | `gateway:startup`                                 | 當 Gateway 啟動時執行 `BOOT.md`                  |

啟用任何捆綁的 Hook：

```bash
openclaw hooks enable <hook-name>
```

<a id="session-memory"></a>

### session-memory 詳細資訊

擷取最後 15 則使用者/助理訊息，並使用主機本地日期儲存至 `<workspace>/memory/YYYY-MM-DD-HHMM.md`。記憶體捕獲在背景執行，因此 `/new` 和 `/reset` 確認不會因為讀取文字紀錄或選用的 slug 產生而延遲。設定 `hooks.internal.entries.session-memory.llmSlug: true` 以使用設定的模型產生描述性的檔案名稱 slug。需要設定 `workspace.dir`。

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

路徑相對於工作區解析。僅載入已識別的引導基本檔名 (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`)。

<a id="command-logger"></a>

### command-logger 詳情

將每個斜線指令記錄到 `~/.openclaw/logs/commands.log`。

<a id="compaction-notifier"></a>

### compaction-notifier 詳情

當 OpenClaw 開始和完成壓縮會話文字記錄時，將簡短的狀態訊息發送到當前對話中。這使得在聊天介面上較長的回合不再令人困惑，因為用戶可以看到助理正在總結上下文，並將在壓縮後繼續。

<a id="boot-md"></a>

### boot-md 詳情

當閘道啟動時，從活動工作區執行 `BOOT.md`。

## 插件 Hooks

插件可以通過 Plugin SDK 註冊類型化的 hooks 以實現更深層的整合：攔截工具調用、修改提示、控制訊息流等。
當您需要 `before_tool_call`、`before_agent_reply`、
`before_install` 或其他進程內生命週期 hooks 時，請使用插件 hooks。

插件管理的內部 hooks 則不同：它們參與本頁面的
粗粒度指令/生命週期事件系統，並顯示在 `openclaw hooks list` 中作為
`plugin:<id>`。使用它們來處理副作用以及與 hook 包的相容性，
而不是用於有序的中間件或策略閘道。

有關完整的 plugin hook 參考，請參閱 [Plugin hooks](/zh-Hant/plugins/hooks)。

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

各 hook 的環境變數：

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

<Note>舊版 `hooks.internal.handlers` 陣列設定格式為了向後相容性仍然受支援，但新的 hooks 應使用基於發現的系統。</Note>

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

- **保持處理程序快速。** Hooks 在指令處理期間執行。使用 `void processInBackground(event)` 以即發即棄 的方式處理繁重工作。
- **優雅地處理錯誤。** 將有風險的操作包裝在 try/catch 中；不要拋出異常，以便其他處理程式可以執行。
- **儘早過濾事件。** 如果事件類型/操作不相關，請立即返回。
- **使用特定的事件鍵。** 為了減少開銷，優先使用 `"events": ["command:new"]` 而非 `"events": ["command"]`。

## 故障排除

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

1. 驗證 Hook 已啟用：`openclaw hooks list`
2. 重新啟動您的 gateway 程序以重新載入 hooks。
3. 檢查 gateway 日誌：`./scripts/clawlog.sh | grep hook`

## 相關

- [CLI 參考：hooks](/zh-Hant/cli/hooks)
- [Webhooks](/zh-Hant/automation/cron-jobs#webhooks)
- [Plugin hooks](/zh-Hant/plugins/hooks) — 程序內插件生命週期 hooks
- [配置](/zh-Hant/gateway/configuration-reference#hooks)
